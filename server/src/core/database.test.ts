import { describe, it, expect, test, afterEach } from 'vitest';
import { Logger } from './logger';
import { DatabaseManager } from './database';
import * as fs from 'fs';

async function setupTestDB(dbBasePath: string = "db_test", password: string = "test"): Promise<[Boolean, DatabaseManager]> {
    const logger = new Logger("debug");
    const db = new DatabaseManager(logger, dbBasePath);
    const initResult = await db.initialize(password);
    return [initResult, db];
}

function resetDBFolder(dbBasePath: string = "db_test"): void {
    fs.rmSync(dbBasePath, { recursive: true, force: true });
}

afterEach(() => {
    resetDBFolder();
});

describe('basic database tests', () => {
    test('create and delete database', async () => {
        await setupTestDB();
        expect(fs.existsSync("db_test")).toBe(true);

        resetDBFolder();
        expect(fs.existsSync("db_test")).toBe(false);
    });

    test('create database twice', async () => {
        await setupTestDB();
        expect(fs.existsSync("db_test")).toBe(true);

        await setupTestDB();
        expect(fs.existsSync("db_test")).toBe(true);

        resetDBFolder();
        expect(fs.existsSync("db_test")).toBe(false);
    });
});

describe('database read write tests', () => {
    test('write and read config', async () => {
        const [, db] = await setupTestDB();
        const testConfig = { id: "testTile", name: "testKey", value: "Some Value" };
        await db.setConfig(testConfig.id, testConfig.name, testConfig.value);

        const [, secondDb] = await setupTestDB();
        const readValue = secondDb.getConfig(testConfig.id, testConfig.name);
        expect(readValue).toEqual(testConfig.value);
    });

    test('write and read credential', async () => {
        const [, db] = await setupTestDB();
        const testCredential = { serviceName: "testService", key: "testKey", value: "SecretValue" };
        await db.setCredential(testCredential.serviceName, testCredential.key, testCredential.value);

        const [, secondDb] = await setupTestDB();
        const readValue = secondDb.getCredential(testCredential.serviceName, testCredential.key);
        expect(readValue).toEqual(testCredential.value);
    });

    test('overwrite config', async () => {
        const [, db] = await setupTestDB();
        const testConfig = { id: "testTile", name: "testKey", value: "Some Value" };
        await db.setConfig(testConfig.id, testConfig.name, testConfig.value);

        const newValue = "New Value";
        await db.setConfig(testConfig.id, testConfig.name, newValue);
        const readValue = db.getConfig(testConfig.id, testConfig.name);
        expect(readValue).toEqual(newValue);
    });

    test('overwrite credential', async () => {
        const [, db] = await setupTestDB();
        const testCredential = { serviceName: "testService", key: "testKey", value: "SecretValue" };
        await db.setCredential(testCredential.serviceName, testCredential.key, testCredential.value);

        const newValue = "NewSecretValue";
        await db.setCredential(testCredential.serviceName, testCredential.key, newValue);
        const readValue = db.getCredential(testCredential.serviceName, testCredential.key);
        expect(readValue).toEqual(newValue);
    });

    test('read non-existing config and credential', async () => {
        const [, db] = await setupTestDB();
        const configValue = db.getConfig("nonExistingTile", "nonExistingKey");
        expect(configValue).toBeUndefined();

        const credentialValue = db.getCredential("nonExistingService", "nonExistingKey");
        expect(credentialValue).toBeUndefined();
    });

    test('use wrong password', async () => {
        const [dbInitResult, db] = await setupTestDB();
        expect(dbInitResult).toBe(true);
        const testCredential = { serviceName: "testService", key: "testKey", value: "SecretValue" };
        await db.setCredential(testCredential.serviceName, testCredential.key, testCredential.value);

        const [secondDbInitResult, secondDb] = await setupTestDB("db_test", "wrongPassword");
        expect(secondDbInitResult).toBe(false);

        expect(() => secondDb.getCredential(testCredential.serviceName, testCredential.key)).toThrowError();
    });

    test('config and credential isolation', async () => {
        const [, db] = await setupTestDB();

        const testConfig = { id: "test", name: "testKey", value: "Some Value" };
        const testCredential = { serviceName: "test", key: "testKey", value: "SecretValue" };
        await db.setConfig(testConfig.id, testConfig.name, testConfig.value);
        await db.setCredential(testCredential.serviceName, testCredential.key, testCredential.value);

        const readConfigValue = db.getConfig(testConfig.id, testConfig.name);
        const readCredentialValue = db.getCredential(testCredential.serviceName, testCredential.key);
        expect(readConfigValue).toEqual(testConfig.value);
        expect(readCredentialValue).toEqual(testCredential.value);
    });
});


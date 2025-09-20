import { describe, it, expect, test } from 'vitest';
import { Logger } from './logger';
import { DatabaseManager } from './database';
import * as fs from 'fs';



async function setupTestDB(dbBasePath: string = "db_test", password: string = "test"): Promise<DatabaseManager> {
    const logger = new Logger("debug");
    const db = new DatabaseManager(logger, dbBasePath);
    await db.initialize(password);
    return db;
}

function resetDBFolder(dbBasePath: string = "db_test"): void {
    fs.rmSync(dbBasePath, { recursive: true, force: true });
}

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

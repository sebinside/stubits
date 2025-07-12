import { Logger } from "./logger";
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

import fs from 'fs'
import crypto from 'crypto'
import { read } from "read";


interface Credential {
    serviceName: string;
    key: string;
    value: string;
}

interface Config {
    tileName: string;
    key: string;
    value: string;
}

interface CredentialsDatabase {
    testValue: string;
    salt: string;
    credentials: Credential[];
}

interface ConfigDatabase {
    configs: Config[];
}

export class Database {

    private static readonly credentialsFilePath = "credentials.json";
    private static readonly configFilePath = "config.json";
    private static readonly testValue = "StUBiTS";
    private static readonly encryptionAlgorithm = 'aes-256-cbc';

    #credentialsPassword: string = "";
    #credentialsKey: Buffer | undefined;
    #credentialsSalt: Buffer | undefined;

    #configDB: Low<ConfigDatabase>;
    #credentialsDB: Low<CredentialsDatabase>;

    constructor(private readonly logger: Logger, public readonly dbBasePath: string = "db") {
        logger.setup.core.info("Database", `Creating database with base path: ${dbBasePath}`);

        if (!this.databaseExists()) {
            fs.mkdirSync(this.dbBasePath);
            logger.setup.core.info("Database", 'Database not found, creating new database files.');
        }

        this.#configDB = new Low<ConfigDatabase>(new JSONFile(Database.configFilePath), { configs: [] });
        this.#credentialsDB = new Low<CredentialsDatabase>(new JSONFile(Database.credentialsFilePath), {
            testValue: "",
            salt: crypto.randomBytes(16).toString('hex'),
            credentials: []
        });
    }

    private databaseExists(): boolean {
        return fs.existsSync(`${this.dbBasePath}/${Database.credentialsFilePath}`) &&
            fs.existsSync(`${this.dbBasePath}/${Database.configFilePath}`);
    }

    public async initialize(): Promise<boolean> {
        await this.askForPassword();
        if (!this.#credentialsPassword) {
            this.logger.setup.core.error("Database", "No password provided. Cannot initialize database.");
            return false;
        }

        await this.#configDB.read();
        await this.#credentialsDB.read();

        this.#credentialsSalt = Buffer.from(this.#credentialsDB.data.salt, 'hex');
        this.#credentialsKey = crypto.scryptSync(this.#credentialsPassword, this.#credentialsSalt, 32);

        if (!this.#credentialsDB.data.testValue) {
            this.logger.setup.core.info("Database", "It seems like this is the first run of the database. Setting up default values.");
            this.#credentialsDB.data.testValue = this.encryptValue(Database.testValue);
            await this.#credentialsDB.write();
        }

        const decryptedTestValue = this.decryptValue(this.#credentialsDB.data.testValue);
        if (decryptedTestValue !== Database.testValue) {
            this.logger.setup.core.error("Database", "Password incorrect. Restarting database initialization.");
            return false;
        }

        this.logger.setup.core.info("Database", "Database initialized successfully.");
        return true;
    }

    private encryptValue(value: string): string {
        if (!this.#credentialsPassword) {
            this.logger.setup.core.error("Database", "No password set for credentials encryption.");
            throw new Error("No password set for credentials encryption.");
        }

        if (!this.#credentialsKey || !this.#credentialsSalt) {
            this.logger.setup.core.error("Database", "Credentials encryption initialization failed.");
            throw new Error("Credentials encryption initialization failed.");
        }

        const cipher = crypto.createCipheriv(Database.encryptionAlgorithm, this.#credentialsKey, this.#credentialsSalt);
        let cipherText = cipher.update(value, 'utf-8');
        return cipherText.toString('hex') + cipher.final('hex');
    }

    private decryptValue(encryptedValue: string): string {
        if (!this.#credentialsPassword) {
            this.logger.setup.core.error("Database", "No password set for credentials decryption.");
            throw new Error("No password set for credentials decryption.");
        }

        if (!this.#credentialsKey || !this.#credentialsSalt) {
            this.logger.setup.core.error("Database", "Credentials decryption initialization failed.");
            throw new Error("Credentials decryption initialization failed.");
        }

        const decipher = crypto.createDecipheriv(Database.encryptionAlgorithm, this.#credentialsKey, this.#credentialsSalt);
        let decryptedText = decipher.update(encryptedValue, 'hex', 'utf-8');
        return decryptedText + decipher.final('utf-8');
    }

    private async askForPassword(): Promise<void> {
        const password = await read({
            prompt: "Enter credentials database password >",
            silent: true,
            replace: "*"
        });

        this.#credentialsPassword = password;
    }

    public getCredential(serviceName: string, key: string): string | undefined {
        const credential = this.#credentialsDB.data.credentials.find(c => c.serviceName === serviceName && c.key === key);
        if (credential) {
            return this.decryptValue(credential.value);
        }
        return undefined;
    }

    public getConfig(tileName: string, key: string): string | undefined {
        const config = this.#configDB.data.configs.find(c => c.tileName === tileName && c.key === key);
        if (config) {
            return config.value;
        }
        return undefined;
    }

    public async setCredential(serviceName: string, key: string, value: string): Promise<void> {
        this.#credentialsDB.read();
        const existingCredential = this.#credentialsDB.data.credentials.find(c => c.serviceName === serviceName && c.key === key);

        if (existingCredential) {
            existingCredential.value = this.encryptValue(value);
        } else {
            this.#credentialsDB.data.credentials.push({
                serviceName,
                key,
                value: this.encryptValue(value)
            });
        }

        await this.#credentialsDB.write();
    }

    public async setConfig(tileName: string, key: string, value: string): Promise<void> {
        await this.#configDB.read();
        const existingConfig = this.#configDB.data.configs.find(c => c.tileName === tileName && c.key === key);

        if (existingConfig) {
            existingConfig.value = value;
        } else {
            this.#configDB.data.configs.push({
                tileName,
                key,
                value
            });
        }

        await this.#configDB.write();
    }
}
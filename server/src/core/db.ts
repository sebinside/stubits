import { Logger } from "./logger";
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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
    private static readonly loggerComponentName = "Database";
    private static readonly encryptionAlgorithm = 'aes-256-cbc';
    private static readonly credentialsFilePath = "credentials.json";
    private static readonly configFilePath = "config.json";
    private static readonly testValue = "StUBiTS";

    #credentialsPassword: string = "";
    #credentialsKey: Buffer | undefined;
    #credentialsSalt: Buffer | undefined;

    #configDB: Low<ConfigDatabase>;
    #credentialsDB: Low<CredentialsDatabase>;

    constructor(private readonly logger: Logger, private readonly dbBasePath: string = "db") {
        logger.setup.core.info(Database.loggerComponentName, `Creating database with base path: "/${dbBasePath}"`);

        if (!this.databaseExists()) {
            fs.mkdirSync(this.dbBasePath, { recursive: true });
            logger.setup.core.info(Database.loggerComponentName, 'Database not found, creating new database files.');
        }

        this.#configDB = new Low<ConfigDatabase>(
            new JSONFile(path.join(this.dbBasePath, Database.configFilePath)),
            { configs: [] }
        );

        this.#credentialsDB = new Low<CredentialsDatabase>(
            new JSONFile(path.join(this.dbBasePath, Database.credentialsFilePath)),
            {
                testValue: "",
                salt: crypto.randomBytes(16).toString('hex'),
                credentials: []
            }
        );
    }

    private databaseExists(): boolean {
        return fs.existsSync(path.join(this.dbBasePath, Database.credentialsFilePath)) &&
            fs.existsSync(path.join(this.dbBasePath, Database.configFilePath));
    }

    public async initialize(): Promise<boolean> {
        await this.askForPassword();
        if (!this.#credentialsPassword) {
            this.logger.setup.core.error(Database.loggerComponentName, "No password provided. Cannot initialize database.");
            return false;
        }

        try {
            await this.#configDB.read();
            await this.#credentialsDB.read();
        } catch (error) {
            this.logger.setup.core.error(Database.loggerComponentName, `An error happened during reading database files: ${error}`);
            return false;
        }

        this.#credentialsSalt = Buffer.from(this.#credentialsDB.data.salt, 'hex');
        this.#credentialsKey = crypto.scryptSync(this.#credentialsPassword, this.#credentialsSalt, 32);
        this.#credentialsPassword = "";

        if (!this.#credentialsDB.data.testValue) {
            this.logger.setup.core.info(Database.loggerComponentName, "It seems like this is the first run of the database. Setting up default values.");
            this.#credentialsDB.data.testValue = this.encryptValue(Database.testValue);
            try {
                await this.#credentialsDB.write();
            } catch (error) {
                this.logger.setup.core.error(Database.loggerComponentName, `An error happened during writing of the test value: ${error}`);
                return false;
            }
        }

        try {
            const decryptedTestValue = this.decryptValue(this.#credentialsDB.data.testValue);
            if (decryptedTestValue !== Database.testValue) {
                this.logger.setup.core.error(Database.loggerComponentName, "Password incorrect. Aborting database initialization.");
                return false;
            }
        } catch (_) {
            this.logger.setup.core.error(Database.loggerComponentName, "Password incorrect. Aborting database initialization.");
            return false;
        }

        this.logger.setup.core.info(Database.loggerComponentName, "Database initialized successfully.");
        return true;
    }

    private encryptValue(value: string): string {
        if (!this.#credentialsKey) {
            this.logger.run.core.error(Database.loggerComponentName, "Credentials encryption initialization failed.");
            throw new Error("Credentials encryption initialization failed.");
        }

        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(Database.encryptionAlgorithm, this.#credentialsKey, iv);
        const encrypted = Buffer.concat([cipher.update(value, 'utf-8'), cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    }

    private decryptValue(encryptedValue: string): string {
        if (!this.#credentialsKey) {
            this.logger.run.core.error(Database.loggerComponentName, "Credentials decryption initialization failed.");
            throw new Error("Credentials decryption initialization failed.");
        }

        const [ivHex, dataHex] = encryptedValue.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const encryptedData = Buffer.from(dataHex, 'hex');
        const decipher = crypto.createDecipheriv(Database.encryptionAlgorithm, this.#credentialsKey, iv);
        const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
        return decrypted.toString('utf-8');
    }

    private async askForPassword(): Promise<void> {
        this.logger.setup.core.debug(Database.loggerComponentName, "Asking user for credentials database password now.");
        const password = await read({
            prompt: "Enter credentials database password >",
            silent: true,
            replace: "*"
        });
        this.#credentialsPassword = password;
    }

    public getCredential(serviceName: string, key: string): string | undefined {
        const credential = this.#credentialsDB.data.credentials.find(
            c => c.serviceName === serviceName && c.key === key
        );
        return credential ? this.decryptValue(credential.value) : undefined;
    }

    public getConfig(tileName: string, key: string): string | undefined {
        const config = this.#configDB.data.configs.find(
            c => c.tileName === tileName && c.key === key
        );
        return config?.value;
    }

    public async setCredential(serviceName: string, key: string, value: string): Promise<void> {
        await this.#credentialsDB.read();

        const existing = this.#credentialsDB.data.credentials.find(
            c => c.serviceName === serviceName && c.key === key
        );

        const encrypted = this.encryptValue(value);

        if (existing) {
            existing.value = encrypted;
        } else {
            this.#credentialsDB.data.credentials.push({ serviceName, key, value: encrypted });
        }

        try {
            await this.#credentialsDB.write();
            this.logger.run.core.debug(Database.loggerComponentName, "Credentials saved successfully.");
        } catch (error) {
            this.logger.run.core.error(Database.loggerComponentName, `An error happened during saving credential: ${error}`);
        }
    }

    public async setConfig(tileName: string, key: string, value: string): Promise<void> {
        await this.#configDB.read();

        const existing = this.#configDB.data.configs.find(
            c => c.tileName === tileName && c.key === key
        );

        if (existing) {
            existing.value = value;
        } else {
            this.#configDB.data.configs.push({ tileName, key, value });
        }

        try {
            await this.#configDB.write();
            this.logger.run.core.debug(Database.loggerComponentName, "Configs saved successfully.");
        } catch (error) {
            this.logger.run.core.error(Database.loggerComponentName, `An error happened during saving config: ${error}`);
        }
    }
}

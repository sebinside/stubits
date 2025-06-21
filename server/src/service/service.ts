import { Logger } from '../core/logger';

export abstract class Service {
    protected isServiceRunning = false;

    // serviceName can be the default name of the service type or a custom name if multiple instances are needed
    constructor(private readonly credentials: Record<string, string>, private readonly logger: Logger, private readonly serviceName: string) {
        this.logger.setup.service.info(serviceName, `Service ${serviceName} created.`);

        if (this.getRequiredCredentialKeys().length > 0) {
            const missingKeys = this.getRequiredCredentialKeys().filter(key => !this.credentials[key]);
            if (missingKeys.length > 0) {
                this.logger.setup.service.warn(serviceName, `Missing required credentials: ${missingKeys.join(', ')}`);
            }
        }
    }

    isRunning(): boolean {
        return this.isServiceRunning;
    }
    getName(): string {
        return this.serviceName;
    }

    abstract start(): void;
    abstract stop(): void;
    abstract getRequiredCredentialKeys(): string[];
}

// TODO: What about the central management of bot commands + award redemptions? Move to the twitch(chat) service?
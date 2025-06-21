export interface Service {
    start(): void;
    stop(): void;
    isRunning(): boolean;
    getName(): string;
    getRequiredCredentialKeys(): string[];
}

// TODO: Service could probably be an abstract class
// each service has a d default name but can be changed if multiple instances are needed, last parameter in the constructor

// Lifecycle: credentials in constructor, starts sets up and starts the service
// TODO: Is this applicable?

// TODO: What about the central management of bot commands + award redemptions? Move to the twtich(chat) service?
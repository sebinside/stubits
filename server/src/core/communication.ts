// Handles express, gives out the express instance
// Handles the one websocket server, deals with multiple (virtual) topics/channels, message broker

import { Logger } from "./logger";
import express, { Application } from "express";

// export communication manager, websocket channel

export class CommunicationManager {
    private static readonly loggerComponentName = "communication";

    #expressApp: Application | undefined;

    constructor(private readonly logger: Logger, private readonly httpPort: number = 42750, private readonly clientPort: number = 42751, private readonly wsPort: number = 42752) {
        logger.setup.core.info(CommunicationManager.loggerComponentName, `Creating communication with express server port: ${httpPort}, client port: ${clientPort}, and websocket server port: ${wsPort}`);

        if (httpPort === clientPort || httpPort === wsPort || clientPort === wsPort || httpPort < 0 || clientPort < 0 || wsPort < 0 || httpPort > 65535 || clientPort > 65535 || wsPort > 65535) {
            logger.setup.core.error(CommunicationManager.loggerComponentName, "Communication ports are invalid. They must be unique and within the range of 0-65535.");
            throw new Error("Invalid ports provided.");
        }
    }

    public initialize(): boolean {
        return this.initializeExpress() && this.initializeWebSocket();
    }

    private initializeExpress(): boolean {
        this.#expressApp = express();
        const server = this.#expressApp.listen(this.httpPort);

        if (server) {
            this.logger.setup.core.info(CommunicationManager.loggerComponentName, `Express server started successfully on port ${this.httpPort}.`);
            return true;
        } else {
            this.logger.setup.core.error(CommunicationManager.loggerComponentName, `Failed to start express server on port ${this.httpPort}.`);
            return false;
        }
    }

    private initializeWebSocket(): boolean {
        return false;
    }
}
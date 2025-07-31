import { Logger } from "./logger";
import express, { Application, Router } from "express";
import { WebSocket, WebSocketServer } from "ws";

export interface WebSocketMessage {
    channel: string;
    data?: any;
}

export class CommunicationManager {
    private static readonly loggerComponentName = "communication";
    private static readonly serverPortInUseErrorCode = 'EADDRINUSE';

    #expressApp: Application | undefined;
    #webSocketServer: WebSocketServer | undefined;
    #webSocketChannels: Map<string, Set<WebSocket>> = new Map();

    constructor(private readonly logger: Logger, private readonly httpPort: number = 42750, private readonly clientPort: number = 42751, private readonly wsPort: number = 42752) {
        logger.setup.core.info(CommunicationManager.loggerComponentName, `Creating communication manager with express server port: ${httpPort}, client port: ${clientPort}, and websocket server port: ${wsPort}.`);

        if (httpPort === clientPort || httpPort === wsPort || clientPort === wsPort || httpPort < 0 || clientPort < 0 || wsPort < 0 || httpPort > 65535 || clientPort > 65535 || wsPort > 65535) {
            logger.setup.core.error(CommunicationManager.loggerComponentName, "Communication ports are invalid. They must be unique and within the range of 0-65535.");
            throw new Error("Invalid ports provided.");
        }
    }

    public async initialize(): Promise<boolean> {
        if ((await this.initializeExpressServer()) && (await this.initializeWebSocketServer())) {
            this.logger.setup.core.info(CommunicationManager.loggerComponentName, "Communication manager initialized successfully.");
            return true;
        } else {
            return false;
        }
    }

    private initializeExpressServer(): Promise<boolean> {
        return new Promise((resolve) => {
            this.#expressApp = express();

            const server = this.#expressApp.listen(this.httpPort);

            server.on('error', (error: any) => {
                if (error.code === CommunicationManager.serverPortInUseErrorCode) {
                    this.logger.setup.core.error(CommunicationManager.loggerComponentName, `Error starting express server: Port ${this.httpPort} is already in use.`);
                } else {
                    this.logger.setup.core.error(CommunicationManager.loggerComponentName, `Error starting express server: ${error}`);
                }
                resolve(false);
            });

            server.on('listening', () => {
                this.logger.setup.core.info(CommunicationManager.loggerComponentName, `Express server started successfully on port ${this.httpPort}.`);
                resolve(true);
            });
        });
    }

    public getExpressRouter(): Router {
        if (!this.#expressApp) {
            this.logger.setup.core.error(CommunicationManager.loggerComponentName, "Express has not been initialized yet. Please initialize the core communication manager first.");
            throw new Error("Express has not been initialized yet.");
        }
        return this.#expressApp;
    }

    private async initializeWebSocketServer(): Promise<boolean> {
        return new Promise((resolve) => {

            // By default, every new connection is added to the "unknown" channel
            this.#webSocketChannels.set("", new Set<WebSocket>());

            this.#webSocketServer = new WebSocketServer({ port: this.wsPort });

            this.#webSocketServer.on("error", (error) => {
                if (error.message.includes(CommunicationManager.serverPortInUseErrorCode)) {
                    this.logger.setup.core.error(CommunicationManager.loggerComponentName, `Error starting WebSocket server: Port ${this.wsPort} is already in use.`);
                } else {
                    this.logger.setup.core.error(CommunicationManager.loggerComponentName, `Error starting WebSocket server: ${error}`);
                }
                resolve(false);
            });

            this.#webSocketServer.on("connection", (ws) => {
                this.logger.run.core.info(CommunicationManager.loggerComponentName, "New WebSocket connection established.");
                this.#webSocketChannels.get("")?.add(ws);

                ws.on("message", (message: string) => {
                    // TODO: Handle channels (including a check if the message format is correct and warn otherwise)
                    // TODO: Handle message (including a debug print that a message on a channel has been received)
                });

                ws.on("close", () => {
                    this.logger.setup.core.info(CommunicationManager.loggerComponentName, "WebSocket connection closed.");
                    this.#webSocketChannels.get("")?.delete(ws);
                });
            });

            this.#webSocketServer.on("listening", () => {
                this.logger.setup.core.info(CommunicationManager.loggerComponentName, `WebSocket server started successfully on port ${this.wsPort}.`);
                resolve(true);
            });
        });
    }

    // TODO: Method to listen to channels and to broadcast messages to them (incl. warning if nobody is listening, error if channel string is empty)
}

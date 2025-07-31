import { Logger } from "./logger";
import express, { Application, Router } from "express";
import { WebSocket, WebSocketServer } from "ws";

interface WebSocketMessage {
    channel: string;
    data?: any;
}

interface WebSocketChannel {
    sockets: Set<WebSocket>;
    handlers: Set<(data: any) => void>;
}

export class CommunicationManager {
    private static readonly loggerComponentName = "communication";
    private static readonly serverPortInUseErrorCode = 'EADDRINUSE';

    private expressApp: Application | undefined;
    private webSocketServer: WebSocketServer | undefined;
    private webSocketChannels: Map<string, WebSocketChannel> = new Map();

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
            this.expressApp = express();

            const server = this.expressApp.listen(this.httpPort);

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
        if (!this.expressApp) {
            this.logger.setup.core.error(CommunicationManager.loggerComponentName, "Express has not been initialized yet. Please initialize the core communication manager first.");
            throw new Error("Express has not been initialized yet.");
        }
        return this.expressApp;
    }

    private async initializeWebSocketServer(): Promise<boolean> {
        return new Promise((resolve) => {

            // By default, every new connection is added to the "unknown" channel
            this.webSocketChannels.set("", {
                sockets: new Set<WebSocket>(),
                handlers: new Set<(data: any) => void>()
            });

            this.webSocketServer = new WebSocketServer({ port: this.wsPort });

            this.webSocketServer.on("error", (error) => {
                if (error.message.includes(CommunicationManager.serverPortInUseErrorCode)) {
                    this.logger.setup.core.error(CommunicationManager.loggerComponentName, `Error starting WebSocket server: Port ${this.wsPort} is already in use.`);
                } else {
                    this.logger.setup.core.error(CommunicationManager.loggerComponentName, `Error starting WebSocket server: ${error}`);
                }
                resolve(false);
            });

            this.webSocketServer.on("connection", (ws) => {
                this.logger.run.core.info(CommunicationManager.loggerComponentName, "WebSocket connection opened.");
                this.webSocketChannels.get("")?.sockets.add(ws);

                ws.on("message", (message: string) => {
                    this.handleWebSocketMessage(ws, message);
                });

                ws.on("close", () => {
                    this.logger.run.core.info(CommunicationManager.loggerComponentName, "WebSocket connection closed.");
                    this.webSocketChannels.forEach((channel) => {
                        channel.sockets.delete(ws);
                    });
                });
            });

            this.webSocketServer.on("listening", () => {
                this.logger.setup.core.info(CommunicationManager.loggerComponentName, `WebSocket server started successfully on port ${this.wsPort}.`);
                resolve(true);
            });
        });
    }

    private handleWebSocketMessage(ws: WebSocket, input: string): void {
        let message: WebSocketMessage;

        try {
            const encodedMessage = JSON.parse(input);

            if (!encodedMessage.channel || typeof encodedMessage.channel !== 'string' || encodedMessage.channel.trim() === "") {
                this.logger.run.core.warn(CommunicationManager.loggerComponentName, "Received message without a valid channel. Ignoring message.");
                this.logger.run.core.debug(CommunicationManager.loggerComponentName, `Invalid message: ${input}`);
                return;
            }

            message = {
                channel: encodedMessage.channel,
                data: encodedMessage.data
            };

        } catch (error) {
            this.logger.setup.core.error(CommunicationManager.loggerComponentName, `Error parsing WebSocket message: ${error}`);
            return;
        }

        this.logger.run.core.debug(CommunicationManager.loggerComponentName, `Received valid WebSocket message on channel "${message.channel}".`);

        if (!this.webSocketChannels.has(message.channel)) {
            this.webSocketChannels.set(message.channel, {
                sockets: new Set<WebSocket>(),
                handlers: new Set<(data: any) => void>()
            });
            this.webSocketChannels.get(message.channel)?.sockets.add(ws);
            this.webSocketChannels.get("")?.sockets.delete(ws);
            this.logger.run.core.debug(CommunicationManager.loggerComponentName, `No channel found for "${message.channel}". Created new channel and moved WebSocket.`);
        }

        this.webSocketChannels.get(message.channel)?.handlers.forEach((handler) => {
            handler(message.data);
        });
    }

    public registerWebSocketHandler(channel: string, handler: (data: any) => void): void {
        if (!this.webSocketChannels.has(channel)) {
            this.webSocketChannels.set(channel, {
                sockets: new Set<WebSocket>(),
                handlers: new Set<(data: any) => void>()
            });
        }

        this.webSocketChannels.get(channel)?.handlers.add(handler);
        this.logger.run.core.debug(CommunicationManager.loggerComponentName, `Handler registered for channel "${channel}".`);
    }

    public broadcastWebSocketMessage(channel: string, data: any): void {
        if (!channel || typeof channel !== 'string' || channel.trim() === "") {
            this.logger.run.core.error(CommunicationManager.loggerComponentName, "Cannot broadcast message: Channel is empty or invalid.");
            return;
        }

        if (!this.webSocketChannels.has(channel)) {
            this.logger.run.core.warn(CommunicationManager.loggerComponentName, `No WebSocket channel found for "${channel}". Cannot broadcast message.`);
            return;
        }

        const webSocketChannel = this.webSocketChannels.get(channel);
        if (webSocketChannel?.sockets.size === 0) {
            this.logger.run.core.warn(CommunicationManager.loggerComponentName, `No WebSocket clients connected to channel "${channel}". Cannot broadcast message.`);
            return;
        }

        const webSocketMessage = { channel, data };

        webSocketChannel?.sockets.forEach((ws) => {
            try {
                ws.send(JSON.stringify(webSocketMessage));
            } catch (error) {
                this.logger.run.core.error(CommunicationManager.loggerComponentName, `Error broadcasting message to channel "${channel}": ${error}`);
                return;
            }
        });

        this.logger.run.core.debug(CommunicationManager.loggerComponentName, `Broadcasted message to channel "${channel}".`);
    }
}

import { ApiClient } from "@twurple/api";
import { WebSocket, WebSocketServer } from "ws";
import { Logger } from "../../logger";
import { TwitchChatClient } from "../../providers/twitch/TwitchChatClient";
import { Service } from "../Service";
import { DEFAULT_CATEGORY, DEFAULT_CONFIG } from "./defaults";
import { DisplayMessage, MessageType, MessageTypeKeys, StreamInfoConfig } from "./types";

export class StreamInfo extends Service {

    private currentConfig: Array<StreamInfoConfig> = DEFAULT_CONFIG;
    private currentCategory: string = DEFAULT_CATEGORY;
    private overlayWebSocketServer: WebSocketServer | undefined = undefined;

    constructor(public readonly dashboardWebSocketPort: number, public readonly overlayWebSocketPort: number, private readonly twitchChatClient: TwitchChatClient, private readonly twitchApiClient: ApiClient, private readonly userName: string, private readonly logger: Logger) {
        super(dashboardWebSocketPort);
        this.setupAdditionalWebSocketServer()
    }

    private setupAdditionalWebSocketServer(): void {
        // FIXME: Find proper solution for the code duplication
        this.overlayWebSocketServer = new WebSocketServer({ port: this.overlayWebSocketPort });
        console.log(
            `Additional WebSocket server of service "${this.constructor.name}" started on port ${this.overlayWebSocketPort}`
        );

        this.overlayWebSocketServer.on("connection", (ws: WebSocket) => {
            console.log(`Client connected to service "${this.constructor.name}" (overlay)`);
            this.onOverlayWebSocketOpenConnection(ws);

            ws.on("message", (message) => {
                console.log(`Service "${this.constructor.name}" received: ${message} (from overlay)`);
                this.onOverlayWebSocketServerMessage(ws, message.toString());
            });

            ws.on("close", () => {
                console.log(
                    `Client disconnected from service "${this.constructor.name}" (overlay)`
                );
            });
        });
    }

    public run(): void {
        this.initApiClient();
        this.initChatBot();
    }

    private initApiClient(): void {
        setInterval(async () => {
            const category = await this.requestCurrentCategory();
            if (category) {
                this.logger.run.tile.debug("StreamInfo", `Received category: ${category}`);

                if (this.currentCategory !== category) {
                    this.logger.run.tile.info("StreamInfo", `Updating current category to: ${category}`);
                    this.currentCategory = category;
                    this.sendUpdatedDisplayMessages();
                }
            }
        }, 10000);
    }


    private async requestCurrentCategory(): Promise<string | undefined> {
        const user = await this.twitchApiClient.users.getUserByName(this.userName);
        if (!user) {
            this.logger.run.tile.warn("StreamInfo", `User ${this.userName} not found.`);
            return undefined;
        }

        const stream = await user?.getStream();
        if (!stream) {
            this.logger.run.tile.warn("StreamInfo", `No active stream found for user ${this.userName}.`);
            return undefined;
        }

        const category = await stream?.getGame();
        return category?.name;
    }

    protected onWebSocketServerMessage(_: WebSocket, message: string): void {
        this.logger.run.tile.debug("StreamInfo", `Received message from dashboard.`);
        const parsedMessage = JSON.parse(message) as StreamInfoConfig[];

        if (!Array.isArray(parsedMessage)) {
            this.logger.run.tile.warn("StreamInfo", "Received invalid message format.");
            return;
        }

        if (!parsedMessage.every(config => this.isConfigValid(config))) {
            this.logger.run.tile.warn("StreamInfo", "Received invalid config. Skipping update.");
            return;
        }

        this.currentConfig = parsedMessage;
        this.logger.run.tile.info("StreamInfo", `Updated current config with ${this.currentConfig.length} entries.`);
        this.sendUpdatedDisplayMessages();
    }

    private sendUpdatedDisplayMessages(): void {
        const relevantMessages = this.filterRelevantMessages();
        this.logger.run.tile.info("StreamInfo", `Sending ${relevantMessages.length} relevant messages to clients.`);

        this.overlayWebSocketServer?.clients.forEach((ws: WebSocket) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(relevantMessages));
            }
        });
    }

    protected onWebSocketOpenConnection(ws: WebSocket): void {
        ws.send(JSON.stringify(this.currentConfig))
    };

    private onOverlayWebSocketServerMessage(ws: WebSocket, message: string): void {
        // Ignore messages from the overlay
    }

    private onOverlayWebSocketOpenConnection(ws: WebSocket): void {
        this.sendUpdatedDisplayMessages();
    }

    private filterRelevantMessages(): Array<DisplayMessage> {
        const relevantConfigs = this.currentConfig.filter(config => config.active && (config.category === this.currentCategory || !config.category));
        return relevantConfigs.map(config => ({
            keyword: config.keyword,
            title: config.title,
            content: config.content
        }));
    }

    private isConfigValid(config: StreamInfoConfig): boolean {
        if (!config.keyword || !config.title || !config.content) {
            this.logger.run.tile.warn("StreamInfo", "Invalid config: Missing required fields.");
            return false;
        }
        if (config.category && MessageTypeKeys.includes(config.category) === false) {
            this.logger.run.tile.warn("StreamInfo", `Invalid config: Category "${config.category}" is not a valid message type.`);
        }

        // TODO: Check duplicates (requires to check all configs at once!)!

        return true;
    }

    private initChatBot(): void {
        const chatBot = this.twitchChatClient.getChatBot();

        chatBot.registerCommand("was", false,
            (_: string, __: string, msg) => {
                const reply = this.getCurrentInfoMessage();

                if (reply) {
                    this.twitchChatClient.getChatClient().say(this.twitchChatClient.channel, StreamInfo.removeBrackets(reply.content), { replyTo: msg });
                }
            });

        chatBot.registerCommand("wo", false,
            (_: string, __: string, msg) => {
                const url = this.getCurrentURL();

                if (url) {
                    const reply = `Den Code findest du hier: ${url}`;
                    this.twitchChatClient.getChatClient().say(this.twitchChatClient.channel, reply, { replyTo: msg });
                }
            });

        chatBot.registerCommand("code", false,
            (_: string, __: string, msg) => {
                const url = this.getCurrentURL();

                if (url && url.startsWith("https://github.com/")) {
                    const reply = `Zur interaktiven Code-Ansicht: ${url.replace("https://github.com/", "https://github.dev/")}`;
                    this.twitchChatClient.getChatClient().say(this.twitchChatClient.channel, reply, { replyTo: msg });
                }
            });

        const commandsAndCategories = new Map<string, MessageType>([
            ["wer", "who"],
            ["wie", "how"],
            ["editor", "editor"],
            ["sprache", "language"],
        ]);

        for (const [command, keyword] of commandsAndCategories) {
            chatBot.registerCommand(command, false,
                (_: string, __: string, msg) => {
                    const currentMessage = this.getMessageForKeyword(keyword);

                    if (currentMessage) {
                        this.twitchChatClient.getChatClient().say(this.twitchChatClient.channel, StreamInfo.removeBrackets(currentMessage.content), { replyTo: msg });
                    }
                });
        }
    }

    getMessageForKeyword(keyword: MessageType): StreamInfoConfig | undefined {
        const candidates = this.currentConfig.filter(config => config.keyword === keyword && config.active && (config.category === this.currentCategory || !config.category));

        if (candidates.length === 0) {
            return undefined;
        } else if (candidates.length > 1) {
            this.logger.run.tile.warn("StreamInfo", `Multiple '${keyword}' messages found for category '${this.currentCategory}'. Returning first one.`);
        }

        return candidates[0];
    }

    getCurrentInfoMessage(): StreamInfoConfig | undefined {
        return this.getMessageForKeyword("what");
    }

    getCurrentURL(): string | undefined {
        return this.getCurrentInfoMessage()?.url;
    }

    private static removeBrackets(message: string) {
        return message.replaceAll("{", "").replaceAll("}", "");
    }
}

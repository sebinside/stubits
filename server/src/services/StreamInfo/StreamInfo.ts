import { Service } from "../Service";

export class StreamInfo extends Service {
    public run(): void {
        throw new Error("Method not implemented.");
    }
}
/*
Copy paste code from the original implementation, to be cleaned and heavily simplified

    // Required scopes: none
    const twitchApi = requireService<TwitchApiServiceClient>(nodecg, "twitch-api");
    const chatClient = requireService<TwitchChatServiceClient>(nodecg, "twitch-chat");

export class MessageController {
    private static readonly REPLICANT_ID_CURRENT_CATEGORY: string = "streaminfo.currentcategory";
    private static readonly REPLICANT_ID_ALL_MESSAGES: string = "streaminfo.allmessages";
    private static readonly REPLICANT_ID_CURRENT_MESSAGES: string = "streaminfo.currentmessages";
    private static readonly REPLICANT_ID_CONFIGS: string = "streaminfo.config";

    private static readonly DEFAULT_INFO_MESSAGE: string = "Ich bin live!";

    private currentCategoryReplicant: ReplicantServer<string>;
    private allMessagesReplicant: ReplicantServer<Record<string, DisplayMessage>>;
    private currentMessagesReplicant: ReplicantServer<Record<string, DisplayMessage>>;
    private configsReplicant: ReplicantServer<Array<StreamInfoConfig>>;

    constructor(private nodecg: NodeCG) {
        this.currentCategoryReplicant = this.initReplicant(MessageController.REPLICANT_ID_CURRENT_CATEGORY, DefaultMessages.REPLICANT_DEFAULT_CURRENT_CATEGORY);

        this.currentMessagesReplicant = this.initReplicant(MessageController.REPLICANT_ID_CURRENT_MESSAGES, DefaultMessages.REPLICANT_DEFAULT_CURRENT_MESSAGES);

        this.allMessagesReplicant = this.initReplicant(MessageController.REPLICANT_ID_ALL_MESSAGES, DefaultMessages.REPLICANT_DEFAULT_ALL_MESSAGES);
        this.allMessagesReplicant.value = DefaultMessages.REPLICANT_DEFAULT_ALL_MESSAGES;

        this.configsReplicant = this.initReplicant(MessageController.REPLICANT_ID_CONFIGS, DefaultMessages.REPLICANT_DEFAULT_CONFIGS);

        this.currentCategoryReplicant.on("change", () => this.updateCurrentMessages());
        this.configsReplicant.on("change", () => this.updateCurrentMessages());
    }

    private initReplicant<T>(id: string, defaultValue: T) {
        return this.nodecg.Replicant<T>(id, { defaultValue: defaultValue });
    }

    public getInfoMessage(category: string): string {
        const config = this.getActiveConfigForCategory(category);

        let message = MessageController.DEFAULT_INFO_MESSAGE;

        if (config) {
            message = config.description ? config.description : message;
            message = config.url ? `${message} | Mehr Infos: ${config.url}` : message;
        }

        return MessageController.removeBrackets(message);
    }

    public getCurrentInfoMessage(): string {
        return this.getInfoMessage(this.getCurrentCategory());
    }

    private getActiveConfigForCategory(category: string): StreamInfoConfig | undefined {
        return this.configsReplicant.value.find(it => it.category === category && it.active)
    }

    public setCurrentCategory(category: string): void {
        if (this.currentCategoryReplicant.value !== category) {
            this.currentCategoryReplicant.value = category;
            this.nodecg.log.info(`Updated category to ${category}.`)
        }
    }

    public getCurrentCategory(): string {
        return this.currentCategoryReplicant.value;
    }

    public getCurrentURL(): string | undefined {
        const category = this.currentCategoryReplicant.value;
        return this.getActiveConfigForCategory(category)?.url;
    }

    private updateCurrentMessages() {
        const category = this.currentCategoryReplicant.value;
        const config = this.getActiveConfigForCategory(category);

        const whatMessage: DisplayMessage = {
            title: "{!was} mache ich gerade?",
            content: config?.description || "",
            type: "what"
        }

        const currentMessages: Record<string, DisplayMessage> = {};
        config?.messageIds.forEach(id => {
            const message = this.allMessagesReplicant.value[id];

            if (message) {
                currentMessages[id] = { ...message };
            } else {
                this.nodecg.log.warn(`Unable to find message with ID ${id}.`);
            }
        });

        currentMessages["what"] = whatMessage;
        this.currentMessagesReplicant.value = currentMessages;
    }

    public getFirstCurrentMessageForCategory(category: string) {
        const currentMessages = this.currentMessagesReplicant.value;

        for (const entry of Object.values(currentMessages)) {
            if (entry.type === category) {
                return MessageController.removeBrackets(entry.content);
            }
        }

        return undefined;
    }

    private static removeBrackets(message: string) {
        return message.replaceAll("{", "").replaceAll("}", "");
    }
}

export class StreamInfoChatBot {

    constructor(
        private messageController: MessageController,
        private chatClient: ServiceProvider<TwitchChatServiceClient> | undefined,
        private nodecg: NodeCG) {
        this.nodecg.log.info("Created stream info chat bot.");
    }

    initChatBot() {
        this.initMainCommand();
        this.initURLCommands();
        this.initSimpleCommands();
    }

    private initMainCommand() {
        ChatBot.getInstance().registerCommand("was", false, this.chatClient, this.nodecg,
            (_: string, __: string, msg) => {
                const reply = this.messageController.getCurrentInfoMessage();
                this.chatClient?.getClient()?.say(ChatBot.CHANNEL, reply, { replyTo: msg });
            });
    }

    private initURLCommands() {
        ChatBot.getInstance().registerCommand("wo", false, this.chatClient, this.nodecg, 
        (_: string, __: string, msg) => {
            const url = this.messageController.getCurrentURL();
            if(url) {
                const reply = `Den Code findest du hier: ${url}`;
                this.chatClient?.getClient()?.say(ChatBot.CHANNEL, reply, { replyTo: msg });
            } 
        }); 

        ChatBot.getInstance().registerCommand("code", false, this.chatClient, this.nodecg, 
        (_: string, __: string, msg) => {
            const url = this.messageController.getCurrentURL();
            if(url && url.startsWith("https://github.com/")) {
                const reply = `Zur interaktiven Code-Ansicht: ${url.replace("https://github.com/", "https://github.dev/")}`;
                this.chatClient?.getClient()?.say(ChatBot.CHANNEL, reply, { replyTo: msg });
            } 
        }); 
    }
    
    private initSimpleCommands() {
        const commandsAndCategories = new Map<string, string>([
            ["wer", "who"],
            ["wie", "how"],
            ["projekt", "project"],
            ["editor", "editor"],
            ["sprache", "language"],
            ["theme", "editor"]
        ]);

        for(const [command, category] of commandsAndCategories) {
            ChatBot.getInstance().registerCommand(command, false, this.chatClient, this.nodecg,
            (_: string, __: string, msg) => {
                const currentMessage = this.messageController.getFirstCurrentMessageForCategory(category);
                if(currentMessage) {
                    this.chatClient?.getClient()?.say(ChatBot.CHANNEL, currentMessage, { replyTo: msg });
                }
            });
        }
    }
}

export class StreamInfoManager extends Manager {
    constructor(
        private chatClient: ServiceProvider<TwitchChatServiceClient> | undefined,
        private twitchApiClient: ServiceProvider<TwitchApiServiceClient> | undefined,
        protected nodecg: NodeCG,
    ) {
        super("stream-info", nodecg);
        this.register(this.chatClient, "Twitch chat client", () => this.initChatClient());
        this.register(this.twitchApiClient, "Twitch api client", async () => this.initApiClient());
        this.initReadyListener(this.twitchApiClient);
    }

    public static readonly REFRESH_INTERVAL_IN_MS = 10 * 1000;
    private messageController = new MessageController(this.nodecg);
    private streamInfoChatBot = new StreamInfoChatBot(this.messageController, this.chatClient, this.nodecg);

    private initChatClient(): void {
        this.streamInfoChatBot.initChatBot();
    }

    private initApiClient(): void {
        setInterval(async () => {
            const category = await this.requestCurrentCategory();
            if (category) {
                this.messageController.setCurrentCategory(category);
            }
            
        }, StreamInfoManager.REFRESH_INTERVAL_IN_MS);
    }

    private async requestCurrentCategory() {
        const user = await this.twitchApiClient?.getClient()?.helix.users.getMe();
        const stream = await user?.getStream();
        const category = await stream?.getGame();
        return category?.name;
    }
}


*/
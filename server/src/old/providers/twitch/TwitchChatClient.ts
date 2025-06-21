import { AuthProvider } from "@twurple/auth";
import { ChatClient } from "@twurple/chat";
import type { ChatMessage } from "@twurple/chat/lib/commands/ChatMessage";
import { Logger } from "../../logger";

export class TwitchChatClient {
    private chatClient: ChatClient | undefined;
    private chatBot: ChatBot | undefined;

    constructor(
        private readonly authProvider: AuthProvider,
        public readonly channel: string,
        private readonly logger: Logger
    ) {
    }

    private static normalizeChannel(channel: string): string {
        if (channel.startsWith("#")) {
            return channel;
        }

        return `#${channel}`;
    }

    public getChatClient(): ChatClient {
        if (!this.chatClient) {
            this.chatClient = new ChatClient({
                authProvider: this.authProvider,
                channels: [TwitchChatClient.normalizeChannel(this.channel)],
            });

            this.chatClient.connect();
        }

        return this.chatClient;
    }

    public getChatBot(): ChatBot {
        if (!this.chatBot) {
            this.chatBot = new ChatBot(this.getChatClient(), this.logger);
        }

        return this.chatBot;
    }
}

/**
 * This ChatBot assumes that all commands are listened to from a single bot instance on a single channel.
 */
export class ChatBot {
    public static readonly COMMAND_SYMBOL = "!";

    constructor(private readonly chatClient: ChatClient, private readonly logger: Logger) {
        this.chatClient = chatClient;
        this.logger.setup.service.info("ChatBot", "Chat bot initialized.");
    }

    private commandTimeouts: Map<string, number> = new Map<string, number>();

    /**
     * Registers a new command and event handling to the chat bot.
     * @param command the command that should be listened to
     * @param exactMatch if set to true, the action is only triggered iff the message only contains the command
     * @param twitchClient the twitch chat client that shall be used to parse messages
     * @param nodecg the current nodecg instance
     * @param action the event handling that is triggered if a command is detected
     * @param timeoutInSeconds sleep time in seconds until the command can be triggered again
     * @returns true if the command was not previously registered and no error happened
     */
    public async registerCommand(command: string,
        exactMatch: boolean,
        action: (user: string, message: string, msg: ChatMessage) => void,
        timeoutInSeconds = 10): Promise<boolean> {

        // Internally register command
        const normalizedCommand = this.normalizeCommand(command);
        if (this.isCommandRegistered(normalizedCommand)) {
            return false;
        }
        this.commandTimeouts.set(normalizedCommand, Date.now());

        this.logger.setup.service.info("ChatBot", `Added chat command "${ChatBot.COMMAND_SYMBOL}${normalizedCommand}".`);

        this.chatClient.onMessage((_, user, message, msg) => {
            if (
                (exactMatch && message.toLowerCase() === `${ChatBot.COMMAND_SYMBOL}${normalizedCommand}`)
                || (!exactMatch && message.toLowerCase().startsWith(`${ChatBot.COMMAND_SYMBOL}${normalizedCommand}`))) {

                // Handle timeouts
                if (Date.now() - (this.commandTimeouts.get(normalizedCommand) ?? Date.now()) > timeoutInSeconds * 1000) {
                    this.commandTimeouts.set(normalizedCommand, Date.now());

                    // Trigger client specified event handling (finally!)
                    action(user, message, msg);
                }
            }
        });

        return true;
    }


    /**
     * Returns a list of registered commands.
     * @returns a list of command keywords
     */
    public getRegisteredCommands(): string[] {
        return [...this.commandTimeouts.keys()];
    }

    /**
     * Returns if the specified command has already been registered
     * @param command the (not normalized) command to test
     * @returns true, if the command has already been registered
     */
    public isCommandRegistered(command: string): boolean {
        return this.getRegisteredCommands().indexOf(this.normalizeCommand(command)) !== -1;
    }

    private normalizeCommand(command: string) {
        return command.toLowerCase().replace(ChatBot.COMMAND_SYMBOL, "");
    }
}
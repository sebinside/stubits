import { AuthProvider } from "@twurple/auth";
import { ChatClient } from "@twurple/chat";

export class TwitchChatClient {
    private chatClient: ChatClient | undefined;

    constructor(
        private readonly authProvider: AuthProvider,
        public readonly channel: string
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
}

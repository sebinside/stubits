import { ApiClient, HelixUser } from "@twurple/api";
import { AuthProvider } from "@twurple/auth";
import { EventSubWsListener } from "@twurple/eventsub-ws";

export class TwitchEventSubClient {
    private listener: EventSubWsListener | undefined;
    private user: HelixUser | undefined;

    constructor(
        private readonly authProvider: AuthProvider,
        public readonly userName: string
    ) {
    }

    public async start(): Promise<void> {
        const apiClient = new ApiClient({
            authProvider: this.authProvider
        });

        const user = await apiClient.users.getUserByName(this.userName);

        if (!user) {
            throw new Error("User not found");
        } else {
            this.user = user;
        }

        this.listener = new EventSubWsListener({
            apiClient,
        });

        this.listener.start();
    }

    public async onRedemption(callback: (awardName: string, userName: string) => void): Promise<void> {
        if (!this.listener) {
            throw new Error("Listener not started");
        }

        this.listener.onChannelRedemptionAdd(this.user!.id, (event) => {
            callback(event.rewardTitle, event.userName);
        });
    }

}


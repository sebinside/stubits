import { Logger } from "../logger";
import { SpotifyClient } from "../providers/spotify/SpotifyClient";
import { StreamElementsServiceClient } from "../providers/streamelements/StreamElementsServiceClient";
import { TwitchChatClient } from "../providers/twitch/TwitchChatClient";
import { TwitchEventSubClient } from "../providers/twitch/TwitchEventSubClient";
import { Service } from "./Service";

export interface StreamBarInfo {
    lastBomb?: string;
    lastSubscriber?: string;
    lastTip?: string;
    lastCheer?: string;
    songName?: string;
    artistName?: string;
}

export class StreamBar extends Service {
    private streamBarInfo: StreamBarInfo = {
        artistName: "",
        lastBomb: "",
        lastCheer: "",
        lastSubscriber: "",
        lastTip: "",
        songName: ""
    };
    private lastGift = "";

    async run(): Promise<void> {
        await this.initSpotifyClient();
        this.initStreamelementsClient();
        await this.initTwitchClient();
    }

    constructor(public readonly webSocketPort: number, private readonly spotifyClient: SpotifyClient, private readonly streamElementsClient: StreamElementsServiceClient, private readonly twitchChatClient: TwitchChatClient, private readonly logger: Logger) {
        super(webSocketPort);
    }

    private async initTwitchClient(): Promise<void> {
        this.twitchChatClient.getChatBot().registerCommand("song", true,
            async (_: string, __: string, msg) => {
                await this.retrieveCurrentSong();
                // TODO: Refactor and provide method that does not require the channel
                this.twitchChatClient.getChatClient().say(this.twitchChatClient.channel, `Der aktuelle Song ist "${this.streamBarInfo.songName}" von ${this.streamBarInfo.artistName}`, { replyTo: msg });
            });
    }

    private initStreamelementsClient(): void {
        this.streamElementsClient.onSubscriber(data => {
            // Sub bomb handling
            if (data.data.gifted === true) {
                if (this.lastGift === data.data.sender) {
                    const lastBomb = data.data.sender;
                    this.streamBarInfo.lastBomb = lastBomb;
                    this.logger.run.tile.info("StreamBar", `Retrieved sub bomb: ${lastBomb}`);
                }
                this.lastGift = data.data.sender ?? "";
            } else {
                this.lastGift = "";
            }

            // Default last sub handling
            const lastSubscriber = data.data.displayName;
            this.streamBarInfo.lastSubscriber = lastSubscriber;
            this.logger.run.tile.info("StreamBar", `Retrieved subscriber: ${lastSubscriber}`);
            this.sendUpdates();
        });

        this.streamElementsClient.onTip(data => {
            const lastTip = data.data.username;
            this.streamBarInfo.lastTip = lastTip;
            this.logger.run.tile.info("StreamBar", `Retrieved tip: ${lastTip}`);
            this.sendUpdates();
        })

        this.streamElementsClient.onCheer(data => {
            const lastCheer = data.data.displayName;
            this.streamBarInfo.lastCheer = lastCheer;
            this.logger.run.tile.info("StreamBar", `Retrieved cheer: ${lastCheer}`);
            this.sendUpdates();
        })
    }

    private async initSpotifyClient(): Promise<void> {
        setInterval(() => this.retrieveCurrentSong(), 5000);
    }

    private async retrieveCurrentSong(): Promise<void> {
        const spotifyClient = await this.spotifyClient.createClient();
        const currentTrack = await spotifyClient.getMyCurrentPlayingTrack({});
        const songName = currentTrack?.body.item?.name;
        if (currentTrack?.body.currently_playing_type === "track") {
            const currentSong = currentTrack.body.item as SpotifyApi.TrackObjectFull;
            const artistName = currentSong.artists[0]?.name;
            if ((this.streamBarInfo.songName ?? "") !== songName) {
                this.streamBarInfo.songName = songName;
                this.streamBarInfo.artistName = artistName;
            }
            this.sendUpdates();
        }
    }

    private sendUpdates() {
        this.webSockets.forEach(ws => ws.send(JSON.stringify(this.streamBarInfo)));
    }
}

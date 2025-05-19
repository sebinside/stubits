import { Logger } from "../logger";
import { TwitchEventSubClient } from "../providers/twitch/TwitchEventSubClient";
import { Service } from "./Service";
import { WebSocket } from "ws";

type UITask = {
    done: boolean
    description: string
}

type StreamTodoMessageFormat = {
    checkMarkHue: number,
    tasks: UITask[]
}

export class StreamTodo extends Service {

    private state: StreamTodoMessageFormat = {
        checkMarkHue: 78,
        tasks: []
    };

    constructor(public readonly webSocketPort: number, private readonly twitchEventSubClient: TwitchEventSubClient, private readonly logger: Logger) {
        super(webSocketPort);
    }

    protected onWebSocketServerMessage(ws: WebSocket, message: string): void {
        const parsedMessage = JSON.parse(message) as StreamTodoMessageFormat;
        this.state = parsedMessage;
        this.logger.run.service.info("StreamTodo", "New state received.");

        // Broadcast the new state to all other connected clients
        for (const socket of this.webSockets) {
            if (socket !== ws) {
                socket.send(JSON.stringify(this.state));
            }
        }

    }

    protected onWebSocketOpenConnection(ws: WebSocket): void {
        // Initialize by broadcasting the server's knowledge of the state
        ws.send(JSON.stringify(this.state));
    }

    public run(): void {
        // TODO: The final version should enable the reward here
        this.twitchEventSubClient.onRedemption((rewardTitle, userName, message) => {
            if (rewardTitle === "TODO Häkchen einfärben") {
                this.logger.run.service.info("StreamTodo", `${userName} redeemed ${rewardTitle}`);

                let newColorValue = 78;

                if (!isNaN(parseInt(message))) {
                    const number = parseInt(message);
                    if (number >= 0 && number < 360) {
                        this.logger.run.service.info("StreamTodo", `Received valid number: ${number}`);
                        newColorValue = number;
                    }
                }

                this.state.checkMarkHue = newColorValue;
                this.webSockets.forEach(ws => ws.send(JSON.stringify(this.state)));
            }
        });
    }
}
import { WebSocket, WebSocketServer } from "ws";

export abstract class Service {
  private wss: WebSocketServer | undefined = undefined;
  protected webSocket : WebSocket | undefined = undefined;

  public constructor(public readonly webSocketPort: number | "none") {
    if (
      this.webSocketPort != "none" &&
      (this.webSocketPort < 1024 || this.webSocketPort > 65535)
    ) {
      throw new Error("WebSocket port must be between 1024 and 65535.");
    }

    this.setupWebSocketServer();
  }

  protected setupWebSocketServer(): void {
    if (this.webSocketPort === "none") {
      console.log(
        `WebSocket server of service "${this.constructor.name}" is disabled.`
      );
      return;
    }

    this.wss = new WebSocketServer({ port: this.webSocketPort });
    console.log(
      `WebSocket server of service "${this.constructor.name}" started on port ${this.webSocketPort}`
    );

    this.wss.on("connection", (ws) => {
      console.log(`Client connected to service "${this.constructor.name}"`);
      this.webSocket = ws;

      ws.on("message", (message) => {
        console.log(`Service "${this.constructor.name}" received: ${message}`);
        this.onWebSocketServerMessage(message.toString());
      });

      ws.on("close", () => {
        console.log(
          `Client disconnected from service "${this.constructor.name}"`
        );
      });
    });
  }

  protected abstract onWebSocketServerMessage(message: string): void;

  // TODO: Rename signature
  public abstract run(): void;
}

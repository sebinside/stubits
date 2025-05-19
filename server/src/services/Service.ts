import { WebSocket, WebSocketServer } from "ws";

// TODO: Add StatefulService that has a state that is broadcasted to all clients
export abstract class Service {
  private wss: WebSocketServer | undefined = undefined;
  protected webSockets: Set<WebSocket> = new Set();

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

    this.wss.on("connection", (ws : WebSocket) => {
      console.log(`Client connected to service "${this.constructor.name}"`);
      this.webSockets.add(ws);
      this.onWebSocketOpenConnection(ws);

      ws.on("message", (message) => {
        console.log(`Service "${this.constructor.name}" received: ${message}`);
        this.onWebSocketServerMessage(ws, message.toString());
      });

      ws.on("close", () => {
        console.log(
          `Client disconnected from service "${this.constructor.name}"`
        );
        this.webSockets.delete(ws);
      });
    });
  }

  protected onWebSocketServerMessage(ws: WebSocket, message: string): void {}

  protected onWebSocketOpenConnection(ws: WebSocket): void {
    // by default, do nothing
  };

  // TODO: Rename signature
  public abstract run(): void;
}

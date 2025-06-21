export interface Tile {
    setup(): void;
    start(): void;
    stop(): void;
    isRunning(): boolean;
    getName(): string;
    getWebSocketChannels(): string[];
}

// TODO: Tiles could probably be an abstract class
// each tile has a d default name but can be changed if multiple instances are needed, last parameter in the constructor

// Lifecycle: credentials in constructor, setup creates the tile, start starts it
// TODO: Is this applicable? Can we remove the setup method?
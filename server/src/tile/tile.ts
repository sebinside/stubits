import { Logger } from '../core/logger';

export abstract class Tile {
    protected isTileRunning = false;

    // tileName can be the default name of the tile type or a custom name if multiple instances are needed
    constructor(private readonly config: Record<string, string>, private readonly logger: Logger, private readonly tileName: string) {
        this.logger.setup.tile.info(tileName, `Tile ${tileName} created.`);

        if (!this.config || Object.keys(this.config).length === 0) {
            this.logger.setup.tile.debug(tileName, "No configuration provided for this tile.");
        }
    }

    isRunning(): boolean {
        return this.isTileRunning;
    }
    getName(): string {
        return this.tileName;
    }

    abstract start(): void;
    abstract stop(): void;
    abstract getChannelNames(): string[];
}

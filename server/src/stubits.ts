import { Service } from "./service/service";
import { Tile } from "./tile/tile";

export class Stubits {
    private registeredServices: Service[] = [];
    private registeredTiles: Tile[] = [];

    constructor() {

    }

    registerService<T extends Service>(service: T): T {
        this.registeredServices.push(service);
        return service;
    }

    registerTile<T extends Tile>(tile: T): T {
        this.registeredTiles.push(tile);
        return tile;
    }

    startAllServices(): void {
        // TODO: Proper error handling
        this.registeredServices.forEach(service => {
            service.start();
        });
    }

    startAllTiles(): void {
        // TODO: Proper error handling
        this.registeredTiles.forEach(tile => {
            tile.start();
        });
    }
}

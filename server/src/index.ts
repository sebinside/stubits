import { CommunicationManager } from "./core/communication";
import { DatabaseManager } from "./core/database";
import { Logger } from "./core/logger";

console.log("hello world");

const logger = new Logger("debug");
const db = new DatabaseManager(logger);
const comm = new CommunicationManager(logger);
initializeDB().then(() => {
    logger.setup.core.info("index.ts", "Database initialized successfully.");
    comm.initialize();
}).catch((error) => {
    logger.setup.core.error("index.ts", `Failed to initialize database: ${error.message}`);
});

async function initializeDB() {
    let dbInitialized = false;
    do {
        dbInitialized = await db.initialize();
    } while (!dbInitialized);
}

// const twitchChat = Stubits.registerService(new TwitchChat(credentials));
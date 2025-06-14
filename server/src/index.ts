import chalk from "chalk";
import { config } from "dotenv";
import express from "express";
import fs from "fs";
import { WebSocketServer } from "ws";
import { SpotifyClient } from "./providers/spotify/SpotifyClient";
import { TwitchAuthHandler } from "./providers/twitch/TwitchAuthHandler";
import { TwitchChatClient } from "./providers/twitch/TwitchChatClient";
import { TwitchEventSubClient } from "./providers/twitch/TwitchEventSubClient";
import { SubArchiveService } from "./services/SubArchiveService";
import { exit } from "process";
import { Logger } from "./logger";
import { StreamBar } from "./services/StreamBar";
import { StreamElementsServiceClient } from "./providers/streamelements/StreamElementsServiceClient";
import { StaticAuthProvider } from "@twurple/auth";
import { StreamTodo } from "./services/StreamTodo";
import { StreamInfo } from "./services/StreamInfo/StreamInfo";
import { ApiClient } from "@twurple/api";

config({ path: "../../.env" });
const basePort = 42750;

const logger = new Logger("debug");
logger.run.core.debug("asdf", "Starting stubits-minimal server.");
logger.setup.service.debug("index", "Starting stubits-minimal server.");
logger.run.tile.debug("xyz", "Starting stubits-minimal server.");
logger.setup.core.info("index", "Starting stubits-minimal server.");

console.log(chalk.blue("Hello world!"));
console.log(chalk.green(`stubits-minimal base port is ${basePort}.`));
const router = express();
router.listen(basePort);

const streamElementsClient = new StreamElementsServiceClient(
  process.env.STREAM_ELEMENTS_JWT_TOKEN || "",
  false
);

// Sub archive service ready to go
const subArchive = new SubArchiveService("none", streamElementsClient);
subArchive.run();

// Spotify usable
const spotifyClient = new SpotifyClient(
  router,
  basePort,
  process.env.SPOTIFY_CLIENT_ID!,
  process.env.SPOTIFY_CLIENT_SECRET!,
  ["user-read-currently-playing", "user-read-playback-state"]
);

spotifyClient.createClient().then((client) => {
  console.log("Spotify client created successfully.");
  SpotifyClient.retrieveCurrentSong(client);
});

const twitchAuth = new TwitchAuthHandler(
  router,
  basePort,
  process.env.TWITCH_CLIENT_ID!,
  process.env.TWITCH_CLIENT_SECRET!,
  ["chat:read", "chat:edit", "channel:read:redemptions"]
);

twitchAuth.getAuthProvider().then((authProvider) => {
  if (!authProvider) {
    console.error("Failed to create Twitch auth provider.");
  } else {
    console.log("Twitch auth provider created successfully.");

    // Setup Chat
    const twitchChatClient = new TwitchChatClient(
      authProvider,
      "#skate702",
      logger
    );

    twitchChatClient.getChatClient().onMessage((_, user, message) => {
      console.log(`Received message from ${user}: ${message}`);
    });

    // Setup EventSub 
    const twitchEventSubClient = new TwitchEventSubClient(
      authProvider,
      "skate702"
    );

    twitchEventSubClient.start().then(() => {
      console.log("Twitch EventSub client started successfully.");

      twitchEventSubClient.onRedemption((rewardTitle, userName, _) => {
        console.log(`New channel redemption: ${rewardTitle}, ${userName}`);
      });

      const botChatClient = new TwitchChatClient(new StaticAuthProvider(
        process.env.TWITCH_CLIENT_ID!,
        process.env.TWITCH_BOT!
      ), "#skate702", logger);

      const streamBar = new StreamBar(
        42752,
        spotifyClient,
        streamElementsClient,
        botChatClient,
        logger
      );

      streamBar.run();

      const streamTodo = new StreamTodo(
        42753,
        twitchEventSubClient,
        logger
      );

      streamTodo.run();

      const apiClient = new ApiClient({
        authProvider: authProvider
      });

      const streamInfo = new StreamInfo(
        42754,
        42755,
        twitchChatClient,
        apiClient,
        "skate702",
        logger
      );

      streamInfo.run();
    });
  };
});


// END FOR TESTING ONLY

function testOtherStuff() {
  console.log(process.env.PORT);
  console.log(process.env.SECRET_KEY);

  const wss = new WebSocketServer({ port: 42580 });

  wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.send("Welcome from server!");

    ws.send(`Secret is ${process.env.SECRET_KEY}`);

    ws.on("message", (message) => {
      console.log(`Received: ${message}`);
      ws.send(`You said: ${message}`);
    });

    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });

  console.log("Test");
  const files: string[] = fs.readdirSync("./");
  console.log(files);
  console.log("Test2");
}

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

config({ path: "../../.env" });
const basePort = 42750;

console.log(chalk.blue("Hello world!"));
console.log(chalk.green(`stubits-minimal base port is ${basePort}.`));
const router = express();
router.listen(basePort);

// Sub archive service ready to go
const subArchive = new SubArchiveService("none");
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
      "skate702"
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

      twitchEventSubClient.onRedemption((awardName, userName) => {
        console.log(`New channel redemption: ${awardName}, ${userName}`);
      });
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

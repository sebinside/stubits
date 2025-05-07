import fs from "fs";
import { WebSocketServer } from "ws";
import { config } from "dotenv";
import { SubArchiveService } from "./services/SubArchiveService";
import chalk from "chalk";
import { SpotifyClient } from "./providers/spotify/SpotifyClient";
import SpotifyWebApi from "spotify-web-api-node";

config({ path: "../../.env" });

console.log(chalk.blue("Hello world!"));

// Sub archive service ready to go
const subArchive = new SubArchiveService("none");
subArchive.run();

// Spotify usable
const spotifyClient = new SpotifyClient(
  9090,
  process.env.SPOTIFY_CLIENT_ID!,
  process.env.SPOTIFY_CLIENT_SECRET!,
  ["user-read-currently-playing", "user-read-playback-state"]
);

spotifyClient.createClient().then((client) => {
  console.log("Spotify client created successfully.");
  SpotifyClient.retrieveCurrentSong(client);
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

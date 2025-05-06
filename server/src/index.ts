import fs from "fs";
import { WebSocketServer } from "ws";
import { config } from "dotenv";
import { SubArchiveService } from "./services/SubArchiveService";

config({ path: "../../.env" });

const streamSubService = new SubArchiveService("none");
streamSubService.run();

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

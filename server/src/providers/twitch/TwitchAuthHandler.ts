import {
  AuthProvider,
  getTokenInfo as twitchGetTokenInfo,
  StaticAuthProvider,
  TokenInfo,
  exchangeCode,
  RefreshingAuthProvider,
  AccessToken,
} from "@twurple/auth";
import open from "open";
import express, { Router } from "express";
import { ChatClient } from "@twurple/chat";
import { ApiClient } from "@twurple/api";
import { EventSubWsListener } from "@twurple/eventsub-ws";

export class TwitchAuthHandler {
  private userId: string | null = null;
  private tokenData: AccessToken | null = null;

  constructor(
    private readonly router: express.Application,
    private readonly port: number,
    private readonly clientId: string,
    private readonly clientSecret: string
  ) {
    const randomState = crypto.randomUUID();
    const codeGrantFlowURL = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${this.clientId}&redirect_uri=http://localhost:${this.port}/twitchcallback&state=${randomState}&scope=chat:read+chat:edit+channel:read:redemptions`;

    this.router.get("/twitchcallback", async (req, res) => {
      if (randomState !== req.query.state) {
        throw new Error("State does not match.");
      }

      const code = req.query.code?.toString() ?? "";
      const redirectURL = `http://localhost:${this.port}/twitchcallback`;
      await exchangeCode(clientId, clientSecret, code, redirectURL).then(
        (data) => {
          const accessToken = data.accessToken;
          const refreshToken = data.refreshToken;

          this.tokenData = {
            accessToken,
            refreshToken,
            scope: data.scope,
            expiresIn: data.expiresIn,
            obtainmentTimestamp: Date.now(),
          };

          const authProvider = new RefreshingAuthProvider({
            clientId: this.clientId,
            clientSecret: this.clientSecret,
          });

          authProvider.onRefresh((_, newTokenData) => {
            this.tokenData = newTokenData;
          });

          authProvider.addUserForToken(this.tokenData, ["chat"]);

          const apiClient = new ApiClient({
            authProvider,
          });

          apiClient.users.getUserByName("skate702").then((user) => {
            this.userId = user?.id || null;

            const listener = new EventSubWsListener({
              apiClient,
            });

            listener.start();

            listener.onChannelRedemptionAdd(this.userId!, (event) => {
              console.log(
                `New channel redemption: ${event.rewardId}, ${event.rewardTitle}`
              );
            });
          });

          const chatClient = new ChatClient({
            authProvider,
            channels: ["#skate702"],
          });

          chatClient.connect();

          chatClient.onMessage((_, user, message) => {
            console.log(`Received message from ${user}: ${message}`);
          });
        }
      );

      const callbackWebsite =
        "<html><head><script>window.close();</script></head><body>Twitch connection successful! You may close this window now.</body></html>";
      res.send(callbackWebsite);
    });

    open(codeGrantFlowURL);
  }
}

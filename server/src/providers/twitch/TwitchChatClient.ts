import {
  AuthProvider,
  getTokenInfo as twitchGetTokenInfo,
  StaticAuthProvider,
  TokenInfo,
  exchangeCode,
  RefreshingAuthProvider,
} from "@twurple/auth";
import open from "open";
import express, { Router } from "express";

export class TwitchChatClient {
  constructor(
    private readonly router: express.Application,
    private readonly port: number,
    private readonly clientId: string,
    private readonly clientSecret: string
  ) {
    // TODO: Randomly generate state!
    const codeGrantFlowURL = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${this.clientId}&redirect_uri=http://localhost:${this.port}/twitchcallback&state=c3ab8aa609ea11e793ae92361f002671`;

    this.router.get("/twitchcallback", async (req, res) => {
      const code = req.query.code?.toString() ?? "";
      const redirectURL = `http://localhost:${this.port}/twitchcallback`;
      const tokenData = await exchangeCode(
        clientId,
        clientSecret,
        code,
        redirectURL
      ).then((data) => {
        const accessToken = data.accessToken;
        const refreshToken = data.refreshToken;
        // TODO: Setup token refresh, see https://twurple.js.org/docs/examples/chat/basic-bot.html
      });

      const callbackWebsite =
        "<html><head><script>window.close();</script></head><body>Twitch connection successful! You may close this window now.</body></html>";
      res.send(callbackWebsite);
    });

    open(codeGrantFlowURL);
  }

  private async createAuthProvider(
    clientId: string,
    accessToken: string
  ): Promise<AuthProvider> {
    return new StaticAuthProvider(clientId, accessToken);
  }
}

import {
  AccessToken,
  AuthProvider,
  exchangeCode,
  RefreshingAuthProvider
} from "@twurple/auth";
import express from "express";
import open from "open";

export class TwitchAuthHandler {
  private static readonly oAuthURL = "https://id.twitch.tv/oauth2/authorize";
  private static readonly callbackPath = "twitchcallback";
  private static readonly callbackWebsiteHTML =
    "<html><head><script>window.close();</script></head><body>Twitch OAuth callback received! You may close this window now.</body></html>";

  private readonly callbackURL: string;
  private accessToken: AccessToken | undefined;
  private authProvider: AuthProvider | undefined;
  private oAuthCode: string | undefined;


  constructor(
    private readonly router: express.Router,
    private readonly port: number,
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly scopes: string[]
  ) {
    this.callbackURL = `http://localhost:${this.port}/${TwitchAuthHandler.callbackPath}`
  }

  public async getAuthProvider(): Promise<AuthProvider | undefined> {
    if (!this.authProvider) {
      await this.authenticate();
    }

    return this.authProvider;
  }

  private async authenticate(): Promise<boolean> {
    if (this.authProvider) {
      return true;
    }

    const randomState = crypto.randomUUID();
    const codeGrantFlowURL = `${TwitchAuthHandler.oAuthURL}?response_type=code&client_id=${this.clientId}&redirect_uri=${this.callbackURL}&state=${randomState}&scope=${this.createScopeRequest()}`;

    this.router.get(`/${TwitchAuthHandler.callbackPath}`, (req, res) => {
      if (randomState !== req.query.state) {
        res.status(403).send("State does not match.");
      } else {
        this.oAuthCode = req.query.code ? req.query.code.toString() : undefined;
        res.send(TwitchAuthHandler.callbackWebsiteHTML);
      }
    });

    // Is there no better way to do this on Windows?
    open(codeGrantFlowURL);
    await new Promise((resolve) => {
      const interval = setInterval(() => {
        if (this.oAuthCode) {
          clearInterval(interval);
          resolve(true);
        }
      }, 100);
    });

    if (!this.oAuthCode) {
      return false;
    }

    this.accessToken = await exchangeCode(this.clientId, this.clientSecret, this.oAuthCode, this.callbackURL);

    this.authProvider = this.createAuthProvider();
    return !!this.authProvider;
  }

  private createScopeRequest(): string {
    return this.scopes.join("+");
  }

  private createAuthProvider(): AuthProvider | undefined {
    if (!this.accessToken) {
      return undefined;
    }

    const authProvider = new RefreshingAuthProvider({
      clientId: this.clientId,
      clientSecret: this.clientSecret,
    });

    authProvider.onRefresh((_, newTokenData) => {
      this.accessToken = newTokenData;
    });

    authProvider.addUserForToken(this.accessToken, ["chat"]);

    return authProvider;
  }
}

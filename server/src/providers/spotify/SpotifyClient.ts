import SpotifyWebApi from "spotify-web-api-node";
import express, { Router } from "express";
import open from "open";

export class SpotifyClient {
  private readonly callbackEndpoint = "/spotifycallback";
  private readonly defaultState = "defaultState";
  private readonly refreshInterval = 1800000;
  
  private callbackUrl = "";
  private spotifyApiClient: SpotifyWebApi | undefined;
  
  constructor(
    private readonly router: express.Application,
    private readonly port: number,
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly scopes: string[],
    private refreshToken?: string
  ) {
    if (scopes === undefined || scopes.length === 0) {
      throw Error("Scopes are empty. Please specify at least one scope!");
    }
    this.callbackUrl = `http://localhost:${this.port}${this.callbackEndpoint}`;
  }

  async createClient(): Promise<SpotifyWebApi> {
    if(this.spotifyApiClient) {
      return this.spotifyApiClient;
    }

    console.log("Spotify service connecting...");

    const spotifyApi = new SpotifyWebApi({
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      redirectUri: this.callbackUrl,
    });

    // if we already have a refresh token is available we can use it to create a access token without the need to annoy the user
    // by opening and directly after closing a browser window.
    if (this.refreshToken) {
      try {
        // Load refresh token and use it to get a access token.
        spotifyApi.setRefreshToken(this.refreshToken);
        const refreshData = await spotifyApi.refreshAccessToken();
        spotifyApi.setAccessToken(refreshData.body["access_token"]);
        console.log("Successfully authenticated using saved refresh token.");
      } catch (e) {
        console.warn(
          `Couldn't re-use refresh token ("${e}"). Creating a new one...`
        );
        this.refreshToken = undefined;
        return await this.createClient();
      }
    } else {
      // Creates a callback entry point using express. The promise resolves when this url is called.
      const promise = this.mountCallBackURL(spotifyApi);

      // Create and call authorization URL
      const authorizeURL = spotifyApi.createAuthorizeURL(
        this.scopes,
        this.defaultState
      );
      await open(authorizeURL);

      await promise;
      this.refreshToken = spotifyApi.getRefreshToken();
    }

    console.log("Successfully connected to Spotify.");

    this.startTokenRefreshing(spotifyApi);
    this.spotifyApiClient = spotifyApi;
    return spotifyApi;
  }

  private mountCallBackURL(spotifyApi: SpotifyWebApi) {
    return new Promise((resolve) => {
      this.router.get(this.callbackEndpoint, (req, res) => {
        // Get auth code with is returned as url query parameter if everything was successful
        const authCode: string = req.query.code?.toString() ?? "";

        spotifyApi?.authorizationCodeGrant(authCode).then(
          (data) => {
            spotifyApi.setAccessToken(data.body["access_token"]);
            spotifyApi.setRefreshToken(data.body["refresh_token"]);

            resolve(undefined);
          },
          (err) => console.error("Spotify login error!", err)
        );

        // This little snippet closes the oauth window after the connection was successful
        const callbackWebsite =
          "<html><head><script>window.close();</script></head><body>Spotify connection successful! You may close this window now.</body></html>";
        res.send(callbackWebsite);
      });
    });
  }

  private startTokenRefreshing(spotifyApi: SpotifyWebApi) {
    const interval = setInterval(() => {
      if (spotifyApi.getAccessToken() === undefined) {
        clearInterval(interval);
        return;
      }
      spotifyApi.refreshAccessToken().then(
        (data) => {
          console.log("The Spotify access token has been refreshed.");

          // Save the access token so that it's used in future calls
          spotifyApi.setAccessToken(data.body["access_token"]);
        },
        (error) => {
          console.warn("Could not spotify refresh access token", error);
        }
      );
    }, this.refreshInterval);
  }

  static async retrieveCurrentSong(
    spotifyClient: SpotifyWebApi
  ): Promise<void> {
    const currentTrack = await spotifyClient.getMyCurrentPlayingTrack();
    const songName = currentTrack?.body.item?.name;
    if (currentTrack?.body.currently_playing_type === "track") {
      const currentSong = currentTrack.body.item as SpotifyApi.TrackObjectFull;
      const artistName = currentSong.artists[0]?.name;
      console.log(`Currently playing: ${songName} by ${artistName}`);
    }
  }
}

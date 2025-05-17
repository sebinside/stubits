import { Service } from "./Service";
import { StreamElementsServiceClient } from "../providers/streamelements/StreamElementsServiceClient";
import { Knex } from "knex";
import { SQLClient, SQLConfig } from "../providers/sql/SQLClient";

export class SubArchiveService extends Service {
  private sqlClient: Knex | undefined = undefined;
  private sqlConfig: SQLConfig;

  constructor(webSocketPort: "none", private readonly streamElementsClient: StreamElementsServiceClient) {
    super(webSocketPort);

    this.sqlConfig = {
      client: process.env.SQL_CLIENT || "",
      connection: {
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DATABASE,
      },
    };

    this.registerEvents();
  }

  private readonly table = "public";

  protected onWebSocketServerMessage(_: string): void {
    // ignore all messages
  }

  private registerEvents() {
    this.streamElementsClient?.onSubscriber(async (data) => {
      const name = data.data.displayName;
      const length = data.data.amount;
      const lastseen = new Date();
      const count = 0;

      const entry = {
        name,
        length,
        lastseen,
        count,
      };

      const sql = this.sqlClient;

      if (sql) {
        const dbEntry = await sql(this.table)
          .select()
          .where("name", name)
          .first();

        if (dbEntry !== undefined) {
          entry.count = dbEntry.count + 1;

          if (dbEntry.length < length) {
            entry.length = length;
            entry.lastseen = lastseen;
          }

          await sql(this.table).where("name", name).update(entry);
          console.log(`DB: Updated ${name}`);
        } else {
          await sql(this.table).insert(entry);
          console.log(`DB: Inserted ${name}`);
        }
      } else {
        console.log("SQL client not available");
      }
    });
  }

  public run(): void {
    this.sqlClient = new SQLClient(this.sqlConfig).createClient();
    this.streamElementsClient.connect().then(() => {
      console.log(
        `StreamElements connection of service "${this.constructor.name}" successful.`
      );
    });
  }
}

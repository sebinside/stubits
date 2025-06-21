import knex, { Knex } from "knex";

export interface SQLConfig {
  client: string;
  connection: Record<string, unknown>;
}

export class SQLClient {
  constructor(private readonly config: SQLConfig) {
    if (config.client === "mysql" || config.client === "pg") {
      if (
        !config.connection.host ||
        !config.connection.user ||
        !config.connection.password ||
        !config.connection.database
      ) {
        throw Error(
          "Invalid config. Either host, user, password or database is missing."
        );
      }
    } else if (config.client === "sqlite3" && !config.connection.filename) {
      throw Error("Invalid config. Filename is missing.");
    }
  }

  createClient(): Knex {
    const knexInstance = knex(this.config);
    console.log("Successfully created sql client.");
    return knexInstance;
  }
}

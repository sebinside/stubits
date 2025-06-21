import chalk from "chalk";

const LogLevelKeys = ["debug", "info", "warn", "error"];
export type LogLevel = typeof LogLevelKeys[number];

export type ComponentType = "core" | "service" | "tile";

export class Logger {
    constructor(private readonly level: LogLevel = "info") { }

    private log(phase: "setup" | "run", level: LogLevel, componentType: ComponentType, componentName: string, message: string) {
        const logLevelIndex = LogLevelKeys.indexOf(this.level);
        const messageLevelIndex = LogLevelKeys.indexOf(level);
        if (messageLevelIndex < logLevelIndex) {
            return;
        }

        const isSetup = phase === "setup";
        const shortComponentType = componentType.substring(0, 4).toUpperCase();
        const logMessage = `${shortComponentType}:${componentName}: ${message}`;

        switch (level) {
            case "debug":
                isSetup ? console.debug(chalk.bgGreen(chalk.black(logMessage))) : console.debug(chalk.green(logMessage));
                break;
            case "info":
                isSetup ? console.info(chalk.bgCyan(chalk.black(logMessage))) : console.info(chalk.cyan(logMessage));
                break;
            case "warn":
                isSetup ? console.warn(chalk.bgYellow(chalk.black(logMessage))) : console.warn(chalk.yellow(logMessage));
                break;
            case "error":
                isSetup ? console.error(chalk.bgRed(chalk.black(logMessage))) : console.error(chalk.red(logMessage));
                break;
            default:
                throw new Error(`Unknown log level: ${level}`);
        }
    }

    public setup = {
        core: {
            debug: (componentName: string, message: string) => this.log("setup", "debug", "core", componentName, message),
            info: (componentName: string, message: string) => this.log("setup", "info", "core", componentName, message),
            warn: (componentName: string, message: string) => this.log("setup", "warn", "core", componentName, message),
            error: (componentName: string, message: string) => this.log("setup", "error", "core", componentName, message)
        },
        service: {
            debug: (componentName: string, message: string) => this.log("setup", "debug", "service", componentName, message),
            info: (componentName: string, message: string) => this.log("setup", "info", "service", componentName, message),
            warn: (componentName: string, message: string) => this.log("setup", "warn", "service", componentName, message),
            error: (componentName: string, message: string) => this.log("setup", "error", "service", componentName, message)
        },
        tile: {
            debug: (componentName: string, message: string) => this.log("setup", "debug", "tile", componentName, message),
            info: (componentName: string, message: string) => this.log("setup", "info", "tile", componentName, message),
            warn: (componentName: string, message: string) => this.log("setup", "warn", "tile", componentName, message),
            error: (componentName: string, message: string) => this.log("setup", "error", "tile", componentName, message)
        }
    }

    public run = {
        core: {
            debug: (componentName: string, message: string) => this.log("run", "debug", "core", componentName, message),
            info: (componentName: string, message: string) => this.log("run", "info", "core", componentName, message),
            warn: (componentName: string, message: string) => this.log("run", "warn", "core", componentName, message),
            error: (componentName: string, message: string) => this.log("run", "error", "core", componentName, message)
        },
        service: {
            debug: (componentName: string, message: string) => this.log("run", "debug", "service", componentName, message),
            info: (componentName: string, message: string) => this.log("run", "info", "service", componentName, message),
            warn: (componentName: string, message: string) => this.log("run", "warn", "service", componentName, message),
            error: (componentName: string, message: string) => this.log("run", "error", "service", componentName, message)
        },
        tile: {
            debug: (componentName: string, message: string) => this.log("run", "debug", "tile", componentName, message),
            info: (componentName: string, message: string) => this.log("run", "info", "tile", componentName, message),
            warn: (componentName: string, message: string) => this.log("run", "warn", "tile", componentName, message),
            error: (componentName: string, message: string) => this.log("run", "error", "tile", componentName, message)
        }
    }
}

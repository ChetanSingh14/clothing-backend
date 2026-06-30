import pino from "pino";

const isProd = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "Production";

const baseOptions: pino.LoggerOptions = {
  timestamp: pino.stdTimeFunctions.isoTime,
  base: null, 
};

export const appLogger = pino(
  {
    ...baseOptions,
    level: isProd ? "info" : "debug",
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true, 
        translateTime: "yyyy-mm-dd HH:MM:ss",
        ignore: "pid,hostname",
        destination: 1,
      },
    },
  }
);

export const reqLogger = pino(
  {
    ...baseOptions,
    level: "info",
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "yyyy-mm-dd HH:MM:ss",
        ignore: "pid,hostname",
        destination: 1, 
      },
    },
  }
);

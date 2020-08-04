import pino from "pino";

const dest = pino.destination({ sync: false });

const logger = pino(
  process.env.NODE_ENV !== "production"
    ? {
        prettyPrint: {
          levelFirst: true,
        },
        prettifier: require("pino-pretty"),
      }
    : {},
  dest
);

setInterval(function () {
  logger.flush();
}, 10000).unref();

export default logger;

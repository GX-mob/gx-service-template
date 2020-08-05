import pino from "pino";

const dest = pino.destination({ sync: false });

const logger = pino(
  /* istanbul ignore next */
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

// asynchronously flush every 10 seconds to keep the buffer empty
// in periods of low activity
/* istanbul ignore next */
setInterval(function () {
  logger.flush();
}, 10000).unref();

export default logger;

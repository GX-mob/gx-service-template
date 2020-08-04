import logger from "./logger";

export const handleRejectionByUnderHood = (promise: Promise<any>) => {
  promise.catch((error) => logger.error(error));
};

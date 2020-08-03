if (process.env.NODE_ENV !== "production") {
  require("dotenv").config(); // eslint-disable-line @typescript-eslint/no-var-requires
}

import { join } from "path";
import "reflect-metadata";
import fastify, { FastifyInstance, FastifyServerOptions } from "fastify";
import fastifyMultipart from "fastify-multipart";
import fastifyRateLimit from "fastify-rate-limit";
import fastifyCircuitBreak from "fastify-circuit-breaker";
import fastifyGracefulShutdown from "fastify-graceful-shutdown";
import fastifyRedis from "fastify-redis";
import { bootstrap } from "fastify-decorators";
import pino from "pino";

export default function instanceBootstrap(
  opts: FastifyServerOptions
): FastifyInstance {
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

  const instance: FastifyInstance = fastify({ ...opts, logger });

  const redisConfig =
    process.env.NODE_ENV === "production"
      ? { url: process.env.REDIS_URI }
      : { client: new (require("ioredis-mock"))() };

  // Third-party plugins
  instance.register(fastifyMultipart);
  instance.register(fastifyCircuitBreak);
  instance.register(fastifyRedis, redisConfig);
  instance.register(fastifyGracefulShutdown);

  instance.register(fastifyRateLimit, {
    max: 100,
    timeWindow: 1000 * 60,
    redis: instance.redis,
  });

  // Controllers autoload
  instance.register(bootstrap, {
    directory: join(__dirname, "controllers"),
    mask: /(\.)?(controller)\.(js|ts)$/,
  });

  return instance;
}

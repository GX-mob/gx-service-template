const isProduction = process.env.NODE_ENV === "production";

if (!isProduction) {
  require("dotenv").config(); // eslint-disable-line @typescript-eslint/no-var-requires
}

import { join } from "path";
import "reflect-metadata";
import Mongoose from "mongoose";
import fastify, { FastifyInstance, FastifyServerOptions } from "fastify";
import fastifyMultipart from "fastify-multipart";
import fastifyRateLimit from "fastify-rate-limit";
import fastifyCircuitBreak from "fastify-circuit-breaker";
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

  // Database connection

  instance.register(async () => {
    Mongoose.connection.on("connected", () => {
      instance.log.info({ actor: "MongoDB" }, "connected");
    });

    Mongoose.connection.on("disconnected", () => {
      instance.log.error({ actor: "MongoDB" }, "disconnected");
    });

    let MONGO_URI: string;

    if (isProduction) {
      MONGO_URI = process.env.MONGO_URI;
    } else {
      const { MongoMemoryServer } = require("mongodb-memory-server"); // eslint-disable-line @typescript-eslint/no-var-requires
      const memoryServer = new MongoMemoryServer();
      MONGO_URI = await memoryServer.getUri();
    }

    await Mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      keepAlive: true,
    });
  });

  const redisConfig =
    process.env.NODE_ENV === "production"
      ? { url: process.env.REDIS_URI }
      : { client: new (require("ioredis-mock"))() };

  // Third-party plugins
  instance.register(fastifyMultipart);
  instance.register(fastifyCircuitBreak);
  instance.register(fastifyRedis, redisConfig);
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

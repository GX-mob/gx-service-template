if (process.env.NODE_ENV !== "production") {
  require("dotenv").config(); // eslint-disable-line @typescript-eslint/no-var-requires
}

import { join } from "path";
import fastify, { FastifyInstance, FastifyServerOptions } from "fastify";
import fastifyMultipart from "fastify-multipart";
import fastifyRateLimit from "fastify-rate-limit";
import fastifyCircuitBreak from "fastify-circuit-breaker";
import fastifyRedis from "fastify-redis";
import { bootstrap } from "fastify-decorators";
import "reflect-metadata";

export default function instanceBootstrap(
  opts: FastifyServerOptions = { logger: true }
): FastifyInstance {
  const instance: FastifyInstance = fastify(opts);

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

import * as sourceMapSupport from "source-map-support";
sourceMapSupport.install();
import { FastifyInstance } from "fastify";

import bootstrap from "../bootstrap";

let instance: FastifyInstance;

const start = async () => {
  try {
    instance = bootstrap({
      logger: true,
      trustProxy: true,
    });

    await instance.ready();

    await instance.listen(
      parseInt(process.env.PORT) || 8080,
      process.env.IP || "0.0.0.0"
    );

    console.log(instance.printRoutes());
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

process.on("uncaughtException", (error) => {
  instance.log.error(error);
});
process.on("unhandledRejection", (error) => {
  instance.log.error(error);
});

start();

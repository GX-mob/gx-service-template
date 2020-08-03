#!/usr/bin/env node
"use-strict";
require("source-map-support").install(); // eslint-disable-line

const bootstrap = require("../dist/bootstrap").default; // eslint-disable-line
const instance = bootstrap({
  trustProxy: true,
});

instance.ready(async (err) => {
  if (err) {
    instance.log.error(err);
    return process.exit(1);
  }

  await instance.listen(
    Number(process.env.PORT) || 8080,
    process.env.IP || "0.0.0.0"
  );

  const routes = instance.printRoutes();

  console.log(routes);
});

process.on("uncaughtException", (error) => {
  instance.log.error(error);
});
process.on("unhandledRejection", (error) => {
  instance.log.error(error);
});

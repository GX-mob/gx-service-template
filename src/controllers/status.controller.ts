import { Controller, GET, HEAD } from "fastify-decorators";
import { ExampleMiddleware } from "../middlewares/example";

const schema = {
  response: {
    "200": {
      service_id: { type: "string" },
      date: { type: "string" },
      works: { type: "boolean" },
    },
  },
};

type Response = { service_id: string; date: Date; works: boolean };

@Controller("/status")
export default class StatusController extends ExampleMiddleware {
  @HEAD({
    url: "/",
    options: {
      schema,
    },
  })
  @GET({
    url: "/",
    options: {
      schema,
    },
  })
  async handler(): Promise<Response> {
    return this.getStatus();
  }

  getStatus = (): Response => ({
    service_id: process.env.SERVICE_NAME,
    date: new Date(),
    works: true,
  });
}

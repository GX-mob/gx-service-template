import { Controller, GET, HEAD } from "fastify-decorators";

const options = {
  url: "/",
  options: {
    schema: {
      response: {
        "200": {
          service_id: { type: "string" },
          date: { type: "string" },
          works: { type: "boolean" },
        },
      },
    },
  },
};

type Response = { service_id: string; date: Date; works: boolean };

@Controller("/status")
export default class StatusController {
  @HEAD(options)
  @GET(options)
  async handler(): Promise<Response> {
    return this.getStatus();
  }

  getStatus = (): Response => ({
    service_id: process.env.SERVICE_NAME,
    date: new Date(),
    works: true,
  });
}

import { FastifyInstance } from "fastify";
import { configureControllerTest } from "fastify-decorators/testing";
import StatusController from "./status.controller";

describe("Controller: Status", () => {
  let instance: FastifyInstance;

  beforeEach(async () => {
    instance = await configureControllerTest({
      controller: StatusController,
    });
  });

  it("should return the status", async () => {
    const response = await instance.inject({
      url: "/status",
      method: "GET",
    });

    const body = JSON.parse(response.body);

    expect(body.service_id).toBe(process.env.SERVICE_NAME);
    expect(typeof body.date).toBe("string");
    expect(body.works).toBe(true);
  });
});

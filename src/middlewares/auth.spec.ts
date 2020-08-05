/**
 * Authentication/Authorization middleware
 *
 * @group unit/middlewares
 */
import { FastifyInstance } from "fastify";
import {
  FastifyInstanceToken,
  Controller,
  GET,
  Hook,
} from "fastify-decorators";
import { configureControllerTest } from "fastify-decorators/testing";
import { SessionService, DataService } from "../services";
import { AuthMiddleware } from "./auth";
import { Types } from "mongoose";

const unauthorized = {
  statusCode: 401,
  error: "Unauthorized",
  message: "Unauthorized",
};

const forbidden = {
  statusCode: 403,
  error: "Forbidden",
  message: "Forbidden",
};

const internal = {
  statusCode: 500,
  error: "Internal Server Error",
  message: "Internal Server Error",
};

const authorized = { foo: "bar" };

@Controller("/")
class TestController extends AuthMiddleware {
  authSettings = {
    groups: [2],
  };

  @Hook("onRequest")
  onRequestHook(request, _reply, next) {
    request.getRealIp = () => request.ip;
    next();
  }

  @GET("/")
  async handler() {
    return authorized;
  }
}

describe("Middleware: Authentication/Authorization", () => {
  let instance: FastifyInstance;

  const id1 = Types.ObjectId("507f191e810c19729de860ea");
  const id2 = Types.ObjectId("507f191e810c19729de860eb");
  const userAgent = "test";
  const lastIp = "127.0.0.1";

  const fastifyInstanceMock = {
    log: {
      error: jest.fn(),
    },
  };
  const sessionServiceMock = {
    verify: jest.fn(),
  };

  beforeAll(async () => {
    instance = await configureControllerTest({
      controller: TestController,
      mocks: [
        { provide: FastifyInstanceToken, useValue: fastifyInstanceMock },
        { provide: SessionService, useValue: sessionServiceMock },
        {
          provide: DataService,
          useValue: { users: { get: jest.fn().mockResolvedValue({}) } },
        },
      ],
    });
  });

  afterEach(() => jest.resetAllMocks());

  it("should don't authorize", async () => {
    const response = await instance.inject({
      url: "/",
      method: "GET",
    });

    const body = JSON.parse(response.body);

    expect(body).toMatchObject(unauthorized);
  });

  it("should deny due to not have permission", async () => {
    sessionServiceMock.verify.mockResolvedValue({
      _id: id1,
      uid: id2,
      groups: [1],
      userAgent,
      lastIp,
      active: true,
    });

    const response = await instance.inject({
      url: "/",
      method: "GET",
      headers: {
        Authorization: "Bearer XXXXXXXXXXX",
      },
    });

    const body = JSON.parse(response.body);

    expect(body).toMatchObject(forbidden);
  });

  it("should authorize", async () => {
    sessionServiceMock.verify.mockResolvedValue({
      _id: id1,
      uid: id2,
      groups: [2],
      userAgent,
      lastIp,
      active: true,
    });

    const response = await instance.inject({
      url: "/",
      method: "GET",
      headers: {
        Authorization: "Bearer XXXXXXXXXXX",
      },
    });

    const body = JSON.parse(response.body);

    expect(body).toMatchObject(authorized);
  });

  it("should not expose internal errors", async () => {
    sessionServiceMock.verify.mockRejectedValue(new Error("internal"));

    const response = await instance.inject({
      url: "/",
      method: "GET",
      headers: {
        Authorization: "Bearer XXXXXXXXXXX",
      },
    });

    const body = JSON.parse(response.body);

    expect(body).toMatchObject(internal);
    expect(fastifyInstanceMock.log.error.mock.calls.length).toBe(1);
  });
});

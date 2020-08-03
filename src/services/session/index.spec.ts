/**
 * Session Service
 *
 * @group unit/services/session
 */
import { configureServiceTest } from "fastify-decorators/testing";
import { SessionService } from ".";
import { DataService } from "../data";
import { CacheService } from "../cache";

const errorNotHavePrivateKey =
  "should throw error due to not have the privateKey";
let current: string;

(jasmine as any).getEnv().addReporter({
  specStarted: function (result: any) {
    current = result.description;
  },
});

describe("Service: Session", () => {
  const processDotEnv = { ...process.env };

  let service: SessionService;

  const userId = "foo";
  const sid = "foo";
  const ua = "test";
  const ip = "127.0.0.1";

  const dataService = {
    users: {
      get: jest.fn().mockResolvedValue({ _id: userId, groups: [1] }),
    },
    sessions: {
      create: jest.fn().mockResolvedValue({
        _id: sid,
        userAgent: ua,
        lastIp: ip,
      }),
      get: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    },
  };

  const cacheService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    if (current === errorNotHavePrivateKey) {
      const { AUTH_PRIVATE_KEY, ...newEnv } = process.env;

      process.env = newEnv;
    }

    service = configureServiceTest({
      service: SessionService,
      mocks: [
        { provide: DataService, useValue: dataService },
        {
          provide: CacheService,
          useValue: cacheService,
        },
      ],
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it("should create a session", async () => {
    const { token, session } = await service.create(userId, {
      ua,
      ip,
    });

    expect(typeof token).toBe("string");
    expect(session.userAgent === ua && session.lastIp === ip).toBeTruthy();
  });

  it("should update a session", async () => {
    dataService.sessions.update.mockResolvedValue(void 0);
    dataService.sessions.get.mockResolvedValue({ active: false });

    await service.update("foo", { active: false });
    const updated = await service.get("foo");

    expect(updated.active).toBe(false);
  });

  it("should delete a session", async () => {
    dataService.sessions.remove.mockResolvedValue(void 0);
    dataService.sessions.get.mockResolvedValue(null);

    await service.delete("foo");
    const check = await service.get("foo");

    expect(check).toBe(null);
  });

  it(errorNotHavePrivateKey, async () => {
    await expect(
      service.create(userId, {
        ua,
        ip,
      })
    ).rejects.toThrow(
      "This service does not have the private key, isn't allowed to sign an authentication token"
    );

    process.env = processDotEnv;
  });

  it("should verify a token", async () => {
    cacheService.get.mockResolvedValue(null);
    cacheService.set.mockResolvedValue("OK");

    const { token } = await service.create(userId, {
      ua,
      ip,
    });

    dataService.sessions.get.mockResolvedValue({ active: true });

    const tokenDecoded = await service.verify(token);

    expect(tokenDecoded).toMatchObject({
      sid,
      uid: userId,
    });

    cacheService.get.mockResolvedValue(tokenDecoded);

    const fromCache = await service.verify(token);

    expect(fromCache).toMatchObject({
      sid,
      uid: userId,
    });
  });

  it("should throw an error due to deactivated or non existent session", async () => {
    cacheService.get.mockResolvedValue(null);
    cacheService.set.mockResolvedValue("OK");

    const { token } = await service.create(userId, {
      ua,
      ip,
    });

    dataService.sessions.get.mockResolvedValue(null);

    await expect(service.verify(token)).rejects.toThrow("Session deactivated");

    dataService.sessions.get.mockResolvedValue({ active: false });

    await expect(service.verify(token)).rejects.toThrow("Session deactivated");
  });
});

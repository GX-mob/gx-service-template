/**
 * Session Service
 *
 * @group unit/services/session
 */
import { configureServiceTest } from "fastify-decorators/testing";
import { SessionService } from ".";
import { DataService } from "../data";

describe("Service: Session", () => {
  let service: SessionService;

  const dataService = {
    users: {
      get: jest.fn(),
    },
    sessions: {
      create: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    },
  };

  beforeEach(async () => {
    service = configureServiceTest({
      service: SessionService,
      mocks: [{ provide: DataService, useValue: dataService }],
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it("should create a session", async () => {
    const userId = "foo";
    const ua = "test";
    const ip = "127.0.0.1";

    dataService.users.get.mockResolvedValue({ _id: userId, groups: [1] });
    dataService.sessions.create.mockResolvedValue({
      userAgent: ua,
      lastIp: ip,
    });

    const session = await service.create(userId, {
      ua,
      ip,
    });

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
});

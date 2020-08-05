/**
 * Data Service
 *
 * @group unit/services/data
 */
import { configureServiceTest } from "fastify-decorators/testing";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { User, UserModel } from "../../models/user";
import { DataService, Handler } from ".";
import IORedisMock from "ioredis-mock";
import { FastifyInstanceToken } from "fastify-decorators";

const mockUser = {
  firstName: "First",
  lastName: "Last",
  cpf: "123.456.789-09",
  primaryPhone: "82988888888",
  primaryEmail: "valid@email.com",
  birth: new Date("06/13/1994"),
  groups: [1],
  credential: "asd",
};

describe("Service: Data", () => {
  let handler: DataService;
  let users: Handler<User>;

  let cached;
  let nonCached;
  let mongoServer;

  beforeAll(async () => {
    handler = configureServiceTest({
      service: DataService,
      mocks: [
        {
          provide: FastifyInstanceToken,
          useValue: {
            redis: new IORedisMock(),
          },
        },
      ],
    });

    users = handler.create<User>(UserModel, {
      namespace: "users",
      linkingKeys: ["primaryPhone", "primaryEmail"],
    });

    mongoServer = new MongoMemoryServer();
    const URI = await mongoServer.getUri();

    mongoose.connect(URI, {
      useNewUrlParser: true,
      useCreateIndex: true,
      useUnifiedTopology: true,
    });

    nonCached = await UserModel.create({ ...mockUser, cpf: "649.688.734-92" });
  });

  afterAll((done) => {
    mongoose.disconnect(async () => {
      await mongoServer.stop();
      done();
    });
  });

  it("should create", async () => {
    cached = await users.create(mockUser);

    mockUser.credential = cached.credential;

    expect(cached._id instanceof mongoose.Types.ObjectId).toBeTruthy();

    const persistent = await users.get({ _id: cached._id });
    const fromCache = await handler.cache.get("users", { _id: cached._id });

    expect(persistent.firstName === cached.firstName);
    expect(fromCache.firstName === cached.firstName);
    expect(fromCache).toMatchObject({
      ...mockUser,
      birth: mockUser.birth.toISOString(),
    });
  });

  it("should get cached record", async () => {
    const user = await users.get({ _id: cached._id });

    expect(user instanceof UserModel).toBeTruthy();
  });

  it("should get non-cached record", async () => {
    const user = await users.get({ _id: nonCached._id });

    expect(user instanceof UserModel).toBeTruthy();

    const fromCache = await handler.cache.get("users", { _id: nonCached._id });

    expect(user.firstName === fromCache.firstName);
  });

  it("get by a linking key", async () => {
    const user = await users.get({ primaryEmail: mockUser.primaryEmail });

    expect(user instanceof UserModel).toBeTruthy();
    expect(user.primaryPhone).toBe(mockUser.primaryPhone);
    expect(user.cpf).toBe(mockUser.cpf);
  });

  it("should update in both storages", async () => {
    const query = { _id: cached._id };

    await users.update(query, { firstName: "Second" });

    const persistent = await UserModel.findOne(query);
    const fromCache = await handler.cache.get("users", query);

    expect(persistent.firstName === "Second").toBeTruthy();
    expect(fromCache.firstName === "Second").toBeTruthy();
  });

  it("should remove in both storages", async () => {
    const query = { _id: cached._id };

    await users.remove(query);

    const user = await users.get(query);

    expect(user).toBe(null);
  });
});

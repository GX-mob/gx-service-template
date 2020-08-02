/**
 * Cache Service
 *
 * @group unit/services/cache
 */
import { FastifyInstanceToken } from "fastify-decorators";
import { configureServiceTest } from "fastify-decorators/testing";
import { CacheService } from ".";
import IORedisMock from "ioredis-mock";

describe("Service: Cache", () => {
  let service: CacheService;

  beforeEach(
    () =>
      (service = configureServiceTest({
        service: CacheService,
        mocks: [
          {
            provide: FastifyInstanceToken,
            useValue: {
              redis: new IORedisMock(),
            },
          },
        ],
      }))
  );

  const mockObject = { foo: "bar", bar: 12 };
  const createSchema = (namespace = "test") =>
    service.buildSchema(namespace, {
      foo: "string",
      bar: "uint8",
    });

  it("value sanitization by defined schema", () => {
    createSchema("test2");

    const valid = { foo: "bar", bar: 123 };
    const dirty = { foo: "bar", bar: 123, func: () => "foo", none: "" };
    const sanitized = service.sanitizeValue("test2", dirty);

    expect(sanitized).toEqual(valid);
  });

  it("create a schema", () => {
    const schema = createSchema();

    expect("encode" in schema).toBeTruthy();
    expect("decode" in schema).toBeTruthy();
    expect(typeof schema.encode === "function").toBeTruthy();
    expect(typeof schema.decode === "function").toBeTruthy();
  });

  it("encode/decode", () => {
    const schema = createSchema();
    const encoded = schema.encode(mockObject);

    expect(Buffer.isBuffer(encoded)).toBeTruthy();

    const decoded = schema.decode(encoded);

    expect(decoded).toMatchObject(mockObject);
  });

  it("throw encode wrong schema structure", () => {
    const schema = createSchema();

    const throwExpect = process.version.startsWith("v10")
      ? 'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type undefined'
      : 'The "string" argument must be of type string or an instance of Buffer or ArrayBuffer. Received undefined';

    expect(() => {
      schema.encode({});
    }).toThrow(throwExpect);
  });

  it("throw decode unspected buffer structure", () => {
    const schema = createSchema();

    const throwExpect = process.version.startsWith("v10")
      ? `Attempt to write outside buffer bounds`
      : "Attempt to access memory outside buffer bounds";

    expect(() => {
      schema.decode(Buffer.from(""));
    }).toThrow(throwExpect);
  });

  async function work(ns) {
    const save = await service.set(ns, "foo", mockObject);
    expect(save).toBe("OK");

    const get = await service.get(ns, "foo");
    expect(get).toMatchObject(mockObject);

    const del = await service.del(ns, "foo");
    expect(del).toBe(1);

    const get2 = await service.get(ns, "foo");
    expect(get2).toBe(null);
  }

  it("should do storage with schemapack serialization", async () => {
    createSchema();

    await work("test");
  });

  it("should do storage with JSON serialization", async () => {
    await work("json");
  });

  it("change default expiration time", async (done) => {
    await service.set("bar", "foo", 0, { ex: 1 });

    setTimeout(async () => {
      const value = await service.get("bar", "foo");
      expect(value).toBe(null);

      done();
    }, 2);
  });

  it("should make keys linkings", async () => {
    await service.set("foo", "foobar", "linking", { link: ["raboof"] });

    const linked = await service.get("foo", "raboof");

    expect(linked).toBe("linking");
  });
});

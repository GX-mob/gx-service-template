/**
 * JWT Service
 *
 * @group unit/services/jwt
 */
import { configureServiceTest } from "fastify-decorators/testing";
import { JWTService } from ".";

const errorNotHavePrivateKey =
  "should throw error due to not have the privateKey";
let current: string;

(jasmine as any).getEnv().addReporter({
  specStarted: function (result: any) {
    current = result.description;
  },
});

describe("Service: JWT", () => {
  let service: JWTService;
  const processDotEnv = { ...process.env };

  beforeEach(() => {
    if (current === errorNotHavePrivateKey) {
      const { AUTH_PRIVATE_KEY, ...newEnv } = process.env;

      process.env = newEnv;
    }

    service = configureServiceTest({
      service: JWTService,
    });
  });

  afterAll(() => (process.env = processDotEnv));

  it("should sign and verify a token", async () => {
    const token = await service.sign({ foo: "bar" });

    expect(typeof token).toBe("string");
    await expect(service.verify(token)).resolves.toBeTruthy();
  });

  it("should decode", async () => {
    const token = await service.sign({ foo: "bar" });

    expect(typeof token).toBe("string");

    const decoded: any = service.decode(token);

    expect(decoded.foo).toBe("bar");
    expect(typeof decoded.iat).toBe("number");
  });

  it(errorNotHavePrivateKey, async () => {
    await expect(service.sign({ foo: "bar" })).rejects.toThrow(
      "This service does not have the private key, isn't allowed to sign an authentication token"
    );
  });
});

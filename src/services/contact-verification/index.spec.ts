/**
 * Contact Verification Service
 *
 * @group unit/services/contact-verification
 */
import { configureServiceTest } from "fastify-decorators/testing";
import { ContactVerificationService, TwilioService } from ".";

describe("Service: ContactVerification", () => {
  let service: ContactVerificationService;

  const mockTwilioService = {
    data: {},
    verify: {
      verifications: {
        create: jest.fn().mockResolvedValue({ sid: "VEXXXXXXXXXXXX" }),
      },
      verificationChecks: {
        create: jest.fn().mockResolvedValue({ status: "approved" }),
      },
    },
  };

  beforeAll(() => {
    service = configureServiceTest({
      service: ContactVerificationService,
      mocks: [
        {
          provide: TwilioService,
          useValue: mockTwilioService,
        },
      ],
    });
  });

  it("should throw a error due to invalid contact", async () => {
    await expect(service.request("foo@bar")).rejects.toThrow(
      "Verification target must be an email or mobile phone number"
    );

    await expect(service.request("+55")).rejects.toThrow(
      "Verification target must be an email or mobile phone number"
    );
  });

  it("should create a verification", async () => {
    const sid1 = await service.request("foo@bar.com");
    const sid2 = await service.request("82988888888");

    expect(sid1.startsWith("VE")).toBeTruthy();
    expect(sid2.startsWith("VE")).toBeTruthy();
  });

  it("should validate a verification", async () => {
    await expect(service.verify("foo@bar.com", "000000")).resolves.toBeTruthy();
  });
});

import { Service } from "fastify-decorators";
import {
  isValidEmail,
  isValidMobilePhone,
} from "@brazilian-utils/brazilian-utils";
import Twilio from "twilio";

@Service()
export class ContactVerificationService {
  public client: Twilio.Twilio;
  private vsid: any;

  constructor() {
    const { TWILIO_ASID, TWILIO_TOKEN, TWILIO_EDGE, TWILIO_VSID } = process.env;

    this.vsid = TWILIO_VSID;

    this.client = Twilio(TWILIO_ASID, TWILIO_TOKEN, {
      edge: TWILIO_EDGE,
      lazyLoading: true,
    });
  }
  /**
   * Request a contact verification
   * @param target Target to verify, can be an email or mobile phone number
   * @returns {Promise<string>} The id of request
   */
  public async request(to: string): Promise<string> {
    const channel = this.checkChannel(to);

    const { sid } = await this.verification().verifications.create({
      to,
      channel,
    });

    return sid;
  }

  checkChannel(target: string): string {
    const emailVerify = isValidEmail(target);

    if (!emailVerify && !isValidMobilePhone(target)) {
      throw new Error(
        "Verification target must be an email or mobile phone number"
      );
    }

    return emailVerify ? "email" : "sms";
  }

  private verification() {
    return this.client.verify.services(this.vsid);
  }

  public async verify(target: string, code: string): Promise<boolean> {
    this.checkChannel(target);

    const { status } = await this.verification().verificationChecks.create({
      to: target,
      code,
    });
    return status === "approved";
  }
}

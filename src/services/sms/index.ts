import { Service } from "fastify-decorators";
import { TwilioProvider } from "./providers/twilio";

@Service()
export class SmsService {
  private providers: {
    twilio: TwilioProvider;
  };

  public client: TwilioProvider | any;

  constructor() {
    const { SMS_PROVIDER, SMS_PROVIDER_CONFIGURATION } = process.env;

    this.checkProvider(SMS_PROVIDER);

    const config = JSON.parse(SMS_PROVIDER_CONFIGURATION);
    this.client = new TwilioProvider(config);
  }

  private checkProvider(provider: string) {
    if (!(provider in this.providers)) {
      throw new Error(
        `Invalid SMS provider, valids: ${Object.keys(
          this.providers
        )}; provided: ${provider}`
      );
    }
  }

  send(to: string, body: string) {
    return this.client.send(to, body);
  }
}

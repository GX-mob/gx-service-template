import Twilio from "twilio";

type TwilioConfiguration = {
  accountSID: string;
  token: string;
  edge: string;
  number: string;
};

export class TwilioProvider {
  public client: Twilio.Twilio;
  public number: string;
  constructor(private config: TwilioConfiguration) {
    this.number = config.number;
    this.client = Twilio(config.accountSID, config.token, {
      edge: config.edge,
      lazyLoading: true,
    });
  }

  async send(to: string, body: string) {
    await this.client.messages.create({
      to,
      from: this.config.number,
      body,
    });
  }
}

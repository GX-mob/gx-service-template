import { Service } from "fastify-decorators";
import NodeMailer, { Transporter } from "nodemailer";
import render from "./render";

type EmailObject = {
  to: string;
  subject: string;
  text: string;
  html: string;
  from?: string;
};

@Service()
export class EmailService {
  private transporter: Transporter;
  private from: string;
  constructor() {
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      SMTP_FROM,
    } = process.env;

    this.from = SMTP_FROM;

    const port = parseInt(SMTP_PORT);

    this.transporter = NodeMailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  getTransporter(): Transporter {
    return this.transporter;
  }

  async send(data: EmailObject) {
    return this.transporter.sendMail({
      ...data,
      html: render(data.subject, data.html),
      from: data.from || this.from,
    });
  }
}

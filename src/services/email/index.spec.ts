/**
 * Email
 *
 * @group unit/services/email
 */
import { EmailService } from ".";
import Mail from "nodemailer/lib/mailer";
import { configureServiceTest } from "fastify-decorators/testing";
import render from "./render";

describe("Service: Email", () => {
  let service: EmailService;

  beforeAll(
    () =>
      (service = configureServiceTest({
        service: EmailService,
      }))
  );

  it("return transporter", () => {
    expect(service.getTransporter() instanceof Mail).toBeTruthy();
  });

  it("send email", async () => {
    await expect(
      service.send({
        subject: "test",
        to: "test@example.com",
        text: "hi\nhow are tests?",
        html: "# hi\n ### how are tests?",
      })
    ).resolves.toBeTruthy();
  }, 10000);

  it("render", () => {
    const rendered = render("Foo", "## bar\n * asd");

    expect(rendered).toMatchSnapshot();
  });

  it("render with preHeader", () => {
    const rendered = render("Foo", "## bar\n * asd", "foo");

    expect(rendered).toMatchSnapshot();
  });
});

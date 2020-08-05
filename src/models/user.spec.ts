/**
 * User model
 *
 * @group unit/models
 */
import { UserModel, preSave } from "./user";
import bcrypt from "bcrypt";

const mockUser = {
  firstName: "First",
  lastName: "Last",
  cpf: "123.456.789-09",
  primaryPhone: "82988888888",
  primaryEmail: "valid@email.com",
  birth: new Date("06/13/1994"),
  credential: "asd",
};

describe("Model: User", () => {
  it("should throw errors due to empty required fields", () => {
    const user = new UserModel();
    const { errors } = user.validateSync();

    expect(Object.keys(errors).length).toBe(5);
  });

  it("should throw error due to invalid cpf", () => {
    const user = new UserModel({
      ...mockUser,
      cpf: "000",
    });

    const { errors } = user.validateSync();

    expect(errors.cpf.message).toBe(`000 isn't a valid cpf`);
  });

  it("should throw error due to invalid primary email", () => {
    const user = new UserModel({
      ...mockUser,
      primaryEmail: "foo@bar",
    });

    const { errors } = user.validateSync();

    expect(errors.primaryEmail.message).toBe(`foo@bar isn't a valid email`);
  });

  it("should throw error due to invalid primary phone", () => {
    const user = new UserModel({
      ...mockUser,
      primaryPhone: "123",
    });

    const { errors } = user.validateSync();

    expect(errors.primaryPhone.message).toBe(`123 isn't a valid mobile phone`);
  });

  it("should throw error due to any invalid secondary email", () => {
    const user = new UserModel({
      ...mockUser,
      emails: ["foo@bar"],
    });

    const { errors } = user.validateSync();

    expect(errors.emails.message).toBe(`foo@bar has an invalid email`);
  });

  it("should throw error due to any invalid secondary phone", () => {
    const user = new UserModel({
      ...mockUser,
      phones: ["55", "988888888"],
    });

    const { errors } = user.validateSync();

    expect(errors.phones.message).toBe(
      `55,988888888 has an invalid mobile phone`
    );
  });

  it("should validate credential", async () => {
    const credential = "123";
    const hash = await bcrypt.hash(credential, 10);
    const user = new UserModel({ credential: hash });

    await expect(user.compareCredential(credential)).resolves.toBeTruthy();
  });

  it("should hash credential on preSave", async () => {
    const bcryptRegex = /^\$2[ayb]\$.{56}$/;

    const mockObject = {
      credential: "123",
    };

    await preSave.bind(mockObject)();

    expect(bcryptRegex.test(mockObject.credential)).toBeTruthy();
  });
});

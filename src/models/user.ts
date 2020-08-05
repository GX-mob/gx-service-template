import { Document, Schema, Types, model } from "mongoose";
import bcrypt from "bcrypt";
import {
  isValidCPF,
  isValidEmail,
  isValidMobilePhone,
} from "@brazilian-utils/brazilian-utils";

export interface User {
  _id: any;
  firstName: string;
  lastName: string;
  cpf: string;
  primaryPhone: string;
  primaryEmail: string;
  phones?: Types.Array<string>;
  emails?: Types.Array<string>;
  createdAt?: Date;
  updatedAt?: Date | null;
  birth: Date;
  groups?: number[];
  credential?: string;
  ["2fa"]?: string;
}

export interface UserDocument extends User, Document {}

interface UserModel extends UserDocument {
  compareCredential(plain: string): Promise<boolean>;
}

export const UserSchema: Schema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    primaryPhone: {
      type: String,
      require: true,
      validate: {
        /**
         * Validate the mobile phone
         */
        validator: (value: string) => isValidMobilePhone(value),
        message: (props) => `${props.value} isn't a valid mobile phone`,
      },
    },
    primaryEmail: {
      type: String,
      required: true,
      validate: {
        /**
         * Validate the email
         */
        validator: (value: string) => isValidEmail(value),
        message: (props) => `${props.value} isn't a valid email`,
      },
    },
    cpf: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator(v) {
          return isValidCPF(v);
        },
        message(props) {
          return `${props.value} isn't a valid cpf`;
        },
      },
    },
    phones: {
      type: Array,
      of: String,
      validate: {
        /**
         * Validate all mobile phone numbers in the list
         */
        validator: (v) =>
          v.filter((phone) => isValidMobilePhone(phone)).length === v.length,
        message: (props) => `${props.value} has an invalid mobile phone`,
      },
    },
    emails: {
      type: Array,
      of: String,
      validate: {
        /**
         * Validate all emails in the list
         */
        validator: (v) =>
          v.filter((email) => isValidEmail(email)).length === v.length,
        message: (props) => `${props.value} has an invalid email`,
      },
    },
    createdAt: { type: Date },
    updatedAt: { type: Date },
    birth: { type: Date, required: true },
    groups: { type: Array, of: Number },
    credential: { type: String },
    ["2fa"]: { type: String },
  },
  { collection: "users" }
);

export async function preSave() {
  this.createdAt = new Date();
  this.groups = [1];
  this.credential = await bcrypt.hash(this.credential, 10);
}

UserSchema.pre("save", preSave);

UserSchema.pre<UserDocument>("updateOne", async function () {
  this.set({ updatedAt: new Date() });
});

UserSchema.methods.compareCredential = function (plain: string) {
  return bcrypt.compare(plain, this.credential);
};

export const UserModel = model<UserModel>("User", UserSchema);

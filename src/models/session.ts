import { Document, Schema, Types, model } from "mongoose";
import { UserDocument } from "./user";

export interface Session {
  _id: Types.ObjectId | any;
  uid: UserDocument["_id"];
  access: number;
  userAgent: string;
  lastIp: string;
  createdAt?: Date;
  active?: boolean;
}

export interface SessionDocument extends Session, Document {}

export const SessionSchema: Schema = new Schema(
  {
    uid: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    access: { type: Number, required: true },
    userAgent: { type: String, required: true },
    lastIp: { type: String, required: true },
    createdAt: { type: Date },
    active: { type: Boolean },
  },
  { collection: "sessions" }
);

SessionSchema.pre<SessionDocument>("save", async function () {
  /* istanbul ignore next */
  this.createdAt = new Date();
  /* istanbul ignore next */
  this.active = true;
});

export const SessionModel = model<SessionDocument>("Session", SessionSchema);

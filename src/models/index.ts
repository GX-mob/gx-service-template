import { Model } from "mongoose";
import { UserDocument } from "./user";
import { SessionDocument } from "./session";
import { RideDocument } from "./ride";

export default interface Models {
  User: Model<UserDocument>;
  Session: Model<SessionDocument>;
  Ride: Model<RideDocument>;
}

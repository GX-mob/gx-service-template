import mongoose, { Document, Schema, model } from "mongoose";
import { User } from "./user";

function hasProp(obj: any, prop: string) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

class Route extends mongoose.SchemaType {
  constructor(key, options) {
    super(key, options, "Route");
  }

  cast(route: TRoute) {
    if (!(route instanceof Object) || Object.keys(route).length < 3) {
      throw new Error('Route must be an object with "start", "path" and "end"');
    }

    if (
      !hasProp(route, "start") ||
      !hasProp(route, "path") ||
      !hasProp(route, "end")
    ) {
      throw new Error('Route object must have "start", "path" and "end" props');
    }

    if (typeof route.path !== "string") {
      throw new Error("Path must be an encoded polyline, like as string.");
    }

    this.checkPoint("start", route.start);
    this.checkPoint("end", route.end);

    if (hasProp(route, "checkpoints")) {
      for (let i = 0; i < route.checkpoints.length; ++i)
        this.checkPoint(`checkpoint[${i}]`, route.checkpoints[i]);
    }

    return route;
  }

  checkPoint(name: string, point: RoutePoint) {
    if (
      !hasProp(point, "coord") ||
      !hasProp(point, "primary") ||
      !hasProp(point, "secondary")
    ) {
      throw new Error(
        `"${name}" object must have "coord", "primary" and "secondary" props`
      );
    }
  }
}

(mongoose.Schema.Types as any).Route = Route;

type RoutePoint = {
  coord: number[];
  primary: string;
  secondary: string;
};

type TRoute = {
  start: RoutePoint;
  checkpoints?: mongoose.Types.Array<RoutePoint>;
  end: RoutePoint;
  path: string;
};

export interface Ride {
  voyager: User["_id"][];
  route: TRoute;
  options: {
    hitBack?: boolean;
    trunk?: boolean;
  };
  driver?: User["_id"];
}

export interface RideDocument extends Ride, Document {}

export const RideSchema: Schema = new Schema(
  {
    voyagers: {
      type: Array,
      of: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      validate: {
        /**
         * Users id
         */
        validator: (v: Array<mongoose.Types.ObjectId>) => {
          return (
            v.length > 0 &&
            v.filter((id) => mongoose.Types.ObjectId.isValid(id)).length ===
              v.length
          );
        },
        message: () => `has not a valid user ID`,
      },
    },
    route: { type: Route, required: true },
    options: { type: Object },
    driver: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { collection: "rides" }
);

export const RideModel = model<RideDocument>("Ride", RideSchema);

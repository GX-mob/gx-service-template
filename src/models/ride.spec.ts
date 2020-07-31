/**
 * Rides model
 *
 * @group unit/models
 */
import { RideModel } from "./ride";

describe("Model: Ride", () => {
  let base;

  const mockRoutePoint = {
    coord: [1.23432, 2.31451],
    primary: "Rua Alcino Galvão 49",
    secondary: "Clima bom, Maceió",
  };

  const mockRoute = {
    start: mockRoutePoint,
    path: "...",
    end: mockRoutePoint,
  };

  it("should throw error due to empty required fields", (done) => {
    const ride = new RideModel();

    ride.validate((err) => {
      expect(Object.keys(err.errors).length).toBe(2);
      //expect(Object.keys(err.errors).length).toBe(6);
      done();
    });
  });

  it("should throw error due to invalid user id", () => {
    const rideEmptyVoyagerID = new RideModel({
      voyagers: [],
      route: mockRoute,
    });
    const rideInvalidVoyagerID = new RideModel({
      voyagers: ["123"],
      route: mockRoute,
    });

    const { errors: emptyIdErrors } = rideEmptyVoyagerID.validateSync();
    const { errors: InvalidIdErrors } = rideInvalidVoyagerID.validateSync();

    const error = "has not a valid user ID";

    expect(emptyIdErrors.voyagers.message).toBe(error);
    expect(InvalidIdErrors.voyagers.message).toBe(error);
  });

  it("should throw error due to empty route property", () => {
    const ride = new RideModel(base);

    const { errors } = ride.validateSync();

    expect(errors.route.message).toBe("Path `route` is required.");
  });

  it("should throw error due to a non-object-type of route", () => {
    const ride = new RideModel({ ...base, route: [] });

    const { errors } = ride.validateSync();

    expect(errors.route.reason.message).toBe(
      'Route must be an object with "start", "path" and "end"'
    );
  });

  it("should throw error due to an empty object of route", () => {
    const ride = new RideModel({ ...base, route: {} });

    const { errors } = ride.validateSync();

    expect(errors.route.reason.message).toBe(
      'Route must be an object with "start", "path" and "end"'
    );
  });

  it("should throw error due to an invalid properties of route object", () => {
    const ride = new RideModel({
      ...base,
      route: { _: "", __: "", ___: "" },
    });

    const { errors } = ride.validateSync();

    expect(errors.route.reason.message).toBe(
      'Route object must have "start", "path" and "end" props'
    );
  });

  it("should throw error due to an invalid path", () => {
    const ride = new RideModel({
      ...base,
      route: { start: "", path: 123, end: "" },
    });

    const { errors } = ride.validateSync();

    expect(errors.route.reason.message).toBe(
      "Path must be an encoded polyline, like as string."
    );
  });

  it("should throw error due to an invalid route points", () => {
    const start = new RideModel({
      ...base,
      route: { start: "", path: "", end: "" },
    });

    const end = new RideModel({
      ...base,
      route: { start: mockRoutePoint, path: "", end: "" },
    });

    const checkpoint = new RideModel({
      ...base,
      route: {
        start: mockRoutePoint,
        path: "",
        end: mockRoutePoint,
        checkpoints: [{}],
      },
    });

    expect(start.validateSync().errors.route.reason.message).toBe(
      '"start" object must have "coord", "primary" and "secondary" props'
    );

    expect(end.validateSync().errors.route.reason.message).toBe(
      '"end" object must have "coord", "primary" and "secondary" props'
    );

    expect(checkpoint.validateSync().errors.route.reason.message).toBe(
      '"checkpoint[0]" object must have "coord", "primary" and "secondary" props'
    );
  });
});

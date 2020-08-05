import { FastifyRequest } from "fastify";
import { User } from "./models/user";

declare module "fastify" {
  export interface FastifyRequest {
    getRealIp(): string;
    user?: User;
  }
}

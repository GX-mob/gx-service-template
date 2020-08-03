import { FastifyRequest } from "fastify";
import { Hook } from "fastify-decorators";

export class ExampleMiddleware {
  @Hook("preHandler")
  private async _preHandler(request: FastifyRequest) {
    console.log("Request id:", request.id);
  }
}

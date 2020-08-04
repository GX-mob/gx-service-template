import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Hook, Inject, FastifyInstanceToken } from "fastify-decorators";
import httpError from "http-errors";
import { SessionService } from "../services";

type AuthSettings = {
  groups: number[];
};

export class AuthMiddleware {
  @Inject(FastifyInstanceToken)
  private _instance!: FastifyInstance;

  @Inject(SessionService)
  private _session!: SessionService;

  public authSettings: AuthSettings = {
    groups: [1],
  };

  @Hook("preHandler")
  private async __preHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
      const ip = request.getRealIp();

      if (!request.headers.authorization) {
        return reply.send(new httpError.Unauthorized());
      }

      const token = request.headers.authorization.replace("Bearer ", "");
      const session = await this._session.verify(token, ip);

      if (!this._checkPermission(session.groups)) {
        return reply.send(new httpError.Forbidden());
      }
    } catch (error) {
      this._instance.log.error(error);
      return reply.send(httpError(500));
    }
  }

  private _checkPermission(userGroups: number[]) {
    const groups = this.authSettings.groups;

    return !!groups.find((id) => userGroups.includes(id));
  }
}

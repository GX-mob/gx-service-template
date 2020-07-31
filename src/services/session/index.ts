import { Service, Inject } from "fastify-decorators";
import { Types } from "mongoose";
import { User } from "../../models/user";
import { Session } from "../../models/session";
import { Handler } from "../data";

import { DataService } from "../data";

/**
 * Session data
 */
type SessionInfo = {
  /**
   * User-agent
   */
  ua: string;
  /**
   * User ip
   */
  ip: string;
};

@Service()
export class SessionService {
  @Inject(DataService)
  private data!: DataService;

  /**
   * @param user_id
   * @param session_data
   * @return
   * @constructs SessionModel
   */
  async create(
    user_id: Types.ObjectId | string,
    session_data: SessionInfo
  ): Promise<Session> {
    const { _id, access } = await this.data.users.get({
      _id: user_id,
    });

    return this.data.sessions.create({
      uid: _id,
      gid: access,
      userAgent: session_data.ua,
      lastIp: session_data.ip,
    });
  }

  async get(_id: any): Promise<Session | null> {
    return this.data.sessions.get({ _id });
  }

  async update(session_id: Types.ObjectId | string, data: any) {
    await this.data.sessions.update({ _id: session_id }, data);
  }

  async delete(session_id: Types.ObjectId | string) {
    await this.data.sessions.remove({ _id: session_id });
  }
}

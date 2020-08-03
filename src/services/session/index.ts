import { Service, Inject } from "fastify-decorators";
import { Types } from "mongoose";
import { promisify } from "util";
import jwt from "jsonwebtoken";
import { DataService } from "../data";
import { CacheService } from "../cache";
import { Session } from "../../models/session";

const verify = promisify(jwt.verify);
const sign = promisify(jwt.sign);

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
  private tokenNamespace = "token";
  private keyid: string;
  private publicKey: string;
  private privateKey: string;

  @Inject(DataService)
  private data!: DataService;

  @Inject(CacheService)
  private cache!: CacheService;

  constructor() {
    this.keyid = process.env.AUTH_KID;
    this.publicKey = process.env.AUTH_PUBLIC_KEY;
    this.privateKey = process.env.AUTH_PRIVATE_KEY;
  }

  /**
   * @param user_id
   * @param session_data Object with userAgent and user IP
   * @return {Object} { token: string, session: SessionModel }
   */
  async create(
    user_id: Types.ObjectId | string,
    session_data: SessionInfo
  ): Promise<{ token: string; session: Session }> {
    const user = await this.data.users.get({
      _id: user_id,
    });

    if (!user) {
      throw new Error("User not found");
    }

    const { _id, groups } = user;

    const session = await this.data.sessions.create({
      uid: _id,
      groups,
      userAgent: session_data.ua,
      lastIp: session_data.ip,
    });

    const token = await this.signToken({ sid: session._id, uid: _id });

    return { token, session };
  }

  private signToken(data: any): Promise<string> {
    if (!this.privateKey) {
      throw new Error(
        "This service does not have the private key," +
          " isn't allowed to sign an authentication token"
      );
    }

    return sign({ ...data }, this.privateKey, {
      algorithm: "ES256",
      keyid: this.keyid,
    });
  }

  /**
   * Verify a token
   * @param token
   * @returns session data
   */
  async verify(token: string) {
    const tokenBody = await this.verifyToken(token);

    return this.checkState(tokenBody.sid);
  }

  private async verifyToken(token: string): Promise<any> {
    const cache = await this.cache.get(this.tokenNamespace, token);

    if (cache) {
      return cache;
    }

    const tokenBody = await verify(token, this.publicKey, {
      algorithms: ["ES256"],
    });

    this.cache.set(this.tokenNamespace, token, tokenBody);

    return tokenBody;
  }

  private async checkState(session_id: Types.ObjectId | string) {
    const sessionData = await this.get(session_id);

    if (!sessionData || !sessionData.active) {
      throw new Error("Session deactivated");
    }

    return sessionData;
  }

  async get(_id: any) {
    return this.data.sessions.get({ _id });
  }

  async update(session_id: Types.ObjectId | string, data: any) {
    await this.data.sessions.update({ _id: session_id }, data);
  }

  async delete(session_id: Types.ObjectId | string) {
    await this.data.sessions.remove({ _id: session_id });
  }
}

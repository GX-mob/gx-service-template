import { promisify } from "util";
import jwt from "jsonwebtoken";
import { Service } from "fastify-decorators";

const verify = promisify(jwt.verify);
const sign = promisify(jwt.sign);

@Service()
export class JWTService {
  private keyid: string;
  public publicKey: string;
  private privateKey: string;

  constructor() {
    this.keyid = process.env.AUTH_KID;
    this.publicKey = process.env.AUTH_PUBLIC_KEY;
    this.privateKey = process.env.AUTH_PRIVATE_KEY;
  }

  decode<T>(token: string): T {
    return jwt.decode(token);
  }
  async verify(token: string) {
    return verify(token, this.publicKey, { algorithms: ["ES256"] });
  }
  async sign(data: any): Promise<string> {
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
}

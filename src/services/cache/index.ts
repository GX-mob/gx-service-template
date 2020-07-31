import { FastifyInstanceToken, Inject, Service } from "fastify-decorators";
import { Redis } from "ioredis";
import schemapack from "schemapack";
import { FastifyInstance } from "fastify";

type schemapackBuilt = {
  encode: (object: any) => Buffer;
  decode: (buff: Buffer) => any;
};

/**
 * Cache abstraction
 * First encode/decode by pre built schemapack and fallback to JSON serialization
 */
@Service()
export class CacheService {
  @Inject(FastifyInstanceToken)
  public instance!: FastifyInstance;

  public redis: Redis = this.instance.redis;
  public defaultLifetime = 15 * 60 * 1000;
  public schemas: { [key: string]: schemapackBuilt } = {};
  private schemasStructure: { [key: string]: any } = {};

  /**
   * Build schema serialization
   * @param name schema namespace
   * @param structure schema structure
   */
  buildSchema(name: string, structure: any): schemapackBuilt {
    this.schemasStructure[name] = structure;
    return (this.schemas[name] = schemapack.build(structure));
  }

  /**
   * Get cache item
   * @param ns Key namespace
   * @param key Key name
   * @returns Value cached or null
   */
  // TODO linking keys
  async get(ns: string, key: any) {
    key = this.sanitizeKey(key);

    if (ns in this.schemas) {
      const data = await this.redis.getBuffer(`${ns}:${key}`);

      return data && this.schemas[ns].decode(data);
    }

    const data = await this.redis.get(`${ns}:${key}`);

    return JSON.parse(data);
  }

  /**
   * Set cache value
   * @param ns Key namespace
   * @param key key name
   * @param value value to store
   * @param ...args extra arguments to redis
   *
   */
  set(ns: string, key: any, value: any, ...args: string[]) {
    key = this.sanitizeKey(key);

    value =
      ns in this.schemas
        ? this.schemas[ns].encode(this.sanitizeValue(ns, value))
        : JSON.stringify(value);

    if (args.length > 0) {
      args = args.map((arg) => arg.toString());
    } else {
      args = ["PX", this.defaultLifetime.toString()];
    }
    return this.redis.set(`${ns}:${key}`, value, ...args);
  }

  /**
   * Delete cached value
   * @param ns Key namespace
   * @param key Key name
   */
  del(ns: string, key: any) {
    key = this.sanitizeKey(key);

    return this.redis.del(`${ns}:${key}`);
  }

  sanitizeKey(key: any) {
    return typeof key === "string" ? key : JSON.stringify(key);
  }

  sanitizeValue(ns: string, value: any) {
    const sanitized = {};

    for (const prop in this.schemasStructure[ns]) {
      sanitized[prop] = value[prop];
    }

    return sanitized;
  }
}

import { FastifyInstanceToken, Inject, Service } from "fastify-decorators";
import { Redis } from "ioredis";
import schemapack from "schemapack";
import { FastifyInstance } from "fastify";

type schemapackBuilt = {
  encode: (object: any) => Buffer;
  decode: (buff: Buffer) => any;
};

type setOptions = {
  ex?: number;
  link?: string[];
};

/**
 * Cache abstraction
 * First encode/decode by pre built schemapack and fallback to JSON serialization
 */
@Service()
export class CacheService {
  @Inject(FastifyInstanceToken)
  public instance!: FastifyInstance;

  private linkPrefix = "__linked@";
  private separator = ":::";

  public redis: Redis = this.instance.redis;
  public defaultLifetime = String(15 * 60 * 1000);
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
  async get(ns: string, key: any) {
    const finalKey = this.key(ns, key);
    const data: Buffer | string = await this.redis.get(finalKey);

    if (this.isLink(data)) {
      return this.get(...this.getParentKey(data));
    }

    if (ns in this.schemas) {
      return data && this.schemas[ns].decode((data as unknown) as Buffer);
    }

    return JSON.parse(data);
  }

  private key(namespace: string, key: string) {
    key = this.sanitizeKey(key);
    return `${namespace}${this.separator}${key}`;
  }

  private sanitizeKey(key: any) {
    return typeof key === "string" ? key : JSON.stringify(key);
  }

  private isLink(value: any) {
    return typeof value === "string" && value.startsWith(this.linkPrefix);
  }

  private getParentKey(value: string): [string, string] {
    const parentKey = value.replace(this.linkPrefix, "");
    const [namespace, key] = parentKey.split(this.separator);
    return [namespace, key];
  }

  /**
   * Set cache value
   * @param ns Key namespace
   * @param key key name
   * @param value value to store
   * @param options
   * @param options.ex key expiration in ms
   * @param options.link link key list
   */
  async set(ns: string, key: any, value: any, options: setOptions = {}) {
    const parentKey = this.key(ns, key);

    value =
      ns in this.schemas
        ? this.schemas[ns].encode(this.sanitizeValue(ns, value))
        : JSON.stringify(value);

    const ex = options.ex ? String(options.ex) : this.defaultLifetime;

    if (options.link) {
      await this.redis
        .multi([
          ["set", parentKey, value, "PX", ex],
          ...options.link.map((childKey) => [
            "set",
            this.key(ns, childKey),
            `${this.linkPrefix}${parentKey}`,
          ]),
        ])
        .exec();

      return "OK";
    }

    await this.redis.set(parentKey, value, "PX", ex);

    return "OK";
  }

  sanitizeValue(ns: string, value: any) {
    const sanitized = {};

    for (const prop in this.schemasStructure[ns]) {
      sanitized[prop] = value[prop];
    }

    return sanitized;
  }

  /**
   * Delete cached value
   * @param ns Key namespace
   * @param key Key name
   */
  del(ns: string, key: any) {
    const finalKey = this.key(ns, key);

    return this.redis.del(finalKey);
  }
}

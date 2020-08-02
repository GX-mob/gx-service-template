import { Service, Inject } from "fastify-decorators";
import { CacheService } from "../cache";
import mongoose from "mongoose";

// Standard handlers
import { User, UserModel } from "../../models/user";
import { Session, SessionModel } from "../../models/session";

interface CacheSettings<Model> {
  namespace: string;
  linkingKeys?: Array<keyof Model>;
}

/**
 * Abstraction to manipulate the cached and persistent data of a single record, respectively.
 */
export class Handler<Model> {
  private namespace: string;
  private linkingKeys: Array<keyof Model>;

  constructor(
    public cache: CacheService,
    public model: mongoose.Model<any>,
    cacheConfiguration: CacheSettings<Model>
  ) {
    this.namespace = cacheConfiguration.namespace;
    this.linkingKeys = cacheConfiguration.linkingKeys;
  }

  /**
   * Get a record from the cache, if it doesn't exist, get from persistent and update the cache
   * @param query
   * @returns
   * @constructs {Model}
   */
  async get(query: Partial<Model>): Promise<Model | null> {
    const fromCache = await this.cache.get(this.namespace, query);

    if (fromCache) return new this.model(fromCache);

    const fromPersistent = await this.model.findOne(query);
    if (fromPersistent) {
      await this.cache.set(this.namespace, query, fromPersistent);

      return fromPersistent;
    }
    return null;
  }

  /**
   * Updates a record in persistent storage and cache it
   * @param query
   * @param data
   */
  async update(query: any, data: Partial<Model>) {
    await this.model.updateOne(query, data);
    await this.setCache(query, data);
  }

  /**
   * Creates a item in persistent storage and cache it
   * @param data
   * @param keys[] A list of keys to link cache data with one record
   * @returns
   * @constructs {RecordHandler}
   */
  async create(
    data: Omit<Model, "_id">,
    keySchema: (queryResult: Model) => any = ({ _id }: any) => ({
      _id,
    })
  ): Promise<Model> {
    const mongooseResult = await this.model.create(data as Model);

    const key = keySchema(mongooseResult);

    await this.setCache(key, mongooseResult._doc);

    // return mongooseResult;
    return mongooseResult;
  }

  async setCache(key: any, data: any): Promise<void> {
    const saved = await this.cache.get(this.namespace, key);

    await this.cache.set(
      this.namespace,
      key,
      {
        ...(saved || {}),
        ...data,
      },
      { link: this.mountLinkingKeys(data) }
    );
  }

  /**
   * * CAUTION!
   * * Remove record from PERSISTENT storage and cache.
   * @param query
   * @returns {Promise<void>}
   */
  async remove(query: any) {
    await this.model.deleteOne(query);
    await this.cache.del(this.namespace, query);
  }

  mountLinkingKeys(data) {
    return this.linkingKeys.map((key) => JSON.stringify({ [key]: data[key] }));
  }
}

@Service()
export class DataService {
  @Inject(CacheService)
  public cache!: CacheService;

  public users = this.create<User>(UserModel, {
    namespace: "users",
    linkingKeys: ["primaryEmail", "primaryPhone", "cpf"],
  });
  public sessions = this.create<Session>(SessionModel, {
    namespace: "users",
  });
  /**
   *
   * @param model
   * @param cacheSettings
   * @param cacheSettings.namespace Cache namespace
   * @param cacheSettings.linkingKeys Cache linking keys
   * @returns
   * @constructs {Handler}
   */
  create<Model>(
    model: mongoose.Model<any>,
    cacheSettings: CacheSettings<Model>
  ): Handler<Model> {
    return new Handler<Model>(this.cache, model, cacheSettings);
  }
}

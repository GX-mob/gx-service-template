import { Service, Inject } from "fastify-decorators";
import { CacheService } from "../cache";
import mongoose from "mongoose";

// Standard handlers
import { User, UserModel } from "../../models/user";
import { Session, SessionModel } from "../../models/session";

export interface IDataModel<Model> {
  namespace: string;
  cache: CacheService;
  get(key: any): Promise<Model>;
  update(key: any, data: any): Promise<void>;
  create(data: any, key?: (queryResult: Model) => any): Promise<Model>;

  setCache(key: string, data: any): Promise<void>;
}

/**
 * Abstraction to manipulate the cached and persistent data of a single record, respectively.
 */
export class Handler<Model> implements IDataModel<Model> {
  constructor(
    public cache: CacheService,
    public namespace: string,
    public model: mongoose.Model<any>
  ) {}

  // TODO configuration option for automatic link cache keys
  /**
   * Get a record from the cache, if it doesn't exist, get from persistent and update the cache
   * @param query
   * @returns
   * @constructs {Model}
   */
  async get(query: any): Promise<Model | null> {
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
  async update(query: any, data: any) {
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
    data: any,
    keySchema: (queryResult: Model) => any = ({ _id }: any) => ({
      _id,
    })
  ): Promise<Model> {
    const mongooseResult = await this.model.create(data);

    const key = keySchema(mongooseResult);

    await this.setCache(key, mongooseResult._doc);

    // return mongooseResult;
    return mongooseResult;
  }

  async setCache(key: any, data: any): Promise<void> {
    await this.cache.set(this.namespace, key, {
      ...((await this.cache.get(this.namespace, key)) || {}),
      ...data,
    });
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
}

@Service()
export class DataService {
  @Inject(CacheService)
  public cache!: CacheService;

  public users = this.create<User>("users", UserModel);
  public sessions = this.create<Session>("users", SessionModel);
  /**
   *
   * @param cacheNamespace
   * @param model
   * @returns
   * @constructs {Handler}
   */
  create<Model>(
    cacheNamespace: string,
    model: mongoose.Model<any>
  ): Handler<Model> {
    return new Handler<Model>(this.cache, cacheNamespace, model);
  }
}

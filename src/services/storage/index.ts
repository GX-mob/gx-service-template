import { Service } from "fastify-decorators";
import { Storage, Bucket, File } from "@google-cloud/storage";
import { Readable, Writable } from "stream";
import PngQuant from "pngquant";
import JpegTran from "jpegtran";
import { PassThrough } from "stream";
import FileType from "file-type";

export type AbstractionBucket = {
  bucket: Bucket;
  publicUrl: string;
  getPublicUrl(filename: string): string;
  upload(
    readableStream: Readable,
    options: UploadStreamOptions
  ): Promise<{
    bucketFile: File;
    storageWritableStream: Writable;
    publicUrl: string;
  }>;
};

type UploadStreamOptions = {
  filename: string;
  public: boolean;
  compress?: boolean;
  acceptMIME: string[];
  errorHandler?(error: Error): void;
};

type CompressibleMIME = "image/png" | "image/jpg" | "image/jpeg";

@Service()
export class StorageService {
  private client: Storage;
  private compressibleMIME = ["image/png", "image/jpg", "image/jpeg"];
  buckets: { [name: string]: AbstractionBucket } = {};
  constructor() {
    /* istanbul ignore next */
    if (process.env.NODE_ENV === "production") {
      this.client = new Storage();
      return;
    }

    const StorageMock = require("./mock/gcp-storage").default; //eslint-disable-line
    this.client = new StorageMock();
  }

  /**
   * @param bucket_name
   * @param prefix_url Used to make the public url of an item
   * @default "https://storage.googleapis.com/"
   */
  bucket(
    name: string,
    prefix_url = "https://storage.googleapis.com/"
  ): AbstractionBucket {
    if (name in this.buckets) {
      throw new Error(
        `Trying to configure a bucket already configured: ${name}`
      );
    }

    this.buckets[name] = {
      bucket: this.client.bucket(name),
      publicUrl: prefix_url,
      getPublicUrl: (filename: string) => `${prefix_url}/${name}/${filename}`,
      upload: (readableStream, options) =>
        this.uploadStream(name, readableStream, options),
    };

    return this.buckets[name];
  }

  /**
   * @param bucket_name
   * @param readable Readable stream
   * @param {UploadStreamOptions} options
   */
  async uploadStream(
    bucket_name: string,
    readable: Readable,
    options: UploadStreamOptions
  ) {
    const { bucket, getPublicUrl } = this.buckets[bucket_name];
    const { filename, compress, errorHandler, acceptMIME } = options;

    if (errorHandler) {
      readable.on("error", errorHandler);
    }

    const [saveReadable, mimeDetectReadable] = this.cloneReadable(readable);
    const mime = await this.getMIME(mimeDetectReadable);

    this.checkValidMime(mime, acceptMIME);

    const bucketFile = bucket.file(filename);
    const storageWritableStream = bucketFile.createWriteStream({
      metadata: {
        contentType: mime,
      },
      public: options.public,
      gzip: true,
      resumable: false,
    });

    if (errorHandler) {
      storageWritableStream.on("error", errorHandler);
    }

    if (this.compressibleMIME.includes(mime) && compress) {
      const compressor = this.createCompressor(mime as CompressibleMIME);
      const compressing = saveReadable.pipe(compressor);

      saveReadable.on("error", (err) => compressing.destroy(err));
      compressing.pipe(storageWritableStream);
    } else {
      saveReadable.pipe(storageWritableStream);
    }

    return {
      bucketFile,
      storageWritableStream,
      publicUrl: getPublicUrl(filename),
    };
  }

  async getMIME(readable: Readable): Promise<string> {
    const type = await FileType.fromStream(readable);

    if (!type) {
      throw new Error("Cannot detect the MIME type");
    }

    return type.mime;
  }

  cloneReadable(readable): Readable[] {
    const clone1 = new PassThrough();
    const clone2 = new PassThrough();

    readable.on("error", (err: Error) => {
      clone1.destroy(err);
      clone2.destroy(err);
    });

    readable.pipe(clone1);
    readable.pipe(clone2);

    return [clone1, clone2];
  }

  checkValidMime(mime: string, mimes: string[]) {
    if (mimes.indexOf(mime) === -1) {
      throw new Error(
        `MIME type not acceptable, provided: ${mime}, accepts: ${mimes}`
      );
    }
  }

  createCompressor(mime: CompressibleMIME) {
    switch (mime) {
      case "image/jpeg":
        return new JpegTran();
      case "image/png":
        return new PngQuant([192, "--quality", "75-85", "--nofs", "-"]);
    }
  }
}

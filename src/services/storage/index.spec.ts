/**
 * Storage Service
 *
 * @group unit/services/storage
 */
import { configureServiceTest } from "fastify-decorators/testing";
import { StorageService, AbstractionBucket } from ".";

import { ReadableStreamBuffer, WritableStreamBuffer } from "stream-buffers";
import { readFileSync } from "fs";
import { join } from "path";

describe("Service: Storage", () => {
  let service: StorageService;

  let bucket: AbstractionBucket;
  const bucketPublicUrl = "https://test.com";

  const jpegBuffer = readFileSync(join(__dirname, "mock", "mock.jpeg"));
  const pngBuffer = readFileSync(join(__dirname, "mock", "mock.png"));

  function createReadableFrom(buffer) {
    const readable = new ReadableStreamBuffer();
    readable.put(buffer);
    readable.stop();
    return readable;
  }

  beforeEach(
    () =>
      (service = configureServiceTest({
        service: StorageService,
      }))
  );

  it("registry a bucket", () => {
    const bucketDefaultPublicUrl = service.bucket("default");
    bucket = service.bucket("test", bucketPublicUrl);

    expect(bucket.publicUrl).toBe(bucketPublicUrl);
    expect(bucketDefaultPublicUrl.publicUrl).toBe(
      "https://storage.googleapis.com/"
    );
    expect(typeof bucket.getPublicUrl).toBe("function");
    expect(typeof bucket.upload).toBe("function");
  });

  it("throw error due to attemp configure a bucket already configured", () => {
    service.bucket("test");
    expect(() => service.bucket("test")).toThrow(
      "Trying to configure a bucket already configured: test"
    );
  });

  it("should return the public url of an item", () => {
    expect(bucket.getPublicUrl("avatar.jpeg")).toBe(
      `${bucketPublicUrl}/test/avatar.jpeg`
    );
  });

  it("set stream errorHandler", async (done) => {
    service.bucket("test");
    const stream = createReadableFrom(pngBuffer);
    setTimeout(() => stream.destroy(new Error("test")), 20);

    service.uploadStream("test", stream, {
      filename: "avatar.png",
      public: true,
      compress: true,
      acceptMIME: ["image/jpeg", "image/png"],
      errorHandler: (error) => {
        expect(error.message).toBe("test");
        done();
      },
    });
  });

  it("should throw error due to cannot detect the MIME type of stream", async () => {
    const readable = new ReadableStreamBuffer();

    new Array(1000).map((i) => readable.put(i));
    readable.stop();

    try {
      await bucket.upload(readable, {
        filename: "avatar.jpg",
        public: true,
        compress: true,
        acceptMIME: ["image/png", "image/jpeg"],
      });
    } catch (e) {
      expect(e.message).toBe("Cannot detect the MIME type");
    }
  });

  it("should throw error due to non-acceptable mime type", async () => {
    try {
      service.bucket("test");
      const image = createReadableFrom(pngBuffer);
      await service.uploadStream("test", image, {
        filename: "avatar.png",
        public: true,
        compress: true,
        acceptMIME: ["image/jpeg"],
      });
    } catch (e) {
      expect(e.message).toBe(
        "MIME type not acceptable, provided: image/png, accepts: image/jpeg"
      );
    }
  });

  it("should compress png file", (done) => {
    const readable = createReadableFrom(pngBuffer);
    const writable = new WritableStreamBuffer();
    const compressor = service.createCompressor("image/png");

    readable.pipe(compressor).pipe(writable);

    writable.on("finish", () => {
      expect(writable.getContents().length < pngBuffer.length).toBeTruthy();
      done();
    });
  });

  it("should compress jpg file", (done) => {
    const readable = createReadableFrom(jpegBuffer);
    const writable = new WritableStreamBuffer();
    const compressor = service.createCompressor("image/jpeg");

    readable.pipe(compressor).pipe(writable);

    writable.on("finish", () => {
      expect(writable.getContents().length < jpegBuffer.length).toBeTruthy();
      done();
    });
  });

  it("should upload", async (done) => {
    service.bucket("test");

    const image = createReadableFrom(pngBuffer);
    const { bucketFile } = await service.uploadStream("test", image, {
      filename: "avatar.png",
      public: true,
      acceptMIME: ["image/jpeg", "image/png"],
    });

    (bucketFile as any).writable.on("finish", () => {
      expect(
        (bucketFile as any).contents.length === pngBuffer.length
      ).toBeTruthy();
      done();
    });
  });

  it("should upload and compress", async (done) => {
    service.bucket("test");

    const image = createReadableFrom(pngBuffer);
    const { bucketFile } = await service.uploadStream("test", image, {
      filename: "avatar.png",
      public: true,
      compress: true,
      acceptMIME: ["image/jpeg", "image/png"],
    });

    (bucketFile as any).writable.on("finish", () => {
      expect(
        (bucketFile as any).contents.length < pngBuffer.length
      ).toBeTruthy();
      done();
    });
  });
});

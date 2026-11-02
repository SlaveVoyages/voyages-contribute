import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3"
import { createReadStream } from "node:fs"
import fs from "node:fs/promises"
import path from "node:path"
import { Readable } from "node:stream"

export interface StoredMedia {
  body: Readable
  contentType: string
  length?: number
}

export interface MediaStorage {
  put(key: string, filename: string, contentType: string): Promise<void>
  get(key: string): Promise<StoredMedia>
  delete(key: string): Promise<void>
}

export const validateMediaKey = (key: string): string => {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/.test(key)) {
    throw new Error("Invalid media key")
  }
  return key
}

export const mediaObjectKey = (prefix: string, key: string): string => {
  const segments = prefix.replace(/\/$/, "").split("/")
  if (segments.some((segment) => !/^[A-Za-z0-9_-]+$/.test(segment))) {
    throw new Error("CONTRIB_MEDIA_PREFIX must contain nonempty path segments")
  }
  return `${segments.join("/")}/${validateMediaKey(key)}`
}

export class S3MediaStorage implements MediaStorage {
  constructor(
    private readonly bucket: string,
    private readonly prefix: string,
    private readonly client = new S3Client({ requestChecksumCalculation: "WHEN_REQUIRED" })
  ) {
    if (!bucket || /[\s/]/.test(bucket)) throw new Error("Invalid CONTRIB_MEDIA_BUCKET")
    mediaObjectKey(prefix, "validation")
  }

  async put(key: string, filename: string, contentType: string): Promise<void> {
    const objectKey = mediaObjectKey(this.prefix, key)
    const size = (await fs.stat(filename)).size
    const stream = createReadStream(filename)
    try {
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: stream,
        ContentLength: size,
        ContentType: contentType
      }))
    } finally {
      stream.destroy()
    }
  }

  async get(key: string): Promise<StoredMedia> {
    const result = await this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: mediaObjectKey(this.prefix, key)
    }))
    if (!(result.Body instanceof Readable)) throw new Error("Media object has no readable body")
    return {
      body: result.Body,
      contentType: result.ContentType || "application/octet-stream",
      length: result.ContentLength
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: mediaObjectKey(this.prefix, key)
    }))
  }
}

/** Retain disk-backed development and existing single-host deployments. */
export class LocalMediaStorage implements MediaStorage {
  constructor(private readonly directory: string) {}

  async put(key: string, filename: string): Promise<void> {
    const destination = path.join(this.directory, validateMediaKey(key))
    await fs.mkdir(this.directory, { recursive: true })
    await fs.copyFile(filename, destination)
  }

  async get(key: string): Promise<StoredMedia> {
    const filename = path.join(this.directory, validateMediaKey(key))
    const stat = await fs.stat(filename)
    return { body: createReadStream(filename), contentType: "application/octet-stream", length: stat.size }
  }

  async delete(key: string): Promise<void> {
    await fs.rm(path.join(this.directory, validateMediaKey(key)), { force: true })
  }
}

export const createMediaStorage = (
  directory: string,
  env: NodeJS.ProcessEnv = process.env
): MediaStorage => {
  const bucket = env.CONTRIB_MEDIA_BUCKET
  const prefix = env.CONTRIB_MEDIA_PREFIX
  if (!!bucket !== !!prefix) {
    throw new Error("CONTRIB_MEDIA_BUCKET and CONTRIB_MEDIA_PREFIX must be set together")
  }
  return bucket && prefix ? new S3MediaStorage(bucket, prefix) : new LocalMediaStorage(directory)
}

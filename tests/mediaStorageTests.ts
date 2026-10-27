import { expect, test, vi } from "vitest"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { Readable } from "node:stream"
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { createMediaStorage, LocalMediaStorage, mediaObjectKey, S3MediaStorage } from "../src/backend/mediaStorage"

test("S3 operations stay in the configured prefix and never make uploads public", async () => {
  const directory = await mkdtemp(join(tmpdir(), "contrib-media-"))
  try {
    const filename = join(directory, "upload")
    await writeFile(filename, "private fixture")
    const objects = new Map<string, string>()
    const send = vi.fn(async (command) => {
      if (command instanceof PutObjectCommand) {
        let body = ""
        for await (const chunk of command.input.Body as Readable) body += chunk.toString()
        expect(body).toBe("private fixture")
        objects.set(command.input.Key, body)
        return {}
      }
      if (command instanceof GetObjectCommand) {
        const body = objects.get(command.input.Key)
        if (body === undefined) throw new Error("missing object")
        return { Body: Readable.from([body]), ContentType: "text/plain", ContentLength: body.length }
      }
      if (command instanceof DeleteObjectCommand) objects.delete(command.input.Key)
      return {}
    })
    const storage = new S3MediaStorage("private-bucket", "candidates/a/contribute/media/", { send } as unknown as S3Client)
    await storage.put("fixture.txt", filename, "text/plain")
    await rm(filename)
    // A new process only needs the persisted key and the same bucket/prefix.
    const restarted = new S3MediaStorage("private-bucket", "candidates/a/contribute/media/", { send } as unknown as S3Client)
    const content = await restarted.get("fixture.txt")
    let read = ""
    for await (const part of content.body) read += part.toString()
    expect(read).toBe("private fixture")
    await restarted.delete("fixture.txt")
    expect(objects.size).toBe(0)
    expect(send.mock.calls.map(([command]) => command.constructor)).toEqual([PutObjectCommand, GetObjectCommand, DeleteObjectCommand])
    for (const [command] of send.mock.calls) {
      expect(command.input).toMatchObject({ Bucket: "private-bucket", Key: "candidates/a/contribute/media/fixture.txt" })
      expect(command.input.ACL).toBeUndefined()
    }
    for (const key of ["../secret", "/public/key", "folder/key", "%2e%2e%2fsecret", "a\\b", "secret\nheader", ""]) {
      await expect(storage.get(key)).rejects.toThrow("Invalid media key")
      await expect(storage.delete(key)).rejects.toThrow("Invalid media key")
    }
    expect(send).toHaveBeenCalledTimes(3)
    expect(() => mediaObjectKey("candidates/../production", "ok")).toThrow("CONTRIB_MEDIA_PREFIX")
    expect(() => createMediaStorage(directory, { CONTRIB_MEDIA_BUCKET: "bucket" })).toThrow("set together")
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("local media survives deletion of the request's temporary upload", async () => {
  const directory = await mkdtemp(join(tmpdir(), "contrib-media-local-"))
  try {
    const temporary = join(directory, "temporary")
    const destination = join(directory, "durable")
    await writeFile(temporary, "fixture")
    const storage = new LocalMediaStorage(destination)
    await storage.put("fixture.txt", temporary)
    await rm(temporary)
    expect(await readFile(join(destination, "fixture.txt"), "utf8")).toBe("fixture")
    const content = await storage.get("fixture.txt")
    content.body.destroy()
    await storage.delete("fixture.txt")
    await expect(storage.get("fixture.txt")).rejects.toThrow()
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

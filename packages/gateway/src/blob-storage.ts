import { createHash } from "node:crypto";
import { GatewayStorage } from "./storage.js";

export interface GatewayBlobSnapshot {
  bytes: Uint8Array;
  etag: string;
}

/** Minimal Vercel Blob surface kept injectable for deterministic unit tests. */
export interface GatewayBlobStore {
  read(): Promise<GatewayBlobSnapshot | null>;
  write(bytes: Uint8Array, expectedEtag?: string): Promise<{ etag: string }>;
}

export class GatewayStorageConflictError extends Error {
  constructor() {
    super("Gateway state changed in another serverless instance. Retry this request.");
    this.name = "GatewayStorageConflictError";
  }
}

function snapshotDigest(snapshot: Uint8Array): string {
  return createHash("sha256").update(snapshot).digest("hex");
}

/**
 * SQLite snapshot storage for serverless deployments. Conditional Blob writes
 * prevent lost updates; a process-local queue avoids overlapping use of the
 * synchronous SQLite handle within one warm function instance.
 */
export class BlobGatewayStorage extends GatewayStorage {
  private etag: string | undefined;
  private persistedDigest = "";
  private queue: Promise<void> = Promise.resolve();

  private constructor(private readonly blobs: GatewayBlobStore) {
    super(":memory:");
    this.persistedDigest = snapshotDigest(this.snapshot());
  }

  static async create(blobs: GatewayBlobStore): Promise<BlobGatewayStorage> {
    const storage = new BlobGatewayStorage(blobs);
    const latest = await blobs.read();
    if (latest) {
      storage.restoreSnapshot(latest.bytes);
      storage.etag = latest.etag;
      storage.persistedDigest = snapshotDigest(latest.bytes);
    }
    return storage;
  }

  async beginRequest(): Promise<() => void> {
    let unlock!: () => void;
    const previous = this.queue;
    this.queue = new Promise<void>((resolve) => { unlock = resolve; });
    await previous;
    try {
      const latest = await this.blobs.read();
      if ((latest?.etag ?? undefined) !== this.etag) {
        if (latest) this.restoreSnapshot(latest.bytes);
        else if (this.etag) throw new GatewayStorageConflictError();
        this.etag = latest?.etag;
        this.persistedDigest = snapshotDigest(latest?.bytes ?? this.snapshot());
      }
      return unlock;
    } catch (error) {
      unlock();
      throw error;
    }
  }

  async commitRequest(): Promise<void> {
    const bytes = this.snapshot();
    const digest = snapshotDigest(bytes);
    if (digest === this.persistedDigest) return;
    try {
      const result = await this.blobs.write(bytes, this.etag);
      this.etag = result.etag;
      this.persistedDigest = digest;
    } catch {
      throw new GatewayStorageConflictError();
    }
  }

  override flush(): void { /* Blob snapshots are written by commitRequest(). */ }
}

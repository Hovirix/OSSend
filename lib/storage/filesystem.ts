import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type { BlobStorage } from "./types";

export class FilesystemBlobStorage implements BlobStorage {
	constructor(private readonly root = process.env.OSSEND_STORAGE_PATH ?? ".ossend-storage") {}

	private path(key: string) {
		const path = resolve(this.root, key);
		if (!path.startsWith(`${resolve(this.root)}/`)) throw new Error("Invalid blob key.");
		return path;
	}

	async put(key: string, data: Uint8Array): Promise<void> {
		const path = this.path(key);
		await mkdir(dirname(path), { recursive: true });
		await writeFile(path, data);
	}

	async get(key: string): Promise<Uint8Array> { return readFile(this.path(key)); }
	async delete(key: string): Promise<void> { await rm(this.path(key), { force: true }); }
}

export function getBlobStorage(): BlobStorage { return new FilesystemBlobStorage(); }

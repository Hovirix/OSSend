export interface BlobStorage {
	put(key: string, data: Uint8Array, options?: { contentType?: string }): Promise<void>;
	get(key: string): Promise<Uint8Array>;
	delete(key: string): Promise<void>;
}

export function rawEmailBlobKey(userId: string, messageId: string) {
	return `raw/${userId}/${messageId}.eml`;
}

export function attachmentBlobKey(userId: string, messageId: string, attachmentId: string) {
	return `attachments/${userId}/${messageId}/${attachmentId}`;
}

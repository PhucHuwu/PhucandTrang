import * as THREE from "three";
import type Page from "../page";

export type PendingFaceTexture = { url: string; texture?: THREE.Texture };

/** Face texture swaps queued by the lazy texture manager; applied one per rendered frame. */
export class FaceTextureQueue {
	private pending = new Map<number, PendingFaceTexture>();

	set(faceIndex: number, url: string, texture?: THREE.Texture) {
		this.pending.set(faceIndex, { url, texture });
	}

	delete(faceIndex: number) {
		const pending = this.pending.get(faceIndex);
		if (pending) {
			this.pending.delete(faceIndex);
		}
	}

	/** Removes and returns the oldest queued swap. */
	takeNext(): [number, PendingFaceTexture] | undefined {
		const next = this.pending.entries().next();
		if (next.done) return undefined;
		this.pending.delete(next.value[0]);
		return next.value;
	}

	disposeAll() {
		for (const pending of this.pending.values()) pending.texture?.dispose();
		this.pending.clear();
	}
}

/** Uploads every opening face texture, one face per animation frame. */
export async function prepareOpeningTextures(
	pages: Page[],
	renderer: THREE.WebGLRenderer,
	faceCount: number,
	isDisposed: () => boolean,
): Promise<void> {
	const uploaded = new Set<THREE.Texture>();
	for (let faceIndex = 0; faceIndex < faceCount; faceIndex++) {
		await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
		if (isDisposed()) return;
		const page = pages[Math.floor(faceIndex / 2)];
		if (!page) continue;
		const materials = page.mesh.material as THREE.MeshStandardMaterial[];
		const texture = materials[faceIndex % 2 === 0 ? 1 : 0].map;
		if (texture && !uploaded.has(texture)) {
			renderer.initTexture(texture);
			uploaded.add(texture);
		}
	}
}

/** Applies the oldest queued face texture swap to its page (uploading a direct texture first). */
export function applyNextFaceTexture(queue: FaceTextureQueue, pages: Page[], renderer: THREE.WebGLRenderer) {
	const next = queue.takeNext();
	if (!next) return;
	const [faceIndex, { url, texture: directTexture }] = next;
	if (directTexture) renderer.initTexture(directTexture);
	const pageIndex = Math.floor(faceIndex / 2);
	const side: 'front' | 'back' = faceIndex % 2 === 0 ? 'front' : 'back';
	const page = pages[pageIndex];
	if (page) {
		page.setSideTexture(side, url, directTexture);
	}
}

/** Whether the face is on one of the top pages or the one turning at the given progress. */
export function isFaceOnVisiblePage(faceIndex: number, progress: number): boolean {
	const pageIndex = Math.floor(faceIndex / 2);
	return pageIndex >= Math.floor(progress) - 1 && pageIndex <= Math.ceil(progress);
}

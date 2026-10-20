import * as THREE from "three";

/** Writes the pointer position in normalized device coordinates (-1..1) into `target`. */
export function setPointerFromEvent(event: MouseEvent, canvas: HTMLCanvasElement, target: THREE.Vector2) {
	const rect = canvas.getBoundingClientRect();
	const width = rect.width || 1;
	const height = rect.height || 1;
	target.x = ((event.clientX - rect.left) / width) * 2 - 1;
	target.y = -((event.clientY - rect.top) / height) * 2 + 1;
}

export function toggleFullscreen(containerEl: HTMLElement) {
	if (!document.fullscreenElement) {
		if (containerEl.requestFullscreen) {
			containerEl.requestFullscreen().catch(err => {
				console.error(
					"Failed to enter a full-screen mode",
					err,
				);
			});
		} else {
			console.error(
				"Fullscreen API is not supported in this browser.",
			);
		}
	} else {
		if (document.exitFullscreen) {
			document.exitFullscreen().catch(err => {
				console.error("Failed to exit a full-screen mode", err);
			});
		}
	}
}

/** Keyboard events the book must ignore (modifiers, already handled, or typed into a form control). */
export function shouldIgnoreKeyEvent(event: KeyboardEvent) {
	if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return true;
	const target = event.target as HTMLElement | null;
	if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName))) return true;
	return false;
}

export type CursorState = {
	isChangingFocus: boolean;
	focusedActiveArea: PageActiveArea | null;
	isDragging: () => boolean;
	getHoveredArea: () => PageActiveArea | undefined;
};

export function resolveCursor(state: CursorState) {
	let cursor = "grab";
	let href = "";
	let title = "";

	if (state.isChangingFocus) {
		cursor = "default";
	} else if (state.focusedActiveArea) {
		if (!state.focusedActiveArea.preserveDefaultCursor) {
			cursor = "pointer";
		}
	} else if (state.isDragging()) {
		cursor = "ew-resize";
	} else {
		const activeArea = state.getHoveredArea();

		if (activeArea) {
			if (!activeArea.preserveDefaultCursor) {
				cursor = "pointer";
			}
			title = activeArea.title || "";

			if (typeof activeArea.link === "function") {
				href = activeArea.link();
			} else {
				href = activeArea.link || "";
			}
		}
	}

	return { cursor, href, title };
}

export function applyCursor(wrapperLinkEl: HTMLElement, { cursor, href, title }: { cursor: string; href: string; title: string }) {
	wrapperLinkEl.style.cursor = cursor;
	wrapperLinkEl.title = title;
	// setAttribute bypasses React's javascript: URL protection, so only allow web links
	if (href && /^https?:\/\//i.test(href)) {
		wrapperLinkEl.setAttribute("href", href);
	} else {
		wrapperLinkEl.removeAttribute("href");
	}
}

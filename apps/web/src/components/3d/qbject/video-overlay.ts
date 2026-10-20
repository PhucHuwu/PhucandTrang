export default class VideoOverlay {
	private dom: {
		parent: HTMLElement;
		container: HTMLDivElement;
		backdrop: HTMLDivElement;
		closeBtn: HTMLButtonElement;
		videos: Record<string, HTMLVideoElement>;
	};
	private onCloseRequest?: () => unknown;
	private activeVideo: HTMLVideoElement | null = null;

	constructor(parent: HTMLElement, onCloseRequest?: () => unknown) {
		this.onCloseRequest = onCloseRequest;

		this.dom = {
			parent,
			container: document.createElement("div"),
			backdrop: document.createElement("div"),
			closeBtn: document.createElement("button"),
			videos: {},
		};

		this.dom.container.classList.add("video-overlay");
		this.dom.backdrop.classList.add("backdrop");
		this.dom.closeBtn.classList.add("closeBtn");
		this.dom.closeBtn.type = "button";
		this.dom.closeBtn.setAttribute("aria-label", "Đóng video");

		this.dom.container.append(this.dom.backdrop);
		this.dom.container.append(this.dom.closeBtn);
		this.dom.parent.append(this.dom.container);

		const requestClose = () => this.onCloseRequest?.();
		this.dom.backdrop.addEventListener("click", requestClose);
		this.dom.closeBtn.addEventListener("click", requestClose);
	}

	public open(videoUrl: string) {
		this.close();
		this.addVideo(videoUrl);
		this.dom.container.classList.toggle("active", true);
		this.activeVideo = this.dom.videos[videoUrl];
		if (this.activeVideo) {
			this.activeVideo.parentElement?.classList.toggle("active", true);
			this.activeVideo.currentTime = 0;
			this.activeVideo.play().catch(e => console.log("Video play interrupted:", e));
		}
	}

	public close() {
		this.activeVideo = null;
		// Tear the elements down so the browser stops buffering closed videos
		Object.entries(this.dom.videos).forEach(([src, v]) => {
			v.pause();
			v.removeAttribute("src");
			v.load();
			v.parentElement?.remove();
			delete this.dom.videos[src];
		});
		this.dom.container.classList.toggle("active", false);
	}

	public addVideo(src?: string) {
		if (!src || this.dom.videos[src]) return;

		const videoWrapper = document.createElement("div");
		videoWrapper.classList.add("video-wrapper");
		const video = (this.dom.videos[src] = document.createElement("video"));
		this.dom.container.append(videoWrapper);
		videoWrapper.append(video);

		video.src = src;
		video.controls = true;
		video.muted = true; // Completely mute video audio to keep background music serene
		video.volume = 0;
		video.setAttribute("muted", "");
		video.playsInline = true;
		video.setAttribute("playsinline", "");
		video.setAttribute("webkit-playsinline", "");
		video.setAttribute("controlslist", "nodownload noremoteplayback noaudio");
		video.setAttribute("disablepictureinpicture", "");
		video.setAttribute("disableremoteplayback", "");
		// Only opened on demand (open() plays it right away), so no speculative download
		video.preload = "none";
	}

	public destroy() {
		this.close();
		this.onCloseRequest = undefined;
		this.dom.container.remove();
	}

	public isOpen() {
		return this.dom.container.classList.contains("active");
	}
}

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

		this.dom.container.append(this.dom.backdrop);
		this.dom.container.append(this.dom.closeBtn);
		this.dom.parent.append(this.dom.container);

		const requestClose = () => this.onCloseRequest?.();
		this.dom.backdrop.addEventListener("click", requestClose);
		this.dom.closeBtn.addEventListener("click", requestClose);
	}

	public open(videoUrl: string) {
		this.addVideo(videoUrl);
		this.dom.container.classList.toggle("active", true);
		this.activeVideo = this.dom.videos[videoUrl];
		this.activeVideo.parentElement?.classList.toggle("active", true);
		this.activeVideo.currentTime = 0;
		this.activeVideo.play();
	}

	public close() {
		if (!this.activeVideo) return;

		this.dom.container.classList.toggle("active", false);
		this.activeVideo.parentElement?.classList.toggle("active", false);
		this.activeVideo.pause();
		this.activeVideo = null;
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
		video.setAttribute("controlslist", "nodownload noremoteplayback");
		video.setAttribute("disablepictureinpicture", "");
		video.setAttribute("disableremoteplayback", "");
		video.preload = "metadata";
	}
}

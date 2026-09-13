import { removeArrayItem } from "./util";

// Define a type for callbacks
type Callback = (...args: any[]) => void;

// Base class handling event subscription
export default class EventEmitter {
	// Define the type for our callbacks object
	private callbacks: { [eventName: string]: Callback[] };

	constructor() {
		this.callbacks = {};
	}

	addCallback(eventName: string, callback: Callback): void {
		if (!(eventName in this.callbacks)) {
			this.callbacks[eventName] = [];
		}
		this.callbacks[eventName].push(callback);
	}

	removeCallback(eventName: string, callback: Callback): void {
		if (eventName in this.callbacks) {
			removeArrayItem(this.callbacks[eventName], callback);
		}
	}

	triggerEvent(eventName: string, params: any[] = []): void {
		for (const callback of this.callbacks[eventName] || []) {
			callback(...params);
		}
	}
}

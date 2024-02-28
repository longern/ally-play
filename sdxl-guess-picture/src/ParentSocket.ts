export class ParentSocket extends EventTarget {
  #handler: (event: MessageEvent) => void;

  constructor() {
    super();
    this.#handler = (event) => {
      if (event.source !== window.parent) return;
      const message = event.data;
      this.dispatchEvent(new MessageEvent("message", { data: message }));
    };
    window.addEventListener("message", this.#handler);
  }

  send(data: any) {
    window.parent.postMessage(data, window.parent.origin);
  }

  close() {
    window.removeEventListener("message", this.#handler);
  }
}

export class ParentSocket extends EventTarget {
  #handler: (event: MessageEvent) => void;

  constructor() {
    super();
    this.#handler = (event: MessageEvent<string>) => {
      if (event.source !== window.parent) return;
      if (typeof event.data !== "string") return;
      const message = event.data;
      this.dispatchEvent(new MessageEvent("message", { data: message }));
    };
    window.addEventListener("message", this.#handler);
    window.parent.postMessage(JSON.stringify({ type: "setup" }), "*");
  }

  send(data: string) {
    window.parent.postMessage(data, "*");
  }

  close() {
    window.removeEventListener("message", this.#handler);
  }
}

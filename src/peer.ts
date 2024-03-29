export interface Socket extends EventTarget {
  send(data: string): void;
  close(): void;
}

const DEFAULT_SIGNAL_ENDPOINT =
  process.env.REACT_APP_DEFAULT_SIGNAL_ENDPOINT ||
  `wss://${window.location.host}/signal`;

function waitIceGathering(peer: RTCPeerConnection) {
  return new Promise<RTCSessionDescription>((resolve) => {
    /** Wait at most 1 second for ICE gathering. */
    setTimeout(function () {
      resolve(peer.localDescription);
    }, 1000);
    peer.onicegatheringstatechange = () =>
      peer.iceGatheringState === "complete" && resolve(peer.localDescription);
  });
}

export class PeerSocket extends EventTarget implements Socket {
  private peer: RTCPeerConnection;
  private dataChannel: RTCDataChannel;

  constructor(
    id: string | RTCPeerConnection,
    options?: RTCConfiguration & { endpoint?: string }
  ) {
    super();

    options = options || {};
    const endpoint = options.endpoint || DEFAULT_SIGNAL_ENDPOINT;
    delete options.endpoint;

    if (typeof id !== "string") {
      this.#init(id);
      return;
    }

    const peer = new RTCPeerConnection(options);
    this.peer = peer;
    this.dataChannel = peer.createDataChannel("dataChannel");
    peer.createOffer().then(async (offer) => {
      await peer.setLocalDescription(offer);
      const { sdp } = await waitIceGathering(peer);
      let signalSocket = new WebSocket(endpoint);
      signalSocket.onopen = () => {
        const peerId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        signalSocket.send(
          JSON.stringify({ type: "createTopic", name: peerId })
        );
        signalSocket.send(JSON.stringify({ type: "consume", topic: peerId }));
        signalSocket.send(
          JSON.stringify({
            type: "produce",
            topic: id,
            message: JSON.stringify({
              type: "offer",
              peerId,
              offer: sdp,
            }),
          })
        );
      };
      signalSocket.onmessage = async (event) => {
        const body = JSON.parse(event.data);

        if (body.type === "error") {
          if (body.data === "Topic not found") {
            this.dispatchEvent(
              new ErrorEvent("error", { error: new Error("Room not found.") })
            );
          }
          return;
        }

        if (body.type !== "message") return;
        const message = JSON.parse(body.data);
        switch (message.type) {
          case "answer":
            await peer.setRemoteDescription({
              type: "answer",
              sdp: message.answer,
            });
            signalSocket.send(JSON.stringify({ type: "consume" }));
            break;
        }
      };
      signalSocket.onerror = (event: ErrorEvent) => {
        this.dispatchEvent(
          new ErrorEvent("error", {
            error: new Error("Failed to connect to the signaling server."),
          })
        );
      };
      peer.addEventListener("close", () => {
        signalSocket.close();
      });
    });
    this.dataChannel.onopen = () => {
      this.dispatchEvent(new Event("open"));
    };
    this.dataChannel.onmessage = (event) => {
      this.dispatchEvent(new MessageEvent("message", { data: event.data }));
    };
    this.dataChannel.onclose = () => {
      this.dispatchEvent(new CloseEvent("close"));
    };
  }

  #init(peer: RTCPeerConnection) {
    this.peer = peer;
    peer.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.dataChannel.onmessage = (event) => {
        this.dispatchEvent(new MessageEvent("message", { data: event.data }));
      };
      this.dataChannel.onerror = (event: RTCErrorEvent) => {
        this.dispatchEvent(new ErrorEvent("error", { error: event }));
      };
      this.dataChannel.onclose = () => {
        this.dispatchEvent(new CloseEvent("close"));
      };
      this.dispatchEvent(new Event("open"));
    };
  }

  send(data: string) {
    this.dataChannel.send(data);
  }

  close() {
    this.dataChannel.close();
    this.peer.close();
  }
}

export class PeerServer extends EventTarget {
  endpoint: string;
  config: RTCConfiguration;
  abortController: AbortController;

  constructor(
    options?: RTCConfiguration & {
      endpoint?: string;
    }
  ) {
    super();

    options = options || {};
    this.endpoint = options.endpoint || DEFAULT_SIGNAL_ENDPOINT;
    delete options.endpoint;
    this.config = options;
    this.abortController = new AbortController();
  }

  bind(id: string) {
    const signalSocket = new WebSocket(this.endpoint);
    signalSocket.onopen = () => {
      signalSocket.send(JSON.stringify({ type: "createTopic", name: id }));
      signalSocket.send(JSON.stringify({ type: "consume", topic: id }));
      this.dispatchEvent(new Event("open"));
    };
    signalSocket.onmessage = async (event: MessageEvent<string>) => {
      const body = JSON.parse(event.data);
      if (body.type !== "message") return;
      const message = JSON.parse(body.data);
      switch (message.type) {
        case "offer":
          let peer = new RTCPeerConnection(this.config);
          await peer.setRemoteDescription({
            type: "offer",
            sdp: message.offer,
          });
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          const { sdp } = await waitIceGathering(peer);
          if (this.abortController.signal.aborted) return;
          const peerSocket = new PeerSocket(peer);
          signalSocket.send(
            JSON.stringify({
              type: "produce",
              topic: message.peerId,
              message: JSON.stringify({ type: "answer", answer: sdp }),
            })
          );
          this.dispatchEvent(
            new CustomEvent("connection", { detail: peerSocket })
          );
          break;
      }
    };

    this.abortController.signal.addEventListener("abort", () => {
      if (signalSocket.readyState === WebSocket.CONNECTING) {
        signalSocket.onopen = () => signalSocket.close();
      } else {
        signalSocket.close();
      }
    });
  }

  close() {
    this.abortController.abort();
  }
}

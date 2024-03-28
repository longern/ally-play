import { useEffect, useMemo, useState } from "react";
import { PeerServer, PeerSocket, Socket } from "./peer";

type LobbyState = {
  roomID: string;
  hostID: string;
  game: {
    name: string;
    url: string;
    icon?: string;
  } | null;
  runningMatch: boolean;
  matchData: {
    playerID: string;
    playerName: string;
    ready: boolean;
    avatar?: string;
  }[];
};

function withResolvers<T>() {
  let resolve: (value: T) => void;
  let reject: (error: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export function createLobby(options?: {
  playerName?: string;
  game?: {
    name: string;
    url: string;
    icon?: string;
  };
  config?: any;
}) {
  options = options ?? {};
  const config = options.config ?? {
    iceServers: [
      { urls: "STUN:freestun.net:3479" },
      { urls: "STUN:stun.cloudflare.com:3478" },
      { urls: "TURN:freeturn.net:3478", username: "free", credential: "free" },
    ],
  };

  const abortController = new AbortController();
  const connections = new Map<string, Socket>();

  let state: LobbyState = {
    roomID: "",
    hostID: "",
    game: options.game,
    runningMatch: false,
    matchData: [],
  };
  let playerID: string = undefined;
  let isConnected = false;

  function handleDataFromGuest(guestID: string, event: MessageEvent<string>) {
    const data = JSON.parse(event.data);
    if (data?.type === "metadata") {
      function updatePlayer(playerDelta: Partial<LobbyState["matchData"][0]>) {
        state.matchData = state.matchData.map((player) =>
          player.playerID === guestID ? { ...player, ...playerDelta } : player
        );
        connections.forEach((connection) => {
          connection.send(JSON.stringify({ type: "metadata", state }));
        });
        publish();
      }
      const { player: playerDelta } = data;
      updatePlayer(playerDelta);
    }
  }

  function handleDataFromHost(event: MessageEvent<string>) {
    const data = JSON.parse(event.data) as
      | { type: "joined"; playerID: string }
      | { type: "metadata"; state: LobbyState }
      | any;
    if (data?.type === "joined") {
      playerID = data.playerID;
      publish();
    } else if (data?.type === "metadata") {
      isConnected = true;
      state = data.state;
      publish();
    }
  }

  function handleConnectionFromGuest(event: CustomEvent<Socket>) {
    const connection = event.detail;
    const playerID = crypto.randomUUID();

    const handleJoin = (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data);
      if (data?.type !== "join" || data?.app !== "ally-play") return;

      connections.set(playerID, connection);
      connection.send(JSON.stringify({ type: "joined", playerID }));
      connection.removeEventListener("message", handleJoin);
      connection.addEventListener("message", (event: MessageEvent<string>) => {
        handleDataFromGuest(playerID, event);
      });

      connection.addEventListener("close", () => {
        if (state.runningMatch) return;
        connections.delete(playerID);
        state = {
          ...state,
          matchData: state.matchData.filter(
            (player) => player.playerID !== playerID
          ),
        };
        publish();
        connections.forEach((connection) => {
          connection.send(JSON.stringify({ type: "metadata", state }));
        });
      });

      if (state.runningMatch) return;
      state = {
        ...state,
        matchData: [
          ...state.matchData,
          {
            playerID,
            playerName:
              data?.playerName || `Player ${state.matchData.length + 1}`,
            ready: false,
          },
        ],
      };
      publish();
      connections.forEach((connection) => {
        connection.send(JSON.stringify({ type: "metadata", state }));
      });
    };

    connection.addEventListener("message", handleJoin);

    abortController.signal.addEventListener("abort", () => {
      connection.close();
    });
  }

  const changeGame = function (game: {
    name: string;
    url: string;
    icon?: string;
  }) {
    state = { ...state, game };
    connections.forEach((connection) => {
      connection.send(JSON.stringify({ type: "metadata", state }));
    });
    publish();
  };

  const createRoom = function () {
    const id = Math.random().toFixed(6).slice(2);
    const peerServer = new PeerServer(config);
    peerServer.bind(`ally-play-${id}`);
    peerServer.addEventListener("open", () => {
      peerServer.addEventListener("connection", handleConnectionFromGuest);
      state = {
        game: state.game,
        roomID: id,
        hostID: "0",
        runningMatch: false,
        matchData: [
          {
            playerID: "0",
            playerName: options.playerName || "Host",
            ready: true,
          },
        ],
      };
      playerID = "0";
      isConnected = true;
      publish();
    });
    peerServer.addEventListener("disconnected", () => {
      isConnected = false;
      publish();
    });
    abortController.signal.addEventListener("abort", () => {
      peerServer.close();
    });
  };

  const bindIframe = function (iframe: HTMLIFrameElement) {
    const isHost = playerID === state.hostID;
    const {
      promise: loadedPromise,
      resolve: resolveLoaded,
      reject: rejectLoaded,
    } = withResolvers<void>();

    const timeout = setTimeout(() => {
      rejectLoaded(new Error("Timeout"));
    }, 15000);

    const handleMessage = (event: MessageEvent<string>) => {
      if (event.source !== iframe.contentWindow) return;
      const data = JSON.parse(event.data);

      if (data.type === "setup") {
        resolveLoaded();
        clearTimeout(timeout);
        const ctx = {
          playOrder: state.matchData.map((player) => player.playerID),
          isHost,
          numPlayers: state.matchData.length,
          playerNames: Object.fromEntries(
            state.matchData.map((player) => [
              player.playerID,
              player.playerName,
            ])
          ),
        };
        iframe.contentWindow.postMessage(
          JSON.stringify({ type: "setup", playerID, ctx }),
          new URL(iframe.src).origin
        );
      } else if (isHost) {
        connections.get(data.playerID).send(event.data);
      } else {
        data.playerID = playerID;
        connections.get(state.roomID).send(event.data);
      }
    };

    window.addEventListener("message", handleMessage);

    const handlers = isHost
      ? Array.from(connections).map(([playerID, connection]) => {
          const handler = async (event: MessageEvent<string>) => {
            const message = JSON.parse(event.data);
            message.playerID = playerID;
            await loadedPromise;
            iframe.contentWindow.postMessage(
              JSON.stringify(message),
              new URL(iframe.src).origin
            );
          };
          connection.addEventListener("message", handler);
          return [playerID, handler] as const;
        })
      : Array.from(connections).map(([key, connection]) => {
          const handler = async (event: MessageEvent<string>) => {
            await loadedPromise;
            iframe.contentWindow.postMessage(
              event.data,
              new URL(iframe.src).origin
            );
          };
          connection.addEventListener("message", handler);
          return [key, handler] as const;
        });

    const close = function () {
      clearTimeout(timeout);
      window.removeEventListener("message", handleMessage);
      handlers.forEach(([key, handler]) => {
        connections.get(key)?.removeEventListener("message", handler);
      });
    };

    return { close };
  };

  const joinMatch = function (roomID: string) {
    const peer = new PeerSocket(`ally-play-${roomID}`, config);
    peer.addEventListener("open", () => {
      isConnected = true;
      publish();
      connections.set(roomID, peer);
      peer.send(
        JSON.stringify({
          type: "join",
          app: "ally-play",
          playerName: options.playerName,
        })
      );
    });
    peer.addEventListener("message", handleDataFromHost);
    peer.addEventListener("error", (error) => {
      throw error;
    });
    peer.addEventListener("closed", () => {
      isConnected = false;
      publish();
    });
    abortController.signal.addEventListener("abort", () => {
      peer.close();
    });
  };

  const startGame = function () {
    state = { ...state, runningMatch: true };
    connections.forEach((connection) => {
      connection.send(JSON.stringify({ type: "metadata", state }));
    });
    publish();
  };

  const setReady = function (ready: boolean) {
    connections.forEach((connection) => {
      connection.send(JSON.stringify({ type: "metadata", player: { ready } }));
    });
  };

  let subscriptions = new Set<
    (state: {
      lobbyState: LobbyState;
      playerID: string;
      isConnected: boolean;
    }) => void
  >();
  function subscribe(
    callback: typeof subscriptions extends Set<infer T> ? T : never
  ) {
    subscriptions.add(callback);
    return function () {
      subscriptions.delete(callback);
    };
  }

  function publish() {
    subscriptions.forEach((callback) =>
      callback({ lobbyState: state, playerID, isConnected })
    );
  }

  const close = function () {
    abortController.abort();
    connections.clear();
    state = {
      roomID: "",
      hostID: "",
      game: null,
      runningMatch: false,
      matchData: [],
    };
    isConnected = false;
    publish();
  };

  return {
    bindIframe,
    changeGame,
    createRoom,
    joinMatch,
    startGame,
    setReady,
    subscribe,
    close,
  };
}

export type Lobby = ReturnType<typeof createLobby>;

export function useLobby({
  playerName,
  config,
}: {
  playerName?: string;
  config?: any;
}) {
  const lobby = useMemo(
    () => createLobby({ playerName, config }),
    [config, playerName]
  );

  const [lobbyState, setLobbyState] = useState<LobbyState>({
    roomID: "",
    hostID: "",
    game: null,
    runningMatch: false,
    matchData: [],
  });
  const [playerID, setPlayerID] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const subscription = lobby.subscribe(
      ({ lobbyState, playerID, isConnected }) => {
        setLobbyState(lobbyState);
        setPlayerID(playerID);
        setIsConnected(isConnected);
      }
    );

    return () => {
      subscription();
      lobby.close();
    };
  }, [lobby]);

  return { lobby, lobbyState, playerID, isConnected } as const;
}

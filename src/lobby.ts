import Peer, { DataConnection } from "peerjs";
import { useEffect, useMemo, useState } from "react";

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
      { urls: "TURN:freeturn.net:3478", username: "free", credential: "free" },
    ],
  };
  let peer: Peer | null = null;
  const connections = new Map<string, DataConnection>();

  let state: LobbyState = {
    roomID: "",
    hostID: "",
    game: options.game,
    runningMatch: false,
    matchData: [],
  };
  let playerID: string = undefined;
  let isConnected = false;

  function handleDataFromGuest(guestID: string, data: any) {
    if (data?.type === "metadata") {
      function updatePlayer(playerDelta: Partial<LobbyState["matchData"][0]>) {
        state.matchData = state.matchData.map((player) =>
          player.playerID === guestID ? { ...player, ...playerDelta } : player
        );
        connections.forEach((connection) => {
          connection.send({ type: "metadata", state });
        });
        publish();
      }
      const { player: playerDelta } = data;
      updatePlayer(playerDelta);
    }
  }

  function handleDataFromHost(data: any) {
    if (data?.type === "joined") {
      playerID = data.playerID;
      publish();
    } else if (data?.type === "metadata") {
      const { state: newState }: { state: LobbyState } = data;
      isConnected = true;
      state = newState;
      publish();
    }
  }

  function handleConnectionFromGuest(connection: DataConnection) {
    const playerID = connection.peer;

    const handleJoin = (data: any) => {
      if (data?.type !== "join" || data?.app !== "ally-play") return;

      connections.set(playerID, connection);
      connection.send({ type: "joined", playerID });
      connection.off("data", handleJoin);
      connection.on("data", (data: any) => {
        handleDataFromGuest(playerID, data);
      });

      connection.on("close", () => {
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
          connection.send({ type: "metadata", state });
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
        connection.send({ type: "metadata", state });
      });
    };

    connection.on("open", () => {
      connection.on("data", handleJoin);
    });

    connection.on("iceStateChanged", (iceState) => {
      if (!["failed", "disconnected", "closed"].includes(iceState)) return;
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
      connection.send({ type: "metadata", state });
    });
    publish();
  };

  const createRoom = async function () {
    return new Promise<string>((resolve) => {
      const id = Math.random().toFixed(6).slice(2);
      peer = new Peer(`ally-play-${id}`, { config });
      peer.on("open", () => {
        peer.on("connection", handleConnectionFromGuest);
        resolve(id);
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
      peer.on("disconnected", () => {
        isConnected = false;
        publish();
      });
    });
  };

  const createServer = function (iframe: HTMLIFrameElement) {
    const isHost = playerID === state.hostID;
    const handleMessage = (event: MessageEvent<string>) => {
      if (event.source !== iframe.contentWindow) return;
      const data = JSON.parse(event.data);

      if (data.type === "setup") {
        iframe.contentWindow!.postMessage(
          JSON.stringify({
            type: "setup",
            playerID,
            ctx: {
              playOrder: state.matchData.map((player) => player.playerID),
              isHost,
              numPlayers: state.matchData.length,
              playerNames: Object.fromEntries(
                state.matchData.map((player) => [
                  player.playerID,
                  player.playerName,
                ])
              ),
            },
          }),
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
          const handler = (data: string) => {
            const message = JSON.parse(data);
            message.playerID = playerID;
            iframe.contentWindow!.postMessage(
              JSON.stringify(message),
              new URL(iframe.src).origin
            );
          };
          connection.on("data", handler);
          return [playerID, handler] as const;
        })
      : Array.from(connections).map(([key, connection]) => {
          const handler = (data: string) => {
            iframe.contentWindow!.postMessage(data, new URL(iframe.src).origin);
          };
          connection.on("data", handler);
          return [key, handler] as const;
        });

    const close = function () {
      window.removeEventListener("message", handleMessage);
      handlers.forEach(([key, handler]) => {
        connections.get(key).off("data", handler);
      });
    };

    return { close };
  };

  const joinMatch = function (roomID: string) {
    peer = new Peer({ config });
    peer.on("open", () => {
      isConnected = true;
      publish();
      const connection = peer.connect(`ally-play-${roomID}`);
      connection.on("open", () => {
        connections.set(roomID, connection);
        connection.on("data", handleDataFromHost);
        connection.send({
          type: "join",
          app: "ally-play",
          playerName: options.playerName,
        });
      });
      connection.on("error", (error) => {
        throw error;
      });
    });
    peer.on("disconnected", () => {
      isConnected = false;
      publish();
    });
  };

  const startGame = function () {
    state = { ...state, runningMatch: true };
    connections.forEach((connection) => {
      connection.send({ type: "metadata", state });
    });
    publish();
  };

  const setReady = function (ready: boolean) {
    connections.forEach((connection) => {
      connection.send({ type: "metadata", player: { ready } });
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
    peer?.destroy();
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
    changeGame,
    createRoom,
    createServer,
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

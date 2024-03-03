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
  game?: {
    name: string;
    url: string;
    icon?: string;
  };
}) {
  options = options ?? {};
  let peer: Peer | null = null;
  const connections = new Map<string, DataConnection>();

  let state: LobbyState = {
    roomID: "",
    hostID: "",
    game: options.game,
    runningMatch: false,
    matchData: [],
  };
  let playerID = undefined;

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
    if (data?.type === "join") {
      const { player: newPlayer }: { player: string } = data;
      playerID = newPlayer;
      publish();
    } else if (data?.type === "metadata") {
      const { state: newState }: { state: LobbyState } = data;
      state = newState;
      publish();
    }
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
      peer = new Peer(`ally-play-${id}`);
      peer.on("open", () => {
        peer.on("connection", (connection) => {
          const playerID = connection.connectionId;
          connections.set(playerID, connection);
          connection.on("data", (data: any) => {
            handleDataFromGuest(playerID, data);
          });
          connection.on("open", () => {
            connection.send({ type: "join", player: playerID });
            connections.forEach((connection) => {
              connection.send({ type: "metadata", state });
            });
          });
          state = {
            ...state,
            matchData: [
              ...state.matchData,
              {
                playerID,
                playerName: `Player ${state.matchData.length + 1}`,
                ready: false,
              },
            ],
          };
          publish();
        });
        resolve(id);
        state = {
          game: state.game,
          roomID: id,
          hostID: "0",
          runningMatch: false,
          matchData: [{ playerID: "0", playerName: "Host", ready: true }],
        };
        playerID = "0";
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
    peer = new Peer();
    peer.on("open", () => {
      const connection = peer.connect(`ally-play-${roomID}`);
      connection.on("open", () => {
        connections.set(roomID, connection);
        connection.on("data", handleDataFromHost);
      });
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
    (state: { lobbyState: LobbyState; playerID: string }) => void
  >();
  function subscribe(
    callback: (state: { lobbyState: LobbyState; playerID: string }) => void
  ) {
    subscriptions.add(callback);
    return function () {
      subscriptions.delete(callback);
    };
  }

  function publish() {
    subscriptions.forEach((callback) =>
      callback({ lobbyState: state, playerID })
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

export function useLobby() {
  const lobby = useMemo(() => createLobby({}), []);

  const [lobbyState, setLobbyState] = useState<LobbyState>({
    roomID: "",
    hostID: "",
    game: null,
    runningMatch: false,
    matchData: [],
  });
  const [playerID, setPlayerID] = useState<string | null>(null);

  useEffect(() => {
    const subscription = lobby.subscribe(({ lobbyState, playerID }) => {
      setLobbyState(lobbyState);
      setPlayerID(playerID);
    });

    return () => {
      subscription();
      lobby.close();
    };
  }, [lobby]);

  return { lobby, lobbyState, playerID } as const;
}

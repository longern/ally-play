import Peer, { DataConnection } from "peerjs";
import { useEffect, useRef, useState } from "react";

type LobbyState = {
  roomID: string;
  hostID: string;
  game: {
    name: string;
    url: string;
    icon?: string;
  } | null;
  players: {
    playerID: string;
    playerName: string;
    ready: boolean;
    avatar?: string;
  }[];
};

export function createLobby({
  game,
  handleStart,
}: {
  game?: {
    name: string;
    url: string;
    icon?: string;
  };
  handleStart: (game: { name: string; url: string }) => void;
}) {
  let peer: Peer | null = null;
  const connections = new Map<string, DataConnection>();

  let state: LobbyState = {
    roomID: "",
    hostID: "",
    game,
    players: [],
  };

  function handleDataFromGuest(playerID: string, data: any) {
    if (data?.type === "metadata") {
      function updatePlayer(playerDelta: Partial<LobbyState["players"][0]>) {
        state.players = state.players.map((player) =>
          player.playerID === playerID ? { ...player, ...playerDelta } : player
        );
        connections.forEach((connection) => {
          connection.send({ type: "metadata", state });
        });
        subscriptions.forEach((callback) => callback(state));
      }
      const { player: playerDelta } = data;
      updatePlayer(playerDelta);
    }
  }

  function handleDataFromHost(data: any) {
    if (data?.type === "metadata") {
      const { state: newState }: { state: LobbyState } = data;
      state = newState;
      subscriptions.forEach((callback) => callback(state));
    } else if (data?.type === "start") {
      handleStart(state.game!);
    }
  }

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
        });
        resolve(id);
        state.roomID = id;
      });
    });
  };

  const joinMatch = function (
    roomID: string,
    { playerName }: { playerName: string }
  ) {
    peer = new Peer();
    peer.on("open", () => {
      const connection = peer.connect(`ally-play-${roomID}`);
      connection.on("open", () => {
        connections.set(roomID, connection);
        connection.on("data", handleDataFromHost);
        connection.send({ type: "metadata", player: { playerName } });
      });
    });
  };

  const startGame = function () {
    connections.forEach((connection) => {
      connection.send({ type: "start" });
    });
    handleStart(state.game!);
  };

  const setReady = function (ready: boolean) {
    if (!peer) return;
    connections.forEach((connection) => {
      connection.send({ type: "metadata", player: { ready } });
    });
  };

  let subscriptions = new Set<(state: any) => void>();
  function subscribe(callback: (state: any) => void) {
    subscriptions.add(callback);
    return function () {
      subscriptions.delete(callback);
    };
  }

  const close = function () {
    peer?.destroy();
  };

  return { createRoom, joinMatch, startGame, setReady, subscribe, close };
}

export type Lobby = ReturnType<typeof createLobby>;

export function useLobby({
  game,
}: {
  isHost: boolean;
  game: { name: string; url: string; icon?: string };
}) {
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [lobbyState, setLobbyState] = useState(null);

  useEffect(() => {
    const lobby = createLobby({
      game,
      handleStart: () => {},
    });
    const subscription = lobby.subscribe(setLobbyState);
    setLobby(lobby);
    return () => {
      subscription();
      lobby.close();
    };
  }, []);

  return { lobby, lobbyState } as const;
}

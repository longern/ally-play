import React, { useEffect, useMemo, useState } from "react";

import "./App.css";
import { Game, GameState } from "./game";
import { ParentSocket } from "./ParentSocket";

type GameMoves<
  T extends {
    moves: Record<string, any>;
  }
> = {
  [K in keyof T["moves"]]: (
    ...args: T["moves"][K] extends (client: any, ...args: infer I) => void
      ? I
      : []
  ) => void;
};

function GameBoard({
  G,
  moves,
  playerID,
}: {
  G: GameState;
  moves: GameMoves<typeof Game>;
  playerID: string;
}) {
  useEffect(() => {
    if (G.stage === "upload" && G.players[playerID].hand.length < 6) {
      Promise.all(
        Array.from({ length: 6 - G.players[playerID].hand.length }).map(() =>
          fetch(`https://picsum.photos/512/512`).then((res) => res.url)
        )
      ).then((pictures) => {
        moves.uploadPictures(pictures);
      });
    }
  }, [G, playerID, moves]);

  const imgUrl = new URL(
    `https://picsum.photos/512/512?s=${Math.random().toString().slice(2)}`
  );
  return G.stage === "upload" ? (
    <img src={imgUrl.toString()} alt="" />
  ) : G.stage === "pick" ? (
    <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap" }}>
      {G.players[playerID].hand.map((picture, i) => (
        <img
          style={{ flexBasis: "50%" }}
          key={i}
          src={picture}
          alt=""
          onClick={() => moves.pickPicture(picture, "description")}
        />
      ))}
    </div>
  ) : G.stage === "guess" ? (
    <img
      src={imgUrl.toString()}
      alt=""
      onClick={() => moves.guess(Math.floor(Math.random() * 6))}
    />
  ) : null;
}

function Client({ board, socket }: { board: any; socket: WebSocket }) {
  const [gameState, setGameState] = useState<GameState | null>(
    Game.setup({
      ctx: { numPlayers: 2 },
    })
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "sync") {
        setGameState(message.state);
      }
    };
    socket.addEventListener("message", handleMessage);
    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [socket]);

  const moves = useMemo(
    () =>
      new Proxy(
        {},
        {
          get: (_, prop) => {
            return (...args: any[]) => {
              socket.send(
                JSON.stringify({
                  type: "action",
                  args: [prop, ...args],
                })
              );
            };
          },
        }
      ),
    [socket]
  );

  return gameState && board({ G: gameState, moves, playerID: "0" });
}

function useSocket() {
  const [socket, setSocket] = useState<WebSocket>(null);

  useEffect(() => {
    const socket = new ParentSocket() as unknown as WebSocket;
    setSocket(socket);
    return () => {
      socket.close();
    };
  }, []);

  return socket;
}

function GameApp() {
  const socket = useSocket();

  return socket && <Client board={GameBoard} socket={socket} />;
}

export default GameApp;

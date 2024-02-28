import React, { createContext, useEffect, useState } from "react";
import { connectToParent } from "penpal";

import "./App.css";
import { API } from "./api";
import { Game, GameState } from "./game";

const ApiContext = createContext<API>(null);
const GameStateContext = createContext<GameState>(null);

const ApiProvider = ({ children }) => {
  const [notSupported, setNotSupported] = useState<boolean | null>(null);
  const [api, setApi] = useState<API>(null);
  const [gameState, setGameState] = useState<GameState>(null);

  useEffect(() => {
    const connection = connectToParent<API>({
      timeout: 3000,
      methods: {
        sync(state: GameState) {
          setGameState(state);
        },
      },
    });
    connection.promise
      .then((api) => {
        setApi(api);
        setNotSupported(false);
      })
      .catch(() => setNotSupported(true));

    return () => {
      connection.destroy();
    };
  }, []);

  return (
    <ApiContext.Provider value={api}>
      <GameStateContext.Provider value={gameState}>
        {notSupported === false ? (
          children
        ) : (
          <div
            style={{
              height: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {notSupported === null ? "Loading..." : "Not supported"}
          </div>
        )}
      </GameStateContext.Provider>
    </ApiContext.Provider>
  );
};

class ParentSocket extends EventTarget {
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

function GameBoard({
  G,
  moves,
}: {
  G: GameState;
  moves: (typeof Game)["moves"];
}) {
  const imgUrl = new URL(
    `https://sdxl.longern.com?${new URLSearchParams({
      prompt: "game",
    }).toString()}`
  );
  return <img src={imgUrl.toString()} alt="img" />;
}

function Client({ board, socket }) {
  const [gameState, setGameState] = useState<GameState>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data);
      if (message.type === "sync") {
        setGameState(message.state);
      }
    };
    socket.addEventListener("message", handleMessage);
    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [socket]);

  const moves = new Proxy(
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
  );

  return board({ G: gameState, moves });
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

  return (
    <ApiProvider>
      <Client board={GameBoard} socket={socket} />
    </ApiProvider>
  );
}

export default GameApp;

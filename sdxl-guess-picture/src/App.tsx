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

function Client({ Board }) {
  const api = React.useContext(ApiContext);
  const state = React.useContext(GameStateContext);

  const moves = new Proxy(
    {},
    {
      get: (_, prop) => {
        return (...args: any[]) => {
          api.sendAction(prop.toString(), args);
        };
      },
    }
  );

  return <Board G={state} moves={moves} />;
}

function GameApp() {
  return (
    <ApiProvider>
      <Client Board={GameBoard} />
    </ApiProvider>
  );
}

export default GameApp;

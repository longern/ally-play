import React, { createContext, useEffect, useState } from "react";
import { connectToParent } from "penpal";

import "./App.css";
import { API } from "../api";

const ApiContext = createContext(null);

const ApiProvider = ({ children }) => {
  const [notSupported, setNotSupported] = useState(false);
  const [api, setApi] = useState<API>(null);

  useEffect(() => {
    const connection = connectToParent<API>({ timeout: 3000 });
    connection.promise
      .then((api) => setApi(api))
      .catch(() => setNotSupported(true));

    return () => {
      connection.destroy();
    };
  }, []);

  return (
    <ApiContext.Provider value={api}>
      {notSupported ? (
        <div
          style={{
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          Not supported
        </div>
      ) : (
        children
      )}
    </ApiContext.Provider>
  );
};

function GameApp() {
  const imgUrl = new URL(
    `https://sdxl.longern.com?${new URLSearchParams({
      prompt: "game",
    }).toString()}`
  );
  return (
    <ApiProvider>
      <img src={imgUrl.toString()} alt="img" />
    </ApiProvider>
  );
}

export default GameApp;

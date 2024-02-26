import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import GameApp from "./GameApp";
import "./i18n";
import { StateProvider } from "./StateProvider";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <StateProvider>
      {window.location.hash === "#game" ? <GameApp /> : <App />}
    </StateProvider>
  </React.StrictMode>
);

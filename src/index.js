import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./i18n";
import { StateProvider } from "./StateProvider";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <StateProvider>
      <App />
    </StateProvider>
  </React.StrictMode>
);

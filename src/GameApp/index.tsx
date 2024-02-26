import React from "react";

function GameApp() {
  const imgUrl = new URL(
    `https://sdxl.longern.com?${new URLSearchParams({
      prompt: "game",
    }).toString()}`
  );
  return <img src={imgUrl.toString()} alt="img" />;
}

export default GameApp;

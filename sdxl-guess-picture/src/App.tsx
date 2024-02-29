import React, { useEffect, useState } from "react";

import "./App.css";
import { GuessPicture } from "./game";
import { ParentSocket } from "./ParentSocket";
import { Client, GameBoardComponent } from "./Client";

const GameBoard: GameBoardComponent<typeof GuessPicture> = function ({
  G,
  moves,
  playerID,
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
    <div style={{ display: "flex", flexWrap: "wrap" }}>
      {G.players[playerID].hand.map((picture, i) => (
        <img
          style={{ minWidth: 0, flexBasis: "50%" }}
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
  ) : (
    G.stage
  );
};

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
    socket && <Client game={GuessPicture} board={GameBoard} socket={socket} />
  );
}

export default GameApp;

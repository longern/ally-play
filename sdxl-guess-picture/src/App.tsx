import React, { useEffect, useState } from "react";

import "./App.css";
import { GuessPicture } from "./game";
import { ParentSocket } from "./ParentSocket";
import { Client, GameBoardComponent } from "./Client";

const Guess: GameBoardComponent<typeof GuessPicture> = function ({
  G,
  moves,
  playerID,
}) {
  return (
    <div>
      <h1>Guess</h1>
      <div>{G.description || "&nbsp;"}</div>
      <div>
        {G.board.map(({ playerID: id, picture }, i) => (
          <img
            key={i}
            src={picture}
            alt=""
            onClick={() =>
              playerID !== G.currentPlayer && id !== playerID && moves.guess(i)
            }
          />
        ))}
      </div>
    </div>
  );
};

const GameBoard: GameBoardComponent<typeof GuessPicture> = function ({
  G,
  moves,
  playerID,
}) {
  useEffect(() => {
    if (
      G.stage !== "upload" ||
      !G.players[playerID] ||
      G.players[playerID].hand.length >= 6
    )
      return;
    Promise.all(
      Array.from({ length: 6 - G.players[playerID].hand.length }).map(() =>
        fetch(`https://picsum.photos/512/512`).then((res) => res.url)
      )
    ).then((pictures) => {
      moves.uploadPictures(pictures);
    });
  }, [G, playerID, moves]);

  return G.stage === "upload" ? (
    <div>Uploading pictures...</div>
  ) : G.stage === "pick" ? (
    <div>
      {playerID === G.currentPlayer && (
        <div>
          <h1>Pick a picture</h1>
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {G.players[playerID].hand.map((picture, i) => (
          <img
            style={{ minWidth: 0, flexBasis: "50%" }}
            key={i}
            src={picture}
            alt=""
            onClick={() =>
              playerID === G.currentPlayer &&
              moves.pickPicture(picture, "description")
            }
          />
        ))}
      </div>
    </div>
  ) : G.stage === "confuse" ? (
    <div style={{ display: "flex", flexWrap: "wrap" }}>
      {playerID !== G.currentPlayer && (
        <div>
          <h1>Pick a picture</h1>
        </div>
      )}
      {G.players[playerID].hand.map((picture, i) => (
        <img
          style={{ minWidth: 0, flexBasis: "50%" }}
          key={i}
          src={picture}
          alt=""
          onClick={() =>
            playerID !== G.currentPlayer && moves.pickConfusingPicture(picture)
          }
        />
      ))}
    </div>
  ) : G.stage === "guess" ? (
    <Guess G={G} moves={moves} playerID={playerID} />
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

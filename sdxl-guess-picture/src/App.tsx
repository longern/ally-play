import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardMedia,
  CircularProgress,
  Container,
  CssBaseline,
  Grid,
  Stack,
  TextField,
  ThemeProvider,
  createTheme,
} from "@mui/material";

import "./App.css";
import { GuessPicture } from "./game";
import { ParentSocket } from "./ParentSocket";
import { Client, GameBoardComponent } from "./Client";

function ImageGrid({
  pictures,
  selected,
  onSelectedChange,
}: {
  pictures: string[];
  selected?: number;
  onSelectedChange?: (i: number) => void;
}) {
  return (
    <div>
      <Grid container spacing={2}>
        {pictures.map((picture, i) => (
          <Grid item key={i} xs={6} md={4}>
            <Card
              variant="outlined"
              sx={{
                opacity: selected === undefined ? 1 : selected === i ? 1 : 0.3,
                transform:
                  selected !== undefined && selected !== i
                    ? "scale(0.9)"
                    : "none",
                transition: "opacity 0.2s, transform 0.2s",
              }}
            >
              <CardMedia sx={{ display: "flex" }}>
                <img
                  src={picture}
                  alt=""
                  onClick={() =>
                    onSelectedChange?.(selected !== i ? i : undefined)
                  }
                />
              </CardMedia>
            </Card>
          </Grid>
        ))}
      </Grid>
    </div>
  );
}

const Upload: GameBoardComponent<typeof GuessPicture> = function ({
  G,
  moves,
  playerID,
}) {
  useEffect(() => {
    if (!G.players[playerID] || G.players[playerID].hand.length >= 6) return;
    Promise.all(
      Array.from({ length: 6 - G.players[playerID].hand.length }).map(() =>
        fetch(`https://picsum.photos/512/512`).then((res) => res.url)
      )
    ).then((pictures) => {
      moves.uploadPictures(pictures);
    });
  }, [G, playerID, moves]);

  return (
    <Stack
      sx={{
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <CircularProgress />
    </Stack>
  );
};

const Pick: GameBoardComponent<typeof GuessPicture> = function ({
  G,
  moves,
  playerID,
}) {
  const [selected, setSelected] = useState<number | undefined>(undefined);
  const [description, setDescription] = useState("");

  return (
    <Container maxWidth="md" sx={{ paddingY: 2 }}>
      {playerID === G.currentPlayer ? (
        <Stack spacing={2}>
          <ImageGrid
            pictures={G.players[playerID].hand}
            selected={selected}
            onSelectedChange={setSelected}
          />
          <TextField
            variant="standard"
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            inputProps={{ maxLength: 100 }}
          />
          <Stack alignItems="center">
            <Button
              variant="outlined"
              disabled={selected === undefined}
              onClick={() =>
                moves.pickPicture(
                  G.players[playerID].hand[selected],
                  description
                )
              }
            >
              OK
            </Button>
          </Stack>
        </Stack>
      ) : (
        <ImageGrid pictures={G.players[playerID].hand} />
      )}
    </Container>
  );
};

const Confuse: GameBoardComponent<typeof GuessPicture> = function ({
  G,
  moves,
  playerID,
}) {
  const [selected, setSelected] = useState<number | undefined>(undefined);

  return playerID === G.currentPlayer ? (
    <Container maxWidth="md" sx={{ paddingY: 2 }}>
      <Stack alignItems="center">
        <img
          src={G.board.find((p) => p.playerID === G.currentPlayer).picture}
          alt=""
        />
        <Stack alignItems="center" sx={{ padding: 2 }}>
          {G.description || " "}
        </Stack>
      </Stack>
    </Container>
  ) : (
    <Container maxWidth="md" sx={{ paddingY: 2 }}>
      <ImageGrid
        pictures={G.players[playerID].hand}
        selected={selected}
        onSelectedChange={setSelected}
      />
      <Stack alignItems="center" sx={{ padding: 2 }}>
        {G.description || " "}
      </Stack>
      <Stack alignItems="center">
        <Button
          variant="outlined"
          disabled={selected === undefined}
          onClick={() =>
            moves.pickConfusingPicture(G.players[playerID].hand[selected])
          }
        >
          OK
        </Button>
      </Stack>
    </Container>
  );
};

const Guess: GameBoardComponent<typeof GuessPicture> = function ({
  G,
  moves,
  playerID,
}) {
  const [selected, setSelected] = useState<number | undefined>(undefined);

  return playerID === G.currentPlayer ? (
    <Container maxWidth="md" sx={{ paddingY: 2 }}>
      <ImageGrid pictures={G.board.map((p) => p.picture)} />
    </Container>
  ) : (
    <Container maxWidth="md" sx={{ paddingY: 2 }}>
      <ImageGrid
        pictures={G.board.map((p) => p.picture)}
        selected={selected}
        onSelectedChange={setSelected}
      />
      <Stack alignItems="center" sx={{ padding: 2 }}>
        {G.description || " "}
      </Stack>
      <Stack alignItems="center">
        <Button
          variant="outlined"
          disabled={
            selected === undefined ||
            G.currentPlayer === playerID ||
            G.board[selected].playerID === playerID ||
            G.players[playerID].guess !== undefined
          }
          onClick={() => moves.guess(selected)}
        >
          OK
        </Button>
      </Stack>
    </Container>
  );
};

const Reveal: GameBoardComponent<typeof GuessPicture> = function ({
  G,
  moves,
  playerID,
}) {
  return (
    <Container maxWidth="md" sx={{ paddingY: 2 }}>
      <ImageGrid
        pictures={G.board.map((p) => p.picture)}
        selected={G.board.findIndex((p) => p.playerID === G.currentPlayer)}
      />
      <Stack alignItems="center" sx={{ padding: 2 }}>
        {G.description || " "}
      </Stack>
      {playerID === G.currentPlayer && (
        <Stack alignItems="center">
          <Button
            variant="outlined"
            onClick={() => {
              moves.nextRound();
            }}
          >
            OK
          </Button>
        </Stack>
      )}
    </Container>
  );
};

const GameBoard: GameBoardComponent<typeof GuessPicture> = function ({
  G,
  moves,
  playerID,
}) {
  return (
    <Stack direction="row" height="100%">
      <Box sx={{ width: 60, flexShrink: 0 }}>
        {Object.entries(G.players).map(([id, player]) => (
          <Box
            key={id}
            sx={{
              padding: 1,
              backgroundColor: id === G.currentPlayer ? "lightgreen" : "white",
            }}
          >
            {id}: {player.score}
          </Box>
        ))}
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        {G.stage === "upload" ? (
          <Upload G={G} moves={moves} playerID={playerID} />
        ) : G.stage === "pick" ? (
          <Pick G={G} moves={moves} playerID={playerID} />
        ) : G.stage === "confuse" ? (
          <Confuse G={G} moves={moves} playerID={playerID} />
        ) : G.stage === "guess" ? (
          <Guess G={G} moves={moves} playerID={playerID} />
        ) : G.stage === "reveal" ? (
          <Reveal G={G} moves={moves} playerID={playerID} />
        ) : (
          G.stage
        )}
      </Box>
    </Stack>
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

  const theme = useMemo(() => {
    return createTheme({
      typography: {
        button: {
          textTransform: "none",
        },
      },
    });
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {socket && (
        <Client game={GuessPicture} board={GameBoard} socket={socket} />
      )}
    </ThemeProvider>
  );
}

export default GameApp;

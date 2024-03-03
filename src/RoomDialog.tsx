import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Avatar,
  Button,
  CircularProgress,
  Container,
  Grid,
  Stack,
} from "@mui/material";
import QRCode from "qrcode";

import { HistoryDialog } from "./HistoryDialog";
import { Lobby, useLobby } from "./lobby";
import { Settings, useRoomID } from "./StateProvider";
import { Add as AddIcon } from "@mui/icons-material";

function roomURL(roomID: string) {
  const params = new URLSearchParams({ r: roomID });
  const url = new URL(window.location.href);
  url.search = params.toString();
  return url.toString();
}

function GameContainer({ lobby, gameUrl }: { lobby: Lobby; gameUrl: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const server = lobby.createServer(iframeRef.current);
    return server.close;
  }, [lobby]);

  return (
    <iframe
      ref={iframeRef}
      style={{ width: "100%", height: "100%", border: "none" }}
      title="game-container"
      src={gameUrl}
    ></iframe>
  );
}

function RoomDialog({
  gameRef,
  open,
  onClose,
}: {
  gameRef?: React.MutableRefObject<Settings["installedGames"][number]>;
  open: boolean;
  onClose: () => void;
}) {
  const { lobby, lobbyState, playerID } = useLobby();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const roomID = useRoomID();
  const { t } = useTranslation();

  const me = lobbyState.matchData.find((p) => p.playerID === playerID);

  useEffect(() => {
    if (!open) return;
    if (!roomID) {
      lobby.createRoom();
      lobby.changeGame(gameRef.current);
    } else {
      lobby.joinMatch(roomID);
    }
    return lobby.close;
  }, [open, gameRef, lobby, roomID]);

  useEffect(() => {
    if (!canvasRef.current || !lobbyState.roomID) return;
    const url = roomURL(lobbyState.roomID);
    QRCode.toCanvas(canvasRef.current, url, { width: 256 });
  }, [lobbyState.roomID]);

  return (
    <HistoryDialog
      hash="room"
      title={lobbyState.roomID && `${t("Room")} ${lobbyState.roomID}`}
      open={open}
      onClose={onClose}
    >
      {lobbyState.runningMatch ? (
        <GameContainer lobby={lobby} gameUrl={lobbyState.game.url} />
      ) : !me ? (
        <Stack
          sx={{
            flexGrow: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
          spacing={2}
        >
          <CircularProgress />
        </Stack>
      ) : (
        <Container maxWidth="md" sx={{ height: "100%" }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <img
              src={lobbyState.game.icon}
              alt={lobbyState.game.name}
              width="64"
              height="64"
            />
            <div>{lobbyState.game.name}</div>
          </Stack>
          <Grid container sx={{ marginY: 4 }}>
            {lobbyState.matchData.map((p) => (
              <Grid key={p.playerID} item xs={4} md={2}>
                <Stack alignItems="center" spacing={1}>
                  <Avatar src={p.avatar} />
                  <div>{p.playerName}</div>
                </Stack>
              </Grid>
            ))}
            <Grid item xs={4} md={2}>
              <Stack alignItems="center" spacing={1}>
                <Avatar>
                  <AddIcon />
                </Avatar>
                <div>{t("Invite")}</div>
              </Stack>
            </Grid>
          </Grid>
          {lobbyState.hostID === me.playerID ? (
            <Stack alignItems="center" spacing={2}>
              <canvas ref={canvasRef} width={256} height={256}></canvas>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => {
                    navigator.clipboard &&
                      navigator.clipboard.writeText(roomURL(lobbyState.roomID));
                  }}
                >
                  {t("Invite")}
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={lobby.startGame}
                >
                  {t("Start")}
                </Button>
              </Stack>
            </Stack>
          ) : null}
        </Container>
      )}
    </HistoryDialog>
  );
}

export default RoomDialog;

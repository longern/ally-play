import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button, CircularProgress, Stack } from "@mui/material";
import QRCode from "qrcode";

import { HistoryDialog } from "./HistoryDialog";
import { Lobby, useLobby } from "./lobby";
import { Settings, useRoomID } from "./StateProvider";

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
    QRCode.toCanvas(canvasRef.current, roomURL(lobbyState.roomID));
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
      ) : (
        <Stack
          sx={{
            flexGrow: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
          spacing={2}
        >
          {!me ? (
            <CircularProgress />
          ) : lobbyState.hostID === me.playerID ? (
            <>
              <canvas ref={canvasRef}></canvas>
              <Button
                variant="outlined"
                onClick={() => {
                  navigator.clipboard.writeText(roomURL(lobbyState.roomID));
                }}
              >
                {t("Invite")}
              </Button>
              <Button variant="outlined" onClick={lobby.startGame}>
                {t("Start")}
              </Button>
            </>
          ) : (
            <Button
              variant="outlined"
              onClick={() => {
                lobby.setReady(!me.ready);
              }}
            >
              {me.ready ? t("Cancel ready") : t("Get ready")}
            </Button>
          )}
        </Stack>
      )}
    </HistoryDialog>
  );
}

export default RoomDialog;

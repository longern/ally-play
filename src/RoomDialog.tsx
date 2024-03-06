import React, { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  Stack,
  Tooltip,
} from "@mui/material";
import QRCode from "qrcode";

import { HistoryDialog } from "./HistoryDialog";
import { Lobby, useLobby } from "./lobby";
import { Settings, useRoomID, useSettings } from "./StateProvider";
import { Add as AddIcon, Help as HelpIcon } from "@mui/icons-material";

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

function useHelpText({ open, url }: { open: boolean; url: string }) {
  const [helpText, setHelpText] = React.useState<string | null>(null);
  const prevUrl = useRef(url);

  useEffect(() => {
    if (!open || prevUrl.current === url) return;
    setHelpText(null);
    fetch(`${new URL(url)}manifest.json`).then(async (res) => {
      if (res.ok) {
        const manifest = await res.json();
        prevUrl.current = url;
        setHelpText(manifest.description || "");
      }
    });
  }, [url, open]);

  return helpText;
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
  const settings = useSettings();
  const config = useMemo(
    () =>
      settings.turnServer ? { iceServers: [settings.turnServer] } : undefined,
    [settings]
  );
  const { lobby, lobbyState, playerID } = useLobby({
    playerName: settings.username,
    config,
  });
  const [showHelp, setShowHelp] = React.useState(false);
  const helpText = useHelpText({ open: showHelp, url: lobbyState.game?.url });
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
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{ "& > *": { flexShrink: 0 } }}
          >
            <img
              src={lobbyState.game.icon}
              alt={lobbyState.game.name}
              width="64"
              height="64"
              style={{ borderRadius: "8px" }}
            />
            <Box
              sx={{
                flexGrow: 1,
                flexShrink: 1,
                textWrap: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {lobbyState.game.name}
            </Box>
            <Tooltip
              describeChild
              title={
                helpText === null
                  ? t("Loading...")
                  : helpText || t("No help available")
              }
              onOpen={() => setShowHelp(true)}
              onClose={() => setShowHelp(false)}
            >
              <IconButton aria-label={t("Help")}>
                <HelpIcon />
              </IconButton>
            </Tooltip>
          </Stack>
          <Grid container sx={{ marginY: 4 }}>
            {lobbyState.matchData.map((p) => (
              <Grid key={p.playerID} item xs={4} md={2}>
                <Stack alignItems="center" spacing={1} paddingY={2}>
                  <Avatar src={p.avatar} />
                  <div>{p.playerName}</div>
                </Stack>
              </Grid>
            ))}
            <Grid item xs={4} md={2}>
              <Stack alignItems="center" spacing={1} paddingY={2}>
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

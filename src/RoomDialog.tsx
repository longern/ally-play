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
  TextField,
} from "@mui/material";
import {
  Add as AddIcon,
  ContentCopy as ContentCopyIcon,
  Help as HelpIcon,
  Share as ShareIcon,
  WifiOff as WifiOffIcon,
} from "@mui/icons-material";
import QRCode from "qrcode";

import { HistoryDialog } from "./HistoryDialog";
import { Lobby, useLobby } from "./lobby";
import { GameApp, useSetSettings, useSettings } from "./StateProvider";
import HelpTextDialog from "./HelpTextDialog";

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

function QRCodeCanvas({ text }: { text: string }) {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    QRCode.toDataURL(text, { width: 256 }).then((url) => {
      imageRef.current.src = url;
    });
  }, [text]);

  return <img ref={imageRef} width={256} height={256} alt="QR Code" />;
}

function RoomDialog({
  gameRef,
  roomID,
  open,
  onClose,
}: {
  gameRef?: React.MutableRefObject<GameApp>;
  roomID?: string;
  open: boolean;
  onClose: () => void;
}) {
  const settings = useSettings();
  const setSettings = useSetSettings();
  const config = useMemo(
    () =>
      settings.turnServer ? { iceServers: [settings.turnServer] } : undefined,
    [settings.turnServer]
  );
  const { lobby, lobbyState, playerID, isConnected } = useLobby({
    playerName: settings.username,
    config,
  });
  const [showHelp, setShowHelp] = React.useState(false);

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
    if (!lobbyState.game) return;
    setSettings((settings) => {
      const recentlyPlayed = settings.recentlyPlayed
        ? [...settings.recentlyPlayed]
        : [];
      const existingIndex = recentlyPlayed.findIndex(
        (g) => g.url === lobbyState.game.url
      );
      if (existingIndex !== -1)
        recentlyPlayed.unshift(recentlyPlayed.splice(existingIndex, 1)[0]);
      else {
        recentlyPlayed.unshift(lobbyState.game);
        recentlyPlayed.splice(6);
      }
      return { ...settings, recentlyPlayed };
    });
  }, [lobbyState.game, setSettings]);

  return (
    <HistoryDialog
      hash="room"
      title={
        lobbyState.roomID && (
          <span>
            {`${t("Room")} ${lobbyState.roomID}`}
            {!isConnected && <WifiOffIcon />}
          </span>
        )
      }
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
          <Box>{!isConnected ? t("Connecting...") : t("Joining room...")}</Box>
        </Stack>
      ) : (
        <Container maxWidth="md" sx={{ height: "100%", padding: 2 }}>
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
              style={{ borderRadius: "8px", backgroundColor: "white" }}
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
            <IconButton
              aria-label={t("Help")}
              onClick={() => setShowHelp(true)}
            >
              <HelpIcon />
            </IconButton>
            <HelpTextDialog
              open={showHelp}
              onClose={() => setShowHelp(false)}
              url={lobbyState.game?.url}
            />
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
              <QRCodeCanvas text={roomURL(lobbyState.roomID)} />
              <Stack spacing={2}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <TextField
                    size="small"
                    label={t("Room URL")}
                    value={roomURL(lobbyState.roomID)}
                    InputProps={{ readOnly: true }}
                    onFocus={(e) => e.target.select()}
                    fullWidth
                  />
                  <IconButton
                    aria-label={t("Copy")}
                    disabled={!navigator.clipboard}
                    onClick={() =>
                      navigator.clipboard.writeText(roomURL(lobbyState.roomID))
                    }
                  >
                    <ContentCopyIcon />
                  </IconButton>
                  {navigator.share && (
                    <IconButton
                      aria-label={t("Share")}
                      disabled={!navigator.share}
                      onClick={() => {
                        navigator.share({
                          text: t(
                            "We are playing {{gameName}}, click to join:",
                            { gameName: lobbyState.game.name }
                          ),
                          url: roomURL(lobbyState.roomID),
                        });
                      }}
                    >
                      <ShareIcon />
                    </IconButton>
                  )}
                </Box>
                <Button
                  variant="contained"
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

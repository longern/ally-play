import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, CircularProgress, Stack } from "@mui/material";
import Peer, { DataConnection } from "peerjs";
import QRCode from "qrcode";

import { HistoryDialog } from "./HistoryDialog";
import { useIsHost, useRoomID, useSetRoomID } from "./StateProvider";

function roomURL(roomID: string) {
  const params = new URLSearchParams({ r: roomID });
  const url = new URL(window.location.href);
  url.search = params.toString();
  return url.toString();
}

function GameContainer({ onClose }) {
  void onClose;

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    import("penpal").then(({ connectToChild }) => {
      connectToChild({
        iframe: iframeRef.current!,
      });
    });
  }, []);

  return (
    <iframe
      ref={iframeRef}
      style={{ width: "100%", height: "100%", border: "none" }}
      title="game-container"
      src="/sdxl-guess-picture/"
    ></iframe>
  );
}

function RoomDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [ready, setReady] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [roomID, setRoomID] = [useRoomID(), useSetRoomID()];
  const isHost = useIsHost();
  const { t } = useTranslation();

  const handleStartGame = useCallback(() => {
    setGameStarted(true);
    connections.forEach((connection) => {
      connection.send("start");
    });
  }, [connections]);

  useEffect(() => {
    if (!open || isHost) return;

    const peer = new Peer();
    peer.on("open", () => {
      setPeer(peer);
    });
    peer.connect(`ally-play-${roomID}`);

    return () => {
      peer.destroy();
      setPeer(null);
      setRoomID(undefined);
    };
  }, [isHost, open, roomID, setRoomID]);

  useEffect(() => {
    if (!open || !isHost) return;

    const id = Math.random().toFixed(6).slice(2);
    const peer = new Peer(`ally-play-${id}`);
    peer.on("open", () => {
      setPeer(peer);
      setRoomID(id);
    });
    peer.on("connection", (connection) => {
      setConnections((connections) => [...connections, connection]);
      connection.on("data", (data) => {
        if (data === "start") {
          setGameStarted(true);
        }
      });
    });

    return () => {
      peer.destroy();
      setPeer(null);
      setRoomID(undefined);
    };
  }, [isHost, open, setRoomID]);

  useEffect(() => {
    if (!canvasRef.current || !peer?.id) return;
    QRCode.toCanvas(canvasRef.current, roomURL(peer.id.slice(10)));
  }, [isHost, peer]);

  return (
    <HistoryDialog
      hash="room"
      title={roomID && `${t("Room")} ${roomID}`}
      open={open}
      onClose={onClose}
    >
      {gameStarted ? (
        <GameContainer onClose={() => setGameStarted(false)} />
      ) : (
        <Stack
          sx={{
            flexGrow: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
          spacing={2}
        >
          {peer === null ? (
            <CircularProgress />
          ) : isHost ? (
            <>
              <canvas ref={canvasRef}></canvas>
              <Button
                variant="outlined"
                onClick={() => {
                  navigator.clipboard.writeText(roomURL(roomID!));
                }}
              >
                {t("Invite")}
              </Button>
              <Button variant="outlined" onClick={handleStartGame}>
                {t("Start")}
              </Button>
            </>
          ) : (
            <Button
              variant="outlined"
              onClick={() => {
                setReady((ready) => !ready);
              }}
            >
              {ready ? t("Cancel ready") : t("Get ready")}
            </Button>
          )}
        </Stack>
      )}
    </HistoryDialog>
  );
}

export default RoomDialog;

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

function GameContainer({
  onClose,
  isHost,
  connections,
  playerID,
}: {
  onClose: () => void;
  isHost: boolean;
  connections: DataConnection[];
  playerID: string;
}) {
  void onClose;

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<string>) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = JSON.parse(event.data);

      if (data.type === "setup") {
        iframeRef.current!.contentWindow!.postMessage(
          JSON.stringify({
            type: "setup",
            playerID,
            ctx: {
              playOrder: isHost
                ? connections.map((_, i) => (i + 1).toString())
                : undefined,
              isHost,
              numPlayers: isHost ? connections.length + 1 : undefined,
            },
          }),
          new URL(iframeRef.current!.src).origin
        );
      } else if (isHost) {
        connections[parseInt(data.playerID) - 1].send(event.data);
      } else {
        data.playerID = playerID;
        connections[0].send(event.data);
      }
    };
    window.addEventListener("message", handleMessage);

    const handlers = isHost
      ? connections.map((connection, index) => {
          const handler = (data: string) => {
            const message = JSON.parse(data);
            message.playerID = (index + 1).toString();
            iframeRef.current!.contentWindow!.postMessage(
              JSON.stringify(message),
              new URL(iframeRef.current!.src).origin
            );
          };
          connection.on("data", handler);
          return handler;
        })
      : connections.map((connection) => {
          const handler = (data: string) => {
            iframeRef.current!.contentWindow!.postMessage(
              data,
              new URL(iframeRef.current!.src).origin
            );
          };
          connection.on("data", handler);
          return handler;
        });

    return () => {
      window.removeEventListener("message", handleMessage);
      handlers.forEach((handler, index) => {
        connections[index].off("data", handler);
      });
    };
  }, [isHost, connections, playerID]);

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
  const [playerID, setPlayerID] = useState<string | null>(isHost ? "0" : null);
  const { t } = useTranslation();

  const handleStartGame = useCallback(() => {
    setGameStarted(true);
    setPlayerID("0");
    connections.forEach((connection, index) => {
      connection.send({ type: "start", playerID: (index + 1).toString() });
    });
  }, [connections]);

  useEffect(() => {
    if (!open || isHost || !roomID) return;

    const peer = new Peer();
    peer.on("open", () => {
      const connection = peer.connect(`ally-play-${roomID}`);
      connection.on("open", () => {
        setConnections([connection]);
        connection.on("data", (data: any) => {
          if (data?.type === "start") {
            setPlayerID(data.playerID.toString());
            setGameStarted(true);
          }
        });
      });
      setPeer(peer);
    });

    return () => {
      peer.destroy();
      setPeer(null);
      setConnections([]);
    };
  }, [isHost, open, roomID]);

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
    });

    return () => {
      peer.destroy();
      setPeer(null);
      setConnections([]);
    };
  }, [isHost, open, setRoomID]);

  useEffect(() => {
    if (!canvasRef.current || !peer?.id) return;
    QRCode.toCanvas(canvasRef.current, roomURL(peer.id.slice(10)));
  }, [isHost, peer]);

  useEffect(() => {
    if (open) return;
    setGameStarted(false);
    setReady(false);
    setRoomID(undefined);
  }, [open, setRoomID]);

  return (
    <HistoryDialog
      hash="room"
      title={roomID && `${t("Room")} ${roomID}`}
      open={open}
      onClose={onClose}
    >
      {gameStarted ? (
        <GameContainer
          onClose={() => setGameStarted(false)}
          isHost={isHost}
          connections={connections}
          playerID={playerID}
        />
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

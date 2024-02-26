import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, CircularProgress, Stack } from "@mui/material";
import Peer from "peerjs";
import QRCode from "qrcode";

import { HistoryDialog } from "./HistoryDialog";
import { useIsHost, useRoomID, useSetRoomID } from "./StateProvider";

function RoomDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [ready, setReady] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [roomID, setRoomID] = [useRoomID(), useSetRoomID()];
  const isHost = useIsHost();
  const { t } = useTranslation();

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

    return () => {
      peer.destroy();
      setPeer(null);
      setRoomID(undefined);
    };
  }, [isHost, open, setRoomID]);

  useEffect(() => {
    if (!isHost || peer === null) return;
    const params = new URLSearchParams({ r: peer.id?.slice(10) });
    const url = new URL(window.location.href);
    url.search = params.toString();
    QRCode.toCanvas(canvasRef.current!, url.toString());
  }, [isHost, peer]);

  return (
    <HistoryDialog
      hash="room"
      title={roomID && `${t("Room")} ${roomID}`}
      open={open}
      onClose={onClose}
    >
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
            <Button variant="outlined">{t("Start")}</Button>
          </>
        ) : (
          <Button
            variant="outlined"
            onClick={() => {
              setReady((ready) => !ready);
            }}
          >
            {ready ? t("Ready") : t("Not ready")}
          </Button>
        )}
      </Stack>
    </HistoryDialog>
  );
}

export default RoomDialog;

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Avatar,
  Box,
  Dialog,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  styled,
} from "@mui/material";
import {
  Add as AddIcon,
  Close as CloseIcon,
  InstallMobile as InstallMobileIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";

import { useSetSettings, useSettings } from "./StateProvider";
import { HistoryModal } from "./HistoryDialog";

export function useHandleInstall() {
  const setSettings = useSetSettings();
  const { t } = useTranslation();

  return useCallback(async () => {
    const gameUrl = window.prompt(t("Enter the URL of the game to install"));
    if (!gameUrl) return;
    const normalizedUrl = gameUrl.replace(/\/?$/, "/");
    const response = await fetch(`${normalizedUrl}manifest.json`);
    const manifest = await response.json();
    if (!manifest.name) return;
    const icons: { src: string; sizes: string }[] = manifest.icons ?? [];
    const icon = icons.find((icon) => icon.sizes === "512x512")?.src;

    setSettings((settings) => {
      if (!settings) return settings;

      return {
        ...settings,
        installedGames: [
          ...(settings.installedGames ?? []),
          {
            name: manifest.name,
            url: normalizedUrl,
            icon: icon ? new URL(icon, normalizedUrl).toString() : undefined,
          },
        ],
      };
    });
  }, [setSettings, t]);
}

function VideoStream({
  onStream,
}: {
  onStream: (videoRef: React.RefObject<HTMLVideoElement>) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onStreamRef = useRef(onStream);

  useEffect(() => {
    onStreamRef.current = onStream;
  }, [onStream]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let mediaStream: MediaStream;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        video.srcObject = stream;
        mediaStream = stream;
      });
    function handleCanPlay() {
      onStreamRef.current(videoRef);
    }
    video.addEventListener("canplay", handleCanPlay);
    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      mediaStream && mediaStream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "black",
        objectFit: "cover",
      }}
    />
  );
}

function ScanDialog({
  resolve,
  open,
  onClose,
}: {
  resolve: (result: string) => void;
  open: boolean;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleStream = useCallback(
    (video: React.RefObject<HTMLVideoElement>) => {
      const detector = new (window as any).BarcodeDetector({
        formats: ["qr_code"],
      });
      const stream = video.current.srcObject as MediaStream;
      const interval = setInterval(async () => {
        if (!video.current || !stream.active) return clearInterval(interval);
        const barcodes = await detector.detect(video.current);
        if (barcodes.length === 0) return;
        resolve(barcodes[0].rawValue);
        onClose();
      }, 1000);
    },
    [resolve, onClose]
  );

  return (
    <HistoryModal hash="scan" open={open} onClose={onClose}>
      {(onClose) => (
        <Dialog open={open} onClose={onClose} fullScreen>
          <IconButton
            sx={{
              position: "absolute",
              top: 16,
              right: 16,
              zIndex: 1,
              color: "white",
            }}
            onClick={() => {
              onClose();
              const video = videoRef.current;
              if (!video) return;
              video.srcObject = null;
            }}
          >
            <CloseIcon />
          </IconButton>
          <VideoStream onStream={handleStream} />
        </Dialog>
      )}
    </HistoryModal>
  );
}

const StyledInput = styled("input")({
  maxWidth: "360px",
  height: "36px",
  margin: "12px",
  marginRight: 0,
  padding: "12px",
  borderRadius: "18px",
  backgroundColor: "rgba(128, 128, 128, 0.1)",
  border: "none",
  width: "100%",
  boxSizing: "border-box",
  fontSize: "1rem",
});

function Header({
  onSearch,
  onSettingsClick,
}: {
  onSearch: (search: string) => void;
  onSettingsClick: () => void;
}) {
  const settings = useSettings();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [search, setSearch] = useState("");

  const handleInstall = useHandleInstall();
  const { t } = useTranslation();

  const handleScanResult = useCallback((result: string) => {
    try {
      const url = new URL(result);
      if (
        url.origin === window.location.origin &&
        url.pathname === window.location.pathname &&
        url.searchParams.has("r") &&
        url.searchParams.get("r")?.match(/^[0-9]{6}$/)
      ) {
        window.location.href = result;
      }
    } catch (e) {
      window.alert(result);
    }
  }, []);

  const handleScanDialogClose = useCallback(() => {
    setScanDialogOpen(false);
  }, []);

  return (
    <Toolbar disableGutters sx={{ minHeight: 64, flexShrink: 0 }}>
      <Avatar sx={{ width: 40, height: 40, margin: 1 }}></Avatar>
      <Typography variant="h6" fontWeight="normal">
        {settings?.username}
      </Typography>
      <Box sx={{ flexGrow: 1 }} />
      <StyledInput
        placeholder="Room code/Game name/URL"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (!search) return;
            setSearch("");
            onSearch(search);
          }
        }}
      />
      <IconButton
        size="large"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-label={t("Menu")}
      >
        <AddIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        sx={{ "& .MuiMenuItem-root": { minHeight: 48, minWidth: 160 } }}
        MenuListProps={{ disablePadding: true }}
      >
        <MenuItem
          onClick={() => {
            setScanDialogOpen(true);
            setAnchorEl(null);
          }}
        >
          <ListItemIcon>
            <QrCodeScannerIcon />
          </ListItemIcon>
          <ListItemText primary={t("Scan")} />
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleInstall();
            setAnchorEl(null);
          }}
        >
          <ListItemIcon>
            <InstallMobileIcon />
          </ListItemIcon>
          <ListItemText primary={t("Install")} />
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onSettingsClick();
          }}
        >
          <ListItemIcon>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary={t("Settings")} />
        </MenuItem>
      </Menu>
      <ScanDialog
        resolve={handleScanResult}
        open={scanDialogOpen}
        onClose={handleScanDialogClose}
      />
    </Toolbar>
  );
}

export default Header;

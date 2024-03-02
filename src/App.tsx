import {
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Container,
  CssBaseline,
  Divider,
  GlobalStyles,
  Grid,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from "@mui/material";
import React, { Suspense, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  useSetIsHost,
  useSetRoomID,
  useSetSettings,
  useSettings,
} from "./StateProvider";
import { ErrorBoundary } from "react-error-boundary";

import { Settings } from "./StateProvider";
import {
  Add as AddIcon,
  InstallMobile as InstallMobileIcon,
  Launch as LaunchIcon,
  QrCodeScanner as QrCodeScannerIcon,
} from "@mui/icons-material";

const RoomDialog = React.lazy(() => import("./RoomDialog"));

const globalStyles = (
  <GlobalStyles
    styles={{
      html: {
        position: "relative",
        height: "calc(100% - env(keyboard-inset-height, 0px))",
        transition: "height 0.2s",
      },

      "body, #root": {
        height: "100%",
      },
    }}
  />
);

function useHandleInstall() {
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

function Header() {
  const settings = useSettings();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleInstall = useHandleInstall();
  const { t } = useTranslation();

  return (
    <Toolbar disableGutters sx={{ minHeight: 64, flexShrink: 0 }}>
      <Avatar sx={{ width: "48px", height: "48px", margin: 1 }}></Avatar>
      <Typography variant="h6" fontWeight="normal">
        {settings?.username}
      </Typography>
      <Box sx={{ flexGrow: 1 }} />
      <IconButton size="large" onClick={(e) => setAnchorEl(e.currentTarget)}>
        <AddIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => setAnchorEl(null)}>
          <ListItemIcon>
            <QrCodeScannerIcon />
          </ListItemIcon>
          <ListItemText primary={t("Scan")} />
        </MenuItem>
        <Divider component={"li"} variant="inset" />
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
      </Menu>
    </Toolbar>
  );
}

function Square({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ paddingTop: "100%", position: "relative" }}>
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function GameGrid({
  onCreateRoom,
}: {
  onCreateRoom: (initialGame: Settings["installedGames"][number]) => void;
}) {
  const [settings, setSettings] = [useSettings(), useSetSettings()];
  const handleInstall = useHandleInstall();

  const { t } = useTranslation();

  const installedGames = settings?.installedGames ?? [];

  return installedGames.length === 0 ? (
    <Stack
      spacing={2}
      sx={{
        minHeight: "360px",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Typography variant="h6" color="textSecondary">
        {t("No installed games")}
      </Typography>
      <Button variant="outlined" onClick={handleInstall}>
        {t("Install")}
      </Button>
    </Stack>
  ) : (
    <Grid container spacing={2}>
      {installedGames.map((game) => (
        <Grid item key={game.name} xs={6} md={3} lg={2}>
          <Card elevation={0}>
            <CardActionArea
              onClick={() => onCreateRoom(game)}
              onContextMenu={(event) => {
                event.preventDefault();
                const confirm = window.confirm(
                  t("Are you sure you want to uninstall this game?")
                );
                if (!confirm) return;
                setSettings((settings) => {
                  if (!settings) return settings;

                  return {
                    ...settings,
                    installedGames: settings.installedGames.filter(
                      (installedGame) => installedGame.url !== game.url
                    ),
                  };
                });
              }}
            >
              <Square>
                {game.icon ? (
                  <img
                    src={game.icon}
                    alt={game.name}
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : (
                  <LaunchIcon sx={{ fontSize: 72 }} />
                )}
              </Square>
              <CardContent>
                <Box textAlign="center">{game.name}</Box>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

function Main({
  onCreateRoom,
  onSearch,
}: {
  onCreateRoom: (initialGame: Settings["installedGames"][number]) => void;
  onSearch: (search: string) => void;
}) {
  const [search, setSearch] = React.useState("");

  const { t } = useTranslation();

  return (
    <Box sx={{ minHeight: 0, overflowY: "auto" }}>
      <Container sx={{ margin: "auto" }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ paddingY: 1, marginBottom: 1 }}
        >
          <TextField
            variant="filled"
            size="small"
            placeholder="Room code/Game name/URL"
            fullWidth
            hiddenLabel
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (!search) return;
                onSearch(search);
              }
            }}
          />
        </Stack>
        <Typography variant="h5" gutterBottom>
          {t("Create room")}
        </Typography>
        <GameGrid onCreateRoom={onCreateRoom} />
      </Container>
    </Box>
  );
}

function Fallback({ error }) {
  const { t } = useTranslation();
  return (
    <div role="alert">
      <pre style={{ color: "red", overflowWrap: "break-word" }}>
        {error.message}
      </pre>
      <Button onClick={() => window.location.reload()} variant="outlined">
        {t("Reload")}
      </Button>
    </div>
  );
}

function App() {
  const [roomDialogOpen, setRoomDialogOpen] = React.useState(false);
  const gameRef = React.useRef<Settings["installedGames"][number] | undefined>(
    undefined
  );
  const setRoomID = useSetRoomID();
  const setIsHost = useSetIsHost();

  const theme = useMemo(() => {
    return createTheme({
      typography: {
        button: {
          textTransform: "none",
        },
      },
    });
  }, []);

  const handleCreateRoom = useCallback(
    (game: Settings["installedGames"][number]) => {
      gameRef.current = game;
      setIsHost(true);
      setRoomDialogOpen(true);
    },
    [setIsHost]
  );

  const handleSearch = useCallback(
    (search: string) => {
      if (search.match(/^[0-9]{6}$/)) {
        setRoomID(search);
        setRoomDialogOpen(true);
      }
    },
    [setRoomID]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("r")) {
      setRoomID(params.get("r"));
      setRoomDialogOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    } else if (window.history.state !== null) {
      window.history.replaceState(null, "");
    }
  }, [setRoomID]);

  useEffect(() => {
    if ("virtualKeyboard" in window.navigator)
      (window.navigator as any).virtualKeyboard.overlaysContent = true;
  }, []);

  return (
    <ErrorBoundary FallbackComponent={Fallback}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {globalStyles}
        <Stack sx={{ height: "100%" }}>
          <Header />
          <Main onCreateRoom={handleCreateRoom} onSearch={handleSearch} />
        </Stack>
        <Suspense>
          <RoomDialog
            gameRef={gameRef}
            open={roomDialogOpen}
            onClose={() => {
              gameRef.current = undefined;
              setRoomDialogOpen(false);
            }}
          />
        </Suspense>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

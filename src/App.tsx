import {
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Container,
  CssBaseline,
  GlobalStyles,
  Grid,
  Stack,
  ThemeProvider,
  Toolbar,
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
import { Add, Launch } from "@mui/icons-material";

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

function Header() {
  const settings = useSettings();

  return (
    <Toolbar disableGutters sx={{ minHeight: 64, flexShrink: 0 }}>
      <Avatar sx={{ width: "48px", height: "48px", margin: 1 }}></Avatar>
      {settings?.username}
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

function Main({
  onCreateRoom,
}: {
  onCreateRoom: (initialGame: Settings["installedGames"][number]) => void;
}) {
  const [settings, setSettings] = [useSettings(), useSetSettings()];
  const { t } = useTranslation();

  const installedGames = settings?.installedGames ?? [];

  const handleInstall = useCallback(async () => {
    const gameUrl = window.prompt(t("Enter the URL of the game to install"));
    if (!gameUrl) return;
    const trimmedUrl = gameUrl.replace(/\/$/, "");
    const response = await fetch(`${trimmedUrl}/manifest.json`);
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
            url: trimmedUrl,
            icon,
          },
        ],
      };
    });
  }, [setSettings, t]);

  return (
    <Box sx={{ minHeight: 0, overflowY: "auto" }}>
      <Container sx={{ margin: "auto" }}>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3} lg={2}>
            <Card elevation={0}>
              <CardActionArea onClick={handleInstall}>
                <Square>
                  <Add sx={{ fontSize: 72 }} />
                </Square>
                <CardContent>
                  <Box textAlign="center">{t("Install")}</Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
          {installedGames.map((game) => (
            <Grid item key={game.name} xs={6} md={3} lg={2}>
              <Card elevation={0}>
                <CardActionArea
                  onClick={() => onCreateRoom(game)}
                  onContextMenu={() => {
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
                      <Launch sx={{ fontSize: 72 }} />
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

  const handleCreateRoom = useCallback(() => {
    setIsHost(true);
    setRoomDialogOpen(true);
  }, [setIsHost]);

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
          <Main onCreateRoom={handleCreateRoom} />
        </Stack>
        <Suspense>
          <RoomDialog
            open={roomDialogOpen}
            onClose={() => setRoomDialogOpen(false)}
          />
        </Suspense>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

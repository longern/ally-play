import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { ErrorBoundary } from "react-error-boundary";
import {
  Box,
  Button,
  Container,
  CssBaseline,
  GlobalStyles,
  Stack,
  ThemeProvider,
  Typography,
  createTheme,
  useMediaQuery,
} from "@mui/material";

import { GameApp, useSettings } from "./StateProvider";
import GameGrid, { RecentlyPlayed } from "./GameGrid";
import Header from "./Header";

const RoomDialog = React.lazy(() => import("./RoomDialog"));
const SettingsDialog = React.lazy(() => import("./SettingsDialog"));

const globalStyles = (
  <GlobalStyles
    styles={{
      html: {
        position: "relative",
        height: "calc(100% - env(keyboard-inset-height, 0px))",
        transition: "height 0.25s",
      },

      "body, #root": {
        height: "100%",
      },

      "div.MuiDialog-root": {
        bottom: "env(keyboard-inset-height, 0px)",
        transition: "bottom 0.25s",
      },
    }}
  />
);

function Main({
  onCreateRoom,
}: {
  onCreateRoom: (initialGame: GameApp) => void;
}) {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        flexGrow: 1,
        minHeight: 0,
        overflowY: "auto",
        backgroundColor: "rgba(0, 0, 0, 0.02)",
      }}
    >
      <Container maxWidth="md" sx={{ padding: 1 }}>
        <RecentlyPlayed onCreateRoom={onCreateRoom} />
        <Stack sx={{ marginTop: 2 }}>
          <Typography variant="h5" gutterBottom>
            {t("Create room")}
          </Typography>
          <GameGrid onCreateRoom={onCreateRoom} />
        </Stack>
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
  const [roomID, setRoomID] = useState<string | undefined>(undefined);
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const gameRef = useRef<GameApp | undefined>(undefined);
  const settings = useSettings();
  const preferDarkScheme = useMediaQuery("(prefers-color-scheme: dark)");

  const colorTheme = useMemo(() => {
    if (settings?.darkMode !== undefined) return settings.darkMode;
    return preferDarkScheme ? "dark" : "light";
  }, [settings?.darkMode, preferDarkScheme]);

  const theme = useMemo(() => {
    return createTheme({
      palette: { mode: colorTheme },
      typography: { button: { textTransform: "none" } },
    });
  }, [colorTheme]);

  const handleCreateRoom = useCallback((game: GameApp) => {
    gameRef.current = game;
    setRoomDialogOpen(true);
  }, []);

  const handleSearch = useCallback(
    (search: string) => {
      if (search.match(/^[0-9]{6}$/)) {
        setRoomID(search);
        setRoomDialogOpen(true);
      }
    },
    [setRoomID]
  );

  const handleRoomDialogClose = useCallback(() => {
    gameRef.current = undefined;
    setRoomDialogOpen(false);
    setRoomID(undefined);
  }, [setRoomID]);

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
          <Header
            onSettingsClick={() => setSettingsDialogOpen(true)}
            onSearch={handleSearch}
          />
          <Main onCreateRoom={handleCreateRoom} />
        </Stack>
        <Suspense>
          <RoomDialog
            gameRef={gameRef}
            roomID={roomID}
            open={roomDialogOpen}
            onClose={handleRoomDialogClose}
          />
        </Suspense>
        <Suspense>
          <SettingsDialog
            open={settingsDialogOpen}
            onClose={() => setSettingsDialogOpen(false)}
          />
        </Suspense>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

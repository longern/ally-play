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
  TextField,
  ThemeProvider,
  Typography,
  createTheme,
} from "@mui/material";

import { GameApp, useSetIsHost, useSetRoomID } from "./StateProvider";
import GameGrid from "./GameGrid";
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
  onSearch,
}: {
  onCreateRoom: (initialGame: GameApp) => void;
  onSearch: (search: string) => void;
}) {
  const [search, setSearch] = useState("");

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
      <Container maxWidth="md" sx={{ paddingX: 1 }}>
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
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const gameRef = useRef<GameApp | undefined>(undefined);
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
    (game: GameApp) => {
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
          <Header onSettingsClick={() => setSettingsDialogOpen(true)} />
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

import {
  Avatar,
  Button,
  Container,
  CssBaseline,
  GlobalStyles,
  Stack,
  ThemeProvider,
  Toolbar,
  createTheme,
} from "@mui/material";
import React, { Suspense, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSetIsHost, useSetRoomID } from "./StateProvider";
import { ErrorBoundary } from "react-error-boundary";

const RoomDialog = React.lazy(() => import("./RoomDialog"));

if ("virtualKeyboard" in window.navigator)
  (window.navigator as any).virtualKeyboard.overlaysContent = true;

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
  return (
    <Toolbar disableGutters>
      <Avatar sx={{ margin: 1 }}></Avatar>
      User
    </Toolbar>
  );
}

function Main({ onCreateRoom }: { onCreateRoom: () => void }) {
  const { t } = useTranslation();

  return (
    <Container
      sx={{
        flexGrow: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Stack spacing={2}>
        <Button onClick={onCreateRoom} variant="outlined">
          {t("Create room")}
        </Button>
      </Stack>
    </Container>
  );
}

function Fallback({ error }) {
  const { t } = useTranslation();
  return (
    <div role="alert">
      <pre style={{ color: "red" }}>{error.message}</pre>
      <Button onClick={() => window.location.reload()} variant="outlined">
        {t("Reload")}
      </Button>
    </div>
  );
}

function App() {
  const [createRoomDialogOpen, setCreateRoomDialogOpen] = React.useState(false);
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
    setCreateRoomDialogOpen(true);
  }, [setIsHost]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("r")) {
      setRoomID(params.get("r"));
      setCreateRoomDialogOpen(true);
      window.history.replaceState(null, "", "");
    } else if (window.history.state !== null) {
      window.history.replaceState(null, "");
    }
  }, [setRoomID]);

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
            open={createRoomDialogOpen}
            onClose={() => setCreateRoomDialogOpen(false)}
          />
        </Suspense>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

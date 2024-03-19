import React, { useCallback, useState } from "react";
import { HistoryDialog } from "./HistoryDialog";
import { useTranslation } from "react-i18next";
import {
  Card,
  Collapse,
  Container,
  DialogContent,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Switch,
  TextField,
  styled,
} from "@mui/material";
import {
  Check as CheckIcon,
  NavigateNext as NavigateNextIcon,
} from "@mui/icons-material";
import { Settings, useSetSettings, useSettings } from "./StateProvider";

function TurnServerForm({
  value,
  setValue,
}: {
  value?: Settings["turnServer"];
  setValue: React.Dispatch<React.SetStateAction<Settings["turnServer"]>>;
}) {
  const { t } = useTranslation();

  return (
    <List disablePadding sx={{ width: "100%" }}>
      <ListItem>
        <TextField
          variant="filled"
          size="small"
          label={t("Url")}
          fullWidth
          value={value?.urls ?? ""}
          onChange={(e) =>
            setValue((server) => ({
              ...server,
              urls: e.target.value,
            }))
          }
        />
      </ListItem>
      <ListItem>
        <TextField
          variant="filled"
          size="small"
          label={t("Username")}
          fullWidth
          value={value?.username ?? ""}
          onChange={(e) =>
            setValue((server) => ({
              ...server,
              username: e.target.value,
            }))
          }
        />
      </ListItem>
      <ListItem>
        <TextField
          type="password"
          variant="filled"
          size="small"
          label={t("Credential")}
          fullWidth
          value={value?.credential ?? ""}
          onChange={(e) =>
            setValue((server) => ({
              ...server,
              credential: e.target.value,
            }))
          }
        />
      </ListItem>
    </List>
  );
}

function NetworkDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [settings, setSettings] = [useSettings(), useSetSettings()];
  const [server, setServer] = React.useState(settings.turnServer);

  const { t } = useTranslation();

  return (
    <HistoryDialog
      hash="network"
      title={t("Network")}
      open={open}
      onClose={onClose}
      endAdornment={({ onClose }) => (
        <IconButton
          onClick={() => {
            setSettings((settings) => ({ ...settings, turnServer: server }));
            onClose();
          }}
        >
          <CheckIcon />
        </IconButton>
      )}
    >
      <Container maxWidth="md" sx={{ padding: 2 }}>
        <Card>
          <List>
            <ListItem>
              <ListItemText primary={t("TURN server")} />
              <Switch
                checked={server !== undefined}
                onChange={(e) =>
                  setServer(
                    e.target.checked ? ({} as typeof server) : undefined
                  )
                }
              />
            </ListItem>
            <Collapse in={server !== undefined} unmountOnExit>
              <TurnServerForm value={server} setValue={setServer} />
            </Collapse>
          </List>
        </Card>
      </Container>
    </HistoryDialog>
  );
}

const SparseList = styled(List)(() => ({
  padding: 0,
  "& .MuiListItemButton-root": { minHeight: 60 },
}));

function LanguageDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = [useSettings(), useSetSettings()];
  const [selectedLanguage, setSelectedLanguage] = useState(settings.language);

  const handleChangeLanguage = useCallback(() => {
    setSettings((settings) => ({ ...settings, language: selectedLanguage }));
    i18n.changeLanguage(selectedLanguage);
    onClose();
  }, [selectedLanguage, i18n, onClose, setSettings]);

  function getDisplayName(code: string, locale: string) {
    try {
      return new Intl.DisplayNames([locale], { type: "language" }).of(code);
    } catch (e) {
      return code;
    }
  }

  return (
    <HistoryDialog
      hash="language"
      title={t("Language")}
      open={open}
      onClose={onClose}
      endAdornment={({ onClose }) => (
        <IconButton
          aria-label={t("Save")}
          size="large"
          color="inherit"
          onClick={() => {
            handleChangeLanguage();
            onClose();
          }}
        >
          <CheckIcon />
        </IconButton>
      )}
    >
      <DialogContent>
        <Card elevation={0}>
          <SparseList>
            <ListItem disablePadding>
              <ListItemButton onClick={() => setSelectedLanguage(undefined)}>
                <ListItemText primary={t("System default")} />
                {selectedLanguage === undefined && (
                  <CheckIcon color="success" />
                )}
              </ListItemButton>
            </ListItem>
            {Object.keys(i18n.options.resources).map((language) => (
              <ListItem key={language} disablePadding>
                <ListItemButton onClick={() => setSelectedLanguage(language)}>
                  <ListItemText primary={getDisplayName(language, language)} />
                  {selectedLanguage === language && (
                    <CheckIcon color="success" />
                  )}
                </ListItemButton>
              </ListItem>
            ))}
          </SparseList>
        </Card>
      </DialogContent>
    </HistoryDialog>
  );
}

function DarkModeDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [settings, setSettings] = [useSettings(), useSetSettings()];
  const [darkMode, setDarkMode] = useState(settings.darkMode);

  const { t } = useTranslation();

  return (
    <HistoryDialog
      hash="dark-mode"
      title={t("Dark Mode")}
      open={open}
      onClose={onClose}
      endAdornment={({ onClose }) => (
        <IconButton
          size="large"
          color="inherit"
          aria-label={t("Save")}
          onClick={() => {
            setSettings((settings) => ({ ...settings, darkMode }));
            onClose();
          }}
        >
          <CheckIcon />
        </IconButton>
      )}
    >
      <DialogContent>
        <Card elevation={0}>
          <SparseList>
            <ListItem disablePadding>
              <ListItemButton onClick={() => setDarkMode(undefined)}>
                <ListItemText primary={t("System default")} />
                {darkMode === undefined && <CheckIcon color="success" />}
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => setDarkMode("light")}>
                <ListItemText primary={t("Light Mode")} />
                {darkMode === "light" && <CheckIcon color="success" />}
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => setDarkMode("dark")}>
                <ListItemText primary={t("Dark Mode")} />
                {darkMode === "dark" && <CheckIcon color="success" />}
              </ListItemButton>
            </ListItem>
          </SparseList>
        </Card>
      </DialogContent>
    </HistoryDialog>
  );
}

function GeneralContent() {
  const [languageOpen, setLanguageOpen] = useState(false);
  const [darkModeOpen, setDarkModeOpen] = useState(false);

  const settings = useSettings();
  const { t, i18n } = useTranslation();

  function getDisplayName(code: string, locale: string) {
    try {
      return new Intl.DisplayNames([locale], { type: "language" }).of(code);
    } catch (e) {
      return code;
    }
  }

  const handleLanguageClose = useCallback(() => {
    setLanguageOpen(false);
  }, []);

  const handleDarkModeClose = useCallback(() => {
    setDarkModeOpen(false);
  }, []);

  return (
    <>
      <Card elevation={0}>
        <SparseList>
          <ListItem disablePadding>
            <ListItemButton onClick={() => setLanguageOpen(true)}>
              <ListItemText
                primary={t("Language")}
                secondary={
                  settings.language === undefined
                    ? t("System default")
                    : getDisplayName(settings.language, i18n.language)
                }
              />
              <NavigateNextIcon />
            </ListItemButton>
          </ListItem>
          <Divider component="li" />
          <ListItem disablePadding>
            <ListItemButton onClick={() => setDarkModeOpen(true)}>
              <ListItemText
                primary={t("Dark Mode")}
                secondary={
                  settings?.darkMode === undefined
                    ? t("System default")
                    : settings.darkMode === "light"
                    ? t("Light Mode")
                    : t("Dark Mode")
                }
              />
              <NavigateNextIcon />
            </ListItemButton>
          </ListItem>
        </SparseList>
      </Card>
      <LanguageDialog open={languageOpen} onClose={handleLanguageClose} />
      <DarkModeDialog open={darkModeOpen} onClose={handleDarkModeClose} />
    </>
  );
}

function GeneralDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <HistoryDialog
      hash="general"
      title="General"
      open={open}
      onClose={onClose}
      endAdornment={({ onClose }) => (
        <IconButton size="large" color="inherit" onClick={onClose}>
          <CheckIcon />
        </IconButton>
      )}
    >
      <Container maxWidth="md" sx={{ padding: 2 }}>
        <GeneralContent />
      </Container>
    </HistoryDialog>
  );
}

function SettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [generalOpen, setGeneralOpen] = React.useState(false);
  const [networkOpen, setNetworkOpen] = React.useState(false);

  const { t } = useTranslation();

  return (
    <HistoryDialog
      hash="settings"
      title={t("Settings")}
      open={open}
      onClose={onClose}
    >
      <Container maxWidth="md" sx={{ padding: 2 }}>
        <Card>
          <List
            disablePadding
            sx={{ "& .MuiListItemButton-root": { minHeight: 60 } }}
          >
            <ListItem disablePadding>
              <ListItemButton>
                <ListItemText primary={t("Account")} />
                <NavigateNextIcon />
              </ListItemButton>
            </ListItem>
            <Divider component="li" />
            <ListItem disablePadding>
              <ListItemButton onClick={() => setGeneralOpen(true)}>
                <ListItemText primary={t("General")} />
                <NavigateNextIcon />
              </ListItemButton>
            </ListItem>
            <Divider component="li" />
            <ListItem disablePadding>
              <ListItemButton onClick={() => setNetworkOpen(true)}>
                <ListItemText primary={t("Network")} />
                <NavigateNextIcon />
              </ListItemButton>
            </ListItem>
          </List>
        </Card>
      </Container>
      <NetworkDialog open={networkOpen} onClose={() => setNetworkOpen(false)} />
      <GeneralDialog open={generalOpen} onClose={() => setGeneralOpen(false)} />
    </HistoryDialog>
  );
}

export default SettingsDialog;

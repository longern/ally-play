import React from "react";
import { HistoryDialog } from "./HistoryDialog";
import { useTranslation } from "react-i18next";
import {
  Card,
  Collapse,
  Container,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Switch,
  TextField,
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

function SettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
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
              <ListItemButton onClick={() => setNetworkOpen(true)}>
                <ListItemText primary={t("Network")} />
                <NavigateNextIcon />
              </ListItemButton>
            </ListItem>
          </List>
        </Card>
      </Container>
      <NetworkDialog open={networkOpen} onClose={() => setNetworkOpen(false)} />
    </HistoryDialog>
  );
}

export default SettingsDialog;

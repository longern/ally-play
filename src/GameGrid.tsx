import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import { Launch as LaunchIcon } from "@mui/icons-material";

import { useSetSettings, useSettings } from "./StateProvider";
import { Settings } from "./StateProvider";

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
  const [contextMenu, setContextMenu] = useState<{
    item: Settings["installedGames"][number];
    mouseX: number;
    mouseY: number;
  } | null>(null);

  const { t } = useTranslation();

  const installedGames = settings?.installedGames ?? [];

  const handleContextMenu =
    (item: Settings["installedGames"][number]) =>
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      setContextMenu(
        contextMenu === null
          ? {
              item,
              mouseX: event.clientX,
              mouseY: event.clientY,
            }
          : null
      );
    };

  const deleteItem = () => {
    setContextMenu(null);
    const confirm = window.confirm(
      t(`Are you sure you want to uninstall ${contextMenu.item.name}?`)
    );
    if (!confirm) return;
    setSettings((settings) => {
      if (!settings) return settings;

      return {
        ...settings,
        installedGames: settings.installedGames.filter(
          (installedGame) => installedGame.url !== contextMenu.item.url
        ),
      };
    });
  };

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
    </Stack>
  ) : (
    <Grid container spacing={2}>
      {installedGames.map((game) => (
        <Grid item key={game.url} xs={6} md={3} lg={2}>
          <Card elevation={0}>
            <CardActionArea
              onClick={() => onCreateRoom(game)}
              onContextMenu={handleContextMenu(game)}
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

      <Menu
        open={contextMenu !== null}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu != null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={deleteItem}>Delete</MenuItem>
      </Menu>
    </Grid>
  );
}

export default GameGrid;

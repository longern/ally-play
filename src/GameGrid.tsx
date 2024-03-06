import React from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Grid,
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
    </Stack>
  ) : (
    <Grid container spacing={2}>
      {installedGames.map((game) => (
        <Grid item key={game.url} xs={6} md={3} lg={2}>
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

export default GameGrid;

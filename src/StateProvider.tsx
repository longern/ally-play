import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type GameApp = {
  name: string;
  url: string;
  icon?: string;
};

export type Settings = {
  avatar: string;
  darkMode?: "light" | "dark";
  language?: string;
  username: string;
  recentlyPlayed: GameApp[];
  installedGames: GameApp[];
  turnServer:
    | {
        urls: string;
        username: string;
        credential: string;
      }
    | undefined;
};

function useSettingsState() {
  const [settings, setSettings] = useState<Settings>(null);

  useEffect(() => {
    const settingsValue = localStorage.getItem("allyPlaySettings") ?? "{}";
    const settings = JSON.parse(settingsValue) as Settings;
    if (!settings.username) {
      settings.username = window.prompt("Enter your username");
      if (!settings.username) window.close();
    }
    setSettings(settings);
  }, []);

  useEffect(() => {
    if (settings === null) return;
    localStorage.setItem("allyPlaySettings", JSON.stringify(settings));
  }, [settings]);

  return [settings, setSettings] as const;
}

type GlobalState = {
  settings: Settings;
};

type SetGlobalState = {
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
};

const StateContext = createContext<GlobalState | null>(null);
const SetStateContext = createContext<SetGlobalState | null>(null);

export function StateProvider({ children }) {
  const [settings, setSettings] = useSettingsState();

  const setState = useMemo(() => ({ setSettings }), [setSettings]);

  return (
    <StateContext.Provider value={{ settings }}>
      <SetStateContext.Provider value={setState}>
        {children}
      </SetStateContext.Provider>
    </StateContext.Provider>
  );
}

export function useSettings() {
  const { settings } = useContext(StateContext);
  return settings;
}

export function useSetSettings() {
  const { setSettings } = useContext(SetStateContext);
  return setSettings;
}

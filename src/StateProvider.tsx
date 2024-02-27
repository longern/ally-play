import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Settings = {
  avatar: string;
  language: string;
  username: string;
  installedGames: {
    name: string;
    url: string;
    icon?: string;
  }[];
};

function useSettingsState() {
  const [settings, setSettings] = useState<Settings>(null);

  useEffect(() => {
    const settingsValue = localStorage.getItem("settings") ?? "{}";
    const settings = JSON.parse(settingsValue) as Settings;
    if (!settings.username) {
      settings.username = window.prompt("Enter your username");
      if (!settings.username) window.close();
    }
    setSettings(settings);
  }, []);

  useEffect(() => {
    if (settings === null) return;
    localStorage.setItem("settings", JSON.stringify(settings));
  }, [settings]);

  return [settings, setSettings] as const;
}

function useRoomIDState() {
  const [roomID, setRoomID] = useState<string | null>(null);

  return [roomID, setRoomID] as const;
}

type GlobalState = {
  settings: Settings;
  roomID: string | undefined;
  isHost: boolean;
};

type SetGlobalState = {
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  setRoomID: React.Dispatch<React.SetStateAction<string | undefined>>;
  setIsHost: React.Dispatch<React.SetStateAction<boolean>>;
};

const StateContext = createContext<GlobalState | null>(null);
const SetStateContext = createContext<SetGlobalState | null>(null);

export function StateProvider({ children }) {
  const [settings, setSettings] = useSettingsState();
  const [roomID, setRoomID] = useRoomIDState();
  const [isHost, setIsHost] = useState(false);

  const setState = useMemo(
    () => ({
      setSettings,
      setRoomID,
      setIsHost,
    }),
    [setSettings, setRoomID, setIsHost]
  );

  return (
    <StateContext.Provider value={{ settings, roomID, isHost }}>
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

export function useRoomID() {
  const { roomID } = useContext(StateContext);
  return roomID;
}

export function useSetRoomID() {
  const { setRoomID } = useContext(SetStateContext);
  return setRoomID;
}

export function useIsHost() {
  const { isHost } = useContext(StateContext);
  return isHost;
}

export function useSetIsHost() {
  const { setIsHost } = useContext(SetStateContext);
  return setIsHost;
}

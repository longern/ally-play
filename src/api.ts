export type API = {
  sendAction: (action: string) => Promise<void>;
  requestSync: () => Promise<void>;
};

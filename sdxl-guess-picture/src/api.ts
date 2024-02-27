export type API = {
  sendAction: (action: string, ...args: any[]) => Promise<void>;
  requestSync: () => Promise<void>;
};

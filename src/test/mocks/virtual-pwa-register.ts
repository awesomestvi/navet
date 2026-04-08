type RegisterSWOptions = {
  immediate?: boolean;
  onOfflineReady?: () => void;
  onNeedRefresh?: () => void;
};

export function registerSW(_options?: RegisterSWOptions) {
  return async (_reloadPage?: boolean) => {};
}

import { useAuthStore } from '@/app/stores/auth-store';
import { useConfigStore } from '@/app/stores/config-store';
import { useEditModeStore } from '@/app/stores/edit-mode-store';
import { useErrorStore } from '@/app/stores/error-store';
import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import { useNavigationStore } from '@/app/stores/navigation-store';
import { useSearchStore } from '@/app/stores/search-store';
import { useSettingsStore } from '@/app/stores/settings-store';
import { useThemeStore } from '@/app/stores/theme-store';

function resetStore<T>(store: {
  getInitialState: () => T;
  setState: (state: T, replace: true) => unknown;
}) {
  store.setState(store.getInitialState(), true);
}

export async function resetAppStores() {
  localStorage.clear();
  sessionStorage.clear();

  resetStore(useAuthStore);
  resetStore(useConfigStore);
  resetStore(useEditModeStore);
  resetStore(useErrorStore);
  resetStore(homeAssistantStore);
  resetStore(useNavigationStore);
  resetStore(useSearchStore);
  resetStore(useSettingsStore);
  resetStore(useThemeStore);

  await Promise.all(
    [useEditModeStore, useNavigationStore, useSettingsStore, useThemeStore].map((store) =>
      store.persist.rehydrate()
    )
  );
}

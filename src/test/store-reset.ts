import { authSessionManager } from '@/app/infrastructure/home-assistant/auth/auth-session-manager';
import { homeyService } from '@/app/services/homey.service';
import { useEditModeStore } from '@/app/stores/edit-mode-store';
import { useErrorStore } from '@/app/stores/error-store';
import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import { integrationStore } from '@/app/stores/integration-store';
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
  authSessionManager.replaceSession(null);

  resetStore(useEditModeStore);
  resetStore(useErrorStore);
  resetStore(homeAssistantStore);
  resetStore(integrationStore);
  homeyService.setClient(null);
  homeyService.resetSnapshot();
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

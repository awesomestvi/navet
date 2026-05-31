import { useHabitStore } from '@navet/app/features/habits/habit-store';
import { authSessionManager } from '@navet/app/infrastructure/home-assistant/auth/auth-session-manager';
import { homeyService } from '@navet/app/services/homey.service';
import { useEditModeStore } from '@navet/app/stores/edit-mode-store';
import { useErrorStore } from '@navet/app/stores/error-store';
import { homeAssistantStore } from '@navet/app/stores/home-assistant-store';
import { integrationStore } from '@navet/app/stores/integration-store';
import { useNavigationStore } from '@navet/app/stores/navigation-store';
import { useSearchStore } from '@navet/app/stores/search-store';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { useThemeStore } from '@navet/app/stores/theme-store';

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
  resetStore(useHabitStore);
  resetStore(homeAssistantStore);
  resetStore(integrationStore);
  homeyService.setClient(null);
  homeyService.resetSnapshot();
  resetStore(useNavigationStore);
  resetStore(useSearchStore);
  resetStore(useSettingsStore);
  resetStore(useThemeStore);

  await Promise.all(
    [useEditModeStore, useHabitStore, useNavigationStore, useSettingsStore, useThemeStore].map(
      (store) => store.persist.rehydrate()
    )
  );
}

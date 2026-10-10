import {
  getHomeAssistantConnection,
  getHomeAssistantPanelHass,
} from './homeassistant-service-bridge';

function sourceIdentity() {
  const panel = getHomeAssistantPanelHass() as { connection?: unknown; callWS?: unknown } | null;
  return panel ? (panel.connection ?? panel.callWS) : getHomeAssistantConnection();
}

/** Keep a delayed module load from routing an existing action into a replacement household. */
export function createSessionBoundFeatureLoader<Service>(load: () => Promise<Service>) {
  return async <Result>(
    action: (service: Service) => Result | Promise<Result>,
    getSource: () => unknown = sourceIdentity
  ): Promise<Result> => {
    const source = getSource();
    const service = await load();
    if (source !== getSource()) throw new Error('Home Assistant session changed');
    return action(service);
  };
}

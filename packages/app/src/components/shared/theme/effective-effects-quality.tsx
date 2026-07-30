import type { EffectsQuality } from '@navet/app/stores/settings-store';
import { createContext, type ReactNode, useContext } from 'react';

const EffectiveEffectsQualityContext = createContext<EffectsQuality | null>(null);

function getDocumentEffectsQuality(): EffectsQuality {
  if (typeof document === 'undefined') {
    return 'high';
  }

  const quality = document.documentElement.dataset.effectsQuality;
  return quality === 'low' || quality === 'medium' ? quality : 'high';
}

export function EffectiveEffectsQualityProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: EffectsQuality;
}) {
  return (
    <EffectiveEffectsQualityContext.Provider value={value}>
      {children}
    </EffectiveEffectsQualityContext.Provider>
  );
}

export function useEffectiveEffectsQuality(): EffectsQuality {
  return useContext(EffectiveEffectsQualityContext) ?? getDocumentEffectsQuality();
}

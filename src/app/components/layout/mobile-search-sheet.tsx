import * as Dialog from '@radix-ui/react-dialog';
import { Search, X } from 'lucide-react';
import { memo } from 'react';
import { DialogShell } from '@/app/components/primitives';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import { HeaderSearchInput } from './header-search-input';
import type { HeaderController } from './use-header-controller';

interface MobileSearchSheetProps {
  controller: HeaderController;
}

export const MobileSearchSheet = memo(function MobileSearchSheet({
  controller,
}: MobileSearchSheetProps) {
  const { theme, primaryColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const accentColor = getThemeColorValue(primaryColor);
  const {
    activeColorValue,
    closeMobileSearch,
    handleClearSearch,
    handleSearchChange,
    hoverBg,
    inputBg,
    isMobileSearchOpen,
    isSearchActive,
    isSearchFocused,
    mobileSearchInputRef,
    searchQuery,
    setIsSearchFocused,
    t,
    textPrimary,
    textSecondary,
  } = controller;

  return (
    <DialogShell
      isOpen={isMobileSearchOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeMobileSearch();
        }
      }}
      contentAriaDescribedBy="mobile-search-sheet-description"
      overlayClassName={`animate-in fade-in bg-black/45 backdrop-blur-[2px] md:hidden ${surface.dialogBackdrop}`}
      contentClassName={`fixed inset-x-0 bottom-0 z-50 mx-2 mb-2 overflow-hidden rounded-[30px] border p-0 shadow-2xl md:hidden ${surface.panel} ${surface.border} ${
        theme === 'glass' ? 'backdrop-blur-2xl' : ''
      }`}
      contentGlowClassName={
        theme === 'glass'
          ? 'pointer-events-none bg-[linear-gradient(180deg,rgba(255,255,255,0.14),transparent_42%)]'
          : undefined
      }
      contentStyle={{
        boxShadow:
          theme === 'glass'
            ? `0 -24px 64px -40px ${accentColor}66, 0 24px 48px -36px rgba(0,0,0,0.72)`
            : undefined,
      }}
    >
      <Dialog.Title className="sr-only">{t('sidebar.search')}</Dialog.Title>
      <Dialog.Description id="mobile-search-sheet-description" className="sr-only">
        {t('header.searchPlaceholder')}
      </Dialog.Description>

      <div className="relative px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.9rem)]">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" aria-hidden="true" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${accentColor}1c` }}
            >
              <Search className="h-[1.125rem] w-[1.125rem]" style={{ color: accentColor }} />
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${textPrimary}`}>{t('sidebar.search')}</p>
              <p className={`text-xs ${textSecondary}`}>{t('header.searchPlaceholder')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeMobileSearch}
            className={`flex h-9 w-9 items-center justify-center rounded-[20px] ${hoverBg} transition-colors`}
            aria-label={t('common.close')}
          >
            <X className={`h-[1.125rem] w-[1.125rem] ${textSecondary}`} />
          </button>
        </div>

        <HeaderSearchInput
          activeColorValue={activeColorValue}
          hoverBg={hoverBg}
          inputBg={inputBg}
          inputRef={mobileSearchInputRef}
          isSearchActive={isSearchActive}
          isSearchFocused={isSearchFocused}
          onBlur={() => setIsSearchFocused(false)}
          onChange={handleSearchChange}
          onClear={handleClearSearch}
          onFocus={() => setIsSearchFocused(true)}
          placeholder={t('header.searchPlaceholder')}
          query={searchQuery}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
        />
      </div>
    </DialogShell>
  );
});

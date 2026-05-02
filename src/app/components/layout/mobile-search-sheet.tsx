import { Search, X } from 'lucide-react';
import { memo } from 'react';
import { SheetSurface } from '@/app/components/primitives';
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
    <SheetSurface
      isOpen={isMobileSearchOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeMobileSearch();
        }
      }}
      title={t('sidebar.search')}
      description={t('header.searchPlaceholder')}
      accentColor={accentColor}
      overlayClassName={`animate-in fade-in bg-black/45 backdrop-blur-[2px] md:hidden ${surface.dialogBackdrop}`}
      contentClassName={`${surface.panel} ${surface.border}`}
      bodyClassName="px-4"
    >
      <div className="relative">
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
    </SheetSurface>
  );
});

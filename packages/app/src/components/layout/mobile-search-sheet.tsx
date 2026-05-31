import { SheetSurface, SheetSurfaceHeader } from '@navet/app/components/primitives';
import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@navet/app/hooks';
import { memo } from 'react';
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
      <div className="relative space-y-3">
        <SheetSurfaceHeader
          title={t('sidebar.search')}
          description={t('header.searchPlaceholder')}
          closeLabel={t('common.close')}
          onClose={closeMobileSearch}
        />

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

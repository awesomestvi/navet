import { Input } from '@navet/app/components/primitives';
import { useI18n } from '@navet/app/hooks';
import { Search, X } from 'lucide-react';
import type { KeyboardEventHandler, RefObject } from 'react';

interface HeaderSearchInputProps {
  activeColorValue: string;
  hoverBg: string;
  inputBg: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  isSearchActive: boolean;
  isSearchFocused: boolean;
  onBlur: () => void;
  onChange: (value: string) => void;
  onClear: () => void;
  onFocus: () => void;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement | HTMLButtonElement>;
  placeholder: string;
  query: string;
  textPrimary: string;
  textSecondary: string;
  widthClassName?: string;
}

export function HeaderSearchInput({
  activeColorValue,
  hoverBg,
  inputBg,
  inputRef,
  isSearchActive,
  isSearchFocused,
  onBlur,
  onChange,
  onClear,
  onFocus,
  onKeyDown,
  placeholder,
  query,
  textPrimary,
  textSecondary,
  widthClassName = 'w-full',
}: HeaderSearchInputProps) {
  const { t } = useI18n();

  return (
    <Input
      ref={inputRef}
      type="text"
      size="small"
      placeholder={placeholder}
      value={query}
      onChange={(event) => onChange(event.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      leading={<Search className={`h-4 w-4 ${textSecondary}`} />}
      trailing={
        isSearchActive ? (
          <button
            type="button"
            onClick={onClear}
            onKeyDown={onKeyDown}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded ${hoverBg} transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current`}
            aria-label={t('header.clearSearch')}
          >
            <X className={`h-4 w-4 ${textSecondary}`} />
          </button>
        ) : null
      }
      inputClassName={`${inputBg} ${widthClassName} ${textPrimary} ${isSearchActive ? 'pr-14' : ''}`}
      containerClassName="relative"
      style={{
        borderColor: isSearchFocused ? activeColorValue : undefined,
        boxShadow: isSearchFocused ? `0 0 0 2px ${activeColorValue}22` : undefined,
        caretColor: activeColorValue,
      }}
    />
  );
}

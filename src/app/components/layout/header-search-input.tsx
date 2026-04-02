import { Search, X } from 'lucide-react';
import type { RefObject } from 'react';
import { TextField } from '@/app/components/primitives';

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
  placeholder,
  query,
  textPrimary,
  textSecondary,
  widthClassName = 'w-full',
}: HeaderSearchInputProps) {
  return (
    <TextField
      ref={inputRef}
      type="text"
      placeholder={placeholder}
      value={query}
      onChange={(event) => onChange(event.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      leading={<Search className={`h-4 w-4 ${textSecondary}`} />}
      trailing={
        isSearchActive ? (
          <button
            type="button"
            onClick={onClear}
            className={`rounded p-0.5 ${hoverBg} transition-colors`}
            aria-label="Clear search"
          >
            <X className={`h-4 w-4 ${textSecondary}`} />
          </button>
        ) : null
      }
      inputClassName={`${inputBg} ${widthClassName} ${textPrimary}`}
      containerClassName="relative"
      style={{
        borderColor: isSearchFocused ? activeColorValue : undefined,
        boxShadow: isSearchFocused ? `0 0 0 2px ${activeColorValue}22` : undefined,
        caretColor: activeColorValue,
      }}
    />
  );
}

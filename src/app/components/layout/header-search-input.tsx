import { Search, X } from 'lucide-react';
import type { RefObject } from 'react';

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
    <div className="relative">
      <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${textSecondary}`} />
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        className={`${inputBg} ${widthClassName} rounded-[22px] border py-2 pl-10 pr-10 text-sm ${textPrimary} focus:outline-none`}
        style={{
          borderColor: isSearchFocused ? activeColorValue : undefined,
          boxShadow: isSearchFocused ? `0 0 0 2px ${activeColorValue}22` : undefined,
          caretColor: activeColorValue,
        }}
      />
      {isSearchActive ? (
        <button
          type="button"
          onClick={onClear}
          className={`absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 ${hoverBg} transition-colors`}
        >
          <X className={`h-4 w-4 ${textSecondary}`} />
        </button>
      ) : null}
    </div>
  );
}

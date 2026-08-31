import homeAssistantLogo from '@navet/app/assets/providers/home-assistant.svg';
import { InteractivePill } from '@navet/app/components/primitives/interactive-pill';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@navet/app/components/ui/dropdown-menu';
import { getPublicAssetUrl } from '@navet/app/utils/public-assets';
import { ChevronDown } from 'lucide-react';

export type AssistMode = 'home_assistant' | 'navet_ai';

interface AssistAssistantSwitcherProps {
  value: AssistMode;
  ariaLabel: string;
  homeAssistantLabel: string;
  navetAiLabel: string;
  disabled?: boolean;
  onChange: (value: AssistMode) => void;
}

const navetLogo = getPublicAssetUrl('logo.svg');

export function AssistAssistantSwitcher({
  value,
  ariaLabel,
  homeAssistantLabel,
  navetAiLabel,
  disabled = false,
  onChange,
}: AssistAssistantSwitcherProps) {
  const options = [
    {
      value: 'home_assistant' as const,
      label: homeAssistantLabel,
      logo: homeAssistantLogo,
    },
    { value: 'navet_ai' as const, label: navetAiLabel, logo: navetLogo },
  ];
  const selected =
    value === 'navet_ai'
      ? { value: 'navet_ai' as const, label: navetAiLabel, logo: navetLogo }
      : {
          value: 'home_assistant' as const,
          label: homeAssistantLabel,
          logo: homeAssistantLogo,
        };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <InteractivePill
          aria-label={`${ariaLabel}: ${selected.label}`}
          title={selected.label}
          disabled={disabled}
          size="compact"
          intent="action"
          variant="ghost"
          className="h-9 w-9 shrink-0 gap-0.5 px-0.5"
        >
          <img
            alt=""
            aria-hidden="true"
            data-assistant-logo={selected.value}
            src={selected.logo}
            className="size-4 shrink-0 object-contain"
          />
          <ChevronDown aria-hidden="true" className="size-3 shrink-0 opacity-70" />
        </InteractivePill>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="w-40">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(nextValue) => {
            if (nextValue === 'home_assistant' || nextValue === 'navet_ai') onChange(nextValue);
          }}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              <img
                alt=""
                aria-hidden="true"
                data-assistant-logo={option.value}
                src={option.logo}
                className="size-5 shrink-0 object-contain"
              />
              <span>{option.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

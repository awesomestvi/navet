import { InteractivePill } from '@navet/app/components/primitives/interactive-pill';
import { useI18n } from '@navet/app/hooks';

interface OnOffPillToggleProps {
  ariaLabel: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function OnOffPillToggle({ ariaLabel, value, onChange }: OnOffPillToggleProps) {
  const { t } = useI18n();
  const options = [
    { value: true, label: t('common.on') },
    { value: false, label: t('common.off') },
  ];

  return (
    <fieldset className="w-fit">
      <legend className="sr-only">{ariaLabel}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = value === option.value;
          return (
            <InteractivePill
              key={option.label}
              active={isActive}
              size="small"
              onClick={() => onChange(option.value)}
              aria-pressed={isActive}
            >
              {option.label}
            </InteractivePill>
          );
        })}
      </div>
    </fieldset>
  );
}

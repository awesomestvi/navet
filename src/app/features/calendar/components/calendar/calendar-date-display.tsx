interface CalendarDateDisplayProps {
  textPrimary: string;
  textSecondary: string;
  weekdayLabel: string;
  monthLabel: string;
  dayNumber: number;
  temperatureLabel: string;
}

export function CalendarDateDisplay({
  textPrimary,
  textSecondary,
  weekdayLabel,
  monthLabel,
  dayNumber,
  temperatureLabel,
}: CalendarDateDisplayProps) {
  return (
    <div className="flex w-[72px] flex-shrink-0 flex-col items-center py-1 text-center">
      <div className={`text-xs font-medium uppercase tracking-[0.22em] ${textSecondary}`}>
        {weekdayLabel}
      </div>
      <div className={`mt-1 text-4xl font-semibold leading-none ${textPrimary}`}>{dayNumber}</div>
      <div className={`mt-2 text-xs font-medium uppercase tracking-[0.28em] ${textSecondary}`}>
        {monthLabel}
      </div>
      <div className={`mt-3 text-xs font-medium ${textSecondary}`}>{temperatureLabel}</div>
    </div>
  );
}

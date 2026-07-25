import { FieldBlock } from '@navet/app/components/patterns';
import { Button, Input, Radio } from '@navet/app/components/primitives';
import {
  getThemeFocusRingClassName,
  getThemeSurfaceTokens,
  navetIconSizeTokens,
  navetRadiusTokens,
  navetTypographyTokens,
} from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import { Search } from 'lucide-react';
import { useDeferredValue, useId, useMemo } from 'react';
import { RoomOperationDialogFrame } from './room-operation-dialog-frame';

export interface RoomTargetDialogCandidate {
  id: string;
  name: string;
  groupName?: string;
  summary?: string;
}

export interface RoomTargetDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  searchLabel: string;
  searchPlaceholder?: string;
  targetLabel: string;
  resultSummary?: string;
  emptyTitle: string;
  emptyDescription: string;
  candidates: readonly RoomTargetDialogCandidate[];
  query: string;
  onQueryChange: (query: string) => void;
  selectedTargetId: string | null;
  onTargetChange: (roomId: string) => void;
  cancelLabel: string;
  confirmLabel: string;
  onConfirm: () => void;
  isConfirming?: boolean;
}

export function RoomTargetDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  searchLabel,
  searchPlaceholder,
  targetLabel,
  resultSummary,
  emptyTitle,
  emptyDescription,
  candidates,
  query,
  onQueryChange,
  selectedTargetId,
  onTargetChange,
  cancelLabel,
  confirmLabel,
  onConfirm,
  isConfirming = false,
}: RoomTargetDialogProps) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const searchId = useId();
  const radioName = useId();
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLocaleLowerCase();
  const filteredCandidates = useMemo(() => {
    if (!normalizedQuery) {
      return candidates;
    }

    return candidates.filter((candidate) =>
      [candidate.name, candidate.groupName, candidate.summary]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
    );
  }, [candidates, normalizedQuery]);
  const isConfirmDisabled =
    isConfirming ||
    selectedTargetId === null ||
    !filteredCandidates.some((candidate) => candidate.id === selectedTargetId);

  return (
    <RoomOperationDialogFrame
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      maxWidth="md"
      onSubmit={() => {
        if (!isConfirmDisabled) {
          onConfirm();
        }
      }}
      footer={
        <>
          <Button
            variant="ghost"
            className="min-h-11"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
          >
            {cancelLabel}
          </Button>
          <Button
            type="submit"
            className="min-h-11"
            loading={isConfirming}
            disabled={isConfirmDisabled}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <FieldBlock label={searchLabel} htmlFor={searchId}>
          <Input
            id={searchId}
            type="search"
            name="room-target-search"
            autoComplete="off"
            spellCheck={false}
            value={query}
            placeholder={searchPlaceholder}
            onChange={(event) => onQueryChange(event.currentTarget.value)}
            leading={<Search aria-hidden="true" className={navetIconSizeTokens.sm} />}
            inputClassName="min-h-11"
          />
        </FieldBlock>

        <fieldset>
          <div className="flex items-end justify-between gap-4">
            <legend className={cn(navetTypographyTokens.label, surface.textPrimary)}>
              {targetLabel}
            </legend>
            {resultSummary ? (
              <p className={cn(navetTypographyTokens.helper, surface.textMuted)}>{resultSummary}</p>
            ) : null}
          </div>

          {filteredCandidates.length > 0 ? (
            <div
              className={cn(
                'mt-3 max-h-[22rem] divide-y overflow-y-auto overscroll-contain border',
                navetRadiusTokens.panelInset,
                surface.border,
                surface.divider
              )}
            >
              {filteredCandidates.map((candidate, index) => {
                const isSelected = selectedTargetId === candidate.id;
                const radioId = `${radioName}-${index}`;
                return (
                  <label
                    key={candidate.id}
                    htmlFor={radioId}
                    className={cn(
                      'flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3',
                      'transition-colors motion-reduce:transition-none',
                      surface.hoverBg,
                      isSelected ? surface.subtleBg : ''
                    )}
                  >
                    <Radio
                      id={radioId}
                      name={radioName}
                      value={candidate.id}
                      checked={isSelected}
                      onChange={() => onTargetChange(candidate.id)}
                      className={cn('shrink-0', getThemeFocusRingClassName(theme))}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block truncate',
                          navetTypographyTokens.control,
                          surface.textPrimary
                        )}
                      >
                        {candidate.name}
                      </span>
                      {candidate.groupName || candidate.summary ? (
                        <span
                          className={cn(
                            'mt-0.5 block',
                            navetTypographyTokens.helper,
                            surface.textSecondary
                          )}
                        >
                          {[candidate.groupName, candidate.summary].filter(Boolean).join(' · ')}
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <div
              className={cn(
                'mt-3 border px-5 py-8 text-center',
                navetRadiusTokens.panelInset,
                surface.border,
                surface.panelMuted
              )}
            >
              <p className={cn(navetTypographyTokens.control, surface.textPrimary)}>{emptyTitle}</p>
              <p className={cn('mt-1', navetTypographyTokens.body, surface.textSecondary)}>
                {emptyDescription}
              </p>
            </div>
          )}
        </fieldset>
      </div>
    </RoomOperationDialogFrame>
  );
}

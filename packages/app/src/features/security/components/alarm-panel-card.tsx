import {
  CardActionRow,
  CardDialogBody,
  CardDialogFooter,
  CardDialogHeader,
} from '@navet/app/components/patterns';
import {
  BaseCard,
  Button,
  customCardDialogShellProps,
  DialogShell,
  EntityCardHeaderIcon,
  Input,
  InteractivePill,
  MessageBar,
} from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { getCardShellSurfaceTokens } from '@navet/app/components/shared/theme/card-shell-surface-tokens';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@navet/app/components/ui/alert-dialog';
import { useTheme } from '@navet/app/hooks';
import { integrationSecurityFeatureService } from '@navet/app/services/integration-security-feature.service';
import type { NavetAlarmAction, NavetAlarmEntity } from '@navet/core/alarm-types';
import {
  BellRing,
  Home,
  Loader2,
  MoonStar,
  Plane,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldEllipsis,
  ShieldHalf,
  ShieldMinus,
  ShieldOff,
  ShieldQuestion,
  ShieldX,
  Unlock,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { getSecurityCardSurfaceTokens } from './security-card-surface-tokens';

interface SecurityPanelCardProps {
  alarms: NavetAlarmEntity[];
  size?: Extract<CardSize, 'medium' | 'large' | 'extra-large'>;
}

type PendingActionState = {
  action: NavetAlarmAction;
  alarmId: string;
} | null;

const ACTION_ORDER: NavetAlarmAction[] = [
  'arm_home',
  'arm_away',
  'arm_night',
  'arm_vacation',
  'arm_custom_bypass',
  'disarm',
  'trigger',
];

const STATE_PRIORITY: Record<NavetAlarmEntity['state'], number> = {
  triggered: 0,
  pending: 1,
  arming: 2,
  disarming: 3,
  armed_away: 4,
  armed_home: 5,
  armed_night: 6,
  armed_vacation: 7,
  armed_custom_bypass: 8,
  disarmed: 9,
  unavailable: 10,
  unknown: 11,
};

function compareAlarms(left: NavetAlarmEntity, right: NavetAlarmEntity) {
  const priorityDifference = STATE_PRIORITY[left.state] - STATE_PRIORITY[right.state];
  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  return left.name.localeCompare(right.name);
}

function getAlarmStateLabel(state: NavetAlarmEntity['state']) {
  switch (state) {
    case 'disarmed':
      return 'Disarmed';
    case 'armed_home':
      return 'Armed Home';
    case 'armed_away':
      return 'Armed Away';
    case 'armed_night':
      return 'Armed Night';
    case 'armed_vacation':
      return 'Armed Vacation';
    case 'armed_custom_bypass':
      return 'Custom Bypass';
    case 'arming':
      return 'Arming';
    case 'pending':
      return 'Pending';
    case 'disarming':
      return 'Disarming';
    case 'triggered':
      return 'Triggered';
    case 'unavailable':
      return 'Unavailable';
    default:
      return 'Unknown';
  }
}

function getAlarmStateTone(state: NavetAlarmEntity['state']) {
  switch (state) {
    case 'triggered':
      return 'red' as const;
    case 'pending':
    case 'disarming':
    case 'disarmed':
      return 'red' as const;
    case 'arming':
    case 'armed_away':
    case 'armed_home':
    case 'armed_night':
    case 'armed_vacation':
    case 'armed_custom_bypass':
      return 'green' as const;
    case 'unavailable':
    case 'unknown':
      return 'neutral' as const;
  }
}

function getEmergencyTriggerClassName(
  state: NavetAlarmEntity['state'],
  theme: ReturnType<typeof useTheme>['theme']
) {
  const tone = getAlarmStateTone(state);

  if (tone === 'green') {
    if (theme === 'light') {
      return 'border-emerald-300/80 bg-emerald-50/88 text-emerald-700 hover:bg-emerald-100/92';
    }

    if (theme === 'glass') {
      return 'border-emerald-300/22 bg-emerald-500/14 text-emerald-100 hover:bg-emerald-500/20';
    }

    return 'border-emerald-400/24 bg-emerald-900/34 text-emerald-100 hover:bg-emerald-900/46';
  }

  if (tone === 'neutral') {
    if (theme === 'light') {
      return 'border-slate-300/80 bg-slate-50/88 text-slate-700 hover:bg-slate-100/92';
    }

    if (theme === 'glass') {
      return 'border-white/18 bg-white/10 text-white/92 hover:bg-white/14';
    }

    return 'border-white/14 bg-white/8 text-white/92 hover:bg-white/12';
  }

  if (theme === 'light') {
    return 'border-red-300/80 bg-red-50/88 text-red-700 hover:bg-red-100/92';
  }

  if (theme === 'glass') {
    return 'border-red-300/22 bg-red-500/14 text-red-100 hover:bg-red-500/20';
  }

  return 'border-red-400/24 bg-red-900/34 text-red-100 hover:bg-red-900/46';
}

function isAlarmArmed(state: NavetAlarmEntity['state']) {
  return (
    state === 'armed_home' ||
    state === 'armed_away' ||
    state === 'armed_night' ||
    state === 'armed_vacation' ||
    state === 'armed_custom_bypass'
  );
}

function getAlarmSurfaceProps(
  state: NavetAlarmEntity['state'],
  theme: ReturnType<typeof useTheme>['theme'],
  colors: ReturnType<typeof useTheme>['colors']
) {
  const cardShell = getCardShellSurfaceTokens(theme);
  const securitySurface = getSecurityCardSurfaceTokens(theme);
  const lockColors = isAlarmArmed(state) ? colors.lock.locked : colors.lock.unlocked;

  return {
    frameClassName: `${cardShell.rootFrameClassName} bg-linear-to-br ${lockColors.gradient} ${lockColors.border} ${securitySurface.containerShadowClassName}`,
    overlay: (
      <>
        <div
          className={`absolute inset-0 bg-linear-to-b ${lockColors.glow} via-transparent to-transparent`}
        />
        <div className={`absolute inset-0 ${securitySurface.lockCardOverlay}`} />
      </>
    ),
    disableDefaultSheen: true,
  };
}

function getAlarmStateIcon(state: NavetAlarmEntity['state']) {
  switch (state) {
    case 'disarmed':
      return ShieldOff;
    case 'armed_home':
      return ShieldHalf;
    case 'armed_away':
      return ShieldCheck;
    case 'armed_night':
      return MoonStar;
    case 'armed_vacation':
      return Shield;
    case 'armed_custom_bypass':
      return ShieldEllipsis;
    case 'arming':
      return Loader2;
    case 'pending':
      return ShieldAlert;
    case 'disarming':
      return ShieldMinus;
    case 'triggered':
      return ShieldAlert;
    case 'unavailable':
      return ShieldX;
    default:
      return ShieldQuestion;
  }
}

function getActionLabel(action: NavetAlarmAction) {
  switch (action) {
    case 'arm_home':
      return 'Arm Home';
    case 'arm_away':
      return 'Arm Away';
    case 'arm_night':
      return 'Arm Night';
    case 'arm_vacation':
      return 'Arm Vacation';
    case 'arm_custom_bypass':
      return 'Custom Bypass';
    case 'disarm':
      return 'Disarm';
    case 'trigger':
      return 'Emergency Trigger';
  }
}

function getActionIcon(action: NavetAlarmAction) {
  switch (action) {
    case 'arm_home':
      return Home;
    case 'arm_away':
      return ShieldCheck;
    case 'arm_night':
      return MoonStar;
    case 'arm_vacation':
      return Plane;
    case 'arm_custom_bypass':
      return ShieldEllipsis;
    case 'disarm':
      return Unlock;
    case 'trigger':
      return BellRing;
  }
}

function isActionActiveForState(action: NavetAlarmAction, state: NavetAlarmEntity['state']) {
  switch (action) {
    case 'disarm':
      return state === 'disarmed';
    case 'arm_home':
      return state === 'armed_home';
    case 'arm_away':
      return state === 'armed_away';
    case 'arm_night':
      return state === 'armed_night';
    case 'arm_vacation':
      return state === 'armed_vacation';
    case 'arm_custom_bypass':
      return state === 'armed_custom_bypass';
    default:
      return false;
  }
}

function isAlarmUnavailable(alarm: NavetAlarmEntity) {
  return (
    alarm.availability === 'unavailable' ||
    alarm.state === 'unavailable' ||
    alarm.state === 'unknown'
  );
}

function shouldRequireCode(alarm: NavetAlarmEntity) {
  return alarm.codeFormat !== 'none' && alarm.requiresCode === true;
}

function getActionHandler(action: NavetAlarmAction) {
  switch (action) {
    case 'arm_home':
      return integrationSecurityFeatureService.armHome;
    case 'arm_away':
      return integrationSecurityFeatureService.armAway;
    case 'arm_night':
      return integrationSecurityFeatureService.armNight;
    case 'arm_vacation':
      return integrationSecurityFeatureService.armVacation;
    case 'arm_custom_bypass':
      return integrationSecurityFeatureService.armCustomBypass;
    case 'disarm':
      return integrationSecurityFeatureService.disarm;
    case 'trigger':
      return integrationSecurityFeatureService.trigger;
  }
}

function orderSupportedActions(actions: NavetAlarmAction[]) {
  return ACTION_ORDER.filter((action) => actions.includes(action));
}

export function SecurityPanelCard({ alarms, size = 'large' }: SecurityPanelCardProps) {
  const sortedAlarms = useMemo(() => [...alarms].sort(compareAlarms), [alarms]);
  const [selectedAlarmId, setSelectedAlarmId] = useState<string | null>(
    sortedAlarms[0]?.id ?? null
  );
  const [code, setCode] = useState('');
  const [draftAction, setDraftAction] = useState<NavetAlarmAction | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingActionState>(null);
  const [triggerAction, setTriggerAction] = useState<{ alarmId: string } | null>(null);
  const { theme, colors } = useTheme();
  const securitySurface = getSecurityCardSurfaceTokens(theme);

  useEffect(() => {
    if (!sortedAlarms.some((alarm) => alarm.id === selectedAlarmId)) {
      setSelectedAlarmId(sortedAlarms[0]?.id ?? null);
    }
  }, [selectedAlarmId, sortedAlarms]);

  const selectedAlarm = useMemo(
    () => sortedAlarms.find((alarm) => alarm.id === selectedAlarmId) ?? sortedAlarms[0] ?? null,
    [selectedAlarmId, sortedAlarms]
  );

  if (!selectedAlarm) {
    return null;
  }

  const supportedActions = orderSupportedActions(selectedAlarm.supportedActions);
  const unavailable = isAlarmUnavailable(selectedAlarm);
  const requiresCode = shouldRequireCode(selectedAlarm);
  const supportsCodeEntry = selectedAlarm.codeFormat !== 'none';
  const pendingForSelectedAlarm =
    pendingAction !== null && pendingAction.alarmId === selectedAlarm.id ? pendingAction : null;
  const AlarmIcon = getAlarmStateIcon(selectedAlarm.state);
  const cardSurface = getAlarmSurfaceProps(selectedAlarm.state, theme, colors);
  const codeDialogOpen = supportsCodeEntry && draftAction !== null;
  const themeSurface = getThemeSurfaceTokens(theme);
  const codeDialogShell = customCardDialogShellProps(
    themeSurface,
    {},
    {
      maxWidth: 'sm',
      padding: false,
      animate: true,
    }
  );

  const clearCode = () => {
    setCode('');
    setDraftAction(null);
  };

  const submitAction = async (action: NavetAlarmAction) => {
    if (unavailable || pendingForSelectedAlarm) {
      return;
    }

    if (requiresCode && code.trim().length === 0) {
      toast.error('Enter a code before sending this action.');
      return;
    }

    setPendingAction({ action, alarmId: selectedAlarm.id });

    try {
      await getActionHandler(action)(selectedAlarm.id, code.trim().length > 0 ? code : undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update the alarm.');
    } finally {
      clearCode();
      setPendingAction(null);
    }
  };

  const handleAction = async (action: NavetAlarmAction) => {
    if (action === 'trigger') {
      setTriggerAction({ alarmId: selectedAlarm.id });
      return;
    }

    if (supportsCodeEntry) {
      setDraftAction(action);
      setCode('');
      return;
    }

    await submitAction(action);
  };

  const handleConfirmedTrigger = () => {
    setTriggerAction(null);

    if (supportsCodeEntry) {
      setDraftAction('trigger');
      setCode('');
      return;
    }

    void submitAction('trigger');
  };

  const maskedCodeValue =
    selectedAlarm.codeFormat === 'number' ? '•'.repeat(code.length) || 'No code entered' : null;
  const selectorPillSize = size === 'extra-large' ? 'default' : 'small';
  const actionGridClassName = size === 'extra-large' ? 'grid-cols-2 xl:grid-cols-3' : 'grid-cols-2';
  const actionAwaitingCode = draftAction !== null ? getActionLabel(draftAction) : null;
  const isMedium = size === 'medium';
  const emergencyTriggerClassName = getEmergencyTriggerClassName(selectedAlarm.state, theme);
  const actionPillClassName =
    size === 'extra-large'
      ? 'min-h-20 gap-1.5 rounded-[22px] px-2.5 py-2.5'
      : 'min-h-18 gap-1 rounded-[20px] px-2.25 py-2.25';
  const mediumActionButtonClassName =
    'h-11 min-w-0 flex-1 flex-row items-center justify-start gap-2 rounded-full px-3 py-0 text-left';
  const actionIconWrapClassName =
    size === 'extra-large' ? 'h-10 w-10 rounded-full' : 'h-9 w-9 rounded-full';
  const actionIconClassName = size === 'extra-large' ? 'h-4.5 w-4.5' : 'h-4 w-4';
  const actionLabelClassName =
    size === 'extra-large' ? 'text-[13px] leading-tight' : 'text-xs leading-tight';
  const mediumActionLabelClassName = 'whitespace-normal break-words text-[12px] leading-tight';
  const numpadKeyClassName =
    size === 'extra-large'
      ? 'h-14 w-14 rounded-full justify-self-center p-0 text-sm'
      : 'h-12 w-12 rounded-full justify-self-center p-0 text-sm';
  const numpadDisplayClassName =
    size === 'extra-large'
      ? 'w-44 rounded-3xl px-4 py-3 text-sm'
      : 'w-40 rounded-3xl px-4 py-3 text-sm';
  const numpadButtonClassName =
    theme === 'light'
      ? 'border-gray-200/80 bg-white/92 text-slate-900 hover:bg-white'
      : theme === 'glass'
        ? 'border-white/18 bg-white/10 text-white hover:bg-white/14'
        : 'border-white/14 bg-white/8 text-white/92 hover:bg-white/12';
  const nonTriggerActions = supportedActions.filter((action) => action !== 'trigger');
  const mediumActionRows = isMedium
    ? nonTriggerActions.reduce<NavetAlarmAction[][]>((rows, action, index) => {
        if (index % 3 === 0) {
          rows.push([action]);
        } else {
          rows[rows.length - 1]?.push(action);
        }
        return rows;
      }, [])
    : [];

  const renderActionButton = (action: NavetAlarmAction, fullWidth = false) => {
    const isSelectedAction = isActionActiveForState(action, selectedAlarm.state);
    const isTriggeredDismissAction = action === 'disarm' && selectedAlarm.state === 'triggered';
    const isPendingAction = Boolean(pendingForSelectedAlarm);
    const isUnavailableAction = unavailable;
    const isDisabledAction = isUnavailableAction || isPendingAction || isSelectedAction;
    const isMediumRowButton = isMedium && fullWidth;
    const buttonBaseClassName = isMediumRowButton
      ? mediumActionButtonClassName
      : actionPillClassName;
    const iconWrapClassName = isMediumRowButton
      ? 'h-7 w-7 rounded-full shrink-0'
      : actionIconWrapClassName;
    const iconClassName = isMediumRowButton ? 'h-3.5 w-3.5' : actionIconClassName;
    const labelClassName = isMediumRowButton ? mediumActionLabelClassName : actionLabelClassName;
    const selectedActionClassName =
      action === 'disarm'
        ? 'border border-white/32 bg-black/22 text-white shadow-[0_16px_36px_-24px_rgba(0,0,0,0.55)] ring-1 ring-white/12'
        : 'border border-white/32 bg-black/22 text-white shadow-[0_16px_36px_-24px_rgba(0,0,0,0.55)] ring-1 ring-white/12';
    const idleActionClassName =
      action === 'disarm'
        ? 'border border-white/18 bg-white/10 text-white/88 hover:bg-white/16'
        : 'border border-white/18 bg-white/10 text-white/92 hover:bg-white/16';
    const selectedIconWrapClassName =
      action === 'disarm'
        ? 'border-white/18 bg-white/10 text-white'
        : 'border-white/18 bg-white/10 text-white';
    const idleIconWrapClassName =
      action === 'disarm'
        ? 'border-white/14 bg-white/14 text-white'
        : 'border-white/14 bg-white/14 text-white';

    return (
      <button
        type="button"
        key={action}
        aria-label={getActionLabel(action)}
        disabled={isDisabledAction}
        className={`group flex ${fullWidth ? 'flex-1' : 'w-full'} ${isMediumRowButton ? '' : 'flex-col items-center justify-center text-center'} transition-all duration-200 ${
          buttonBaseClassName
        } ${
          isUnavailableAction
            ? 'cursor-not-allowed opacity-50'
            : isPendingAction
              ? 'cursor-wait'
              : isSelectedAction
                ? 'cursor-not-allowed'
                : ''
        } ${
          isTriggeredDismissAction
            ? 'border border-white/18 bg-white/10 text-white hover:bg-white/16'
            : isSelectedAction
              ? selectedActionClassName
              : idleActionClassName
        }`}
        onClick={() => void handleAction(action)}
      >
        <span
          className={`flex items-center justify-center border ${iconWrapClassName} ${
            isTriggeredDismissAction
              ? 'border-white/14 bg-white/14 text-white'
              : isSelectedAction
                ? selectedIconWrapClassName
                : idleIconWrapClassName
          }`}
        >
          {pendingForSelectedAlarm?.action === action ? (
            <Loader2 className={`${iconClassName} animate-spin`} />
          ) : (
            (() => {
              const ActionIcon = getActionIcon(action);
              return <ActionIcon className={iconClassName} />;
            })()
          )}
        </span>
        <span className={`flex min-w-0 flex-1 items-center font-medium ${labelClassName}`}>
          {getActionLabel(action)}
        </span>
      </button>
    );
  };

  return (
    <>
      <BaseCard
        size={size}
        title={selectedAlarm.name}
        subtitle={getAlarmStateLabel(selectedAlarm.state)}
        headerLeading={
          <EntityCardHeaderIcon
            IconComponent={AlarmIcon}
            isActive
            size={size}
            tone={getAlarmStateTone(selectedAlarm.state)}
          />
        }
        headerTrailing={
          selectedAlarm.state === 'triggered' ? (
            <InteractivePill
              active
              intent="navigation"
              size="compact"
              icon={ShieldAlert}
              className={emergencyTriggerClassName}
              disabled
            >
              Alarm Triggered
            </InteractivePill>
          ) : supportedActions.includes('trigger') ? (
            <InteractivePill
              intent="action"
              size="compact"
              icon={BellRing}
              className={emergencyTriggerClassName}
              disabled={unavailable || Boolean(pendingForSelectedAlarm)}
              onClick={() => void handleAction('trigger')}
            >
              Emergency Trigger
            </InteractivePill>
          ) : undefined
        }
        tone={getAlarmStateTone(selectedAlarm.state)}
        frameClassName={cardSurface.frameClassName}
        overlay={cardSurface.overlay}
        disableDefaultSheen={cardSurface.disableDefaultSheen}
      >
        <div className="flex h-full flex-col gap-3">
          {sortedAlarms.length > 1 ? (
            <fieldset className="flex flex-wrap gap-2" aria-label="Alarm selector">
              {sortedAlarms.map((alarm) => (
                <InteractivePill
                  key={alarm.id}
                  active={alarm.id === selectedAlarm.id}
                  intent="navigation"
                  size={selectorPillSize}
                  onClick={() => {
                    setSelectedAlarmId(alarm.id);
                    clearCode();
                  }}
                >
                  {alarm.name}
                </InteractivePill>
              ))}
            </fieldset>
          ) : null}

          {selectedAlarm.changedBy ? (
            <div
              className={`flex flex-wrap gap-x-4 gap-y-1 text-sm ${securitySurface.secondaryTextClassName}`}
            >
              {selectedAlarm.changedBy ? <span>Changed by {selectedAlarm.changedBy}</span> : null}
            </div>
          ) : null}

          {unavailable ? (
            <MessageBar tone="warning" title="Alarm unavailable">
              This alarm is currently read-only. Navet cannot send arm or disarm actions until the
              provider reports it as available again.
            </MessageBar>
          ) : null}

          <div className="mt-auto flex flex-1 flex-col justify-end pt-2">
            {isMedium ? (
              <div className="flex w-full flex-col gap-2">
                {mediumActionRows.map((row, rowIndex) => (
                  <CardActionRow
                    key={`alarm-action-row-${rowIndex}`}
                    theme={theme}
                    size="medium"
                    leftContent={
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        {row.map((action) => renderActionButton(action, true))}
                      </div>
                    }
                  />
                ))}
              </div>
            ) : (
              <div className={`grid w-full gap-2 ${actionGridClassName}`}>
                {nonTriggerActions.map((action) => renderActionButton(action))}
              </div>
            )}
          </div>
        </div>
      </BaseCard>

      <DialogShell
        isOpen={codeDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            clearCode();
          }
        }}
        overlayClassName={themeSurface.dialogBackdrop}
        contentClassName={codeDialogShell.contentClassName}
        contentStyle={codeDialogShell.contentStyle}
        contentGlowClassName={codeDialogShell.contentGlowClassName}
        contentGlowStyle={codeDialogShell.contentGlowStyle}
        contentOverlayClassName={codeDialogShell.contentOverlayClassName}
        contentTitle={actionAwaitingCode ? `${actionAwaitingCode} code` : 'Alarm code'}
        contentDescription={`Enter the code for ${selectedAlarm.name} to continue.`}
      >
        <CardDialogBody>
          <CardDialogHeader
            title={actionAwaitingCode ? `${actionAwaitingCode} code` : 'Alarm code'}
            description={`Enter the code for ${selectedAlarm.name} to continue.`}
            showRoomSelector={false}
            editableTitle={false}
          />

          {selectedAlarm.codeFormat === 'text' ? (
            <div className="mx-auto w-full max-w-md">
              <Input
                type="password"
                autoComplete="off"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Enter alarm code"
                disabled={Boolean(pendingForSelectedAlarm) || unavailable}
              />
            </div>
          ) : (
            <div className="mx-auto w-full max-w-md">
              <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                aria-label="Entered code"
                className={`${numpadDisplayClassName} mx-auto border border-white/10 bg-black/16 text-center ${securitySurface.primaryTextClassName}`}
              >
                {maskedCodeValue}
              </div>
              <div className="mt-4 mx-auto grid w-fit gap-2.5">
                {[
                  [null, '1', '2', '3', null],
                  [null, '4', '5', '6', null],
                  [null, '7', '8', '9', null],
                  [null, 'Cancel', '0', null, null],
                ].map((row, rowIndex) => (
                  <div
                    key={`dialog-row-${rowIndex}`}
                    className="grid grid-cols-5 justify-items-center gap-2.5"
                  >
                    {row.map((key, columnIndex) =>
                      key ? (
                        <Button
                          key={`${rowIndex}-${columnIndex}-${key}`}
                          variant="ghost"
                          size="small"
                          aria-label={key === 'Cancel' ? 'Clear code' : undefined}
                          className={`${numpadKeyClassName} ${numpadButtonClassName}`}
                          disabled={unavailable || Boolean(pendingForSelectedAlarm)}
                          onClick={() => {
                            if (key === 'Cancel') {
                              setCode('');
                              return;
                            }

                            setCode((current) => `${current}${key}`);
                          }}
                        >
                          {key === 'Cancel' ? <X className="h-4 w-4" /> : key}
                        </Button>
                      ) : (
                        <div
                          key={`${rowIndex}-${columnIndex}-spacer`}
                          className={numpadKeyClassName}
                        />
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <CardDialogFooter className="mt-5 flex items-center justify-end gap-2">
            <Button
              variant="soft"
              size="small"
              loading={pendingForSelectedAlarm?.action === draftAction}
              disabled={
                unavailable ||
                Boolean(pendingForSelectedAlarm) ||
                (requiresCode && code.trim().length === 0) ||
                draftAction === null
              }
              onClick={() => void (draftAction ? submitAction(draftAction) : undefined)}
            >
              {actionAwaitingCode ? `Confirm ${actionAwaitingCode}` : 'Confirm'}
            </Button>
          </CardDialogFooter>
        </CardDialogBody>
      </DialogShell>

      <AlertDialog
        open={triggerAction?.alarmId === selectedAlarm.id}
        onOpenChange={(open) => {
          if (!open) {
            setTriggerAction(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trigger this alarm remotely?</AlertDialogTitle>
            <AlertDialogDescription>
              This is an emergency action and should only be used when you intentionally want to
              trigger the alarm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedTrigger}>Trigger alarm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export const AlarmPanelCard = SecurityPanelCard;

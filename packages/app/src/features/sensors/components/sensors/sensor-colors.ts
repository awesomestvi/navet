import type { AccentColor, SensorColorScheme } from './sensor-types';

export const darkColorMap: Record<AccentColor, SensorColorScheme> = {
  teal: {
    gradient: 'from-teal-900/90 to-teal-950/95',
    border: 'border-teal-700/30',
    iconBg: 'bg-teal-500/20',
    iconColor: 'text-teal-400',
    accent: 'text-teal-400',
    glow: 'from-teal-500/10',
  },
  blue: {
    gradient: 'from-blue-900/90 to-blue-950/95',
    border: 'border-blue-700/30',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    accent: 'text-blue-400',
    glow: 'from-blue-500/10',
  },
  purple: {
    gradient: 'from-purple-900/90 to-purple-950/95',
    border: 'border-purple-700/30',
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
    accent: 'text-purple-400',
    glow: 'from-purple-500/10',
  },
  amber: {
    gradient: 'from-amber-900/90 to-amber-950/95',
    border: 'border-amber-700/30',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    accent: 'text-amber-400',
    glow: 'from-amber-500/10',
  },
  emerald: {
    gradient: 'from-emerald-900/90 to-emerald-950/95',
    border: 'border-emerald-700/30',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    accent: 'text-emerald-400',
    glow: 'from-emerald-500/10',
  },
};

export const lightColorMap: Record<AccentColor, SensorColorScheme> = {
  teal: {
    gradient: 'from-white to-teal-50/80',
    border: 'border-gray-200/80',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    accent: 'text-teal-700',
    glow: 'from-teal-50/40',
  },
  blue: {
    gradient: 'from-white to-blue-50/80',
    border: 'border-gray-200/80',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    accent: 'text-blue-700',
    glow: 'from-blue-50/40',
  },
  purple: {
    gradient: 'from-white to-purple-50/80',
    border: 'border-gray-200/80',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    accent: 'text-purple-700',
    glow: 'from-purple-50/40',
  },
  amber: {
    gradient: 'from-white to-amber-50/80',
    border: 'border-gray-200/80',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    accent: 'text-amber-700',
    glow: 'from-amber-50/40',
  },
  emerald: {
    gradient: 'from-white to-emerald-50/80',
    border: 'border-gray-200/80',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    accent: 'text-emerald-700',
    glow: 'from-emerald-50/40',
  },
};

export const AMBIENT_LAYERS = [
  {
    size: 78,
    left: '18%',
    top: '12%',
    opacity: '22',
    animation: 'navet-arrival-ambient-drift 18s ease-in-out infinite alternate',
  },
  {
    size: 58,
    left: '70%',
    top: '16%',
    opacity: '16',
    animation: 'navet-arrival-ambient-drift-reverse 22s ease-in-out infinite alternate',
  },
  {
    size: 68,
    left: '50%',
    top: '68%',
    opacity: '1a',
    animation: 'navet-arrival-ambient-drift 26s ease-in-out 1.8s infinite alternate',
  },
] as const;

export interface AmbientLayerConfig {
  size: number;
  left: string;
  top: string;
  opacity: string;
  animation: string;
}

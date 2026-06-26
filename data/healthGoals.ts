import type { HealthGoal } from '../types';
import { FootstepsIcon, MoonIcon, WaterDropIcon, LightBulbIcon } from '../components/IconComponents';

export const mockHealthGoals: HealthGoal[] = [
  {
    id: 1,
    title: 'Daily Steps',
    description: 'Aim for an active day.',
    target: 8000,
    currentProgress: 5240,
    unit: 'steps',
    icon: FootstepsIcon,
  },
  {
    id: 2,
    title: 'Hydration',
    description: 'Stay refreshed and hydrated.',
    target: 8,
    currentProgress: 6,
    unit: 'glasses',
    icon: WaterDropIcon,
  },
  {
    id: 3,
    title: 'Sleep Goal',
    description: 'Ensure restful nights.',
    target: 8,
    currentProgress: 7.5,
    unit: 'hours',
    icon: MoonIcon,
  },
  {
    id: 4,
    title: 'Mindful Minutes',
    description: 'Take time to recenter.',
    target: 10,
    currentProgress: 5,
    unit: 'minutes',
    icon: LightBulbIcon,
  }
];
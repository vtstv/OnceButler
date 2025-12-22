// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Time Utilities
// Licensed under MIT License

export type TimePeriod = 'night' | 'day' | 'evening';

export function getCurrentHour(): number {
  return new Date().getHours();
}

export function getTimePeriod(hour: number = getCurrentHour()): TimePeriod {
  if (hour >= 0 && hour < 6) return 'night';
  if (hour >= 6 && hour < 18) return 'day';
  return 'evening';
}

export function isNight(hour: number = getCurrentHour()): boolean {
  return hour >= 0 && hour < 6;
}

export function isDay(hour: number = getCurrentHour()): boolean {
  return hour >= 6 && hour < 18;
}

export function isEvening(hour: number = getCurrentHour()): boolean {
  return hour >= 18 && hour < 24;
}

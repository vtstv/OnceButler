// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Casino Types and Constants
// Licensed under MIT License

import { Locale } from '../../../utils/i18n.js';

export const CURRENCY_EMOJI = '🪙';
export const BET_PRESETS = [10, 50, 100, 500, 1000];

export interface GameSession {
  game: string;
  bet: number;
  choice?: string;
  target?: number;
  guildId: string;
  userId: string;
  locale: Locale;
}

export interface BlackjackGame {
  bet: number;
  playerCards: string[];
  dealerCards: string[];
  guildId: string;
  userId: string;
  locale: Locale;
}

export const gameSessions = new Map<string, GameSession>();
export const blackjackGames = new Map<string, BlackjackGame>();

export const SLOT_SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '🎰'];
export const SLOT_PAYOUTS: Record<string, number> = {
  '🍒': 2, '🍋': 3, '🍊': 4, '🍇': 5, '💎': 10, '7️⃣': 25, '🎰': 50,
};

export const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
export const ROULETTE_PAYOUTS: Record<string, number> = {
  red: 2, black: 2, green: 36, odd: 2, even: 2, low: 2, high: 2,
};

export const CARD_VALUES: Record<string, number> = {
  'A': 11, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 10, 'Q': 10, 'K': 10,
};
export const CARD_SUITS = ['♠️', '♥️', '♦️', '♣️'];
export const CARD_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function getDiceMultiplier(target: number): number {
  const odds: Record<number, number> = {
    2: 36, 3: 18, 4: 12, 5: 9, 6: 7.2, 7: 6,
    8: 7.2, 9: 9, 10: 12, 11: 18, 12: 36,
  };
  return odds[target] || 6;
}

export function getGameTitle(game: string): string {
  const titles: Record<string, string> = {
    coinflip: '🪙 Coinflip',
    slots: '🎰 Slot Machine',
    roulette: '🎡 Roulette',
    blackjack: '🃏 Blackjack',
    dice: '🎲 Dice',
  };
  return titles[game] || 'Casino Game';
}

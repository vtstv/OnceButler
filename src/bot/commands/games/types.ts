// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Games Types
// Licensed under MIT License

import { Locale } from '../../../utils/i18n.js';

export const CURRENCY_EMOJI = '🪙';

export interface BlackjackGame {
  bet: number;
  playerCards: string[];
  dealerCards: string[];
  guildId: string;
  userId: string;
  locale: Locale;
}

export const activeGames = new Map<string, BlackjackGame>();

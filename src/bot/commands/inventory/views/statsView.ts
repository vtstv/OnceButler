// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Stats View Builder
// Licensed under MIT License

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { t, Locale } from '../../../../utils/i18n.js';
import { getEquippedItems, getCombatStats } from '../../../../database/repositories/inventoryRepo.js';
import { ViewData, RARITY_EMOJI, TYPE_EMOJI, getStatPreview } from '../types.js';

export function buildStatsView(
  guildId: string,
  userId: string,
  locale: Locale
): ViewData {
  const equipped = getEquippedItems(guildId, userId);
  const stats = getCombatStats(guildId, userId);

  let description = '';
  
  if (equipped.length === 0) {
    description = t(locale, 'inventory.noEquipment');
  } else {
    description = equipped.map(item => {
      const emoji = RARITY_EMOJI[item.definition.rarity];
      const typeEmoji = TYPE_EMOJI[item.definition.type];
      return `${emoji} ${typeEmoji} **${item.definition.name}**\n   ${getStatPreview(item.definition)}`;
    }).join('\n\n');
  }

  const embed = new EmbedBuilder()
    .setTitle(`⚔️ Combat Stats`)
    .setDescription(description)
    .setColor(0xFF6B35)
    .addFields(
      { name: '⚔️ Total Attack', value: `+${stats.attackBonus}`, inline: true },
      { name: '🛡️ Total Defense', value: `+${stats.defenseBonus}`, inline: true },
      { name: '❤️ Total Health', value: `+${stats.healthBonus}`, inline: true },
      { name: '💥 Total Crit', value: `+${stats.critChanceBonus}%`, inline: true },
    )
    .setFooter({ text: t(locale, 'inventory.statsFooter') });

  const components: ActionRowBuilder<ButtonBuilder>[] = [];
  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('mode_inventory').setLabel(t(locale, 'inventory.viewInventoryBtn')).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('mode_shop').setLabel(t(locale, 'inventory.viewShopBtn')).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('mode_stats').setLabel(t(locale, 'inventory.viewStatsBtn')).setStyle(ButtonStyle.Primary).setDisabled(true),
    new ButtonBuilder().setCustomId('refresh').setLabel(t(locale, 'inventory.refreshBtn')).setStyle(ButtonStyle.Secondary),
  );
  components.push(navRow);

  return { embeds: [embed], components };
}

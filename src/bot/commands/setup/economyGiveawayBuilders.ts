// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Economy Settings Builder
// Licensed under MIT License

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import type { GuildSettings } from '../../../database/repositories/settingsRepo.js';
import type { SetupView } from './types.js';

export function buildEconomySettings(settings: GuildSettings): SetupView {
  const embed = new EmbedBuilder()
    .setTitle('💰 Economy Settings')
    .setDescription('Configure the economy system for your server.')
    .setColor(0xFFD700)
    .addFields(
      { name: '💰 Status', value: settings.enableEconomy ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: '🎁 Daily Reward', value: `${settings.economyDailyReward ?? 100} coins`, inline: true },
      { name: '💼 Work Reward', value: `${settings.economyWorkMin ?? 50}-${settings.economyWorkMax ?? 150} coins`, inline: true },
      { name: '⏱️ Work Cooldown', value: `${settings.economyWorkCooldown ?? 30} minutes`, inline: true },
      { name: '🏦 Bank Interest', value: `${((settings.economyBankInterest ?? 0.01) * 100).toFixed(1)}% per day`, inline: true },
      { name: '💸 Transfer Fee', value: `${((settings.economyTransferFee ?? 0) * 100).toFixed(0)}%`, inline: true },
    );

  const toggleButton = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_toggle_economy')
        .setLabel(settings.enableEconomy ? '💰 Disable Economy' : '💰 Enable Economy')
        .setStyle(settings.enableEconomy ? ButtonStyle.Danger : ButtonStyle.Success),
    );

  const dailyRewardSelect = new StringSelectMenuBuilder()
    .setCustomId('setup_economy_daily')
    .setPlaceholder('Daily Reward Amount')
    .setDisabled(!settings.enableEconomy)
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('50 coins').setValue('50').setDefault((settings.economyDailyReward ?? 100) === 50),
      new StringSelectMenuOptionBuilder().setLabel('100 coins').setValue('100').setDefault((settings.economyDailyReward ?? 100) === 100),
      new StringSelectMenuOptionBuilder().setLabel('200 coins').setValue('200').setDefault((settings.economyDailyReward ?? 100) === 200),
      new StringSelectMenuOptionBuilder().setLabel('500 coins').setValue('500').setDefault((settings.economyDailyReward ?? 100) === 500),
    );

  const workCooldownSelect = new StringSelectMenuBuilder()
    .setCustomId('setup_economy_work_cooldown')
    .setPlaceholder('Work Cooldown')
    .setDisabled(!settings.enableEconomy)
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('15 minutes').setValue('15').setDefault((settings.economyWorkCooldown ?? 30) === 15),
      new StringSelectMenuOptionBuilder().setLabel('30 minutes').setValue('30').setDefault((settings.economyWorkCooldown ?? 30) === 30),
      new StringSelectMenuOptionBuilder().setLabel('60 minutes').setValue('60').setDefault((settings.economyWorkCooldown ?? 30) === 60),
      new StringSelectMenuOptionBuilder().setLabel('2 hours').setValue('120').setDefault((settings.economyWorkCooldown ?? 30) === 120),
    );

  const backButton = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_cat_main')
        .setLabel('◀️ Back to Main')
        .setStyle(ButtonStyle.Secondary),
    );

  return {
    embeds: [embed],
    components: [
      toggleButton,
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(dailyRewardSelect),
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(workCooldownSelect),
      backButton,
    ],
  };
}

export function buildGiveawaySettings(settings: GuildSettings): SetupView {
  const embed = new EmbedBuilder()
    .setTitle('🎉 Giveaway Settings')
    .setDescription('Configure giveaways for your server.')
    .setColor(0xFF69B4)
    .addFields(
      { name: '🎉 Status', value: settings.enableGiveaways ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: '⏱️ Min Duration', value: `${settings.giveawayMinDuration ?? 5} minutes`, inline: true },
      { name: '⏱️ Max Duration', value: `${settings.giveawayMaxDuration ?? 10080} minutes`, inline: true },
      { name: '🏆 Max Winners', value: `${settings.giveawayMaxWinners ?? 10}`, inline: true },
      { name: '🔔 DM Winners', value: settings.giveawayDmWinners ? '✅ Yes' : '❌ No', inline: true },
    );

  const toggleButton = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_toggle_giveaways')
        .setLabel(settings.enableGiveaways ? '🎉 Disable Giveaways' : '🎉 Enable Giveaways')
        .setStyle(settings.enableGiveaways ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('setup_toggle_giveaway_dm')
        .setLabel(settings.giveawayDmWinners ? '🔔 Disable DM Winners' : '🔔 Enable DM Winners')
        .setStyle(settings.giveawayDmWinners ? ButtonStyle.Secondary : ButtonStyle.Primary)
        .setDisabled(!settings.enableGiveaways),
    );

  const maxWinnersSelect = new StringSelectMenuBuilder()
    .setCustomId('setup_giveaway_max_winners')
    .setPlaceholder('Max Winners per Giveaway')
    .setDisabled(!settings.enableGiveaways)
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('5 winners').setValue('5').setDefault((settings.giveawayMaxWinners ?? 10) === 5),
      new StringSelectMenuOptionBuilder().setLabel('10 winners').setValue('10').setDefault((settings.giveawayMaxWinners ?? 10) === 10),
      new StringSelectMenuOptionBuilder().setLabel('20 winners').setValue('20').setDefault((settings.giveawayMaxWinners ?? 10) === 20),
      new StringSelectMenuOptionBuilder().setLabel('50 winners').setValue('50').setDefault((settings.giveawayMaxWinners ?? 10) === 50),
    );

  const maxDurationSelect = new StringSelectMenuBuilder()
    .setCustomId('setup_giveaway_max_duration')
    .setPlaceholder('Max Duration')
    .setDisabled(!settings.enableGiveaways)
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('1 hour').setValue('60').setDefault((settings.giveawayMaxDuration ?? 10080) === 60),
      new StringSelectMenuOptionBuilder().setLabel('24 hours').setValue('1440').setDefault((settings.giveawayMaxDuration ?? 10080) === 1440),
      new StringSelectMenuOptionBuilder().setLabel('7 days').setValue('10080').setDefault((settings.giveawayMaxDuration ?? 10080) === 10080),
      new StringSelectMenuOptionBuilder().setLabel('30 days').setValue('43200').setDefault((settings.giveawayMaxDuration ?? 10080) === 43200),
    );

  const backButton = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_cat_main')
        .setLabel('◀️ Back to Main')
        .setStyle(ButtonStyle.Secondary),
    );

  return {
    embeds: [embed],
    components: [
      toggleButton,
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(maxWinnersSelect),
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(maxDurationSelect),
      backButton,
    ],
  };
}

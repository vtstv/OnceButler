// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Giveaway Command
// Licensed under MIT License

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  MessageFlags,
  PermissionFlagsBits,
  Client,
} from 'discord.js';
import {
  createGiveaway,
  getGiveawayByMessage,
  getActiveGiveaways,
  addParticipant,
  removeParticipant,
  getParticipantCount,
  isParticipant,
  selectWinners,
  endGiveaway,
  deleteGiveaway,
} from '../../database/repositories/giveawaysRepo.js';
import { getGuildSettings } from '../../database/repositories/settingsRepo.js';
import { t, Locale } from '../../utils/i18n.js';
import { getLocale, hasAdminPermission } from './utils.js';

export async function handleGiveaway(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    const locale = getLocale(interaction);
    await interaction.reply({ content: t(locale, 'giveaway.serverOnly'), flags: MessageFlags.Ephemeral });
    return;
  }

  const subcommand = interaction.options.getSubcommand();
  const locale = getLocale(interaction);

  switch (subcommand) {
    case 'start':
      await handleGiveawayStart(interaction, locale);
      break;
    case 'end':
      await handleGiveawayEnd(interaction, locale);
      break;
    case 'reroll':
      await handleGiveawayReroll(interaction, locale);
      break;
    case 'list':
      await handleGiveawayList(interaction, locale);
      break;
    case 'delete':
      await handleGiveawayDelete(interaction, locale);
      break;
  }
}

async function handleGiveawayStart(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  if (!hasAdminPermission(interaction)) {
    await interaction.reply({ content: t(locale, 'errors.adminOnly'), flags: MessageFlags.Ephemeral });
    return;
  }

  const prize = interaction.options.getString('prize', true);
  const durationChoice = interaction.options.getString('duration', true);
  const winnersChoice = interaction.options.getString('winners', true);
  const customDuration = interaction.options.getInteger('custom_duration');
  const customWinners = interaction.options.getInteger('custom_winners');
  const channel = interaction.options.getChannel('channel') ?? interaction.channel;

  const durationMinutes = durationChoice === 'custom' 
    ? (customDuration ?? 60) 
    : parseInt(durationChoice, 10);
  const winners = winnersChoice === 'custom' 
    ? (customWinners ?? 1) 
    : parseInt(winnersChoice, 10);

  if (!(channel instanceof TextChannel)) {
    await interaction.reply({ content: t(locale, 'giveaway.invalidChannel'), flags: MessageFlags.Ephemeral });
    return;
  }

  // Duration in minutes
  const durationMs = durationMinutes * 60 * 1000;
  if (durationMs <= 0) {
    await interaction.reply({ content: t(locale, 'giveaway.durationPositive'), flags: MessageFlags.Ephemeral });
    return;
  }

  const endsAt = new Date(Date.now() + durationMs);

  // Create giveaway embed
  const embed = createGiveawayEmbed(prize, endsAt, winners, interaction.user.id, 0, false, undefined, locale);
  const button = createGiveawayButton(false, locale);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const message = await channel.send({
      embeds: [embed],
      components: [button],
    });

    // Save to database
    const giveawayId = createGiveaway(
      interaction.guild!.id,
      channel.id,
      message.id,
      interaction.user.id,
      prize,
      winners,
      endsAt
    );

    await interaction.editReply({
      content: t(locale, 'giveaway.started', { 
        id: giveawayId.toString(), 
        channel: channel.toString(), 
        prize, 
        time: `<t:${Math.floor(endsAt.getTime() / 1000)}:R>` 
      }),
    });
  } catch (error) {
    console.error('[Giveaway] Error starting giveaway:', error);
    await interaction.editReply({ content: t(locale, 'giveaway.startFailed') });
  }
}

async function handleGiveawayEnd(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  if (!hasAdminPermission(interaction)) {
    await interaction.reply({ content: t(locale, 'errors.adminOnly'), flags: MessageFlags.Ephemeral });
    return;
  }

  const messageId = interaction.options.getString('message_id', true);
  const giveaway = getGiveawayByMessage(messageId);

  if (!giveaway) {
    await interaction.reply({ content: t(locale, 'giveaway.notFound'), flags: MessageFlags.Ephemeral });
    return;
  }

  if (giveaway.ended) {
    await interaction.reply({ content: t(locale, 'giveaway.alreadyEnded'), flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const winners = selectWinners(giveaway.id, giveaway.winnersCount);
    endGiveaway(giveaway.id, winners);

    await updateGiveawayMessage(interaction.guild!, giveaway, winners, locale);

    const winnersText = winners.length > 0 
      ? winners.map(id => `<@${id}>`).join(', ')
      : t(locale, 'giveaway.noParticipants');

    await interaction.editReply({
      content: t(locale, 'giveaway.endedResult', { winners: winnersText }),
    });
  } catch (error) {
    console.error('[Giveaway] Error ending giveaway:', error);
    await interaction.editReply({ content: t(locale, 'giveaway.endFailed') });
  }
}

async function handleGiveawayReroll(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  if (!hasAdminPermission(interaction)) {
    await interaction.reply({ content: t(locale, 'errors.adminOnly'), flags: MessageFlags.Ephemeral });
    return;
  }

  const messageId = interaction.options.getString('message_id', true);
  const giveaway = getGiveawayByMessage(messageId);

  if (!giveaway) {
    await interaction.reply({ content: t(locale, 'giveaway.notFound'), flags: MessageFlags.Ephemeral });
    return;
  }

  if (!giveaway.ended) {
    await interaction.reply({ content: t(locale, 'giveaway.notEnded'), flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const newWinners = selectWinners(giveaway.id, giveaway.winnersCount);
    endGiveaway(giveaway.id, newWinners);

    await updateGiveawayMessage(interaction.guild!, giveaway, newWinners, locale);

    const winnersText = newWinners.length > 0 
      ? newWinners.map(id => `<@${id}>`).join(', ')
      : t(locale, 'giveaway.noParticipants');

    await interaction.editReply({
      content: t(locale, 'giveaway.rerolled', { winners: winnersText }),
    });
  } catch (error) {
    console.error('[Giveaway] Error rerolling giveaway:', error);
    await interaction.editReply({ content: t(locale, 'giveaway.rerollFailed') });
  }
}

async function handleGiveawayList(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const giveaways = getActiveGiveaways(interaction.guild!.id);

  if (giveaways.length === 0) {
    await interaction.reply({ content: t(locale, 'giveaway.noActive'), flags: MessageFlags.Ephemeral });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'giveaway.activeTitle'))
    .setColor(0x5865F2)
    .setDescription(
      giveaways.map((g, i) => {
        const endsTimestamp = Math.floor(new Date(g.endsAt).getTime() / 1000);
        const participants = getParticipantCount(g.id);
        return `**${i + 1}.** ${g.prize}\n` +
               `   👥 ${participants} ${t(locale, 'giveaway.participants').toLowerCase()} | 🏆 ${g.winnersCount} ${t(locale, 'giveaway.winners').toLowerCase()}\n` +
               `   ⏰ ${t(locale, 'giveaway.endsAt')} <t:${endsTimestamp}:R> | [Jump](https://discord.com/channels/${g.guildId}/${g.channelId}/${g.messageId})`;
      }).join('\n\n')
    );

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleGiveawayDelete(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  if (!hasAdminPermission(interaction)) {
    await interaction.reply({ content: t(locale, 'errors.adminOnly'), flags: MessageFlags.Ephemeral });
    return;
  }

  const messageId = interaction.options.getString('message_id', true);
  const giveaway = getGiveawayByMessage(messageId);

  if (!giveaway) {
    await interaction.reply({ content: t(locale, 'giveaway.notFound'), flags: MessageFlags.Ephemeral });
    return;
  }

  deleteGiveaway(giveaway.id);

  // Try to delete the message
  try {
    const channel = interaction.guild!.channels.cache.get(giveaway.channelId) as TextChannel;
    const message = await channel?.messages.fetch(giveaway.messageId);
    await message?.delete();
  } catch {
    // Message may already be deleted
  }

  await interaction.reply({ content: t(locale, 'giveaway.deleted'), flags: MessageFlags.Ephemeral });
}

// ==================== BUTTON HANDLER ====================

export async function handleGiveawayButton(interaction: any): Promise<void> {
  if (!interaction.isButton() || !interaction.customId.startsWith('giveaway_')) return;

  const settings = getGuildSettings(interaction.guild?.id ?? '');
  const locale = (settings.language || 'en') as Locale;

  const giveaway = getGiveawayByMessage(interaction.message.id);
  if (!giveaway) {
    await interaction.reply({ content: t(locale, 'giveaway.notFound'), flags: MessageFlags.Ephemeral });
    return;
  }

  if (giveaway.ended) {
    await interaction.reply({ content: t(locale, 'giveaway.hasEnded'), flags: MessageFlags.Ephemeral });
    return;
  }

  const userId = interaction.user.id;
  const alreadyJoined = isParticipant(giveaway.id, userId);

  if (alreadyJoined) {
    removeParticipant(giveaway.id, userId);
    await interaction.reply({ content: t(locale, 'giveaway.left'), flags: MessageFlags.Ephemeral });
  } else {
    addParticipant(giveaway.id, userId);
    await interaction.reply({ content: t(locale, 'giveaway.joined'), flags: MessageFlags.Ephemeral });
  }

  // Update embed with new participant count
  const participantCount = getParticipantCount(giveaway.id);
  const embed = createGiveawayEmbed(
    giveaway.prize,
    new Date(giveaway.endsAt),
    giveaway.winnersCount,
    giveaway.hostId,
    participantCount,
    false,
    undefined,
    locale
  );

  try {
    await interaction.message.edit({ embeds: [embed] });
  } catch {
    // Ignore edit errors
  }
}

// ==================== HELPERS ====================

function parseDuration(input: string): number | null {
  const match = input.match(/^(\d+)([smhdw])$/i);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000,
    'w': 7 * 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}

function createGiveawayEmbed(
  prize: string,
  endsAt: Date,
  winnersCount: number,
  hostId: string,
  participants: number,
  ended: boolean,
  winners?: string[],
  locale: Locale = 'en' as Locale
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'giveaway.title'))
    .setColor(ended ? 0x808080 : 0x5865F2)
    .setTimestamp(endsAt);

  if (ended) {
    const winnersText = winners && winners.length > 0 
      ? winners.map(id => `<@${id}>`).join(', ')
      : t(locale, 'giveaway.noWinners');
    embed.setDescription(`**${prize}**\n\n🏆 **${t(locale, 'giveaway.winners')}:** ${winnersText}`);
    embed.setFooter({ text: t(locale, 'giveaway.ended') });
  } else {
    embed.setDescription(
      `**${prize}**\n\n` +
      `👥 **${t(locale, 'giveaway.participants')}:** ${participants}\n` +
      `🏆 **${t(locale, 'giveaway.winners')}:** ${winnersCount}\n` +
      `🎫 **${t(locale, 'giveaway.hostedBy')}:** <@${hostId}>\n\n` +
      t(locale, 'giveaway.enterPrompt')
    );
    embed.setFooter({ text: t(locale, 'giveaway.endsAt') });
  }

  return embed;
}

function createGiveawayButton(disabled: boolean = false, locale: Locale = 'en' as Locale): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('giveaway_join')
        .setLabel(t(locale, 'giveaway.enterButton'))
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled)
    );
}

async function updateGiveawayMessage(guild: any, giveaway: any, winners: string[], locale: Locale = 'en' as Locale): Promise<void> {
  try {
    const channel = guild.channels.cache.get(giveaway.channelId) as TextChannel;
    if (!channel) return;

    const message = await channel.messages.fetch(giveaway.messageId);
    if (!message) return;

    const participants = getParticipantCount(giveaway.id);
    const embed = createGiveawayEmbed(
      giveaway.prize,
      new Date(giveaway.endsAt),
      giveaway.winnersCount,
      giveaway.hostId,
      participants,
      true,
      winners,
      locale
    );

    await message.edit({
      embeds: [embed],
      components: [createGiveawayButton(true, locale)],
    });

    // Announce winners
    if (winners.length > 0) {
      const winnersText = winners.map(id => `<@${id}>`).join(', ');
      await channel.send({
        content: t(locale, 'giveaway.congratulations', { winners: winnersText, prize: giveaway.prize }),
      });

      // DM winners if enabled
      await sendDmToWinners(guild, giveaway, winners, locale);
    }
  } catch (error) {
    console.error('[Giveaway] Error updating message:', error);
  }
}

async function sendDmToWinners(guild: any, giveaway: any, winners: string[], locale: Locale = 'en' as Locale): Promise<void> {
  const settings = getGuildSettings(guild.id);
  if (!settings.giveawayDmWinners) return;

  const dmEmbed = new EmbedBuilder()
    .setTitle(t(locale, 'giveaway.dmTitle'))
    .setDescription(
      t(locale, 'giveaway.dmDesc', { 
        server: guild.name, 
        prize: giveaway.prize, 
        host: `<@${giveaway.hostId}>` 
      })
    )
    .setColor(0x5865F2)
    .setTimestamp();

  for (const winnerId of winners) {
    try {
      const user = await guild.client.users.fetch(winnerId);
      await user.send({ embeds: [dmEmbed] });
      console.log(`[Giveaway] DM sent to winner ${user.tag}`);
    } catch (error) {
      console.log(`[Giveaway] Could not DM winner ${winnerId} (DMs may be disabled)`);
    }
  }
}

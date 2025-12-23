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
import { t } from '../../utils/i18n.js';
import { getLocale, hasAdminPermission } from './utils.js';

export async function handleGiveaway(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'start':
      await handleGiveawayStart(interaction);
      break;
    case 'end':
      await handleGiveawayEnd(interaction);
      break;
    case 'reroll':
      await handleGiveawayReroll(interaction);
      break;
    case 'list':
      await handleGiveawayList(interaction);
      break;
    case 'delete':
      await handleGiveawayDelete(interaction);
      break;
  }
}

async function handleGiveawayStart(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!hasAdminPermission(interaction)) {
    const locale = getLocale(interaction);
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
    await interaction.reply({ content: '❌ Invalid channel. Please select a text channel.', flags: MessageFlags.Ephemeral });
    return;
  }

  // Duration in minutes
  const durationMs = durationMinutes * 60 * 1000;
  if (durationMs <= 0) {
    await interaction.reply({ content: '❌ Duration must be greater than 0.', flags: MessageFlags.Ephemeral });
    return;
  }

  const endsAt = new Date(Date.now() + durationMs);

  // Create giveaway embed
  const embed = createGiveawayEmbed(prize, endsAt, winners, interaction.user.id, 0, false);
  const button = createGiveawayButton();

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
      content: `✅ Giveaway #${giveawayId} started in ${channel}!\n**Prize:** ${prize}\n**Ends:** <t:${Math.floor(endsAt.getTime() / 1000)}:R>`,
    });
  } catch (error) {
    console.error('[Giveaway] Error starting giveaway:', error);
    await interaction.editReply({ content: '❌ Failed to create giveaway. Check bot permissions.' });
  }
}

async function handleGiveawayEnd(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!hasAdminPermission(interaction)) {
    const locale = getLocale(interaction);
    await interaction.reply({ content: t(locale, 'errors.adminOnly'), flags: MessageFlags.Ephemeral });
    return;
  }

  const messageId = interaction.options.getString('message_id', true);
  const giveaway = getGiveawayByMessage(messageId);

  if (!giveaway) {
    await interaction.reply({ content: '❌ Giveaway not found.', flags: MessageFlags.Ephemeral });
    return;
  }

  if (giveaway.ended) {
    await interaction.reply({ content: '❌ This giveaway has already ended.', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const winners = selectWinners(giveaway.id, giveaway.winnersCount);
    endGiveaway(giveaway.id, winners);

    await updateGiveawayMessage(interaction.guild!, giveaway, winners);

    const winnersText = winners.length > 0 
      ? winners.map(id => `<@${id}>`).join(', ')
      : 'No participants';

    await interaction.editReply({
      content: `✅ Giveaway ended!\n**Winners:** ${winnersText}`,
    });
  } catch (error) {
    console.error('[Giveaway] Error ending giveaway:', error);
    await interaction.editReply({ content: '❌ Failed to end giveaway.' });
  }
}

async function handleGiveawayReroll(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!hasAdminPermission(interaction)) {
    const locale = getLocale(interaction);
    await interaction.reply({ content: t(locale, 'errors.adminOnly'), flags: MessageFlags.Ephemeral });
    return;
  }

  const messageId = interaction.options.getString('message_id', true);
  const giveaway = getGiveawayByMessage(messageId);

  if (!giveaway) {
    await interaction.reply({ content: '❌ Giveaway not found.', flags: MessageFlags.Ephemeral });
    return;
  }

  if (!giveaway.ended) {
    await interaction.reply({ content: '❌ This giveaway has not ended yet.', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const newWinners = selectWinners(giveaway.id, giveaway.winnersCount);
    endGiveaway(giveaway.id, newWinners);

    await updateGiveawayMessage(interaction.guild!, giveaway, newWinners);

    const winnersText = newWinners.length > 0 
      ? newWinners.map(id => `<@${id}>`).join(', ')
      : 'No participants';

    await interaction.editReply({
      content: `🔄 Giveaway rerolled!\n**New Winners:** ${winnersText}`,
    });
  } catch (error) {
    console.error('[Giveaway] Error rerolling giveaway:', error);
    await interaction.editReply({ content: '❌ Failed to reroll giveaway.' });
  }
}

async function handleGiveawayList(interaction: ChatInputCommandInteraction): Promise<void> {
  const giveaways = getActiveGiveaways(interaction.guild!.id);

  if (giveaways.length === 0) {
    await interaction.reply({ content: '📭 No active giveaways.', flags: MessageFlags.Ephemeral });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🎉 Active Giveaways')
    .setColor(0x5865F2)
    .setDescription(
      giveaways.map((g, i) => {
        const endsTimestamp = Math.floor(new Date(g.endsAt).getTime() / 1000);
        const participants = getParticipantCount(g.id);
        return `**${i + 1}.** ${g.prize}\n` +
               `   👥 ${participants} participants | 🏆 ${g.winnersCount} winner(s)\n` +
               `   ⏰ Ends <t:${endsTimestamp}:R> | [Jump](https://discord.com/channels/${g.guildId}/${g.channelId}/${g.messageId})`;
      }).join('\n\n')
    );

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleGiveawayDelete(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!hasAdminPermission(interaction)) {
    const locale = getLocale(interaction);
    await interaction.reply({ content: t(locale, 'errors.adminOnly'), flags: MessageFlags.Ephemeral });
    return;
  }

  const messageId = interaction.options.getString('message_id', true);
  const giveaway = getGiveawayByMessage(messageId);

  if (!giveaway) {
    await interaction.reply({ content: '❌ Giveaway not found.', flags: MessageFlags.Ephemeral });
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

  await interaction.reply({ content: '✅ Giveaway deleted.', flags: MessageFlags.Ephemeral });
}

// ==================== BUTTON HANDLER ====================

export async function handleGiveawayButton(interaction: any): Promise<void> {
  if (!interaction.isButton() || !interaction.customId.startsWith('giveaway_')) return;

  const giveaway = getGiveawayByMessage(interaction.message.id);
  if (!giveaway) {
    await interaction.reply({ content: '❌ Giveaway not found.', flags: MessageFlags.Ephemeral });
    return;
  }

  if (giveaway.ended) {
    await interaction.reply({ content: '❌ This giveaway has ended.', flags: MessageFlags.Ephemeral });
    return;
  }

  const userId = interaction.user.id;
  const alreadyJoined = isParticipant(giveaway.id, userId);

  if (alreadyJoined) {
    removeParticipant(giveaway.id, userId);
    await interaction.reply({ content: '👋 You left the giveaway.', flags: MessageFlags.Ephemeral });
  } else {
    addParticipant(giveaway.id, userId);
    await interaction.reply({ content: '🎉 You joined the giveaway! Good luck!', flags: MessageFlags.Ephemeral });
  }

  // Update embed with new participant count
  const participantCount = getParticipantCount(giveaway.id);
  const embed = createGiveawayEmbed(
    giveaway.prize,
    new Date(giveaway.endsAt),
    giveaway.winnersCount,
    giveaway.hostId,
    participantCount,
    false
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
  winners?: string[]
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('🎉 GIVEAWAY 🎉')
    .setColor(ended ? 0x808080 : 0x5865F2)
    .setTimestamp(endsAt);

  if (ended) {
    const winnersText = winners && winners.length > 0 
      ? winners.map(id => `<@${id}>`).join(', ')
      : 'No winners';
    embed.setDescription(`**${prize}**\n\n🏆 **Winners:** ${winnersText}`);
    embed.setFooter({ text: 'Giveaway ended' });
  } else {
    embed.setDescription(
      `**${prize}**\n\n` +
      `👥 **Participants:** ${participants}\n` +
      `🏆 **Winners:** ${winnersCount}\n` +
      `🎫 **Hosted by:** <@${hostId}>\n\n` +
      `Click the button below to enter!`
    );
    embed.setFooter({ text: `Ends at` });
  }

  return embed;
}

function createGiveawayButton(disabled: boolean = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('giveaway_join')
        .setLabel('🎉 Enter Giveaway')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled)
    );
}

async function updateGiveawayMessage(guild: any, giveaway: any, winners: string[]): Promise<void> {
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
      winners
    );

    await message.edit({
      embeds: [embed],
      components: [createGiveawayButton(true)],
    });

    // Announce winners
    if (winners.length > 0) {
      const winnersText = winners.map(id => `<@${id}>`).join(', ');
      await channel.send({
        content: `🎉 Congratulations ${winnersText}! You won **${giveaway.prize}**!`,
      });

      // DM winners if enabled
      await sendDmToWinners(guild, giveaway, winners);
    }
  } catch (error) {
    console.error('[Giveaway] Error updating message:', error);
  }
}

async function sendDmToWinners(guild: any, giveaway: any, winners: string[]): Promise<void> {
  const settings = getGuildSettings(guild.id);
  if (!settings.giveawayDmWinners) return;

  const dmEmbed = new EmbedBuilder()
    .setTitle('🎉 You Won a Giveaway!')
    .setDescription(
      `Congratulations! You won a giveaway in **${guild.name}**!\n\n` +
      `**Prize:** ${giveaway.prize}\n` +
      `**Hosted by:** <@${giveaway.hostId}>`
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

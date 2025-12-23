// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Welcome Setup Handlers
// Licensed under MIT License

import {
  ButtonInteraction,
  StringSelectMenuInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  TextChannel,
  MessageFlags,
} from 'discord.js';
import { getGuildSettings, updateGuildSettings } from '../../../../database/repositories/settingsRepo.js';
import { formatWelcomeMessage, DEFAULT_WELCOME_MESSAGES, DEFAULT_LEAVE_MESSAGES } from '../welcomeBuilder.js';

export async function handleWelcomeTest(interaction: ButtonInteraction): Promise<void> {
  const guildId = interaction.guild!.id;
  const settings = getGuildSettings(guildId);
  
  if (!settings.welcomeChannelId) {
    await interaction.reply({
      content: '❌ Please select a welcome channel first!',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const channel = interaction.guild!.channels.cache.get(settings.welcomeChannelId) as TextChannel;
  if (!channel) {
    await interaction.reply({
      content: '❌ Welcome channel not found! Please select a new one.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const member = interaction.member!;
  const memberCount = interaction.guild!.memberCount;
  const welcomeMsg = formatWelcomeMessage(
    settings.welcomeMessage || DEFAULT_WELCOME_MESSAGES.en,
    member as any,
    interaction.guild!.name,
    memberCount
  );
  const leaveMsg = formatWelcomeMessage(
    settings.leaveMessage || DEFAULT_LEAVE_MESSAGES.en,
    member as any,
    interaction.guild!.name,
    memberCount
  );

  const testEmbed = new EmbedBuilder()
    .setTitle('🧪 Test Messages Preview')
    .setColor(0x5865F2)
    .addFields(
      { name: '👋 Welcome Message', value: welcomeMsg, inline: false },
      { name: '🚪 Leave Message', value: leaveMsg, inline: false },
    )
    .setFooter({ text: 'This is a preview - no message was sent to the channel' });

  await interaction.reply({
    embeds: [testEmbed],
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleWelcomeMessageType(
  interaction: StringSelectMenuInteraction,
  refreshView: () => Promise<void>
): Promise<void> {
  const value = interaction.values[0];
  const guildId = interaction.guild!.id;

  if (value === 'reset') {
    updateGuildSettings(guildId, {
      welcomeMessage: null,
      leaveMessage: null,
    });
    await interaction.reply({
      content: '✅ Messages reset to default!',
      flags: MessageFlags.Ephemeral,
    });
    await refreshView();
    return;
  }

  // Show modal for editing
  const isWelcome = value === 'welcome';
  const settings = getGuildSettings(guildId);
  const currentMessage = isWelcome 
    ? (settings.welcomeMessage || DEFAULT_WELCOME_MESSAGES.en)
    : (settings.leaveMessage || DEFAULT_LEAVE_MESSAGES.en);

  const modal = new ModalBuilder()
    .setCustomId(`setup_welcome_modal_${value}`)
    .setTitle(isWelcome ? '✏️ Edit Welcome Message' : '✏️ Edit Leave Message');

  const messageInput = new TextInputBuilder()
    .setCustomId('message')
    .setLabel(isWelcome ? 'Welcome Message' : 'Leave Message')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Variables: {user}, {username}, {server}, {memberCount}')
    .setValue(currentMessage)
    .setRequired(true)
    .setMaxLength(1000);

  const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput);
  modal.addComponents(actionRow);

  await interaction.showModal(modal);
}

export async function handleWelcomeModalSubmit(
  interaction: ModalSubmitInteraction,
  refreshView: () => Promise<void>
): Promise<void> {
  const isWelcome = interaction.customId === 'setup_welcome_modal_welcome';
  const message = interaction.fields.getTextInputValue('message');
  const guildId = interaction.guild!.id;

  if (isWelcome) {
    updateGuildSettings(guildId, { welcomeMessage: message });
  } else {
    updateGuildSettings(guildId, { leaveMessage: message });
  }

  await interaction.reply({
    content: `✅ ${isWelcome ? 'Welcome' : 'Leave'} message updated!`,
    flags: MessageFlags.Ephemeral,
  });
  
  await refreshView();
}

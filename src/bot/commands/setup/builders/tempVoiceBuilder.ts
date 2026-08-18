// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Temp Voice Setup Builder
// Licensed under MIT License

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
} from 'discord.js';
import type { GuildSettings } from '../../../../database/repositories/settingsRepo.js';
import type { SetupView } from '../types.js';

export function buildTempVoiceSettings(settings: GuildSettings, guild: any): SetupView {
  const triggerChannelName = settings.tempVoiceTriggerChannelId
    ? guild?.channels.cache.get(settings.tempVoiceTriggerChannelId)?.name ?? 'Unknown'
    : 'Not set';
  const categoryName = settings.tempVoiceCategoryId
    ? guild?.channels.cache.get(settings.tempVoiceCategoryId)?.name ?? 'Unknown'
    : 'Not set';
  const controlChannelName = settings.tempVoiceControlChannelId
    ? guild?.channels.cache.get(settings.tempVoiceControlChannelId)?.name ?? 'Unknown'
    : 'Not set';

  const embed = new EmbedBuilder()
    .setTitle('🔊 Temporary Voice Channels & Interface')
    .setDescription('Create private voice channels with interactive visual control interface.')
    .setColor(0x5865F2)
    .addFields(
      { 
        name: '📊 Status', 
        value: settings.enableTempVoice ? '✅ Enabled' : '❌ Disabled', 
        inline: true 
      },
      { 
        name: '🎯 Trigger Channel', 
        value: settings.tempVoiceTriggerChannelId ? `#${triggerChannelName}` : '❌ Not set', 
        inline: true 
      },
      { 
        name: '📁 Category', 
        value: settings.tempVoiceCategoryId ? `📂 ${categoryName}` : '❌ Not set', 
        inline: true 
      },
      { 
        name: '🎛️ Interface Channel (Optional)', 
        value: settings.tempVoiceControlChannelId ? `#${controlChannelName}` : '➖ Not set (Optional)', 
        inline: true 
      },
      { 
        name: '📝 Name Template', 
        value: `\`${settings.tempVoiceNameTemplate}\``, 
        inline: true 
      },
      { 
        name: '👥 User Limit', 
        value: settings.tempVoiceUserLimit > 0 ? `${settings.tempVoiceUserLimit} users` : 'Unlimited', 
        inline: true 
      },
      {
        name: '💡 How it works',
        value: '1. User joins the **trigger channel**\n2. Bot creates a private voice channel\n3. User is moved to their new channel\n4. User manages channel via `/voice` commands (or **Interface buttons** if channel set)\n5. Channel is deleted when empty',
        inline: false
      },
      {
        name: '📝 Name Variables',
        value: '`{user}` - Display name\n`{username}` - Username',
        inline: false
      },
    );

  const row1 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_toggle_tempvoice')
        .setLabel(settings.enableTempVoice ? '⏸️ Disable' : '▶️ Enable')
        .setStyle(settings.enableTempVoice ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('setup_tempvoice_name_modal')
        .setLabel('📝 Name Template')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('setup_tempvoice_post_interface')
        .setLabel('📢 Post Interface')
        .setStyle(ButtonStyle.Success)
        .setDisabled(!settings.tempVoiceControlChannelId),
      new ButtonBuilder()
        .setCustomId('setup_back')
        .setLabel('◀️ Back')
        .setStyle(ButtonStyle.Secondary),
    );

  const triggerSelect = new ActionRowBuilder<ChannelSelectMenuBuilder>()
    .addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('setup_tempvoice_trigger')
        .setPlaceholder('🎯 Select Trigger Channel (join to create)')
        .addChannelTypes(ChannelType.GuildVoice)
    );

  const categorySelect = new ActionRowBuilder<ChannelSelectMenuBuilder>()
    .addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('setup_tempvoice_category')
        .setPlaceholder('📁 Select Category for temp channels')
        .addChannelTypes(ChannelType.GuildCategory)
    );

  const controlChannelSelect = new ActionRowBuilder<ChannelSelectMenuBuilder>()
    .addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('setup_tempvoice_control_channel')
        .setPlaceholder('🎛️ Select Interface Text Channel (Optional)')
        .addChannelTypes(ChannelType.GuildText)
    );

  const userLimitSelect = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('setup_tempvoice_limit')
        .setPlaceholder('👥 User Limit')
        .addOptions([
          { label: 'Unlimited', value: '0', description: 'No user limit', default: settings.tempVoiceUserLimit === 0 },
          { label: '2 users', value: '2', description: 'Small conversations' },
          { label: '5 users', value: '5', description: 'Small groups' },
          { label: '10 users', value: '10', description: 'Medium groups' },
          { label: '25 users', value: '25', description: 'Large groups' },
          { label: '99 users', value: '99', description: 'Maximum' },
        ])
    );

  return {
    embeds: [embed],
    components: [row1, triggerSelect, categorySelect, controlChannelSelect, userLimitSelect],
  };
}

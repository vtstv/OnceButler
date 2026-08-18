// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - TempVoice Visual Interface Control Panel
// Licensed under MIT License

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  MessageFlags,
  Guild,
  TextChannel,
  VoiceChannel,
  GuildMember,
  ButtonInteraction,
  ModalSubmitInteraction,
  UserSelectMenuInteraction,
  StringSelectMenuInteraction,
  Interaction,
  Message,
} from 'discord.js';
import { isTempVoiceChannel, getTempChannelOwner, updateTempChannelOwner } from './tempVoiceService.js';
import { getGuildSettings, updateGuildSettings } from '../database/repositories/settingsRepo.js';
import { t, Locale } from '../utils/i18n.js';

/**
 * Build the TempVoice Interface Embed
 */
export function buildTempVoiceInterfaceEmbed(locale: Locale = 'ru'): EmbedBuilder {
  const isRu = locale === 'ru';
  const isDe = locale === 'de';

  let title = 'TempVoice Interface';
  let description = '';

  if (isRu) {
    description = [
      'Этот **интерфейс** можно использовать для управления личными каналами. Дополнительные возможности доступны через `/voice` команды.',
      '',
      '🔏 **НАЗВАНИЕ**  🛡️ **ДОСТУП**  👥 **ЛИМИТ**  👤🚫 **ЗАБАНИТЬ**  👤🔍 **РАЗБАНИТЬ**',
      '📞🚫 **ВЫГНАТЬ**  📞➕ **ПРИГЛАСИТЬ**  👤➕ **ДОВЕРЯТЬ**  👤✖️ **НЕ ДОВЕРЯТЬ**  👑 **ЗАБРАТЬ**',
      '👑↗️ **ПЕРЕДАТЬ**  🕒 **ПРИХОЖАЯ**  💬 **ЧАТ**  🌐 **РЕГИОН**  🗑️ **УДАЛИТЬ**',
      '',
      'Чтобы использовать функции интерфейса, воспользуйтесь кнопками ниже.',
    ].join('\n');
  } else if (isDe) {
    description = [
      'Dieses **Interface** kann zur Verwaltung privater Kanäle verwendet werden. Weitere Optionen sind über `/voice` Befehle verfügbar.',
      '',
      '🔏 **NAME**  🛡️ **ZUGANG**  👥 **LIMIT**  👤🚫 **BLOCKIEREN**  👤🔍 **ENTBLOCKEN**',
      '📞🚫 **KICKEN**  📞➕ **EINLADEN**  👤➕ **VERTRAUEN**  👤✖️ **MISSTRAUEN**  👑 **ÜBERNEHMEN**',
      '👑↗️ **ÜBERTRAGEN**  🕒 **WARTERAUM**  💬 **CHAT**  🌐 **BITRATE**  🗑️ **LÖSCHEN**',
      '',
      'Klicke auf die Schaltflächen unten, um die Funktionen zu nutzen.',
    ].join('\n');
  } else {
    description = [
      'This **interface** can be used to manage personal voice channels. Additional features are available via `/voice` commands.',
      '',
      '🔏 **NAME**  🛡️ **ACCESS**  👥 **LIMIT**  👤🚫 **BAN**  👤🔍 **UNBAN**',
      '📞🚫 **KICK**  📞➕ **INVITE**  👤➕ **TRUST**  👤✖️ **UNTRUST**  👑 **CLAIM**',
      '👑↗️ **TRANSFER**  🕒 **WAITING ROOM**  💬 **CHAT**  🌐 **REGION**  🗑️ **DELETE**',
      '',
      'To use the interface features, use the buttons below.',
    ].join('\n');
  }

  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(0xE91E63);
}

/**
 * Build the 3 rows of 5 buttons for the Interface
 */
export function buildTempVoiceInterfaceButtons(): ActionRowBuilder<ButtonBuilder>[] {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('tv_btn_name')
      .setEmoji('🔏')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tv_btn_lock')
      .setEmoji('🛡️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tv_btn_limit')
      .setEmoji('👥')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tv_btn_ban')
      .setEmoji('🚫')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tv_btn_unban')
      .setEmoji('🔍')
      .setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('tv_btn_kick')
      .setEmoji('👢')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tv_btn_invite')
      .setEmoji('✉️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tv_btn_trust')
      .setEmoji('🤝')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tv_btn_untrust')
      .setEmoji('✋')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tv_btn_claim')
      .setEmoji('👑')
      .setStyle(ButtonStyle.Secondary),
  );

  const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('tv_btn_transfer')
      .setEmoji('📤')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tv_btn_waiting_room')
      .setEmoji('🕒')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tv_btn_chat')
      .setEmoji('💬')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tv_btn_bitrate')
      .setEmoji('🌐')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tv_btn_delete')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Danger),
  );

  return [row1, row2, row3];
}

/**
 * Post or update the TempVoice interface in the designated text channel
 */
export async function postOrUpdateTempVoiceInterface(guild: Guild, channelId: string): Promise<Message | null> {
  try {
    const channel = await guild.channels.fetch(channelId) as TextChannel | null;
    if (!channel || !channel.isTextBased()) {
      return null;
    }

    const settings = getGuildSettings(guild.id);
    const locale = (settings.language || 'en') as Locale;
    const embed = buildTempVoiceInterfaceEmbed(locale);
    const components = buildTempVoiceInterfaceButtons();

    if (settings.tempVoiceControlMessageId) {
      try {
        const existingMsg = await channel.messages.fetch(settings.tempVoiceControlMessageId);
        if (existingMsg) {
          await existingMsg.edit({ embeds: [embed], components });
          return existingMsg;
        }
      } catch {
        // Message was deleted or not found, proceed to send new
      }
    }

    const newMsg = await channel.send({ embeds: [embed], components });
    updateGuildSettings(guild.id, {
      tempVoiceControlChannelId: channelId,
      tempVoiceControlMessageId: newMsg.id,
    });
    return newMsg;
  } catch (err) {
    console.error('[TempVoice Interface] Failed to post interface:', err);
    return null;
  }
}

/**
 * Check if channel is locked
 */
function isChannelLocked(channel: VoiceChannel): boolean {
  const everyonePerms = channel.permissionOverwrites.cache.get(channel.guild.roles.everyone.id);
  if (!everyonePerms) return false;
  return everyonePerms.deny.has(PermissionFlagsBits.Connect);
}

/**
 * Main Interaction Handler for TempVoice Interface
 */
export async function handleTempVoiceInterfaceInteraction(interaction: Interaction): Promise<void> {
  if (!interaction.guild) return;

  const settings = getGuildSettings(interaction.guild.id);
  const locale = (settings.language || 'en') as Locale;
  const member = interaction.member as GuildMember;

  if (interaction.isButton()) {
    await handleButton(interaction, member, locale);
  } else if (interaction.isModalSubmit()) {
    await handleModal(interaction, member, locale);
  } else if (interaction.isAnySelectMenu()) {
    await handleSelectMenu(interaction, member, locale);
  }
}

/**
 * Handle button clicks
 */
async function handleButton(interaction: ButtonInteraction, member: GuildMember, locale: Locale): Promise<void> {
  const customId = interaction.customId;

  // Handle delete confirmation buttons
  if (customId === 'tv_btn_delete_confirm') {
    const voiceChannel = member.voice.channel as VoiceChannel | null;
    if (voiceChannel && isTempVoiceChannel(voiceChannel.id) && getTempChannelOwner(voiceChannel.id) === member.id) {
      await voiceChannel.delete('Deleted by channel owner via TempVoice interface');
      await interaction.update({ content: t(locale, 'voice.interface.deleteSuccess'), components: [] });
    } else {
      await interaction.update({ content: t(locale, 'voice.interface.deleteFailed'), components: [] });
    }
    return;
  }

  if (customId === 'tv_btn_delete_cancel') {
    await interaction.update({ content: t(locale, 'voice.interface.deleteCancelled'), components: [] });
    return;
  }

  // General check: user must be in a voice channel
  const voiceChannel = member.voice.channel as VoiceChannel | null;
  if (!voiceChannel) {
    await interaction.reply({
      content: t(locale, 'voice.notInChannel'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!isTempVoiceChannel(voiceChannel.id)) {
    await interaction.reply({
      content: t(locale, 'voice.notTempChannel'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const ownerId = getTempChannelOwner(voiceChannel.id);

  // Claim ownership button
  if (customId === 'tv_btn_claim') {
    if (ownerId === member.id) {
      await interaction.reply({
        content: t(locale, 'voice.interface.alreadyOwner'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Check if previous owner is still in voice channel
    if (ownerId && voiceChannel.members.has(ownerId)) {
      await interaction.reply({
        content: t(locale, 'voice.interface.ownerStillHere'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Transfer ownership to clicking member
    updateTempChannelOwner(voiceChannel.id, member.id);
    await voiceChannel.permissionOverwrites.edit(member.id, {
      ManageChannels: true,
      MuteMembers: true,
      DeafenMembers: true,
      MoveMembers: true,
      PrioritySpeaker: true,
    });

    await interaction.reply({
      content: t(locale, 'voice.interface.claimSuccess'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // All other actions require user to be the owner
  if (ownerId !== member.id) {
    await interaction.reply({
      content: t(locale, 'voice.notOwner'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  switch (customId) {
    case 'tv_btn_name': {
      const modal = new ModalBuilder()
        .setCustomId('tv_modal_name')
        .setTitle(t(locale, 'voice.interface.modalNameTitle'));

      const nameInput = new TextInputBuilder()
        .setCustomId('channel_name')
        .setLabel(t(locale, 'voice.interface.modalNameLabel'))
        .setStyle(TextInputStyle.Short)
        .setValue(voiceChannel.name)
        .setMinLength(1)
        .setMaxLength(100)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput));
      await interaction.showModal(modal);
      break;
    }

    case 'tv_btn_lock': {
      const isLocked = isChannelLocked(voiceChannel);
      if (isLocked) {
        await voiceChannel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
          Connect: null,
        });
        await interaction.reply({
          content: t(locale, 'voice.unlock.success'),
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await voiceChannel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
          Connect: false,
        });
        await interaction.reply({
          content: t(locale, 'voice.lock.success'),
          flags: MessageFlags.Ephemeral,
        });
      }
      break;
    }

    case 'tv_btn_limit': {
      const modal = new ModalBuilder()
        .setCustomId('tv_modal_limit')
        .setTitle(t(locale, 'voice.interface.modalLimitTitle'));

      const limitInput = new TextInputBuilder()
        .setCustomId('user_limit')
        .setLabel(t(locale, 'voice.interface.modalLimitLabel'))
        .setStyle(TextInputStyle.Short)
        .setValue(voiceChannel.userLimit.toString())
        .setMinLength(1)
        .setMaxLength(2)
        .setPlaceholder('0-99')
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(limitInput));
      await interaction.showModal(modal);
      break;
    }

    case 'tv_btn_ban': {
      const selectMenu = new UserSelectMenuBuilder()
        .setCustomId('tv_select_ban')
        .setPlaceholder(t(locale, 'voice.interface.selectBan'))
        .setMinValues(1)
        .setMaxValues(1);

      const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(selectMenu);
      await interaction.reply({
        content: '🚫 ' + t(locale, 'voice.interface.promptBan'),
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
      break;
    }

    case 'tv_btn_unban': {
      const selectMenu = new UserSelectMenuBuilder()
        .setCustomId('tv_select_unban')
        .setPlaceholder(t(locale, 'voice.interface.selectUnban'))
        .setMinValues(1)
        .setMaxValues(1);

      const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(selectMenu);
      await interaction.reply({
        content: '🔍 ' + t(locale, 'voice.interface.promptUnban'),
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
      break;
    }

    case 'tv_btn_kick': {
      const selectMenu = new UserSelectMenuBuilder()
        .setCustomId('tv_select_kick')
        .setPlaceholder(t(locale, 'voice.interface.selectKick'))
        .setMinValues(1)
        .setMaxValues(1);

      const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(selectMenu);
      await interaction.reply({
        content: '👢 ' + t(locale, 'voice.interface.promptKick'),
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
      break;
    }

    case 'tv_btn_invite': {
      const selectMenu = new UserSelectMenuBuilder()
        .setCustomId('tv_select_invite')
        .setPlaceholder(t(locale, 'voice.interface.selectInvite'))
        .setMinValues(1)
        .setMaxValues(1);

      const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(selectMenu);
      await interaction.reply({
        content: '✉️ ' + t(locale, 'voice.interface.promptInvite'),
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
      break;
    }

    case 'tv_btn_trust': {
      const selectMenu = new UserSelectMenuBuilder()
        .setCustomId('tv_select_trust')
        .setPlaceholder(t(locale, 'voice.interface.selectTrust'))
        .setMinValues(1)
        .setMaxValues(1);

      const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(selectMenu);
      await interaction.reply({
        content: '🤝 ' + t(locale, 'voice.interface.promptTrust'),
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
      break;
    }

    case 'tv_btn_untrust': {
      const selectMenu = new UserSelectMenuBuilder()
        .setCustomId('tv_select_untrust')
        .setPlaceholder(t(locale, 'voice.interface.selectUntrust'))
        .setMinValues(1)
        .setMaxValues(1);

      const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(selectMenu);
      await interaction.reply({
        content: '✋ ' + t(locale, 'voice.interface.promptUntrust'),
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
      break;
    }

    case 'tv_btn_transfer': {
      const selectMenu = new UserSelectMenuBuilder()
        .setCustomId('tv_select_transfer')
        .setPlaceholder(t(locale, 'voice.interface.selectTransfer'))
        .setMinValues(1)
        .setMaxValues(1);

      const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(selectMenu);
      await interaction.reply({
        content: '📤 ' + t(locale, 'voice.interface.promptTransfer'),
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
      break;
    }

    case 'tv_btn_waiting_room': {
      const currentCount = voiceChannel.members.size;
      await voiceChannel.setUserLimit(currentCount);
      await voiceChannel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
        Connect: false,
      });

      await interaction.reply({
        content: '🕒 ' + t(locale, 'voice.interface.waitingRoomSuccess'),
        flags: MessageFlags.Ephemeral,
      });
      break;
    }

    case 'tv_btn_chat': {
      const everyoneOverwrite = voiceChannel.permissionOverwrites.cache.get(interaction.guild!.roles.everyone.id);
      const isChatClosed = everyoneOverwrite?.deny.has(PermissionFlagsBits.SendMessages);

      if (isChatClosed) {
        await voiceChannel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
          SendMessages: true,
        });
        await interaction.reply({
          content: '💬 ' + t(locale, 'voice.interface.chatOpened'),
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await voiceChannel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
          SendMessages: false,
        });
        await interaction.reply({
          content: '💬 ' + t(locale, 'voice.interface.chatClosed'),
          flags: MessageFlags.Ephemeral,
        });
      }
      break;
    }

    case 'tv_btn_bitrate': {
      const maxBitrate = Math.round(interaction.guild!.maximumBitrate / 1000);
      const options = [
        { label: '64 kbps', value: '64', description: 'Standard quality' },
        { label: '96 kbps', value: '96', description: 'High quality' },
      ];

      if (maxBitrate >= 128) options.push({ label: '128 kbps', value: '128', description: 'Tier 1 Boost' });
      if (maxBitrate >= 256) options.push({ label: '256 kbps', value: '256', description: 'Tier 2 Boost' });
      if (maxBitrate >= 384) options.push({ label: '384 kbps', value: '384', description: 'Tier 3 Boost' });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('tv_select_bitrate')
        .setPlaceholder(t(locale, 'voice.interface.selectBitrate'))
        .addOptions(options);

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
      await interaction.reply({
        content: '🌐 ' + t(locale, 'voice.interface.promptBitrate'),
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
      break;
    }

    case 'tv_btn_delete': {
      const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('tv_btn_delete_confirm')
          .setLabel(t(locale, 'common.confirm'))
          .setEmoji('🗑️')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('tv_btn_delete_cancel')
          .setLabel(t(locale, 'common.cancel'))
          .setStyle(ButtonStyle.Secondary),
      );

      await interaction.reply({
        content: '⚠️ ' + t(locale, 'voice.interface.promptDelete'),
        components: [confirmRow],
        flags: MessageFlags.Ephemeral,
      });
      break;
    }
  }
}

/**
 * Handle modal submissions
 */
async function handleModal(interaction: ModalSubmitInteraction, member: GuildMember, locale: Locale): Promise<void> {
  const voiceChannel = member.voice.channel as VoiceChannel | null;
  if (!voiceChannel || !isTempVoiceChannel(voiceChannel.id) || getTempChannelOwner(voiceChannel.id) !== member.id) {
    await interaction.reply({
      content: t(locale, 'voice.notOwner'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (interaction.customId === 'tv_modal_name') {
    const newName = interaction.fields.getTextInputValue('channel_name').trim();
    if (!newName) {
      await interaction.reply({ content: t(locale, 'voice.rename.failed'), flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      const oldName = voiceChannel.name;
      await voiceChannel.setName(newName);
      await interaction.reply({
        content: t(locale, 'voice.rename.success', { oldName, newName }),
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      console.error('[TempVoice Interface] Rename error:', err);
      await interaction.reply({ content: t(locale, 'voice.rename.failed'), flags: MessageFlags.Ephemeral });
    }
  } else if (interaction.customId === 'tv_modal_limit') {
    const limitStr = interaction.fields.getTextInputValue('user_limit').trim();
    const limit = parseInt(limitStr, 10);

    if (isNaN(limit) || limit < 0 || limit > 99) {
      await interaction.reply({ content: t(locale, 'voice.limit.failed'), flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      await voiceChannel.setUserLimit(limit);
      const msg = limit === 0
        ? t(locale, 'voice.limit.removed')
        : t(locale, 'voice.limit.success', { limit: limit.toString() });

      await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
    } catch (err) {
      console.error('[TempVoice Interface] Limit error:', err);
      await interaction.reply({ content: t(locale, 'voice.limit.failed'), flags: MessageFlags.Ephemeral });
    }
  }
}

/**
 * Handle select menus
 */
async function handleSelectMenu(interaction: Interaction, member: GuildMember, locale: Locale): Promise<void> {
  if (!interaction.isAnySelectMenu()) return;

  const voiceChannel = member.voice.channel as VoiceChannel | null;
  if (!voiceChannel || !isTempVoiceChannel(voiceChannel.id) || getTempChannelOwner(voiceChannel.id) !== member.id) {
    if (interaction.isRepliable()) {
      await interaction.reply({ content: t(locale, 'voice.notOwner'), flags: MessageFlags.Ephemeral });
    }
    return;
  }

  const customId = interaction.customId;

  if (customId === 'tv_select_ban') {
    const targetUserId = (interaction as UserSelectMenuInteraction).values[0];
    if (targetUserId === member.id) {
      await interaction.update({ content: '❌ ' + t(locale, 'voice.reject.self'), components: [] });
      return;
    }

    await voiceChannel.permissionOverwrites.edit(targetUserId, {
      Connect: false,
      ViewChannel: false,
    });

    const targetMember = voiceChannel.members.get(targetUserId);
    if (targetMember) {
      await targetMember.voice.disconnect('Banned by channel owner');
    }

    await interaction.update({
      content: `🚫 <@${targetUserId}> ` + t(locale, 'voice.interface.banned'),
      components: [],
    });
  } else if (customId === 'tv_select_unban') {
    const targetUserId = (interaction as UserSelectMenuInteraction).values[0];
    await voiceChannel.permissionOverwrites.delete(targetUserId);

    await interaction.update({
      content: `✅ <@${targetUserId}> ` + t(locale, 'voice.interface.unbanned'),
      components: [],
    });
  } else if (customId === 'tv_select_kick') {
    const targetUserId = (interaction as UserSelectMenuInteraction).values[0];
    if (targetUserId === member.id) {
      await interaction.update({ content: '❌ ' + t(locale, 'voice.kick.self'), components: [] });
      return;
    }

    const targetMember = voiceChannel.members.get(targetUserId);
    if (targetMember) {
      await targetMember.voice.disconnect('Kicked by channel owner');
      await interaction.update({
        content: `👢 <@${targetUserId}> ` + t(locale, 'voice.interface.kicked'),
        components: [],
      });
    } else {
      await interaction.update({
        content: '❌ ' + t(locale, 'voice.kick.notInChannel'),
        components: [],
      });
    }
  } else if (customId === 'tv_select_invite') {
    const targetUserId = (interaction as UserSelectMenuInteraction).values[0];
    await voiceChannel.permissionOverwrites.edit(targetUserId, {
      Connect: true,
      ViewChannel: true,
    });

    await interaction.update({
      content: `✉️ <@${targetUserId}> ` + t(locale, 'voice.permit.success', { user: `<@${targetUserId}>` }),
      components: [],
    });
  } else if (customId === 'tv_select_trust') {
    const targetUserId = (interaction as UserSelectMenuInteraction).values[0];
    await voiceChannel.permissionOverwrites.edit(targetUserId, {
      PrioritySpeaker: true,
      MuteMembers: true,
      DeafenMembers: true,
      MoveMembers: true,
    });

    await interaction.update({
      content: `🤝 <@${targetUserId}> ` + t(locale, 'voice.interface.trusted'),
      components: [],
    });
  } else if (customId === 'tv_select_untrust') {
    const targetUserId = (interaction as UserSelectMenuInteraction).values[0];
    await voiceChannel.permissionOverwrites.delete(targetUserId);

    await interaction.update({
      content: `✋ <@${targetUserId}> ` + t(locale, 'voice.interface.untrusted'),
      components: [],
    });
  } else if (customId === 'tv_select_transfer') {
    const newOwnerId = (interaction as UserSelectMenuInteraction).values[0];
    if (newOwnerId === member.id) {
      await interaction.update({ content: '❌ ' + t(locale, 'voice.interface.transferSelf'), components: [] });
      return;
    }

    updateTempChannelOwner(voiceChannel.id, newOwnerId);
    await voiceChannel.permissionOverwrites.delete(member.id);
    await voiceChannel.permissionOverwrites.edit(newOwnerId, {
      ManageChannels: true,
      MuteMembers: true,
      DeafenMembers: true,
      MoveMembers: true,
      PrioritySpeaker: true,
    });

    await interaction.update({
      content: `👑 ` + t(locale, 'voice.interface.transferred'),
      components: [],
    });
  } else if (customId === 'tv_select_bitrate') {
    const bitrateVal = parseInt((interaction as StringSelectMenuInteraction).values[0], 10);
    const maxBitrate = interaction.guild!.maximumBitrate;
    const targetBitrate = Math.min(bitrateVal * 1000, maxBitrate);

    await voiceChannel.setBitrate(targetBitrate);
    await (interaction as StringSelectMenuInteraction).update({
      content: `🌐 ` + t(locale, 'voice.interface.bitrateSet'),
      components: [],
    });
  }
}

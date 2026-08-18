// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - AI Setup Builder
// Licensed under MIT License

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder, ChannelSelectMenuBuilder, ChannelType } from 'discord.js';
import { GuildSettings } from '../../../../database/repositories/settingsRepo.js';
import { LANGUAGE_CODES } from '../../../../ai/types.js';

export function buildAISettingsEmbed(settings: GuildSettings): EmbedBuilder {
  const providerEmoji = settings.aiProvider === 'cloudflare' ? '☁️' : '💎';
  const statusEmoji = settings.enableAI ? '✅' : '❌';
  const channelText = settings.aiChannelId ? `<#${settings.aiChannelId}>` : 'Not set';
  const allChannelsText = settings.aiAllowAllChannels ? '✅ Yes' : '❌ No';
  const dmText = settings.aiAllowDMs ? '✅ Yes' : '❌ No';
  const langName = LANGUAGE_CODES[settings.aiDefaultTranslateLanguage] ?? settings.aiDefaultTranslateLanguage;
  
  const apiConfigured = settings.aiApiKey ? '✅ Configured' : '❌ Not set';
  const accountConfigured = settings.aiProvider === 'cloudflare' 
    ? (settings.aiAccountId ? '✅ Configured' : '❌ Not set (required for Cloudflare)')
    : '➖ Not needed';

  return new EmbedBuilder()
    .setTitle('🤖 AI Module Settings')
    .setDescription('Configure AI chat and translation features.')
    .setColor(settings.enableAI ? 0x00FF00 : 0xFF6B6B)
    .addFields(
      { name: 'Status', value: `${statusEmoji} ${settings.enableAI ? 'Enabled' : 'Disabled'}`, inline: true },
      { name: 'Provider', value: `${providerEmoji} ${settings.aiProvider === 'cloudflare' ? 'Cloudflare Workers AI' : 'Google Gemini'}`, inline: true },
      { name: '\u200B', value: '\u200B', inline: true },
      { name: 'API Key', value: apiConfigured, inline: true },
      { name: 'Account ID', value: accountConfigured, inline: true },
      { name: '\u200B', value: '\u200B', inline: true },
      { name: 'AI Channel', value: channelText, inline: true },
      { name: 'Allow All Channels', value: allChannelsText, inline: true },
      { name: 'Allow DMs', value: dmText, inline: true },
      { name: 'Default Translation', value: `🌐 ${langName}`, inline: true },
    )
    .setFooter({ text: 'Use /ai to chat • /translate to translate text' });
}

export function buildAISettingsButtons(settings: GuildSettings): ActionRowBuilder<ButtonBuilder>[] {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('setup_ai_toggle')
      .setLabel(settings.enableAI ? 'Disable AI' : 'Enable AI')
      .setStyle(settings.enableAI ? ButtonStyle.Danger : ButtonStyle.Success)
      .setEmoji(settings.enableAI ? '❌' : '✅'),
    new ButtonBuilder()
      .setCustomId('setup_ai_provider')
      .setLabel('Change Provider')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🔄'),
    new ButtonBuilder()
      .setCustomId('setup_ai_apikey')
      .setLabel('Set API Key')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔑'),
    new ButtonBuilder()
      .setCustomId('setup_ai_accountid')
      .setLabel('Set Account ID')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🆔')
      .setDisabled(settings.aiProvider !== 'cloudflare'),
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('setup_ai_allchannels')
      .setLabel(settings.aiAllowAllChannels ? 'Restrict to Channel' : 'Allow All Channels')
      .setStyle(settings.aiAllowAllChannels ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setEmoji('📢'),
    new ButtonBuilder()
      .setCustomId('setup_ai_dms')
      .setLabel(settings.aiAllowDMs ? 'Disable DMs' : 'Enable DMs')
      .setStyle(settings.aiAllowDMs ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setEmoji('💬'),
    new ButtonBuilder()
      .setCustomId('setup_ai_test')
      .setLabel('Test AI')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🧪')
      .setDisabled(!settings.aiApiKey),
  );

  const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('setup_back')
      .setLabel('Back to Main Menu')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('◀️'),
  );

  return [row1, row2, row3];
}

export function buildAIChannelSelect(): ActionRowBuilder<ChannelSelectMenuBuilder> {
  return new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('setup_ai_channel')
      .setPlaceholder('Select AI Channel')
      .setChannelTypes(ChannelType.GuildText)
  );
}

export function buildAIProviderSelect(currentProvider: string): ActionRowBuilder<StringSelectMenuBuilder> {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('setup_ai_provider_select')
      .setPlaceholder('Select AI Provider')
      .addOptions([
        {
          label: 'Cloudflare Workers AI',
          description: 'Fast and affordable AI using Cloudflare Workers',
          value: 'cloudflare',
          emoji: '☁️',
          default: currentProvider === 'cloudflare',
        },
        {
          label: 'Google Gemini',
          description: 'Powerful AI using Google Gemini API',
          value: 'gemini',
          emoji: '💎',
          default: currentProvider === 'gemini',
        },
      ])
  );
}

export function buildAILanguageSelect(currentLang: string): ActionRowBuilder<StringSelectMenuBuilder> {
  const languages = [
    { code: 'ru', name: 'Russian', emoji: '🇷🇺' },
    { code: 'en', name: 'English', emoji: '🇺🇸' },
    { code: 'de', name: 'German', emoji: '🇩🇪' },
    { code: 'fr', name: 'French', emoji: '🇫🇷' },
    { code: 'es', name: 'Spanish', emoji: '🇪🇸' },
    { code: 'it', name: 'Italian', emoji: '🇮🇹' },
    { code: 'pt', name: 'Portuguese', emoji: '🇵🇹' },
    { code: 'ja', name: 'Japanese', emoji: '🇯🇵' },
    { code: 'ko', name: 'Korean', emoji: '🇰🇷' },
    { code: 'zh', name: 'Chinese', emoji: '🇨🇳' },
    { code: 'uk', name: 'Ukrainian', emoji: '🇺🇦' },
    { code: 'pl', name: 'Polish', emoji: '🇵🇱' },
  ];

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('setup_ai_language_select')
      .setPlaceholder('Select Default Translation Language')
      .addOptions(
        languages.map(lang => ({
          label: lang.name,
          value: lang.code,
          emoji: lang.emoji,
          default: currentLang === lang.code,
        }))
      )
  );
}

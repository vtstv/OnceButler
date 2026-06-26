// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Image Generation Setup Builder
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

export function buildImageGenSettings(settings: GuildSettings, guild: any): SetupView {
  const channelName = settings.imageGenChannelId
    ? guild?.channels.cache.get(settings.imageGenChannelId)?.name ?? 'Unknown'
    : 'All Channels';

  const provider = settings.imageGenProvider ?? 'together';
  const providerNames: Record<string, string> = {
    'cloudflare': '☁️ Cloudflare FLUX',
    'together': '🚀 Together AI FLUX',
    'gemini': '✨ Google Gemini',
  };
  const providerColors: Record<string, number> = {
    'cloudflare': 0xF48120,
    'together': 0x0EA5E9,
    'gemini': 0x4285F4,
  };
  const providerName = providerNames[provider] || '🤖 AI';
  const providerColor = providerColors[provider] || 0x7C3AED;

  // Different help based on provider
  const apiHelpMap: Record<string, string> = {
    'cloudflare': '1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)\n2. Navigate to AI → Workers AI\n3. Create an API Token with AI permissions\n4. Copy your Account ID from the URL',
    'together': '1. Go to [together.ai](https://api.together.xyz)\n2. Sign up (free $5 credits)\n3. Create API Key\n4. ~500 free images',
    'gemini': '1. Go to [Google AI Studio](https://aistudio.google.com/apikey)\n2. Create API Key\n3. Free: 500 images/day\n⚠️ Not available in EEA/UK/Switzerland',
  };
  const apiHelp = apiHelpMap[provider] || apiHelpMap['together'];

  const embed = new EmbedBuilder()
    .setTitle('🎨 Image Generation Settings')
    .setDescription('Configure AI image generation. Users can generate images with `/imagine`.')
    .setColor(providerColor)
    .addFields(
      { 
        name: '📊 Status', 
        value: settings.enableImageGen ? '✅ Enabled' : '❌ Disabled', 
        inline: true 
      },
      { 
        name: '🤖 Provider', 
        value: providerName, 
        inline: true 
      },
      { 
        name: '🔑 API Key', 
        value: settings.imageGenApiKey ? '✅ Configured' : '❌ Not set', 
        inline: true 
      },
      { 
        name: '📍 Channel', 
        value: settings.imageGenChannelId ? `#${channelName}` : '🌐 All Channels', 
        inline: true 
      },
      { 
        name: '👤 User Daily Limit', 
        value: `${settings.imageGenUserDailyLimit} images/day`, 
        inline: true 
      },
      { 
        name: '🏠 Server Daily Limit', 
        value: `${settings.imageGenGuildDailyLimit} images/day`, 
        inline: true 
      },
    );

  // Only show Account ID for Cloudflare
  if (provider === 'cloudflare') {
    embed.addFields({ 
      name: '🆔 Account ID', 
      value: settings.imageGenAccountId ? '✅ Configured' : '❌ Not set', 
      inline: true 
    });
  }

  // Only show Gemini method for Gemini provider
  if (provider === 'gemini') {
    const method = settings.imageGenGeminiMethod ?? 'api';
    const methodLabel = method === 'api' ? '📡 REST API' : '🔧 Vertex SDK';
    embed.addFields({ 
      name: '⚙️ Gemini Method', 
      value: methodLabel, 
      inline: true 
    });
  }

  embed.addFields({
    name: `📝 ${providerName.split(' ')[1]} Setup`,
    value: apiHelp,
    inline: false
  });

  // Add note about Vertex SDK requirements
  if (provider === 'gemini' && settings.imageGenGeminiMethod === 'vertex') {
    embed.addFields({
      name: '⚠️ Vertex SDK Requirements',
      value: '**Vertex SDK uses Imagen 3.0 (not Gemini models):**\n' +
             '• Service account JSON file\n' +
             '• `GOOGLE_APPLICATION_CREDENTIALS` environment variable\n' +
             '• Vertex AI User role permissions\n' +
             '• Model: `imagen-3.0-fast-generate-001`\n' +
             '• **Not configurable via Discord** - requires server access\n\n' +
             '💡 Use **REST API method** for Gemini image models with AI Studio keys.',
      inline: false
    });
  }

  const row1 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_toggle_imagegen')
        .setLabel(settings.enableImageGen ? '⏸️ Disable' : '▶️ Enable')
        .setStyle(settings.enableImageGen ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('setup_imagegen_api')
        .setLabel('🔑 Set API Key')
        .setStyle(ButtonStyle.Primary),
      ...(provider === 'cloudflare' ? [
        new ButtonBuilder()
          .setCustomId('setup_imagegen_account')
          .setLabel('🆔 Set Account ID')
          .setStyle(ButtonStyle.Primary),
      ] : []),
      new ButtonBuilder()
        .setCustomId('setup_back')
        .setLabel('◀️ Back')
        .setStyle(ButtonStyle.Secondary),
    );

  const providerSelect = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('setup_imagegen_provider')
        .setPlaceholder('🤖 Select Provider')
        .addOptions([
          { 
            label: 'Together AI FLUX', 
            value: 'together', 
            description: 'Free tier: ~500 images',
            emoji: '🚀',
            default: provider === 'together'
          },
          { 
            label: 'Google Gemini', 
            value: 'gemini', 
            description: 'Free: 500 images/day (not in EEA)',
            emoji: '✨',
            default: provider === 'gemini'
          },
          { 
            label: 'Cloudflare FLUX', 
            value: 'cloudflare', 
            description: 'Free tier: 10K neurons/day',
            emoji: '☁️',
            default: provider === 'cloudflare'
          },
        ])
    );

  const channelSelect = new ActionRowBuilder<ChannelSelectMenuBuilder>()
    .addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('setup_imagegen_channel')
        .setPlaceholder('📍 Restrict to Channel (optional)')
        .addChannelTypes(ChannelType.GuildText)
    );

  const userLimitSelect = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('setup_imagegen_user_limit')
        .setPlaceholder('👤 User Daily Limit')
        .addOptions([
          { label: '5 images/day', value: '5', description: 'Very limited' },
          { label: '10 images/day', value: '10', description: 'Limited', default: settings.imageGenUserDailyLimit === 10 },
          { label: '25 images/day', value: '25', description: 'Moderate' },
          { label: '50 images/day', value: '50', description: 'Generous' },
          { label: '100 images/day', value: '100', description: 'Very generous' },
        ])
    );

  const guildLimitSelect = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('setup_imagegen_guild_limit')
        .setPlaceholder('🏠 Server Daily Limit')
        .addOptions([
          { label: '50 images/day', value: '50', description: 'Very limited' },
          { label: '100 images/day', value: '100', description: 'Limited', default: settings.imageGenGuildDailyLimit === 100 },
          { label: '250 images/day', value: '250', description: 'Moderate' },
          { label: '500 images/day', value: '500', description: 'Generous' },
          { label: '1000 images/day', value: '1000', description: 'Very generous' },
        ])
    );

  // Only show Gemini method selector when Gemini is selected
  const components: any[] = [row1, providerSelect, userLimitSelect, guildLimitSelect];
  
  if (provider === 'gemini') {
    const methodSelect = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('setup_imagegen_gemini_method')
          .setPlaceholder('⚙️ Gemini Method')
          .addOptions([
            { 
              label: 'REST API', 
              value: 'api', 
              description: 'AI Studio API key (recommended)',
              emoji: '📡',
              default: settings.imageGenGeminiMethod === 'api'
            },
            { 
              label: 'Vertex SDK', 
              value: 'vertex', 
              description: 'Imagen 3.0 via service account',
              emoji: '🔧',
              default: settings.imageGenGeminiMethod === 'vertex'
            },
          ])
      );
    components.push(methodSelect);
  }

  return {
    embeds: [embed],
    components: components,
  };
}

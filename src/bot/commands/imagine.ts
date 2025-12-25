// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Image Generation Command
// Licensed under MIT License

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  AttachmentBuilder,
} from 'discord.js';
import { getGuildSettings, GuildSettings } from '../../database/repositories/settingsRepo.js';
import { 
  getImageGenUsage, 
  incrementImageGenUsage,
  getGuildImageGenStats,
  incrementGuildImageGenStats,
} from '../../database/repositories/imageGenRepo.js';

const ASPECT_RATIOS: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '16:9': { width: 1024, height: 576 },
  '9:16': { width: 576, height: 1024 },
  '4:3': { width: 1024, height: 768 },
  '3:4': { width: 768, height: 1024 },
};

interface GenerationResult {
  success: boolean;
  imageBuffer?: Buffer;
  error?: string;
}

async function generateWithCloudflare(
  prompt: string, 
  dimensions: { width: number; height: number },
  steps: number,
  settings: GuildSettings
): Promise<GenerationResult> {
  if (!settings.imageGenApiKey || !settings.imageGenAccountId) {
    return { success: false, error: 'Cloudflare API credentials not configured.' };
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${settings.imageGenAccountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.imageGenApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          width: dimensions.width,
          height: dimensions.height,
          num_steps: steps,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as any;
      console.error('[IMAGINE] Cloudflare API error:', response.status, errorData);
      
      if (response.status === 401) {
        return { success: false, error: 'Invalid Cloudflare API credentials.' };
      }
      if (response.status === 429) {
        return { success: false, error: 'Rate limit exceeded. Please try again later.' };
      }
      if (response.status === 400) {
        const errorMsg = errorData?.errors?.[0]?.message || '';
        if (errorMsg.includes('NSFW')) {
          return { success: false, error: '🚫 Prompt blocked by safety filter. Try a different prompt.' };
        }
        return { success: false, error: 'Invalid request. Try a simpler prompt.' };
      }
      return { success: false, error: `Cloudflare API error: ${response.status}` };
    }

    const data = await response.json() as any;
    
    if (!data.result?.image) {
      console.error('[IMAGINE] Cloudflare response missing image:', data);
      return { success: false, error: 'No image in Cloudflare response.' };
    }

    const imageBuffer = Buffer.from(data.result.image, 'base64');
    return { success: true, imageBuffer };
  } catch (error) {
    console.error('[IMAGINE] Cloudflare error:', error);
    return { success: false, error: 'Failed to connect to Cloudflare API.' };
  }
}

async function generateWithTogetherAI(
  prompt: string,
  dimensions: { width: number; height: number },
  steps: number,
  settings: GuildSettings
): Promise<GenerationResult> {
  if (!settings.imageGenApiKey) {
    return { success: false, error: 'Together AI API key not configured.' };
  }

  try {
    const response = await fetch(
      'https://api.together.xyz/v1/images/generations',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.imageGenApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'black-forest-labs/FLUX.1-schnell-Free',
          prompt: prompt,
          width: dimensions.width,
          height: dimensions.height,
          steps: steps,
          n: 1,
          response_format: 'b64_json',
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[IMAGINE] Together AI error:', errorData);
      
      if (response.status === 401) {
        return { success: false, error: 'Invalid Together AI API key.' };
      }
      if (response.status === 429) {
        return { success: false, error: 'Rate limit exceeded. Please try again later.' };
      }
      if (response.status === 402) {
        return { success: false, error: 'Together AI credits exhausted. Add billing or get more credits.' };
      }
      return { success: false, error: `Together AI error: ${response.status}` };
    }

    const data = await response.json() as any;
    
    if (!data.data || data.data.length === 0 || !data.data[0].b64_json) {
      return { success: false, error: 'No image in response.' };
    }

    const imageBuffer = Buffer.from(data.data[0].b64_json, 'base64');
    return { success: true, imageBuffer };
  } catch (error) {
    console.error('[IMAGINE] Together AI error:', error);
    return { success: false, error: 'Failed to connect to Together AI.' };
  }
}

async function generateWithGemini(
  prompt: string,
  dimensions: { width: number; height: number },
  settings: GuildSettings
): Promise<GenerationResult> {
  if (!settings.imageGenApiKey) {
    return { success: false, error: 'Google Gemini API key not configured.' };
  }

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/openai/images/generations',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.imageGenApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'imagen-3.0-generate-002',
          prompt: prompt,
          width: dimensions.width,
          height: dimensions.height,
          response_format: 'b64_json',
          n: 1,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as any;
      console.error('[IMAGINE] Gemini API error:', response.status, errorData);
      
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: 'Invalid Google Gemini API key.' };
      }
      if (response.status === 429) {
        const msg = errorData?.error?.message || '';
        if (msg.includes('limit: 0')) {
          return { success: false, error: '🚫 Image generation not available for your region (EEA/UK). Try Cloudflare or Together AI.' };
        }
        return { success: false, error: 'Rate limit exceeded. Please try again in a minute.' };
      }
      if (response.status === 400) {
        return { success: false, error: 'Invalid prompt or blocked by safety filters.' };
      }
      return { success: false, error: `Gemini API error: ${response.status}` };
    }

    const data = await response.json() as any;
    
    if (!data.data || data.data.length === 0 || !data.data[0].b64_json) {
      return { success: false, error: 'No image in response.' };
    }

    const imageBuffer = Buffer.from(data.data[0].b64_json, 'base64');
    return { success: true, imageBuffer };
  } catch (error) {
    console.error('[IMAGINE] Gemini error:', error);
    return { success: false, error: 'Failed to connect to Gemini API.' };
  }
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const userId = interaction.user.id;
  const settings = getGuildSettings(guildId);

  if (!settings.enableImageGen) {
    await interaction.reply({
      content: '❌ Image generation is not enabled on this server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!settings.imageGenApiKey) {
    await interaction.reply({
      content: '❌ Image generation is not configured. Please ask an admin to set up the API key in `/setup`.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (settings.imageGenChannelId && interaction.channelId !== settings.imageGenChannelId) {
    await interaction.reply({
      content: `❌ Image generation is only allowed in <#${settings.imageGenChannelId}>.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const userUsage = getImageGenUsage(guildId, userId);
  if (userUsage.generationsToday >= settings.imageGenUserDailyLimit) {
    await interaction.reply({
      content: `❌ You've reached your daily limit of **${settings.imageGenUserDailyLimit}** generations. Try again tomorrow!`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const guildStats = getGuildImageGenStats(guildId);
  if (guildStats.generationsToday >= settings.imageGenGuildDailyLimit) {
    await interaction.reply({
      content: `❌ This server has reached its daily limit of **${settings.imageGenGuildDailyLimit}** generations. Try again tomorrow!`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const prompt = interaction.options.getString('prompt', true);
  const aspect = interaction.options.getString('aspect') ?? '1:1';
  const steps = interaction.options.getInteger('steps') ?? 4;
  const dimensions = ASPECT_RATIOS[aspect];

  await interaction.deferReply();

  let result: GenerationResult;
  const provider = settings.imageGenProvider;

  if (provider === 'cloudflare') {
    result = await generateWithCloudflare(prompt, dimensions, steps, settings);
  } else if (provider === 'gemini') {
    result = await generateWithGemini(prompt, settings);
  } else {
    result = await generateWithTogetherAI(prompt, dimensions, steps, settings);
  }

  if (!result.success || !result.imageBuffer) {
    await interaction.editReply({
      content: `❌ ${result.error || 'Failed to generate image.'}`,
    });
    return;
  }

  incrementImageGenUsage(guildId, userId);
  incrementGuildImageGenStats(guildId);

  const newUserUsage = getImageGenUsage(guildId, userId);
  const newGuildStats = getGuildImageGenStats(guildId);

  const attachment = new AttachmentBuilder(result.imageBuffer, { name: 'generated.png' });
  
  const providerNames: Record<string, string> = {
    'cloudflare': '☁️ Cloudflare FLUX',
    'gemini': '✨ Google Gemini',
    'together': '🚀 Together AI FLUX',
  };
  const providerColors: Record<string, number> = {
    'cloudflare': 0xF48120,
    'gemini': 0x4285F4,
    'together': 0x0EA5E9,
  };
  const providerName = providerNames[provider] || '🤖 AI';
  
  const embed = new EmbedBuilder()
    .setTitle('🎨 Image Generated')
    .setDescription(`**Prompt:** ${prompt.length > 200 ? prompt.slice(0, 200) + '...' : prompt}`)
    .setImage('attachment://generated.png')
    .setColor(providerColors[provider] || 0x7C3AED)
    .addFields(
      { name: '🤖 Provider', value: providerName, inline: true },
      { name: '📐 Aspect', value: aspect, inline: true },
      { name: '👤 Your Usage', value: `${newUserUsage.generationsToday}/${settings.imageGenUserDailyLimit} today`, inline: true },
    )
    .setFooter({ 
      text: `Generated by ${interaction.user.username} • Server: ${newGuildStats.generationsToday}/${settings.imageGenGuildDailyLimit} today`,
      iconURL: interaction.user.displayAvatarURL(),
    })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed], files: [attachment] });
}

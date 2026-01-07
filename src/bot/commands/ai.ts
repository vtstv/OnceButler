// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - AI Commands (/ai and /translate)
// Licensed under MIT License

import { ChatInputCommandInteraction, MessageFlags, Guild } from 'discord.js';
import { getGuildSettings } from '../../database/repositories/settingsRepo.js';
import { chat, translate, isProviderConfigured, AIConfig, LANGUAGE_CODES } from '../../ai/index.js';

function splitMessage(content: string, maxLength = 2000): string[] {
  const messages: string[] = [];
  let remaining = content;
  
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      messages.push(remaining);
      break;
    }
    
    // Find a good break point
    let breakPoint = remaining.lastIndexOf('\n', maxLength);
    if (breakPoint === -1 || breakPoint < maxLength * 0.5) {
      breakPoint = remaining.lastIndexOf(' ', maxLength);
    }
    if (breakPoint === -1 || breakPoint < maxLength * 0.5) {
      breakPoint = maxLength;
    }
    
    messages.push(remaining.substring(0, breakPoint));
    remaining = remaining.substring(breakPoint).trimStart();
  }
  
  return messages;
}

async function getAIConfig(guildId: string): Promise<AIConfig | null> {
  const settings = getGuildSettings(guildId);
  
  if (!settings.enableAI) {
    return null;
  }
  
  if (!isProviderConfigured(settings.aiProvider, settings.aiApiKey, settings.aiAccountId)) {
    return null;
  }
  
  return {
    provider: settings.aiProvider,
    apiKey: settings.aiApiKey!,
    accountId: settings.aiAccountId ?? undefined,
  };
}

function isChannelAllowed(guildId: string, channelId: string, commandType: 'ai' | 'translate'): boolean {
  const settings = getGuildSettings(guildId);
  
  if (commandType === 'ai') {
    // If AI allowed everywhere, permit
    if (settings.aiAllowAllChannels) return true;
    // Otherwise check if current channel is the designated AI channel
    return settings.aiChannelId === channelId;
  }
  
  // For translate, check if allowed everywhere or in designated channel
  if (settings.aiAllowAllChannels) return true;
  return settings.aiChannelId === channelId;
}

export async function handleAICommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;
  
  if (!guildId) {
    await interaction.reply({ 
      content: '❌ This command can only be used in a server.', 
      flags: MessageFlags.Ephemeral 
    });
    return;
  }
  
  const settings = getGuildSettings(guildId);
  
  if (!settings.enableAI) {
    await interaction.reply({ 
      content: '❌ AI module is not enabled on this server.', 
      flags: MessageFlags.Ephemeral 
    });
    return;
  }
  
  if (!isChannelAllowed(guildId, interaction.channelId, 'ai')) {
    const channelMention = settings.aiChannelId ? `<#${settings.aiChannelId}>` : 'a designated channel';
    await interaction.reply({ 
      content: `❌ This command can only be used in ${channelMention}.`, 
      flags: MessageFlags.Ephemeral 
    });
    return;
  }
  
  const config = await getAIConfig(guildId);
  if (!config) {
    await interaction.reply({ 
      content: '❌ AI is not configured properly. Please contact a server administrator.', 
      flags: MessageFlags.Ephemeral 
    });
    return;
  }
  
  const prompt = interaction.options.getString('prompt', true);
  
  await interaction.deferReply();
  
  try {
    const response = await chat(config, {
      prompt,
      systemPrompt: 'You are a helpful AI assistant on a Discord server. Be concise but friendly. Format your responses for Discord when appropriate (use markdown, emojis, etc.).',
      maxTokens: 2048,
    });
    
    if (!response.success) {
      await interaction.editReply(`❌ AI Error: ${response.error}`);
      return;
    }
    
    const content = response.content ?? 'No response generated.';
    const messages = splitMessage(content);
    
    // Send first message as reply
    await interaction.editReply(messages[0]);
    
    // Send additional messages as follow-ups
    for (let i = 1; i < messages.length; i++) {
      await interaction.followUp(messages[i]);
    }
  } catch (error) {
    console.error('[AI CMD] Error:', error);
    await interaction.editReply('❌ An error occurred while processing your request.');
  }
}

export async function handleTranslateCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;
  const settings = guildId ? getGuildSettings(guildId) : null;
  
  // Check if DMs are allowed
  if (!guildId) {
    // DM command - need to find a guild where user is member and AI is enabled
    await interaction.reply({ 
      content: '❌ Translation in DMs requires being on a server with the bot. Use this command in a server channel instead.', 
      flags: MessageFlags.Ephemeral 
    });
    return;
  }
  
  if (!settings?.enableAI) {
    await interaction.reply({ 
      content: '❌ AI module is not enabled on this server.', 
      flags: MessageFlags.Ephemeral 
    });
    return;
  }
  
  const config = await getAIConfig(guildId);
  if (!config) {
    await interaction.reply({ 
      content: '❌ AI is not configured properly. Please contact a server administrator.', 
      flags: MessageFlags.Ephemeral 
    });
    return;
  }
  
  const text = interaction.options.getString('text', true);
  const targetLang = interaction.options.getString('language') ?? settings.aiDefaultTranslateLanguage;
  
  // Validate language code
  const langName = LANGUAGE_CODES[targetLang.toLowerCase()];
  if (!langName && targetLang.length !== 2) {
    await interaction.reply({ 
      content: `❌ Invalid language code: \`${targetLang}\`. Use 2-letter codes like: ru, en, de, fr, es, etc.`, 
      flags: MessageFlags.Ephemeral 
    });
    return;
  }
  
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  
  try {
    const response = await translate(config, {
      text,
      targetLanguage: targetLang,
    });
    
    if (!response.success) {
      await interaction.editReply(`❌ Translation Error: ${response.error}`);
      return;
    }
    
    const content = response.content ?? 'No translation generated.';
    const displayLang = langName ?? targetLang.toUpperCase();
    const header = `🌐 **Translation to ${displayLang}:**\n\n`;
    const messages = splitMessage(header + content);
    
    // Send first message as reply
    await interaction.editReply(messages[0]);
    
    // Send additional messages as follow-ups (ephemeral)
    for (let i = 1; i < messages.length; i++) {
      await interaction.followUp({ content: messages[i], flags: MessageFlags.Ephemeral });
    }
  } catch (error) {
    console.error('[TRANSLATE CMD] Error:', error);
    await interaction.editReply('❌ An error occurred while translating.');
  }
}

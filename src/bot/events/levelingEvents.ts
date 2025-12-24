// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Leveling Event Handlers
// Licensed under MIT License

import { 
  Message,
  GuildMember,
  TextChannel,
  EmbedBuilder,
} from 'discord.js';
import { getGuildSettings } from '../../database/repositories/settingsRepo.js';
import { 
  addXp, 
  getMemberLevel, 
  getLevelRolesForLevel,
  canGainXp,
  getXpForLevel,
} from '../../database/repositories/levelingRepo.js';

export async function handleMessageXp(message: Message): Promise<void> {
  if (!message.guild) return;
  if (message.author.bot) return;

  const settings = getGuildSettings(message.guild.id);
  if (!settings.enableLeveling) return;

  const guildId = message.guild.id;
  const userId = message.author.id;

  if (!canGainXp(guildId, userId, settings.levelingXpCooldown)) return;

  const xpAmount = Math.floor(settings.levelingXpPerMessage * (0.8 + Math.random() * 0.4));
  const result = addXp(guildId, userId, xpAmount, 'message');

  if (result.leveledUp) {
    await handleLevelUp(message.guild, message.member!, result.newLevel, settings, message.channel as TextChannel);
  }
}

export async function handleVoiceXp(guildId: string, userId: string, minutes: number): Promise<void> {
  const settings = getGuildSettings(guildId);
  if (!settings.enableLeveling) return;

  const xpAmount = settings.levelingXpPerVoiceMinute * minutes;
  const result = addXp(guildId, userId, xpAmount, 'voice');

  if (result.leveledUp) {
    const guild = (await import('../../bot/client.js')).client.guilds.cache.get(guildId);
    if (!guild) return;

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    const channelId = settings.levelingAnnouncementChannelId;
    const channel = channelId ? guild.channels.cache.get(channelId) as TextChannel : null;
    
    await handleLevelUp(guild, member, result.newLevel, settings, channel);
  }
}

async function handleLevelUp(
  guild: any,
  member: GuildMember,
  newLevel: number,
  settings: any,
  channel: TextChannel | null
): Promise<void> {
  const levelRoles = getLevelRolesForLevel(guild.id, newLevel);
  
  if (levelRoles.length > 0) {
    const rolesToAdd = levelRoles.map(lr => lr.roleId);
    
    if (settings.levelingStackRoles) {
      for (const roleId of rolesToAdd) {
        const role = guild.roles.cache.get(roleId);
        if (role && !member.roles.cache.has(roleId)) {
          await member.roles.add(role, `Level ${newLevel} reached`).catch(() => {});
        }
      }
    } else {
      const highestLevelRole = levelRoles[levelRoles.length - 1];
      const role = guild.roles.cache.get(highestLevelRole.roleId);
      
      for (const lr of levelRoles.slice(0, -1)) {
        if (member.roles.cache.has(lr.roleId)) {
          await member.roles.remove(lr.roleId, 'Level role replaced').catch(() => {});
        }
      }
      
      if (role && !member.roles.cache.has(role.id)) {
        await member.roles.add(role, `Level ${newLevel} reached`).catch(() => {});
      }
    }
  }

  if (!settings.levelingAnnounceLevelUp || !channel) return;

  const memberData = getMemberLevel(guild.id, member.id);
  const xpNeeded = getXpForLevel(newLevel + 1);
  const voiceHours = Math.floor(memberData.voiceMinutes / 60);
  const voiceRemainderMins = memberData.voiceMinutes % 60;
  const voiceTimeFormatted = voiceHours > 0 
    ? `${voiceHours}h ${voiceRemainderMins}m`
    : `${voiceRemainderMins}m`;
  
  const embed = new EmbedBuilder()
    .setTitle('🎉 Level Up!')
    .setDescription(`Congratulations ${member}! You've reached **Level ${newLevel}**!`)
    .setColor(0xF1C40F)
    .setThumbnail(member.displayAvatarURL())
    .addFields(
      { name: '📊 Progress', value: `${memberData.xp}/${xpNeeded} XP to next level`, inline: true },
      { name: '💬 Messages', value: memberData.messagesCount.toLocaleString(), inline: true },
      { name: '🎤 Voice Time', value: voiceTimeFormatted, inline: true },
    )
    .setTimestamp();

  if (levelRoles.length > 0) {
    const roleNames = levelRoles
      .map(lr => guild.roles.cache.get(lr.roleId)?.name)
      .filter(Boolean)
      .join(', ');
    embed.addFields({ name: '🎭 Role Unlocked', value: roleNames || 'None', inline: false });
  }

  await channel.send({ embeds: [embed] }).catch(() => {});
}

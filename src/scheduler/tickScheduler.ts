// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Tick Scheduler
// Licensed under MIT License

import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { env } from '../config/env.js';
import { processGuildTick } from '../stats/statTick.js';
import { processAutoLeaderboards } from './leaderboardScheduler.js';
import { evaluateAllMembersInGuild } from '../roles/customRolesEngine.js';
import { getActiveGiveaways, selectWinners, endGiveaway } from '../database/repositories/giveawaysRepo.js';

let tickInterval: NodeJS.Timeout | null = null;
let customRolesCounter = 0; // Process custom roles every 5th tick
let giveawayCounter = 0; // Process giveaways every 3rd tick

export function startTickScheduler(client: Client): void {
  if (tickInterval) return;

  console.log(`Starting tick scheduler (interval: ${env.tickIntervalMs}ms)`);

  tickInterval = setInterval(async () => {
    try {
      await processGuildTick(client);
      await processAutoLeaderboards(client);
      
      // Process custom roles every 5th tick to reduce load
      customRolesCounter++;
      if (customRolesCounter >= 5) {
        customRolesCounter = 0;
        for (const guild of client.guilds.cache.values()) {
          await evaluateAllMembersInGuild(guild);
        }
      }
      
      // Process expired giveaways every 3rd tick
      giveawayCounter++;
      if (giveawayCounter >= 3) {
        giveawayCounter = 0;
        await processExpiredGiveaways(client);
      }
    } catch (err) {
      console.error('Tick scheduler error:', err);
    }
  }, env.tickIntervalMs);
}

async function processExpiredGiveaways(client: Client): Promise<void> {
  const now = Date.now();
  
  for (const guild of client.guilds.cache.values()) {
    const activeGiveaways = getActiveGiveaways(guild.id);
    
    for (const giveaway of activeGiveaways) {
      const endsAtMs = new Date(giveaway.endsAt).getTime();
      if (endsAtMs <= now) {
        try {
          // Select winners
          const winners = selectWinners(giveaway.id, giveaway.winnersCount);
          endGiveaway(giveaway.id, winners);
          
          // Get channel and message
          const channel = await client.channels.fetch(giveaway.channelId).catch(() => null) as TextChannel | null;
          if (!channel) continue;
          
          const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
          if (!message) continue;
          
          // Update embed
          const embed = EmbedBuilder.from(message.embeds[0])
            .setColor(0x808080)
            .setTitle('🎉 Giveaway Ended!')
            .setFooter({ text: 'Giveaway ended' });
          
          if (winners.length > 0) {
            const winnerMentions = winners.map(w => `<@${w}>`).join(', ');
            embed.setDescription(`**Prize:** ${giveaway.prize}\n\n🏆 **Winners:** ${winnerMentions}`);
            
            // Send winner announcement
            await channel.send({
              content: `🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`,
            });
          } else {
            embed.setDescription(`**Prize:** ${giveaway.prize}\n\n😢 No participants - no winners!`);
          }
          
          await message.edit({ embeds: [embed], components: [] });
          
          console.log(`[GIVEAWAY] Auto-ended giveaway ${giveaway.id} in ${guild.name}`);
        } catch (err) {
          console.error(`[GIVEAWAY] Failed to end giveaway ${giveaway.id}:`, err);
        }
      }
    }
  }
}

export function stopTickScheduler(): void {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
    console.log('Tick scheduler stopped');
  }
}

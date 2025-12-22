import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { createTrigger, listGuildTriggers, deactivateTrigger } from '../../database/repositories/triggersRepo.js';
import { t } from '../../utils/i18n.js';
import { getLocale, hasAdminPermission } from './utils.js';

export async function handleTriggerCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  if (!interaction.guild) {
    await interaction.reply({ content: t(locale, 'common.serverOnly'), flags: MessageFlags.Ephemeral });
    return;
  }

  if (!hasAdminPermission(interaction)) {
    await interaction.reply({ content: t(locale, 'common.noPermission'), flags: MessageFlags.Ephemeral });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'create': {
      const name = interaction.options.getString('name', true);
      const stat = interaction.options.getString('stat', true) as 'mood' | 'energy' | 'activity';
      const modifier = interaction.options.getNumber('modifier', true);
      const duration = interaction.options.getInteger('duration') ?? null;

      const id = createTrigger(interaction.guild.id, name, stat, modifier, duration);
      const durationText = duration 
        ? t(locale, 'trigger.durationMinutes', { minutes: duration.toString() })
        : t(locale, 'trigger.permanent');
      const modifierText = `${modifier > 0 ? '+' : ''}${modifier}`;
      await interaction.reply({
        content: t(locale, 'trigger.create.success', { name, id: id.toString(), stat, modifier: modifierText, duration: durationText }),
        flags: MessageFlags.Ephemeral,
      });
      break;
    }
    case 'list': {
      const triggers = listGuildTriggers(interaction.guild.id);
      if (triggers.length === 0) {
        await interaction.reply({ content: t(locale, 'trigger.list.empty'), flags: MessageFlags.Ephemeral });
        return;
      }

      const lines = triggers.map(tr => {
        const status = tr.active ? '🟢' : '🔴';
        const expires = tr.expiresAt 
          ? ` (${t(locale, 'trigger.expires')} <t:${Math.floor(tr.expiresAt / 1000)}:R>)` 
          : ` (${t(locale, 'trigger.permanent')})`;
        return `${status} **#${tr.id}** ${tr.name} — ${tr.statType} ${tr.modifier > 0 ? '+' : ''}${tr.modifier}${expires}`;
      });

      await interaction.reply({ content: `**${t(locale, 'trigger.list.title')}**\n${lines.join('\n')}`, flags: MessageFlags.Ephemeral });
      break;
    }
    case 'stop': {
      const id = interaction.options.getInteger('id', true);
      const stopped = deactivateTrigger(id);
      if (stopped) {
        await interaction.reply({ content: t(locale, 'trigger.stop.success', { id: id.toString() }), flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: t(locale, 'trigger.stop.notFound', { id: id.toString() }), flags: MessageFlags.Ephemeral });
      }
      break;
    }
  }
}

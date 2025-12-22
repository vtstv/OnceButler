import {
  Interaction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  GuildMember,
  MessageFlags,
} from 'discord.js';
import { getRoles, addRole, removeRole, loadRoles } from '../roles/roleStore.js';
import { importRolesToGuild, exportRolesFromGuild } from '../roles/roleImporter.js';
import { purgeAllRoles, countManagedRoles } from '../roles/roleEngine.js';
import { getMemberStats, getAllGuildMembers } from '../database/repositories/memberStatsRepo.js';
import { getMemberProgress } from '../database/repositories/progressRepo.js';
import { getUserAchievements, ACHIEVEMENTS } from '../database/repositories/achievementsRepo.js';
import { createTrigger, listGuildTriggers, deactivateTrigger } from '../database/repositories/triggersRepo.js';
import { 
  getGuildLanguage, 
  setGuildLanguage, 
  getManagerRoles, 
  addManagerRole, 
  removeManagerRole,
  isManager,
  getGuildRolePreset,
  setGuildRolePreset,
} from '../database/repositories/settingsRepo.js';
import { t, isValidLocale, getLocaleName, type Locale } from '../utils/i18n.js';
import { getAvailablePresets, clearPresetCache } from '../roles/roleStore.js';
import type { RoleCategory, RoleDefinition } from '../roles/types.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Manage OnceButler roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('list').setDescription('List all managed roles'))
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add or update a role definition')
        .addStringOption(opt => opt.setName('name').setDescription('Role name').setRequired(true))
        .addStringOption(opt =>
          opt.setName('category')
            .setDescription('Role category')
            .setRequired(true)
            .addChoices(
              { name: 'mood', value: 'mood' },
              { name: 'energy', value: 'energy' },
              { name: 'activity', value: 'activity' },
              { name: 'time', value: 'time' },
              { name: 'chaos', value: 'chaos' },
            ))
        .addIntegerOption(opt => opt.setName('priority').setDescription('Priority (higher = better)').setRequired(true))
        .addBooleanOption(opt => opt.setName('temporary').setDescription('Is temporary role'))
        .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes (for temp roles)')))
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a role from JSON storage')
        .addStringOption(opt => opt.setName('name').setDescription('Role name').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('import').setDescription('Import roles from JSON to Discord'))
    .addSubcommand(sub =>
      sub.setName('export').setDescription('Export Discord roles to JSON'))
    .addSubcommand(sub =>
      sub.setName('reload').setDescription('Reload role definitions from disk'))
    .addSubcommand(sub =>
      sub.setName('purge').setDescription('Delete ALL bot-managed roles from Discord')),

  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View your current stats'),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server leaderboard')
    .addStringOption(opt =>
      opt.setName('stat')
        .setDescription('Stat to rank by')
        .setRequired(true)
        .addChoices(
          { name: 'Mood', value: 'mood' },
          { name: 'Energy', value: 'energy' },
          { name: 'Activity', value: 'activity' },
        )),

  new SlashCommandBuilder()
    .setName('trigger')
    .setDescription('Manage custom stat triggers')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Create a new trigger')
        .addStringOption(opt => opt.setName('name').setDescription('Trigger name').setRequired(true))
        .addStringOption(opt =>
          opt.setName('stat')
            .setDescription('Stat to modify')
            .setRequired(true)
            .addChoices(
              { name: 'Mood', value: 'mood' },
              { name: 'Energy', value: 'energy' },
              { name: 'Activity', value: 'activity' },
            ))
        .addNumberOption(opt => opt.setName('modifier').setDescription('Stat modifier per tick (can be negative)').setRequired(true))
        .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes (empty = permanent)')))
    .addSubcommand(sub =>
      sub.setName('list').setDescription('List all triggers'))
    .addSubcommand(sub =>
      sub.setName('stop')
        .setDescription('Stop a trigger')
        .addIntegerOption(opt => opt.setName('id').setDescription('Trigger ID').setRequired(true))),

  new SlashCommandBuilder()
    .setName('achievements')
    .setDescription('View your achievements'),

  new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Bot settings for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('language')
        .setDescription('Set bot language for this server')
        .addStringOption(opt =>
          opt.setName('lang')
            .setDescription('Language')
            .setRequired(true)
            .addChoices(
              { name: '🇺🇸 English', value: 'en' },
              { name: '🇷🇺 Русский', value: 'ru' },
              { name: '🇩🇪 Deutsch', value: 'de' },
            )))
    .addSubcommandGroup(group =>
      group.setName('managers')
        .setDescription('Manage bot manager roles')
        .addSubcommand(sub =>
          sub.setName('add')
            .setDescription('Add a manager role')
            .addRoleOption(opt => opt.setName('role').setDescription('Role to add').setRequired(true)))
        .addSubcommand(sub =>
          sub.setName('remove')
            .setDescription('Remove a manager role')
            .addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true)))
        .addSubcommand(sub =>
          sub.setName('list')
            .setDescription('List all manager roles'))),
];

function getLocale(interaction: ChatInputCommandInteraction): Locale {
  if (!interaction.guildId) return 'en';
  const lang = getGuildLanguage(interaction.guildId);
  return isValidLocale(lang) ? lang : 'en';
}

function hasAdminPermission(interaction: ChatInputCommandInteraction): boolean {
  if (!interaction.guild || !interaction.member) return false;
  const member = interaction.member as GuildMember;
  
  // Server admin always has permission
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  
  // Check if member has a manager role
  // member.roles can be a Collection or an APIGuildMember with string array
  let memberRoleIds: string[];
  if ('cache' in member.roles) {
    memberRoleIds = member.roles.cache.map(r => r.id);
  } else {
    // API response returns array of role IDs
    memberRoleIds = member.roles as unknown as string[];
  }
  
  return isManager(interaction.guild.id, memberRoleIds);
}

export async function handleInteraction(interaction: Interaction): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  console.log(`[CMD] ${interaction.user.tag} (${interaction.user.id}) used /${interaction.commandName} in ${interaction.guild?.name ?? 'DM'}`);

  try {
    switch (interaction.commandName) {
      case 'roles':
        await handleRolesCommand(interaction);
        break;
      case 'stats':
        await handleStats(interaction);
        break;
      case 'leaderboard':
        await handleLeaderboard(interaction);
        break;
      case 'trigger':
        await handleTriggerCommand(interaction);
        break;
      case 'achievements':
        await handleAchievements(interaction);
        break;
      case 'settings':
        await handleSettingsCommand(interaction);
        break;
    }
    console.log(`[CMD] /${interaction.commandName} completed successfully`);
  } catch (error) {
    console.error(`[CMD] /${interaction.commandName} failed:`, error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'An error occurred while processing your command.', flags: MessageFlags.Ephemeral });
      }
    } catch (replyError) {
      console.error('[CMD] Failed to send error reply:', replyError);
    }
  }
}

async function handleRolesCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  
  // Check admin permission for all roles commands
  if (!hasAdminPermission(interaction)) {
    await interaction.reply({ content: t(locale, 'common.noPermission'), ephemeral: true });
    return;
  }
  
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'list':
      await handleList(interaction);
      break;
    case 'add':
      await handleAdd(interaction);
      break;
    case 'remove':
      await handleRemove(interaction);
      break;
    case 'import':
      await handleImport(interaction);
      break;
    case 'export':
      await handleExport(interaction);
      break;
    case 'reload':
      await handleReload(interaction);
      break;
    case 'purge':
      await handlePurge(interaction);
      break;
  }
}

async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  const preset = interaction.guild ? getGuildRolePreset(interaction.guild.id) : 'en';
  const roles = getRoles(preset);
  if (roles.length === 0) {
    await interaction.reply({ content: t(locale, 'roles.list.empty'), ephemeral: true });
    return;
  }

  const grouped = roles.reduce((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {} as Record<string, RoleDefinition[]>);

  let response = `**${t(locale, 'roles.list.title')}** (preset: ${preset})\n`;
  for (const [cat, list] of Object.entries(grouped)) {
    response += `\n__${cat}__\n`;
    for (const r of list) {
      const temp = r.temporary ? `, ${t(locale, 'roles.list.temp')}` : '';
      response += `• ${r.roleId} (${t(locale, 'roles.list.priority')}: ${r.priority}${temp})\n`;
    }
  }

  await interaction.reply({ content: response, ephemeral: true });
}

async function handleAdd(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  const name = interaction.options.getString('name', true);
  const category = interaction.options.getString('category', true) as RoleCategory;
  const priority = interaction.options.getInteger('priority', true);
  const temporary = interaction.options.getBoolean('temporary') ?? false;
  const duration = interaction.options.getInteger('duration') ?? null;

  addRole({ roleId: name, category, priority, temporary, durationMinutes: duration });
  await interaction.reply({ content: t(locale, 'roles.add.success', { name }), ephemeral: true });
}

async function handleRemove(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  const name = interaction.options.getString('name', true);
  const removed = removeRole(name);

  if (removed) {
    await interaction.reply({ content: t(locale, 'roles.remove.success', { name }), ephemeral: true });
  } else {
    await interaction.reply({ content: t(locale, 'roles.remove.notFound', { name }), ephemeral: true });
  }
}

async function handleImport(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  if (!interaction.guild) {
    await interaction.reply({ content: t(locale, 'common.serverOnly'), ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  const created = await importRolesToGuild(interaction.guild);

  if (created.length === 0) {
    await interaction.editReply(t(locale, 'roles.import.allExist'));
  } else {
    await interaction.editReply(t(locale, 'roles.import.success', { roles: created.join(', ') }));
  }
}

async function handleExport(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  if (!interaction.guild) {
    await interaction.reply({ content: t(locale, 'common.serverOnly'), ephemeral: true });
    return;
  }

  const exported = exportRolesFromGuild(interaction.guild);
  await interaction.reply({
    content: t(locale, 'roles.export.success', { count: exported.length.toString() }),
    ephemeral: true,
  });
}

async function handleReload(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  const roles = loadRoles();
  await interaction.reply({ content: t(locale, 'roles.reload.success', { count: roles.length.toString() }), ephemeral: true });
}

async function handlePurge(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  if (!interaction.guild) {
    await interaction.reply({ content: t(locale, 'common.serverOnly'), ephemeral: true });
    return;
  }

  const roleCount = countManagedRoles(interaction.guild);
  if (roleCount === 0) {
    await interaction.reply({ content: t(locale, 'roles.purge.noRoles'), ephemeral: true });
    return;
  }

  // Confirmation with button
  const confirmButton = new ButtonBuilder()
    .setCustomId('purge_confirm')
    .setLabel(t(locale, 'roles.purge.confirmButton', { count: roleCount.toString() }))
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId('purge_cancel')
    .setLabel(t(locale, 'common.cancel'))
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton);

  const response = await interaction.reply({
    content: t(locale, 'roles.purge.warning', { count: roleCount.toString() }),
    components: [row],
    ephemeral: true,
  });

  try {
    const buttonInteraction = await response.awaitMessageComponent({
      componentType: ComponentType.Button,
      time: 30_000,
    });

    if (buttonInteraction.customId === 'purge_confirm') {
      await buttonInteraction.update({ content: t(locale, 'roles.purge.inProgress'), components: [] });
      const deleted = await purgeAllRoles(interaction.guild);
      await buttonInteraction.editReply(t(locale, 'roles.purge.success', { count: deleted.toString() }));
    } else {
      await buttonInteraction.update({ content: t(locale, 'roles.purge.cancelled'), components: [] });
    }
  } catch {
    await interaction.editReply({ content: t(locale, 'roles.purge.timeout'), components: [] });
  }
}

async function handleStats(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({ content: t(locale, 'common.serverOnly'), ephemeral: true });
    return;
  }

  const stats = getMemberStats(interaction.guild.id, interaction.user.id);
  const progress = getMemberProgress(interaction.guild.id, interaction.user.id);

  const moodBar = createProgressBar(stats.mood);
  const energyBar = createProgressBar(stats.energy);
  const activityBar = createProgressBar(stats.activity);

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'stats.title', { user: interaction.user.displayName }))
    .setColor(0x5865F2)
    .addFields(
      { name: `😊 ${t(locale, 'stats.mood')}`, value: `${moodBar} ${stats.mood.toFixed(1)}`, inline: false },
      { name: `⚡ ${t(locale, 'stats.energy')}`, value: `${energyBar} ${stats.energy.toFixed(1)}`, inline: false },
      { name: `🎯 ${t(locale, 'stats.activity')}`, value: `${activityBar} ${stats.activity.toFixed(1)}`, inline: false },
      { name: `🎤 ${t(locale, 'stats.voiceTime')}`, value: `${Math.floor(progress.voiceMinutes / 60)}${t(locale, 'common.hours')} ${progress.voiceMinutes % 60}${t(locale, 'common.minutes')}`, inline: true },
      { name: `🟢 ${t(locale, 'stats.onlineTime')}`, value: `${Math.floor(progress.onlineMinutes / 60)}${t(locale, 'common.hours')} ${progress.onlineMinutes % 60}${t(locale, 'common.minutes')}`, inline: true },
    )
    .setTimestamp();

  if (stats.chaosRole && stats.chaosExpires > Date.now()) {
    const remaining = Math.ceil((stats.chaosExpires - Date.now()) / 60000);
    embed.addFields({ name: `🎲 ${t(locale, 'stats.chaosEffect')}`, value: `${stats.chaosRole} (${remaining}${t(locale, 'common.minutesShort')} ${t(locale, 'common.left')})`, inline: false });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

function createProgressBar(value: number): string {
  const filled = Math.round(value / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

async function handleLeaderboard(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  if (!interaction.guild) {
    await interaction.reply({ content: t(locale, 'common.serverOnly'), ephemeral: true });
    return;
  }

  const stat = interaction.options.getString('stat', true) as 'mood' | 'energy' | 'activity';
  const allStats = getAllGuildMembers(interaction.guild.id);

  const sorted = allStats
    .sort((a, b) => b[stat] - a[stat])
    .slice(0, 10);

  if (sorted.length === 0) {
    await interaction.reply({ content: t(locale, 'leaderboard.noMembers'), ephemeral: true });
    return;
  }

  const statEmoji = { mood: '😊', energy: '⚡', activity: '🎯' }[stat];
  const statName = t(locale, `stats.${stat}` as 'stats.mood' | 'stats.energy' | 'stats.activity');
  const lines: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const member = interaction.guild.members.cache.get(s.userId);
    const name = member?.displayName ?? `User ${s.userId.slice(-4)}`;
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    lines.push(`${medal} **${name}** — ${s[stat].toFixed(1)}`);
  }

  const embed = new EmbedBuilder()
    .setTitle(`${statEmoji} ${statName} ${t(locale, 'leaderboard.title')}`)
    .setColor(0x5865F2)
    .setDescription(lines.join('\n'))
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleTriggerCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  if (!interaction.guild) {
    await interaction.reply({ content: t(locale, 'common.serverOnly'), ephemeral: true });
    return;
  }

  // Check admin permission
  if (!hasAdminPermission(interaction)) {
    await interaction.reply({ content: t(locale, 'common.noPermission'), ephemeral: true });
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
        ephemeral: true,
      });
      break;
    }
    case 'list': {
      const triggers = listGuildTriggers(interaction.guild.id);
      if (triggers.length === 0) {
        await interaction.reply({ content: t(locale, 'trigger.list.empty'), ephemeral: true });
        return;
      }

      const lines = triggers.map(tr => {
        const status = tr.active ? '🟢' : '🔴';
        const expires = tr.expiresAt 
          ? ` (${t(locale, 'trigger.expires')} <t:${Math.floor(tr.expiresAt / 1000)}:R>)` 
          : ` (${t(locale, 'trigger.permanent')})`;
        return `${status} **#${tr.id}** ${tr.name} — ${tr.statType} ${tr.modifier > 0 ? '+' : ''}${tr.modifier}${expires}`;
      });

      await interaction.reply({ content: `**${t(locale, 'trigger.list.title')}**\n${lines.join('\n')}`, ephemeral: true });
      break;
    }
    case 'stop': {
      const id = interaction.options.getInteger('id', true);
      const stopped = deactivateTrigger(id);
      if (stopped) {
        await interaction.reply({ content: t(locale, 'trigger.stop.success', { id: id.toString() }), ephemeral: true });
      } else {
        await interaction.reply({ content: t(locale, 'trigger.stop.notFound', { id: id.toString() }), ephemeral: true });
      }
      break;
    }
  }
}

async function handleAchievements(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  if (!interaction.guild) {
    await interaction.reply({ content: t(locale, 'common.serverOnly'), ephemeral: true });
    return;
  }

  const userAchievements = getUserAchievements(interaction.guild.id, interaction.user.id);

  const lines = ACHIEVEMENTS.map(a => {
    const unlocked = userAchievements.includes(a.id);
    const icon = unlocked ? '✅' : '🔒';
    const reward = a.roleReward ? ` → 🏷️ ${a.roleReward}` : '';
    return `${icon} **${a.name}** — ${a.description}${reward}`;
  });

  const unlocked = userAchievements.length;
  const total = ACHIEVEMENTS.length;

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'achievements.title', { unlocked: unlocked.toString(), total: total.toString() }))
    .setColor(unlocked === total ? 0xFFD700 : 0x5865F2)
    .setDescription(lines.join('\n'))
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleSettingsCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  if (!interaction.guild) {
    await interaction.reply({ content: t(locale, 'common.serverOnly'), ephemeral: true });
    return;
  }

  const subcommandGroup = interaction.options.getSubcommandGroup();
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'language') {
    // Check admin permission
    if (!hasAdminPermission(interaction)) {
      await interaction.reply({ content: t(locale, 'common.noPermission'), ephemeral: true });
      return;
    }

    const lang = interaction.options.getString('lang', true);
    if (!isValidLocale(lang)) {
      await interaction.reply({ content: t(locale, 'settings.language.invalid'), ephemeral: true });
      return;
    }

    setGuildLanguage(interaction.guild.id, lang);
    const newLocale = lang as Locale;
    await interaction.reply({ 
      content: t(newLocale, 'settings.language.changed', { language: getLocaleName(newLocale) }), 
      ephemeral: true 
    });
    return;
  }

  if (subcommand === 'preset') {
    // Check admin permission
    if (!hasAdminPermission(interaction)) {
      await interaction.reply({ content: t(locale, 'common.noPermission'), ephemeral: true });
      return;
    }

    const preset = interaction.options.getString('preset', true);
    const availablePresets = getAvailablePresets();
    if (!availablePresets.includes(preset)) {
      await interaction.reply({ 
        content: t(locale, 'settings.preset.invalid', { presets: availablePresets.join(', ') }), 
        ephemeral: true 
      });
      return;
    }

    setGuildRolePreset(interaction.guild.id, preset);
    clearPresetCache(); // Clear cache to reload new preset
    
    const presetNames: Record<string, string> = { en: '🇺🇸 English', ru: '🇷🇺 Русский' };
    await interaction.reply({ 
      content: t(locale, 'settings.preset.changed', { preset: presetNames[preset] ?? preset }), 
      ephemeral: true 
    });
    return;
  }

  if (subcommandGroup === 'managers') {
    const member = interaction.member as GuildMember;
    // Only server admins can manage managers
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: t(locale, 'settings.managers.adminOnly'), ephemeral: true });
      return;
    }

    switch (subcommand) {
      case 'add': {
        const role = interaction.options.getRole('role', true);
        const added = addManagerRole(interaction.guild.id, role.id);
        if (added) {
          await interaction.reply({ 
            content: t(locale, 'settings.managers.added', { role: role.name }), 
            ephemeral: true 
          });
        } else {
          await interaction.reply({ 
            content: t(locale, 'settings.managers.alreadyExists', { role: role.name }), 
            ephemeral: true 
          });
        }
        break;
      }
      case 'remove': {
        const role = interaction.options.getRole('role', true);
        const removed = removeManagerRole(interaction.guild.id, role.id);
        if (removed) {
          await interaction.reply({ 
            content: t(locale, 'settings.managers.removed', { role: role.name }), 
            ephemeral: true 
          });
        } else {
          await interaction.reply({ 
            content: t(locale, 'settings.managers.notFound', { role: role.name }), 
            ephemeral: true 
          });
        }
        break;
      }
      case 'list': {
        const managerRoleIds = getManagerRoles(interaction.guild.id);
        if (managerRoleIds.length === 0) {
          await interaction.reply({ content: t(locale, 'settings.managers.empty'), ephemeral: true });
          return;
        }

        const roleNames = managerRoleIds
          .map(id => interaction.guild!.roles.cache.get(id))
          .filter(Boolean)
          .map(r => `• <@&${r!.id}>`);

        await interaction.reply({ 
          content: t(locale, 'settings.managers.list', { roles: roleNames.join('\n') }), 
          ephemeral: true 
        });
        break;
      }
    }
  }
}

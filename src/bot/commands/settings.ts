import { ChatInputCommandInteraction, GuildMember, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { 
  getGuildLanguage, 
  setGuildLanguage, 
  getManagerRoles, 
  addManagerRole, 
  removeManagerRole,
  getGuildRolePreset,
  setGuildRolePreset,
} from '../../database/repositories/settingsRepo.js';
import { t, isValidLocale, getLocaleName, type Locale } from '../../utils/i18n.js';
import { getAvailablePresets, clearPresetCache } from '../../roles/roleStore.js';
import { getLocale, hasAdminPermission } from './utils.js';

export async function handleSettingsCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  if (!interaction.guild) {
    await interaction.reply({ content: t(locale, 'common.serverOnly'), flags: MessageFlags.Ephemeral });
    return;
  }

  const subcommandGroup = interaction.options.getSubcommandGroup();
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'language') {
    if (!hasAdminPermission(interaction)) {
      await interaction.reply({ content: t(locale, 'common.noPermission'), flags: MessageFlags.Ephemeral });
      return;
    }

    const lang = interaction.options.getString('lang', true);
    if (!isValidLocale(lang)) {
      await interaction.reply({ content: t(locale, 'settings.language.invalid'), flags: MessageFlags.Ephemeral });
      return;
    }

    setGuildLanguage(interaction.guild.id, lang);
    const newLocale = lang as Locale;
    await interaction.reply({ 
      content: t(newLocale, 'settings.language.changed', { language: getLocaleName(newLocale) }), 
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (subcommand === 'preset') {
    if (!hasAdminPermission(interaction)) {
      await interaction.reply({ content: t(locale, 'common.noPermission'), flags: MessageFlags.Ephemeral });
      return;
    }

    const preset = interaction.options.getString('preset', true);
    const availablePresets = getAvailablePresets();
    if (!availablePresets.includes(preset)) {
      await interaction.reply({ 
        content: t(locale, 'settings.preset.invalid', { presets: availablePresets.join(', ') }), 
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    setGuildRolePreset(interaction.guild.id, preset);
    clearPresetCache();
    
    const presetNames: Record<string, string> = { en: '🇺🇸 English', ru: '🇷🇺 Русский' };
    await interaction.reply({ 
      content: t(locale, 'settings.preset.changed', { preset: presetNames[preset] ?? preset }), 
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (subcommandGroup === 'managers') {
    const member = interaction.member as GuildMember;
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: t(locale, 'settings.managers.adminOnly'), flags: MessageFlags.Ephemeral });
      return;
    }

    switch (subcommand) {
      case 'add': {
        const role = interaction.options.getRole('role', true);
        const added = addManagerRole(interaction.guild.id, role.id);
        if (added) {
          await interaction.reply({ 
            content: t(locale, 'settings.managers.added', { role: role.name }), 
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await interaction.reply({ 
            content: t(locale, 'settings.managers.alreadyExists', { role: role.name }), 
            flags: MessageFlags.Ephemeral,
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
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await interaction.reply({ 
            content: t(locale, 'settings.managers.notFound', { role: role.name }), 
            flags: MessageFlags.Ephemeral,
          });
        }
        break;
      }
      case 'list': {
        const managerRoleIds = getManagerRoles(interaction.guild.id);
        if (managerRoleIds.length === 0) {
          await interaction.reply({ content: t(locale, 'settings.managers.empty'), flags: MessageFlags.Ephemeral });
          return;
        }

        const roleNames = managerRoleIds
          .map(id => interaction.guild!.roles.cache.get(id))
          .filter(Boolean)
          .map(r => `• <@&${r!.id}>`);

        await interaction.reply({ 
          content: t(locale, 'settings.managers.list', { roles: roleNames.join('\n') }), 
          flags: MessageFlags.Ephemeral,
        });
        break;
      }
    }
  }
}

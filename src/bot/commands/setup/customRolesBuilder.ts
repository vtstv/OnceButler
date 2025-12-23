// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Custom Roles Settings Builder
// Licensed under MIT License

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  RoleSelectMenuBuilder,
} from 'discord.js';
import type { GuildSettings } from '../../../database/repositories/settingsRepo.js';
import { getCustomRoleRules, type CustomRoleRule } from '../../../database/repositories/customRolesRepo.js';
import type { SetupView } from './types.js';

export function buildCustomRolesSettings(settings: GuildSettings, guild: any): SetupView {
  const rules = getCustomRoleRules(guild.id);
  const enabledCount = rules.filter(r => r.enabled).length;

  const embed = new EmbedBuilder()
    .setTitle('🔧 Custom Role Rules')
    .setDescription(
      'Create custom role rules for your server!\n\n' +
      '**How it works:**\n' +
      '• Define conditions based on stats (mood, energy, activity)\n' +
      '• When a user matches the condition, they get the role\n' +
      '• Roles can be permanent or temporary\n\n' +
      `**Active Rules:** ${enabledCount}/${rules.length}`
    )
    .setColor(0x5865F2);

  if (rules.length > 0) {
    const rulesList = rules.slice(0, 10).map((rule, i) => {
      const status = rule.enabled ? '✅' : '❌';
      const temp = rule.isTemporary ? `⏱️${rule.durationMinutes}m` : '♾️';
      return `${status} **${rule.roleName}** — ${rule.statType} ${rule.operator} ${rule.value} ${temp}`;
    }).join('\n');
    
    embed.addFields({
      name: '📋 Current Rules',
      value: rulesList || 'No rules created yet.',
      inline: false,
    });
    
    if (rules.length > 10) {
      embed.setFooter({ text: `Showing 10 of ${rules.length} rules` });
    }
  } else {
    embed.addFields({
      name: '📋 Current Rules',
      value: 'No custom rules yet. Click "➕ Add Rule" to create one!',
      inline: false,
    });
  }

  const actionButtons = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_customroles_add')
        .setLabel('➕ Add Rule')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('setup_customroles_manage')
        .setLabel('📝 Manage Rules')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(rules.length === 0),
    );

  const backButton = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_cat_main')
        .setLabel('◀️ Back to Main')
        .setStyle(ButtonStyle.Secondary),
    );

  return {
    embeds: [embed],
    components: [actionButtons, backButton],
  };
}

export function buildCustomRoleAddWizard(step: number, guildId: string, wizardData: Partial<CustomRoleRule>): SetupView {
  const steps = ['Select Role', 'Select Stat', 'Select Condition', 'Set Value', 'Options', 'Confirm'];
  
  const embed = new EmbedBuilder()
    .setTitle(`🔧 Add Custom Rule — Step ${step + 1}/${steps.length}`)
    .setDescription(`**${steps[step]}**`)
    .setColor(0x5865F2)
    .setFooter({ text: `Step ${step + 1}: ${steps[step]}` });

  const components: ActionRowBuilder<any>[] = [];

  switch (step) {
    case 0: // Select Role
      embed.setDescription('Select the Discord role to assign when the condition is met.');
      const roleSelect = new RoleSelectMenuBuilder()
        .setCustomId('setup_customroles_wizard_role')
        .setPlaceholder('Select a role...');
      components.push(new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(roleSelect));
      break;

    case 1: // Select Stat
      embed.setDescription('Select which stat to check.');
      const statSelect = new StringSelectMenuBuilder()
        .setCustomId('setup_customroles_wizard_stat')
        .setPlaceholder('Select stat type...')
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel('😊 Mood').setValue('mood').setDescription('Based on user mood level'),
          new StringSelectMenuOptionBuilder().setLabel('⚡ Energy').setValue('energy').setDescription('Based on user energy level'),
          new StringSelectMenuOptionBuilder().setLabel('📊 Activity').setValue('activity').setDescription('Based on user activity level'),
          new StringSelectMenuOptionBuilder().setLabel('🎤 Voice Minutes').setValue('voiceMinutes').setDescription('Total voice chat time'),
          new StringSelectMenuOptionBuilder().setLabel('🟢 Online Minutes').setValue('onlineMinutes').setDescription('Total online time'),
        );
      components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(statSelect));
      break;

    case 2: // Select Condition
      embed.setDescription('Select the comparison operator.');
      const opSelect = new StringSelectMenuBuilder()
        .setCustomId('setup_customroles_wizard_operator')
        .setPlaceholder('Select operator...')
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel('≥ Greater or Equal').setValue('>=').setDescription('Stat >= Value'),
          new StringSelectMenuOptionBuilder().setLabel('> Greater Than').setValue('>').setDescription('Stat > Value'),
          new StringSelectMenuOptionBuilder().setLabel('≤ Less or Equal').setValue('<=').setDescription('Stat <= Value'),
          new StringSelectMenuOptionBuilder().setLabel('< Less Than').setValue('<').setDescription('Stat < Value'),
          new StringSelectMenuOptionBuilder().setLabel('= Equal').setValue('==').setDescription('Stat == Value'),
        );
      components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(opSelect));
      break;

    case 3: // Set Value
      embed.setDescription(`Set the threshold value for **${wizardData.statType}** ${wizardData.operator} **?**\n\nFor stats: 0-100\nFor minutes: any positive number`);
      const valueSelect = new StringSelectMenuBuilder()
        .setCustomId('setup_customroles_wizard_value')
        .setPlaceholder('Select value...')
        .addOptions(
          ...[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(v =>
            new StringSelectMenuOptionBuilder().setLabel(`${v}`).setValue(`${v}`)
          )
        );
      components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(valueSelect));
      break;

    case 4: // Options
      embed.setDescription('Configure additional options for this rule.');
      const optionsSelect = new StringSelectMenuBuilder()
        .setCustomId('setup_customroles_wizard_options')
        .setPlaceholder('Select duration...')
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel('♾️ Permanent').setValue('permanent').setDescription('Role stays until condition fails'),
          new StringSelectMenuOptionBuilder().setLabel('⏱️ 30 minutes').setValue('30').setDescription('Temporary role for 30 min'),
          new StringSelectMenuOptionBuilder().setLabel('⏱️ 1 hour').setValue('60').setDescription('Temporary role for 1 hour'),
          new StringSelectMenuOptionBuilder().setLabel('⏱️ 2 hours').setValue('120').setDescription('Temporary role for 2 hours'),
          new StringSelectMenuOptionBuilder().setLabel('⏱️ 4 hours').setValue('240').setDescription('Temporary role for 4 hours'),
        );
      components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(optionsSelect));
      break;

    case 5: // Confirm
      const temp = wizardData.isTemporary ? `(${wizardData.durationMinutes} min)` : '(permanent)';
      embed.setDescription(
        '**Review your rule:**\n\n' +
        `**Role:** ${wizardData.roleName}\n` +
        `**Condition:** ${wizardData.statType} ${wizardData.operator} ${wizardData.value}\n` +
        `**Duration:** ${temp}\n\n` +
        'Click **✅ Create Rule** to save.'
      );
      const confirmButtons = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('setup_customroles_wizard_confirm')
            .setLabel('✅ Create Rule')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('setup_customroles_wizard_cancel')
            .setLabel('❌ Cancel')
            .setStyle(ButtonStyle.Danger),
        );
      components.push(confirmButtons);
      break;
  }

  // Add cancel button for all steps except confirm
  if (step < 5) {
    const navButtons = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('setup_customroles_wizard_cancel')
          .setLabel('❌ Cancel')
          .setStyle(ButtonStyle.Danger),
      );
    components.push(navButtons);
  }

  return { embeds: [embed], components };
}

export function buildCustomRoleManage(guildId: string): SetupView {
  const rules = getCustomRoleRules(guildId);

  const embed = new EmbedBuilder()
    .setTitle('📝 Manage Custom Rules')
    .setDescription('Select a rule to edit or delete.')
    .setColor(0x5865F2);

  if (rules.length === 0) {
    embed.setDescription('No custom rules found.');
    const backButton = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('setup_cat_customRoles')
          .setLabel('◀️ Back')
          .setStyle(ButtonStyle.Secondary),
      );
    return { embeds: [embed], components: [backButton] };
  }

  const ruleSelect = new StringSelectMenuBuilder()
    .setCustomId('setup_customroles_select')
    .setPlaceholder('Select a rule to manage...')
    .addOptions(
      rules.slice(0, 25).map(rule => 
        new StringSelectMenuOptionBuilder()
          .setLabel(rule.roleName)
          .setValue(rule.id.toString())
          .setDescription(`${rule.statType} ${rule.operator} ${rule.value}`)
      )
    );

  const backButton = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_cat_customRoles')
        .setLabel('◀️ Back')
        .setStyle(ButtonStyle.Secondary),
    );

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(ruleSelect),
      backButton,
    ],
  };
}

export function buildCustomRuleEdit(rule: CustomRoleRule): SetupView {
  const temp = rule.isTemporary ? `${rule.durationMinutes} minutes` : 'Permanent';
  
  const embed = new EmbedBuilder()
    .setTitle(`📝 Edit Rule: ${rule.roleName}`)
    .setDescription(
      `**Condition:** ${rule.statType} ${rule.operator} ${rule.value}\n` +
      `**Duration:** ${temp}\n` +
      `**Status:** ${rule.enabled ? '✅ Enabled' : '❌ Disabled'}`
    )
    .setColor(rule.enabled ? 0x00FF00 : 0xFF0000);

  const actionButtons = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`setup_customroles_toggle_${rule.id}`)
        .setLabel(rule.enabled ? '❌ Disable' : '✅ Enable')
        .setStyle(rule.enabled ? ButtonStyle.Secondary : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`setup_customroles_delete_${rule.id}`)
        .setLabel('🗑️ Delete')
        .setStyle(ButtonStyle.Danger),
    );

  const backButton = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_customroles_manage')
        .setLabel('◀️ Back to List')
        .setStyle(ButtonStyle.Secondary),
    );

  return {
    embeds: [embed],
    components: [actionButtons, backButton],
  };
}

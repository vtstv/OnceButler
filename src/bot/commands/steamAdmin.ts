// Copyright (c) 2026 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Steam News Admin Command
// Licensed under MIT License

import {
  ChatInputCommandInteraction,
  ButtonInteraction,
  StringSelectMenuInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  MessageFlags,
  Client,
} from 'discord.js';
import { env } from '../../config/env.js';
import { getSelectedSteamNewsModel, setSelectedSteamNewsModel, DEFAULT_STEAM_NEWS_MODEL } from '../../database/repositories/botSettingsRepo.js';
import { fetchAvailableGeminiModels, DEFAULT_FALLBACK_MODELS, type GeminiModelInfo } from '../../steamnews/geminiModelsService.js';
import { testGeminiModel } from '../../steamnews/geminiService.js';
import { getDb } from '../../database/db.js';

export function getAnyGeminiApiKey(client?: Client, guildId?: string): string {
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }

  try {
    const db = getDb();
    if (guildId) {
      const row = db.prepare('SELECT steamNewsGeminiKey FROM guild_settings WHERE guildId = ?').get(guildId) as any;
      if (row?.steamNewsGeminiKey) return row.steamNewsGeminiKey;
    }

    const row = db.prepare('SELECT steamNewsGeminiKey FROM guild_settings WHERE steamNewsGeminiKey IS NOT NULL AND steamNewsGeminiKey != "" LIMIT 1').get() as any;
    if (row?.steamNewsGeminiKey) return row.steamNewsGeminiKey;

    const aiRow = db.prepare('SELECT aiApiKey FROM guild_settings WHERE aiApiKey IS NOT NULL AND aiApiKey != "" LIMIT 1').get() as any;
    if (aiRow?.aiApiKey) return aiRow.aiApiKey;
  } catch (err) {
    console.error('[STEAM ADMIN] Error searching for Gemini API key:', err);
  }

  return '';
}

export async function buildSteamAdminView(
  client: Client,
  guildId?: string,
  forceRefresh = false
): Promise<{ embeds: EmbedBuilder[]; components: ActionRowBuilder<any>[] }> {
  const currentModel = getSelectedSteamNewsModel();
  const apiKey = getAnyGeminiApiKey(client, guildId);
  const models = await fetchAvailableGeminiModels(apiKey, forceRefresh);

  let activeGuildsCount = 0;
  let activeGamesCount = 0;

  try {
    const db = getDb();
    const gRow = db.prepare('SELECT COUNT(*) as count FROM guild_settings WHERE enableSteamNews = 1').get() as any;
    activeGuildsCount = gRow?.count ?? 0;

    const gamesRow = db.prepare('SELECT COUNT(*) as count FROM guild_steam_games WHERE is_active = 1').get() as any;
    activeGamesCount = gamesRow?.count ?? 0;
  } catch {
    // ignore
  }

  const embed = new EmbedBuilder()
    .setTitle('⚙️ Steam News — Управление моделью AI')
    .setDescription(
      'Панель администратора бота для выбора модели Google Gemini, отвечающей за перевод, анализ и структурирование новостей Steam.'
    )
    .setColor(0x5865F2)
    .addFields(
      {
        name: '🤖 Текущая активная модель',
        value: `\`${currentModel}\``,
        inline: true,
      },
      {
        name: '🔑 Статус Gemini API',
        value: apiKey ? '✅ Ключ подключен' : '⚠️ Ключ не найден (список по умолчанию)',
        inline: true,
      },
      {
        name: '📊 Статистика модуля',
        value: `Серверов с новостями: **${activeGuildsCount}** | Настроенных игр: **${activeGamesCount}**`,
        inline: false,
      },
      {
        name: 'ℹ️ Порядок работы',
        value: 'Выбранная модель используется первой. Если Google вернет ошибку или исчерпание квот, бот автоматически переключится на fallback-модель для сохранения непрерывности работы.',
        inline: false,
      }
    )
    .setTimestamp();

  // Create Select Menu with models (max 25 options allowed by Discord)
  const options = models.slice(0, 25).map(m => ({
    label: m.name.slice(0, 100),
    value: m.id,
    description: m.description ? m.description.slice(0, 100) : `Model ${m.id}`,
    default: m.id === currentModel,
    emoji: m.isRecommended ? '⭐' : '🤖',
  }));

  // If current model is not in the list, add it on top
  if (!options.some(opt => opt.value === currentModel)) {
    options.unshift({
      label: currentModel,
      value: currentModel,
      description: 'Кастомная или текущая выбранная модель',
      default: true,
      emoji: '🔹',
    });
  }

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('steamadmin_select_model')
      .setPlaceholder(`Текущая: ${currentModel}`)
      .addOptions(options.slice(0, 25))
  );

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('steamadmin_refresh_models')
      .setLabel('🔄 Обновить список моделей')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('steamadmin_test_model')
      .setLabel('🧪 Проверить модель')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('steamadmin_send_dm')
      .setLabel('📬 Открыть в ЛС')
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [selectRow, buttonRow],
  };
}

export async function handleSteamAdminCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (interaction.user.id !== env.adminId) {
    await interaction.reply({
      content: '❌ Эта команда доступна только администратору бота.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand(false);

  if (subcommand === 'model') {
    const modelArg = interaction.options.getString('name');
    if (modelArg) {
      setSelectedSteamNewsModel(modelArg.trim());
      await interaction.reply({
        content: `✅ Модель обработки новостей Steam изменена на: **\`${modelArg.trim()}\`**`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }

  const view = await buildSteamAdminView(interaction.client, interaction.guildId ?? undefined);
  await interaction.reply({
    embeds: view.embeds,
    components: view.components,
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleSteamAdminComponent(
  interaction: ButtonInteraction | StringSelectMenuInteraction
): Promise<void> {
  if (interaction.user.id !== env.adminId) {
    await interaction.reply({
      content: '❌ Доступ только для администратора бота.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'steamadmin_select_model') {
    const selectedModel = interaction.values[0];
    setSelectedSteamNewsModel(selectedModel);

    const view = await buildSteamAdminView(interaction.client, interaction.guildId ?? undefined);
    await interaction.update({
      embeds: view.embeds,
      components: view.components,
    });
    return;
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'steamadmin_refresh_models') {
      await interaction.deferUpdate();
      const view = await buildSteamAdminView(interaction.client, interaction.guildId ?? undefined, true);
      await interaction.editReply({
        embeds: view.embeds,
        components: view.components,
      });
      return;
    }

    if (interaction.customId === 'steamadmin_test_model') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const currentModel = getSelectedSteamNewsModel();
      const apiKey = getAnyGeminiApiKey(interaction.client, interaction.guildId ?? undefined);

      if (!apiKey) {
        await interaction.editReply({
          content: '❌ API-ключ Gemini не найден ни в настройках, ни в .env!',
        });
        return;
      }

      const result = await testGeminiModel(currentModel, apiKey);
      if (result.success) {
        await interaction.editReply({
          content: `✅ Модель **\`${currentModel}\`** успешно ответила!\n⏱️ Время отклика: **${result.latencyMs} мс**`,
        });
      } else {
        await interaction.editReply({
          content: `❌ Ошибка проверки модели **\`${currentModel}\`**:\n${result.error ?? 'Unknown error'}`,
        });
      }
      return;
    }

    if (interaction.customId === 'steamadmin_send_dm') {
      try {
        const view = await buildSteamAdminView(interaction.client, interaction.guildId ?? undefined);
        await interaction.user.send({
          embeds: view.embeds,
          components: view.components,
        });
        await interaction.reply({
          content: '📬 Панель управления моделями отправлена вам в личные сообщения!',
          flags: MessageFlags.Ephemeral,
        });
      } catch (err) {
        await interaction.reply({
          content: '❌ Не удалось отправить сообщение в личные сообщения. Проверьте настройки приватности.',
          flags: MessageFlags.Ephemeral,
        });
      }
      return;
    }
  }
}

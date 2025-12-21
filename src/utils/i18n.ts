export type Locale = 'en' | 'ru' | 'de';

// Flat translation keys for easier access
type TranslationKey =
  | 'common.serverOnly'
  | 'common.hours'
  | 'common.minutes'
  | 'common.minutesShort'
  | 'common.left'
  | 'common.cancel'
  | 'roles.list.title'
  | 'roles.list.empty'
  | 'roles.list.priority'
  | 'roles.list.temp'
  | 'roles.add.success'
  | 'roles.remove.success'
  | 'roles.remove.notFound'
  | 'roles.import.allExist'
  | 'roles.import.success'
  | 'roles.export.success'
  | 'roles.reload.success'
  | 'roles.purge.warning'
  | 'roles.purge.confirmButton'
  | 'roles.purge.inProgress'
  | 'roles.purge.success'
  | 'roles.purge.noRoles'
  | 'roles.purge.cancelled'
  | 'roles.purge.timeout'
  | 'stats.title'
  | 'stats.mood'
  | 'stats.energy'
  | 'stats.activity'
  | 'stats.voiceTime'
  | 'stats.onlineTime'
  | 'stats.chaosEffect'
  | 'leaderboard.title'
  | 'leaderboard.noMembers'
  | 'trigger.create.success'
  | 'trigger.durationMinutes'
  | 'trigger.permanent'
  | 'trigger.list.title'
  | 'trigger.list.empty'
  | 'trigger.expires'
  | 'trigger.stop.success'
  | 'trigger.stop.notFound'
  | 'achievements.title';

type Translations = Record<TranslationKey, string>;

const en: Translations = {
  'common.serverOnly': 'This command must be used in a server.',
  'common.hours': 'h',
  'common.minutes': 'm',
  'common.minutesShort': 'm',
  'common.left': 'left',
  'common.cancel': 'Cancel',

  'roles.list.title': 'Managed Roles',
  'roles.list.empty': 'No roles defined.',
  'roles.list.priority': 'priority',
  'roles.list.temp': 'temp',
  'roles.add.success': 'Role **{name}** added/updated.',
  'roles.remove.success': 'Role **{name}** removed from storage.',
  'roles.remove.notFound': 'Role **{name}** not found.',
  'roles.import.allExist': 'All roles already exist in Discord.',
  'roles.import.success': 'Created roles: {roles}',
  'roles.export.success': 'Exported {count} roles to JSON storage.',
  'roles.reload.success': 'Reloaded {count} role definitions.',
  'roles.purge.warning': '⚠️ **DANGER!** This will delete **{count}** bot-managed roles from Discord.\n\nThis action **cannot be undone**! All members will lose these roles.',
  'roles.purge.confirmButton': 'Delete {count} roles',
  'roles.purge.inProgress': '🔄 Deleting roles...',
  'roles.purge.success': '✅ Successfully deleted **{count}** bot-managed roles.',
  'roles.purge.noRoles': 'No bot-managed roles found to delete.',
  'roles.purge.cancelled': '❌ Purge cancelled.',
  'roles.purge.timeout': '⏰ Confirmation timed out. No roles were deleted.',

  'stats.title': '📊 Stats for {user}',
  'stats.mood': 'Mood',
  'stats.energy': 'Energy',
  'stats.activity': 'Activity',
  'stats.voiceTime': 'Voice Time',
  'stats.onlineTime': 'Online Time',
  'stats.chaosEffect': 'Chaos Effect',

  'leaderboard.title': 'Leaderboard',
  'leaderboard.noMembers': 'No members found.',

  'trigger.create.success': '✅ Trigger **{name}** created (ID: {id}). {stat} will change by {modifier} per tick {duration}.',
  'trigger.durationMinutes': 'for {minutes} minutes',
  'trigger.permanent': 'permanently',
  'trigger.list.title': 'Triggers',
  'trigger.list.empty': 'No triggers found.',
  'trigger.expires': 'expires',
  'trigger.stop.success': '✅ Trigger #{id} stopped.',
  'trigger.stop.notFound': '❌ Trigger #{id} not found.',

  'achievements.title': '🏆 Achievements ({unlocked}/{total})',
};

const ru: Translations = {
  'common.serverOnly': 'Эта команда должна использоваться на сервере.',
  'common.hours': 'ч',
  'common.minutes': 'м',
  'common.minutesShort': 'м',
  'common.left': 'осталось',
  'common.cancel': 'Отмена',

  'roles.list.title': 'Управляемые роли',
  'roles.list.empty': 'Роли не определены.',
  'roles.list.priority': 'приоритет',
  'roles.list.temp': 'врем.',
  'roles.add.success': 'Роль **{name}** добавлена/обновлена.',
  'roles.remove.success': 'Роль **{name}** удалена из хранилища.',
  'roles.remove.notFound': 'Роль **{name}** не найдена.',
  'roles.import.allExist': 'Все роли уже существуют в Discord.',
  'roles.import.success': 'Созданы роли: {roles}',
  'roles.export.success': 'Экспортировано {count} ролей в JSON.',
  'roles.reload.success': 'Перезагружено {count} определений ролей.',
  'roles.purge.warning': '⚠️ **ОПАСНО!** Это удалит **{count}** ролей бота из Discord.\n\nЭто действие **необратимо**! Все участники потеряют эти роли.',
  'roles.purge.confirmButton': 'Удалить {count} ролей',
  'roles.purge.inProgress': '🔄 Удаление ролей...',
  'roles.purge.success': '✅ Успешно удалено **{count}** ролей бота.',
  'roles.purge.noRoles': 'Не найдено ролей бота для удаления.',
  'roles.purge.cancelled': '❌ Удаление отменено.',
  'roles.purge.timeout': '⏰ Время подтверждения истекло. Роли не удалены.',

  'stats.title': '📊 Статистика {user}',
  'stats.mood': 'Настроение',
  'stats.energy': 'Энергия',
  'stats.activity': 'Активность',
  'stats.voiceTime': 'Время в голосе',
  'stats.onlineTime': 'Время онлайн',
  'stats.chaosEffect': 'Эффект хаоса',

  'leaderboard.title': 'Рейтинг',
  'leaderboard.noMembers': 'Участники не найдены.',

  'trigger.create.success': '✅ Триггер **{name}** создан (ID: {id}). {stat} будет меняться на {modifier} за тик {duration}.',
  'trigger.durationMinutes': 'в течение {minutes} минут',
  'trigger.permanent': 'постоянно',
  'trigger.list.title': 'Триггеры',
  'trigger.list.empty': 'Триггеры не найдены.',
  'trigger.expires': 'истекает',
  'trigger.stop.success': '✅ Триггер #{id} остановлен.',
  'trigger.stop.notFound': '❌ Триггер #{id} не найден.',

  'achievements.title': '🏆 Достижения ({unlocked}/{total})',
};

const de: Translations = {
  'common.serverOnly': 'Dieser Befehl muss auf einem Server verwendet werden.',
  'common.hours': 'Std',
  'common.minutes': 'Min',
  'common.minutesShort': 'm',
  'common.left': 'übrig',
  'common.cancel': 'Abbrechen',

  'roles.list.title': 'Verwaltete Rollen',
  'roles.list.empty': 'Keine Rollen definiert.',
  'roles.list.priority': 'Priorität',
  'roles.list.temp': 'temp',
  'roles.add.success': 'Rolle **{name}** hinzugefügt/aktualisiert.',
  'roles.remove.success': 'Rolle **{name}** aus dem Speicher entfernt.',
  'roles.remove.notFound': 'Rolle **{name}** nicht gefunden.',
  'roles.import.allExist': 'Alle Rollen existieren bereits in Discord.',
  'roles.import.success': 'Erstellte Rollen: {roles}',
  'roles.export.success': '{count} Rollen in JSON exportiert.',
  'roles.reload.success': '{count} Rollendefinitionen neu geladen.',
  'roles.purge.warning': '⚠️ **GEFAHR!** Dies löscht **{count}** Bot-verwaltete Rollen aus Discord.\n\nDiese Aktion **kann nicht rückgängig gemacht werden**! Alle Mitglieder verlieren diese Rollen.',
  'roles.purge.confirmButton': '{count} Rollen löschen',
  'roles.purge.inProgress': '🔄 Rollen werden gelöscht...',
  'roles.purge.success': '✅ **{count}** Bot-verwaltete Rollen erfolgreich gelöscht.',
  'roles.purge.noRoles': 'Keine Bot-verwalteten Rollen zum Löschen gefunden.',
  'roles.purge.cancelled': '❌ Löschen abgebrochen.',
  'roles.purge.timeout': '⏰ Bestätigung abgelaufen. Keine Rollen wurden gelöscht.',

  'stats.title': '📊 Statistiken für {user}',
  'stats.mood': 'Stimmung',
  'stats.energy': 'Energie',
  'stats.activity': 'Aktivität',
  'stats.voiceTime': 'Sprachzeit',
  'stats.onlineTime': 'Online-Zeit',
  'stats.chaosEffect': 'Chaos-Effekt',

  'leaderboard.title': 'Rangliste',
  'leaderboard.noMembers': 'Keine Mitglieder gefunden.',

  'trigger.create.success': '✅ Trigger **{name}** erstellt (ID: {id}). {stat} ändert sich um {modifier} pro Tick {duration}.',
  'trigger.durationMinutes': 'für {minutes} Minuten',
  'trigger.permanent': 'dauerhaft',
  'trigger.list.title': 'Trigger',
  'trigger.list.empty': 'Keine Trigger gefunden.',
  'trigger.expires': 'läuft ab',
  'trigger.stop.success': '✅ Trigger #{id} gestoppt.',
  'trigger.stop.notFound': '❌ Trigger #{id} nicht gefunden.',

  'achievements.title': '🏆 Erfolge ({unlocked}/{total})',
};

const translations: Record<Locale, Translations> = { en, ru, de };

export function t(locale: Locale, key: TranslationKey, replacements?: Record<string, string>): string {
  const trans = translations[locale] ?? translations.en;
  let value = trans[key] ?? translations.en[key] ?? key;

  if (replacements) {
    for (const [k, v] of Object.entries(replacements)) {
      value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
  }

  return value;
}

export function detectLocale(discordLocale: string | null | undefined): Locale {
  if (!discordLocale) return 'en';

  const locale = discordLocale.toLowerCase();
  if (locale.startsWith('ru')) return 'ru';
  if (locale.startsWith('de')) return 'de';
  return 'en';
}

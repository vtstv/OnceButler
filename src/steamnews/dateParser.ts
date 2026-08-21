// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Date Parser for Steam News
// Licensed under MIT License

// Month names for parsing
const MONTHS: Record<string, number> = {
  'january': 0, 'jan': 0,
  'february': 1, 'feb': 1,
  'march': 2, 'mar': 2,
  'april': 3, 'apr': 3,
  'may': 4,
  'june': 5, 'jun': 5,
  'july': 6, 'jul': 6,
  'august': 7, 'aug': 7,
  'september': 8, 'sep': 8, 'sept': 8,
  'october': 9, 'oct': 9,
  'november': 10, 'nov': 10,
  'december': 11, 'dec': 11,
};

// Fixed timezone offsets in hours (negative = behind UTC)
const TIMEZONES: Record<string, number> = {
  'pst': -8,  // Pacific Standard Time
  'pdt': -7,  // Pacific Daylight Time
  'mst': -7,  // Mountain Standard Time
  'mdt': -6,  // Mountain Daylight Time
  'cst': -6,  // Central Standard Time
  'cdt': -5,  // Central Daylight Time
  'est': -5,  // Eastern Standard Time
  'edt': -4,  // Eastern Daylight Time
  'utc': 0,
  'gmt': 0,
};

/**
 * Check if a date is during Daylight Saving Time (US rules)
 * DST: Second Sunday in March to First Sunday in November
 */
function isDST(date: Date): boolean {
  const year = date.getUTCFullYear();
  
  // Second Sunday in March (at 2:00 AM UTC)
  const marchFirst = new Date(Date.UTC(year, 2, 1));
  const dstStart = new Date(Date.UTC(year, 2, ((14 - marchFirst.getUTCDay()) % 7) + 8, 2, 0, 0, 0));
  
  // First Sunday in November (at 2:00 AM UTC)
  const novFirst = new Date(Date.UTC(year, 10, 1));
  const dstEnd = new Date(Date.UTC(year, 10, ((7 - novFirst.getUTCDay()) % 7) + 1, 2, 0, 0, 0));
  
  const time = date.getTime();
  return time >= dstStart.getTime() && time < dstEnd.getTime();
}

/**
 * Get timezone offset, accounting for DST
 */
function getTimezoneOffset(tz: string, date: Date): number {
  const tzLower = tz.toLowerCase().replace(/[()]/g, '');
  
  // If specific DST/Standard time given, use it directly
  if (TIMEZONES[tzLower] !== undefined) {
    return TIMEZONES[tzLower];
  }
  
  // For generic timezone names (PT, MT, CT, ET), check DST
  if (tzLower === 'pt' || tzLower === 'pacific') {
    return isDST(date) ? -7 : -8;
  }
  if (tzLower === 'mt' || tzLower === 'mountain') {
    return isDST(date) ? -6 : -7;
  }
  if (tzLower === 'ct' || tzLower === 'central') {
    return isDST(date) ? -5 : -6;
  }
  if (tzLower === 'et' || tzLower === 'eastern') {
    return isDST(date) ? -4 : -5;
  }
  
  return -8; // Default to PST
}

/**
 * Parse a date string and return Unix timestamp
 * Supports various formats:
 * - "January 7, 2026, 3:00 PM (PT)"
 * - "January 7, 2026 3:00 PM PT"
 * - "Jan 7, 2026, 3:00PM PT"
 * - "August 18 at 4:00 AM (PT)"
 * - "August 18th 04:00 PT"
 * - "18 August 4:00 AM (UTC)"
 * - "August 18 (PT)"
 * - "2026-01-07 15:00 PT"
 */
export function parseDateToUnix(dateStr: string, referenceYear?: number): number | null {
  try {
    // Clean up the string
    let cleaned = dateStr.trim();
    
    // Remove ordinal suffixes: 18th -> 18, 1st -> 1, 2nd -> 2, 3rd -> 3
    cleaned = cleaned.replace(/(\d{1,2})(?:st|nd|rd|th)\b/gi, '$1');
    
    // Remove "at" word that sometimes appears before time
    cleaned = cleaned.replace(/,?\s+at\s+/gi, ' ');
    
    // Extract timezone (handle both "PT" and "(PT)" formats)
    const tzMatch = cleaned.match(/\(?(P[SD]?T|M[SD]?T|C[SD]?T|E[SD]?T|UTC|GMT)\)?/i);
    const timezone = tzMatch ? tzMatch[1] : 'PT';
    cleaned = cleaned.replace(/\(?(P[SD]?T|M[SD]?T|C[SD]?T|E[SD]?T|UTC|GMT)\)?/gi, '').trim();
    
    // Remove extra commas and spaces
    cleaned = cleaned.replace(/,\s*/g, ' ').replace(/\s+/g, ' ').trim();
    
    const defaultYear = referenceYear || new Date().getUTCFullYear();
    let year = defaultYear, month = -1, day = -1, hours = 0, minutes = 0;
    
    // Pattern 1: Month Day Year Time e.g. "August 18 2026 3:00 PM"
    const pattern1 = /^([a-z]+)\s+(\d{1,2})\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?/i;
    const match1 = cleaned.match(pattern1);
    
    // Pattern 2: Day Month Year Time e.g. "18 August 2026 3:00 PM"
    const pattern2 = /^(\d{1,2})\s+([a-z]+)\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?/i;
    const match2 = cleaned.match(pattern2);
    
    // Pattern 3: ISO/Standard e.g. "2026-01-07 15:00"
    const pattern3 = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?/i;
    const match3 = cleaned.match(pattern3);
    
    // Pattern 4: Month Day Time (WITHOUT year) e.g. "August 18 4:00 AM" or "August 18 04:00"
    const pattern4 = /^([a-z]+)\s+(\d{1,2})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?/i;
    const match4 = cleaned.match(pattern4);
    
    // Pattern 5: Day Month Time (WITHOUT year) e.g. "18 August 4:00 AM" or "18 Aug 04:00"
    const pattern5 = /^(\d{1,2})\s+([a-z]+)\s+(\d{1,2}):(\d{2})\s*(AM|PM)?/i;
    const match5 = cleaned.match(pattern5);
    
    // Pattern 6: Month Day Year (WITHOUT time) e.g. "August 18 2026"
    const pattern6 = /^([a-z]+)\s+(\d{1,2})\s+(\d{4})/i;
    const match6 = cleaned.match(pattern6);
    
    // Pattern 7: Day Month Year (WITHOUT time) e.g. "18 August 2026"
    const pattern7 = /^(\d{1,2})\s+([a-z]+)\s+(\d{4})/i;
    const match7 = cleaned.match(pattern7);
    
    // Pattern 8: Month Day (WITHOUT year, WITHOUT time) e.g. "August 18"
    const pattern8 = /^([a-z]+)\s+(\d{1,2})$/i;
    const match8 = cleaned.match(pattern8);
    
    // Pattern 9: Day Month (WITHOUT year, WITHOUT time) e.g. "18 August"
    const pattern9 = /^(\d{1,2})\s+([a-z]+)$/i;
    const match9 = cleaned.match(pattern9);
    
    if (match1) {
      const monthName = match1[1].toLowerCase();
      if (MONTHS[monthName] === undefined) return null;
      month = MONTHS[monthName];
      day = parseInt(match1[2], 10);
      year = parseInt(match1[3], 10);
      hours = parseInt(match1[4], 10);
      minutes = parseInt(match1[5], 10);
      const ampm = match1[6]?.toUpperCase();
      if (ampm === 'PM' && hours !== 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
    } else if (match2) {
      const monthName = match2[2].toLowerCase();
      if (MONTHS[monthName] === undefined) return null;
      day = parseInt(match2[1], 10);
      month = MONTHS[monthName];
      year = parseInt(match2[3], 10);
      hours = parseInt(match2[4], 10);
      minutes = parseInt(match2[5], 10);
      const ampm = match2[6]?.toUpperCase();
      if (ampm === 'PM' && hours !== 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
    } else if (match3) {
      year = parseInt(match3[1], 10);
      month = parseInt(match3[2], 10) - 1;
      day = parseInt(match3[3], 10);
      hours = parseInt(match3[4], 10);
      minutes = parseInt(match3[5], 10);
      const ampm = match3[6]?.toUpperCase();
      if (ampm === 'PM' && hours !== 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
    } else if (match4) {
      const monthName = match4[1].toLowerCase();
      if (MONTHS[monthName] === undefined) return null;
      month = MONTHS[monthName];
      day = parseInt(match4[2], 10);
      year = defaultYear;
      hours = parseInt(match4[3], 10);
      minutes = parseInt(match4[4], 10);
      const ampm = match4[5]?.toUpperCase();
      if (ampm === 'PM' && hours !== 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
    } else if (match5) {
      const monthName = match5[2].toLowerCase();
      if (MONTHS[monthName] === undefined) return null;
      day = parseInt(match5[1], 10);
      month = MONTHS[monthName];
      year = defaultYear;
      hours = parseInt(match5[3], 10);
      minutes = parseInt(match5[4], 10);
      const ampm = match5[5]?.toUpperCase();
      if (ampm === 'PM' && hours !== 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
    } else if (match6) {
      const monthName = match6[1].toLowerCase();
      if (MONTHS[monthName] === undefined) return null;
      month = MONTHS[monthName];
      day = parseInt(match6[2], 10);
      year = parseInt(match6[3], 10);
    } else if (match7) {
      const monthName = match7[2].toLowerCase();
      if (MONTHS[monthName] === undefined) return null;
      day = parseInt(match7[1], 10);
      month = MONTHS[monthName];
      year = parseInt(match7[3], 10);
    } else if (match8) {
      const monthName = match8[1].toLowerCase();
      if (MONTHS[monthName] === undefined) return null;
      month = MONTHS[monthName];
      day = parseInt(match8[2], 10);
      year = defaultYear;
    } else if (match9) {
      const monthName = match9[2].toLowerCase();
      if (MONTHS[monthName] === undefined) return null;
      day = parseInt(match9[1], 10);
      month = MONTHS[monthName];
      year = defaultYear;
    } else {
      return null;
    }
    
    if (month < 0 || month > 11 || day < 1 || day > 31) return null;
    
    // The parsed time is in the source timezone (e.g., PT)
    // Create temp date as UTC then subtract offset to get real UTC timestamp
    const tempDate = new Date(Date.UTC(year, month, day, hours, minutes, 0, 0));
    const tzOffset = getTimezoneOffset(timezone, tempDate);
    const localTimestamp = tempDate.getTime() / 1000;
    const utcTimestamp = localTimestamp - (tzOffset * 3600);
    
    return Math.floor(utcTimestamp);
  } catch (error) {
    console.error('[DATE PARSER] Error parsing date:', dateStr, error);
    return null;
  }
}

/**
 * Convert Unix timestamp to Discord timestamp format
 */
export function toDiscordTimestamp(unix: number, format: 'F' | 'f' | 'D' | 'd' | 'T' | 't' | 'R' = 'F'): string {
  return `<t:${unix}:${format}>`;
}

/**
 * Find and replace all date strings in content with Discord timestamps
 */
export function replaceDatesWithTimestamps(content: string, referenceDateUnix?: number): string {
  const refYear = referenceDateUnix
    ? new Date(referenceDateUnix * 1000).getUTCFullYear()
    : new Date().getUTCFullYear();

  // Patterns to match various date formats (ordered from most specific to least specific)
  const patterns = [
    // Month Day Year Time: "August 18, 2026, at 3:00 PM (PT)"
    /(\b[a-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4},?\s+(?:at\s+)?\d{1,2}:\d{2}\s*(?:AM|PM)?\s*\(?(?:P[SD]?T|M[SD]?T|C[SD]?T|E[SD]?T|UTC|GMT)\)?)/gi,
    // Day Month Year Time: "18 August 2026, at 3:00 PM (PT)"
    /(\b\d{1,2}(?:st|nd|rd|th)?\s+[a-z]+,?\s+\d{4},?\s+(?:at\s+)?\d{1,2}:\d{2}\s*(?:AM|PM)?\s*\(?(?:P[SD]?T|M[SD]?T|C[SD]?T|E[SD]?T|UTC|GMT)\)?)/gi,
    // ISO/Standard: "2026-01-07 15:00 (PT)"
    /(\b\d{4}[-/]\d{2}[-/]\d{2}\s+\d{1,2}:\d{2}\s*(?:AM|PM)?\s*\(?(?:P[SD]?T|M[SD]?T|C[SD]?T|E[SD]?T|UTC|GMT)\)?)/gi,
    // Month Day Time WITHOUT year: "August 18, at 4:00 AM (PT)" or "August 18th 04:00 PT"
    /(\b[a-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+(?:at\s+)?\d{1,2}:\d{2}\s*(?:AM|PM)?\s*\(?(?:P[SD]?T|M[SD]?T|C[SD]?T|E[SD]?T|UTC|GMT)\)?)/gi,
    // Day Month Time WITHOUT year: "18 August, at 4:00 AM (PT)" or "18 Aug 04:00 UTC"
    /(\b\d{1,2}(?:st|nd|rd|th)?\s+[a-z]+,?\s+(?:at\s+)?\d{1,2}:\d{2}\s*(?:AM|PM)?\s*\(?(?:P[SD]?T|M[SD]?T|C[SD]?T|E[SD]?T|UTC|GMT)\)?)/gi,
    // Month Day Year NO time: "August 18, 2026 (PT)"
    /(\b[a-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\s*\(?(?:P[SD]?T|M[SD]?T|C[SD]?T|E[SD]?T|UTC|GMT)\)?)/gi,
    // Month Day NO year NO time with timezone: "August 18th (PT)"
    /(\b[a-z]+\s+\d{1,2}(?:st|nd|rd|th)?\s*\(?(?:P[SD]?T|M[SD]?T|C[SD]?T|E[SD]?T|UTC|GMT)\)?)/gi,
  ];
  
  let result = content;
  
  for (const pattern of patterns) {
    result = result.replace(pattern, (match) => {
      const unix = parseDateToUnix(match, refYear);
      if (unix) {
        // Return both full date and relative time
        return `${toDiscordTimestamp(unix, 'F')} (${toDiscordTimestamp(unix, 'R')})`;
      }
      return match; // Keep original if parsing failed
    });
  }
  
  return result;
}

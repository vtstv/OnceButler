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

// Timezone offsets in hours (negative = behind UTC)
const TIMEZONES: Record<string, number> = {
  'pt': -8,   // Pacific Time (winter)
  'pst': -8,  // Pacific Standard Time
  'pdt': -7,  // Pacific Daylight Time
  'mt': -7,   // Mountain Time (winter)
  'mst': -7,
  'mdt': -6,
  'ct': -6,   // Central Time (winter)
  'cst': -6,
  'cdt': -5,
  'et': -5,   // Eastern Time (winter)
  'est': -5,
  'edt': -4,
  'utc': 0,
  'gmt': 0,
};

/**
 * Check if a date is during Daylight Saving Time (US rules)
 * DST: Second Sunday in March to First Sunday in November
 */
function isDST(date: Date): boolean {
  const year = date.getFullYear();
  
  // Second Sunday in March
  const marchFirst = new Date(year, 2, 1);
  const dstStart = new Date(year, 2, 14 - marchFirst.getDay());
  dstStart.setHours(2, 0, 0, 0);
  
  // First Sunday in November
  const novFirst = new Date(year, 10, 1);
  const dstEnd = new Date(year, 10, 7 - novFirst.getDay());
  dstEnd.setHours(2, 0, 0, 0);
  
  return date >= dstStart && date < dstEnd;
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
 * - "2026-01-07 15:00 PT"
 */
export function parseDateToUnix(dateStr: string): number | null {
  try {
    // Clean up the string
    let cleaned = dateStr.trim();
    
    // Remove "at" word that sometimes appears before time
    cleaned = cleaned.replace(/,?\s+at\s+/gi, ' ');
    
    // Extract timezone (handle both "PT" and "(PT)" formats)
    const tzMatch = cleaned.match(/\(?(P[SD]?T|M[SD]?T|C[SD]?T|E[SD]?T|UTC|GMT)\)?/i);
    const timezone = tzMatch ? tzMatch[1] : 'PT';
    cleaned = cleaned.replace(/\(?(P[SD]?T|M[SD]?T|C[SD]?T|E[SD]?T|UTC|GMT)\)?/gi, '').trim();
    
    // Remove extra commas and spaces
    cleaned = cleaned.replace(/,\s*/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Try different date patterns
    let year: number, month: number, day: number, hours = 0, minutes = 0;
    
    // Pattern 1: "January 7 2026 3:00 PM" (after cleanup)
    const pattern1 = /^(\w+)\s+(\d{1,2})\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?/i;
    const match1 = cleaned.match(pattern1);
    
    if (match1) {
      const monthName = match1[1].toLowerCase();
      if (MONTHS[monthName] === undefined) return null;
      
      month = MONTHS[monthName];
      day = parseInt(match1[2]);
      year = parseInt(match1[3]);
      hours = parseInt(match1[4]);
      minutes = parseInt(match1[5]);
      const ampm = match1[6]?.toUpperCase();
      
      if (ampm === 'PM' && hours !== 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
    } else {
      // Pattern 2: "2026-01-07 15:00"
      const pattern2 = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})/;
      const match2 = cleaned.match(pattern2);
      
      if (match2) {
        year = parseInt(match2[1]);
        month = parseInt(match2[2]) - 1;
        day = parseInt(match2[3]);
        hours = parseInt(match2[4]);
        minutes = parseInt(match2[5]);
      } else {
        // Pattern 3: Just date "January 7 2026"
        const pattern3 = /^(\w+)\s+(\d{1,2})\s+(\d{4})/i;
        const match3 = cleaned.match(pattern3);
        
        if (match3) {
          const monthName = match3[1].toLowerCase();
          if (MONTHS[monthName] === undefined) return null;
          
          month = MONTHS[monthName];
          day = parseInt(match3[2]);
          year = parseInt(match3[3]);
        } else {
          return null;
        }
      }
    }
    
    // The parsed time is in the source timezone (e.g., PT)
    // We need to convert it to UTC
    // Create a Date object representing the local time in that timezone
    // Then adjust to UTC by subtracting the timezone offset
    
    // First, create the date as if it were UTC (just to have a date object)
    const tempDate = new Date(Date.UTC(year, month, day, hours, minutes, 0, 0));
    
    // Get timezone offset (negative for US timezones means behind UTC)
    // e.g., PT = -8 means PT is 8 hours behind UTC
    const tzOffset = getTimezoneOffset(timezone, tempDate);
    
    // To convert local time to UTC: subtract the offset
    // e.g., 3:00 PM PT (-8) -> 3:00 PM + 8 hours = 11:00 PM UTC
    // Math: UTC = local - offset, where offset is negative, so UTC = local - (-8) = local + 8
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
export function replaceDatesWithTimestamps(content: string): string {
  // Patterns to match various date formats
  const patterns = [
    // "January 7, 2026, at 3:00 PM (PT)" or "January 7, 2026 at 3:00 PM(PT)"
    /(\w+\s+\d{1,2},?\s+\d{4},?\s+(?:at\s+)?\d{1,2}:\d{2}\s*(?:AM|PM)?\s*\(?(?:P[SD]?T|M[SD]?T|C[SD]?T|E[SD]?T|UTC|GMT)\)?)/gi,
    // "January 7, 2026 (PT)" - date without time
    /(\w+\s+\d{1,2},?\s+\d{4}\s*\(?(?:P[SD]?T|M[SD]?T|C[SD]?T|E[SD]?T|UTC|GMT)\)?)/gi,
  ];
  
  let result = content;
  
  for (const pattern of patterns) {
    result = result.replace(pattern, (match) => {
      const unix = parseDateToUnix(match);
      if (unix) {
        // Return both full date and relative time
        return `${toDiscordTimestamp(unix, 'F')} (${toDiscordTimestamp(unix, 'R')})`;
      }
      return match; // Keep original if parsing failed
    });
  }
  
  return result;
}

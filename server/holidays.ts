/**
 * French Holiday System
 * 
 * Calculates French national holidays and regional variations for a given year.
 * Used by the simulation engine to handle excludeHolidays functionality.
 */

/**
 * Calculate Easter Sunday for a given year using the Anonymous Gregorian algorithm
 * @param year - The year to calculate Easter for
 * @returns Date object for Easter Sunday
 */
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = Math.floor((h + l - 7 * m + 114) / 31);
  const p = (h + l - 7 * m + 114) % 31;
  
  return new Date(year, n - 1, p + 1);
}

/**
 * Add days to a date
 * @param date - The base date
 * @param days - Number of days to add (can be negative)
 * @returns New Date object
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Format date as ISO string (YYYY-MM-DD)
 * @param date - The date to format
 * @returns ISO date string
 */
function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * French National Holidays Interface
 */
export interface FrenchHoliday {
  name: string;
  date: string; // ISO date string (YYYY-MM-DD)
  type: 'fixed' | 'easter-based' | 'regional';
  region?: string; // For regional holidays
}

/**
 * Get all French holidays for a given year and region
 * 
 * @param year - The year to calculate holidays for
 * @param region - French region code ('FR' for national, 'FR-67' for Alsace, 'FR-68' for Haut-Rhin, etc.)
 * @returns Set of holiday date strings in ISO format (YYYY-MM-DD)
 */
export function getFrenchHolidays(year: number, region: string = 'FR'): Set<string> {
  const holidays = new Set<string>();
  
  // Calculate Easter Sunday for the year
  const easter = getEasterSunday(year);
  
  // Fixed National Holidays
  const fixedHolidays = [
    { name: 'Jour de l\'An', date: `${year}-01-01` },
    { name: 'Fête du Travail', date: `${year}-05-01` },
    { name: 'Victoire 1945', date: `${year}-05-08` },
    { name: 'Fête Nationale', date: `${year}-07-14` },
    { name: 'Assomption', date: `${year}-08-15` },
    { name: 'Toussaint', date: `${year}-11-01` },
    { name: 'Armistice', date: `${year}-11-11` },
    { name: 'Noël', date: `${year}-12-25` },
  ];
  
  fixedHolidays.forEach(holiday => holidays.add(holiday.date));
  
  // Easter-based holidays
  const easterBasedHolidays = [
    { name: 'Lundi de Pâques', offset: 1 }, // Easter Monday
    { name: 'Ascension', offset: 39 }, // 39 days after Easter
    { name: 'Lundi de Pentecôte', offset: 50 }, // 50 days after Easter (Whit Monday)
  ];
  
  easterBasedHolidays.forEach(holiday => {
    const holidayDate = addDays(easter, holiday.offset);
    holidays.add(formatDateISO(holidayDate));
  });
  
  // Regional holidays (Alsace-Moselle specific holidays for FR-67, FR-68, FR-57)
  if (region === 'FR-67' || region === 'FR-68' || region === 'FR-57') {
    // Good Friday (Vendredi Saint) - 2 days before Easter
    const goodFriday = addDays(easter, -2);
    holidays.add(formatDateISO(goodFriday));
    
    // St. Stephen's Day (Saint-Étienne) - December 26
    holidays.add(`${year}-12-26`);
  }
  
  // Additional regional holidays can be added here as needed
  // For now, we support basic national holidays plus Alsace-Moselle
  
  return holidays;
}

/**
 * Get detailed holiday information for a given year and region
 * 
 * @param year - The year to calculate holidays for
 * @param region - French region code
 * @returns Array of FrenchHoliday objects with details
 */
export function getFrenchHolidaysDetailed(year: number, region: string = 'FR'): FrenchHoliday[] {
  const holidays: FrenchHoliday[] = [];
  
  // Calculate Easter Sunday for the year
  const easter = getEasterSunday(year);
  
  // Fixed National Holidays
  const fixedHolidays = [
    { name: 'Jour de l\'An', date: `${year}-01-01`, type: 'fixed' as const },
    { name: 'Fête du Travail', date: `${year}-05-01`, type: 'fixed' as const },
    { name: 'Victoire 1945', date: `${year}-05-08`, type: 'fixed' as const },
    { name: 'Fête Nationale', date: `${year}-07-14`, type: 'fixed' as const },
    { name: 'Assomption', date: `${year}-08-15`, type: 'fixed' as const },
    { name: 'Toussaint', date: `${year}-11-01`, type: 'fixed' as const },
    { name: 'Armistice', date: `${year}-11-11`, type: 'fixed' as const },
    { name: 'Noël', date: `${year}-12-25`, type: 'fixed' as const },
  ];
  
  holidays.push(...fixedHolidays);
  
  // Easter-based holidays
  const easterBasedHolidays = [
    { name: 'Lundi de Pâques', offset: 1 },
    { name: 'Ascension', offset: 39 },
    { name: 'Lundi de Pentecôte', offset: 50 },
  ];
  
  easterBasedHolidays.forEach(holiday => {
    const holidayDate = addDays(easter, holiday.offset);
    holidays.push({
      name: holiday.name,
      date: formatDateISO(holidayDate),
      type: 'easter-based',
    });
  });
  
  // Regional holidays
  if (region === 'FR-67' || region === 'FR-68' || region === 'FR-57') {
    const goodFriday = addDays(easter, -2);
    holidays.push({
      name: 'Vendredi Saint',
      date: formatDateISO(goodFriday),
      type: 'regional',
      region: region,
    });
    
    holidays.push({
      name: 'Saint-Étienne',
      date: `${year}-12-26`,
      type: 'regional',
      region: region,
    });
  }
  
  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Check if a specific date is a French holiday
 * 
 * @param dateStr - Date string in ISO format (YYYY-MM-DD)
 * @param year - The year of the date
 * @param region - French region code
 * @returns true if the date is a holiday
 */
export function isFrenchHoliday(dateStr: string, year: number, region: string = 'FR'): boolean {
  const holidays = getFrenchHolidays(year, region);
  return holidays.has(dateStr);
}

/**
 * Get the next working day after a given date, skipping weekends and holidays
 * 
 * @param date - The starting date
 * @param region - French region code for holiday calculation
 * @returns Next working day as Date object
 */
export function getNextWorkingDay(date: Date, region: string = 'FR'): Date {
  let nextDay = addDays(date, 1);
  const year = nextDay.getFullYear();
  const holidays = getFrenchHolidays(year, region);
  
  while (true) {
    const dayOfWeek = nextDay.getDay(); // 0 = Sunday, 6 = Saturday
    const dateStr = formatDateISO(nextDay);
    
    // Skip weekends (Saturday = 6, Sunday = 0) and holidays
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateStr)) {
      break;
    }
    
    nextDay = addDays(nextDay, 1);
    
    // Handle year boundary
    if (nextDay.getFullYear() !== year) {
      const newHolidays = getFrenchHolidays(nextDay.getFullYear(), region);
      // Merge holidays for the new year
      newHolidays.forEach(holiday => holidays.add(holiday));
    }
  }
  
  return nextDay;
}

/**
 * Count working days between two dates, excluding weekends and holidays
 * 
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @param region - French region code for holiday calculation
 * @returns Number of working days
 */
export function countWorkingDays(startDate: Date, endDate: Date, region: string = 'FR'): number {
  if (startDate > endDate) return 0;
  
  let count = 0;
  const current = new Date(startDate);
  const holidays = new Set<string>();
  
  // Pre-calculate holidays for all years in the range
  for (let year = startDate.getFullYear(); year <= endDate.getFullYear(); year++) {
    const yearHolidays = getFrenchHolidays(year, region);
    yearHolidays.forEach(holiday => holidays.add(holiday));
  }
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    const dateStr = formatDateISO(current);
    
    // Count if it's not a weekend and not a holiday
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateStr)) {
      count++;
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}
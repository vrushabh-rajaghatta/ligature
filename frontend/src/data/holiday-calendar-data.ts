// ============================================================================
// holiday-calendar-data.ts — v0.63.0
// LIG-019: Holiday Calendar Integration
// Configurable per-market/country holiday calendars for use in plan timeline
// ============================================================================

export interface HolidayEntry {
  id: string;
  date: string;           // YYYY-MM-DD
  name: string;
  market: string;         // matches GSPSubmission.market
  country: string;        // display name
  type: 'public' | 'agency-closure' | 'custom';
  description?: string;
}

export interface HolidayCalendar {
  id: string;
  market: string;
  country: string;
  flag: string;
  isActive: boolean;
  source: string;         // "FDA Official Calendar", "EMA Agency Calendar", etc.
  lastUpdated: string;
  holidays: HolidayEntry[];
}

// ============================================================================
// 2026 Holiday data — FDA (US), EMA (EU), PMDA (Japan)
// Covers the submission window for Ligrastinib (Apr–Sep 2026)
// ============================================================================

export const holidayCalendars: HolidayCalendar[] = [
  {
    id: 'cal-us',
    market: 'US',
    country: 'United States',
    flag: '🇺🇸',
    isActive: true,
    source: 'FDA Official Holiday Schedule',
    lastUpdated: '2026-01-15',
    holidays: [
      { id: 'us-mlk-2026', date: '2026-01-19', name: "Martin Luther King Jr. Day", market: 'US', country: 'United States', type: 'public' },
      { id: 'us-pres-2026', date: '2026-02-16', name: "Presidents' Day", market: 'US', country: 'United States', type: 'public' },
      { id: 'us-mem-2026', date: '2026-05-25', name: 'Memorial Day', market: 'US', country: 'United States', type: 'public', description: 'FDA offices closed — no submissions processed' },
      { id: 'us-jul4-2026', date: '2026-07-03', name: 'Independence Day (observed)', market: 'US', country: 'United States', type: 'public', description: 'FDA bridge day — July 4 falls on Saturday' },
      { id: 'us-labor-2026', date: '2026-09-07', name: 'Labor Day', market: 'US', country: 'United States', type: 'public', description: 'FDA offices closed — eCTD submissions received but not reviewed' },
      { id: 'us-col-2026', date: '2026-10-12', name: 'Columbus Day', market: 'US', country: 'United States', type: 'public' },
      { id: 'us-vet-2026', date: '2026-11-11', name: "Veterans' Day", market: 'US', country: 'United States', type: 'public' },
      { id: 'us-thanks-2026', date: '2026-11-26', name: 'Thanksgiving Day', market: 'US', country: 'United States', type: 'public', description: 'FDA closed — plan for extended review pause' },
      { id: 'us-xmas-2026', date: '2026-12-25', name: 'Christmas Day', market: 'US', country: 'United States', type: 'public' },
    ],
  },
  {
    id: 'cal-eu',
    market: 'EU',
    country: 'European Union',
    flag: '🇪🇺',
    isActive: true,
    source: 'EMA Agency Calendar',
    lastUpdated: '2026-01-20',
    holidays: [
      { id: 'eu-ny-2026', date: '2026-01-01', name: "New Year's Day", market: 'EU', country: 'European Union', type: 'agency-closure' },
      { id: 'eu-easter-2026', date: '2026-04-03', name: 'Good Friday', market: 'EU', country: 'European Union', type: 'agency-closure', description: 'EMA closed — CHMP meetings paused' },
      { id: 'eu-easter-mon-2026', date: '2026-04-06', name: 'Easter Monday', market: 'EU', country: 'European Union', type: 'agency-closure' },
      { id: 'eu-labour-2026', date: '2026-05-01', name: 'Labour Day', market: 'EU', country: 'European Union', type: 'agency-closure' },
      { id: 'eu-asc-2026', date: '2026-05-14', name: 'Ascension Day', market: 'EU', country: 'European Union', type: 'agency-closure' },
      { id: 'eu-whit-2026', date: '2026-05-25', name: 'Whit Monday', market: 'EU', country: 'European Union', type: 'agency-closure' },
      { id: 'eu-sum-2026', date: '2026-08-03', name: 'EMA Summer Closure (start)', market: 'EU', country: 'European Union', type: 'agency-closure', description: 'EMA reduced operations 3–14 August 2026' },
      { id: 'eu-sum-end-2026', date: '2026-08-14', name: 'EMA Summer Closure (end)', market: 'EU', country: 'European Union', type: 'agency-closure' },
      { id: 'eu-xmas-2026', date: '2026-12-25', name: 'Christmas / Winter Closure', market: 'EU', country: 'European Union', type: 'agency-closure', description: 'EMA closed 25 Dec – 2 Jan 2027' },
    ],
  },
  {
    id: 'cal-jp',
    market: 'Japan',
    country: 'Japan',
    flag: '🇯🇵',
    isActive: true,
    source: 'PMDA Administrative Calendar',
    lastUpdated: '2026-01-10',
    holidays: [
      { id: 'jp-ny-2026', date: '2026-01-01', name: "New Year's Holiday", market: 'Japan', country: 'Japan', type: 'agency-closure', description: 'PMDA closed 1–3 January' },
      { id: 'jp-comday-2026', date: '2026-01-12', name: 'Coming of Age Day', market: 'Japan', country: 'Japan', type: 'public' },
      { id: 'jp-natfound-2026', date: '2026-02-11', name: 'National Foundation Day', market: 'Japan', country: 'Japan', type: 'public' },
      { id: 'jp-vernaleq-2026', date: '2026-03-20', name: 'Vernal Equinox Day', market: 'Japan', country: 'Japan', type: 'public' },
      { id: 'jp-showa-2026', date: '2026-04-29', name: 'Showa Day', market: 'Japan', country: 'Japan', type: 'public' },
      { id: 'jp-constit-2026', date: '2026-05-03', name: 'Constitution Day', market: 'Japan', country: 'Japan', type: 'public' },
      { id: 'jp-greenery-2026', date: '2026-05-04', name: 'Greenery Day', market: 'Japan', country: 'Japan', type: 'public' },
      { id: 'jp-children-2026', date: '2026-05-05', name: "Children's Day", market: 'Japan', country: 'Japan', type: 'public', description: 'Golden Week — PMDA closed Mon–Tue' },
      { id: 'jp-marine-2026', date: '2026-07-20', name: 'Marine Day', market: 'Japan', country: 'Japan', type: 'public' },
      { id: 'jp-mountain-2026', date: '2026-08-11', name: 'Mountain Day', market: 'Japan', country: 'Japan', type: 'public' },
      { id: 'jp-respect-2026', date: '2026-09-21', name: 'Respect for the Aged Day', market: 'Japan', country: 'Japan', type: 'public' },
      { id: 'jp-autumn-2026', date: '2026-09-23', name: 'Autumn Equinox Day', market: 'Japan', country: 'Japan', type: 'public' },
    ],
  },
];

// Helper: get all active holidays for a set of markets within a date range
export function getHolidaysForMarkets(
  markets: string[],
  fromDate: string,
  toDate: string,
): HolidayEntry[] {
  const from = new Date(fromDate).getTime();
  const to = new Date(toDate).getTime();
  const result: HolidayEntry[] = [];

  for (const cal of holidayCalendars) {
    if (!cal.isActive || !markets.includes(cal.market)) continue;
    for (const h of cal.holidays) {
      const d = new Date(h.date).getTime();
      if (d >= from && d <= to) result.push(h);
    }
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

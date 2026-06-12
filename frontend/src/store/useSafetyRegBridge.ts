

// ============================================================================
// Safety-Regulatory Bridge Store - v75
// Connects Safety Core (v73) to Aggregate Reports (v55) and CTD Submissions
// ============================================================================

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { useMemo } from 'react'
import type {
  ReportingPeriodConfig, ReportingPeriod, RegionalDueDate, PeriodStatus,
  LineListingConfig, GeneratedLineListing, LineListingRow, LineListingSummary, ExportRecord,
  SummaryTableConfig, GeneratedSummaryTable, SummaryTableRow,
  CTDSafetyMapping, CTDCrossReference,
  SignalAggregateLink, SignalStatisticsSnapshot,
  BenefitRiskAssessment, IndicationBRAssessment, BRFactor, BRRecommendation,
  CaseSnapshot, SnapshotSummary,
  SafetyRegBridgeView, SafetyRegBridgeFilters, SafetyRegBridgeState, SafetyRegBridgeActions,
  LineListingFilters, LineListingColumnConfig,
} from './safetyRegBridgeTypes'
import { usePharmacovigilanceStore } from './usePharmacovigilanceStore'

// ============================================================================
// STANDARD COLUMN CONFIGURATION
// ============================================================================

export const STANDARD_LINE_LISTING_COLUMNS: LineListingColumnConfig[] = [
  { id: 'case-number', fieldPath: 'caseNumber', header: 'Case #', width: 100, order: 1, required: true, visible: true, format: 'text' },
  { id: 'country', fieldPath: 'safetyReport.reportCountry', header: 'Country', width: 60, order: 2, required: false, visible: true, format: 'text' },
  { id: 'age', fieldPath: 'patient.age', header: 'Age', width: 40, order: 3, required: false, visible: true, format: 'number' },
  { id: 'sex', fieldPath: 'patient.sex', header: 'Sex', width: 30, order: 4, required: false, visible: true, format: 'text' },
  { id: 'event-pt', fieldPath: 'reactions[*].meddraPT', header: 'Event (PT)', width: 150, order: 5, required: true, visible: true, format: 'list', listSeparator: '; ' },
  { id: 'event-soc', fieldPath: 'reactions[*].meddraSOC', header: 'SOC', width: 150, order: 6, required: false, visible: true, format: 'list', listSeparator: '; ' },
  { id: 'onset-date', fieldPath: 'reactions[0].onsetDate', header: 'Onset Date', width: 90, order: 7, required: false, visible: true, format: 'date', dateFormat: 'DD-MMM-YYYY' },
  { id: 'seriousness', fieldPath: 'safetyReport.seriousness', header: 'Serious', width: 80, order: 8, required: true, visible: true, format: 'text' },
  { id: 'outcome', fieldPath: 'reactions[0].outcome', header: 'Outcome', width: 80, order: 9, required: false, visible: true, format: 'text' },
  { id: 'causality', fieldPath: 'drugs[0].causalityAssessment', header: 'Causality', width: 80, order: 10, required: false, visible: true, format: 'text' },
  { id: 'receipt-date', fieldPath: 'receiptDate', header: 'Receipt Date', width: 90, order: 11, required: true, visible: true, format: 'date', dateFormat: 'DD-MMM-YYYY' },
  { id: 'source', fieldPath: 'safetyReport.primarySource', header: 'Source', width: 100, order: 12, required: false, visible: true, format: 'text' },
]

// ============================================================================
// UTILITIES
// ============================================================================

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
const timestamp = () => new Date().toISOString()
const dateStr = () => new Date().toISOString().split('T')[0]

// Calculate period dates from IBD and period number
const calculatePeriodDates = (ibd: string, periodNumber: number, frequencyMonths: number): { start: string; end: string; dlp: string } => {
  const ibdDate = new Date(ibd)
  const startMonths = (periodNumber - 1) * frequencyMonths
  const endMonths = periodNumber * frequencyMonths
  
  const start = new Date(ibdDate)
  start.setMonth(start.getMonth() + startMonths)
  
  const end = new Date(ibdDate)
  end.setMonth(end.getMonth() + endMonths)
  end.setDate(end.getDate() - 1)
  
  // DLP is typically end of period
  const dlp = new Date(end)
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    dlp: dlp.toISOString().split('T')[0],
  }
}

// Get frequency in months
const getFrequencyMonths = (freq: string): number => {
  switch (freq) {
    case '6-month': return 6
    case '12-month': case 'annual': return 12
    case '36-month': return 36
    default: return 12
  }
}

// Determine period status based on dates
const determinePeriodStatus = (start: string, end: string, dlp: string): PeriodStatus => {
  const now = new Date()
  const startDate = new Date(start)
  const endDate = new Date(end)
  const dlpDate = new Date(dlp)
  const upcoming = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
  
  if (startDate > upcoming) return 'future'
  if (startDate > now && startDate <= upcoming) return 'upcoming'
  if (now >= startDate && now <= endDate) return 'active'
  if (now > dlpDate) return 'data-lock'
  return 'active'
}

// Extract value from case using field path
const extractValue = (obj: Record<string, unknown> | unknown[] | null | undefined, path: string): unknown => {
  if (!obj || !path) return null
  
  // Handle array wildcards like 'reactions[*].meddraPT'
  if (path.includes('[*]')) {
    const [arrayPath, ...rest] = path.split('[*].')
    const arr = extractValue(obj, arrayPath)
    if (!Array.isArray(arr)) return null
    const restPath = rest.join('[*].')
    return arr.map(item => restPath ? extractValue(item as Record<string, unknown>, restPath) : item).filter(Boolean)
  }
  
  // Handle specific array index like 'reactions[0].meddraPT'
  const arrayMatch = path.match(/^([^[]+)\[(\d+)\]\.?(.*)$/)
  if (arrayMatch) {
    const [, arrayPath, index, restPath] = arrayMatch
    const arr = extractValue(obj, arrayPath)
    if (!Array.isArray(arr) || !arr[parseInt(index)]) return null
    return restPath ? extractValue(arr[parseInt(index)] as Record<string, unknown>, restPath) : arr[parseInt(index)]
  }
  
  // Simple dot notation
  return path.split('.').reduce((acc: unknown, key) => (acc as Record<string, unknown>)?.[key], obj)
}

// Format value based on column config
const formatValue = (value: unknown, format: string, options?: { dateFormat?: string; listSeparator?: string }): string => {
  if (value === null || value === undefined) return ''
  
  switch (format) {
    case 'date':
      if (!value) return ''
      const d = new Date(value as string | number)
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
    case 'number':
      return String(value)
    case 'boolean':
      return value ? 'Yes' : 'No'
    case 'list':
      if (Array.isArray(value)) return value.join(options?.listSeparator || ', ')
      return String(value)
    default:
      return String(value)
  }
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const createInitialFilters = (): SafetyRegBridgeFilters => ({
  productId: 'all',
  reportType: 'all',
  periodStatus: 'all',
  region: 'all',
  dateRange: null,
  searchQuery: '',
})

const initialState: SafetyRegBridgeState = {
  periodConfigs: {},
  periods: {},
  selectedPeriodId: null,
  lineListingConfigs: {},
  generatedListings: {},
  selectedListingId: null,
  summaryTableConfigs: {},
  generatedTables: {},
  ctdMappings: {},
  signalAggregateLinks: {},
  benefitRiskAssessments: {},
  caseSnapshots: {},
  view: 'dashboard',
  filters: createInitialFilters(),
  isLoading: false,
  isGenerating: false,
  error: null,
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

type SafetyRegBridgeStore = SafetyRegBridgeState & SafetyRegBridgeActions

export const useSafetyRegBridge = create<SafetyRegBridgeStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ========================================
      // PERIOD MANAGEMENT
      // ========================================

      createPeriodConfig: (config) => {
        const id = generateId('pconfig')
        const now = timestamp()
        const newConfig: ReportingPeriodConfig = { ...config, id, createdAt: now, updatedAt: now }
        set(state => ({ periodConfigs: { ...state.periodConfigs, [id]: newConfig } }))
        return newConfig
      },

      updatePeriodConfig: (id, updates) => set(state => {
        if (!state.periodConfigs[id]) return state
        return { periodConfigs: { ...state.periodConfigs, [id]: { ...state.periodConfigs[id], ...updates, updatedAt: timestamp() } } }
      }),

      deletePeriodConfig: (id) => set(state => {
        const { [id]: _, ...rest } = state.periodConfigs
        return { periodConfigs: rest }
      }),

      generatePeriodsFromConfig: (configId, count) => {
        const config = get().periodConfigs[configId]
        if (!config) return []
        
        const frequencyMonths = getFrequencyMonths(config.frequency)
        const periods: ReportingPeriod[] = []
        
        for (let i = 1; i <= count; i++) {
          const dates = calculatePeriodDates(config.internationalBirthDate, i, frequencyMonths)
          const id = generateId('period')
          
          const regionalDueDates: RegionalDueDate[] = config.regionalConfigs.map(rc => ({
            region: rc.region,
            authority: rc.authority,
            dueDate: new Date(new Date(dates.dlp).getTime() + rc.daysAfterDLPForSubmission * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            submittedDate: null,
            status: 'pending',
            referenceNumber: null,
          }))
          
          const earliestDue = regionalDueDates.reduce((min, rd) => rd.dueDate < min ? rd.dueDate : min, regionalDueDates[0]?.dueDate || dates.dlp)
          
          const period: ReportingPeriod = {
            id,
            configId,
            productId: config.productId,
            productName: config.productName,
            reportType: config.reportType,
            periodNumber: i,
            periodLabel: `${config.reportType} #${i}`,
            periodStartDate: dates.start,
            periodEndDate: dates.end,
            dataLockPoint: dates.dlp,
            regionalDueDates,
            earliestDueDate: earliestDue,
            status: determinePeriodStatus(dates.start, dates.end, dates.dlp),
            linkedReportIds: [],
            snapshotId: null,
            snapshotCreatedAt: null,
            createdAt: timestamp(),
            updatedAt: timestamp(),
          }
          
          periods.push(period)
        }
        
        set(state => ({
          periods: { ...state.periods, ...Object.fromEntries(periods.map(p => [p.id, p])) }
        }))
        
        return periods
      },

      selectPeriod: (id) => set({ selectedPeriodId: id }),

      updatePeriodStatus: (id, status) => set(state => {
        if (!state.periods[id]) return state
        return { periods: { ...state.periods, [id]: { ...state.periods[id], status, updatedAt: timestamp() } } }
      }),

      // ========================================
      // LINE LISTING
      // ========================================

      createLineListingConfig: (config) => {
        const id = generateId('llconfig')
        const now = timestamp()
        const newConfig: LineListingConfig = { ...config, id, createdAt: now, updatedAt: now }
        set(state => ({ lineListingConfigs: { ...state.lineListingConfigs, [id]: newConfig } }))
        return newConfig
      },

      updateLineListingConfig: (id, updates) => set(state => {
        if (!state.lineListingConfigs[id]) return state
        return { lineListingConfigs: { ...state.lineListingConfigs, [id]: { ...state.lineListingConfigs[id], ...updates, updatedAt: timestamp() } } }
      }),

      deleteLineListingConfig: (id) => set(state => {
        const { [id]: _, ...rest } = state.lineListingConfigs
        return { lineListingConfigs: rest }
      }),

      generateLineListing: (configId, periodId, dataLockPoint) => {
        set({ isGenerating: true })
        
        const config = get().lineListingConfigs[configId]
        if (!config) {
          set({ isGenerating: false, error: 'Line listing config not found' })
          return null as any
        }
        
        // Get cases from Safety Store
        const safetyStore = usePharmacovigilanceStore.getState()
        let cases = Object.values(safetyStore.cases)
        
        // Apply filters
        const filters = config.filters
        
        // Filter by product
        if (filters.productIds.length > 0) {
          cases = cases.filter(c => c.drugs.some(d => filters.productIds.includes(d.medicinalProductName) || filters.productIds.some(pid => d.medicinalProductName.toLowerCase().includes(pid.toLowerCase()))))
        }
        
        // Filter by date range / data lock point
        const dlp = dataLockPoint || dateStr()
        cases = cases.filter(c => c.receiptDate <= dlp)
        
        if (filters.dateRange) {
          cases = cases.filter(c => c.receiptDate >= filters.dateRange!.start && c.receiptDate <= filters.dateRange!.end)
        }
        
        // Filter by seriousness
        if (filters.seriousness.length > 0) {
          cases = cases.filter(c => filters.seriousness.includes(c.safetyReport.seriousness))
        }
        
        // Filter by outcome
        if (filters.outcomes.length > 0) {
          cases = cases.filter(c => c.reactions.some(r => filters.outcomes.includes(r.outcome)))
        }
        
        // Filter by causality
        if (filters.causality.length > 0) {
          cases = cases.filter(c => c.drugs.some(d => filters.causality.includes(d.causalityAssessment)))
        }
        
        // Filter by source
        if (filters.sources.length > 0) {
          cases = cases.filter(c => filters.sources.includes(c.safetyReport.primarySource))
        }
        
        // Filter by report type
        if (filters.reportTypes.length > 0) {
          cases = cases.filter(c => filters.reportTypes.includes(c.safetyReport.reportType))
        }
        
        // Filter by signal
        if (filters.signalIds.length > 0) {
          const signals = Object.values(safetyStore.signals)
          const signalCaseIds = new Set(signals.filter(s => filters.signalIds.includes(s.id)).flatMap(s => s.linkedCaseIds))
          cases = cases.filter(c => signalCaseIds.has(c.id))
        }
        
        // Generate rows
        const visibleColumns = config.columns.filter(col => col.visible).sort((a, b) => a.order - b.order)
        
        const rows: LineListingRow[] = cases.map(c => {
          const values: Record<string, string | number | boolean | null> = {}
          
          for (const col of visibleColumns) {
            const rawValue = extractValue(c as unknown as Record<string, unknown>, col.fieldPath)
            values[col.id] = formatValue(rawValue, col.format, { dateFormat: col.dateFormat, listSeparator: col.listSeparator })
          }
          
          return {
            caseId: c.id,
            caseNumber: c.caseNumber,
            values,
            narrativeSnippet: config.includeNarrativeSnippet ? (c.narrative.caseSummary.slice(0, config.maxNarrativeLength) + (c.narrative.caseSummary.length > config.maxNarrativeLength ? '...' : '')) : null,
            flagged: c.safetyReport.seriousness.startsWith('serious'),
            flagReason: c.safetyReport.seriousness.startsWith('serious') ? 'Serious case' : null,
          }
        })
        
        // Sort
        if (config.sortBy) {
          rows.sort((a, b) => {
            const aVal = a.values[config.sortBy] || ''
            const bVal = b.values[config.sortBy] || ''
            const cmp = String(aVal).localeCompare(String(bVal))
            return config.sortOrder === 'desc' ? -cmp : cmp
          })
        }
        
        // Calculate summary
        const summary: LineListingSummary = {
          totalCases: cases.length,
          seriousCases: cases.filter(c => c.safetyReport.seriousness.startsWith('serious')).length,
          fatalCases: cases.filter(c => c.safetyReport.seriousness === 'serious-death').length,
          bySOC: Object.entries(cases.reduce((acc, c) => {
            c.reactions.forEach(r => { acc[r.meddraSOC] = (acc[r.meddraSOC] || 0) + 1 })
            return acc
          }, {} as Record<string, number>)).map(([soc, count]) => ({ soc, count })).sort((a, b) => b.count - a.count),
          byOutcome: Object.entries(cases.reduce((acc, c) => {
            c.reactions.forEach(r => { acc[r.outcome] = (acc[r.outcome] || 0) + 1 })
            return acc
          }, {} as Record<string, number>)).map(([outcome, count]) => ({ outcome, count })),
          byCausality: Object.entries(cases.reduce((acc, c) => {
            c.drugs.forEach(d => { acc[d.causalityAssessment] = (acc[d.causalityAssessment] || 0) + 1 })
            return acc
          }, {} as Record<string, number>)).map(([causality, count]) => ({ causality, count })),
          bySource: Object.entries(cases.reduce((acc, c) => {
            acc[c.safetyReport.primarySource] = (acc[c.safetyReport.primarySource] || 0) + 1
            return acc
          }, {} as Record<string, number>)).map(([source, count]) => ({ source, count })),
        }
        
        const id = generateId('listing')
        const listing: GeneratedLineListing = {
          id,
          configId,
          periodId,
          productId: filters.productIds[0] || 'all',
          generatedAt: timestamp(),
          generatedBy: 'system',
          dataLockPoint: dlp,
          totalCases: rows.length,
          rows,
          columns: visibleColumns,
          summary,
          exportedFormats: [],
        }
        
        set(state => ({
          generatedListings: { ...state.generatedListings, [id]: listing },
          isGenerating: false,
        }))
        
        return listing
      },

      selectListing: (id) => set({ selectedListingId: id }),

      exportLineListing: (listingId, format) => {
        const listing = get().generatedListings[listingId]
        if (!listing) return null as any
        
        const record: ExportRecord = {
          format,
          exportedAt: timestamp(),
          exportedBy: 'system',
          filePath: `/exports/line-listing-${listingId}.${format}`,
        }
        
        set(state => ({
          generatedListings: {
            ...state.generatedListings,
            [listingId]: {
              ...listing,
              exportedFormats: [...listing.exportedFormats, record],
            },
          },
        }))
        
        return record
      },

      // ========================================
      // SUMMARY TABLES
      // ========================================

      createSummaryTableConfig: (config) => {
        const id = generateId('stconfig')
        const newConfig: SummaryTableConfig = { ...config, id, createdAt: timestamp() }
        set(state => ({ summaryTableConfigs: { ...state.summaryTableConfigs, [id]: newConfig } }))
        return newConfig
      },

      generateSummaryTable: (configId, periodId) => {
        set({ isGenerating: true })
        
        const config = get().summaryTableConfigs[configId]
        if (!config) {
          set({ isGenerating: false, error: 'Summary table config not found' })
          return null as any
        }
        
        // Get cases from Safety Store
        const safetyStore = usePharmacovigilanceStore.getState()
        let cases = Object.values(safetyStore.cases)
        
        // Filter by product
        if (config.productIds.length > 0) {
          cases = cases.filter(c => c.drugs.some(d => config.productIds.some(pid => d.medicinalProductName.toLowerCase().includes(pid.toLowerCase()))))
        }
        
        // Filter by period if specified
        if (periodId) {
          const period = get().periods[periodId]
          if (period) {
            cases = cases.filter(c => c.receiptDate >= period.periodStartDate && c.receiptDate <= period.dataLockPoint)
          }
        }
        
        // Filter non-serious if needed
        if (!config.includeNonSerious) {
          cases = cases.filter(c => c.safetyReport.seriousness.startsWith('serious'))
        }
        
        // Generate table based on type
        let title = ''
        let headers: string[] = []
        let rows: SummaryTableRow[] = []
        let footnotes: string[] = []
        
        const totalCases = cases.length
        const totalSerious = cases.filter(c => c.safetyReport.seriousness.startsWith('serious')).length
        const totalFatal = cases.filter(c => c.safetyReport.seriousness === 'serious-death').length
        
        switch (config.tableType) {
          case 'soc-pt-summary': {
            title = 'Summary of Adverse Events by System Organ Class and Preferred Term'
            headers = ['System Organ Class / Preferred Term', 'Total', 'Serious', 'Fatal']
            if (config.showPercentages) headers.push('% of Total')
            
            // Group by SOC then PT
            const socMap = new Map<string, { total: number; serious: number; fatal: number; pts: Map<string, { total: number; serious: number; fatal: number }> }>()
            
            cases.forEach(c => {
              c.reactions.forEach(r => {
                if (!socMap.has(r.meddraSOC)) {
                  socMap.set(r.meddraSOC, { total: 0, serious: 0, fatal: 0, pts: new Map() })
                }
                const soc = socMap.get(r.meddraSOC)!
                soc.total++
                if (r.seriousnessAtEvent) soc.serious++
                if (c.safetyReport.seriousness === 'serious-death') soc.fatal++
                
                if (!soc.pts.has(r.meddraPT)) {
                  soc.pts.set(r.meddraPT, { total: 0, serious: 0, fatal: 0 })
                }
                const pt = soc.pts.get(r.meddraPT)!
                pt.total++
                if (r.seriousnessAtEvent) pt.serious++
                if (c.safetyReport.seriousness === 'serious-death') pt.fatal++
              })
            })
            
            // Sort by total descending
            const sortedSOCs = Array.from(socMap.entries()).sort((a, b) => b[1].total - a[1].total)
            
            let rowIndex = 0
            sortedSOCs.forEach(([socName, socData]) => {
              // SOC header row
              const socValues = [String(socData.total), String(socData.serious), String(socData.fatal)]
              if (config.showPercentages) socValues.push(`${((socData.total / totalCases) * 100).toFixed(1)}%`)
              
              rows.push({
                rowId: `row-${rowIndex++}`,
                rowLabel: socName,
                indent: 0,
                isHeader: true,
                isTotal: false,
                values: socValues,
                highlighted: socData.fatal > 0,
              })
              
              // PT rows under SOC
              const sortedPTs = Array.from(socData.pts.entries())
                .filter(([, data]) => data.total >= config.minimumCaseCount)
                .sort((a, b) => b[1].total - a[1].total)
              
              sortedPTs.forEach(([ptName, ptData]) => {
                const ptValues = [String(ptData.total), String(ptData.serious), String(ptData.fatal)]
                if (config.showPercentages) ptValues.push(`${((ptData.total / totalCases) * 100).toFixed(1)}%`)
                
                rows.push({
                  rowId: `row-${rowIndex++}`,
                  rowLabel: ptName,
                  indent: 1,
                  isHeader: false,
                  isTotal: false,
                  values: ptValues,
                  highlighted: ptData.fatal > 0,
                })
              })
            })
            
            footnotes = ['MedDRA version 27.0', `Data lock point: ${periodId ? get().periods[periodId]?.dataLockPoint : dateStr()}`]
            break
          }
          
          case 'demographics-summary': {
            title = 'Summary of Adverse Events by Patient Demographics'
            headers = ['Category', 'Value', 'Cases', 'Serious', 'Fatal']
            if (config.showPercentages) headers.push('% of Total')
            
            // Age groups
            const ageGroups = { '<18': 0, '18-44': 0, '45-64': 0, '65-74': 0, '>=75': 0, 'Unknown': 0 }
            const ageSeriousness = { '<18': { s: 0, f: 0 }, '18-44': { s: 0, f: 0 }, '45-64': { s: 0, f: 0 }, '65-74': { s: 0, f: 0 }, '>=75': { s: 0, f: 0 }, 'Unknown': { s: 0, f: 0 } }
            
            cases.forEach(c => {
              const age = c.patient.age
              let group = 'Unknown'
              if (age !== null) {
                if (age < 18) group = '<18'
                else if (age < 45) group = '18-44'
                else if (age < 65) group = '45-64'
                else if (age < 75) group = '65-74'
                else group = '>=75'
              }
              ageGroups[group as keyof typeof ageGroups]++
              if (c.safetyReport.seriousness.startsWith('serious')) ageSeriousness[group as keyof typeof ageSeriousness].s++
              if (c.safetyReport.seriousness === 'serious-death') ageSeriousness[group as keyof typeof ageSeriousness].f++
            })
            
            let rowIndex = 0
            rows.push({ rowId: `row-${rowIndex++}`, rowLabel: 'Age Group', indent: 0, isHeader: true, isTotal: false, values: ['', '', '', ''], highlighted: false })
            Object.entries(ageGroups).forEach(([group, count]) => {
              const vals = [group, String(count), String(ageSeriousness[group as keyof typeof ageSeriousness].s), String(ageSeriousness[group as keyof typeof ageSeriousness].f)]
              if (config.showPercentages) vals.push(`${((count / totalCases) * 100).toFixed(1)}%`)
              rows.push({ rowId: `row-${rowIndex++}`, rowLabel: 'Age', indent: 1, isHeader: false, isTotal: false, values: vals, highlighted: false })
            })
            
            // Sex
            const sexCounts = { male: 0, female: 0, unknown: 0 }
            const sexSeriousness = { male: { s: 0, f: 0 }, female: { s: 0, f: 0 }, unknown: { s: 0, f: 0 } }
            cases.forEach(c => {
              sexCounts[c.patient.sex]++
              if (c.safetyReport.seriousness.startsWith('serious')) sexSeriousness[c.patient.sex].s++
              if (c.safetyReport.seriousness === 'serious-death') sexSeriousness[c.patient.sex].f++
            })
            
            rows.push({ rowId: `row-${rowIndex++}`, rowLabel: 'Sex', indent: 0, isHeader: true, isTotal: false, values: ['', '', '', ''], highlighted: false })
            Object.entries(sexCounts).forEach(([sex, count]) => {
              const vals = [sex.charAt(0).toUpperCase() + sex.slice(1), String(count), String(sexSeriousness[sex as keyof typeof sexSeriousness].s), String(sexSeriousness[sex as keyof typeof sexSeriousness].f)]
              if (config.showPercentages) vals.push(`${((count / totalCases) * 100).toFixed(1)}%`)
              rows.push({ rowId: `row-${rowIndex++}`, rowLabel: 'Sex', indent: 1, isHeader: false, isTotal: false, values: vals, highlighted: false })
            })
            
            footnotes = [`Total cases: ${totalCases}`]
            break
          }
          
          case 'causality-summary': {
            title = 'Summary of Adverse Events by Causality Assessment'
            headers = ['Causality Assessment', 'Cases', 'Serious', 'Fatal']
            if (config.showPercentages) headers.push('% of Total')
            
            const causalityMap = new Map<string, { total: number; serious: number; fatal: number }>()
            cases.forEach(c => {
              c.drugs.forEach(d => {
                if (!causalityMap.has(d.causalityAssessment)) {
                  causalityMap.set(d.causalityAssessment, { total: 0, serious: 0, fatal: 0 })
                }
                const data = causalityMap.get(d.causalityAssessment)!
                data.total++
                if (c.safetyReport.seriousness.startsWith('serious')) data.serious++
                if (c.safetyReport.seriousness === 'serious-death') data.fatal++
              })
            })
            
            let rowIndex = 0
            Array.from(causalityMap.entries()).sort((a, b) => b[1].total - a[1].total).forEach(([causality, data]) => {
              const vals = [String(data.total), String(data.serious), String(data.fatal)]
              if (config.showPercentages) vals.push(`${((data.total / totalCases) * 100).toFixed(1)}%`)
              rows.push({
                rowId: `row-${rowIndex++}`,
                rowLabel: causality.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                indent: 0,
                isHeader: false,
                isTotal: false,
                values: vals,
                highlighted: causality === 'related',
              })
            })
            
            footnotes = ['Causality assessed per WHO-UMC criteria']
            break
          }
          
          default: {
            title = `Summary Table - ${config.tableType}`
            headers = ['Category', 'Count']
            rows = [{ rowId: 'row-0', rowLabel: 'Total Cases', indent: 0, isHeader: false, isTotal: true, values: [String(totalCases)], highlighted: false }]
          }
        }
        
        const id = generateId('table')
        const table: GeneratedSummaryTable = {
          id,
          configId,
          periodId,
          tableType: config.tableType,
          generatedAt: timestamp(),
          generatedBy: 'system',
          dataLockPoint: periodId ? get().periods[periodId]?.dataLockPoint || dateStr() : dateStr(),
          title,
          headers,
          rows,
          footnotes,
          totals: { totalCases, totalSerious, totalFatal },
        }
        
        set(state => ({
          generatedTables: { ...state.generatedTables, [id]: table },
          isGenerating: false,
        }))
        
        return table
      },

      // ========================================
      // CTD MAPPING
      // ========================================

      createCTDMapping: (mapping) => {
        const id = generateId('ctdmap')
        const now = timestamp()
        const newMapping: CTDSafetyMapping = { ...mapping, id, mappedAt: now, updatedAt: now }
        set(state => ({ ctdMappings: { ...state.ctdMappings, [id]: newMapping } }))
        return newMapping
      },

      updateCTDMapping: (id, updates) => set(state => {
        if (!state.ctdMappings[id]) return state
        return { ctdMappings: { ...state.ctdMappings, [id]: { ...state.ctdMappings[id], ...updates, updatedAt: timestamp() } } }
      }),

      linkMappingToSequence: (mappingId, sequenceBuildId, leafNumber) => {
        get().updateCTDMapping(mappingId, { sequenceBuildId, leafNumber, status: 'linked' })
      },

      // ========================================
      // SIGNAL INTEGRATION
      // ========================================

      linkSignalToReport: (signalId, reportId, section) => {
        const safetyStore = usePharmacovigilanceStore.getState()
        const signal = safetyStore.signals[signalId]
        if (!signal) return null as any
        
        const id = generateId('siglink')
        const link: SignalAggregateLink = {
          id,
          signalId,
          signalTitle: signal.title,
          signalStatus: signal.status,
          aggregateReportId: reportId,
          aggregateReportType: 'DSUR', // Default, should be determined from report
          periodId: '',
          reportSection: section,
          sectionNumber: '',
          signalNarrative: signal.description,
          evaluationSummary: signal.medicalAssessment || '',
          conclusion: signal.status === 'validated' ? 'confirmed' : signal.status === 'closed-no-action' ? 'closed-no-action' : 'ongoing',
          recommendedActions: signal.recommendedActions.map(a => a.description),
          statisticsSnapshot: signal.statistics ? {
            capturedAt: timestamp(),
            caseCount: signal.caseCount,
            seriousCaseCount: signal.seriousCaseCount,
            fatalCaseCount: signal.fatalCaseCount,
            prr: signal.statistics.prr,
            prrLower95: signal.statistics.prrLower95,
            ror: signal.statistics.ror,
            rorLower95: signal.statistics.rorLower95,
            ebgm: signal.statistics.ebgm,
            ebgmLower95: signal.statistics.ebgmLower95,
            detectionMethod: signal.detectionMethod,
          } : null,
          notificationRequired: signal.priority === 'critical' || signal.priority === 'high',
          notificationSent: signal.regulatoryNotified,
          notificationDate: signal.regulatoryNotificationDate,
          notificationRegions: [],
          linkedAt: timestamp(),
          linkedBy: 'system',
        }
        
        set(state => ({ signalAggregateLinks: { ...state.signalAggregateLinks, [id]: link } }))
        return link
      },

      updateSignalLink: (linkId, updates) => set(state => {
        if (!state.signalAggregateLinks[linkId]) return state
        return { signalAggregateLinks: { ...state.signalAggregateLinks, [linkId]: { ...state.signalAggregateLinks[linkId], ...updates } } }
      }),

      captureSignalStatistics: (linkId) => {
        const link = get().signalAggregateLinks[linkId]
        if (!link) return
        
        const safetyStore = usePharmacovigilanceStore.getState()
        const signal = safetyStore.signals[link.signalId]
        if (!signal || !signal.statistics) return
        
        const snapshot: SignalStatisticsSnapshot = {
          capturedAt: timestamp(),
          caseCount: signal.caseCount,
          seriousCaseCount: signal.seriousCaseCount,
          fatalCaseCount: signal.fatalCaseCount,
          prr: signal.statistics.prr,
          prrLower95: signal.statistics.prrLower95,
          ror: signal.statistics.ror,
          rorLower95: signal.statistics.rorLower95,
          ebgm: signal.statistics.ebgm,
          ebgmLower95: signal.statistics.ebgmLower95,
          detectionMethod: signal.detectionMethod,
        }
        
        get().updateSignalLink(linkId, { statisticsSnapshot: snapshot })
      },

      // ========================================
      // BENEFIT-RISK
      // ========================================

      createBenefitRiskAssessment: (assessment) => {
        const id = generateId('brassess')
        const now = timestamp()
        const newAssessment: BenefitRiskAssessment = { ...assessment, id, createdAt: now, updatedAt: now }
        set(state => ({ benefitRiskAssessments: { ...state.benefitRiskAssessments, [id]: newAssessment } }))
        return newAssessment
      },

      updateBenefitRiskAssessment: (id, updates) => set(state => {
        if (!state.benefitRiskAssessments[id]) return state
        return { benefitRiskAssessments: { ...state.benefitRiskAssessments, [id]: { ...state.benefitRiskAssessments[id], ...updates, updatedAt: timestamp() } } }
      }),

      // ========================================
      // CASE SNAPSHOTS
      // ========================================

      createCaseSnapshot: (periodId, dataLockPoint) => {
        const period = get().periods[periodId]
        if (!period) return null as any
        
        const safetyStore = usePharmacovigilanceStore.getState()
        // Match cases by product ID or product name (case-insensitive)
        const productSearchTerms = [period.productId.toLowerCase(), period.productName.toLowerCase()]
        const cases = Object.values(safetyStore.cases).filter(c => 
          c.receiptDate <= dataLockPoint &&
          c.drugs.some(d => 
            productSearchTerms.some(term => 
              d.medicinalProductName.toLowerCase().includes(term) ||
              term.includes(d.medicinalProductName.toLowerCase())
            )
          )
        )
        
        const summary: SnapshotSummary = {
          totalCases: cases.length,
          newCasesThisPeriod: cases.filter(c => c.receiptDate >= period.periodStartDate).length,
          seriousCases: cases.filter(c => c.safetyReport.seriousness.startsWith('serious')).length,
          fatalCases: cases.filter(c => c.safetyReport.seriousness === 'serious-death').length,
          bySource: cases.reduce((acc, c) => { acc[c.safetyReport.primarySource] = (acc[c.safetyReport.primarySource] || 0) + 1; return acc }, {} as Record<string, number>),
          bySOC: cases.reduce((acc, c) => { c.reactions.forEach(r => { acc[r.meddraSOC] = (acc[r.meddraSOC] || 0) + 1 }); return acc }, {} as Record<string, number>),
          bySeriousness: cases.reduce((acc, c) => { acc[c.safetyReport.seriousness] = (acc[c.safetyReport.seriousness] || 0) + 1; return acc }, {} as Record<string, number>),
          byCausality: cases.reduce((acc, c) => { c.drugs.forEach(d => { acc[d.causalityAssessment] = (acc[d.causalityAssessment] || 0) + 1 }); return acc }, {} as Record<string, number>),
        }
        
        const id = generateId('snapshot')
        const snapshot: CaseSnapshot = {
          id,
          periodId,
          productId: period.productId,
          snapshotDate: timestamp(),
          dataLockPoint,
          createdBy: 'system',
          caseIds: cases.map(c => c.id),
          totalCases: cases.length,
          summary,
          locked: true,
          createdAt: timestamp(),
        }
        
        set(state => ({
          caseSnapshots: { ...state.caseSnapshots, [id]: snapshot },
          periods: { ...state.periods, [periodId]: { ...state.periods[periodId], snapshotId: id, snapshotCreatedAt: timestamp() } },
        }))
        
        return snapshot
      },

      // ========================================
      // VIEW & FILTERS
      // ========================================

      setView: (view) => set({ view }),
      setFilters: (filters) => set(state => ({ filters: { ...state.filters, ...filters } })),
      clearFilters: () => set({ filters: createInitialFilters() }),

      // ========================================
      // QUERIES
      // ========================================

      getPeriodsForProduct: (productId) => Object.values(get().periods).filter(p => p.productId.toLowerCase().includes(productId.toLowerCase())),
      
      getUpcomingPeriods: (days) => {
        const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        return Object.values(get().periods).filter(p => p.earliestDueDate <= cutoff && (p.status === 'upcoming' || p.status === 'active' || p.status === 'data-lock'))
      },
      
      getOverduePeriods: () => {
        const today = dateStr()
        return Object.values(get().periods).filter(p => p.earliestDueDate < today && p.status !== 'submitted' && p.status !== 'closed')
      },
      
      getListingsForPeriod: (periodId) => Object.values(get().generatedListings).filter(l => l.periodId === periodId),
      
      getMappingsForSubmission: (submissionId) => Object.values(get().ctdMappings).filter(m => m.submissionId === submissionId),
      
      getSignalLinksForReport: (reportId) => Object.values(get().signalAggregateLinks).filter(l => l.aggregateReportId === reportId),

      // ========================================
      // INITIALIZATION
      // ========================================

      initializeGoldenPath: () => {
        // Create default period config for Nexavant
        const configId = generateId('pconfig')
        const now = timestamp()
        
        const defaultConfig: ReportingPeriodConfig = {
          id: configId,
          productId: 'lig-2847',
          productName: 'Nexavant (ligrastinib)',
          activeSubstance: 'ligrastinib',
          internationalBirthDate: '2023-03-15',
          reportType: 'PSUR',
          frequency: '6-month',
          regionalConfigs: [
            { region: 'FDA', authority: 'FDA', required: true, daysAfterDLPForSubmission: 90, submissionFormat: 'ectd', additionalRequirements: [] },
            { region: 'EMA', authority: 'EMA', required: true, daysAfterDLPForSubmission: 70, submissionFormat: 'ectd', additionalRequirements: ['EURD compliance'] },
          ],
          autoSchedule: true,
          advanceNotificationDays: 30,
          createdAt: now,
          updatedAt: now,
        }
        
        set(state => ({ periodConfigs: { ...state.periodConfigs, [configId]: defaultConfig } }))
        
        // Generate first 3 periods
        get().generatePeriodsFromConfig(configId, 3)
        
        // Create default line listing config
        const llConfigId = generateId('llconfig')
        const defaultLLConfig: LineListingConfig = {
          id: llConfigId,
          name: 'Standard PSUR Line Listing',
          description: 'Standard line listing for PSUR submissions',
          listingType: 'all-cases',
          filters: {
            periodId: null,
            productIds: ['lig-2847', 'nexavant', 'ligrastinib'],
            seriousness: [],
            outcomes: [],
            causality: [],
            reportTypes: [],
            sources: [],
            signalIds: [],
            dateRange: null,
            countries: [],
            studyIds: [],
          },
          columns: [...STANDARD_LINE_LISTING_COLUMNS],
          sortBy: 'receipt-date',
          sortOrder: 'desc',
          includeNarrativeSnippet: true,
          maxNarrativeLength: 200,
          preserveBlinding: false,
          anonymizePatientId: true,
          regionalFormat: 'ich-standard',
          createdAt: now,
          updatedAt: now,
        }
        
        set(state => ({ lineListingConfigs: { ...state.lineListingConfigs, [llConfigId]: defaultLLConfig } }))
        
        // Create default summary table configs
        const socConfigId = generateId('stconfig')
        const socConfig: SummaryTableConfig = {
          id: socConfigId,
          name: 'SOC/PT Summary',
          tableType: 'soc-pt-summary',
          periodId: null,
          productIds: ['lig-2847'],
          includeNonSerious: true,
          includeCumulative: true,
          showPercentages: true,
          showRates: false,
          exposureData: null,
          minimumCaseCount: 1,
          createdAt: now,
        }
        
        const demoConfigId = generateId('stconfig')
        const demoConfig: SummaryTableConfig = {
          id: demoConfigId,
          name: 'Demographics Summary',
          tableType: 'demographics-summary',
          periodId: null,
          productIds: ['lig-2847'],
          includeNonSerious: true,
          includeCumulative: true,
          showPercentages: true,
          showRates: false,
          exposureData: null,
          minimumCaseCount: 1,
          createdAt: now,
        }
        
        set(state => ({
          summaryTableConfigs: {
            ...state.summaryTableConfigs,
            [socConfigId]: socConfig,
            [demoConfigId]: demoConfig,
          },
          isLoading: false,
        }))
      },

      resetStore: () => set(initialState),
    }),
    { name: 'safety-reg-bridge-store' }
  )
)

// ============================================================================
// CONVENIENCE HOOKS (with useMemo for stable references)
// ============================================================================

export const usePeriodConfigs = () => useSafetyRegBridge(state => state.periodConfigs)
export const usePeriodConfigsList = () => {
  const periodConfigs = useSafetyRegBridge(state => state.periodConfigs)
  return useMemo(() => Object.values(periodConfigs), [periodConfigs])
}
export const usePeriods = () => useSafetyRegBridge(state => state.periods)
export const usePeriodsList = () => {
  const periods = useSafetyRegBridge(state => state.periods)
  return useMemo(() => Object.values(periods), [periods])
}
export const useSelectedPeriod = () => useSafetyRegBridge(state => state.selectedPeriodId ? state.periods[state.selectedPeriodId] : null)

export const useLineListingConfigs = () => useSafetyRegBridge(state => state.lineListingConfigs)
export const useLineListingConfigsList = () => {
  const lineListingConfigs = useSafetyRegBridge(state => state.lineListingConfigs)
  return useMemo(() => Object.values(lineListingConfigs), [lineListingConfigs])
}
export const useGeneratedListings = () => useSafetyRegBridge(state => state.generatedListings)
export const useGeneratedListingsList = () => {
  const generatedListings = useSafetyRegBridge(state => state.generatedListings)
  return useMemo(() => Object.values(generatedListings), [generatedListings])
}
export const useSelectedListing = () => useSafetyRegBridge(state => state.selectedListingId ? state.generatedListings[state.selectedListingId] : null)

export const useSummaryTableConfigs = () => useSafetyRegBridge(state => state.summaryTableConfigs)
export const useGeneratedTables = () => useSafetyRegBridge(state => state.generatedTables)
export const useGeneratedTablesList = () => {
  const generatedTables = useSafetyRegBridge(state => state.generatedTables)
  return useMemo(() => Object.values(generatedTables), [generatedTables])
}

export const useCTDMappings = () => useSafetyRegBridge(state => state.ctdMappings)
export const useCTDMappingsList = () => {
  const ctdMappings = useSafetyRegBridge(state => state.ctdMappings)
  return useMemo(() => Object.values(ctdMappings), [ctdMappings])
}

export const useSignalAggregateLinks = () => useSafetyRegBridge(state => state.signalAggregateLinks)
export const useSignalAggregateLinksList = () => {
  const signalAggregateLinks = useSafetyRegBridge(state => state.signalAggregateLinks)
  return useMemo(() => Object.values(signalAggregateLinks), [signalAggregateLinks])
}

export const useBenefitRiskAssessments = () => useSafetyRegBridge(state => state.benefitRiskAssessments)
export const useBenefitRiskAssessmentsList = () => {
  const benefitRiskAssessments = useSafetyRegBridge(state => state.benefitRiskAssessments)
  return useMemo(() => Object.values(benefitRiskAssessments), [benefitRiskAssessments])
}

export const useCaseSnapshots = () => useSafetyRegBridge(state => state.caseSnapshots)
export const useCaseSnapshotsList = () => {
  const caseSnapshots = useSafetyRegBridge(state => state.caseSnapshots)
  return useMemo(() => Object.values(caseSnapshots), [caseSnapshots])
}

export const useBridgeView = () => useSafetyRegBridge(state => state.view)
export const useBridgeFilters = () => useSafetyRegBridge(state => state.filters)
export const useBridgeLoading = () => useSafetyRegBridge(state => state.isLoading)
export const useBridgeGenerating = () => useSafetyRegBridge(state => state.isGenerating)

// STANDARD_LINE_LISTING_COLUMNS is exported at the top of this file

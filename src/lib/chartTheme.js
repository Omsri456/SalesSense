/**
 * SalesSense Chart Design System & Color Palette
 * Research-aligned, color-blind safe, and consistent across light/dark themes.
 */

export const chartColors = {
  // Demand Series
  actual: '#0D9488',          // Teal-600: Observed historical sales
  actualFill: '#14B8A6',      // Teal-500: Shaded actual sales gradient
  forecast: '#2563EB',        // Blue-600: Forward forecast line
  forecastFill: '#3B82F6',    // Blue-500: Forecast confidence band
  confidenceBand: 'rgba(37, 99, 235, 0.12)', // Subtle blue shaded zone

  // Censored Demand & Stockout Recovery
  unconstrained: '#E11D48',    // Rose-600: Unconstrained latent demand
  lostSalesGap: 'rgba(225, 29, 72, 0.22)', // Rose shaded gap: Lost sales due to stockouts
  stockoutMarker: '#DC2626',   // Red-600: Out-of-stock event tick

  // Inventory Posture & Health
  healthy: '#059669',          // Emerald-600: Optimal stock cover
  lowStock: '#D97706',         // Amber-600: Approaching ROP threshold
  criticalStock: '#DC2626',    // Red-600: Critical stockout risk
  expiryRisk: '#BE123C',       // Rose-700: Days of cover > shelf life

  // Structural Grid & Typography
  gridLight: '#E2E8F0',
  gridDark: 'rgba(255, 255, 255, 0.06)',
  textMuted: '#94A3B8',
  tooltipBgLight: '#FFFFFF',
  tooltipBgDark: '#0F172A',
  tooltipBorder: 'rgba(148, 163, 184, 0.2)',
}

export const chartTypography = {
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  axisFontSize: 11,
  tooltipFontSize: 12,
  legendFontSize: 12,
}

export const chartTooltipStyle = {
  borderRadius: 12,
  padding: '8px 12px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  border: `1px solid ${chartColors.tooltipBorder}`,
  fontSize: chartTypography.tooltipFontSize,
  fontFamily: chartTypography.fontFamily,
}

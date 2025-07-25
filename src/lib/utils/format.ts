/**
 * Format a number as currency
 * @param value The number to format
 * @param currency The currency code (default: USD)
 * @param maximumFractionDigits Maximum number of decimal places (default: 2)
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number, 
  currency = 'USD', 
  maximumFractionDigits = 2
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits
  }).format(value);
}

/**
 * Format a number as a percentage
 * @param value The decimal value to format as percentage
 * @param maximumFractionDigits Maximum number of decimal places (default: 2)
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number, 
  maximumFractionDigits = 2
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits
  }).format(value);
}

/**
 * Format a date in a human-readable format
 * @param date The date to format
 * @param includeTime Whether to include the time (default: false)
 * @returns Formatted date string
 */
export function formatDate(
  date: Date,
  includeTime = false
): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Format a large number with abbreviations (K, M, B)
 * @param value The number to format
 * @param maximumFractionDigits Maximum number of decimal places (default: 1)
 * @returns Formatted abbreviated number
 */
export function formatCompactNumber(
  value: number,
  maximumFractionDigits = 1
): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits
  }).format(value);
}

/**
 * Format a year and month as a date string
 * @param year The year
 * @param month The month (0-11)
 * @returns Formatted date string (e.g., "Jan 2025")
 */
export function formatYearMonth(year: number, month: number): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short'
  }).format(new Date(year, month, 1));
}

/**
 * Format a number with commas for thousands separators
 * @param value The number to format
 * @param maximumFractionDigits Maximum number of decimal places (default: 2)
 * @returns Formatted number with commas
 */
export function formatNumber(
  value: number,
  maximumFractionDigits = 2
): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits
  }).format(value);
}
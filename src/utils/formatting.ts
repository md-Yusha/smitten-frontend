/**
 * Formatting Utilities
 * Provides consistent formatting for numbers, dates, times, and text across the app
 */

/**
 * Format a number with consistent decimal places
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string
 */
export const formatNumber = (num: number | string, decimals: number = 0): string => {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (!Number.isFinite(n)) return '0';
  return n.toFixed(decimals);
};

/**
 * Format a number with thousands separator
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string (e.g., "1,234.56")
 */
export const formatNumberWithCommas = (num: number | string, decimals: number = 0): string => {
  const formatted = formatNumber(num, decimals);
  const parts = formatted.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

/**
 * Format currency amount
 * @param amount - The amount to format
 * @param currency - Currency code (default: 'INR')
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted currency string (e.g., "₹1,234")
 */
export const formatCurrency = (
  amount: number | string,
  currency: 'INR' | 'USD' | 'EUR' = 'INR',
  decimals: number = 0,
): string => {
  const formatted = formatNumberWithCommas(amount, decimals);
  const symbols: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
  };
  return `${symbols[currency]}${formatted}`;
};

/**
 * Format a date to a consistent format
 * @param date - The date to format
 * @param format - Format type (default: 'short')
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | string | number,
  format: 'short' | 'long' | 'full' | 'iso' = 'short',
): string => {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  switch (format) {
    case 'iso':
      return `${year}-${month}-${day}`;
    case 'short':
      return `${month}/${day}/${year}`;
    case 'long':
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    case 'full':
      return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    default:
      return `${month}/${day}/${year}`;
  }
};

/**
 * Format a time to a consistent format
 * @param date - The date/time to format
 * @param format - Format type (default: '12h')
 * @returns Formatted time string
 */
export const formatTime = (
  date: Date | string | number,
  format: '12h' | '24h' | 'short' = '12h',
): string => {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  switch (format) {
    case '24h':
      return `${hours}:${minutes}:${seconds}`;
    case 'short':
      return `${hours}:${minutes}`;
    case '12h':
    default: {
      const h = d.getHours() % 12 || 12;
      const m = String(d.getMinutes()).padStart(2, '0');
      const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
      return `${h}:${m} ${ampm}`;
    }
  }
};

/**
 * Format a date and time together
 * @param date - The date/time to format
 * @param dateFormat - Date format type (default: 'short')
 * @param timeFormat - Time format type (default: '12h')
 * @returns Formatted date and time string
 */
export const formatDateTime = (
  date: Date | string | number,
  dateFormat: 'short' | 'long' | 'full' | 'iso' = 'short',
  timeFormat: '12h' | '24h' | 'short' = '12h',
): string => {
  return `${formatDate(date, dateFormat)} ${formatTime(date, timeFormat)}`;
};

/**
 * Format text with consistent capitalization
 * @param text - The text to format
 * @param style - Capitalization style (default: 'sentence')
 * @returns Formatted text string
 */
export const formatText = (
  text: string,
  style: 'sentence' | 'title' | 'upper' | 'lower' | 'capitalize' = 'sentence',
): string => {
  if (!text) return '';

  switch (style) {
    case 'sentence':
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    case 'title':
      return text
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    case 'upper':
      return text.toUpperCase();
    case 'lower':
      return text.toLowerCase();
    case 'capitalize':
      return text.charAt(0).toUpperCase() + text.slice(1);
    default:
      return text;
  }
};

/**
 * Format a phone number
 * @param phone - The phone number to format
 * @param format - Format type (default: 'international')
 * @returns Formatted phone number string
 */
export const formatPhoneNumber = (
  phone: string,
  format: 'international' | 'national' | 'simple' = 'international',
): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 10) return phone;

  switch (format) {
    case 'international':
      // +91 98765 43210
      if (cleaned.length === 10) return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
      if (cleaned.length === 12 && cleaned.startsWith('91')) {
        return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
      }
      return phone;
    case 'national':
      // 98765 43210
      if (cleaned.length === 10) return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
      if (cleaned.length === 12 && cleaned.startsWith('91')) {
        return `${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
      }
      return phone;
    case 'simple':
    default:
      return cleaned;
  }
};

/**
 * Format a duration in milliseconds to a readable string
 * @param ms - Duration in milliseconds
 * @param format - Format type (default: 'short')
 * @returns Formatted duration string
 */
export const formatDuration = (
  ms: number,
  format: 'short' | 'long' | 'full' = 'short',
): string => {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  switch (format) {
    case 'short':
      return parts.slice(0, 1).join(' ');
    case 'long':
      return parts.slice(0, 2).join(' ');
    case 'full':
    default:
      return parts.join(' ');
  }
};

/**
 * Format a percentage
 * @param value - The value (0-100 or 0-1)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number, decimals: number = 0): string => {
  const percent = value > 1 ? value : value * 100;
  return `${formatNumber(percent, decimals)}%`;
};

/**
 * Format a file size
 * @param bytes - Size in bytes
 * @returns Formatted file size string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

/**
 * Truncate text with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add (default: '...')
 * @returns Truncated text string
 */
export const truncateText = (text: string, maxLength: number, suffix: string = '...'): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
};

/**
 * Format a name with consistent capitalization
 * @param name - The name to format
 * @returns Formatted name string
 */
export const formatName = (name: string): string => {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Format an email address
 * @param email - The email to format
 * @returns Formatted email string (lowercase)
 */
export const formatEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

/**
 * Format a URL
 * @param url - The URL to format
 * @returns Formatted URL string
 */
export const formatUrl = (url: string): string => {
  let formatted = url.trim();
  if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
    formatted = `https://${formatted}`;
  }
  return formatted;
};

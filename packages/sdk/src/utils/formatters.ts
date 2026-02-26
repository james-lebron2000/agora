/**
 * DateTime Formatter Utilities
 * 
 * Provides internationalized date, time, duration, and relative time formatting.
 * Uses the native Intl API for localization support.
 */

/**
 * Formats a date to a localized string
 * @param date - The date to format
 * @param locale - The locale to use (e.g., 'zh-CN', 'en-US')
 * @returns Formatted date string
 * @example
 * formatDate(new Date(), 'zh-CN'); // "2024年2月26日"
 * formatDate(new Date(), 'en-US'); // "February 26, 2024"
 */
export function formatDate(date: Date, locale: string = 'zh-CN'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Formats a time to a localized string
 * @param date - The date/time to format
 * @param locale - The locale to use (e.g., 'zh-CN', 'en-US')
 * @returns Formatted time string
 * @example
 * formatTime(new Date(), 'en-US'); // "2:30 PM"
 * formatTime(new Date(), 'zh-CN'); // "14:30"
 */
export function formatTime(date: Date, locale: string = 'zh-CN'): string {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: locale === 'en-US',
  }).format(date);
}

/**
 * Formats a duration in milliseconds to a human-readable string
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string (e.g., "2h 30m", "45s", "1d 5h")
 * @example
 * formatDuration(9000000); // "2h 30m"
 * formatDuration(45000);   // "45s"
 * formatDuration(86400000); // "1d"
 */
export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
  
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  
  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  
  return `${seconds}s`;
}

/**
 * Calculates and formats a relative time string (e.g., "2小时前", "just now")
 * @param date - The date to compare against now
 * @param locale - The locale to use (e.g., 'zh-CN', 'en-US')
 * @returns Relative time string
 * @example
 * timeAgo(Date.now() - 7200000); // "2小时前" (zh-CN) or "2 hours ago" (en-US)
 * timeAgo(Date.now() - 60000);   // "1分钟前" or "1 minute ago"
 */
export function timeAgo(date: Date | number, locale: string = 'zh-CN'): string {
  const now = Date.now();
  const then = typeof date === 'number' ? date : date.getTime();
  const diff = now - then;
  
  if (diff < 0) {
    // Future time
    return locale === 'zh-CN' ? '刚刚' : 'just now';
  }
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  // Use Intl.RelativeTimeFormat for proper localization
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'always' });
  
  if (years > 0) return rtf.format(-years, 'year');
  if (months > 0) return rtf.format(-months, 'month');
  if (weeks > 0) return rtf.format(-weeks, 'week');
  if (days > 0) return rtf.format(-days, 'day');
  if (hours > 0) return rtf.format(-hours, 'hour');
  if (minutes > 0) return rtf.format(-minutes, 'minute');
  
  // For very recent times, use a custom message
  if (seconds < 10) {
    return locale === 'zh-CN' ? '刚刚' : 'just now';
  }
  
  return rtf.format(-seconds, 'second');
}

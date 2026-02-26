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
export declare function formatDate(date: Date, locale?: string): string;
/**
 * Formats a time to a localized string
 * @param date - The date/time to format
 * @param locale - The locale to use (e.g., 'zh-CN', 'en-US')
 * @returns Formatted time string
 * @example
 * formatTime(new Date(), 'en-US'); // "2:30 PM"
 * formatTime(new Date(), 'zh-CN'); // "14:30"
 */
export declare function formatTime(date: Date, locale?: string): string;
/**
 * Formats a duration in milliseconds to a human-readable string
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string (e.g., "2h 30m", "45s", "1d 5h")
 * @example
 * formatDuration(9000000); // "2h 30m"
 * formatDuration(45000);   // "45s"
 * formatDuration(86400000); // "1d"
 */
export declare function formatDuration(ms: number): string;
/**
 * Calculates and formats a relative time string (e.g., "2小时前", "just now")
 * @param date - The date to compare against now
 * @param locale - The locale to use (e.g., 'zh-CN', 'en-US')
 * @returns Relative time string
 * @example
 * timeAgo(Date.now() - 7200000); // "2小时前" (zh-CN) or "2 hours ago" (en-US)
 * timeAgo(Date.now() - 60000);   // "1分钟前" or "1 minute ago"
 */
export declare function timeAgo(date: Date | number, locale?: string): string;
//# sourceMappingURL=formatters.d.ts.map
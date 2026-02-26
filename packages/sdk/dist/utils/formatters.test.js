import { describe, it, expect } from 'vitest';
import { formatDate, formatTime, formatDuration, timeAgo } from './formatters.js';
describe('formatters', () => {
    describe('formatDate', () => {
        it('should format date in Chinese locale', () => {
            const date = new Date('2024-02-26T10:30:00Z');
            const result = formatDate(date, 'zh-CN');
            expect(result).toContain('2024');
            expect(result).toContain('2');
            expect(result).toContain('26');
        });
        it('should format date in English locale', () => {
            const date = new Date('2024-02-26T10:30:00Z');
            const result = formatDate(date, 'en-US');
            expect(result).toContain('2024');
            expect(result).toContain('February');
        });
        it('should use zh-CN as default locale', () => {
            const date = new Date('2024-02-26T10:30:00Z');
            const result = formatDate(date);
            expect(result).toContain('2024');
        });
    });
    describe('formatTime', () => {
        it('should format time in Chinese locale (24-hour format)', () => {
            const date = new Date('2024-02-26T14:30:00Z');
            const result = formatTime(date, 'zh-CN');
            // Result depends on local timezone, just check it contains a time pattern
            expect(result).toMatch(/\d{1,2}:\d{2}/);
        });
        it('should format time in English locale (12-hour format)', () => {
            const date = new Date('2024-02-26T14:30:00Z');
            const result = formatTime(date, 'en-US');
            // Result depends on local timezone, check for time pattern or AM/PM
            expect(result).toMatch(/\d{1,2}:\d{2}|AM|PM/);
        });
    });
    describe('formatDuration', () => {
        it('should format duration in hours and minutes', () => {
            expect(formatDuration(9000000)).toBe('2h 30m'); // 2.5 hours
        });
        it('should format duration in seconds', () => {
            expect(formatDuration(45000)).toBe('45s');
        });
        it('should format duration in days', () => {
            expect(formatDuration(86400000)).toBe('1d'); // 1 day
        });
        it('should format duration in days and hours', () => {
            expect(formatDuration(90000000)).toBe('1d 1h'); // 25 hours
        });
        it('should format duration in minutes and seconds', () => {
            expect(formatDuration(65000)).toBe('1m 5s');
        });
        it('should handle zero duration', () => {
            expect(formatDuration(0)).toBe('0s');
        });
        it('should handle negative duration', () => {
            expect(formatDuration(-5000)).toBe('0s');
        });
    });
    describe('timeAgo', () => {
        it('should format recent time as "just now" in Chinese', () => {
            const result = timeAgo(Date.now() - 5000, 'zh-CN');
            expect(result).toBe('刚刚');
        });
        it('should format recent time as "just now" in English', () => {
            const result = timeAgo(Date.now() - 5000, 'en-US');
            expect(result).toBe('just now');
        });
        it('should format minutes ago', () => {
            const result = timeAgo(Date.now() - 60000, 'en-US');
            expect(result).toBe('1 minute ago');
        });
        it('should format hours ago', () => {
            const result = timeAgo(Date.now() - 7200000, 'en-US');
            expect(result).toBe('2 hours ago');
        });
        it('should format days ago', () => {
            const result = timeAgo(Date.now() - 86400000 * 2, 'en-US');
            expect(result).toBe('2 days ago');
        });
        it('should handle future time', () => {
            const result = timeAgo(Date.now() + 60000, 'en-US');
            expect(result).toBe('just now');
        });
        it('should accept Date object', () => {
            const past = new Date(Date.now() - 3600000);
            const result = timeAgo(past, 'en-US');
            expect(result).toBe('1 hour ago');
        });
    });
});
//# sourceMappingURL=formatters.test.js.map
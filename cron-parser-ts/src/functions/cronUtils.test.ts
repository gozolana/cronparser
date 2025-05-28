import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    formatDate,
    getTimezoneOffset,
    parseCronExpression
} from './cronUtils';

beforeEach(() => {
    vi.stubEnv('TZ', 'America/Mexico_City');
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('getTimezoneOffset', () => {
    it.each([
        { timezone: 'America/Mexico_City', offset: '-06:00' },
        { timezone: 'Asia/Tokyo', offset: '+09:00' }
    ])(`should return the correct offset for a $timezone`, ({ timezone, offset }) => {
        vi.stubEnv('TZ', timezone);
        expect(getTimezoneOffset()).toBe(offset);
    });
});

describe('formatDate', () => {
    it('should format a date to Local', () => {
        const date = new Date('2023-10-01T12:00:00Z');
        const expected = '2023/10/01 06:00'; // Adjusted for Mexico City timezone

        expect(formatDate(date)).toBe(expected);
        expect(formatDate(date, 'Local')).toBe(expected);
        // @ts-expect-error
        expect(formatDate(date, 'Unknown')).toBe(expected);
    });

    it('should format a date to Local with Offset', () => {
        const date = new Date('2023-10-01T12:00:00Z');
        const formatted = formatDate(date, 'LocalwithOffset');
        expect(formatted).toBe('2023/10/01 06:00(-06:00)'); // Adjusted for Mexico City timezone with offset
    });

    it('should format a date to UTC', () => {
        const date = new Date('2023-10-01T12:00:00Z');
        const formatted = formatDate(date, 'UTC');
        expect(formatted).toBe('2023/10/01 12:00(UTC)');
    });

    it('should handle invalid date', () => {
        const date = new Date('invalid-date');
        const formatted = formatDate(date);
        expect(formatted).toBe('Invalid Date');
    });
});

describe('parseCronExpression', () => {

    describe('handle valid expressoin', () => {
        describe('minute field', () => {
            it('should parse single minute', () => {
                const cron = '5 * * * *';
                const parsed = parseCronExpression(cron);
                expect(parsed.minute).toEqual([5]);
            });

            it('should parse multiple minutes', () => {
                const cron = '5,10,15 * * * *';
                const parsed = parseCronExpression(cron);
                expect(parsed.minute).toEqual([5, 10, 15]);
            });

            it('should parse range of minutes', () => {
                const cron = '5-10 * * * *';
                const parsed = parseCronExpression(cron);
                expect(parsed.minute).toEqual([5, 6, 7, 8, 9, 10]);
            });

            it('should parse all minutes', () => {
                const cron = '* * * * *';
                const parsed = parseCronExpression(cron);
                expect(parsed.minute).toEqual(Array.from(Array(60).keys()));
            });

            it('should parse every 5 minutes', () => {
                const cron = '*/5 * * * *';
                const parsed = parseCronExpression(cron);
                expect(parsed.minute).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
            });

            it('should parse complex combination', () => {
                const cron = '58,20-46/9,3 * * * *';
                const parsed = parseCronExpression(cron);
                expect(parsed.minute).toEqual([3, 27, 36, 45, 58]);
            });
        });
        describe('hour field', () => {

            it('should parse single hour', () => {
                const cron = '0 5 * * *';
                const parsed = parseCronExpression(cron);
                expect(parsed.hour).toEqual([5]);
            });

            it('should parse multiple hours', () => {
                const cron = '0 5,10 * * *';
                const parsed = parseCronExpression(cron);
                expect(parsed.hour).toEqual([5, 10]);
            });

            it('should parse range of hours', () => {
                const cron = '0 5-10 * * *';
                const parsed = parseCronExpression(cron);
                expect(parsed.hour).toEqual([5, 6, 7, 8, 9, 10]);
            });

            it('should parse all hours', () => {
                const cron = '0 * * * *';
                const parsed = parseCronExpression(cron);
                expect(parsed.hour).toEqual(Array.from(Array(24).keys()));
            });

            it('should parse every 2 hours', () => {
                const cron = '0 */2 * * *';
                const parsed = parseCronExpression(cron);
                expect(parsed.hour).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]);
            });

            it('should parse complex combination', () => {
                const cron = '0 5,10-15/2 * * *';
                const parsed = parseCronExpression(cron);
                expect(parsed.hour).toEqual([5, 10, 12, 14]);
            });
        });

        describe('day of month field', () => {

            it('should parse single day of month', () => {
                const cron = '0 0 5 * *';
                const parsed = parseCronExpression(cron);
                expect(parsed.dom).toEqual([5]);
            });

            it('should parse multiple days of month', () => {
                const cron = '0 0 5,10 * *';
                const parsed = parseCronExpression(cron);
                expect(parsed.dom).toEqual([5, 10]);
            });

            it('should parse range of days of month', () => {
                const cron = '0 0 5-10 * *';
                const parsed = parseCronExpression(cron);
                expect(parsed.dom).toEqual([5, 6, 7, 8, 9, 10]);
            });

            it('should parse all days of month', () => {
                const cron = '0 0 * * *';
                const parsed = parseCronExpression(cron);
                expect(parsed.dom).toEqual(Array.from(Array(31).keys()).map(i => i + 1));
            });

            it('should parse every 2 days of month', () => {
                const cron = '0 0 */2 * *';
                const parsed = parseCronExpression(cron);
                expect(parsed.dom).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30]);
            });

            it('should parse complex combination', () => {
                const cron = '0 0 1-15/3,29 * *';
                const parsed = parseCronExpression(cron);
                expect(parsed.dom).toEqual([3, 6, 9, 12, 15, 29]);
            });
        });

        describe('month field', () => {
            it('should parse single month', () => {
                const cron = '0 0 1 6 *';
                const parsed = parseCronExpression(cron);
                expect(parsed.month).toEqual([6]); // June
            });

            it('should parse multiple months', () => {
                const cron = '0 0 1 6,12 *';
                const parsed = parseCronExpression(cron);
                expect(parsed.month).toEqual([6, 12]); // June and December
            });

            it('should parse range of months', () => {
                const cron = '0 0 1 6-8 *';
                const parsed = parseCronExpression(cron);
                expect(parsed.month).toEqual([6, 7, 8]); // June to August
            });

            it('should parse all months', () => {
                const cron = '0 0 1 * *';
                const parsed = parseCronExpression(cron);
                expect(parsed.month).toEqual(Array.from(Array(12).keys()).map(i => i + 1)); // All months
            });

            it('should parse every 2 months', () => {
                const cron = '0 0 1 */2 *';
                const parsed = parseCronExpression(cron);
                expect(parsed.month).toEqual([2, 4, 6, 8, 10, 12]); // February, April, June, August, October, December
            });

            it('should parse complex combination', () => {
                const cron = '0 0 1 1,6-8/2 *';
                const parsed = parseCronExpression(cron);
                expect(parsed.month).toEqual([1, 6, 8]); // January, June, August
            });

            it('should parse month names', () => {
                const cron = '0 0 1 Jan,Jun,Jul *';
                const parsed = parseCronExpression(cron);
                expect(parsed.month).toEqual([1, 6, 7]); // January, June, July
            });

            it('should parse month names with ranges', () => {
                const cron = '0 0 1 Jan-Mar,Jun *';
                const parsed = parseCronExpression(cron);
                expect(parsed.month).toEqual([1, 2, 3, 6]); // January, February, March, June
            });

            it('should parse month names with complex combinations', () => {
                const cron = '0 0 1 Jan-Mar,Jun-Jul *';
                const parsed = parseCronExpression(cron);
                expect(parsed.month).toEqual([1, 2, 3, 6, 7]); // January, February, March, June, July
            });

        })

        describe('day of week field', () => {
            it('should parse single day of week', () => {
                const cron = '0 0 1 * Mon';
                const parsed = parseCronExpression(cron);
                expect(parsed.dow).toEqual([1]); // Monday
            });

            it('should parse multiple days of week', () => {
                const cron = '0 0 1 * Mon,Tue';
                const parsed = parseCronExpression(cron);
                expect(parsed.dow).toEqual([1, 2]); // Monday and Tuesday
            });

            it('should parse range of days of week', () => {
                const cron = '0 0 1 * Mon-Fri';
                const parsed = parseCronExpression(cron);
                expect(parsed.dow).toEqual([1, 2, 3, 4, 5]); // Monday to Friday
            });

            it('should parse all days of week', () => {
                const cron = '0 0 1 * *';
                const parsed = parseCronExpression(cron);
                expect(parsed.dow).toEqual(Array.from(Array(7).keys())); // All days (0-6)
            });

            it('should parse every other day of week', () => {
                const cron = '0 0 1 * */2';
                const parsed = parseCronExpression(cron);
                expect(parsed.dow).toEqual([0, 2, 4, 6]); // Sunday, Tuesday, Thursday, Saturday
            });

            it('should parse complex combination', () => {
                const cron = '0 0 1 * Mon-Wed/2,Fri';
                const parsed = parseCronExpression(cron);
                expect(parsed.dow).toEqual([2, 5]); // Monday, Wednesday, Friday
            });
        });
    });

    describe('handle invalid expression', () => {

        it.each([
            { cron: '5 0 * *' },
            { cron: '5 0 * * * *' }
        ])('should throw an error if field count is not five', ({ cron }) => {
            expect(() => parseCronExpression(cron)).toThrow('Cron expression must have five fields');
        });

        it('should throw an error if cron is not a string', () => {
            expect(() => parseCronExpression(123 as any)).toThrow('Cron expression must be a string');
        });

        describe('minute field', () => {
            it('should throw an error for invalid minute', () => {
                const cron = '60 * * * *';
                expect(() => parseCronExpression(cron)).toThrow("minute field contains out of range value '60'");
            });

            it('should throw an error for invalid minute range', () => {
                const cron = '5-65 * * * *';
                expect(() => parseCronExpression(cron)).toThrow("minute field contains invalid range '5-65'");
            });

            it('should throw an error for invalid comma', () => {
                expect(() => parseCronExpression(', * * * *')).toThrow("minute field contains invalid range ''");
                expect(() => parseCronExpression('5, * * * *')).toThrow("minute field contains invalid range ''");
                expect(() => parseCronExpression(',6 * * * *')).toThrow("minute field contains invalid range ''");
                expect(() => parseCronExpression('1,,5 * * * *')).toThrow("minute field contains invalid range ''");
            });

            it('should throw an error for invalid slash', () => {
                expect(() => parseCronExpression('/ * * * *')).toThrow("minute field contains invalid range '/'");
                expect(() => parseCronExpression('/6 * * * *')).toThrow("minute field contains invalid range '/6'");
                expect(() => parseCronExpression('8/ * * * *')).toThrow("minute field contains invalid range '8/'");
                expect(() => parseCronExpression('8/6/7 * * * *')).toThrow("minute field contains invalid range '8/6'");
            });

            it('should throw an error for invalid step value', () => {
                const cron = '*/0 * * * *';
                expect(() => parseCronExpression(cron)).toThrow("minute field contains invalid step value '0'");
            });

            it('should throw an error for invalid hyphen', () => {
                expect(() => parseCronExpression('-- * * * *')).toThrow("minute field contains invalid range '--'");
                expect(() => parseCronExpression('6-1 * * * *')).toThrow("minute field contains invalid range '6-1'");
            });

        });
    });
});

describe('ParsedCronExpression', () => {
    it('should return the correct properties', () => {
        const cron = '5 0 * * *';
        const parsed = parseCronExpression(cron);
        expect(parsed.minute).toEqual([5]);
        expect(parsed.hour).toEqual([0]);
        expect(parsed.dom).toEqual(Array.from(Array(31).keys()).map(i => i + 1));
        expect(parsed.month).toEqual(Array.from(Array(12).keys()).map(i => i + 1));
        expect(parsed.dow).toEqual(Array.from(Array(7).keys()));
    });

    describe('test', () => {
        it('should return true for a valid cron expression', () => {
            const cron = '5 0 * * *';
            const parsed = parseCronExpression(cron);
            expect(parsed.test(new Date(2023, 9, 1, 0, 5, 0))).toBe(true);
            expect(parsed.test(new Date(2023, 9, 1, 0, 5, 34))).toBe(true);
        })
        it('should return false for a non-matching date', () => {
            const cron = '5 0 * * *';
            const parsed = parseCronExpression(cron);
            expect(parsed.test(new Date(2023, 9, 1, 0, 4, 59))).toBe(false);
            expect(parsed.test(new Date(2023, 9, 1, 0, 6, 0))).toBe(false);
        });
    });

    describe('getPreviews', () => {
        it('should return the next 5 occurrences', () => {
            const cron = '5 0 * * *';
            const parsed = parseCronExpression(cron);
            const previews = parsed.getPreviews(new Date(2023, 9, 1, 0, 0, 0));
            expect(previews.next()).toEqual({ value: new Date(2023, 9, 1, 0, 5, 0), done: false });
            expect(previews.next()).toEqual({ value: new Date(2023, 9, 2, 0, 5, 0), done: false });
            expect(previews.next()).toEqual({ value: new Date(2023, 9, 3, 0, 5, 0), done: false });
        });

        it('should return the next occurrance over a month', () => {
            const cron = '5 0 30 Dec *';
            const parsed = parseCronExpression(cron);
            const previews = parsed.getPreviews(new Date(2023, 9, 1, 0, 0, 0));
            expect(previews.next()).toEqual({ value: new Date(2023, 11, 30, 0, 5, 0), done: false });
        });

        it.each([
            { cron: '5 0 30 feb *' },
            { cron: '5 0 31 Apr *' }
        ])('should return null', ({ cron }) => {
            const parsed = parseCronExpression(cron);
            const previews = parsed.getPreviews(new Date(2023, 9, 1, 0, 0, 0));
            expect(previews.next()).toEqual({ value: undefined, done: true });
        });

        it('should be applicable with for loop', () => {
            const cron = '5 0 * * *';
            const parsed = parseCronExpression(cron);
            const previews = parsed.getPreviews(new Date(2023, 9, 1, 0, 0, 0));
            let count = 0;
            for (const date of previews) {
                count++;
                if (count > 5) break; // Limit to 5 occurrences
            }
            expect(count).toBe(6);
        });

    });
});

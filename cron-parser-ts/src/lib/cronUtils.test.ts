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
    it('should return the correct offset for a date in Mexico', () => {
        const offset = getTimezoneOffset();
        expect(offset).toBe('-06:00'); // Mexico is UTC-6
    })
});

/*
describe('toNextValue', () => {
    it('should return the next value in the sorted unique candidates', () => {
        expect(toNextValue(5, [2, 3, 4, 6], 0, 59)).toBe(1);
        expect(toNextValue(10, [2, 3, 4, 6], 0, 23)).toBe(16);
        expect(toNextValue(0, [2, 3, 4, 6], 0, 23)).toBe(2);
    });
    it('should throw if candidates is empty', () => {
        expect(() => toNextValue(5, [], 0, 10)).toThrow('Candidates array cannot be empty');
    });
});

describe('shiftTime', () => {
    it('should update the date to the next valid minute and hour', () => {
        const date = new Date(2023, 0, 1, 12, 31);
        shiftTime(date, [0, 15, 30, 45], [12, 13]);
        expect(date.getMinutes()).toBe(45);
        expect(date.getHours()).toBe(12);
    });
});

describe('formatLocal', () => {
    it('should format date in local time', () => {
        const date = new Date(2023, 0, 2, 3, 4);
        const result = formatLocal(date);
        expect(result).toMatch(/2023\/01\/02 03:04\([+-]\d{2}:\d{2}\)/);
    });
});

describe('formatUTC', () => {
    it('should format date in UTC', () => {
        const date = new Date(Date.UTC(2023, 0, 2, 3, 4, 5));
        const result = formatUTC(date);
        expect(result).toBe('2023/01/02 03:04(UTC)');
    });
});
*/
describe('parseCronExpression', () => {
    it('should throw if not string', () => {
        // @ts-expect-error
        expect(() => parseCronExpression(123)).toThrow();
    });
    it('should throw if not 5 fields', () => {
        expect(() => parseCronExpression('1 2 3 4')).toThrow();
    });
    it('should throw if any field is empty', () => {
        expect(() => parseCronExpression('* * * * ')).toThrow();
        expect(() => parseCronExpression('* * * * X')).toThrow();
    });
    it('should treat DOW 7 as 0 (Sunday)', () => {
        const it = parseCronExpression('0 0 * * 7');
        const date = it.next().value;
        expect(date?.getDay()).toBe(0);
    });
    it('should return an iterator', () => {
        const it = parseCronExpression('1 2 3 4 5');
        expect(typeof it.next).toBe('function');
    });
});

describe('CronPreview/Iterator', () => {
    it('should iterate next scheduled times for a simple cron', () => {
        const it = parseCronExpression('0 * * * *');
        const now = new Date();
        now.setSeconds(0, 0);
        now.setMinutes(now.getMinutes() + 1);
        const first = it.next().value;
        expect(first?.getMinutes()).toBe(0);
        expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]).toContain(first!.getHours());
    });

    it('should iterate only on specified days of week', () => {
        const it = parseCronExpression('0 0 * * 1');
        const first = it.next().value;
        expect(first?.getDay()).toBe(1);
        const second = it.next().value;
        expect(second?.getDay()).toBe(1);
        expect(second?.getTime()).toBeGreaterThan(first!.getTime());
    });

    it('should iterate only on specified months', () => {
        const it = parseCronExpression('0 0 1 JAN *');
        expect(it.next().value?.getMonth()).toBe(0);
        expect(it.next().value?.getMonth()).toBe(0);
    });

    it('should be iterable', () => {
        const it = parseCronExpression('0 0 1 1 *');
        expect(typeof it[Symbol.iterator]).toBe('function');
        expect(it[Symbol.iterator]()).toBe(it);
    });

    it('should return valid dates', () => {
        const it = parseCronExpression('13 15 3 4,8 *', new Date(2023, 1, 1, 0, 0));
        expect(it.next().value?.toString()).toBe((new Date(2023, 3, 3, 15, 13)).toString());
        expect(it.next().value?.toString()).toBe((new Date(2023, 7, 3, 15, 13)).toString());
        expect(it.next().value?.toString()).toBe((new Date(2024, 3, 3, 15, 13)).toString());
    });
});

describe('formatDate', () => {
    it('should default to Local', () => {
        const date = new Date(2023, 8, 9, 5, 6); // 2023/09/09 05:06
        expect(formatDate(date, 'Local')).toMatch('2023/09/09 05:06');
        expect(formatDate(date)).toMatch('2023/09/09 05:06');
        // @ts-expect-error
        expect(formatDate(date, 'unknownType')).toMatch('2023/09/09 05:06');
    });

    it('should format date as YYYY/MM/DD HH:mm(+/-HH:MM)', () => {
        const date = new Date(2023, 0, 2, 3, 4);
        const result = formatDate(date, 'LocalwithOffset');
        expect(result).toMatch('2023/01/02 03:04(-06:00)'); // Assuming TZ is set to America/Mexico_City';
    });

    it('should format date as YYYY/MM/DD HH:mm(UTC)', () => {
        const date = new Date(Date.UTC(2023, 0, 2, 3, 4));
        const result = formatDate(date, 'UTC');
        expect(result).toBe('2023/01/02 03:04(UTC)');
    });
});

/*
describe('shiftDate', () => {

    it('should throw if dom=31 and month does not include a 31-day month', () => {
        const date = new Date(2023, 1, 28); // February 28, 2023
        expect(() => shiftDate(date, [31], [2], [0, 1, 2, 3, 4, 5, 6])).toThrow('day of month and month combination error. cron expression will never hit.');
    });

    it('should throw if dom=30 and month does not include a 30-day month', () => {
        const date = new Date(2023, 1, 28); // February 28, 2023
        expect(() => shiftDate(date, [30], [2], [0, 1, 2, 3, 4, 5, 6])).toThrow('day of month and month combination error. cron expression will never hit.');
    });

    it('should advance date to next valid dom/month/dow', () => {
        const date = new Date(2023, 0, 1); // Jan 1, 2023 (Sunday)
        shiftDate(date, [2, 3], [1], [1]); // next valid: Jan 2, 2023 (Monday)
        expect(date.getDate()).toBe(2);
        expect(date.getMonth()).toBe(0);
        expect(date.getDay()).toBe(1);
    });

    it('should not change date if already valid', () => {
        const date = new Date(2023, 0, 2); // Jan 2, 2023 (Monday)
        shiftDate(date, [2], [1], [1]);
        expect(date.getDate()).toBe(2);
        expect(date.getMonth()).toBe(0);
        expect(date.getDay()).toBe(1);
    });
});

describe('calculateNextDate', () => {

    it('should return undefined if previousDate is undefined', () => {
        expect(calculateNextDate([0], [0], [1], [1], [0], undefined)).toBeUndefined();
    });

    it('should return next valid date for simple case', () => {
        const prev = new Date(2023, 0, 1, 0, 0);
        const result = calculateNextDate([1], [2], [1], [1], [0], prev);
        expect(result).toBeInstanceOf(Date);
        expect(result?.getMinutes()).toBe(1);
        expect(result?.getHours()).toBe(2);
        expect(result?.getDate()).toBe(1);
        expect(result?.getMonth()).toBe(0);
    });

    it('should return undefined if shiftDate throws', () => {
        // dom=31, month=2 (February has no 31st)
        const prev = new Date(2023, 1, 1, 0, 0);
        expect(
            calculateNextDate([0], [0], [31], [2], [0], prev)
        ).toBeUndefined();
    });

    it('should advance to next valid date if current is not valid', () => {
        // Only 2nd of January is valid
        const prev = new Date(2023, 0, 1, 0, 0);
        const result = calculateNextDate([0], [0], [2], [1], [1], prev);
        expect(result?.getDate()).toBe(2);
        expect(result?.getMonth()).toBe(0);
    });
});

describe('parseField', () => {

    it('should parse "*" as full range', () => {
        expect(parseField('*', 0, 2, 'minute')).toEqual([0, 1, 2]);
    });

    it('should parse comma separated values', () => {
        expect(parseField('1,2,3', 0, 5, 'minute')).toEqual([1, 2, 3]);
    });

    it('should parse ranges', () => {
        expect(parseField('1-3', 0, 5, 'minute')).toEqual([1, 2, 3]);
    });

    it('should parse step values', () => {
        expect(parseField('0-5/2', 0, 5, 'minute')).toEqual([0, 2, 4]);
    });

    it('should throw if field is not a string', () => {
        // @ts-expect-error
        expect(() => parseField(123, 0, 5, 'minute')).toThrow('minute must be a string');
    });

    it('should deduplicate and sort values', () => {
        expect(parseField('3,1,2,2,1', 0, 5, 'minute')).toEqual([1, 2, 3]);
    });

    it('should throw if part is invalid', () => {
        expect(() => parseField('a', 0, 5, 'minute')).toThrow();
        expect(() => parseField('1-2-3', 0, 5, 'minute')).toThrow();
    });

    it('should throw if parsePart throws with invalid range', () => {
        expect(() => parseField('03', 1, 5, 'minute')).toThrow("minute field contains invalid range '03'");
        expect(() => parseField('5-2', 1, 5, 'minute')).toThrow("minute field contains invalid range '5-2'");
        expect(() => parseField('0-6', 1, 5, 'minute')).toThrow("minute field contains invalid range '0-6'");
        expect(() => parseField('10', 1, 5, 'minute')).toThrow("minute field contains out of range value '10'");
        expect(() => parseField('1-10', 1, 5, 'minute')).toThrow("minute field contains invalid range '1-10'");
        expect(() => parseField('1-2-3', 1, 5, 'minute')).toThrow("minute field contains invalid range '1-2-3'");
        expect(() => parseField('1-2,3', 1, 5, 'minute')).toThrow("minute field contains invalid range '1-2,3'");
        expect(() => parseField('1-2/3', 1, 5, 'minute')).toThrow("minute field contains invalid range '1-2/3'");
    });
});

describe('parseRange', () => {
    it('should parse "*" as full range', () => {
        expect(parseRange('*', 1, 3, 'minute')).toEqual([1, 2, 3]);
    });
    it('should parse single value', () => {
        expect(parseRange('2', 1, 5, 'minute')).toEqual([2]);
    });
    it('should parse valid range', () => {
        expect(parseRange('2-4', 1, 5, 'minute')).toEqual([2, 3, 4]);
        expect(parseRange('3-3', 1, 5, 'minute')).toEqual([3]);
    });
    it('should throw on out of range value', () => {
        expect(() => parseRange('8', 1, 5, 'minute')).toThrow("minute field contains out of range value '8'");
    });
    it('should throw on invalid range', () => {
        expect(() => parseRange('03', 1, 5, 'minute')).toThrow("minute field contains invalid range '03'");
        expect(() => parseRange('5-2', 1, 5, 'minute')).toThrow("minute field contains invalid range '5-2'");
        expect(() => parseRange('0-6', 1, 5, 'minute')).toThrow("minute field contains invalid range '0-6'");
        expect(() => parseRange('1-10', 1, 5, 'minute')).toThrow("minute field contains invalid range '1-10'");
        expect(() => parseRange('1-2-3', 1, 5, 'minute')).toThrow("minute field contains invalid range '1-2-3'");
        expect(() => parseRange('1-2,3', 1, 5, 'minute')).toThrow("minute field contains invalid range '1-2,3'");
        expect(() => parseRange('1-2/3', 1, 5, 'minute')).toThrow("minute field contains invalid range '1-2/3'");
    });
});

describe('replaceMonthString', () => {
    it('should replace month names with numbers', () => {
        expect(replaceMonthString('JAN')).toBe('1');
        expect(replaceMonthString('FEB-MAR')).toBe('2-3');
        expect(replaceMonthString('JAN,MAR,MAY')).toBe('1,3,5');
    });
    it('should not change numeric input', () => {
        expect(replaceMonthString('1-2')).toBe('1-2');
    });
});

describe('replaceDOWString', () => {
    it('should replace day of week names with numbers', () => {
        expect(replaceDOWString('SUN')).toBe('0');
        expect(replaceDOWString('MON-WED')).toBe('1-3');
        expect(replaceDOWString('SUN,MON,FRI')).toBe('0,1,5');
    });
    it('should not change numeric input', () => {
        expect(replaceDOWString('0-1')).toBe('0-1');
    });
});
*/
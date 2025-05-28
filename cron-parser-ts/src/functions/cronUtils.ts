/**
 * Iterator interface for cron schedule dates.
 */
interface CronScheduleIterator {
    /**
     * Returns the next scheduled date or marks iteration as done.
     */
    next(): { value?: Date; done: boolean };
    /**
     * Returns the iterator itself.
     */
    [Symbol.iterator](): CronScheduleIterator;
}

/**
 * Gets the current system timezone offset as a string in ±HH:MM format.
 * It does not consider daylight saving time.
 * @returns {string} The timezone offset string.
 */
const getTimezoneOffset = (): string => {
    const offset = new Date().getTimezoneOffset();
    const sign = offset < 0 ? '+' : '-';
    const hours = ('00' + Math.abs(offset / 60)).slice(-2);
    const minutes = ('00' + Math.abs(offset % 60)).slice(-2);
    return `${sign}${hours}:${minutes}`;
}

/**
 * Formats a Date object with specified formatType.
 * - Local: YYYY/MM/DD HH:mm
 * - LocalwithOffset: YYYY/MM/DD HH:mm(+/-HH:MM)
 * - UTC: YYYY/MM/DD HH:mm(UTC)
 * It does not consider daylight saving time.
 * To be more precise, the timezone offset is calculated based on 'now' and not the specified date.
 * @param {Date} date The date to format.
 * @returns {string} The formatted datetime string.
 */
const formatDate = (date: Date, formatType: 'Local' | 'LocalwithOffset' | 'UTC' = 'Local'): string => {
    if (isNaN(date.getTime())) {
        return 'Invalid Date';
    }
    if (formatType == 'UTC') {
        const yyyy = date.getUTCFullYear();
        const MM = ('00' + (date.getUTCMonth() + 1)).slice(-2);
        const dd = ('00' + date.getUTCDate()).slice(-2);
        const HH = ('00' + date.getUTCHours()).slice(-2);
        const mm = ('00' + date.getUTCMinutes()).slice(-2);
        return `${yyyy}/${MM}/${dd} ${HH}:${mm}(UTC)`;
    }
    // format with Local or LocalwithOffset
    const yyyy = date.getFullYear();
    const MM = ('00' + (date.getMonth() + 1)).slice(-2);
    const dd = ('00' + date.getDate()).slice(-2);
    const HH = ('00' + date.getHours()).slice(-2);
    const mm = ('00' + date.getMinutes()).slice(-2);
    const datetimeString = `${yyyy}/${MM}/${dd} ${HH}:${mm}`;
    return formatType === 'LocalwithOffset'
        ? `${datetimeString}(${getTimezoneOffset()})`
        : datetimeString;
}

/**
 * Represents a parsed cron expression.
 * It contains valid values for each field: minute, hour, day of month, month, and day of week.
 */
class ParsedCronExpression {
    readonly minute: number[];
    readonly hour: number[];
    readonly dom: number[];
    readonly month: number[];
    readonly dow: number[];

    /**
     * @param {number[]} minute Valid minute values.
     * @param {number[]} hour Valid hour values.
     * @param {number[]} dom Valid days of month.
     * @param {number[]} month Valid months.
     * @param {number[]} dow Valid days of week.
     */
    constructor(minute: number[], hour: number[], dom: number[], month: number[], dow: number[]) {
        this.minute = minute;
        this.hour = hour;
        this.dom = dom;
        this.month = month;
        this.dow = dow;
    }

    /**
     * Returns if the date matches the parsed cron expression.
     * @param {Date} [date] The date to validate.
     * @returns {boolean} True if the date matches the cron expression, false otherwise.
     */
    test(date: Date): boolean {
        return this.minute.includes(date.getMinutes()) &&
            this.hour.includes(date.getHours()) &&
            this.dom.includes(date.getDate()) &&
            this.month.includes(date.getMonth() + 1) &&
            this.dow.includes(date.getDay());
    }

    /**
     * Returns the next scheduled date after the given date.
     * @param {Date} [startDate] The date to start from.
     * @returns {Date | undefined} The next scheduled date, or undefined if not found.
     */
    getPreviews(startDate: Date = new Date()): CronScheduleIterator {
        return new CronPreview(this.minute, this.hour, this.dom, this.month, this.dow, startDate);
    }
}


/**
 * Iterator for cron schedule dates.
 */
class CronPreview implements CronScheduleIterator {
    private minute: number[];
    private hour: number[];
    private dom: number[];
    private month: number[];
    private dow: number[];
    private nextDate?: Date = undefined;

    /**
     * @param {number[]} minute Valid minute values.
     * @param {number[]} hour Valid hour values.
     * @param {number[]} dom Valid days of month.
     * @param {number[]} month Valid months.
     * @param {number[]} dow Valid days of week.
     * @param {Date} startDate The date to start from.
     */
    constructor(minute: number[], hour: number[], dom: number[], month: number[], dow: number[], startDate: Date) {
        this.minute = minute;
        this.hour = hour;
        this.dom = dom;
        this.month = month;
        this.dow = dow;
        this.nextDate = calculateNextDate(this.minute, this.hour, this.dom, this.month, this.dow, startDate);
    }

    /**
     * Returns the iterator itself.
     * @returns {CronScheduleIterator}
     */
    [Symbol.iterator](): CronScheduleIterator {
        return this;
    }

    /**
     * Returns the next scheduled date or marks iteration as done.
     * @returns {{ value?: Date; done: boolean }}
     */
    next(): { value?: Date; done: boolean } {
        const result = (this.nextDate == undefined) ?
            {
                done: true
            }
            :
            {
                value: new Date(this.nextDate),
                done: false
            }
        this.nextDate = calculateNextDate(this.minute, this.hour, this.dom, this.month, this.dow, this.nextDate);
        return result;
    }
}

/**
 * Parses a cron expression into a ParsedCronExpression object.
 * The cron expression must have five fields: minute, hour, day of month, month, and day of week.
 * @param cronExpression 
 * @returns {ParsedCronExpression}
 * @throws {Error} If the cron expression is not valid.
 */
const parseCronExpression = (cronExpression: string): ParsedCronExpression => {
    if (typeof cronExpression !== 'string') {
        throw new TypeError('Cron expression must be a string');
    }
    const fields = cronExpression.trim().split(/\s+/);
    if (fields.length != 5) {
        throw new SyntaxError('Cron expression must have five fields');
    }
    const minutes = parseField(fields[0], 0, 59, 'minute');
    const hours = parseField(fields[1], 0, 23, 'hour');
    const dom = parseField(fields[2], 1, 31, 'day of month');
    const month = parseField(replaceMonthString(fields[3]), 1, 12, 'month');
    let dow = parseField(replaceDOWString(fields[4]), 0, 7, 'day of week');
    if (dow.includes(7)) {
        // 7 is not a valid day of week in cron, it should be treated as 0 (Sunday)
        dow.splice(dow.indexOf(7), 1);
        dow.push(0);
        dow = [...new Set(dow.sort())];
    }
    return new ParsedCronExpression(minutes, hours, dom, month, dow);
}

// private functions

/**
 * Calculates the offset to the next candidate value.
 * @param {number} current The current value.
 * @param {number[]} candidates Sorted array of candidate values. (not empty)
 * @param {number} min Minimum value of the range incase of wrap around.
 * @param {number} max Maximum value of the range incase of wrap around.
 * @returns {number} Offset to the next candidate.
 * @throws {Error} If candidates array is empty.
 */
const toNextValue = (current: number, candidates: number[], min: number, max: number): number => {
    for (const candidate of candidates) {
        if (candidate >= current) {
            return candidate - current;
        }
    }
    return candidates[0] + max + min + 1 - current;
}

/**
 * Forward the given date to the next valid minute and hour according to cron fields.
 * @param {Date} date The date to modify (in-place).
 * @param {number[]} minute Valid minute values.
 * @param {number[]} hour Valid hour values.
 */
const shiftTime = (date: Date, minute: number[], hour: number[]): void => {
    const addMinute = toNextValue(date.getMinutes(), minute, 0, 59);
    if (addMinute > 0) {
        date.setMinutes(date.getMinutes() + addMinute);
    }
    const addHour = toNextValue(date.getHours(), hour, 0, 23);
    if (addHour > 0) {
        date.setHours(date.getHours() + addHour);
    }
}

/**
 * Forward the given date to the next valid day, month, and day of week according to cron fields.
 * @param {Date} date The date to modify (in-place).
 * @param {number[]} dom Valid days of month.
 * @param {number[]} month Valid months.
 * @param {number[]} dow Valid days of week.
 */
const shiftDate = (date: Date, dom: number[], month: number[], dow: number[]): void => {
    // validate combination
    if ((Math.min(...dom) == 31 && !month.some(m => [1, 3, 5, 7, 8, 10, 12].includes(m))) ||
        (Math.min(...dom) == 30 && !month.some(m => [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(m)))
    ) {
        throw new Error('day of month and month combination error. cron expression will never hit.');
    }
    while (!dom.includes(date.getDate()) ||
        !month.includes(date.getMonth() + 1) ||
        !dow.includes(date.getDay())) {
        date.setDate(date.getDate() + 1);
    }
}

/**
 * Calculates the next scheduled date after the given date.
 * @param {number[]} minute Valid minute values.
 * @param {number[]} hour Valid hour values.
 * @param {number[]} dom Valid days of month.
 * @param {number[]} month Valid months.
 * @param {number[]} dow Valid days of week.
 * @param {Date} [previousDate] The date to start from.
 * @returns {Date | undefined} The next scheduled date, or undefined if not found.
 */
const calculateNextDate = (minute: number[], hour: number[], dom: number[], month: number[], dow: number[], previousDate?: Date): Date | undefined => {
    if (previousDate == undefined) {
        return;
    }
    const work = new Date(previousDate);
    work.setSeconds(0, 0);
    work.setMinutes(work.getMinutes() + 1);
    shiftTime(work, minute, hour);
    try {
        shiftDate(work, dom, month, dow);
    } catch {
        // if the date cannot be shifted to a valid day/month/dow, return undefined
        return;
    }
    return work;
}

/**
 * Replaces month names (JAN-DEC) with their numeric values in a cron field.
 * @param {string} month The month field string.
 * @returns {string} The string with month names replaced by numbers.
 */
const replaceMonthString = (month: string): string => {
    const monthMap: { [key: string]: string } = {
        'JAN': '1', 'FEB': '2', 'MAR': '3', 'APR': '4',
        'MAY': '5', 'JUN': '6', 'JUL': '7', 'AUG': '8',
        'SEP': '9', 'OCT': '10', 'NOV': '11', 'DEC': '12'
    };
    return month.toUpperCase().replace(/JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC/g, match => monthMap[match]);
}

/**
 * Replaces day-of-week names (SUN-SAT) with their numeric values in a cron field.
 * @param {string} dow The day-of-week field string.
 * @returns {string} The string with day-of-week names replaced by numbers.
 */
const replaceDOWString = (dow: string): string => {
    const dowMap: { [key: string]: string } = {
        'SUN': '0', 'MON': '1', 'TUE': '2', 'WED': '3',
        'THU': '4', 'FRI': '5', 'SAT': '6'
    };
    return dow.toUpperCase().replace(/SUN|MON|TUE|WED|THU|FRI|SAT/g, match => dowMap[match]);
}

/**
 * Parses a cron field into an array of valid numbers.
 * @param {string} field The cron field string.
 * @param {number} min Minimum allowed value.
 * @param {number} max Maximum allowed value.
 * @param {string} fieldName Field name for error messages.
 * @returns {number[]} Array of valid numbers for the field.
 */
const parseField = (field: string, min: number, max: number, fieldName: string): number[] => {
    return [...new Set(field.split(',').map(part => parsePart(part, min, max, fieldName)).flat().sort((a, b) => a - b))];
}

/**
 * Parses a part of a cron field (range, step, or value).
 * @param {string} part The part string.
 * @param {number} min Minimum allowed value.
 * @param {number} max Maximum allowed value.
 * @param {string} fieldName Field name for error messages.
 * @returns {number[]} Array of valid numbers for the part.
 */
const parsePart = (part: string, min: number, max: number, fieldName: string): number[] => {
    const regex = /^(?<rangeString>\S+)\/(?<stepString>\d+)$/;
    const match = part.match(regex)
    if (match) {
        const { rangeString, stepString } = match.groups!;
        if (!/^([1-9]\d*)$/.test(stepString)) {
            throw new Error(`${fieldName} field contains invalid step value '${stepString}'`);
        }
        const step: number = parseInt(stepString, 10);
        const range = parseRange(rangeString, min, max, fieldName);
        return range.filter(value => value % step == 0);
    }
    return parseRange(part, min, max, fieldName);
}

/**
 * Parses a range or single value in a cron field.
 * @param {string} range The range string.
 * @param {number} min Minimum allowed value.
 * @param {number} max Maximum allowed value.
 * @param {string} fieldName Field name for error messages.
 * @returns {number[]} Array of valid numbers for the range.
 */
const parseRange = (range: string, min: number, max: number, fieldName: string): number[] => {
    if (range === '*') {
        return Array.from({ length: max - min + 1 }, (_, i) => i + min);
    }
    if (/^([1-9]\d*|0)$/.test(range)) {
        const value = parseInt(range, 10);
        if (isNaN(value) || value < min || value > max) {
            throw new Error(`${fieldName} field contains out of range value '${value}'`);
        }
        return [value];
    }
    // range has the form "start-end"
    if (!/^([1-9]\d*|0)-([1-9]\d*|0)$/.test(range)) {
        throw new Error(`${fieldName} field contains invalid range '${range}'`);
    }
    const parts = range.split('-').map(Number);
    if (parts.length !== 2 || parts[0] < min || parts[1] > max || parts[0] > parts[1]) {
        throw new Error(`${fieldName} field contains invalid range '${range}'`);
    }
    return Array.from({ length: parts[1] - parts[0] + 1 }, (_, i) => parts[0] + i);
}


export {
    CronPreview, formatDate, getTimezoneOffset, parseCronExpression, ParsedCronExpression, type CronScheduleIterator
};


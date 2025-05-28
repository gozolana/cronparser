import { CronScheduleIterator, formatDate, getTimezoneOffset, parseCronExpression } from "./cronUtils";

export const fncGetTimezoneOffset = () => {
    return getTimezoneOffset();
}

export const fncValidateCronExpression = (cron: string): boolean => {
    try {
        // Attempt to parse the cron expression to validate it
        parseCronExpression(cron);
        return true; // If parsing succeeds, the cron expression is valid
    }
    catch (error) {
        return false; // Return false if there's an error in validation
    }
}

export const fncGetPreviewSchedules = (cron: string, startDate: string, maxCount: number = 10): string[] => {
    return [];
}

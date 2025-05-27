import { CronScheduleIterator, parseCronExpression } from "./cronUtils";

export const fncParseCronExpression = (cron: string, date?: Date): CronScheduleIterator => {
    try {
        return parseCronExpression(cron, date);
    } catch (error) {
        console.error("Error parsing cron expression:", error);
        throw error; // Re-throw the error after logging
    }
}

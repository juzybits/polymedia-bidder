const TIME_LABEL = {
    year: { full: "year", short: "y" },
    month: { full: "month", short: "m" },
    day: { full: "day", short: "d" },
    hour: { full: "hour", short: "h" },
    min: { full: "min", short: "m" },
    sec: { full: "sec", short: "s" },
};

/** Time units in milliseconds. */
export enum TimeUnit {
    ONE_SECOND = 1000,
    ONE_MINUTE = 60_000,
    ONE_HOUR = 3_600_000,
    ONE_DAY = 86_400_000,
}

/**
 * Returns a human-readable string with the time difference between two timestamps.
 */
export function timeAgo(
    timestamp: number,
    now: number = Date.now(),
    shortenTimeLabel: boolean = true,
    endLabel: string = "< 1 sec",
    maxTimeUnit: TimeUnit = TimeUnit.ONE_DAY
): string {
    if (!timestamp) return "";

    const dateKeyType = shortenTimeLabel ? "short" : "full";
    let timeCol = Math.abs(now - timestamp);

    let timeUnit: [string, number][];
    if (timeCol >= Number(maxTimeUnit) && Number(maxTimeUnit) >= Number(TimeUnit.ONE_DAY)) {
        timeUnit = [
            [TIME_LABEL.day[dateKeyType], TimeUnit.ONE_DAY],
            [TIME_LABEL.hour[dateKeyType], TimeUnit.ONE_HOUR],
        ];
    } else if (timeCol >= Number(TimeUnit.ONE_HOUR)) {
        timeUnit = [
            [TIME_LABEL.hour[dateKeyType], TimeUnit.ONE_HOUR],
            [TIME_LABEL.min[dateKeyType], TimeUnit.ONE_MINUTE],
        ];
    } else {
        timeUnit = [
            [TIME_LABEL.min[dateKeyType], TimeUnit.ONE_MINUTE],
            [TIME_LABEL.sec[dateKeyType], TimeUnit.ONE_SECOND],
        ];
    }

    const convertAmount = (amount: number, label: string) => {
        const spacing = shortenTimeLabel ? "" : " ";
        if (amount > 1) return `${amount}${spacing}${label}${!shortenTimeLabel ? "s" : ""}`;
        if (amount === 1) return `${amount}${spacing}${label}`;
        return "";
    };

    const resultArr = timeUnit.map(([label, denom]) => {
        const whole = Math.floor(timeCol / denom);
        timeCol = timeCol - whole * denom;
        return convertAmount(whole, label);
    });

    const result = resultArr.join(" ").trim();

    return result || endLabel;
}

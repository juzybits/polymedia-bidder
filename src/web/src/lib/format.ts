// TODO: move to @polymedia/core

import { TimeUnit } from "./time";

/**
 * Return a human-readable string from a number of milliseconds.
 * E.g. "1 day", "2 hours", "3 minutes", "4 seconds".
 */
export const formatDuration = (ms: number): string =>
{
    const formatUnit = (value: number, unit: string) =>
        `${value} ${unit}${value !== 1 ? 's' : ''}`;

    if (ms >= TimeUnit.ONE_DAY) {
        return formatUnit(Math.floor(ms / TimeUnit.ONE_DAY), 'day');
    }
    if (ms >= TimeUnit.ONE_HOUR) {
        return formatUnit(Math.floor(ms / TimeUnit.ONE_HOUR), 'hour');
    }
    if (ms >= TimeUnit.ONE_MINUTE) {
        return formatUnit(Math.floor(ms / TimeUnit.ONE_MINUTE), 'minute');
    }
    return formatUnit(Math.floor(ms / TimeUnit.ONE_SECOND), 'second');
};

/**
 * Return a human-readable date string from a timestamp in milliseconds.
 */
export const formatDate = (ms: number): string => {
    return new Date(ms).toLocaleString();
};

/**
 * Return a human-readable string from a number of basis points.
 * E.g. "100 bps" -> "1%".
 */
export const formatBps = (bps: number): string => {
    return `${bps / 100}%`;
};

/**
 * Return a shortened version of a transaction digest.
 * E.g. "yjxT3tJvRdkg5p5NFN64hGUGSntWoB8MtA34ErFYMgW" -> "yjxT…YMgW".
 */
export const shortenDigest = (digest: string): string => {
    return digest.slice(0, 4) + "…" + digest.slice(-4);
};

import { TimeUnit } from "./time";

export const msToHours = (ms: number): string => {
    return `${ms / TimeUnit.ONE_HOUR} hours`;
};

export const msToMinutes = (ms: number): string => {
    return `${ms / TimeUnit.ONE_MINUTE} minutes`;
};

export const msToDate = (ms: number): string => {
    return new Date(ms).toLocaleString();
};

export const bpsToPct = (bps: number): string => {
    return `${bps / 100}%`;
};

export const shortenDigest = (digest: string): string => {
    return digest.slice(0, 6) + "…" + digest.slice(-4);
};

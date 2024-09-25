import { useState, useEffect } from "react";

/**
 * A hook to handle data fetching.
 *
 * @template T The type of data returned by the fetch function
 * @param fetchFunction An async function that returns a `Promise<T>`
 * @param dependencies An array of dependencies that trigger a re-fetch when changed
 * @returns An object containing the fetched data and any error that occurred
 */
export function useFetch<T>( // TODO move to @polymedia/suitcase-react
    fetchFunction: () => Promise<T>,
    dependencies: unknown[] = [],
) {
    const [data, setData] = useState<T | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () =>
        {
            setData(undefined);
            setError(null);
            try {
                const result = await fetchFunction();
                setData(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An unknown error occurred");
                console.warn("[useFetch]", err);
            }
        };
        fetchData();
    }, dependencies);

    return { data, error };
}

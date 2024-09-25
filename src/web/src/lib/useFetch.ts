import { PaginatedResponse } from "@polymedia/bidder-sdk";
import { useEffect, useState } from "react";

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

/**
 * A hook to handle data fetching and loading more data.
 *
 * @template T The type of data returned by the fetch function
 * @param fetchFunction An async function that returns a `Promise<PaginatedResponse<T>>`
 * @param dependencies An array of dependencies that trigger a re-fetch when changed
 * @returns An object containing the fetched data, whether there is a next page, and functions to load more data
 */
export function useFetchAndLoadMore<T>(
    fetchFunction: (cursor: string | null | undefined) => Promise<PaginatedResponse<T>>,
    dependencies: unknown[] = [],
) {
    const [ data, setData ] = useState<T[]>([]);
    const [ hasNextPage, setHasNextPage ] = useState(false);
    const [ isLoading, setIsLoading ] = useState(false);
    const [ cursor, setCursor ] = useState<string | null | undefined>(null);

    const loadMore = async () =>
    {
        if (isLoading) return;

        setIsLoading(true);
        try {
            const response = await fetchFunction(cursor);
            setData((prevData) => [...prevData, ...response.data]);
            setHasNextPage(response.hasNextPage);
            setCursor(response.nextCursor);
        } catch (err) {
            console.warn("[useLoadMore]", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadMore();
    }, dependencies);

    return { data, hasNextPage, isLoading, loadMore };
}

// TODO move to @polymedia/suitcase-react

import { PaginatedResponse } from "@polymedia/suitcase-core";
import { useEffect, useState } from "react";

/**
 * A hook to handle data fetching.
 *
 * @template T The type of data returned by the fetch function
 * @param fetchFunction An async function that returns a `Promise<T>`
 * @param dependencies An array of dependencies that trigger a re-fetch when changed
 * @returns An object containing the fetched data and any error that occurred
 */
export function useFetch<T>(
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
    const [ error, setError ] = useState<string | null>(null);
    const [ isLoading, setIsLoading ] = useState(false);
    const [ hasNextPage, setHasNextPage ] = useState(true);
    const [ nextCursor, setNextCursor ] = useState<string | null | undefined>(null);

    const loadMore = async () =>
    {
        if (isLoading || !hasNextPage)
            return;

        setIsLoading(true);
        try {
            const response = await fetchFunction(nextCursor);
            setData((prevData) => [...prevData, ...response.data]);
            setHasNextPage(response.hasNextPage);
            setNextCursor(response.nextCursor);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load more data");
            console.warn("[useFetchAndLoadMore]", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setData([]);
        setHasNextPage(true);
        setNextCursor(null);
        loadMore();
    }, dependencies);

    return { data, error, isLoading, hasNextPage, loadMore };
}

/**
 * A hook to handle data fetching and paginating through the results.
 *
 * @template T The type of data returned by the fetch function
 * @param fetchFunction An async function that returns a `Promise<PaginatedResponse<T>>`
 * @param dependencies An array of dependencies that trigger a re-fetch when changed
 * @returns An object containing the following properties:
 *   - page - The current page of data
 *   - error - Any error that occurred during fetching
 *   - isLoading - Whether data is currently being fetched
 *   - hasMultiplePages - Whether there are multiple pages of data
 *   - isFirstPage - Whether the current page is the first page
 *   - isLastPage - Whether the current page is the last fetched page
 *   - hasNextPage - Whether there is a next page available to fetch
 *   - goToNextPage - Function to navigate to the next page
 *   - goToPreviousPage - Function to navigate to the previous page
 */
export function useFetchAndPaginate<T>(
    fetchFunction: (cursor: string | null | undefined) => Promise<PaginatedResponse<T>>,
    dependencies: unknown[] = [],
) {
    const [ pages, setPages ] = useState<T[][]>([]);
    const [ error, setError ] = useState<string | null>(null);
    const [ isLoading, setIsLoading ] = useState(false);
    const [ pageIndex, setPageIndex ] = useState(-1);
    const [ hasNextPage, setHasNextPage ] = useState(true);
    const [ nextCursor, setNextCursor ] = useState<string | null | undefined>(null);

    const goToNextPage = async () =>
    {
        const isLastPage = pageIndex === pages.length - 1;
        const nextPageIndex = pageIndex + 1;

        if (isLoading) return; // already fetching
        if (isLastPage && !hasNextPage) return; // no more pages available
        if (!isLastPage) { // next page already fetched
            setPageIndex(nextPageIndex);
            return;
        }
        // fetch the next page
        setIsLoading(true);
        try {
            const response = await fetchFunction(nextCursor);
            setPages((prevPages) => [...prevPages, response.data]);
            setHasNextPage(response.hasNextPage);
            setNextCursor(response.nextCursor);
            setPageIndex(nextPageIndex);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load more data");
            console.warn("[useFetchAndPaginate]", err);
        } finally {
            setIsLoading(false);
        }
    };

    const goToPreviousPage = () => {
        if (pageIndex > 0) {
            setPageIndex(pageIndex - 1);
        }
    };

    useEffect(() => {
        setPages([]);
        setPageIndex(-1);
        setHasNextPage(true);
        setNextCursor(null);
        goToNextPage();
    }, dependencies);

    return {
        page: pages[pageIndex] ?? [],
        error,
        isLoading,
        hasMultiplePages: pages.length > 1 || (pages.length === 1 && hasNextPage),
        isFirstPage: pageIndex === 0,
        isLastPage: pageIndex === pages.length - 1,
        hasNextPage,
        goToNextPage,
        goToPreviousPage,
    };
}

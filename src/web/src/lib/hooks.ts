import { useEffect, useState } from "react";

import { useAppContext } from "../app/context";

export const useFetchUserId = (
    address: string | undefined,
) =>
{
    // === state ===

    const { bidderClient } = useAppContext();

    const [userId, setUserId] = useState<string | null | undefined>();
    const [errorFetchUserId, setError] = useState<string | null>(null);

    // === effects ===

    useEffect(() => {
        fetchUserId();
    }, [bidderClient, address]);

    // === functions ===

    /** Set the userId and cache it in the bidder client. */
    const updateUserId = (newUserId: string) => {
        setUserId(newUserId);
        address && bidderClient.cacheUserId(address, newUserId);
    };

    const fetchUserId = async () =>
    {
        setError(null);

        if (!address) {
            setUserId(null);
            return;
        }

        setUserId(undefined); // loading

        try {
            const newUserId = await bidderClient.fetchUserId(address);
            setUserId(newUserId);
        } catch (err) {
            setUserId(null);
            setError("Failed to fetch user object");
            console.warn("[fetchUserId]", err);
        }
    };

    return { userId, updateUserId, errorFetchUserId };
};

import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "../App";

export const useFetchUserId = (
    address: string | undefined,
) =>
{
    // === state ===

    const { bidderClient } = useOutletContext<AppContext>();

    const [userId, setUserId] = useState<string | null | undefined>();
    const [errorFetchUserId, setError] = useState<string | null>(null);

    // === effects ===

    useEffect(() => {
        fetchUserId();
    }, [bidderClient, address]);

    // === functions ===

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

    return { userId, errorFetchUserId };
};

import { useEffect, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "../App";

export const useFetchUserId = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();

    const { auctionClient } = useOutletContext<AppContext>();

    const [ userId, setUserId ] = useState<string | null | undefined>();
    const [ errorFetchUserId, setError ] = useState<Error | null>(null);

    // === effects ===

    useEffect(() => {
        fetchUserId();
    }, [auctionClient, currAcct]);

    // === functions ===

    const fetchUserId = async () =>
    {
        setError(null);

        if (!currAcct) {
            setUserId(null);
            return;
        }

        setUserId(undefined); // loading

        try {
            const newUserId = await auctionClient.fetchUserId(currAcct.address);
            setUserId(newUserId);
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
            setUserId(null);
        }
    };

    return { userId, errorFetchUserId };
};

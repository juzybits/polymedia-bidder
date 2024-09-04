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
    const [ errorFetchUserId, setError ] = useState<string | null>(null);

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
            setUserId(null);
            setError("Failed to fetch user object");
            console.warn("[fetchUserId]", err);
        }
    };

    return { userId, errorFetchUserId };
};

import { useEffect, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "../App";

export const useFetchUserId = () =>
{
    const currAcct = useCurrentAccount();
    const { auctionClient } = useOutletContext<AppContext>();
    const [ userId, setUserId ] = useState<string | null | undefined>();

    useEffect(() => {
        fetchUserId();
    }, [auctionClient, currAcct]);

    const fetchUserId = async () => {
        if (!currAcct) {
            setUserId(null);
        } else {
            const newUserId = await auctionClient.fetchUserId(currAcct.address);
            setUserId(newUserId);
        }
    };

    return userId;
};

import { useCurrentAccount } from "@mysten/dapp-kit";
import { UserAuction, UserBid } from "@polymedia/bidder-sdk";
import { objResToOwner, shortenAddress } from "@polymedia/suitcase-core";
import { LinkToPolymedia } from "@polymedia/suitcase-react";
import React, { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { AppContext } from "./App";
import { ConnectToGetStarted } from "./components/ConnectToGetStarted";
import { CardLoading, CardWithMsg } from "./components/cards";
import { useFetchUserId } from "./hooks/useFetchUserId";
import { timeAgo } from "./lib/time";

export const PageUser: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();
    const { address: addressParam, objectId: objectIdParam } = useParams<{ address?: string; objectId?: string }>();

    const addressToFetch = objectIdParam ? undefined : (addressParam ?? currAcct?.address);
    const [ addressToDisplay, setAddressToDisplay ] = useState<string | undefined>(addressToFetch);

    const { userId, errorFetchUserId } = objectIdParam
        ? { userId: objectIdParam, errorFetchUserId: null }
        : useFetchUserId(addressToFetch);

    const { header, network, bidderClient } = useOutletContext<AppContext>();

    // === effects ===

    useEffect(() => {
        if (addressToFetch) {
            setAddressToDisplay(addressToFetch);
        } else if (objectIdParam) {
            (async () => {
                try {
                    const obj = await bidderClient.suiClient.getObject({
                        id: objectIdParam,
                        options: { showOwner: true },
                    });
                    const newAddressToDisplay = objResToOwner(obj);
                    setAddressToDisplay(newAddressToDisplay);
                } catch (err) {
                    console.warn("[fetchUserObjOwner]", err);
                    setAddressToDisplay("error");
                }
            })();
        }
    }, [addressToFetch, objectIdParam, bidderClient.suiClient]);

    // === html ===

    let content: React.ReactNode;
    if (!currAcct) {
        content = <ConnectToGetStarted />;
    } else if (errorFetchUserId) {
        content = <CardWithMsg>{errorFetchUserId}</CardWithMsg>;
    } else {
        content = <>
            <SectionUserAuctions userId={userId} />
            <SectionUserBids userId={userId} />
        </>;
    }
    return <>
        {header}
        <div id="page-user" className="page-regular">
            <div className="page-content">
                <h1 className="page-title">USER HISTORY</h1>
                <div className="section-description">
                    <div>User address: {!addressToDisplay ? "loading..." : <LinkToPolymedia addr={addressToDisplay} kind="address" network={network} />}</div>
                    <div>User object:&nbsp; {!userId ? "loading..." : <LinkToPolymedia addr={userId} kind="object" network={network} />}</div>
                </div>
                {content}
            </div>
        </div>
    </>;
};

const SectionUserAuctions: React.FC<{
    userId: string | null | undefined;
}> = ({
    userId,
}) => // TODO: pagination
{
    // === state ===

    const { bidderClient } = useOutletContext<AppContext>();

    const [ userAuctions, setUserAuctions ] = useState<UserAuction[] | undefined>();
    const [ errFetch, setErrFetch ] = useState<string | null>(null);

    // === effects ===

    useEffect(() => {
        fetchAuctions();
    }, [userId]);

    // === functions ===

    const fetchAuctions = async () =>
    {
        setUserAuctions(undefined);
        setErrFetch(null);
        if (!userId) {
            return;
        }
        try {
            const newUserAuctions = await bidderClient.fetchUserAuctions(userId);
            setUserAuctions(newUserAuctions);
        } catch (err) {
            setErrFetch("Failed to fetch user auctions");
            console.warn("[fetchAuctions]", err);
        }
    };

    // === html ===

    let content: React.ReactNode;

    if (userId === undefined) {
        content = <CardLoading />;
    }
    else if (userId === null || userAuctions?.length === 0) {
        content = <CardWithMsg>No auctions yet</CardWithMsg>;
    }
    else if (errFetch) {
        content = <CardWithMsg>{errFetch}</CardWithMsg>;
    }
    else if (userAuctions === undefined) {
        content = <CardLoading />;
    }
    else {
        content = (
            <div className="list-cards">
                {userAuctions.map(auction =>
                    <CardUserAuction auction={auction} key={auction.auction_addr} />
                )}
            </div>
        );
    }

    return (
        <div className="page-section">
            <div className="section-title">
                Your auctions
            </div>
            {content}
        </div>
    );
};


const SectionUserBids: React.FC<{
    userId: string | null | undefined;
}> = ({
    userId,
}) => // TODO: pagination
{
    // === state ===

    const { network, bidderClient } = useOutletContext<AppContext>();

    const [ userBids, setUserBids ] = useState<UserBid[] | undefined>();
    const [ errFetch, setErrFetch ] = useState<string | null>(null);

    // === effects ===

    useEffect(() => {
        fetchBids();
    }, [userId]);

    // === functions ===

    const fetchBids = async () =>
    {
        setUserBids(undefined);
        setErrFetch(null);
        if (!userId) {
            return;
        }
        try {
            const newUserBids = await bidderClient.fetchUserBids(userId);
            setUserBids(newUserBids);
        } catch (err) {
            setErrFetch("Failed to fetch user bids");
            console.warn("[fetchBids]", err);
        }
    };

    // === html ===

    let content: React.ReactNode;

    if (userId === undefined) {
        content = <CardLoading />;
    }
    else if (userId === null || userBids?.length === 0) {
        content = <CardWithMsg>No bids yet</CardWithMsg>;
    }
    else if (errFetch) {
        content = <CardWithMsg>{errFetch}</CardWithMsg>;
    }
    else if (userBids === undefined) {
        content = <CardLoading />;
    }
    else {
        content = (
            <div className="list-cards">
                {userBids.map(bid =>
                    <CardUserBid bid={bid} key={bid.auction_addr + bid.amount} />
                )}
            </div>
        );
    }

    return <>
        <div className="page-section">
            <div className="section-title">
                Your bids
            </div>
            {content}
        </div>
    </>;
};

const CardUserAuction: React.FC<{ // TODO: fetch auction, then show auction name, and convert amount to <Balance />
    auction: UserAuction;
}> = ({
    auction,
}) =>
{
    const { network } = useOutletContext<AppContext>();
    return (
        <Link to={`/auction/${auction.auction_addr}`} className="card">
            <div className="card-header">
                <div className="card-title">
                    {shortenAddress(auction.auction_addr)}
                </div>
                <span className="header-label">
                    {timeAgo(auction.time)}
                </span>
            </div>
        </Link>
    );
};

const CardUserBid: React.FC<{ // TODO: fetch auction, then show auction name, and convert amount to <Balance />
    bid: UserBid;
}> = ({
    bid,
}) =>
{
    return (
        <Link to={`/auction/${bid.auction_addr}`} className="card">
            <div className="card-header">
                <div className="card-title">
                    {shortenAddress(bid.auction_addr)}
                </div>
                <span className="header-label">
                    {timeAgo(bid.time)}
                </span>
            </div>
            <div>Amount: {bid.amount.toString()}</div>
        </Link>
    );
};

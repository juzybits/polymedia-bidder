import { useCurrentAccount } from "@mysten/dapp-kit";
import { AuctionObj, UserAuction, UserBid } from "@polymedia/auction-sdk";
import { shortenAddress } from "@polymedia/suitcase-core";
import { LinkToPolymedia } from "@polymedia/suitcase-react";
import React, { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { ConnectToGetStarted } from "./components/ConnectToGetStarted";
import { Balance, bpsToPct, CardLoading, CardWithMsg, msToDate, msToMinutes, ObjectLinkList } from "./components/cards";
import { useFetchUserId } from "./hooks/useFetchUserId";
import { timeAgo } from "./lib/time";

export const PageUserHistory: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();

    const { userId, errorFetchUserId } = useFetchUserId();

    const { header } = useOutletContext<AppContext>();

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

    const { auctionClient } = useOutletContext<AppContext>();

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
            const newUserAuctions = await auctionClient.fetchUserAuctions(userId);
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

    const { network, auctionClient } = useOutletContext<AppContext>();

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
            const newUserBids = await auctionClient.fetchUserBids(userId);
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

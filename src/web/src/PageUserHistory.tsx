import { useCurrentAccount } from "@mysten/dapp-kit";
import { AuctionObj, UserBid } from "@polymedia/auction-sdk";
import { LinkToPolymedia } from "@polymedia/suitcase-react";
import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { ConnectToGetStarted } from "./components/ConnectToGetStarted";
import { Balance, bpsToPct, CardLoading, CardWithMsg, msToDate, msToMinutes, ObjectLinkList } from "./components/cards";
import { useFetchUserId } from "./hooks/useFetchUserId";

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

    const [ userAuctions, setUserAuctions ] = useState<AuctionObj[] | undefined>();
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
                    <div className="card" key={auction.id}>
                        <CardAuctionDetails auction={auction} />
                    </div>
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
                    <div key={bid.auction_id + bid.amount} className="card">
                        <div><LinkToPolymedia addr={bid.auction_id} kind="object" network={network} /></div>
                        <div>Time: {new Date(bid.time).toLocaleString()}</div>
                        <div>Amount: {bid.amount.toString()}</div> {/* TODO: fetch auction then calculate amount based on currency decimals */}
                    </div>
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

const CardAuctionDetails: React.FC<{ // TODO
    auction: AuctionObj;
}> = ({
    auction,
}) => {
    const { network } = useOutletContext<AppContext>();
    return <>
        <div>Auction: <LinkToPolymedia addr={auction.id} kind="object" network={network} /></div>
        <div>Currency: <LinkToPolymedia addr={auction.type_coin} kind="coin" network={network} /></div>
        {/* <div>Name: {auction.name}</div>
        <div>Description: {auction.description}</div> */}
        <div>Auctioned items: <ObjectLinkList ids={auction.item_addrs} /></div>
        <div>Item bag: <LinkToPolymedia addr={auction.item_bag.id} kind="object" network={network} /> ({auction.item_bag.size} items)</div>
        <div>Admin address: <LinkToPolymedia addr={auction.admin_addr} kind="address" network={network} /></div>
        <div>Payment address: <LinkToPolymedia addr={auction.pay_addr} kind="address" network={network} /></div>
        <div>Leader address: <LinkToPolymedia addr={auction.lead_addr} kind="address" network={network} /></div>
        <div>Leader amount: <Balance balance={auction.lead_value} coinType={auction.type_coin} /></div>
        <div>Start time: {msToDate(auction.begin_time_ms)}</div>
        <div>End time: {msToDate(auction.end_time_ms)}</div>
        <div>Minimum bid allowed: <Balance balance={auction.minimum_bid} coinType={auction.type_coin} /></div>
        <div>Minimum bid increase: {bpsToPct(auction.minimum_increase_bps)}</div>
        <div>Extension period: {msToMinutes(auction.extension_period_ms) }</div>
        <div>Is live: {auction.is_live ? "yes" : "no"}</div>
        <div>Has ended: {auction.has_ended ? "yes" : "no"}</div>
    </>;
};

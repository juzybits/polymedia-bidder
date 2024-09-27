import { useCurrentAccount } from "@mysten/dapp-kit";
import { AuctionObj, UserAuction, UserBid, UserRecentHistory } from "@polymedia/bidder-sdk";
import { formatTimeDiff, shortenAddress } from "@polymedia/suitcase-core";
import { LinkToExplorer } from "@polymedia/suitcase-react";
import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { CardSpinner, CardWithMsg, HeaderLabel, TopBid } from "./components/cards";
import { ConnectToGetStarted } from "./components/ConnectToGetStarted";
import { HeaderTabs, makeTabs } from "./components/tabs";
import { useFetchUserId } from "./hooks/useFetchUserId";
import { useFetch } from "./lib/useFetch";
import { PageNotFound } from "./PageFullScreenMsg";

const tabs = makeTabs([
    { name: "bids" },
    { name: "auctions" },
]);

export const PageUser: React.FC = () =>
{
    // === external state ===

    const currAcct = useCurrentAccount();
    const { header, explorer, network, bidderClient } = useAppContext();

    // === url validation ===

    const { address: addressParam, tabName } = useParams<{ address?: string; tabName?: string }>();

    if (!tabs.isTabName(tabName)) {
        return <PageNotFound />;
    }

    // === tabs ===

    const [ activeTab, setActiveTab ] = useState<string>(tabName);

    const changeTab = (tab: string) => {
        if (tabs.isTabName(tab)) {
            setActiveTab(tab);
            const url = `/user/${addressParam ? `${addressParam}/` : ""}${tab}`;
            window.history.replaceState({}, "", url);
        }
    };

    // === user address and object ===

    const addressToFetch = addressParam ?? currAcct?.address;

    const { userId, errorFetchUserId } = useFetchUserId(addressToFetch);

    // === user history ===

    const { data: userHistory, error: errFetchHistory } = useFetch<UserRecentHistory | null | undefined>(async () =>
    {
        if (userId === undefined) {
            return Promise.resolve(undefined);
        } else if (userId === null) {
            return Promise.resolve(null);
        } else {
            return await bidderClient.fetchUserRecentAuctionsAndBids(userId, 25, 25);
        }
    }, [userId, bidderClient]);

    // === auctions created or bid on ===

    const { data: auctions, error: errFetchAuctions } = useFetch<Map<string, AuctionObj> | null | undefined>(async () =>
    {
        if (!userHistory) {
            return Promise.resolve(null);
        }
        const uniqueAuctionIds = Array.from(new Set([
            ...userHistory.created.data.map(a => a.auction_addr),
            ...userHistory.bids.data.map(b => b.auction_addr)
        ]));
        const auctionObjs = await bidderClient.fetchAuctions(uniqueAuctionIds);
        return new Map(auctionObjs.map(a => [a.id, a]));
    }, [userHistory, bidderClient]);

    // === html ===

    const errMsg = errorFetchUserId ?? errFetchHistory ?? errFetchAuctions;

    let content: React.ReactNode;
    if (!addressToFetch) {
        content = <div className="card compact"><ConnectToGetStarted /></div>
    } else if (errMsg) {
        content = <CardWithMsg>{errMsg}</CardWithMsg>;
    } else {
        content = <div className="tabs-container">
            <HeaderTabs tabs={tabs.all} activeTab={activeTab} onChangeTab={changeTab} />
            <div className="tabs-content">
                {activeTab === "auctions" &&
                <SectionUserAuctions
                    history={userHistory === null ? null : userHistory?.created}
                    auctions={auctions}
                />}
                {activeTab === "bids" &&
                <SectionUserBids
                    history={userHistory === null ? null : userHistory?.bids}
                    auctions={auctions}
                />}
            </div>
        </div>;
    }

    return <>
        {header}
        <div id="page-user" className="page-regular">
            <div className="page-content">
                <div className="page-title">USER HISTORY</div>
                <div className="page-section">
                    {addressToFetch &&
                    <div className="page-description">
                        <div>This is the BIDDER history for address {<LinkToExplorer addr={addressToFetch} kind="address" explorer={explorer} network={network} />} {userId &&
                            <>(user <LinkToExplorer addr={userId} kind="object" explorer={explorer} network={network} />)</>}
                        </div>
                    </div>}
                    {content}
                </div>
            </div>
        </div>
    </>;
};

const SectionUserAuctions: React.FC<{
    history: UserRecentHistory["created"] | null | undefined;
    auctions: Map<string, AuctionObj> | null | undefined;
}> = ({
    history,
    auctions,
}) => // TODO: pagination
{
    if (history === undefined) {
        return <CardSpinner />;
    }
    if (history === null || history.data.length === 0) {
        return <CardWithMsg>No auctions yet</CardWithMsg>;
    }
    return (
        <div className="card-list">
            {history.data.map(auction =>
                <CardUserAuctionOrBid history={auction} auction={auctions?.get(auction.auction_addr)} key={auction.auction_addr} />
            )}
        </div>
    );
};


const SectionUserBids: React.FC<{
    history: UserRecentHistory["bids"] | null | undefined;
    auctions: Map<string, AuctionObj> | null | undefined;
}> = ({
    history,
    auctions,
}) => // TODO: pagination
{
    if (history === undefined) {
        return <CardSpinner />;
    }
    if (history === null || history.data.length === 0) {
        return <CardWithMsg>No bids yet</CardWithMsg>;
    }
    return (
        <div className="card-list">
            {history.data.map(bid =>
                <CardUserAuctionOrBid history={bid} auction={auctions?.get(bid.auction_addr)} key={bid.auction_addr + bid.amount} />
            )}
        </div>
    );
};

const CardUserAuctionOrBid: React.FC<{
    history: UserAuction | UserBid;
    auction: AuctionObj | undefined;
}> = ({
    history,
    auction,
}) => {
    const isBid = "amount" in history;

    return (
        <Link to={`/auction/${history.auction_addr}/items`} className="card tx">
            <div className="card-header column-on-small">

                <div className="card-title">
                    {auction ? auction.name : shortenAddress(history.auction_addr)}
                </div>
                <div className="auction-header-info">
                    {auction && <TopBid auction={auction} balance={isBid ? history.amount : undefined} />}
                    {auction
                        ? <HeaderLabel auction={auction} />
                        : <span className="header-label">{formatTimeDiff(history.time)}</span>}
                </div>
            </div>
        </Link>
    );
};
/*
const CardUserAuction: React.FC<{
    history: UserAuction;
    auction: AuctionObj | undefined;
}> = ({
    history,
    auction,
}) =>
{
    return (
        <Link to={`/auction/${history.auction_addr}/items`} className="card">
            <div className="card-header">
                <div className="card-title">
                    {auction ? auction.name : shortenAddress(history.auction_addr)}
                </div>
                {auction
                ? <HeaderLabel auction={auction} />
                : <span className="header-label">{timeAgo(history.time)}</span>}
            </div>
        </Link>
    );
};

const CardUserBid: React.FC<{
    history: UserBid;
    auction: AuctionObj | undefined;
}> = ({
    history,
    auction,
}) =>
{
    return (
        <Link to={`/auction/${history.auction_addr}/items`} className="card">
            <div className="card-header">
                <div className="card-title">
                    {auction ? auction.name : shortenAddress(history.auction_addr)}
                </div>
                <span className="header-label">
                    {timeAgo(history.time)}
                </span>
            </div>
            <div>Amount: {history.amount.toString()}</div>
        </Link>
    );
};
*/

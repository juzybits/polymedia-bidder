import { useCurrentAccount } from "@mysten/dapp-kit";
import { AuctionObj, UserAuction, UserBid, UserRecentHistory } from "@polymedia/bidder-sdk";
import { objResToOwner, shortenAddress } from "@polymedia/suitcase-core";
import { LinkToPolymedia } from "@polymedia/suitcase-react";
import React, { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { AppContext } from "./App";
import { Balance, CardLoading, CardWithMsg, HeaderLabel, TopBid } from "./components/cards";
import { ConnectToGetStarted } from "./components/ConnectToGetStarted";
import { makeTabs, TabsHeader } from "./components/tabs";
import { useFetchUserId } from "./hooks/useFetchUserId";
import { timeAgo } from "./lib/time";
import { PageNotFound } from "./PageFullScreenMsg";

const tabs = makeTabs([
    { name: "bids" },
    { name: "auctions" },
]);

export const PageUser: React.FC = () =>
{
    // === external state ===

    const currAcct = useCurrentAccount();
    const { header, network, bidderClient } = useOutletContext<AppContext>();

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

    const [ userHistory, setUserHistory ] = useState<UserRecentHistory | null | undefined>();
    const [ errFetchHistory, setErrFetchHistory ] = useState<string | null>(null);

    useEffect(() => {
        setErrFetchHistory(null);
        if (userId === undefined) {
            setUserHistory(undefined);
        } else if (userId === null) {
            setUserHistory(null);
        } else {
            bidderClient
                .fetchUserRecentAuctionsAndBids(userId, 25, 25)
                .then((newUserHistory) => {
                    console.log("[fetchUserHistory]", newUserHistory);
                    setUserHistory(newUserHistory);
                })
                .catch(err => {
                    console.warn("[fetchUserHistory]", err);
                    setErrFetchHistory("Failed to fetch user history");
                    setUserHistory(null);
                });
        }
    }, [userId, bidderClient]);

    // === auctions created or bid on ===

    const [ auctions, setAuctions ] = useState<Map<string, AuctionObj> | null | undefined>();
    const [ errFetchAuctions, setErrFetchAuctions ] = useState<string | null>(null);

    useEffect(() =>
    {
        setErrFetchAuctions(null);
        if (!userHistory) {
            return;
        }
        const uniqueAuctionIds = Array.from(new Set([
            ...userHistory.created.data.map(a => a.auction_addr),
            ...userHistory.bids.data.map(b => b.auction_addr)
        ]));
        bidderClient
            .fetchAuctions(uniqueAuctionIds)
            .then(auctionObjs => {
                setAuctions(new Map(auctionObjs.map(a => [a.id, a])));
            })
            .catch(err => {
                setAuctions(null);
                setErrFetchAuctions("Failed to fetch auctions");
                console.warn("[fetchAuctions]", err);
            });
    }, [userHistory, bidderClient]);

    // === html ===

    const errMsg = errorFetchUserId ?? errFetchHistory ?? errFetchAuctions;

    let content: React.ReactNode;
    if (!currAcct) {
        content = <ConnectToGetStarted />;
    } else if (errMsg) {
        content = <CardWithMsg>{errMsg}</CardWithMsg>;
    } else {
        content = <div className="tabs-container">
            <TabsHeader tabs={tabs.all} activeTab={activeTab} onChangeTab={changeTab} />
            <div className="tabs-content" style={{ paddingTop: "1.5rem" }}>
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

    const addressLink = addressToFetch === undefined
        ? <i>..loading..</i>
        : <LinkToPolymedia addr={addressToFetch} kind="address" network={network} />;
    return <>
        {header}
        <div id="page-user" className="page-regular">
            <div className="page-content">
                <div className="page-section">
                    <div className="page-title">USER HISTORY</div>
                    <div className="page-description">
                        <div>This is the BIDDER history for address {addressLink} {userId &&
                            <>(user <LinkToPolymedia addr={userId} kind="object" network={network} />)</>}
                        </div>
                    </div>
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
        return <CardLoading />;
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
        return <CardLoading />;
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
    const isBid = 'amount' in history;

    return (
        <Link to={`/auction/${history.auction_addr}/items`} className="card">
            <div className="card-header column-on-small">

                <div className="card-title">
                    {auction ? auction.name : shortenAddress(history.auction_addr)}
                </div>
                <div className="auction-header-info">
                    {auction && <TopBid auction={auction} />}
                    {auction
                        ? <HeaderLabel auction={auction} />
                        : <span className="header-label">{timeAgo(history.time)}</span>}
                </div>
            </div>
            {isBid && <div>
                {auction && <Balance balance={history.amount} coinType={auction.type_coin} />}
                {!auction && <span className="header-label">{history.amount.toString()}</span>}
            </div>}
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

import React, { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { AuctionObj, UserAuction, UserBid } from "@polymedia/bidder-sdk";
import { EmptyPaginatedResponse, formatTimeDiff, shortenAddress, validateAndNormalizeAddress } from "@polymedia/suitcase-core";
import { BtnPrevNext, LinkToExplorer, useFetchAndPaginate } from "@polymedia/suitcase-react";

import { useAppContext } from "./app/App";
import { CardSpinner, CardWithMsg, HeaderLabel, TopBid } from "./comp/cards";
import { HeaderTabs, makeTabs } from "./comp/tabs";
import { useFetchUserId } from "./hooks/useFetchUserId";
import { PageNotFound } from "./PageFullScreenMsg";

const PAGE_SIZE = 25;

const tabs = makeTabs([
    { name: "bids" },
    { name: "auctions" },
]);

export const PageUser: React.FC = () =>
{
    // === external state ===

    const { header, explorer, network } = useAppContext();

    // === url validation ===

    const { address, tabName } = useParams();
    const ownerAddress = address && validateAndNormalizeAddress(address);

    if (!ownerAddress || !tabs.isTabName(tabName)) {
        return <PageNotFound />;
    }

    // === tabs ===

    const [ activeTab, setActiveTab ] = useState<string>(tabName);

    const changeTab = (tab: string) => {
        if (tabs.isTabName(tab)) {
            setActiveTab(tab);
            const url = `/user/${ownerAddress}/${tab}`;
            window.history.replaceState({}, "", url);
        }
    };

    // === user address and object ===

    const { userId, errorFetchUserId } = useFetchUserId(ownerAddress);

    // === html ===

    const tabsContainerRef = useRef<HTMLDivElement>(null);

    let content: React.ReactNode;
    if (errorFetchUserId) {
        content = <CardWithMsg>{errorFetchUserId}</CardWithMsg>;
    } else if (userId === undefined) {
        content = <CardSpinner />;
    } else {
        content = <div className="tabs-container" ref={tabsContainerRef}>
            <HeaderTabs tabs={tabs.all} activeTab={activeTab} onChangeTab={changeTab} />
            <div className="tabs-content">
                {activeTab === "bids" && <SectionUserBids userId={userId} tabsRef={tabsContainerRef}/>}
                {activeTab === "auctions" && <SectionUserAuctions  userId={userId} tabsRef={tabsContainerRef}/>}
            </div>
        </div>;
    }

    return <>
        {header}
        <div id="page-user" className="page-regular">
            <div className="page-content">
                <div className="page-title">USER HISTORY</div>
                <div className="page-section">
                    <div className="page-description">
                        <div>This is the BIDDER history for address {<LinkToExplorer addr={ownerAddress} kind="address" explorer={explorer} network={network} />} {userId &&
                            <>(user <LinkToExplorer addr={userId} kind="object" explorer={explorer} network={network} />)</>}
                        </div>
                    </div>
                    {content}
                </div>
            </div>
        </div>
    </>;
};

const SectionUserBids: React.FC<{
    userId: string | null;
    tabsRef: React.RefObject<HTMLDivElement>;
}> = ({
    userId,
    tabsRef,
}) =>
{
    const { bidderClient } = useAppContext();

    const history = useFetchAndPaginate<{evt: UserBid; obj: AuctionObj}, number|undefined>(
        async (cursor) => {
            if (!userId) {
                return EmptyPaginatedResponse;
            }
            const events = await bidderClient.fetchUserBids(userId, cursor, PAGE_SIZE);
            const auctions = await bidderClient.fetchAuctions(
                [...new Set(events.bids.map(a => a.auction_addr))] // deduplicate object IDs
            );
            const auctionMap = new Map(auctions.map(a => [a.id, a]));
            return {
                data: events.bids.map(evt => ({
                    evt,
                    obj: auctionMap.get(evt.auction_addr)!,
                })),
                hasNextPage: events.hasNextPage,
                nextCursor: events.nextCursor,
            };
        },
        [userId, bidderClient],
    );

    if (history.err) {
        return <CardWithMsg>{history.err}</CardWithMsg>;
    }
    if (history.isLoading && history.page.length === 0) {
        return <CardSpinner />;
    }
    if (!history.isLoading && history.page.length === 0) {
        return <CardWithMsg>No bids yet</CardWithMsg>;
    }
    return <>
        <div className={`card-list ${history.isLoading ? "loading" : ""}`}>
            {history.isLoading && <CardSpinner />}
            {history.page.map(bid =>
                <CardUserAuctionOrBid history={bid.evt} auction={bid.obj} key={bid.evt.auction_addr + bid.evt.amount} />
            )}
        </div>
        <BtnPrevNext data={history} scrollToRefOnPageChange={tabsRef} />
    </>;
};

const SectionUserAuctions: React.FC<{
    userId: string | null;
    tabsRef: React.RefObject<HTMLDivElement>;
}> = ({
    userId,
    tabsRef,
}) =>
{
    const { bidderClient } = useAppContext();

    const history = useFetchAndPaginate<{evt: UserAuction; obj: AuctionObj}, number|undefined>(
        async (cursor) => {
            if (!userId) {
                return EmptyPaginatedResponse;
            }
            const events = await bidderClient.fetchUserAuctions(userId, cursor, PAGE_SIZE);
            const auctions = await bidderClient.fetchAuctions(
                events.auctions.map(a => a.auction_addr) // no risk of duplicate object IDs
            );
            const auctionMap = new Map(auctions.map(a => [a.id, a]));
            return {
                data: events.auctions.map(evt => ({
                    evt,
                    obj: auctionMap.get(evt.auction_addr)!,
                })),
                hasNextPage: events.hasNextPage,
                nextCursor: events.nextCursor,
            };
        },
        [userId, bidderClient],
    );

    if (history.err) {
        return <CardWithMsg>{history.err}</CardWithMsg>;
    }
    if (history.isLoading && history.page.length === 0) {
        return <CardSpinner />;
    }
    if (!history.isLoading && history.page.length === 0) {
        return <CardWithMsg>No auctions yet</CardWithMsg>;
    }
    return <>
        <div className={`card-list ${history.isLoading ? "loading" : ""}`}>
            {history.isLoading && <CardSpinner />}
            {history.page.map(h =>
                <CardUserAuctionOrBid history={h.evt} auction={h.obj} key={h.evt.auction_addr} />
            )}
        </div>
        <BtnPrevNext data={history} scrollToRefOnPageChange={tabsRef} />
    </>;
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

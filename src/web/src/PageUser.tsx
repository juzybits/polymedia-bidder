import { useCurrentAccount } from "@mysten/dapp-kit";
import { AuctionObj, UserAuction, UserBid, UserRecentHistory } from "@polymedia/bidder-sdk";
import { objResToOwner, shortenAddress } from "@polymedia/suitcase-core";
import { LinkToPolymedia } from "@polymedia/suitcase-react";
import React, { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { AppContext } from "./App";
import { CardLoading, CardWithMsg } from "./components/cards";
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

    const {
        address: addressParam,
        objectId: objectIdParam,
        tabName = "bids",
    } = useParams<{ address?: string; objectId?: string; tabName?: string }>();

    if (!tabs.isTabName(tabName)) {
        return <PageNotFound />;
    }

    // === tabs ===

    const [ activeTab, setActiveTab ] = useState<string>(tabName);

    const changeTab = (tab: string) => {
        if (tabs.isTabName(tab)) {
            setActiveTab(tab);
            const baseUrl =
                addressParam ? `/user/a/${addressParam}`
               : objectIdParam ? `/user/o/${objectIdParam}`
               : "/user";
            window.history.replaceState({}, "", `${baseUrl}/${tab}`);
        }
    };

    // === user address and object ===

    const addressToFetch = objectIdParam ? undefined : (addressParam ?? currAcct?.address);
    const [ addressToDisplay, setAddressToDisplay ] = useState<string | null | undefined>(addressToFetch);

    const { userId, errorFetchUserId } = objectIdParam
        ? { userId: objectIdParam, errorFetchUserId: null }
        : useFetchUserId(addressToFetch);

    useEffect(() => {
        if (addressToFetch) {
            setAddressToDisplay(addressToFetch);
        } else if (objectIdParam) {
            bidderClient.suiClient.getObject({
                id: objectIdParam,
                options: { showOwner: true },
            })
            .then(obj => {
                const newAddressToDisplay = objResToOwner(obj);
                setAddressToDisplay(newAddressToDisplay);
                bidderClient.cacheUserId(newAddressToDisplay, objectIdParam);
            })
            .catch(err => {
                setAddressToDisplay(null);
                console.warn("[fetchUserObjOwner]", err);
            });
        }
    }, [addressToFetch, objectIdParam, bidderClient.suiClient]);

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

    const [ auctions, setAuctions ] = useState<AuctionObj[] | null | undefined>();
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
            .then(setAuctions)
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
                {activeTab === "auctions" && <SectionUserAuctions history={userHistory === null ? null : userHistory?.created} />}
                {activeTab === "bids" && <SectionUserBids history={userHistory === null ? null : userHistory?.bids} />}
            </div>
        </div>;
    }

    const addressLink =
        addressToDisplay === undefined ? <i>..loading..</i>
        : addressToDisplay === null ? <i>...error...</i>
        : <LinkToPolymedia addr={addressToDisplay} kind="address" network={network} />;
    const objectLink = !userId ? "loading..." : <LinkToPolymedia addr={userId} kind="object" network={network} />;
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
}> = ({
    history,
}) => // TODO: pagination
{
    if (history === undefined) {
        return <CardLoading />;
    }
    if (history === null || history.data.length === 0) {
        return <CardWithMsg>No auctions yet</CardWithMsg>;
    }
    return (
        <div className="list-cards">
            {history.data.map(auction =>
                <CardUserAuction auction={auction} key={auction.auction_addr} />
            )}
        </div>
    );
};


const SectionUserBids: React.FC<{
    history: UserRecentHistory["bids"] | null | undefined;
}> = ({
    history,
}) => // TODO: pagination
{
    if (history === undefined) {
        return <CardLoading />;
    }
    if (history === null || history.data.length === 0) {
        return <CardWithMsg>No bids yet</CardWithMsg>;
    }
    return (
        <div className="list-cards">
            {history.data.map(bid =>
                <CardUserBid bid={bid} key={bid.auction_addr + bid.amount} />
            )}
        </div>
    );
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

import { useCurrentAccount } from "@mysten/dapp-kit";
import { UserAuction, UserBid } from "@polymedia/bidder-sdk";
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
    { name: "auctions" },
    { name: "bids" },
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
        tabName = "auctions",
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
                    setAddressToDisplay(null);
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
            <TabsHeader tabs={tabs.all} activeTab={activeTab} onChangeTab={changeTab} />
            <div className="tabs-content">
                {activeTab === "auctions" && <SectionUserAuctions userId={userId} />}
                {activeTab === "bids" && <SectionUserBids userId={userId} />}
            </div>
        </>;
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
                <h1 className="page-title">USER HISTORY</h1>
                    <div className="page-description">
                        <div>This is the BIDDER history for address {addressLink} {userId &&
                            <>(user <LinkToPolymedia addr={userId} kind="object" network={network} />)</>}
                        </div>
                    </div>
                <div className="page-section">
                    {content}
                </div>
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

    if (userId === undefined) {
        return <CardLoading />;
    }
    else if (userId === null || userAuctions?.length === 0) {
        return <CardWithMsg>No auctions yet</CardWithMsg>;
    }
    else if (errFetch) {
        return <CardWithMsg>{errFetch}</CardWithMsg>;
    }
    else if (userAuctions === undefined) {
        return <CardLoading />;
    }
    return (
        <div className="list-cards">
            {userAuctions.map(auction =>
                <CardUserAuction auction={auction} key={auction.auction_addr} />
            )}
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

    if (userId === undefined) {
        return <CardLoading />;
    }
    else if (userId === null || userBids?.length === 0) {
        return <CardWithMsg>No bids yet</CardWithMsg>;
    }
    else if (errFetch) {
        return <CardWithMsg>{errFetch}</CardWithMsg>;
    }
    else if (userBids === undefined) {
        return <CardLoading />;
    }
    return (
        <div className="list-cards">
            {userBids.map(bid =>
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

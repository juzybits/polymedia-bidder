import { useCurrentAccount } from "@mysten/dapp-kit";
import { CoinMetadata } from "@mysten/sui/client";
import { AuctionClient, AuctionObj } from "@polymedia/auction-sdk";
import { useCoinMeta } from "@polymedia/coinmeta-react";
import { balanceToString, shortenAddress } from "@polymedia/suitcase-core";
import { ReactSetter } from "@polymedia/suitcase-react";
import React, { useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { AppContext } from "./App";
import { CardAuctionItems, CardTransaction } from "./components/cards";
import { FullScreenMsg } from "./components/FullScreenMsg";
import { useInputUnsignedBalance } from "./components/inputs";
import { useFetchUserId } from "./hooks/useFetchUserId";
import { PageNotFound } from "./PageNotFound";

type TabName = "items" | "bid" | "details" | "activity";

const TabHeader: React.FC<{
    tabName: TabName;
    selectedTab: TabName;
    setTab: ReactSetter<TabName>;
}> = ({
    tabName,
    selectedTab,
    setTab,
}) => {
    return (
        <div
            className={`tab-title ${tabName === selectedTab ? "selected" : ""}`}
            onClick={() => setTab(tabName)}
        >
            {tabName}
        </div>
    );
};

export const PageAuction: React.FC = () =>
{
    // === state ===

    const { auctionId } = useParams();
    if (!auctionId) { return <PageNotFound />; };

    const { auctionClient, header } = useOutletContext<AppContext>();

    const [ tab, setTab ] = useState<TabName>("items");
    const [ auction, setAuction ] = useState<AuctionObj|null>();

    // === effects ===

    useEffect(() => {
        fetchAuction();
    }, [auctionId]);

    // === functions ===

    const fetchAuction = async () => {
        try {
            const auction = await auctionClient.fetchAuction(auctionId);
            setAuction(auction);
        } catch (err) {
            console.warn("[fetchAuction]", err); // TODO show error to user
        }
    };

    // === html ===

    if (auction === undefined) {
        return <FullScreenMsg>LOADING…</FullScreenMsg>;
    }
    if (auction === null) {
        return <FullScreenMsg>AUCTION NOT FOUND</FullScreenMsg>;
    }

    // === html ===

    return <>
    {header}
    <div id="page-auction" className="page-regular">

        <div className="page-content">

            <div className="page-section">

                <div className="section-title">{auction.name}</div>

                {auction.description.length > 0 &&
                <div className="section-description">
                    {auction.description}
                </div>}

                <div className="tabs-header">
                    <TabHeader tabName="items" selectedTab={tab} setTab={setTab} />
                    {auction.is_live && <TabHeader tabName="bid" selectedTab={tab} setTab={setTab} />}
                    <TabHeader tabName="details" selectedTab={tab} setTab={setTab} />
                    <TabHeader tabName="activity" selectedTab={tab} setTab={setTab} />
                </div>

                <div className="tabs-content">
                    {tab === "items" && <SectionItems auction={auction} />}
                    {tab === "bid" && auction.is_live && <SectionBid auction={auction} />}
                    {tab === "details" && <SectionDetails auction={auction} />}
                    {tab === "activity" && <SectionActivity auction={auction} />}
                </div>

            </div>

        </div>

    </div>
    </>;
};

const SectionItems: React.FC<{
    auction: AuctionObj;
}> = ({
    auction,
}) => {
    return (
        <div className="card">
            <div className="card-content">
                <CardAuctionItems auction={auction} />
            </div>
        </div>
    );
};

const SectionBid: React.FC<{
    auction: AuctionObj;
}> = ({
    auction,
}) =>
{
    const { auctionClient } = useOutletContext<AppContext>();

    const { coinMeta, ..._meta } = useCoinMeta(auctionClient.suiClient, auction.type_coin);

    const { userId, ..._user } = useFetchUserId();

    // === effects ===

    // === functions ===

    // === html ===

    const isLoading = coinMeta === undefined || userId === undefined;
    const isError = coinMeta === null || userId === null;

    let content;
    if (isError) {
        content = <div>Error</div>;
    } else if (isLoading) {
        content = <div>Loading...</div>;
    } else {
        content = <FormBid auction={auction} coinMeta={coinMeta} userId={userId} />;
    }

    return (
        <div className="card">
            <div className="card-content">
                {content}
            </div>
        </div>
    );
};

const FormBid: React.FC<{
    auction: AuctionObj;
    coinMeta: CoinMetadata;
    userId: string | null;
}> = ({
    auction,
    coinMeta,
    userId,
}) =>
{
    // === state ===

    const currAcct = useCurrentAccount();
    const { auctionClient } = useOutletContext<AppContext>();

    const form = {
        amount: useInputUnsignedBalance({
            label: `Amount (${coinMeta.symbol})`,
            decimals: coinMeta.decimals,
            min: auction.minimum_bid,
            html: { value: balanceToString(auction.minimum_bid, coinMeta.decimals), required: true },
        }),
    };

    const hasErrors = Object.values(form).some(input => input.err !== undefined);
    const disableSubmit = hasErrors || !currAcct;

    // === functions ===

    const onSubmit = async () =>
    {
        if (disableSubmit) {
            return;
        }
        try {
            const resp = await auctionClient.bid(
                currAcct.address,
                userId,
                auction.id,
                auction.type_coin,
                form.amount.val!,
            );
            console.debug("resp:", resp);
        } catch (err) {
            console.warn(err);
        }
    };

    // === html ===

    return (
        <div className="form">
            {Object.entries(form).map(([name, input]) => (
                <React.Fragment key={name}>
                    {input.input}
                </React.Fragment>
            ))}
            <button onClick={onSubmit} className="btn" disabled={disableSubmit}>
                BID
            </button>
        </div>
    );
};

const SectionDetails: React.FC<{ // TODO
    auction: AuctionObj;
}> = ({
    auction,
}) => {
    return (
        <div className="card">
            <div className="card-content">
                <div>type_coin: {auction.type_coin}</div>
                <div>id: {shortenAddress(auction.id)}</div>
                <div>name: {auction.name}</div>
                <div>description: {auction.description}</div>
                <div>item_addrs: {auction.item_addrs.map(addr => shortenAddress(addr)).join(", ")}</div>
                <div>item_bag: {auction.item_bag.id} ({auction.item_bag.size})</div>
                <div>admin_addr: {shortenAddress(auction.admin_addr)}</div>
                <div>pay_addr: {shortenAddress(auction.pay_addr)}</div>
                <div>lead_addr: {shortenAddress(auction.lead_addr)}</div>
                <div>lead_value: {auction.lead_value.toString()}</div>
                <div>begin_time_ms: {auction.begin_time_ms}</div>
                <div>end_time_ms: {auction.end_time_ms}</div>
                <div>minimum_bid: {auction.minimum_bid.toString()}</div>
                <div>minimum_increase_bps: {auction.minimum_increase_bps}</div>
                <div>extension_period_ms: {auction.extension_period_ms}</div>
                <div>is_live: {auction.is_live ? "yes" : "no"}</div>
            </div>
        </div>
    );
};

const SectionActivity: React.FC<{
    auction: AuctionObj;
}> = ({
    auction,
}) => {

    // === state ===

    const { auctionClient } = useOutletContext<AppContext>();

    const [ txs, setTxs ] = useState<Awaited<ReturnType<InstanceType<typeof AuctionClient>["fetchTxsByAuctionId"]>>>();

    // === effects ===

    useEffect(() => {
        fetchRecentBids();
    }, [auction]);

    // === functions ===

    const fetchRecentBids = async () => { // TODO: "load more" / "next page"
        try {
            const newTxs = await auctionClient.fetchTxsByAuctionId(auction.id, null);
            setTxs(newTxs);
        } catch (err) {
            console.warn("[fetchRecentBids]", err); // TODO show error to user
        }
    };

    // === html ===

    return (
        <div className="card">
            <div className="card-content">
                <div className="list-cards">
                    {txs?.data.map(tx =>
                        <CardTransaction tx={tx} key={tx.digest} />
                    )}
                </div>
            </div>
        </div>
    );
};

import { useCurrentAccount } from "@mysten/dapp-kit";
import { CoinMetadata } from "@mysten/sui/client";
import { AuctionClient, AuctionObj, TxAdminCreatesAuction, TxAnyoneBids } from "@polymedia/auction-sdk";
import { useCoinMeta } from "@polymedia/coinmeta-react";
import { balanceToString } from "@polymedia/suitcase-core";
import { LinkToPolymedia, ReactSetter } from "@polymedia/suitcase-react";
import React, { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { AppContext } from "./App";
import { Balance, bpsToPct, CardAuctionItems, FullCardMsg, msToDate, msToMinutes, ObjectLinkList, shortenDigest } from "./components/cards";
import { useInputUnsignedBalance } from "./components/inputs";
import { useFetchUserId } from "./hooks/useFetchUserId";
import { timeAgo } from "./lib/time";
import { PageFullScreenMsg, PageNotFound } from "./PageFullScreenMsg";

type TabName = "items" | "bid" | "details" | "history";

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
    const [ auction, setAuction ] = useState<AuctionObj | null | undefined>();
    const [ err, setErr ] = useState<string | null>(null);

    // === effects ===

    useEffect(() => {
        fetchAuction();
    }, [auctionId]);

    // === functions ===

    const fetchAuction = async () => {
        setAuction(undefined);
        setErr(null);
        try {
            const auction = await auctionClient.fetchAuction(auctionId);
            setAuction(auction);
        } catch (err) {
            setErr("Failed to fetch auction");
            console.warn("[fetchAuction]", err);
        }
    };

    // === html ===

    if (err) {
        return <PageFullScreenMsg>{err.toUpperCase()}</PageFullScreenMsg>;
    }
    if (auction === null) {
        return <PageFullScreenMsg>AUCTION NOT FOUND</PageFullScreenMsg>;
    }
    if (auction === undefined) {
        return <PageFullScreenMsg>LOADING…</PageFullScreenMsg>;
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
                    <TabHeader tabName="history" selectedTab={tab} setTab={setTab} />
                </div>

                <div className="tabs-content">
                    {tab === "items" && <SectionItems auction={auction} />}
                    {tab === "bid" && auction.is_live && <SectionBid auction={auction} />}
                    {tab === "details" && <SectionDetails auction={auction} />}
                    {tab === "history" && <SectionHistory auction={auction} />}
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
            <CardAuctionItems item_addrs={auction.item_addrs} />
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

    const { coinMeta, errorCoinMeta } = useCoinMeta(auctionClient.suiClient, auction.type_coin);

    const { userId, errorFetchUserId } = useFetchUserId();

    // === effects ===

    // === functions ===

    // === html ===

    const isLoading = coinMeta === undefined || userId === undefined;

    let content: React.ReactNode;
    if (errorCoinMeta || coinMeta === null) {
        content = <FullCardMsg>Failed to fetch coin metadata</FullCardMsg>;
    } else if (errorFetchUserId) { // userId may be null for new users
        content = <FullCardMsg>{errorFetchUserId}</FullCardMsg>;
    } else if (isLoading) {
        content = <FullCardMsg>Loading…</FullCardMsg>;
    } else {
        content = <FormBid auction={auction} coinMeta={coinMeta} userId={userId} />;
    }

    return (
        <div className="card">
            {content}
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
    const [ errSubmit, setErrSubmit ] = useState<string | null>(null);

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

    // === effects ===

    // === functions ===

    const onSubmit = async () =>
    {
        if (disableSubmit) {
            return;
        }
        setErrSubmit(null);
        try {
            for (const dryRun of [true, false])
            {
                const txRes = await auctionClient.bid(
                    currAcct.address,
                    userId,
                    auction.id,
                    auction.type_coin,
                    form.amount.val!,
                    dryRun,
                );
                if (txRes.effects?.status.status !== "success")
                {
                    console.debug("txRes:", txRes.effects?.status.error);
                    const errCode = auctionClient.parseErrorCode(txRes);
                    const errStr = (() => {
                        switch (errCode) { // TODO: refetch auction
                            case "E_WRONG_TIME": return "The auction is not live yet!";
                            case "E_WRONG_COIN_VALUE": return "Someone placed a higher bid!";
                            default: return errCode;
                        }
                    })();
                    setErrSubmit(errStr);
                    break;
                }
            }
        } catch (err) {
            setErrSubmit("Failed to submit bid");
            console.warn("[onSubmit]", err);
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

            {errSubmit &&
            <div className="error">{errSubmit}</div>}
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
            <CardAuctionDetails auction={auction} />
        </div>
    );
};

const SectionHistory: React.FC<{
    auction: AuctionObj;
}> = ({
    auction,
}) => {

    // === state ===

    const { auctionClient } = useOutletContext<AppContext>();

    const [ txs, setTxs ] = useState<Awaited<ReturnType<InstanceType<typeof AuctionClient>["fetchTxsByAuctionId"]>> | undefined>();
    const [ errFetch, setErrFetch ] = useState<string | null>(null);

    // === effects ===

    useEffect(() => {
        fetchRecentBids();
    }, [auction]);

    // === functions ===

    const fetchRecentBids = async () => { // TODO: "load more" / "next page"
        setTxs(undefined);
        setErrFetch(null);
        try {
            const newTxs = await auctionClient.fetchTxsByAuctionId(auction.id, null);
            setTxs(newTxs);
        } catch (err) {
            setErrFetch("Failed to fetch recent bids");
            console.warn("[fetchRecentBids]", err);
        }
    };

    // === html ===

    let content: React.ReactNode;
    if (errFetch) {
        content = <FullCardMsg>{errFetch}</FullCardMsg>;
    } else if (txs === undefined) {
        content = <FullCardMsg>Loading…</FullCardMsg>;
    } else {
        content = (
            <div className="list-cards">
                {txs?.data.map(tx =>
                    <CardTransaction tx={tx} key={tx.digest} />
                )}
            </div>
        );
    }

    return (
        <div className="card">
            {content}
        </div>
    );
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
        <div>Items: <ObjectLinkList ids={auction.item_addrs} /></div>
        {/* <div>Item bag: <LinkToPolymedia addr={auction.item_bag.id} kind="object" network={network} /> ({auction.item_bag.size} items)</div> */}
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

const CardTransaction: React.FC<{
    tx: TxAdminCreatesAuction | TxAnyoneBids;
}> = ({
    tx,
}) =>
{
    if (tx.kind === "admin_creates_auction") {
        return <CardTxAdminCreatesAuction tx={tx} />;
    }
    if (tx.kind === "anyone_bids") {
        return <CardTxAnyoneBids tx={tx} />;
    }
    return <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
        {JSON.stringify(tx, null, 2)}
    </div>;
};

const CardTxAdminCreatesAuction: React.FC<{
    tx: TxAdminCreatesAuction;
}> = ({
    tx,
}) =>
{
    const { network } = useOutletContext<AppContext>();
    return (
        <div className="card">
            <div className="card-auction-title">
                <div className="title-name">CREATED</div>
                <span className="title-date">{timeAgo(tx.timestamp)}</span>
            </div>
            <div>sender: <LinkToPolymedia addr={tx.sender} kind="address" network={network} /></div>
            <div>digest: <LinkToPolymedia addr={tx.digest} kind="txblock" network={network}>{shortenDigest(tx.digest)}</LinkToPolymedia></div>
        </div>
    );
};

const CardTxAnyoneBids: React.FC<{
    tx: TxAnyoneBids;
}> = ({
    tx,
}) => {
    const { network } = useOutletContext<AppContext>();
    return (
        <div className="card">
            <div className="card-auction-title">
                <div className="title-name">
                    BID&nbsp;
                    {<Balance balance={tx.inputs.amount} coinType={tx.inputs.type_coin} />}
                </div>
                <span className="title-date">{timeAgo(tx.timestamp)}</span>
            </div>
            <div>sender: <LinkToPolymedia addr={tx.sender} kind="address" network={network} /></div>
            <div>digest: <LinkToPolymedia addr={tx.digest} kind="txblock" network={network}>{shortenDigest(tx.digest)}</LinkToPolymedia></div>
        </div>
    );
};

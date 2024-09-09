import { useCurrentAccount } from "@mysten/dapp-kit";
import { CoinMetadata } from "@mysten/sui/client";
import { AuctionClient, AuctionObj, TxAdminCreatesAuction, TxAnyoneBids } from "@polymedia/auction-sdk";
import { useCoinMeta } from "@polymedia/coinmeta-react";
import { balanceToString } from "@polymedia/suitcase-core";
import { LinkToPolymedia, ReactSetter } from "@polymedia/suitcase-react";
import React, { useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { AppContext } from "./App";
import { Btn } from "./components/Btn";
import { Balance, bpsToPct, CardAuctionItems, CardWithMsg, FullCardMsg, msToDate, msToMinutes, ObjectLinkList, shortenDigest } from "./components/cards";
import { BtnConnect } from "./components/ConnectToGetStarted";
import { IconCart, IconDetails, IconGears, IconHistory, IconItems } from "./components/icons";
import { useInputUnsignedBalance } from "./components/inputs";
import { useFetchUserId } from "./hooks/useFetchUserId";
import { timeAgo } from "./lib/time";
import { SubmitRes } from "./lib/types";
import { PageFullScreenMsg, PageNotFound } from "./PageFullScreenMsg";

type TabName = "items" | "bid" | "details" | "history" | "admin";

const TabHeader: React.FC<{
    tabName: TabName;
    selectedTab: TabName;
    setTab: ReactSetter<TabName>;
    icon: React.ReactNode;
}> = ({
    tabName,
    selectedTab,
    setTab,
    icon,
}) => {
    const isSelected = tabName === selectedTab;
    return (
        <div
            className={`tab-title ${isSelected ? "selected" : ""}`}
            onClick={() => setTab(tabName)}
        >
            {icon}
        </div>
    );
};

export const PageAuction: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();

    const { auctionId } = useParams();
    if (!auctionId) { return <PageNotFound />; };

    const { auctionClient, header } = useOutletContext<AppContext>();

    const [ tab, setTab ] = useState<TabName>("items");
    const [ auction, setAuction ] = useState<AuctionObj | null | undefined>();
    const [ err, setErr ] = useState<string | null>(null);

    const isAdmin = currAcct?.address === auction?.admin_addr;

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
                    <TabHeader tabName="items" selectedTab={tab} setTab={setTab} icon={<IconItems />} />
                    {auction.is_live && <TabHeader tabName="bid" selectedTab={tab} setTab={setTab} icon={<IconCart />} />}
                    <TabHeader tabName="details" selectedTab={tab} setTab={setTab} icon={<IconDetails />} />
                    <TabHeader tabName="history" selectedTab={tab} setTab={setTab} icon={<IconHistory />} />
                    {isAdmin && <TabHeader tabName="admin" selectedTab={tab} setTab={setTab} icon={<IconGears />} />}
                </div>

                <div className="tabs-content">
                    {tab === "items" && <SectionItems auction={auction} />}
                    {tab === "bid" && auction.is_live && <SectionBid auction={auction} />}
                    {tab === "details" && <SectionDetails auction={auction} />}
                    {tab === "history" && <SectionHistory auction={auction} />}
                    {tab === "admin" && <SectionAdmin auction={auction} />}
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
    const currAcct = useCurrentAccount();

    const { auctionClient, network } = useOutletContext<AppContext>();

    const { coinMeta, errorCoinMeta } = useCoinMeta(auctionClient.suiClient, auction.type_coin);

    const { userId, errorFetchUserId } = useFetchUserId();

    // === effects ===

    // === functions ===

    // === html ===

    const isLoading = coinMeta === undefined || userId === undefined;

    let content: React.ReactNode;
    if (errorCoinMeta || coinMeta === null) {
        content = <CardWithMsg>Failed to fetch coin metadata</CardWithMsg>;
    } else if (errorFetchUserId) { // userId may be null for new users
        content = <CardWithMsg>{errorFetchUserId}</CardWithMsg>;
    } else if (isLoading) {
        content = <CardWithMsg>Loading…</CardWithMsg>;
    } else {
        content = <>
            <div className="card">
                <FormBid auction={auction} coinMeta={coinMeta} userId={userId} />
            </div>
            {auction.has_balance &&
            <div className="card">
                    <div className="card-title">Top bid</div>
                    <div>Amount: <Balance balance={auction.lead_value} coinType={auction.type_coin} /></div>
                    <div>
                        Sender: <LinkToPolymedia addr={auction.lead_addr} kind="address" network={network} />
                        {currAcct?.address === auction.lead_addr && <span className="text-green"> (you)</span>}
                    </div>
            </div>}
        </>;
    }

    return content;
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
    const { auctionClient, isWorking, setIsWorking } = useOutletContext<AppContext>();
    const [ submitRes, setSubmitRes ] = useState<SubmitRes>({ ok: null });

    const input_amount = useInputUnsignedBalance({
        label: `Amount (${coinMeta.symbol})`,
        decimals: coinMeta.decimals,
        min: auction.minimum_bid,
        html: { value: balanceToString(auction.minimum_bid, coinMeta.decimals), required: true, disabled: !currAcct },
    });

    const hasInputError = input_amount.err !== undefined;
    const disableSubmit = hasInputError || isWorking || !currAcct;
    const showBtnConnect = !currAcct;

    // === effects ===

    // === functions ===

    const errToString = (err: unknown): string | null =>
    {
        if (!err) { return "Failed to submit bid"; }

        const str = err instanceof Error ? err.message : String(err);
        if (str.includes("Rejected from user")) { return null; }
        if (str.includes("InsufficientCoinBalance")) { return `You don't have enough ${coinMeta.symbol}!`; }

        const code = auctionClient.parseErrorCode(str);
        if (code === "E_WRONG_TIME") { return "The auction is not live yet!"; }
        if (code === "E_WRONG_COIN_VALUE") { return "Someone placed a higher bid!"; }
        return code;
    };

    const onSubmit = async () =>
    {
        if (disableSubmit) {
            return;
        }
        try {
            setIsWorking(true);
            setSubmitRes({ ok: null });
            for (const dryRun of [true, false])
            {
                const resp = await auctionClient.bid(
                    currAcct.address,
                    userId,
                    auction.id,
                    auction.type_coin,
                    input_amount.val!,
                    dryRun,
                );
                if (resp.effects?.status.status !== "success") {
                    throw new Error(resp.effects?.status.error);
                }
                if (!dryRun) {
                    setSubmitRes({ ok: true });
                }
            }
        } catch (err) {
            setSubmitRes({ ok: false, err: errToString(err) });
            console.warn("[onSubmit]", err);
        } finally {
            setIsWorking(false);
        }
    };

    // === html ===

    return (
        <div className="form">

            {input_amount.input}

            {showBtnConnect
            ? <BtnConnect />
            : <Btn disabled={disableSubmit} onClick={onSubmit}>BID</Btn>}

            {submitRes.ok === true &&
            <div className="success">Bid submitted!</div>}

            {submitRes.ok === false && submitRes.err &&
            <div className="error">{submitRes.err}</div>}
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

const SectionAdmin: React.FC<{
    auction: AuctionObj;
}> = ({
    auction,
}) =>
{
    // === state ===

    const { isWorking } = useOutletContext<AppContext>();

    // === functions ===

    const submitCancelAuction = async () => { console.log("TODO"); };

    const submitSetPayAddr = async () => { console.log("TODO"); };

    // === html ===

    return <>
        {!auction.has_ended &&
        <div className="card">
            <div className="card-title">Cancel auction</div>
            <div>You can cancel the auction and reclaim the items. Leader will be refunded.</div>
            <div>TODO: admin_cancels_auction + admin_reclaims_item</div>
            <div>
                <Btn onClick={submitCancelAuction}>CANCEL AUCTION</Btn>
            </div>
        </div>}

        {( !auction.has_ended || auction.has_balance ) &&
        <div className="card">
            <div className="card-title">Set pay address</div>
            <div>You can change the payment address for the auction.</div>
            <div>TODO: admin_sets_pay_addr</div>
            <div>
                <Btn onClick={submitSetPayAddr}>SET ADDRESS</Btn>
            </div>
        </div>}

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
        <div>Has leader: {auction.has_leader ? "yes" : "no"}</div>
        <div>Has balance: {auction.has_balance ? "yes" : "no"}</div>
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
            <div className="card-header">
                <div className="card-title">CREATED</div>
                <span className="header-label">{timeAgo(tx.timestamp)}</span>
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
            <div className="card-header">
                <div className="card-title">
                    BID&nbsp;
                    {<Balance balance={tx.inputs.amount} coinType={tx.inputs.type_coin} />}
                </div>
                <span className="header-label">{timeAgo(tx.timestamp)}</span>
            </div>
            <div>sender: <LinkToPolymedia addr={tx.sender} kind="address" network={network} /></div>
            <div>digest: <LinkToPolymedia addr={tx.digest} kind="txblock" network={network}>{shortenDigest(tx.digest)}</LinkToPolymedia></div>
        </div>
    );
};

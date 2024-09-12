import { useCurrentAccount } from "@mysten/dapp-kit";
import { CoinMetadata } from "@mysten/sui/client";
import { AuctionClient, AuctionObj, newItemPlaceholder, SuiItem, TxAdminCreatesAuction, TxAnyoneBids } from "@polymedia/auction-sdk";
import { useCoinMeta } from "@polymedia/coinmeta-react";
import { balanceToString } from "@polymedia/suitcase-core";
import { LinkToPolymedia, ReactSetter } from "@polymedia/suitcase-react";
import React, { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { AppContext } from "./App";
import { Btn } from "./components/Btn";
import { Balance, CardAuctionItems, CardWithMsg, FullCardMsg, ObjectLinkList } from "./components/cards";
import { BtnConnect } from "./components/ConnectToGetStarted";
import { IconCart, IconDetails, IconGears, IconHistory, IconItems } from "./components/icons";
import { useInputUnsignedBalance } from "./components/inputs";
import { useFetchUserId } from "./hooks/useFetchUserId";
import { timeAgo } from "./lib/time";
import { SubmitRes } from "./lib/types";
import { PageFullScreenMsg, PageNotFound } from "./PageFullScreenMsg";
import { bpsToPct, msToDate, msToMinutes, shortenDigest } from "./lib/format";

const TAB_NAMES = ["items", "bid", "details", "history", "admin"] as const;
type TabName = (typeof TAB_NAMES)[number];
const isTabName = (str: string): str is TabName => TAB_NAMES.includes(str as TabName);

export const PageAuction: React.FC = () =>
{
    // === url validation ===

    const { auctionId, tabName = "items" } = useParams();
    if (!auctionId) { return <PageNotFound />; };
    if (!isTabName(tabName)) { return <PageNotFound />; }

    // === state ===

    const currAcct = useCurrentAccount();
    const { auctionClient, header } = useOutletContext<AppContext>();

    const [ auction, setAuction ] = useState<AuctionObj | null | undefined>();
    const [ items, setItems ] = useState<SuiItem[] | null | undefined>();
    const [ err, setErr ] = useState<string | null>(null);

    // === state: tabs ===

    const [ activeTab, setActiveTab ] = useState<TabName>(tabName);
    const changeTab = (tab: TabName) => {
        setActiveTab(tab);
        window.history.replaceState({}, "", `/auction/${auctionId}/${tab}`);
    };
    const showBidTab = auction?.is_live;
    const isAdmin = currAcct?.address === auction?.admin_addr;
    const showAdminTab = isAdmin && auction && (
        auction.can_admin_cancel_auction || auction.can_admin_reclaim_items || auction.can_admin_set_pay_addr
    );

    // === effects ===

    useEffect(() => {
        if (!auction) { return; }
        if ((activeTab === "bid" && !showBidTab) || (activeTab === "admin" && !showAdminTab)) {
            changeTab("items");
        }
    }, [auction]);

    useEffect(() => {
        fetchAuction(true);
    }, [auctionId, auctionClient]);

    // === functions ===

    const fetchAuction = async (fetchItems: boolean) =>
    {
        try {
            const newAuction = await auctionClient.fetchAuction(auctionId, false);
            if (newAuction === null) {
                throw new Error("Auction not found");
            }
            setAuction(newAuction);
            if (fetchItems) {
                const newItems = await auctionClient.fetchItems(newAuction.item_addrs);
                setItems(newItems);
            }
        } catch (err) {
            setErr(err instanceof Error ? err.message : "Failed to fetch auction");
            setAuction(null);
            setItems(null);
            console.warn("[fetchAuctionAndItems]", err);
        }
    };

    // === html ===

    if (err) {
        return <PageFullScreenMsg>{err.toUpperCase()}</PageFullScreenMsg>;
    }
    if (auction === null || items === null) {
        return <PageFullScreenMsg>{err}</PageFullScreenMsg>;
    }
    if (auction === undefined || items === undefined) {
        return <PageFullScreenMsg>LOADING…</PageFullScreenMsg>;
    }

    // === html ===

    const TabHeader: React.FC<{
        tab: TabName;
        icon: React.ReactNode;
    }> = ({
        tab,
        icon,
    }) => {
        if (!auction) { return null; }
        const isSelected = tab === activeTab;
        return (
            <div
                className={`tab-title ${isSelected ? "selected" : ""}`}
                onClick={() => changeTab(tab)}
            >
                {icon}
            </div>
        );
    };

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

                <CardFinalize auction={auction} items={items} />

                <div className="tabs-header">
                    <TabHeader tab="items" icon={<IconItems />} />
                    {showBidTab && <TabHeader tab="bid" icon={<IconCart />} />}
                    <TabHeader tab="details" icon={<IconDetails />} />
                    <TabHeader tab="history" icon={<IconHistory />} />
                    {showAdminTab && <TabHeader tab="admin" icon={<IconGears />} />}
                </div>

                <div className="tabs-content">
                    {activeTab === "items" && <SectionItems auction={auction} items={items} />}
                    {activeTab === "bid" && auction.is_live && <SectionBid auction={auction} fetchAuction={fetchAuction} />}
                    {activeTab === "details" && <SectionDetails auction={auction} />}
                    {activeTab === "history" && <SectionHistory auction={auction} />}
                    {activeTab === "admin" && <SectionAdmin auction={auction} />}
                </div>

            </div>

        </div>

    </div>
    </>;
};

const CardFinalize: React.FC<{
    auction: AuctionObj;
    items: SuiItem[];
}> = ({
    auction,
    items,
}) => {

    // === state ===

    const { auctionClient, network, isWorking, setIsWorking } = useOutletContext<AppContext>();

    const [ submitRes, setSubmitRes ] = useState<SubmitRes>({ ok: null });

    const isClaimable = auction.can_anyone_pay_funds || auction.can_anyone_send_items_to_winner;

    const errToString = (err: unknown): string | null =>
    {
        if (!err) { return "Failed to finalize auction"; }

        const str = err instanceof Error ? err.message : String(err);
        if (str.includes("Rejected from user")) { return null; }

        const code = auctionClient.parseErrorCode(str);
        if (code === "E_WRONG_TIME") { return "The auction has not ended yet!"; }
        if (code === "E_WRONG_ADDRESS") { return "The auction has no leader!"; }
        return code;
    };

    const finalizeAuction = async () =>
    {
        try {
            setIsWorking(true);
            setSubmitRes({ ok: null });
            const itemsAndTypes = items.map(item => ({ addr: item.id, type: item.type }));
            for (const dryRun of [true, false])
            {
                const resp = await auctionClient.payFundsAndSendItemsToWinner(
                    auction.id, auction.type_coin, itemsAndTypes, dryRun,
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
            console.warn("[finalizeAuction]", err);
        } finally {
            setIsWorking(false);
        }
    };

    // === html ===

    if (!isClaimable) { return null; }

    return <div className="card">
        <div className="card-title">Auction ended!</div>

        <div>Click the button to send the items to the winner and transfer the funds to the seller.</div>

        <div>
            <Btn onClick={finalizeAuction}>FINALIZE</Btn> {/* TODO: connect wallet if disconnected */}
        </div>

        {submitRes.ok === true &&
        <div className="success">Auction finalized!</div>}

        {submitRes.ok === false && submitRes.err &&
        <div className="error">{submitRes.err}</div>}
    </div>;
};

const SectionItems: React.FC<{
    auction: AuctionObj;
    items: SuiItem[];
}> = ({
    auction,
    items,
}) => {
    return (
        <div className="card">
            <CardAuctionItems items={items} hiddenItemCount={0} />
        </div>
    );
};

const SectionBid: React.FC<{
    auction: AuctionObj;
    fetchAuction: (fetchItems: boolean) => Promise<void>;
}> = ({
    auction,
    fetchAuction,
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
                <FormBid auction={auction} coinMeta={coinMeta} userId={userId} fetchAuction={fetchAuction} />
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
    fetchAuction: (fetchItems: boolean) => Promise<void>;
}> = ({
    auction,
    coinMeta,
    userId,
    fetchAuction,
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
        // onChangeVal: (newVal: bigint | undefined) => {
        //     setSubmitRes({ ok: null });
        // },
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
        if (code === "E_WRONG_TIME") { return "The auction is not live!"; }
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
                    fetchAuction(false); // refresh min_bid, lead_value, etc
                    input_amount.clear();
                }
            }
        } catch (err) {
            setSubmitRes({ ok: false, err: errToString(err) });
            console.warn("[onSubmit]", err);
            fetchAuction(false); // maybe someone else bid higher, or the auction ended, etc
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

    const submitReclaimItems = async () => { console.log("TODO"); };

    const submitSetPayAddr = async () => { console.log("TODO"); };

    // === html ===

    return <>
        {auction.can_admin_cancel_auction &&
        <div className="card">
            <div className="card-title">Cancel auction</div>
            <div>You can cancel the auction and reclaim the items. Leader will be refunded.</div>
            <div>TODO: admin_cancels_auction + admin_reclaims_item</div>
            <div>
                <Btn onClick={submitCancelAuction}>CANCEL AUCTION</Btn>
            </div>
        </div>}

        {auction.can_admin_reclaim_items &&
        <div className="card">
            <div className="card-title">Reclaim items</div>
            <div>You can reclaim the items because there were no bids.</div>
            <div>TODO: admin_reclaims_items</div>
            <div>
                <Btn onClick={submitReclaimItems}>RECLAIM ITEMS</Btn>
            </div>
        </div>}

        {auction.can_admin_set_pay_addr &&
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

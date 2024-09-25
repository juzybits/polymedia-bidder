import { useCurrentAccount } from "@mysten/dapp-kit";
import { CoinMetadata } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { AUCTION_IDS, AuctionModule, AuctionObj, SuiItem, TxAdminCreatesAuction, TxAnyoneBids } from "@polymedia/bidder-sdk";
import { useCoinMeta } from "@polymedia/coinmeta-react";
import { formatBalance, formatBps, formatDate, formatDuration, formatTimeDiff, shortenAddress, shortenDigest } from "@polymedia/suitcase-core";
import { LinkToExplorer, useInputAddress, useInputUnsignedBalance } from "@polymedia/suitcase-react";
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { Btn } from "./components/Btn";
import { Balance, CardAuctionItems, CardWithMsg, HeaderLabel, TopBid } from "./components/cards";
import { BtnConnect } from "./components/ConnectToGetStarted";
import { IconCart, IconDetails, IconGears, IconHistory, IconInfo, IconItems } from "./components/icons";
import { makeTabs, TabsHeader } from "./components/tabs";
import { useFetchUserId } from "./hooks/useFetchUserId";
import { SubmitRes } from "./lib/types";
import { useFetch } from "./lib/useFetch";
import { PageFullScreenMsg, PageNotFound } from "./PageFullScreenMsg";

const tabs = makeTabs([
    { name: "items", icon: <IconItems />, tooltip: "Items" },
    { name: "bid", icon: <IconCart />, tooltip: "Bid" },
    { name: "details", icon: <IconDetails />, tooltip: "Details" },
    { name: "activity", icon: <IconHistory />, tooltip: "Activity" },
    { name: "admin", icon: <IconGears />, tooltip: "Admin" },
]);

export const PageAuction: React.FC = () =>
{
    // === url validation ===

    const { auctionId, tabName } = useParams();
    if (!auctionId) { return <PageNotFound />; }
    if (!tabs.isTabName(tabName)) { return <PageNotFound />; }

    // === state ===

    const currAcct = useCurrentAccount();
    const { bidderClient, header } = useAppContext();

    const [ auction, setAuction ] = useState<AuctionObj | null | undefined>();
    const [ items, setItems ] = useState<SuiItem[] | null | undefined>();
    const [ err, setErr ] = useState<string | null>(null);

    // === state: tabs ===

    const [ activeTab, setActiveTab ] = useState<string>(tabName);
    const changeTab = (tab: string) => {
        if (tabs.isTabName(tab)) {
            setActiveTab(tab);
            window.history.replaceState({}, "", `/auction/${auctionId}/${tab}`);
        }
    };
    const showBidTab = auction?.is_live;
    const isAdmin = currAcct?.address === auction?.admin_addr;
    const showAdminTab = isAdmin && auction && (
        auction.can_admin_cancel_auction || auction.can_admin_reclaim_items || auction.can_admin_set_pay_addr
    );
    const visibleTabs = tabs.all.filter(tab => {
        if (tab.name === "bid" && !showBidTab) { return false; }
        if (tab.name === "admin" && !showAdminTab) { return false; }
        return true;
    });

    // === effects ===

    useEffect(() => {
        if (!auction) { return; }
        if ((activeTab === "bid" && !showBidTab) || (activeTab === "admin" && !showAdminTab)) {
            changeTab("items");
        }
    }, [auction]);

    useEffect(() => {
        fetchAuction(true);
    }, [auctionId, bidderClient]);

    // === functions ===

    const fetchAuction = async (fetchItems: boolean) =>
    {
        try {
            const newAuction = await bidderClient.fetchAuction(auctionId, false);
            if (newAuction === null) {
                throw new Error("Auction not found");
            }
            setAuction(newAuction);
            if (fetchItems) {
                const newItems = await bidderClient.fetchItems(newAuction.item_addrs);
                setItems(newItems);
            }
        } catch (err) {
            setErr(err instanceof Error ? err.message : "Failed to fetch auction");
            setAuction(null);
            setItems(null);
            console.warn("[fetchAuction]", err);
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

    return <>
    {header}
    <div id="page-auction" className="page-regular">

        <div className="page-content">

            <div className="page-section">

                <div className="section-header column-on-small">
                    <div className="section-title">{auction.name}</div>
                    <div className="auction-header-info">
                        <TopBid auction={auction} />
                        <HeaderLabel auction={auction} />
                    </div>
                </div>

                {auction.description.length > 0 &&
                <div className="section-description">
                    {auction.description}
                </div>}

                <CardFinalize auction={auction} items={items} fetchAuction={fetchAuction} />

                <div className="tabs-container">
                    <TabsHeader tabs={visibleTabs} activeTab={activeTab} onChangeTab={changeTab} />
                    <div className="tabs-content">
                        {activeTab === "items" && <SectionItems items={items} />}
                        {activeTab === "bid" && auction.is_live && <SectionBid auction={auction} fetchAuction={fetchAuction} />}
                        {activeTab === "details" && <SectionDetails auction={auction} />}
                        {activeTab === "activity" && <SectionHistory auction={auction} />}
                        {activeTab === "admin" && <SectionAdmin auction={auction} items={items} fetchAuction={fetchAuction} />}
                    </div>
                </div>

            </div>

        </div>

    </div>
    </>;
};

const CardFinalize: React.FC<{
    auction: AuctionObj;
    items: SuiItem[];
    fetchAuction: (fetchItems: boolean) => Promise<void>;
}> = ({
    auction,
    items,
    fetchAuction,
}) => {

    // === state ===

    const currAcct = useCurrentAccount();

    const { bidderClient, setIsWorking } = useAppContext();

    const [ submitRes, setSubmitRes ] = useState<SubmitRes>({ ok: null });

    const isClaimable = auction.can_anyone_pay_funds || auction.can_anyone_send_items_to_winner;

    const finalizeAuction = async () =>
    {
        try {
            setIsWorking(true);
            setSubmitRes({ ok: null });
            const itemsAndTypes = items.map(item => ({ addr: item.id, type: item.type }));
            for (const dryRun of [true, false])
            {
                const tx = new Transaction();
                const resp = await bidderClient.payFundsAndSendItemsToWinner(
                    tx, auction.id, auction.type_coin, itemsAndTypes, dryRun,
                );
                if (resp.effects?.status.status !== "success") {
                    throw new Error(resp.effects?.status.error);
                }
                if (!dryRun) {
                    setSubmitRes({ ok: true });
                }
            }
        } catch (err) {
            const errMsg = bidderClient.errCodeToStr(err, "Failed to finalize auction", {
                "E_WRONG_TIME": "The auction has not ended yet",
                "E_WRONG_ADDRESS": "The auction has no leader",
            });
            setSubmitRes({ ok: false, err: errMsg });
            console.warn("[finalizeAuction]", err);
        } finally {
            setIsWorking(false);
            fetchAuction(false);
        }
    };

    // === html ===

    if (!isClaimable) { return null; }

    return <div className="card">
        <div className="card-title">Auction ended!</div>

        <div>Click the button to send the items to the winner and transfer the funds to the seller.</div>

        <div>
            {!currAcct
            ? <BtnConnect />
            : <Btn onClick={finalizeAuction}>FINALIZE</Btn>}
        </div>

        {submitRes.ok === true &&
        <div className="success">Auction finalized!</div>}

        {submitRes.ok === false && submitRes.err &&
        <div className="error">{submitRes.err}</div>}
    </div>;
};

const SectionItems: React.FC<{
    items: SuiItem[];
}> = ({
    items,
}) => {
    return (
        <div className="card">
            <div className="card-title">Items ({items.length})</div>
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

    const { bidderClient, setModalContent } = useAppContext();

    const { coinMeta, errorCoinMeta } = useCoinMeta(bidderClient.suiClient, auction.type_coin);

    const { userId, updateUserId, errorFetchUserId } = useFetchUserId(currAcct?.address);

    // === effects ===

    // === functions ===

    const showInfoModal = () => {
        setModalContent(<>
            <div className="card-title"><IconInfo />How bids work</div>
            <div>When you place a bid, you become the auction leader.</div>
            <div>If nobody bids higher, you win the auction and can claim the items.</div>
            <div>If someone bids higher, your bid is automatically returned to your address.</div>
        </>);
    };

    // === html ===

    const isLoading = coinMeta === undefined || userId === undefined;

    let content: React.ReactNode;
    if (errorCoinMeta || coinMeta === null) {
        content = <CardWithMsg className="compact">Failed to fetch coin metadata</CardWithMsg>;
    } else if (errorFetchUserId) { // userId may be null for new users
        content = <CardWithMsg className="compact">{errorFetchUserId}</CardWithMsg>;
    } else if (isLoading) {
        content = <CardWithMsg className="compact">Loading…</CardWithMsg>;
    } else {
        content = <>
            <div className="card compact">
                <div className="card-header">
                    <div className="card-title">Place a bid</div>
                    <IconInfo onClick={showInfoModal} />
                </div>
                <FormBid auction={auction} coinMeta={coinMeta} userId={userId} updateUserId={updateUserId} fetchAuction={fetchAuction} />
            </div>
            {auction.has_balance &&
            <div className="card compact">
                    <div className="card-title">Top bid</div>
                    <div>Amount: <Balance balance={auction.lead_value} coinType={auction.type_coin} /></div>
                    <div>
                        <div>
                            Sender: <LinkToUser addr={auction.lead_addr} kind="bids" />
                            {currAcct?.address === auction.lead_addr && <span className="text-green"> (you)</span>}
                        </div>
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
    updateUserId: (newUserId: string) => void;
    fetchAuction: (fetchItems: boolean) => Promise<void>;
}> = ({
    auction,
    coinMeta,
    userId,
    updateUserId,
    fetchAuction,
}) =>
{
    // === state ===

    const currAcct = useCurrentAccount();
    const { bidderClient, isWorking, setIsWorking } = useAppContext();
    const [ submitRes, setSubmitRes ] = useState<SubmitRes>({ ok: null });

    const msgMinimum = `Minimum bid is ${formatBalance(auction.minimum_bid, coinMeta.decimals)} ${coinMeta.symbol}`;
    const input_amount = useInputUnsignedBalance({
        label: `Amount (${coinMeta.symbol})`,
        decimals: coinMeta.decimals,
        min: auction.minimum_bid,
        msgRequired: msgMinimum,
        msgTooSmall: msgMinimum,
        html: { required: true, disabled: !currAcct },
    });

    const hasInputError = input_amount.err !== undefined;
    const disableSubmit = hasInputError || isWorking || !currAcct;

    // === effects ===

    // === functions ===

    const placeBid = async () =>
    {
        if (disableSubmit) {
            return;
        }
        try {
            setIsWorking(true);
            setSubmitRes({ ok: null });
            for (const dryRun of [true, false])
            {
                const { resp, userObjChange } = await bidderClient.placeBid(
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
                    !userId && userObjChange && updateUserId(userObjChange.objectId);
                    setSubmitRes({ ok: true });
                    input_amount.clear();
                }
            }
        } catch (err) {
            const errMsg = bidderClient.errCodeToStr(err, "Failed to submit bid", {
                "E_WRONG_TIME": "The auction is not live",
                "E_WRONG_COIN_VALUE": "Someone placed a higher bid",
            });
            setSubmitRes({ ok: false, err: errMsg });
            console.warn("[placeBid]", err);
        } finally {
            setIsWorking(false);
            fetchAuction(false);
        }
    };

    // === html ===

    return (
        <div className="form">

            {input_amount.input}

            <div className="btn-submit">
                {!currAcct
                ? <BtnConnect />
                : <Btn disabled={disableSubmit} onClick={placeBid}>BID</Btn>}

                {submitRes.ok === true &&
                <div className="success">Bid submitted!</div>}

                {submitRes.ok === false && submitRes.err &&
                <div className="error">{submitRes.err}</div>}
            </div>
        </div>
    );
};

const SectionDetails: React.FC<{
    auction: AuctionObj;
}> = ({
    auction,
}) => {
    return (
        <div className="card compact">
            <div className="card-title">Details</div>
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

    const { bidderClient } = useAppContext();

    const { data: txs, error: errFetch } = useFetch(() => {
        return bidderClient.fetchTxsByAuctionId(auction.id, null);
    }, [auction]);

    // === html ===

    if (errFetch) {
        return <CardWithMsg className="compact">{errFetch}</CardWithMsg>;
    } else if (txs === undefined) {
        return <CardWithMsg className="compact">Loading…</CardWithMsg>;
    }
    return (
        <div className="card compact">
            <div className="card-title">Activity</div>
            <div className="card-list tx-list">
                {txs?.data.map(tx =>
                <CardTransaction tx={tx} key={tx.digest} />
                )}
            </div>
        </div>
    );
};

const SectionAdmin: React.FC<{
    auction: AuctionObj;
    items: SuiItem[];
    fetchAuction: (fetchItems: boolean) => Promise<void>;
}> = ({
    auction,
    items,
    fetchAuction,
}) =>
{
    // === state ===

    const { bidderClient, network, setIsWorking } = useAppContext();

    // === "accept bid": admin_accepts_bid + anyone_pays_funds + anyone_sends_item_to_winner ===

    const [ acceptBidRes, setAcceptBidRes ] = useState<SubmitRes>({ ok: null });
    const acceptBid = async () => {
        try {
            setIsWorking(true);
            setAcceptBidRes({ ok: null });

            const tx = new Transaction();
            AuctionModule.admin_accepts_bid(
                tx, AUCTION_IDS[network].packageId, auction.type_coin, auction.id
            );

            const resp = await bidderClient.payFundsAndSendItemsToWinner(
                tx, auction.id, auction.type_coin, items.map(item => ({ addr: item.id, type: item.type }))
            );

            if (resp.effects?.status.status !== "success") {
                throw new Error(resp.effects?.status.error);
            }

            setAcceptBidRes({ ok: true });
        } catch (err) {
            const errMsg = bidderClient.errCodeToStr(err, "Failed to accept bid", {
                "E_WRONG_TIME": "The auction is not live",
                "E_WRONG_ADMIN": "You are not the admin",
                "E_CANT_END_WITHOUT_BIDS": "The auction has no bids",
            });
            setAcceptBidRes({ ok: false, err: errMsg });
            console.warn("[acceptBid]", err);
        } finally {
            setIsWorking(false);
            fetchAuction(false);
        }
    };

    // === "cancel auction": admin_cancels_auction + admin_reclaims_item ===

    const [ cancelAuctionRes, setCancelAuctionRes ] = useState<SubmitRes>({ ok: null });
    const cancelAuction = async () => {
        try {
            setIsWorking(true);
            setCancelAuctionRes({ ok: null });

            const tx = new Transaction();
            AuctionModule.admin_cancels_auction(
                tx, AUCTION_IDS[network].packageId, auction.type_coin, auction.id
            );

            for (const item of items) {
                AuctionModule.admin_reclaims_item(
                    tx, AUCTION_IDS[network].packageId, auction.type_coin, item.type, auction.id, item.id
                );
            }

            const resp = await bidderClient.signAndExecuteTransaction(tx);
            if (resp.effects?.status.status !== "success") {
                throw new Error(resp.effects?.status.error);
            }

            setCancelAuctionRes({ ok: true });
        } catch (err) {
            const errMsg = bidderClient.errCodeToStr(err, "Failed to cancel auction", {
                "E_WRONG_TIME": "The auction has already ended",
            });
            setCancelAuctionRes({ ok: false, err: errMsg });
            console.warn("[cancelAuction]", err);
        } finally {
            setIsWorking(false);
            fetchAuction(false);
        }
    };

    // === admin_reclaims_item ===

    const [ reclaimItemsRes, setReclaimItemsRes ] = useState<SubmitRes>({ ok: null });
    const reclaimItems = async () => {
        try {
            setIsWorking(true);
            setReclaimItemsRes({ ok: null });

            const tx = new Transaction();
            for (const item of items) {
                AuctionModule.admin_reclaims_item(
                    tx, AUCTION_IDS[network].packageId, auction.type_coin, item.type, auction.id, item.id
                );
            }

            const resp = await bidderClient.signAndExecuteTransaction(tx);
            if (resp.effects?.status.status !== "success") {
                throw new Error(resp.effects?.status.error);
            }

            setReclaimItemsRes({ ok: true });
        } catch (err) {
            const errMsg = bidderClient.errCodeToStr(err, "Failed to reclaim items", {
                "E_WRONG_TIME": "The auction has already ended",
                "E_CANT_RECLAIM_WITH_BIDS": "Can't reclaim items because the auction has bids",
            });
            setReclaimItemsRes({ ok: false, err: errMsg });
            console.warn("[reclaimItems]", err);
        } finally {
            setIsWorking(false);
            fetchAuction(false);
        }
    };

    // === admin_sets_pay_addr ===

    const [ setPayAddrRes, setSetPayAddrRes ] = useState<SubmitRes>({ ok: null });

    const input_pay_addr = useInputAddress({
        label: "New payment address",
        html: { value: auction.pay_addr, required: true },
    });
    const disableSubmitSetPayAddr = input_pay_addr.err !== undefined || input_pay_addr.val === auction.pay_addr;

    const setPayAddr = async () =>
    {
        try {
            setIsWorking(true);
            setSetPayAddrRes({ ok: null });

            const tx = new Transaction();
            AuctionModule.admin_sets_pay_addr(
                tx, AUCTION_IDS[network].packageId, auction.type_coin, auction.id, input_pay_addr.val!
            );

            const resp = await bidderClient.signAndExecuteTransaction(tx);
            if (resp.effects?.status.status !== "success") {
                throw new Error(resp.effects?.status.error);
            }

            setSetPayAddrRes({ ok: true });
        } catch (err) {
            const errMsg = bidderClient.errCodeToStr(err, "Failed to set pay address");
            setSetPayAddrRes({ ok: false, err: errMsg });
            console.warn("[setPayAddr]", err);
        } finally {
            setIsWorking(false);
            fetchAuction(false);
        }
    };

    // === html ===

    return <>
    {auction.can_admin_accept_bid &&
        <div className="card compact">
            <div className="card-title">Accept bid</div>
            <div>You can accept the current bid ({<Balance balance={auction.lead_value} coinType={auction.type_coin} />}) and send the items to the leader ({shortenAddress(auction.lead_addr)}).</div>
            <div className="form">
                <div className="btn-submit">
                    <Btn onClick={acceptBid}>ACCEPT BID</Btn>

                    {acceptBidRes.ok === true &&
                    <div className="success">Bid accepted!</div>}

                    {acceptBidRes.ok === false && acceptBidRes.err &&
                    <div className="error">{acceptBidRes.err}</div>}
                </div>
            </div>
        </div>}

        {auction.can_admin_cancel_auction &&
        <div className="card compact">
            <div className="card-title">Cancel auction</div>
            <div>You can cancel the auction and reclaim the items. Leader will be refunded.</div>
            <div className="form">
                <div className="btn-submit">
                    <Btn onClick={cancelAuction}>CANCEL AUCTION</Btn>

                    {cancelAuctionRes.ok === true &&
                    <div className="success">Auction cancelled!</div>}

                    {cancelAuctionRes.ok === false && cancelAuctionRes.err &&
                    <div className="error">{cancelAuctionRes.err}</div>}
                </div>
            </div>
        </div>}

        {auction.can_admin_reclaim_items &&
        <div className="card compact">
            <div className="card-title">Reclaim items</div>
            <div>You can reclaim the items because there were no bids.</div>
            <div className="form">
                <div className="btn-submit">
                    <Btn onClick={reclaimItems}>RECLAIM ITEMS</Btn>

                    {reclaimItemsRes.ok === true &&
                    <div className="success">Items reclaimed!</div>}

                    {reclaimItemsRes.ok === false && reclaimItemsRes.err &&
                    <div className="error">{reclaimItemsRes.err}</div>}
                </div>
            </div>
        </div>}

        {auction.can_admin_set_pay_addr &&
        <div className="card compact">
            <div className="card-title">Set pay address</div>
            <div>You can change the payment address for the auction.</div>
            <div className="form">
                {input_pay_addr.input}

                <div className="btn-submit">
                    <Btn onClick={setPayAddr} disabled={disableSubmitSetPayAddr}>SET ADDRESS</Btn>

                    {setPayAddrRes.ok === true &&
                    <div className="success">Address set!</div>}

                    {setPayAddrRes.ok === false && setPayAddrRes.err &&
                    <div className="error">{setPayAddrRes.err}</div>}
                </div>
            </div>
        </div>}

    </>;
};

const CardAuctionDetails: React.FC<{
    auction: AuctionObj;
}> = ({
    auction,
}) => {
    const { explorer, network } = useAppContext();
    return (
        <div className="card-details">
            {/* Main info */}
            <div className="detail">
                <span className="detail-label">Auction ID:</span>
                <LinkToExplorer addr={auction.id} kind="object" explorer={explorer} network={network} />
            </div>
            <div className="detail">
                <span className="detail-label">Currency:</span>
                <LinkToExplorer addr={auction.type_coin} kind="coin" explorer={explorer} network={network} />
            </div>
            {/* <div className="detail">
                <span className="detail-label">Items:</span>
                <ObjectLinkList ids={auction.item_addrs} />
            </div> */}
            {auction.has_balance &&
            <div className="detail">
                <span className="detail-label">Top Bid:</span>
                <Balance balance={auction.lead_value} coinType={auction.type_coin} />
            </div>}
            {auction.has_leader &&
            <div className="detail">
                <span className="detail-label">Leader Address:</span>
                <LinkToUser addr={auction.lead_addr} kind="bids" />
            </div>}
            <div className="detail">
                <span className="detail-label">Start Time:</span>
                {formatDate(auction.begin_time_ms)}
            </div>
            <div className="detail">
                <span className="detail-label">End Time:</span>
                {formatDate(auction.end_time_ms)}
            </div>
            <div className="detail">
                <span className="detail-label">Minimum Bid:</span>
                <Balance balance={auction.minimum_bid} coinType={auction.type_coin} />
            </div>
            <div className="detail">
                <span className="detail-label">Minimum Increase:</span>
                {formatBps(auction.minimum_increase_bps)}
            </div>
            <div className="detail">
                <span className="detail-label">Extension Period:</span>
                {formatDuration(auction.extension_period_ms)}
            </div>
            <div className="detail">
                <span className="detail-label">Creator Address:</span>
                <LinkToUser addr={auction.admin_addr} kind="auctions" />
            </div>
            <div className="detail">
                <span className="detail-label">Payment Address:</span>
                <LinkToExplorer addr={auction.pay_addr} kind="address" explorer={explorer} network={network} />
            </div>
            {/* <div className="detail">
                <span className="detail-label">Started</span>
                {auction.has_started ? "yes": "no"}
            </div>
            <div className="detail">
                <span className="detail-label">Ended</span>
                {auction.has_ended ? "yes": "no"}
            </div>
            <div className="detail">
                <span className="detail-label">Live</span>
                {auction.is_live ? "yes": "no"}
            </div>
            <div className="detail">
                <span className="detail-label">Cancelled</span>
                {auction.is_cancelled ? "yes": "no"}
            </div>
            <div className="detail">
                <span className="detail-label">Has Leader</span>
                {auction.has_leader ? "yes": "no"}
            </div>
            <div className="detail">
                <span className="detail-label">Has Balance</span>
                {auction.has_balance ? "yes": "no"}
            </div> */}
        </div>
    );
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
    const { explorer, network } = useAppContext();
    return (
        <div className="card tx tx-create">
            <div className="card-header">
                <div className="card-title">CREATED</div>
                <span className="header-label">{formatTimeDiff(tx.timestamp)}</span>
            </div>
            <div className="card-body">
                <div>Sender: <LinkToUser addr={tx.sender} kind="bids" /></div>
                <div>tx: <LinkToExplorer addr={tx.digest} kind="txblock" explorer={explorer} network={network}>
                            {shortenDigest(tx.digest)}
                        </LinkToExplorer>
                </div>
            </div>
        </div>
    );
};

const CardTxAnyoneBids: React.FC<{
    tx: TxAnyoneBids;
}> = ({
    tx,
}) => {
    const { explorer, network } = useAppContext();
    return (
        <div className="card tx tx-bid">
            <div className="card-header">
                <div className="card-title">
                    BID&nbsp;
                    {<Balance balance={tx.inputs.amount} coinType={tx.inputs.type_coin} />}
                </div>
                <span className="header-label">{formatTimeDiff(tx.timestamp)}</span>
            </div>
            <div className="card-body">
                <div>Sender: <LinkToUser addr={tx.sender} kind="bids" /></div>
                <div>tx: <LinkToExplorer addr={tx.digest} kind="txblock" explorer={explorer} network={network}>
                            {shortenDigest(tx.digest)}
                        </LinkToExplorer>
                </div>
            </div>
        </div>
    );
};

const LinkToUser: React.FC<{
    addr: string;
    kind: "bids" | "auctions";
}> = ({
    addr,
    kind,
}) => {
    return <Link to={`/user/${addr}/${kind}`}>{shortenAddress(addr)}</Link>;
};

// const CardAuctionDetails: React.FC<{
//     auction: AuctionObj;
// }> = ({
//     auction,
// }) => {
//     const { network } = useAppContext();
//     return <>
//         <div>Auction: <LinkToExplorer addr={auction.id} kind="object" network={network} /></div>
//         <div>Currency: <LinkToExplorer addr={auction.type_coin} kind="coin" network={network} /></div>
//         {/* <div>Name: {auction.name}</div>
//         <div>Description: {auction.description}</div> */}
//         <div>Items: <ObjectLinkList ids={auction.item_addrs} /></div>
//         {/* <div>Item bag: <LinkToExplorer addr={auction.item_bag.id} kind="object" network={network} /> ({auction.item_bag.size} items)</div> */}
//         <div>Admin address: <LinkToExplorer addr={auction.admin_addr} kind="address" network={network} /></div>
//         <div>Payment address: <LinkToExplorer addr={auction.pay_addr} kind="address" network={network} /></div>
//         <div>Leader address: <LinkToExplorer addr={auction.lead_addr} kind="address" network={network} /></div>
//         <div>Leader amount: <Balance balance={auction.lead_value} coinType={auction.type_coin} /></div>
//         <div>Start time: {msToDate(auction.begin_time_ms)}</div>
//         <div>End time: {msToDate(auction.end_time_ms)}</div>
//         <div>Minimum bid allowed: <Balance balance={auction.minimum_bid} coinType={auction.type_coin} /></div>
//         <div>Minimum bid increase: {bpsToPct(auction.minimum_increase_bps)}</div>
//         <div>Extension period: {msToMinutes(auction.extension_period_ms) }</div>
//         <div>Has started: {auction.has_started ? "yes" : "no"}</div>
//         <div>Has ended: {auction.has_ended ? "yes" : "no"}</div>
//         <div>Is live: {auction.is_live ? "yes" : "no"}</div>
//         <div>Is cancelled: {auction.is_cancelled ? "yes" : "no"}</div>
//         <div>Has leader: {auction.has_leader ? "yes" : "no"}</div>
//         <div>Has balance: {auction.has_balance ? "yes" : "no"}</div>
//     </>;
// };

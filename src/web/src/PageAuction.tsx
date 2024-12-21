import { useCurrentAccount } from "@mysten/dapp-kit";
import { CoinMetadata, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { AnyAuctionTx, AUCTION_IDS, AuctionModule, AuctionObj, BidderClient, KIOSK_CAP_TYPES, SuiItem } from "@polymedia/bidder-sdk";
import { useCoinMeta } from "@polymedia/coinmeta-react";
import { formatBalance, formatBps, formatDate, formatDuration, formatTimeDiff, shortenAddress, shortenDigest } from "@polymedia/suitcase-core";
import { LinkExternal, LinkToExplorer, useFetchAndPaginate, useInputAddress, useInputUnsignedBalance } from "@polymedia/suitcase-react";
import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { Btn } from "./components/Btn";
import { BtnPrevNext } from "./components/BtnPrevNext";
import { Balance, CardAuctionItems, CardSpinner, CardWithMsg, HeaderLabel, TopBid } from "./components/cards";
import { BtnConnect } from "./components/ConnectToGetStarted";
import { IconCart, IconDetails, IconGears, IconHistory, IconInfo, IconItems } from "./components/icons";
import { HeaderTabs, makeTabs } from "./components/tabs";
import { useFetchUserId } from "./hooks/useFetchUserId";
import { SubmitRes } from "./lib/types";
import { PageFullScreenMsg, PageNotFound } from "./PageFullScreenMsg";

const PAGE_SIZE_ACTIVITY = 25;

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

    const tabsContainerRef = React.useRef<HTMLDivElement>(null);

    if (err) {
        return <PageFullScreenMsg>{err.toUpperCase()}</PageFullScreenMsg>;
    }
    if (auction === null || items === null) {
        return <PageFullScreenMsg>{err}</PageFullScreenMsg>;
    }
    if (auction === undefined || items === undefined) {
        return <PageFullScreenMsg>LOADING…</PageFullScreenMsg>;
    }

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

                <CardTweet auction={auction} />
                <CardFinalize auction={auction} items={items} fetchAuction={fetchAuction} />

                <div className="tabs-container" ref={tabsContainerRef}>
                    <HeaderTabs tabs={visibleTabs} activeTab={activeTab} onChangeTab={changeTab} />
                    <div className="tabs-content">
                        {activeTab === "items" && <SectionItems items={items} />}
                        {activeTab === "bid" && auction.is_live && <SectionBid auction={auction} fetchAuction={fetchAuction} />}
                        {activeTab === "details" && <SectionDetails auction={auction} />}
                        {activeTab === "activity" && <SectionActivity auction={auction} tabsContainerRef={tabsContainerRef} />}
                        {activeTab === "admin" && <SectionAdmin auction={auction} items={items} fetchAuction={fetchAuction} />}
                    </div>
                </div>

            </div>

        </div>

    </div>
    </>;
};

const CardTweet: React.FC<{
    auction: AuctionObj;
}> = ({
    auction,
}) => {
    const location = useLocation();
    const justCreated = location.state?.justCreated === true; // eslint-disable-line
    if (!justCreated) { return null; }

    const { bidderClient } = useAppContext();
    const { coinMeta } = useCoinMeta(bidderClient.suiClient, auction.type_coin);

    if (!coinMeta) { return null; }

    const tweetText = encodeURIComponent(
        "I just created a new auction!\n\n" +
        `🏆 Up for grabs: ${auction.name}\n\n` +
        `💰 Starting bid: ${formatBalance(auction.minimum_bid, coinMeta.decimals, "compact")} ${coinMeta.symbol}\n\n` +
        `⏰ Don't miss out! Bid now:\nhttps://bidder.polymedia.app/auction/${auction.id}/items`
    );
    return <div className="card">
        <div className="card-title">Success!</div>
        <div>Your auction has been created.</div>
        <div>
            <LinkExternal href={`https://x.com/share?text=${tweetText}`} className="btn">
                TWEET IT
            </LinkExternal>
        </div>
    </div>;
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

    const { bidderClient, network, setIsWorking } = useAppContext();

    const [ submitRes, setSubmitRes ] = useState<SubmitRes>({ ok: null });

    const isClaimable = auction.can_anyone_pay_funds || auction.can_anyone_send_items_to_winner;

    const finalizeAuction = async () =>
    {
        try {
            setIsWorking(true);
            setSubmitRes({ ok: null });
            const actualItems = items.map(item => ({
                addr: item.kiosk ? item.kiosk.cap.objectId : item.id,
                type: item.kiosk ? KIOSK_CAP_TYPES[network].regular : item.type,
            }));
            for (const dryRun of [true, false])
            {
                const tx = new Transaction();
                const resp = await bidderClient.payFundsAndSendItemsToWinner(
                    tx, auction.id, auction.type_coin, actualItems, dryRun,
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
            <CardAuctionItems items={items} hiddenItemCount={0} className="grid" />
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
    const input_amount = useInputUnsignedBalance({ // TODO check user balance
        label: `Amount (${coinMeta.symbol})`,
        decimals: coinMeta.decimals,
        min: auction.minimum_bid,
        msgRequired: msgMinimum,
        msgTooSmall: msgMinimum,
        html: { required: true, disabled: !currAcct },
    });

    const hasInputError = input_amount.err !== null;
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

const SectionActivity: React.FC<{
    auction: AuctionObj;
    tabsContainerRef: React.RefObject<HTMLDivElement>;
}> = ({
    auction,
    tabsContainerRef,
}) => {
    // === state ===

    const { bidderClient, rpc, network } = useAppContext();

    const activity = useFetchAndPaginate<AnyAuctionTx, string|null|undefined>(
        (cursor) => {
            /**
             * Hack for "The InputObject and ChangedObject transaction filters for the
             * JSON-RPC method suix_queryTransactionBlocks are being deprecated for JSON-RPC"
             */
            if (network === "mainnet" && rpc === "https://fullnode.mainnet.sui.io:443") {
                const suiClient = new SuiClient({ url: "https://mainnet.suiet.app" });
                const bidderClient = new BidderClient({
                    network,
                    packageId: AUCTION_IDS[network].packageId,
                    registryId: AUCTION_IDS[network].registryId,
                    suiClient,
                    signTransaction: (_tx) => Promise.resolve({ bytes: "", signature: "" }),
                });
                return bidderClient.fetchTxsByAuctionId(auction.id, cursor, PAGE_SIZE_ACTIVITY);
            } else {
                return bidderClient.fetchTxsByAuctionId(auction.id, cursor, PAGE_SIZE_ACTIVITY);
            }
        },
        [auction, bidderClient],
    );

    // === html ===

    if (activity.error) {
        return <CardWithMsg className="compact">{activity.error}</CardWithMsg>;
    } else if (activity.isLoading && activity.page.length === 0) {
        return <CardSpinner />;
    }
    return (
        <div className="card compact">
            <div className="card-title">Activity</div>
            <div className={`card-list tx-list ${activity.isLoading ? "loading" : ""}`}>
                {activity.isLoading && <CardSpinner />}
                {activity.page.map(tx =>
                    <CardTransaction tx={tx} key={tx.digest} />
                )}
            </div>
            <BtnPrevNext data={activity} scrollToRefOnPageChange={tabsContainerRef} />
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

            const actualItems = items.map(item => ({
                addr: item.kiosk ? item.kiosk.cap.objectId : item.id,
                type: item.kiosk ? KIOSK_CAP_TYPES[network].regular : item.type,
            }));
            const resp = await bidderClient.payFundsAndSendItemsToWinner(
                tx, auction.id, auction.type_coin, actualItems
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
                const actualId = item.kiosk ? item.kiosk.cap.objectId : item.id;
                const actualType = item.kiosk ? KIOSK_CAP_TYPES[network].regular : item.type;
                AuctionModule.admin_reclaims_item(
                    tx, AUCTION_IDS[network].packageId, auction.type_coin, actualType, auction.id, actualId
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
                const actualId = item.kiosk ? item.kiosk.cap.objectId : item.id;
                const actualType = item.kiosk ? KIOSK_CAP_TYPES[network].regular : item.type;
                AuctionModule.admin_reclaims_item(
                    tx, AUCTION_IDS[network].packageId, auction.type_coin, actualType, auction.id, actualId
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
    const disableSubmitSetPayAddr = input_pay_addr.err !== null || input_pay_addr.val === auction.pay_addr;

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
                    <div className="success">Auction canceled!</div>}

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
                <span className="label">Auction ID:</span>
                <span className="value">
                    <LinkToExplorer addr={auction.id} kind="object" explorer={explorer} network={network} />
                </span>
            </div>
            <div className="detail">
                <span className="label">Currency:</span>
                <span className="value">
                    <LinkToExplorer addr={auction.type_coin} kind="coin" explorer={explorer} network={network} />
                </span>
            </div>
            {/* <div className="detail">
                <span className="label">Items:</span>
                <span className="value"><ObjectLinkList ids={auction.item_addrs} /></span>
            </div> */}
            {auction.has_balance &&
            <div className="detail">
                <span className="label">Top Bid:</span>
                <span className="value">
                    <Balance balance={auction.lead_value} coinType={auction.type_coin} />
                </span>
            </div>}
            {auction.has_leader &&
            <div className="detail">
                <span className="label">Leader Address:</span>
                <span className="value">
                    <LinkToUser addr={auction.lead_addr} kind="bids" />
                </span>
            </div>}
            <div className="detail">
                <span className="label">Start Time:</span>
                <span className="value">{formatDate(auction.begin_time_ms)}</span>
            </div>
            <div className="detail">
                <span className="label">End Time:</span>
                <span className="value">{formatDate(auction.end_time_ms)}</span>
            </div>
            <div className="detail">
                <span className="label">Minimum Bid:</span>
                <span className="value"><Balance balance={auction.minimum_bid} coinType={auction.type_coin} /></span>
            </div>
            <div className="detail">
                <span className="label">Minimum Increase:</span>
                <span className="value">{formatBps(auction.minimum_increase_bps)}</span>
            </div>
            <div className="detail">
                <span className="label">Extension Period:</span>
                <span className="value">{formatDuration(auction.extension_period_ms)}</span>
            </div>
            <div className="detail">
                <span className="label">Creator Address:</span>
                <span className="value"><LinkToUser addr={auction.admin_addr} kind="auctions" /></span>
            </div>
            <div className="detail">
                <span className="label">Payment Address:</span>
                <span className="value"><LinkToExplorer addr={auction.pay_addr} kind="address" explorer={explorer} network={network} /></span>
            </div>
            {/* <div className="detail">
                <span className="label">Started</span>
                <span className="value">{auction.has_started ? "yes": "no"}</span>
            </div>
            <div className="detail">
                <span className="label">Ended</span>
                <span className="value">{auction.has_ended ? "yes": "no"}</span>
            </div>
            <div className="detail">
                <span className="label">Live</span>
                <span className="value">{auction.is_live ? "yes": "no"}</span>
            </div>
            <div className="detail">
                <span className="label">Canceled</span>
                <span className="value">{auction.is_canceled ? "yes": "no"}</span>
            </div>
            <div className="detail">
                <span className="label">Has Leader</span>
                <span className="value">{auction.has_leader ? "yes": "no"}</span>
            </div>
            <div className="detail">
                <span className="label">Has Balance</span>
                <span className="value">{auction.has_balance ? "yes": "no"}</span>
            </div> */}
        </div>
    );
};

const CardTransaction: React.FC<{
    tx: AnyAuctionTx;
}> = ({
    tx,
}) => {
    const { explorer, network } = useAppContext();

    let title: string;
    let className: string;
    let extraInfo: React.ReactNode | null = null;

    switch (tx.kind) {
        case "admin_creates_auction":
            title = "CREATED";
            className = "tx-create";
            break;
        case "anyone_bids":
            title = "BID";
            className = "tx-bid";
            extraInfo = <Balance balance={tx.inputs.amount} coinType={tx.inputs.type_coin} />;
            break;
        case "admin_accepts_bid":
            title = "ENDED EARLY";
            className = "tx-finalize";
            break;
        case "anyone_pays_funds":
        case "anyone_sends_item_to_winner":
            title = "FINALIZED";
            className = "tx-finalize";
            break;
        case "admin_cancels_auction":
            title = "CANCELED";
            className = "tx-cancel";
            break;
        case "admin_sets_pay_addr":
            title = "SET PAY ADDRESS";
            className = "tx-set-pay-addr";
            break;
        default:
            return <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                {JSON.stringify(tx, null, 2)}
            </div>;
    }

    return (
        <div className={`card tx ${className}`}>
            <div className="card-header">
                <div className="card-title">
                    {title}
                    {extraInfo && <>&nbsp;{extraInfo}</>}
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
//         <div>Is canceled: {auction.is_canceled ? "yes" : "no"}</div>
//         <div>Has leader: {auction.has_leader ? "yes" : "no"}</div>
//         <div>Has balance: {auction.has_balance ? "yes" : "no"}</div>
//     </>;
// };

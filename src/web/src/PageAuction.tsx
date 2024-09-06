import { useCurrentAccount } from "@mysten/dapp-kit";
import { CoinMetadata } from "@mysten/sui/client";
import { AuctionClient, AuctionObj } from "@polymedia/auction-sdk";
import { useCoinMeta } from "@polymedia/coinmeta-react";
import { balanceToString } from "@polymedia/suitcase-core";
import { ReactSetter } from "@polymedia/suitcase-react";
import React, { useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { AppContext } from "./App";
import { CardAuctionDetails, CardAuctionItems, CardTransaction, FullCardMsg } from "./components/cards";
import { useInputUnsignedBalance } from "./components/inputs";
import { useFetchUserId } from "./hooks/useFetchUserId";
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

    const onSubmit = async () => // TODO: parse AUCTION_ERRORS from response + dryRunTransactionBlock() to catch errors (e.g. someone else bid)
    {
        if (disableSubmit) {
            return;
        }
        try {
            const txRes = await auctionClient.bid(
                currAcct.address,
                userId,
                auction.id,
                auction.type_coin,
                form.amount.val!,
            );
            console.debug("txRes:", txRes);
        } catch (err) {
            setErrSubmit("Failed to submit bid"); // TODO: parse module errors (e.g. someone else bid)
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
                    <CardTransaction tx={tx} />
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

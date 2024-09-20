import { SuiItem, TxAdminCreatesAuction } from "@polymedia/bidder-sdk";
import { formatTimeDiff } from "@polymedia/suitcase-core";
import React, { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { Glitch } from "./components/Glitch";
import { CardAuctionItems, CardLoading, CardWithMsg } from "./components/cards";

export const PageHome: React.FC = () =>
{
    const { header } = useOutletContext<AppContext>();

    return <>
    {header}
    <div id="page-home" className="page-regular">

        <div className="page-content">

            <div id="home-hero" className="page-section">
                <Glitch text="BIDDER" />
                <div id="hero-title">
                    <h1>Sui's Auction House</h1>
                </div>
                <div id="hero-description">
                    <p>
                        BIDDER is a decentralized platform for creating and bidding on auctions.
                    </p>
                </div>
                <div>
                    <Link to="/new" className="btn">CREATE AUCTION</Link>
                </div>
            </div>

            <SectionRecentAuctions />

        </div>

    </div>
    </>;
};

const MAX_ITEMS_PER_AUCTION = 3;

type TxWithItems = {
    tx: TxAdminCreatesAuction;
    items: SuiItem[];
};

const SectionRecentAuctions: React.FC = () =>
{
    // === state ===

    const { bidderClient } = useOutletContext<AppContext>();

    // const [ txs, setTxs ] = useState<Awaited<ReturnType<InstanceType<typeof BidderClient>["fetchTxsAdminCreatesAuction"]>>>();
    const [ txsWithItems, setTxsWithItems ] = useState<TxWithItems[] | undefined>();
    const [ errFetch, setErrFetch ] = useState<string | null>(null);

    // === effects ===

    useEffect(() => {
        fetchRecentAuctions();
    }, []);

    // === functions ===

    const fetchRecentAuctions = async () => // TODO: "load more" / "next page"
    {
        setTxsWithItems(undefined);
        setErrFetch(null);
        try {
            // fetch recent txs
            const newTxs = await bidderClient.fetchTxsAdminCreatesAuction(null, 12);

            // collect all unique item addresses
            const allItemAddrs = new Set(
                newTxs.data.flatMap(tx => tx.inputs.item_addrs.slice(0, MAX_ITEMS_PER_AUCTION))
            );

            // fetch all items with a single RPC call
            const allItems = await bidderClient.fetchItems([...allItemAddrs], true);
            const itemMap = new Map(allItems.map(item => [item.id, item]));

            // assign items to each transaction
            const txsWithItems = newTxs.data.map(tx => ({
                tx,
                items: tx.inputs.item_addrs
                    .slice(0, MAX_ITEMS_PER_AUCTION)
                    .map(addr => itemMap.get(addr))
                    .filter((item): item is SuiItem => item !== undefined)
                }));

            setTxsWithItems(txsWithItems);
        } catch (err) {
            setErrFetch("Failed to fetch recent auctions");
            console.warn("[fetchRecentAuctions]", err);
        }
    };

    // === html ===

    let content: React.ReactNode;
    if (txsWithItems === undefined) {
        content = <CardLoading />;
    } else if (errFetch) {
        content = <CardWithMsg>{errFetch}</CardWithMsg>;
    } else {
        content = <div className="card-list">
            {txsWithItems.map(({ tx, items }) => (
                <CardTxAdminCreatesAuction
                    tx={tx}
                    key={tx.digest}
                    items={items}
                    hiddenItemCount={Math.max(0, tx.inputs.item_addrs.length - MAX_ITEMS_PER_AUCTION)}
                />
            ))}
        </div>;
    }

    return (
        <div className="page-section">
            <div className="section-title">
                Recent auctions
            </div>
            {content}
        </div>
    );
};

const CardTxAdminCreatesAuction: React.FC<{
    tx: TxAdminCreatesAuction;
    items: SuiItem[];
    hiddenItemCount: number;
}> = ({
    tx,
    items,
    hiddenItemCount,
}) =>
{
    return (
        <Link to={`/auction/${tx.auctionId}/items`} className="card link">
            <div className="card-header column-on-small">
                <div className="card-title">{tx.inputs.name}</div>
                <div className="auction-header-info">
                    {/* <TopBid auction={auction} /> TODO */}
                    <span className="header-label">{formatTimeDiff(tx.timestamp)}</span>
                </div>
            </div>

            {tx.inputs.description.length > 0 &&
            <div className="card-description">{tx.inputs.description}</div>}

            <CardAuctionItems items={items} hiddenItemCount={hiddenItemCount} />
        </Link>
    );
};

// const fetchConfig = async () => {
//     const config = await bidderClient.fetchConfig();
//     console.log(JSON.stringify(config, null, 2));
// };

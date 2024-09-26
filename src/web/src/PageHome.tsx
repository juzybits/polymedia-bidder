import { AuctionObj, AuctionWithItems, SuiItem } from "@polymedia/bidder-sdk";
import { NetworkName } from "@polymedia/suitcase-core";
import React from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "./App";
import { BtnPrevNext } from "./components/BtnPrevNext";
import { Glitch } from "./components/Glitch";
import { CardAuctionItems, CardLoading, CardWithMsg, HeaderLabel, TopBid } from "./components/cards";
import { useFetch, useFetchAndPaginate } from "./lib/useFetch";

const MAX_ITEMS_PER_AUCTION = 3;

const featuredAuctionAndItemIds: Record<NetworkName, { auctionId: string; itemIds: string[]; }[]> = {
    "mainnet": [],
    "testnet": [],
    "devnet": [
        {
            auctionId: "0x12c94cc99274fc594af5c4537d4b3fbe28b42ec3d3a48e9428fa36969eff5ed7",
            itemIds: [
                "0x047aa29bdd60c7a6fbb419db8f36c1b1adda2c16e35303df6c40d4873d3c4f48",
                "0x07f9468858915f1e296c3d12340d8b0d2bec7c31502c7ef34fe1645e33ca47ad",
                "0x1c248fce32af583739b5beebe039c2d2deff88c5d12f9850bd508c395607f35e",
            ],
        },
    ],
    "localnet": [],
};

export const PageHome: React.FC = () =>
{
    const { header } = useAppContext();

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

            <SectionFeaturedAuctions />

            <SectionRecentAuctions />

        </div>

    </div>
    </>;
};

const SectionFeaturedAuctions: React.FC = () =>
{
    // === state ===

    const { bidderClient, network } = useAppContext();
    const auctionAndItemIds = featuredAuctionAndItemIds[network];
    if (auctionAndItemIds.length === 0) {
        return null;
    }

    const { data: auctionsWithItems, error: errFetchFeatured } = useFetch<AuctionWithItems[]>(
        async () => {
            const { auctions, items } = await bidderClient.fetchAuctionsAndItems(
                auctionAndItemIds.map(({ auctionId }) => auctionId),
                auctionAndItemIds.flatMap(({ itemIds }) => itemIds),
            );
            return auctions.map(auction => ({
                ...auction,
                items: auction.item_addrs
                    .map(id => items.get(id))
                    .filter((item): item is SuiItem => item !== undefined)
            }));
        },
        [bidderClient],
    );

    // === html ===

    let content: React.ReactNode;
    if (errFetchFeatured) {
        content = <CardWithMsg>{errFetchFeatured}</CardWithMsg>;
    }  else if (auctionsWithItems === undefined) {
        content = <CardLoading />;
    } else {
        content = <div className="card-list">
            {auctionsWithItems.map((auctionWithItems) => (
                <CardAuctionWithItems
                    key={auctionWithItems.id}
                    auction={auctionWithItems}
                    items={auctionWithItems.items}
                />
            ))}
        </div>;
    }

    return (
        <div className="page-section">
            <div className="page-title">
                FEATURED AUCTIONS
            </div>
            {content}
        </div>
    );
};

const SectionRecentAuctions: React.FC = () =>
{
    // === state ===

    const { bidderClient, network } = useAppContext();
    const featuredAuctionIds = featuredAuctionAndItemIds[network].map(({ auctionId }) => auctionId);

    const recent = useFetchAndPaginate<AuctionWithItems>(
        async (cursor) => {
            // fetch recent "create auction" txs
            const recentTxs = await bidderClient.fetchTxsAdminCreatesAuction(cursor, 12);
            const auctionIds = recentTxs.data
                .filter(tx => !featuredAuctionIds.includes(tx.auctionId))
                .map(tx => tx.auctionId);
            const itemIds = new Set(
                recentTxs.data.flatMap(tx => tx.inputs.item_addrs.slice(0, MAX_ITEMS_PER_AUCTION))
            );

            // fetch all auctions and items with a single RPC call
            const { auctions, items } = await bidderClient.fetchAuctionsAndItems(auctionIds, [...itemIds]);
            return {
                data: auctions.map(auction => ({
                    ...auction,
                    items: auction.item_addrs
                        .slice(0, MAX_ITEMS_PER_AUCTION)
                        .map(id => items.get(id))
                        .filter((item): item is SuiItem => item !== undefined)
                })),
                hasNextPage: recentTxs.hasNextPage,
                nextCursor: recentTxs.nextCursor,
            };
        },
        [bidderClient],
    );

    // === html ===

    let content: React.ReactNode;
    if (recent.error) {
        content = <CardWithMsg>{recent.error}</CardWithMsg>;
    } else if (recent.isLoading && recent.page.length === 0) {
        content = <CardLoading />;
    } else {
        content = <div className="card-list">
            {recent.page.map((auctionWithItems) => (
                <CardAuctionWithItems
                    key={auctionWithItems.id}
                    auction={auctionWithItems}
                    items={auctionWithItems.items}
                />
            ))}
        </div>;
    }

    return (
        <div className="page-section">
            <div className="page-title">
                RECENT AUCTIONS
            </div>
            {content}
            <BtnPrevNext data={recent} />
        </div>
    );
};

const CardAuctionWithItems: React.FC<{
    auction: AuctionObj;
    items: SuiItem[];
}> = ({
    auction,
    items,
}) =>
{
    const hiddenItemCount = Math.max(0, auction.item_addrs.length - MAX_ITEMS_PER_AUCTION);
    return (
        <Link to={`/auction/${auction.id}/items`} className="card link">
            <div className="card-header column-on-small">
                <div className="card-title">{auction.name}</div>
                <div className="auction-header-info">
                    <TopBid auction={auction} />
                    <HeaderLabel auction={auction} />
                </div>
            </div>

            {auction.description.length > 0 &&
            <div className="card-description">{auction.description}</div>}

            <CardAuctionItems items={items} hiddenItemCount={hiddenItemCount} />
        </Link>
    );
};

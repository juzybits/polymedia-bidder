import { AuctionObj, AuctionWithItems, SuiItem } from "@polymedia/bidder-sdk";
import { NetworkName } from "@polymedia/suitcase-core";
import { useFetch, useFetchAndPaginate } from "@polymedia/suitcase-react";
import React from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "./App";
import { BtnPrevNext } from "./components/BtnPrevNext";
import { Glitch } from "./components/Glitch";
import { CardAuctionItems, CardSpinner, CardWithMsg, HeaderLabel, TopBid } from "./components/cards";

const PAGE_SIZE_RECENT = 24;
const MAX_ITEMS_PER_AUCTION = 1;

const featuredAuctionAndItemIds: Record<NetworkName, { auctionId: string; itemIds: string[] }[]> = {
    "mainnet": [
    ],
    "testnet": [
        {
            auctionId: "0x37e01a21e07ce4804d9c86d7b4dea6411a179710912b5ee41e355d1b1421c7f7",
            itemIds: [
                "0x383ece4046ebe066326ae6ca195c2667c1688f1597f55e16d7c92ccd73ffeaba",
            ],
        },
        {
            auctionId: "0xd1bd0af4bd34f675f03fd4cb95f52180369ec966fc65291ad59aa93a389b50ca",
            itemIds: [
                "0x9cbaf0ea5684a776d974f533c82d1fd3f9ff62adfafc69c6998ad75f757a7a3e",
            ],
        },
        {
            auctionId: "0x37d0ea66363f213f33095d61003b801eb1658f56c848546111b5cd3c04d00882",
            itemIds: [
                "0xf5009a83ca08337649b310bfcaeae003ea05e8ecb00430ba98d09ded96c985d3",
            ],
        },
        {
            auctionId: "0x47239f026a58e2e2b9be17ed21154630d9336b6ed62b40f1b3b6068a517c18c2",
            itemIds: [
                "0xdec0a064bd855248dc5db10a2d11defb085500f6e0945e8d50c16854a337d0f9",
            ],
        },
    ],
    "devnet": [],
    "localnet": [],
};

export const PageHome: React.FC = () =>
{
    const { header } = useAppContext();

    return <>
    {header}
    <div id="page-home" className="page-regular">

        <div className="page-content">

            <HeroBanner />

            <SectionFeaturedAuctions />

            <SectionRecentAuctions />

        </div>

    </div>
    </>;
};

export const HeroBanner: React.FC = () => {
    return (
        <div className="hero-banner">
            <Glitch text="BIDDER" />
            <div className="hero-subtitle">
                <h1>Sui's Auction House</h1>
            </div>
            <div className="hero-description">
                <p>
                    BIDDER is a decentralized platform for creating and bidding on auctions.
                </p>
            </div>
            <div className="hero-actions">
                <Link to="/new" className="btn">CREATE AUCTION</Link>
            </div>
        </div>
    );
};

const SectionFeaturedAuctions: React.FC = () =>
{
    // === state ===

    const { bidderClient, network } = useAppContext();
    const auctionAndItemIds = featuredAuctionAndItemIds[network];
    if (auctionAndItemIds.length === 0) {
        return null;
    }

    const auctionsWithItems = useFetch<AuctionWithItems[]>(
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
    if (auctionsWithItems.error) {
        content = <CardWithMsg>{auctionsWithItems.error}</CardWithMsg>;
    }  else if (auctionsWithItems.isLoading || auctionsWithItems.data === undefined) {
        content = <CardSpinner />;
    } else {
        const fillerItemsCount = 3;
        content = (
            <div className="flex-grid">
                {auctionsWithItems.data.map((auctionWithItems) => (
                    <CardAuctionWithItems
                        key={auctionWithItems.id}
                        auction={auctionWithItems}
                        items={auctionWithItems.items}
                    />
                ))}
                {[...Array(fillerItemsCount)].map((_, idx) => (
                    <div key={`filler-${idx}`} className="card filler-card" />
                ))}
            </div>
        );
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

    const recent = useFetchAndPaginate<AuctionWithItems, string|null|undefined>(
        async (cursor) => {
            // fetch recent "create auction" txs
            const recentTxs = await bidderClient.fetchTxsAdminCreatesAuction(cursor, PAGE_SIZE_RECENT);
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
        content = <CardSpinner />;
    } else {
        const fillerItemsCount = 3;
        content = <>
            {recent.isLoading && <CardSpinner />}
            <div className={`flex-grid ${recent.isLoading ? "loading" : ""}`}>
                {recent.page.map((auctionWithItems) => (
                    <CardAuctionWithItems
                        key={auctionWithItems.id}
                        auction={auctionWithItems}
                        items={auctionWithItems.items}
                    />
                ))}
                {[...Array(fillerItemsCount)].map((_, idx) => (
                    <div key={`filler-${idx}`} className="card filler-card" />
                ))}
            </div>
        </>;
    }

    const sectionRef = React.useRef<HTMLDivElement>(null);

    return (
        <div className="page-section" ref={sectionRef}>
            <div className="page-title">
                RECENT AUCTIONS
            </div>
            {content}
            <BtnPrevNext data={recent} scrollToRefOnPageChange={sectionRef} />
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
                {/* <div className="card-title">{auction.name}</div> */}
                <div className="auction-header-info">
                    <TopBid auction={auction} />
                    <HeaderLabel auction={auction} />
                </div>
            </div>

            {/* {auction.description.length > 0 &&
            <div className="card-description">{auction.description}</div>} */}

            <CardAuctionItems items={items} hiddenItemCount={hiddenItemCount} className="card-list" />

            {/* <div className="card-title">{auction.name}</div> */}

        </Link>
    );
};

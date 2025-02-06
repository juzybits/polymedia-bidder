import React from "react";
import { Link } from "react-router-dom";

import { AuctionObj, AuctionWithItems, SuiItem } from "@polymedia/bidder-sdk";
import { NetworkName } from "@polymedia/suitcase-core";
import { BtnPrevNext, useFetch, useFetchAndPaginate } from "@polymedia/suitcase-react";

import { useAppContext } from "./App";
import { CardAuctionItems, CardSpinner, CardWithMsg, HeaderLabel, TopBid } from "./comp/cards";
import { Glitch } from "./comp/Glitch";

const PAGE_SIZE_RECENT = 24;
const MAX_ITEMS_PER_AUCTION = 1;

const featuredAuctionAndItemIds: Record<NetworkName, { auctionId: string; itemIds: string[] }[]> = {
    "mainnet": [
        // { auctionId: "0x72aeb18ff52906df61b8ffda456b24c619876c47bdc90e02d47b79c463ae89ac",
        //     itemIds: [ "0x63ef188cfae381a7e3ca0421f9eaa4333d59d5315ad679be2f54b16dc521ad01" ] },
    ],
    "testnet": [
        // { auctionId: "0x37e01a21e07ce4804d9c86d7b4dea6411a179710912b5ee41e355d1b1421c7f7",
        //     itemIds: [ "0x383ece4046ebe066326ae6ca195c2667c1688f1597f55e16d7c92ccd73ffeaba" ] },
        // { auctionId: "0xd1bd0af4bd34f675f03fd4cb95f52180369ec966fc65291ad59aa93a389b50ca",
        //     itemIds: [ "0x9cbaf0ea5684a776d974f533c82d1fd3f9ff62adfafc69c6998ad75f757a7a3e" ] },
        // { auctionId: "0x37d0ea66363f213f33095d61003b801eb1658f56c848546111b5cd3c04d00882",
        //     itemIds: [ "0xf5009a83ca08337649b310bfcaeae003ea05e8ecb00430ba98d09ded96c985d3" ] },
        // { auctionId: "0x47239f026a58e2e2b9be17ed21154630d9336b6ed62b40f1b3b6068a517c18c2",
        //     itemIds: [ "0xdec0a064bd855248dc5db10a2d11defb085500f6e0945e8d50c16854a337d0f9" ] },
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
            return auctionAndItemIds.map(({ auctionId, itemIds }) => {
                const auction = auctions.get(auctionId)!;
                return {
                    ...auction,
                    items: itemIds
                        .map(id => items.get(id))
                        .filter((item): item is SuiItem => item !== undefined),
                };
            });
        },
        [bidderClient],
    );

    // === html ===

    let content: React.ReactNode;
    if (auctionsWithItems.err) {
        content = <CardWithMsg>{auctionsWithItems.err}</CardWithMsg>;
    }  else if (auctionsWithItems.isLoading || auctionsWithItems.data === undefined) {
        content = <CardSpinner />;
    } else {
        content = (
            <div className="flex-grid">
                {auctionsWithItems.data.map((auctionWithItems) => (
                    <CardAuctionWithItems
                        key={auctionWithItems.id}
                        auction={auctionWithItems}
                        items={auctionWithItems.items}
                    />
                ))}
                {Array.from({ length: 3 }, (_, idx) => (
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

const SectionRecentAuctions: React.FC = () => // TODO option to hide cancelled/ended auctions
{
    // === state ===

    const { bidderClient, network } = useAppContext();
    const featuredAuctionIds = featuredAuctionAndItemIds[network].map(({ auctionId }) => auctionId);

    const recent = useFetchAndPaginate<AuctionWithItems, string|null|undefined>(
        async (cursor) => {
            // fetch recent "create auction" txs
            const recentTxs = await bidderClient.fetchTxsAdminCreatesAuction(cursor, PAGE_SIZE_RECENT);

            // filter out featured auctions and extract auction and item IDs
            const filteredTxs: typeof recentTxs.data = [];
            const auctionIds: string[] = [];
            const itemIds = new Set<string>();
            for (const tx of recentTxs.data) {
                if (featuredAuctionIds.includes(tx.auctionId)) {
                    continue;
                }
                filteredTxs.push(tx);
                auctionIds.push(tx.auctionId);
                tx.inputs.item_addrs
                    .slice(0, MAX_ITEMS_PER_AUCTION) // only visible items
                    .forEach(id => itemIds.add(id));
            }

            // fetch all auctions and items with a single RPC call
            const { auctions, items } = await bidderClient.fetchAuctionsAndItems(auctionIds, [...itemIds]);

            // collect missing item IDs (in case we couldn't get the item_addrs from the tx inputs)
            const missingItemIds = new Set<string>();
            for (const tx of filteredTxs) {
                if (tx.inputs.item_addrs.length > 0) {
                    continue;
                }
                const auction = auctions.get(tx.auctionId)!;
                auction.item_addrs
                    .slice(0, MAX_ITEMS_PER_AUCTION) // only visible items
                    .forEach(id => missingItemIds.add(id));
            }

            // fetch missing items if any
            if (missingItemIds.size > 0) {
                (await bidderClient.fetchItems([...missingItemIds]))
                    .forEach(item => items.set(item.id, item));
            }

            // prepare auctions with items
            const auctionsWithItems = filteredTxs.map(tx => {
                const auction = auctions.get(tx.auctionId)!;
                const itemAddresses = tx.inputs.item_addrs.length > 0
                    ? tx.inputs.item_addrs
                    : auction.item_addrs;

                return {
                    ...auction,
                    item_addrs: itemAddresses,
                    items: itemAddresses
                        .slice(0, MAX_ITEMS_PER_AUCTION)
                        .map(id => items.get(id))
                        .filter((item): item is SuiItem => item !== undefined)
                };
            });

            return {
                data: auctionsWithItems,
                hasNextPage: recentTxs.hasNextPage,
                nextCursor: recentTxs.nextCursor,
            };
        },
        [bidderClient],
    );

    // === html ===

    let content: React.ReactNode;
    if (recent.err) {
        content = <CardWithMsg>{recent.err}</CardWithMsg>;
    } else if (recent.isLoading && recent.page.length === 0) {
        content = <CardSpinner />;
    } else {
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
                {Array.from({ length: 3 }, (_, idx) => (
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

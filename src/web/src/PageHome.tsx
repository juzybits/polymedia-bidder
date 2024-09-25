import { AuctionObj, AuctionWithItems, SuiItem } from "@polymedia/bidder-sdk";
import { NetworkName } from "@polymedia/suitcase-core";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "./App";
import { Glitch } from "./components/Glitch";
import { CardAuctionItems, CardLoading, CardWithMsg, HeaderLabel, TopBid } from "./components/cards";
import { useFetch } from "./lib/useFetch";

const MAX_ITEMS_PER_AUCTION = 3;

const featuredAuctionAndItemIds: Record<NetworkName, { auctionId: string; itemIds: string[]; }[]> = {
    "mainnet": [],
    "testnet": [],
    "devnet": [
        {
            auctionId: "0x4c5eef05f1bb1548f9e411195f15d114814681235cd7eb1246cc2645453138dd",
            itemIds: [
                "0x009026f03a0678e7b88dcf69f07d0b1d37ae94f8b729ad3c45ccef8a147e2b2d",
                "0x8786cbab7fd8a65e421b4f1078420583898b50a600fd55478d75bbd4aea7e999",
                "0x5973f7c0f890554ded16768a9a30c509e39ffcc9f042a9852c5c609e590e33d9",
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
            const auctionsAndItems = await bidderClient.fetchAuctionsAndItems(
                auctionAndItemIds.map(({ auctionId }) => auctionId),
                auctionAndItemIds.flatMap(({ itemIds }) => itemIds),
            );
            return auctionsAndItems.auctions.map(auction => ({
                ...auction,
                items: auctionsAndItems.items.filter(item => auction.item_addrs.includes(item.id))
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
            <div className="section-title">
                Featured auctions
            </div>
            {content}
        </div>
    );
};

const SectionRecentAuctions: React.FC = () =>
{
    // === state ===

    const { bidderClient } = useAppContext();

    const { data: auctionsWithItems, error: errFetchRecent } = useFetch<AuctionWithItems[]>(
        async () => {
            // fetch recent "create auction" txs
            const recentTxs = await bidderClient.fetchTxsAdminCreatesAuction(null, 12);
            const auctionIds = recentTxs.data.map(tx => tx.auctionId);
            const itemIds = new Set(
                recentTxs.data.flatMap(tx => tx.inputs.item_addrs.slice(0, MAX_ITEMS_PER_AUCTION))
            );

            // fetch all auctions and items with a single RPC call
            const auctionsAndItems = await bidderClient.fetchAuctionsAndItems(auctionIds, [...itemIds]);
            return auctionsAndItems.auctions.map(auction => ({
                ...auction,
                items: auctionsAndItems.items.filter(item => auction.item_addrs.includes(item.id))
            }));
        },
        [bidderClient],
    );

    // === html ===

    let content: React.ReactNode;
    if (errFetchRecent) {
        content = <CardWithMsg>{errFetchRecent}</CardWithMsg>;
    } else if (auctionsWithItems === undefined) {
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
            <div className="section-title">
                Recent auctions
            </div>
            {content}
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

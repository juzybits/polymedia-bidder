import { AuctionObj, objResToSuiItem, SuiItem, TxAdminCreatesAuction, TxAnyoneBids } from "@polymedia/auction-sdk";
import { useCoinMeta } from "@polymedia/coinmeta-react";
import { balanceToString, ObjectDisplay, shortenAddress } from "@polymedia/suitcase-core";
import { LinkToPolymedia } from "@polymedia/suitcase-react";
import React, { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AppContext } from "../App";
import { IconCheck } from "./icons";

export const CardSuiItem: React.FC<{
    item: SuiItem;
    isChosen?: boolean;
    extra?: React.ReactNode;
    onClick?: () => void;
}> = ({
    item,
    isChosen = false,
    extra = null,
    onClick = undefined,
}) =>
{
    const imgSrc = item.display.image_url ?? svgNoImage;
    const imgClass = (!item.display.image_url || item.type === "_placeholder_") ? "no-image" : "";
    return <div className="sui-item" onClick={onClick}>
        <div className="item-img">
            <img src={imgSrc} className={imgClass}/>
            {isChosen && <IconCheck className="item-chosen icon" /> }
        </div>
        <div className="item-info">
            <div className="item-title break-word">
                {item.nameShort ? item.nameShort : shortenAddress(item.type)}
            </div>
            {extra}
        </div>
    </div>;
}

export const CardAuctionItems: React.FC<{
    auction: AuctionObj;
}> = ({
    auction,
}) =>
{
    const { network, auctionClient } = useOutletContext<AppContext>();

    const [ items, setItems ] = useState<SuiItem[]>(
        auction.item_addrs.map(addr => newItemPlaceholder(addr))
    );

    // === functions ===

    const fetchItems = async () => {
        const objs = await auctionClient.suiClient.multiGetObjects({
            ids: auction.item_addrs,
            options: { showContent: true, showDisplay: true },
        });
        const items = objs.map(obj => objResToSuiItem(obj));
        setItems(items);
    };

    // === effects ===
    useEffect(() => {
        fetchItems();
    }, [auction.item_addrs, network]);

    // === html ===

    const beginTime = new Date(auction.begin_time_ms).toLocaleString();
    const endTime = new Date(auction.end_time_ms).toLocaleString();

    return (
        <div className="auction-card card">

            {/* <div className="auction-title">
                <h3>{auction.name}</h3>
            </div>

            {auction.description.length > 0 &&
            <div className="auction-description">
                <p>{auction.description}</p>
            </div>} */}

            <div className="grid">
                {items.map((item, idx) => (
                    <div className="grid-item card" key={idx}>
                        <CardSuiItem item={item} />
                    </div>
                ))}
            </div>
        </div>
    );

    /*
    return <div className="auction-card card">
        <h3>"{auction.name}"</h3>
        <div>Description: {auction.description}</div>
        <div>Auction ID: <LinkToPolymedia addr={auction.id} kind="object" network={network} /></div>
        <div>Item Addresses ({auction.item_addrs.length}): {auction.item_addrs.map((addr, index) =>
            <React.Fragment key={index}>
                {index > 0 && ", "}
                <LinkToPolymedia key={addr} addr={addr} kind="object" network={network} />
            </React.Fragment>
        )}</div>
        <div>Item Bag ({auction.item_bag.size}): <LinkToPolymedia addr={auction.item_bag.id} kind="object" network={network} /></div>
        <div>Admin: <LinkToPolymedia addr={auction.admin_addr} kind="address" network={network} /></div>
        <div>Payment Recipient: <LinkToPolymedia addr={auction.pay_addr} kind="address" network={network} /></div>
        <div>Current Leader: <LinkToPolymedia addr={auction.lead_addr} kind="address" network={network} /></div>
        <div>Current Highest Bid: <Balance balance={auction.lead_value} coinType={auction.type_coin} /></div>
        <div>Start Time: {beginTime}</div>
        <div>End Time: {endTime}</div>
        <div>Minimum Bid: <Balance balance={auction.minimum_bid} coinType={auction.type_coin} /></div>
        <div>Minimum Increase: {auction.minimum_increase_bps / 100}%</div>
        <div>Extension Period: {auction.extension_period_ms / 1000 / 60} minutes</div>
        <div>Status: {auction.is_live ? "Live" : "Ended"}</div>
        <div><Link to={`/auction/${auction.id}`} className="btn">VIEW</Link></div>
    </div>;
    */
};

export const CardTransaction: React.FC<{
    tx: TxAdminCreatesAuction | TxAnyoneBids;
}> = ({
    tx,
}) => {
    return <div className="card">
        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {JSON.stringify(tx, null, 2)}
        </div>
    </div>;
};

export const CardTxAdminCreatesAuction: React.FC<{
    tx: TxAdminCreatesAuction;
}> = ({
    tx,
}) =>
{
    const { network } = useOutletContext<AppContext>();
    return (
        <div className="card auction-card">
            <div>auctionId: <LinkToPolymedia addr={tx.auctionId} kind="object" network={network} /></div>
            <div>type_coin: {tx.inputs.type_coin}</div>
            <div>name: {tx.inputs.name}</div>
            <div>description: {tx.inputs.description}</div>
            <div>pay_addr: <LinkToPolymedia addr={tx.inputs.pay_addr} kind="address" network={network} /></div>
            <div>begin_delay_ms: {tx.inputs.begin_delay_ms}</div>
            <div>duration_ms: {tx.inputs.duration_ms}</div>
            <div>minimum_bid: <Balance balance={tx.inputs.minimum_bid} coinType={tx.inputs.type_coin} /></div>
            <div>minimum_increase_bps: {tx.inputs.minimum_increase_bps}</div>
            <div>extension_period_ms: {tx.inputs.extension_period_ms}</div>
            <div>sender: <LinkToPolymedia addr={tx.sender} kind="address" network={network} /></div>
            <div><Link to={`/auction/${tx.auctionId}`} className="btn">VIEW</Link></div>
        </div>
    );
};

export const Balance: React.FC<{
    balance: bigint;
    coinType: string;
}> = ({
    balance,
    coinType,
}) =>
{
    const { auctionClient } = useOutletContext<AppContext>();

    const { coinMeta, isLoadingCoinMeta, errorCoinMeta } = useCoinMeta(auctionClient.suiClient, coinType);

    return isLoadingCoinMeta
        ? "Loading..."
        : (
            (!coinMeta || errorCoinMeta)
            ? "Unknown"
            : `${balanceToString(balance, coinMeta.decimals)} ${coinMeta.symbol}`
        );
};

// === helpers ===

export function newEmptyDisplay(): ObjectDisplay { // TODO: import from @polymedia/suitcase-core
    return {
        name: null,
        description: null,
        link: null,
        image_url: null,
        thumbnail_url: null,
        project_name: null,
        project_url: null,
        project_image_url: null,
        creator: null,
    };
}

export function newItemPlaceholder(addr: string): SuiItem {
    const display = newEmptyDisplay();
    display.image_url = svgNoImage; // TODO: use "Loading..." image
    return {
        id: addr,
        type: "_placeholder_",
        display,
        fields: {},
        hasPublicTransfer: true,
        nameFull: addr,
        nameShort: shortenAddress(addr),
        desc: "",
    };
}

// === placeholder images ===

const svgNoImage = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m4.75 16 2.746-3.493a2 2 0 0 1 3.09-.067L13 15.25m-2.085-2.427c1.037-1.32 2.482-3.188 2.576-3.31a2 2 0 0 1 3.094-.073L19 12.25m-12.25 7h10.5a2 2 0 0 0 2-2V6.75a2 2 0 0 0-2-2H6.75a2 2 0 0 0-2 2v10.5a2 2 0 0 0 2 2Z"></path></svg>');

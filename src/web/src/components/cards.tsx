import { AuctionObj, SuiItem, TxAdminCreatesAuction, TxAnyoneBids } from "@polymedia/auction-sdk";
import { useCoinMeta } from "@polymedia/coinmeta-react";
import { balanceToString, newEmptyDisplay, ObjectDisplay, shortenAddress } from "@polymedia/suitcase-core";
import { LinkToPolymedia } from "@polymedia/suitcase-react";
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { AppContext } from "../App";
import { timeAgo } from "../lib/time";
import { IconCheck } from "./icons";

// === cards ===

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
    return (
        <div className="sui-item" onClick={onClick}>
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
        </div>
    );
};

export const CardAuctionDetails: React.FC<{
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
        <div>Auctioned items: <ObjectLinkList ids={auction.item_addrs} /></div>
        <div>Item bag: <LinkToPolymedia addr={auction.item_bag.id} kind="object" network={network} /> ({auction.item_bag.size} items)</div>
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
    </>;
};

export const CardTransaction: React.FC<{
    tx: TxAdminCreatesAuction | TxAnyoneBids;
}> = ({
    tx,
}) =>
{
    if (tx.kind === "admin_creates_auction") {
        return <CardTxAdminCreatesAuctionFull tx={tx} />;
    }
    if (tx.kind === "anyone_bids") {
        return <CardTxAnyoneBids tx={tx} />;
    }
    return <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
        {JSON.stringify(tx, null, 2)}
    </div>
};

export const CardTxAdminCreatesAuctionShort: React.FC<{
    tx: TxAdminCreatesAuction;
}> = ({
    tx,
}) =>
{
    return (
        <Link to={`/auction/${tx.auctionId}`} className="card link">
            <div>
                <span className="label">{timeAgo(tx.timestamp)} ago</span>
            </div>
            <div>Name: {tx.inputs.name}</div>
            {tx.inputs.description.length > 0 && <div>Description: {tx.inputs.description}</div>}
            <CardAuctionItems item_addrs={tx.inputs.item_addrs} />
        </Link>
    );
};

export const CardAuctionItems: React.FC<{
    item_addrs: string[];
}> = ({
    item_addrs,
}) =>
{
    // === state ===

    const { network, auctionClient } = useOutletContext<AppContext>();

    const [ items, setItems ] = useState<SuiItem[]>(
        item_addrs.map(addr => newItemPlaceholder(addr))
    );

    // === effects ===

    useEffect(() => {
        fetchItems();
    }, [item_addrs, network]);

    // === functions ===

    const fetchItems = async () => {
        try {
            const newItems = await auctionClient.fetchItems(item_addrs);
            setItems(newItems);
        } catch (err) {
            console.warn("[fetchItems]", err);
        }
    };

    return (
        <div className="grid">
            {items.map((item, idx) => (
                <div className="grid-item card" key={idx}>
                    <CardSuiItem item={item} />
                </div>
            ))}
        </div>
    );
};

export const CardTxAdminCreatesAuctionFull: React.FC<{
    tx: TxAdminCreatesAuction;
}> = ({
    tx,
}) =>
{
    const { network } = useOutletContext<AppContext>();
    return <>
        <div>digest: <LinkToPolymedia addr={tx.digest} kind="txblock" network={network} /></div>
        <div>timestamp: {msToDate(tx.timestamp)}</div>
        <div>sender: <LinkToPolymedia addr={tx.sender} kind="address" network={network} /></div>
        <div>auctionId: <LinkToPolymedia addr={tx.auctionId} kind="object" network={network} /></div>
        <div>type_coin: <LinkToPolymedia addr={tx.inputs.type_coin} kind="coin" network={network} /></div>
        <div>name: {tx.inputs.name}</div>
        <div>description: {tx.inputs.description}</div>
        <div>pay_addr: <LinkToPolymedia addr={tx.inputs.pay_addr} kind="address" network={network} /></div>
        <div>begin_delay_ms: {msToHours(tx.inputs.begin_delay_ms)}</div>
        <div>duration_ms: {msToHours(tx.inputs.duration_ms)}</div>
        <div>minimum_bid: <Balance balance={tx.inputs.minimum_bid} coinType={tx.inputs.type_coin} /></div>
        <div>minimum_increase_bps: {bpsToPct(tx.inputs.minimum_increase_bps)}</div>
        <div>extension_period_ms: {msToMinutes(tx.inputs.extension_period_ms)}</div>
        <div>item_addrs: <ObjectLinkList ids={tx.inputs.item_addrs} /></div>
        <div><Link to={`/auction/${tx.auctionId}`} className="btn">VIEW</Link></div>
    </>;
};

export const CardTxAnyoneBids: React.FC<{
    tx: TxAnyoneBids;
}> = ({
    tx,
}) => {
    const { network } = useOutletContext<AppContext>();
    return <>
        <div>digest: <LinkToPolymedia addr={tx.digest} kind="txblock" network={network} /></div>
        <div>timestamp: {msToDate(tx.timestamp)}</div>
        <div>sender: <LinkToPolymedia addr={tx.sender} kind="address" network={network} /></div>
        <div>type_coin: <LinkToPolymedia addr={tx.inputs.type_coin} kind="coin" network={network} /></div>
        <div>auction_id: <LinkToPolymedia addr={tx.inputs.auction_id} kind="object" network={network} /></div>
        <div>amount: <Balance balance={tx.inputs.amount} coinType={tx.inputs.type_coin} /></div>
    </>;
};

// === smaller components ===

export const Balance: React.FC<{
    balance: bigint;
    coinType: string;
}> = ({
    balance,
    coinType,
}) =>
{
    const { auctionClient } = useOutletContext<AppContext>();

    const { coinMeta, errorCoinMeta } = useCoinMeta(auctionClient.suiClient, coinType);

    return coinMeta === undefined
        ? "Loading..."
        : (
            (!coinMeta || errorCoinMeta)
            ? "Unknown"
            : `${balanceToString(balance, coinMeta.decimals)} ${coinMeta.symbol}`
        );
};

export const ObjectLinkList: React.FC<{
    ids: string[];
}> = ({
    ids,
}) => {
    const { network } = useOutletContext<AppContext>();
    return <>{ids.map((id, idx) => (
        <React.Fragment key={idx}>
            {idx > 0 && ", "}
            <LinkToPolymedia addr={id} kind="object" network={network} />
        </React.Fragment>
    ))}</>;
};

export const CardLoading: React.FC = () => {
    return <CardWithMsg>Loading...</CardWithMsg>;
};

export const CardWithMsg: React.FC<{
    children: React.ReactNode;
}> = ({
    children,
}) => {
    return <div className="card">
        <FullCardMsg>
            {children}
        </FullCardMsg>
    </div>;
};

export const FullCardMsg: React.FC<{
    children: React.ReactNode;
}> = ({
    children,
}) => {
    return <div className="full-card-message">
        <div className="msg">
            {children}
        </div>
    </div>;
};

// === formatters ===

export const ONE_HOUR_MS = 3_600_000;
export const ONE_MINUTE_MS = 60_000;

export const msToHours = (ms: number): string => {
    return `${ms / ONE_HOUR_MS} hours`;
};

export const msToMinutes = (ms: number): string => {
    return `${ms / ONE_MINUTE_MS} minutes`;
};

export const msToDate = (ms: number): string => {
    return new Date(ms).toLocaleString();
};

export const bpsToPct = (bps: number): string => {
    return `${bps / 100}%`;
};

// === helpers ===

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

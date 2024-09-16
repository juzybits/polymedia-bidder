import { AuctionObj, SuiItem, svgNoImage } from "@polymedia/bidder-sdk";
import { useCoinMeta } from "@polymedia/coinmeta-react";
import { formatBalance, shortenAddress } from "@polymedia/suitcase-core";
import { LinkToPolymedia } from "@polymedia/suitcase-react";
import React from "react";
import { useOutletContext } from "react-router-dom";
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
                <div className="item-title break-any">
                    {item.nameShort ? item.nameShort : shortenAddress(item.type)}
                </div>
                {extra}
            </div>
        </div>
    );
};

const CardSuiItemHiddenCount: React.FC<{
    hiddenItemCount: number;
}> = ({
    hiddenItemCount,
}) => {
    return <div className="sui-item">
        <div className="item-img">
            <div>
                {hiddenItemCount} more item{hiddenItemCount > 1 ? "s" : ""}…
            </div>
        </div>
    </div>;
};

export const CardAuctionItems: React.FC<{
    items: SuiItem[];
    hiddenItemCount: number;
}> = ({
    items,
    hiddenItemCount,
}) =>
{
    return (
        <div className="grid">
            {items.map((item, idx) => (
                <div className="grid-item card" key={idx}>
                    <CardSuiItem item={item} />
                </div>
            ))}
            {hiddenItemCount > 0 &&
                <div className="grid-item card">
                    <CardSuiItemHiddenCount hiddenItemCount={hiddenItemCount} />
                </div>
            }
        </div>
    );
};

// === smaller components ===

export const HeaderLabel: React.FC<{
    auction: AuctionObj;
}> = ({
    auction,
}) => {
/*
{(() => {
    if (auction.is_cancelled) { return "CANCELLED"; }
    if (!auction.has_started) { return `STARTS IN ${timeAgo(auction.begin_time_ms)}`; }
    if (auction.has_ended) { return "ENDED"; }
    if (auction.is_live) { return "LIVE"; }
    return "???"; // should never happen
})()}
*/
    let text = "";
    let labelClass = "";
    if (auction.is_cancelled) { text = "CANCELLED"; labelClass = "cancelled"; }
    else if (!auction.has_started) { text = `STARTS IN ${timeAgo(auction.begin_time_ms)}`; labelClass = "soon"; }
    else if (auction.has_ended) { text = "ENDED"; labelClass = "ended"; }
    else if (auction.is_live) { text = "LIVE"; labelClass = "live"; }
    else { text = "???"; }

    return <div className={`header-label ${labelClass}`}>
        {text}
    </div>;
};

export const Balance: React.FC<{
    balance: bigint;
    coinType: string;
}> = ({
    balance,
    coinType,
}) =>
{
    const { bidderClient } = useOutletContext<AppContext>();

    const { coinMeta, errorCoinMeta } = useCoinMeta(bidderClient.suiClient, coinType);

    return coinMeta === undefined
        ? "Loading..."
        : (
            (!coinMeta || errorCoinMeta)
            ? "Unknown"
            : `${formatBalance(balance, coinMeta.decimals)} ${coinMeta.symbol}`
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

// == dev ===

// export const CardAuctionDetailsDev: React.FC<{
//     auction: AuctionObj;
// }> = ({
//     auction,
// }) => {
//     const { network } = useOutletContext<AppContext>();
//     return <>
//         <div>Auction: <LinkToPolymedia addr={auction.id} kind="object" network={network} /></div>
//         <div>Currency: <LinkToPolymedia addr={auction.type_coin} kind="coin" network={network} /></div>
//         {/* <div>Name: {auction.name}</div>
//         <div>Description: {auction.description}</div> */}
//         <div>Auctioned items: <ObjectLinkList ids={auction.item_addrs} /></div>
//         <div>Item bag: <LinkToPolymedia addr={auction.item_bag.id} kind="object" network={network} /> ({auction.item_bag.size} items)</div>
//         <div>Admin address: <LinkToPolymedia addr={auction.admin_addr} kind="address" network={network} /></div>
//         <div>Payment address: <LinkToPolymedia addr={auction.pay_addr} kind="address" network={network} /></div>
//         <div>Leader address: <LinkToPolymedia addr={auction.lead_addr} kind="address" network={network} /></div>
//         <div>Leader amount: <Balance balance={auction.lead_value} coinType={auction.type_coin} /></div>
//         <div>Start time: {msToDate(auction.begin_time_ms)}</div>
//         <div>End time: {msToDate(auction.end_time_ms)}</div>
//         <div>Minimum bid allowed: <Balance balance={auction.minimum_bid} coinType={auction.type_coin} /></div>
//         <div>Minimum bid increase: {bpsToPct(auction.minimum_increase_bps)}</div>
//         <div>Extension period: {msToMinutes(auction.extension_period_ms) }</div>
//         <div>Is live: {auction.is_live ? "yes" : "no"}</div>
//         <div>Has ended: {auction.has_ended ? "yes" : "no"}</div>
//     </>;
// };

// export const CardTxAnyoneBidsDev: React.FC<{
//     tx: TxAnyoneBids;
// }> = ({
//     tx,
// }) => {
//     const { network } = useOutletContext<AppContext>();
//     return <>
//         <div>digest: <LinkToPolymedia addr={tx.digest} kind="txblock" network={network} /></div>
//         <div>timestamp: {msToDate(tx.timestamp)}</div>
//         <div>sender: <LinkToPolymedia addr={tx.sender} kind="address" network={network} /></div>
//         <div>type_coin: <LinkToPolymedia addr={tx.inputs.type_coin} kind="coin" network={network} /></div>
//         <div>auction_addr: <LinkToPolymedia addr={tx.inputs.auction_addr} kind="object" network={network} /></div>
//         <div>amount: <Balance balance={tx.inputs.amount} coinType={tx.inputs.type_coin} /></div>
//     </>;
// };

// export const CardTxAdminCreatesAuctionDev: React.FC<{
//     tx: TxAdminCreatesAuction;
// }> = ({
//     tx,
// }) =>
// {
//     const { network } = useOutletContext<AppContext>();
//     return <>
//         <div>digest: <LinkToPolymedia addr={tx.digest} kind="txblock" network={network} /></div>
//         <div>timestamp: {msToDate(tx.timestamp)}</div>
//         <div>sender: <LinkToPolymedia addr={tx.sender} kind="address" network={network} /></div>
//         <div>auctionId: <LinkToPolymedia addr={tx.auctionId} kind="object" network={network} /></div>
//         <div>type_coin: <LinkToPolymedia addr={tx.inputs.type_coin} kind="coin" network={network} /></div>
//         <div>name: {tx.inputs.name}</div>
//         <div>description: {tx.inputs.description}</div>
//         <div>pay_addr: <LinkToPolymedia addr={tx.inputs.pay_addr} kind="address" network={network} /></div>
//         <div>begin_delay_ms: {msToHours(tx.inputs.begin_delay_ms)}</div>
//         <div>duration_ms: {msToHours(tx.inputs.duration_ms)}</div>
//         <div>minimum_bid: <Balance balance={tx.inputs.minimum_bid} coinType={tx.inputs.type_coin} /></div>
//         <div>minimum_increase_bps: {bpsToPct(tx.inputs.minimum_increase_bps)}</div>
//         <div>extension_period_ms: {msToMinutes(tx.inputs.extension_period_ms)}</div>
//         <div>item_addrs: <ObjectLinkList ids={tx.inputs.item_addrs} /></div>
//         <div><Link to={`/auction/${tx.auctionId}`} className="btn">VIEW</Link></div>
//     </>;
// };

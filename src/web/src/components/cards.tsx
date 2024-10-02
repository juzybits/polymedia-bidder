import { AuctionObj, SuiItem, svgNoImage } from "@polymedia/bidder-sdk";
import { useCoinMeta } from "@polymedia/coinmeta-react";
import { formatBalance, formatTimeDiff, shortenAddress, urlToDomain } from "@polymedia/suitcase-core";
import { LinkExternal, LinkToExplorer } from "@polymedia/suitcase-react";
import React from "react";
import { useAppContext } from "../App";
import { isVerifiedItem } from "../lib/verified";
import { IconCheck, IconVerified } from "./icons";

// === cards ===

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

export const CardSuiItem: React.FC<{
    item: SuiItem;
    isChosen?: boolean;
    verbose?: boolean;
    extra?: React.ReactNode;
    onClick?: () => void;
}> = ({
    item,
    isChosen = false,
    verbose = false,
    extra = null,
    onClick = undefined,
}) =>
{
    const { explorer, network } = useAppContext();

    const verified = isVerifiedItem(network, item.type);
    const imgSrc = item.display.image_url ?? svgNoImage;
    const imgClass = (!item.display.image_url || item.type === "_placeholder_") ? "no-image" : "";
    return (
        <div className="sui-item" onClick={onClick}>
            <div className="item-img">
                <img src={imgSrc} className={imgClass}/>
                {!verbose && (
                    isChosen ? <IconCheck className="item-chosen icon" />
                    : verified && <IconVerified className="item-verified icon" />
                )}
            </div>
            <div className="item-info">
                <div className="item-title break-any">
                    {!verbose && (item.nameShort ? item.nameShort : shortenAddress(item.type))}
                    {verbose &&
                    <div className="card-details">
                        {verified &&
                        <div className="detail">
                            <span className="label">Verified:</span>
                            <span className="value"><IconVerified className="item-verified icon" />{verified.name}</span>
                        </div>}
                        <div className="detail">
                            <span className="label">ID:</span>
                            <LinkToExplorer addr={item.id} kind="object" explorer={explorer} network={network} />
                        </div>
                        <div className="detail">
                            <span className="label">Type:</span>
                            <LinkToExplorer addr={item.type.split("::")[0]} kind="package" explorer={explorer} network={network}>
                                {shortenAddress(item.type)}
                            </LinkToExplorer>
                        </div>
                        {item.nameFull &&
                        <div className="detail">
                            <span className="label">Name:</span>
                            {item.nameFull}
                        </div>}
                        {/* {item.nameShort &&
                        <div className="detail">
                            <span className="label">Short Name:</span>
                            {item.nameShort}
                        </div>} */}
                        {item.display.description &&
                        <div className="detail">
                            <span className="label">Description:</span>
                            {item.display.description}
                        </div>}
                        {/* {item.display.name &&
                        <div className="detail">
                            <span className="label">Display name:</span>
                            {item.display.name}
                        </div>} */}
                        {item.display.link &&
                        <div className="detail">
                            <span className="label">Object link:</span>
                            <LinkExternal href={item.display.link}>
                                {urlToDomain(item.display.link)}
                            </LinkExternal>
                        </div>}
                        {item.display.project_name &&
                        <div className="detail">
                            <span className="label">Project name:</span>
                            {item.display.project_name}
                        </div>}
                        {item.display.project_url &&
                        <div className="detail">
                            <span className="label">Project URL:</span>
                            <LinkExternal href={item.display.project_url}>
                                {urlToDomain(item.display.project_url)}
                            </LinkExternal>
                        </div>}
                        {item.display.creator &&
                        <div className="detail">
                            <span className="label">Creator:</span>
                            {item.display.creator}
                        </div>}
                        {/* {item.hasPublicTransfer &&
                        <div className="detail">
                            <span className="label">Public Transfer:</span>
                            {item.hasPublicTransfer ? "Yes" : "No"}
                        </div>} */}
                    </div>}
                </div>
                {extra}
            </div>
        </div>
    );
};

export const CardAuctionItems: React.FC<{
    items: SuiItem[];
    hiddenItemCount: number;
}> = ({
    items,
    hiddenItemCount,
}) =>
{
    const { setModalContent } = useAppContext();

    const showItemModal = (e: React.MouseEvent<HTMLDivElement>, item: SuiItem) => {
        e.preventDefault();
        setModalContent(<CardSuiItem item={item} verbose={true} />);
    };

    return <>
        <div className="grid">
            {items.map((item, idx) => (
                <div className="card grid-item" key={idx} onClick={(e) => showItemModal(e, item)}>
                    <CardSuiItem item={item} />
                </div>
            ))}
            {hiddenItemCount > 0 &&
                <div className="card grid-item">
                    <CardSuiItemHiddenCount hiddenItemCount={hiddenItemCount} />
                </div>
            }
        </div>
    </>;
};

// === smaller components ===

export const HeaderLabel: React.FC<{
    auction: AuctionObj;
}> = ({
    auction,
}) => {
    let text = "";
    let labelClass = "";
    if (auction.is_cancelled) { text = "CANCELLED"; labelClass = "cancelled"; }
    else if (!auction.has_started) { text = `⏳ ${formatTimeDiff(auction.begin_time_ms)}`; labelClass = "soon"; }
    else if (auction.has_ended) { text = "ENDED"; labelClass = "ended"; }
    else if (auction.is_live) { text = "LIVE"; labelClass = "live"; }
    else { text = "???"; }

    return <div className={`header-label ${labelClass}`}>
        {text}
    </div>;
};

export const TopBid: React.FC<{
    auction: AuctionObj;
    balance?: bigint;
}> = ({
    auction,
    balance = (auction.has_ended && auction.has_balance) ? auction.lead_value : auction.minimum_bid,
}) => {
    return <div className="header-label top-bid">
        <Balance
            balance={balance}
            coinType={auction.type_coin}
        />
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
    const { bidderClient } = useAppContext();

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
    const { explorer, network } = useAppContext();
    return <>{ids.map((id, idx) => (
        <React.Fragment key={idx}>
            {idx > 0 && ", "}
            <LinkToExplorer addr={id} kind="object" explorer={explorer} network={network} />
        </React.Fragment>
    ))}</>;
};

// export const CardLoading: React.FC = () => {
//     return <CardWithMsg>Loading...</CardWithMsg>;
// };

export const CardSpinner: React.FC = () => {
    return <div className="card">
        <FullCardMsg>
            <div className="card-spinner" />
        </FullCardMsg>
    </div>;
};

export const CardWithMsg: React.FC<{
    className?: string;
    children: React.ReactNode;
}> = ({
    className,
    children,
}) => {
    return <div className={`card break-any ${className ?? ""}`}>
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
//     const { network } = useAppContext();
//     return <>
//         <div>Auction: <LinkToExplorer addr={auction.id} kind="object" network={network} /></div>
//         <div>Currency: <LinkToExplorer addr={auction.type_coin} kind="coin" network={network} /></div>
//         {/* <div>Name: {auction.name}</div>
//         <div>Description: {auction.description}</div> */}
//         <div>Auctioned items: <ObjectLinkList ids={auction.item_addrs} /></div>
//         <div>Item bag: <LinkToExplorer addr={auction.item_bag.id} kind="object" network={network} /> ({auction.item_bag.size} items)</div>
//         <div>Admin address: <LinkToExplorer addr={auction.admin_addr} kind="address" network={network} /></div>
//         <div>Payment address: <LinkToExplorer addr={auction.pay_addr} kind="address" network={network} /></div>
//         <div>Leader address: <LinkToExplorer addr={auction.lead_addr} kind="address" network={network} /></div>
//         <div>Leader amount: <Balance balance={auction.lead_value} coinType={auction.type_coin} /></div>
//         <div>Start time: {msToDate(auction.begin_time_ms)}</div>
//         <div>End time: {msToDate(auction.end_time_ms)}</div>
//         <div>Minimum bid allowed: <Balance balance={auction.minimum_bid} coinType={auction.type_coin} /></div>
//         <div>Minimum bid increase: {bpsToPct(auction.minimum_increase_bps)}</div>
//         <div>Extension period: {msToTime(auction.extension_period_ms) }</div>
//         <div>Is live: {auction.is_live ? "yes" : "no"}</div>
//         <div>Has ended: {auction.has_ended ? "yes" : "no"}</div>
//     </>;
// };

// export const CardTxAnyoneBidsDev: React.FC<{
//     tx: TxAnyoneBids;
// }> = ({
//     tx,
// }) => {
//     const { network } = useAppContext();
//     return <>
//         <div>digest: <LinkToExplorer addr={tx.digest} kind="txblock" network={network} /></div>
//         <div>timestamp: {msToDate(tx.timestamp)}</div>
//         <div>sender: <LinkToExplorer addr={tx.sender} kind="address" network={network} /></div>
//         <div>type_coin: <LinkToExplorer addr={tx.inputs.type_coin} kind="coin" network={network} /></div>
//         <div>auction_addr: <LinkToExplorer addr={tx.inputs.auction_addr} kind="object" network={network} /></div>
//         <div>amount: <Balance balance={tx.inputs.amount} coinType={tx.inputs.type_coin} /></div>
//     </>;
// };

// export const CardTxAdminCreatesAuctionDev: React.FC<{
//     tx: TxAdminCreatesAuction;
// }> = ({
//     tx,
// }) =>
// {
//     const { network } = useAppContext();
//     return <>
//         <div>digest: <LinkToExplorer addr={tx.digest} kind="txblock" network={network} /></div>
//         <div>timestamp: {msToDate(tx.timestamp)}</div>
//         <div>sender: <LinkToExplorer addr={tx.sender} kind="address" network={network} /></div>
//         <div>auctionId: <LinkToExplorer addr={tx.auctionId} kind="object" network={network} /></div>
//         <div>type_coin: <LinkToExplorer addr={tx.inputs.type_coin} kind="coin" network={network} /></div>
//         <div>name: {tx.inputs.name}</div>
//         <div>description: {tx.inputs.description}</div>
//         <div>pay_addr: <LinkToExplorer addr={tx.inputs.pay_addr} kind="address" network={network} /></div>
//         <div>begin_delay_ms: {msToHours(tx.inputs.begin_delay_ms)}</div>
//         <div>duration_ms: {msToHours(tx.inputs.duration_ms)}</div>
//         <div>minimum_bid: <Balance balance={tx.inputs.minimum_bid} coinType={tx.inputs.type_coin} /></div>
//         <div>minimum_increase_bps: {bpsToPct(tx.inputs.minimum_increase_bps)}</div>
//         <div>extension_period_ms: {msToTime(tx.inputs.extension_period_ms)}</div>
//         <div>item_addrs: <ObjectLinkList ids={tx.inputs.item_addrs} /></div>
//         <div><Link to={`/auction/${tx.auctionId}/items`} className="btn">VIEW</Link></div>
//     </>;
// };

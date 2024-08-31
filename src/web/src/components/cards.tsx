import { AuctionObj, TxAdminCreatesAuction } from "@polymedia/auction-sdk";
import { useCoinMeta } from "@polymedia/coinmeta-react";
import { balanceToString, shortenAddress } from "@polymedia/suitcase-core";
import { LinkToPolymedia } from "@polymedia/suitcase-react";
import React from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AppContext } from "../App";
import { SuiItem } from "../lib/items";
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
    return <div className="sui-obj" onClick={onClick}>
        <div className="obj-img">
            <img src={item.display.image_url ?? svgNoImage} className={item.display.image_url ? "" : "no-image"}/>
            {isChosen && <IconCheck className="obj-chosen icon" /> }
        </div>
        <div className="obj-info">
            <div className="obj-title break-word">
                {item.nameShort ? item.nameShort : shortenAddress(item.type)}
            </div>
            {extra}
        </div>
    </div>;
}

export const CardAuction: React.FC<{
    auction: AuctionObj;
}> = ({
    auction,
}) =>
{
    const { network } = useOutletContext<AppContext>();

    const beginTime = new Date(auction.begin_time_ms).toLocaleString();
    const endTime = new Date(auction.end_time_ms).toLocaleString();

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

const svgNoImage = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m4.75 16 2.746-3.493a2 2 0 0 1 3.09-.067L13 15.25m-2.085-2.427c1.037-1.32 2.482-3.188 2.576-3.31a2 2 0 0 1 3.094-.073L19 12.25m-12.25 7h10.5a2 2 0 0 0 2-2V6.75a2 2 0 0 0-2-2H6.75a2 2 0 0 0-2 2v10.5a2 2 0 0 0 2 2Z"></path></svg>');

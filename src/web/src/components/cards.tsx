import { AuctionObj, TxAdminCreatesAuction } from "@polymedia/auction-sdk";
import { useCoinMeta } from "@polymedia/coinmeta-react";
import { balanceToString } from "@polymedia/suitcase-core";
import { LinkToPolymedia } from "@polymedia/suitcase-react";
import React from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AppContext } from "../App";

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

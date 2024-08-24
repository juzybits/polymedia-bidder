import { AuctionObj, TxAdminCreatesAuction } from "@polymedia/auction-sdk";
import { LinkToPolymedia } from "@polymedia/suitcase-react";
import React from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "../App";

export const CardAuction: React.FC<{
    auction: AuctionObj,
}> = ({
    auction,
}) =>
{
    const { network } = useOutletContext<AppContext>();

    const beginTime = new Date(auction.begin_time_ms).toLocaleString();
    const endTime = new Date(auction.end_time_ms).toLocaleString();

    return <div className="auction-card card">
        <h3>"{auction.name}"</h3>
        <p>Description: {auction.description}</p>
        <p>Auction ID: <LinkToPolymedia addr={auction.id} kind="object" network={network} /></p>
        <p>Item Addresses ({auction.item_addrs.length}): {auction.item_addrs.map((addr, index) =>
            <React.Fragment key={index}>
                {index > 0 && ', '}
                <LinkToPolymedia key={addr} addr={addr} kind="object" network={network} />
            </React.Fragment>
        )}</p>
        <p>Item Bag ({auction.item_bag.size}): <LinkToPolymedia addr={auction.item_bag.id} kind="object" network={network} /></p>
        <p>Admin: <LinkToPolymedia addr={auction.admin_addr} kind="address" network={network} /></p>
        <p>Payment Recipient: <LinkToPolymedia addr={auction.pay_addr} kind="address" network={network} /></p>
        <p>Current Leader: <LinkToPolymedia addr={auction.lead_addr} kind="address" network={network} /></p>
        <p>Current Highest Bid: {auction.lead_value.toString()} SUI</p>
        <p>Start Time: {beginTime}</p>
        <p>End Time: {endTime}</p>
        <p>Minimum Bid: {auction.minimum_bid.toString()} SUI</p>
        <p>Minimum Increase: {auction.minimum_increase_bps / 100}%</p>
        <p>Extension Period: {auction.extension_period_ms / 1000 / 60} minutes</p>
        <p>Status: {auction.is_live ? "Live" : "Ended"}</p>
    </div>;
};

export const CardTxAdminCreatesAuction: React.FC<{
    tx: TxAdminCreatesAuction,
}> = ({
    tx,
}) =>
{
    const { network } = useOutletContext<AppContext>();
    return (
        <div className="card auction-card">
            <h3>"{tx.inputs.name}"</h3>
            <p>Type: {tx.inputs.type_coin}</p>
            <p>Description: {tx.inputs.description}</p>
            <p>Auction ID: <LinkToPolymedia addr={tx.auctionId} kind="object" network={network} /></p>
            <p>Minimum Bid: {tx.inputs.minimum_bid.toString()}</p>
            <p>Minimum Increase: {tx.inputs.minimum_increase_bps / 100}%</p>
            <p>Extension Period: {tx.inputs.extension_period_ms / 1000 / 60} minutes</p>
            <p>Creator: <LinkToPolymedia addr={tx.sender} kind="address" network={network} /></p>
        </div>
    );
};

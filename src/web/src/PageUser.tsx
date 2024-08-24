import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { AuctionObj } from "@polymedia/auction-sdk";
import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { Btn } from "./components/Btn";
import { ConnectToGetStarted } from "./components/ConnectToGetStarted";
import { LinkToPolymedia } from "@polymedia/suitcase-react";

export const PageUser: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();

    const { header } = useOutletContext<AppContext>();

    // === html ===

    return (
    <div id="page-user" className="page-regular">

        {header}

        <div className="page-content">

            <h1 className="page-title">USER</h1>

            {!currAcct
            ? <ConnectToGetStarted />
            : <>
                <div className="page-section card">
                    <div className="section-description">
                        <h2>Wallet</h2>
                    </div>
                    <SectionConnection />
                </div>

                <div className="page-section card">
                    <div className="section-description">
                        <h2>Your auctions</h2>
                    </div>
                    <SectionAuctions />
                </div>
            </>}
        </div>

    </div>
    );
};

const SectionConnection: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();
    if (!currAcct) { return; }
    const { mutate: disconnect } = useDisconnectWallet();

    // === html ===

    return <>
        <div>You are connected with address:</div>
        <div className="address">{currAcct.address}</div>
        <div>
            <Btn onClick={disconnect}>
                DISCONNECT
            </Btn>
        </div>
    </>;
};

const SectionAuctions: React.FC = () => // TODO: pagination
{
    // === state ===

    const currAcct = useCurrentAccount();
    if (!currAcct) { return; }

    const { auctionClient } = useOutletContext<AppContext>();

    const [ auctions, setAuctions ] = useState<AuctionObj[]>();

    const fetchAuctionIds = async () => {
        const newAuctions = await auctionClient.fetchCreatorAuctions(currAcct.address);
        setAuctions(newAuctions);
    };

    useEffect(() => {
        fetchAuctionIds();
    }, []);

    // === html ===

    if (auctions === undefined) {
        return <div>Loading...</div>;
    }

    return <>
        <div style={{ whiteSpace: "pre-wrap" }} className="break-all">
            {auctions.map(auction => (
                <CardAuction auction={auction} key={auction.id} />
            ))}
        </div>
    </>;
};

const CardAuction: React.FC<{
    auction: AuctionObj,
}> = ({
    auction,
}) =>
{
    const { network } = useOutletContext<AppContext>();

    const beginTime = new Date(auction.begin_time_ms).toLocaleString();
    const endTime = new Date(auction.end_time_ms).toLocaleString();

    return <div className="auction-card">
        <h3>Name: {auction.name}</h3>
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

import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { AuctionObj, UserBid } from "@polymedia/auction-sdk";
import { LinkToPolymedia } from "@polymedia/suitcase-react";
import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { ConnectToGetStarted } from "./components/ConnectToGetStarted";
import { CardAuctionItems } from "./components/cards";

export const PageHistory: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();

    const { header } = useOutletContext<AppContext>();

    // === html ===

    return <>
    {header}
    <div id="page-user" className="page-regular">


        <div className="page-content">

            <h1 className="page-title">HISTORY</h1>

            {!currAcct
            ? <ConnectToGetStarted />
            : <SectionsHistory />}
        </div>

    </div>
    </>;
};

const SectionConnection: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();
    if (!currAcct) { return; }
    const { mutate: disconnect } = useDisconnectWallet();

    // === html ===

    return <div className="card">
        <div>You are connected with address:</div>
        <div className="address">{currAcct.address}</div>
        <div>
            <button onClick={() => disconnect()} className="btn">
                DISCONNECT
            </button>
        </div>
    </div>;
};

const SectionsHistory: React.FC = () => // TODO: pagination
{
    // === state ===

    const currAcct = useCurrentAccount();
    if (!currAcct) { return; }

    const { network, auctionClient } = useOutletContext<AppContext>();

    const [ userObjId, setUserObjId ] = useState<string|null>();
    const [ userAuctions, setUserAuctions ] = useState<AuctionObj[]>();
    const [ userBids, setUserBids ] = useState<UserBid[]>();

    // === effects ===

    useEffect(() => { // TODO move to App.tsx
        fetchUserObj();
    }, [auctionClient, currAcct]);

    useEffect(() => {
        fetchAuctions();
    }, [userObjId]);

    // === functions ===

    const fetchUserObj = async () => {
        const newUserObjId = await auctionClient.fetchUserObjectId(currAcct.address);
        setUserObjId(newUserObjId);
    };

    const fetchAuctions = async () =>
    {
        if (userObjId === undefined) {
            setUserAuctions(undefined);
            setUserBids(undefined);
        } else if (userObjId === null) {
            setUserAuctions([]);
            setUserBids([]);
        } else {
            const newUserAuctions = await auctionClient.fetchUserAuctions(userObjId);
            const newUserBids = await auctionClient.fetchUserBids(userObjId);
            setUserAuctions(newUserAuctions);
            setUserBids(newUserBids);
        }
    };

    // === html ===

    if (userAuctions === undefined || userBids === undefined) {
        return <>
            <div>Loading...</div>
        </>;
    }

    return <>
        <div className="page-section">
            <div className="section-title">
                Your auctions
            </div>
            <div className="list-cards">
                {userAuctions.map(auction =>
                    <CardAuctionItems auction={auction} key={auction.id} />
                )}
            </div>
        </div>

        <div className="page-section">
            <div className="section-title">
                Your bids
            </div>
            <div className="list-cards">
                {userBids.map(bid =>
                    <div key={bid.auction_id + bid.amount} className="card">
                        <div><LinkToPolymedia addr={bid.auction_id} kind="object" network={network} /></div>
                <div>Time: {new Date(bid.time).toLocaleString()}</div>
                        <div>Amount: {bid.amount.toString()}</div> {/* TODO: fetch auction then calculate amount based on currency decimals */}
                    </div>
                )}
            </div>
        </div>
    </>;
};

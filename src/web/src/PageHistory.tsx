import { useCurrentAccount } from "@mysten/dapp-kit";
import { AuctionObj, UserBid } from "@polymedia/auction-sdk";
import { LinkToPolymedia } from "@polymedia/suitcase-react";
import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { ConnectToGetStarted } from "./components/ConnectToGetStarted";
import { CardAuctionDetails, CardAuctionItems } from "./components/cards";
import { useFetchUserId } from "./hooks/useFetchUserId";

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

const SectionsHistory: React.FC = () => // TODO: pagination
{
    // === state ===

    const currAcct = useCurrentAccount();
    if (!currAcct) { return; }

    const { network, auctionClient } = useOutletContext<AppContext>();

    const { userId, ..._user } = useFetchUserId();

    const [ userAuctions, setUserAuctions ] = useState<AuctionObj[]>();
    const [ userBids, setUserBids ] = useState<UserBid[]>();

    // === effects ===

    useEffect(() => {
        fetchAuctions();
    }, [userId]);

    // === functions ===

    const fetchAuctions = async () =>
    {
        if (userId === undefined) {
            setUserAuctions(undefined);
            setUserBids(undefined);
        } else if (userId === null) {
            setUserAuctions([]);
            setUserBids([]);
        } else {
            const newUserAuctions = await auctionClient.fetchUserAuctions(userId);
            const newUserBids = await auctionClient.fetchUserBids(userId);
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
                    <div className="card" key={auction.id}>
                        <CardAuctionDetails auction={auction} />
                    </div>
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

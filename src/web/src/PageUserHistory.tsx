import { useCurrentAccount } from "@mysten/dapp-kit";
import { AuctionObj, UserBid } from "@polymedia/auction-sdk";
import { LinkToPolymedia } from "@polymedia/suitcase-react";
import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { ConnectToGetStarted } from "./components/ConnectToGetStarted";
import { CardAuctionDetails, FullCardMsg } from "./components/cards";
import { useFetchUserId } from "./hooks/useFetchUserId";

export const PageUserHistory: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();

    const { userId, errorFetchUserId } = useFetchUserId();

    const { header } = useOutletContext<AppContext>();

    // === html ===

    let content: React.ReactNode;
    if (!currAcct) {
        content = <ConnectToGetStarted />;
    } else if (errorFetchUserId) {
        content = <div className="card"><FullCardMsg>{errorFetchUserId}</FullCardMsg></div>;
    } else if (userId === undefined) {
        content = <div className="card"><FullCardMsg>Loading...</FullCardMsg></div>;
    } else if (userId === null) {
        content = <div className="card"><FullCardMsg>Nothing yet</FullCardMsg></div>;
    } else {
        content = <SectionsHistory userId={userId} />;
    }
    return <>
        {header}
        <div id="page-user" className="page-regular">
            <div className="page-content">
                <h1 className="page-title">USER HISTORY</h1>
                {content}
            </div>
        </div>
    </>;
};

const SectionsHistory: React.FC<{
    userId: string;
}> = ({
    userId,
}) => // TODO: pagination
{
    // === state ===

    const currAcct = useCurrentAccount();
    if (!currAcct) { return; }

    const { network, auctionClient } = useOutletContext<AppContext>();

    const [ userAuctions, setUserAuctions ] = useState<AuctionObj[]>();
    const [ userBids, setUserBids ] = useState<UserBid[]>();

    // === effects ===

    useEffect(() => {
        fetchAuctions();
    }, [userId]);

    // === functions ===

    const fetchAuctions = async () =>
    {
        const newUserAuctions = await auctionClient.fetchUserAuctions(userId);
        const newUserBids = await auctionClient.fetchUserBids(userId);
        setUserAuctions(newUserAuctions);
        setUserBids(newUserBids);
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

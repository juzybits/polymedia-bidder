import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { AuctionObj } from "@polymedia/auction-sdk";
import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { Btn } from "./components/Btn";
import { ConnectToGetStarted } from "./components/ConnectToGetStarted";
import { CardAuction } from "./components/cards";

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
                <div className="page-section">
                    <div className="section-description">
                        <h2>Wallet</h2>
                    </div>
                    <SectionConnection />
                </div>

                <div className="page-section">
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

    return <div className="card">
        <div>You are connected with address:</div>
        <div className="address">{currAcct.address}</div>
        <div>
            <Btn onClick={disconnect}>
                DISCONNECT
            </Btn>
        </div>
    </div>;
};

const SectionAuctions: React.FC = () => // TODO: pagination
{
    // === state ===

    const currAcct = useCurrentAccount();
    if (!currAcct) { return; }

    const { auctionClient } = useOutletContext<AppContext>();

    const [ userObjId, setUserObjId ] = useState<string|null>();
    const [ auctions, setAuctions ] = useState<AuctionObj[]>();

    // === effects ===

    useEffect(() => { // TODO move to App.tsx
        fetchUserObj();
    }, [auctionClient, currAcct]);

    useEffect(() => {
        fetchAuctions();
    }, [userObjId]);

    // === functions ===

    const fetchUserObj = async () => {
        const newUserObj = await auctionClient.fetchUserObjectId(currAcct.address);
        setUserObjId(newUserObj);
    };

    const fetchAuctions = async () =>
    {
        if (userObjId === undefined) {
            setAuctions(undefined);
        } else if (userObjId === null) {
            setAuctions([]);
        } else {
            const newAuctions = await auctionClient.fetchCreatorAuctions(userObjId);
            setAuctions(newAuctions);
        }
    };

    // === html ===

    if (auctions === undefined) {
        return <div>Loading...</div>;
    }

    return <>
        {auctions.map(auction => (
            <CardAuction auction={auction} key={auction.id} />
        ))}
    </>;
};

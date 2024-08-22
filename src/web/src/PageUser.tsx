import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { ConnectToGetStarted } from "./components/ConnectToGetStarted";
import { Btn } from "./components/Btn";

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

    const [ auctionIds, setAuctionIds ] = useState<string[]>();

    const fetchAuctionIds = async () => {
        const newAuctionIds = await auctionClient.fetchCreatorAuctionIds(currAcct.address);
        setAuctionIds(newAuctionIds);
    };

    useEffect(() => {
        fetchAuctionIds();
    }, []);

    // === html ===

    if (auctionIds === undefined) {
        return <div>Loading...</div>;
    }

    return <>
        <div className="break-all">{JSON.stringify(auctionIds, null, 2)}</div>
    </>;
};

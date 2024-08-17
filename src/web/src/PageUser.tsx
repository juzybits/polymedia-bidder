import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import React from "react";
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
    <div className="page-regular" id="page-user">

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

                <div className="page-section card">
                    <div className="section-description">
                        <h2>Your bids</h2>
                    </div>
                    <SectionBids />
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

const SectionAuctions: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();
    if (!currAcct) { return; }

    // === html ===

    return <>
        <div>lorem</div>
        <div>ipsum</div>
        <div>dolor</div>
    </>;
};

const SectionBids: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();
    if (!currAcct) { return; }

    // === html ===

    return <>
        <div>lorem</div>
        <div>ipsum</div>
        <div>dolor</div>
    </>;
};

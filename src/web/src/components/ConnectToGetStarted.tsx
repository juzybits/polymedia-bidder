import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import React from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "../App";

export const ConnectToGetStarted: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();

    const { inProgress, openConnectModal, setShowMobileNav } = useOutletContext<AppContext>();

    // === functions ===

    const connectWallet = () => {
        currAcct ? disconnect() : openConnectModal();
        setShowMobileNav(false);
    };

    // === html ===

    return (
        <div className="page-section card">
            <div className="section-description">
                Connect your Sui wallet to get started.
            </div>
            <button className="btn" disabled={inProgress} onClick={connectWallet}>
                CONNECT
            </button>
        </div>
    );
};

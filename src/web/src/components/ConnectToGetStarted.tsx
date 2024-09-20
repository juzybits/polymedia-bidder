import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import React from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext, useAppContext } from "../App";

export const ConnectToGetStarted: React.FC = () =>
{
    return (
        <div className="page-section card">
            <div className="section-description">
                Connect your Sui wallet to get started.
            </div>
            <BtnConnect />
        </div>
    );
};

export const BtnConnect: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();

    const { isWorking, openConnectModal, setShowMobileNav } = useAppContext();

    const connectWallet = () => {
        currAcct ? disconnect() : openConnectModal();
        setShowMobileNav(false);
    };

    return (
        <button className="btn" disabled={isWorking} onClick={connectWallet}>
            CONNECT
        </button>
    );
};

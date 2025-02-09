import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import React from "react";

import { useAppContext } from "../app/context";

export const ConnectToGetStarted: React.FC = () =>
{
    return (
        <>
            <div className="card-description">
                Connect your Sui wallet to get started.
            </div>
            <BtnConnect />
        </>
    );
};

export const BtnConnect: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();

    const { isWorking, openConnectModal } = useAppContext();

    const connectWallet = () => {
        currAcct ? disconnect() : openConnectModal();
    };

    return (
        <button className="btn" disabled={isWorking} onClick={connectWallet}>
            CONNECT
        </button>
    );
};

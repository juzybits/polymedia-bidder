import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { AuctionObj, NetworkName, UserBid } from "@polymedia/auction-sdk";
import { LinkToPolymedia, NetworkSelector } from "@polymedia/suitcase-react";
import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext, networkConfig, supportedNetworks } from "./App";
import { ConnectToGetStarted } from "./components/ConnectToGetStarted";
import { CardAuction } from "./components/cards";

export const PageSettings: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();

    const { header } = useOutletContext<AppContext>();

    // === html ===

    return <>
    {header}
    <div id="page-settings" className="page-regular">


        <div className="page-content">

            <h1 className="page-title">SETTINGS</h1>

            {!currAcct
            ? <ConnectToGetStarted />
            : <>
                <SectionConnection />
                <SectionNetwork />
                <SectionRpc />
            </>}
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

    return <div className="page-section">
        <div className="section-title">
            Wallet
        </div>
        <div className="card">
            <div>You are connected with address:</div>
            <div className="address">{currAcct.address}</div>
            <div>
                <button onClick={() => disconnect()} className="btn">
                    DISCONNECT
                </button>
            </div>
        </div>
    </div>;
};

const SectionNetwork: React.FC = () => // TODO: style
{
    // === state ===

    const { inProgress, network, setNetwork } = useOutletContext<AppContext>();

    const onSwitchNetwork = (newNet: NetworkName) => {
        setNetwork(newNet);
    };

    return <div className="page-section">
        <div className="section-title">
            Network
        </div>
        <div className="card">
            <NetworkSelector
                currentNetwork={network}
                supportedNetworks={supportedNetworks}
                onSwitch={onSwitchNetwork}
                disabled={inProgress}
                id="btn-network"
            />
        </div>
    </div>;
};

const SectionRpc: React.FC = () => // TODO: selector / input
{
    // === state ===

    const { network, setNetwork } = useOutletContext<AppContext>();

    const rpcUrl = networkConfig[network].url;

    // === html ===

    return <div className="page-section">
        <div className="section-title">
            RPC
        </div>
        <div className="card">
            <div className="break-word">{rpcUrl}</div>
        </div>
    </div>;
};

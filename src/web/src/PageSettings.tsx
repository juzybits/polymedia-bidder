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
    <div id="page-user" className="page-regular">


        <div className="page-content">

            <h1 className="page-title">USER</h1>

            {!currAcct
            ? <ConnectToGetStarted />
            : <>
                <div className="page-section">
                    <SectionConnection />
                    <SectionNetwork />
                    <SectionRpc />
                </div>
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

    return <>
    <div className="section-description">
        <h2>Wallet</h2>
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
    </>;
};

const SectionNetwork: React.FC = () => // TODO: style
{
    // === state ===

    const { inProgress, network, setNetwork } = useOutletContext<AppContext>();

    const onSwitchNetwork = (newNet: NetworkName) => {
        setNetwork(newNet);
    };

    return <>
    <div className="section-description">
        <h2>Network</h2>
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
    </>;
};

const SectionRpc: React.FC = () => // TODO: selector / input
{
    // === state ===

    const { network, setNetwork } = useOutletContext<AppContext>();

    const rpcUrl = networkConfig[network].url;

    // === html ===

    return <>
    <div className="section-description">
        <h2>RPC</h2>
    </div>
    <div className="card">
        <div className="break-word">{rpcUrl}</div>
    </div>
    </>;
};

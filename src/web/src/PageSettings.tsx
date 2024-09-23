import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { NetworkSelector } from "@polymedia/suitcase-react";
import React from "react";
import { networkConfig, NetworkName, supportedNetworks, useAppContext } from "./App";
import { ConnectToGetStarted } from "./components/ConnectToGetStarted";

export const PageSettings: React.FC = () =>
{
    // === state ===

    const { header } = useAppContext();

    // === html ===

    return <>
    {header}
    <div id="page-settings" className="page-regular">

        <div className="page-content">
            <div className="page-title">SETTINGS</div>
            <SectionConnection />
            <SectionExplorer />
            <SectionRpc />
            <SectionNetwork />
        </div>

    </div>
    </>;
};

const SectionConnection: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();

    // === html ===

    return <div className="page-section">
        <div className="section-title">
            Wallet
        </div>
        {!currAcct
            ? <ConnectToGetStarted />
            : <div className="card">
                <div>You are connected with address:</div>
                <div className="address">{currAcct.address}</div>
                <div>
                    <button onClick={() => disconnect()} className="btn">
                        DISCONNECT
                        </button>
                    </div>
            </div>
        }
    </div>;
};

const SectionExplorer: React.FC = () => // TODO: radio buttons
{
    return <div className="page-section">
        <div className="section-title">
            Explorer
        </div>
        <div className="card">
            <div>Polymedia Explorer</div>
        </div>
    </div>;
};

const SectionRpc: React.FC = () => // TODO: selector / input
{
    // === state ===

    const { network } = useAppContext();

    const rpcUrl = networkConfig[network].url;

    // === html ===

    return <div className="page-section">
        <div className="section-title">
            RPC
        </div>
        <div className="card">
            <div className="break-any">{rpcUrl}</div>
        </div>
    </div>;
};

const SectionNetwork: React.FC = () => // TODO: style
{
    // === state ===

    const { isWorking, network, setNetwork } = useAppContext();

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
                disabled={isWorking}
                id="btn-network"
            />
        </div>
    </div>;
};

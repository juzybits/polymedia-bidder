import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { EXPLORER_NAMES, ExplorerName, ExplorerSelector, NetworkSelector, switchExplorer } from "@polymedia/suitcase-react";
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

    return <div className="card compact">
        <div className="card-title">
            Wallet
        </div>
        {!currAcct
            ? <ConnectToGetStarted />
            : <>
                <div>You are connected with address:</div>
                <div className="address">{currAcct.address}</div>
                <div>
                    <button onClick={() => disconnect()} className="btn">
                        DISCONNECT
                        </button>
                    </div>
            </>
        }
        </div>;
};

const SectionExplorer: React.FC = () =>
{
    const { explorer, setExplorer } = useAppContext();

    return <div className="card compact">
        <div className="card-title">
            Explorer
        </div>
        <ExplorerSelector
            selectedExplorer={explorer}
            onSwitch={setExplorer}
        />
    </div>;
};

const SectionRpc: React.FC = () => // TODO: selector / input
{
    // === state ===

    const { network } = useAppContext();

    const rpcUrl = networkConfig[network].url;

    // === html ===

    return <div className="card compact">
        <div className="card-title">
            RPC
        </div>
        <div className="card-description">
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

    return <div className="card compact">
        <div className="card-title">
            Network
        </div>
        <div className="card-description">
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

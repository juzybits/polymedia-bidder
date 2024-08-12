import {
    ConnectModal,
    SuiClientProvider,
    WalletProvider,
    createNetworkConfig,
    useCurrentAccount,
    useDisconnectWallet,
    useSignTransaction,
    useSuiClient,
} from "@mysten/dapp-kit";
import "@mysten/dapp-kit/dist/index.css";
import { getFullnodeUrl } from "@mysten/sui/client";
import * as sdk from "@polymedia/auction-sdk";
import { shortenAddress } from "@polymedia/suitcase-core";
import { NetworkSelector, ReactSetter, isLocalhost, loadNetwork } from "@polymedia/suitcase-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { BrowserRouter, Link, Outlet, Route, Routes } from "react-router-dom";
import { PageHome } from "./PageHome";
import { PageNew } from "./PageNew";
import { PageNotFound } from "./PageNotFound";
import "./styles/App.less";

/* App router */

export const AppRouter: React.FC = () => {
    return (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<AppSuiProviders />} >
                <Route index element={<PageHome />} />
                <Route path="*" element={<PageNotFound />} />
                <Route path="/new" element={<PageNew />} />
            </Route>
        </Routes>
    </BrowserRouter>
    );
};

/* Sui providers + network config */

const supportedNetworks = isLocalhost()
    ? ["mainnet", "testnet", "devnet", "localnet"] as const
    : ["mainnet"] as const;
export type NetworkName = typeof supportedNetworks[number];

const { networkConfig } = createNetworkConfig({
    mainnet: { url: getFullnodeUrl("mainnet") },
    testnet: { url: getFullnodeUrl("testnet") },
    devnet: { url: getFullnodeUrl("devnet") },
    localnet: { url: getFullnodeUrl("localnet") },
});

const queryClient = new QueryClient();
const AppSuiProviders: React.FC = () => {
    const [network, setNetwork] = useState(loadNetwork(supportedNetworks, "mainnet"));
    return (
    <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networkConfig} network={network}>
            <WalletProvider autoConnect={true}>
                <App network={network} setNetwork={setNetwork} />
            </WalletProvider>
        </SuiClientProvider>
    </QueryClientProvider>
    );
};

/* App */

export type AppContext = {
    network: NetworkName;
    inProgress: boolean; setInProgress: ReactSetter<boolean>;
    showMobileNav: boolean; setShowMobileNav: ReactSetter<boolean>;
    header: React.ReactNode;
    auctionClient: sdk.AuctionClient;
    // setModalContent: ReactSetter<ReactNode>;
};

const App: React.FC<{
    network: NetworkName;
    setNetwork: ReactSetter<NetworkName>;
}> = ({
    network,
    setNetwork,
}) =>
{
    // === state ===

    const suiClient = useSuiClient();
    const { mutateAsync: walletSignTx } = useSignTransaction();
    const packageId = sdk.AUCTION_IDS[network].packageId;

    const auctionClient = useMemo(() => {
        return new sdk.AuctionClient(
            suiClient,
            packageId,
            (tx) => walletSignTx({ transaction: tx }),
        );
    }, [suiClient, packageId, walletSignTx]);

    const [ inProgress, setInProgress ] = useState(false);
    const [ showMobileNav, setShowMobileNav ] = useState(false);
    const [ showConnectModal, setShowConnectModal ] = useState(false);
    // const [ modalContent, setModalContent ] = useState<ReactNode>(null);

    const appContext: AppContext = {
        network,
        inProgress, setInProgress,
        showMobileNav, setShowMobileNav,
        header: <Header
            setNetwork={setNetwork}
            setShowMobileNav={setShowMobileNav}
            setShowConnectModal={setShowConnectModal}
            network={network}
            inProgress={inProgress}
        />,
        auctionClient,
        // setModalContent,
    };

    // === html ===

    const layoutClasses: string[] = [];
    if (showMobileNav) {
        layoutClasses.push("menu-open");
    }
    if (inProgress) {
        layoutClasses.push("disabled");
    }

    return (
    <div id="layout" className={layoutClasses.join(" ")}>

        <Outlet context={appContext} /> {/* Loads a Page*.tsx */}

        <ConnectModal
            trigger={<></>}
            open={showConnectModal}
            onOpenChange={isOpen => { setShowConnectModal(isOpen); }}
        />

    </div>
    );
};

/* One-off components */

const Header: React.FC<{
    setNetwork: ReactSetter<NetworkName>;
    setShowMobileNav: ReactSetter<boolean>;
    setShowConnectModal: ReactSetter<boolean>;
    network: NetworkName;
    inProgress: boolean;
}> = ({
    setNetwork,
    setShowMobileNav,
    setShowConnectModal,
    network,
    inProgress,
}) =>
{
    return <header>
        <Link to="/" className="header-item">
            [AUCTION]
        </Link>
        {supportedNetworks.length > 1 &&
        <BtnNetwork
            setNetwork={setNetwork}
            setShowMobileNav={setShowMobileNav}
            network={network}
            inProgress={inProgress}
        />}
        <BtnConnect
            openConnectModal={() => { setShowConnectModal(true); }}
            setShowMobileNav={setShowMobileNav}
            inProgress={inProgress}
        />
    </header>;
};

const BtnNetwork: React.FC<{
    setNetwork: ReactSetter<NetworkName>;
    setShowMobileNav: ReactSetter<boolean>;
    network: NetworkName;
    inProgress: boolean;
}> = ({
    setNetwork,
    setShowMobileNav,
    network,
    inProgress,
}) =>
{
    const onSwitchNetwork = (newNet: NetworkName) => {
        setNetwork(newNet);
        setShowMobileNav(false);
    };
    return <NetworkSelector
        currentNetwork={network}
        supportedNetworks={supportedNetworks}
        onSwitch={onSwitchNetwork}
        disabled={inProgress}
        className="header-item"
        id="btn-network"
    />;
};

const BtnConnect: React.FC<{
    openConnectModal: () => void;
    setShowMobileNav: ReactSetter<boolean>;
    inProgress: boolean;
}> = ({
    openConnectModal,
    setShowMobileNav,
    inProgress,
}) =>
{
    const currAcct = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();

    function onClick() {
        currAcct ? disconnect() : openConnectModal();
        setShowMobileNav(false);
    }

    const text = currAcct ? shortenAddress(currAcct.address, 3, 3) : "CONNECT";

    return <button
        id="btn-connect"
        className="header-item"
        disabled={inProgress}
        onClick={onClick}
    >
        {text}
    </button>;
};

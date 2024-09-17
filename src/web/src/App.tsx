import {
    ConnectModal,
    SuiClientProvider,
    WalletProvider,
    createNetworkConfig, useSignTransaction,
    useSuiClient
} from "@mysten/dapp-kit";
import "@mysten/dapp-kit/dist/index.css";
import { getFullnodeUrl } from "@mysten/sui/client";
import * as sdk from "@polymedia/bidder-sdk";
import { ReactSetter, isLocalhost, loadNetwork } from "@polymedia/suitcase-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { BrowserRouter, Link, Outlet, Route, Routes } from "react-router-dom";
import { Glitch } from "./components/Glitch";
import { IconHistory, IconNew, IconGears } from "./components/icons";
import { PageAuction } from "./PageAuction";
import { PageNotFound } from "./PageFullScreenMsg";
import { PageHome } from "./PageHome";
import { PageNew } from "./PageNew";
import { PageSettings } from "./PageSettings";
import { PageUser } from "./PageUser";
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
                <Route path="/user/:address/:tabName" element={<PageUser />} />
                <Route path="/user/:tabName" element={<PageUser />} />
                <Route path="/settings" element={<PageSettings />} />
                <Route path="/auction/:auctionId/:tabName?" element={<PageAuction />} />
                {/* <Route path="/dev/display/auction" element={<PageDevDisplayAuction />} />
                <Route path="/dev/display/user" element={<PageDevDisplayUser />} />
                <Route path="/dev/display/registry" element={<PageDevDisplayUserRegistry />} /> */}
            </Route>
        </Routes>
    </BrowserRouter>
    );
};

/* Sui providers + network config */

const isDevDomain = ["dev.bidder.polymedia.app", "dev.polymedia-bidder.pages.dev"].includes(window.location.hostname);
const isTestDomain = ["test.bidder.polymedia.app", "test.polymedia-bidder.pages.dev"].includes(window.location.hostname);

export const [ defaultNetwork, supportedNetworks ] =
    isLocalhost()  ? ["localnet" as const, ["mainnet", "testnet", "devnet", "localnet"] as const]
    : isDevDomain  ? ["devnet" as const,   ["mainnet", "testnet", "devnet"] as const]
    : isTestDomain ? ["testnet" as const,  ["mainnet", "testnet"] as const]
    : ["mainnet" as const, ["mainnet", "testnet"] as const];

export type NetworkName = typeof supportedNetworks[number];

export const { networkConfig} = createNetworkConfig({
    mainnet: { url: getFullnodeUrl("mainnet") },
    testnet: { url: getFullnodeUrl("testnet") },
    devnet: { url: getFullnodeUrl("devnet") },
    localnet: { url: getFullnodeUrl("localnet") },
});

const queryClient = new QueryClient();
const AppSuiProviders: React.FC = () => {
    const [network, setNetwork] = useState(loadNetwork(supportedNetworks, defaultNetwork));
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
    network: NetworkName; setNetwork: ReactSetter<NetworkName>;
    isWorking: boolean; setIsWorking: ReactSetter<boolean>;
    showMobileNav: boolean; setShowMobileNav: ReactSetter<boolean>;
    openConnectModal: () => void;
    header: React.ReactNode;
    bidderClient: sdk.BidderClient;
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
    const registryId = sdk.AUCTION_IDS[network].registryId;

    const bidderClient = useMemo(() => {
        return new sdk.BidderClient(
            suiClient,
            (tx) => walletSignTx({ transaction: tx }),
            packageId,
            registryId,
        );
    }, [suiClient, packageId, walletSignTx]);

    const [ isWorking, setIsWorking ] = useState(false);
    const [ showMobileNav, setShowMobileNav ] = useState(false);
    const [ showConnectModal, setShowConnectModal ] = useState(false);
    // const [ modalContent, setModalContent ] = useState<ReactNode>(null);

    const openConnectModal = () => {
        setShowConnectModal(true);
    };

    const appContext: AppContext = {
        network, setNetwork,
        isWorking, setIsWorking,
        showMobileNav, setShowMobileNav,
        openConnectModal: openConnectModal,
        header: <Header />,
        bidderClient,
        // setModalContent,
    };

    // === html ===

    const layoutClasses: string[] = [];
    if (showMobileNav) {
        layoutClasses.push("menu-open");
    }
    if (isWorking) {
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

const Header: React.FC = () =>
{
    return <header>
        <div className="header-item">
            <Link to="/">
                <Glitch text="BIDDER" />
            </Link>
        </div>
        <Link to="/new" className="header-item">
            <IconNew />
        </Link>
        <Link to="/user/bids" className="header-item">
            <IconHistory />
        </Link>
        <Link to="/settings" className="header-item">
            <IconGears />
        </Link>
    </header>;
};

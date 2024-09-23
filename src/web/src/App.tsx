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
import { EXPLORER_NAMES, ExplorerName, ReactSetter, isLocalhost, loadExplorer, loadNetwork } from "@polymedia/suitcase-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useMemo, useState, createContext, useContext, useEffect } from "react";
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
import { Modal } from "./components/Modal";

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
                <Route path="/auction/:auctionId/:tabName" element={<PageAuction />} />
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

const AppContext = createContext<AppContext | null>(null);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useAppContext must be used within an AppContextProvider");
    }
    return context;
};

export type AppContext = {
    network: NetworkName; setNetwork: ReactSetter<NetworkName>;
    explorer: ExplorerName; setExplorer: ReactSetter<ExplorerName>;
    isWorking: boolean; setIsWorking: ReactSetter<boolean>;
    // showMobileNav: boolean; setShowMobileNav: ReactSetter<boolean>;
    openConnectModal: () => void;
    setModalContent: ReactSetter<React.ReactNode>;
    header: React.ReactNode;
    bidderClient: sdk.BidderClient;
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

    const [ explorer, setExplorer ] = useState(loadExplorer("Polymedia"));
    const [ modalContent, setModalContent ] = useState<React.ReactNode>(null);

    const bidderClient = useMemo(() => {
        return new sdk.BidderClient(
            suiClient,
            (tx) => walletSignTx({ transaction: tx }),
            packageId,
            registryId,
        );
    }, [suiClient, packageId, walletSignTx]);

    const [ isWorking, setIsWorking ] = useState(false);
    // const [ showMobileNav, setShowMobileNav ] = useState(false);
    const [ showConnectModal, setShowConnectModal ] = useState(false);

    const openConnectModal = () => {
        setShowConnectModal(true);
    };

    const appContext: AppContext = {
        network, setNetwork,
        explorer, setExplorer,
        isWorking, setIsWorking,
        // showMobileNav, setShowMobileNav,
        openConnectModal: openConnectModal,
        setModalContent,
        header: <Header />,
        bidderClient,
    };

    // === effects ===

    useEffect(() => {
        if (modalContent) {
            document.body.classList.add("modal-open");
        } else {
            document.body.classList.remove("modal-open");
        }
        return () => { // cleanup
            document.body.classList.remove("modal-open");
        };
    }, [modalContent]);

    // === html ===

    const layoutClasses: string[] = [];
    // if (showMobileNav) {
    //     layoutClasses.push("menu-open");
    // }
    if (isWorking) {
        layoutClasses.push("disabled");
    }

    return (
    <AppContext.Provider value={appContext}>
        <div id="layout" className={layoutClasses.join(" ")}>

            <Outlet /> {/* Loads a Page*.tsx */}

            <ConnectModal
                trigger={<></>}
                open={showConnectModal}
                onOpenChange={isOpen => { setShowConnectModal(isOpen); }}
            />

            {modalContent && <Modal onClose={() => setModalContent(null)}>
                {modalContent}
            </Modal>}

        </div>
    </AppContext.Provider>
    );
};

/* One-off components */

const Header: React.FC = () =>
{
    const { network } = useAppContext();
    return <header>
        <div className="header-item">
            <Link to="/">
                <Glitch text="BIDDER" />
                {network !== "mainnet" && <span className="header-network-label">{network}</span>}
            </Link>
        </div>
        <Link to="/new" className="header-item" title="Create Auction">
            <IconNew />
        </Link>
        <Link to="/user/bids" className="header-item" title="Your History">
            <IconHistory />
        </Link>
        <Link to="/settings" className="header-item" title="Settings">
            <IconGears />
        </Link>
    </header>;
};

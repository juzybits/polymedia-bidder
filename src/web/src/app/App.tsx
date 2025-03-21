import {
    ConnectModal,
    SuiClientProvider,
    WalletProvider,
    useCurrentAccount,
    useSignTransaction,
    useSuiClient,
} from "@mysten/dapp-kit";
import "@mysten/dapp-kit/dist/index.css";
import { SuiClient } from "@mysten/sui/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Outlet, Route, Routes } from "react-router-dom";

import { AUCTION_IDS, BidderClient, KioskNetwork } from "@polymedia/bidder-sdk";
import { CoinMetaFetcher } from "@polymedia/suitcase-core";
import { ExplorerName, IconGears, IconHistory, IconNew, Modal, ReactSetter, loadExplorer, loadNetwork } from "@polymedia/suitcase-react";

import { defaultNetwork, loadNetworkConfig, SupportedNetwork, supportedNetworks } from "./config";
import { Glitch } from "../comp/Glitch";
import { PageAuction } from "../PageAuction";
import { PageNotFound } from "../PageFullScreenMsg";
import { PageHome } from "../PageHome";
import { PageNew } from "../PageNew";
import { PageSettings } from "../PageSettings";
import { PageUser } from "../PageUser";
import "../styles/App.less";
import { AppContext, useAppContext } from "./context";

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
                <Route path="/settings" element={<PageSettings />} />
                <Route path="/auction/:auctionId/:tabName" element={<PageAuction />} />
                {/* <Route path="/dev/open-graph" element={<PageDevOpenGraph />} />
                <Route path="/dev/display/auction" element={<PageDevDisplayAuction />} />
                <Route path="/dev/display/user" element={<PageDevDisplayUser />} />
                <Route path="/dev/display/registry" element={<PageDevDisplayUserRegistry />} />
                <Route path="/dev/display/nft" element={<PageDevDisplayDevNft />} /> */}
            </Route>
        </Routes>
    </BrowserRouter>
    );
};

/* Sui providers + network config */

const queryClient = new QueryClient();
const AppSuiProviders: React.FC = () =>
{
    const [ network, setNetwork ] = useState(loadNetwork(supportedNetworks, defaultNetwork));

    const [ networkConfig, setNetworkConfig ] = useState({
        mainnet: loadNetworkConfig("mainnet"),
        testnet: loadNetworkConfig("testnet"),
        devnet: loadNetworkConfig("devnet"),
        localnet: loadNetworkConfig("localnet"),
    });

    const rpc = networkConfig[network].url;
    const setRpc = (rpc: string) => {
        setNetworkConfig({
            ...networkConfig,
            [network]: { url: rpc },
        });
    };

    return (
    <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networkConfig} network={network}>
            <WalletProvider autoConnect={true}>
                <App network={network} setNetwork={setNetwork} rpc={rpc} setRpc={setRpc} />
            </WalletProvider>
        </SuiClientProvider>
    </QueryClientProvider>
    );
};

/* App */

export type AppContextType = {
    explorer: ExplorerName; setExplorer: ReactSetter<ExplorerName>;
    network: SupportedNetwork; setNetwork: ReactSetter<SupportedNetwork>;
    rpc: string; setRpc: (rpc: string) => void;
    isWorking: boolean; setIsWorking: ReactSetter<boolean>;
    // showMobileNav: boolean; setShowMobileNav: ReactSetter<boolean>;
    openConnectModal: () => void;
    setModalContent: ReactSetter<React.ReactNode>;
    header: React.ReactNode;
    bidderClient: BidderClient;
    coinMetaFetcher: CoinMetaFetcher;
};

const App: React.FC<{
    network: SupportedNetwork;
    setNetwork: ReactSetter<SupportedNetwork>;
    rpc: string;
    setRpc: (rpc: string) => void;
}> = ({
    network,
    setNetwork,
    rpc,
    setRpc,
}) =>
{
    // === state ===

    const suiClient = useSuiClient();
    const { mutateAsync: walletSignTx } = useSignTransaction();

    const [ explorer, setExplorer ] = useState(loadExplorer("Polymedia"));
    const [ modalContent, setModalContent ] = useState<React.ReactNode>(null);

    const bidderClient = useMemo(() => {
        return new BidderClient({
            network,
            packageId: AUCTION_IDS[network].packageId,
            registryId: AUCTION_IDS[network].registryId,
            signTransaction: (tx) => walletSignTx({ transaction: tx }),
            suiClient,
            kioskClientOptions: {
                client: network === "mainnet" ? new SuiClient({ url: "https://rpc-mainnet.suiscan.xyz/" }) : suiClient,
                network: network === "mainnet" ? KioskNetwork.MAINNET : network === "testnet" ? KioskNetwork.TESTNET : KioskNetwork.CUSTOM,
            },
        });
    }, [suiClient, walletSignTx]);

    const coinMetaFetcher = useMemo(() => {
        return new CoinMetaFetcher({ client: suiClient });
    }, [suiClient]);

    const [ isWorking, setIsWorking ] = useState(false);
    // const [ showMobileNav, setShowMobileNav ] = useState(false);
    const [ showConnectModal, setShowConnectModal ] = useState(false);

    const openConnectModal = () => {
        setShowConnectModal(true);
    };

    const appContext: AppContextType = {
        explorer, setExplorer,
        network, setNetwork,
        rpc, setRpc,
        isWorking, setIsWorking,
        // showMobileNav, setShowMobileNav,
        openConnectModal: openConnectModal,
        setModalContent,
        header: <Header />,
        bidderClient,
        coinMetaFetcher,
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
    const currAcct = useCurrentAccount();
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
        {currAcct && <Link to={`/user/${currAcct.address}/bids`} className="header-item" title="Your History">
            <IconHistory />
        </Link>}
        <Link to="/settings" className="header-item" title="Settings">
            <IconGears />
        </Link>
    </header>;
};

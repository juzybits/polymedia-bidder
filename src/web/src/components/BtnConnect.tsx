import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { shortenAddress } from "@polymedia/suitcase-core";
import { ReactSetter } from "@polymedia/suitcase-react";
import React from "react";

export const BtnConnect: React.FC<{
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

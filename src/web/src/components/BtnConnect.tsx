import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { ReactSetter } from "@polymedia/suitcase-react";
import React from "react";
import { Link } from "react-router-dom";

export const BtnConnect: React.FC<{
    id?: string;
    className?: string;
    disabled: boolean;
    openConnectModal: () => void;
    setShowMobileNav: ReactSetter<boolean>;
}> = ({
    id = undefined,
    className = undefined,
    disabled,
    openConnectModal,
    setShowMobileNav,
}) =>
{
    const currAcct = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();

    const connectWallet = () => {
        currAcct ? disconnect() : openConnectModal();
        setShowMobileNav(false);
    };

    if (currAcct) {
        return <Link to="/settings" id={id} className={className}>
            SETTINGS
        </Link>;
    } else {
        return <button id={id} className={className} disabled={disabled} onClick={connectWallet}>
            CONNECT
        </button>;
    }
};

import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { ReactSetter } from "@polymedia/suitcase-react";
import React from "react";
import { Btn } from "./Btn";
import { useNavigate } from "react-router-dom";

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
    const navigate = useNavigate();

    const currAcct = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();

    const connectWallet = () => {
        currAcct ? disconnect() : openConnectModal();
        setShowMobileNav(false);
    };

    const navigateToUserPage = () => {
        navigate("/user");
    };

    const text = currAcct ? "USER" : "CONNECT";
    const action = currAcct ? navigateToUserPage : connectWallet;

    return (
        <Btn
            id={id}
            className={className}
            disabled={disabled}
            onClick={action}
        >
            {text}
        </Btn>
    );
};

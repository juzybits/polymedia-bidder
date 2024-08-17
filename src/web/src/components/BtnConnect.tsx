import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { shortenAddress } from "@polymedia/suitcase-core";
import { ReactSetter } from "@polymedia/suitcase-react";
import React from "react";
import { Btn } from "./Btn";

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

    const onClick = () => {
        currAcct ? disconnect() : openConnectModal();
        setShowMobileNav(false);
    };

    const text = currAcct ? shortenAddress(currAcct.address, 3, 3) : "CONNECT";

    return (
        <Btn
            id={id}
            className={className}
            disabled={disabled}
            onClick={onClick}
        >
            {text}
        </Btn>
    );
};

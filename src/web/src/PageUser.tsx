import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import React from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { ConnectToGetStarted } from "./components/ConnectToGetStarted";
import { Btn } from "./components/Btn";

export const PageUser: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();

    const { header } = useOutletContext<AppContext>();

    // === html ===

    return (
    <div className="page-regular" id="page-user">

        {header}

        <div className="page-content">

            <h1 className="page-title">USER</h1>

            {!currAcct
            ? <ConnectToGetStarted />
            : <>
                <div className="page-section card">
                    <div>You are connected with wallet:</div>
                    <div className="address">{currAcct.address}</div>
                    <div>
                        <Btn onClick={disconnect}>
                            DISCONNECT
                        </Btn>
                    </div>
                </div>
            </>}
        </div>

    </div>
    );
};

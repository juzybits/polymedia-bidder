// TODO: move to @polymedia/suitcase-core

import React from "react";
import { BtnConnect } from "./BtnConnect";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "../App";

export const ConnectToGetStarted: React.FC = () =>
{
    const { inProgress, openConnectModal, setShowMobileNav } = useOutletContext<AppContext>();

    return (
        <div className="page-section card">
            <div className="section-description">
                Connect your Sui wallet to get started.
            </div>
            <BtnConnect
                openConnectModal={openConnectModal}
                setShowMobileNav={setShowMobileNav}
                disabled={inProgress}
                className="btn"
            />
        </div>
    );
};

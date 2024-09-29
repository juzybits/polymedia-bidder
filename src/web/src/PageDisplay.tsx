import React, { useEffect, useState } from "react";
import { getNftTitleLine2, NFT_TITLE_LINE_1 } from "./components/DevNftCreator";
import { DisplaySvgProps, getRandomDarkColor, getRandomLightColor, makeDisplaySvg, svgToDataUrl, trimSvg } from "./lib/svg";

const PageDisplay: React.FC<DisplaySvgProps> = (displayProps) =>
{
    const svgRaw = makeDisplaySvg(displayProps);
    const svgTrimmed = trimSvg(svgRaw);
    const svgDataUrl = svgToDataUrl(svgTrimmed);

    console.log(svgDataUrl.length);
    console.log(svgDataUrl);

    return (
        <div className="page-regular">
            <div className="page-content">
                <div className="page-section" style={{border: "1px solid", marginTop: "1rem"}}>
                    <img src={svgDataUrl} />
                </div>
            </div>
        </div>
    );
};

export const PageDevDisplayAuction: React.FC = () => (
    <PageDisplay
        backgroundColor={getRandomDarkColor()}
        titleColor="#fff"
        titleSize={15}
        titleLine1="AUCTION"
    />
);

export const PageDevDisplayUser: React.FC = () => (
    <PageDisplay
        backgroundColor={getRandomDarkColor()}
        titleColor="#fff"
        titleSize={20}
        titleLine1="USER"
    />
);

export const PageDevDisplayUserRegistry: React.FC = () => (
    <PageDisplay
        backgroundColor={getRandomDarkColor()}
        titleColor="#fff"
        titleSize={15}
        titleLine1="USER"
        titleLine2="REGISTRY"
    />
);

export const PageDevDisplayDevNft: React.FC = () => (
    <PageDisplay
        backgroundColor={getRandomDarkColor()}
        titleColor={getRandomLightColor()}
        titleLine1={NFT_TITLE_LINE_1}
        titleLine2={getNftTitleLine2()}
        titleSize={15}
    />
);

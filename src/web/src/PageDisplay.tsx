import React from "react";
import { getNftTitleLine2, NFT_TITLE_LINE_1 } from "./comp/DevNftCreator";
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
                <div className="page-section">
                    <img className="display-demo" src={svgDataUrl} />
                </div>
            </div>
        </div>
    );
};

const backgroundColor = "#0F4C75";
const logo = {
    name: "BIDDER",
    borderColor: "black",
    textColor: "yellow",
    textSize: 7,
};

export const PageDevDisplayAuction: React.FC = () => (
    <PageDisplay
        backgroundColor={backgroundColor}
        titleColor="#fff"
        titleSize={17}
        titleLine1="AUCTION"
        logo={logo}
    />
);

export const PageDevDisplayUser: React.FC = () => (
    <PageDisplay
        backgroundColor={backgroundColor}
        titleColor="#fff"
        titleSize={25}
        titleLine1="USER"
        logo={logo}
    />
);

export const PageDevDisplayUserRegistry: React.FC = () => (
    <PageDisplay
        backgroundColor={backgroundColor}
        titleColor="#fff"
        titleSize={16}
        titleLine1="USER"
        titleLine2="REGISTRY"
        logo={logo}
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

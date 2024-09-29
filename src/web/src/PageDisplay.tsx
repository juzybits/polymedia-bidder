import React, { useEffect, useState } from "react";
import { getRandomDarkColor, getRandomLightColor, makeDisplaySvg, svgToDataUrl, trimSvg } from "./lib/svg";
import { getNftTitleLine2, NFT_TITLE_LINE_1 } from "./components/DevNftCreator";

type DisplayProps = {
    textColor?: string;
    backgroundColor?: string;
    titleLine1: string;
    titleLine2?: string;
    titleFontSize: number;
}

const PageDisplay: React.FC<DisplayProps> = ({
    textColor, backgroundColor, titleLine1, titleLine2, titleFontSize,
}) => {
    const [svgDataUrl, setSvgDataUrl] = useState("");

    useEffect(() =>
    {
        const svgRaw = makeDisplaySvg({
            textColor,
            backgroundColor,
            titleLine1,
            titleLine2,
            titleFontSize,
        });

        const svgTrimmed = trimSvg(svgRaw);
        const svgDataUrl = svgToDataUrl(svgTrimmed);
        setSvgDataUrl(svgDataUrl);

        console.log(svgDataUrl.length);
        console.log(svgDataUrl);
    }, [titleLine1, titleLine2, titleFontSize]);

    return (
        <div className="page-regular">
            <div className="page-content">
                <div className="page-section" style={{border: "1px solid", marginTop: "1rem"}}>
                    <img src={svgDataUrl} alt={`${titleLine1} ${titleLine2 || ''}`} />
                </div>
            </div>
        </div>
    );
};

export const PageDevDisplayUserRegistry: React.FC = () => (
    <PageDisplay
        titleLine1="USER"
        titleLine2="REGISTRY"
        titleFontSize={15}
    />
);

export const PageDevDisplayUser: React.FC = () => (
    <PageDisplay
        titleLine1="USER"
        titleFontSize={20}
    />
);

export const PageDevDisplayAuction: React.FC = () => (
    <PageDisplay
        titleLine1="AUCTION"
        titleFontSize={15}
    />
);

export const PageDevDisplayDevNft: React.FC = () => (
    <PageDisplay
        titleLine1={NFT_TITLE_LINE_1}
        titleLine2={getNftTitleLine2()}
        titleFontSize={15}
        textColor={getRandomLightColor()}
        backgroundColor={getRandomDarkColor()}
    />
);

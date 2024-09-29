import React, { useEffect, useState } from "react";
import { makeDisplaySvg, svgToDataUrl, trimSvg } from "./lib/svg";

export const PageDevDisplayAuction: React.FC = () =>
{
    const [svgDataUrl, setSvgDataUrl] = useState("");

    useEffect(() =>
    {
        const svgRaw = makeDisplaySvg({
            // appName: "BIDDER",
            titleLine1: "AUCTION",
            titleFontSize: 15,
        });

        const svgTrimmed = trimSvg(svgRaw);
        const svgDataUrl = svgToDataUrl(svgTrimmed);
        setSvgDataUrl(svgDataUrl);

        console.log(svgDataUrl.length);
        console.log(svgDataUrl);
    }, []);

    return (
    <div id="page-dev-display-auction" className="page-regular">

        <div className="page-content">

            <div className="page-section" style={{border: "1px solid", marginTop: "1rem"}}>
                <img src={svgDataUrl} />
            </div>

        </div>
    </div>
    );
};

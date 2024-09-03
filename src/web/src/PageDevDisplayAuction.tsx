import React, { useEffect, useState } from "react";
import { makeDisplaySvg, svgToDataUrl, trimSvg } from "./lib/svg";

export const PageDevDisplayAuction: React.FC = () =>
{
    const [svgDataUrl, setSvgDataUrl] = useState("");

    useEffect(() =>
    {
        const svgRaw = makeDisplaySvg({
            backgroundColor: "black",
            titleText: "AUCTION",
            fontSize: "75px",
            descriptionText: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore",
        });

        const svgTrimmed = trimSvg(svgRaw);
        const svgDataUrl = svgToDataUrl(svgTrimmed);
        setSvgDataUrl(svgDataUrl);

        const displayUrl = svgDataUrl.replace(
            "Lorem%20ipsum%20dolor%20sit%20amet%2C%20consectetur%20adipisicing%20elit%2C%20sed%20do%20eiusmod%20tempor%20incididunt%20ut%20labore",
            "{name}",
        );

        console.log(displayUrl.length);
        console.log(displayUrl);
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

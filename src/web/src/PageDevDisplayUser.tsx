import React, { useEffect, useState } from "react";
import { makeDisplaySvg, svgToDataUrl, trimSvg } from "./lib/svg";

export const PageDevDisplayUser: React.FC = () =>
{
    const [svgDataUrl, setSvgDataUrl] = useState("");

    useEffect(() =>
    {
        const svgRaw = makeDisplaySvg({
            backgroundColor: "#002436",
            titleText: "AUCTION USER REGISTRY",
            fontSize: "100px",
        });

        const svgTrimmed = trimSvg(svgRaw);
        const svgDataUrl = svgToDataUrl(svgTrimmed);
        setSvgDataUrl(svgDataUrl);

        console.log(svgDataUrl.length);
        console.log(svgDataUrl);
    }, []);

    return (
    <div id="page-dev-display-history" className="page-regular">

        <div className="page-content">

            <div className="page-section" style={{border: "1px solid", marginTop: "1rem"}}>
                <img src={svgDataUrl} />
            </div>

        </div>
    </div>
    );
};

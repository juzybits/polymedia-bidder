import React, { useEffect, useState } from "react";
import { svgToDataUrl, trimSvg } from "./lib/svg";

export const PageDevDisplayUser: React.FC = () =>
{
    const [svgDataUrl, setSvgDataUrl] = useState("");

    useEffect(() => {
        const svgRaw = `
        <svg width="100%" height="100%" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">

          <rect width="100%" height="100%" fill="#002436"/>

          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml"
                style="
                    height: 100%;
                    width: 100%;

                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    gap: 1em;

                    box-sizing: border-box;
                    padding: 0.66em;

                    font-size: 100px;
                    font-family: system-ui;
                    color: white;
                    text-align: center;

                    overflow-wrap: anywhere;
                "
            >

                <div style="font-size: 1.5em">
                    <b>AUCTION USER REGISTRY</b>
                </div>

            </div>

          </foreignObject>

        </svg>
        `.trim();

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

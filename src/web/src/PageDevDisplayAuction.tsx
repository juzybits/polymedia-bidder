import React from "react";
import { svgToDataUrl, trimSvg } from "./lib/svg";

const svgRaw = `
<svg width="100%" height="100%" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">

  <rect width="100%" height="100%" fill="black"/>

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

            font-size: 75px;
            font-family: system-ui;
            color: white;
            text-align: center;

            overflow-wrap: anywhere;
        "
    >

        <div style="font-size: 1.5em">
            <b>AUCTION</b>
        </div>

        <div>
            Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore
        </div>

    </div>

  </foreignObject>

</svg>
`.trim();

const svgTrimmed = trimSvg(svgRaw);
const svgDataUrl = svgToDataUrl(svgTrimmed);

const displayUrl = svgDataUrl.replace(
    "Lorem%20ipsum%20dolor%20sit%20amet%2C%20consectetur%20adipisicing%20elit%2C%20sed%20do%20eiusmod%20tempor%20incididunt%20ut%20labore",
    "{name}",
);

console.log(displayUrl.length);
console.log(displayUrl);

export const PageDevDisplayAuction: React.FC = () =>
{
    return (
    <div id="page-dev-display-auction" className="page-regular">

        <div className="page-content">

            <div className="page-section" style={{border: "1px solid", marginTop: "1rem"}}>
                <img src={svgDataUrl} />
            </div>

        </div>
    </div>
    );
}

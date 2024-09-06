export function makeDisplaySvg({
    textColor = "white",
    backgroundColor = "#0F4C75",
    fontFamily = "system-ui",
    titleText = "PLACEHOLDER",
    titleFontSize = "150px",
    descriptionText = "",
    descriptionFontSize = "100px",
    appName = "",
    appNameFontSize = "75px",
    appNameTextColor = "yellow",
    appNameBackgroundColor = "black",
}): string
{
    const padding: string = "40px";
    return `
    <svg width="100%" height="100%" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}"/>
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml"
            style="
                height: 100%;
                width: 100%;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                gap: ${padding};
                position: relative;
                box-sizing: border-box;
                padding: ${padding};
                font-family: ${fontFamily};
                color: ${textColor};
                text-align: center;
                overflow-wrap: anywhere;
            "
        >
            <div style="font-size: ${titleFontSize}">
                <b>${titleText}</b>
            </div>

            ${descriptionText ?
            `<div style="font-size: ${descriptionFontSize}">
                ${descriptionText}
            </div>` : ""}

            ${appName ? `
            <div style="
                position: absolute;
                bottom: ${padding};
                right: ${padding};
                font-size: ${appNameFontSize};
                text-align: right;
                font-weight: bold;
                color: ${appNameTextColor};
                background-color: ${appNameBackgroundColor};
                border: 9px solid ${appNameTextColor};
                padding: 0 15px;
            ">
                ${appName}
            </div>` : ""}
        </div>
      </foreignObject>
    </svg>
    `.trim();
}

export function trimSvg(svg: string): string
{
    return svg
        .replace(/\n/g, "")             // remove newlines
        .replace(/:\s+/g, ":")          // remove space after colons in CSS styles
        .replace(/\s*;\s*/g, ";")       // remove unnecessary spaces around semicolons in CSS
        .replace(/\s+/g, " ")           // replace multiple whitespace characters with a single space
        .replace(/>\s+</g, "><")        // remove whitespace between tags
        .replace(/\s*([<>])\s*/g, "$1") // remove spaces around opening and closing angle brackets
        .trim();                        // trim any leading or trailing whitespace
};

export function svgToDataUrl(svg: string): string
{
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

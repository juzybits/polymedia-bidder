export function makeDisplaySvg({
    textColor = "white",
    backgroundColor = "#0F4C75",
    fontFamily = "Arial,sans-serif",
    titleLine1 = "PLACEHOLDER",
    titleLine2 = "",
    titleFontSize = 20,
}): string {
    return `
    <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="${backgroundColor}"/>
        <text
            x="50"
            y="50"
            font-family="${fontFamily}"
            font-size="${titleFontSize}"
            font-weight="bold"
            fill="${textColor}"
            text-anchor="middle"
            dominant-baseline="middle"
        >
            <tspan x="50" dy="${titleLine2 ? '-0.5em' : '0'}">${titleLine1}</tspan>
            ${titleLine2 ? `<tspan x="50" dy="1.3em">${titleLine2}</tspan>` : ''}
        </text>
    </svg>`.trim();
}

export function makeDevNftDisplay({
    textColor = "white",
    backgroundColor = "#0F4C75",
    fontFamily = "Arial, sans-serif",
    titleLine1 = "Dev NFT",
    titleLine2 = "#1234",
    titleFontSize = 14,
}): string {
    return `
    <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="${backgroundColor}"/>
        <text x="50" y="54" font-family="${fontFamily}" font-size="${titleFontSize}" font-weight="bold" fill="${textColor}" text-anchor="middle">
            <tspan x="50" dy="-0.7em">${titleLine1}</tspan>
            <tspan x="50" dy="1.5em">${titleLine2}</tspan>
        </text>
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
};

export const getRandomDarkColor = () => {
    const h = Math.floor(Math.random() * 360);
    const s = Math.floor(Math.random() * 30) + 70; // 70-100%
    const l = Math.floor(Math.random() * 20) + 10; // 10-30%
    return `hsl(${h}, ${s}%, ${l}%)`;
};

export const getRandomLightColor = () => {
    const h = Math.floor(Math.random() * 360);
    const s = Math.floor(Math.random() * 30) + 70; // 70-100%
    const l = Math.floor(Math.random() * 20) + 70; // 70-90%
    return `hsl(${h}, ${s}%, ${l}%)`;
};

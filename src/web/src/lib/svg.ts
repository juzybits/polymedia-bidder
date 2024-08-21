export function trimSvg(svg: string): string
{
    return svg
        .replace(/\n/g, '')             // remove newlines
        .replace(/:\s+/g, ':')          // remove space after colons in CSS styles
        .replace(/\s*;\s*/g, ';')       // remove unnecessary spaces around semicolons in CSS
        .replace(/\s+/g, ' ')           // replace multiple whitespace characters with a single space
        .replace(/>\s+</g, '><')        // remove whitespace between tags
        .replace(/\s*([<>])\s*/g, '$1') // remove spaces around opening and closing angle brackets
        .trim();                        // trim any leading or trailing whitespace
};

export function svgToDataUrl(svg: string): string
{
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

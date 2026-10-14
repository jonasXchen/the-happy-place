// These are furniture finish colours, independent of the website's brand palette.
const finishColours: Record<string, string> = {
  oat: "#b8a991",
  sand: "#dbd0bc",
  beige: "#dbd0bc",
  natural: "#c2ad8e",
  white: "#f3f0e8",
  black: "#302d29",
  grey: "#9c9a93",
  gray: "#9c9a93",
  walnut: "#776958",
  brown: "#776958",
};
export function productSwatches(colours: string[]): string[] {
  return [
    ...new Set(
      colours
        .map((colour) => finishColours[colour.toLowerCase().trim()])
        .filter(Boolean),
    ),
  ];
}

import type { Category } from "./category";

const CRYPTO_ICON_BASE =
  "https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color";

/**
 * Markets are created on-chain with only a question and an end time, so there is
 * no stored image. We derive a thumbnail from the question text instead: a token
 * logo or brand mark when we recognise the subject, otherwise a generated tile.
 *
 * Order matters — the first match wins, so longer/more specific terms go first.
 */
const TOKEN_MATCHERS: [RegExp, string][] = [
  [/\bbitcoin\b|\bbtc\b/i, "btc"],
  [/\bethereum\b|\beth\b/i, "eth"],
  [/\bavalanche\b|\bavax\b/i, "avax"],
  [/\bsolana\b|\bsol\b/i, "sol"],
  [/\bdogecoin\b|\bdoge\b/i, "doge"],
  [/\bripple\b|\bxrp\b/i, "xrp"],
  [/\bcardano\b|\bada\b/i, "ada"],
  [/\bpolkadot\b|\bdot\b/i, "dot"],
  [/\bchainlink\b|\blink\b/i, "link"],
  [/\bpolygon\b|\bmatic\b/i, "matic"],
  [/\blitecoin\b|\bltc\b/i, "ltc"],
  [/\bbinance\b|\bbnb\b/i, "bnb"],
  [/\btether\b|\busdt\b/i, "usdt"],
  [/\busdc\b/i, "usdc"],
];

const BRAND_MATCHERS: [RegExp, string][] = [
  [/\bapple\b|\biphone\b/i, "apple.com"],
  [/\bsamsung\b/i, "samsung.com"],
  [/\btesla\b/i, "tesla.com"],
  [/\bnetflix\b/i, "netflix.com"],
  [/\bamazon\b/i, "amazon.com"],
  [/\bgoogle\b|\bgemini\b/i, "google.com"],
  [/\bmicrosoft\b/i, "microsoft.com"],
  [/\bopenai\b|\bchatgpt\b|\bgpt\b/i, "openai.com"],
  [/\bnvidia\b/i, "nvidia.com"],
  [/\bspacex\b|\bstarship\b/i, "spacex.com"],
  [/\bmeta\b|\bfacebook\b/i, "meta.com"],
  [/\barsenal\b/i, "arsenal.com"],
];

export function resolveMarketImage(question: string): string | null {
  for (const [pattern, symbol] of TOKEN_MATCHERS) {
    if (pattern.test(question)) return `${CRYPTO_ICON_BASE}/${symbol}.svg`;
  }
  for (const [pattern, domain] of BRAND_MATCHERS) {
    if (pattern.test(question)) {
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    }
  }
  return null;
}

/**
 * Stable hue derived from the market address so a market without a recognised
 * subject still gets its own consistent colour on every render and reload.
 */
export function addressHue(address: string): number {
  let hash = 0;
  for (let i = 2; i < address.length; i++) {
    hash = (hash * 31 + address.charCodeAt(i)) % 360;
  }
  return hash;
}

export function fallbackGradient(address: string): string {
  const hue = addressHue(address);
  return `linear-gradient(135deg, hsl(${hue} 55% 32%), hsl(${
    (hue + 45) % 360
  } 60% 18%))`;
}

export const CATEGORY_GLYPH: Record<Category, string> = {
  Crypto: "₿",
  Finance: "$",
  Sports: "⚽",
  Politics: "🏛",
  Technology: "⌘",
  "Pop Culture": "★",
  Other: "◆",
};

import chromeIcon from "@/assets/icons/chrome.png";
import firefoxIcon from "@/assets/icons/firefox.png";
import safariIcon from "@/assets/icons/safari.png";

export type BrowserKind = "chrome" | "firefox" | "safari" | null;

export function detectBrowser(userAgent: string | null): BrowserKind {
  if (!userAgent) return null;
  const lower = userAgent.toLowerCase();
  if (lower.includes("firefox")) return "firefox";
  if (lower.includes("safari") && !lower.includes("chrome")) return "safari";
  // Edge, Opera, Brave include "Chrome" in their UA — don't match those
  if (lower.includes("edg") || lower.includes("opr") || lower.includes("brave")) return null;
  if (lower.includes("chrome") || lower.includes("chromium")) return "chrome";
  return null;
}

const browserIcons: Record<Exclude<BrowserKind, null>, string> = {
  chrome: chromeIcon,
  firefox: firefoxIcon,
  safari: safariIcon,
};

export function BrowserIcon({ userAgent }: { userAgent: string | null }) {
  const browser = detectBrowser(userAgent);
  if (!browser) return null;
  return (
    <img
      src={browserIcons[browser]}
      alt={browser}
      className="size-3.5 shrink-0"
      title={browser.charAt(0).toUpperCase() + browser.slice(1)}
    />
  );
}

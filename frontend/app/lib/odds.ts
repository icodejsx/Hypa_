import { formatEther } from "viem";

// Returns YES probability as a percentage (0-100)
export function getYesPercent(totalYes: bigint, totalNo: bigint): number {
  const total = totalYes + totalNo;
  if (total === 0n) return 50; // no bets yet → 50/50
  // Convert to numbers for the percentage (safe here, we only need display precision)
  const yes = Number(formatEther(totalYes));
  const no = Number(formatEther(totalNo));
  return Math.round((yes / (yes + no)) * 100);
}

// Total volume in AVAX as a display string
export function getVolume(totalYes: bigint, totalNo: bigint): string {
  const total = totalYes + totalNo;
  return Number(formatEther(total)).toFixed(2);
}

// Format a unix timestamp (bigint seconds) to a readable date
export function formatEndTime(endTime: bigint): string {
  const date = new Date(Number(endTime) * 1000);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Compact "time remaining" label for market cards, e.g. "3d left", "5h left"
export function formatTimeLeft(endTime: bigint, nowSec: bigint): string {
  if (endTime <= nowSec) return "Ended";

  const seconds = Number(endTime - nowSec);
  const days = Math.floor(seconds / 86400);
  if (days >= 1) return `${days}d left`;

  const hours = Math.floor(seconds / 3600);
  if (hours >= 1) return `${hours}h left`;

  const minutes = Math.max(1, Math.floor(seconds / 60));
  return `${minutes}m left`;
}

// Truncated address for compact display, e.g. "0x023B…Cf23"
export function shortAddress(address?: string): string {
  if (!address) return "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

// Volume shortened for tight card footers, e.g. "12.4K"
export function formatCompactVolume(volume: string): string {
  const n = Number(volume);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}
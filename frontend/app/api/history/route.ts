import { NextResponse, after } from "next/server";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { createPublicClient, http, parseAbiItem, formatEther } from "viem";
import { avalancheFuji } from "viem/chains";
import { FACTORY_ADDRESS, FACTORY_ABI } from "@/app/config/contracts";

const RPC_URL =
  process.env.RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://api.avax-test.network/ext/bc/C/rpc";

const client = createPublicClient({
  chain: avalancheFuji,
  transport: http(RPC_URL),
});

const BET_EVENT = parseAbiItem(
  "event BetPlaced(address indexed user, bool isYes, uint256 amount)"
);

interface OddsPoint {
  t: number;
  yes: number;
}

type BetLog = {
  address: `0x${string}`;
  args: { isYes?: boolean; amount?: bigint };
};

const CHUNK = 2048n;
const FACTORY_START_BLOCK = 57036070n;
const CONCURRENCY = 16;
const FRESH_MS = 15_000;
const CACHE_VERSION = 2;

interface Pool {
  yes: number;
  no: number;
}

interface IndexState {
  version: number;
  pools: Record<string, Pool>;
  points: Record<string, OddsPoint[]>;
  indexed: string[];
  lastBlock: string;
  updatedAt: number;
}

let state: IndexState | null = null;
let inFlight: Promise<IndexState> | null = null;
let loadedFromDisk = false;

const CACHE_FILE = path.join(
  os.tmpdir(),
  `hypa-history-v${CACHE_VERSION}-${FACTORY_ADDRESS.toLowerCase()}.json`
);

function emptyState(lastBlock = "0"): IndexState {
  return {
    version: CACHE_VERSION,
    pools: {},
    points: {},
    indexed: [],
    lastBlock,
    updatedAt: 0,
  };
}

async function loadState(): Promise<IndexState | null> {
  try {
    const parsed = JSON.parse(await fs.readFile(CACHE_FILE, "utf8")) as IndexState;
    if (parsed.version !== CACHE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function saveState(next: IndexState) {
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(next));
  } catch {
    // Read-only filesystems only lose the cross-cold-start cache.
  }
}

async function fetchLogs(
  addresses: `0x${string}`[],
  fromBlock: bigint,
  toBlock: bigint
): Promise<BetLog[]> {
  const ranges: { fromBlock: bigint; toBlock: bigint }[] = [];
  for (let from = fromBlock; from <= toBlock; from += CHUNK) {
    let to = from + CHUNK - 1n;
    if (to > toBlock) to = toBlock;
    ranges.push({ fromBlock: from, toBlock: to });
  }

  const collected: BetLog[] = [];
  for (let i = 0; i < ranges.length; i += CONCURRENCY) {
    const batches = await Promise.all(
      ranges.slice(i, i + CONCURRENCY).map((range) =>
        client.getLogs({ address: addresses, event: BET_EVENT, ...range })
      )
    );
    for (const batch of batches) collected.push(...(batch as BetLog[]));
  }

  return collected;
}

function applyLogs(target: IndexState, logs: BetLog[]) {
  for (const log of logs) {
    const key = log.address.toLowerCase();
    const pool = target.pools[key] ?? { yes: 0, no: 0 };
    const amount = Number(formatEther(log.args.amount ?? 0n));

    if (log.args.isYes) pool.yes += amount;
    else pool.no += amount;

    target.pools[key] = pool;
    const total = pool.yes + pool.no;
    const points = (target.points[key] ??= []);
    points.push({
      t: points.length + 1,
      yes: total === 0 ? 50 : Math.round((pool.yes / total) * 100),
    });
  }
}

async function buildHistory(): Promise<IndexState> {
  const addresses = (await client.readContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getAllMarkets",
  })) as `0x${string}`[];

  const latest = await client.getBlockNumber();

  let current = state;
  if (current && BigInt(current.lastBlock) > latest) current = null;
  if (!current) {
    current = emptyState((FACTORY_START_BLOCK - 1n).toString());
  }

  const resumeFrom = BigInt(current.lastBlock) + 1n;
  const fromBlock =
    resumeFrom > FACTORY_START_BLOCK ? resumeFrom : FACTORY_START_BLOCK;

  if (fromBlock <= latest) {
    applyLogs(current, await fetchLogs(addresses, fromBlock, latest));
  }

  for (const address of addresses) {
    current.points[address.toLowerCase()] ??= [];
  }
  current.indexed = addresses.map((address) => address.toLowerCase());
  current.lastBlock = latest.toString();
  current.updatedAt = Date.now();
  current.version = CACHE_VERSION;

  state = current;
  void saveState(current);
  return current;
}

function refresh(): Promise<IndexState> {
  if (!inFlight) {
    inFlight = buildHistory().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

function respond(data: IndexState, status: "hit" | "stale" | "miss") {
  return NextResponse.json(data.points, {
    headers: {
      "X-History-Cache": status,
      "X-History-Block": data.lastBlock,
      "Cache-Control": "private, max-age=5",
    },
  });
}

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get("refresh") === "1";

  try {
    if (!state && !loadedFromDisk) {
      loadedFromDisk = true;
      state = await loadState();
    }

    if (force) return respond(await refresh(), "hit");

    if (state) {
      const isStale = Date.now() - state.updatedAt > FRESH_MS;
      if (isStale) after(() => refresh().catch(() => {}));
      return respond(state, isStale ? "stale" : "hit");
    }

    // First visit: return immediately and index in the background so charts
    // never wait on a multi-second RPC scan.
    after(() => refresh().catch(() => {}));
    return respond(emptyState(), "miss");
  } catch (err) {
    console.error("History API error:", err);
    if (state) return respond(state, "stale");
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}

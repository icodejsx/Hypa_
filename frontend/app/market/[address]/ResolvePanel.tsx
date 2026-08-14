"use client";

import { useEffect, useRef } from "react";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { MARKET_ABI } from "@/app/config/contracts";

export function ResolvePanel({
  marketAddress,
  endTime,
  resolved,
  outcome,
  onUpdate,
}: {
  marketAddress: `0x${string}`;
  endTime: bigint;
  resolved: boolean;
  outcome: boolean;
  onUpdate: () => void;
}) {
  const { address } = useAccount();
  const handledHash = useRef<`0x${string}` | undefined>(undefined);

  const { data: owner } = useReadContract({
    address: marketAddress,
    abi: MARKET_ABI,
    functionName: "owner",
  });
  const { data: userBets, refetch: refetchBets } = useReadContract({
    address: marketAddress,
    abi: MARKET_ABI,
    functionName: "getUserBets",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!isSuccess || !hash || handledHash.current === hash) return;
    handledHash.current = hash;
    onUpdate();
    refetchBets();
  }, [hash, isSuccess, onUpdate, refetchBets]);

  const isOwner =
    address && owner && address.toLowerCase() === (owner as string).toLowerCase();
  // eslint-disable-next-line react-hooks/purity
  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const ended = endTime > 0n && nowSec >= endTime;
  const bets = userBets as [bigint, bigint, boolean] | undefined;
  const yesBet = bets?.[0] ?? 0n;
  const noBet = bets?.[1] ?? 0n;
  const claimed = bets?.[2] ?? false;
  const userWon =
    resolved && ((outcome && yesBet > 0n) || (!outcome && noBet > 0n));
  const busy = isPending || isConfirming;
  const errorMessage =
    error && "shortMessage" in error
      ? String(error.shortMessage)
      : error?.message.slice(0, 120);

  if (!ended && !resolved) return null;

  function resolveMarket(result: boolean) {
    writeContract({
      address: marketAddress,
      abi: MARKET_ABI,
      functionName: "resolve",
      args: [result],
    });
  }

  function claimWinnings() {
    writeContract({
      address: marketAddress,
      abi: MARKET_ABI,
      functionName: "claim",
    });
  }

  return (
    <section className="mt-4 rounded-xl border border-border-subtle bg-surface p-5">
      {resolved ? (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">Settlement</h2>
            <span
              className={`font-mono-nums text-[10px] px-2 py-1 rounded-full ${
                outcome ? "text-yes bg-yes-bg" : "text-no bg-no-bg"
              }`}
            >
              {outcome ? "YES WON" : "NO WON"}
            </span>
          </div>

          {userWon && !claimed ? (
            <>
              <p className="text-xs text-dim mb-4">
                Your position won. Claim your payout directly from the market
                contract.
              </p>
              <button
                type="button"
                onClick={claimWinnings}
                disabled={busy}
                className="w-full py-3 rounded-lg bg-yes hover:bg-yes/90 text-white text-[13px] font-semibold transition-colors disabled:opacity-50 focus-ring"
              >
                {isPending
                  ? "Confirm in wallet…"
                  : isConfirming
                  ? "Confirming claim…"
                  : "Claim winnings"}
              </button>
            </>
          ) : claimed ? (
            <div className="rounded-lg bg-yes-bg border border-yes/20 py-3 text-center text-xs text-yes">
              Winnings claimed
            </div>
          ) : yesBet > 0n || noBet > 0n ? (
            <p className="text-xs text-muted">
              Your position did not match the final outcome.
            </p>
          ) : (
            <p className="text-xs text-muted">
              This market is settled. You had no position to claim.
            </p>
          )}
        </>
      ) : isOwner ? (
        <>
          <div className="font-mono-nums text-[10px] tracking-wider text-amber-400 mb-2">
            OWNER ACTION REQUIRED
          </div>
          <h2 className="text-sm font-medium mb-2">Resolve this market</h2>
          <p className="text-xs leading-relaxed text-muted mb-4">
            Resolution is final and determines every payout. Verify the result
            from a reliable source before choosing an outcome.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => resolveMarket(true)}
              disabled={busy}
              className="py-3 rounded-lg bg-yes hover:bg-yes/90 text-white text-xs font-semibold transition-colors disabled:opacity-50 focus-ring"
            >
              Resolve YES
            </button>
            <button
              type="button"
              onClick={() => resolveMarket(false)}
              disabled={busy}
              className="py-3 rounded-lg bg-no hover:bg-no/90 text-white text-xs font-semibold transition-colors disabled:opacity-50 focus-ring"
            >
              Resolve NO
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="font-mono-nums text-[10px] tracking-wider text-amber-400 mb-2">
            AWAITING RESOLUTION
          </div>
          <p className="text-xs leading-relaxed text-muted">
            Betting is closed. The market owner must submit the final outcome
            before winning positions can claim.
          </p>
        </>
      )}

      <div aria-live="polite">
        {busy && (
          <p className="text-[11px] text-muted mt-3">
            {isPending ? "Waiting for wallet confirmation…" : "Confirming on Avalanche…"}
          </p>
        )}
        {errorMessage && (
          <p className="text-[11px] text-no mt-3 wrap-break-word">
            {errorMessage}
          </p>
        )}
      </div>
    </section>
  );
}

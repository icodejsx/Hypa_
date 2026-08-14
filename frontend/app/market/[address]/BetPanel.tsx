"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { formatEther, parseEther } from "viem";
import { ConnectWallet } from "@/app/components/ConnectWallet";
import { MARKET_ABI } from "@/app/config/contracts";

const PRESETS = ["0.10", "0.50", "1.00"];

export function BetPanel({
  marketAddress,
  yesPercent,
  resolved,
  ended,
  totalYes,
  totalNo,
  onBetPlaced,
}: {
  marketAddress: `0x${string}`;
  yesPercent: number;
  resolved: boolean;
  ended: boolean;
  totalYes: bigint;
  totalNo: bigint;
  onBetPlaced: () => void;
}) {
  const { isConnected, address } = useAccount();
  const searchParams = useSearchParams();
  const [side, setSide] = useState<"yes" | "no">(
    searchParams.get("side") === "no" ? "no" : "yes"
  );
  const [amount, setAmount] = useState("0.10");
  const [validationError, setValidationError] = useState("");
  const handledHash = useRef<`0x${string}` | undefined>(undefined);

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  const { data: userBets } = useReadContract({
    address: marketAddress,
    abi: MARKET_ABI,
    functionName: "getUserBets",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  useEffect(() => {
    if (!isSuccess || !hash || handledHash.current === hash) return;
    handledHash.current = hash;
    onBetPlaced();
  }, [hash, isSuccess, onBetPlaced]);

  const bets = userBets as [bigint, bigint, boolean] | undefined;
  const yesBet = bets?.[0] ?? 0n;
  const noBet = bets?.[1] ?? 0n;
  const noPercent = 100 - yesPercent;
  const numericAmount = Number(amount);
  const amountIsValid =
    /^\d+(\.\d{0,18})?$/.test(amount) &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0;

  function calcPayout(): string {
    if (!amountIsValid) return "0.000";

    const yes = Number(formatEther(totalYes));
    const no = Number(formatEther(totalNo));
    const winPool = side === "yes" ? yes + numericAmount : no + numericAmount;
    const losePool = side === "yes" ? no : yes;
    const gross = numericAmount + (numericAmount / winPool) * losePool;
    return (gross * 0.98).toFixed(3);
  }

  function placeBet() {
    if (!amountIsValid) {
      setValidationError("Enter a valid AVAX amount greater than zero.");
      return;
    }

    setValidationError("");
    writeContract({
      address: marketAddress,
      abi: MARKET_ABI,
      functionName: side === "yes" ? "betYes" : "betNo",
      value: parseEther(amount),
    });
  }

  const busy = isPending || isConfirming;
  const errorMessage =
    error && "shortMessage" in error
      ? String(error.shortMessage)
      : error?.message.slice(0, 120);

  return (
    <section className="rounded-xl border border-border-subtle bg-surface overflow-hidden">
      <div className="p-5 border-b border-border-subtle">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-medium">Trade this market</h2>
            <p className="text-[11px] text-muted mt-1">
              Choose an outcome and enter your stake
            </p>
          </div>
          <span className="font-mono-nums text-[9px] text-muted px-2 py-1 rounded-full border border-border-strong">
            2% FEE
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4" role="group" aria-label="Outcome">
          <button
            type="button"
            onClick={() => setSide("yes")}
            disabled={resolved || ended}
            aria-pressed={side === "yes"}
            className={`py-3.5 grid gap-1 justify-items-center rounded-lg border transition-all focus-ring ${
              side === "yes"
                ? "bg-yes-bg border-yes/60 shadow-[inset_0_0_20px_rgba(29,158,117,0.06)]"
                : "border-border-strong hover:border-yes/40"
            } disabled:opacity-40`}
          >
            <span className="text-[10px] font-semibold text-yes">YES</span>
            <span className="font-mono-nums text-xl text-yes">
              {yesPercent}¢
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSide("no")}
            disabled={resolved || ended}
            aria-pressed={side === "no"}
            className={`py-3.5 grid gap-1 justify-items-center rounded-lg border transition-all focus-ring ${
              side === "no"
                ? "bg-no-bg border-no/60 shadow-[inset_0_0_20px_rgba(226,75,74,0.06)]"
                : "border-border-strong hover:border-no/40"
            } disabled:opacity-40`}
          >
            <span className="text-[10px] font-semibold text-no">NO</span>
            <span className="font-mono-nums text-xl text-no">{noPercent}¢</span>
          </button>
        </div>

        <label
          htmlFor="bet-amount"
          className="flex items-center justify-between text-[10px] text-muted mb-2"
        >
          <span className="font-mono-nums">AMOUNT</span>
          <span>AVAX</span>
        </label>
        <div className="relative mb-2">
          <input
            id="bet-amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setValidationError("");
            }}
            disabled={resolved || ended}
            aria-invalid={!!validationError}
            className="w-full bg-background border border-border-strong rounded-lg pl-3.5 pr-16 py-3 font-mono-nums text-base focus:outline-none focus:border-muted transition-colors disabled:opacity-40"
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono-nums text-muted">
            AVAX
          </span>
        </div>

        <div className="flex gap-1.5 mb-4">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setAmount(preset);
                setValidationError("");
              }}
              disabled={resolved || ended}
              className="flex-1 py-1.5 rounded-md border border-border-subtle text-[10px] font-mono-nums text-muted hover:text-foreground hover:border-border-strong transition-colors focus-ring disabled:opacity-40"
            >
              {preset}
            </button>
          ))}
        </div>

        <div className="rounded-lg bg-background/70 border border-border-subtle p-3 mb-4 space-y-2">
          <div className="flex justify-between text-[11px]">
            <span className="text-muted">Estimated return</span>
            <span className={side === "yes" ? "text-yes" : "text-no"}>
              <span className="font-mono-nums">{calcPayout()}</span> AVAX
            </span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-muted">Potential profit</span>
            <span className="font-mono-nums text-dim">
              {amountIsValid
                ? `${Math.max(0, Number(calcPayout()) - numericAmount).toFixed(3)} AVAX`
                : "0.000 AVAX"}
            </span>
          </div>
        </div>

        {resolved ? (
          <div className="text-center py-3 text-xs text-muted border border-border-subtle rounded-lg">
            This market has been resolved
          </div>
        ) : ended ? (
          <div className="text-center py-3 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            Betting closed · awaiting resolution
          </div>
        ) : !isConnected ? (
          <ConnectWallet />
        ) : (
          <button
            type="button"
            onClick={placeBet}
            disabled={busy || !amountIsValid}
            className={`w-full py-3 rounded-lg text-[13px] font-semibold transition-all focus-ring active:scale-[0.99] ${
              side === "yes"
                ? "bg-yes hover:bg-yes/90"
                : "bg-no hover:bg-no/90"
            } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isPending
              ? "Confirm in wallet…"
              : isConfirming
              ? "Confirming on Avalanche…"
              : `Buy ${side.toUpperCase()} · ${amount || "0"} AVAX`}
          </button>
        )}

        <div aria-live="polite">
          {isSuccess && (
            <div className="text-center text-[11px] text-yes mt-3">
              Trade confirmed on-chain
            </div>
          )}
          {(validationError || errorMessage) && (
            <div className="text-[11px] text-no mt-3 wrap-break-word">
              {validationError || errorMessage}
            </div>
          )}
        </div>
      </div>

      <div className="p-5">
        <div className="font-mono-nums text-[10px] tracking-wider text-muted mb-3">
          YOUR POSITION
        </div>
        {!isConnected ? (
          <p className="text-[11px] text-muted">
            Connect a wallet to view your positions.
          </p>
        ) : yesBet === 0n && noBet === 0n ? (
          <p className="text-[11px] text-muted">No position in this market yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-yes-bg border border-yes/20 p-3">
              <div className="text-[9px] text-yes mb-1">YES STAKE</div>
              <div className="font-mono-nums text-sm text-foreground">
                {Number(formatEther(yesBet)).toFixed(3)}
              </div>
            </div>
            <div className="rounded-lg bg-no-bg border border-no/20 p-3">
              <div className="text-[9px] text-no mb-1">NO STAKE</div>
              <div className="font-mono-nums text-sm text-foreground">
                {Number(formatEther(noBet)).toFixed(3)}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

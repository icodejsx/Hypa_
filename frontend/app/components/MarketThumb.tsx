"use client";

import { useState } from "react";
import type { Category } from "@/app/lib/category";
import {
  CATEGORY_GLYPH,
  fallbackGradient,
  resolveMarketImage,
} from "@/app/lib/marketImage";

export function MarketThumb({
  address,
  question,
  category,
  size = 44,
}: {
  address: string;
  question: string;
  category: Category;
  size?: number;
}) {
  const src = resolveMarketImage(question);
  const [broken, setBroken] = useState(false);

  const showImage = src !== null && !broken;

  return (
    <div
      className="shrink-0 rounded-lg overflow-hidden border border-border-strong/60 flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
      style={{
        width: size,
        height: size,
        background: showImage ? "#1c1c1c" : fallbackGradient(address),
      }}
    >
      {showImage ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          onError={() => setBroken(true)}
          className="w-full h-full object-contain p-1.5"
        />
      ) : (
        <span
          aria-hidden
          className="text-white/80"
          style={{ fontSize: size * 0.42, lineHeight: 1 }}
        >
          {CATEGORY_GLYPH[category]}
        </span>
      )}
    </div>
  );
}

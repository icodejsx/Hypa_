import Image from "next/image";
import Link from "next/link";
import mark from "@/public/hypa-mark.png";

/**
 * Brand lockup shared by the header and footer so both stay identical.
 * The mark is pre-trimmed to the glyph, so height alone controls its weight.
 */
export function Logo({
  markHeight = 30,
  className = "",
}: {
  markHeight?: number;
  className?: string;
}) {
  return (
    <Link
      href="/"
      aria-label="Hypa home"
      className={`inline-flex items-center gap-2.5 text-base font-semibold tracking-tight rounded-md focus-ring ${className}`}
    >
      <Image
        src={mark}
        alt=""
        height={markHeight}
        width={Math.round((markHeight * mark.width) / mark.height)}
        priority
        className="shrink-0"
      />
      <span>
        Hy<span className="text-avax">pa</span>
      </span>
    </Link>
  );
}

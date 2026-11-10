import Image from "next/image";
import Link from "next/link";

interface BrandLogoProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
}

const box = {
  sm: "w-8 h-8",
  md: "w-9 h-9",
  lg: "w-11 h-11",
};

const img = {
  sm: 32,
  md: 36,
  lg: 44,
};

export function BrandLogo({
  href = "/",
  size = "md",
  showWordmark = true,
  className = "",
}: BrandLogoProps) {
  const mark = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className={`${box[size]} relative rounded-xl overflow-hidden bg-[#FFF5EE] border border-brand/15 shadow-brand-sm shrink-0`}
      >
        <Image
          src="/brand/logo.png"
          alt="DeadlineOS"
          width={img[size]}
          height={img[size]}
          className="object-cover w-full h-full"
          priority
        />
      </span>
      {showWordmark && (
        <span className="font-display font-bold text-lg text-ink tracking-tight leading-none">
          Deadline<span className="text-brand">OS</span>
        </span>
      )}
    </span>
  );

  if (!href) return mark;
  return (
    <Link href={href} className="inline-flex items-center group">
      {mark}
    </Link>
  );
}

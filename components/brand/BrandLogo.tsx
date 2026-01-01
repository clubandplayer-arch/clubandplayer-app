import Image from "next/image";
import Link from "next/link";

type Variant = "signup" | "header";

type Props = {
  variant: Variant;
  href?: string; // default: /feed
  className?: string; // per sizing esterno
  containerClassName?: string;
  priority?: boolean;
  unlinked?: boolean; // se true non wrappa con Link
};

export default function BrandLogo({
  variant,
  href = "/feed",
  className,
  containerClassName,
  priority = false,
  unlinked = false,
}: Props) {
  const src = variant === "signup" ? "/brand/logo-signup.png" : "/brand/logo-wide.png";

  // dimensioni reali (per mantenere aspect ratio):
  // signup: 1292x295
  // header: 898x210
  const width = variant === "signup" ? 1292 : 898;
  const height = variant === "signup" ? 295 : 210;

  const img = (
    <Image
      src={src}
      alt="Club & Player"
      width={width}
      height={height}
      priority={priority}
      className={[
        // sizing di default sensato (poi puoi override via className)
        variant === "signup"
          ? "h-16 sm:h-20 md:h-24 lg:h-28 w-auto max-w-full object-contain"
          : "h-8 md:h-9 w-auto max-h-9 object-contain",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );

  if (unlinked) return <span className={containerClassName}>{img}</span>;

  return (
    <Link
      href={href}
      aria-label="Club & Player"
      className={["inline-flex items-center", containerClassName].filter(Boolean).join(" ")}
    >
      {img}
    </Link>
  );
}

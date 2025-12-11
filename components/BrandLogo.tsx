import Image from 'next/image'
import Link from 'next/link'

export type BrandLogoVariant = 'marketing' | 'navbar'

type BrandLogoProps = {
  variant: BrandLogoVariant
  className?: string
  href?: string
}

const variantConfig: Record<BrandLogoVariant, { imageClass: string; textClass: string; gapClass: string }> = {
  marketing: {
    imageClass: 'h-16 w-auto sm:h-[68px]',
    textClass: 'font-logo text-3xl sm:text-4xl font-extrabold text-[#00527a] leading-none',
    gapClass: 'gap-3 sm:gap-4',
  },
  navbar: {
    imageClass: 'h-9 w-auto',
    textClass: 'font-logo text-lg font-semibold text-white whitespace-nowrap leading-none',
    gapClass: 'gap-2',
  },
}

export default function BrandLogo({ variant, className, href }: BrandLogoProps) {
  const config = variantConfig[variant]
  const content = (
    <div className={`inline-flex flex-wrap items-center ${config.gapClass} ${className ?? ''}`} aria-label="Club & Player">
      <Image
        src="/brand/logo-cp.png"
        alt="Club & Player logo"
        width={variant === 'marketing' ? 68 : 40}
        height={variant === 'marketing' ? 68 : 40}
        className={`${config.imageClass} max-w-full`}
        priority={variant === 'navbar'}
      />
      <span className={config.textClass}>Club &amp; Player</span>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center" aria-label="Vai alla home di Club & Player">
        {content}
      </Link>
    )
  }

  return content
}

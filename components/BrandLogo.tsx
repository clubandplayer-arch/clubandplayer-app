import Image from 'next/image'
import Link from 'next/link'
import ClubPlayerWordmark from './brand/ClubPlayerWordmark'

export type BrandLogoVariant = 'marketing' | 'navbar'

type BrandLogoProps = {
  variant: BrandLogoVariant
  className?: string
  href?: string
}

const variantConfig: Record<
  BrandLogoVariant,
  { imageClass: string; wordmarkClass: string; wordmarkSizeClass: string; gapClass: string }
> = {
  marketing: {
    imageClass: 'h-20 w-auto sm:h-[88px] lg:h-24',
    wordmarkClass: 'font-logo font-extrabold text-[#00527a] leading-none',
    wordmarkSizeClass: 'text-4xl sm:text-5xl lg:text-6xl',
    gapClass: 'gap-3 sm:gap-4',
  },
  navbar: {
    imageClass: 'h-9 w-auto',
    wordmarkClass: 'font-logo font-semibold text-[var(--brand)] whitespace-nowrap leading-none',
    wordmarkSizeClass: 'text-xl sm:text-2xl',
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
      <ClubPlayerWordmark
        sizeClassName={config.wordmarkSizeClass}
        textClassName={config.wordmarkClass}
        ampersandClassName="text-[#036f9a]"
      />
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

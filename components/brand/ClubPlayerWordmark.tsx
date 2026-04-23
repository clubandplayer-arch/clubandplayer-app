import Link from 'next/link'

type ClubPlayerWordmarkProps = {
  href?: string
  className?: string
  sizeClassName?: string
  textClassName?: string
  ampersandClassName?: string
}

export default function ClubPlayerWordmark({
  href,
  className,
  sizeClassName = 'text-2xl',
  textClassName,
  ampersandClassName,
}: ClubPlayerWordmarkProps) {
  const rootClassName = ['inline-flex items-center select-none', className].filter(Boolean).join(' ')
  const textClasses = ['font-bold tracking-tight', sizeClassName, textClassName].filter(Boolean).join(' ')
  const ampersandClasses = [
    'inline-block align-baseline leading-none',
    'text-[2em]',
    '-mx-[0.14em]',
    'relative -top-[0.04em]',
    ampersandClassName,
  ]
    .filter(Boolean)
    .join(' ')

  const wordmark = (
    <span className={textClasses}>
      <span>Club</span>
      <span className={ampersandClasses}>&amp;</span>
      <span>Player</span>
    </span>
  )

  if (href) {
    return (
      <Link href={href} aria-label="Club & Player" className={rootClassName}>
        {wordmark}
      </Link>
    )
  }

  return <span className={rootClassName}>{wordmark}</span>
}

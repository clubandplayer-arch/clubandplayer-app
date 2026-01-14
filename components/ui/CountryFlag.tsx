import Image from 'next/image';

type CountryFlagProps = {
  iso2?: string | null;
  className?: string;
};

export function CountryFlag({ iso2, className = '' }: CountryFlagProps) {
  const code = (iso2 ?? '').trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(code)) return null;

  return (
    <Image
      src={`https://flagcdn.com/w20/${code}.png`}
      width={20}
      height={15}
      alt={code.toUpperCase()}
      className={`inline-block rounded-sm ${className}`.trim()}
    />
  );
}

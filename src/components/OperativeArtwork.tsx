import Image from 'next/image';

interface OperativeArtworkProps {
  alt?: string;
  className?: string;
  sizes?: string;
  loading?: 'eager' | 'lazy';
}

export default function OperativeArtwork({
  alt = '',
  className,
  sizes = '(max-width: 768px) 30vw, 220px',
  loading = 'lazy',
}: OperativeArtworkProps) {
  return (
    <Image
      src="/images/shadownet-operative.png"
      alt={alt}
      width={1024}
      height={1024}
      sizes={sizes}
      loading={loading}
      unoptimized
      className={className}
    />
  );
}
import Image from "next/image";

// Intrinsic aspect ratio of /brand/wordmark.svg (1709x286).
const ASPECT = 1709 / 286;

export default function BrandLogo({ width = 200, className = "" }: { width?: number; className?: string }) {
  const height = Math.round(width / ASPECT);
  return (
    <div className={className} style={{ width }}>
      <Image
        src="/brand/wordmark.svg"
        alt="Tahminle"
        width={width}
        height={height}
        className="h-auto w-full object-contain"
        priority
      />
    </div>
  );
}

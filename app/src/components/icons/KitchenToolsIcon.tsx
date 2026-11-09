import type { SVGProps } from 'react';

export function KitchenToolsIcon({
  size = 24,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <g transform="rotate(-45 12 12)">
        <rect x="9" y="2" width="6" height="7" rx="1.5" />
        <path d="M11 4v3m2-3v3m-1 2v12" />
      </g>
      <g transform="rotate(45 12 12)">
        <path d="M12 2c4 3 4 7 0 10v9M12 2v10h2" />
      </g>
    </svg>
  );
}

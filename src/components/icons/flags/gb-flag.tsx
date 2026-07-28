export function GbFlag(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" {...props}>
      <clipPath id="gb-circle">
        <circle cx="10" cy="10" r="10" />
      </clipPath>
      <g clipPath="url(#gb-circle)">
        <rect x="0" y="0" width="20" height="20" fill="#00247d" />
        <line x1="0" y1="0" x2="20" y2="20" stroke="#ffffff" strokeWidth="5" />
        <line x1="20" y1="0" x2="0" y2="20" stroke="#ffffff" strokeWidth="5" />
        <line x1="0" y1="0" x2="20" y2="20" stroke="#cf142b" strokeWidth="2" />
        <line x1="20" y1="0" x2="0" y2="20" stroke="#cf142b" strokeWidth="2" />
        <rect x="0" y="7.5" width="20" height="5" fill="#ffffff" />
        <rect x="7.5" y="0" width="5" height="20" fill="#ffffff" />
        <rect x="0" y="8.5" width="20" height="3" fill="#cf142b" />
        <rect x="8.5" y="0" width="3" height="20" fill="#cf142b" />
      </g>
    </svg>
  );
}

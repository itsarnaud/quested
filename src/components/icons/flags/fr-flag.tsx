export function FrFlag(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" {...props}>
      <clipPath id="fr-circle">
        <circle cx="10" cy="10" r="10" />
      </clipPath>
      <g clipPath="url(#fr-circle)">
        <rect x="0" y="0" width="6.67" height="20" fill="#002395" />
        <rect x="6.67" y="0" width="6.67" height="20" fill="#ffffff" />
        <rect x="13.33" y="0" width="6.67" height="20" fill="#ed2939" />
      </g>
    </svg>
  );
}

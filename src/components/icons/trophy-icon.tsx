export function TrophyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5H5a2 2 0 0 0 0 4h1.5" />
      <path d="M16 5h3a2 2 0 0 1 0 4h-1.5" />
      <path d="M12 13v3" />
      <path d="M9 20h6" />
      <path d="M10 16.5h4v2.5a2 2 0 0 1-2 1.5 2 2 0 0 1-2-1.5v-2.5Z" />
    </svg>
  );
}

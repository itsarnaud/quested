export function Logo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" width="20" height="20" {...props}>
      <rect width="32" height="32" rx="8" fill="#5b5bd6" />
      <circle cx="16" cy="15" r="7" fill="none" stroke="#ffffff" strokeWidth="3.4" />
      <line x1="19.2" y1="19.2" x2="24" y2="24" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}

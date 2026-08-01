export function ControllerIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M7 7h10a5 5 0 0 1 5 5.5v2a2.5 2.5 0 0 1-4.5 1.5L16 14H8l-1.5 2A2.5 2.5 0 0 1 2 14.5v-2A5 5 0 0 1 7 7Z" />
      <path d="M8 10.5v2" />
      <path d="M7 11.5h2" />
      <circle cx="17" cy="10.5" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

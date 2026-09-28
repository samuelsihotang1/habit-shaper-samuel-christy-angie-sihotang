import type { SVGProps } from 'react';

/*
 * Line icons on a 24px grid, 2px stroke, drawn inline so the app needs no icon
 * package (RULES.md §1.4). Each entry is the inside of one <svg>.
 */
const paths = {
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="16.5" rx="3" />
      <path d="M8 2.5v4M16 2.5v4M3 10h18" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  sparkles: (
    <>
      <path d="M10 3.5 11.6 8a3 3 0 0 0 1.9 1.9L18 11.5l-4.5 1.6a3 3 0 0 0-1.9 1.9L10 19.5 8.4 15a3 3 0 0 0-1.9-1.9L2 11.5l4.5-1.6A3 3 0 0 0 8.4 8Z" />
      <path d="M19 3v4M21 5h-4M19 17v3M20.5 18.5h-3" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  'chevron-left': <path d="M15 18l-6-6 6-6" />,
  'chevron-right': <path d="M9 18l6-6-6-6" />,
  'arrow-left': <path d="M19 12H5M11 18l-6-6 6-6" />,
  trash: (
    <>
      <path d="M3.5 6.5h17M9.5 6.5V4.5a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5v2" />
      <path d="M18.5 6.5 17.7 19a2 2 0 0 1-2 2H8.3a2 2 0 0 1-2-2L5.5 6.5M10 11v6M14 11v6" />
    </>
  ),
  pencil: <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16Zm9.5-13.5 4 4" />,
  flame: <path d="M12 21.5a7 7 0 0 0 7-7c0-4-3-6.5-4.5-9.5-.5 2.5-2 4-3.5 4.5.5-2-.5-4.5-2.5-6-.5 3.5-3.5 6.5-3.5 11a7 7 0 0 0 7 7Z" />,
  lock: (
    <>
      <rect x="4" y="10.5" width="16" height="10.5" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  shield: <path d="M12 21.5c-4.5-1.6-7.5-4.6-7.5-9.5V6L12 2.8 19.5 6v6c0 4.9-3 7.9-7.5 9.5Zm-3.2-9.7 2.3 2.3 4.3-4.3" />,
  list: <path d="M8.5 6h12M8.5 12h12M8.5 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  logout: <path d="M9.5 21H5.5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  trend: <path d="M3 17.5 9.5 11l4 4L21 7.5M15 7.5h6v6" />,
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, className = 'size-6', ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

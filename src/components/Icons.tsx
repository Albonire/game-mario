import type { SVGProps } from 'react';

export type IconName =
  | 'play'
  | 'arrow'
  | 'arrowLeft'
  | 'trophy'
  | 'bolt'
  | 'nitro'
  | 'box'
  | 'clock'
  | 'overtake'
  | 'spark'
  | 'sound'
  | 'mute'
  | 'pause'
  | 'fullscreen'
  | 'close'
  | 'keyboard'
  | 'gamepad'
  | 'touch'
  | 'flag'
  | 'pin'
  | 'check'
  | 'info'
  | 'restart'
  | 'chevron'
  | 'banana'
  | 'bowl'
  | 'steer'
  | 'shield'
  | 'star'
  | 'menu';

interface Props extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, strokeWidth = 1.8, ...rest }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...rest,
  };
  switch (name) {
    case 'play':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M8 5.6c0-1.1 1.2-1.8 2.2-1.2l9 6.4a1.5 1.5 0 0 1 0 2.4l-9 6.4A1.4 1.4 0 0 1 8 18.4V5.6Z" />
        </svg>
      );
    case 'arrow':
      return (
        <svg {...common}>
          <path d="M4 12h15M13 6l6 6-6 6" />
        </svg>
      );
    case 'arrowLeft':
      return (
        <svg {...common}>
          <path d="M20 12H5M11 6l-6 6 6 6" />
        </svg>
      );
    case 'trophy':
      return (
        <svg {...common}>
          <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
          <path d="M8 5H4v2a4 4 0 0 0 4 4M16 5h4v2a4 4 0 0 1-4 4M12 13v5M8 21h8M9 18h6" />
        </svg>
      );
    case 'bolt':
    case 'nitro':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M13.4 2 4.8 13.1c-.5.7 0 1.7.9 1.7h5l-1.1 6.6c-.1.8.9 1.2 1.4.6l8.7-11.1c.5-.7 0-1.7-.9-1.7h-5l1.1-6.6c.1-.8-.9-1.2-1.5-.6Z" />
        </svg>
      );
    case 'box':
      return (
        <svg {...common}>
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
          <path d="m4 7.5 8 4.5 8-4.5M12 12v9M8 5.2l8 4.5" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5.5l3.5 2" />
        </svg>
      );
    case 'overtake':
      return (
        <svg {...common}>
          <path d="M3 16h9M8 11l4 5-4 5M21 8h-9M16 3l-4 5 4 5" />
        </svg>
      );
    case 'spark':
      return (
        <svg {...common}>
          <path d="m12 2 2.2 6.1L20 10l-5.5 2.2L12 18l-2.2-5.8L4 10l5.5-1.9L12 2Z" />
          <path d="M19 16.5 20 19l2.5 1-2.5.9-1 2.6-1-2.6-2.5-.9 2.5-1 1-2.5Z" />
        </svg>
      );
    case 'sound':
      return (
        <svg {...common}>
          <path d="M11 5 6.5 8.5H3v7h3.5L11 19V5Z" />
          <path d="M15 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" />
        </svg>
      );
    case 'mute':
      return (
        <svg {...common}>
          <path d="M11 5 6.5 8.5H3v7h3.5L11 19V5ZM16 9l5 6M21 9l-5 6" />
        </svg>
      );
    case 'pause':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <rect x="6" y="4" width="4.5" height="16" rx="1.2" />
          <rect x="13.5" y="4" width="4.5" height="16" rx="1.2" />
        </svg>
      );
    case 'fullscreen':
      return (
        <svg {...common}>
          <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5" />
        </svg>
      );
    case 'close':
      return (
        <svg {...common}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );
    case 'keyboard':
      return (
        <svg {...common}>
          <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
          <path d="M6 9h.01M9.5 9h.01M13 9h.01M16.5 9h.01M6 12.5h.01M9.5 12.5h.01M13 12.5h.01M16.5 12.5h.01M8 16h8" />
        </svg>
      );
    case 'gamepad':
      return (
        <svg {...common}>
          <path d="M7.5 7h9a5 5 0 0 1 4.7 6.7l-1.2 3.3a2.5 2.5 0 0 1-4.2.8L14 15.5h-4l-1.8 2.3a2.5 2.5 0 0 1-4.2-.8l-1.2-3.3A5 5 0 0 1 7.5 7Z" />
          <path d="M8 10.5v4M6 12.5h4M16 11h.01M18 13.5h.01" />
        </svg>
      );
    case 'touch':
      return (
        <svg {...common}>
          <path d="M9 11V5.5a2 2 0 0 1 4 0V11" />
          <path d="M13 10.5V8a2 2 0 0 1 4 0v4M17 11V9.5a2 2 0 0 1 3.5-1.3M9 10.5 7.4 9A1.8 1.8 0 0 0 5 11.7l3 6.3A4 4 0 0 0 11.6 20H14a5 5 0 0 0 5-5v-2" />
        </svg>
      );
    case 'flag':
      return (
        <svg {...common}>
          <path d="M5 21V4M5 4h11l-1.5 3L16 10H5" />
        </svg>
      );
    case 'pin':
      return (
        <svg {...common}>
          <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <path d="m4 12 5 5L20 6" />
        </svg>
      );
    case 'info':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6M12 7.5h.01" />
        </svg>
      );
    case 'restart':
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
        </svg>
      );
    case 'chevron':
      return (
        <svg {...common}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      );
    case 'banana':
      return (
        <svg {...common}>
          <path d="M4 5c1 9 7 14 16 15-2-2-3-4-3-7-3 3-8 1-8-4 0-2-2-3-5-4Z" />
          <path d="M4 5 2 4" />
        </svg>
      );
    case 'bowl':
      return (
        <svg {...common}>
          <circle cx="12" cy="13" r="8" />
          <path d="M9 9h.01M14 7.5h.01M12 12h.01" />
        </svg>
      );
    case 'steer':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M3 12h6.5M14.5 12H21M12 14.5V21" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...common}>
          <path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6L12 3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case 'star':
      return (
        <svg {...common}>
          <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
        </svg>
      );
    case 'menu':
      return (
        <svg {...common}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
    default:
      return null;
  }
}

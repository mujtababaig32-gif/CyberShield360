// A compact set of stroke-based line icons for app chrome (sidebar, header).
// Deliberately plain and consistent — 24x24, 1.6 stroke, round caps — so the
// nav reads as one coherent system instead of mixed platform emoji.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(children: React.ReactNode, props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconGrid = (p: IconProps) =>
  base(<><rect x="3.5" y="3.5" width="7" height="7" rx="1.2" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.2" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.2" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.2" /></>, p);

export const IconTrendUp = (p: IconProps) =>
  base(<><path d="M3.5 17 9 11.5l4 4L20.5 7" /><path d="M14.5 7h6v6" /></>, p);

export const IconSparkAI = (p: IconProps) =>
  base(<><path d="M12 3.5 13.6 9l5.4 1.5-5.4 1.5L12 17.5 10.4 12 5 10.5 10.4 9z" strokeLinejoin="round" /><path d="M18.5 4v3M17 5.5h3" /></>, p);

export const IconSearch = (p: IconProps) =>
  base(<><circle cx="10.5" cy="10.5" r="6.5" /><path d="M20 20l-4.8-4.8" /></>, p);

export const IconCompass = (p: IconProps) =>
  base(<><circle cx="12" cy="12" r="8.5" /><path d="M14.8 9.2 13 13l-3.8 1.8L11 11l3.8-1.8z" /></>, p);

export const IconHandshake = (p: IconProps) =>
  base(<><path d="M3.5 11.5 8 8l3 2 3-2 4.5 3.5" /><path d="M6 13l3 3 2-1.5M18 13l-3 3-2-1.5" /><path d="M3.5 11.5 6 15M20.5 11.5 18 15" /></>, p);

export const IconPackage = (p: IconProps) =>
  base(<><path d="M3.5 8 12 4l8.5 4-8.5 4-8.5-4z" /><path d="M3.5 8v8l8.5 4 8.5-4V8" /><path d="M12 12v8" /></>, p);

export const IconWrench = (p: IconProps) =>
  base(<path d="M14.7 6.3a4 4 0 0 0-5.4 4.9L4 16.5 7.5 20l5.3-5.3a4 4 0 0 0 4.9-5.4l-2.6 2.6-2.1-2.1 2.6-2.6z" />, p);

export const IconBriefcase = (p: IconProps) =>
  base(<><rect x="3.5" y="8" width="17" height="11" rx="1.5" /><path d="M8.5 8V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2" /><path d="M3.5 13h17" /></>, p);

export const IconFileText = (p: IconProps) =>
  base(<><path d="M7 3.5h7l3.5 3.5V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" /><path d="M14 3.5V7a1 1 0 0 0 1 1h3.5" /><path d="M9 13h6M9 16.5h6" /></>, p);

export const IconCard = (p: IconProps) =>
  base(<><rect x="3" y="5.5" width="18" height="13" rx="1.6" /><path d="M3 9.5h18" /><path d="M6.5 14.5h4" /></>, p);

export const IconGlobe = (p: IconProps) =>
  base(<><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.6 2.4 4 5.3 4 8.5s-1.4 6.1-4 8.5c-2.6-2.4-4-5.3-4-8.5s1.4-6.1 4-8.5z" /></>, p);

export const IconFolder = (p: IconProps) =>
  base(<path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4l2 2.2h8A1.5 1.5 0 0 1 20.5 8.7V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" />, p);

export const IconClock = (p: IconProps) =>
  base(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>, p);

export const IconShieldAlert = (p: IconProps) =>
  base(<><path d="M12 3.5 19 6.5v5.3c0 4.4-2.9 7.6-7 8.7-4.1-1.1-7-4.3-7-8.7V6.5z" /><path d="M12 8.5v4.2M12 15.3h.01" /></>, p);

export const IconCloud = (p: IconProps) =>
  base(<path d="M7 18.5a4 4 0 0 1-.6-7.95A5 5 0 0 1 16.2 8.6 4.5 4.5 0 0 1 17.5 17.5" />, p);

export const IconShareNetwork = (p: IconProps) =>
  base(<><circle cx="6" cy="6" r="2.2" /><circle cx="18" cy="6" r="2.2" /><circle cx="12" cy="18" r="2.2" /><path d="M7.8 7.2 12 15.8M16.2 7.2 12 15.8" /></>, p);

export const IconAlertTriangle = (p: IconProps) =>
  base(<><path d="M12 4 21 19H3z" /><path d="M12 10v4.2M12 17h.01" /></>, p);

export const IconClipboardList = (p: IconProps) =>
  base(<><rect x="5" y="4.5" width="14" height="16" rx="1.5" /><rect x="9" y="3" width="6" height="3" rx="1" /><path d="M8.5 11h7M8.5 14.5h7M8.5 18h4.5" /></>, p);

export const IconPuzzle = (p: IconProps) =>
  base(<path d="M9 4.5h3.2a1.4 1.4 0 0 1 1.4 1.6 1.6 1.6 0 0 0 1.6 1.9h1.3a1.5 1.5 0 0 1 1.5 1.5V12a1.6 1.6 0 0 0-1.9-1.6 1.4 1.4 0 0 0 0 2.8 1.6 1.6 0 0 1 1.9 1.6v2.7a1.5 1.5 0 0 1-1.5 1.5h-2.7a1.6 1.6 0 0 1 1.6-1.9 1.4 1.4 0 1 0-2.8 0 1.6 1.6 0 0 1 1.6 1.9H9a1.5 1.5 0 0 1-1.5-1.5v-1.3a1.6 1.6 0 0 0-1.9-1.6 1.4 1.4 0 1 1 0-2.8A1.6 1.6 0 0 0 7.5 12v-1.3A1.5 1.5 0 0 1 9 9.2" />, p);

export const IconBuilding = (p: IconProps) =>
  base(<><rect x="4.5" y="3.5" width="10" height="17" rx="1" /><rect x="15.5" y="9.5" width="5" height="11" rx="1" /><path d="M7.5 7h1M11 7h1M7.5 10.5h1M11 10.5h1M7.5 14h1M11 14h1" /></>, p);

export const IconGraduationCap = (p: IconProps) =>
  base(<><path d="M12 4.5 21 9l-9 4.5L3 9z" /><path d="M7 11v4.5c0 1.5 2.2 2.8 5 2.8s5-1.3 5-2.8V11" /></>, p);

export const IconFishHook = (p: IconProps) =>
  base(<path d="M9 4v9a3.5 3.5 0 1 0 5.8 2.6M9 4a2 2 0 1 1 4 0v1.5" />, p);

export const IconChalkboard = (p: IconProps) =>
  base(<><rect x="3.5" y="4" width="17" height="11" rx="1.2" /><path d="M9.5 20h5M12 15v5" /><path d="M7 8.5l3 2.5 2.5-3 3.5 3" /></>, p);

export const IconSiren = (p: IconProps) =>
  base(<><path d="M6 13a6 6 0 0 1 12 0v5.5H6z" /><path d="M12 4v2.2M5 8l1.4 1.4M19 8l-1.4 1.4" /><path d="M4.5 20.5h15" /></>, p);

export const IconTarget = (p: IconProps) =>
  base(<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></>, p);

export const IconEyeOff = (p: IconProps) =>
  base(<><path d="M3.5 3.5l17 17" /><path d="M10.6 5.3A10.4 10.4 0 0 1 12 5.2c5 0 8.5 4 9.5 6.8a11 11 0 0 1-3 4.1M6.6 6.9C4.6 8.2 3.1 10.2 2.5 12c1 2.8 4.5 6.8 9.5 6.8 1.4 0 2.7-.3 3.9-.8" /><path d="M9.9 10a3 3 0 0 0 4.1 4.1" /></>, p);

export const IconFireExtinguisher = (p: IconProps) =>
  base(<><path d="M10 7h4M12 4v3" /><path d="M9 7h6v4a3 3 0 0 1-3 3 3 3 0 0 1-3-3z" /><path d="M12 14v6.5M9 20.5h6" /><path d="M15 8.5h4" /></>, p);

export const IconReceipt = (p: IconProps) =>
  base(<><path d="M6 3.5h12v17l-2.5-1.5L13 20.5l-2.5-1.5-2.5 1.5L6 20.5z" /><path d="M9 8h6M9 11.5h6M9 15h4" /></>, p);

export const IconCraneBuild = (p: IconProps) =>
  base(<><path d="M4 20.5h16" /><path d="M6.5 20.5V9L15 4.5" /><path d="M15 4.5 19 8h-6" /><path d="M15 8v3.5M11 20.5V13h4v7.5" /></>, p);

export const IconUsers = (p: IconProps) =>
  base(<><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" /><path d="M16 8.8a2.7 2.7 0 1 0-1-5.2M17 14.2c2 .4 3.5 1.9 3.5 4.3" /></>, p);

export const IconLock = (p: IconProps) =>
  base(<><rect x="5" y="10.5" width="14" height="9.5" rx="1.6" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /><path d="M12 14.2v2.6" /></>, p);

export const IconBell = (p: IconProps) =>
  base(<><path d="M6 10.5a6 6 0 0 1 12 0v4l1.6 2.5H4.4L6 14.5z" /><path d="M10 19.5a2 2 0 0 0 4 0" /></>, p);

export const IconUser = (p: IconProps) =>
  base(<><circle cx="12" cy="8.2" r="3.4" /><path d="M4.8 20c0-3.6 3.2-6.2 7.2-6.2s7.2 2.6 7.2 6.2" /></>, p);

export const IconMenu = (p: IconProps) =>
  base(<path d="M4 6.5h16M4 12h16M4 17.5h16" />, p);

export const IconClose = (p: IconProps) =>
  base(<path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />, p);

export const IconCheck = (p: IconProps) =>
  base(<path d="M5 12.5l4.5 4.5L19 7.5" />, p);

export const IconSettings = (p: IconProps) =>
  base(<><circle cx="12" cy="12" r="3" /><path d="M19.4 13.6a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>, p);

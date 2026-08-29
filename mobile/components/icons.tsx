// 1:1 ports of the inline SVGs used across the web app's components, so the
// mobile app renders the exact same iconography rather than a stand-in set.
import Svg, { Circle, Path, Rect } from "react-native-svg";

type IconProps = { size?: number; color?: string };

const base = (size = 16) => ({ viewBox: "0 0 24 24", width: size, height: size });
const stroke = (color: string) => ({ fill: "none" as const, stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const });

export function IconClock({ size, color = "currentColor" }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Circle cx={12} cy={12} r={9} {...stroke(color)} />
      <Path d="M12 8v4l3 2" {...stroke(color)} />
    </Svg>
  );
}

export function IconCalendar({ size, color = "currentColor" }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={3} y={4} width={18} height={18} rx={2} {...stroke(color)} />
      <Path d="M3 9h18M8 2v4M16 2v4" {...stroke(color)} />
    </Svg>
  );
}

export function IconPeople({ size, color = "currentColor" }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path
        d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-2.13a4 4 0 100-8 4 4 0 000 8zm6 0a4 4 0 100-8"
        {...stroke(color)}
      />
    </Svg>
  );
}

export function IconChevronDown({ size, color = "currentColor" }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M6 9l6 6 6-6" {...stroke(color)} />
    </Svg>
  );
}

export function IconWallet({ size, color = "currentColor" }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={3} y={6} width={18} height={13} rx={2} {...stroke(color)} />
      <Path d="M3 10h18" {...stroke(color)} />
    </Svg>
  );
}

export function IconWalletDetailed({ size, color = "currentColor" }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={3} y={6} width={18} height={13} rx={2} {...stroke(color)} />
      <Path d="M3 10h18M16 14h2" {...stroke(color)} />
    </Svg>
  );
}

export function IconTrendBars({ size, color = "currentColor" }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M8 20V10M13 20V4M18 20v-7" {...stroke(color)} />
    </Svg>
  );
}

export function IconTrendUp({ size, color = "currentColor" }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M3 17l6-6 4 4 8-8" {...stroke(color)} />
    </Svg>
  );
}

export function IconTrendUpArrow({ size, color = "currentColor" }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M3 17l6-6 4 4 8-8M15 3h6v6" {...stroke(color)} />
    </Svg>
  );
}

export function IconCheck({ size, color = "currentColor" }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M20 6L9 17l-5-5" {...stroke(color)} />
    </Svg>
  );
}

export function IconX({ size, color = "currentColor" }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M18 6L6 18M6 6l12 12" {...stroke(color)} />
    </Svg>
  );
}

export function IconLock({ size, color = "currentColor" }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={5} y={11} width={14} height={9} rx={2} {...stroke(color)} />
      <Path d="M8 11V8a4 4 0 018 0v3" {...stroke(color)} />
    </Svg>
  );
}

export function IconStar({ size, color = "currentColor" }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M12 3l1.6 4.9L18.5 9l-4.9 1.6L12 15.5l-1.6-4.9L5.5 9l4.9-1.6L12 3z" {...stroke(color)} />
    </Svg>
  );
}

export function IconShield({ size, color = "currentColor" }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...stroke(color)} />
    </Svg>
  );
}

export function IconInfo({ size, color = "currentColor" }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Circle cx={12} cy={12} r={9} {...stroke(color)} />
      <Path d="M12 16v-4M12 8h.01" {...stroke(color)} />
    </Svg>
  );
}

export function IconCirclePlus({ size, color = "currentColor" }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Circle cx={12} cy={12} r={9} {...stroke(color)} />
      <Path d="M12 8v8M8 12h8" {...stroke(color)} />
    </Svg>
  );
}

export function IconLogout({ size, color = "currentColor" }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" {...stroke(color)} />
      <Path d="M16 17l5-5-5-5M21 12H9" {...stroke(color)} />
    </Svg>
  );
}

export function IconBell({ size, color = "currentColor" }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" {...stroke(color)} />
      <Path d="M13.73 21a2 2 0 01-3.46 0" {...stroke(color)} />
    </Svg>
  );
}

export function IconTicket({ size, color = "currentColor" }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={6} y={4} width={12} height={16} rx={2} {...stroke(color)} />
      <Path d="M9 9h6M9 13h6M9 17h3" {...stroke(color)} />
    </Svg>
  );
}

export function IconPerson({ size, color = "currentColor" }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Circle cx={12} cy={8} r={3.5} {...stroke(color)} />
      <Path d="M5 20c1.2-3.5 4-5.5 7-5.5s5.8 2 7 5.5" {...stroke(color)} />
    </Svg>
  );
}

export function IconArrowRight({ size, color = "currentColor" }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M4 12h13M13 6l6 6-6 6" {...stroke(color)} />
    </Svg>
  );
}

export function IconGift({ size, color = "currentColor" }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={3} y={8} width={18} height={13} rx={2} {...stroke(color)} />
      <Path d="M12 8v13M3 12h18M12 8s-1-4-4-4-2 4 4 4zM12 8s1-4 4-4 2 4-4 4z" {...stroke(color)} />
    </Svg>
  );
}

export function IconTrophy({ size, color = "currentColor" }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4z" {...stroke(color)} />
      <Path d="M7 6H5a2 2 0 000 4h2M17 6h2a2 2 0 010 4h-2" {...stroke(color)} />
    </Svg>
  );
}

export function IconSparkle({ size, color = "currentColor" }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" {...stroke(color)} />
    </Svg>
  );
}

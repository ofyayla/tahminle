import Image from "next/image";
import { teamCodeFromName, TEAM_META } from "@/lib/teams";
import { getClubLogo } from "@/lib/clubLogos";

export default function TeamAvatar({ name, size = 48 }: { name: string; size?: number }) {
  const code = teamCodeFromName(name);
  const logo = code ? TEAM_META[code].logo : getClubLogo(name);

  if (logo) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center overflow-hidden rounded-full"
      >
        <Image
          src={logo}
          alt={name}
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div
      style={{ width: size, height: size, borderColor: "#616a80" }}
      className="flex items-center justify-center rounded-full border-2 bg-bg-elevated font-display text-[11px]"
    >
      <span className="text-ink-dim">{initials}</span>
    </div>
  );
}

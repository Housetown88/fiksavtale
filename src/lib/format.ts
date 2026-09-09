export function formatRelativeNb(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 45_000) return "Akkurat nå";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} min siden`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 time siden" : `${hours} timer siden`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "I går";
  if (days < 14) return `${days} dager siden`;
  return date.toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

export function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "?";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function formatOsloDateTime(date: Date): string {
  return new Intl.DateTimeFormat("nb-NO", {
    timeZone: "Europe/Oslo",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

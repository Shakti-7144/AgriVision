/** Human-readable relative time, e.g. "3 days ago", "just now". */
export function timeAgo(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const future = diffMs < 0;
  const abs = Math.abs(diffMs);
  const sec = Math.floor(abs / 1000);
  if (sec < 30) return future ? "in moments" : "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return future ? `in ${min}m` : `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return future ? `in ${hr}h` : `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return future ? `in ${day}d` : `${day} day${day === 1 ? "" : "s"} ago`;
  const wk = Math.floor(day / 7);
  if (wk < 4) return future ? `in ${wk}w` : `${wk} week${wk === 1 ? "" : "s"} ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return future ? `in ${mo}mo` : `${mo} month${mo === 1 ? "" : "s"} ago`;
  const yr = Math.floor(day / 365);
  return future ? `in ${yr}y` : `${yr} year${yr === 1 ? "" : "s"} ago`;
}

export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

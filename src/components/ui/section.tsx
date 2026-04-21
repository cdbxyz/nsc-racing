const TINT: Record<string, string> = {
  white:     "bg-white",
  muted:     "bg-neutral-50",
  navy:      "bg-navy-50",
  "navy-mid": "bg-navy-100",
  sea:       "bg-sea-50",
  "sea-mid": "bg-sea-100",
  sand:      "bg-amber-50",
};

export type SectionTint = "white" | "muted" | "navy" | "navy-mid" | "sea" | "sea-mid" | "sand";

export function Section({
  tint = "white",
  children,
  className = "",
}: {
  tint?: SectionTint;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`${TINT[tint] ?? "bg-white"} ${className}`}>
      {children}
    </section>
  );
}

export function Wireframe({ kind }: { kind: string }) {
  const common = { fill: "none", stroke: "#161310", strokeOpacity: 0.55, strokeWidth: 1.4 };
  return (
    <svg className="wire" viewBox="0 0 160 120" width="160" height="120" aria-hidden>
      {kind === "rule-of-thirds" && (
        <>
          <rect x="8" y="8" width="144" height="104" {...common} />
          <line x1="56" y1="8" x2="56" y2="112" {...common} />
          <line x1="104" y1="8" x2="104" y2="112" {...common} />
          <line x1="8" y1="42" x2="152" y2="42" {...common} />
          <line x1="8" y1="78" x2="152" y2="78" {...common} />
          <circle cx="104" cy="78" r="10" {...common} />
        </>
      )}
      {kind === "centered" && (
        <>
          <rect x="8" y="8" width="144" height="104" {...common} />
          <line x1="80" y1="8" x2="80" y2="112" {...common} />
          <line x1="8" y1="60" x2="152" y2="60" {...common} />
          <circle cx="80" cy="60" r="16" {...common} />
        </>
      )}
      {kind === "frame-in-frame" && (
        <>
          <rect x="8" y="8" width="144" height="104" {...common} />
          <rect x="32" y="24" width="96" height="72" {...common} />
          <circle cx="80" cy="64" r="12" {...common} />
        </>
      )}
      {kind === "leading-lines" && (
        <>
          <rect x="8" y="8" width="144" height="104" {...common} />
          <line x1="80" y1="16" x2="24" y2="112" {...common} />
          <line x1="80" y1="16" x2="136" y2="112" {...common} />
          <circle cx="80" cy="88" r="10" {...common} />
        </>
      )}
      {kind === "negative-space" && (
        <>
          <rect x="8" y="8" width="144" height="104" {...common} />
          <circle cx="48" cy="88" r="11" {...common} />
        </>
      )}
      {kind === "close-up" && (
        <>
          <rect x="8" y="8" width="144" height="104" {...common} />
          <circle cx="80" cy="52" r="22" {...common} />
          <rect x="52" y="78" width="56" height="26" rx="10" {...common} />
        </>
      )}
    </svg>
  );
}

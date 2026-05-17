type SignalArtworkProps = {
  label?: string;
  compact?: boolean;
};

export function SignalArtwork({ label = "Live signal map", compact = false }: SignalArtworkProps) {
  return (
    <div className={compact ? "signal-art signal-art-compact" : "signal-art"} aria-hidden="true">
      <div className="signal-art__grid" />
      <div className="signal-art__orbit signal-art__orbit-one" />
      <div className="signal-art__orbit signal-art__orbit-two" />
      <div className="signal-art__orbit signal-art__orbit-three" />
      <div className="signal-art__node signal-art__node-a">GH</div>
      <div className="signal-art__node signal-art__node-b">npm</div>
      <div className="signal-art__node signal-art__node-c">HN</div>
      <div className="signal-art__node signal-art__node-d">AI</div>
      <div className="signal-art__needle" />
      <div className="signal-art__stack signal-art__stack-a" />
      <div className="signal-art__stack signal-art__stack-b" />
      <div className="signal-art__mascot">
        <span>◉</span>
        <span>⌁</span>
      </div>
      <div className="signal-art__label">{label}</div>
    </div>
  );
}

export function SignalMarquee() {
  return (
    <div className="signal-marquee" aria-hidden="true">
      <div className="signal-marquee__track">
        <span>GITHUB VELOCITY</span>
        <span>NPM DEMAND</span>
        <span>HN PAIN</span>
        <span>COMPETITION GAP</span>
        <span>BUILD / SKIP / WATCH</span>
        <span>GITHUB VELOCITY</span>
        <span>NPM DEMAND</span>
        <span>HN PAIN</span>
        <span>COMPETITION GAP</span>
        <span>BUILD / SKIP / WATCH</span>
      </div>
    </div>
  );
}

type GraffitiMarkProps = {
  word?: string;
  tone?: "signal" | "insight" | "clarity" | "ink";
  className?: string;
};

const toneClass = {
  signal: "text-action border-action",
  insight: "text-insight border-insight",
  clarity: "text-clarity border-clarity",
  ink: "text-ink border-ink",
};

export function GraffitiMark({
  word = "SCOUT",
  tone = "signal",
  className = "",
}: GraffitiMarkProps) {
  return (
    <div className={`graffiti-mark ${toneClass[tone]} ${className}`} aria-hidden="true">
      <span>{word}</span>
      <i />
      <b />
    </div>
  );
}

export function SprayBurst({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`spray-burst ${className}`}
      viewBox="0 0 220 180"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M31 103C50 57 97 24 145 34c40 8 61 42 49 72-14 35-65 52-106 43-38-8-70-18-57-46Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="10 8"
      />
      <path
        d="M70 82c24-29 69-36 93-16 24 21 12 59-22 75-32 15-80 8-92-18-6-13 5-25 21-41Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      {[
        [25, 52, 5],
        [52, 32, 3],
        [191, 39, 4],
        [203, 112, 5],
        [164, 158, 3],
        [42, 151, 4],
        [113, 20, 3],
        [132, 168, 5],
      ].map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="currentColor" opacity="0.45" />
      ))}
    </svg>
  );
}

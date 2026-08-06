import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {Brand, Copy, enter, Eyebrow, Headline, Pill} from "../components";
import {theme} from "../theme";

const issues = [
  {title: "Improve cache invalidation for workspace events", tags: ["backend", "performance"], points: 180},
  {title: "Add keyboard navigation to command palette", tags: ["frontend", "accessibility"], points: 120},
  {title: "Document local development with containers", tags: ["docs", "devtools"], points: 70},
];

export const OpenSourceJourney = () => {
  const frame = useCurrentFrame();
  const selected = Math.min(2, Math.floor(frame / 105));
  const claimProgress = interpolate(frame, [250, 315], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return <AbsoluteFill style={{background: theme.bg, padding: "68px 88px"}}>
    <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}><Brand /><Eyebrow>Open source opportunities</Eyebrow></div>
    <div style={{display: "grid", gridTemplateColumns: "600px 1fr", gap: 56, alignItems: "center", flex: 1}}>
      <div style={{display: "flex", flexDirection: "column", gap: 28}}>
        <div style={enter(frame, 5)}><Headline size={72}>Find public work worth doing.</Headline></div>
        <div style={enter(frame, 20)}><Copy width={580}>Browse curated projects. Compare meaningful issues. See the Street Points available before you choose the work.</Copy></div>
        <div style={{...enter(frame, 40), display: "flex", flexDirection: "column", gap: 15}}>
          {["Browse a project", "Choose a scored issue", "Claim with a unique PoWR token", "Submit a pull request"].map((step, index) => <div key={step} style={{fontFamily: "Arial", color: frame > 45 + index * 34 ? theme.text : "#545a64", fontSize: 25, fontWeight: 600, display: "flex", alignItems: "center", gap: 16}}><span style={{width: 34, height: 34, borderRadius: 10, background: frame > 45 + index * 34 ? "rgba(255,106,26,.12)" : theme.surface, color: frame > 45 + index * 34 ? theme.orange : "#555b65", display: "grid", placeItems: "center", fontSize: 18}}>◆</span>{step}</div>)}
        </div>
      </div>
      <div style={{...enter(frame, 18), background: "#0f1014", borderRadius: 30, padding: 30, boxShadow: "0 40px 120px rgba(0,0,0,.48)"}}>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}><div><div style={{fontFamily: "Arial", color: theme.text, fontSize: 34, fontWeight: 700}}>calcom / cal.com</div><div style={{fontFamily: "Arial", color: theme.muted, fontSize: 20, marginTop: 8}}>Scheduling infrastructure for everyone.</div></div><Pill active>Partner project</Pill></div>
        <div style={{display: "flex", gap: 12, marginTop: 26}}><Pill>TypeScript</Pill><Pill>★ 35.2k</Pill><Pill>124 open issues</Pill></div>
        <div style={{display: "flex", flexDirection: "column", gap: 12, marginTop: 28}}>{issues.map((issue, index) => <div key={issue.title} style={{background: selected === index ? theme.raised : theme.surface, borderRadius: 18, padding: "20px 22px", display: "grid", gridTemplateColumns: "1fr auto", gap: 20, scale: selected === index ? 1.018 : 1}}><div><div style={{fontFamily: "Arial", color: theme.text, fontSize: 22, fontWeight: 650}}>{issue.title}</div><div style={{display: "flex", gap: 8, marginTop: 12}}>{issue.tags.map(tag => <span key={tag} style={{fontFamily: "Arial", color: theme.muted, background: "rgba(255,255,255,.04)", borderRadius: 8, padding: "7px 10px", fontSize: 15}}>{tag}</span>)}</div></div><div style={{alignSelf: "center", textAlign: "right"}}><div style={{fontFamily: "Arial", color: theme.orange, fontSize: 30, fontWeight: 700}}>{issue.points}</div><div style={{fontFamily: "Arial", color: theme.muted, fontSize: 14}}>Street Points</div></div></div>)}</div>
        {frame > 235 && <div style={{opacity: claimProgress, marginTop: 18, background: "rgba(255,106,26,.09)", borderRadius: 16, padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center"}}><div><div style={{fontFamily: "Arial", color: theme.orange, fontSize: 16, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2}}>Claim token</div><div style={{fontFamily: "monospace", color: theme.text, fontSize: 22, marginTop: 7}}>POWR-OSS-7F3A91</div></div><div style={{fontFamily: "Arial", background: theme.orange, color: "white", padding: "13px 20px", borderRadius: 10, fontWeight: 700}}>Copy token</div></div>}
      </div>
    </div>
  </AbsoluteFill>;
};

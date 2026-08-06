import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {Brand, Copy, enter, Eyebrow, Headline} from "../components";
import {theme} from "../theme";

const stages = [
  {label: "Issue claimed", detail: "POWR-OSS-7F3A91"},
  {label: "Pull request opened", detail: "Token included in public evidence"},
  {label: "Maintainer merged", detail: "GitHub confirms the contribution"},
  {label: "Street Points awarded", detail: "+180 verified reputation"},
];

export const Verification = () => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{background: "#0d0e12", padding: "76px 100px"}}>
    <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}><Brand /><Eyebrow>Public verification</Eyebrow></div>
    <div style={{display: "grid", gridTemplateColumns: "700px 1fr", gap: 90, alignItems: "center", flex: 1}}>
      <div style={{display: "flex", flexDirection: "column", gap: 30}}><div style={enter(frame, 6)}><Headline size={76}>Only merged work counts.</Headline></div><div style={enter(frame, 24)}><Copy width={670}>PoWR checks public GitHub evidence, evaluates whether the contribution was meaningful, and awards Street Points automatically. Recruiters do not score the work.</Copy></div></div>
      <div style={{display: "flex", flexDirection: "column", gap: 14}}>{stages.map((stage, index) => {
        const active = frame >= 25 + index * 48;
        return <div key={stage.label} style={{opacity: interpolate(frame, [18 + index * 48, 32 + index * 48], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), translate: `${interpolate(frame, [18 + index * 48, 38 + index * 48], [30, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}px 0`, background: theme.surface, borderRadius: 20, padding: "24px 26px", display: "grid", gridTemplateColumns: "52px 1fr", gap: 18}}><span style={{width: 46, height: 46, display: "grid", placeItems: "center", borderRadius: 14, background: active ? "rgba(255,106,26,.12)" : theme.raised, color: active ? theme.orange : theme.muted, fontFamily: "Arial", fontSize: 21}}>✓</span><div><div style={{fontFamily: "Arial", color: theme.text, fontSize: 25, fontWeight: 700}}>{stage.label}</div><div style={{fontFamily: "Arial", color: theme.muted, fontSize: 18, marginTop: 7}}>{stage.detail}</div></div></div>;
      })}</div>
    </div>
  </AbsoluteFill>;
};

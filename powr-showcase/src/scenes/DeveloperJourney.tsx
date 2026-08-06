import {AbsoluteFill, useCurrentFrame} from "remotion";
import {Brand, Copy, enter, Eyebrow, Headline, Pill} from "../components";
import {theme} from "../theme";

const skills = ["Backend systems", "Open source", "Reliability", "TypeScript"];

export const DeveloperJourney = () => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{background: "#0d0e12", padding: "76px 100px"}}>
    <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}><Brand /><Eyebrow>Developer journey</Eyebrow></div>
    <div style={{display: "grid", gridTemplateColumns: "760px 1fr", gap: 90, alignItems: "center", flex: 1}}>
      <div style={{display: "flex", flexDirection: "column", gap: 30}}>
        <div style={enter(frame, 8)}><Headline size={78}>Turn real work into a reputation people can inspect.</Headline></div>
        <div style={enter(frame, 28)}><Copy width={720}>Connect public GitHub work. PoWR analyzes contribution, ownership, depth, recency, and delivery—while the developer controls discovery and contact.</Copy></div>
        <div style={{...enter(frame, 46), display: "flex", gap: 12, flexWrap: "wrap"}}>{skills.map((skill, i) => <Pill key={skill} active={i === Math.floor(frame / 55) % skills.length}>{skill}</Pill>)}</div>
      </div>
      <div style={{...enter(frame, 22), background: theme.surface, borderRadius: 28, padding: 34, boxShadow: "0 36px 100px rgba(0,0,0,.4)"}}>
        <div style={{display: "flex", alignItems: "center", gap: 20}}><div style={{width: 84, height: 84, borderRadius: 42, background: "#1f2025", display: "grid", placeItems: "center", color: theme.orange, fontSize: 30, fontWeight: 700}}>AM</div><div><div style={{fontFamily: "Arial", color: theme.text, fontSize: 32, fontWeight: 700}}>Alex Morgan</div><div style={{fontFamily: "Arial", color: theme.muted, fontSize: 21, marginTop: 7}}>Senior backend engineer</div></div></div>
        <div style={{display: "flex", alignItems: "end", gap: 16, marginTop: 42}}><div style={{fontFamily: "Arial", color: theme.orange, fontSize: 84, fontWeight: 700, lineHeight: 1}}>92</div><div style={{fontFamily: "Arial", color: theme.muted, fontSize: 22, paddingBottom: 9}}>PoWR score</div></div>
        <div style={{fontFamily: "Arial", color: theme.text, fontSize: 25, lineHeight: 1.45, marginTop: 32}}>Sustained ownership of distributed systems, supported by recent reliability and performance evidence.</div>
        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 30}}><Metric label="Merged PRs" value="12"/><Metric label="Reviewed commits" value="38"/></div>
      </div>
    </div>
  </AbsoluteFill>;
};

const Metric = ({label, value}: {label: string; value: string}) => <div style={{background: theme.raised, borderRadius: 16, padding: 20}}><div style={{fontFamily: "Arial", color: theme.text, fontSize: 30, fontWeight: 700}}>{value}</div><div style={{fontFamily: "Arial", color: theme.muted, fontSize: 17, marginTop: 7}}>{label}</div></div>;

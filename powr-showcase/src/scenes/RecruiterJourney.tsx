import {AbsoluteFill, useCurrentFrame} from "remotion";
import {Brand, Copy, enter, Eyebrow, Headline, ProductShot} from "../components";
import {theme} from "../theme";

const steps = ["Define the role", "Find proven builders", "Inspect the evidence", "Interview with context"];

export const RecruiterJourney = () => {
  const frame = useCurrentFrame();
  const active = Math.min(3, Math.floor(frame / 68));
  return <AbsoluteFill style={{background: theme.bg, padding: "76px 100px"}}>
    <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}><Brand /><Eyebrow>Recruiter journey</Eyebrow></div>
    <div style={{display: "grid", gridTemplateColumns: "650px 1fr", gap: 70, alignItems: "center", flex: 1}}>
      <div style={{display: "flex", flexDirection: "column", gap: 30}}>
        <div style={enter(frame, 8)}><Headline size={72}>Know who can do the work before the interview.</Headline></div>
        <div style={enter(frame, 22)}><Copy width={610}>PoWR turns verified engineering work into clear candidate evidence, so teams shortlist faster and interview with context.</Copy></div>
        <div style={{display: "flex", flexDirection: "column", gap: 10, marginTop: 12}}>{steps.map((step, index) => <div key={step} style={{fontFamily: "Arial", fontSize: 24, fontWeight: 600, color: active === index ? theme.text : "#5f6570", background: active === index ? theme.surface : "transparent", borderRadius: 14, padding: "17px 20px", translate: active === index ? "10px 0" : "0 0"}}><span style={{color: active === index ? theme.orange : "#424750", marginRight: 14}}>●</span>{step}</div>)}</div>
      </div>
      <ProductShot src={frame < 140 ? "frames/01-overview.png" : "frames/03-applications.png"} delay={frame < 140 ? 12 : 0} />
    </div>
  </AbsoluteFill>;
};

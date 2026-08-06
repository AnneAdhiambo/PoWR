import {AbsoluteFill, useCurrentFrame} from "remotion";
import {Brand, Copy, enter, Headline} from "../components";
import {theme} from "../theme";

export const Closing = () => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{background: theme.bg, padding: "90px 110px", justifyContent: "center", alignItems: "center", textAlign: "center"}}>
    <div style={{...enter(frame, 4), marginBottom: 46}}><Brand /></div>
    <div style={enter(frame, 18)}><Headline>Real work. Clear contribution.<br/><span style={{color: theme.orange}}>Better opportunities.</span></Headline></div>
    <div style={{...enter(frame, 42), marginTop: 36}}><Copy>PoWR is the evidence layer between developers, open source, and technical hiring.</Copy></div>
    <div style={{...enter(frame, 64), marginTop: 52, background: theme.orange, color: "white", borderRadius: 14, padding: "19px 32px", fontFamily: "Arial", fontSize: 26, fontWeight: 700}}>See PoWR in action</div>
  </AbsoluteFill>;
};

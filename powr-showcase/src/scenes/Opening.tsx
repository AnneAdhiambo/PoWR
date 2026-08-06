import {AbsoluteFill, useCurrentFrame} from "remotion";
import {Brand, Copy, enter, Headline} from "../components";
import {theme} from "../theme";

export const Opening = () => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{background: theme.bg, padding: "90px 110px", justifyContent: "space-between"}}>
    <div style={enter(frame, 4)}><Brand /></div>
    <div style={{display: "flex", flexDirection: "column", gap: 32}}>
      <div style={enter(frame, 18)}><Headline>Technical hiring starts<br/>with claims.</Headline></div>
      <div style={enter(frame, 40)}><Headline><span style={{color: theme.orange}}>PoWR starts with evidence.</span></Headline></div>
      <div style={enter(frame, 62)}><Copy>One product connecting verified work, developer reputation, open-source contribution, and better hiring decisions.</Copy></div>
    </div>
  </AbsoluteFill>;
};

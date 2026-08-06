import type {ReactNode} from "react";
import {Easing, Img, interpolate, staticFile, useCurrentFrame} from "remotion";
import {font, theme} from "./theme";

export const enter = (frame: number, delay = 0) => ({
  opacity: interpolate(frame, [delay, delay + 18], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1)}),
  translate: `0 ${interpolate(frame, [delay, delay + 22], [34, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1)})}px`,
});

export const Brand = () => <div style={{display: "flex", alignItems: "center", gap: 18}}><Img src={staticFile("logo.png")} style={{width: 70, height: 70}} /><span style={{fontFamily: font, color: theme.text, fontWeight: 700, fontSize: 34}}>PoWR</span></div>;

export const Eyebrow = ({children}: {children: ReactNode}) => <div style={{fontFamily: font, color: theme.orange, textTransform: "uppercase", letterSpacing: 4, fontWeight: 700, fontSize: 22}}>{children}</div>;

export const Headline = ({children, size = 86}: {children: ReactNode; size?: number}) => <div style={{fontFamily: font, color: theme.text, fontWeight: 700, letterSpacing: -4, lineHeight: 1.02, fontSize: size}}>{children}</div>;

export const Copy = ({children, width = 900}: {children: ReactNode; width?: number}) => <div style={{fontFamily: font, color: theme.muted, fontSize: 34, lineHeight: 1.45, maxWidth: width}}>{children}</div>;

export const Pill = ({children, active = false}: {children: ReactNode; active?: boolean}) => <div style={{fontFamily: font, fontSize: 22, color: active ? theme.orange : "#b5bac3", background: active ? "rgba(255,106,26,.1)" : "rgba(255,255,255,.045)", padding: "13px 20px", borderRadius: 12}}>{children}</div>;

export const ProductShot = ({src, delay = 0}: {src: string; delay?: number}) => {
  const frame = useCurrentFrame();
  return <div style={{...enter(frame, delay), borderRadius: 28, padding: 10, background: theme.surface, boxShadow: "0 40px 120px rgba(0,0,0,.48)", overflow: "hidden"}}><Img src={staticFile(src)} style={{width: "100%", display: "block", borderRadius: 20}} /></div>;
};

export const MiniLogo = () => <Img src={staticFile("logo.png")} style={{width: 52, height: 52}} />;

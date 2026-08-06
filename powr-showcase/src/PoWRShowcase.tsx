import {TransitionSeries, linearTiming} from "@remotion/transitions";
import {fade} from "@remotion/transitions/fade";
import {Opening} from "./scenes/Opening";
import {RecruiterJourney} from "./scenes/RecruiterJourney";
import {DeveloperJourney} from "./scenes/DeveloperJourney";
import {OpenSourceJourney} from "./scenes/OpenSourceJourney";
import {Verification} from "./scenes/Verification";
import {Closing} from "./scenes/Closing";

export const PoWRShowcase = () => <TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={180} name="Opening"><Opening /></TransitionSeries.Sequence>
  <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 18})} />
  <TransitionSeries.Sequence durationInFrames={300} name="Recruiter journey"><RecruiterJourney /></TransitionSeries.Sequence>
  <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 18})} />
  <TransitionSeries.Sequence durationInFrames={270} name="Developer journey"><DeveloperJourney /></TransitionSeries.Sequence>
  <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 18})} />
  <TransitionSeries.Sequence durationInFrames={420} name="Open source journey"><OpenSourceJourney /></TransitionSeries.Sequence>
  <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 18})} />
  <TransitionSeries.Sequence durationInFrames={270} name="Verification"><Verification /></TransitionSeries.Sequence>
  <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 18})} />
  <TransitionSeries.Sequence durationInFrames={180} name="Closing"><Closing /></TransitionSeries.Sequence>
</TransitionSeries>;

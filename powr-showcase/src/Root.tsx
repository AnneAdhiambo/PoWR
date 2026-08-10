import {Composition, Folder} from "remotion";
import {PoWRShowcase} from "./PoWRShowcase";
import {Opening} from "./scenes/Opening";
import {RecruiterJourney} from "./scenes/RecruiterJourney";
import {DeveloperJourney} from "./scenes/DeveloperJourney";
import {OpenSourceJourney} from "./scenes/OpenSourceJourney";
import {Verification} from "./scenes/Verification";
import {Closing} from "./scenes/Closing";

export const RemotionRoot = () => <>
  <Folder name="PoWR-Scenes">
    <Composition id="Opening" component={Opening} durationInFrames={180} fps={30} width={1920} height={1080} />
    <Composition id="RecruiterJourney" component={RecruiterJourney} durationInFrames={300} fps={30} width={1920} height={1080} />
    <Composition id="DeveloperJourney" component={DeveloperJourney} durationInFrames={270} fps={30} width={1920} height={1080} />
    <Composition id="OpenSourceJourney" component={OpenSourceJourney} durationInFrames={420} fps={30} width={1920} height={1080} />
    <Composition id="Verification" component={Verification} durationInFrames={270} fps={30} width={1920} height={1080} />
    <Composition id="Closing" component={Closing} durationInFrames={180} fps={30} width={1920} height={1080} />
  </Folder>
  <Composition id="PoWRShowcase" component={PoWRShowcase} durationInFrames={1530} fps={30} width={1920} height={1080} />
</>;

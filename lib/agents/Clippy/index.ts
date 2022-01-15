import { agent } from "./agent";
import { soundsMp3 } from "./sounds-mp3";
import { soundsOgg } from "./sounds-ogg";
import { Agents, AgentsType } from "../index";

const data: AgentsType = {
  name: Agents.Clippy,
  agent,
  soundsMp3,
  soundsOgg,
  map: new URL(
    "map.png",
    import.meta.url,
  ),
};
export default data;

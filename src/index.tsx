import { createRoot } from "react-dom/client";

import { Filter } from "./audio/filter";
import { mixer } from "./audio/main-mixer";
import {
  createWraithScene,
  getSurface,
  preloadIntro,
} from "./scene/space-scene";
import Janitor from "./utils/janitor";
import { waitForSeconds } from "./utils/wait-for";
import { useStore } from "./store";
import { WrappedCanvas } from "./utils/wrapped-canvas";

export const root = createRoot(document.getElementById("app")!);

let _start: () => void;

const preload = async () => {
  const increment = await preloadIntro();

  const dropYourSocks = mixer.context.createBufferSource();
  dropYourSocks.buffer = await mixer.loadAudioBuffer("./drop-your-socks.mp3");
  increment();

  const janitor = new Janitor(
    mixer.connect(dropYourSocks, new Filter("bandpass", 50).node, mixer.intro)
  );
  dropYourSocks.onended = () => janitor.mopUp();

  _start = async () => {
    dropYourSocks.detune.setValueAtTime(-200, mixer.context.currentTime + 5);
    dropYourSocks.start();
    await createWraithScene(increment);
    await waitForSeconds(2);
    useStore.setState({ loading: 10 });
    document.body.style.cursor = "none";
  };
};

export const LoadBar = ({
  color,
  thickness,
  style,
}: {
  color: string;
  thickness: number;
  style?: {};
}) => {
  const progress = useStore((store) => (store.loading + 1) / 10);

  return (
    <div
      style={{
        background: color,
        transform: `scaleX(${progress})`,
        height: `${thickness}px`,
        width: "100%",
        ...style,
      }}
    >
      &nbsp;
    </div>
  );
};

export const SceneContainer = () => {
  const surface = getSurface();
  const progress = useStore((store) => store.loading);

  return (
    <div
      style={{
        position: "absolute",
        color: "white",
        fontFamily: "Conthrax",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {progress === 10 && (
        <WrappedCanvas canvas={surface.canvas} style={{ zIndex: "-1" }} />
      )}
      {progress < 10 && (
        <div id="welcome" style={{ width: "var(--size-content-3)" }}>
          {progress < 10 && (
            <p
              style={{
                fontSize: "var(--font-size-5)",
                textAlign: "center",
              }}
            >
              "Wraiths En Route"
            </p>
          )}
          {progress < 10 && progress !== 5 && (
            <LoadBar
              color="white"
              thickness={20}
              style={{ marginBlock: "var(--size-10)" }}
            />
          )}
          {progress === 5 && (
            <div
              style={{
                justifyContent: "center",
                display: "flex",
              }}
            >
              <button
                style={{
                  cursor: "pointer",
                  paddingInline: "var(--size-10)",
                  paddingBlock: "var(--size-3)",
                  background: "var(--green-9)",
                  color: "white",
                  fontSize: "var(--font-size-8)",
                  borderRadius: "var(--radius-2)",
                  marginBottom: "var(--size-4)",
                }}
                onClick={_start}
              >
                Start
              </button>
            </div>
          )}
          {progress <= 10 && (
            <>
              <div style={{ marginBottom: "1.5rem", lineHeight: "0.9rem" }}>
                <p style={{ fontWeight: 100 }}>Scene Design / Programmer:</p>{" "}
                <p>Alex Pineda</p>
              </div>
              <div style={{ marginBottom: "3rem", lineHeight: "0.9rem" }}>
                <p>Wraith, BattleCruiser and Asteroid Models:</p>{" "}
                <p>Robert Rose</p>
              </div>
              <div style={{ fontFamily: "Inter" }}>
                <p>
                  <span>Warning:</span> This exhibit may potentially trigger
                  siezures for people with photosensitive epilepsy
                </p>
                <p>
                  <span>Legal:</span>This fan project is not associated with
                  Blizzard. Audio snippets are copyright of Blizzard/Activision.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

root.render(<SceneContainer />);

preload();

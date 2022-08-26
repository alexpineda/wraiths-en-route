import { createRoot } from "react-dom/client";

import { Filter } from "@audio/filter";
import { mixer } from "@audio/main-mixer";
import { getSurface, wraithScene } from "./scene/space-scene";
import Janitor from "@utils/janitor";
import { waitForSeconds } from "@utils/wait-for";
import { SceneStatus, useStore } from "./store";
import { WrappedCanvas } from "@utils/wrapped-canvas";
import { getGPUTier } from "detect-gpu";
import { renderer } from "@renderer";

export const root = createRoot(document.getElementById("app")!);

let _start: () => void = () => {};

const preload = async () => {
  const gpuTier = await getGPUTier({
    glContext: renderer.getContext(),
  });
  console.log(gpuTier);
  const scene = wraithScene(gpuTier.tier);
  await scene.preloadIntro();

  const dropYourSocks = mixer.context.createBufferSource();
  dropYourSocks.buffer = await mixer.loadAudioBuffer("./drop-your-socks.mp3");

  const janitor = new Janitor(
    mixer.connect(dropYourSocks, new Filter("bandpass", 50).node, mixer.intro)
  );
  dropYourSocks.onended = () => janitor.mopUp();

  _start = async () => {
    dropYourSocks.detune.setValueAtTime(-200, mixer.context.currentTime + 5);
    dropYourSocks.start();
    await scene.init();
    await waitForSeconds(2);
    useStore.getState().setStatus(SceneStatus.Playing);
    document.body.style.cursor = "none";
    _start = () => {};
  };

  useStore.getState().setStatus(SceneStatus.Loaded);
};

window.addEventListener("click", () => _start());

export const LoadBar = ({
  color,
  thickness,
  style,
}: {
  color: string;
  thickness: number;
  style?: {};
}) => {
  const progress = useStore((store) => store.totalAssetLoading);

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
  const status = useStore((store) => store.status);
  console.log(
    SceneStatus[status],
    status === SceneStatus.Playing,
    status !== SceneStatus.Playing
  );
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
      {status === SceneStatus.Playing && (
        <WrappedCanvas canvas={surface.canvas} />
      )}
      {status !== SceneStatus.Playing && (
        <div id="welcome" style={{ maxWidth: "var(--size-content-3)" }}>
          <p
            style={{
              fontSize: "var(--font-size-5)",
              textAlign: "center",
            }}
          >
            "Wraiths En Route"
          </p>
          <LoadBar
            color="white"
            thickness={20}
            style={{ marginBlock: "var(--size-10)" }}
          />
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
                visibility:
                  status === SceneStatus.Loading ? "hidden" : "visible",
              }}
              onClick={(evt) => {
                evt.preventDefault();
                evt.stopPropagation();
                _start();
              }}
            >
              Start
            </button>
          </div>
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
                seizures for people with photosensitive epilepsy
              </p>
              <p>
                <span>Legal:</span>This fan project is not associated with
                Blizzard. Audio snippets are copyright of Blizzard/Activision.
              </p>
            </div>
          </>
        </div>
      )}
    </div>
  );
};

root.render(<SceneContainer />);

preload();

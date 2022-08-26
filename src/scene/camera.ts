import Janitor from "@utils/janitor";
import CameraControls from "camera-controls";
import { MathUtils, Object3D, PerspectiveCamera, Vector3 } from "three";
import { playWraithComms } from "./wraith-noise";

export enum CameraState {
    RotateAroundWraiths,
    ManualOverride,
    UnderBattleCruiser,
    UnderWraiths
}

const evolvingCameraStates = [CameraState.UnderBattleCruiser, CameraState.UnderWraiths];
let _evolvingCameraState = -1;
let _prevPosition = new Vector3();



export const createCamera = (quality: number) => {
    const CAMERA_ROTATE_SPEED = quality * 1500;

    let _polarAngleRange = 0;
    let _polarAngle = 0;

    const camera = new PerspectiveCamera(110, 1, 0.1, 100000);
    const janitor = new Janitor;

    return {
        get rotateSpeed() {
            return CAMERA_ROTATE_SPEED;
        },
        cameraState: CameraState.RotateAroundWraiths,
        get() {
            return camera;
        },
        init(controls: CameraControls, battleCruiser: Object3D) {
            _polarAngleRange = Math.PI / 8

            janitor.setInterval(() => {
                if (this.cameraState === CameraState.RotateAroundWraiths) {
                    controls.zoomTo(Math.random() * 2 + 1.75);
                }
            }, 20000);

            janitor.setInterval(() => {
                if (this.cameraState === CameraState.ManualOverride) return;
                _evolvingCameraState = (++_evolvingCameraState) % evolvingCameraStates.length;
                this.cameraState = evolvingCameraStates[_evolvingCameraState];
                _prevPosition.copy(camera.position);
                if (this.cameraState === CameraState.UnderBattleCruiser) {
                    controls.setLookAt(-100, -1120, -1040, battleCruiser.position.x, battleCruiser.position.y, battleCruiser.position.z, false);
                    controls.zoomTo(2);
                } else if (this.cameraState === CameraState.UnderWraiths) {
                    _prevPosition.copy(camera.position);
                    controls.setTarget(0, 0, 0);
                    controls.zoomTo(2);
                    controls.setLookAt(-4, -23, -36, 0, 0, 0, false);
                }
                controls.enabled = false;
                setTimeout(() => {
                    this.cameraState = CameraState.RotateAroundWraiths;
                    playWraithComms(0)
                    controls.setTarget(0, 0, 0);
                    controls.zoomTo(2);
                    controls.setLookAt(_prevPosition.x, _prevPosition.y, _prevPosition.z, 0, 0, 0);
                    controls.enabled = true;
                }, 10000);
            }, 90000);


            return () => janitor.mopUp()
        },
        elapsed: 0,
        update(delta: number, controls: CameraControls, mouse: Vector3) {
            this.elapsed += delta / 1000;

            _polarAngle = MathUtils.damp(
                _polarAngle,
                Math.PI / 2 + mouse.y * mouse.y * Math.sign(mouse.y) * _polarAngleRange,
                0.0005,
                delta
            );

            // _cameraRotateSpeed = MathUtils.damp(
            //     _cameraRotateSpeed,
            //     _destCameraSpeed,
            //     0.0001,
            //     delta
            // );

            if (this.cameraState === CameraState.RotateAroundWraiths) {

                controls.rotate(Math.PI / CAMERA_ROTATE_SPEED, 0, true);
                controls.rotatePolarTo(_polarAngle);
            }
        }
    }
}
import { vec3, quat } from "gl-matrix";

/**
 * A singleton to represent the entire scene that can be accessed by all of angular
 */
export class EditorScene{
    constructor(){
        this.timestamp = new Date().getTime();
        this.yaw = 0;
        this.pitch = 0;

        this.translation = vec3.create();
        this.rot = quat.create();
    }
}
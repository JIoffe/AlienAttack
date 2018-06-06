/**
 * A singleton to represent the entire scene that can be accessed by all of angular
 */
export class EditorScene{
    constructor(){
        this.timestamp = new Date().getTime();
        this.yaw = 0;
        this.pitch = 0;
        this.zoom = 0;
    }
}
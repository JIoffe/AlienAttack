import { RigidBody } from "../physics/rigid-body";
import { vec3 } from "gl-matrix";

export class Player extends RigidBody{
    constructor(){
        super();

        this.eye = vec3.create();
    }

    update(time, map){
        super.update(time, map);
        
        this.eye[0] = this.pos[0];
        this.eye[1] = this.pos[1] + 2.25;
        this.eye[2] = this.pos[2];
    }
    get radius(){
        return 1;
    }

    get height(){
        return 2.5;
    }
}
import { RigidBody } from "../physics/rigid-body";

export class StaticBatchedMesh extends RigidBody{
    constructor(i){
        super();
        this.i = i;
    }
}
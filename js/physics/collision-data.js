import { vec3 } from "gl-matrix";

export class CollisionData{
    constructor(){
        this.hasCollision = false;
        this.surfaceNormal = vec3.create();
        this.point = vec3.create();
        this.sectorPtr = -1;
        this.wallptr = -1;
    }

    /**
     * Copies values from another CollisionData instance
     * @param {CollisionData} cd 
     */
    copy(cd){
        this.hasCollision = cd.hasCollision;
        vec3.copy(this.surfaceNormal, cd.surfaceNormal);
        vec3.copy(this.point, cd.point);
        this.sectorPtr = cd.sectorPtr;
    }
}
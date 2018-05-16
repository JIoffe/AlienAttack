import { RigidBody } from "../physics/rigid-body";
import { vec3 } from "gl-matrix";

export const ProjectileTypes = {
    laser: 0
};

const NEXT_POS = vec3.create();

export class Projectile extends RigidBody{
    constructor(){
        super();
    }

    setSpeed(speed){
        this.velocity[0] = 0.0;
        this.velocity[1] = 0.0;
        this.velocity[2] = speed;
        vec3.transformQuat(this.velocity, this.velocity, this.rot);
    }

    update(time, scene){
        const p0 = this.pos;
        this.sectorPtr = scene.map.determineSector(this.sectorPtr, p0[0], p0[2]);
        if(this.sectorPtr === -1){
            this.kill();
            return;
        }

        NEXT_POS[0] = p0[0] + this.velocity[0] * time.secondsSinceLastFrame;
        NEXT_POS[1] = p0[1] + this.velocity[1] * time.secondsSinceLastFrame;
        NEXT_POS[2] = p0[2] + this.velocity[2] * time.secondsSinceLastFrame;

        //Extend the check a little beyond the next point to make up for floating point errors
        const collisionData = scene.map.lineSegmentTrace(p0[0], p0[1], p0[2], NEXT_POS[0], NEXT_POS[1], NEXT_POS[2], this.sectorPtr);

        if(collisionData.hasCollision){
            vec3.copy(this.velocity, collisionData.surfaceNormal);
            this.velocity[0] *= 3;
            this.velocity[1] *= 3;
            this.velocity[2] *= 3;

            scene.particleSystem.addBurst(collisionData.point, this.velocity, 35, 50);
            scene.decalSystem.add(scene.getDamageDecal(collisionData.picnum), collisionData.point, collisionData.surfaceNormal, 0.14);
            this.kill();
        }else{
            p0[0] = NEXT_POS[0];
            p0[1] = NEXT_POS[1];
            p0[2] = NEXT_POS[2];
        }
    }
}
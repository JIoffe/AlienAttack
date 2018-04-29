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
        NEXT_POS[0] = this.pos[0] + this.velocity[0] * time.secondsSinceLastFrame;
        NEXT_POS[1] = this.pos[1] + this.velocity[1] * time.secondsSinceLastFrame;
        NEXT_POS[2] = this.pos[2] + this.velocity[2] * time.secondsSinceLastFrame;

        const collisionData = scene.map.testCollisionWithProjectile(this.pos, this.sectorPtr, NEXT_POS);

        if(collisionData.hasCollision){
            vec3.copy(this.velocity, collisionData.surfaceNormal);
            this.velocity[0] *= 3;
            this.velocity[1] *= 3;
            this.velocity[2] *= 3;

            scene.particleSystem.addBurst(collisionData.point, this.velocity, 35, 50);
            scene.decalSystem.add(scene.getDamageDecal(collisionData.picnum), collisionData.point, collisionData.surfaceNormal, 0.3);
            this.kill();
        }else{
            this.sectorPtr = collisionData.sectorPtr;
            this.pos[0] = NEXT_POS[0];
            this.pos[1] = NEXT_POS[1];
            this.pos[2] = NEXT_POS[2];
        }
    }
}
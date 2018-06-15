import { RigidBody } from "../physics/rigid-body";
import * as aa_math from '../math';
import { vec3 } from "gl-matrix";

export const ProjectileTypes = {
    laser: 0
};

const NEXT_POS = vec3.create();
var i,o;

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
        
        if(this.sectorPtr === -1){
            this.kill();
            return;
        }

        NEXT_POS[0] = p0[0] + this.velocity[0] * time.secondsSinceLastFrame;
        NEXT_POS[1] = p0[1] + this.velocity[1] * time.secondsSinceLastFrame;
        NEXT_POS[2] = p0[2] + this.velocity[2] * time.secondsSinceLastFrame;

        //Extend the check a little beyond the next point to make up for floating point errors
        let collisionData = scene.map.lineSegmentTrace(p0[0], p0[1], p0[2], NEXT_POS[0], NEXT_POS[1], NEXT_POS[2], this.sectorPtr);

        if(collisionData.hasCollision){
            vec3.copy(this.velocity, collisionData.surfaceNormal);
            this.velocity[0] *= 3;
            this.velocity[1] *= 3;
            this.velocity[2] *= 3;

            scene.particleSystem.addBurst(collisionData.point, this.velocity, 35, 50);
            scene.decalSystem.add(scene.getDamageDecal(collisionData.picnum), collisionData.point, collisionData.surfaceNormal, 0.14);
            this.kill();
            return;
        }

        for(i = 0; i < scene.enemies.length; ++i){
            o = scene.enemies[i];

            if(o.collidesWithPoint(p0)){
                this.velocity[0] = p0[0] - o.pos[0];
                this.velocity[1] = p0[1] - o.pos[1];
                this.velocity[2] = p0[2] - o.pos[2];
                vec3.normalize(this.velocity, this.velocity);
                this.velocity[0] *= 3;
                this.velocity[1] *= 3;
                this.velocity[2] *= 3;

                scene.particleSystem.addBurst(p0, this.velocity, 35, 50);

                o.takeDamage(1);
                scene.addBloodSpatter(p0, this.sectorPtr);
                this.kill();
                return;
            }

            // if(a*a + b*b < 1){
            //     this.velocity[0] *= -1;
            //     this.velocity[1] *= -1;
            //     this.velocity[2] *= -1;
            //     vec3.normalize(this.velocity, this.velocity);
            //     this.velocity[0] *= 3;
            //     this.velocity[1] *= 3;
            //     this.velocity[2] *= 3;

            //     scene.particleSystem.addBurst(p0, this.velocity, 35, 50);

            //     // this.velocity[0] = 0;
            //     // this.velocity[1] = -1;
            //     // this.velocity[2] = 0;

            //     // p0[0] = o.pos[0] + Math.random() * 2;
            //     // p0[1] = o.pos[1] + 2;
            //     // p0[2] = o.pos[2] + Math.random() * 2;
            //     // // this.velocity[0] *= -1;
            //     // // this.velocity[1] *= -1;
            //     // // this.velocity[2] *= -1;
            //     // // vec3.normalize(this.velocity, this.velocity);
            //     // // this.velocity[1] = -0.5;
            //     // // vec3.normalize(this.velocity, this.velocity);

            //     // const bloodSpatterDistance = 3;
            //     // NEXT_POS[0] = p0[0] + this.velocity[0] * bloodSpatterDistance;
            //     // NEXT_POS[1] = p0[1] + this.velocity[1] * bloodSpatterDistance;
            //     // NEXT_POS[2] = p0[2] + this.velocity[2] * bloodSpatterDistance;

            //     // collisionData = scene.map.lineSegmentTrace(p0[0], p0[1], p0[2], NEXT_POS[0], NEXT_POS[1], NEXT_POS[2], this.sectorPtr);
            //     // if(collisionData.hasCollision){
            //     //     scene.decalSystem.add(scene.bloodDecal, collisionData.point, collisionData.surfaceNormal, 2);
            //     // }

            //     o.takeDamage(1);

            //     this.kill();
            //     return;
            // }
        }

        p0[0] = NEXT_POS[0];
        p0[1] = NEXT_POS[1];
        p0[2] = NEXT_POS[2];

        this.sectorPtr = scene.map.determineSector(this.sectorPtr, p0[0], p0[2]);
    }
}
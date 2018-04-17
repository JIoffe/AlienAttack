import { RigidBody } from "../physics/rigid-body";

export const ProjectileTypes = {
    laser: 0
};

export class Projectile extends RigidBody{
    constructor(type, speed){
        super();
        this.type = type;
        this.speed = speed;
    }

    update(time, map){
        this.moveForward2d(this.speed, time);

        //If Collides with map
        if(this.collidesWithMap(map)){
            this.kill();
        }
    }
}
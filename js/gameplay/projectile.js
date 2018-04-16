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

    update(time){
        this.moveForward2d(this.speed, time);
    }
}
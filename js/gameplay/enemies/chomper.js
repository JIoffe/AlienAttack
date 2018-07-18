import { BaseEnemy } from "./base-enemy";

const chompDelay = 2;

export class Chomper extends BaseEnemy{
    constructor(enemyDefinition){
        super(enemyDefinition);
        this.t = 0;

        this.lifecycle_state = 0;
    }

    update(scene, time){
        super.update(scene, time);

        switch(this.lifecycle_state){
            case 0:
                if(scene.map.hasLineOfSight(this.pos, scene.player.eye, this.sectorPtr)){
                    this.lifecycle_state = 1;
                }
                break;
            case 1:
                this.turnTowardsPoint(scene.player.pos, time.secondsSinceLastFrame * 2);
                this.moveForward2d(1);
                this.t += time.secondsSinceLastFrame;
                if(this.t >= chompDelay){
                    this.stop();
                    this.setAnimation(1);
                    this.t = 0;
                    this.lifecycle_state = 2;
                }
                break;
            case 2:
                if(this.currentFrameuInt === this.currentAnimation.nFrames - 1){
                    this.stop();
                    this.setAnimation(0);
                    this.lifecycle_state = 1;
                }
                break;
            default:
                break;
        }
    }

    perish(){
        this.velocity[0] = 0;
        this.velocity[2] = 0;
        this.stop();
        this.setAnimation(2);
        this.lifecycle_state = 3;
    }
}
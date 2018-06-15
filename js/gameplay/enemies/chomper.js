import { BaseEnemy } from "./base-enemy";

const chompDelay = 2;

export class Chomper extends BaseEnemy{
    constructor(enemyDefinition){
        super(enemyDefinition);
        this.t = 0;

        this.state = 0;
    }

    update(time){
        super.update(time);

        switch(this.state){
            case 0:
                this.t += time.secondsSinceLastFrame;

                if(this.t >= chompDelay){
                    this.stop();
                    this.setAnimation(1);
                    this.t = 0;
                    this.state = 1;
                }
                break;
            case 1:
                if(this.currentFrameuInt === this.currentAnimation.nFrames - 1){
                    this.stop();
                    this.setAnimation(0);
                    this.state = 0;
                }
                break;
            default:
                break;
        }
    }

    perish(){
        this.stop();
        this.setAnimation(2);
        this.state = 3;
    }
}
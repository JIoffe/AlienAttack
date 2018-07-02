import { BaseEnemy } from "./base-enemy";

export class Trooper extends BaseEnemy{
    constructor(enemyDefinition){
        super(enemyDefinition);
        this.lifecycle_state = 0;
    }

    update(scene, time){
        super.update(scene, time);
    }
    
    perish(){
        this.velocity[0] = 0;
        this.velocity[2] = 0;
        this.stop();
        this.setAnimation(2);
    }
}
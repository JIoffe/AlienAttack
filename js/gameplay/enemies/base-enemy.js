import { AnimatedMesh } from "../../geometry/animated-mesh";

var a, b;

export class BaseEnemy extends AnimatedMesh{
    constructor(enemyDefinition){
        super(enemyDefinition.mesh);

        // this.definition = enemyDefinition;
        // this.definition.rsquared = this.definition.rsquared || this.definition.radius*this.definition.radius;

        this.enemyDefinition = enemyDefinition;
        this.enemyDefinition.rsquared = this.enemyDefinition.rsquared || this.enemyDefinition.radius*this.enemyDefinition.radius;

        this.hp = (Math.random() * 0.5 + 0.5) * enemyDefinition.hp;
    }

    update(time){
        this.advanceFrame(time);
    }

    takeDamage(amt){
        // if(this.hp > 0){
            if((this.hp -= amt) <= 0){
                this.perish();
            }
        // }
    }

    collidesWithPoint(p){
        a = p[0] - this.pos[0];
        b = p[2] - this.pos[2];

        return a*a + b*b <= this.enemyDefinition.rsquared
            && p[1] >= this.pos[1]
            && p[1] <= this.pos[1] + this.enemyDefinition.height;
    }

    perish(){
        //Implement in specific classes
    }
}
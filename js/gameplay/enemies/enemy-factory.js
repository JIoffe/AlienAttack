import { BaseEnemy } from "./base-enemy";
import { Chomper } from "./chomper";

export class EnemyFactory{
    static createEnemy(enemyDefinition){
        switch(enemyDefinition.type){
            case 'chomper':
                return new Chomper(enemyDefinition);
            default:
                return new BaseEnemy(enemyDefinition);
        }
    }
}
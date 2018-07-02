import { BaseEnemy } from "./base-enemy";
import { Chomper } from "./chomper";
import { Trooper } from "./trooper";

export class EnemyFactory{
    static createEnemy(enemyDefinition){
        switch(enemyDefinition.type){
            case 'chomper':
                return new Chomper(enemyDefinition);
            case 'trooper':
                return new Trooper(enemyDefinition);
            default:
                return new BaseEnemy(enemyDefinition);
        }
    }
}
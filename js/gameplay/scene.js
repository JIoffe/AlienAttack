///
// SCENE
// Exposes all renderable and interactive content currently in play.
// Includes the level geometry, player location, and props
///

import * as aa_math from '../math';
import * as art from '../art';
import * as array_utils from '../utils/array.utils';

import { quat, vec3, mat4 } from 'gl-matrix';
import { Projectile, ProjectileTypes } from './projectile';
import { ParticleSystem } from '../physics/particle-system';
import { DecalSystem } from '../geometry/decal-system';
import { EnemyFactory } from './enemies/enemy-factory';
import { Player } from './player';
import { StaticBatchedMesh } from '../geometry/static-batched-mesh';

//AKA the game state
const PLAYER_MOVEMENT_SPEED = 5;
const PLAYER_TURN_SPEED = 65.4; //Degrees per second

const LASER_SPEED = 50;

//Projectile Constants
const MAX_PROJECTILES = 64;
const MAX_PARTICLES = 512;
const MAX_DECALS = 64;

const WEAPON_DEFAULT_ROTATION = quat.create();
quat.fromEuler(WEAPON_DEFAULT_ROTATION, 0, 15, 0);

export class Scene{
    constructor(){
        this.player = new Player();

        //Deep copy of sprite definitions in case we need to move things around later
        this.guiSprites = art.gui_sprites.map(s => {
            return{
                x: s.x,
                y: s.y,
                scale: s.scale,
                img: s.img
            };
        })

        this.projectiles = new Array(MAX_PROJECTILES);
        this.nProjectiles = 0;

        for(let i = 0; i < MAX_PROJECTILES; ++i){
            this.projectiles[i] = new Projectile();
        }

        this.weaponOffset = vec3.create();
        this.weaponRecoil = quat.create();

        this.particleSystem = new ParticleSystem(MAX_PARTICLES);
        this.decalSystem = new DecalSystem(MAX_DECALS);

        this.activeWeapon = 0;
    }

    setMap(map){
        this.map = map;
        this.player.pos = map.startingPlayerPos;
        quat.fromEuler(this.player.rot, 0, map.startingPlayerRotation, 0);

        this.player.sectorPtr = map.startingPlayerSector;
    }

    setEnemies(enemies){
        this.enemies = enemies.map(e => {
            const def = art.enemy_definitions[e.def];
            const m = EnemyFactory.createEnemy(def);
            vec3.copy(m.pos, e.pos);

            return m;
        });
    }

    setProps(props){
        this.props = props.map(p => {
            const def = p.def;

            const prop = new StaticBatchedMesh(def);
            vec3.copy(prop.pos, p.pos);
            quat.copy(prop.rot, p.rot);
            return prop;
        });

        //DEBUG ONLY!!!
        window.props = this.props;
        window.makeRot = (x,y,z) => quat.fromEuler(quat.create(), x,y,z);
    }

    update(time, input){
        const player = this.player;
        const map = this.map;

        /*
            PLAYER MOVEMENT - Forward, Back, Strafe
        */
        if(input.action){
            console.log(player.pos, this.map.sectors[player.sectorPtr].getFloorHeight(player.pos[0], player.pos[2]));
            console.log(player.rot);
        }
        let isMoving = false;
        if(input.moveForward){
            player.moveForward2d(PLAYER_MOVEMENT_SPEED);
            isMoving = true;
        }else if(input.moveBackward){
            player.moveForward2d(-PLAYER_MOVEMENT_SPEED);
            isMoving = true;
        }else{
            //Negate forward/backward velocity. Player stops on a dime!
            player.velocity[0] = 0;
            player.velocity[2] = 0;
        }

        if(input.strafeLeft){
            player.strafe2d(-PLAYER_MOVEMENT_SPEED);
            isMoving = true;
        }else if(input.strafeRight){
            player.strafe2d(PLAYER_MOVEMENT_SPEED);
            isMoving = true;
        }

        //Turning can be either from keys or mouse
        if(input.turnLeft)
            input.mouseX += PLAYER_TURN_SPEED * time.secondsSinceLastFrame;
        else if(input.turnRight)
            input.mouseX -= PLAYER_TURN_SPEED * time.secondsSinceLastFrame;

        quat.fromEuler(player.rot, input.mouseY, input.mouseX, 0);

        vec3.copy(this.weaponOffset, art.player_weapons[player.activeWeapon].weaponOffset);


        isMoving = true;
        if(isMoving){
            this.weaponOffset[0] += 0;//(time.elapsedMS % 200 - 100) / 100 * 0.3;
            this.weaponOffset[1] += 0;//time.elapsedMS % 200 * 0.035;
        }else{
            player.velocity[0] = 0;
            player.velocity[2] = 0;
        }

        if(input.jump)
            player.velocity[1] = 5;

        if(input.semiAutoFire){
            this.firePrimaryWeapon();
        }

        player.update(time, map);

        //Recover from recoil
        quat.slerp(this.weaponRecoil, this.weaponRecoil, WEAPON_DEFAULT_ROTATION, 4 * time.secondsSinceLastFrame);

        for(let i = this.nProjectiles - 1; i >= 0; --i){
            const projectile = this.projectiles[i];
            projectile.update(time, this);
            if(!projectile.isAlive){
                array_utils.swapDeadElements(this.projectiles, i, this.nProjectiles--);
            }
        }

        for(let i = 0; i < this.enemies.length; ++i){
            this.enemies[i].update(this, time);
        }

        this.particleSystem.update(time);
    }

    firePrimaryWeapon(){
        if(this.nProjectiles >= MAX_PROJECTILES){
            //TODO - ... recycle like the others? the player can cancel out a barrage by unleashing his own!
            return;
        }

        //Figure out where the user's looking and adjust the projectile accordingly
        const playerForward = this.player.forward;

        // const collisionData = this.map.rayTrace(this.player.pos[0], this.player.pos[1], this.player.pos[2], playerForward[0], playerForward[1], playerForward[2], this.player.sectorPtr);
        // const targetPosition = collisionData.point;
        // if(!collisionData.hasCollision){
        //     //How can this happen? We must be floating around aimlessly in space
        //     targetPosition[0] = 0;
        //     targetPosition[1] = 0;
        //     targetPosition[2] = -10;

        //     vec3.transformQuat(targetPosition, targetPosition, this.player.rot);
        //     vec3.add(targetPosition, targetPosition, this.player.pos);
        // }


        //throw back the weapon
        quat.fromEuler(this.weaponRecoil, 45, 15, 0);

        //Our view of the primary weapon is offset,
        //so we have to compensate to make it appear that 
        //projectiles are going towards where the user is looking...

        const projectile = this.projectiles[this.nProjectiles++];
        
        projectile.enable();
        projectile.type = ProjectileTypes.laser;
        quat.copy(projectile.rot, this.player.rot);
        projectile.setSpeed(LASER_SPEED);

        vec3.copy(projectile.pos, art.player_weapons[this.player.activeWeapon].muzzleOffset);

        vec3.transformQuat(projectile.pos, projectile.pos, this.player.rot);
        vec3.add(projectile.pos, projectile.pos, this.player.eye);
        projectile.sectorPtr = this.map.determineSector(this.player.sectorPtr, projectile.pos[0], projectile.pos[2]);

        //        aa_math.lookAtRotation(projectile.rot, startingPosition, targetPosition);

    }

    addBloodSpatter(p, sectorPtr){
        const d = aa_math.getRandomDirection();
        const cd = this.map.lineSegmentTrace(p[0], p[1], p[2], p[0] + d[0] * 3, p[1] + d[1] * 3, p[2] + d[2] * 3, sectorPtr);
        if(cd.hasCollision){
            this.decalSystem.add(this.bloodDecal, cd.point, cd.surfaceNormal, 3);
        }
    }

    getDamageDecal(picnum){
        switch(picnum){
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
                return Math.random() > 0.5 ? 2 : 3;
            case 5:
                return 6;
            default:
                return 4;
        }
    }

    get bloodDecal(){
        return Math.random() > 0.5 ? 0 : 1;
    }
}
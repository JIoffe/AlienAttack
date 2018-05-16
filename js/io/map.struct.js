import { MapTesselator } from "../geometry/map-tesselator";
import * as aa_math from "../math";
import { CollisionData } from "../physics/collision-data";
import { vec3 } from "gl-matrix";
import { UIntStack } from "../utils/stack";

/**
 * Encapsulates the rendering and collision detection within a Build engine map
 */

const COLLISION_DATA_BUFFER_SIZE = 16;
const collisionDataBuffer = new Array(COLLISION_DATA_BUFFER_SIZE);
for(let i = 0; i < COLLISION_DATA_BUFFER_SIZE; ++i)
    collisionDataBuffer[i] = new CollisionData();

const buffers = new Array(3);
var indexCount = 0;

const visitedSectorSet = new Set();
const pendingSectorStack = new UIntStack(32);

export class LevelMap{
    static get collisionDataBuffer(){
        return collisionDataBuffer;
    }

    static get visitedSectorSet(){
        return visitedSectorSet;
    }

    static get pendingSectorStack(){
        return pendingSectorStack;
    }

    constructor(src, sectors, walls, playerPos, playerRotation, playerSectorIndex){
        var m = this;
        m.src = src;
        m.sectors = sectors;
        m.walls = walls;

        m.startingPlayerPos = playerPos;
        m.startingPlayerRotation = playerRotation;
        m.startingPlayerSector = playerSectorIndex;

        m.updateSectorSlopeReferences();
    }

    /**
     * Render map using given WebGL Context
     * @param {WebGLRenderingContext} gl 
     * @param {*} modelViewMatrix 
     * @param {WebGLProgram} shaderProgram 
     * @param {GLint[]} textures 
     */
    draw(gl, modelViewMatrix, shaderProgram, textures){
        gl.useProgram(shaderProgram.program);
        gl.uniformMatrix4fv(shaderProgram.uniformLocations.modelViewProj, false, modelViewMatrix);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[0]);
        gl.vertexAttribPointer(shaderProgram.attribLocations.vertexPosition, 4, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[1]);
        gl.vertexAttribPointer(shaderProgram.attribLocations.texPosition, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers[2]);

        //Loops through all the sectors,
        //this is a placeholder to allow for PVS ellimination
        //Otherwise might just group all surfaces with alike textures in one go...
        //whichever ends up being cheaper.
        const sectors = this.sectors;
        const n = sectors.length;
        for(let i = 0; i < n; ++i){
            const sector = sectors[i],
                indices = sector.indices,
                wallData = sector.wallData;

            //Draw sector floor and ceiling
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, textures[sector.floorpicnum]);
            gl.uniform1i(shaderProgram.uniformLocations.sampler, 0);
            gl.drawElements(gl.TRIANGLES, indices[0], gl.UNSIGNED_SHORT, indices[1])

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, textures[sector.ceilingpicnum]);
            gl.uniform1i(shaderProgram.uniformLocations.sampler, 0);
            gl.drawElements(gl.TRIANGLES, indices[2], gl.UNSIGNED_SHORT, indices[3])

            const wallDataSize = sector.wallData.length;
            for(let j = 0; j < wallDataSize; j += 3){
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, textures[wallData[j]]);
                gl.uniform1i(shaderProgram.uniformLocations.sampler, 0);
                gl.drawElements(gl.TRIANGLES, wallData[j+1], gl.UNSIGNED_SHORT, wallData[j+2]);         
            }
        }

        //Fin
    }

    /*
        Collision and PVS-Related functionality
    */
   /**
    * Determines which sector 2D coordinates lie in, assuming that objects do not move much
    * @param {number} previousSector sector that object was last in
    * @param {number} x X Coordinate against horizontal plane
    * @param {number} y Y Coordinate against horizontal plane
    */
    determineSector(previousSector, x, y){
        //Assume that objects generally don't move much between frames
        //and stay within the same sector or a neighboring sector
        if(previousSector < 0){
            //The user got out of bounds somehow... We have nothing to go on, so search everywhere
            //In gameplay the camera should always be in the sector, so this should be extremely rare
            return this.searchForSectorIndex(x, y);
        }

        //Simplifies sector location a bit as everything will be resolved as a neighbor anyway
        if(this.isInSector(previousSector, x, y))
            return previousSector;

        const neighbors = this.sectors[previousSector].getNeighboringSectors(this.walls),
            nNeighbors = neighbors.length;
        for(let i = 0; i < nNeighbors; ++i){
            const j = neighbors[i];
            if(this.isInSector(j, x, y)){
                return j;
            }
        }

        //This scenario should be extremely rare, if it happens at all.
        //Instead of a BFS just go linearly over the whole list.
        //It's possible that the player went out of bounds.
        return this.searchForSectorIndex(x, y);
    }

    isInSector(i, x, y){
        let bounds = this.sectors[i].getWallLoops(this.walls)[0];
        return aa_math.insidePolygon(bounds, x, y);
    }

    searchForSectorIndex(x, y){
        const sectors = this.sectors,
            walls = this.walls;

        for(let i = 0; i < sectors.length; ++i){
            let bounds = sectors[i].getWallLoops(walls)[0];

            if(aa_math.insidePolygon(bounds, x, y)){
                return i;
            }
        }

        return -1;
    }

    prepareRenderableGeometry(gl){
        indexCount = MapTesselator.tesselateMap(gl, this, buffers);
    }

    updateSectorSlopeReferences(){
        this.sectors.forEach(sector => {
            let ref0 = this.walls[sector.wallptr],
                ref1 = this.walls[ref0.point2];

            sector.setSlopeReference(ref0, ref1);
        });
    }

    lineSegmentTrace(p0x, p0y, p0z, p1x, p1y, p1z, sectorPtr){
        //Similar to rayTrace. Copied over to prevent needless checks
        const la = p1x - p0x, lb = p1y - p0y, lc = p1z - p0z;

        const collisionData = collisionDataBuffer[0], collisionQuery = collisionDataBuffer[1];
        collisionData.hasCollision = false;

        let continueScanning, furthestDistance = 0, nearestDistance = 100000, hasTerminated = false;

        do{
            const sector = this.sectors[sectorPtr],
                end = sector.wallptr + sector.wallnum;

            continueScanning = false;

            let a,b,d;

            let planeNormal, planed, planepicnum;
            if(lb < 0){
                planeNormal = sector.floorNormal;
                planed = sector.floord;
                planepicnum = sector.floorpicnum;
            }else{
                planeNormal = sector.ceilingNormal;
                planed = sector.ceilingd;
                planepicnum = sector.ceilingpicnum;
            }

            aa_math.lineSegmentIntersectsPlane(collisionQuery, p0x, p0y, p0z, la, lb, lc, planeNormal[0], planeNormal[1], planeNormal[2], planed);
            if(collisionQuery.hasCollision && aa_math.insidePolygon(sector.getWallLoops(this.walls)[0], collisionQuery.point[0], collisionQuery.point[2])){
                a = collisionQuery.point[0] - p0x;
                b = collisionQuery.point[2] - p0z;
                d = a*a + b*b;

                if(d < nearestDistance){
                    collisionData.point[0] = collisionQuery.point[0];
                    collisionData.point[1] = collisionQuery.point[1];
                    collisionData.point[2] = collisionQuery.point[2];
                    collisionData.surfaceNormal[0] = collisionQuery.surfaceNormal[0];
                    collisionData.surfaceNormal[1] = collisionQuery.surfaceNormal[1];
                    collisionData.surfaceNormal[2] = collisionQuery.surfaceNormal[2];
                    collisionData.hasCollision = true;

                    collisionData.picnum = planepicnum;

                    nearestDistance = d;                    
                }
            }

            for(let i = sector.wallptr; i < end; ++i){
                const wall = this.walls[i],
                    point2 = this.walls[wall.point2];

                // //Ignore back facing surfaces - assume everything is watertight and we will make up for it
                // if((point2.x - wall.x) * (p0z - wall.y) - (point2.y - wall.y) * (p0x - wall.x) < 0)
                //     continue;

                aa_math.lineSegmentIntersection(collisionQuery, p0x, p0z, p1x, p1z, wall.x, wall.y, point2.x, point2.y);
                if(collisionQuery.hasCollision){
                    a = collisionQuery.point[0] - p0x;
                    b = collisionQuery.point[2] - p0z;
                    d = a*a + b*b;

                    const x = collisionQuery.point[0], y = p0y + lb * collisionQuery.t, z = collisionQuery.point[2];

                    let terminalCollision = wall.nextsector === -1;
                    if(!terminalCollision){
                        const nextSector = this.sectors[wall.nextsector];
                        terminalCollision = nextSector.getFloorHeight(x, z) > y || nextSector.getCeilingHeight(x, z) < y;
                    }

                    if(terminalCollision){
                        if(d < nearestDistance){
                            collisionData.point[0] = x;
                            collisionData.point[1] = y;
                            collisionData.point[2] = z;
                            collisionData.surfaceNormal[0] = collisionQuery.surfaceNormal[0];
                            collisionData.surfaceNormal[1] = collisionQuery.surfaceNormal[1];
                            collisionData.surfaceNormal[2] = collisionQuery.surfaceNormal[2];
                            collisionData.hasCollision = true;
                            collisionData.picnum = wall.picnum;

                            collisionData.wallptr = i;

                            nearestDistance = d;
                        }
                        hasTerminated = true;
                    }else if(!hasTerminated){
                        if(d > furthestDistance){
                            sectorPtr = wall.nextsector;
                            furthestDistance = d;
                            continueScanning = true;
                        }
                    }
                }
            }
        }while(!hasTerminated && continueScanning);

        return collisionData;
    }

    /**
     * Traces a 3D ray against the map's walls and floors
     * @param {Number} rayOriginX 
     * @param {Number} rayOriginY 
     * @param {Number} rayOriginZ 
     * @param {Number} rayDirectionX 
     * @param {Number} rayDirectionY 
     * @param {Number} rayDirectionZ 
     * @param {Number} sectorPtr The sector from which to start the ray cast
     * @returns {CollisionData} Nearest collision against the origin of the ray (if any)
     */
    rayTrace(rayOriginX, rayOriginY, rayOriginZ, rayDirectionX, rayDirectionY, rayDirectionZ, sectorPtr){
        const collisionData = collisionDataBuffer[0], collisionQuery = collisionDataBuffer[1];
        collisionData.hasCollision = false;

        let continueScanning;
        sectorPtr = this.determineSector(sectorPtr, rayOriginX, rayOriginZ);

        //Here's the idea:
        //On each pass of a sector's walls, we want to keep either:
        //the nearest collision that terminates the ray 
        //the furthest collision that leads to a new sector if no collisions terminate the ray
        let furthestDistance = 0, nearestDistance = 10000, hasTerminated = false;

        do{
            const sector = this.sectors[sectorPtr],
                end = sector.wallptr + sector.wallnum;

            continueScanning = false;

            let a,b,d;

            let planeNormal, planed, planepicnum;
            if(rayDirectionY < 0){
                planeNormal = sector.floorNormal;
                planed = sector.floord;
                planepicnum = sector.floorpicnum;
            }else{
                planeNormal = sector.ceilingNormal;
                planed = sector.ceilingd;
                planepicnum = sector.ceilingpicnum;
            }

            aa_math.rayIntersectsPlane(collisionQuery, rayOriginX, rayOriginY, rayOriginZ, rayDirectionX, rayDirectionY, rayDirectionZ, planeNormal[0], planeNormal[1], planeNormal[2], planed);
            if(collisionQuery.hasCollision && aa_math.insidePolygon(sector.getWallLoops(this.walls)[0], collisionQuery.point[0], collisionQuery.point[2])){
                a = collisionQuery.point[0] - rayOriginX;
                b = collisionQuery.point[2] - rayOriginZ;
                d = a*a + b*b;

                if(d < nearestDistance){
                    collisionData.point[0] = collisionQuery.point[0];
                    collisionData.point[1] = collisionQuery.point[1];
                    collisionData.point[2] = collisionQuery.point[2];
                    collisionData.surfaceNormal[0] = collisionQuery.surfaceNormal[0];
                    collisionData.surfaceNormal[1] = collisionQuery.surfaceNormal[1];
                    collisionData.surfaceNormal[2] = collisionQuery.surfaceNormal[2];
                    collisionData.hasCollision = true;

                    collisionData.sectorPtr = sectorPtr;
                    collisionData.picnum = planepicnum;

                    nearestDistance = d;                    
                }
            }

            for(let i = sector.wallptr; i < end; ++i){
                const wall = this.walls[i],
                    point2 = this.walls[wall.point2];
    
                aa_math.rayLineSegmentIntersection(collisionQuery, rayOriginX, rayOriginZ, rayDirectionX, rayDirectionZ, wall.x, wall.y, point2.x, point2.y);
                if(collisionQuery.hasCollision){
                    a = collisionQuery.point[0] - rayOriginX;
                    b = collisionQuery.point[2] - rayOriginZ;
                    d = a*a + b*b;

                    const x = collisionQuery.point[0], y = rayOriginY + rayDirectionY * collisionQuery.t, z = collisionQuery.point[2];

                    let terminalCollision = wall.nextsector === -1;
                    if(!terminalCollision){
                        const nextSector = this.sectors[wall.nextsector];
                        terminalCollision = nextSector.getFloorHeight(x, z) > y || nextSector.getCeilingHeight(x, z) < y;
                    }

                    if(terminalCollision){
                        if(d < nearestDistance){
                            collisionData.point[0] = x;
                            collisionData.point[1] = y;
                            collisionData.point[2] = z;
                            collisionData.surfaceNormal[0] = collisionQuery.surfaceNormal[0];
                            collisionData.surfaceNormal[1] = collisionQuery.surfaceNormal[1];
                            collisionData.surfaceNormal[2] = collisionQuery.surfaceNormal[2];
                            collisionData.hasCollision = true;

                            collisionData.wallptr = i;
                            collisionData.sectorPtr = wall.nextsector;
                            collisionData.picnum = wall.picnum;

                            nearestDistance = d;
                        }
                        hasTerminated = true;
                    }else if(!hasTerminated){
                        if(d > furthestDistance){
                            sectorPtr = wall.nextsector;
                            furthestDistance = d;
                            continueScanning = true;
                        }
                    }
                }
            }
        }while(!hasTerminated && continueScanning);

        return collisionData;
    }

//     testCollisionWithRigidBody(rigidBody){
//         const previousSector = rigidBody.sectorPtr;
//         rigidBody.sectorPtr = this.determineSector(rigidBody.sectorPtr, rigidBody.pos[0], rigidBody.pos[2]);
//         if(rigidBody.sectorPtr === -1){
//             vec3.copy(collisionData.point, rigidBody.pos);
//             collisionData.surfaceNormal[0] = -rigidBody.velocity[0];
//             collisionData.surfaceNormal[1] = -rigidBody.velocity[1];
//             collisionData.surfaceNormal[2] = -rigidBody.velocity[2];
//             vec3.normalize(collisionData.surfaceNormal, collisionData.surfaceNormal);

//             collisionData.hasCollision = true;
//             return collisionData;
//         }

//         collisionData.hasCollision = false;

//         const bounds = this.sectors[rigidBody.sectorPtr].getWallLoops(this.walls)[0],
//             n = bounds.length,
//             px = rigidBody.pos[0],
//             py = rigidBody.pos[2];

//         const cr = 1;

//         for(let i = 0; i < n; ++i){
//             const wall = bounds[i];
//             if(wall.nextsector !== -1)
//                 continue;

//             const point2 = this.walls[wall.point2];

//             //project vector u onto v,
//             //where u is the vector to the rigidBody from wall point 1
//             //and v is the vector from wall point 1 to wall point 2
//             const ux = px - wall.x,
//                 uy = px - wall.y,
//                 vx = point2.x - wall.x,
//                 vy = point2.y - wall.y;

//             const mv = vx*vx + vy*vy,
//                 s = (ux * vx + uy * vy) / mv,
//                 projx = s * vx,
//                 projy = s * vy,
//                 rx = wall.x + projx,
//                 ry = wall.y + projy;
// //(Math.sign(rx - wall.x) !== Math.sign(rx - point2.x) && Math.sign(ry - wall.y) !== Math.sign(ry - point2.y))  &&
//             if( (Math.pow(rx - px, 2) + Math.pow(ry - py, 2)) < cr * cr){
//                 console.log('hit a wall!');
//                 collisionData.hasCollision = true;

//                 collisionData.point[0] = rx;
//                 collisionData.point[1] = rigidBody.pos[1];
//                 collisionData.point[2] = ry;

//                 //The nice thing about walls is that they are all perfectly straight :)
//                 collisionData.surfaceNormal[0] = px - rx;
//                 collisionData.surfaceNormal[1] = 0;
//                 collisionData.surfaceNormal[2] = py - ry;

//                 vec3.normalize(collisionData.surfaceNormal, collisionData.surfaceNormal);

//                 return collisionData;
//             }
//         }

//         return collisionData;
//     }
}
import { MapTesselator } from "../geometry/map-tesselator";
import * as aa_math from "../math";
import { CollisionData } from "../physics/collision-data";
import { vec3 } from "gl-matrix";
import { UIntStack } from "../utils/stack";
import { wallTexDimensY } from "../art";

/**
 * Encapsulates the rendering and collision detection within a Build engine map
 */

 //iterator variables
let i;

const COLLISION_DATA_BUFFER_SIZE = 16;
const collisionDataBuffer = new Array(COLLISION_DATA_BUFFER_SIZE);
for(i = 0; i < COLLISION_DATA_BUFFER_SIZE; ++i)
    collisionDataBuffer[i] = new CollisionData();

const buffers = new Array(3);
var indexCount = 0;

const visitedSectorSet = new Set();
const pendingSectorStack = new UIntStack(32);

//Common intersection math ops
const _rayIntersectsPlane = aa_math.rayIntersectsPlane;
const _rayIntersectsLine = aa_math.rayLineSegmentIntersection;
const _lineSegmentIntersectsPlane = aa_math.lineSegmentIntersectsPlane;
const _lineSegmentIntersection = aa_math.lineSegmentIntersection;

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
        for(i = 0; i < n; ++i){
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
        for(i = 0; i < nNeighbors; ++i){
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
        const sector = this.sectors[i],
            end = sector.wallptr + sector.wallnum;

        let count = 0, y0, y1, x0, x1, t, u, sx, sy;

        for(i = sector.wallptr; i < end; ++i){
            const wall = this.walls[i],
                point2 = this.walls[wall.point2];

            y0 = y - wall.y; y1 = y - point2.y;

            if((y0 > 0) !== (y1 > 0)){
                sx = point2.x - wall.x;
                sy = point2.y - wall.y;

                t = ((wall.x * sy - wall.y * sx) - (x * sy - y * sx)) / sy;
                if(t < 0)
                    continue;

                u = y0 / sy;
                if(u > 0 && u < 1)
                    ++count;
            }
        }

        return count & 1 !== 0;
    }

    searchForSectorIndex(x, y){
        const sectors = this.sectors,
            walls = this.walls;

        for(i = 0; i < sectors.length; ++i){
            if(this.isInSector(i, x, y))
                return i;
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
        //Similar to rayTrace, but different enough to warrent a separate function to reduce additional checks
        const la = p1x - p0x, lb = p1y - p0y, lc = p1z - p0z;

        //Essentially double buffering - when a potential collision check is the best candidate, copy it to our result set
        const collisionData = collisionDataBuffer[0], collisionQuery = collisionDataBuffer[1];
        collisionData.hasCollision = false;

        let continueScanning, nearestDistance = 1000000, hasTerminated = false, terminalCollision;
        let a,b,d;
        let planeNormal, planed, planepicnum;

        pendingSectorStack.clear();

        do{
            const sector = this.sectors[sectorPtr],
                end = sector.wallptr + sector.wallnum;

            //If line segment moving down, check for collision against floor.
            //Otherwise, check against ceiling
            if(lb < 0){
                planeNormal = sector.floorNormal;
                planed = sector.floord;
                planepicnum = sector.floorpicnum;
            }else{
                planeNormal = sector.ceilingNormal;
                planed = sector.ceilingd;
                planepicnum = sector.ceilingpicnum;
            }

            _lineSegmentIntersectsPlane(collisionQuery, p0x, p0y, p0z, la, lb, lc, planeNormal[0], planeNormal[1], planeNormal[2], planed);
            if(collisionQuery.hasCollision){
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

                hasTerminated = true;
            }

            for(i = sector.wallptr; i < end; ++i){
                const wall = this.walls[i],
                    point2 = this.walls[wall.point2];
    
                //Ignore backfacing
                if(la * (wall.y - point2.y) + lc * (point2.x - wall.x) > 0)
                    continue;
    
                _lineSegmentIntersection(collisionQuery, p0x, p0z, p1x, p1z, wall.x, wall.y, point2.x, point2.y);
                if(collisionQuery.hasCollision){    
                    const x = collisionQuery.point[0], y = p0y + lb * collisionQuery.t, z = collisionQuery.point[2];
    
                    terminalCollision = wall.nextsector === -1;
                    if(!terminalCollision){
                        const nextSector = this.sectors[wall.nextsector];
                        terminalCollision = nextSector.getFloorHeight(x, z) > y || nextSector.getCeilingHeight(x, z) < y;
                    }
                
                    if(terminalCollision){
                        a = x - p0x;
                        b = z - p0z;
                        d = a*a + b*b;

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
                        pendingSectorStack.push(wall.nextsector);
                    }
    
                }
            }
        }while(!hasTerminated && (sectorPtr = pendingSectorStack.pop()) !== -1);


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
        //Essentially double buffering - when a potential collision check is the best candidate, copy it to our result set
        const collisionData = collisionDataBuffer[0], collisionQuery = collisionDataBuffer[1];
        collisionData.hasCollision = false;

        let continueScanning, nearestDistance = 1000000, hasTerminated = false, terminalCollision;
        let a,b,d;
        let planeNormal, planed, planepicnum;

        pendingSectorStack.clear();
        visitedSectorSet.clear();

        do{
            if(visitedSectorSet.has(sectorPtr))
                continue;

            visitedSectorSet.add(sectorPtr);

            const sector = this.sectors[sectorPtr],
                end = sector.wallptr + sector.wallnum;

            //If line segment moving down, check for collision against floor.
            //Otherwise, check against ceiling
            if(rayDirectionY < 0){
                planeNormal = sector.floorNormal;
                planed = sector.floord;
                planepicnum = sector.floorpicnum;
            }else{
                planeNormal = sector.ceilingNormal;
                planed = sector.ceilingd;
                planepicnum = sector.ceilingpicnum;
            }

            _rayIntersectsPlane(collisionQuery, rayOriginX, rayOriginY, rayOriginZ, rayDirectionX, rayDirectionY, rayDirectionZ, planeNormal[0], planeNormal[1], planeNormal[2], planed);
            if(collisionQuery.hasCollision){
                a = collisionQuery.point[0] - rayOriginX;
                b = collisionQuery.point[2] - rayOriginZ;
                d = a*a + b*b;

                if(d < nearestDistance && this.isInSector(sectorPtr, collisionQuery.point[0], collisionQuery.point[2])){
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

            for(i = sector.wallptr; i < end; ++i){
                const wall = this.walls[i],
                    point2 = this.walls[wall.point2];
    
                //Ignore backfacing
                if(rayDirectionX * (wall.y - point2.y) + rayDirectionZ * (point2.x - wall.x) > 0)
                    continue;
    
                _rayIntersectsLine(collisionQuery, rayOriginX, rayOriginZ, rayDirectionX, rayDirectionZ, wall.x, wall.y, point2.x, point2.y);
                if(collisionQuery.hasCollision){    
                    const x = collisionQuery.point[0], y = rayOriginY + rayDirectionY * collisionQuery.t, z = collisionQuery.point[2];

                    terminalCollision = wall.nextsector === -1;
                    if(!terminalCollision){
                        const nextSector = this.sectors[wall.nextsector];
                        terminalCollision = nextSector.getFloorHeight(x, z) > y || nextSector.getCeilingHeight(x, z) < y;
                    }
                
                    if(terminalCollision){
                        a = collisionQuery.point[0] - rayOriginX;
                        b = collisionQuery.point[2] - rayOriginZ;
                        d = a*a + b*b;

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
                    }else{
                        pendingSectorStack.push(wall.nextsector);
                    }
    
                }
            }
        }while((sectorPtr = pendingSectorStack.pop()) !== -1);


        return collisionData;
    }
}
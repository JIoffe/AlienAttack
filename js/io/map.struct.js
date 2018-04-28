import { MapTesselator } from "../geometry/map-tesselator";
import * as aa_math from "../math";
import { CollisionData } from "../physics/collision-data";
import { vec3 } from "gl-matrix";

/**
 * Encapsulates the rendering and collision detection within a Build engine map
 */

const COLLISION_DATA_BUFFER_SIZE = 10;
const collisionDataBuffer = new Array(COLLISION_DATA_BUFFER_SIZE);
for(let i = 0; i < COLLISION_DATA_BUFFER_SIZE; ++i)
    collisionDataBuffer[i] = new CollisionData();

const buffers = new Array(3);
var indexCount = 0;

export class LevelMap{
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

            // //Cache heights - this should rarely change for most of the map
            // let walls = this.walls
            //     .slice(sector.wallptr, sector.wallptr + sector.wallnum)
            //     .forEach(wall => {
            //         console.log(wall);
            //         const nextSector = this.sectors[wall.nextsector];

            //         const heights = new Float32Array(4);

            //         heights[0] = sector.getFloorHeight(wall.x, wall.y);
            //         heights[1] = sector.getCeilingHeight(wall.x, wall.y);

            //         if(!!nextSector){
            //             heights[2] = nextSector.getFloorHeight(wall.x, wall.y)
            //             heights[3] = nextSector.getCeilingHeight(wall.x, wall.y);
            //         }

            //         wall.heights = heights;
            //     });
        });
    }

    testCollisionWithProjectile(prevPosition, prevSector, newPosition){
        //Cache some values of the line segment for back-face culling
        const lx0 = prevPosition[0],
            lx1 = newPosition[0],
            ly0 = prevPosition[2],
            ly1 = newPosition[2],
            crossA = lx1 - lx0,
            crossB = ly1 - ly0;

        let collisionDataResult = collisionDataBuffer[0];

        collisionDataResult.hasCollision = false;
        collisionDataResult.sectorPtr = prevSector;


        let continueScanning = true, activeSector = prevSector;

        while(continueScanning){
            const sector = this.sectors[activeSector],
                bounds = sector.getWallLoops(this.walls)[0],
                n = bounds.length;

            continueScanning = false;

            let nCollisions = 0;
            for(let i = 0; i < n; ++i){
                const wall = bounds[i];

                //Ignore non-bounding walls
                if(wall.nextsector === activeSector)
                    continue;

                const isLeft = crossA * (wall.y - ly0) - crossB * (wall.x - lx0);

                //Ignore back facing surfaces - assume everything is watertight and we will make up for it
                if(isLeft > 0)
                    continue;

                const point2 = this.walls[wall.point2];
    
                const collisionData = collisionDataBuffer[nCollisions];
                aa_math.lineSegmentIntersection(collisionData, prevPosition[0], prevPosition[2], newPosition[0], newPosition[2], wall.x, wall.y, point2.x, point2.y);

                if(collisionData.hasCollision){
                    collisionData.sectorPtr = wall.nextsector;
                    collisionData.wallptr = i;

                    let terminalCollision = wall.nextsector === -1;
                    if(!terminalCollision){
                        const nextSector = this.sectors[wall.nextsector],
                            x = collisionData.point[0],
                            y = prevPosition[1],
                            z = collisionData.point[2];
                        terminalCollision = nextSector.getFloorHeight(x, z) > y || nextSector.getCeilingHeight(x, z) < y;
                    }
    
                    if(terminalCollision){
                        collisionData.hasCollision = true;
                        collisionData.point[1] = prevPosition[1];

                        return collisionData;
                    }

                    collisionData.hasCollision = false;

                    ++nCollisions;
                }
            }

            //Find the nearest intersection to the projectile
            //and continue scanning in the next sector
            if(nCollisions > 0){
                let nearestSquaredDistance = vec3.squaredDistance(collisionDataBuffer[0], newPosition);
                activeSector = collisionDataBuffer[0].sectorPtr;

                for(let i = 1; i < nCollisions; ++i){
                    const collisionData = collisionDataBuffer[i],
                        d = vec3.squaredDistance(collisionData, newPosition);

                    if(d < nearestSquaredDistance){
                        nearestSquaredDistance = d;
                        activeSector = collisionData.sectorPtr;
                    }
                }
                continueScanning = true;
            }  
        }

        collisionDataResult.hasCollision = false;
        return collisionDataResult;
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
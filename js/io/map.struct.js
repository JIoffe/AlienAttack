import { MapTesselator } from "../geometry/map-tesselator";
import * as aa_math from "../math";

/**
 * Encapsulates the rendering and collision detection within a Build engine map
 */

const buffers = new Array(4);
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
        gl.enableVertexAttribArray(2);

        gl.useProgram(shaderProgram.program);
        gl.uniformMatrix4fv(shaderProgram.uniformLocations.modelViewProj, false, modelViewMatrix);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[0]);
        gl.vertexAttribPointer(shaderProgram.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[1]);
        gl.vertexAttribPointer(shaderProgram.attribLocations.texPosition, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[2]);
        gl.vertexAttribPointer(shaderProgram.attribLocations.shade, 1, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers[3]);

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
        gl.disableVertexAttribArray(2);
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
}
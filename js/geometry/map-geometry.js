import { Renderable } from './renderable'
import * as libtess from 'libtess'
import * as aa_math from '../math'
import * as array_utils from '../utils/array.utils'

const wallXRepeatScale = 0.09,
    wallYRepeatScale = 0.225;

///
// Encapsulates preparing map geometry for rendering
///

export class MapGeometry {
    constructor(gl, mapData) {
        this.buildRenderableGeometry(gl, mapData);
    }

    get sectors() {
        return this.renderableSectors || [];
    }

    buildRenderableGeometry(gl, mapData) {
        this.renderableSectors = new Array(mapData.sectors.length);
        for (let i = 0; i < mapData.sectors.length; ++i) {
            let sector = mapData.sectors[i];

            this.renderableSectors[i] = {
                renderableWalls: this.buildWallGeometry(gl, mapData, sector),
                renderableFloor: this.buildFloorGeometry(gl, mapData, sector),
                renderableCeiling: this.buildCeilingGeometry(gl, mapData, sector)
            };
        }
    }

    buildWallGeometry(gl, mapData, sector) {
        //For slope
        let slopeRef = mapData.walls[sector.wallptr];
        let slopeP2 = mapData.walls[slopeRef.point2];

        let normX = slopeP2.x - slopeRef.x;
        let normZ = slopeP2.y - slopeRef.y;
        let w = Math.sqrt(normX * normX + normZ * normZ);
        normX /= w; normZ /= w;

        let dZFloor = normX * sector.floorheinum,
            dXFloor = normZ * sector.floorheinum,
            dZCeiling = normX * sector.ceilingheinum,
            dXCeiling = normZ * sector.ceilingheinum;


        let sectorWalls = mapData.walls.slice(sector.wallptr, sector.wallptr + sector.wallnum);
        return array_utils
            .groupBy(sectorWalls, 'shade')
            .map(g => {
                let vertices = [], texCoords = [], normals = [], indices = [];
                let wallCount = 0;

                g.forEach(wall => {
                    let nextWall = mapData.walls[wall.point2];
    
                    //Render height depends on whether or not this is a portal
                    let floor, ceiling;
                        floor = sector.floorz;
                        ceiling = sector.ceilingz;
    
                    if(wall.nextsector < 0){
                        floor = sector.floorz;
                        ceiling = sector.ceilingz;
                    }else{
                        let nextsector = mapData.sectors[wall.nextsector];
                        if(nextsector.ceilingz < sector.ceilingz){
                            floor = nextsector.ceilingz;
                            ceiling = sector.ceilingz;
                        }else if(nextsector.floorz < sector.floorz){
                            floor = nextsector.floorz;
                            ceiling = sector.floorz;
                        }else if(nextsector.floorz > sector.floorz){
                            floor = sector.floorz;
                            ceiling = nextsector.floorz;
                        }else{
                            return;
                        }
                    }
    
                    const height = Math.abs(ceiling - floor);
    
                    vertices.push(
                        nextWall.x, ceiling, nextWall.y,
                        wall.x, ceiling, wall.y,
                        nextWall.x, floor, nextWall.y,
                        wall.x, floor, wall.y
                    );
    
                    let normX = nextWall.x - wall.x;
                    let normZ = nextWall.y - wall.y;
                    let w = Math.sqrt(normX * normX + normZ * normZ);
                    normX /= w; normZ /= w;
                    normals.push(normX, 0, normZ, normX, 0, normZ, normX, 0, normZ, normX, 0, normZ);
    
                    let texRight = wall.xrepeat * wallXRepeatScale + wall.xpanning,
                        texLeft = wall.xpanning,
                        texTop = wall.ypanning,
                        texBottom = height / (wall.yrepeat * wallYRepeatScale) + wall.ypanning;
        
                    texCoords.push(
                        texRight, texTop,   //Top Right
                        texLeft, texTop,  //Top left
                        texRight, texBottom,  // Bottom right
                        texLeft, texBottom  //bottom left
                    )
    
                    indices.push(wallCount, wallCount + 2, wallCount + 3, wallCount + 3, wallCount + 1, wallCount);
                    wallCount += 4;
                });
        
                var renderableSet = new Renderable(gl, vertices, indices, texCoords, normals);
                renderableSet.picnum = 0;
                renderableSet.shade = g[0].shade;
                console.log('shade', renderableSet.shade);
                return renderableSet;
            });
    }

    buildCeilingGeometry(gl, mapData, sector) {
        let r = this.buildHorizontalGeometry(gl, mapData, sector, sector.ceilingz, sector.ceilingheinum);
        r.shade = sector.ceilingshade;
        return r;
    }
    buildFloorGeometry(gl, mapData, sector) {
        let r = this.buildHorizontalGeometry(gl, mapData, sector, sector.floorz, sector.floorheinum);
        r.shade = sector.floorshade;
        return r;
    }

    buildHorizontalGeometry(gl, mapData, sector, height, heinum) {
        let wallLoops = this.findWallLoops(mapData, sector);

        tessy.gluTessNormal(0, 0, 1);

        let points = [];
        tessy.gluTessBeginPolygon(points);

        wallLoops.forEach(loop => {
            tessy.gluTessBeginContour();
            loop.forEach(p => {
                let coords = [p.x, p.y, 0];
                tessy.gluTessVertex(coords, coords);
            });
            tessy.gluTessEndContour();
        });
        tessy.gluTessEndPolygon();

        let indices = [], vertices = [], normals = [], texCoords = [];

        //For slope
        // let slopeRef = mapData.walls[sector.wallptr];
        // let slopeP2 = mapData.walls[slopeRef.point2];

        // let normX = slopeP2.x - slopeRef.x;
        // let normZ = slopeP2.y - slopeRef.y;
        // let w = Math.sqrt(normX * normX + normZ * normZ);

        // normX /= w; normZ /= w;

        // let dZ = normX * heinum,
        //     dX = normZ * heinum;

        for(let i = 0; i < points.length; i += 2){
            let x = points[i],
                z = points[i+1];

            vertices.push(x, height, z);
            normals.push(0, 1.0, 0);
            texCoords.push(x / 0.75, z / 0.75);
            indices.push(indices.length);
        }

        let renderableSet = new Renderable(gl, vertices, indices, texCoords, normals);
        renderableSet.picnum = 1;
        return renderableSet;
    }

    ///
    // A single sector can have multiple walls - if it has inner sectors!
    ///
    findWallLoops(mapData, sector) {
        let loops = [],
            wallCount = 0;

        while (wallCount < sector.wallnum) {
            let loop = [];
            for (let first = wallCount + sector.wallptr, i = first; ;) {
                let wall = mapData.walls[i++];
                wallCount++;
                loop.push(wall);

                if (wall.point2 === first)
                    break;
            }
            loops.push(loop);
        }

        return loops;
    }
}

var tessy = (function initTesselator() {
    // function called for each vertex of tesselator output
    function vertexCallback(data, polyVertArray) {
      polyVertArray[polyVertArray.length] = data[0];
      polyVertArray[polyVertArray.length] = data[1];
    }

    // callback for when segments intersect and must be split
    function combinecallback(coords, data, weight) {
      return [coords[0], coords[1], coords[2]];
    }
  
    var tessy = new libtess.GluTesselator();
    tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_VERTEX_DATA, vertexCallback);
    tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_COMBINE, combinecallback);
  
    return tessy;
  })();
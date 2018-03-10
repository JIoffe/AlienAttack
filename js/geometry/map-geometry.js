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
                renderableFloor: this.buildHorizontalGeometry(gl, mapData, sector, true),
                renderableCeiling: this.buildHorizontalGeometry(gl, mapData, sector, false)
            };
        }
    }

    buildWallGeometry(gl, mapData, sector) {
        // let sectorWalls = mapData.walls.slice(sector.wallptr, sector.wallptr + sector.wallnum),
        //     isInnerSector = !sectorWalls.some(w => w.nextsector === -1);

        let sectorWalls = this.findWallLoops(mapData, sector)[0];

        return array_utils
            .groupBy(sectorWalls, 'shade')
            .map(g => {
                let vertices = [], texCoords = [], normals = [], indices = [];
                let wallCount = 0;

                g.forEach((wall, i) => {
                    let nextWall = mapData.walls[wall.point2];

                    if(wall.nextsector === -1){
                        this.buildOuterWall(wall, sector, nextWall, vertices, texCoords, normals, indices);
                    }else{
                        let nextSector = mapData.sectors[wall.nextsector];
                        this.buildInnerSectorWall(wall, sector, nextSector, nextWall, vertices, texCoords, normals, indices);
                    }
                    
                });
        
                var renderableSet = new Renderable(gl, vertices, indices, texCoords, normals);
                renderableSet.picnum = 0;
                renderableSet.shade = g[0].shade;

                return renderableSet;
            });
    }

    //Wall Utility Methods
    buildOuterWall(wall, sector, nextWall, vertices, texCoords, normals, indices){
        let ceilLeft = sector.getCeilingHeight(wall.x, wall.y),
            ceilRight = sector.getCeilingHeight(nextWall.x, nextWall.y),
            floorLeft = sector.getFloorHeight(wall.x, wall.y),
            floorRight = sector.getFloorHeight(nextWall.x, nextWall.y);
            
        this.buildWallSection(wall, nextWall, ceilLeft, floorLeft, ceilRight, floorRight, vertices, normals, texCoords, indices);
    }

    buildInnerSectorWall(wall, sector, nextSector, nextWall, vertices, texCoords, normals, indices){
        //TODO - Refactor more DRY

        //Inner section walls are special because the "floor"
        //and "ceiling" are separated. 

        //Protrusion from floor of parent to floor of child (if any)
        {
            let ceilLeft = sector.getFloorHeight(wall.x, wall.y),
                floorLeft = nextSector.getFloorHeight(wall.x, wall.y),
                ceilRight = sector.getFloorHeight(nextWall.x, nextWall.y),
                floorRight = nextSector.getFloorHeight(nextWall.x, nextWall.y);

            if(floorLeft > ceilLeft)
                floorLeft = ceilLeft - 1;
            if(floorRight > ceilRight)
                floorRight = ceilRight - 1;

            this.buildWallSection(wall, nextWall, ceilLeft, floorLeft, ceilRight, floorRight, vertices, normals, texCoords, indices);          
        }

        //Indentation within parent sector floor (if any)
        {
            let ceilLeft = nextSector.getFloorHeight(wall.x, wall.y),
                floorLeft = sector.getFloorHeight(wall.x, wall.y),
                ceilRight = nextSector.getFloorHeight(nextWall.x, nextWall.y),
                floorRight = sector.getFloorHeight(nextWall.x, nextWall.y);

            if(floorLeft > ceilLeft)
                floorLeft = ceilLeft - 1;
            if(floorRight > ceilRight)
                floorRight = ceilRight - 1;

            this.buildWallSection(wall, nextWall, ceilLeft, floorLeft, ceilRight, floorRight, vertices, normals, texCoords, indices);             
        }

        // Protrusion from ceiling of parent (if any)
        {
            let ceilLeft = nextSector.getCeilingHeight(wall.x, wall.y),
                floorLeft = sector.getCeilingHeight(wall.x, wall.y),
                ceilRight = nextSector.getCeilingHeight(nextWall.x, nextWall.y),
                floorRight = sector.getCeilingHeight(nextWall.x, nextWall.y);

            if(floorLeft > ceilLeft)
                ceilLeft = floorLeft + 1;
            if(floorRight > ceilRight)
                ceilRight = floorRight + 1;

            this.buildWallSection(wall, nextWall, ceilLeft, floorLeft, ceilRight, floorRight, vertices, normals, texCoords, indices);          
        }

        //Indentation within parent sector ceiling (if any)
        {
            let ceilLeft = sector.getFloorHeight(wall.x, wall.y),
                floorLeft = nextSector.getFloorHeight(wall.x, wall.y),
                ceilRight = sector.getFloorHeight(nextWall.x, nextWall.y),
                floorRight = nextSector.getFloorHeight(nextWall.x, nextWall.y);

            if(floorLeft > ceilLeft)
                floorLeft = ceilLeft - 1;
            if(floorRight > ceilRight)
                floorRight = ceilRight - 1;

            this.buildWallSection(wall, nextWall, ceilLeft, floorLeft, ceilRight, floorRight, vertices, normals, texCoords, indices);             
        }
    }

    buildWallSection(wall, nextWall, ceilLeft, floorLeft, ceilRight, floorRight, vertices, normals, texCoords, indices){
        this.applyWallVertices(vertices, wall, nextWall, ceilLeft, floorLeft, ceilRight, floorRight);
        this.applyWallTexCoords(wall, texCoords);

        let norm = wall.getNormal(nextWall);
        normals.push(norm.x, 0, norm.z, norm.x, 0, norm.z, norm.x, 0, norm.z, norm.x, 0, norm.z);

        let wallCount = !!indices.length ? indices[indices.length - 1] + 4 : 0;
        indices.push(wallCount, wallCount + 2, wallCount + 3, wallCount + 3, wallCount + 1, wallCount);
    }

    applyWallTexCoords(wall, texCoords){
        let texRight = wall.xrepeat * wallXRepeatScale + wall.xpanning,
        texLeft = wall.xpanning,
        texTop = wall.ypanning,
        texBottom = wall.yrepeat + wall.ypanning;

        texCoords.push(
            texRight, texTop,   //Top Right
            texLeft, texTop,  //Top left
            texRight, texBottom,  // Bottom right
            texLeft, texBottom  //bottom left
        )
    }

    applyWallVertices(vertices, wall, nextWall, ceilLeft, floorLeft, ceilRight, floorRight){
        vertices.push(
            nextWall.x, ceilRight, nextWall.y,
            wall.x, ceilLeft, wall.y,
            nextWall.x, floorRight, nextWall.y,
            wall.x, floorLeft, wall.y
        );
    }

    buildHorizontalGeometry(gl, mapData, sector, isFloor) {
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

        for(let i = 0; i < points.length; i += 2){
            let x = points[i],
                z = points[i+1],
                y = isFloor ? sector.getFloorHeight(x, z) : sector.getCeilingHeight(x, z);

            vertices.push(x, y, z);
            normals.push(0, 1.0, 0);
            texCoords.push(x / 0.75, z / 0.75);
            indices.push(indices.length);
        }

        let renderableSet = new Renderable(gl, vertices, indices, texCoords, normals);
        renderableSet.picnum = 1;
        renderableSet.shade = isFloor ? sector.floorshade : sector.ceilingshade;
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
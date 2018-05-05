import * as libtess from 'libtess'
import * as ArrayUtils from '../utils/array.utils'
import * as aa_math from '../math';
import * as art from '../art';

const SIZEOF_SHORT = 2;

export class MapTesselator{
    static tesselateMap(gl, map, buffers){
        const indices = [],
            vertices = [],
            texCoords = [],
            normals= [];

        map.sectors.forEach(sector => {
            sector.indices = new Int32Array(4);
            sector.indices[1] = indices.length;
            MapTesselator.buildHorizontalGeometry(gl, map.walls, sector, true, vertices, texCoords, normals, indices);
            sector.indices[0] = indices.length - sector.indices[1];
            sector.indices[1] *= SIZEOF_SHORT;

            sector.indices[3] = indices.length;
            MapTesselator.buildHorizontalGeometry(gl, map.walls, sector, false, vertices, texCoords, normals, indices);
            sector.indices[2] = indices.length - sector.indices[3];
            sector.indices[3] *= SIZEOF_SHORT;

            const sectorWalls = map.walls.slice(sector.wallptr, sector.wallptr + sector.wallnum);
            const wallGroups = ArrayUtils.groupBy(sectorWalls, ['picnum']);

            sector.wallData = new Int32Array(wallGroups.length * 3);
            wallGroups.forEach((wallGroup, i) => {
                const picnum = i * 3, 
                    count = picnum + 1, 
                    offset = count + 1;
                
                sector.wallData[picnum] = wallGroup[0].picnum;
                sector.wallData[offset] = indices.length;
                wallGroup.forEach(wall => {
                    const nextWall = map.walls[wall.point2];

                    if(wall.nextsector === -1){
                        MapTesselator.buildOuterWall(wall, sector, nextWall, vertices, texCoords, normals, indices);
                    }else{
                        MapTesselator.buildInnerSectorWall(wall, sector, map.sectors[wall.nextsector], nextWall, vertices, texCoords, normals, indices);
                    }   
                })
                sector.wallData[count] = indices.length - sector.wallData[offset];
                sector.wallData[offset] *= SIZEOF_SHORT;
            });
        });

        buffers[0] = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[0]);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        buffers[1] = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[1]);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

        buffers[2] = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers[2]);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        return indices.length;
    }

    static buildHorizontalGeometry(gl, walls, sector, isFloor, vertices, texCoords, normals, indices) {
        //Needed to correct winding later on
        const indexStart = indices.length;
        let vertexPtr = vertices.length / 4;

        const wallLoops = sector.getWallLoops(walls);

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

        const texPixelWidth = 64,
            pixelOffset = 0.015625;

        let shadeValue = MapTesselator.transformShadeValue(isFloor ? sector.floorshade : sector.ceilingshade);

        const picnum = isFloor ? sector.floorpicnum : sector.ceilingpicnum;

        for(let i = 0; i < points.length; i += 2){
            let x = points[i],
                z = points[i+1],
                y = isFloor ? sector.getFloorHeight(x, z) : sector.getCeilingHeight(x, z);

            vertices.push(x, y, z, shadeValue);
            // normals.push(0, 1.0, 0);

            texCoords.push(
                x / (art.MAP_IMPORT_SCALE * 1024.0) + sector.floorxpanning / 256.0 * art.wallTexDimensX[picnum],
                z / (art.MAP_IMPORT_SCALE * 1024.0) + sector.floorypanning / 256.0 * art.wallTexDimensY[picnum]
            );

            indices.push(vertexPtr++);
        }

        //Correct winding for culling
        if(isFloor){
            for(let i = indexStart; i < indices.length; i+=3){
                let temp = indices[i];
                indices[i] = indices[i+2];
                indices[i+2] = temp;
            }
        }
    }

    static buildOuterWall(wall, sector, nextWall, vertices, texCoords, normals, indices){
        let ceilLeft = sector.getCeilingHeight(wall.x, wall.y),
            ceilRight = sector.getCeilingHeight(nextWall.x, nextWall.y),
            floorLeft = sector.getFloorHeight(wall.x, wall.y),
            floorRight = sector.getFloorHeight(nextWall.x, nextWall.y);
            
        MapTesselator.buildWallSection(wall, nextWall, sector, null, ceilLeft, floorLeft, ceilRight, floorRight, vertices, normals, texCoords, indices);
    }

    static buildInnerSectorWall(wall, sector, nextSector, nextWall, vertices, texCoords, normals, indices){
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

            this.buildWallSection(wall, nextWall, sector, nextSector, ceilLeft, floorLeft, ceilRight, floorRight, vertices, normals, texCoords, indices);          
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

            this.buildWallSection(wall, nextWall, sector, nextSector, ceilLeft, floorLeft, ceilRight, floorRight, vertices, normals, texCoords, indices);             
        }


        // Protrusion from ceiling of parent (if any)
        {
            let ceilLeft = sector.getCeilingHeight(wall.x, wall.y),
                ceilRight = sector.getCeilingHeight(nextWall.x, nextWall.y),
                floorLeft = nextSector.getCeilingHeight(wall.x, wall.y),
                floorRight = nextSector.getCeilingHeight(nextWall.x, nextWall.y);


            if(floorLeft > ceilLeft)
                ceilLeft = floorLeft + 1;
            if(floorRight > ceilRight)
                ceilRight = floorRight + 1;

            this.buildWallSection(wall, nextWall, sector, nextSector, ceilLeft, floorLeft, ceilRight, floorRight, vertices, normals, texCoords, indices);          
        }

        // //Indentation within parent sector ceiling (if any)
        // {
        //     let ceilLeft = nextSector.getCeilingHeight(wall.x, wall.y),
        //         ceilRight = nextSector.getCeilingHeight(nextWall.x, nextWall.y),
        //         floorLeft = sector.getCeilingHeight(wall.x, wall.y),
        //         floorRight = sector.getCeilingHeight(nextWall.x, nextWall.y);

        //     if(floorLeft > ceilLeft)
        //         floorLeft = ceilLeft - 1;
        //     if(floorRight > ceilRight)
        //         floorRight = ceilRight - 1;

        //     this.buildWallSection(wall, nextWall, ceilLeft, floorLeft, ceilRight, floorRight, vertices, normals, texCoords, indices);             
        // }
    }

    static buildWallSection(wall, nextWall, sector, nextSector, ceilLeft, floorLeft, ceilRight, floorRight, vertices, normals, texCoords, indices){
        const i = vertices.length / 4;
        indices.push(i,i+1,i+2,i+2,i+1,i+3);
        MapTesselator.applyWallVertices(vertices, wall, nextWall, ceilLeft, floorLeft, ceilRight, floorRight);
        MapTesselator.applyWallTexCoords(wall, nextWall, sector, nextSector, ceilLeft, floorLeft, ceilRight, floorRight, texCoords);

        // let norm = wall.getNormal(nextWall);
        // normals.push(norm.x, 0, norm.z, norm.x, 0, norm.z, norm.x, 0, norm.z, norm.x, 0, norm.z);

        //0,1,2  2,3,0
        //4,5,6  6,7,4
    }


    static applyWallVertices(vertices, wall, nextWall, ceilLeft, floorLeft, ceilRight, floorRight){
        const shadeValue = MapTesselator.transformShadeValue(wall.shade);

        vertices.push(
            nextWall.x, ceilRight, nextWall.y, shadeValue,
            wall.x, ceilLeft, wall.y, shadeValue,
            nextWall.x, floorRight, nextWall.y, shadeValue,
            wall.x, floorLeft, wall.y, shadeValue
        );
    }

    static applyWallTexCoords(wall, nextWall, sector, nextSector, ceilLeft, floorLeft, ceilRight, floorRight, texCoords){
        //*panning = offset in texels
        //*repeat = texels per world unit

        const texRight = (8.0 * wall.xrepeat + wall.xpanning) / art.wallTexDimensX[wall.picnum],
            texLeft = wall.xpanning / art.wallTexDimensX[wall.picnum];
            // texTop = yOffset,
            // texBottom = yOffset + wall.yrepeat / (texPixelWidth / 8);

            // w->wall.buffer[i].u = ((dist * 8.0f * wal->xrepeat) + wal->xpanning) / (float)(tilesiz[curpicnum].x);
            // w->wall.buffer[i].v = (-(float)(yref + (w->wall.buffer[i].y * 16)) / ((tilesiz[curpicnum].y * 2048.0f) / (float)(wal->yrepeat))) + ypancoef;

        const picHeight = art.wallTexDimensY[wall.picnum];

        // texCoords.push(
        //     texRight, -ceilRight/art.MAP_IMPORT_SCALE / picHeight,   //Top Right
        //     texLeft, -ceilLeft/art.MAP_IMPORT_SCALE / picHeight,  //Top left
        //     texRight, -floorRight/art.MAP_IMPORT_SCALE * 16.0 / (picHeight * 32.0) / wall.yrepeat,  // Bottom right
        //     texLeft, -floorLeft/art.MAP_IMPORT_SCALE * 16.0 / (picHeight * 32.0) / wall.yrepeat  //bottom left
        // )
        texCoords.push(
            texRight, 0,   //Top Right
            texLeft, 0,  //Top left
            texRight, _getVTexCoordRepeat(ceilRight, floorRight, wall),  // Bottom right
            texLeft,  _getVTexCoordRepeat(ceilLeft, floorLeft, wall) //bottom left
        )
    }

    static transformShadeValue(shadeValue){
        return 1.0 - shadeValue / 20.0;
    }
}

function _getVTexCoordRepeat(ceil, floor, wall){
    return ((ceil - floor)/art.MAP_Z_IMPORT_SCALE * wall.yrepeat) / 2048.0 / art.wallTexDimensY[wall.picnum];
}
function _getVTexCoord(yref, y, wall){
    var v = (y/(art.MAP_Z_IMPORT_SCALE * 512.0) + wall.ypanning) / art.wallTexDimensY[wall.picnum];
    console.log(v);
    return v;
    //return ((-y / art.MAP_IMPORT_SCALE)  + wall.ypanning) / art.wallTexDimensY[wall.picnum];
    //                z / (art.MAP_IMPORT_SCALE * 1024.0) + sector.floorypanning / 256.0 * art.wallTexDimensY[picnum]
   // return y * 16 / (art.wallTexDimensY[wall.picnum] * 2048.0);
    //return (yref + (y/art.MAP_Z_IMPORT_SCALE) * 16) / (art.wallTexDimensY[wall.picnum] * 2048.0) / wall.yrepeat;
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
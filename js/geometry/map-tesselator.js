import * as libtess from 'libtess'
import * as ArrayUtils from '../utils/array.utils'

const SIZEOF_SHORT = 2;

export class MapTesselator{
    static tesselateMap(gl, map, buffers){
        const indices = [],
            vertices = [],
            texCoords = [],
            shade = [],
            normals= [];

        map.sectors.forEach(sector => {
            sector.indices = new Int32Array(4);
            sector.indices[1] = indices.length;
            MapTesselator.buildHorizontalGeometry(gl, map.walls, sector, true, vertices, texCoords, normals, shade, indices);
            sector.indices[0] = indices.length - sector.indices[1];
            sector.indices[1] *= SIZEOF_SHORT;

            sector.indices[3] = indices.length;
            MapTesselator.buildHorizontalGeometry(gl, map.walls, sector, false, vertices, texCoords, normals, shade, indices);
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
                        MapTesselator.buildOuterWall(wall, sector, nextWall, vertices, texCoords, normals, shade, indices);
                    }else{
                        MapTesselator.buildInnerSectorWall(wall, sector, map.sectors[wall.nextsector], nextWall, vertices, texCoords, normals, shade, indices);
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
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[2]);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(shade), gl.STATIC_DRAW);

        buffers[3] = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers[3]);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        return indices.length;
    }

    static buildHorizontalGeometry(gl, walls, sector, isFloor, vertices, texCoords, normals, shade, indices) {
        //Needed to correct winding later on
        const indexStart = indices.length;
        let vertexPtr = vertices.length / 3;

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

        for(let i = 0; i < points.length; i += 2){
            let x = points[i],
                z = points[i+1],
                y = isFloor ? sector.getFloorHeight(x, z) : sector.getCeilingHeight(x, z);

            vertices.push(x, y, z);
            // normals.push(0, 1.0, 0);
            let xOffset = (isFloor ? sector.floorxpanning : sector.ceilingxpanning) * pixelOffset,
                yOffset = (isFloor ? sector.floorypanning : sector.ceilingypanning) * pixelOffset;

            texCoords.push(x / 0.75 + xOffset, z / 0.75 + yOffset);

            let shadeValue = MapTesselator.transformShadeValue(isFloor ? sector.floorshade : sector.ceilingshade);
            shade.push(shadeValue);
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

    static buildOuterWall(wall, sector, nextWall, vertices, texCoords, normals, shade, indices){
        let ceilLeft = sector.getCeilingHeight(wall.x, wall.y),
            ceilRight = sector.getCeilingHeight(nextWall.x, nextWall.y),
            floorLeft = sector.getFloorHeight(wall.x, wall.y),
            floorRight = sector.getFloorHeight(nextWall.x, nextWall.y);
            
        MapTesselator.buildWallSection(wall, nextWall, ceilLeft, floorLeft, ceilRight, floorRight, vertices, normals, texCoords, shade, indices);
    }

    static buildInnerSectorWall(wall, sector, nextSector, nextWall, vertices, texCoords, normals, shade, indices){
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

            this.buildWallSection(wall, nextWall, ceilLeft, floorLeft, ceilRight, floorRight, vertices, normals, texCoords, shade, indices);          
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

            this.buildWallSection(wall, nextWall, ceilLeft, floorLeft, ceilRight, floorRight, vertices, normals, texCoords, shade, indices);             
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

            this.buildWallSection(wall, nextWall, ceilLeft, floorLeft, ceilRight, floorRight, vertices, normals, texCoords, shade, indices);          
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

    static buildWallSection(wall, nextWall, ceilLeft, floorLeft, ceilRight, floorRight, vertices, normals, texCoords, shade, indices){
        const i = vertices.length / 3;
        indices.push(i,i+1,i+2,i+2,i+1,i+3);
        MapTesselator.applyWallVertices(vertices, wall, nextWall, ceilLeft, floorLeft, ceilRight, floorRight);
        MapTesselator.applyWallTexCoords(wall, nextWall, ceilLeft, floorLeft, ceilRight, floorRight, texCoords);

        const shadeValue = MapTesselator.transformShadeValue(wall.shade);
        shade.push(shadeValue, shadeValue, shadeValue, shadeValue);

        // let norm = wall.getNormal(nextWall);
        // normals.push(norm.x, 0, norm.z, norm.x, 0, norm.z, norm.x, 0, norm.z, norm.x, 0, norm.z);

        //0,1,2  2,3,0
        //4,5,6  6,7,4
    }


    static applyWallVertices(vertices, wall, nextWall, ceilLeft, floorLeft, ceilRight, floorRight){
        vertices.push(
            nextWall.x, ceilRight, nextWall.y,
            wall.x, ceilLeft, wall.y,
            nextWall.x, floorRight, nextWall.y,
            wall.x, floorLeft, wall.y
        );
    }

    static applyWallTexCoords(wall, nextWall, ceilLeft, floorLeft, ceilRight, floorRight, texCoords){
        //*panning = offset in texels
        //*repeat = texels per world unit
        const texPixelWidth = 64,
            pixelOffset = 0.015625,
            xOffset = -wall.xpanning * pixelOffset,
            yOffset = -wall.ypanning * pixelOffset,
            wallWidth = Math.sqrt(Math.pow(wall.x - nextWall.x, 2) + Math.pow(wall.y - nextWall.y, 2));
        
        let texRight = xOffset - wall.xrepeat / (texPixelWidth / 8),// (wall.xrepeat / 255),
            texLeft = xOffset,
            texTop = yOffset,
            texBottom = yOffset - wall.yrepeat / (texPixelWidth / 16);//(Math.abs(ceilLeft - floorLeft) * 0.1) / (wall.yrepeat * pixelOffset);

        texCoords.push(
            texRight, texTop,   //Top Right
            texLeft, texTop,  //Top left
            texRight, texBottom,  // Bottom right
            texLeft, texBottom  //bottom left
        )
    }

    static transformShadeValue(shadeValue){
        return 1.0 - shadeValue / 20.0;
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
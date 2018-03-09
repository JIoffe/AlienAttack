//
// MapReader - 
// Reads BUILD engine .map format, eg. Duke Nukem 3D

import {BinaryStream} from './fileio';
const MAP_IMPORT_SCALE = 0.0015;
const MAP_Z_IMPORT_SCALE = MAP_IMPORT_SCALE * 0.0625;
const MAP_HEI_SCALE = 0.0002576;

export class MapReader{
    readUrl(url){
        return new Promise(function(resolve, reject){
            const xhr = new XMLHttpRequest();
            xhr.responseType = "arraybuffer";
    
            xhr.onload = e => {
                try{
                    if(xhr.status != 200){
                        let msg = 'Could not load resource: ' + url;
                        console.error(msg);
                        reject(new Error(msg));
                        return;
                    }
        
                    const arrayBuffer = xhr.response;
                    if(!arrayBuffer){
                        let msg = url + ' : server responded with null response';
                        console.error(msg);
                        reject(new Error(msg));
                        return;
                    }
        
                    console.log('Parsing BUILD map at ' + url + '. Map Size: ' + arrayBuffer.byteLength + ' bytes');
                    const stream = new BinaryStream(arrayBuffer, true);
        
                    const header = stream.nextInt32;
                    console.log('BUILD map version: ' + header);
        
                    let playerX = stream.nextInt32 * MAP_IMPORT_SCALE;
                    let playerZ = stream.nextInt32 * MAP_IMPORT_SCALE;
                    let playerY = stream.nextInt32 * MAP_Z_IMPORT_SCALE;
                    const playerPos = [
                        playerX, playerY, playerZ
                    ];
                    console.log('Player Start: ' + playerPos);
        
                    const playerRotation = stream.nextInt16;
                    const playerSectorIndex = stream.nextInt16;
        
                    ///
                    // SECTORS - analogous to rooms, used for PVS
                    ///
                    const nSectors = stream.nextInt16;
                    const sectors = new Array(nSectors);
                    console.log('Reading ' + nSectors + ' sector(s)...');
                    for(let i = 0; i < nSectors; ++i){
                        sectors[i] = {
                            wallptr: stream.nextInt16, wallnum: stream.nextInt16,
                            //Z (height) values are negated to better fit OGL
                            ceilingz: -stream.nextInt32 * MAP_Z_IMPORT_SCALE, floorz: -stream.nextInt32 * MAP_Z_IMPORT_SCALE,
                            ceilingstat: stream.nextInt16, floorstat: stream.nextInt16,
                            ceilingpicnum: stream.nextInt16, 
                            ceilingheinum: stream.nextInt16 * MAP_HEI_SCALE,
                            ceilingshade: stream.nextInt8,
                            ceilingpal: stream.nextUInt8,
                            ceilingxpanning: stream.nextUInt8, ceilingypanning: stream.nextUInt8,
                            floorpicnum: stream.nextInt16, 
                            floorheinum: stream.nextInt16 * MAP_HEI_SCALE,
                            floorshade: stream.nextInt8,
                            floorpal: stream.nextUInt8,
                            floorxpanning: stream.nextUInt8, floorypanning: stream.nextUInt8,
                            visibility: stream.nextUInt8, filler: stream.nextUInt8,
                            lotag: stream.nextInt16, hitag: stream.nextInt16,
                            extra: stream.nextInt16
                        };
                    }
        
                    ///
                    // WALLS - Line definitions for all the walls
                    ///
        
                    const nWalls = stream.nextInt16;
                    const walls = new Array(nWalls);
                    console.log('Reading ' + nWalls + ' wall(s)...');
                    for(let i = 0; i < nWalls; ++i){
                        walls[i] = {
                            x: stream.nextInt32 * MAP_IMPORT_SCALE, y: stream.nextInt32 * MAP_IMPORT_SCALE,
                            point2: stream.nextInt16,
                            nextwall: stream.nextInt16, nextsector: stream.nextInt16,
                            cstat: stream.nextInt16,
                            picnum: stream.nextInt16, overpicnum: stream.nextInt16,
                            shade: stream.nextInt8,
                            pal: stream.nextUInt8,
                            xrepeat: stream.nextUInt8, yrepeat: stream.nextUInt8,
                            xpanning: stream.nextUInt8, ypanning: stream.nextUInt8,
                            lotag: stream.nextInt16, hitag: stream.nextInt16,
                            extra: stream.nextInt16
                        };
                    }
        
                    ///
                    // SPRITES - Everything else in the world besides map geometry
                    ///
        
                    var mapData = {
                        src: url,
                        sectors: sectors,
                        walls: walls,

                        playerPos: playerPos,
                        playerRotation: playerRotation,
                        playerSectorIndex: playerSectorIndex
                    };

                    console.log('Parsed map', mapData);
                    resolve(mapData);
                }catch(ex){
                    console.error(ex);
                    reject(ex);
                }
              };
            
            xhr.open("GET",url,true);
            xhr.send(); 
        });   
    }
}
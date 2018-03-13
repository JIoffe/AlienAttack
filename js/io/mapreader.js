//
// MapReader - 
// Reads BUILD engine .map format, eg. Duke Nukem 3D

import {BinaryStream} from './fileio';
import { Sector } from './sector.struct';
import { Wall } from './wall.struct';
import { MapData } from './map.struct';

const MAP_IMPORT_SCALE = 0.0015;
const MAP_Z_IMPORT_SCALE = MAP_IMPORT_SCALE * 0.0625;
const MAP_HEI_SCALE = 0.010986;

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
                    let playerY = -stream.nextInt32 * MAP_Z_IMPORT_SCALE;
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
                        sectors[i] = new Sector(stream, MAP_Z_IMPORT_SCALE, MAP_HEI_SCALE);
                    }
        
                    ///
                    // WALLS - Line definitions for all the walls
                    ///
        
                    const nWalls = stream.nextInt16;
                    const walls = new Array(nWalls);
                    console.log('Reading ' + nWalls + ' wall(s)...');
                    
                    for(let i = 0; i < nWalls; ++i){
                        walls[i] = new Wall(stream, MAP_IMPORT_SCALE);
                    }
        
                    ///
                    // SPRITES - Everything else in the world besides map geometry
                    ///
    
                    const mapData = new MapData(url, sectors, walls, playerPos, playerRotation, playerSectorIndex);

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
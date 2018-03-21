import * as aa_math from '../math';

/**
 * Encapsulates collision against map geometry - walls and floors
 */
export class MapCollisionSolver{
    static collidesWithMap(mapData, x, y, currentSector){
        if(currentSector === -1){
            //Out of bounds.... may as well say we've collided.
            return true;
        }

        const sector = mapData.sectors[currentSector],
            wallptr = sector.wallptr;

        for(let i = wallptr + sector.wallnum - 1; i >= wallptr; --i){
            const wall = mapData.walls[i];
            if(wall.nextsector !== -1)
                continue;

            const nextWall = mapData.walls[wall.point2];

            const p0 = {x: x, y: y};

            if(Math.abs(aa_math.cross2d(p0, wall, nextWall)) < 0.2)
                return true;
        }

        return false;
    }
}
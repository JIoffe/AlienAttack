export class Wall{
    constructor(stream, MAP_IMPORT_SCALE){
        let w = this;
            w.x = stream.nextInt32 * MAP_IMPORT_SCALE; w.y = stream.nextInt32 * MAP_IMPORT_SCALE;
            w.point2 = stream.nextInt16;
            w.nextwall = stream.nextInt16; w.nextsector = stream.nextInt16;
            w.cstat = stream.nextInt16;
            w.picnum = stream.nextInt16; w.overpicnum = stream.nextInt16;
            w.shade = stream.nextInt8;
            w.pal = stream.nextUInt8;
            w.xrepeat = stream.nextUInt8; w.yrepeat = stream.nextUInt8;
            w.xpanning = stream.nextUInt8; w.ypanning = stream.nextUInt8;
            w.lotag = stream.nextInt16; w.hitag = stream.nextInt16;
            w.extra = stream.nextInt16;
    }

    getNormal(nextWall){
        let normX = nextWall.x - this.x,
            normZ = nextWall.y - this.y,
            w = Math.sqrt(normX * normX + normZ * normZ);
    
        normX /= w; normZ /= w;

        return {
            x: normX,
            z: normZ
        }
    }
}

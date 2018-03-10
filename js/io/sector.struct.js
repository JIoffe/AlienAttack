import * as aa_math from '../math'

export class Sector{
    constructor(stream, MAP_Z_IMPORT_SCALE, MAP_HEI_SCALE){
        let s = this;
        s.wallptr = stream.nextInt16;s.wallnum = stream.nextInt16;
        //Z (height) values are negated to better fit OGL
        s.ceilingz = -stream.nextInt32 * MAP_Z_IMPORT_SCALE; s.floorz = -stream.nextInt32 * MAP_Z_IMPORT_SCALE;
        s.ceilingstat = stream.nextInt16; s.floorstat = stream.nextInt16;
        s.ceilingpicnum = stream.nextInt16; 
        s.ceilingheinum = Math.tan(aa_math.Constants.DegToRad * stream.nextInt16 * MAP_HEI_SCALE);
        s.ceilingshade = stream.nextInt8;
        s.ceilingpal = stream.nextUInt8;
        s.ceilingxpanning = stream.nextUInt8; s.ceilingypanning = stream.nextUInt8;
        s.floorpicnum = stream.nextInt16; 
        s.floorheinum = Math.tan(aa_math.Constants.DegToRad * stream.nextInt16 * MAP_HEI_SCALE);
        s.floorshade = stream.nextInt8;
        s.floorpal = stream.nextUInt8;
        s.floorxpanning = stream.nextUInt8; s.floorypanning = stream.nextUInt8;
        s.visibility = stream.nextUInt8; s.filler = stream.nextUInt8;
        s.lotag = stream.nextInt16; s.hitag = stream.nextInt16;
        s.extra = stream.nextInt16
    }

    getFloorHeight(x, z){
        return this.floorz + this.getSlopeOffset(x, z, this.floorheinum);
    }

    getCeilingHeight(x, z){
        return this.ceilingz + this.getSlopeOffset(x, z, this.ceilingheinum);
    }

    getSlopeOffset(x, z, heinum){
        let dZ = this.refNormX * heinum,
            dX = this.refNormZ * heinum;  

        return (x - this.refX) * dX + (this.refZ - z) * dZ;
    }

    setSlopeReference(ref0, ref1){
        this.refX = (ref0.x + ref1.x) / 2;
        this.refZ = (ref0.y + ref1.y) / 2;

        let normX = ref1.x - ref0.x;
        let normZ = ref1.y - ref0.y;
        let w = Math.sqrt(normX * normX + normZ * normZ);

        normX /= w; normZ /= w;

        this.refNormX = normX;
        this.refNormZ = normZ;     
    }
}
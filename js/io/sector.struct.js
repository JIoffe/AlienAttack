import * as aa_math from '../math'
import { Bounds } from '../collision/bounds.struct';
import { vec3 } from 'gl-matrix';

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

    /**
     * Returns the Axis-Aligned Boudning Box of this sector
     * @param {Array} walls 
     */
    getBounds(walls){
        return this.bounds || (this.bounds = (() => {
            let allwalls = walls.slice(this.wallptr, this.wallptr + this.wallnum);
            return new Bounds(allwalls);
        })());
    }

    /**
     * Returns the y-coordinate of the floor at (x, z)
     * @param {number} x 
     * @param {number} z 
     */
    getFloorHeight(x, z){
        return this.floorz + this.getSlopeOffset(x, z, this.floorheinum);
    }

    computeFloorNormal(){
        const center = this.getFloorHeight(0, 0);
        const right = this.getFloorHeight(1, 0);
        const forward = this.getFloorHeight(0, 1);

        //determine a coordinate system
        const x = vec3.create(); x[0] = 1;
        x[1] = right - center; x[2] = 0;
        vec3.normalize(x, x);

        const z = vec3.create();
        z[0] = 0; z[1] = forward - center; z[2] = 1;
        vec3.normalize(z, z);

        const y = vec3.create();
        vec3.cross(y, z, x);
        vec3.normalize(y, y);

        return y;
    }

    computeCeilingNormal(){
        const center = this.getCeilingHeight(0, 0);
        const right = this.getCeilingHeight(1, 0);
        const forward = this.getCeilingHeight(0, 1);

        //determine a coordinate system
        const x = vec3.create();
        x[0] = 1; x[1] = right - center; x[2] = 0;
        vec3.normalize(x, x);

        const z = vec3.create();
        z[0] = 0; z[1] = forward - center; z[2] = 1;
        vec3.normalize(z, z);

        const y = vec3.create();
        vec3.cross(y, x, z);
        vec3.normalize(y, y);

        return y;
    }

    /**
     * Returns this y-coordinate of the ceiling at (x, z)
     * @param {number} x 
     * @param {number} z 
     */
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

        this.floorNormal = this.computeFloorNormal();
        this.ceilingNormal = this.computeCeilingNormal();

        this.floord = this.getFloorHeight(0,0);
        this.ceilingd = this.getCeilingHeight(0,0);
    }

    getNeighboringSectors(walls){
        return this.neighboringSectors || (this.neighboringSectors = (() => {
            let pvsNeighbors = new Set(
                walls
                    .slice(this.wallptr, this.wallptr + this.wallnum)
                    .map(w => w.nextsector)
            );
            pvsNeighbors.delete(-1);
    
            return Array.from(pvsNeighbors);
        })());
    }

    ///
    // A single sector can have multiple walls - if it has inner sectors!
    ///
    getWallLoops(walls){
        return this.wallloops || (this.wallloops = (() => {
            let loops = [],
            wallCount = 0;

            while (wallCount < this.wallnum) {
                let loop = [];
                for (let first = wallCount + this.wallptr, i = first; ;) {
                    let wall = walls[i++];
                    wallCount++;
                    loop.push(wall);

                    if (wall.point2 === first)
                        break;
                }
                loops.push(loop);
            }

            return loops;
        })());
    }
}
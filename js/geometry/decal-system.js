import { SpriteBatch } from "./sprite-batch";
import * as aa_math from '../math';

/**
 * Renders a static set of decals
 */
export class DecalSystem extends SpriteBatch{
    constructor(size){
        super(size);
        this.overflow = 0; //For a circular queue
    }

    /**
     * Adds a new decal at the specified position and orientation
     * @param {*} pos 
     */
    add(decal, pos, normal, size){
        if(this.nSprites >= this.size){
            ++this.overflow;
        }

        pos[0] += normal[0] * 0.005;
        pos[1] += normal[1] * 0.005;
        pos[2] += normal[2] * 0.005;

        const offset = size * 0.5,
            imageDef = this.def[decal];

        let i = (this.nSprites + this.overflow) % this.size * 4;

        this._addPositionData(i, -offset, offset, pos, normal);
        this.setVertexUV(i++, imageDef.xStart, imageDef.yStart);

        this._addPositionData(i, offset, offset, pos, normal);
        this.setVertexUV(i++, imageDef.xEnd, imageDef.yStart);

        this._addPositionData(i, offset, -offset, pos, normal);
        this.setVertexUV(i++, imageDef.xEnd, imageDef.yEnd);

        this._addPositionData(i, -offset, -offset, pos, normal);
        this.setVertexUV(i, imageDef.xStart, imageDef.yEnd);

        if(this.nSprites < this.size)
            ++this.nSprites;
    }

    _addPositionData(i, x, y, translation, normal){
        const v3t = aa_math.VEC3_TEMP;
        v3t[0] = x;
        v3t[1] = y;
        v3t[2] = 0.0;

        aa_math.orientToNormal(v3t, v3t, normal);

        this.setVertexPos(i, v3t[0] + translation[0], v3t[1] + translation[1], v3t[2] + translation[2]);
    }
}
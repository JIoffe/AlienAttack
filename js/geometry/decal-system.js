import { SpriteBatch } from "./sprite-batch";
import * as aa_math from '../math';

/**
 * Renders a static set of decals
 */
export class DecalSystem extends SpriteBatch{
    constructor(size){
        super(size, 3);
        this.overflow = 0; //For a circular-ish buffer
    }

    /**
     * Adds a new decal at the specified position and orientation
     * @param {*} pos 
     */
    add(pos, normal, size){
        if(this.nSprites >= this.size){
            ++this.overflow;
        }

        pos[0] += normal[0] * 0.005;
        pos[1] += normal[1] * 0.005;
        pos[2] += normal[2] * 0.005;

        const offset = size * 0.5;

        const i = (this.nSprites + this.overflow) % this.size * 12;
        this._addPositionData(i, -offset, offset, pos, normal);
        this._addPositionData(i + 3, offset, offset, pos, normal);
        this._addPositionData(i + 6, offset, -offset, pos, normal);
        this._addPositionData(i + 9, -offset, -offset, pos, normal);

        const j = this.nSprites * 8;
        this.texCoordData[j] = 0.0;
        this.texCoordData[j + 1] = 0.0;

        this.texCoordData[j + 2] = 1.0;
        this.texCoordData[j + 3] = 0.0;

        this.texCoordData[j + 4] = 1.0;
        this.texCoordData[j + 5] = 1.0;

        this.texCoordData[j + 6] = 0.0;
        this.texCoordData[j + 7] = 1.0;

        if(this.nSprites < this.size)
            ++this.nSprites;
    }

    _addPositionData(i, x, y, translation, normal){
        aa_math.VEC3_TEMP[0] = x;
        aa_math.VEC3_TEMP[1] = y;
        aa_math.VEC3_TEMP[2] = 0.0;

        aa_math.orientToNormal(aa_math.VEC3_TEMP, aa_math.VEC3_TEMP, normal);

        this.positionData[i] = aa_math.VEC3_TEMP[0] + translation[0];
        this.positionData[i + 1] = aa_math.VEC3_TEMP[1] + translation[1];
        this.positionData[i + 2] = aa_math.VEC3_TEMP[2] + translation[2];
    }
}
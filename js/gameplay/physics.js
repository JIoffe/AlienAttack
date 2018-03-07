import * as aa_math from '../math';

export function apply2DThrust(pos, rot, d){
    pos[0] -= Math.sin(rot) * d;
    pos[2] -= Math.cos(rot) * d;
}

export function apply2DHorizontalThrust(pos, rot, d){   
    pos[0] -= Math.sin(rot + aa_math.Constants.HalfPi) * d;
    pos[2] -= Math.sin(rot + aa_math.Constants.HalfPi) * d;
}
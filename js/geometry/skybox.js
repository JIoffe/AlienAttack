import { Buffers } from "./buffers";
import { Renderable } from "./renderable";
import { TextureUtils } from "../utils/texture.utils";

export class Skybox{
    constructor(gl, texpathRoot){        
        let vertices = [-1.0, 1.0, -1.0,
                        1.0, 1.0, -1.0,
                        1.0, -1.0, -1.0,
                        -1.0, -1.0, -1.0];
        
        let normals = [-1.0, 1.0, 1.0,
            1.0, 1.0, 1.0,
            1.0, -1.0, 1.0,
            -1.0, -1.0, 1.0];


        let indices = [2,1,0,0,3,2];

        let texPaths = [
            texpathRoot + '_right.png',
            texpathRoot + '_left.png',
            texpathRoot + '_up.png',
            texpathRoot + '_down.png',
            texpathRoot + '_back.png',
            texpathRoot + '_front.png',
        ];

        this.renderable = new Renderable(gl, vertices, indices, null, normals);
        this.renderable.shader = 0;
        
        TextureUtils.initCubemap(gl, texPaths).then(cubemap => this.renderable.texture = cubemap);
    }
}
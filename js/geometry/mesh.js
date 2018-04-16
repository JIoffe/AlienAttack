import { Renderable } from "./renderable";

export class Mesh extends Renderable{
    constructor(gl, vertices, indices, texCoords, normals, mounts){
        super(gl, vertices, indices, texCoords, normals);
    }
}
import { Mesh } from "../geometry/mesh";

export class MeshObject{
    constructor(name){
        this.name = name;
        this.vertices = [];
        this.texCoords = [];
        this.faceGroups = [];
        this.normals = [];
    }

    addVertices(data){
        this.vertices.push(data[0] * 0.25, data[1] * 0.25, data[2] * 0.25);
    }

    addTexCoords(data){
        this.texCoords.push(data[0], 1.0 - data[1]);
    }

    addNormals(data){
        this.normals.push(data[0], data[1], data[2]);
    }

    addFaceGroups(data){
        data.forEach(v => {
            this.faceGroups.push(v);
        });
    }

    compileMesh(gl){
        //We need to reassemble everything because the indices in obj are built for reuse...
        const indices = [],
            vertices = [],
            texCoords = [],
            normals = [];

        this.faceGroups.forEach(group => {
            let i;
            //V, VT, VN
            i = (group.indices[0] - 1) * 3;
            vertices.push(this.vertices[i], this.vertices[i+1], this.vertices[i+2]);

            i = (group.indices[1] - 1) * 2;
            texCoords.push(this.texCoords[i], this.texCoords[i+1]);

            i = (group.indices[2] - 1) * 3;
            normals.push(this.normals[i], this.normals[i+1], this.normals[i+2]);

            indices.push(indices.length);
        });

        //Reverse face order
        // for(let i = 0; i < indices.length; i += 3){
        //     let temp = indices[i];
        //     indices[i] = indices[i + 2];
        //     indices[i + 2] = temp;
        // }

        return new Mesh(gl, vertices, indices, texCoords, normals, []);
    }
}
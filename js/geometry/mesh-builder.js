export class MeshBuilder{
    constructor(){
        this.vertices = [];
        this.indices = [];
        this.texCoords = [];
        this.normals = [];
        this.animations = [];
    }

    static buildFramesFromMeshes(meshes){
        const nFrames = meshes.length;
        let frames = [];
        meshes.forEach(mesh => frames = frames.concat(mesh.vertices));

        return frames;
    }

    setVertices(vertices){
        this.vertices = vertices;
        return this;
    }

    setTexCoords(texCoords){
        this.texCoords = texCoords;
        return this;
    }

    setNormals(normals){
        this.normals = normals;
        return this;
    }

    setIndices(indices){
        this.indices = indices;
        return this;
    }

    setAnimated(isAnimated){
        this.isAnimated = isAnimated;
        return this;
    }

    addAnimation(label){
        this.animations.push({label: label});
        return this;
    }

    addFrame(frameData){
        if(this.animations.length === 0){
            console.error('Cannot add frames without adding an animation first');
            return this;
        }

        const animation = this.animations[this.animations.length - 1];
        animation.nFrames = (animation.nFrames || 0) + 1;
        animation.frames = (animation.frames || []).concat(frameData);

        return this;
    }

    build(){
        return {
            vcount: (this.vertices || []).length / 3,
            icount: (this.indices || []).length,
            isAnimated: !!this.isAnimated,
            vertices: this.vertices,
            texCoords: this.texCoords,
            normals: this.normals,
            indices: this.indices,
            animations: this.animations
        }
    }
}
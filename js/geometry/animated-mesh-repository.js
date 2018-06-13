import { Buffers } from "./buffers";

const animatedGeometryRepository = [];

export function addAnimatedGeometry(gl, meshData){
    const animatedMesh = {
        primaryBuffers: [
            Buffers.buildDataBuffer(gl, meshData.texCoords),
            Buffers.buildIndexBuffer(gl, meshData.indices)
        ],
        nIndices: meshData.indices.length,
        animations: meshData.animations
            .map(animation => {
                return {
                    label: animation.label,
                    loop: !!animation.loop,
                    nFrames: animation.nFrames,
                    frames: Buffers.buildDataBuffer(gl, animation.frames),
                    speed: animation.speed
                }
            }),
        stride: meshData.vcount * 12
    };

    console.log(animatedMesh);
    animatedGeometryRepository.push(animatedMesh);
}

export function getAnimatedGeometry(i){
    return animatedGeometryRepository[i];
}
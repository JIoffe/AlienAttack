import { ObjReader } from "./obj-reader";
import { getFileExtension } from "../utils/path.utils";
import { FbxReader } from "./fbx-reader";

/**
 * Reads a mesh from an ASCII stream to a format renderable by the game engine
 */
export class MeshReader{
    constructor(){
        this.supportedReaders = new Map();
        this.supportedReaders.set('obj', new ObjReader());
        //this.supportedReaders.set('fbx', new FbxReader());
    }

    parse(type, content, scale){
        if(!this.supportedReaders.has(type)){
            reject(`Unsupported File Format: ${type}`);
            return null;
        }

        
        return this.supportedReaders.get(type)
            .parse(content, scale);
    }
    /**
     * Attempt to parse a mesh into a renderable format
     */
    read(gl, meshDef){
        return new Promise((resolve, reject) => {
            const path = meshDef.path;
            const ext = getFileExtension(path);

            if(!this.supportedReaders.has(ext)){
                reject(`Unsupported File Format: ${ext}`);
                return;
            }

            this.supportedReaders.get(ext)
                .read(gl, meshDef)
                .then(meshData => resolve(meshData));
        });
    }
}
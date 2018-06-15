import { ObjReader } from "./obj-reader";
import { getFileExtension } from "../utils/path.utils";
import { JsonMeshReader } from "./json-mesh-reader";

/**
 * Reads a mesh from an ASCII stream to a format renderable by the game engine
 */
export class MeshReader{
    constructor(){
        this.supportedReaders = new Map();
        this.supportedReaders.set('obj', new ObjReader());
        this.supportedReaders.set('json', new JsonMeshReader());
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

    download(meshDef){
        return new Promise((resolve, reject) => {
            const path = meshDef.path;
            const ext = getFileExtension(path);

            if(!this.supportedReaders.has(ext)){
                reject(`Unsupported File Format: ${ext}`);
                return;
            }

            console.log(`Downloading ${path}`);

            const xhr = new XMLHttpRequest();

            xhr.onload = e => {
                if(xhr.status != 200){
                    let msg = 'Could not load resource: ' + path;
                    console.error(msg);
                    reject(new Error(msg));
                    return;
                }

                const fileContents = xhr.response;
                const meshData = this.supportedReaders.get(ext).parse(fileContents);
                if(!!meshDef.importScale && meshDef.importScale !== 1){
                    for(let i = 0; i < meshData.vertices.length; ++i){
                        meshData.vertices[i] *= meshDef.importScale;
                    }

                    if(!!meshData.animations){
                        meshData.animations.forEach(a => {
                            for(let i = 0; i < a.frames.length; ++i){
                                a.frames[i] *= meshDef.importScale;
                            }
                        })
                    }
                }
                resolve(meshData);
            };

            xhr.open("GET",path,true);
            xhr.send(); 
        });
    }
}
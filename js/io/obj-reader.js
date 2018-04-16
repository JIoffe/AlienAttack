import { MeshObject } from "./mesh-obj.struct";
import { RegexUtils } from "../utils/regex.utils";

const OBJ_IMPORT_SCALE = 0.5;

export class ObjReader{
    readUrl(gl, url){
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.onload = e => {
                if(xhr.status != 200){
                    let msg = 'Could not load resource: ' + url;
                    console.error(msg);
                    reject(new Error(msg));
                    return;
                }

                //OBJ is a very simple format
                //separated line by line
                const objFile = xhr.response;
                const lines = objFile.split(/\r?\n/);

                const meshObjects = [];

                let activeObject;

                //Note - Normals are not supported, for simplicity
                lines.forEach(line => {
                    const token = line.split(/\s/)[0];
                    switch(token){
                        //OBJECT
                        case 'o':
                            const name = getObjectName(line);
                            activeObject = new MeshObject(name);
                            meshObjects.push(activeObject);
                            break;
                        case 'v':
                            activeObject.addVertices(RegexUtils.getFloats(line));
                            break;
                        case 'vt':
                            activeObject.addTexCoords(RegexUtils.getFloats(line));
                            break;    
                        case 'vn':
                            activeObject.addNormals(RegexUtils.getFloats(line));
                            break;
                        case 'f':
                            const faceGroups = getFaceGroups(line);
                            activeObject.addFaceGroups(faceGroups);
                            break;                      
                        default:
                            break;
                    }
                });

                console.log(meshObjects[0]);
                const mesh = meshObjects[0].compileMesh(gl);
                resolve(mesh);
            };

            xhr.open("GET",url,true);
            xhr.send(); 
        });
    }
}

//Private class
class FaceGroup{
    constructor(faceGroupMatch){
        this.indices = RegexUtils.getInts(faceGroupMatch);
    }
}

//Regex extraction helpers
function getObjectName(line){
    const regex = /\s(.*$)/;
    const matches = regex.exec(line);
    return matches[1];
};

function getFaceGroups(line){
    const regex = /(\d+\/\d+\/\d+)/g;
    const matches = RegexUtils.getAllMatches(regex, line);
    return matches.map(m => new FaceGroup(m));
}
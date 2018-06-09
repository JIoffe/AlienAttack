import { MeshObject } from "./mesh-obj.struct";
import { RegexUtils } from "../utils/regex.utils";
import { MeshBuilder } from "../geometry/mesh-builder";

const OBJ_IMPORT_SCALE = 0.5;

export class ObjReader{
    parse(fileContent, scale){

        if(typeof scale !== 'number'){
            scale = 1;
        }

        const meshObjects = [];
        let activeObject;

        fileContent.split(/\r?\n/)
            .forEach(line => {
                const token = line.split(/\s/)[0];
                switch(token){
                    //OBJECT
                    case 'o':
                        activeObject = {
                            name: getObjectName(line),
                            vertices: [],
                            texCoords: [],
                            normals: [],
                            indices: []
                        };
                        meshObjects.push(activeObject);
                        break;
                    case 'v':
                        RegexUtils.getFloats(line).forEach(v => activeObject.vertices.push(v * scale));              
                        break;
                    case 'vt':{
                        const uv = RegexUtils.getFloats(line);
                        activeObject.texCoords.push(uv[0], 1.0 - uv[1]);
                        break; 
                    }   
                    case 'vn':
                        RegexUtils.getFloats(line).forEach(n => activeObject.normals.push(n));
                        break;
                    case 'f':
                        RegexUtils.getInts(line).forEach(i => activeObject.indices.push(i - 1));
                        break;                      
                    default:
                        break;
                }
            });

        const outputMesh = meshObjects[0];
        if(!outputMesh){
            console.error('No object node(s) found');
            return;
        }

        return compileMeshData(outputMesh);
    }

    read(gl, meshDef){
        const url = meshDef.path;
        const scale = meshDef.importScale;

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

                lines.forEach(line => {
                    const token = line.split(/\s/)[0];
                    switch(token){
                        //OBJECT
                        case 'o':
                            const name = getObjectName(line);
                            activeObject = new MeshObject(name);
                            meshObjects.push(activeObject);
                            break;
                        case 'v':{
                            const verts = RegexUtils.getFloats(line);
                            for(let i = 0; i < verts.length; ++i){
                                verts[i] *= scale;
                            }

                            activeObject.addVertices(verts);
                            break;
                        }
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

function compileMeshData(objData){
    const vertices = objData.vertices.slice(0);
    let vcount = vertices.length / 3;
    const texCoords = new Array(vcount * 2),
        normals = new Array(vcount * 3),
        indices = [];

    const indexMatcher = [];
    
    for(let i = 0; i < objData.indices.length; i += 3){
        const vIndex = objData.indices[i],
            uvIndex = objData.indices[i + 1],
            normIndex = objData.indices[i + 2];

        
        //Determine if this is a UV seam or not. In that 
        //case we need to double up to avoid distortion
        if(!indexMatcher[vIndex]){
            indexMatcher[vIndex] = [
                {uv: uvIndex, n: normIndex, actualIndex: vIndex}
            ];

            texCoords[vIndex * 2] = objData.texCoords[uvIndex * 2];
            texCoords[vIndex * 2 + 1] = objData.texCoords[uvIndex * 2 + 1];
    
            normals[vIndex * 3] = objData.normals[normIndex * 3];
            normals[vIndex * 3 + 1] = objData.normals[normIndex * 3 + 1];
            normals[vIndex * 3 + 2] = objData.normals[normIndex * 3 + 2];
    
            indices.push(vIndex);
        }else{
            const match = indexMatcher[vIndex],
                bestMatch = match.find(m => m.uv === uvIndex && m.n === normIndex);

            if(!!bestMatch){
                indices.push(bestMatch.actualIndex);
            }else{
                //No match exists - need to double up
                vertices.push(vertices[vIndex * 3], vertices[vIndex * 3 + 1], vertices[vIndex * 3 + 2]);
                texCoords.push(objData.texCoords[uvIndex * 2], objData.texCoords[uvIndex * 2 + 1]);
                normals.push(objData.normals[normIndex * 3], objData.normals[normIndex * 3 + 1], objData.normals[normIndex * 3 + 2]);
                const actualIndex = vcount++;

                match.push({uv: uvIndex, n: normIndex, actualIndex: actualIndex});
                indices.push(actualIndex);
            }
        }
    }


    let maxIndex = -1;

    indices.forEach(i => maxIndex = Math.max(maxIndex, i));

    return new MeshBuilder()
        .setVertices(vertices)
        .setTexCoords(texCoords)
        .setNormals(normals)
        .setIndices(indices)
        .build();
}
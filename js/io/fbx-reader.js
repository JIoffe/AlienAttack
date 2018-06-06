/**
 * Parses ASCII FBX Format for geometry and animation properties
 */
export class FbxReader{
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

                //FBX ASCII is a line-by-line parsing ordeal
                resolve(this.parseFBXASCIIStream(xhr.response));
            };

            xhr.open("GET",url,true);
            xhr.send(); 
        });
    }

    parseFBXASCIIStream(fileContent){
        const nodeStack = [new Map()];
        let activeNode = nodeStack[0];

        fileContent.split(/\r?\n/)
            .forEach((line, i) => {
                if(i > 26)
                    return;

                if(line.charAt(0) === ';')
                    return;

                //Tokenize each line
                const tokens = line.split(/:\s+/);

                //Ending an object
                if(tokens[0] === '}'){

                }
                const property = tokens[0];

                //switch()

            });

        console.log(root);
        return '';
    }
}

class FbxNode{
    constructor(){

    }
}
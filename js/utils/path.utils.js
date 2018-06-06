/**
 * Extacts the file extension from a relative or absolute path
 * @param {string} path 
 */
export function getFileExtension(path){
    if(!path)
        return null;

    const i = path.lastIndexOf('.');
    if(i < 1)
        return null;

    return path.substring(i + 1);
 }
/**
 * 
 * @param {Array} a 
 * @param {string[]} keys 
 */
export function groupBy(a, keys){
    var groups = a.reduce((p, c) => {
        let k = ''; 
        keys.forEach(key => k += c[key] + '_');
        (p[k] = p[k] || []).push(c);
        return p;
    }, {});
 
    return Object.entries(groups).map(e => groups[e[0]]);
}

export function swapDeadElements(array, index, count){
    let end = count - 1;
    if(index !== end){
        const temp = array[index];
        array[index] = array[end];
        array[end] = temp;
    }
}
export function groupBy(a, key){
    var groups = a.reduce((p, c) => {
       let k = c[key];
       (p[k] = p[k] || []).push(c);
       return p;
    }, {});
 
    return Object.entries(groups).map(e => groups[e[0]]);
}
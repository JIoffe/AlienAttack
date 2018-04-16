export class RegexUtils{
    /**
     * Extracts all individual int values from a string
     * @param {string} s 
     */
    static getInts(s){
        const regex = /(-?\d+)/g;
        const matches = RegexUtils.getAllMatches(regex, s);
        return matches.map(m => parseInt(m, 10));       
    }

    /**
     * Extracts all individual float values from a string
     * @param {string} s 
     */
    static getFloats(s){
        const regex = /(-?[\d\.]+)/g;
        const matches = RegexUtils.getAllMatches(regex, s);
        return matches.map(m => parseFloat(m));
    }

    /**
     * Returns all regex matching groups against a string
     * @param {RegExp} regex 
     * @param {string} s 
     */
    static getAllMatches(regex, s){
        const matches = [];
        let m;

        while(!!(m = regex.exec(s))){
            matches.push(m[0]);
        };
        
        return matches;
    }
}
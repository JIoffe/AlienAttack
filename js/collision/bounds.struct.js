/**
 * Axis-Aligned Bounding Box
 */
export class Bounds{
    constructor(points){
        this.points = new Array(5);

        let center = points.reduce((p, c) => {
            return {
                x: p.x + c.x,
                y: p.y + c.y
            }
        }, {x: 0, y: 0});

        center.x /= points.length;
        center.y /= points.length;


        let maxX = points.reduce((p, c) => isNaN(p) ? c.x : Math.max(p, c.x), NaN),
            minX = points.reduce((p, c) => isNaN(p) ? c.x : Math.min(p, c.x), NaN),
            maxY = points.reduce((p, c) => isNaN(p) ? c.y : Math.max(p, c.y), NaN),
            minY = points.reduce((p, c) => isNaN(p) ? c.y : Math.min(p, c.y), NaN);


        let upperLeft = {x: minX, y: maxY},
            upperRight = {x: maxX, y: maxY},
            lowerRight = {x: maxX, y: minY},
            lowerLeft = {x: minX, y: minY};

        this.points[0] = center;
        this.points[1] = upperLeft;
        this.points[2] = lowerRight;
        this.points[3] = lowerLeft;
        this.points[4] = upperRight;
    }

    get center(){
        return this.points[0];
    }

    get upperLeft(){
        return this.points[1];
    }

    get upperRight(){
        return this.points[4];
    }

    get lowerRight(){
        return this.points[2];
    }

    get lowerLeft(){
        return this.points[3];
    }
}
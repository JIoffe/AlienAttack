import { Renderable } from "../renderable";

var renderable;

export class Laser{
    static initializeGeometry(gl){
        const laserWidth = 0.03,
            laserLength = 1.2;
    
        let vertices = [-laserWidth, laserWidth, 0.0,
                        laserWidth, laserWidth, 0.0,
                        laserWidth, -laserWidth, 0.0,
                        -laserWidth, -laserWidth, 0.0,
                        0, 0, laserLength];


        let indices = [
            2,1,0,0,3,2,
            0,1,4,
            1,2,4,
            2,3,4,
            3,0,4
        ];

        renderable = new Renderable(gl, vertices, indices, null, null);
        renderable.shader = 4;

        renderable.color = [1.0, 0.8, 0.0, 1.0];
    }

    static get renderable(){
        return renderable;
    }
}
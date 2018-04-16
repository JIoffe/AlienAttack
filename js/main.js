import {Time} from './gameplay/time';
import {Scene} from './gameplay/scene';
import {Renderer} from './rendering';
import {InputListener} from './gameplay/input';
import {MapReader} from './io/mapreader';

//This is not encapsulated as a "class"
//to keep the scope simpler, as its not exported

(function(d){
    var scene, renderer, input, time;

    d.addEventListener('DOMContentLoaded', () => {
        initialize(d)
        .then(success => {
            if(success){
                console.log('Game initialized successfully!');
                mainLoop();
            }else{
                console.error('Could not initialize game - your browser may not be supported.');
            }
        });
    });

    function initialize(){
        return new Promise(function(resolve, reject){
            const canvas = d.getElementById('c');
            time = new Time();
            input = new InputListener(d);
            scene = new Scene();
            renderer = new Renderer(canvas);    

            renderer
                .initialize()
                .then(() => {
                    var mapReader = new MapReader();
                    return mapReader.readUrl('./maps/newboard.map')
                })                        
                .then(map => {
                    scene.setMap(map);
                    map.prepareRenderableGeometry(renderer.gl);
                    resolve(true);
                });      
        });
    }

    function mainLoop(){
        requestAnimationFrame(mainLoop);

        time.advance();
        scene.update(time, input)
        renderer.renderFrame(scene, time);
    }
})(document)
import {Renderer2D} from './2D/rendering';

(function(d){
    var renderer;

    d.addEventListener('DOMContentLoaded', () =>{
        const canvas = d.getElementById('c');
        const rect = canvas.getBoundingClientRect();
        
        canvas.setAttribute('width', Math.abs(rect.right - rect.left));
        canvas.setAttribute('height', Math.abs(rect.top - rect.bottom));

        renderer = new Renderer2D(canvas);
        mainLoop();
    });

    function mainLoop(){
        requestAnimationFrame(mainLoop);

        renderer.renderFrame();
    }
})(document);
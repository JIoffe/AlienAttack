import angular from 'angular';
import { EDITOR_SCENE, MODULE } from '../globals';
import { ImportToolRenderer } from '../import-tool-renderer';
import { Time } from '../../../gameplay/time';

class PreviewWindowController{
    static get $inject(){
        return ['$scope', EDITOR_SCENE]
    }

    constructor($scope, scene){
        this.$scope = $scope;
        this.scene = scene;
    }

    $onInit(){
        this.canvas = document.getElementById('c');
        if(!this.canvas){
            console.error('Cannot find canvas! Unable to initialize renderer');
            return;
        }

        this.setupCanvas(this.canvas);
        this.renderer = new ImportToolRenderer(this.canvas);
        this.time = new Time();

        this.setupEvents();
        this.mainLoop();
    }

    setupEvents(){
        this.canvas.addEventListener('mousedown', ev => {
            this.lastX = ev.pageX;
            this.lastY = ev.pageY;
        });

        this.canvas.addEventListener('mousemove', ev => {

            if(ev.buttons === 1){
                this.scene.yaw += (ev.pageX - this.lastX) * 0.3;
                this.scene.pitch -= (ev.pageY - this.lastY) * 0.3;

                this.lastX = ev.pageX;
                this.lastY = ev.pageY;
            }
        });

        // window.addEventListener('resize', ev => {
        //     this.setupCanvas(this.canvas);
        //     const w = this.canvas.getAttribute('width');
        //     const h = this.canvas.getAttribute('height');

        //     this.renderer.onResize(w, h);
        // })
    }

    setupCanvas(canvas){
        const rect = canvas.getBoundingClientRect();
        const w = Math.abs(rect.right - rect.left),
            h = Math.abs(rect.bottom - rect.top);

        canvas.setAttribute('width', '' + w);
        canvas.setAttribute('height', '' + h);
    }

    zoom(amt){
        this.scene.zoom += amt;
        console.log(this.scene.zoom);
    }

    mainLoop(){
        requestAnimationFrame(() => this.mainLoop());

        this.updateScene();

        this.time.advance();
        this.renderer.renderFrame(this.scene, this.time);
    }

    updateScene(){
        //Check for "dirty" model data
        if(this.scene.timestamp !== this.timestamp){
            if(!!this.scene.mesh){
                this.renderer.setMesh(this.scene.mesh);
            }
            this.timestamp = this.scene.timestamp;
        }

        if(this.scene.imgSrc !== this.imgSrc){
            this.renderer.buildImage(this.scene.imgSrc);
            this.imgSrc = this.scene.imgSrc;
        }
    }
};

angular.module(MODULE).
  component('previewWindow', {
    templateUrl: '/js/tools/mesh-import/templates/preview-window.template.html',
    controller: PreviewWindowController
  });
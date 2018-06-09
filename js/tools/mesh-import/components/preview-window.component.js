import angular from 'angular';
import { EDITOR_SCENE, MODULE } from '../globals';
import { ImportToolRenderer } from '../import-tool-renderer';
import { Time } from '../../../gameplay/time';
import { quat, vec3 } from 'gl-matrix';

const MODE_MOVE = 0;
const MODE_ROTATE = 1;

class PreviewWindowController{
    static get $inject(){
        return ['$scope', EDITOR_SCENE]
    }

    constructor($scope, scene){
        this.$scope = $scope;
        this.scene = scene;

        this.quat = quat.create();
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

        this.mode = MODE_MOVE;
    }

    setupEvents(){
        this.canvas.addEventListener('mousedown', ev => {
            this.lastX = ev.offsetX;
            this.lastY = ev.offsetY;
        });

        this.canvas.addEventListener('mousemove', ev => {
            if(ev.buttons === 1){
                const dx = ev.offsetX - this.lastX,
                    dy = ev.offsetY - this.lastY;

                switch(this.mode){
                    case MODE_ROTATE:{
                        //Determine the bounding rect of the canvas so we can translate
                        //the mouse coordinates for the previous and current frame to [-1,1]
                        const element = ev.target,
                            rect = element.getBoundingClientRect(),
                            w = Math.abs(rect.right - rect.left),
                            h = Math.abs(rect.top - rect.bottom);

                        const prev = this.convertScreenToClipSpace(this.lastX, this.lastY, w, h);
                        const current = this.convertScreenToClipSpace(ev.offsetX, ev.offsetY, w, h);

                        //Otherwise, this would be quat.setAxisAngle(prev X current, acos(prev . current) * speed);
                        quat.rotationTo(this.quat, prev, current);
                        quat.mul(this.scene.rot, this.quat, this.scene.rot);
                        break;
                    }
                    case MODE_MOVE:
                    default:
                        this.scene.translation[0] -= dx * 0.005;
                        this.scene.translation[1] -= dy * 0.005;
                        break;
                }

                this.lastX = ev.offsetX;
                this.lastY = ev.offsetY;
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
        this.scene.translation[2] += amt;
    }

    setMode(m){
        this.mode = m;
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

    convertScreenToClipSpace(x,y,w,h){
        x = -(x / w * 2 - 1.0);
        y = -(y / h * 2 - 1.0);

        const v = vec3.create();
        v[0] = x;
        v[1] = y;
        v[2] = -1;

        vec3.normalize(v,v);
        return v;      
    }
};

angular.module(MODULE).
  component('previewWindow', {
    templateUrl: '/js/tools/mesh-import/templates/preview-window.template.html',
    controller: PreviewWindowController
  });
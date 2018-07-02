import angular from 'angular';
import { MODULE, EDITOR_SCENE, MESH_READER_SERVICE } from "../globals";
import { getFileExtension } from '../../../utils/path.utils';
import { MeshBuilder } from '../../../geometry/mesh-builder';

//require('./keyframe-list.component');

class AnimatedMeshPropertiesController{
  static get $inject(){
    return [
      '$scope', MESH_READER_SERVICE, EDITOR_SCENE
    ]  
  }

  constructor($scope, meshReaderService, scene){
    this.$scope = $scope;
    this.meshReaderService = meshReaderService;
    this.scene = scene;

    this.animations = [];

    this.activeAnimation = null;
  }

  $onInit(){

  }

  setActiveAnimation(animation){
    this.activeAnimation = animation;
  }

  addAnimation(){
    this.animations.push({
      label: '',
      frames: [],
      nFrames: 0,
      speed: 1,
      loop: false
    });
  }

  applyAnimation(){
    this.scene.mesh = this.mesh;
    this.scene.selectedAnimation = this.scene.mesh.animations[0];
    this.scene.timestamp = new Date().getTime();
  }

  onModelSelect(files){
    if(!files || !files.length){
        return;
    }

    const meshes = files.map(file => {
      const type = getFileExtension(file.fileName);
      return this.meshReaderService.parse(type, file.content);
    });

    this.activeAnimation.frames = MeshBuilder.buildFramesFromMeshes(meshes);
    this.activeAnimation.nFrames = meshes.length;

    if(!this.mesh){
      this.mesh = meshes[0];
      this.mesh.vertices = [];
      this.mesh.animations = this.animations;
      this.mesh.isAnimated = true;
    }

    this.$scope.$apply();
  }
};

angular.module(MODULE).
  component('animatedMeshProperties', {
    templateUrl: '/js/tools/mesh-import/templates/animated-mesh-properties.template.html',
    controller: AnimatedMeshPropertiesController
  });
import angular from 'angular';
import { MODULE, EDITOR_SCENE } from "../globals";

//require('./keyframe-list.component');

class AnimatedMeshPropertiesController{
  static get $inject(){
    return [
      '$scope', EDITOR_SCENE
    ]  
  }

  constructor($scope, scene){
    this.$scope = $scope;
    this.scene = scene;
  }

  $onInit(){

  }
};

angular.module(MODULE).
  component('animatedMeshProperties', {
    templateUrl: '/js/tools/mesh-import/templates/animated-mesh-properties.template.html',
    controller: AnimatedMeshPropertiesController
  });
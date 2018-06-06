import angular from 'angular';
import { MODULE } from "../globals";

require('./animated-mesh-properties.component');
require('./static-mesh-properties.component');
require('./image-selector.component');

class MeshPropertiesController{
    $onInit(){
        this.mesh = {};
    }

    setAnimated(isAnimated){
        this.mesh.isAnimated = isAnimated;
    }
}

angular.module(MODULE).
  component('meshProperties', {
    templateUrl: '/js/tools/mesh-import/templates/mesh-properties.template.html',
    controller: MeshPropertiesController
  });
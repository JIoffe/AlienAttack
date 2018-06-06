import angular from 'angular';
import { MODULE } from "../globals";

class KeyframeListController{
    $onInit(){
        console.log('poopopopopopo');
        this.keyframes = [2,5,6,7];
    }
}

angular.module(MODULE).
  component('keyframeList', {
    templateUrl: '/js/tools/mesh-import/templates/keyframe-list.template.html',
    controller: KeyframeListController
  });
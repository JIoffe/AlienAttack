import angular from 'angular';
import { MODULE, EDITOR_SCENE } from "../globals";

class ImageSelectorComponent{
    static get $inject(){
        return ['$scope', EDITOR_SCENE]
    }

    constructor($scope, scene){
        this.$scope = $scope;
        this.scene = scene;
        this.src = '';
    }

    $onInit(){
    }

    onImageSelect(files){
        if(!files || !files.length){
            return;
        }

        this.fileName = files[0].fileName;
        this.scene.imgSrc = this.src = files[0].content;

        this.$scope.$apply();
    }
}

angular.module(MODULE).
  component('imageSelector', {
    templateUrl: '/js/tools/mesh-import/templates/image-selector.template.html',
    controller: ImageSelectorComponent
  });
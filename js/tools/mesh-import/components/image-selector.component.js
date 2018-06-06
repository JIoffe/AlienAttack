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

    onImageSelect(fileContent, fileName){
        this.fileName = fileName;
        this.scene.imgSrc = this.src = fileContent;

        this.$scope.$apply();
    }
}

angular.module(MODULE).
  component('imageSelector', {
    templateUrl: '/js/tools/mesh-import/templates/image-selector.template.html',
    controller: ImageSelectorComponent
  });
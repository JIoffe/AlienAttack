import angular from 'angular';
import { saveAs } from 'file-saver';
import { MODULE, EDITOR_SCENE } from "../globals";

//require('./keyframe-list.component');

class EditorMenuController{
  static get $inject(){
    return [
      '$scope', EDITOR_SCENE
    ]  
  }

  constructor($scope, scene){
    this.$scope = $scope;
    this.scene = scene;

    this.fileName = "untitled";
  }

  $onInit(){

  }

  save(){
    var blob = new Blob([JSON.stringify(this.scene.mesh)], {type: "application/json;charset=utf-8"});
    saveAs(blob, `${this.fileName}.json`);
  }
};

angular.module(MODULE).
  component('editorMenu', {
    templateUrl: '/js/tools/mesh-import/templates/editor-menu.template.html',
    controller: EditorMenuController
  });
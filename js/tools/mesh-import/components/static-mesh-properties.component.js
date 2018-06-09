import angular from 'angular';
import { MODULE, MESH_READER_SERVICE, EDITOR_SCENE } from "../globals";
import { getFileExtension } from '../../../utils/path.utils';

class StaticMeshPropertiesController{
    static get $inject(){
        return ['$scope', MESH_READER_SERVICE, EDITOR_SCENE]
    }

    constructor($scope, meshReaderService, scene){
        this.$scope = $scope;
        this.meshReaderService = meshReaderService;
        this.scene = scene;
    }

    $onInit(){
        this.fileName = '';
    }

    onModelSelect(files){
        if(!files || !files.length){
            return;
        }

        const fileName = files[0].fileName,
            fileContent = files[0].content,
            type = getFileExtension(fileName);
            
        this.fileName = fileName;

        this.scene.mesh = this.meshReaderService.parse(type, fileContent);
        this.scene.timestamp = new Date().getTime();

        this.$scope.$apply();
    }
};

angular.module(MODULE).
  component('staticMeshProperties', {
    templateUrl: '/js/tools/mesh-import/templates/static-mesh-properties.template.html',
    controller: StaticMeshPropertiesController
  });
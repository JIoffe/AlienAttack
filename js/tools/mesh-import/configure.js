import angular from 'angular';
import { MODULE, MESH_READER_SERVICE, EDITOR_SCENE } from './globals';
import { MeshReader } from '../../io/mesh-reader';
import { EditorScene } from './services/editor-scene';

angular.module(MODULE)
    .service(MESH_READER_SERVICE, MeshReader)
    .service(EDITOR_SCENE, EditorScene);
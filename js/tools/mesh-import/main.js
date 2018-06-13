import angular from 'angular';
import { MODULE } from './globals';

"use strict"

angular.module(MODULE, []);

//Configure services
require('./configure');

//Setup directives and primary component
require('./directives/load-file.directive');
require('./components/editor-menu.component');
require('./components/mesh-properties.component');
require('./components/preview-window.component');
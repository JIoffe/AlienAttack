import { MODULE } from "../globals";
import { getFileExtension } from "../../../utils/path.utils";

class LoadFileDirective{
    static get restrict(){
        return 'A';
    };

    link($scope, element, attributes){
        const f = $scope.$eval(attributes.loadFile);

        if(typeof(f) !== 'function'){
            console.error(`${attributes.loadFile} does not match a valid callback function to accept the file.`);
            return;
        }

        const caller = this.getCaller($scope, attributes.loadFile);

        element.bind('change', ev => {
            const reader = new FileReader();
            const file = (ev.srcElement || ev.target).files[0];

            reader.onload = loadEvent => {
                const content = loadEvent.target.result;

                if(!!caller){
                    f.call(caller, content, file.name);
                }else{
                    f(content, file.name);
                }
            }

            var type = getFileExtension(file.name);

            switch(type.toLowerCase()){
                case 'bmp':
                case 'jpg':
                case 'png':
                case 'jpeg':
                    reader.readAsDataURL(file);
                    break;
                default:
                    reader.readAsText(file);
                    break;
            }
        });

        //Cleanup lingering event listeners
        $scope.$on('$destroy', () => element.unbind('change'));
    }

    getCaller($scope, attr){
        const last = attr.lastIndexOf('.');

        if(last === -1)
            return null;

        return $scope.$eval(attr.substr(0, last));
    }
}

angular.module(MODULE)
    .directive('loadFile', LoadFileDirective);
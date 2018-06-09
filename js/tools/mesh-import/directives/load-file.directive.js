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
            const loadFilePromises = Array.from((ev.srcElement || ev.target).files)
                .map(file => {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();

                        reader.onload = loadEvent => {
                            const result = {
                                content: loadEvent.target.result,
                                fileName: file.name
                            };
                            resolve(result);
                        }

                        const type = getFileExtension(file.name);

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
                })

            Promise.all(loadFilePromises)
                .then(loadedFiles => {
                    if(!!caller){
                        f.call(caller, loadedFiles);
                    }else{
                        f(loadedFiles);
                    }
                });
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
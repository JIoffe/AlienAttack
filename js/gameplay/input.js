//Input bitmask constants
const MOVE_FORWARD = 1
const MOVE_BACKWARD = 2
const STRAFE_LEFT = 4
const STRAFE_RIGHT = 8
const TURN_LEFT = 16
const TURN_RIGHT = 32
const JUMP = 64
const CROUCH = 128
const FIRE = 256
const SEMI_AUTO_FIRE_READY = 512
const SEMI_AUTO_FIRE = FIRE | SEMI_AUTO_FIRE_READY;

const ACTION = 1024;

export class InputListener{
    constructor(document){
        this.inputStateFlags = SEMI_AUTO_FIRE_READY;
        this.mouselook = false;

        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseXSensitivity = 0.08;
        this.mouseYSensitivity = 0.08;

        const lockUpdateCallback = this._onLockUpdate.bind(this);

        //Clear input state flags when focus is lost
        window.addEventListener('blur', () => this.inputStateFlags = 0);

        document.addEventListener('pointerlockchange', lockUpdateCallback, false);
        document.addEventListener('mozpointerlockchange', lockUpdateCallback, false);
        document.addEventListener('webkitpointerlockchange', lockUpdateCallback, false);

        document.addEventListener('mousemove', this._onMouseLook.bind(this), false);

        document.addEventListener('mousedown', ev => {
            if(this.mouselook){
                this.inputStateFlags |= FIRE
            }
        });

        document.addEventListener('mouseup', ev => {
            if(this.mouselook){
                this.inputStateFlags &= ~FIRE
                this.inputStateFlags |= SEMI_AUTO_FIRE_READY;
            }
        });

        document.addEventListener("keydown", ev => {
            //console.log('Pushed '  + ev.keyCode);
            switch (ev.keyCode){
                case 40:
                case 83:
                    this.inputStateFlags |= MOVE_BACKWARD
                    break
                case 38:
                case 87:
                    this.inputStateFlags |= MOVE_FORWARD
                    break
                case 37:
                    this.inputStateFlags |= TURN_LEFT
                    break
                case 39:
                    this.inputStateFlags |= TURN_RIGHT
                    break
                case 65:
                    this.inputStateFlags |= STRAFE_LEFT
                    break
                case 68:
                    this.inputStateFlags |= STRAFE_RIGHT
                    break
                case 76:
                    this.inputStateFlags |= ACTION
                    break;
                case 32:
                    this.inputStateFlags |= JUMP
                    break
                case 90:
                    this.inputStateFlags |= CROUCH
                    break    
                case 17:
                    this.inputStateFlags |= FIRE
                    break;
                default:
                    break
            }
        });

        document.addEventListener("keyup", ev => {
            switch (ev.keyCode){
                case 40:
                case 83:
                    this.inputStateFlags &= ~MOVE_BACKWARD
                    break
                case 38:
                case 87:
                    this.inputStateFlags &= ~MOVE_FORWARD
                    break
                case 37:
                    this.inputStateFlags &= ~TURN_LEFT
                    break
                case 39:
                    this.inputStateFlags &= ~TURN_RIGHT
                    break                    
                case 65:
                    this.inputStateFlags &= ~STRAFE_LEFT
                    break
                case 68:
                    this.inputStateFlags &= ~STRAFE_RIGHT
                    break
                case 76:
                    this.inputStateFlags &= ~ACTION
                    break;
                case 32:
                    this.inputStateFlags &= ~JUMP
                    break
                case 90:
                    this.inputStateFlags &= ~CROUCH
                    break                
                case 17:
                    this.inputStateFlags &= ~FIRE
                    this.inputStateFlags |= SEMI_AUTO_FIRE_READY;
                    break;                         
                default:
                    break
            }
        });        
    }

    addPointerLockListener(element){
        this.pointerLockListener = element;

        element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;

        if(!element.requestPointerLock){
            console.error('This browser does not support pointer lock - mouse controls will not be available');
            return;
        }

        element.addEventListener('click', getPointerLock);

        function getPointerLock(ev){
            element.requestPointerLock();
            element.removeEventListener('click', getPointerLock);
        }
    }

    /**
     * True only on the first frame that the fire button is pressed
     */
    get semiAutoFire(){
        if(this.inputStateFlags & SEMI_AUTO_FIRE ^ SEMI_AUTO_FIRE){
            return false;
        }

        this.inputStateFlags &= ~SEMI_AUTO_FIRE_READY;
        return true;
    }

    get moveForward(){
        return !!(this.inputStateFlags & MOVE_FORWARD)
    }

    get moveBackward(){
        return !!(this.inputStateFlags & MOVE_BACKWARD)
    }

    get strafeLeft(){
        return !!(this.inputStateFlags & STRAFE_LEFT)
    }

    get strafeRight(){
        return !!(this.inputStateFlags & STRAFE_RIGHT)
    }

    get turnLeft(){
        return !!(this.inputStateFlags & TURN_LEFT)
    }

    get turnRight(){
        return !!(this.inputStateFlags & TURN_RIGHT)
    }

    get jump(){
        return !!(this.inputStateFlags & JUMP)
    }

    get crouch(){
        return !!(this.inputStateFlags & CROUCH)
    }

    get fire(){
        return !!(this.inputStateFlags & FIRE)
    }

    get action(){
        return !!(this.inputStateFlags & ACTION)
    }

    _onMouseLook(ev){
        if(!this.mouselook)
            return;

        const movementX = ev.movementX ||
            ev.mozMovementX          ||
            ev.webkitMovementX       ||
            0,
        movementY = ev.movementY ||
            ev.mozMovementY      ||
            ev.webkitMovementY   ||
            0;

        this.mouseX -= movementX * this.mouseXSensitivity;
        this.mouseY += movementY * this.mouseYSensitivity;

        if(this.mouseY >= 89.5){
            this.mouseY = 89.5;
        }else if(this.mouseY <= -89.5){
            this.mouseY = -89.5;
        }
    }

    _onLockUpdate(){
        const lockedElement = document.pointerLockElement || document.mozPointerLockElement || document.webkitPointerLockElement;
        this.mouselook = !!this.pointerLockListener && lockedElement === this.pointerLockListener;

        if(!this.mouselook){
            this.mouseY = 0;

            const element = this.pointerLockListener;
            element.addEventListener('click', getPointerLock);

            function getPointerLock(ev){
                element.requestPointerLock();
                element.removeEventListener('click', getPointerLock);
            }
        }
    }
}
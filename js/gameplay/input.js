const MOVE_FORWARD = 1
const MOVE_BACKWARD = 2
const STRAFE_LEFT = 4
const STRAFE_RIGHT = 8
const TURN_LEFT = 16
const TURN_RIGHT = 32
const JUMP = 64
const CROUCH = 128
const FIRE = 256

export class InputListener{
    constructor(document){
        this.inputStateFlags = 0;

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
                case 32:
                    this.inputStateFlags &= ~JUMP
                    break
                case 90:
                    this.inputStateFlags &= ~CROUCH
                    break                
                case 17:
                    this.inputStateFlags &= ~FIRE
                    break;                         
                default:
                    break
            }
        });        
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
}
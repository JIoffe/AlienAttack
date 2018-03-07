export class Time{
    constructor(){
        this.elapsedMS = 0;
        this.elapsedSeconds = 0;
        this.msSinceLastFrame = 0;
        this.secondsSinceLastFrame = 0;

        this.prevTime = Date.now();
    }

    advance(){
        const newTime = Date.now();
        const ms = newTime - this.prevTime;
        const secondDelta = ms / 1000;

        this.elapsedMS += ms;
        this.elapsedSeconds += secondDelta;
        
        this.msSinceLastFrame = ms;
        this.secondsSinceLastFrame = secondDelta;   

        this.prevTime = newTime;
    }
}
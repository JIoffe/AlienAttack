export class Renderer2D{
    constructor(canvas){
        this.w = canvas.getAttribute('width');
        this.h = canvas.getAttribute('height');

        this.ctx = canvas.getContext('2d');

        //this.backbuffer = this.ctx.createImageData(this.w, this.h);
    }

    renderFrame(){
        this.renderBG();
        this.renderGrid();

        //this.ctx.putImageData
    }

    renderBG(){
        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0,0,this.w,this.h);
    }

    renderGrid(){

    }
}
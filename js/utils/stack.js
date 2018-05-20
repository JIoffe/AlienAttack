export class UIntStack{
    constructor(capacity){
        //OK, misleading... 
        //but I'd rather return -1 on failure, even if we give up true UINT range
        this.elements = new Int32Array(capacity);
        this.n = 0;
        this.size = capacity;
    }

    push(value){
        if(this.n < this.size)
            this.elements[this.n++] = value;
    }

    pop(){
        if(this.n === 0)
            return -1;

        return this.elements[this.n-- - 1];
    }

    peek(){
        if(this.n === 0)
            return -1;

        return this.elements[this.n - 1];
    }

    clear(){
        this.n = 0;
    }
}
const SIZE = 24, EMPTY = '.', FULL='O';

class PenTool {
    constructor(symbol){
        this.symbol = symbol;
        this.movable = true;
    }
    click(track, x, y) {
        track[y][x] = this.symbol;
        return true;
    }
};

class CircleTool {
    click(track, x, y) {
        let radius = Math.floor(prompt('Insert circle radius:'));
        if(typeof radius == 'number') {
            for(let i=0;i<1000;i++) {
                let dx = radius * Math.sin(2.0*Math.PI*i/1000), dy = radius * Math.cos(2.0*Math.PI*i/1000);
                let xx = Math.round(x + dx), yy = Math.round(y + dy);
                if(0 <= xx && xx < track[0].length && 0 <= yy && yy < track.length) 
                    track[yy][xx] = FULL;
            }
            return true;
        } else 
            return false;
    }
};

class LineTool {
    reset(){
        this.args = [];
    }

    click(track, x, y) {
        if(this.args.length > 0) {
            // From https://stackoverflow.com/a/4672319/5822988
            let [x0, y0] = this.args[0], x1=x, y1=y; 
            var dx = Math.abs(x1 - x0);
            var dy = Math.abs(y1 - y0);
            var sx = (x0 < x1) ? 1 : -1;
            var sy = (y0 < y1) ? 1 : -1;
            var err = dx - dy;
            
            while(true) {
                track[y0][x0] = FULL;
            
                if ((x0 === x1) && (y0 === y1)) break;
                var e2 = 2*err;
                if (e2 > -dy) { err -= dy; x0  += sx; }
                if (e2 < dx) { err += dx; y0  += sy; }
            }
            this.args = [];
            return true;
        } else {
            this.args.push([x, y]);
            return false;
        }
    }
}

const TOOLS = {
    'track': new PenTool(FULL),
    'eraser': new PenTool(EMPTY),
    'circle': new CircleTool(),
    'line': new LineTool()
};
for(let i=1;i<10;i++)
    TOOLS[`zone${i}`] = new PenTool(''+i);

let TRACK;


class Track {
    constructor(width, height, observer, canvas) {
        this.o = observer;
        this.canvas = canvas;

        this.o.observe('track', (key, value) => this.renderToCanvas());
        this.o.observe('tool', (_, value) => {
            this.tool = TOOLS[value];
            if(this.tool.reset)
                this.tool.reset();
        });
        this.o.observe('track', (_, value) => {
            this.o.notify('track.width', value[0].length);
            this.o.notify('track.height', value.length);
        })

        /* Create empty track */
        this.track = [];
        for(let i=0;i<height;i++)
            this.track.push(new Array(width).fill(EMPTY));
        this.o.notify('track', this.track);

        let handler =  (event) => {
            let ix = Math.floor(event.offsetX / SIZE), iy = Math.floor(event.offsetY / SIZE);
            if(event.type == 'click' || (this.tool.movable && event.type == 'mousemove' && event.which == 1)){
                if(this.tool.click(this.track, ix, iy))
                    this.o.notify('track', this.track);
            }
        };

        this.canvas.addEventListener('click', handler);
        this.canvas.addEventListener('mousemove', handler);
    }

    clear() {
        for(let y=0;y<this.track.length;y++)
            this.track[y].fill(EMPTY);
        this.o.notify('track', this.track);
    }

    setPoint() {
        let coords = prompt('Insert point coordinates:').split(',');
        let x = Math.floor(coords[0]),y = Math.floor(coords[1]);
        if(0 <= x && x < this.track[0].length && 0 <= y && y < this.track.length) {
            this.track[y][x] = FULL;
            this.o.notify('track', this.track);
        }
    }

    expand(dir) {
        if(dir == 'left' || dir == 'right') {
            let fn = (dir == 'left' ? 'unshift' : 'push');
            for(let y=0;y<this.track.length;y++)
                this.track[y][fn](EMPTY);
        }
        if(dir == 'top' || dir == 'bottom') {
            let row = new Array(this.track[0].length).fill(EMPTY);
            if(dir == 'top')
                this.track.unshift(row);
            else this.track.push(row);
        }

        this.o.notify('track', this.track);
    }

    shrink(dir) {
        if(dir == 'left' || dir == 'right') {
            if(this.track[0].length <= 1)
                return;
            let fn = (dir == 'left' ? 'shift' : 'pop');
            for(let y=0;y<this.track.length;y++)
                this.track[y][fn]();
        } else
        if(dir == 'top' || dir == 'bottom') {
            if(this.track.length <= 1)
                return;
            if(dir == 'top')
                this.track.shift();
            else this.track.pop();
        }

        this.o.notify('track', this.track);
    }

    autoShrink() {
        // top
        while(this.track.length > 1) {
            let isEmpty = this.track[0].filter(v => v!='.').length == 0;
            if(!isEmpty)break;
            this.track.shift();
        }
        //bottom
        while(this.track.length > 1) {
            let isEmpty = this.track[this.track.length-1].filter(v => v!='.').length == 0;
            if(!isEmpty)break;
            this.track.pop();
        }
        //left
        while(this.track[0].length > 1) {
            let isEmpty = this.track.filter(v => v[0] !='.').length == 0;
            if(!isEmpty)break;
            for(let row of this.track)
                row.shift();
        }
        //right
        while(this.track[0].length > 1) {
            let isEmpty = this.track.filter(v => v[v.length-1] !='.').length == 0;
            if(!isEmpty)break;
            for(let row of this.track)
                row.pop();
        }

        this.o.notify('track', this.track);
    }

    renderToCanvas() {
        this.canvas.height = SIZE * this.track.length;
        this.canvas.width = SIZE * this.track[0].length;
        let ctx = this.canvas.getContext('2d');

        for(let y=0;y<this.track.length;y++) {
            for(let x=0;x<this.track[y].length;x++) {
                let cell = this.track[y][x];
                if(cell == FULL) {
                    ctx.beginPath();
                    ctx.fillStyle = 'black';
                    ctx.ellipse(SIZE*(x+0.5), SIZE*(y+0.5), SIZE/2 -1, SIZE/2 - 1, 0, 0, 2.0*Math.PI);
                    ctx.fill();
                }else
                if('1' <= cell && cell <= '9') {
                    ctx.fillStyle = 'orange';
                    ctx.fillRect(SIZE*x, SIZE*y, SIZE, SIZE);
                    ctx.font = '24px monospaced';
                    ctx.fillStyle = 'black';
                    ctx.fillText(cell, SIZE*x, SIZE*(y+1), SIZE);
                }
            }
        }
    }

    exportToJSON() {
        let json = JSON.stringify(this);
        console.log(json);
    }
    
    toJSON() {
        console.log(this.track[0])
        let track = this.track.map(row => row.join(''));
        return {
            meta: {
                name: 'Losowa nazwa',
                author: 'Author',
            },
            track: track,
            cars: [],
            cpu_paths: []
        }
    }
}


class Observer {
    constructor() {
        this.callbacks = {};
    }

    observe(key, fn) {
        if(!(key in this.callbacks))
            this.callbacks[key] = [];
        this.callbacks[key].push(fn);
    }

    notify(key, value) {
        if(key in this.callbacks) {
            for(let fn of this.callbacks[key])
                fn(key, value);
        }
    }

    bind(key, el) {
        let that = this;
        el.addEventListener('keyup', () => this.notify(key, el.value));
        this.observe(key, (k,v) => (el.value = v));
    }
}


function oninit() {
    let canvas = document.querySelector('canvas');
    
    let o = new Observer();

    document.querySelectorAll('[data-bind]').forEach(el => {
        const key = el.dataset['bind'];
        // console.log(key, el, o)
        switch(el.tagName) {
            case 'INPUT':
                el.addEventListener('keyup', () => o.notify(key, el.value));
                o.observe(key, (_, value) => el.value = value);
                break;
            case 'BUTTON':
                el.addEventListener('click', () => o.notify(key, el.value));
                o.observe(key, (_, value) => el.classList[el.value == value ? 'add' : 'remove']('active'));
                break
            default:
                o.observe(key, (_, value) => el.innerText = value);
        }
    });
    
    document.querySelectorAll('[data-fn]').forEach(el => {
        const fn = el.dataset['fn'], value = el.value;
        el.addEventListener('click', () => TRACK[fn](value));
    });

    
    TRACK = new Track(48, 32, o, canvas);

    o.notify('tool', 'track');
}

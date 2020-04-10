function parse_hash() {
    let hash=window.location.hash.substr(1).split(',');
    let res = {};
    for(let item of hash) {
        let x = item.split('=');
        if(x.length == 1)
            res[x[0]] = true;
        else res[x[0]] = x[1];
    }
    console.log('hash:', res);
    return res;
};

const WIDTH = 48, HEIGHT=32;
const ARGS = parse_hash();
let BOARD, KEYS = {}, TRACKS = {};
let ctx;
const TOTAL_LAP = 1;

class Player{
    constructor(x, y, color, name, keys, replay) {
        this.record = [];
        this.replay = [];
        if(replay)
            this.importRecording(replay);

        this.color = color;
        this.x = x; this.y = y;
        this.angle = this.speed = 0.0;
        this.maxSpeed = 120;
        this.angleSpeed = 3.0;
        this.breakingSpeed = 0.5;
        this.accSpeed = 0.6;
        this.keys = keys;

        this.el = document.createElement('div');
        this.el.className = name + ' car';
        this.el.style.background = color;
        BOARD.appendChild(this.el);

        this.hud = document.createElement('div');
        this.hud.className = 'hud';
        this.hud.style.background = color;
        this.hud.innerHTML = '<h1 class="lapCount">1</h1><h4 class="totalLap">/ 3</h4><h1 class="speed" style="margin-left: 10px;"></h1><h4>KMH</h4>';
        document.querySelector('#hud').appendChild(this.hud);
        this.hud.addEventListener('pointermove', function(event){
            console.log(event.offsetX, event);
        }, true);

        this.zone = 0;
        this.lapCount = 0;
        this.hud.querySelector('.lapCount').innerHTML = this.lapCount+1;
        this.hud.querySelector('.totalLap').innerHTML = '/ '+TOTAL_LAP;
    }

    update(FPS) {
        let isBreaking, angAcc;

        if(this.replay && this.replay.length>0) {
            let res = this.replay.shift();;
            isBreaking = !!parseInt(res /3);
            angAcc = (res % 3) - 1;
        } else {
            isBreaking = KEYS[this.keys.break] || false;
            angAcc = (KEYS[this.keys.left] ? 1 : 0) + (KEYS[this.keys.right] ? -1 : 0);
            this.record.push(3*isBreaking + (angAcc + 1));
        }
        isBreaking = false;
        // console.log(this.color, isBreaking, angAcc);

        
        if(this.collision())
            this.speed = 0.0;
        else
            this.speed = Math.max(0, Math.min(1, this.speed + (isBreaking ? -this.breakingSpeed : this.accSpeed) / FPS));
        
        let speed = (this.speed * this.maxSpeed) / FPS;

        this.angle += angAcc * this.angleSpeed / FPS;// * speed;
        this.x += speed * Math.sin(this.angle);
        this.y += speed * Math.cos(this.angle);
        this.hud.querySelector('.speed').innerHTML = Math.floor((this.speed * this.maxSpeed));

        this.el.style.left = this.x + 'px';
        this.el.style.top = this.y + 'px';
        this.el.style.transform = 'rotate('+(-180*this.angle/Math.PI)+'deg)';
        // this.hud.innerText = `zone: ${this.zone}; lap: ${this.lapCount}/3`;
    }

    checkZone(pixel) {
        return (pixel[0] == 0 && pixel[1] == 0 && pixel[2] == 0 && pixel[3] == ((this.zone%9)+1));
    }

    collision() {
        let fv = {x: 9*Math.sin(this.angle), y: 9*Math.cos(this.angle)}
        let fr = {x: 6*Math.sin(this.angle + 0.5*Math.PI), y: 6*Math.cos(this.angle + 0.5*Math.PI)}

        let x = this.x +  + 6 * Math.sin(this.angle+0.5*Math.PI);
        let y = this.y + 9*Math.cos(this.angle) + 6 * Math.cos(this.angle + 0.5*Math.PI);

        let pixel1 = ctx.getImageData(this.x+fv.x+fr.x, this.y+fv.y+fr.y, 1, 1).data;
        let pixel2 = ctx.getImageData(this.x+fv.x-fr.x, this.y+fv.y-fr.y, 1, 1).data;

        if(this.checkZone(pixel1) || this.checkZone(pixel2)) {
            if(this.zone == 9)
                this.lapCount += 1;
            this.zone = (this.zone%9) + 1;
            this.hud.querySelector('.lapCount').innerHTML = this.lapCount+1;
            this.hud.querySelector('.totalLap').innerHTML = '/ '+TOTAL_LAP;
        }

        return (pixel1[3] > 250) || (pixel2[3] > 250);
    }

    exportRecording() {
        let last = null, count = 0;
        let result = [];
        this.record.push(-1);
        for(let v of this.record) {
            if(last != v) {
                if(last != null)
                    result.push([last,count]);
                last = v; count = 1;
            } else count++;
        }
        this.record.pop();
        return result;
    }

    importRecording(recording) {
        let res = [];
        for(let [v,count] of recording) {
            for(let i=0;i<count;i++)
                res.push(v);
        }
        this.replay = res;
    }
}

let cpu=(ARGS.cpu || false);
let trackid=parseInt(ARGS.track || 0);


let lastTimestamp, firstTimestamp;
let TIMER;

function update(timestamp) {
    if(lastTimestamp) {
        let FPS = 1000.0 / (timestamp - lastTimestamp);
        FPS = 60;
        for(let player of PLAYERS) 
            player.update(FPS);
    } else
        firstTimestamp = timestamp;

    lastTimestamp = timestamp;
    let time = parseInt((timestamp - firstTimestamp)/100);
    let ms = time % 10, s = ''+(parseInt(time /10)%60), m = ''+parseInt(time/600);
    time = `${m.padStart(2,'0')}:${s.padStart(2,'0')}.${ms}`;
    timer.innerHTML = time;
    for(let player of PLAYERS)
        if(player.lapCount >= TOTAL_LAP) {
            alert(`Player ${player.color} win in ${time}`);
            if(player.color=='blue' && !cpu)
                console.log(JSON.stringify(player.exportRecording()));
            return ;
        }

    window.requestAnimationFrame(update);
}

function onresize() {
    const main = document.querySelector('main');
    const scale = Math.min(
        window.innerHeight / (main.clientHeight+60),
        window.innerWidth / (main.clientWidth+60)
    );
    document.body.style.zoom = scale;
    console.log('scale:', scale);
}

function onkey(event) {
    if(event.type == 'keyup')
        KEYS[event.code] = false;
    else if (event.type == 'keydown')
        KEYS[event.code] = true;
}

function openFullscreen() {
    let elem = document.documentElement;
    alert(document.fullscreenEnabled);
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.mozRequestFullScreen) { /* Firefox */
        elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE/Edge */
        elem.msRequestFullscreen();
    }
}
function oninit(){
    BOARD = document.querySelector('#board');
    TIMER = document.querySelector('#timer');
    let track = TRACKS['Simple Track']
    createMap(track.track);
    onresize();
    let recording = cpu ? track.replays[Math.floor(Math.random() * track.replays.length)] : undefined;

    PLAYERS = [
        new Player(track.cars[0][0], track.cars[0][1], 'red', 'fab fa-apple', {left: 'KeyA', right: 'KeyD'}),
        new Player(track.cars[1][0], track.cars[1][1], 'blue', 'fab fa-linux', {left: 'KeyJ', right: 'KeyL'}, replay=recording),
    ];
    window.requestAnimationFrame(update);
}

function createMap(mapa) {
    mapa = mapa.trim().split("\n");
    let back = document.querySelector('#background');
    back.width = 16 * mapa[0].length;
    board.style.width = (16 * mapa[0].length) + 'px';

    back.height = 16 * mapa.length;
    board.style.height = (16 * mapa.length) + 'px';
    
    ctx = back.getContext('2d');
    
    for(let y=0;y<mapa.length;y++) {
        let row = mapa[y].trim();
        for(let x=0;x<row.length;x++)
            if(row[x] == 'O'){
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.ellipse(16*(x+0.5), 16*(y+0.5), 8, 8, 0, 0, 2*Math.PI);
                ctx.fill();
            } else if('1' <= row[x] && row[x] <= '9') {
                ctx.fillStyle = '#0000000'+row[x];
                ctx.fillRect(16*x, 16*y, 16, 16);
            }
    }
}


function initMap(track) {
    console.log('Loading', track.name);
    TRACKS[track.name] = track;
}
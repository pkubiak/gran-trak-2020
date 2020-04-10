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
let BOARD, KEYS = {};
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
        this.el.className = 'car';
        this.el.style.background = color;
        this.el.innerText = name;
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
let recordings = {
    0: [
        [[1,105],[2,8],[1,9],[2,8],[1,18],[0,36],[1,12],[2,15],[1,14],[2,16],[1,10],[2,11],[1,7],[2,8],[1,24],[2,5],[1,26],[0,7],[1,11],[2,7],[1,14],[0,7],[1,11],[2,7],[1,27],[2,16],[1,11],[2,37],[1,21],[2,10],[1,34],[2,6],[1,32],[0,55],[1,4],[2,18],[1,10],[2,8],[1,15],[0,6],[1,14],[0,5],[1,18],[0,61],[1,19],[2,7],[1,25],[2,13],[1,37],[2,8],[1,18],[2,8],[1,5],[2,12],[1,10],[2,10],[1,14],[2,5],[1,19],[0,6],[1,38],[2,67],[1,43],[0,7],[1,9],[0,44],[1,7],[0,10],[1,25],[2,9],[1,17],[2,14],[1,21],[2,6],[1,21],[2,7],[1,10],[2,8],[1,15],[2,10],[1,4],[2,9],[1,11],[0,4]],
        [[1,110],[2,12],[1,19],[2,7],[1,7],[0,40],[1,14],[2,42],[1,29],[2,9],[1,11],[2,7],[1,24],[0,13],[1,23],[2,10],[1,46],[2,15],[1,11],[2,11],[1,6],[2,22],[1,12],[2,10],[1,24],[2,6],[1,24],[2,9],[1,27],[0,47],[1,7],[0,3],[1,14],[2,8],[1,4],[2,11],[1,21],[0,10],[1,22],[0,10],[1,3],[0,46],[1,20],[0,12],[1,9],[2,19],[1,13],[2,2],[1,17],[2,8],[1,16],[2,7],[1,25],[2,8],[1,2],[2,15],[1,8],[2,8],[1,20],[0,7],[1,13],[2,7],[1,29],[2,67],[1,15],[0,6],[1,21],[0,46],[1,9],[0,9],[1,9],[0,10],[1,12],[2,9],[1,7],[2,6],[1,6],[2,18],[1,34],[2,6],[1,22],[2,13],[1,24],[2,10],[1,11]],
        [[1,34],[0,7],[1,69],[2,8],[1,14],[0,9],[1,9],[2,13],[1,16],[0,8],[1,8],[2,22],[1,32],[2,6],[1,20],[2,8],[1,21],[0,5],[1,14],[2,6],[1,18],[0,4],[1,20],[2,7],[1,10],[0,5],[1,25],[2,24],[1,5],[2,15],[1,15],[2,16],[1,11],[2,14],[1,35],[0,7],[1,19],[2,7],[1,12],[0,7],[1,8],[2,26],[1,2],[0,69],[1,6],[2,14],[1,7],[2,8],[1,41],[0,10],[1,21],[0,61],[1,22],[2,6],[1,15],[2,11],[1,25],[2,11],[1,25],[2,7],[1,21],[2,19],[1,13],[2,5],[1,24],[2,7],[1,14],[0,12],[1,13],[2,64],[1,12],[2,8],[1,32],[0,5],[1,3],[0,55],[1,36],[2,13],[1,15],[2,12],[1,15],[0,3],[1,6],[2,11],[1,15],[0,10],[1,13],[2,13],[1,29],[2,7],[1,18],[2,9],[1,21]],
        [[1,101],[2,9],[1,42],[0,23],[1,22],[2,12],[1,8],[2,15],[1,8],[2,18],[1,144],[2,13],[1,13],[2,12],[1,4],[2,19],[1,6],[2,13],[1,8],[2,10],[1,63],[2,9],[1,6],[0,10],[1,10],[0,62],[1,5],[2,8],[1,10],[2,7],[1,8],[2,10],[1,17],[2,15],[1,24],[0,9],[1,29],[0,67],[1,12],[2,16],[1,36],[2,5],[1,19],[2,13],[1,22],[2,10],[1,7],[2,10],[1,8],[2,7],[1,65],[2,21],[1,22],[2,12],[1,1],[0,36],[1,1],[2,60],[1,9],[2,10],[1,14],[2,5],[1,14],[0,9],[1,7],[0,47],[1,7],[0,13],[1,27],[2,11],[1,14],[2,15],[1,22],[2,10],[1,41],[2,12],[1,20],[2,7],[1,26]],
        [[1,78],[0,7],[1,67],[2,8],[1,36],[2,12],[1,13],[2,12],[1,43],[2,7],[1,83],[0,4],[1,33],[2,7],[1,8],[2,24],[1,6],[2,20],[1,15],[2,10],[1,13],[2,8],[1,22],[2,5],[1,29],[2,5],[1,2],[0,14],[1,10],[0,57],[1,3],[2,8],[1,25],[2,13],[1,7],[2,11],[1,10],[2,9],[1,19],[0,14],[1,28],[0,60],[1,19],[2,8],[1,20],[2,7],[1,28],[2,9],[1,17],[2,7],[1,22],[2,20],[1,11],[2,7],[1,33],[2,6],[1,8],[0,5],[1,27],[2,65],[1,41],[0,66],[1,10],[2,15],[1,22],[2,11],[1,15],[2,3],[1,11],[2,4],[1,14],[2,6],[1,9],[2,5],[1,18],[2,13],[1,26],[2,7],[1,3]],
        [[1,110],[2,14],[1,27],[0,23],[1,8],[0,8],[1,14],[2,26],[1,8],[2,14],[1,11],[2,8],[1,136],[2,11],[1,9],[2,12],[1,6],[2,25],[1,10],[2,8],[1,11],[2,8],[1,31],[2,6],[1,11],[2,8],[1,21],[0,7],[1,5],[0,59],[1,1],[2,37],[1,10],[0,12],[1,27],[0,9],[1,18],[0,55],[1,25],[0,11],[1,9],[2,34],[1,19],[0,9],[1,37],[2,8],[1,17],[2,10],[1,38],[2,24],[1,9],[2,6],[1,15],[0,6],[1,20],[2,6],[1,11],[0,6],[1,5],[2,72],[1,16],[0,6],[1,19],[0,54],[1,8],[0,6],[1,14],[2,10],[1,14],[2,8],[1,12],[2,6],[1,19],[2,5],[1,24],[2,10],[1,14],[2,15],[1,25],[2,6],[1,3]],
        [[1,44],[0,6],[1,94],[2,10],[1,19],[0,10],[1,7],[2,29],[1,22],[0,8],[1,8],[2,10],[1,18],[2,9],[1,35],[0,8],[1,6],[2,7],[1,62],[2,10],[1,7],[2,7],[1,3],[2,26],[1,4],[2,14],[1,18],[2,7],[1,36],[2,6],[1,38],[0,63],[2,40],[1,14],[0,10],[1,19],[0,10],[1,12],[0,58],[1,19],[2,12],[1,31],[2,8],[1,13],[2,7],[1,24],[2,8],[1,10],[2,7],[1,1],[2,12],[1,28],[2,5],[1,24],[2,5],[1,17],[0,5],[1,7],[2,68],[1,27],[0,7],[1,8],[0,6],[1,9],[0,53],[1,24],[2,8],[1,8],[2,8],[1,6],[2,7],[1,22],[2,10],[1,31],[2,7],[1,20],[2,10],[1,13],[2,11],[1,19]],
        [[1,110],[2,12],[1,17],[2,5],[1,6],[0,16],[1,6],[0,22],[1,8],[2,11],[1,4],[2,26],[1,4],[2,13],[1,34],[2,5],[1,11],[0,6],[1,18],[2,7],[1,10],[0,6],[1,16],[2,6],[1,15],[0,8],[1,15],[2,28],[1,3],[2,17],[1,9],[2,10],[1,7],[2,10],[1,27],[2,7],[1,27],[2,9],[1,22],[0,21],[1,4],[0,40],[1,2],[2,29],[1,23],[0,14],[1,28],[0,15],[1,5],[0,50],[1,6],[2,19],[1,19],[0,5],[1,10],[2,5],[1,6],[2,9],[1,7],[2,7],[1,9],[2,7],[1,24],[2,9],[1,5],[2,10],[1,6],[2,6],[1,21],[0,5],[1,21],[2,3],[1,14],[2,7],[1,4],[2,59],[1,12],[0,7],[1,12],[2,12],[1,3],[0,70],[1,29],[2,7],[1,6],[2,12],[1,5],[2,6],[1,37],[2,5],[1,13],[2,8],[1,14],[2,10],[1,20],[2,9],[1,24]],
        [[1,109],[2,16],[1,23],[0,28],[1,32],[2,10],[1,7],[2,27],[1,15],[2,7],[1,57],[0,3],[1,30],[2,6],[1,19],[0,6],[1,15],[2,22],[1,6],[2,21],[1,16],[2,22],[1,28],[2,7],[1,27],[2,8],[1,18],[0,13],[1,6],[0,50],[1,4],[2,30],[1,25],[0,8],[1,12],[0,6],[1,23],[0,55],[1,16],[0,4],[1,13],[0,5],[1,9],[2,29],[1,11],[0,8],[1,7],[2,12],[1,27],[2,10],[1,4],[2,21],[1,10],[0,7],[1,16],[2,8],[1,56],[2,64],[1,49],[0,61],[1,26],[2,9],[1,11],[2,9],[1,11],[2,10],[1,42],[2,8],[1,18],[2,16],[1,36]],
    ],
    1: [
        [[1,29],[0,7],[1,22],[2,6],[1,76],[2,6],[1,12],[2,13],[1,7],[2,7],[1,57],[2,6],[1,42],[0,5],[1,10],[2,6],[1,64],[0,4],[1,18],[2,5],[1,19],[0,6],[1,9],[2,6],[1,22],[2,47],[1,5],[2,9],[1,11],[0,12],[1,6],[2,20],[1,17],[0,6],[1,17],[2,7],[1,16],[0,8],[1,66],[2,7],[1,9],[0,8],[1,20],[0,7],[1,27],[0,19],[1,17],[0,5],[1,9],[0,11],[1,7],[0,8],[1,13],[0,10],[1,25],[2,7],[1,10],[0,8],[1,10],[2,6],[1,12],[2,7],[1,9],[0,7],[1,31],[2,7],[1,10],[0,7],[1,14],[0,18],[1,11],[0,45],[1,24],[0,6],[1,12],[2,7],[1,29],[2,58],[1,37],[2,6],[1,13],[0,7],[1,20],[2,7],[1,29],[2,10],[1,6],[2,14],[1,29],[2,5],[1,22],[2,6],[1,26],[2,21],[1,7],[2,7],[1,6],[0,8],[1,26],[2,6],[1,39],[2,7],[1,11],[0,8],[1,53],[0,4],[1,38],[2,7],[1,15],[0,11],[1,5],[0,9],[1,9],[2,40],[1,15],[2,7],[1,13],[2,15],[1,10],[0,21],[1,5]],
        [[1,63],[0,7],[1,21],[2,8],[1,58],[2,14],[1,7],[2,10],[1,30],[2,5],[1,72],[0,6],[1,9],[2,6],[1,27],[2,5],[1,19],[0,7],[1,22],[2,5],[1,47],[0,4],[1,13],[2,36],[1,5],[2,13],[1,20],[2,12],[1,16],[2,7],[1,40],[0,7],[1,18],[2,8],[1,10],[0,6],[1,23],[0,8],[1,10],[0,5],[1,24],[0,7],[1,6],[2,13],[1,7],[0,46],[1,9],[2,11],[1,17],[0,8],[1,43],[0,7],[1,108],[0,25],[1,6],[0,42],[1,49],[2,5],[1,20],[2,53],[1,17],[2,8],[1,20],[0,5],[1,15],[2,6],[1,13],[0,6],[1,11],[2,7],[1,7],[2,7],[1,5],[2,8],[1,22],[2,7],[1,15],[2,6],[1,38],[2,10],[1,9],[2,9],[1,5],[2,8],[1,26],[2,5],[1,16],[0,6],[1,9],[2,8],[1,9],[2,7],[1,13],[0,8],[1,38],[0,6],[1,12],[2,6],[1,11],[0,7],[1,14],[2,11],[1,8],[0,9],[1,23],[0,5],[1,22],[2,8],[1,7],[2,21],[1,10],[2,15],[1,12],[2,7],[1,7],[0,10],[1,16],[0,4]],
        [[1,46],[0,8],[1,20],[2,6],[1,67],[2,10],[1,6],[2,8],[1,9],[2,8],[1,5],[2,8],[1,16],[0,8],[1,14],[2,7],[1,10],[0,8],[1,8],[2,7],[1,96],[2,5],[1,19],[0,5],[1,53],[2,7],[1,6],[2,8],[1,4],[2,5],[1,5],[2,29],[1,17],[2,11],[1,17],[2,7],[1,32],[0,5],[1,141],[0,7],[1,15],[0,7],[1,6],[0,9],[1,8],[0,8],[1,24],[0,6],[1,7],[0,8],[1,4],[0,8],[1,10],[0,7],[1,78],[2,8],[1,10],[0,7],[1,25],[2,6],[1,13],[0,9],[1,25],[0,62],[1,12],[2,7],[1,10],[0,12],[1,9],[2,7],[1,31],[2,55],[1,9],[2,7],[1,108],[2,20],[1,27],[2,12],[1,37],[2,7],[1,10],[2,8],[1,8],[2,6],[1,15],[2,8],[1,40],[2,5],[1,119],[0,5],[1,71],[0,9],[1,10],[2,7],[1,7],[2,10],[1,7],[2,39],[1,18],[0,12],[1,15],[0,7],[1,6]],
    ]
};
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
    const scale = Math.min(window.innerHeight / (main.clientHeight+40), window.innerWidth / (main.clientWidth+40));
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
    alert(document.fullscreenEnabled);

    let elem = document.documentElement;
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
    create_map(TRACKS[trackid].track);
    onresize();
    let recording = cpu ? recordings[trackid][Math.floor(Math.random() * recordings[trackid].length)] : undefined;

    PLAYERS = [
        new Player(TRACKS[trackid].cars[0][0], TRACKS[trackid].cars[0][1], 'red', '①', {left: 'KeyA', right: 'KeyD', break: 'KeyS'}),
        new Player(TRACKS[trackid].cars[1][0], TRACKS[trackid].cars[1][1], 'blue', '②', {left: 'KeyJ', right: 'KeyL', break: 'KeyK'}, replay=recording),
    ];
    window.requestAnimationFrame(update);
}

const TRACKS = {}
TRACKS[0] = {
    cars: [[60, 110], [80, 100]],
    track: `OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO
OOOOOOOOOOOOOOOOOOOOOOOOO..6..OO
OOOOOO....9.......OOOOOO...6...O
OOOO......9........OOOOO...6...O
OOO.......9.........OOOO...O...O
OO.......OOOOOOO.....OOO...O...O
OO......OO......O....OOO...O...O
O......OO........O888OOO...O...O
O......OO........O...OOO...O...O
O......OO...OO...O...OOO...O...O
O......OO...OO...O...OOO...O...O
OO1111OOO...OO...O....OO...O...O
O......OO...OO...O.....7...O...O
O......OO444OO....O....7...O...O
O......OO...OO.....O...7..OO...O
O......OO....OO.....O..7.OOO...O
O.......OO....OO.....OOOOOO....O
O..OO....OO....OO.......5......O
O..OOO....OO...OOO......5......O
O..OOOO...OO...OOOO.....5.....OO
O..OOOO...OO...OOOOOOOOOOOOOOOOO
O..OOO....O....OOO............OO
O..OO....O....OOO..............O
O.......O....OOO...............O
O......OO..........OOOOOOOO....O
O222222OO.........OOOOOOOOOO333O
O......OOO.......OOOOOOOOOOO...O
O.......OOOOOOOOOOOOOOOOOOO....O
O..............................O
OO.............................O
OOO...........................OO
OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO`.split("\n")
};

TRACKS[1] = {
    cars: [[60, 190], [80, 180]],
    track: `..OOOOOO...............OOOOOOOOOOOOOOOOOOOOOO...
.OO.....OOOOO.OOOOOOOOOOOO..9..............OOO..
OO.......OOOOOOOO...........9................OO.
O...........................9....OOOOOOO.....OO.
O...OOOO....................9OOOOOOOOOOOO....OO.
O...OOOOOOOO..........OOOOOOOOOO........OO....O.
O...OOOOOOOOOOOOOOOOOOOOOOOO.............O....O.
O....OOOOOOOOOOOOOOOOO.....6.............OO...O.
O....OOOOO.................6......OOO....OO...O.
OO....OOO................OOOOOOOOOOOO....OO...O.
.OO...OO..............OOOOOOOOOOO........OO...O.
.OO...OO.....OOO...OOOOOO................OO...O.
.OO...OO....OOO...OOOO..................OOO888O.
.OO...OO...OOO...OOOOO..........OOOOOOOOOOO...O.
OOO111OO...OOO...OOOO77777OOOOOOOOOOOOOOOO....O.
OO....OO555OOO555OOOO......OOOOOOOOOOOOO......O.
OO...OOO....OOO...OOO.........................O.
OO...OOO.....OOO...OOO........................O.
OO...OOO.......OO...OOOOO....................OO.
OO...OOOO.............OOOOOOOOOOOOOOOOOOOOOOOO..
OO...OOOOO................OOOOOOOOOOOOOOOOOOOO..
OO...OOOOOOO...................4........OOOOOOO.
OO...OOOOOOOOOOOO..............4............OOO.
OO...OOOOOOOOOOOOOOOOO.........4.............OO.
OO....OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO.......OO.
OO......OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO.....OO.
OO........OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO....OO.
.OO........2...OOOOOOOOOOOOOOOOOOOOOOOOOO.....O.
.OOO.......2.............OOOOOOOOOOOOOOO.....OO.
..OOOO.....2........................3.......OOO.
...OOOOOOOOO........................3......OOOO.
......OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO..`.split('\n')
};

function create_map(mapa) {
    let back = document.querySelector('#background');
    back.width = 16 * mapa[0].length;
    board.style.width = (16 * mapa[0].length) + 'px';

    back.height = 16 * mapa.length;
    board.style.height = (16 * mapa.length) + 'px';
    
    ctx = back.getContext('2d');
    
    for(let y=0;y<mapa.length;y++)
        for(let x=0;x<mapa[y].length;x++)
            if(mapa[y][x] == 'O'){
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.ellipse(16*(x+0.5), 16*(y+0.5), 8, 8, 0, 0, 2*Math.PI);
                ctx.fill();
            } else if('1' <= mapa[y][x] && mapa[y][x] <= '9') {
                ctx.fillStyle = '#0000000'+mapa[y][x];
                ctx.fillRect(16*x, 16*y, 16, 16);
            }
}
function render(track) {
    return track.map(row=>row.map(x=>x?'O':'.').join('')).join('\n');
}
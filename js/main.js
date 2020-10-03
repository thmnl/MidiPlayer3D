//import * as THREE from './three/three.module.js';

//import { OrbitControls } from './three/OrbitControls.js';

var camera, controls, scene, renderer, pianoKeys, player, futurBoxs = [], pianoFloor = 20;

init();
//render(); // remove when using next line for animation loop (requestAnimationFrame)
animate();

// generate a piano and add it to scene if scene is specified
function generatePiano(scene = undefined, opacity = 1) {
    const piano_patern = [true, false, true, true, false, true, false, true, true, false, true, false];

    const whiteGeometry = new THREE.BoxGeometry(1, 1, 6);
    const whiteMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: opacity, side: THREE.DoubleSide });
    const whiteEdges = new THREE.EdgesGeometry(whiteGeometry);
    const blackGeometry = new THREE.BoxGeometry(0.6, 1, 4);
    const blackMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: opacity, side: THREE.DoubleSide });
    const blackEdges = new THREE.EdgesGeometry(blackGeometry);

    let modificator = 25;
    let keys = [];
    for (let n = 0; n < 88; n++) {
        let box, line, color;
        if (piano_patern[n % 12]) { //white key
            box = new THREE.Mesh(whiteGeometry, whiteMaterial);
            color = 0x000000;
            line = new THREE.LineSegments(whiteEdges, new THREE.LineBasicMaterial({ color: color }));
            box.position.x = n - modificator;
            line.position.x = n - modificator;
            box.position.y = pianoFloor;
            line.position.y = pianoFloor;

        }
        else {
            box = new THREE.Mesh(blackGeometry, blackMaterial);
            color = 0x666666;
            line = new THREE.LineSegments(blackEdges, new THREE.LineBasicMaterial({ color: color }));
            box.position.x = n - modificator - 0.5;
            box.position.y = 0.4 + pianoFloor;
            box.position.z = -1;
            line.position.x = n - modificator - 0.5;
            line.position.y = 0.4 + pianoFloor;
            line.position.z = -1;
            modificator += 1;
        }
        if (scene != undefined) {
            scene.add(box);
            scene.add(line);
        }
        keys[n] = { box: box, line: line, isWhite: piano_patern[n % 12], isOn: false, color: color };
    }
    return keys;
}

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcce0ff);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(0, 100, 100);

    // controls

    controls = new OrbitControls(camera, renderer.domElement);

    //controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)

    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.05;

    controls.screenSpacePanning = false;

    controls.minDistance = 5;
    controls.maxDistance = 500;

    controls.maxPolarAngle = Math.PI / 2;
    // ground 
    var loader = new THREE.TextureLoader();
    var groundTexture = loader.load('./images/ground.jpg');
    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(10, 10);
    groundTexture.anisotropy = 16;
    groundTexture.encoding = THREE.sRGBEncoding;

    var groundMaterial = new THREE.MeshLambertMaterial({ map: groundTexture });

    var mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000, 1000), groundMaterial);
    mesh.position.y = -10;
    mesh.rotation.x = - Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);
    // piano Keyboard

    pianoKeys = generatePiano(scene);

    // piano model
    var dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('./js/draco/gltf/');

    var loader = new GLTFLoader();

    loader.setDRACOLoader(dracoLoader);
    loader.load('./js/model/Grand_Piano_test.glb', function (gltf) {

        var model = gltf.scene;
        model.position.set(43, -30 + pianoFloor, -3);
        model.scale.set(37, 37, 37);

        scene.add(model);

        animate();

    }, undefined, function (e) {

        console.error(e);

    });

    // lights
    var ambient = new THREE.AmbientLight(0xffffff, 1);
    var sphere = new THREE.SphereBufferGeometry(0.5, 16, 8);
    let light1 = new THREE.PointLight(0xffffff, 150, 35);
    light1.position.set(0, 20, 20)
    scene.add(light1);

    let light2 = new THREE.PointLight(0xffffff, 2, 150);
    light2.position.set(35, 25, -70)
    scene.add(light2);

    let light3 = new THREE.PointLight(0xffffff, 2, 150);
    light3.position.set(-55, 25, -60)
    scene.add(light3);

    let light4 = new THREE.PointLight(0xffffff, 2, 150);
    light4.position.set(0, 45, -150)
    scene.add(light4);
    scene.add(ambient);




    window.addEventListener('resize', onWindowResize, true);

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

let t1 = Date.now();
let previouscurrentTime = -1;
let currentTime;
function animate() {

    requestAnimationFrame(animate);

    if (player != undefined) {
        currentTime = player.currentTime;
        if (!MIDI.Player.playing)
            currentTime = previouscurrentTime;
        if (previouscurrentTime == player.currentTime && MIDI.Player.playing) {
            currentTime = Date.now() - t1 + player.currentTime;
        }
        else {
            t1 = Date.now();
            previouscurrentTime = currentTime;
        }
    }
    for (let box of futurBoxs) {
        box.box.position.y = box.baseY - currentTime / 100;
        box.line.position.y = box.baseY - currentTime / 100;
    }
    controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

    render();

}

function render() {

    renderer.render(scene, camera);

}


let colorNote_w = [0x42d4f5, 0xe33030];
let colorNote_b = [0x10b5b2, 0xbf2828];
let createBox = function (pianoKey, width, data) {
    let color = colorNote_b[data.track % 2];
    if (pianoKey.isWhite)
        color = colorNote_w[data.track % 2];
    const velocity = data.velocity * 10;
    const datatime = data.time * 10;
    const geometry = new THREE.BoxGeometry(width, velocity, 1);
    const material = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1, side: THREE.DoubleSide });
    const edges = new THREE.EdgesGeometry(geometry);

    let box = new THREE.Mesh(geometry, material);
    let line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));

    box.position.y = datatime + velocity / 2;
    box.position.x = pianoKey.box.position.x + 0.1;
    line.position.y = datatime + velocity / 2;
    line.position.x = pianoKey.box.position.x + 0.1;
    if (pianoKey.isWhite) {
        box.position.z = 2;
        line.position.z = 2;
    }
    box.castShadow = true;
    scene.add(line)
    scene.add(box)
    futurBoxs.push({ box: box, line: line, baseY: datatime + velocity / 2 + pianoFloor });
}

let createFuturBox = function () {
    //clear box
    for (box of futurBoxs) {
        scene.remove(box.box);
        scene.remove(box.line);
    }
    futurBoxs = [];
    for (data of mididata) {
        if (data.msg.subtype == "noteOn") {
            let n = data.msg.noteNumber - 21;
            let width;
            pianoKey = pianoKeys[n];
            if (pianoKey.isWhite)
                width = 0.8;
            else
                width = 0.4;
            if (data.velocity <= 0.05) {
                data.velocity = 0.05;
            }
            createBox(pianoKey, width, data);
        }
    }
};

let mididata;
let addTimecode = function () {
    let t = 0;
    mididata = [];
    for (let data of player.data) {
        t += data[1];
        let newdata = {
            time: t / 1000,
            msg: data[0].event,
            velocity: data[0].event.velocity / 10,
            track: data[0].track,
        };
        mididata.push(newdata);
    }
    for (let data of mididata) {
        if (data.msg.subtype != "noteOn") continue;
        for (let dt of mididata) {
            if (dt.time < data.time) continue;
            if (data.time + data.velocity < dt.time) break;
            if (dt.msg.subtype == "noteOff" && data.msg.noteNumber == dt.msg.noteNumber) {
                data.velocity = dt.time - data.time;
            }
        }
    }
    createFuturBox();
}


function SetVolume(value) {
    MIDI.setVolume(0, value);
    if (MIDI.Player.playing) {
        MIDI.Player.resume();
    }
}
function dragOverHandler(ev) {
    ev.preventDefault();
}
function dropHandler(ev) {
    ev.preventDefault();

    let file = ev.dataTransfer.files[0],
        reader = new FileReader();
    name = file.name.replace(".mid", " ");
    name = name.replace(/_/g, " ");
    reader.onload = function (event) {
        if (event.target.result.startsWith("data:audio/mid;base64")) {
            if (songid % songname.length != songname.length - 1) {
                place = (songid + 1) % songname.length;
            }
            else {
                place = songname.length;
            }
            songid = songid % songname.length;
            songname.splice(place, 0, name);
            song.splice(place, 0, event.target.result);
            player.getNextSong(+1);
        }
    };
    reader.readAsDataURL(file);
}
let pausePlayStop = function (stop) {
    let d = document.getElementById("pausePlayStop");
    if (stop) {
        MIDI.Player.stop();
        d.src = static_url + 'images/play.png';
    } else if (MIDI.Player.playing) {
        d.src = static_url + 'images/play.png';
        MIDI.Player.pause(true);
    } else {
        d.src = static_url + 'images/pause.png';
        MIDI.Player.resume();
    }
    d.blur();
}
document.addEventListener('keydown', function (event) {
    if (event.code == "Space") {
        pausePlayStop();
    }
});

// set keyOn of keyOff 
let setKey = function (pianoKey, keyOn) {
    if ((keyOn && pianoKeys[pianoKey].isOn) || (!keyOn && !pianoKeys[pianoKey].isOn))
        return
    let modifier = keyOn ? 1 : -1;
    if (pianoKeys[pianoKey].isWhite) {
        pianoKeys[pianoKey].box.rotation.x += 0.1 * modifier
        pianoKeys[pianoKey].line.rotation.x += 0.1 * modifier
        pianoKeys[pianoKey].box.position.y -= 0.3 * modifier
        pianoKeys[pianoKey].line.position.y -= 0.3 * modifier
    }
    else {
        pianoKeys[pianoKey].box.rotation.x += 0.07 * modifier
        pianoKeys[pianoKey].line.rotation.x += 0.07 * modifier
        pianoKeys[pianoKey].box.position.y -= 0.15 * modifier
        pianoKeys[pianoKey].line.position.y -= 0.15 * modifier
    }
    pianoKeys[pianoKey].isOn = keyOn;
}

eventjs.add(window, "load", function (event) {
    MIDI.loader = new sketch.ui.Timer;
    MIDI.loadPlugin({
        soundfontUrl: static_url + 'soundfont/',
        onprogress: function (state, progress) {
            MIDI.loader.setValue(progress * 100);
        },
        onsuccess: function () {
            player = MIDI.Player;
            MIDI.setVolume(0, 20);
            player.loadFile(song[songid % song.length]);
            addTimecode();
            player.addListener(function (data) {
                let pianoKey = data.note - 21;
                if (data.message === 144) {
                    setKey(pianoKey, true);
                }
                else {
                    setKey(pianoKey, false);
                }
            });
            ///
            MIDIPlayerPercentage(player);
        }
    });
});

let MIDIPlayerPercentage = function (player) {
    let time1 = document.getElementById("time1");
    let time2 = document.getElementById("time2");
    let capsule = document.getElementById("capsule");
    let timeCursor = document.getElementById("cursor");
    //
    eventjs.add(capsule, "drag", function (event, self) {
        eventjs.cancel(event);
        player.currentTime = (self.x) / capsule.offsetWidth * player.endTime;
        if (player.currentTime < 0) player.currentTime = 0;
        if (player.currentTime > player.endTime) player.currentTime = player.endTime;
        if (self.state === "down") {
            player.pause(true);
        } else if (self.state === "up") {
            player.resume();
        }
    });
    //
    function timeFormatting(n) {
        let minutes = n / 60 >> 0;
        let seconds = String(n - (minutes * 60) >> 0);
        if (seconds.length == 1) seconds = "0" + seconds;
        return minutes + ":" + seconds;
    };
    player.getNextSong = function (n) {
        songid += n;
        let id = Math.abs((songid) % song.length);
        previouscurrentTime = 1.5;
        player.loadFile(song[id]); // load MIDI
        addTimecode();
        player.start();
    };
    player.setAnimation(function (data, element) {
        let percent = data.now / data.end;
        let now = data.now >> 0; // where we are now
        let end = data.end >> 0; // end of song
        if (now === end) { // go to next song
            let id = ++songid % song.length;
            player.loadFile(song[id], player.start); // load MIDI
            addTimecode();
        }
        // display the information to the user
        timeCursor.style.width = (percent * 100) + "%";
        time1.innerHTML = timeFormatting(now);
        time2.innerHTML = "-" + timeFormatting(end - now);
    });
    window.player = player;
};

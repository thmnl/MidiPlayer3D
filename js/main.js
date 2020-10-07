import * as THREE from './three/three.module.js';
import { OrbitControls } from './three/OrbitControls.js';
import { GUI } from './three/dat.gui.module.js';
import { GLTFLoader } from './three/loaders/GLTFLoader.js';
import { DRACOLoader } from './three/loaders/DRACOLoader.js';
import Stats from './three/stats.module.js';
import { Lensflare, LensflareElement } from './three/Lensflare.js';

var camera, controls, scene, renderer, pianoKeys, player, futurBoxs = [], pianoFloor = 20, stats;
var pianistModel, skeleton, pianoModel, panel, settings, light1, light2, light3, light4;
var t1 = Date.now(), previouscurrentTime = -1, currentTime;

// generate a piano and add it to scene if scene is specified
function generatePiano(scene = undefined, opacity = 1) {
    const piano_patern = [true, false, true, true, false, true, false, true, true, false, true, false];

    const whiteGeometry = new THREE.BoxGeometry(1, 1, 6);
    const whiteMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: opacity, side: THREE.DoubleSide });
    const whiteEdges = new THREE.EdgesGeometry(whiteGeometry);
    const blackGeometry = new THREE.BoxGeometry(0.6, 1, 4);
    const blackMaterial = new THREE.MeshPhongMaterial({ color: 0x000000, transparent: true, opacity: opacity, side: THREE.DoubleSide });
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
            color = 0x0000005;
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

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 30000);
    camera.position.set(-30, 100, 100);

    // controls

    controls = new OrbitControls(camera, renderer.domElement);

    //controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)

    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.05;

    controls.screenSpacePanning = false;

    controls.minDistance = 0;
    controls.maxDistance = 500;

    controls.maxPolarAngle = Math.PI / 2;
    // ground
    let loader = new THREE.TextureLoader();
    let groundTexture = loader.load('./images/ground.png');
    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(1, 1);
    groundTexture.anisotropy = 16;
    groundTexture.opacity = 0.2;
    groundTexture.encoding = THREE.sRGBEncoding;

    let groundMaterial = new THREE.MeshPhongMaterial({ map: groundTexture, transparent: true });

    let mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(250, 250), groundMaterial);
    mesh.rotation.x = - Math.PI / 2;
    mesh.receiveShadow = true;
    mesh.position.set(0, -10, -50);
    scene.add(mesh);
    // piano Keyboard

    pianoKeys = generatePiano(scene);

    // piano model
    let dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('./js/draco/gltf/');

    loader = new GLTFLoader();

    loader.setDRACOLoader(dracoLoader);
    loader.load('./js/model/Grand_Piano_test.glb', function (gltf) {

        pianoModel = gltf.scene;
        pianoModel.position.set(43, -30 + pianoFloor, -3);
        pianoModel.scale.set(37, 37, 37);

        scene.add(pianoModel);
        let pianoFolder = panel.addFolder('Piano Model');
        pianoFolder.add(settings, 'Show piano model').onChange(showPiano);
        animate();

    }, undefined, function (e) {

        console.error(e);

    });
    //pianist model 
    loader.load('./js/model/Xbot.glb', function (gltf) {

        pianistModel = gltf.scene;
        pianistModel.scale.set(35, 35, 35);
        pianistModel.position.set(0, -20, 16);
        pianistModel.rotation.set(0, 3.15, 0);
        console.log(pianistModel)

        scene.add(pianistModel);

        pianistModel.traverse(function (object) {

            if (object.isMesh) object.castShadow = true;

        });

        skeleton = new THREE.SkeletonHelper(pianistModel);
        skeleton.visible = false;
        setBasicPosture();
        scene.add(skeleton);
        let pianistFolder = panel.addFolder('Pianist Model');
        pianistFolder.add(settings, 'Show model').onChange(showPianist);
        pianistFolder.add(settings, 'Show skeleton').onChange(showSkeleton);
        animate();

    });

    // lights
    let textureLoader = new THREE.TextureLoader();

    let textureFlare0 = textureLoader.load( '../images/lensflare0.png' );
    let ambient = new THREE.AmbientLight(0xffffff, 1);
    light1 = addLight(305.73, 100, 69.8, 0, 20, 20);
    scene.add(light1);

    light2 = addLight(205, 92, 59, 35, 25, -70);
    scene.add(light2);

    light3 = addLight(305.73, 100, 69.8, -55, 25, -60);
    scene.add(light3);

    light4 = addLight(205, 92, 59, 0, 45, -150);
    scene.add(light4);
    scene.add(ambient);
    
    function addLight( h, s, l, x, y, z ) {

        let light = new THREE.PointLight( 0xffffff, 5, 150 );
        light.color.setHSL( h / 360, s / 100, l / 100);
        light.position.set( x, y, z ); 
        scene.add( light );

        var lensflare = new Lensflare();
        lensflare.addElement( new LensflareElement( textureFlare0, 60, 0, light.color ) );

        light.add( lensflare );
        return light;
    } 

    // skybox
    let materialArray = [];
    let texture_ft = new THREE.TextureLoader().load('../images/corona_ft.png');
    let texture_bk = new THREE.TextureLoader().load('../images/corona_bk.png');
    let texture_up = new THREE.TextureLoader().load('../images/corona_up.png');
    let texture_dn = new THREE.TextureLoader().load('../images/corona_dn.png');
    let texture_rt = new THREE.TextureLoader().load('../images/corona_rt.png');
    let texture_lf = new THREE.TextureLoader().load('../images/corona_lf.png');

    materialArray.push(new THREE.MeshBasicMaterial({ map: texture_ft }));
    materialArray.push(new THREE.MeshBasicMaterial({ map: texture_bk }));
    materialArray.push(new THREE.MeshBasicMaterial({ map: texture_up }));
    materialArray.push(new THREE.MeshBasicMaterial({ map: texture_dn }));
    materialArray.push(new THREE.MeshBasicMaterial({ map: texture_rt }));
    materialArray.push(new THREE.MeshBasicMaterial({ map: texture_lf }));

    for (let i = 0; i < 6; i++)
        materialArray[i].side = THREE.BackSide;

    let skyboxGeo = new THREE.BoxGeometry(5000, 5000, 5000);
    let skybox = new THREE.Mesh(skyboxGeo, materialArray);
    scene.add(skybox);

    //stats
    stats = new Stats();
    document.body.appendChild( stats.dom );

    animate();

    window.addEventListener('resize', onWindowResize, true);

}

function onWindowResize() {
    camera.quaternion._x = 0
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {

    requestAnimationFrame(animate);

    render();

}

function setBasicPosture() {
    pianistModel.getObjectByName('mixamorigLeftUpLeg').rotation.x = -1.4;
    pianistModel.getObjectByName('mixamorigRightUpLeg').rotation.x = -1.4;
    pianistModel.getObjectByName('mixamorigRightLeg').rotation.x = 1.3;
    pianistModel.getObjectByName('mixamorigLeftLeg').rotation.x = 1.4;
    pianistModel.getObjectByName('mixamorigSpine2').rotation.x = 0.4;
    pianistModel.getObjectByName('mixamorigLeftLeg').rotation.x = 1.4;
    pianistModel.getObjectByName('mixamorigRightFoot').rotation.x = -0.3;
    pianistModel.getObjectByName('mixamorigLeftHandThumb1').rotation.z = +0.4;
    pianistModel.getObjectByName('mixamorigRightHandThumb1').rotation.z = -0.4;

    pianistModel.getObjectByName('mixamorigRightArm').rotation.x = 0; // ^ upper 
    pianistModel.getObjectByName('mixamorigRightArm').rotation.y = 0.8; // < - > // *-1
    pianistModel.getObjectByName('mixamorigRightArm').rotation.z = 0.55; // ^ upper // *-1
    pianistModel.getObjectByName('mixamorigRightForeArm').rotation.x = 0;
    pianistModel.getObjectByName('mixamorigRightForeArm').rotation.y = 1; // lower left rigt
    pianistModel.getObjectByName('mixamorigRightForeArm').rotation.z = 1; // lower up down // *-1
    pianistModel.getObjectByName('mixamorigRightHand').rotation.x = -0.4; //
    pianistModel.getObjectByName('mixamorigRightHand').rotation.y = 0.4; //*-1
    pianistModel.getObjectByName('mixamorigRightHand').rotation.z = 0.1; //*-1

    setHandById(0, 1);
    setHandById(87, 0);
}

function setHandById(id, track) {
    let modificator = track == 0 ? 1 : -1;
    id = track == 0 ? (id - 88) * -1 : id + 2;
    let position = track == 0 ? "Right" : "Left";
    if (id > pianistPosition.length - 1)
        return;
    let posture = pianistPosition[id];

    for (const [key, value] of Object.entries(posture)) {
        const modifiedKey = key.replace("Position", position);
        pianistModel.getObjectByName(modifiedKey).rotation.x = value.x;
        pianistModel.getObjectByName(modifiedKey).rotation.y = value.y * modificator;
        pianistModel.getObjectByName(modifiedKey).rotation.z = value.z * modificator;
    }
}

function render() {
    let time = Date.now() * 0.0005;

    light1.position.x = Math.sin( time * 0.7 ) * 30;
    light1.position.y = Math.cos( time * 0.5 ) * 40;
    //light1.position.z = Math.cos( time * 0.3 ) * 30;

    light2.position.x = Math.cos( time * 0.3 ) * 30;
    light2.position.y = Math.sin( time * 0.5 ) * 40;
    light2.position.z = Math.sin( time * 0.7 ) * 30;

    light3.position.x = Math.sin( time * 0.7 ) * 30;
    light3.position.y = Math.cos( time * 0.3 ) * 40;
    light3.position.z = Math.sin( time * 0.5 ) * 30;

    light4.position.x = Math.sin( time * 0.3 ) * 30;
    light4.position.y = Math.cos( time * 0.7 ) * 40;
    light4.position.z = Math.sin( time * 0.5 ) * 30;

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
    stats.update();
    renderer.render(scene, camera);

}


let colorNote_w = [0x37a6f7, 0xd237c3];
let colorNote_b = [0x2786ca, 0xa92b9d];
let createBox = function (pianoKey, width, data) {
    let color = colorNote_b[data.track % 2];
    if (pianoKey.isWhite)
        color = colorNote_w[data.track % 2];
    const velocity = data.velocity * 10;
    const datatime = data.time * 10;
    const geometry = new THREE.BoxGeometry(width, velocity, 1);
    const material = new THREE.MeshLambertMaterial({ color: color, transparent: true, opacity: 1, side: THREE.DoubleSide });
    const edges = new THREE.EdgesGeometry(geometry);

    let box = new THREE.Mesh(geometry, material);
    let line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));

    box.position.y = datatime + velocity / 2;
    box.position.x = pianoKey.box.position.x;
    line.position.y = datatime + velocity / 2;
    line.position.x = pianoKey.box.position.x;
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
    for (const box of futurBoxs) {
        scene.remove(box.box);
        scene.remove(box.line);
    }
    futurBoxs = [];
    if (mididata == undefined)
        return;
    for (let data of mididata) {
        if (data.msg.subtype == "noteOn") {
            let n = data.msg.noteNumber - 21;
            let width;
            let pianoKey = pianoKeys[n];
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

let createGui = function () {

    panel = new GUI({ width: 310 });
    let playerFolder = panel.addFolder('Player');

    settings = {
        'Volume': 20,
        'Pause/Play': pausePlayStop,
        'Next Song': () => player.getNextSong(+1),
        'Previous Song': () => player.getNextSong(-1),
        'Show notes': true,
        'Show model': true,
        'Show skeleton': false,
        'Show piano model': true,
    }
    playerFolder.add(settings, "Volume", 0, 100, 1).onChange(SetVolume);
    playerFolder.add(settings, "Pause/Play");
    playerFolder.add(settings, "Next Song");
    playerFolder.add(settings, "Previous Song");
    playerFolder.add(settings, 'Show notes').onChange(showNotes);


    const elements = document.getElementsByClassName("closed");
    for (let el of elements) {
        el.className = "open";
        console.log(el)
    }
    const el2 = document.getElementsByClassName("closed");
    console.log(el2)

}

let showNotes = function (visible) {
    for (const box of futurBoxs) {
        box.box.visible = visible;
        box.line.visible = visible;
    }
}

let showSkeleton = function (visible) {
    skeleton.visible = visible;
}

let showPianist = function (visible) {
    pianistModel.visible = visible;
}

let showPiano = function (visible) {
    pianoModel.visible = visible;
}

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

    let place;
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
    if (stop) {
        MIDI.Player.stop();
    } else if (MIDI.Player.playing) {
        MIDI.Player.pause(true);
    } else {
        MIDI.Player.resume();
    }
}

document.getElementById("body").addEventListener("drop", dropHandler);
document.getElementById("body").addEventListener("dragover", dragOverHandler);
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
            createGui();
            init();
            animate();
            player = MIDI.Player;
            MIDI.setVolume(0, 20);
            player.loadFile(song[songid % song.length]);
            addTimecode();
            player.addListener(function (data) {
                let pianoKey = data.note - 21;
                if (data.message === 144) {
                    setKey(pianoKey, true);
                    setHandById(pianoKey, data.track);
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

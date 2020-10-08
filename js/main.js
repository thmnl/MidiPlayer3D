import * as THREE from './three/three.module.js';
import { OrbitControls } from './three/OrbitControls.js';
import { GUI } from './three/dat.gui.module.js';
import { GLTFLoader } from './three/loaders/GLTFLoader.js';
import { DRACOLoader } from './three/loaders/DRACOLoader.js';
import Stats from './three/stats.module.js';
import { Lensflare, LensflareElement } from './three/Lensflare.js';

var camera, controls, scene, renderer, pianoKeys, player, futurBoxs = [], pianoFloor = 20, stats;
var pianistModel, skeleton, pianoModel, panel, settings, light1, light2, light3, light4;
var t1 = Date.now(), previouscurrentTime = -1, currentTime = 0, clock = new THREE.Clock();
var mixamorig, rigHelper, headTarget = 0, futurAverage, headTargetTime, headStarty;

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
        document.getElementById("pianoLoading").innerHTML = "";
        pianoModel = gltf.scene;
        pianoModel.position.set(43, -30 + pianoFloor, -3);
        pianoModel.scale.set(37, 37, 37);

        scene.add(pianoModel);
        let pianoFolder = panel.addFolder('Piano Model');
        pianoFolder.add(settings, 'Show piano model').onChange(showPiano);

    }, function (xhr) {
        document.getElementById("pianoLoading").innerHTML = "Grand Piano 3D Model loaded at " + (xhr.loaded / xhr.total * 100).toFixed(0) + "%";
    }, function (e) {

        console.error(e);

    });
    //pianist model 
    loader.load('./js/model/Xbot.glb', function (gltf) {

        pianistModel = gltf.scene;
        pianistModel.scale.set(35, 35, 35);
        pianistModel.position.set(0, -20, 16);
        pianistModel.rotation.set(0, 3.15, 0);

        scene.add(pianistModel);

        pianistModel.traverse(function (object) {

            if (object.isMesh) object.castShadow = true;

        });

        skeleton = new THREE.SkeletonHelper(pianistModel);
        skeleton.visible = false;
        setBasicPosture();
        scene.add(skeleton);
        //panel 
        let pianistFolder = panel.addFolder('Pianist Model');
        pianistFolder.add(settings, 'Show model').onChange(showPianist);
        pianistFolder.add(settings, 'Show skeleton').onChange(showSkeleton);


    });

    // lights
    let textureLoader = new THREE.TextureLoader();

    let textureFlare0 = textureLoader.load('../images/lensflare0.png');
    let ambient = new THREE.AmbientLight(0xffffff, 0.5);
    light1 = addLight(305.73, 100, 69.8);
    light2 = addLight(205, 92, 59);
    light3 = addLight(305.73, 100, 69.8);
    light4 = addLight(205, 92, 59);
    scene.add(ambient);

    function addLight(h, s, l) {

        let light = new THREE.PointLight(0xffffff, 5, 150);
        light.color.setHSL(h / 360, s / 100, l / 100);

        var lensflare = new Lensflare();
        lensflare.addElement(new LensflareElement(textureFlare0, 60, 0, light.color));

        light.add(lensflare);
        scene.add(light)
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
    document.body.appendChild(stats.dom);

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
    pianistModel.getObjectByName('mixamorigRightArm').rotation.y = 1.2; // < - > // *-1
    pianistModel.getObjectByName('mixamorigRightArm').rotation.z = 0.6; // ^ upper // *-1
    pianistModel.getObjectByName('mixamorigRightForeArm').rotation.x = 0;
    pianistModel.getObjectByName('mixamorigRightForeArm').rotation.y = 1.4; // lower left rigt // *-1
    pianistModel.getObjectByName('mixamorigRightForeArm').rotation.z = -0.22; // lower up down // *-1
    pianistModel.getObjectByName('mixamorigRightHand').rotation.x = 0.8; //
    pianistModel.getObjectByName('mixamorigRightHand').rotation.y = -0.5; //*-1
    pianistModel.getObjectByName('mixamorigRightHand').rotation.z = -0.15; //*-1
    mixamorig = {
        mixamorigRightArm: pianistModel.getObjectByName('mixamorigRightArm'),
        mixamorigRightForeArm: pianistModel.getObjectByName('mixamorigRightForeArm'),
        mixamorigRightHand: pianistModel.getObjectByName('mixamorigRightHand'),
        mixamorigLeftArm: pianistModel.getObjectByName('mixamorigLeftArm'),
        mixamorigLeftForeArm: pianistModel.getObjectByName('mixamorigLeftForeArm'),
        mixamorigLeftHand: pianistModel.getObjectByName('mixamorigLeftHand'),
        mixamorigHead: pianistModel.getObjectByName('mixamorigHead'),
    }
    rigHelper = {
        mixamorigRightArm: { x: 0, y: 0, z: 0 },
        mixamorigRightForeArm: { x: 0, y: 0, z: 0 },
        mixamorigRightHand: { x: 0, y: 0, z: 0 },
        mixamorigLeftArm: { x: 0, y: 0, z: 0 },
        mixamorigLeftForeArm: { x: 0, y: 0, z: 0 },
        mixamorigLeftHand: { x: 0, y: 0, z: 0 },
        mixamorigHead: { x: 0, y: 0, z: 0 },
        right: {
            startTime: 0,
            targetTime: 0,
            mixamorigRightArm: 0,
            mixamorigRightForeArm: 0,
            mixamorigRightHand: 0,
            average: 0,
        },
        left: {
            startTime: 0,
            targetTime: 0,
            mixamorigLeftArm: 0,
            mixamorigLeftForeArm: 0,
            mixamorigLeftHand: 0,
            average: 0,
        }
    }
}

function translateHead() {
    if (mixamorig == undefined)
        return;
    if (headTarget == mixamorig.mixamorigHead.rotation.y || headTargetTime < currentTime / 1000) {
        if (Math.floor(Math.random() * 50) == 0 && MIDI.Player.playing) {
            if (futurAverage < 20)
                headTarget = 0.7;
            else if (futurAverage < 30)
                headTarget = -0.5;
            else if (futurAverage < 40)
                headTarget = -0.1;
            else if (futurAverage < 50)
                headTarget = 0.1;
            else if (futurAverage < 70)
                headTarget = 0.5;
            else
                headTarget = 0.7;
            headTargetTime = currentTime / 1000 + 0.5
            headStarty = mixamorig.mixamorigHead.rotation.y
        }
        else
            return;
    }
    if (headTargetTime < currentTime / 1000)
        return;
    if (!MIDI.Player.playing)
        return;
    let range = ((currentTime / 1000) - (headTargetTime - 0.5)) / 0.5;
    mixamorig.mixamorigHead.rotation.y = range * (headTarget - headStarty) + headStarty
}


function translateHands(track) {
    if (mididata == undefined || rigHelper == undefined)
        return;
    let nextEvents = [];
    let futurEvents = mididata.filter(data => data.time > currentTime / 1000 && data.track == track && data.msg.subtype == "noteOn")
    let average = 0;
    let helper = track == 0 ? rigHelper.right : rigHelper.left;

    if (futurEvents.length > 0) {
        const timeReference = futurEvents[0].time
        nextEvents = futurEvents.filter(data => data.time == timeReference)
    }
    if (nextEvents.length <= 0)
        return;
    for (let i = 0; i < nextEvents.length; i++) {
        average += nextEvents[i].msg.noteNumber - 21
    }
    if (helper.average != average) {
        helper.startTime = currentTime / 1000
        helper.targetTime = nextEvents[0].time
        if (track == 0) {
            helper.mixamorigRightArm = mixamorig.mixamorigRightArm.rotation
            helper.mixamorigRightForeArm = mixamorig.mixamorigRightForeArm.rotation
            helper.mixamorigRightHand = mixamorig.mixamorigRightHand.rotation
        }
        else {
            helper.mixamorigLeftArm = mixamorig.mixamorigLeftArm.rotation
            helper.mixamorigLeftForeArm = mixamorig.mixamorigLeftForeArm.rotation
            helper.mixamorigLeftHand = mixamorig.mixamorigLeftHand.rotation
        }
        helper.average = average
    }
    futurAverage = average;
    average /= nextEvents.length;
    setHandById(Math.floor(average), track, helper)
}

function setHandById(id, track, helper) {
    if (pianistModel == undefined)
        return;
    let modificator = track == 0 ? 1 : -1;
    id = track == 0 ? (id - 88) * -1 : id + 2;
    let position = track == 0 ? "Right" : "Left";
    if (id > pianistPosition.length - 1)
        return;
    let posture = pianistPosition[id];

    for (const [key, value] of Object.entries(posture)) {
        const modifiedKey = key.replace("Position", position);
        let x, y, z;
        let ctime = currentTime / 1000
        let r = (ctime - helper.startTime) / (helper.targetTime - helper.startTime);
        x = helper[modifiedKey].x;
        y = helper[modifiedKey].y;
        z = helper[modifiedKey].z;
        mixamorig[modifiedKey].rotation.x = r * (value.x - x) + x
        mixamorig[modifiedKey].rotation.y = (r * (value.y * modificator - y) + y);
        mixamorig[modifiedKey].rotation.z = (r * (value.z * modificator - z) + z);
    }
}

function render() {
    let t = clock.getElapsedTime();

    light1.position.x = Math.sin(t * 0.7) * 30;
    light1.position.y = Math.cos(t * 0.5) * 40 + 30;
    light1.position.z = Math.cos(t * 0.3) * 30;

    light2.position.x = Math.cos(t * 0.3) * 30;
    light2.position.y = Math.sin(t * 0.5) * 40 + 30;
    light2.position.z = Math.sin(t * 0.7) * 30;

    light3.position.x = Math.sin(t * 0.7) * 30;
    light3.position.y = Math.cos(t * 0.3) * 40 + 30;
    light3.position.z = Math.sin(t * 0.5) * 30;

    light4.position.x = Math.sin(t * 0.3) * 30;
    light4.position.y = Math.cos(t * 0.7) * 40 + 30;
    light4.position.z = Math.sin(t * 0.5) * 30;

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

    for (let [i, box] of futurBoxs.entries()) {
        box.box.position.y = box.baseY - currentTime / 100;
        box.line.position.y = box.baseY - currentTime / 100;
        if (box.box.position.y < pianoFloor) {
            scene.remove(box.box);
            scene.remove(box.line);
            futurBoxs.splice(i, 1);
            createFuturBox(false);
        }
        if (box.box.position.y > pianoFloor) {
            box.box.visible = settings["Show notes"];
            box.line.visible = settings["Show notes"];
        }
    }
    translateHands(0);
    translateHands(1);
    translateHead();
    controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
    stats.update();
    renderer.render(scene, camera);

}


let colorNote_w = [0x37a6f7, 0xd237c3];
let colorNote_b = [0x2786ca, 0xa92b9d];
let createBox = function (pianoKey, width, data) {
    data.drawn = "true";
    let color = colorNote_b[data.track % 2];
    if (pianoKey.isWhite)
        color = colorNote_w[data.track % 2];
    const velocity = data.velocity * 10;
    const datatime = data.time * 10;
    const geometry = new THREE.BoxGeometry(width, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1, side: THREE.DoubleSide });
    const edges = new THREE.EdgesGeometry(geometry);

    let box = new THREE.Mesh(geometry, material);
    let line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));

    box.scale.y = velocity;
    line.scale.y = velocity;
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
    futurBoxs.push({ box: box, line: line, baseY: datatime + velocity / 2 + pianoFloor, velocity: velocity });
}

let createFuturBox = function (clearBox = true) {
    if (clearBox) {
        for (const box of futurBoxs) {
            scene.remove(box.box);
            scene.remove(box.line);
        }
        futurBoxs = [];
        for (let i = 0; i < mididata.length; i++) {
            mididata[i].drawn = false;
        }
    }
    if (mididata == undefined)
        return;
    for (let data of mididata) {
        if (data.msg.subtype == "noteOn") {
            if (futurBoxs.length > 350)
                return;
            if (data.time < currentTime / 1000 || data.drawn)
                continue;
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
    }
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
            drawn: false,
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
    currentTime = 0;
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
            animate();
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
            currentTime = player.currentTime;
            createFuturBox();
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

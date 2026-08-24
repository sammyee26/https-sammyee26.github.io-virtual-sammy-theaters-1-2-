import * as THREE from "three";

const $ = (id) => document.getElementById(id);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const FORMATS = [
  { name: "Standard Digital", desc: "Classic virtual digital presentation.", profile: { screen: 1, sides: false, motion: 0, lights: 0 } },
  { name: "RealD 3D", desc: "Concept stereoscopic presentation mode; real RealD use requires licensing.", profile: { screen: 1, sides: false, motion: 0, lights: .05, stereoConcept: true } },
  { name: "D-BOX", desc: "Virtual synchronized seat-motion simulation; real D-BOX integration requires permission and hardware.", profile: { screen: 1, sides: false, motion: .45, lights: .05 } },
  { name: "IMAX", desc: "Concept large-format mode with an enlarged screen; real IMAX use requires licensing.", profile: { screen: 1.18, sides: false, motion: 0, lights: .06 } },
  { name: "Sammy's XPAND X", desc: "Expanded immersive side-screen presentation.", profile: { screen: 1.04, sides: true, motion: .08, lights: .15 } },
  { name: "Sammy's 4DS", desc: "Virtual motion, haptics where supported, light and atmosphere simulation.", profile: { screen: 1.02, sides: false, motion: .55, lights: .35, fourD: true } },
  { name: "Sammy's 4DS RealD 3D", desc: "Concept 3D presentation plus Sammy's virtual 4DS effects.", profile: { screen: 1.04, sides: false, motion: .58, lights: .4, fourD: true, stereoConcept: true } },
  { name: "Xtreme Sammy's 4DS", desc: "More elaborate virtual effects with comfort limits.", profile: { screen: 1.06, sides: true, motion: .78, lights: .55, fourD: true } },
  { name: "Sammy's × D-BOX 4DS", desc: "Concept combination mode; real D-BOX use requires permission.", profile: { screen: 1.04, sides: false, motion: .7, lights: .38, fourD: true } },
  { name: "Sammy's × IMAX 4DS", desc: "Concept enlarged-screen 4DS mode; real IMAX use requires permission.", profile: { screen: 1.2, sides: false, motion: .65, lights: .45, fourD: true } },
  { name: "Sammy's × XPAND 4DS", desc: "XPAND X side visuals plus virtual 4DS effects.", profile: { screen: 1.08, sides: true, motion: .68, lights: .5, fourD: true } },
  { name: "Ultimate Sammy's 4DS", desc: "Top-level virtual presentation with expanded screens and richer effects.", profile: { screen: 1.14, sides: true, motion: .75, lights: .6, fourD: true } }
];

const VERSION = "1.2";

const OCCUPIED_SEATS = new Set(["D5", "D6", "G2", "J9"]);
const ROWS = "ABCDEFGHIJKL".split("");
const SEAT_COUNT = 10;

const CONCESSIONS = [
  ["🍿", "Kids Popcorn", "46 oz"], ["🍿", "Small Popcorn", "85 oz"], ["🍿", "Medium Popcorn", "130 oz"],
  ["🍿", "Large Popcorn", "170 oz"], ["🍿", "Extra Large Popcorn", "220 oz"], ["🍿", "Mega Large Popcorn", "300 oz"],
  ["🥤", "Fountain Drink", "Choose your virtual size"], ["🧊", "ICEE", "Frozen drink"], ["🧀", "Nachos", "Warm cheese sauce"],
  ["🍕", "Pizza", "Hot food"], ["🍗", "Chicken Tenders", "Hot food"], ["🍟", "Fries", "Hot food"],
  ["🥨", "Pretzel", "Warm pretzel"], ["🍬", "Candy", "Theater candy"], ["🍭", "Mystery Candy", "Virtual surprise item"]
];

const ARCADE_GAMES = [
  { id: "neon", title: "Neon Speedway", type: "MOTION RACING", desc: "Dodge traffic and build distance.", mode: "lanes" },
  { id: "sky", title: "SkyRail Rush", type: "SIMULATOR RIDE", desc: "Ride an original high-speed sky rail and steer through gates.", mode: "gates" },
  { id: "star", title: "Starfall Blaster", type: "ARCADE GAME", desc: "Aim and blast targets before time runs out.", mode: "targets" },
  { id: "tunnel", title: "Turbo Tunnel", type: "MOTION SIMULATOR", desc: "Move through a twisting tunnel and avoid barriers.", mode: "lanesFast" },
  { id: "rhythm", title: "Rhythm Reactor", type: "RHYTHM GAME", desc: "Hit ACTION when the pulse reaches the center zone.", mode: "rhythm" },
  { id: "orbit", title: "Orbit Hopper", type: "SIMULATOR GAME", desc: "Time your jumps between orbit lanes.", mode: "rhythmFast" },
  { id: "coaster", title: "Comet Run", type: "SIMULATOR RIDE", desc: "An original virtual coaster ride with steering bonuses.", mode: "gatesFast" },
  { id: "drift", title: "Midnight Drift", type: "MOTION RACING", desc: "Fast lane changes, near-misses and score multipliers.", mode: "lanesFast" }
];

const state = {
  started: false,
  zone: "lobby",
  auditorium: 1,
  selectedSeat: null,
  formatByAuditorium: { 1: "Standard Digital", 2: "Standard Digital", 3: "Standard Digital" },
  fileNameByAuditorium: { 1: "", 2: "", 3: "" },
  objectURLByAuditorium: { 1: "", 2: "", 3: "" },
  graphics: "high",
  reducedMotion: false,
  reducedFlashing: false,
  seated: false,
  seatObject: null,
  cart: [],
  orderNumber: null,
  roomReady: false,
  syncChannel: null,
  currentInteractable: null,
  effectsByAuditorium: { 1: [], 2: [], 3: [] },
  automatic4D: true,
  fourDMaster: 75,
  fourDEffects: {
    seatMotion: 100, vibration: 100, wind: 95, airBursts: 90,
    mist: 80, fog: 75, snow: 85, temperature: 70, scents: 60,
    lighting: 90, haptics: 95, rumble: 90
  },
  fourDStopped: false,
  autoActionEnergy: 0,
  outpaintMode: "239",
  outpaintRatio: 2.39,
  outpaintResultDataUrl: "",
  outpaintSourceDataUrl: "",
  outpaintAppliedByAuditorium: {1:false,2:false,3:false},
  originalScreenScale: {},
  countdownRunning: false,
  arcade: null
};

// ---------- SETUP UI ----------
function fillFormatSelect(select) {
  select.innerHTML = "";
  FORMATS.forEach(f => {
    const opt = document.createElement("option");
    opt.value = f.name;
    opt.textContent = f.name;
    select.appendChild(opt);
  });
}
fillFormatSelect($("setupFormat"));

function currentFormatInfo(name) { return FORMATS.find(f => f.name === name) || FORMATS[0]; }
function updateFormatDescription() { $("formatDescription").textContent = currentFormatInfo($("setupFormat").value).desc; }
$("setupFormat").addEventListener("change", updateFormatDescription);
updateFormatDescription();

function buildSeatMap(container, onSelect) {
  container.innerHTML = "";
  ROWS.forEach(row => {
    const line = document.createElement("div");
    line.className = "seat-row";
    const label = document.createElement("div");
    label.className = "row-label";
    label.textContent = row;
    line.appendChild(label);
    for (let n = 1; n <= SEAT_COUNT; n++) {
      const id = `${row}${n}`;
      const btn = document.createElement("button");
      btn.className = "seat";
      btn.textContent = n;
      btn.dataset.seat = id;
      if (OCCUPIED_SEATS.has(id)) {
        btn.classList.add("occupied");
        btn.disabled = true;
      }
      btn.addEventListener("click", () => {
        container.querySelectorAll(".seat.selected").forEach(s => s.classList.remove("selected"));
        btn.classList.add("selected");
        onSelect(id);
      });
      line.appendChild(btn);
    }
    container.appendChild(line);
  });
}

buildSeatMap($("setupSeatMap"), (id) => {
  state.selectedSeat = id;
  $("selectedSeatBadge").textContent = `Seat ${id}`;
});

$("setupFile").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const aud = Number($("setupAuditorium").value);
  loadFileIntoAuditorium(aud, file);
  $("setupFileName").textContent = file.name;
});

$("setupAuditorium").addEventListener("change", () => {
  const aud = Number($("setupAuditorium").value);
  $("setupFileName").textContent = state.fileNameByAuditorium[aud] || "No file loaded yet";
  $("setupFormat").value = state.formatByAuditorium[aud];
  updateFormatDescription();
});

$("setupFormat").addEventListener("change", () => {
  const aud = Number($("setupAuditorium").value);
  state.formatByAuditorium[aud] = $("setupFormat").value;
});

$("enterTheaterButton").addEventListener("click", () => {
  if (!state.selectedSeat) {
    toast("Choose a seat at the kiosk first.");
    return;
  }
  state.auditorium = Number($("setupAuditorium").value);
  state.graphics = $("setupGraphics").value;
  state.reducedMotion = $("reducedMotionSetup").checked;
  $("graphicsSetting").value = state.graphics;
  $("reducedMotion").checked = state.reducedMotion;
  applyGraphicsQuality();
  $("setupScreen").style.display = "none";
  document.body.classList.add("started");
  state.started = true;
  setZone("lobby");
  updateHUD();
  toast("Welcome to Virtual Sammy Theaters 1.2!");
});

// ---------- THREE.JS ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x040711);
scene.fog = new THREE.Fog(0x040711, 35, 140);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 250);
camera.position.set(0, 1.7, 18);
camera.rotation.order = "YXZ";

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$("stage").appendChild(renderer.domElement);

const ambient = new THREE.HemisphereLight(0x9fbaff, 0x171018, 1.7);
scene.add(ambient);
const keyLight = new THREE.DirectionalLight(0xffffff, 1.9);
keyLight.position.set(8, 16, 10);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
scene.add(keyLight);
const accentLight = new THREE.PointLight(0x4f78ff, 75, 60, 2);
accentLight.position.set(0, 6, 10);
scene.add(accentLight);

function material(color, roughness = .65, metalness = .05) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
function box(w, h, d, color, x, y, z, parent, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material(color, opts.roughness ?? .65, opts.metalness ?? .04));
  mesh.position.set(x,y,z);
  mesh.castShadow = opts.castShadow ?? true;
  mesh.receiveShadow = opts.receiveShadow ?? true;
  (parent || scene).add(mesh);
  return mesh;
}
function canvasTexture(title, subtitle = "", colors = ["#163a7a", "#0b1024"]) {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 512;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0,0,c.width,c.height); g.addColorStop(0,colors[0]); g.addColorStop(1,colors[1]);
  ctx.fillStyle = g; ctx.fillRect(0,0,c.width,c.height);
  ctx.textAlign = "center"; ctx.fillStyle = "#ffd84f"; ctx.font = "900 68px Arial"; ctx.fillText(title,512,225);
  ctx.fillStyle = "#fff"; ctx.font = "34px Arial"; ctx.fillText(subtitle,512,305);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function sign(title, subtitle, x,y,z,w,h,parent,rotationY=0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({ map: canvasTexture(title, subtitle) }));
  mesh.position.set(x,y,z); mesh.rotation.y = rotationY; (parent || scene).add(mesh); return mesh;
}
function interactive(mesh, action, label, data = {}) {
  mesh.userData.interactive = true;
  mesh.userData.action = action;
  mesh.userData.label = label;
  Object.assign(mesh.userData, data);
  interactables.push(mesh);
  return mesh;
}

const rootGroups = {
  lobby: new THREE.Group(),
  arcade: new THREE.Group(),
  auditorium1: new THREE.Group(),
  auditorium2: new THREE.Group(),
  auditorium3: new THREE.Group()
};
Object.values(rootGroups).forEach(g => scene.add(g));
const interactables = [];

function buildLobby() {
  const g = rootGroups.lobby;
  box(44,.3,46,0x17203a,0,-.15,8,g);
  box(44,8,.4,0x11182b,0,4,31,g);
  box(.4,8,46,0x11182b,-22,4,8,g); box(.4,8,46,0x11182b,22,4,8,g);
  box(44,.3,46,0x0c1121,0,8.2,8,g);
  sign("SAMMY THEATERS", "VIRTUAL THEATER — VERSION 1.2", 0,5.5,30.7,18,5,g);

  // Concessions
  const counter = box(13,2.3,3.4,0x57223e,-13,1.15,14,g,{metalness:.1});
  interactive(counter, "concessions", "Open working concession stand");
  sign("CONCESSIONS", "POPCORN • DRINKS • CANDY • HOT FOOD", -13,5.0,15.8,12,3.6,g);
  for (let i=0;i<5;i++) box(.8,1,.8, i%2?0x2c4b88:0xcd334b, -17+i*2,2.8,14,g);

  // Screening control kiosk
  const kiosk = box(7,2.6,3,0x1f4276,0,1.3,14,g,{metalness:.18});
  interactive(kiosk, "screenings", "Open screening control kiosk");
  sign("SCREENING CONTROL", "FILES • FORMATS • EFFECTS", 0,4.9,15.6,9,3.4,g);

  // Elevator to arcade
  const elevator = box(7,4.4,.7,0x30384f,13,2.2,14,g,{metalness:.55,roughness:.3});
  interactive(elevator, "arcade", "Take elevator to 2nd Floor Arcade");
  sign("2ND FLOOR", "SAMMY THEATERS ARCADE", 13,5.2,15.1,8,3,g);

  // Auditorium doors
  [-10,0,10].forEach((x,index) => {
    const id = index+1;
    const frame = box(7,6,.6,0x171d2c,x,3,-7,g);
    const door = box(5.5,5,.5,0x23355d,x,2.5,-6.65,g,{metalness:.2});
    interactive(door, "auditorium", `Enter Auditorium ${id}`, { auditorium: id });
    sign(`AUDITORIUM ${id}`, `SCREENING AREA ${id}`, x,6.6,-6.5,6,2.1,g);
    frame.castShadow = false;
  });

  // decorative columns / benches
  for (const x of [-18,18]) {
    box(1.2,7,1.2,0x1b2847,x,3.5,1,g);
    box(5,.6,1.8,0x352642,x,.45,3,g);
  }

  const info = box(5,2.2,1.6,0x2b3554,-16,1.1,-1,g);
  interactive(info,"updates","Open weekly update center");
  sign("WHAT'S NEW", "WEEKLY UPDATES", -16,3.6,-.1,5,2.5,g);
}

function buildArcade() {
  const g = rootGroups.arcade;
  box(46,.3,48,0x10182f,0,-.15,7,g);
  box(46,8,.4,0x101529,0,4,31,g); box(.4,8,48,0x101529,-23,4,7,g); box(.4,8,48,0x101529,23,4,7,g);
  box(46,.3,48,0x080d1b,0,8.2,7,g);
  sign("SAMMY THEATERS ARCADE", "2ND FLOOR • ORIGINAL GAMES & SIMULATORS", 0,5.4,30.7,19,5,g);
  const elevator = box(7,4.4,.7,0x30384f,18,2.2,20,g,{metalness:.55,roughness:.3});
  interactive(elevator,"lobby","Take elevator to Main Lobby");
  sign("ELEVATOR", "1ST FLOOR LOBBY",18,5.1,20.5,6,2.6,g);

  const positions = [
    [-15,15],[-5,15],[5,15],[15,15],[-15,3],[-5,3],[5,3],[15,3]
  ];
  ARCADE_GAMES.forEach((game,i) => {
    const [x,z] = positions[i];
    const cabinet = box(5,5,4, i%2?0x26457e:0x542f70, x,2.5,z,g,{metalness:.15});
    interactive(cabinet,"arcadeGame",`Play ${game.title}`,{gameId:game.id});
    sign(game.title.toUpperCase(), game.type, x,5.8,z+2.05,5,2.4,g);
  });

  sign("EXPANSION AREA", "ROOM FOR FUTURE WEEKLY ARCADE GAMES", 0,4.2,-13,13,4,g);
}

const videoTextures = {};
const placeholderTextures = {};
const auditoriumData = {};

function makePlaceholderTexture(id) {
  if (!placeholderTextures[id]) placeholderTextures[id] = canvasTexture(`AUDITORIUM ${id}`, "LOAD A LOCAL SCREENING FROM THE LOBBY");
  return placeholderTextures[id];
}

function getVideoTexture(id) {
  const video = $(`screeningVideo${id}`);
  if (!videoTextures[id]) {
    videoTextures[id] = new THREE.VideoTexture(video);
    videoTextures[id].colorSpace = THREE.SRGBColorSpace;
    videoTextures[id].minFilter = THREE.LinearFilter;
    videoTextures[id].magFilter = THREE.LinearFilter;
  }
  return state.objectURLByAuditorium[id] ? videoTextures[id] : makePlaceholderTexture(id);
}

function buildAuditorium(id, accent) {
  const g = rootGroups[`auditorium${id}`];
  box(38,.3,58,0x0b0d15,0,-.15,-10,g);
  box(.5,11,58,0x080a11,-19,5.5,-10,g); box(.5,11,58,0x080a11,19,5.5,-10,g);
  box(38,11,.5,0x050609,0,5.5,-39,g); box(38,.3,58,0x060812,0,11.1,-10,g);
  const exit = box(5,5,.6,0x25365e,15,2.5,18.5,g);
  interactive(exit,"lobby","Return to Main Lobby");
  sign("EXIT TO LOBBY",`AUDITORIUM ${id}`,15,5.8,18.15,5,2.2,g);

  const screenMat = new THREE.MeshBasicMaterial({ map: getVideoTexture(id), toneMapped:false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(25,10.6), screenMat);
  screen.position.set(0,5.9,-38.65); g.add(screen);

  const leftMat = new THREE.MeshBasicMaterial({ map:getVideoTexture(id), toneMapped:false });
  const rightMat = new THREE.MeshBasicMaterial({ map:getVideoTexture(id), toneMapped:false });
  const sideL = new THREE.Mesh(new THREE.PlaneGeometry(8,7), leftMat); sideL.position.set(-16,5.3,-32); sideL.rotation.y = Math.PI/2.45; sideL.visible=false; g.add(sideL);
  const sideR = new THREE.Mesh(new THREE.PlaneGeometry(8,7), rightMat); sideR.position.set(16,5.3,-32); sideR.rotation.y = -Math.PI/2.45; sideR.visible=false; g.add(sideR);

  const outpaintBackdropMat = new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false,side:THREE.DoubleSide});
  const outpaintBackdrop = new THREE.Mesh(new THREE.PlaneGeometry(34,15),outpaintBackdropMat);
  outpaintBackdrop.position.set(0,5.9,-38.78); outpaintBackdrop.visible=false; g.add(outpaintBackdrop);

  const outpaintPanoMat = new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false,side:THREE.BackSide,transparent:true,opacity:.94});
  const outpaintPano = new THREE.Mesh(new THREE.CylinderGeometry(29,29,13,72,1,true,0,Math.PI*2),outpaintPanoMat);
  outpaintPano.position.set(0,5.4,-7); outpaintPano.rotation.y=Math.PI; outpaintPano.visible=false; g.add(outpaintPano);

  const lights = [];
  [-14,-7,0,7,14].forEach(x => {
    const l = new THREE.PointLight(accent,35,26,2); l.position.set(x,7.8,-8); g.add(l); lights.push(l);
  });
  const screenGlow = new THREE.PointLight(0xaec9ff,55,45,2); screenGlow.position.set(0,6,-34); g.add(screenGlow);

  const seatData = {};
  ROWS.forEach((row,rowIndex) => {
    const z = -28 + rowIndex * 3.7;
    for (let n=1;n<=SEAT_COUNT;n++) {
      const x = n<=5 ? -13 + (n-1)*2.3 : 3.8 + (n-6)*2.3;
      const seatId = `${row}${n}`;
      const occupied = OCCUPIED_SEATS.has(seatId);
      const baseMat = material(occupied ? 0x64293b : 0x243b72,.55,.08);
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.55,.48,1.35),baseMat); base.position.set(x,.82,z); base.castShadow=true; base.receiveShadow=true; g.add(base);
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.55,1.45,.38),baseMat); back.position.set(x,1.5,z+.62); back.castShadow=true; g.add(back);
      base.userData.vst12BasePos=base.position.clone(); base.userData.vst12BaseRot=base.rotation.clone();
      back.userData.vst12BasePos=back.position.clone(); back.userData.vst12BaseRot=back.rotation.clone();
      const picker = new THREE.Mesh(new THREE.BoxGeometry(1.75,2,1.7),new THREE.MeshBasicMaterial({transparent:true,opacity:.002,depthWrite:false}));
      picker.position.set(x,1.2,z);
      interactive(picker,"seat", occupied ? `Seat ${seatId} occupied` : `Sit in Seat ${seatId}`, {seatId,auditorium:id,occupied,parts:[base,back],x,z});
      g.add(picker);
      seatData[seatId] = picker.userData;
    }
  });

  auditoriumData[id] = { group:g, screen, sideL, sideR, outpaintBackdrop, outpaintPano, lights, screenGlow, seatData };
}

buildLobby();
buildArcade();
buildAuditorium(1,0x537eff);
buildAuditorium(2,0xb763ff);
buildAuditorium(3,0x3ac9c0);

function updateAuditoriumTextures(id) {
  const data = auditoriumData[id];
  if (!data) return;
  const tex = getVideoTexture(id);
  data.screen.material.map = tex; data.screen.material.needsUpdate = true;
  data.sideL.material.map = tex; data.sideL.material.needsUpdate = true;
  data.sideR.material.map = tex; data.sideR.material.needsUpdate = true;
}

function applyFormatToAuditorium(id) {
  const data = auditoriumData[id];
  if (!data) return;
  const fmt = currentFormatInfo(state.formatByAuditorium[id]);
  const p = fmt.profile;
  data.screen.scale.set(p.screen,p.screen,1);
  data.sideL.visible = !!p.sides;
  data.sideR.visible = !!p.sides;
  data.lights.forEach((l,i) => l.intensity = 22 + p.lights*35 + (i%2)*4);
  data.screenGlow.intensity = 45 + p.lights*30;
}

[1,2,3].forEach(applyFormatToAuditorium);

function setZone(zone) {
  state.zone = zone;
  Object.entries(rootGroups).forEach(([name,g]) => g.visible = name === zone);
  state.seated = false;
  state.seatObject = null;
  $("seatedControls").classList.remove("visible");
  if (zone === "lobby") camera.position.set(0,1.7,22);
  else if (zone === "arcade") camera.position.set(0,1.7,24);
  else if (zone.startsWith("auditorium")) camera.position.set(0,1.7,16);
  yaw = 0; pitch = 0;
  updateHUD();
}

function enterAuditorium(id) {
  state.auditorium = id;
  applyFormatToAuditorium(id);
  setZone(`auditorium${id}`);
  const chosen = auditoriumData[id].seatData[state.selectedSeat];
  if (chosen && !chosen.occupied) chosen.parts.forEach(p => p.material.color.set(0xffd84f));
  toast(`Entered Auditorium ${id}. Your reserved seat is ${state.selectedSeat}.`);
}

// ---------- FILE LOADING / SCREENING MANAGER ----------
function loadFileIntoAuditorium(id, file) {
  if (!file || !file.type.startsWith("video/")) { toast("Choose a supported video file."); return; }
  if (state.objectURLByAuditorium[id]) URL.revokeObjectURL(state.objectURLByAuditorium[id]);
  const url = URL.createObjectURL(file);
  state.objectURLByAuditorium[id] = url;
  state.fileNameByAuditorium[id] = file.name;
  const video = $(`screeningVideo${id}`);
  video.src = url;
  video.load();
  updateAuditoriumTextures(id);
  refreshScreeningManager();
  updateHUD();
  toast(`${file.name} loaded into Auditorium ${id}.`);
}

function refreshScreeningManager() {
  const host = $("screeningManager"); host.innerHTML = "";
  [1,2,3].forEach(id => {
    const card = document.createElement("article"); card.className = "screening-card";
    const title = document.createElement("h3"); title.textContent = `Auditorium ${id}`; card.appendChild(title);
    const fileLabel = document.createElement("div"); fileLabel.textContent = state.fileNameByAuditorium[id] || "No local video loaded"; card.appendChild(fileLabel);
    const file = document.createElement("input"); file.type="file"; file.accept="video/*"; file.addEventListener("change", e => loadFileIntoAuditorium(id,e.target.files?.[0])); card.appendChild(file);
    const select = document.createElement("select"); fillFormatSelect(select); select.value = state.formatByAuditorium[id];
    select.addEventListener("change", () => { state.formatByAuditorium[id]=select.value; applyFormatToAuditorium(id); updateHUD(); }); card.appendChild(select);
    const actions = document.createElement("div"); actions.className = "mini-actions";
    const visit = document.createElement("button"); visit.textContent="Enter room"; visit.onclick=()=>{closeModal();enterAuditorium(id);}; actions.appendChild(visit);
    const analyze = document.createElement("button"); analyze.textContent="Auto Analyze 4DS"; analyze.onclick=()=>analyzeVideoForEffects(id); actions.appendChild(analyze);
    const cue = document.createElement("button"); cue.textContent="Add cue now"; cue.onclick=()=>addManualCue(id); actions.appendChild(cue);
    const clear = document.createElement("button"); clear.textContent="Clear cues"; clear.onclick=()=>{state.effectsByAuditorium[id]=[];refreshScreeningManager();}; actions.appendChild(clear);
    card.appendChild(actions);
    const list = document.createElement("div"); list.className="effects-list";
    const cues = state.effectsByAuditorium[id];
    list.textContent = cues.length ? cues.map(c=>`${c.time.toFixed(1)}s — ${c.type}`).join("\n") : "No 4DS cues yet.";
    list.style.whiteSpace="pre-wrap"; card.appendChild(list);
    host.appendChild(card);
  });
}
refreshScreeningManager();

function waitForEvent(el, event) { return new Promise(resolve => el.addEventListener(event, resolve, {once:true})); }
async function analyzeVideoForEffects(id) {
  const video = $(`screeningVideo${id}`);
  if (!state.objectURLByAuditorium[id]) { toast("Load a local video first."); return; }
  if (!Number.isFinite(video.duration) || video.duration <= 0) { await waitForEvent(video,"loadedmetadata"); }
  const originalTime = video.currentTime; const wasPaused = video.paused; video.pause();
  const canvas = document.createElement("canvas"); canvas.width=64; canvas.height=36; const ctx=canvas.getContext("2d",{willReadFrequently:true});
  const samples = Math.min(24, Math.max(8, Math.floor(video.duration/4)));
  const cues=[]; let previous=null;
  toast(`Analyzing ${samples} visual samples…`);
  try {
    for (let i=0;i<samples;i++) {
      const time = (video.duration * i) / samples;
      video.currentTime = Math.min(time, Math.max(0,video.duration-.05));
      await waitForEvent(video,"seeked");
      ctx.drawImage(video,0,0,64,36);
      const data = ctx.getImageData(0,0,64,36).data;
      let lum=0; for(let p=0;p<data.length;p+=4) lum += data[p]*.2126 + data[p+1]*.7152 + data[p+2]*.0722;
      lum /= data.length/4;
      if (previous !== null) {
        const diff = Math.abs(lum-previous);
        if (diff > 8) {
          let type = diff>25 ? "LIGHT + MOTION + RUMBLE" : "MOTION";
          if(diff>18 && i%3===0) type += " + WIND";
          if(diff>30 && i%5===0) type += " + AIR";
          cues.push({time,type});
        } else if (i%4===0) cues.push({time,type:"VIBRATION"});
      }
      previous=lum;
    }
    state.effectsByAuditorium[id]=cues.slice(0,40);
    toast(`Created ${state.effectsByAuditorium[id].length} suggested 4DS cues.`);
  } catch (err) {
    console.error(err); toast("Automatic analysis could not finish on this file/browser.");
  } finally {
    video.currentTime = Math.min(originalTime, video.duration || 0);
    if (!wasPaused) video.play().catch(()=>{});
    refreshScreeningManager();
  }
}

function addManualCue(id) {
  const video = $(`screeningVideo${id}`);
  const type = prompt("Cue type: MOTION, VIBRATION, LIGHT, WIND, AIR, MIST, FOG, SNOW, TEMPERATURE, SCENT, HAPTICS, RUMBLE", "MOTION");
  if (!type) return;
  state.effectsByAuditorium[id].push({time:video.currentTime || 0,type:type.toUpperCase()});
  state.effectsByAuditorium[id].sort((a,b)=>a.time-b.time);
  refreshScreeningManager();
}

// ---------- CONCESSIONS ----------
function buildConcessions() {
  const host=$("concessionGrid"); host.innerHTML="";
  CONCESSIONS.forEach(([emoji,name,desc])=>{
    const card=document.createElement("article"); card.className="concession-item";
    card.innerHTML=`<div class="emoji">${emoji}</div><h3>${name}</h3><p>${desc}</p>`;
    const btn=document.createElement("button"); btn.textContent="ADD TO ORDER"; btn.onclick=()=>{state.cart.push(name);updateCart();};
    card.appendChild(btn); host.appendChild(card);
  });
}
buildConcessions();
function updateCart(){ $("cartSummary").textContent = state.cart.length ? state.cart.join(", ") : "Empty"; }
$("placeOrderButton").addEventListener("click",()=>{
  if(!state.cart.length){toast("Add something to your order first.");return;}
  state.orderNumber = String(Math.floor(100+Math.random()*900));
  $("orderStatus").textContent=`Order #${state.orderNumber} is being prepared…`;
  const items=[...state.cart]; state.cart=[]; updateCart();
  setTimeout(()=>{$("orderStatus").textContent=`Order #${state.orderNumber} READY FOR PICKUP — ${items.join(", ")}`;toast(`Order #${state.orderNumber} is ready!`);},1800);
});

// ---------- INTERACTION / RAYCAST ----------
const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0,0);
function findInteraction() {
  if (!state.started || state.seated || $("modal").classList.contains("open") || $("arcadeGameOverlay").classList.contains("open")) { state.currentInteractable=null; return; }
  raycaster.setFromCamera(center,camera);
  const hits=raycaster.intersectObjects(interactables.filter(o=>o.visible && o.parent?.visible),false);
  state.currentInteractable = hits.find(h=>h.distance<8)?.object || null;
  $("interactionPrompt").textContent = state.currentInteractable ? `INTERACT — ${state.currentInteractable.userData.label}` : "Explore the theater";
}
function interact() {
  const o=state.currentInteractable;
  if(!o){toast("Nothing close enough to interact with.");return;}
  const a=o.userData.action;
  if(["concessions","screenings","updates"].includes(a)) openModal(a);
  else if(a==="arcade"){setZone("arcade");toast("Welcome to the 2nd Floor Sammy Theaters Arcade!");}
  else if(a==="lobby"){setZone("lobby");toast("Returned to the Main Lobby.");}
  else if(a==="auditorium") enterAuditorium(o.userData.auditorium);
  else if(a==="seat") sitInSeat(o.userData);
  else if(a==="arcadeGame") { openModal("arcade"); setTimeout(()=>startArcadeGame(o.userData.gameId),50); }
}

function sitInSeat(data) {
  if(data.occupied){toast(`Seat ${data.seatId} is occupied.`);return;}
  if(data.seatId!==state.selectedSeat){toast(`Your reserved seat is ${state.selectedSeat}. You can still choose ${data.seatId} for this session.`);state.selectedSeat=data.seatId;}
  state.seated=true; state.seatObject=data;
  camera.position.set(data.x,1.72,data.z+.15); yaw=0; pitch=0;
  data.parts.forEach(p=>p.material.color.set(0xffd84f));
  $("seatedControls").classList.add("visible"); updateHUD(); toast(`Seated in ${data.seatId}.`);
}
function leaveSeat(){if(!state.seated)return;state.seated=false;camera.position.set(0,1.7,state.seatObject.z+1.7);$("seatedControls").classList.remove("visible");toast("You left your seat.");}


// ---------- VERSION 1.2 4DS / WIDESCREEN ----------
const actionCanvas = document.createElement("canvas");
actionCanvas.width = 32;
actionCanvas.height = 18;
const actionCtx = actionCanvas.getContext("2d", {willReadFrequently:true});
let previousActionFrame = null;
let lastActionSample = 0;

function master4DScale(){ return THREE.MathUtils.clamp(state.fourDMaster/100,0,1); }
function effectScale(name){ return master4DScale() * THREE.MathUtils.clamp((state.fourDEffects[name] ?? 100)/100,0,1); }

function intensityName(value){
  if(value<=0) return "OFF";
  if(value<38) return "LOW";
  if(value<63) return "MEDIUM";
  if(value<88) return "HIGH";
  return "MAXIMUM";
}

function resetSeatTransforms(id=state.auditorium){
  const data = auditoriumData[id];
  if(!data) return;
  Object.values(data.seatData).forEach(seat=>{
    seat.parts?.forEach(part=>{
      if(part.userData.vst12BasePos) part.position.copy(part.userData.vst12BasePos);
      if(part.userData.vst12BaseRot) part.rotation.copy(part.userData.vst12BaseRot);
    });
  });
}

function setEffectOverlay(name, opacity){
  const map={wind:"windOverlay",fog:"fogOverlay",mist:"mistOverlay",snow:"snowOverlay",temperature:"temperatureOverlay",scents:"scentOverlay"};
  const el=$(map[name]); if(el) el.style.opacity=String(THREE.MathUtils.clamp(opacity,0,1));
}

function clear4DVisuals(){
  ["wind","fog","mist","snow","temperature","scents"].forEach(k=>setEffectOverlay(k,0));
  const data=auditoriumData[state.auditorium];
  if(data) applyFormatToAuditorium(state.auditorium);
}

function updateAutoActionEnergy(now){
  if(!state.automatic4D || state.fourDStopped || now-lastActionSample<320) return;
  const v=activeVideo();
  if(!v || v.paused || v.ended || v.readyState<2) { state.autoActionEnergy*=.9; return; }
  lastActionSample=now;
  try{
    actionCtx.drawImage(v,0,0,actionCanvas.width,actionCanvas.height);
    const data=actionCtx.getImageData(0,0,actionCanvas.width,actionCanvas.height).data;
    const frame=new Uint8Array(actionCanvas.width*actionCanvas.height);
    for(let i=0,p=0;i<data.length;i+=4,p++) frame[p]=(data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722)|0;
    if(previousActionFrame){
      let diff=0;
      for(let i=0;i<frame.length;i++) diff+=Math.abs(frame[i]-previousActionFrame[i]);
      const normalized=THREE.MathUtils.clamp((diff/frame.length)/34,0,1);
      state.autoActionEnergy=state.autoActionEnergy*.55+normalized*.45;
    }
    previousActionFrame=frame;
  }catch(err){
    state.autoActionEnergy*=.92;
  }
}

function applyAutomaticSeatMotion(now){
  const fmt=currentFormatInfo(state.formatByAuditorium[state.auditorium]);
  if(!fmt.profile.fourD || state.fourDStopped || state.reducedMotion) { resetSeatTransforms(); return {x:0,y:0,z:0,tilt:0}; }
  const v=activeVideo();
  if(!v || v.paused) { resetSeatTransforms(); return {x:0,y:0,z:0,tilt:0}; }

  const energy=(state.automatic4D?state.autoActionEnergy:.2);
  const motion=effectScale("seatMotion")*fmt.profile.motion;
  const rumble=effectScale("rumble");
  const phase=v.currentTime||now/1000;
  const tilt=Math.sin(phase*2.25)*0.045*motion*(.25+energy*.95);
  const bank=Math.sin(phase*1.5+1.1)*0.035*motion*(.2+energy);
  const bob=(Math.sin(phase*8.5)*0.012*rumble)*(energy+.1);

  const data=auditoriumData[state.auditorium];
  Object.values(data.seatData).forEach(seat=>{
    seat.parts?.forEach((part,idx)=>{
      if(!part.userData.vst12BasePos){
        part.userData.vst12BasePos=part.position.clone();
        part.userData.vst12BaseRot=part.rotation.clone();
      }
      part.position.copy(part.userData.vst12BasePos);
      part.rotation.copy(part.userData.vst12BaseRot);
      part.position.y += bob;
      part.rotation.x += tilt*(idx===1?1.15:.7);
      part.rotation.z += bank*(idx===1?1:.55);
    });
  });
  return {x:bank*.18,y:bob,z:tilt*.14,tilt};
}

function updateEnvironmentEffects(){
  const fmt=currentFormatInfo(state.formatByAuditorium[state.auditorium]);
  const v=activeVideo();
  if(!fmt.profile.fourD || state.fourDStopped || !v || v.paused){clear4DVisuals();return;}
  const e=state.autoActionEnergy;
  setEffectOverlay("wind", e*.55*effectScale("wind"));
  setEffectOverlay("fog", Math.max(0,e-.18)*.42*effectScale("fog"));
  setEffectOverlay("mist", Math.max(0,e-.42)*.55*effectScale("mist"));
  setEffectOverlay("snow", Math.max(0,e-.65)*.45*effectScale("snow"));
  setEffectOverlay("temperature", Math.max(0,e-.55)*.8*effectScale("temperature"));
  setEffectOverlay("scents", Math.max(0,e-.72)*.75*effectScale("scents"));
  if(!state.reducedFlashing){
    const data=auditoriumData[state.auditorium];
    data.screenGlow.intensity=32+e*55*effectScale("lighting");
  }
}

function update4DUI(){
  const master=$("master4DIntensity");
  if(master) master.value=state.fourDMaster;
  if($("master4DLabel")) $("master4DLabel").textContent=`${state.fourDMaster}% — ${intensityName(state.fourDMaster)}`;
  if($("fourDStateBadge")) $("fourDStateBadge").textContent=state.fourDStopped?"4DS STOPPED":(state.automatic4D?"4DS AUTO":"4DS MANUAL");
  $$("[data-effect]").forEach(input=>{
    const key=input.dataset.effect;
    input.value=state.fourDEffects[key] ?? 100;
    const out=$(`${key}Value`);
    if(out) out.textContent=`${input.value}%`;
  });
}

const OUTPAINT_MODES = {
  "185": { label:"1.85:1", ratio:1.85, preview:"mode-185", kind:"flat" },
  "190": { label:"1.90:1", ratio:1.90, preview:"mode-190", kind:"flat" },
  "200": { label:"2.00:1", ratio:2.00, preview:"mode-200", kind:"flat" },
  "239": { label:"2.39:1", ratio:2.39, preview:"mode-239", kind:"flat" },
  "143": { label:"1.43:1", ratio:1.43, preview:"mode-143", kind:"flat" },
  "270": { label:"270° Immersive", ratio:2.70, preview:"mode-270", kind:"270" },
  "360": { label:"360° Immersive", ratio:3.00, preview:"mode-360", kind:"360" }
};

function outpaintModeInfo(mode=state.outpaintMode){ return OUTPAINT_MODES[mode] || OUTPAINT_MODES["239"]; }

function updateOutpaintPreview(){
  const preview=$("widescreenPreview");
  const badge=$("presentationModeBadge");
  const info=outpaintModeInfo();
  if(preview) preview.className=`widescreen-preview ${info.preview}`;
  if(badge) badge.textContent=info.label;
}

function applyWidescreenRatio(id=state.auditorium){
  const data=auditoriumData[id]; if(!data) return;
  if(!state.originalScreenScale[id]) state.originalScreenScale[id]=data.screen.scale.clone();
  const base=state.originalScreenScale[id];
  const info=outpaintModeInfo();
  state.outpaintRatio=info.ratio;
  // The live movie screen stays near its original size so it remains the protected center.
  const centerScale=info.kind==="flat" ? THREE.MathUtils.clamp((16/9)/info.ratio,.78,1.08) : .82;
  data.screen.scale.set(base.x*centerScale,base.y*centerScale,1);
  updateOutpaintPreview();
}

function restoreOriginalRatio(id=state.auditorium){
  const data=auditoriumData[id];
  if(data && state.originalScreenScale[id]) data.screen.scale.copy(state.originalScreenScale[id]);
  if(data){ data.outpaintBackdrop.visible=false; data.outpaintPano.visible=false; }
  state.outpaintAppliedByAuditorium[id]=false;
  updateOutpaintPreview();
}

function getStoredOutpaintApiUrl(){
  const configured=(window.VST12_CONFIG&&window.VST12_CONFIG.outpaintApiUrl||"").trim();
  const saved=(localStorage.getItem("vst12OutpaintApiUrl")||"").trim();
  if(saved) return saved;
  if(configured) return configured;
  if(!location.hostname.endsWith("github.io")) return "/api/outpaint";
  return "";
}

function normalizeApiUrl(value){
  let url=(value||"").trim();
  if(!url) return "";
  if(url.endsWith("/")) url=url.slice(0,-1);
  if(!url.endsWith("/api/outpaint")) url += "/api/outpaint";
  return url;
}

async function imageElementFromDataUrl(dataUrl){
  return await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=dataUrl;});
}

function downscaleCanvasFromImageSource(source,width,height,maxLong=1280){
  const scale=Math.min(1,maxLong/Math.max(width,height));
  const w=Math.max(2,Math.round(width*scale));
  const h=Math.max(2,Math.round(height*scale));
  const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
  canvas.getContext("2d").drawImage(source,0,0,w,h);
  return canvas.toDataURL("image/jpeg",.9);
}

async function captureCurrentMovieFrame(){
  const video=activeVideo();
  if(!video || !state.objectURLByAuditorium[state.auditorium]) throw new Error("Load a local screening into this auditorium first.");
  if(!video.videoWidth || !video.videoHeight) throw new Error("The movie frame is not ready yet. Play or seek the video, then try again.");
  return downscaleCanvasFromImageSource(video,video.videoWidth,video.videoHeight,1280);
}

async function loadStillImageForOutpaint(file){
  if(!file) throw new Error("Choose a still image first.");
  if(!/^image\/(png|jpeg|webp)$/i.test(file.type)) throw new Error("Use a PNG, JPEG or WebP image.");
  const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
  const img=await imageElementFromDataUrl(dataUrl);
  return downscaleCanvasFromImageSource(img,img.naturalWidth,img.naturalHeight,1280);
}

async function getOutpaintSourceDataUrl(){
  const sourceMode=$("outpaintSourceMode").value;
  if(sourceMode==="image") return await loadStillImageForOutpaint($("outpaintImageFile").files?.[0]);
  return await captureCurrentMovieFrame();
}

function setOutpaintBusy(isBusy,message=""){
  const button=$("requestOutpaintButton");
  if(button){button.disabled=isBusy;button.textContent=isBusy?"GENERATING AI OUTPAINT…":"GENERATE REAL AI OUTPAINT";}
  const stage=$("outpaintEmptyState"); if(stage) stage.classList.toggle("ai-working",isBusy);
  if(message) $("outpaintStatus").textContent=message;
}

async function testOutpaintBackend(){
  const api=normalizeApiUrl($("outpaintApiUrl").value)||getStoredOutpaintApiUrl();
  if(!api){$("outpaintStatus").textContent="Add the deployed AI backend URL first.";return;}
  try{
    const r=await fetch(api,{method:"GET"});const data=await r.json();
    if(!r.ok) throw new Error(data.error||`HTTP ${r.status}`);
    $("outpaintStatus").textContent=data.configured?`AI backend online — ${data.model}.`:`Backend online, but OPENAI_API_KEY is not configured on the server.`;
  }catch(err){$("outpaintStatus").textContent=`AI backend test failed: ${err.message}`;}
}

async function generateRealOutpaint(){
  const api=normalizeApiUrl($("outpaintApiUrl").value)||getStoredOutpaintApiUrl();
  if(!api){$("outpaintStatus").textContent="AI backend URL is missing. Deploy the included /api/outpaint backend, then paste its URL here.";return;}
  try{
    setOutpaintBusy(true,"Capturing the source frame/image…");
    const imageDataUrl=await getOutpaintSourceDataUrl();
    state.outpaintSourceDataUrl=imageDataUrl;
    state.outpaintMode=$("widescreenRatio").value;
    updateOutpaintPreview();
    const body={
      imageDataUrl,
      mode:state.outpaintMode,
      quality:$("outpaintQuality").value,
      prompt:$("outpaintPrompt").value.trim(),
      protectOriginal:$("protectOriginalFrame").checked
    };
    setOutpaintBusy(true,`Generating ${outpaintModeInfo().label} AI surroundings with GPT-Image-2…`);
    const response=await fetch(api,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    let data={};try{data=await response.json();}catch{}
    if(!response.ok) throw new Error(data.error||`AI server returned HTTP ${response.status}`);
    if(!data.imageDataUrl) throw new Error("The AI server did not return an image.");
    state.outpaintResultDataUrl=data.imageDataUrl;
    const img=$("outpaintResultImage");img.src=data.imageDataUrl;img.hidden=false;
    $("outpaintEmptyState").style.display="none";
    $("applyOutpaintButton").disabled=false;
    $("outpaintStatus").textContent=`AI outpaint complete: ${outpaintModeInfo().label}. The live movie stays protected in the center.`;
    applyGeneratedOutpaintToTheater();
    toast("Real AI outpaint generated and applied.");
  }catch(err){
    $("outpaintStatus").textContent=`AI outpaint failed: ${err.message}`;
    toast("AI outpaint failed. Check the Outpaint Studio status.");
  }finally{setOutpaintBusy(false);}
}

function disposeTexture(tex){if(tex&&tex.dispose)tex.dispose();}

function applyGeneratedOutpaintToTheater(id=state.auditorium){
  if(!state.outpaintResultDataUrl){toast("Generate an AI outpaint first.");return;}
  const data=auditoriumData[id];if(!data)return;
  const info=outpaintModeInfo();
  applyWidescreenRatio(id);
  new THREE.TextureLoader().load(state.outpaintResultDataUrl,tex=>{
    tex.colorSpace=THREE.SRGBColorSpace;tex.minFilter=THREE.LinearFilter;tex.magFilter=THREE.LinearFilter;
    if(data.outpaintBackdrop.material.map && data.outpaintBackdrop.material.map!==tex) disposeTexture(data.outpaintBackdrop.material.map);
    if(data.outpaintPano.material.map && data.outpaintPano.material.map!==tex) disposeTexture(data.outpaintPano.material.map);
    data.outpaintBackdrop.material.map=tex;data.outpaintBackdrop.material.needsUpdate=true;
    data.outpaintPano.material.map=tex;data.outpaintPano.material.needsUpdate=true;
    if(info.kind==="flat"){
      data.outpaintPano.visible=false;
      data.outpaintBackdrop.visible=true;
      const height=15; const width=height*info.ratio;
      data.outpaintBackdrop.geometry.dispose();
      data.outpaintBackdrop.geometry=new THREE.PlaneGeometry(width,height);
    }else{
      data.outpaintBackdrop.visible=false;
      data.outpaintPano.visible=true;
      const thetaLength=info.kind==="270"?Math.PI*1.5:Math.PI*2;
      const thetaStart=info.kind==="270"?-Math.PI*.75:0;
      data.outpaintPano.geometry.dispose();
      data.outpaintPano.geometry=new THREE.CylinderGeometry(29,29,13,72,1,true,thetaStart,thetaLength);
    }
    state.outpaintAppliedByAuditorium[id]=true;
    toast(`${info.label} AI surroundings applied to Auditorium ${id}.`);
  },undefined,()=>toast("The generated AI image could not be loaded into the theater."));
}

function clearGeneratedOutpaint(id=state.auditorium){
  const data=auditoriumData[id];if(data){data.outpaintBackdrop.visible=false;data.outpaintPano.visible=false;}
  state.outpaintResultDataUrl="";state.outpaintAppliedByAuditorium[id]=false;
  const img=$("outpaintResultImage");if(img){img.hidden=true;img.removeAttribute("src");}
  if($("outpaintEmptyState")){$("outpaintEmptyState").style.display="grid";$("outpaintEmptyState").textContent="No AI outpaint generated yet.";}
  $("applyOutpaintButton").disabled=true;
  $("outpaintStatus").textContent="AI outpaint cleared.";
}

// ---------- SCREENING PLAYBACK / PREMIUM EFFECTS ----------
let effectPreviewStart=0;
let effectPreview=false;
let lastCueKey="";
function activeVideo(){return $(`screeningVideo${state.auditorium}`);}
async function startCountdownAndPlay(){
  const video=activeVideo(); if(!state.objectURLByAuditorium[state.auditorium]){toast("Load a local video into this auditorium first.");return;}
  if(state.countdownRunning)return; state.countdownRunning=true;
  $("countdownOverlay").classList.add("open");
  for(let n=5;n>=1;n--){$("countdownNumber").textContent=n;await new Promise(r=>setTimeout(r,650));}
  $("countdownNumber").textContent="🎬"; await new Promise(r=>setTimeout(r,500)); $("countdownOverlay").classList.remove("open");
  state.countdownRunning=false; dimAuditorium(state.auditorium,true); video.play().catch(()=>toast("Tap Play again if your browser blocked playback."));
  $("playPauseButton").textContent="⏸ Pause";
  broadcastSync({type:"play",aud:state.auditorium,time:video.currentTime});
}
$("playPauseButton").addEventListener("click",()=>{
  const v=activeVideo();
  if(v.paused) startCountdownAndPlay(); else {v.pause();$("playPauseButton").textContent="▶ Play";broadcastSync({type:"pause",aud:state.auditorium,time:v.currentTime});}
});
$("leaveSeatButton").addEventListener("click",leaveSeat);
$("previewEffectsButton").addEventListener("click",()=>{if(!state.seated)return;effectPreview=true;effectPreviewStart=performance.now();toast("Virtual 4DS preview started.");});

function dimAuditorium(id,on){
  const data=auditoriumData[id]; if(!data)return; const p=currentFormatInfo(state.formatByAuditorium[id]).profile;
  data.lights.forEach(l=>l.intensity=on?3:22+p.lights*35); data.screenGlow.intensity=on?32+p.lights*30:45+p.lights*30;
}
[1,2,3].forEach(id=>{
  const v=$(`screeningVideo${id}`);
  v.addEventListener("ended",()=>{dimAuditorium(id,false);if(state.auditorium===id){$("playPauseButton").textContent="▶ Play";toast("Screening ended. Auditorium lights are coming up.");}});
});

function triggerCue(cue,profile){
  if(state.fourDStopped)return;
  const type=cue.type.toUpperCase();
  if(!state.reducedMotion && (type.includes("VIBRATION")||type.includes("MOTION")) && navigator.vibrate){
    const vib=effectScale("vibration");
    if(vib>.05) navigator.vibrate(type.includes("MOTION")?[Math.round(25*vib),35,Math.round(25*vib)]:Math.round(35*vib));
  }
  if(type.includes("LIGHT")&&!state.reducedFlashing){
    const d=auditoriumData[state.auditorium];
    d.screenGlow.intensity+=35*effectScale("lighting");
    setTimeout(()=>applyFormatToAuditorium(state.auditorium),120);
  }
  if(type.includes("WIND")) setEffectOverlay("wind",.65*effectScale("wind"));
  if(type.includes("MIST")) setEffectOverlay("mist",.6*effectScale("mist"));
  if(type.includes("FOG")) setEffectOverlay("fog",.6*effectScale("fog"));
  if(type.includes("SNOW")) setEffectOverlay("snow",.55*effectScale("snow"));
  toast(`4DS cue: ${cue.type}`);
}

// ---------- MODALS ----------
function openModal(name){
  $("modal").classList.add("open"); $("modal").setAttribute("aria-hidden","false");
  $$(".panel-page").forEach(p=>p.classList.remove("active")); const panel=$(`${name}Panel`); if(panel)panel.classList.add("active");
  if(name==="screenings")refreshScreeningManager(); if(name==="arcade")buildArcadeCards();
  if(document.pointerLockElement)document.exitPointerLock();
}
function closeModal(){ $("modal").classList.remove("open"); $("modal").setAttribute("aria-hidden","true"); }
$("closeModal").addEventListener("click",closeModal);
$$('[data-open]').forEach(b=>b.addEventListener("click",()=>openModal(b.dataset.open)));

// ---------- GRAPHICS / ACCESSIBILITY ----------
function applyGraphicsQuality(){
  const q=state.graphics; const dpr=devicePixelRatio||1;
  const ratio={low:Math.min(1,dpr),medium:Math.min(1.25,dpr),high:Math.min(1.6,dpr),hd:Math.min(2,dpr)}[q];
  renderer.setPixelRatio(ratio); renderer.shadowMap.enabled=q!=="low"; keyLight.castShadow=q==="high"||q==="hd";
  scene.fog.far=q==="low"?95:q==="medium"?115:140; renderer.toneMappingExposure=q==="hd"?1.12:1.04;
}
$("graphicsSetting").addEventListener("change",()=>{state.graphics=$("graphicsSetting").value;applyGraphicsQuality();toast(`Graphics: ${state.graphics.toUpperCase()}`);});
$("reducedMotion").addEventListener("change",()=>state.reducedMotion=$("reducedMotion").checked);
$("reducedFlashing").addEventListener("change",()=>state.reducedFlashing=$("reducedFlashing").checked);
$("uiScale").addEventListener("input",()=>document.documentElement.style.setProperty("--ui-scale",String(Number($("uiScale").value)/100)));
$("masterVolume").addEventListener("input",()=>{const v=Number($("masterVolume").value)/100;[1,2,3].forEach(id=>$(`screeningVideo${id}`).volume=v);});

$("automatic4D").addEventListener("change",()=>{state.automatic4D=$("automatic4D").checked;update4DUI();toast(state.automatic4D?"Automatic 4DS enabled.":"Automatic 4DS disabled.");});
$("master4DIntensity").addEventListener("input",()=>{
  state.fourDMaster=Number($("master4DIntensity").value);
  update4DUI();
});
$$("[data-effect]").forEach(input=>input.addEventListener("input",()=>{
  const key=input.dataset.effect;
  state.fourDEffects[key]=Number(input.value);
  update4DUI();
updateOutpaintPreview();
}));
$("stop4DButton").addEventListener("click",()=>{
  state.fourDStopped=true;
  resetSeatTransforms();
  clear4DVisuals();
  if(navigator.vibrate) navigator.vibrate(0);
  update4DUI();
  toast("4DS motion stopped.");
});
$("neutral4DButton").addEventListener("click",()=>{
  resetSeatTransforms();
  clear4DVisuals();
  toast("Virtual 4DS seats returned to neutral.");
});
$("test4DButton").addEventListener("click",()=>{
  state.fourDStopped=false;
  effectPreview=true;
  effectPreviewStart=performance.now();
  update4DUI();
  toast("4DS test sequence started.");
});

$("widescreenRatio").addEventListener("change",()=>{state.outpaintMode=$("widescreenRatio").value;updateOutpaintPreview();});
$("saveOutpaintApiUrl").addEventListener("click",()=>{
  const url=normalizeApiUrl($("outpaintApiUrl").value);
  if(url){localStorage.setItem("vst12OutpaintApiUrl",url);$("outpaintApiUrl").value=url;$("outpaintStatus").textContent="AI backend URL saved in this browser.";}
  else {localStorage.removeItem("vst12OutpaintApiUrl");$("outpaintStatus").textContent="Saved AI backend URL cleared.";}
});
$("testOutpaintBackend").addEventListener("click",testOutpaintBackend);
$("requestOutpaintButton").addEventListener("click",generateRealOutpaint);
$("applyOutpaintButton").addEventListener("click",()=>applyGeneratedOutpaintToTheater());
$("clearOutpaintButton").addEventListener("click",()=>clearGeneratedOutpaint());
$("restoreRatioButton").addEventListener("click",()=>{restoreOriginalRatio();toast("Original virtual screen restored.");});
$("outpaintSourceMode").addEventListener("change",()=>{
  const imageMode=$("outpaintSourceMode").value==="image";
  $("outpaintImageFile").disabled=!imageMode;
});
$("outpaintImageFile").disabled=true;
$("outpaintApiUrl").value=getStoredOutpaintApiUrl();
update4DUI();
updateOutpaintPreview();

// ---------- LOCAL SYNC TEST ----------
function logServer(text){ $("serverLog").textContent=`${new Date().toLocaleTimeString()} — ${text}\n${$("serverLog").textContent}`.slice(0,1600); }
$("joinLocalRoom").addEventListener("click",()=>{
  const room=$("roomCode").value.trim().toUpperCase()||"SAMMY11";
  if(state.syncChannel)state.syncChannel.close();
  if(!("BroadcastChannel" in window)){logServer("BroadcastChannel is not supported in this browser.");return;}
  state.syncChannel=new BroadcastChannel(`vst-1.2-${room}`);
  state.syncChannel.onmessage=e=>handleSyncMessage(e.data);
  logServer(`Local same-browser sync test joined: ${room}. Open this page in another tab and join the same code to test.`);
});
$("readyButton").addEventListener("click",()=>{state.roomReady=!state.roomReady;$("readyButton").textContent=`READY: ${state.roomReady?"YES":"NO"}`;broadcastSync({type:"ready",value:state.roomReady});});
function broadcastSync(msg){ if(state.syncChannel)state.syncChannel.postMessage({...msg,seat:state.selectedSeat}); }
function handleSyncMessage(msg){
  logServer(`Received ${msg.type}${msg.seat?` from seat ${msg.seat}`:""}.`);
  if(msg.type==="play"){const v=$(`screeningVideo${msg.aud}`);if(state.objectURLByAuditorium[msg.aud]){v.currentTime=msg.time||0;v.play().catch(()=>{});}}
  if(msg.type==="pause"){const v=$(`screeningVideo${msg.aud}`);v.currentTime=msg.time||v.currentTime;v.pause();}
}

// ---------- ARCADE ----------
function buildArcadeCards(){
  const host=$("arcadeGameGrid");host.innerHTML="";
  ARCADE_GAMES.forEach(game=>{
    const card=document.createElement("article");card.className="arcade-card";
    card.innerHTML=`<div class="type">${game.type}</div><h3>${game.title}</h3><p>${game.desc}</p>`;
    const btn=document.createElement("button");btn.textContent="PLAY NOW";btn.onclick=()=>startArcadeGame(game.id);card.appendChild(btn);host.appendChild(card);
  });
}

const arcadeCanvas=$("arcadeCanvas"); const actx=arcadeCanvas.getContext("2d");
const arcadeInput={left:false,right:false,action:false};
let arcadeRAF=0;
function startArcadeGame(id){
  const game=ARCADE_GAMES.find(g=>g.id===id);if(!game)return;
  closeModal(); $("arcadeGameOverlay").classList.add("open"); $("arcadeTitle").textContent=game.title;
  $("arcadeInstructions").textContent = game.mode.includes("targets") ? "Move/tap the pointer and press ACTION or click targets." : game.mode.includes("rhythm") ? "Press ACTION when the moving pulse reaches the gold zone." : "Use LEFT and RIGHT to steer. Avoid obstacles or pass through gates.";
  state.arcade={game,score:0,start:performance.now(),playerX:480,obstacles:[],spawn:0,phase:0,pulse:0};
  cancelAnimationFrame(arcadeRAF);arcadeLoop(performance.now());
}
function stopArcade(){cancelAnimationFrame(arcadeRAF);state.arcade=null;$("arcadeGameOverlay").classList.remove("open");}
$("exitArcadeGame").addEventListener("click",stopArcade);

function arcadeLoop(now){
  if(!state.arcade)return; arcadeRAF=requestAnimationFrame(arcadeLoop);
  const a=state.arcade; const dt=Math.min(.04,(now-(a.last||now))/1000);a.last=now; const t=(now-a.start)/1000;
  actx.fillStyle="#050815";actx.fillRect(0,0,960,540);
  const fast=a.game.mode.toLowerCase().includes("fast");
  if(a.game.mode.includes("lanes")||a.game.mode.includes("gates")){
    const speed=fast?340:240; if(arcadeInput.left)a.playerX-=300*dt;if(arcadeInput.right)a.playerX+=300*dt;a.playerX=Math.max(90,Math.min(870,a.playerX));
    actx.strokeStyle="#274a8d";actx.lineWidth=4;for(let x=120;x<960;x+=180){actx.beginPath();actx.moveTo(x,0);actx.lineTo(x,540);actx.stroke();}
    a.spawn-=dt;if(a.spawn<=0){a.spawn=fast?.55:.85;const isGate=a.game.mode.includes("gates");a.obstacles.push({x:90+Math.random()*780,y:-40,w:isGate?120:70,h:isGate?18:70,gate:isGate});}
    a.obstacles.forEach(o=>o.y+=speed*dt);
    a.obstacles=a.obstacles.filter(o=>{
      actx.fillStyle=o.gate?"#62d5ff":"#e34c6b";actx.fillRect(o.x-o.w/2,o.y,o.w,o.h);
      if(o.y>430&&o.y<500&&Math.abs(o.x-a.playerX)<(o.w/2+28)){
        if(o.gate){if(!o.hit){a.score+=100;o.hit=true;}}else{a.score=Math.max(0,a.score-25);o.y=600;}
      }
      return o.y<580;
    });
    actx.fillStyle="#ffd84f";actx.fillRect(a.playerX-26,460,52,62);a.score+=dt*(fast?18:10);
  } else if(a.game.mode==="targets"){
    a.spawn-=dt;if(a.spawn<=0){a.spawn=.65;a.obstacles.push({x:80+Math.random()*800,y:80+Math.random()*350,r:22+Math.random()*22,life:1.8});}
    a.obstacles.forEach(o=>o.life-=dt);a.obstacles=a.obstacles.filter(o=>o.life>0);
    a.obstacles.forEach(o=>{actx.beginPath();actx.fillStyle="#ffdd5f";actx.arc(o.x,o.y,o.r,0,Math.PI*2);actx.fill();});
    const px=a.pointerX??480,py=a.pointerY??270;actx.strokeStyle="#fff";actx.beginPath();actx.moveTo(px-15,py);actx.lineTo(px+15,py);actx.moveTo(px,py-15);actx.lineTo(px,py+15);actx.stroke();
    if(arcadeInput.action){arcadeInput.action=false;const hit=a.obstacles.find(o=>Math.hypot(o.x-px,o.y-py)<o.r+10);if(hit){a.score+=100;hit.life=0;}}
  } else {
    a.phase=(a.phase+dt*(fast?2.1:1.45))%1;const x=80+a.phase*800;actx.fillStyle="#2d487d";actx.fillRect(430,120,100,300);actx.fillStyle="#ffd84f";actx.fillRect(455,120,50,300);
    actx.beginPath();actx.fillStyle="#74a6ff";actx.arc(x,270,34,0,Math.PI*2);actx.fill();
    if(arcadeInput.action){arcadeInput.action=false;if(Math.abs(x-480)<50)a.score+=150;else a.score=Math.max(0,a.score-40);}
  }
  $("arcadeScore").textContent=`Score: ${Math.floor(a.score)}`;
  actx.fillStyle="#fff";actx.font="700 24px Arial";actx.fillText(a.game.title,24,36);
  if(t>90){actx.fillStyle="rgba(0,0,0,.72)";actx.fillRect(0,0,960,540);actx.fillStyle="#ffd84f";actx.font="900 58px Arial";actx.textAlign="center";actx.fillText(`FINAL SCORE ${Math.floor(a.score)}`,480,270);actx.textAlign="left";}
}
arcadeCanvas.addEventListener("pointermove",e=>{if(!state.arcade)return;const r=arcadeCanvas.getBoundingClientRect();state.arcade.pointerX=(e.clientX-r.left)/r.width*960;state.arcade.pointerY=(e.clientY-r.top)/r.height*540;});
arcadeCanvas.addEventListener("pointerdown",e=>{if(!state.arcade)return;const r=arcadeCanvas.getBoundingClientRect();state.arcade.pointerX=(e.clientX-r.left)/r.width*960;state.arcade.pointerY=(e.clientY-r.top)/r.height*540;arcadeInput.action=true;});
$$('[data-arcade-key]').forEach(b=>{const key=b.dataset.arcadeKey;b.addEventListener("pointerdown",e=>{e.preventDefault();arcadeInput[key]=true;});["pointerup","pointercancel","pointerleave"].forEach(ev=>b.addEventListener(ev,()=>arcadeInput[key]=false));});

// ---------- DESKTOP / MOBILE CONTROLS ----------
const keys={forward:false,back:false,left:false,right:false};
let yaw=0,pitch=0;
addEventListener("keydown",e=>{
  if($("arcadeGameOverlay").classList.contains("open")){
    if(e.key==="ArrowLeft"||e.key.toLowerCase()==="a")arcadeInput.left=true;
    if(e.key==="ArrowRight"||e.key.toLowerCase()==="d")arcadeInput.right=true;
    if(e.key===" "||e.key.toLowerCase()==="e")arcadeInput.action=true;
    return;
  }
  const k=e.key.toLowerCase(); if(k==="w")keys.forward=true;if(k==="s")keys.back=true;if(k==="a")keys.left=true;if(k==="d")keys.right=true;if(k==="e")interact();if(k==="escape")closeModal();
});
addEventListener("keyup",e=>{const k=e.key.toLowerCase();if(k==="w")keys.forward=false;if(k==="s")keys.back=false;if(k==="a"){keys.left=false;arcadeInput.left=false;}if(k==="d"){keys.right=false;arcadeInput.right=false;}if(e.key==="ArrowLeft")arcadeInput.left=false;if(e.key==="ArrowRight")arcadeInput.right=false;});
renderer.domElement.addEventListener("click",()=>{if(!matchMedia("(pointer: coarse)").matches&&!$("modal").classList.contains("open"))renderer.domElement.requestPointerLock();});
addEventListener("mousemove",e=>{if(document.pointerLockElement!==renderer.domElement)return;yaw-=e.movementX*.002;pitch-=e.movementY*.002;pitch=THREE.MathUtils.clamp(pitch,-1.2,1.2);});

let joyPointer=null,joyX=0,joyY=0;const JOY_RADIUS=48;
function updateJoy(x,y){const r=$("joystickArea").getBoundingClientRect();let dx=x-(r.left+r.width/2),dy=y-(r.top+r.height/2);const d=Math.hypot(dx,dy);if(d>JOY_RADIUS){dx=dx/d*JOY_RADIUS;dy=dy/d*JOY_RADIUS;}joyX=dx/JOY_RADIUS;joyY=dy/JOY_RADIUS;$("joystickStick").style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;}
$("joystickArea").addEventListener("pointerdown",e=>{joyPointer=e.pointerId;$("joystickArea").setPointerCapture(e.pointerId);updateJoy(e.clientX,e.clientY);});
$("joystickArea").addEventListener("pointermove",e=>{if(e.pointerId===joyPointer)updateJoy(e.clientX,e.clientY);});
function resetJoy(e){if(e.pointerId!==joyPointer)return;joyPointer=null;joyX=joyY=0;$("joystickStick").style.transform="translate(-50%,-50%)";}
$("joystickArea").addEventListener("pointerup",resetJoy);$("joystickArea").addEventListener("pointercancel",resetJoy);
let lookPointer=null,lastLookX=0,lastLookY=0;
$("lookZone").addEventListener("pointerdown",e=>{if($("modal").classList.contains("open"))return;lookPointer=e.pointerId;lastLookX=e.clientX;lastLookY=e.clientY;$("lookZone").setPointerCapture(e.pointerId);});
$("lookZone").addEventListener("pointermove",e=>{if(e.pointerId!==lookPointer)return;const dx=e.clientX-lastLookX,dy=e.clientY-lastLookY;lastLookX=e.clientX;lastLookY=e.clientY;yaw-=dx*.006;pitch-=dy*.006;pitch=THREE.MathUtils.clamp(pitch,-1.2,1.2);});
$("lookZone").addEventListener("pointerup",e=>{if(e.pointerId===lookPointer)lookPointer=null;});
$("mobileInteract").addEventListener("pointerdown",e=>{e.stopPropagation();interact();});

const forwardVec=new THREE.Vector3(),rightVec=new THREE.Vector3(),moveVec=new THREE.Vector3();
function movePlayer(dt){
  if(!state.started||state.seated||$("modal").classList.contains("open")||$("arcadeGameOverlay").classList.contains("open"))return;
  let f=(keys.forward?1:0)-(keys.back?1:0)-joyY;let s=(keys.right?1:0)-(keys.left?1:0)+joyX;if(Math.abs(f)<.05&&Math.abs(s)<.05)return;
  forwardVec.set(-Math.sin(yaw),0,-Math.cos(yaw));rightVec.set(Math.cos(yaw),0,-Math.sin(yaw));moveVec.set(0,0,0).addScaledVector(forwardVec,f).addScaledVector(rightVec,s);if(moveVec.lengthSq()>1)moveVec.normalize();moveVec.multiplyScalar(6.2*dt);
  camera.position.add(moveVec);camera.position.y=1.7;
  // generous zone bounds
  camera.position.x=THREE.MathUtils.clamp(camera.position.x,-20.5,20.5);camera.position.z=THREE.MathUtils.clamp(camera.position.z,-36,29);
}

// ---------- HUD / TOAST ----------
function updateHUD(){
  const zoneNames={lobby:"Main Lobby",arcade:"2nd Floor Arcade",auditorium1:"Auditorium 1",auditorium2:"Auditorium 2",auditorium3:"Auditorium 3"};
  $("hudZone").textContent=zoneNames[state.zone]||state.zone;
  $("hudScreening").textContent=state.fileNameByAuditorium[state.auditorium]||"No screening loaded";
  $("hudFormat").textContent=state.formatByAuditorium[state.auditorium];
  $("hudSeat").textContent=`Seat: ${state.selectedSeat||"—"}`;
}
let toastTimer=0;function toast(text){$("toast").textContent=text;$("toast").style.opacity="1";clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").style.opacity=".45",3200);}

// ---------- EFFECT UPDATE / RENDER LOOP ----------
const clock=new THREE.Clock();
function updatePremiumEffects(now){
  if(!state.seated)return;
  const fmt=currentFormatInfo(state.formatByAuditorium[state.auditorium]);const p=fmt.profile;
  const v=activeVideo();

  updateAutoActionEnergy(now);
  const seatMotion=applyAutomaticSeatMotion(now);
  updateEnvironmentEffects();

  let shake=0;
  if(effectPreview){
    const t=(now-effectPreviewStart)/1000;
    if(t<6){
      const previewEnergy=.55+.45*Math.sin(t*2.4)**2;
      state.autoActionEnergy=Math.max(state.autoActionEnergy,previewEnergy);
      shake=(Math.sin(t*12)*.018+Math.sin(t*5)*.025)*p.motion*effectScale("seatMotion");
      if(t>3&&!state.reducedFlashing)auditoriumData[state.auditorium].screenGlow.intensity=70*effectScale("lighting")+20;
      setEffectOverlay("wind",.55*effectScale("wind"));
      if(t>2)setEffectOverlay("fog",.35*effectScale("fog"));
      if(t>3)setEffectOverlay("mist",.32*effectScale("mist"));
    }else{
      effectPreview=false;
      applyFormatToAuditorium(state.auditorium);
      clear4DVisuals();
      toast("4DS preview complete.");
    }
  }

  if(!v.paused&&p.motion>0&&!state.reducedMotion&&!state.fourDStopped){
    shake += Math.sin(v.currentTime*7)*.004*p.motion*effectScale("rumble")*(.2+state.autoActionEnergy);
  }

  if(state.seatObject){
    camera.position.x=state.seatObject.x+shake+seatMotion.x;
    camera.position.y=1.72+seatMotion.y;
    camera.position.z=state.seatObject.z+.15+seatMotion.z;
    pitch = THREE.MathUtils.clamp(seatMotion.tilt*.55,-.2,.2);
  }

  if(!v.paused&&state.effectsByAuditorium[state.auditorium].length){
    const cue=state.effectsByAuditorium[state.auditorium].find(c=>Math.abs(c.time-v.currentTime)<.08);
    const key=cue?`${state.auditorium}-${cue.time}-${cue.type}`:"";
    if(cue&&key!==lastCueKey){lastCueKey=key;triggerCue(cue,p);}
    if(!cue)lastCueKey="";
  }
}
function animate(now){
  requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);movePlayer(dt);findInteraction();updatePremiumEffects(now);
  camera.rotation.y=yaw;camera.rotation.x=pitch;renderer.render(scene,camera);
}
animate(performance.now());

addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
applyGraphicsQuality();


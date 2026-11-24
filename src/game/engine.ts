import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CameraMode,
  GamePhase,
  HudSnapshot,
  MissionType,
  PROTAGONISTS_META,
  RADIO_STATIONS,
  TimePhase,
  WEATHER_ORDER,
  WEATHER_SPECS,
  WeatherCondition,
} from '../types/game';
import {
  ENTERABLE_PLACES,
  EnterablePlaceSpec,
  InteriorsBuildResult,
  REPAIR_SHOPS,
} from './interiors';
import {
  AIRPORT_X_START,
  BEACH_X_END,
  BOARDWALK_X_END,
  BuildingCollider,
  CITY_SIZE,
  PIER_X_END,
  VehicleEntity,
  WORLD_DESTINATIONS,
  WorldDestination,
  buildOpenWorldCity,
  createCarMesh,
  createCharacterMesh,
  getDistrictName,
} from './models';
import { RadioSequencer } from './radio';
import { SoundEngine } from './sound';
import { createContactShadowTexture, createSkyTexture } from './textures';
import {
  TrafficAgent,
  spawnTrafficNetwork,
  updateTrafficNetwork,
} from './traffic';

interface ProtagonistRuntime {
  id: number;
  name: string;
  fullName: string;
  accent: string;
  health: number;
  armor: number;
  nitro: number;
  inVehicle: boolean;
  ped: THREE.Group;
  vehicle: VehicleEntity;
}

interface PedestrianEntity {
  mesh: THREE.Group;
  dir: number;
  timer: number;
  alive: boolean;
  isBounty: boolean;
  respawnTimer: number;
}

interface BulletEntity {
  mesh: THREE.Mesh;
  dir: THREE.Vector3;
  life: number;
  fromPolice: boolean;
}

interface PickupEntity {
  mesh: THREE.Mesh;
  isHealth: boolean;
  active: boolean;
  respawn: number;
}

interface ParticleEntity {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

// Pre-allocated math helpers for zero-GC animation loop
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _c1 = new THREE.Color();
const _c2 = new THREE.Color();
const _c3 = new THREE.Color();
const _c4 = new THREE.Color();
const _c5 = new THREE.Color();
const _c6 = new THREE.Color();
const _axisY = new THREE.Vector3(0, 1, 0);

const START_SPAWNS = [
  { x: 0, z: 28, heading: 0 },
  { x: 224, z: -56, heading: Math.PI },
  { x: -168, z: 224, heading: 0 },
];

const WEATHER_CYCLE_SECONDS = 45;
const RAIN_COUNT = 850;
const DAY_CYCLE_HOURS_PER_SEC = 24 / 180; // Full 24h cycle every 3 minutes
const TIME_PHASE_ORDER: TimePhase[] = ['DAWN', 'DAY', 'SUNSET', 'NIGHT'];
const TIME_PHASE_HOURS: Record<TimePhase, number> = {
  DAWN: 6.0,
  DAY: 12.5,
  SUNSET: 17.8,
  NIGHT: 23.0,
};

interface DayKeyframe {
  hour: number;
  fogColor: number;
  skyTint: number;
  sunColor: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  exposure: number;
  oceanColor: number;
}

const DAY_KEYFRAMES: DayKeyframe[] = [
  {
    hour: 0.0,
    fogColor: 0x090d1a,
    skyTint: 0x3b4870,
    sunColor: 0x8fa8ff,
    sunIntensity: 0.52,
    hemiSky: 0x324a8a,
    hemiGround: 0x0b0f18,
    hemiIntensity: 0.54,
    exposure: 0.96,
    oceanColor: 0x041d33,
  },
  {
    hour: 5.5,
    fogColor: 0x3b2a4a,
    skyTint: 0xffb8a8,
    sunColor: 0xff9f68,
    sunIntensity: 1.05,
    hemiSky: 0xff9f80,
    hemiGround: 0x262033,
    hemiIntensity: 0.78,
    exposure: 1.08,
    oceanColor: 0x0a385c,
  },
  {
    hour: 12.0,
    fogColor: 0x62a8e8,
    skyTint: 0xdff2ff,
    sunColor: 0xfff6e5,
    sunIntensity: 1.85,
    hemiSky: 0x8ed1ff,
    hemiGround: 0x2b3648,
    hemiIntensity: 1.05,
    exposure: 1.24,
    oceanColor: 0x096094,
  },
  {
    hour: 17.8,
    fogColor: 0x2a1f3d,
    skyTint: 0xffc7a6,
    sunColor: 0xffa64d,
    sunIntensity: 1.38,
    hemiSky: 0x829eff,
    hemiGround: 0x201d30,
    hemiIntensity: 0.86,
    exposure: 1.15,
    oceanColor: 0x063858,
  },
  {
    hour: 21.5,
    fogColor: 0x0c1124,
    skyTint: 0x45537d,
    sunColor: 0x8da6ff,
    sunIntensity: 0.56,
    hemiSky: 0x364d8f,
    hemiGround: 0x0d121d,
    hemiIntensity: 0.58,
    exposure: 0.98,
    oceanColor: 0x041d33,
  },
  {
    hour: 24.0,
    fogColor: 0x090d1a,
    skyTint: 0x3b4870,
    sunColor: 0x8fa8ff,
    sunIntensity: 0.52,
    hemiSky: 0x324a8a,
    hemiGround: 0x0b0f18,
    hemiIntensity: 0.54,
    exposure: 0.96,
    oceanColor: 0x041d33,
  },
];

export interface EngineCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onToast: (text: string, color: string) => void;
  onPhaseChange: (phase: GamePhase) => void;
}

export class NeonViceEngine {
  private container: HTMLElement;
  private minimapCanvas: HTMLCanvasElement | null = null;
  private callbacks: EngineCallbacks;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private pmremEnvTex: THREE.Texture;
  private isSoftwareGl: boolean;

  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private skyMat: THREE.MeshBasicMaterial;
  private roadMaterial: THREE.MeshStandardMaterial;
  private oceanMaterial: THREE.MeshStandardMaterial;
  private surfMesh: THREE.Mesh;
  private monumentMesh: THREE.Mesh;
  private radarDishMesh: THREE.Group;
  private flyoverPlane: THREE.Group;
  private celestialDisc: THREE.Mesh;
  private celestialMat: THREE.MeshBasicMaterial;
  private shadowTex: THREE.Texture;

  private buildingColliders: BuildingCollider[] = [];
  private roadCoords: number[] = [];
  private portalRings: THREE.Mesh[] = [];
  private interiorBoxes: InteriorsBuildResult['interiorBoxes'] = [];

  private sound = new SoundEngine();
  private radio = new RadioSequencer();

  private protagonists: ProtagonistRuntime[] = [];
  private vehicles: VehicleEntity[] = [];
  private trafficAgents: TrafficAgent[] = [];
  private activeVehiclesSet = new Set<VehicleEntity>();
  private policeCars: VehicleEntity[] = [];
  private pedestrians: PedestrianEntity[] = [];
  private bullets: BulletEntity[] = [];
  private pickups: PickupEntity[] = [];
  private particles: ParticleEntity[] = [];

  private beaconGroup: THREE.Group;
  private beaconBeamMat: THREE.MeshBasicMaterial;
  private beaconRing: THREE.Mesh;
  private beaconRingMat: THREE.MeshBasicMaterial;

  // Rain system
  private rainLines: THREE.LineSegments;
  private rainMat: THREE.LineBasicMaterial;
  private rainPositions: Float32Array;
  private rainSeeds: Float32Array;
  private currentRainIntensity = 0;
  private lightningTimer = 6;
  private lightningFlash = 0;

  // Core simulation state
  private phase: GamePhase = 'title';
  private cash = 0;
  private level = 1;
  private missionsCompleted = 0;
  private wantedLevel = 0;
  private maxWantedReached = 0;
  private wantedDecayTimer = 0;
  private activeCharIdx = 0;
  private cameraMode: CameraMode = 0;
  private cameraYawOffset = 0;
  private cameraZoomTransition = 0;
  private cameraShake = 0;
  private hitstopTimer = 0;
  private shootCooldown = 0;
  private abilityCooldown = 0;
  private damageFlashTimer = 0;
  private lateralSlip = 0;

  // Weather & Day-Night Cycle state
  private weather: WeatherCondition = 'CLEAR';
  private weatherAuto = true;
  private weatherTimer = WEATHER_CYCLE_SECONDS;
  private currentGrip = 1.0;

  private timeOfDay = 17.8;
  private timePhase: TimePhase = 'SUNSET';
  private timeAuto = true;
  private dayBaseSunInt = 1.35;
  private dayBaseHemiInt = 0.85;
  private dayBaseFogColor = new THREE.Color(0x2a1f3d);
  private dayBaseSkyTint = new THREE.Color(0xffc7a6);

  // Enterable Houses & Places state
  private activeInterior: EnterablePlaceSpec | null = null;
  private nearbyPlace: EnterablePlaceSpec | null = null;
  private savedOutdoorPos = new THREE.Vector3();
  private savedOutdoorHeading = 0;
  private savedInVehicle = true;
  private houseBonusCooldown = 0;
  private repairShopCooldown = 0;

  // Mission state
  private missionTarget = new THREE.Vector3(60, 0, -60);
  private missionDropoff = new THREE.Vector3(-120, 0, 120);
  private missionType: MissionType = 'PICKUP';
  private missionStage = 0;
  private missionReward = 2000;
  private missionTitle = 'CONTRACT #1';
  private missionDesc = '';
  private missionAccent = '#ffcc00';
  private bountyTargetPed: PedestrianEntity | null = null;

  // Input state
  private keys = new Set<string>();
  private isDraggingCam = false;
  private lastMouseX = 0;

  // Loop & timing
  private frameId = 0;
  private isTimeoutId = false;
  private disposed = false;
  private lastTime = performance.now();
  private hudSyncTimer = 0;

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.isSoftwareGl = this.detectSoftwareGl();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    this.renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight,
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x181c30);
    this.scene.fog = new THREE.FogExp2(0x181c30, 0.0028);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremEnvTex = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    this.scene.environment = this.pmremEnvTex;
    pmremGenerator.dispose();

    this.camera = new THREE.PerspectiveCamera(
      62,
      (container.clientWidth || window.innerWidth) /
        (container.clientHeight || window.innerHeight),
      0.5,
      540,
    );

    // 3-point balanced outdoor sunset lighting
    this.hemiLight = new THREE.HemisphereLight(0x70a1ff, 0x1e272e, 0.85);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffb142, 1.35);
    this.sunLight.position.set(180, 240, 140);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 20;
    this.sunLight.shadow.camera.far = 650;
    const d = 220;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    // Sky Dome & Celestial Sun/Moon Disc
    const skyTex = createSkyTexture(maxAnisotropy);
    this.skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      color: 0xffffff,
      side: THREE.BackSide,
      fog: false,
    });
    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(500, 24, 16),
      this.skyMat,
    );
    this.scene.add(skyDome);

    this.celestialMat = new THREE.MeshBasicMaterial({
      color: 0xffc864,
      fog: false,
    });
    this.celestialDisc = new THREE.Mesh(
      new THREE.SphereGeometry(16, 16, 16),
      this.celestialMat,
    );
    this.celestialDisc.position.set(220, 180, -180);
    this.scene.add(this.celestialDisc);

    this.shadowTex = createContactShadowTexture();

    // City, Beach, Airport, Country Quarters & Enterable Houses/Places
    const city = buildOpenWorldCity(this.scene, maxAnisotropy);
    this.buildingColliders = city.buildingColliders;
    this.roadCoords = city.roadCoords;
    this.roadMaterial = city.roadMaterial;
    this.oceanMaterial = city.oceanMaterial;
    this.surfMesh = city.surfMesh;
    this.monumentMesh = city.monumentMesh;
    this.radarDishMesh = city.radarDishMesh;
    this.flyoverPlane = city.flyoverPlane;
    this.portalRings = city.portalRings;
    this.interiorBoxes = city.interiorBoxes;

    // Protagonists, Traffic, Pedestrians, Pickups, Particle Pool
    this.initProtagonists(maxAnisotropy);
    this.initEntities(maxAnisotropy);
    this.initParticlePool();

    // Mission Waypoint Beacon
    this.beaconGroup = new THREE.Group();
    this.beaconBeamMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beaconBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(2.8, 2.8, 65, 16, 1, true),
      this.beaconBeamMat,
    );
    beaconBeam.position.y = 32.5;
    this.beaconRingMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      side: THREE.DoubleSide,
    });
    this.beaconRing = new THREE.Mesh(
      new THREE.RingGeometry(2.5, 3.5, 24),
      this.beaconRingMat,
    );
    this.beaconRing.rotation.x = -Math.PI / 2;
    this.beaconRing.position.y = 0.16;
    this.beaconGroup.add(beaconBeam, this.beaconRing);
    this.scene.add(this.beaconGroup);

    // 3D Rain Streaks System
    this.rainPositions = new Float32Array(RAIN_COUNT * 2 * 3);
    this.rainSeeds = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i++) {
      this.rainSeeds[i * 3] = (Math.random() - 0.5) * 110;
      this.rainSeeds[i * 3 + 1] = Math.random() * 48;
      this.rainSeeds[i * 3 + 2] = (Math.random() - 0.5) * 110;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.rainPositions, 3),
    );
    this.rainMat = new THREE.LineBasicMaterial({
      color: 0xaad8ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.rainLines = new THREE.LineSegments(rainGeo, this.rainMat);
    this.rainLines.frustumCulled = false;
    this.scene.add(this.rainLines);

    this.generateNewMission();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.emitHud();
    this.scheduleNextFrame();
  }

  private detectSoftwareGl(): boolean {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  }

  private initProtagonists(maxAnisotropy: number): void {
    const heroSpecs = [
      {
        carColor: 0x00a8ff,
        carName: 'VANCE INFERNUS GT',
        charOpts: {
          shirtColor: 0x0984e3,
          pantsColor: 0x1e272e,
          skinHex: '#f1c27d',
          eyeHex: '#00a8ff',
          hasShades: true,
          beardStyle: 'stubble',
          hairHex: '#2d3436',
        },
      },
      {
        carColor: 0xff2a55,
        carName: 'KAEL DOMINATOR MUSCLE',
        charOpts: {
          shirtColor: 0xd63031,
          pantsColor: 0x111111,
          skinHex: '#c68642',
          eyeHex: '#6ab04c',
          hasShades: false,
          beardStyle: 'goatee',
          hairHex: '#111111',
        },
      },
      {
        carColor: 0x1dd1a1,
        carName: 'NYX SPECTRE CYBER-EV',
        charOpts: {
          shirtColor: 0x00b894,
          pantsColor: 0x2d3436,
          skinHex: '#ffdbac',
          eyeHex: '#9b59b6',
          hasShades: false,
          beardStyle: 'lipstick',
          hairHex: '#ff2a85',
        },
      },
    ];

    PROTAGONISTS_META.forEach((meta, idx) => {
      const spec = heroSpecs[idx];
      const vehicle = createCarMesh(
        spec.carColor,
        false,
        spec.carName,
        this.shadowTex,
      );
      const ped = createCharacterMesh(
        spec.charOpts,
        maxAnisotropy,
        this.shadowTex,
      );
      const sp = START_SPAWNS[idx];
      vehicle.mesh.position.set(sp.x, 0, sp.z);
      vehicle.heading = sp.heading;
      vehicle.mesh.rotation.y = sp.heading;
      this.scene.add(vehicle.mesh);

      ped.position.set(sp.x - 2.5, 0, sp.z);
      ped.visible = false;
      this.scene.add(ped);

      this.vehicles.push(vehicle);
      this.protagonists.push({
        id: meta.id,
        name: meta.name,
        fullName: `${meta.fullName} (${meta.role})`,
        accent: meta.accent,
        health: 100,
        armor: 100,
        nitro: 100,
        inVehicle: true,
        ped,
        vehicle,
      });
    });
  }

  private initEntities(maxAnisotropy: number): void {
    this.trafficAgents = spawnTrafficNetwork(
      this.scene,
      this.shadowTex,
      this.vehicles,
      28,
    );

    const pedProfiles = [
      {
        shirtColor: 0xff2a85,
        skinHex: '#ffdbac',
        hairHex: '#feca57',
        beardStyle: 'lipstick',
        eyeHex: '#00a8ff',
      },
      {
        shirtColor: 0xfeca57,
        skinHex: '#8d5524',
        hairHex: '#111111',
        beardStyle: 'goatee',
        eyeHex: '#2ecc71',
        hasShades: true,
      },
      {
        shirtColor: 0x48dbfb,
        skinHex: '#f1c27d',
        hairHex: '#6d4c41',
        beardStyle: 'stubble',
        eyeHex: '#3498db',
      },
      {
        shirtColor: 0x1dd1a1,
        skinHex: '#e0ac69',
        hairHex: '#ff2a85',
        beardStyle: 'none',
        eyeHex: '#9b59b6',
      },
      {
        shirtColor: 0xffffff,
        skinHex: '#c68642',
        hairHex: '#1e1e1e',
        beardStyle: 'none',
        eyeHex: '#e67e22',
        hasShades: true,
      },
    ];

    for (let i = 0; i < 28; i++) {
      const prof = pedProfiles[i % pedProfiles.length];
      const ped = createCharacterMesh(prof, maxAnisotropy, this.shadowTex);
      const rx =
        this.roadCoords[Math.floor(Math.random() * this.roadCoords.length)] +
        10;
      const rz = (Math.random() - 0.5) * (CITY_SIZE - 30);
      ped.position.set(rx, 0.35, rz);
      this.scene.add(ped);
      this.pedestrians.push({
        mesh: ped,
        dir: Math.random() * Math.PI * 2,
        timer: Math.random() * 4,
        alive: true,
        isBounty: false,
        respawnTimer: 0,
      });
    }

    const pickupSpots: [number, number][] = [
      [0, 0],
      [168, 168],
      [-168, -168],
      [168, -168],
      [-168, 168],
      [224, 0],
      [-224, 0],
      [0, 224],
      [0, -224],
      [468, 0],
      [-470, -140],
    ];
    pickupSpots.forEach((pt, idx) => {
      const isHealth = idx % 2 === 0;
      const geo = new THREE.OctahedronGeometry(1.15, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: isHealth ? 0x2ecc71 : 0x00f0ff,
        emissive: isHealth ? 0x115522 : 0x004466,
        roughness: 0.2,
        metalness: 0.8,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pt[0], 1.45, pt[1]);
      this.scene.add(mesh);
      this.pickups.push({ mesh, isHealth, active: true, respawn: 0 });
    });
  }

  private initParticlePool(): void {
    const geo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
    for (let i = 0; i < 64; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.5,
        active: false,
      });
    }
  }

  private spawnBurst(
    pos: THREE.Vector3,
    colorHex: number,
    count = 10,
    speed = 14,
  ): void {
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < count; i++) {
      const p = this.particles[i];
      if (p.active) continue;
      p.active = true;
      p.life = 0.35 + Math.random() * 0.3;
      p.maxLife = p.life;
      p.mesh.visible = true;
      p.mesh.position.copy(pos);
      p.mesh.position.y += 0.6;
      p.mesh.scale.setScalar(1);
      (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
      p.vel.set(
        (Math.random() - 0.5) * speed,
        3 + Math.random() * (speed * 0.65),
        (Math.random() - 0.5) * speed,
      );
      spawned++;
    }
  }

  public setMinimapCanvas(canvas: HTMLCanvasElement | null): void {
    this.minimapCanvas = canvas;
  }

  public setTouchKey(code: string, pressed: boolean): void {
    if (pressed) {
      this.keys.add(code);
      if (this.phase === 'playing') {
        if (code === 'KeyF') this.toggleEnterExitVehicle();
        if (code === 'KeyE') this.interactWithPlace();
        if (code === 'Space' && !this.getActiveHero().inVehicle) {
          this.firePlayerWeapon();
        }
      }
    } else {
      this.keys.delete(code);
    }
  }

  public startGame(): void {
    this.sound.init();
    const ctx = this.sound.getContext();
    if (ctx) this.radio.init(ctx);
    this.phase = 'playing';
    this.callbacks.onPhaseChange('playing');
    this.radio.setVehicleActive(this.getActiveHero().inVehicle);
    this.callbacks.onToast(
      'WELCOME TO NEON VICE • FOLLOW THE GOLD BEACON',
      '#ffcc00',
    );
    this.emitHud();
  }

  public togglePause(): void {
    if (this.phase === 'playing') {
      this.phase = 'paused';
      this.keys.clear();
      this.sound.updateEngine(0, false, false);
      this.sound.updateRainAmbience(0, false);
      this.radio.setVehicleActive(false);
      this.callbacks.onPhaseChange('paused');
    } else if (this.phase === 'paused') {
      this.phase = 'playing';
      this.radio.setVehicleActive(this.getActiveHero().inVehicle);
      this.callbacks.onPhaseChange('playing');
    }
  }

  public restartGame(): void {
    this.cash = Math.max(0, this.cash - 500);
    this.wantedLevel = 0;
    this.wantedDecayTimer = 0;
    this.lateralSlip = 0;
    this.abilityCooldown = 0;
    this.activeInterior = null;
    this.nearbyPlace = null;
    this.clearPoliceCars();

    this.protagonists.forEach((hero, idx) => {
      const sp = START_SPAWNS[idx];
      hero.health = 100;
      hero.armor = 100;
      hero.nitro = 100;
      hero.vehicle.mesh.position.set(sp.x, 0, sp.z);
      hero.vehicle.speed = 0;
      hero.vehicle.heading = sp.heading;
      hero.vehicle.mesh.rotation.y = sp.heading;
      hero.inVehicle = true;
      hero.ped.visible = false;
    });

    this.phase = 'playing';
    this.radio.setVehicleActive(true);
    this.callbacks.onPhaseChange('playing');
    this.callbacks.onToast('DISCHARGED FROM VICE MEDICAL (-$500)', '#00f0ff');
    this.emitHud();
  }

  public toggleSound(): boolean {
    const enabled = this.sound.toggle();
    this.radio.setMuted(!enabled);
    return enabled;
  }

  public cycleCameraMode(): void {
    this.cameraMode = ((this.cameraMode + 1) % 3) as CameraMode;
    this.cameraYawOffset = 0;
    const labels = ['CAMERA: CHASE', 'CAMERA: CINEMATIC', 'CAMERA: TOP-DOWN'];
    this.callbacks.onToast(labels[this.cameraMode], '#00f0ff');
    this.emitHud();
  }

  public switchCharacter(newIdx: number): void {
    if (
      this.phase !== 'playing' ||
      newIdx === this.activeCharIdx ||
      newIdx < 0 ||
      newIdx >= this.protagonists.length
    ) {
      return;
    }
    if (this.activeInterior) {
      this.callbacks.onToast('EXIT BUILDING [E] TO SWITCH CHARACTER', '#ffcc00');
      return;
    }
    this.activeCharIdx = newIdx;
    this.cameraZoomTransition = 1.0;
    this.lateralSlip = 0;
    this.sound.playCash();
    const hero = this.getActiveHero();
    this.radio.setVehicleActive(hero.inVehicle);
    this.callbacks.onToast(`SWITCHED TO ${hero.fullName}`, hero.accent);
    this.emitHud();
  }

  public triggerSpecialAbility(): void {
    if (this.phase !== 'playing' || this.abilityCooldown > 0) return;
    const hero = this.getActiveHero();
    this.abilityCooldown = 8;

    if (this.activeCharIdx === 0) {
      hero.nitro = 100;
      hero.armor = Math.min(100, hero.armor + 35);
      if (hero.inVehicle) hero.vehicle.speed = 64;
      this.cameraShake = 0.45;
      this.sound.playBoost();
      this.spawnBurst(this.getPlayerPosition(), 0x00f0ff, 16, 18);
      this.callbacks.onToast(
        'VANCE: OVERDRIVE TURBO & ARMOR BOOST!',
        '#00f0ff',
      );
    } else if (this.activeCharIdx === 1) {
      this.sound.playShoot();
      this.cameraShake = 0.6;
      const origin = this.getPlayerPosition();
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
        const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
        const bullet = new THREE.Mesh(
          new THREE.SphereGeometry(0.35, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xff2a85 }),
        );
        bullet.position.copy(origin).add(_v1.set(0, 1.4, 0));
        this.scene.add(bullet);
        this.bullets.push({ mesh: bullet, dir, life: 1.4, fromPolice: false });
      }
      this.spawnBurst(origin, 0xff2a85, 18, 22);
      this.callbacks.onToast('KAEL: 360° HEAVY SHOCKWAVE!', '#ff2a85');
    } else {
      if (this.wantedLevel > 0) {
        this.wantedLevel = Math.max(0, this.wantedLevel - 2);
        this.syncPoliceCount();
        this.sound.playCash();
        this.callbacks.onToast(
          'NYX: LSPD RADAR JAMMED (-2 STARS)',
          '#2ecc71',
        );
      } else {
        hero.health = Math.min(100, hero.health + 40);
        this.sound.playCash();
        this.callbacks.onToast('NYX: NANO-MED REPAIR (+40 HP)', '#2ecc71');
      }
    }
    this.emitHud();
  }

  public cycleWeather(manual = true): void {
    const idx = WEATHER_ORDER.indexOf(this.weather);
    const next = WEATHER_ORDER[(idx + 1) % WEATHER_ORDER.length];
    this.setWeather(next, manual);
  }

  public setWeather(next: WeatherCondition, manual = true): void {
    this.weather = next;
    this.weatherTimer = WEATHER_CYCLE_SECONDS;
    if (manual) {
      const spec = WEATHER_SPECS[next];
      this.callbacks.onToast(
        `WEATHER: ${spec.label} • ${spec.visibilityTag}`,
        spec.accent,
      );
    }
    this.emitHud();
  }

  public toggleWeatherAuto(): void {
    this.weatherAuto = !this.weatherAuto;
    this.callbacks.onToast(
      this.weatherAuto ? 'WEATHER CYCLE: AUTO' : 'WEATHER CYCLE: LOCKED',
      '#48dbfb',
    );
    this.emitHud();
  }

  public cycleRadioStation(step = 1): void {
    const hero = this.getActiveHero();
    if (!hero.inVehicle) {
      this.callbacks.onToast('ENTER A VEHICLE TO TUNE RADIO', '#94a3b8');
      return;
    }
    this.sound.init();
    const ctx = this.sound.getContext();
    if (ctx) this.radio.init(ctx);
    const st = this.radio.cycleStation(step);
    const msg =
      st.id === 'OFF'
        ? 'RADIO OFF'
        : `${st.freq} ${st.name} (${st.genre}) • ${st.djName}`;
    this.callbacks.onToast(msg, st.accent);
    this.emitHud();
  }

  public selectRadioStation(idx: number): void {
    const hero = this.getActiveHero();
    if (!hero.inVehicle) {
      this.callbacks.onToast('ENTER A VEHICLE TO TUNE RADIO', '#94a3b8');
      return;
    }
    this.sound.init();
    const ctx = this.sound.getContext();
    if (ctx) this.radio.init(ctx);
    const st = this.radio.setStation(idx);
    const msg =
      st.id === 'OFF'
        ? 'RADIO OFF'
        : `${st.freq} ${st.name} (${st.genre}) • ${st.djName}`;
    this.callbacks.onToast(msg, st.accent);
    this.emitHud();
  }

  public cycleTimePhase(): void {
    const idx = TIME_PHASE_ORDER.indexOf(this.timePhase);
    const next = TIME_PHASE_ORDER[(idx + 1) % TIME_PHASE_ORDER.length];
    this.setTimePhase(next);
  }

  public setTimePhase(phase: TimePhase): void {
    this.timePhase = phase;
    this.timeOfDay = TIME_PHASE_HOURS[phase];
    this.callbacks.onToast(`TIME OF DAY: ${phase}`, '#feca57');
    this.emitHud();
  }

  public toggleTimeAuto(): void {
    this.timeAuto = !this.timeAuto;
    this.callbacks.onToast(
      this.timeAuto ? 'DAY-NIGHT CYCLE: AUTO' : 'DAY-NIGHT CYCLE: LOCKED',
      '#feca57',
    );
    this.emitHud();
  }

  public teleportToDestination(dest: WorldDestination): void {
    if (this.activeInterior) {
      this.activeInterior = null;
    }
    const hero = this.getActiveHero();
    if (hero.inVehicle) {
      hero.vehicle.mesh.position.set(dest.x, 0, dest.z);
      hero.vehicle.heading = dest.heading;
      hero.vehicle.mesh.rotation.y = dest.heading;
      hero.vehicle.speed = 0;
    } else {
      hero.ped.position.set(dest.x, 0, dest.z);
      hero.ped.rotation.y = dest.heading;
    }
    this.cameraYawOffset = 0;
    this.cameraZoomTransition = 0.65;
    this.sound.playBoost();
    this.callbacks.onToast(`GPS ARRIVAL: ${dest.label.toUpperCase()}`, dest.accent);
    this.emitHud();
  }

  public interactWithPlace(): void {
    if (this.phase !== 'playing') return;
    const hero = this.getActiveHero();

    if (this.activeInterior) {
      const place = this.activeInterior;
      this.activeInterior = null;
      if (this.savedInVehicle) {
        hero.vehicle.mesh.position.set(place.entryX, 0, place.entryZ);
        hero.vehicle.heading = place.exitHeading;
        hero.vehicle.mesh.rotation.y = place.exitHeading;
        hero.vehicle.speed = 0;
        hero.inVehicle = true;
        hero.ped.visible = false;
      } else {
        hero.ped.position.set(place.entryX, 0, place.entryZ);
        hero.ped.rotation.y = place.exitHeading;
        hero.ped.visible = true;
      }
      this.sound.playDoor();
      this.radio.setVehicleActive(hero.inVehicle);
      this.callbacks.onToast(`EXITED ${place.name}`, place.accent);
      this.emitHud();
      return;
    }

    if (!this.nearbyPlace) return;
    const place = this.nearbyPlace;

    // Save outdoor state and park car cleanly at doorstep
    this.savedInVehicle = hero.inVehicle;
    if (hero.inVehicle) {
      hero.vehicle.speed = 0;
      this.savedOutdoorPos.copy(hero.vehicle.mesh.position);
      this.savedOutdoorHeading = hero.vehicle.heading;
      hero.inVehicle = false;
    } else {
      this.savedOutdoorPos.copy(hero.ped.position);
      this.savedOutdoorHeading = hero.ped.rotation.y;
    }

    this.activeInterior = place;
    hero.ped.visible = true;
    hero.ped.position.set(
      place.interiorSpawn.x,
      place.interiorSpawn.y,
      place.interiorSpawn.z,
    );
    hero.ped.rotation.y = place.interiorSpawn.heading;
    this.cameraYawOffset = 0;
    this.sound.playDoor();
    this.radio.setVehicleActive(false);

    // Apply House / Place Perks
    if (place.kind === 'HOUSE') {
      hero.health = 100;
      hero.armor = 100;
      if (this.wantedLevel > 0) {
        this.wantedLevel = 0;
        this.clearPoliceCars();
      }
      if (this.houseBonusCooldown <= 0) {
        this.cash += 250;
        this.houseBonusCooldown = 25;
        this.callbacks.onToast(
          `${place.name} • FULL HEAL, WANTED CLEARED & +$250`,
          place.accent,
        );
      } else {
        this.callbacks.onToast(
          `${place.name} • SAFEHOUSE RESTORED`,
          place.accent,
        );
      }
    } else if (place.id === 'starlight_club') {
      hero.nitro = 100;
      if (this.wantedLevel > 0) {
        this.wantedLevel = Math.max(0, this.wantedLevel - 1);
        this.syncPoliceCount();
      }
      this.callbacks.onToast(
        'STARLIGHT CLUB • VIP NITRO REFILL & -1 WANTED',
        place.accent,
      );
    } else if (place.id === 'airport_lounge') {
      hero.health = Math.min(100, hero.health + 35);
      if (this.houseBonusCooldown <= 0) {
        this.cash += 500;
        this.houseBonusCooldown = 25;
      }
      this.callbacks.onToast(
        'VIX VIP LOUNGE • +$500 SKYLINE BONUS & +35 HP',
        place.accent,
      );
    } else if (place.id === 'beach_cafe') {
      hero.health = Math.min(100, hero.health + 50);
      hero.armor = Math.min(100, hero.armor + 30);
      this.callbacks.onToast(
        'VICE SURF CAFE • +50 HP & +30 ARMOR',
        place.accent,
      );
    } else if (place.id === 'tokyo_arcade') {
      hero.health = Math.min(100, hero.health + 50);
      if (this.houseBonusCooldown <= 0) {
        this.cash += 350;
        this.houseBonusCooldown = 25;
      }
      this.callbacks.onToast(
        'TOKYO ARCADE • HIGH SCORE +$350 & +50 HP',
        place.accent,
      );
    }
    this.emitHud();
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Escape') {
      if (this.phase === 'playing' || this.phase === 'paused') {
        this.togglePause();
      }
      return;
    }

    if (this.phase === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
      e.preventDefault();
      this.startGame();
      return;
    }

    if (this.phase === 'wasted' && (e.code === 'Enter' || e.code === 'Space')) {
      e.preventDefault();
      this.restartGame();
      return;
    }

    if (e.repeat) {
      this.keys.add(e.code);
      return;
    }

    this.keys.add(e.code);
    if (this.phase !== 'playing') return;

    if (e.code === 'KeyF') this.toggleEnterExitVehicle();
    else if (e.code === 'KeyE') this.interactWithPlace();
    else if (e.code === 'KeyC') this.cycleCameraMode();
    else if (e.code === 'KeyQ') this.triggerSpecialAbility();
    else if (e.code === 'KeyV') this.cycleWeather(true);
    else if (e.code === 'KeyT') this.cycleTimePhase();
    else if (e.code === 'KeyR') this.cycleRadioStation(1);
    else if (e.code === 'Digit1') this.switchCharacter(0);
    else if (e.code === 'Digit2') this.switchCharacter(1);
    else if (e.code === 'Digit3') this.switchCharacter(2);
    else if (e.code === 'Space' && !this.getActiveHero().inVehicle) {
      this.firePlayerWeapon();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onBlur = (): void => {
    this.keys.clear();
    this.isDraggingCam = false;
  };

  private onMouseDown = (e: MouseEvent): void => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, [data-interactive="true"]')) return;
    this.isDraggingCam = true;
    this.lastMouseX = e.clientX;
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDraggingCam) return;
    const dx = e.clientX - this.lastMouseX;
    this.lastMouseX = e.clientX;
    this.cameraYawOffset -= dx * 0.0065;
  };

  private onMouseUp = (): void => {
    this.isDraggingCam = false;
  };

  private onResize = (): void => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
  };

  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('resize', this.onResize);
  }

  private getActiveHero(): ProtagonistRuntime {
    return this.protagonists[this.activeCharIdx];
  }

  private getPlayerPosition(): THREE.Vector3 {
    const hero = this.getActiveHero();
    return hero.inVehicle ? hero.vehicle.mesh.position : hero.ped.position;
  }

  private getPlayerHeading(): number {
    const hero = this.getActiveHero();
    return hero.inVehicle ? hero.vehicle.heading : hero.ped.rotation.y;
  }

  private addWanted(amount = 1): void {
    this.wantedLevel = Math.min(5, this.wantedLevel + amount);
    this.maxWantedReached = Math.max(this.maxWantedReached, this.wantedLevel);
    this.wantedDecayTimer = 14;
    this.syncPoliceCount();
  }

  private clearPoliceCars(): void {
    for (const cop of this.policeCars) {
      this.scene.remove(cop.mesh);
      const idx = this.vehicles.indexOf(cop);
      if (idx !== -1) this.vehicles.splice(idx, 1);
    }
    this.policeCars.length = 0;
  }

  private syncPoliceCount(): void {
    const desired = this.wantedLevel;
    const pPos = this.getPlayerPosition();
    while (this.policeCars.length < desired) {
      const cop = createCarMesh(
        0x111622,
        true,
        'LSPD INTERCEPTOR',
        this.shadowTex,
      );
      const angle = Math.random() * Math.PI * 2;
      cop.mesh.position.set(
        THREE.MathUtils.clamp(
          pPos.x + Math.cos(angle) * 72,
          -CITY_SIZE / 2 + 12,
          CITY_SIZE / 2 - 12,
        ),
        0,
        THREE.MathUtils.clamp(
          pPos.z + Math.sin(angle) * 72,
          -CITY_SIZE / 2 + 12,
          CITY_SIZE / 2 - 12,
        ),
      );
      cop.heading = Math.atan2(
        pPos.x - cop.mesh.position.x,
        pPos.z - cop.mesh.position.z,
      );
      cop.mesh.rotation.y = cop.heading;
      this.scene.add(cop.mesh);
      this.policeCars.push(cop);
      this.vehicles.push(cop);
    }
    while (this.policeCars.length > desired) {
      const cop = this.policeCars.pop()!;
      this.scene.remove(cop.mesh);
      const idx = this.vehicles.indexOf(cop);
      if (idx !== -1) this.vehicles.splice(idx, 1);
    }
  }

  private damagePlayer(amount: number): void {
    if (this.phase !== 'playing') return;
    const hero = this.getActiveHero();
    let rem = amount;
    if (hero.armor > 0) {
      const absorbed = Math.min(hero.armor, rem);
      hero.armor -= absorbed;
      rem -= absorbed;
    }
    hero.health = Math.max(0, hero.health - rem);
    this.damageFlashTimer = 0.18;
    this.cameraShake = Math.max(this.cameraShake, 0.35);

    if (hero.health <= 0) {
      this.phase = 'wasted';
      this.keys.clear();
      this.sound.updateEngine(0, false, false);
      this.sound.updateRainAmbience(0, false);
      this.radio.setVehicleActive(false);
      this.callbacks.onPhaseChange('wasted');
      this.emitHud();
    }
  }

  private toggleEnterExitVehicle(): void {
    if (this.activeInterior) {
      this.callbacks.onToast('EXIT BUILDING [E] FIRST', '#ffcc00');
      return;
    }
    const hero = this.getActiveHero();
    if (hero.inVehicle) {
      hero.inVehicle = false;
      _v1.set(-2.5, 0, 0).applyAxisAngle(_axisY, hero.vehicle.heading);
      hero.ped.position.copy(hero.vehicle.mesh.position).add(_v1);
      hero.ped.position.y = 0;
      hero.ped.rotation.y = hero.vehicle.heading;
      hero.ped.visible = true;
      this.sound.playDoor();
      this.radio.setVehicleActive(false);
      this.callbacks.onToast('ON FOOT • PRESS SPACE TO FIRE', '#00f0ff');
    } else {
      let closest: VehicleEntity | null = null;
      let minDist = 6.0;
      for (const v of this.vehicles) {
        const d = hero.ped.position.distanceTo(v.mesh.position);
        if (d < minDist) {
          minDist = d;
          closest = v;
        }
      }
      if (closest) {
        hero.vehicle = closest;
        hero.inVehicle = true;
        hero.ped.visible = false;
        this.sound.playDoor();
        this.radio.setVehicleActive(true);
        if (closest.isPolice) {
          const pIdx = this.policeCars.indexOf(closest);
          if (pIdx !== -1) this.policeCars.splice(pIdx, 1);
          closest.isPolice = false;
          this.addWanted(2);
          this.callbacks.onToast('STOLE LSPD CRUISER! +2 WANTED', '#ff3b30');
        } else {
          if (Math.random() < 0.45) this.addWanted(1);
          this.callbacks.onToast(`HIJACKED: ${closest.name}`, '#ffcc00');
        }
      } else {
        this.callbacks.onToast('NO VEHICLE NEARBY', '#94a3b8');
      }
    }
    this.emitHud();
  }

  private firePlayerWeapon(): void {
    if (this.shootCooldown > 0) return;
    const hero = this.getActiveHero();
    this.shootCooldown = 0.22;
    this.sound.playShoot();

    const bullet = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 6, 6),
      new THREE.MeshBasicMaterial({ color: hero.accent }),
    );
    const dir = new THREE.Vector3(
      Math.sin(hero.ped.rotation.y),
      0,
      Math.cos(hero.ped.rotation.y),
    );
    bullet.position
      .copy(hero.ped.position)
      .add(_v1.set(0, 1.35, 0))
      .addScaledVector(dir, 0.9);
    this.scene.add(bullet);
    this.bullets.push({ mesh: bullet, dir, life: 1.3, fromPolice: false });

    if (Math.random() < 0.35 && this.wantedLevel === 0) {
      this.addWanted(1);
    }
  }

  private pickFarRoadSpot(
    fromPos: THREE.Vector3,
    minDistance = 130,
  ): THREE.Vector3 {
    const candidate = new THREE.Vector3();
    for (let tries = 0; tries < 25; tries++) {
      if (tries < 6 && Math.random() < 0.38) {
        const wd =
          WORLD_DESTINATIONS[
            Math.floor(Math.random() * WORLD_DESTINATIONS.length)
          ];
        candidate.set(wd.x, 0, wd.z);
        if (candidate.distanceTo(fromPos) >= minDistance) return candidate;
      }
      const rx =
        this.roadCoords[Math.floor(Math.random() * this.roadCoords.length)];
      const rz =
        this.roadCoords[Math.floor(Math.random() * this.roadCoords.length)];
      candidate.set(rx, 0, rz);
      if (candidate.distanceTo(fromPos) >= minDistance) return candidate;
    }
    return candidate;
  }

  private generateNewMission(): void {
    const pPos =
      this.protagonists.length > 0
        ? this.getPlayerPosition()
        : _v1.set(0, 0, 28);
    const missionTypes: MissionType[] = [
      'DELIVERY',
      'BOUNTY',
      'ESCAPE',
      'PICKUP',
    ];
    this.missionType =
      missionTypes[this.missionsCompleted % missionTypes.length];
    this.missionStage = 0;
    this.missionReward = 2000 + this.level * 900;

    const spotA = this.pickFarRoadSpot(pPos, 130);
    this.missionTarget.copy(spotA);
    this.beaconGroup.position.copy(spotA);

    const areaName = getDistrictName(spotA.x, spotA.z);

    if (this.missionType === 'DELIVERY') {
      this.missionDropoff.copy(this.pickFarRoadSpot(spotA, 160));
      this.beaconBeamMat.color.setHex(0xffcc00);
      this.beaconRingMat.color.setHex(0xffcc00);
      this.missionAccent = '#ffcc00';
      this.missionTitle = `HEIST #${this.missionsCompleted + 1}: ARMORED COURIER`;
      this.missionDesc = `Step 1/2: Collect the syndicate vault case in ${areaName}.`;
    } else if (this.missionType === 'BOUNTY') {
      const targetPed =
        this.pedestrians[this.missionsCompleted % this.pedestrians.length];
      targetPed.alive = true;
      targetPed.isBounty = true;
      targetPed.mesh.visible = true;
      targetPed.mesh.position.set(spotA.x, 0.35, spotA.z);
      this.bountyTargetPed = targetPed;
      this.beaconBeamMat.color.setHex(0xff3b30);
      this.beaconRingMat.color.setHex(0xff3b30);
      this.missionAccent = '#ff3b30';
      this.missionTitle = `CONTRACT #${this.missionsCompleted + 1}: RIVAL KINGPIN HIT`;
      this.missionDesc = `Eliminate the marked target in ${areaName} for $${this.missionReward.toLocaleString()}.`;
    } else if (this.missionType === 'ESCAPE') {
      this.addWanted(2);
      this.beaconBeamMat.color.setHex(0x00f0ff);
      this.beaconRingMat.color.setHex(0x00f0ff);
      this.missionAccent = '#00f0ff';
      this.missionTitle = `ESCAPE #${this.missionsCompleted + 1}: HOT PURSUIT SAFEHOUSE`;
      this.missionDesc = `Outrun the LSPD and reach the cyan safehouse in ${areaName}!`;
    } else {
      this.beaconBeamMat.color.setHex(0xffcc00);
      this.beaconRingMat.color.setHex(0xffcc00);
      this.missionAccent = '#ffcc00';
      this.missionTitle = `DROP #${this.missionsCompleted + 1}: CRYPTO STASH`;
      this.missionDesc = `Drive to ${areaName} to secure $${this.missionReward.toLocaleString()} payout!`;
    }
  }

  private completeCurrentMission(): void {
    const hero = this.getActiveHero();
    this.sound.playCash();
    this.cash += this.missionReward;
    this.missionsCompleted++;
    this.level = 1 + Math.floor(this.missionsCompleted / 2);
    hero.health = Math.min(100, hero.health + 25);
    this.hitstopTimer = 0.045;
    this.spawnBurst(this.getPlayerPosition(), 0x4cd964, 16, 16);
    this.callbacks.onToast(
      `MISSION PASSED! +$${this.missionReward.toLocaleString()}`,
      '#4cd964',
    );
    this.generateNewMission();
    this.emitHud();
  }

  private resolveCollisions(pos: THREE.Vector3, radius: number): boolean {
    if (this.activeInterior && pos.y > 400) {
      const b = this.activeInterior.bounds;
      pos.x = Math.max(b.minX + radius, Math.min(b.maxX - radius, pos.x));
      pos.z = Math.max(b.minZ + radius, Math.min(b.maxZ - radius, pos.z));
      let hit = false;
      for (let i = 0; i < this.interiorBoxes.length; i++) {
        const box = this.interiorBoxes[i];
        if (box.placeId !== this.activeInterior.id) continue;
        if (
          pos.x + radius > box.minX &&
          pos.x - radius < box.maxX &&
          pos.z + radius > box.minZ &&
          pos.z - radius < box.maxZ
        ) {
          const oL = pos.x + radius - box.minX;
          const oR = box.maxX - (pos.x - radius);
          const oT = pos.z + radius - box.minZ;
          const oB = box.maxZ - (pos.z - radius);
          const m = Math.min(oL, oR, oT, oB);
          if (m === oL) pos.x = box.minX - radius;
          else if (m === oR) pos.x = box.maxX + radius;
          else if (m === oT) pos.z = box.minZ - radius;
          else pos.z = box.maxZ + radius;
          hit = true;
        }
      }
      return hit;
    }

    const limitZ = CITY_SIZE / 2 - 4;
    const minX = AIRPORT_X_START + 8;
    const maxX = Math.abs(pos.z) < 6.2 ? PIER_X_END : BEACH_X_END;
    pos.x = Math.max(minX, Math.min(maxX, pos.x));
    pos.z = Math.max(-limitZ, Math.min(limitZ, pos.z));

    let collided = false;
    for (let i = 0; i < this.buildingColliders.length; i++) {
      const b = this.buildingColliders[i];
      if (
        pos.x + radius > b.minX &&
        pos.x - radius < b.maxX &&
        pos.z + radius > b.minZ &&
        pos.z - radius < b.maxZ
      ) {
        const overlapLeft = pos.x + radius - b.minX;
        const overlapRight = b.maxX - (pos.x - radius);
        const overlapTop = pos.z + radius - b.minZ;
        const overlapBottom = b.maxZ - (pos.z - radius);
        const minOverlap = Math.min(
          overlapLeft,
          overlapRight,
          overlapTop,
          overlapBottom,
        );
        if (minOverlap === overlapLeft) pos.x = b.minX - radius;
        else if (minOverlap === overlapRight) pos.x = b.maxX + radius;
        else if (minOverlap === overlapTop) pos.z = b.minZ - radius;
        else pos.z = b.maxZ + radius;
        collided = true;
      }
    }
    return collided;
  }

  private getTimePhaseForHour(h: number): TimePhase {
    if (h < 5.0 || h >= 20.5) return 'NIGHT';
    if (h < 8.5) return 'DAWN';
    if (h < 16.5) return 'DAY';
    return 'SUNSET';
  }

  private updateDayNightCycle(dt: number, focusPos: THREE.Vector3): void {
    if (this.phase === 'playing' && this.timeAuto) {
      this.timeOfDay = (this.timeOfDay + DAY_CYCLE_HOURS_PER_SEC * dt) % 24;
    }
    this.timePhase = this.getTimePhaseForHour(this.timeOfDay);

    let k0 = DAY_KEYFRAMES[0];
    let k1 = DAY_KEYFRAMES[1];
    for (let i = 0; i < DAY_KEYFRAMES.length - 1; i++) {
      if (
        this.timeOfDay >= DAY_KEYFRAMES[i].hour &&
        this.timeOfDay <= DAY_KEYFRAMES[i + 1].hour
      ) {
        k0 = DAY_KEYFRAMES[i];
        k1 = DAY_KEYFRAMES[i + 1];
        break;
      }
    }
    const span = Math.max(0.01, k1.hour - k0.hour);
    const t = THREE.MathUtils.smoothstep(
      (this.timeOfDay - k0.hour) / span,
      0,
      1,
    );

    _c3.setHex(k0.fogColor).lerp(_c4.setHex(k1.fogColor), t);
    this.dayBaseFogColor.copy(_c3);

    _c3.setHex(k0.skyTint).lerp(_c4.setHex(k1.skyTint), t);
    this.dayBaseSkyTint.copy(_c3);

    _c3.setHex(k0.sunColor).lerp(_c4.setHex(k1.sunColor), t);
    this.sunLight.color.copy(_c3);

    _c5.setHex(k0.hemiSky).lerp(_c6.setHex(k1.hemiSky), t);
    this.hemiLight.color.copy(_c5);
    _c5.setHex(k0.hemiGround).lerp(_c6.setHex(k1.hemiGround), t);
    this.hemiLight.groundColor.copy(_c5);

    _c5.setHex(k0.oceanColor).lerp(_c6.setHex(k1.oceanColor), t);
    this.oceanMaterial.color.copy(_c5);

    this.dayBaseSunInt = THREE.MathUtils.lerp(
      k0.sunIntensity,
      k1.sunIntensity,
      t,
    );
    this.dayBaseHemiInt = THREE.MathUtils.lerp(
      k0.hemiIntensity,
      k1.hemiIntensity,
      t,
    );
    this.renderer.toneMappingExposure = THREE.MathUtils.lerp(
      k0.exposure,
      k1.exposure,
      t,
    );

    // Orbital Sun / Moon Arc
    const isNight = this.timeOfDay < 5.5 || this.timeOfDay >= 20.0;
    const sunAngle = ((this.timeOfDay - 6) / 14) * Math.PI;
    const orbitAngle = isNight ? Math.PI * 0.35 : Math.max(0.18, Math.min(Math.PI - 0.18, sunAngle));
    const sx = Math.cos(orbitAngle) * 260;
    const sy = Math.max(55, Math.sin(orbitAngle) * 260);
    const sz = -140;

    this.celestialDisc.visible = !this.activeInterior;
    this.celestialDisc.position.set(
      focusPos.x + sx * 1.45,
      sy * 1.35,
      focusPos.z + sz * 1.45,
    );
    this.celestialMat.color.setHex(
      isNight ? 0xdde8ff : this.timePhase === 'SUNSET' ? 0xff7b54 : 0xffeaa7,
    );
    this.sunLight.position.set(focusPos.x + sx, sy, focusPos.z + sz);
  }

  private updateWeather(dt: number, focusPos: THREE.Vector3): void {
    if (this.phase === 'playing' && this.weatherAuto) {
      this.weatherTimer -= dt;
      if (this.weatherTimer <= 0) {
        this.weatherTimer = WEATHER_CYCLE_SECONDS;
        const idx = WEATHER_ORDER.indexOf(this.weather);
        const next = WEATHER_ORDER[(idx + 1) % WEATHER_ORDER.length];
        this.weather = next;
        const spec = WEATHER_SPECS[next];
        this.callbacks.onToast(
          `WEATHER SHIFT: ${spec.label} • ${spec.visibilityTag}`,
          spec.accent,
        );
      }
    }

    const spec = WEATHER_SPECS[this.weather];
    const fog = this.scene.fog as THREE.FogExp2;

    const targetFogDensity = this.activeInterior ? 0 : spec.fogDensity;
    fog.density = THREE.MathUtils.damp(fog.density, targetFogDensity, 1.8, dt);

    // Compose Weather tint cleanly on top of Day-Night color grading
    _c1.copy(this.dayBaseFogColor);
    if (this.weather !== 'CLEAR') {
      _c2.setHex(spec.fogColorHex);
      _c1.lerp(_c2, this.weather === 'HEAVY_RAIN' ? 0.62 : 0.45);
    }
    fog.color.lerp(_c1, Math.min(1, dt * 1.6));
    (this.scene.background as THREE.Color).copy(fog.color);

    _c2.copy(this.dayBaseSkyTint).multiply(_c1.setHex(spec.skyTintHex));
    this.skyMat.color.lerp(_c2, Math.min(1, dt * 1.6));

    // Storm lightning flash
    if (
      this.weather === 'HEAVY_RAIN' &&
      this.phase === 'playing' &&
      !this.activeInterior
    ) {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = 7 + Math.random() * 10;
        this.lightningFlash = 1.0;
        this.sound.playThunder();
      }
    }
    this.lightningFlash = Math.max(0, this.lightningFlash - dt * 4.5);

    const weatherSunScale = spec.sunIntensity / WEATHER_SPECS.CLEAR.sunIntensity;
    const weatherHemiScale =
      spec.hemiIntensity / WEATHER_SPECS.CLEAR.hemiIntensity;

    this.sunLight.intensity =
      THREE.MathUtils.damp(
        this.sunLight.intensity,
        this.dayBaseSunInt * weatherSunScale,
        1.8,
        dt,
      ) +
      this.lightningFlash * 2.4;
    this.hemiLight.intensity =
      THREE.MathUtils.damp(
        this.hemiLight.intensity,
        this.dayBaseHemiInt * weatherHemiScale,
        1.8,
        dt,
      ) +
      this.lightningFlash * 0.9;

    // Wet reflective asphalt transition
    this.roadMaterial.roughness = THREE.MathUtils.damp(
      this.roadMaterial.roughness,
      spec.roadRoughness,
      1.6,
      dt,
    );
    this.roadMaterial.metalness = THREE.MathUtils.damp(
      this.roadMaterial.metalness,
      spec.roadMetalness,
      1.6,
      dt,
    );
    this.currentGrip = THREE.MathUtils.damp(
      this.currentGrip,
      spec.gripFactor,
      1.8,
      dt,
    );

    const rainTarget = this.activeInterior ? 0 : spec.rainIntensity;
    this.currentRainIntensity = THREE.MathUtils.damp(
      this.currentRainIntensity,
      rainTarget,
      2.2,
      dt,
    );
    this.sound.updateRainAmbience(
      this.currentRainIntensity,
      this.phase === 'playing' && !this.activeInterior,
    );

    // Update pooled 3D rain streaks around camera/player
    this.rainMat.opacity = this.currentRainIntensity * 0.48;
    if (this.currentRainIntensity > 0.02) {
      const fallSpeed = 36 + this.currentRainIntensity * 28;
      const streakLen = 1.1 + this.currentRainIntensity * 1.4;
      const windX = this.currentRainIntensity * 4.5;
      const activeCount = Math.floor(
        RAIN_COUNT * Math.min(1, 0.35 + this.currentRainIntensity * 0.65),
      );
      const posAttr = this.rainLines.geometry.attributes
        .position as THREE.BufferAttribute;

      for (let i = 0; i < RAIN_COUNT; i++) {
        if (i >= activeCount) {
          this.rainPositions[i * 6 + 1] = -50;
          this.rainPositions[i * 6 + 4] = -50;
          continue;
        }
        let rx = this.rainSeeds[i * 3];
        let ry = this.rainSeeds[i * 3 + 1] - fallSpeed * dt;
        const rz = this.rainSeeds[i * 3 + 2];

        rx += windX * dt;
        if (ry < 0) {
          ry += 48;
          rx = (Math.random() - 0.5) * 110;
        }
        this.rainSeeds[i * 3] = rx;
        this.rainSeeds[i * 3 + 1] = ry;

        const wx = focusPos.x + rx;
        const wz = focusPos.z + rz;
        this.rainPositions[i * 6] = wx;
        this.rainPositions[i * 6 + 1] = ry;
        this.rainPositions[i * 6 + 2] = wz;
        this.rainPositions[i * 6 + 3] = wx - windX * 0.05;
        this.rainPositions[i * 6 + 4] = ry + streakLen;
        this.rainPositions[i * 6 + 5] = wz;
      }
      posAttr.needsUpdate = true;
    }
  }

  private updateSimulation(dt: number, nowMs: number): void {
    const hero = this.getActiveHero();
    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    this.abilityCooldown = Math.max(0, this.abilityCooldown - dt);
    this.damageFlashTimer = Math.max(0, this.damageFlashTimer - dt);
    this.houseBonusCooldown = Math.max(0, this.houseBonusCooldown - dt);
    this.repairShopCooldown = Math.max(0, this.repairShopCooldown - dt);
    this.cameraZoomTransition = Math.max(
      0,
      this.cameraZoomTransition - dt * 1.6,
    );
    this.cameraShake = Math.max(0, this.cameraShake - dt * 1.8);

    const up = this.keys.has('KeyW') || this.keys.has('ArrowUp');
    const down = this.keys.has('KeyS') || this.keys.has('ArrowDown');
    const left = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
    const right = this.keys.has('KeyD') || this.keys.has('ArrowRight');
    const boost = this.keys.has('Space');

    // 1. Player Movement (with Weather + Beach Sand Grip & Hydroplane Drift Physics)
    if (hero.inVehicle) {
      const v = hero.vehicle;
      const spec = WEATHER_SPECS[this.weather];
      const onSand = v.mesh.position.x > BOARDWALK_X_END && Math.abs(v.mesh.position.z) > 7;
      const surfaceFactor = onSand ? 0.88 : 1.0;
      const maxSpeed = (boost && hero.nitro > 5 ? 60 : 40) * surfaceFactor;
      const accel =
        (boost && hero.nitro > 5 ? 48 : 30) * (0.78 + 0.22 * this.currentGrip) * surfaceFactor;

      if (onSand && Math.abs(v.speed) > 10 && Math.random() < 0.28) {
        this.spawnBurst(v.mesh.position, 0xd4a962, 2, 5);
      }

      if (boost && up && hero.nitro > 5) {
        hero.nitro = Math.max(0, hero.nitro - dt * 30);
        if (Math.random() < 0.14) this.sound.playBoost();
      } else {
        hero.nitro = Math.min(100, hero.nitro + dt * 18);
      }

      if (up) v.speed += accel * dt;
      else if (down) v.speed -= 34 * this.currentGrip * dt;
      else {
        const coastDrag = Math.pow(0.25 + (1 - this.currentGrip) * 0.4, dt);
        v.speed *= coastDrag;
      }

      v.speed = Math.max(-18, Math.min(maxSpeed, v.speed));

      let steerInput = 0;
      if (Math.abs(v.speed) > 0.6) {
        const steerFactor = Math.min(1, Math.abs(v.speed) / 14);
        const reverseSign = v.speed >= 0 ? 1 : -1;
        if (left) steerInput += 1;
        if (right) steerInput -= 1;

        const turnRate = 2.55 * (0.82 + 0.18 * this.currentGrip);
        v.heading += steerInput * turnRate * steerFactor * reverseSign * dt;

        // Lateral slide on wet asphalt when turning at high speed
        const targetSlip =
          steerInput *
          (v.speed / 40) *
          spec.driftFactor *
          (1 - this.currentGrip * 0.55) *
          8.5;
        this.lateralSlip = THREE.MathUtils.damp(
          this.lateralSlip,
          targetSlip,
          4.5,
          dt,
        );
      } else {
        this.lateralSlip = THREE.MathUtils.damp(this.lateralSlip, 0, 6, dt);
      }

      const fwdX = Math.sin(v.heading);
      const fwdZ = Math.cos(v.heading);
      const sideX = Math.cos(v.heading);
      const sideZ = -Math.sin(v.heading);

      v.mesh.position.x += (fwdX * v.speed + sideX * this.lateralSlip) * dt;
      v.mesh.position.z += (fwdZ * v.speed + sideZ * this.lateralSlip) * dt;
      v.mesh.rotation.y = v.heading;

      // Spin 4 wheel assemblies
      const wheelSpin = v.speed * dt * 2.2;
      for (let w = 0; w < v.wheels.length; w++) {
        v.wheels[w].rotation.x += wheelSpin;
      }

      const hitWall = this.resolveCollisions(v.mesh.position, 1.85);
      if (hitWall && Math.abs(v.speed) > 12) {
        this.sound.playCrash();
        this.cameraShake = 0.45;
        this.hitstopTimer = 0.038;
        this.spawnBurst(v.mesh.position, 0xffaa00, 10, 14);
        this.damagePlayer(Math.abs(v.speed) * 0.22);
        v.speed *= -0.35;
      }
      this.sound.updateEngine(v.speed / 45, true, true);
    } else {
      const walkSpeed = 13.0;
      let moveForward = 0;
      if (up) moveForward += 1;
      if (down) moveForward -= 0.7;
      if (left) hero.ped.rotation.y += 3.3 * dt;
      if (right) hero.ped.rotation.y -= 3.3 * dt;

      hero.ped.position.x +=
        Math.sin(hero.ped.rotation.y) * moveForward * walkSpeed * dt;
      hero.ped.position.z +=
        Math.cos(hero.ped.rotation.y) * moveForward * walkSpeed * dt;
      this.resolveCollisions(hero.ped.position, 0.6);

      const limbs = hero.ped.userData as {
        legL: THREE.Object3D;
        legR: THREE.Object3D;
        armL: THREE.Object3D;
        armR: THREE.Object3D;
      };
      if (limbs && Math.abs(moveForward) > 0.1) {
        const swing = Math.sin(nowMs * 0.014) * 0.55;
        limbs.legL.rotation.x = swing;
        limbs.legR.rotation.x = -swing;
        limbs.armL.rotation.x = -swing * 0.7;
        limbs.armR.rotation.x = swing * 0.7;
      } else if (limbs) {
        limbs.legL.rotation.x = 0;
        limbs.legR.rotation.x = 0;
        limbs.armL.rotation.x = 0;
        limbs.armR.rotation.x = 0;
      }
      this.sound.updateEngine(0, false, true);
    }

    const pPos = this.getPlayerPosition();

    // Check nearby Enterable Houses & Public Places
    if (this.activeInterior) {
      const door = this.activeInterior.interiorExitDoor;
      const distExit = Math.hypot(pPos.x - door.x, pPos.z - door.z);
      this.nearbyPlace = distExit < 3.4 ? this.activeInterior : null;
    } else {
      let found: EnterablePlaceSpec | null = null;
      let bestDist = 6.8;
      for (const pl of ENTERABLE_PLACES) {
        const d = Math.hypot(pPos.x - pl.entryX, pPos.z - pl.entryZ);
        if (d < bestDist) {
          bestDist = d;
          found = pl;
        }
      }
      this.nearbyPlace = found;

      // Check Drive-In Vehicle Repair Shops
      if (this.repairShopCooldown <= 0) {
        for (const shop of REPAIR_SHOPS) {
          const d = Math.hypot(pPos.x - shop.bayX, pPos.z - shop.bayZ);
          if (d < 6.0) {
            const needsService =
              hero.health < 100 ||
              hero.armor < 100 ||
              hero.nitro < 100 ||
              this.wantedLevel > 0;
            if (needsService) {
              this.repairShopCooldown = 10;
              const fee = this.cash >= 100 ? 100 : 0;
              this.cash -= fee;
              hero.health = 100;
              hero.armor = 100;
              hero.nitro = 100;
              if (this.wantedLevel > 0) {
                this.wantedLevel = Math.max(0, this.wantedLevel - 2);
                this.syncPoliceCount();
              }
              this.sound.playCash();
              this.spawnBurst(pPos, 0xff9f43, 14, 15);
              this.callbacks.onToast(
                fee > 0
                  ? `${shop.name}: FULL REPAIR & RESPRAY (-$100)`
                  : `${shop.name}: FREE REPAIR & RESPRAY`,
                '#ff9f43',
              );
              this.emitHud();
            }
            break;
          }
        }
      }
    }

    // 2. Predefined-Path City Road Network Traffic AI
    this.activeVehiclesSet.clear();
    for (let p = 0; p < this.protagonists.length; p++) {
      if (this.protagonists[p].inVehicle) {
        this.activeVehiclesSet.add(this.protagonists[p].vehicle);
      }
    }
    updateTrafficNetwork(
      this.trafficAgents,
      this.activeVehiclesSet,
      pPos,
      hero.inVehicle,
      hero.vehicle,
      dt,
      (v) => {
        this.sound.playCrash();
        this.cameraShake = 0.32;
        _v1.subVectors(v.mesh.position, pPos).normalize();
        v.mesh.position.addScaledVector(_v1, 2.4);
        hero.vehicle.speed *= 0.65;
        this.spawnBurst(v.mesh.position, 0xffcc00, 8, 12);
        this.addWanted(1);
      },
    );

    // 3. Complete Police Pursuit AI & Wanted Decay
    this.syncPoliceCount();
    this.sound.updateSiren(dt, this.wantedLevel);

    let closestCopDist = 999;
    const sirenPhase = Math.floor(nowMs / 170) % 2 === 0;
    const visibilityPenalty = this.weather === 'FOG' ? 0.78 : this.weather === 'HEAVY_RAIN' ? 0.86 : 1.0;

    for (let i = 0; i < this.policeCars.length; i++) {
      const cop = this.policeCars[i];
      const dx = pPos.x - cop.mesh.position.x;
      const dz = pPos.z - cop.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      closestCopDist = Math.min(closestCopDist, dist);

      // Respawn far-behind cruisers ahead on perimeter
      if (dist > 155) {
        const ang = Math.random() * Math.PI * 2;
        cop.mesh.position.set(
          THREE.MathUtils.clamp(
            pPos.x + Math.cos(ang) * 70,
            -CITY_SIZE / 2 + 12,
            CITY_SIZE / 2 - 12,
          ),
          0,
          THREE.MathUtils.clamp(
            pPos.z + Math.sin(ang) * 70,
            -CITY_SIZE / 2 + 12,
            CITY_SIZE / 2 - 12,
          ),
        );
      }

      const targetHeading = Math.atan2(dx, dz);
      let diff = targetHeading - cop.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      cop.heading += THREE.MathUtils.clamp(diff, -2.8 * dt, 2.8 * dt);

      cop.speed = (28 + this.wantedLevel * 4.2) * visibilityPenalty;
      cop.mesh.position.x += Math.sin(cop.heading) * cop.speed * dt;
      cop.mesh.position.z += Math.cos(cop.heading) * cop.speed * dt;
      cop.mesh.rotation.y = cop.heading;
      for (const w of cop.wheels) w.rotation.x += cop.speed * dt * 2.1;

      if (this.resolveCollisions(cop.mesh.position, 1.85)) {
        cop.heading += (i % 2 === 0 ? 1 : -1) * 0.9;
      }

      // Flash lightbars
      if (cop.sirenRed && cop.sirenBlue) {
        cop.sirenRed.scale.setScalar(sirenPhase ? 1.25 : 0.75);
        cop.sirenBlue.scale.setScalar(sirenPhase ? 0.75 : 1.25);
      }

      // Police ram player
      if (dist < 3.4) {
        this.sound.playCrash();
        this.cameraShake = 0.45;
        this.damagePlayer(10 + this.wantedLevel * 2);
        _v1.subVectors(cop.mesh.position, pPos).normalize();
        cop.mesh.position.addScaledVector(_v1, 4.5);
        this.spawnBurst(pPos, 0x00e5ff, 8, 12);
      }

      // At 3+ Wanted Stars, interceptors fire pursuit laser rounds
      if (this.wantedLevel >= 3 && dist < 44 * visibilityPenalty) {
        cop.shootTimer -= dt;
        if (cop.shootTimer <= 0) {
          cop.shootTimer = Math.max(1.1, 2.8 - this.wantedLevel * 0.3);
          const dir = new THREE.Vector3(dx, 0, dz).normalize();
          const bMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.24, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0xff3b30 }),
          );
          bMesh.position
            .copy(cop.mesh.position)
            .add(_v1.set(0, 1.25, 0))
            .addScaledVector(dir, 2.5);
          this.scene.add(bMesh);
          this.bullets.push({
            mesh: bMesh,
            dir,
            life: 1.4,
            fromPolice: true,
          });
        }
      }
    }

    // Wanted star decay when player evades line of sight (faster in fog!)
    if (this.wantedLevel > 0) {
      const evadeRange = this.weather === 'FOG' ? 32 : 48;
      if (closestCopDist > evadeRange) {
        const decayRate = this.weather === 'FOG' ? 1.8 : 1.0;
        this.wantedDecayTimer -= dt * decayRate;
        if (this.wantedDecayTimer <= 0) {
          this.wantedLevel = Math.max(0, this.wantedLevel - 1);
          this.wantedDecayTimer = 11;
          this.syncPoliceCount();
          if (this.wantedLevel === 0) {
            this.callbacks.onToast('LSPD PURSUIT EVADED!', '#4cd964');
          }
        }
      } else {
        this.wantedDecayTimer = 12;
      }
    }

    // 4. Update Pedestrians (including Bounty Targets)
    for (const ped of this.pedestrians) {
      if (!ped.alive) {
        ped.respawnTimer -= dt;
        if (ped.respawnTimer <= 0) {
          ped.alive = true;
          ped.mesh.visible = true;
          ped.mesh.position.set(
            (Math.random() - 0.5) * 260,
            0.35,
            (Math.random() - 0.5) * 260,
          );
        }
        continue;
      }

      ped.timer -= dt;
      if (ped.timer <= 0) {
        ped.timer = 2 + Math.random() * 3;
        ped.dir += (Math.random() - 0.5) * 2.5;
      }
      const spd = ped.isBounty ? 4.2 : 2.8;
      ped.mesh.position.x += Math.sin(ped.dir) * spd * dt;
      ped.mesh.position.z += Math.cos(ped.dir) * spd * dt;
      ped.mesh.rotation.y = ped.dir;
      this.resolveCollisions(ped.mesh.position, 0.5);

      if (ped.isBounty) {
        this.missionTarget.copy(ped.mesh.position);
        this.beaconGroup.position.set(
          ped.mesh.position.x,
          0,
          ped.mesh.position.z,
        );
      }

      if (
        hero.inVehicle &&
        Math.abs(hero.vehicle.speed) > 9 &&
        pPos.distanceTo(ped.mesh.position) < 2.3
      ) {
        ped.alive = false;
        ped.mesh.visible = false;
        ped.respawnTimer = 8;
        this.spawnBurst(ped.mesh.position, 0xff3b30, 8, 10);
        this.addWanted(1);
        if (ped.isBounty) {
          ped.isBounty = false;
          this.completeCurrentMission();
        } else {
          this.callbacks.onToast('HIT & RUN • +1 WANTED STAR', '#ff3b30');
        }
      }
    }

    // 5. Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt;
      b.mesh.position.addScaledVector(b.dir, (b.fromPolice ? 52 : 68) * dt);

      if (b.fromPolice) {
        if (b.mesh.position.distanceTo(pPos) < 2.0) {
          b.life = 0;
          this.damagePlayer(8);
        }
      } else {
        for (const cop of this.policeCars) {
          if (b.mesh.position.distanceTo(cop.mesh.position) < 2.6) {
            b.life = 0;
            this.cash += 250;
            this.spawnBurst(cop.mesh.position, 0xffcc00, 12, 16);
            cop.mesh.position.x += (Math.random() - 0.5) * 110;
            cop.mesh.position.z += (Math.random() - 0.5) * 110;
            this.callbacks.onToast('LSPD CRUISER DISABLED! +$250', '#ffcc00');
          }
        }

        if (
          this.missionType === 'BOUNTY' &&
          this.bountyTargetPed &&
          this.bountyTargetPed.alive
        ) {
          if (
            b.mesh.position.distanceTo(this.bountyTargetPed.mesh.position) < 1.9
          ) {
            b.life = 0;
            this.bountyTargetPed.alive = false;
            this.bountyTargetPed.isBounty = false;
            this.bountyTargetPed.mesh.visible = false;
            this.bountyTargetPed.respawnTimer = 10;
            this.completeCurrentMission();
          }
        }
      }

      if (b.life <= 0) {
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.Material).dispose();
        this.bullets.splice(i, 1);
      }
    }

    // 6. Pickups
    for (const pk of this.pickups) {
      pk.mesh.rotation.y += 2.2 * dt;
      if (!pk.active) {
        pk.respawn -= dt;
        if (pk.respawn <= 0) {
          pk.active = true;
          pk.mesh.visible = true;
        }
        continue;
      }
      if (pPos.distanceTo(pk.mesh.position) < 3.4) {
        pk.active = false;
        pk.mesh.visible = false;
        pk.respawn = 15;
        this.sound.playCash();
        this.spawnBurst(
          pk.mesh.position,
          pk.isHealth ? 0x2ecc71 : 0x00f0ff,
          10,
          10,
        );
        if (pk.isHealth) {
          hero.health = Math.min(100, hero.health + 50);
          this.callbacks.onToast('MEDKIT COLLECTED +50 HP', '#2ecc71');
        } else {
          hero.armor = Math.min(100, hero.armor + 50);
          this.callbacks.onToast('BODY ARMOR EQUIPPED +50', '#00f0ff');
        }
      }
    }

    // 7. Particles
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.vel.y -= 24 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.mesh.position.y < 0.15) {
        p.mesh.position.y = 0.15;
        p.vel.y *= -0.35;
      }
      p.mesh.scale.setScalar(Math.max(0.05, p.life / p.maxLife));
    }

    // 8. Mission Waypoint Check
    this.beaconRing.rotation.z += 1.8 * dt;
    const distToMission = pPos.distanceTo(this.missionTarget);
    if (distToMission < 6.0 && this.missionType !== 'BOUNTY') {
      if (this.missionType === 'DELIVERY' && this.missionStage === 0) {
        this.missionStage = 1;
        this.missionTarget.copy(this.missionDropoff);
        this.beaconGroup.position.copy(this.missionDropoff);
        this.beaconBeamMat.color.setHex(0x2ecc71);
        this.beaconRingMat.color.setHex(0x2ecc71);
        this.missionAccent = '#2ecc71';
        this.sound.playCash();
        this.addWanted(2);
        const dropArea = getDistrictName(
          this.missionDropoff.x,
          this.missionDropoff.z,
        );
        this.missionDesc = `Step 2/2: Lose the heat and deliver the vault case to ${dropArea}!`;
        this.callbacks.onToast(
          'VAULT CASE SECURED! DELIVER TO GREEN BEACON',
          '#2ecc71',
        );
      } else {
        this.completeCurrentMission();
      }
    }

    // 9. Radio sequencer
    this.radio.setVehicleActive(hero.inVehicle && this.phase === 'playing');
    this.radio.update(dt);

    // 10. Camera Rig
    this.updateCamera(dt);
  }

  private updateCamera(dt: number): void {
    const targetPos = this.getPlayerPosition();
    const heading = this.getPlayerHeading() + this.cameraYawOffset;

    let dist = 12.5;
    let height = 5.4;
    if (this.activeInterior) {
      dist = 6.2;
      height = 3.8;
    } else {
      if (this.cameraMode === 1) {
        dist = 20;
        height = 9.5;
      }
      if (this.cameraMode === 2) {
        dist = 4.5;
        height = 24;
      }
    }

    if (this.cameraZoomTransition > 0) {
      height += this.cameraZoomTransition * 55;
      dist += this.cameraZoomTransition * 28;
    }

    const shakeX =
      this.cameraShake > 0 ? (Math.random() - 0.5) * this.cameraShake : 0;
    const shakeY =
      this.cameraShake > 0 ? (Math.random() - 0.5) * this.cameraShake : 0;

    _v2.set(
      targetPos.x - Math.sin(heading) * dist + shakeX,
      targetPos.y + height + shakeY,
      targetPos.z - Math.cos(heading) * dist,
    );

    const alpha = 1 - Math.exp(-8.5 * dt);
    this.camera.position.lerp(_v2, alpha);

    _v3.set(
      targetPos.x + Math.sin(heading) * 6,
      targetPos.y + 1.6,
      targetPos.z + Math.cos(heading) * 6,
    );
    this.camera.lookAt(_v3);
  }

  private renderMinimap(nowMs: number): void {
    const canvas = this.minimapCanvas;
    if (!canvas) return;
    const mCtx = canvas.getContext('2d');
    if (!mCtx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = 0.72;

    mCtx.clearRect(0, 0, w, h);
    mCtx.fillStyle = '#0b101b';
    mCtx.fillRect(0, 0, w, h);

    const pPos = this.getPlayerPosition();
    const heading = this.getPlayerHeading();

    mCtx.save();
    mCtx.translate(cx, cy);
    mCtx.rotate(heading);

    // Airport Tarmac & Runway (West Coast)
    mCtx.fillStyle = '#181e2c';
    mCtx.fillRect(
      (-526 - pPos.x) * scale,
      (-360 - pPos.z) * scale,
      178 * scale,
      720 * scale,
    );
    mCtx.fillStyle = '#0c1018';
    mCtx.fillRect(
      (-489 - pPos.x) * scale,
      (-290 - pPos.z) * scale,
      38 * scale,
      580 * scale,
    );

    // Boardwalk, Sandy Beach, Ocean & Pier (East Coast)
    mCtx.fillStyle = '#6d4c3d';
    mCtx.fillRect(
      (348 - pPos.x) * scale,
      (-360 - pPos.z) * scale,
      14 * scale,
      720 * scale,
    );
    mCtx.fillStyle = '#c89d54';
    mCtx.fillRect(
      (362 - pPos.x) * scale,
      (-360 - pPos.z) * scale,
      68 * scale,
      720 * scale,
    );
    mCtx.fillStyle = '#063858';
    mCtx.fillRect(
      (430 - pPos.x) * scale,
      (-360 - pPos.z) * scale,
      260 * scale,
      720 * scale,
    );
    mCtx.fillStyle = '#8b5e3c';
    mCtx.fillRect(
      (420 - pPos.x) * scale,
      (-7 - pPos.z) * scale,
      68 * scale,
      14 * scale,
    );

    mCtx.strokeStyle = '#2c364d';
    mCtx.lineWidth = 11;
    for (const rc of this.roadCoords) {
      const rx = (rc - pPos.x) * scale;
      const rz = (rc - pPos.z) * scale;
      mCtx.beginPath();
      mCtx.moveTo(rx, -350);
      mCtx.lineTo(rx, 350);
      mCtx.stroke();

      mCtx.beginPath();
      mCtx.moveTo(-350, rz);
      mCtx.lineTo(350, rz);
      mCtx.stroke();
    }

    // Other protagonists & police dots (world space)
    this.protagonists.forEach((other, idx) => {
      if (idx === this.activeCharIdx) return;
      const oPos = other.inVehicle
        ? other.vehicle.mesh.position
        : other.ped.position;
      const ox = (oPos.x - pPos.x) * scale;
      const oz = (oPos.z - pPos.z) * scale;
      mCtx.fillStyle = other.accent;
      mCtx.beginPath();
      mCtx.arc(ox, oz, 3.8, 0, Math.PI * 2);
      mCtx.fill();
    });

    for (const cop of this.policeCars) {
      const dx = (cop.mesh.position.x - pPos.x) * scale;
      const dz = (cop.mesh.position.z - pPos.z) * scale;
      mCtx.fillStyle =
        Math.floor(nowMs / 180) % 2 === 0 ? '#ff3b30' : '#00f0ff';
      mCtx.beginPath();
      mCtx.arc(dx, dz, 3.6, 0, Math.PI * 2);
      mCtx.fill();
    }

    // Remove raw square placeholders — draw crisp upright dynamic vector icons below
    const maxR = cx - 13;
    const pulseWave = (Math.sin(nowMs * 0.007) + 1) * 0.5;
    const hero = this.getActiveHero();
    const lowHealthOrArmor = hero.health < 70 || hero.armor < 50;

    const placeRotated = (
      wx: number,
      wz: number,
      clampToEdge: boolean,
      drawFn: (screenClamped: boolean) => void,
    ) => {
      const dx = (wx - pPos.x) * scale;
      const dz = (wz - pPos.z) * scale;
      const d = Math.hypot(dx, dz);
      const clamped = d > maxR;
      if (clamped && !clampToEdge) return;
      const px = clamped ? (dx / d) * maxR : dx;
      const pz = clamped ? (dz / d) * maxR : dz;
      mCtx.save();
      mCtx.translate(px, pz);
      mCtx.rotate(-heading);
      drawFn(clamped);
      mCtx.restore();
    };

    // A. Public Enterable Places (Diamond Badge)
    for (const pl of ENTERABLE_PLACES) {
      if (pl.kind !== 'PLACE') continue;
      placeRotated(pl.entryX, pl.entryZ, false, () => {
        mCtx.fillStyle = '#090e18';
        mCtx.strokeStyle = pl.accent;
        mCtx.lineWidth = 1.5;
        mCtx.beginPath();
        mCtx.moveTo(0, -5);
        mCtx.lineTo(5, 0);
        mCtx.lineTo(0, 5);
        mCtx.lineTo(-5, 0);
        mCtx.closePath();
        mCtx.fill();
        mCtx.stroke();
      });
    }

    // B. Safehouses (House Icon — active hero's house highlighted & clamped to rim)
    for (const pl of ENTERABLE_PLACES) {
      if (pl.kind !== 'HOUSE') continue;
      const isOwned = pl.ownerCharIdx === this.activeCharIdx;
      placeRotated(pl.entryX, pl.entryZ, isOwned, (clamped) => {
        if (isOwned) {
          mCtx.strokeStyle = pl.accent;
          mCtx.globalAlpha = clamped ? 0.85 : 0.45 + pulseWave * 0.4;
          mCtx.lineWidth = 1.5;
          mCtx.beginPath();
          mCtx.arc(0, 0, 8.5, 0, Math.PI * 2);
          mCtx.stroke();
          mCtx.globalAlpha = 1;
        }
        // Dark badge + upright house silhouette
        mCtx.fillStyle = '#090e18';
        mCtx.beginPath();
        mCtx.arc(0, 0, 6.8, 0, Math.PI * 2);
        mCtx.fill();
        mCtx.fillStyle = pl.accent;
        mCtx.beginPath();
        mCtx.moveTo(0, -4.6); // roof peak
        mCtx.lineTo(4.6, -0.4);
        mCtx.lineTo(3.2, -0.4);
        mCtx.lineTo(3.2, 4.2);
        mCtx.lineTo(-3.2, 4.2);
        mCtx.lineTo(-3.2, -0.4);
        mCtx.lineTo(-4.6, -0.4);
        mCtx.closePath();
        mCtx.fill();
        // Door cutout
        mCtx.fillStyle = '#090e18';
        mCtx.fillRect(-1.0, 1.0, 2.0, 3.2);
      });
    }

    // C. Vehicle Repair Shops (Wrench Icon — nearest shop clamped, pulses green when damaged)
    let nearestShop = REPAIR_SHOPS[0];
    let nearestShopDist = Infinity;
    for (const sh of REPAIR_SHOPS) {
      const sd = Math.hypot(sh.bayX - pPos.x, sh.bayZ - pPos.z);
      if (sd < nearestShopDist) {
        nearestShopDist = sd;
        nearestShop = sh;
      }
    }
    for (const sh of REPAIR_SHOPS) {
      const isNearest = sh === nearestShop;
      placeRotated(sh.bayX, sh.bayZ, isNearest, (clamped) => {
        const badgeColor =
          lowHealthOrArmor && pulseWave > 0.5 ? '#2ecc71' : '#ff9f43';
        if (lowHealthOrArmor) {
          mCtx.strokeStyle = badgeColor;
          mCtx.globalAlpha = 0.35 + pulseWave * 0.55;
          mCtx.lineWidth = 1.6;
          mCtx.beginPath();
          mCtx.arc(0, 0, 8.5 + pulseWave * 2, 0, Math.PI * 2);
          mCtx.stroke();
          mCtx.globalAlpha = 1;
        }
        mCtx.fillStyle = '#090e18';
        mCtx.strokeStyle = badgeColor;
        mCtx.lineWidth = clamped ? 1.4 : 1.8;
        mCtx.beginPath();
        mCtx.arc(0, 0, 6.6, 0, Math.PI * 2);
        mCtx.fill();
        mCtx.stroke();

        // Upright diagonal wrench silhouette
        mCtx.save();
        mCtx.rotate(-Math.PI / 4);
        mCtx.fillStyle = badgeColor;
        mCtx.fillRect(-1.1, -3.5, 2.2, 6.5);
        mCtx.beginPath();
        mCtx.arc(0, -3.4, 2.3, 0, Math.PI * 2);
        mCtx.fill();
        mCtx.fillStyle = '#090e18';
        mCtx.fillRect(-0.85, -5.2, 1.7, 2.3);
        mCtx.restore();
      });
    }

    // D. Mission Start / Active Objective (Pulsing Star, Dropoff Flag, Bounty Reticle, or Escape Shield)
    placeRotated(this.missionTarget.x, this.missionTarget.z, true, () => {
      // Animated expanding pulse ring
      mCtx.strokeStyle = this.missionAccent;
      mCtx.globalAlpha = 0.85 - pulseWave * 0.6;
      mCtx.lineWidth = 1.6;
      mCtx.beginPath();
      mCtx.arc(0, 0, 7 + pulseWave * 4.5, 0, Math.PI * 2);
      mCtx.stroke();
      mCtx.globalAlpha = 1;

      mCtx.fillStyle = '#090e18';
      mCtx.beginPath();
      mCtx.arc(0, 0, 7.2, 0, Math.PI * 2);
      mCtx.fill();

      mCtx.fillStyle = this.missionAccent;
      mCtx.strokeStyle = this.missionAccent;
      if (this.missionType === 'BOUNTY') {
        // Bounty crosshair reticle
        mCtx.lineWidth = 1.7;
        mCtx.beginPath();
        mCtx.arc(0, 0, 4.3, 0, Math.PI * 2);
        mCtx.moveTo(-6, 0);
        mCtx.lineTo(-2.5, 0);
        mCtx.moveTo(2.5, 0);
        mCtx.lineTo(6, 0);
        mCtx.moveTo(0, -6);
        mCtx.lineTo(0, -2.5);
        mCtx.moveTo(0, 2.5);
        mCtx.lineTo(0, 6);
        mCtx.stroke();
      } else if (this.missionType === 'DELIVERY' && this.missionStage === 1) {
        // Dropoff Flag
        mCtx.fillRect(-3.2, -4.5, 1.4, 9);
        mCtx.beginPath();
        mCtx.moveTo(-2, -4.5);
        mCtx.lineTo(4.5, -2.2);
        mCtx.lineTo(-2, 0.2);
        mCtx.closePath();
        mCtx.fill();
      } else {
        // Mission Start / Objective 5-Point Star
        mCtx.beginPath();
        for (let k = 0; k < 10; k++) {
          const r = k % 2 === 0 ? 5.6 : 2.4;
          const a = (k * Math.PI) / 5 - Math.PI / 2;
          const sx = Math.cos(a) * r;
          const sy = Math.sin(a) * r;
          if (k === 0) mCtx.moveTo(sx, sy);
          else mCtx.lineTo(sx, sy);
        }
        mCtx.closePath();
        mCtx.fill();
      }
    });

    mCtx.restore();

    mCtx.fillStyle = '#ffffff';
    mCtx.beginPath();
    mCtx.moveTo(cx, cy - 7);
    mCtx.lineTo(cx + 5, cy + 5);
    mCtx.lineTo(cx, cy + 2);
    mCtx.lineTo(cx - 5, cy + 5);
    mCtx.closePath();
    mCtx.fill();
  }

  private emitHud(): void {
    const hero = this.getActiveHero();
    const pPos = this.getPlayerPosition();
    const tr = this.radio.getCurrentTrack();
    const bc = this.radio.getBroadcastState();
    this.callbacks.onHudUpdate({
      cash: this.cash,
      level: this.level,
      missionsCompleted: this.missionsCompleted,
      wantedLevel: this.wantedLevel,
      maxWantedReached: this.maxWantedReached,
      activeCharIdx: this.activeCharIdx,
      cameraMode: this.cameraMode,
      health: Math.round(hero.health),
      armor: Math.round(hero.armor),
      nitro: Math.round(hero.nitro),
      inVehicle: hero.inVehicle,
      speedMph: hero.inVehicle
        ? Math.round(Math.abs(hero.vehicle.speed) * 3.1)
        : 13,
      vehicleName: hero.inVehicle ? hero.vehicle.name : hero.fullName,
      district: this.activeInterior
        ? this.activeInterior.name
        : getDistrictName(pPos.x, pPos.z),
      missionTitle: this.missionTitle,
      missionDesc: this.missionDesc,
      missionDist: Math.round(pPos.distanceTo(this.missionTarget)),
      missionAccent: this.missionAccent,
      abilityCooldown: Math.ceil(this.abilityCooldown),
      damageFlash: this.damageFlashTimer > 0,
      weather: this.weather,
      weatherAuto: this.weatherAuto,
      gripPercent: Math.round(this.currentGrip * 100),
      timeOfDay: this.timeOfDay,
      timePhase: this.timePhase,
      timeAuto: this.timeAuto,
      radioStationIdx: this.radio.getStationIndex(),
      radioTrackTitle: tr.title,
      radioTrackArtist: tr.artist,
      radioSegment: bc.segment,
      radioBroadcastSpeaker: bc.speaker,
      radioBroadcastLine: bc.line,
      nearbyPlaceName: this.nearbyPlace ? this.nearbyPlace.name : null,
      nearbyPlaceKind: this.nearbyPlace ? this.nearbyPlace.kind : null,
      nearbyPlaceAccent: this.nearbyPlace ? this.nearbyPlace.accent : '#00f0ff',
      activeInteriorId: this.activeInterior ? this.activeInterior.id : null,
      activeInteriorName: this.activeInterior ? this.activeInterior.name : null,
      activeInteriorPerk: this.activeInterior ? this.activeInterior.perkLabel : null,
    });
  }

  private tick = (now?: number): void => {
    if (this.disposed) return;
    const timestamp = typeof now === 'number' ? now : performance.now();
    const rawDt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    this.monumentMesh.rotation.y += dt * 0.7;
    this.surfMesh.position.x = 432 + Math.sin(timestamp * 0.0018) * 1.4;
    this.radarDishMesh.rotation.y += dt * 1.4;
    this.flyoverPlane.position.z += dt * 42;
    if (this.flyoverPlane.position.z > 380) {
      this.flyoverPlane.position.z = -380;
    }
    for (let i = 0; i < this.portalRings.length; i++) {
      this.portalRings[i].rotation.y += dt * 2.1;
    }

    if (this.phase === 'title') {
      const t = timestamp * 0.00022;
      this.camera.position.set(Math.cos(t) * 105, 56, Math.sin(t) * 105);
      this.camera.lookAt(0, 12, 0);
      this.updateDayNightCycle(dt, _v1.set(0, 0, 0));
      this.updateWeather(dt, _v1.set(0, 0, 0));
    } else if (this.phase === 'playing') {
      const focusPos = this.getPlayerPosition();
      this.updateDayNightCycle(dt, focusPos);
      this.updateWeather(dt, focusPos);
      if (this.hitstopTimer > 0) {
        this.hitstopTimer -= dt;
      } else {
        this.updateSimulation(dt, timestamp);
      }
      this.renderMinimap(timestamp);
      this.hudSyncTimer += dt;
      if (this.hudSyncTimer >= 0.08) {
        this.hudSyncTimer = 0;
        this.emitHud();
      }
    }

    this.renderer.render(this.scene, this.camera);
    this.scheduleNextFrame();
  };

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(() => this.tick());
    } else {
      this.isTimeoutId = false;
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (status === gl.UNSIGNALED) {
        this.isTimeoutId = true;
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.isTimeoutId = true;
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.isTimeoutId = true;
    this.frameId = window.setTimeout(poll, 5);
  }

  public dispose(): void {
    this.disposed = true;
    if (this.isTimeoutId) clearTimeout(this.frameId);
    else cancelAnimationFrame(this.frameId);

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('resize', this.onResize);

    this.radio.dispose();
    this.sound.dispose();
    this.pmremEnvTex.dispose();

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

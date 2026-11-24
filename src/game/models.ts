import * as THREE from 'three';
import {
  buildAllInteriors,
  InteriorsBuildResult,
  isHouseOrPlaceBlock,
} from './interiors';
import {
  createAsphaltTexture,
  createBoardwalkTexture,
  createBuildingTexture,
  createContactShadowTexture,
  createFaceTexture,
  createSandTexture,
} from './textures';

export const CITY_SIZE = 680;
export const BLOCK_SIZE = 56;
export const ROAD_WIDTH = 16;
export const AIRPORT_X_START = -520;
export const AIRPORT_X_END = -348;
export const BOARDWALK_X_START = 348;
export const BOARDWALK_X_END = 362;
export const BEACH_X_END = 426;
export const PIER_X_END = 484;

export interface WorldDestination {
  id: string;
  label: string;
  country: string;
  x: number;
  z: number;
  heading: number;
  accent: string;
}

export const WORLD_DESTINATIONS: WorldDestination[] = [
  { id: 'DOWNTOWN', label: 'Central Plaza', country: 'VICE METRO', x: 0, z: 28, heading: 0, accent: '#00f0ff' },
  { id: 'AIRPORT', label: 'Vice Intl Airport', country: 'VIX RUNWAY', x: -465, z: 120, heading: Math.PI, accent: '#48dbfb' },
  { id: 'BEACH', label: 'Vice Beach & Pier', country: 'USA COAST', x: 392, z: 0, heading: -Math.PI / 2, accent: '#feca57' },
  { id: 'VANCE_HOUSE', label: "Vance's Ocean Villa", country: 'SAFEHOUSE', x: 280, z: 28, heading: Math.PI / 2, accent: '#00f0ff' },
  { id: 'KAEL_HOUSE', label: "Kael's Iron Loft", country: 'SAFEHOUSE', x: 168, z: -28, heading: Math.PI / 2, accent: '#ff2a85' },
  { id: 'NYX_HOUSE', label: "Nyx's Cyber House", country: 'SAFEHOUSE', x: -140, z: 168, heading: Math.PI, accent: '#2ecc71' },
  { id: 'REPAIR', label: 'Vice Customs Repair', country: 'REPAIR SHOP', x: 84, z: 0, heading: Math.PI, accent: '#ff9f43' },
  { id: 'TOKYO', label: 'Tokyo Neon Quarter', country: 'JAPAN', x: -224, z: -224, heading: 0, accent: '#ff2a85' },
  { id: 'PARIS', label: 'Little Paris Plaza', country: 'FRANCE', x: -56, z: -224, heading: 0, accent: '#ffeaa7' },
  { id: 'SWISS', label: 'Alpine Peak Hills', country: 'SWITZERLAND', x: 224, z: -224, heading: 0, accent: '#a55eea' },
  { id: 'EGYPT', label: 'Luxor Pyramid Oasis', country: 'EGYPT', x: -224, z: 224, heading: Math.PI, accent: '#ff9f43' },
  { id: 'LONDON', label: 'London Harbor Docks', country: 'UK', x: 0, z: 224, heading: Math.PI, accent: '#ff3b30' },
  { id: 'BRAZIL', label: 'Copacabana Bay', country: 'BRAZIL', x: 224, z: 224, heading: Math.PI, accent: '#2ecc71' },
];

export interface BuildingCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface VehicleEntity {
  mesh: THREE.Group;
  wheels: THREE.Group[];
  speed: number;
  heading: number;
  steerVisual: number;
  isPolice: boolean;
  name: string;
  sirenRed: THREE.Mesh | null;
  sirenBlue: THREE.Mesh | null;
  aiDir: number;
  aiTimer: number;
  shootTimer: number;
}

export interface CharacterBuildOptions {
  shirtColor?: number;
  pantsColor?: number;
  skinHex?: string;
  eyeHex?: string;
  hasShades?: boolean;
  beardStyle?: string;
  hairHex?: string;
}

export function getDistrictName(x: number, z: number): string {
  if (x < -348) return 'VICE INTL AIRPORT (VIX)';
  if (x > 426) return 'VICE BEACH OCEAN PIER';
  if (x > 348) return 'VICE BEACH & BOARDWALK';
  if (x < -168 && z < -168) return 'TOKYO NEON QUARTER · JAPAN';
  if (x <= 56 && z < -168) return 'LITTLE PARIS PLAZA · FRANCE';
  if (x > 56 && z < -168) return 'ALPINE PEAK HILLS · SWISS';
  if (x < -168 && z > 168) return 'LUXOR PYRAMID OASIS · EGYPT';
  if (x <= 168 && z > 168) return 'LONDON HARBOR DOCKS · UK';
  if (x > 168 && z > 168) return 'COPACABANA BAY · BRAZIL';
  if (x > 168) return 'OCEAN DRIVE RESORTS · USA';
  if (Math.abs(x) < 65 && Math.abs(z) < 65) return 'CENTRAL PLAZA PARK';
  return 'DOWNTOWN FINANCIAL DISTRICT';
}

export function createCarMesh(
  bodyColor: number,
  isPolice: boolean,
  name: string,
  shadowTex: THREE.Texture,
): VehicleEntity {
  const group = new THREE.Group();

  // 1. Contact Shadow Plane (grounded at y = 0.025)
  const contactMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 5.4),
    contactMat,
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.025;
  group.add(contactShadow);

  // 2. Lower Sculpted Chassis Body (glossy metallic clearcoat paint)
  const chassisMat = new THREE.MeshPhysicalMaterial({
    color: bodyColor,
    roughness: 0.24,
    metalness: 0.72,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
  });
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(2.28, 0.62, 4.56),
    chassisMat,
  );
  chassis.position.y = 0.68;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  group.add(chassis);

  // 3. Front Carbon Splitter & Side Skirts (matte dark trim, roughness >= 0.7)
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x10141d,
    roughness: 0.82,
    metalness: 0.25,
  });
  const splitter = new THREE.Mesh(
    new THREE.BoxGeometry(2.34, 0.14, 4.72),
    trimMat,
  );
  splitter.position.y = 0.36;
  splitter.castShadow = true;
  group.add(splitter);

  // 4. Tapered Cabin & Tinted Windshield
  const cabinMat = new THREE.MeshPhysicalMaterial({
    color: isPolice ? 0xf5f7fa : 0x0f1624,
    roughness: 0.12,
    metalness: 0.82,
    clearcoat: 1.0,
  });
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.86, 0.56, 2.24),
    cabinMat,
  );
  cabin.position.set(0, 1.24, -0.18);
  cabin.castShadow = true;
  group.add(cabin);

  // Police white side doors for classic interceptor contrast
  if (isPolice) {
    const doorPanels = new THREE.Mesh(
      new THREE.BoxGeometry(2.32, 0.56, 1.95),
      new THREE.MeshStandardMaterial({
        color: 0xf4f6f8,
        roughness: 0.35,
        metalness: 0.2,
      }),
    );
    doorPanels.position.set(0, 0.7, -0.05);
    group.add(doorPanels);

    // Front Push-Bar Bumper
    const pushBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.38, 0.22),
      trimMat,
    );
    pushBar.position.set(0, 0.55, 2.42);
    group.add(pushBar);
  } else {
    // 5. Rear Performance Wing Spoiler
    const spoilerDeck = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.08, 0.38),
      trimMat,
    );
    spoilerDeck.position.set(0, 1.18, -2.08);
    const strutL = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.26, 0.2),
      trimMat,
    );
    strutL.position.set(-0.68, 1.05, -2.08);
    const strutR = strutL.clone();
    strutR.position.x = 0.68;
    group.add(spoilerDeck, strutL, strutR);
  }

  // 6. Headlights (+Z front)
  const headMat = new THREE.MeshBasicMaterial({ color: 0xdff9fb });
  const hlLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.18, 0.1),
    headMat,
  );
  hlLeft.position.set(-0.74, 0.7, 2.3);
  const hlRight = hlLeft.clone();
  hlRight.position.x = 0.74;
  group.add(hlLeft, hlRight);

  // 7. Taillight Bar (-Z rear)
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
  const tlLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.16, 0.1),
    tailMat,
  );
  tlLeft.position.set(-0.68, 0.74, -2.3);
  const tlRight = tlLeft.clone();
  tlRight.position.x = 0.68;
  group.add(tlLeft, tlRight);

  // 8. Twin Chrome Exhaust Pipes
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xd1d8e0,
    roughness: 0.18,
    metalness: 0.95,
  });
  const exGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.25, 10);
  exGeo.rotateX(Math.PI / 2);
  const exL = new THREE.Mesh(exGeo, chromeMat);
  exL.position.set(-0.55, 0.36, -2.38);
  const exR = exL.clone();
  exR.position.x = 0.55;
  group.add(exL, exR);

  // 9. Police Lightbar
  let sirenRed: THREE.Mesh | null = null;
  let sirenBlue: THREE.Mesh | null = null;
  if (isPolice) {
    const barBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.26, 0.08, 0.32),
      trimMat,
    );
    barBase.position.set(0, 1.56, -0.1);
    sirenRed = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.16, 0.28),
      new THREE.MeshBasicMaterial({ color: 0xff1744 }),
    );
    sirenRed.position.set(-0.34, 1.64, -0.1);
    sirenBlue = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.16, 0.28),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff }),
    );
    sirenBlue.position.set(0.34, 1.64, -0.1);
    group.add(barBase, sirenRed, sirenBlue);
  }

  // 10. 4 Composite Wheel Assemblies (rubber tire + metallic alloy rim)
  const tireGeo = new THREE.CylinderGeometry(0.43, 0.43, 0.32, 16);
  tireGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x111317,
    roughness: 0.88,
    metalness: 0.05,
  });
  const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.34, 12);
  rimGeo.rotateZ(Math.PI / 2);

  const wheelPositions: [number, number, number][] = [
    [-1.16, 0.43, 1.42],
    [1.16, 0.43, 1.42],
    [-1.16, 0.43, -1.42],
    [1.16, 0.43, -1.42],
  ];
  const wheels: THREE.Group[] = [];
  for (const pos of wheelPositions) {
    const wGroup = new THREE.Group();
    wGroup.position.set(pos[0], pos[1], pos[2]);
    const tire = new THREE.Mesh(tireGeo, tireMat);
    const rim = new THREE.Mesh(rimGeo, chromeMat);
    wGroup.add(tire, rim);
    group.add(wGroup);
    wheels.push(wGroup);
  }

  return {
    mesh: group,
    wheels,
    speed: 0,
    heading: 0,
    steerVisual: 0,
    isPolice,
    name,
    sirenRed,
    sirenBlue,
    aiDir: Math.floor(Math.random() * 4),
    aiTimer: 0,
    shootTimer: 1.5,
  };
}

export function createCharacterMesh(
  options: CharacterBuildOptions,
  maxAnisotropy: number,
  shadowTex: THREE.Texture,
): THREE.Group {
  const {
    shirtColor = 0x00f0ff,
    pantsColor = 0x1e272e,
    skinHex = '#f1c27d',
    eyeHex = '#2980b9',
    hasShades = false,
    beardStyle = 'none',
    hairHex = '#1e1e1e',
  } = options;

  const group = new THREE.Group();

  // Contact shadow
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 1.4),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const skinMat = new THREE.MeshStandardMaterial({
    color: skinHex,
    roughness: 0.68,
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: shirtColor,
    roughness: 0.55,
    metalness: 0.12,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: pantsColor,
    roughness: 0.78,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: hairHex,
    roughness: 0.75,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0x0e1116,
    roughness: 0.35,
    metalness: 0.3,
  });

  // Torso & Jacket Collar
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.9, 0.42), shirtMat);
  torso.position.y = 1.28;
  torso.castShadow = true;
  group.add(torso);

  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(0.79, 0.12, 0.45),
    shoeMat,
  );
  belt.position.y = 0.84;
  group.add(belt);

  // Arms
  const armGeo = new THREE.BoxGeometry(0.22, 0.78, 0.22);
  const armL = new THREE.Mesh(armGeo, skinMat);
  armL.position.set(-0.52, 1.24, 0);
  armL.castShadow = true;
  const armR = new THREE.Mesh(armGeo, skinMat);
  armR.position.set(0.52, 1.24, 0);
  armR.castShadow = true;
  group.add(armL, armR);

  // Head + Procedural Face
  const faceTex = createFaceTexture(
    skinHex,
    eyeHex,
    hasShades,
    beardStyle,
    hairHex,
    maxAnisotropy,
  );
  const headMaterials = [
    skinMat,
    skinMat,
    hairMat,
    skinMat,
    new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.6 }),
    hairMat,
  ];
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.52, 0.52),
    headMaterials,
  );
  head.position.y = 2.02;
  head.castShadow = true;
  group.add(head);

  const hairCap = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.16, 0.56),
    hairMat,
  );
  hairCap.position.y = 2.3;
  group.add(hairCap);

  // Legs + Shoes
  const legL = new THREE.Group();
  legL.position.set(-0.2, 0.78, 0);
  const legMeshL = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.68, 0.32),
    pantsMat,
  );
  legMeshL.position.y = -0.34;
  const shoeL = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.16, 0.42),
    shoeMat,
  );
  shoeL.position.set(0, -0.7, 0.05);
  legL.add(legMeshL, shoeL);

  const legR = legL.clone();
  legR.position.set(0.2, 0.78, 0);

  group.add(legL, legR);
  group.userData = { legL, legR, armL, armR };
  return group;
}

export interface CityBuildResult {
  buildingColliders: BuildingCollider[];
  roadCoords: number[];
  roadMaterial: THREE.MeshStandardMaterial;
  oceanMaterial: THREE.MeshStandardMaterial;
  surfMesh: THREE.Mesh;
  monumentMesh: THREE.Mesh;
  radarDishMesh: THREE.Group;
  flyoverPlane: THREE.Group;
  portalRings: THREE.Mesh[];
  interiorBoxes: InteriorsBuildResult['interiorBoxes'];
}

function createAirlinerMesh(accentColor: number): THREE.Group {
  const plane = new THREE.Group();

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0xf4f6f9,
    roughness: 0.25,
    metalness: 0.55,
    clearcoat: 0.8,
  });
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0xd0d7e2,
    roughness: 0.35,
    metalness: 0.72,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.3,
    metalness: 0.45,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x161b24,
    roughness: 0.65,
    metalness: 0.4,
  });

  // Fuselage cylinder (+Z forward)
  const fuselage = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.5, 19, 14),
    bodyMat,
  );
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.y = 2.6;
  fuselage.castShadow = true;
  plane.add(fuselage);

  // Nose cone
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.2, 14), bodyMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 2.6, 11.6);
  plane.add(nose);

  // Cockpit visor
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.55, 1.4),
    darkMat,
  );
  visor.position.set(0, 3.25, 9.8);
  plane.add(visor);

  // Swept Main Wings
  const wingGeo = new THREE.BoxGeometry(21, 0.26, 4.4);
  const wing = new THREE.Mesh(wingGeo, wingMat);
  wing.position.set(0, 2.2, 0.8);
  wing.castShadow = true;
  plane.add(wing);

  // Twin Under-wing Turbofan Engines
  const engGeo = new THREE.CylinderGeometry(0.65, 0.72, 2.6, 12);
  engGeo.rotateX(Math.PI / 2);
  for (const ex of [-4.8, 4.8]) {
    const eng = new THREE.Mesh(engGeo, accentMat);
    eng.position.set(ex, 1.55, 1.6);
    plane.add(eng);
  }

  // Vertical Tail Fin & Horizontal Stabilizers
  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.32, 4.2, 3.2), accentMat);
  tailFin.position.set(0, 5.1, -8.2);
  tailFin.castShadow = true;
  const hStab = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.22, 2.0), wingMat);
  hStab.position.set(0, 3.1, -8.4);
  plane.add(tailFin, hStab);

  // Landing Gear Struts
  const gearGeo = new THREE.CylinderGeometry(0.14, 0.14, 1.4, 8);
  for (const [gx, gz] of [
    [0, 7.6],
    [-2.4, -1.2],
    [2.4, -1.2],
  ]) {
    const strut = new THREE.Mesh(gearGeo, darkMat);
    strut.position.set(gx, 0.75, gz);
    plane.add(strut);
  }

  return plane;
}

function createPalmTree(
  x: number,
  y: number,
  z: number,
  trunkMat: THREE.Material,
  leafMat: THREE.Material,
): THREE.Group {
  const palm = new THREE.Group();
  palm.position.set(x, y, z);
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.48, 6.4, 7),
    trunkMat,
  );
  trunk.position.y = 3.2;
  trunk.castShadow = true;
  palm.add(trunk);

  const frondGeo = new THREE.ConeGeometry(1.15, 2.8, 5);
  for (let f = 0; f < 5; f++) {
    const frond = new THREE.Mesh(frondGeo, leafMat);
    const angle = (f / 5) * Math.PI * 2;
    frond.position.set(Math.cos(angle) * 1.1, 6.3, Math.sin(angle) * 1.1);
    frond.rotation.z = -Math.PI / 2.6;
    frond.rotation.y = -angle;
    palm.add(frond);
  }
  return palm;
}

function createLifeguardTower(
  x: number,
  z: number,
  woodMat: THREE.Material,
  whiteMat: THREE.Material,
  redMat: THREE.Material,
): THREE.Group {
  const tower = new THREE.Group();
  tower.position.set(x, 0, z);

  // 4 Angled Timber Stilts
  const legGeo = new THREE.BoxGeometry(0.28, 3.8, 0.28);
  const legCoords: [number, number][] = [
    [-1.4, -1.4],
    [1.4, -1.4],
    [-1.4, 1.4],
    [1.4, 1.4],
  ];
  for (const [lx, lz] of legCoords) {
    const leg = new THREE.Mesh(legGeo, woodMat);
    leg.position.set(lx, 1.9, lz);
    leg.castShadow = true;
    tower.add(leg);
  }

  // Elevated Deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.28, 3.8), woodMat);
  deck.position.y = 3.75;
  deck.castShadow = true;
  tower.add(deck);

  // Cabin Body
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.1, 2.6), whiteMat);
  cabin.position.y = 4.95;
  cabin.castShadow = true;
  tower.add(cabin);

  // Red Lifeguard Window Trim & Pitched Roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.1, 4), redMat);
  roof.position.y = 6.55;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  tower.add(roof);

  // Lifebuoy Ring mounted on front
  const buoy = new THREE.Mesh(
    new THREE.TorusGeometry(0.45, 0.14, 8, 16),
    redMat,
  );
  buoy.position.set(-1.35, 4.85, 0);
  buoy.rotation.y = Math.PI / 2;
  tower.add(buoy);

  return tower;
}

function createBeachUmbrellaSet(
  x: number,
  z: number,
  canopyColor: number,
  woodMat: THREE.Material,
  towelColor: number,
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0.03, z);

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 2.8, 6),
    woodMat,
  );
  pole.position.y = 1.4;
  pole.castShadow = true;
  group.add(pole);

  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(2.1, 0.75, 8),
    new THREE.MeshStandardMaterial({
      color: canopyColor,
      roughness: 0.65,
      side: THREE.DoubleSide,
    }),
  );
  canopy.position.y = 2.65;
  canopy.castShadow = true;
  group.add(canopy);

  // Two sun loungers flanking the umbrella
  const loungerMat = new THREE.MeshStandardMaterial({
    color: 0xf5f6fa,
    roughness: 0.55,
  });
  const towelMat = new THREE.MeshStandardMaterial({
    color: towelColor,
    roughness: 0.85,
  });
  for (const offsetZ of [-1.25, 1.25]) {
    const bed = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.24, 0.85),
      loungerMat,
    );
    bed.position.set(0.3, 0.26, offsetZ);
    bed.castShadow = true;
    const towel = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.06, 0.72),
      towelMat,
    );
    towel.position.set(0.25, 0.4, offsetZ);
    group.add(bed, towel);
  }

  return group;
}

export function buildOpenWorldCity(
  scene: THREE.Scene,
  maxAnisotropy: number,
): CityBuildResult {
  const buildingColliders: BuildingCollider[] = [];
  const roadCoords: number[] = [];

  // Textured Asphalt Road Plane (mutated dynamically by Weather System!)
  const asphaltTex = createAsphaltTexture(maxAnisotropy);
  const roadMaterial = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    color: 0xffffff,
    roughness: 0.84,
    metalness: 0.1,
  });
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY_SIZE + 28, CITY_SIZE + 40),
    roadMaterial,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.x = -6;
  ground.receiveShadow = true;
  scene.add(ground);

  // Wooden Boardwalk Promenade along East Coast (x = 348..362)
  const boardwalkTex = createBoardwalkTexture(maxAnisotropy);
  const boardwalkMat = new THREE.MeshStandardMaterial({
    map: boardwalkTex,
    roughness: 0.78,
    metalness: 0.06,
  });
  const boardwalk = new THREE.Mesh(
    new THREE.BoxGeometry(BOARDWALK_X_END - BOARDWALK_X_START, 0.14, CITY_SIZE + 40),
    boardwalkMat,
  );
  boardwalk.position.set((BOARDWALK_X_START + BOARDWALK_X_END) / 2, 0.07, 0);
  boardwalk.receiveShadow = true;
  scene.add(boardwalk);

  // Textured Golden Sandy Beach along East Coast (x = 360..432)
  const sandTex = createSandTexture(maxAnisotropy);
  const beachMat = new THREE.MeshStandardMaterial({
    map: sandTex,
    color: 0xffffff,
    roughness: 0.94,
    metalness: 0.02,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(74, CITY_SIZE + 80),
    beachMat,
  );
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(397, 0.03, 0);
  beach.receiveShadow = true;
  scene.add(beach);

  // Frothy Shoreline Surf Band (animated gently in engine.ts)
  const surfMat = new THREE.MeshStandardMaterial({
    color: 0xc8f4ff,
    roughness: 0.35,
    metalness: 0.1,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const surfMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(10, CITY_SIZE + 90),
    surfMat,
  );
  surfMesh.rotation.x = -Math.PI / 2;
  surfMesh.position.set(432, -0.02, 0);
  scene.add(surfMesh);

  // Ocean Perimeter
  const oceanMaterial = new THREE.MeshStandardMaterial({
    color: 0x063858,
    roughness: 0.16,
    metalness: 0.82,
  });
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(2400, 2400),
    oceanMaterial,
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -0.32;
  scene.add(ocean);

  // Vice Beach Ocean Pier (z = 0, x = 420..488)
  const pierDeck = new THREE.Mesh(
    new THREE.BoxGeometry(68, 0.45, 14),
    boardwalkMat,
  );
  pierDeck.position.set(454, 0.36, 0);
  pierDeck.receiveShadow = true;
  pierDeck.castShadow = true;
  scene.add(pierDeck);

  // Pier Entry Ramp from Sand
  const pierRamp = new THREE.Mesh(
    new THREE.BoxGeometry(6, 0.25, 14),
    boardwalkMat,
  );
  pierRamp.position.set(418, 0.18, 0);
  pierRamp.rotation.z = 0.08;
  scene.add(pierRamp);

  // Pier Support Pilings & Neon Arch
  const pilingMat = new THREE.MeshStandardMaterial({
    color: 0x4b3222,
    roughness: 0.9,
  });
  for (let px = 426; px <= 484; px += 14) {
    for (const pz of [-6.4, 6.4]) {
      const piling = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.32, 2.2, 8),
        pilingMat,
      );
      piling.position.set(px, -0.2, pz);
      scene.add(piling);
    }
  }
  const archMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  const archL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.2, 0.4), archMat);
  archL.position.set(430, 2.8, -6.5);
  const archR = archL.clone();
  archR.position.z = 6.5;
  const archTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.55, 13.6),
    new THREE.MeshBasicMaterial({ color: 0xff2a85 }),
  );
  archTop.position.set(430, 5.4, 0);
  scene.add(archL, archR, archTop);

  // Boardwalk Neon Lampposts
  const postMat = new THREE.MeshStandardMaterial({
    color: 0x1e272e,
    roughness: 0.4,
    metalness: 0.7,
  });
  const globeMat = new THREE.MeshBasicMaterial({ color: 0xffeaa7 });
  for (let lz = -308; lz <= 308; lz += 56) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 4.6, 8),
      postMat,
    );
    post.position.set(355, 2.4, lz);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 8), globeMat);
    globe.position.set(355, 4.85, lz);
    scene.add(post, globe);
  }

  // Lifeguard Towers, Beach Umbrellas, and Sand Stunt Ramps
  const towerWoodMat = new THREE.MeshStandardMaterial({
    color: 0xb88655,
    roughness: 0.85,
  });
  const towerWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf4f6f8,
    roughness: 0.5,
  });
  const towerRedMat = new THREE.MeshStandardMaterial({
    color: 0xff3b30,
    roughness: 0.45,
  });

  for (const tz of [-168, 0, 168]) {
    const tx = tz === 0 ? 406 : 402;
    const zPos = tz === 0 ? 28 : tz;
    scene.add(
      createLifeguardTower(tx, zPos, towerWoodMat, towerWhiteMat, towerRedMat),
    );
    buildingColliders.push({
      minX: tx - 2.1,
      maxX: tx + 2.1,
      minZ: zPos - 2.1,
      maxZ: zPos + 2.1,
    });
  }

  const umbrellaPalette = [
    { canopy: 0xff2a85, towel: 0x00f0ff },
    { canopy: 0x00f0ff, towel: 0xfeca57 },
    { canopy: 0xfeca57, towel: 0xff2a85 },
    { canopy: 0x2ecc71, towel: 0xffffff },
  ];
  const umbrellaZs = [-250, -210, -120, -60, 60, 120, 210, 250];
  umbrellaZs.forEach((uz, idx) => {
    const pal = umbrellaPalette[idx % umbrellaPalette.length];
    const ux = 376 + (idx % 2) * 14;
    scene.add(
      createBeachUmbrellaSet(ux, uz, pal.canopy, towerWoodMat, pal.towel),
    );
  });

  // Two Beach Dune Stunt Ramps
  const rampMat = new THREE.MeshStandardMaterial({
    color: 0xd4a962,
    roughness: 0.88,
  });
  const rampTrimMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
  for (const rz of [-92, 92]) {
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(8, 1.8, 10), rampMat);
    ramp.position.set(382, 0.25, rz);
    ramp.rotation.z = 0.22;
    ramp.receiveShadow = true;
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(8.1, 0.2, 0.5),
      rampTrimMat,
    );
    strip.position.set(382, 1.15, rz);
    strip.rotation.z = 0.22;
    scene.add(ramp, strip);
  }

  // =========================================================================
  // VICE INTERNATIONAL AIRPORT (VIX) — West Coast (-X: -348 to -526)
  // =========================================================================
  const tarmacMat = new THREE.MeshStandardMaterial({
    color: 0x181c26,
    roughness: 0.72,
    metalness: 0.14,
  });
  const tarmacApron = new THREE.Mesh(
    new THREE.PlaneGeometry(188, CITY_SIZE + 40),
    tarmacMat,
  );
  tarmacApron.rotation.x = -Math.PI / 2;
  tarmacApron.position.set(-440, 0.02, 0);
  tarmacApron.receiveShadow = true;
  scene.add(tarmacApron);

  // Main Runway Strip (x = -470, z = -290..+290)
  const runwayDeck = new THREE.Mesh(
    new THREE.PlaneGeometry(38, 580),
    new THREE.MeshStandardMaterial({
      color: 0x10131b,
      roughness: 0.65,
      metalness: 0.15,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  runwayDeck.rotation.x = -Math.PI / 2;
  runwayDeck.position.set(-470, 0.04, 0);
  runwayDeck.receiveShadow = true;
  scene.add(runwayDeck);

  // Runway Centerline & Edge Lights
  const rwDashGeo = new THREE.PlaneGeometry(1.1, 10);
  rwDashGeo.rotateX(-Math.PI / 2);
  const rwDashMat = new THREE.MeshBasicMaterial({
    color: 0xf5f6fa,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  for (let rz = -270; rz <= 270; rz += 24) {
    const mark = new THREE.Mesh(rwDashGeo, rwDashMat);
    mark.position.set(-470, 0.06, rz);
    scene.add(mark);
  }
  const rwLightGeo = new THREE.BoxGeometry(0.55, 0.35, 0.55);
  const rwCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  const rwAmberMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
  for (let rz = -280; rz <= 280; rz += 28) {
    const lLeft = new THREE.Mesh(rwLightGeo, rwCyanMat);
    lLeft.position.set(-488, 0.18, rz);
    const lRight = new THREE.Mesh(rwLightGeo, rwAmberMat);
    lRight.position.set(-452, 0.18, rz);
    scene.add(lLeft, lRight);
  }

  // Runway Stunt Ramp
  const rwRamp = new THREE.Mesh(
    new THREE.BoxGeometry(12, 2.0, 12),
    new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.5 }),
  );
  rwRamp.position.set(-470, 0.3, 0);
  rwRamp.rotation.x = -0.22;
  scene.add(rwRamp);

  // Airport Control Tower (x = -384, z = 0)
  const atcBase = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 5.5, 34, 8),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.45, metalness: 0.35 }),
  );
  atcBase.position.set(-384, 17, 0);
  atcBase.castShadow = true;
  const atcDeck = new THREE.Mesh(
    new THREE.CylinderGeometry(8.2, 5.2, 5.5, 8),
    new THREE.MeshPhysicalMaterial({
      color: 0x00f0ff,
      emissive: 0x004466,
      roughness: 0.12,
      metalness: 0.85,
    }),
  );
  atcDeck.position.set(-384, 36.5, 0);
  const atcRoof = new THREE.Mesh(
    new THREE.CylinderGeometry(8.8, 8.8, 1.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 }),
  );
  atcRoof.position.set(-384, 39.8, 0);
  scene.add(atcBase, atcDeck, atcRoof);
  buildingColliders.push({ minX: -390, maxX: -378, minZ: -6, maxZ: 6 });

  const radarDishMesh = new THREE.Group();
  radarDishMesh.position.set(-384, 42.2, 0);
  const dishBar = new THREE.Mesh(
    new THREE.BoxGeometry(5.5, 1.0, 0.5),
    new THREE.MeshBasicMaterial({ color: 0xff2a85 }),
  );
  radarDishMesh.add(dishBar);
  scene.add(radarDishMesh);

  // Twin Passenger Terminals + Hangars
  const termMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.35,
    metalness: 0.65,
  });
  const glassTrim = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  for (const tz of [-112, 112]) {
    const term = new THREE.Mesh(new THREE.BoxGeometry(22, 13, 64), termMat);
    term.position.set(-384, 6.5, tz);
    term.castShadow = true;
    term.receiveShadow = true;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(22.6, 0.8, 64.6), glassTrim);
    strip.position.set(-384, 13.1, tz);
    scene.add(term, strip);
    buildingColliders.push({
      minX: -395,
      maxX: -373,
      minZ: tz - 32,
      maxZ: tz + 32,
    });
  }

  const hangarMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.55,
    metalness: 0.5,
  });
  for (const hz of [-228, 228]) {
    const hangar = new THREE.Mesh(new THREE.BoxGeometry(26, 15, 34), hangarMat);
    hangar.position.set(-390, 7.5, hz);
    hangar.castShadow = true;
    scene.add(hangar);
    buildingColliders.push({
      minX: -403,
      maxX: -377,
      minZ: hz - 17,
      maxZ: hz + 17,
    });
  }

  // Two Parked Commercial Airliners on Apron
  const jet1 = createAirlinerMesh(0xff2a85);
  jet1.position.set(-422, 0.05, -88);
  jet1.rotation.y = -Math.PI / 2;
  scene.add(jet1);
  buildingColliders.push({ minX: -433, maxX: -411, minZ: -99, maxZ: -77 });

  const jet2 = createAirlinerMesh(0x00a8ff);
  jet2.position.set(-422, 0.05, 88);
  jet2.rotation.y = -Math.PI / 2;
  scene.add(jet2);
  buildingColliders.push({ minX: -433, maxX: -411, minZ: 77, maxZ: 99 });

  // Animated Flyover Jet cruising across the Vice City skyline
  const flyoverPlane = createAirlinerMesh(0xfeca57);
  flyoverPlane.position.set(-465, 82, -240);
  scene.add(flyoverPlane);

  const halfGrid = 6;
  for (let gx = -halfGrid; gx <= halfGrid; gx++) {
    roadCoords.push(gx * BLOCK_SIZE);
  }

  // Instanced Dashed Road Markings (high performance, zero Z-fighting via polygonOffset)
  const dashGeo = new THREE.PlaneGeometry(0.45, 4.5);
  dashGeo.rotateX(-Math.PI / 2);
  const dashMat = new THREE.MeshBasicMaterial({
    color: 0xf1c40f,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const dashPositions: { x: number; z: number; rotY: number }[] = [];
  for (let x = -halfGrid; x <= halfGrid; x++) {
    const rx = x * BLOCK_SIZE;
    for (let z = -CITY_SIZE / 2; z <= CITY_SIZE / 2; z += 12) {
      dashPositions.push({ x: rx, z, rotY: 0 });
    }
  }
  for (let z = -halfGrid; z <= halfGrid; z++) {
    const rz = z * BLOCK_SIZE;
    for (let x = -CITY_SIZE / 2; x <= CITY_SIZE / 2; x += 12) {
      dashPositions.push({ x, z: rz, rotY: Math.PI / 2 });
    }
  }
  const dashInst = new THREE.InstancedMesh(
    dashGeo,
    dashMat,
    dashPositions.length,
  );
  const dummy = new THREE.Object3D();
  dashPositions.forEach((p, idx) => {
    dummy.position.set(p.x, 0.03, p.z);
    dummy.rotation.set(0, p.rotY, 0);
    dummy.updateMatrix();
    dashInst.setMatrixAt(idx, dummy.matrix);
  });
  dashInst.instanceMatrix.needsUpdate = true;
  dashInst.computeBoundingSphere();
  scene.add(dashInst);

  const buildingTextures = [
    createBuildingTexture('#00f0ff', maxAnisotropy),
    createBuildingTexture('#ff2a85', maxAnisotropy),
    createBuildingTexture('#feca57', maxAnisotropy),
  ];

  const sidewalkMat = new THREE.MeshStandardMaterial({
    color: 0x3b4254,
    roughness: 0.9,
  });
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x5d4037,
    roughness: 0.9,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x27ae60,
    roughness: 0.65,
  });
  const neonColors = [0xff2a85, 0x00f0ff, 0xffcc00, 0x2ecc71, 0xa55eea];
  const containerColors = [0xd63031, 0x0984e3, 0xe17055, 0x00b894];

  let monumentMesh: THREE.Mesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(4.5, 0),
    new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x005577,
      metalness: 0.85,
      roughness: 0.15,
    }),
  );

  for (let bx = -halfGrid; bx < halfGrid; bx++) {
    for (let bz = -halfGrid; bz < halfGrid; bz++) {
      const cx = (bx + 0.5) * BLOCK_SIZE;
      const cz = (bz + 0.5) * BLOCK_SIZE;
      const blockSpan = BLOCK_SIZE - ROAD_WIDTH;

      const sw = new THREE.Mesh(
        new THREE.BoxGeometry(blockSpan, 0.35, blockSpan),
        sidewalkMat,
      );
      sw.position.set(cx, 0.175, cz);
      sw.receiveShadow = true;
      scene.add(sw);

      // Central Plaza Park
      if ((bx === 0 || bx === -1) && (bz === 0 || bz === -1)) {
        const grass = new THREE.Mesh(
          new THREE.BoxGeometry(blockSpan - 3, 0.44, blockSpan - 3),
          new THREE.MeshStandardMaterial({ color: 0x1e6b3b, roughness: 0.92 }),
        );
        grass.position.set(cx, 0.22, cz);
        grass.receiveShadow = true;
        scene.add(grass);

        if (bx === 0 && bz === 0) {
          const pedestal = new THREE.Mesh(
            new THREE.CylinderGeometry(4.2, 5.2, 1.6, 12),
            new THREE.MeshStandardMaterial({
              color: 0x222a3a,
              roughness: 0.35,
              metalness: 0.65,
            }),
          );
          pedestal.position.set(cx, 1.0, cz);
          scene.add(pedestal);

          monumentMesh.position.set(cx, 6.8, cz);
          scene.add(monumentMesh);
        }
        continue;
      }

      // Reserve custom Character Houses & Enterable Public Places
      if (isHouseOrPlaceBlock(bx, bz)) {
        continue;
      }

      // =====================================================================
      // COUNTRY-THEMED PLACES & CULTURAL LANDMARKS
      // =====================================================================

      // 1. LUXOR PYRAMID OASIS (EGYPT) — South-West (bx <= -3, bz >= 3)
      if (bx <= -3 && bz >= 3) {
        if (bx === -4 && bz === 4) {
          const pyr = new THREE.Mesh(
            new THREE.ConeGeometry(21, 34, 4),
            new THREE.MeshStandardMaterial({ color: 0xd9a75a, roughness: 0.85 }),
          );
          pyr.position.set(cx, 17.3, cz);
          pyr.rotation.y = Math.PI / 4;
          pyr.castShadow = true;
          const cap = new THREE.Mesh(
            new THREE.ConeGeometry(4.5, 7, 4),
            new THREE.MeshStandardMaterial({
              color: 0xffd32a,
              metalness: 0.9,
              roughness: 0.18,
            }),
          );
          cap.position.set(cx, 31.2, cz);
          cap.rotation.y = Math.PI / 4;
          scene.add(pyr, cap);
          buildingColliders.push({
            minX: cx - 15,
            maxX: cx + 15,
            minZ: cz - 15,
            maxZ: cz + 15,
          });
        } else {
          // Sandstone Obelisk / Temple Block
          const h = 16 + (Math.abs(bx + bz) % 3) * 8;
          const temple = new THREE.Mesh(
            new THREE.BoxGeometry(blockSpan - 12, h, blockSpan - 12),
            new THREE.MeshStandardMaterial({ color: 0xc9964f, roughness: 0.88 }),
          );
          temple.position.set(cx, h / 2 + 0.3, cz);
          temple.castShadow = true;
          scene.add(temple);
          buildingColliders.push({
            minX: cx - (blockSpan - 12) / 2,
            maxX: cx + (blockSpan - 12) / 2,
            minZ: cz - (blockSpan - 12) / 2,
            maxZ: cz + (blockSpan - 12) / 2,
          });
        }
        continue;
      }

      // 2. LONDON HARBOR DOCKS (UK) — South-Central (bx in [-2, 2], bz >= 3)
      if (bx >= -2 && bx <= 2 && bz >= 3) {
        if (bx === 0 && bz === 4) {
          // Big Ben-style Clock Tower
          const shaft = new THREE.Mesh(
            new THREE.BoxGeometry(10, 48, 10),
            new THREE.MeshStandardMaterial({ color: 0x8d5b4c, roughness: 0.72 }),
          );
          shaft.position.set(cx, 24.3, cz);
          shaft.castShadow = true;
          const dial = new THREE.Mesh(
            new THREE.BoxGeometry(10.6, 7.5, 10.6),
            new THREE.MeshBasicMaterial({ color: 0xfff3b0 }),
          );
          dial.position.set(cx, 44, cz);
          const spire = new THREE.Mesh(
            new THREE.ConeGeometry(7.2, 16, 4),
            new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.6, roughness: 0.35 }),
          );
          spire.position.set(cx, 56, cz);
          spire.rotation.y = Math.PI / 4;
          scene.add(shaft, dial, spire);
          buildingColliders.push({ minX: cx - 5, maxX: cx + 5, minZ: cz - 5, maxZ: cz + 5 });
        } else {
          const whWidth = blockSpan - 8;
          const whDepth = blockSpan - 8;
          const whHeight = 13 + (Math.abs(bx + bz) % 2) * 6;
          const cColor =
            containerColors[Math.abs(bx * 5 + bz) % containerColors.length];
          const warehouse = new THREE.Mesh(
            new THREE.BoxGeometry(whWidth, whHeight, whDepth),
            new THREE.MeshStandardMaterial({
              color: cColor,
              roughness: 0.65,
              metalness: 0.4,
            }),
          );
          warehouse.position.set(cx, whHeight / 2 + 0.3, cz);
          warehouse.castShadow = true;
          warehouse.receiveShadow = true;
          scene.add(warehouse);
          buildingColliders.push({
            minX: cx - whWidth / 2,
            maxX: cx + whWidth / 2,
            minZ: cz - whDepth / 2,
            maxZ: cz + whDepth / 2,
          });
        }
        continue;
      }

      // 3. COPACABANA BAY (BRAZIL) — South-East (bx >= 3, bz >= 3)
      if (bx >= 3 && bz >= 3) {
        const rioColors = [0x00b894, 0xfdcb6e, 0x0984e3];
        const bHeight = 18 + (Math.abs(bx + bz) % 3) * 9;
        const bSpan = blockSpan - 9;
        const bldg = new THREE.Mesh(
          new THREE.BoxGeometry(bSpan, bHeight, bSpan),
          new THREE.MeshStandardMaterial({
            map: buildingTextures[Math.abs(bx + bz) % buildingTextures.length],
            color: rioColors[Math.abs(bx * 2 + bz) % rioColors.length],
            roughness: 0.42,
          }),
        );
        bldg.position.set(cx, bHeight / 2 + 0.3, cz);
        bldg.castShadow = true;
        scene.add(bldg);
        buildingColliders.push({
          minX: cx - bSpan / 2,
          maxX: cx + bSpan / 2,
          minZ: cz - bSpan / 2,
          maxZ: cz + bSpan / 2,
        });
        scene.add(createPalmTree(cx + bSpan / 2 + 1.5, 0.35, cz, trunkMat, leafMat));
        continue;
      }

      // 4. LITTLE PARIS PLAZA (FRANCE) — Eiffel Lattice Landmark (bx === -1, bz === -5)
      if (bx === -1 && bz === -5) {
        const towerMat = new THREE.MeshStandardMaterial({
          color: 0x6c5ce7,
          metalness: 0.78,
          roughness: 0.32,
        });
        const tier1 = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 13, 24, 4), towerMat);
        tier1.position.set(cx, 12.3, cz);
        tier1.rotation.y = Math.PI / 4;
        const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 5.5, 22, 4), towerMat);
        tier2.position.set(cx, 35.3, cz);
        tier2.rotation.y = Math.PI / 4;
        const spire = new THREE.Mesh(
          new THREE.ConeGeometry(2.4, 24, 4),
          new THREE.MeshStandardMaterial({ color: 0xffd32a, emissive: 0x554400, metalness: 0.9, roughness: 0.2 }),
        );
        spire.position.set(cx, 58.3, cz);
        spire.rotation.y = Math.PI / 4;
        scene.add(tier1, tier2, spire);
        buildingColliders.push({ minX: cx - 9, maxX: cx + 9, minZ: cz - 9, maxZ: cz + 9 });
        continue;
      }

      // 5. TOKYO NEON QUARTER (JAPAN) — North-West (bx <= -3, bz <= -3)
      const isTokyo = bx <= -3 && bz <= -3;
      const isSwiss = bx >= 3 && bz <= -3;
      const isBeachResort = bx >= 3 && !isSwiss;
      const isNeonHills = bz <= -3 && !isTokyo && !isSwiss;

      const bWidth = blockSpan - 7;
      const bDepth = blockSpan - 7;
      let bHeight = 26 + ((Math.abs(bx * 7 + bz * 13) % 5) * 14);
      if (isBeachResort) bHeight = 16 + (Math.abs(bx + bz) % 3) * 8;
      if (isNeonHills) bHeight = 45 + (Math.abs(bx * 3 + bz) % 4) * 18;
      if (isTokyo) bHeight = 32 + (Math.abs(bx * 5 + bz) % 4) * 14;
      if (isSwiss) bHeight = 28 + (Math.abs(bx + bz * 2) % 3) * 16;

      const tex =
        buildingTextures[Math.abs(bx + bz) % buildingTextures.length];
      const bMat = new THREE.MeshStandardMaterial({
        map: tex,
        color: isBeachResort
          ? 0xffcccc
          : isTokyo
            ? 0xff6b81
            : isSwiss
              ? 0xdff9fb
              : 0xffffff,
        roughness: 0.38,
        metalness: 0.38,
      });
      const building = new THREE.Mesh(
        new THREE.BoxGeometry(bWidth, bHeight, bDepth),
        bMat,
      );
      building.position.set(cx, bHeight / 2 + 0.3, cz);
      building.castShadow = true;
      building.receiveShadow = true;
      scene.add(building);

      if (isSwiss) {
        // Snow-capped Alpine Peak Roof
        const peak = new THREE.Mesh(
          new THREE.ConeGeometry(bWidth * 0.72, 16, 4),
          new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 }),
        );
        peak.position.set(cx, bHeight + 8.3, cz);
        peak.rotation.y = Math.PI / 4;
        scene.add(peak);
      }

      const neonColor = isTokyo
        ? 0xff2a85
        : neonColors[Math.abs(bx * 3 + bz) % neonColors.length];
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(bWidth + 0.6, 0.85, bDepth + 0.6),
        new THREE.MeshBasicMaterial({ color: neonColor }),
      );
      trim.position.set(cx, bHeight + 0.3, cz);
      scene.add(trim);

      buildingColliders.push({
        minX: cx - bWidth / 2,
        maxX: cx + bWidth / 2,
        minZ: cz - bDepth / 2,
        maxZ: cz + bDepth / 2,
      });

      // Multi-part Palm or Sakura/Pine Tree at block corner
      const px = cx + blockSpan / 2 - 2;
      const pz = cz + blockSpan / 2 - 2;
      const cornerLeaf = isTokyo
        ? new THREE.MeshStandardMaterial({ color: 0xff9ff3, roughness: 0.7 })
        : isSwiss
          ? new THREE.MeshStandardMaterial({ color: 0x1e8449, roughness: 0.75 })
          : leafMat;
      scene.add(createPalmTree(px, 0.35, pz, trunkMat, cornerLeaf));
    }
  }

  // Coastal Boardwalk Palm Line
  for (let bz = -290; bz <= 290; bz += 48) {
    if (Math.abs(bz) < 18) continue;
    scene.add(createPalmTree(363, 0.05, bz, trunkMat, leafMat));
  }

  // Build 3 Character Houses + 4 Enterable Public Places & Furnished 3D Interiors
  const interiors = buildAllInteriors(scene, buildingColliders);

  return {
    buildingColliders,
    roadCoords,
    roadMaterial,
    oceanMaterial,
    surfMesh,
    monumentMesh,
    radarDishMesh,
    flyoverPlane,
    portalRings: interiors.portalRings,
    interiorBoxes: interiors.interiorBoxes,
  };
}

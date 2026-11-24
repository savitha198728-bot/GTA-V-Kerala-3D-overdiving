import * as THREE from 'three';

export type PlaceKind = 'HOUSE' | 'PLACE';

export interface EnterablePlaceSpec {
  id: string;
  name: string;
  shortLabel: string;
  kind: PlaceKind;
  ownerCharIdx: number | null;
  accent: string;
  accentHex: number;
  blockX: number | null;
  blockZ: number | null;
  entryX: number;
  entryZ: number;
  exitHeading: number;
  interiorCenter: { x: number; y: number; z: number };
  interiorSpawn: { x: number; y: number; z: number; heading: number };
  interiorExitDoor: { x: number; y: number; z: number };
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  perkLabel: string;
}

const INTERIOR_Y = 600;

function makePlace(
  idx: number,
  cfg: Omit<
    EnterablePlaceSpec,
    'interiorCenter' | 'interiorSpawn' | 'interiorExitDoor' | 'bounds'
  > & { halfW: number; halfD: number },
): EnterablePlaceSpec {
  const cx = idx * 140;
  const cy = INTERIOR_Y;
  const cz = 0;
  return {
    id: cfg.id,
    name: cfg.name,
    shortLabel: cfg.shortLabel,
    kind: cfg.kind,
    ownerCharIdx: cfg.ownerCharIdx,
    accent: cfg.accent,
    accentHex: cfg.accentHex,
    blockX: cfg.blockX,
    blockZ: cfg.blockZ,
    entryX: cfg.entryX,
    entryZ: cfg.entryZ,
    exitHeading: cfg.exitHeading,
    interiorCenter: { x: cx, y: cy, z: cz },
    interiorSpawn: { x: cx, y: cy, z: cz + cfg.halfD - 3.0, heading: Math.PI },
    interiorExitDoor: { x: cx, y: cy, z: cz + cfg.halfD - 0.6 },
    bounds: {
      minX: cx - cfg.halfW + 0.9,
      maxX: cx + cfg.halfW - 0.9,
      minZ: cz - cfg.halfD + 0.9,
      maxZ: cz + cfg.halfD - 0.9,
    },
    perkLabel: cfg.perkLabel,
  };
}

export const ENTERABLE_PLACES: EnterablePlaceSpec[] = [
  makePlace(0, {
    id: 'vance_villa',
    name: "VANCE'S OCEAN VILLA",
    shortLabel: 'VANCE HOUSE',
    kind: 'HOUSE',
    ownerCharIdx: 0,
    accent: '#00f0ff',
    accentHex: 0x00f0ff,
    blockX: 5, // cx = 308
    blockZ: 0, // cz = 28
    entryX: 289,
    entryZ: 28,
    exitHeading: -Math.PI / 2,
    halfW: 10,
    halfD: 9,
    perkLabel: 'SAFEHOUSE · FULL HEAL, ARMOR & WANTED CLEARED',
  }),
  makePlace(1, {
    id: 'kael_loft',
    name: "KAEL'S IRON PENTHOUSE",
    shortLabel: 'KAEL HOUSE',
    kind: 'HOUSE',
    ownerCharIdx: 1,
    accent: '#ff2a85',
    accentHex: 0xff2a85,
    blockX: 3, // cx = 196
    blockZ: -1, // cz = -28
    entryX: 177,
    entryZ: -28,
    exitHeading: -Math.PI / 2,
    halfW: 10,
    halfD: 9,
    perkLabel: 'SAFEHOUSE · FULL HEAL, ARMOR & WANTED CLEARED',
  }),
  makePlace(2, {
    id: 'nyx_house',
    name: "NYX'S CYBER LOFT",
    shortLabel: 'NYX HOUSE',
    kind: 'HOUSE',
    ownerCharIdx: 2,
    accent: '#2ecc71',
    accentHex: 0x2ecc71,
    blockX: -3, // cx = -140
    blockZ: 2, // cz = 140
    entryX: -140,
    entryZ: 159,
    exitHeading: 0,
    halfW: 10,
    halfD: 9,
    perkLabel: 'SAFEHOUSE · FULL HEAL, ARMOR & WANTED CLEARED',
  }),
  makePlace(3, {
    id: 'starlight_club',
    name: 'STARLIGHT NEON CLUB',
    shortLabel: 'NEON CLUB',
    kind: 'PLACE',
    ownerCharIdx: null,
    accent: '#ff2a85',
    accentHex: 0xff2a85,
    blockX: -1, // cx = -28
    blockZ: -2, // cz = -84
    entryX: -28,
    entryZ: -65,
    exitHeading: 0,
    halfW: 12,
    halfD: 11,
    perkLabel: 'VIP LOUNGE · +100% NITRO & -1 WANTED STAR',
  }),
  makePlace(4, {
    id: 'airport_lounge',
    name: 'VIX AIRPORT VIP LOUNGE',
    shortLabel: 'VIX LOUNGE',
    kind: 'PLACE',
    ownerCharIdx: null,
    accent: '#48dbfb',
    accentHex: 0x48dbfb,
    blockX: null,
    blockZ: null,
    entryX: -371,
    entryZ: 112,
    exitHeading: Math.PI / 2,
    halfW: 12,
    halfD: 10,
    perkLabel: 'SKYLINE TERMINAL · +$500 BONUS & +35 HP',
  }),
  makePlace(5, {
    id: 'beach_cafe',
    name: 'VICE BEACH SURF CAFE',
    shortLabel: 'SURF CAFE',
    kind: 'PLACE',
    ownerCharIdx: null,
    accent: '#feca57',
    accentHex: 0xfeca57,
    blockX: null,
    blockZ: null,
    entryX: 353,
    entryZ: 72,
    exitHeading: -Math.PI / 2,
    halfW: 10,
    halfD: 9,
    perkLabel: 'COASTAL BAR · +50 HP & +30 ARMOR',
  }),
  makePlace(6, {
    id: 'tokyo_arcade',
    name: 'TOKYO ARCADE & RAMEN',
    shortLabel: 'TOKYO ARCADE',
    kind: 'PLACE',
    ownerCharIdx: null,
    accent: '#ff9ff3',
    accentHex: 0xff9ff3,
    blockX: -4, // cx = -196
    blockZ: -4, // cz = -196
    entryX: -196,
    entryZ: -177,
    exitHeading: 0,
    halfW: 11,
    halfD: 10,
    perkLabel: 'CYBER ARCADE · +$350 HIGH SCORE & +50 HP',
  }),
];

export interface RepairShopSpec {
  id: string;
  name: string;
  blockX: number;
  blockZ: number;
  bayX: number;
  bayZ: number;
  facingNorth: boolean;
  accent: string;
}

export const REPAIR_SHOPS: RepairShopSpec[] = [
  {
    id: 'downtown_customs',
    name: 'DOWNTOWN VICE CUSTOMS',
    blockX: 1, // cx = 84
    blockZ: -1, // cz = -28
    bayX: 84,
    bayZ: -14,
    facingNorth: false,
    accent: '#ff9f43',
  },
  {
    id: 'westside_customs',
    name: 'AIRPORT EXPRESS REPAIR',
    blockX: -4, // cx = -196
    blockZ: 0, // cz = 28
    bayX: -196,
    bayZ: 14,
    facingNorth: true,
    accent: '#ff9f43',
  },
  {
    id: 'harbor_customs',
    name: 'HARBOR PAY & SPRAY',
    blockX: 2, // cx = 140
    blockZ: 2, // cz = 140
    bayX: 140,
    bayZ: 126,
    facingNorth: true,
    accent: '#ff9f43',
  },
];

export function isHouseOrPlaceBlock(bx: number, bz: number): boolean {
  for (const p of ENTERABLE_PLACES) {
    if (p.blockX === bx && p.blockZ === bz) return true;
  }
  for (const r of REPAIR_SHOPS) {
    if (r.blockX === bx && r.blockZ === bz) return true;
  }
  return false;
}

export interface InteriorsBuildResult {
  portalRings: THREE.Mesh[];
  interiorBoxes: {
    placeId: string;
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  }[];
}

function addBox(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: number,
  roughness = 0.65,
  metalness = 0.15,
  emissive = 0x000000,
): THREE.Mesh {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createHouseExterior(
  scene: THREE.Scene,
  place: EnterablePlaceSpec,
  cx: number,
  cz: number,
  colliders: { minX: number; maxX: number; minZ: number; maxZ: number }[],
): void {
  const houseGroup = new THREE.Group();
  const wallColor =
    place.ownerCharIdx === 0
      ? 0xeef6ff
      : place.ownerCharIdx === 1
        ? 0x2a2d3a
        : 0x162229;
  const trimColor = place.accentHex;

  // Main residence volume
  addBox(houseGroup, 26, 9.5, 24, cx, 5.0, cz, wallColor, 0.55, 0.2);
  // Second-story penthouse terrace
  addBox(houseGroup, 16, 6.0, 14, cx + 2, 12.6, cz - 2, wallColor, 0.5, 0.25);
  // Roof overhangs & neon trim
  addBox(houseGroup, 27.2, 0.7, 25.2, cx, 9.9, cz, 0x111827, 0.4, 0.5);
  const neonTrim = new THREE.Mesh(
    new THREE.BoxGeometry(27.5, 0.35, 25.5),
    new THREE.MeshBasicMaterial({ color: trimColor }),
  );
  neonTrim.position.set(cx, 10.35, cz);
  houseGroup.add(neonTrim);

  // Glowing front windows + garage door
  const winMat = new THREE.MeshBasicMaterial({ color: trimColor });
  const frontX = place.entryX < cx ? cx - 13.05 : cx;
  const frontZ = place.entryZ > cz ? cz + 12.05 : cz;
  if (place.entryX < cx) {
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.4, 3.2), winMat);
    doorFrame.position.set(frontX, 2.5, cz);
    const win1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.8, 6.5), winMat);
    win1.position.set(frontX, 6.2, cz - 6.5);
    const win2 = win1.clone();
    win2.position.z = cz + 6.5;
    houseGroup.add(doorFrame, win1, win2);

    // Vance pool deck on East side
    if (place.ownerCharIdx === 0) {
      addBox(houseGroup, 7, 0.3, 14, cx + 15.5, 0.45, cz, 0x00d2ff, 0.12, 0.3, 0x004466);
    }
  } else {
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.4, 0.4), winMat);
    doorFrame.position.set(cx, 2.5, frontZ);
    const win1 = new THREE.Mesh(new THREE.BoxGeometry(6.5, 2.8, 0.3), winMat);
    win1.position.set(cx - 6.5, 6.2, frontZ);
    const win2 = win1.clone();
    win2.position.x = cx + 6.5;
    houseGroup.add(doorFrame, win1, win2);
  }

  scene.add(houseGroup);
  colliders.push({
    minX: cx - 13.2,
    maxX: cx + 13.2,
    minZ: cz - 12.2,
    maxZ: cz + 12.2,
  });
}

function createPublicPlaceExterior(
  scene: THREE.Scene,
  place: EnterablePlaceSpec,
  cx: number,
  cz: number,
  colliders: { minX: number; maxX: number; minZ: number; maxZ: number }[],
): void {
  const g = new THREE.Group();
  if (place.id === 'starlight_club') {
    addBox(g, 30, 14, 28, cx, 7.2, cz, 0x171429, 0.5, 0.35);
    const marquee = new THREE.Mesh(
      new THREE.BoxGeometry(16, 3.2, 1.4),
      new THREE.MeshBasicMaterial({ color: 0xff2a85 }),
    );
    marquee.position.set(cx, 6.8, cz + 14.5);
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.5, 4.5),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff }),
    );
    awning.position.set(cx, 4.4, cz + 15.2);
    g.add(marquee, awning);
    colliders.push({ minX: cx - 15, maxX: cx + 15, minZ: cz - 14, maxZ: cz + 14 });
  } else if (place.id === 'tokyo_arcade') {
    addBox(g, 30, 18, 28, cx, 9.2, cz, 0x1b1128, 0.45, 0.4);
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(14, 4.5, 1.0),
      new THREE.MeshBasicMaterial({ color: 0xff9ff3 }),
    );
    sign.position.set(cx, 10.5, cz + 14.3);
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(30.6, 0.7, 28.6),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff }),
    );
    strip.position.set(cx, 18.2, cz);
    g.add(sign, strip);
    colliders.push({ minX: cx - 15, maxX: cx + 15, minZ: cz - 14, maxZ: cz + 14 });
  } else if (place.id === 'beach_cafe') {
    // Boardwalk Tiki & Surf Cafe Kiosk at x = 359, z = 72 (behind portal at x=353)
    addBox(g, 7, 4.2, 11, 360, 2.2, 72, 0x6d4c41, 0.85, 0.08);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(7.2, 3.2, 4),
      new THREE.MeshStandardMaterial({ color: 0xfeca57, roughness: 0.88 }),
    );
    roof.position.set(360, 5.8, 72);
    roof.rotation.y = Math.PI / 4;
    const neonBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 9),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff }),
    );
    neonBar.position.set(356.4, 4.1, 72);
    g.add(roof, neonBar);
    colliders.push({ minX: 356.6, maxX: 363.5, minZ: 66.5, maxZ: 77.5 });
  }
  scene.add(g);
}

function createRepairShopMesh(
  scene: THREE.Scene,
  shop: RepairShopSpec,
  colliders: { minX: number; maxX: number; minZ: number; maxZ: number }[],
  portalRings: THREE.Mesh[],
): void {
  const cx = (shop.blockX + 0.5) * 56;
  const cz = (shop.blockZ + 0.5) * 56;
  const dir = shop.facingNorth ? -1 : 1; // Side facing the street

  const garage = new THREE.Group();
  // Checkered-style garage service pad on sidewalk
  addBox(garage, 14, 0.36, 18, cx, 0.18, cz, 0x1e293b, 0.45, 0.35);
  // Left & Right side walls + Rear bay wall (open drive-in front!)
  addBox(garage, 1.4, 7.2, 16, cx - 7.5, 3.6, cz, 0x334155, 0.6, 0.4);
  addBox(garage, 1.4, 7.2, 16, cx + 7.5, 3.6, cz, 0x334155, 0.6, 0.4);
  addBox(garage, 16.4, 7.2, 1.6, cx, 3.6, cz - dir * 8.2, 0x1e293b, 0.65, 0.35);
  // Canopy roof + glowing orange/cyan REPAIR neon header
  addBox(garage, 17, 0.9, 17.5, cx, 7.6, cz, 0x0f172a, 0.4, 0.6);

  const neonHeader = new THREE.Mesh(
    new THREE.BoxGeometry(15.6, 1.4, 0.5),
    new THREE.MeshBasicMaterial({ color: 0xff9f43 }),
  );
  neonHeader.position.set(cx, 6.7, cz + dir * 8.5);
  const cyanStrip = new THREE.Mesh(
    new THREE.BoxGeometry(17.2, 0.3, 17.7),
    new THREE.MeshBasicMaterial({ color: 0x00f0ff }),
  );
  cyanStrip.position.set(cx, 8.15, cz);
  garage.add(neonHeader, cyanStrip);

  // Glowing drive-in service bay ring + spinning floating marker
  const bayRing = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 2.9, 24),
    new THREE.MeshBasicMaterial({ color: 0xff9f43, side: THREE.DoubleSide }),
  );
  bayRing.rotation.x = -Math.PI / 2;
  bayRing.position.set(shop.bayX, 0.4, shop.bayZ);
  garage.add(bayRing);

  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.8, 0),
    new THREE.MeshBasicMaterial({ color: 0xff9f43 }),
  );
  gem.position.set(shop.bayX, 2.6, shop.bayZ);
  garage.add(gem);
  portalRings.push(gem);

  scene.add(garage);

  // Colliders ONLY on the back & side walls so vehicles can drive straight into the bay!
  colliders.push(
    { minX: cx - 8.3, maxX: cx - 6.7, minZ: cz - 8.2, maxZ: cz + 8.2 },
    { minX: cx + 6.7, maxX: cx + 8.3, minZ: cz - 8.2, maxZ: cz + 8.2 },
    {
      minX: cx - 8.2,
      maxX: cx + 8.2,
      minZ: cz - dir * 8.2 - 0.9,
      maxZ: cz - dir * 8.2 + 0.9,
    },
  );
}

export function buildAllInteriors(
  scene: THREE.Scene,
  outdoorColliders: { minX: number; maxX: number; minZ: number; maxZ: number }[],
): InteriorsBuildResult {
  const portalRings: THREE.Mesh[] = [];
  const interiorBoxes: InteriorsBuildResult['interiorBoxes'] = [];

  for (const shop of REPAIR_SHOPS) {
    createRepairShopMesh(scene, shop, outdoorColliders, portalRings);
  }

  for (const place of ENTERABLE_PLACES) {
    // 1. Outdoor building / kiosk if placed on a city block or boardwalk
    if (place.blockX !== null && place.blockZ !== null) {
      const cx = (place.blockX + 0.5) * 56;
      const cz = (place.blockZ + 0.5) * 56;
      if (place.kind === 'HOUSE') {
        createHouseExterior(scene, place, cx, cz, outdoorColliders);
      } else {
        createPublicPlaceExterior(scene, place, cx, cz, outdoorColliders);
      }
    } else if (place.id === 'beach_cafe') {
      createPublicPlaceExterior(scene, place, 360, 72, outdoorColliders);
    }

    // 2. Outdoor Entrance Glowing Doorway Ring + Floating Diamond Marker
    const ringMat = new THREE.MeshBasicMaterial({
      color: place.accentHex,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 2.0, 24), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(place.entryX, 0.22, place.entryZ);
    scene.add(ring);

    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.7, 0),
      new THREE.MeshBasicMaterial({ color: place.accentHex }),
    );
    gem.position.set(place.entryX, 2.35, place.entryZ);
    scene.add(gem);
    portalRings.push(gem);

    // 3. Furnished 3D Interior Room at (interiorCenter.x, 600, 0)
    const { x: cx, y: cy, z: cz } = place.interiorCenter;
    const halfW = place.interiorExitDoor.x === cx
      ? (place.bounds.maxX - place.bounds.minX) / 2 + 0.9
      : 10;
    const halfD = (place.bounds.maxZ - place.bounds.minZ) / 2 + 0.9;
    const w = halfW * 2;
    const d = halfD * 2;
    const wallH = 6.2;

    const room = new THREE.Group();
    room.position.set(cx, cy, cz);

    // Warm interior lighting
    const roomLight = new THREE.PointLight(0xfff1e0, 2.6, 36, 1.2);
    roomLight.position.set(0, 5.4, 0);
    room.add(roomLight);

    const accentLight = new THREE.PointLight(place.accentHex, 1.5, 28, 1.4);
    accentLight.position.set(0, 4.2, -halfD + 2.5);
    room.add(accentLight);

    // Floor & Accent Rug
    const floorColor =
      place.kind === 'HOUSE'
        ? 0x3b2a20
        : place.id === 'starlight_club'
          ? 0x10101e
          : place.id === 'beach_cafe'
            ? 0x8d6e4e
            : 0x202736;
    addBox(room, w, 0.4, d, 0, -0.2, 0, floorColor, 0.5, 0.15);

    const rugColor = place.accentHex;
    const rug = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.48, d * 0.46),
      new THREE.MeshStandardMaterial({
        color: rugColor,
        roughness: 0.9,
        metalness: 0.05,
        emissive: rugColor,
        emissiveIntensity: 0.15,
      }),
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.02, -0.5);
    room.add(rug);

    // Perimeter Walls + Top Neon Crown
    const innerWallColor =
      place.kind === 'HOUSE'
        ? 0x262e3d
        : place.id === 'beach_cafe'
          ? 0x4e342e
          : 0x141928;
    addBox(room, w, wallH, 0.5, 0, wallH / 2, -halfD, innerWallColor, 0.72, 0.1);
    addBox(room, w, wallH, 0.5, 0, wallH / 2, halfD, innerWallColor, 0.72, 0.1);
    addBox(room, 0.5, wallH, d, -halfW, wallH / 2, 0, innerWallColor, 0.72, 0.1);
    addBox(room, 0.5, wallH, d, halfW, wallH / 2, 0, innerWallColor, 0.72, 0.1);

    const rim = new THREE.Mesh(
      new THREE.BoxGeometry(w - 0.6, 0.18, d - 0.6),
      new THREE.MeshBasicMaterial({ color: place.accentHex, wireframe: true }),
    );
    rim.position.set(0, wallH - 0.3, 0);
    room.add(rim);

    // Interior Exit Door & Glowing Exit Portal
    const exitDoor = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 3.8, 0.35),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: place.accentHex,
        emissiveIntensity: 0.35,
      }),
    );
    exitDoor.position.set(0, 1.9, halfD - 0.25);
    room.add(exitDoor);

    const exitRing = new THREE.Mesh(
      new THREE.RingGeometry(1.0, 1.5, 24),
      new THREE.MeshBasicMaterial({ color: 0x4cd964, side: THREE.DoubleSide }),
    );
    exitRing.rotation.x = -Math.PI / 2;
    exitRing.position.set(0, 0.04, halfD - 1.1);
    room.add(exitRing);

    // Custom Furnishings
    if (place.kind === 'HOUSE') {
      // Sofa + Coffee Table + TV Entertainment Wall (North-West)
      addBox(room, 5.4, 0.85, 2.0, -2.5, 0.45, -2.0, 0x334155, 0.8, 0.05);
      addBox(room, 5.4, 0.9, 0.45, -2.5, 1.1, -2.8, 0x475569, 0.8, 0.05);
      addBox(room, 3.0, 0.45, 1.5, -2.5, 0.35, 0.5, 0x1e293b, 0.25, 0.6);
      // Glowing Widescreen TV
      addBox(room, 5.8, 2.8, 0.25, -2.5, 2.8, -halfD + 0.45, 0x090d16, 0.2, 0.8, place.accentHex);

      // King Bed (East side)
      addBox(room, 4.4, 0.75, 5.2, halfW - 3.2, 0.4, -halfD + 3.6, 0x1e293b, 0.7, 0.1);
      addBox(room, 4.0, 0.35, 4.6, halfW - 3.2, 0.85, -halfD + 3.6, 0xf8fafc, 0.85, 0.02);
      addBox(room, 4.0, 0.38, 2.8, halfW - 3.2, 0.9, -halfD + 4.4, place.accentHex, 0.8, 0.05);

      // Wardrobe / Safe / Desk (West Wall)
      addBox(room, 1.4, 3.6, 3.2, -halfW + 1.0, 1.8, 2.0, 0x1f2937, 0.5, 0.4);
      // Kitchenette Bar (East Front)
      addBox(room, 3.6, 1.2, 1.4, halfW - 2.6, 0.6, 3.5, 0x475569, 0.35, 0.5);

      // Interior collision boxes (in world coordinates)
      interiorBoxes.push(
        { placeId: place.id, minX: cx - 5.2, maxX: cx + 0.2, minZ: cz - 3.1, maxZ: cz - 0.9 }, // sofa
        { placeId: place.id, minX: cx + halfW - 5.4, maxX: cx + halfW - 1.0, minZ: cz - halfD + 1.0, maxZ: cz - halfD + 6.2 }, // bed
        { placeId: place.id, minX: cx + halfW - 4.4, maxX: cx + halfW - 0.8, minZ: cz + 2.8, maxZ: cz + 4.2 }, // counter
      );
    } else if (place.id === 'starlight_club') {
      // DJ Booth + Neon Bar + Lounge Booths
      addBox(room, 7.0, 1.5, 2.6, 0, 0.75, -halfD + 2.4, 0x1e1b4b, 0.3, 0.7, 0xff2a85);
      addBox(room, 2.0, 2.8, 2.0, -5.2, 1.4, -halfD + 2.4, 0x090d16, 0.4, 0.5);
      addBox(room, 2.0, 2.8, 2.0, 5.2, 1.4, -halfD + 2.4, 0x090d16, 0.4, 0.5);
      // Bar Counter
      addBox(room, 1.8, 1.3, 8.0, -halfW + 2.4, 0.65, 0, 0x311042, 0.3, 0.6, 0x00f0ff);
      interiorBoxes.push(
        { placeId: place.id, minX: cx - 3.6, maxX: cx + 3.6, minZ: cz - halfD + 1.0, maxZ: cz - halfD + 3.8 },
        { placeId: place.id, minX: cx - halfW + 1.4, maxX: cx - halfW + 3.4, minZ: cz - 4.0, maxZ: cz + 4.0 },
      );
    } else if (place.id === 'airport_lounge') {
      // Check-in Counter + Departure Board + Lounge Seating
      addBox(room, 9.0, 1.3, 2.0, 0, 0.65, -halfD + 2.6, 0x334155, 0.35, 0.65);
      addBox(room, 8.0, 2.6, 0.25, 0, 3.6, -halfD + 0.4, 0x090d16, 0.2, 0.8, 0x48dbfb);
      for (const sx of [-5.5, 5.5]) {
        addBox(room, 2.8, 0.85, 5.2, sx, 0.45, 0.5, 0x1e293b, 0.55, 0.2);
      }
      interiorBoxes.push(
        { placeId: place.id, minX: cx - 4.5, maxX: cx + 4.5, minZ: cz - halfD + 1.5, maxZ: cz - halfD + 3.6 },
        { placeId: place.id, minX: cx - 7.0, maxX: cx - 4.0, minZ: cz - 2.2, maxZ: cz + 3.2 },
        { placeId: place.id, minX: cx + 4.0, maxX: cx + 7.0, minZ: cz - 2.2, maxZ: cz + 3.2 },
      );
    } else if (place.id === 'beach_cafe') {
      // Tiki Surf Bar + Surfboard Wall Art
      addBox(room, 8.5, 1.35, 2.0, 0, 0.68, -halfD + 2.6, 0x5d4037, 0.8, 0.1);
      addBox(room, 0.7, 3.8, 0.2, -3.5, 2.8, -halfD + 0.4, 0xff2a85, 0.3, 0.3, 0xff2a85);
      addBox(room, 0.7, 3.8, 0.2, 0, 2.8, -halfD + 0.4, 0x00f0ff, 0.3, 0.3, 0x00f0ff);
      addBox(room, 0.7, 3.8, 0.2, 3.5, 2.8, -halfD + 0.4, 0xfeca57, 0.3, 0.3, 0xfeca57);
      for (const bx of [-3, 0, 3]) {
        addBox(room, 0.9, 0.8, 0.9, bx, 0.4, -halfD + 4.4, 0xd4a962, 0.6, 0.1);
      }
      interiorBoxes.push({
        placeId: place.id,
        minX: cx - 4.4,
        maxX: cx + 4.4,
        minZ: cz - halfD + 1.4,
        maxZ: cz - halfD + 3.8,
      });
    } else if (place.id === 'tokyo_arcade') {
      // Glowing Retro Arcade Cabinets + Ramen Counter
      const cabColors = [0xff2a85, 0x00f0ff, 0xfeca57, 0x2ecc71];
      cabColors.forEach((col, i) => {
        const ax = -5.4 + i * 3.6;
        addBox(room, 1.5, 2.8, 1.5, ax, 1.4, -halfD + 1.5, 0x111827, 0.4, 0.5);
        addBox(room, 1.2, 1.0, 0.2, ax, 1.9, -halfD + 2.3, col, 0.2, 0.5, col);
      });
      addBox(room, 2.0, 1.2, 7.0, halfW - 2.4, 0.6, 0.5, 0x7f1d1d, 0.5, 0.2);
      interiorBoxes.push(
        { placeId: place.id, minX: cx - 6.4, maxX: cx + 6.4, minZ: cz - halfD + 0.6, maxZ: cz - halfD + 2.5 },
        { placeId: place.id, minX: cx + halfW - 3.5, maxX: cx + halfW - 1.3, minZ: cz - 3.1, maxZ: cz + 4.1 },
      );
    }

    scene.add(room);
  }

  return { portalRings, interiorBoxes };
}

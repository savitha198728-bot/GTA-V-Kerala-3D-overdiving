import * as THREE from 'three';
import { VehicleEntity, createCarMesh } from './models';

export interface Waypoint2D {
  x: number;
  z: number;
}

export interface TrafficAgent {
  vehicle: VehicleEntity;
  waypoints: Waypoint2D[];
  waypointIdx: number;
  cruiseSpeed: number;
  laneOffset: number;
}

export const TRAFFIC_CAR_SPECS = [
  { color: 0xf7b731, name: 'VICE CAB TAXI', speed: 14 },
  { color: 0xfeca57, name: 'BANSHEE COUPE', speed: 17 },
  { color: 0x1dd1a1, name: 'COMET S2', speed: 16 },
  { color: 0x54a0ff, name: 'ELEGY RH8', speed: 15 },
  { color: 0xf5f6fa, name: 'SCHAFTER V12', speed: 14 },
  { color: 0xff6b6b, name: 'CHEETAH CLASSIC', speed: 17 },
  { color: 0xa55eea, name: 'ZENTORNO HYPER', speed: 18 },
  { color: 0xff9f43, name: 'COQUETTE TURBO', speed: 16 },
  { color: 0x48dbfb, name: 'SENTINEL XS', speed: 13 },
  { color: 0x2ed573, name: 'CAVALCADE SUV', speed: 12 },
];

// 8 Predefined closed-loop routes aligned cleanly to the city road grid (multiples of 56m)
const BASE_LOOPS: Waypoint2D[][] = [
  // 0: Central Plaza Ring
  [
    { x: -56, z: -56 },
    { x: 56, z: -56 },
    { x: 56, z: 56 },
    { x: -56, z: 56 },
  ],
  // 1: Downtown Financial Loop
  [
    { x: -112, z: -112 },
    { x: 112, z: -112 },
    { x: 112, z: 112 },
    { x: -112, z: 112 },
  ],
  // 2: Grand Outer Beltway (World Quarters Tour)
  [
    { x: -280, z: -280 },
    { x: 280, z: -280 },
    { x: 280, z: 280 },
    { x: -280, z: 280 },
  ],
  // 3: Ocean Drive & Vice Beachfront Strip
  [
    { x: 224, z: -280 },
    { x: 336, z: -280 },
    { x: 336, z: 280 },
    { x: 224, z: 280 },
  ],
  // 4: Westside & VIX Airport Perimeter
  [
    { x: -336, z: -280 },
    { x: -224, z: -280 },
    { x: -224, z: 280 },
    { x: -336, z: 280 },
  ],
  // 5: Northern Cultural Crosstown (Tokyo <-> Paris <-> Swiss)
  [
    { x: -280, z: -224 },
    { x: 280, z: -224 },
    { x: 280, z: -168 },
    { x: -280, z: -168 },
  ],
  // 6: Southern Harbor Loop (Egypt <-> London <-> Brazil)
  [
    { x: -280, z: 168 },
    { x: 280, z: 168 },
    { x: 280, z: 224 },
    { x: -280, z: 224 },
  ],
  // 7: Midtown Highway Crosstown (Airport <-> Downtown <-> Beach)
  [
    { x: -336, z: -56 },
    { x: 336, z: -56 },
    { x: 336, z: 0 },
    { x: -336, z: 0 },
  ],
];

function computeLaneTarget(
  from: Waypoint2D,
  to: Waypoint2D,
  laneOffset: number,
): { x: number; z: number; segHeading: number } {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const len = Math.hypot(dx, dz) || 1;
  // Right-hand side perpendicular vector relative to travel direction (dx, dz)
  const rightX = -dz / len;
  const rightZ = dx / len;
  return {
    x: to.x + rightX * laneOffset,
    z: to.z + rightZ * laneOffset,
    segHeading: Math.atan2(dx, dz),
  };
}

export function spawnTrafficNetwork(
  scene: THREE.Scene,
  shadowTex: THREE.Texture,
  vehiclesOut: VehicleEntity[],
  count = 28,
): TrafficAgent[] {
  const agents: TrafficAgent[] = [];

  for (let i = 0; i < count; i++) {
    const spec = TRAFFIC_CAR_SPECS[i % TRAFFIC_CAR_SPECS.length];
    const baseLoop = BASE_LOOPS[i % BASE_LOOPS.length];
    // Alternate clockwise vs counter-clockwise flow on each predefined path
    const reverseFlow = Math.floor(i / BASE_LOOPS.length) % 2 === 1;
    const waypoints = reverseFlow ? [...baseLoop].reverse() : baseLoop;

    const segCount = waypoints.length;
    const segIdx = i % segCount;
    const nextIdx = (segIdx + 1) % segCount;
    const pA = waypoints[segIdx];
    const pB = waypoints[nextIdx];

    // Spread multiple cars on the same loop cleanly along different progress fractions
    const tProgress = ((Math.floor(i / BASE_LOOPS.length) * 0.37 + 0.18) % 0.8) + 0.1;
    const laneOffset = 3.4;

    const dx = pB.x - pA.x;
    const dz = pB.z - pA.z;
    const len = Math.hypot(dx, dz) || 1;
    const rightX = -dz / len;
    const rightZ = dx / len;

    const startX = pA.x + dx * tProgress + rightX * laneOffset;
    const startZ = pA.z + dz * tProgress + rightZ * laneOffset;
    const startHeading = Math.atan2(dx, dz);

    const car = createCarMesh(spec.color, false, spec.name, shadowTex);
    car.mesh.position.set(startX, 0, startZ);
    car.heading = startHeading;
    car.mesh.rotation.y = startHeading;
    car.speed = spec.speed;

    scene.add(car.mesh);
    vehiclesOut.push(car);

    agents.push({
      vehicle: car,
      waypoints,
      waypointIdx: nextIdx,
      cruiseSpeed: spec.speed,
      laneOffset,
    });
  }

  return agents;
}

export function updateTrafficNetwork(
  agents: TrafficAgent[],
  activeVehiclesSet: Set<VehicleEntity>,
  playerPos: THREE.Vector3,
  heroInVehicle: boolean,
  heroVehicle: VehicleEntity,
  dt: number,
  onPlayerCrash: (hitCar: VehicleEntity) => void,
): void {
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const v = agent.vehicle;

    // If hijacked by any protagonist or converted, skip AI control
    if (activeVehiclesSet.has(v) || v.isPolice) continue;

    const prevIdx =
      (agent.waypointIdx - 1 + agent.waypoints.length) % agent.waypoints.length;
    const fromPt = agent.waypoints[prevIdx];
    const toPt = agent.waypoints[agent.waypointIdx];
    const target = computeLaneTarget(fromPt, toPt, agent.laneOffset);

    const dx = target.x - v.mesh.position.x;
    const dz = target.z - v.mesh.position.z;
    const distToWp = Math.hypot(dx, dz);

    if (distToWp < 6.5) {
      agent.waypointIdx = (agent.waypointIdx + 1) % agent.waypoints.length;
    }

    // Smoothly steer toward the current lane-aligned waypoint
    const desiredHeading = Math.atan2(dx, dz);
    let diff = desiredHeading - v.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    v.heading += THREE.MathUtils.clamp(diff, -3.6 * dt, 3.6 * dt);

    // Simple traffic spacing & obstacle braking (yield to cars/player ahead)
    let targetSpeed = agent.cruiseSpeed;
    const fwdX = Math.sin(v.heading);
    const fwdZ = Math.cos(v.heading);

    // Slow down gently into sharp turns
    if (Math.abs(diff) > 0.45) {
      targetSpeed *= 0.68;
    }

    // Check player distance ahead
    const px = playerPos.x - v.mesh.position.x;
    const pz = playerPos.z - v.mesh.position.z;
    const pDist = Math.hypot(px, pz);
    if (pDist < 10.5 && (px * fwdX + pz * fwdZ) / (pDist || 1) > 0.72) {
      targetSpeed = 0;
    } else {
      // Check ahead for other traffic cars on the same route
      for (let j = 0; j < agents.length; j++) {
        if (i === j) continue;
        const other = agents[j].vehicle;
        const ox = other.mesh.position.x - v.mesh.position.x;
        const oz = other.mesh.position.z - v.mesh.position.z;
        const oDist = Math.hypot(ox, oz);
        if (oDist < 9.5 && (ox * fwdX + oz * fwdZ) / (oDist || 1) > 0.8) {
          targetSpeed = Math.min(targetSpeed, other.speed * 0.7);
          break;
        }
      }
    }

    v.speed = THREE.MathUtils.damp(v.speed, targetSpeed, 4.5, dt);
    v.mesh.position.x += Math.sin(v.heading) * v.speed * dt;
    v.mesh.position.z += Math.cos(v.heading) * v.speed * dt;
    v.mesh.rotation.y = v.heading;

    const spin = v.speed * dt * 2.0;
    for (let w = 0; w < v.wheels.length; w++) {
      v.wheels[w].rotation.x += spin;
    }

    // Player high-speed collision with traffic
    if (pDist < 3.1 && heroInVehicle && Math.abs(heroVehicle.speed) > 10) {
      onPlayerCrash(v);
    }
  }
}

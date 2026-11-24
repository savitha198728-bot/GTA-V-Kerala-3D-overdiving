export type GamePhase = 'title' | 'playing' | 'paused' | 'wasted';

export type CameraMode = 0 | 1 | 2; // 0: Chase, 1: Cinematic, 2: Top-Down

export type MissionType = 'PICKUP' | 'DELIVERY' | 'BOUNTY' | 'ESCAPE';

export type WeatherCondition = 'CLEAR' | 'LIGHT_RAIN' | 'HEAVY_RAIN' | 'FOG';

export type RadioStationId =
  | 'SYNTHWAVE'
  | 'POP'
  | 'HIPHOP'
  | 'ROCK'
  | 'ELECTRONIC'
  | 'OFF';

export type RadioSegmentType = 'MUSIC' | 'DJ' | 'COMMERCIAL' | 'OFF';

export interface RadioTrackInfo {
  title: string;
  artist: string;
  bpm: number;
  bassNotes: number[];
  leadNotes: number[];
  chordRoots: number[];
}

export interface RadioCommercial {
  sponsor: string;
  line: string;
  jingleNotes: number[];
}

export interface RadioStationSpec {
  id: RadioStationId;
  freq: string;
  name: string;
  genre: string;
  accent: string;
  djName: string;
  djPitch: number;
  djRate: number;
  djLines: string[];
  tracks: RadioTrackInfo[];
}

export const RADIO_COMMERCIALS: RadioCommercial[] = [
  {
    sponsor: 'VICE MOTORS',
    line: 'Vice Motors! Zero down, zero questions asked—drive out before the sirens arrive.',
    jingleNotes: [60, 64, 67, 72],
  },
  {
    sponsor: 'NEON FIZZ',
    line: 'Neon Fizz Energy! Now with triple taurine and genuine coastal voltage.',
    jingleNotes: [62, 66, 69, 74],
  },
  {
    sponsor: 'OCEAN VIEW SUITES',
    line: 'Ocean View Penthouses—bulletproof glass comes standard on every balcony.',
    jingleNotes: [57, 60, 64, 69],
  },
  {
    sponsor: 'AMMU-BLAST',
    line: 'Ammu-Blast Personal Defense! Because rush hour in Downtown Vice gets personal.',
    jingleNotes: [55, 59, 62, 67],
  },
  {
    sponsor: 'LSPD IMPOUND',
    line: 'Left your Infernus on the boardwalk? LSPD Towing already sold the rims!',
    jingleNotes: [53, 57, 60, 65],
  },
  {
    sponsor: 'STARLIGHT ARCADE',
    line: 'Starlight Arcade on Vice Beach—open all night, no quarters required for VIPs.',
    jingleNotes: [64, 68, 71, 76],
  },
];

export const RADIO_STATIONS: RadioStationSpec[] = [
  {
    id: 'SYNTHWAVE',
    freq: '88.3 FM',
    name: 'FLASHBACK FM',
    genre: 'SYNTHWAVE',
    accent: '#ff2a85',
    djName: 'DJ Max Horizon',
    djPitch: 0.92,
    djRate: 1.02,
    djLines: [
      'You are locked onto 88.3 Flashback FM with Max Horizon. Neon nights never sleep.',
      'Cruising past Vice Beach? Keep the turbos spooled and the synth turned all the way up.',
      'Coming up next on Flashback FM, pure analog heat straight from the 1986 vault.',
      'LSPD scanners are lighting up Downtown—good thing you have the fastest soundtrack in town.',
    ],
    tracks: [
      {
        title: 'Midnight Overdrive',
        artist: 'Neon Drive & The Mirrors',
        bpm: 118,
        bassNotes: [45, 45, 57, 45, 41, 41, 53, 41, 43, 43, 55, 43, 40, 40, 52, 40],
        leadNotes: [69, 0, 72, 76, 72, 0, 69, 67, 65, 0, 69, 72, 71, 0, 67, 64],
        chordRoots: [57, 53, 55, 52],
      },
      {
        title: 'Sunset Boulevard 1986',
        artist: 'Miami Skyline',
        bpm: 114,
        bassNotes: [48, 48, 60, 48, 45, 45, 57, 45, 41, 41, 53, 41, 43, 43, 55, 43],
        leadNotes: [72, 76, 79, 0, 76, 72, 69, 0, 65, 69, 72, 0, 74, 71, 67, 0],
        chordRoots: [60, 57, 53, 55],
      },
      {
        title: 'Chrome Palm Mirage',
        artist: 'VHS Runner',
        bpm: 122,
        bassNotes: [43, 43, 55, 43, 40, 40, 52, 40, 41, 41, 53, 41, 45, 45, 57, 45],
        leadNotes: [67, 71, 74, 0, 72, 67, 64, 0, 65, 69, 72, 76, 74, 0, 71, 67],
        chordRoots: [55, 52, 53, 57],
      },
      {
        title: 'Laser Highway',
        artist: 'Cobra Arcade',
        bpm: 126,
        bassNotes: [45, 57, 45, 57, 43, 55, 43, 55, 41, 53, 41, 53, 40, 52, 43, 55],
        leadNotes: [76, 0, 74, 72, 74, 0, 71, 67, 69, 72, 76, 0, 79, 76, 74, 71],
        chordRoots: [57, 55, 53, 52],
      },
    ],
  },
  {
    id: 'POP',
    freq: '94.5 FM',
    name: 'VICE POP',
    genre: '80s POP',
    accent: '#00f0ff',
    djName: 'DJ Candy Sterling',
    djPitch: 1.18,
    djRate: 1.06,
    djLines: [
      'Hey Vice City, it is Candy Sterling on 94.5 Vice Pop—serving non-stop eighties chart toppers!',
      'Whether you are sunning at the Boardwalk or dodging traffic, keep that hairspray locked!',
      'Shoutout to everyone flashing their headlights in Vinewood Hills—this next track is for you!',
      'All hits, zero static, right here on your favorite pink-and-cyan dial: Vice Pop!',
    ],
    tracks: [
      {
        title: 'Electric Heartbeat',
        artist: 'Roxanne Lux',
        bpm: 124,
        bassNotes: [48, 60, 48, 60, 43, 55, 43, 55, 45, 57, 45, 57, 41, 53, 43, 55],
        leadNotes: [72, 72, 74, 76, 79, 0, 76, 74, 72, 0, 69, 72, 74, 72, 71, 0],
        chordRoots: [60, 55, 57, 53],
      },
      {
        title: 'Neon Coastline',
        artist: 'Starlight Trio',
        bpm: 120,
        bassNotes: [50, 50, 62, 50, 45, 45, 57, 45, 47, 47, 59, 47, 43, 43, 55, 43],
        leadNotes: [74, 78, 81, 0, 78, 74, 73, 0, 71, 74, 78, 0, 76, 74, 71, 67],
        chordRoots: [62, 57, 59, 55],
      },
      {
        title: 'Saturday Roller',
        artist: 'Tiffany Vogue',
        bpm: 128,
        bassNotes: [46, 58, 46, 58, 41, 53, 41, 53, 43, 55, 43, 55, 48, 60, 43, 55],
        leadNotes: [70, 74, 77, 0, 74, 72, 70, 0, 67, 70, 74, 77, 79, 0, 77, 74],
        chordRoots: [58, 53, 55, 60],
      },
      {
        title: 'Starlight Arcade',
        artist: 'Cassette Club',
        bpm: 118,
        bassNotes: [48, 48, 55, 60, 45, 45, 52, 57, 41, 41, 48, 53, 43, 43, 50, 55],
        leadNotes: [76, 74, 72, 0, 72, 76, 79, 0, 77, 76, 72, 69, 74, 0, 71, 67],
        chordRoots: [60, 57, 53, 55],
      },
    ],
  },
  {
    id: 'HIPHOP',
    freq: '98.1 FM',
    name: 'THE CROWN',
    genre: 'HIP HOP',
    accent: '#ffcc00',
    djName: 'DJ Big Smoove',
    djPitch: 0.78,
    djRate: 0.96,
    djLines: [
      'Yeah yeah, you tuned to 98.1 The Crown with Big Smoove. Keep them chrome rims spinning.',
      'From Port Vice Docks up to Central Plaza, nothing hits harder than that 808 knock.',
      'If you got heat on your tail, drop it in sport mode and let this next beat ride out.',
      'Real Vice City street anthems, commercial-light, heavy bassline—stay locked with The Crown.',
    ],
    tracks: [
      {
        title: 'Vice Block Hustle',
        artist: 'MC Velvet & 808',
        bpm: 94,
        bassNotes: [36, 0, 0, 36, 39, 0, 41, 0, 36, 0, 0, 43, 41, 0, 39, 38],
        leadNotes: [72, 0, 75, 0, 79, 77, 75, 0, 72, 0, 70, 67, 65, 0, 67, 0],
        chordRoots: [48, 51, 53, 55],
      },
      {
        title: 'Gold Rim Bounce',
        artist: 'Kilo Supreme',
        bpm: 98,
        bassNotes: [38, 0, 50, 38, 0, 0, 41, 0, 43, 0, 55, 43, 0, 41, 39, 0],
        leadNotes: [74, 77, 81, 0, 79, 77, 74, 0, 70, 74, 77, 0, 76, 74, 72, 0],
        chordRoots: [50, 53, 55, 52],
      },
      {
        title: 'Lowrider Twilight',
        artist: 'Westside Syndicate',
        bpm: 90,
        bassNotes: [33, 0, 0, 45, 36, 0, 38, 0, 33, 0, 0, 40, 41, 0, 40, 38],
        leadNotes: [81, 79, 76, 0, 74, 72, 69, 0, 72, 74, 76, 79, 81, 0, 76, 0],
        chordRoots: [45, 48, 50, 52],
      },
      {
        title: 'Diamond District Flow',
        artist: 'Slick Vance',
        bpm: 100,
        bassNotes: [40, 0, 40, 52, 0, 43, 45, 0, 40, 0, 47, 45, 43, 0, 42, 40],
        leadNotes: [76, 0, 79, 83, 79, 76, 74, 0, 71, 74, 76, 0, 79, 76, 74, 71],
        chordRoots: [52, 55, 57, 54],
      },
    ],
  },
  {
    id: 'ROCK',
    freq: '101.9 FM',
    name: 'V-ROCK',
    genre: 'ARENA ROCK',
    accent: '#ff6b00',
    djName: 'DJ Johnny Torque',
    djPitch: 0.86,
    djRate: 1.08,
    djLines: [
      'This is Johnny Torque tearing up 101.9 V-ROCK! Crank that amplifier past eleven!',
      'Smell that burning rubber on the highway? That is pure V8 rock and roll!',
      'Speed limits are just polite suggestions when V-ROCK is blasting out your speakers.',
      'Up next, screaming guitars and zero mercy—stay loud, Vice City!',
    ],
    tracks: [
      {
        title: 'Turbo Highway',
        artist: 'Chrome Viper',
        bpm: 136,
        bassNotes: [40, 40, 40, 43, 45, 45, 45, 43, 40, 40, 47, 45, 43, 43, 42, 40],
        leadNotes: [64, 0, 67, 69, 71, 0, 69, 67, 64, 67, 71, 0, 74, 71, 69, 64],
        chordRoots: [52, 57, 55, 52],
      },
      {
        title: 'No Brakes Tonight',
        artist: 'Iron Sunset',
        bpm: 132,
        bassNotes: [45, 45, 48, 45, 43, 43, 45, 43, 41, 41, 43, 41, 40, 40, 43, 40],
        leadNotes: [69, 72, 76, 0, 74, 72, 71, 0, 69, 67, 69, 72, 76, 0, 71, 69],
        chordRoots: [57, 55, 53, 52],
      },
      {
        title: 'V8 Thunder',
        artist: 'Asphalt Kings',
        bpm: 140,
        bassNotes: [38, 38, 41, 43, 38, 38, 45, 43, 38, 38, 41, 43, 45, 43, 41, 38],
        leadNotes: [62, 65, 69, 0, 72, 69, 67, 65, 62, 65, 69, 72, 74, 0, 72, 69],
        chordRoots: [50, 53, 55, 50],
      },
      {
        title: 'Steel Sunset',
        artist: 'Nitro Riot',
        bpm: 134,
        bassNotes: [43, 43, 43, 46, 48, 48, 46, 43, 41, 41, 43, 46, 48, 46, 43, 41],
        leadNotes: [67, 70, 74, 0, 72, 70, 67, 0, 65, 67, 70, 74, 77, 0, 74, 70],
        chordRoots: [55, 58, 60, 53],
      },
    ],
  },
  {
    id: 'ELECTRONIC',
    freq: '106.7 FM',
    name: 'PULSE CLUB',
    genre: 'ELECTRONIC',
    accent: '#2ecc71',
    djName: 'DJ Kira Vex',
    djPitch: 1.08,
    djRate: 1.04,
    djLines: [
      'Signal synced. You are inside 106.7 Pulse Club with Kira Vex. Feel the laser grid.',
      'Four-on-the-floor telemetry locked in for midnight street runners across the bay.',
      'Next up in the mix: high-voltage acid basslines engineered for top speed.',
      'Let the rain hit the windshield while Pulse Club drives the tempo.',
    ],
    tracks: [
      {
        title: 'Hyperion Bass',
        artist: 'DJ Volt',
        bpm: 128,
        bassNotes: [38, 0, 38, 50, 38, 0, 41, 53, 38, 0, 38, 50, 43, 0, 41, 40],
        leadNotes: [62, 65, 69, 74, 69, 65, 62, 0, 65, 69, 72, 77, 72, 69, 67, 64],
        chordRoots: [50, 53, 55, 52],
      },
      {
        title: 'Subzero Drift',
        artist: 'Kinetix',
        bpm: 130,
        bassNotes: [36, 0, 48, 36, 39, 0, 51, 39, 41, 0, 53, 41, 43, 0, 55, 43],
        leadNotes: [72, 75, 79, 75, 72, 0, 70, 67, 65, 67, 70, 72, 75, 0, 74, 71],
        chordRoots: [48, 51, 53, 55],
      },
      {
        title: 'Acid Grid 99',
        artist: 'Cypher Nine',
        bpm: 132,
        bassNotes: [40, 52, 40, 40, 43, 55, 43, 43, 45, 57, 45, 45, 43, 55, 42, 54],
        leadNotes: [64, 67, 71, 76, 71, 67, 64, 76, 69, 72, 76, 81, 76, 72, 71, 67],
        chordRoots: [52, 55, 57, 54],
      },
      {
        title: 'Kinetic Velvet',
        artist: 'Aura Pulse',
        bpm: 126,
        bassNotes: [41, 0, 53, 41, 43, 0, 55, 43, 45, 0, 57, 45, 48, 0, 60, 48],
        leadNotes: [65, 69, 72, 77, 72, 69, 67, 71, 69, 72, 76, 81, 79, 76, 72, 69],
        chordRoots: [53, 55, 57, 60],
      },
    ],
  },
  {
    id: 'OFF',
    freq: '---',
    name: 'RADIO OFF',
    genre: 'ENGINE AMBIENCE',
    accent: '#94a3b8',
    djName: 'Off Air',
    djPitch: 1,
    djRate: 1,
    djLines: [],
    tracks: [
      {
        title: 'No Broadcast',
        artist: 'City Soundscape',
        bpm: 120,
        bassNotes: [],
        leadNotes: [],
        chordRoots: [],
      },
    ],
  },
];

export interface WeatherSpec {
  id: WeatherCondition;
  label: string;
  shortLabel: string;
  accent: string;
  fogColorHex: number;
  skyTintHex: number;
  fogDensity: number;
  sunIntensity: number;
  hemiIntensity: number;
  roadRoughness: number;
  roadMetalness: number;
  gripFactor: number;
  driftFactor: number;
  rainIntensity: number; // 0..1
  visibilityTag: string;
}

export const WEATHER_ORDER: WeatherCondition[] = [
  'CLEAR',
  'LIGHT_RAIN',
  'HEAVY_RAIN',
  'FOG',
];

export const WEATHER_SPECS: Record<WeatherCondition, WeatherSpec> = {
  CLEAR: {
    id: 'CLEAR',
    label: 'CLEAR TWILIGHT',
    shortLabel: 'CLEAR',
    accent: '#feca57',
    fogColorHex: 0x181c30,
    skyTintHex: 0xffffff,
    fogDensity: 0.0028,
    sunIntensity: 1.35,
    hemiIntensity: 0.85,
    roadRoughness: 0.84,
    roadMetalness: 0.1,
    gripFactor: 1.0,
    driftFactor: 0.25,
    rainIntensity: 0,
    visibilityTag: 'VISIBILITY 100%',
  },
  LIGHT_RAIN: {
    id: 'LIGHT_RAIN',
    label: 'LIGHT NEON RAIN',
    shortLabel: 'DRIZZLE',
    accent: '#48dbfb',
    fogColorHex: 0x131b2e,
    skyTintHex: 0x99b3d6,
    fogDensity: 0.0052,
    sunIntensity: 0.95,
    hemiIntensity: 0.72,
    roadRoughness: 0.3,
    roadMetalness: 0.32,
    gripFactor: 0.85,
    driftFactor: 0.45,
    rainIntensity: 0.42,
    visibilityTag: 'WET ROADS · 85% GRIP',
  },
  HEAVY_RAIN: {
    id: 'HEAVY_RAIN',
    label: 'THUNDERSTORM',
    shortLabel: 'STORM',
    accent: '#ff2a85',
    fogColorHex: 0x0b1020,
    skyTintHex: 0x5d6d8e,
    fogDensity: 0.0084,
    sunIntensity: 0.62,
    hemiIntensity: 0.56,
    roadRoughness: 0.14,
    roadMetalness: 0.52,
    gripFactor: 0.7,
    driftFactor: 0.72,
    rainIntensity: 1.0,
    visibilityTag: 'HYDROPLANE · 70% GRIP',
  },
  FOG: {
    id: 'FOG',
    label: 'COASTAL NEON FOG',
    shortLabel: 'FOG',
    accent: '#a55eea',
    fogColorHex: 0x22263d,
    skyTintHex: 0x8d95b5,
    fogDensity: 0.0155,
    sunIntensity: 0.75,
    hemiIntensity: 0.92,
    roadRoughness: 0.54,
    roadMetalness: 0.2,
    gripFactor: 0.9,
    driftFactor: 0.34,
    rainIntensity: 0,
    visibilityTag: 'LOW VISIBILITY · STEALTH+',
  },
};

export interface ProtagonistSummary {
  id: number;
  name: string;
  fullName: string;
  role: string;
  accent: string;
  initial: string;
  gradient: string;
  abilityLabel: string;
}

export type TimePhase = 'DAWN' | 'DAY' | 'SUNSET' | 'NIGHT';

export interface HudSnapshot {
  cash: number;
  level: number;
  missionsCompleted: number;
  wantedLevel: number;
  maxWantedReached: number;
  activeCharIdx: number;
  cameraMode: CameraMode;
  health: number;
  armor: number;
  nitro: number;
  inVehicle: boolean;
  speedMph: number;
  vehicleName: string;
  district: string;
  missionTitle: string;
  missionDesc: string;
  missionDist: number;
  missionAccent: string;
  abilityCooldown: number;
  damageFlash: boolean;
  weather: WeatherCondition;
  weatherAuto: boolean;
  gripPercent: number;
  timeOfDay: number; // 0..24 hours
  timePhase: TimePhase;
  timeAuto: boolean;
  radioStationIdx: number;
  radioTrackTitle: string;
  radioTrackArtist: string;
  radioSegment: RadioSegmentType;
  radioBroadcastSpeaker: string;
  radioBroadcastLine: string;
  nearbyPlaceName: string | null;
  nearbyPlaceKind: 'HOUSE' | 'PLACE' | null;
  nearbyPlaceAccent: string;
  activeInteriorId: string | null;
  activeInteriorName: string | null;
  activeInteriorPerk: string | null;
}

export interface ToastMessage {
  id: number;
  text: string;
  color: string;
}

export const PROTAGONISTS_META: ProtagonistSummary[] = [
  {
    id: 0,
    name: 'VANCE',
    fullName: 'VANCE MERCER',
    role: 'WHEELMAN',
    accent: '#00f0ff',
    initial: 'V',
    gradient: 'linear-gradient(135deg, #00c6ff, #0072ff)',
    abilityLabel: 'OVERDRIVE TURBO',
  },
  {
    id: 1,
    name: 'KAEL',
    fullName: 'KAEL VARGAS',
    role: 'ENFORCER',
    accent: '#ff2a85',
    initial: 'K',
    gradient: 'linear-gradient(135deg, #ff512f, #dd2476)',
    abilityLabel: '360 SHOCKWAVE',
  },
  {
    id: 2,
    name: 'NYX',
    fullName: 'NYX VALE',
    role: 'HACKER',
    accent: '#2ecc71',
    initial: 'N',
    gradient: 'linear-gradient(135deg, #11998e, #38ef7d)',
    abilityLabel: 'SIGNAL SCRAMBLE',
  },
];

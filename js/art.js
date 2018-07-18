export const MAP_IMPORT_SCALE = 0.0015;
export const MAP_Z_IMPORT_SCALE = MAP_IMPORT_SCALE * 0.0625;
export const MAP_HEI_SCALE = 0.010986;

export const wallTextures = [
    '/img/wall1.png',
    '/img/wall2.png',
    '/img/metal-circuit1.png',
    '/img/floor1.png',
    '/img/grate.png',
    '/img/glass1.png',
    '/img/carpet1.png',
    '/img/blue-crate.png',
    '/img/red-crate.png',
    '/img/space-station-wall3-01.png',
    '/img/station-floor2-01.png',
    '/img/blue-energy.png',
    '/img/monitor-a-02.png',
    '/img/monitor-b-03.png',
    '/img/monitor-c-03-04.png',
    '/img/monitorside.png',
    '/img/pipes-01.png'
];

export const wallTexDimensX = [
    64,
    64,
    32,
    64,
    64,
    64,
    256,
    128,
    128,
    256,
    256,
    64,
    128,
    128,
    128,
    128,
    256
];

export const wallTexDimensY = [
    64,
    64,
    32,
    64,
    64,
    64,
    256,
    128,
    128,
    256,
    256,
    64,
    128,
    128,
    128,
    128,
    256
];

//TODO - consider batching particle textures if there are too many of them
export const particleTextures = [
    '/img/particles/ember.png'
];

//GUI element default placements/sizes
export const gui_sprites = [
    {
        x: 0.35,
        y: -0.65,
        scale: 0.9,
        img: 0
    }
];

//Sprite Sheets
export const gui = {
    path: '/img/gui/spritesheet.png',
    def: {"images":{"raygun_rest.png":{"name":"raygun_rest.png","xStart":0,"xEnd":0.125,"yStart":0,"yEnd":0.125},"ammo.png":{"name":"ammo.png","xStart":0.126953125,"xEnd":0.251953125,"yStart":0,"yEnd":0.125},"health.png":{"name":"health.png","xStart":0.25390625,"xEnd":0.37890625,"yStart":0,"yEnd":0.125},"raygun_firing.png":{"name":"raygun_firing.png","xStart":0.380859375,"xEnd":0.505859375,"yStart":0,"yEnd":0.125}}}
}

/**
 * Defines a spritesheet texture to use for surface decals like bullet holes and burn marks
 */
export const decals = {
    path: '/img/decals/decals_sheet.png',
    def: [
        {name: 'blood-splatter1', xStart: 0, xEnd: 0.5, yStart: 0, yEnd: 0.5},
        {name: 'blood-splatter2', xStart: 0.5, xEnd: 1.0, yStart: 0, yEnd: 0.5},
        {name: 'bullet-hole1', xStart: 0, xEnd: 0.25, yStart: 0.5, yEnd: 0.75},
        {name: 'bullet-hole2', xStart: 0.25, xEnd: 0.5, yStart: 0.5, yEnd: 0.75},
        {name: 'burn-damage1', xStart: 0.5, xEnd: 0.75, yStart: 0.5, yEnd: 0.75},
        {name: 'burn-damage2', xStart: 0.75, xEnd: 1.0, yStart: 0.5, yEnd: 0.75},
        {name: 'glass-damage1', xStart: 0, xEnd: 0.25, yStart: 0.75, yEnd: 1.0}
    ]
}

/**
 * List of definitions for player useable weapons
 */
export const player_weapons = [
    {
        label: 'Blaster Pistol',
        povMesh: {path: '/models/weapons/pov/blaster_pistol.json', importScale: 0.25, tex: 0},
        muzzleOffset: new Float32Array([-0.45, -0.25, 2.0]),
        weaponOffset: new Float32Array([1.7, -2, -4.2]) 
    }
];

export const scene_mesh_list = [
    {path: '/models/enemies/chomper.json', importScale: 0.7, tex: 1},
    {path: '/models/enemies/trooper.json', importScale: 0.25, tex: 4}
];

export const enemy_definitions = [
    {
        type: "chomper",
        tex: 1,
        mesh: 0,
        hp: 4,
        radius: 1,
        height: 2.5
    },
    {
        type: "trooper",
        tex: 4,
        mesh: 1,
        hp: 8,
        radius: 1,
        height: 3
    },
]

export const enemies = [
    {
        def: 1,
        pos: [58.069698333740234, -0.7680000066757202, 36.4630241394043],
        rot: -90
    },
    {
        def: 0,
        pos: [43.742396949853735, -0.768, 35.22925635055455],
        rot: 0
    },
    {
        def: 0,
        pos: [63.34800338745117, -1.343999981880188, 53.61600112915039],
        rot: 180
    },
    {
        def: 0,
        pos: [59.934117295259604, -3.072, 46.323917369097465],
        rot: 180
    },
    {
        def: 1,
        pos: [53.34880447387695, -0.7680000066757202, 23.47197723388672],
        rot: 0
    },
    {
        def: 0,
        pos: [68.05339813232422, -0.7680000066757202, 11.572257041931152],
        rot: 0
    },
    {
        def: 1,
        pos:[45.27168655395508, -2.7839999198913574, 6.7996649742126465],
        rot: 100
    },
    {
        def: 1,
        pos:[54.252410888671875, -2.7839999198913574, 16.372772216796875],
        rot: 220
    },
    {
        def: 0,
        pos:[42.45237350463867, -2.7839999198913574, 13.719110488891602],
        rot: 100
    },
    {
        def: 0,
        pos:[69.69807434082031, -0.7680000066757202, -18.95145606994629],
        rot: 0
    },
];

//Props are batched together in one giant VBO
export const prop_batch_mesh_list = [
    {path: '/models/props/chair.json', importScale: 0.225, tex: 2},
    {path: '/models/props/computer-console.json', importScale: 0.9, tex: 3},
    {path: '/models/props/whiteboard.json', importScale: 0.55, tex: 5}
];

export const props = [
    {
        def: 0,
        pos: [48.04606628417969, -0.7680000066757202, 48.31871032714844],
        rot: [0, 0.7071067690849304, 0, 0.7071067690849304]
    },
    {
        def: 1,
        pos: [49.849552154541016, -0.7680000066757202, 48.306983947753906],
        rot: [0, -0.7071067690849304, 0, 0.7071067690849304]
    },
    {
        def: 0,
        pos: [44.95760726928711, -2.7839999198913574, 2.858334541320801],
        rot: [0, 1, 0, 6.123234262925839e-17]
    },
    {
        def: 1,
        pos: [45.45760726928711, -2.7839999198913574, 0.8583345413208008],
        rot: [0, 0, 0, 1]
    },
    {
        def: 0,
        pos: [48.23078155517578, -2.7839999198913574, 17.3011417388916],
        rot: [0, 0, 0, 1]
    },
    {
        def: 1,
        pos: [48.23078155517578, -2.7839999198913574, 19.3011417388916],
        rot: [0, 1, 0, 6.123234262925839e-17]
    },
    {
        def: 2,
        pos: [64, 1.8, -18],
        rot: [0, 0.7071067690849304, 0, 0.7071067690849304]
    },
]

export const mesh_texture_list = [
    '/img/weapons/blaster-pistol.png',
    '/img/characters/chomper1.png',
    '/img/props/chair.png',
    '/img/props/computer_console.png',
    '/img/characters/trooper.png',
    '/img/props/whiteboard.png',
];

export const skyBox = '/img/skybox/space';
export const envMap = '/img/env/reflect';
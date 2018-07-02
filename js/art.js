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
    '/img/blue-energy.png'
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
    64
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
    64
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
        pos: [60.53437933778765, -0.768, 36.00946653479338]
    },
    {
        def: 0,
        pos: [43.742396949853735, -0.768, 35.22925635055455]
    },
    {
        def: 0,
        pos: [63.32493519723416, -1.344, 51.53570599165559]
    },
    {
        def: 0,
        pos: [59.934117295259604, -3.072, 46.323917369097465]
    }
    // {
    //     def: 0,
    //     pos: [38.81010272715436, -0.768, 72.95589293956762]
    // }
];

//Props are batched together in one giant VBO
export const prop_batch_mesh_list = [
    {path: '/models/props/chair.json', importScale: 0.225, tex: 2},
    {path: '/models/props/computer-console.json', importScale: 0.9, tex: 3}
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
    }
]

export const mesh_texture_list = [
    '/img/weapons/blaster-pistol.png',
    '/img/characters/chomper1.png',
    '/img/props/chair.png',
    '/img/props/computer_console.png',
    '/img/characters/trooper.png',
];

export const skyBox = '/img/skybox/space';
export const envMap = '/img/env/reflect';
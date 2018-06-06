export const MAP_IMPORT_SCALE = 0.0015;
export const MAP_Z_IMPORT_SCALE = MAP_IMPORT_SCALE * 0.0625;
export const MAP_HEI_SCALE = 0.010986;

export const wallTextures = [
    '/img/wall1.png',
    '/img/wall2.png',
    '/img/metal-circuit1.png',
    '/img/floor1.png',
    '/img/grate.png',
    '/img/glass1.png'
];

export const wallTexDimensX = [
    64,
    64,
    32,
    64,
    64,
    64
];

export const wallTexDimensY = [
    64,
    64,
    32,
    64,
    64,
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
 * List of meshes to use for rendering weapons from the player's point of view
 */
export const pov_weapon_mesh_list = [
    {path: '/models/blaster-pistol.obj', importScale: 1.0}
];

export const scene_mesh_list = [
    {path: '/models/chomper1.fbx', importScale: 1.0}
];

export const mesh_texture_list = [
    '/img/weapons/blaster-pistol.png'
];

export const skyBox = '/img/skybox/space';
export const envMap = '/img/env/reflect';
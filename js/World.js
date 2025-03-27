// js/World.js

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createNoise2D } from 'simplex-noise';

// --- Terrain Constants ---
const TERRAIN_SIZE = 800;
const TERRAIN_RESOLUTION = 128;
const HALF_SIZE = TERRAIN_SIZE / 2;

// --- Noise Parameters ---
const NOISE_HEIGHT_SCALE = 1.0;
const NOISE_HEIGHT_LARGE = 5 * NOISE_HEIGHT_SCALE;
const NOISE_HEIGHT_MEDIUM = 0.4 * NOISE_HEIGHT_SCALE;
const NOISE_HEIGHT_SMALL = 0.1 * NOISE_HEIGHT_SCALE;
const NOISE_SCALE_LARGE = 0.015;
const NOISE_SCALE_MEDIUM = 0.06;
const NOISE_SCALE_SMALL = 0.2;
const ROAD_FLATTEN_FACTOR = 0.1;

// --- Color Gradient ---
const COLOR_STOPS = [
    { h: -5, color: new THREE.Color(0x4466aa) }, { h: -0.5, color: new THREE.Color(0x6699cc) },
    { h: 0, color: new THREE.Color(0xdec070) }, { h: 1, color: new THREE.Color(0x558844) },
    { h: 4, color: new THREE.Color(0x776655) }, { h: 7, color: new THREE.Color(0xaaaaaa) },
    { h: 10, color: new THREE.Color(0xffffff) },
];

export class World {
    constructor(scene, physicsWorld) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.noise = createNoise2D();

        this.terrainMesh = null;
        this.terrainBody = null;
        this.groundMaterial = null;
        this.terrainMaterial = null;

        this.createPhysicsMaterials();
        this.createVisualMaterial();
        this.createTerrain();
        // this.createDebugHelpers();

        console.log("World initialized.");
    }

    createPhysicsMaterials() {
        this.groundMaterial = new CANNON.Material('groundMaterial');
        // Find the default material used by other objects (like the vehicle)
        const defaultMaterial = this.physicsWorld.defaultContactMaterial.materials.find(m => m !== this.groundMaterial) || this.physicsWorld.defaultMaterial;


        const groundDefaultContactMaterial = new CANNON.ContactMaterial(
            this.groundMaterial,
            defaultMaterial,
            {
                friction: 1.0,           // High friction
                restitution: 0.0,        // No bounce
                contactEquationStiffness: 1e9, // High stiffness
                contactEquationRelaxation: 3,
                frictionEquationStiffness: 1e9, // High friction stiffness
                frictionEquationRelaxation: 3,
            }
        );
        this.physicsWorld.addContactMaterial(groundDefaultContactMaterial);
        console.log("Physics materials created for World (with increased stiffness/friction).");
    }

    createVisualMaterial() {
        this.terrainMaterial = new THREE.MeshStandardMaterial({
            flatShading: false,
            metalness: 0.05,
            roughness: 0.9,
            vertexColors: true
        });
        console.log("Visual material created for World.");
    }

    update(playerPosition) {
        // Static terrain
    }

    createDebugHelpers() {
        const originHelper = new THREE.Mesh(
            new THREE.SphereGeometry(1, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
        );
        originHelper.position.set(0, 0.1, 0);
        this.scene.add(originHelper);
        const axesHelper = new THREE.AxesHelper(10);
        this.scene.add(axesHelper);
        console.log("Debug helpers added.");
    }

    createTerrain() {
        console.log(`Generating terrain (${TERRAIN_RESOLUTION}x${TERRAIN_RESOLUTION})...`);
        const segmentSize = TERRAIN_SIZE / TERRAIN_RESOLUTION;

        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];
        const colors = [];

        console.time("VertexGeneration");
        for (let z = 0; z <= TERRAIN_RESOLUTION; z++) {
            for (let x = 0; x <= TERRAIN_RESOLUTION; x++) {
                const worldX = -HALF_SIZE + x * segmentSize;
                const worldZ = -HALF_SIZE + z * segmentSize;
                const height = this.calculateHeight(worldX, worldZ);
                vertices.push(worldX, height, worldZ);
                const color = this.getColorForHeight(height);
                colors.push(color.r, color.g, color.b);
                if (x < TERRAIN_RESOLUTION && z < TERRAIN_RESOLUTION) {
                    const tl = z * (TERRAIN_RESOLUTION + 1) + x; const tr = tl + 1;
                    const bl = (z + 1) * (TERRAIN_RESOLUTION + 1) + x; const br = bl + 1;
                    indices.push(tl, bl, tr); indices.push(tr, bl, br);
                }
            }
        }
        console.timeEnd("VertexGeneration");

        geometry.setIndex(indices);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        console.time("NormalCalculation");
        geometry.computeVertexNormals();
        console.timeEnd("NormalCalculation");

        this.terrainMesh = new THREE.Mesh(geometry, this.terrainMaterial);
        this.terrainMesh.receiveShadow = true;
        this.scene.add(this.terrainMesh);
        console.log("Visual terrain mesh created.");

        console.log("Creating physics Trimesh...");
        console.time("TrimeshCreation");
        const trimeshVertices = Array.from(vertices);
        const trimeshIndices = Array.from(indices);
        const trimeshShape = new CANNON.Trimesh(trimeshVertices, trimeshIndices);

        this.terrainBody = new CANNON.Body({
            mass: 0,
            material: this.groundMaterial, // Use the specific ground material
            shape: trimeshShape,
        });
        this.terrainBody.position.set(0, 0, 0);
        this.physicsWorld.addBody(this.terrainBody);
        console.timeEnd("TrimeshCreation");
        console.log("Physics Trimesh body created.");
    }

    calculateHeight(worldX, worldZ) {
        let height = 0;
        height += this.noise(worldX * NOISE_SCALE_LARGE, worldZ * NOISE_SCALE_LARGE) * NOISE_HEIGHT_LARGE;
        height += this.noise(worldX * NOISE_SCALE_MEDIUM, worldZ * NOISE_SCALE_MEDIUM) * NOISE_HEIGHT_MEDIUM;
        height += this.noise(worldX * NOISE_SCALE_SMALL, worldZ * NOISE_SCALE_SMALL) * NOISE_HEIGHT_SMALL;
        const flatten = Math.exp(-Math.pow(height, 2) * ROAD_FLATTEN_FACTOR);
        height *= flatten;
        return height;
    }

    getColorForHeight(height) {
        let vertColor = new THREE.Color().copy(COLOR_STOPS[0].color);
        for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
            const currentStop = COLOR_STOPS[i]; const nextStop = COLOR_STOPS[i + 1];
            if (height >= currentStop.h && height < nextStop.h) {
                const t = Math.max(0, Math.min(1, (height - currentStop.h) / (nextStop.h - currentStop.h)));
                vertColor.lerpColors(currentStop.color, nextStop.color, t);
                return vertColor;
            }
        }
        if (height >= COLOR_STOPS[COLOR_STOPS.length - 1].h) {
            vertColor.copy(COLOR_STOPS[COLOR_STOPS.length - 1].color);
        }
        return vertColor;
    }

    dispose() {
        console.log("Disposing world...");
        if (this.terrainBody) this.physicsWorld.removeBody(this.terrainBody);
        if (this.terrainMesh) {
            this.scene.remove(this.terrainMesh);
            this.terrainMesh.geometry.dispose();
            // this.terrainMaterial.dispose(); // Only if not shared
        }
        this.terrainBody = null; this.terrainMesh = null;
    }
}

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createNoise2D } from 'simplex-noise';

// --- Constants ---
const TERRAIN_SIZE = 300;
const TERRAIN_RESOLUTION = 150;
const HALF_SIZE = TERRAIN_SIZE / 2;

// Noise parameters (unchanged)
const NOISE_HEIGHT_LARGE = 4;
const NOISE_HEIGHT_MEDIUM = 0.02;
const NOISE_HEIGHT_SMALL = 0.05;
const NOISE_SCALE_LARGE = 0.02;
const NOISE_SCALE_MEDIUM = 0.08;
const NOISE_SCALE_SMALL = 0.15;
const ROAD_FLATTEN_FACTOR = 0.15;

const COLOR_STOPS = [
    { h: -5, color: new THREE.Color(0x4466aa) }, { h: -0.5, color: new THREE.Color(0x6699cc) },
    { h: 0, color: new THREE.Color(0xaa9977) }, { h: 1, color: new THREE.Color(0x66aa66) },
    { h: 3, color: new THREE.Color(0x887766) }, { h: 5, color: new THREE.Color(0xaaaaaa) },
    { h: 8, color: new THREE.Color(0xffffff) },
];

export class World {
    constructor(scene, physicsWorld) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.noise = createNoise2D();
        this.terrainMesh = null;
        this.terrainBody = null;

        // --- Physics Materials ---
        this.groundMaterial = new CANNON.Material('ground');
        const defaultMaterial = this.physicsWorld.defaultMaterial;

        // Improve friction and reduce sinking by adjusting contact properties
        const groundDefaultContactMaterial = new CANNON.ContactMaterial(
            this.groundMaterial, defaultMaterial, {
                friction: 0.6,           // Increased from 0.4
                restitution: 0.05,      // Reduced from 0.1
                contactEquationStiffness: 1e8,   // Add stiffness
                contactEquationRelaxation: 3     // Add relaxation
            }
        );
        this.physicsWorld.addContactMaterial(groundDefaultContactMaterial);

        // --- Visual Material --- (Shared)
        this.terrainMaterial = new THREE.MeshStandardMaterial({
            wireframe: false,
            flatShading: false,
            metalness: 0.1,
            roughness: 0.9,
            vertexColors: true
        });

        // Create the terrain immediately
        this.createTerrain();

        // Add debug helper for development
        this.createDebugHelpers();
    }

    update(playerPosition) {
        // No dynamic loading needed for single terrain
        // Could add debug visualization if needed here
    }

    createDebugHelpers() {
        // Add a small sphere at origin for reference
        const originHelper = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        originHelper.position.set(0, 0, 0);
        this.scene.add(originHelper);
    }

    createTerrain() {
        console.log("Generating terrain...");
        const segmentSize = TERRAIN_SIZE / TERRAIN_RESOLUTION;

        // Generate height data first (keep this part)
        const heightData = this.generateHeightData();

        // 1. Create visual terrain first (almost identical to your current code)
        console.log("Creating visual mesh...");
        const geometry = new THREE.BufferGeometry();

        const vertices = [];
        const indices = [];
        const colors = [];

        // Build vertex grid
        for (let z = 0; z <= TERRAIN_RESOLUTION; z++) {
            for (let x = 0; x <= TERRAIN_RESOLUTION; x++) {
                // Get world coordinates
                const worldX = -HALF_SIZE + x * segmentSize;
                const worldZ = -HALF_SIZE + z * segmentSize;

                // Get height
                const height = this.calculateHeight(worldX, worldZ);

                // Add vertex
                vertices.push(worldX, height, worldZ);

                // Set color
                const color = this.getColorForHeight(height);
                colors.push(color.r, color.g, color.b);

                // Create triangle indices (same as original)
                if (x < TERRAIN_RESOLUTION && z < TERRAIN_RESOLUTION) {
                    const topLeft = z * (TERRAIN_RESOLUTION + 1) + x;
                    const topRight = topLeft + 1;
                    const bottomLeft = (z + 1) * (TERRAIN_RESOLUTION + 1) + x;
                    const bottomRight = bottomLeft + 1;

                    indices.push(topLeft, bottomLeft, topRight);
                    indices.push(topRight, bottomLeft, bottomRight);
                }
            }
        }

        // Set geometry attributes
        geometry.setIndex(indices);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();

        // Create visual mesh
        this.terrainMesh = new THREE.Mesh(geometry, this.terrainMaterial);
        this.terrainMesh.receiveShadow = true;
        this.scene.add(this.terrainMesh);

        // 2. Create physics using TRIMESH instead of Heightfield
        console.log("Creating physics trimesh...");

        // Extract vertices and indices from the geometry we just created
        const vertArray = geometry.attributes.position.array;
        const indexArray = geometry.index.array;

        // Create trimesh shape
        const trimeshShape = new CANNON.Trimesh(vertArray, indexArray);

        this.terrainBody = new CANNON.Body({
            mass: 0,  // Static body
            material: this.groundMaterial,
            shape: trimeshShape,
            collisionFilterGroup: 1,
            collisionFilterMask: -1
        });

        // Position at origin since vertices are already in world space
        this.terrainBody.position.set(0, 0, 0);

        // Don't allow sleep
        this.terrainBody.sleepSpeedLimit = -1;
        this.terrainBody.allowSleep = false;

        this.physicsWorld.addBody(this.terrainBody);

        console.log("Terrain created successfully");
    }

    generateHeightData() {
        const data = [];
        const segmentSize = TERRAIN_SIZE / TERRAIN_RESOLUTION;

        // Create heightmap using exact same algorithm for both physics and visual
        for (let i = 0; i <= TERRAIN_RESOLUTION; i++) {
            data[i] = [];
            for (let j = 0; j <= TERRAIN_RESOLUTION; j++) {
                const worldX = -HALF_SIZE + i * segmentSize;
                const worldZ = -HALF_SIZE + j * segmentSize;
                data[i][j] = this.calculateHeight(worldX, worldZ);
            }
        }

        return data;
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
        let vertColor = new THREE.Color(COLOR_STOPS[0].color);
        for (let stop = 0; stop < COLOR_STOPS.length - 1; stop++) {
            const currentStop = COLOR_STOPS[stop];
            const nextStop = COLOR_STOPS[stop + 1];
            if (height >= currentStop.h && height < nextStop.h) {
                const t = (height - currentStop.h) / (nextStop.h - currentStop.h);
                const clampedT = Math.max(0, Math.min(1, t));
                vertColor.lerpColors(currentStop.color, nextStop.color, clampedT);
                return vertColor;
            }
        }
        if (height >= COLOR_STOPS[COLOR_STOPS.length - 1].h) {
            vertColor.copy(COLOR_STOPS[COLOR_STOPS.length - 1].color);
        }
        return vertColor;
    }
}

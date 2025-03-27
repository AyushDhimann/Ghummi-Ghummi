import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';

import { Vehicle } from './Vehicle.js';
import { World } from './World.js';
import { InputManager } from './InputManager.js';
import { setupBackground, dampingFactor } from './utils.js';

class Game {
    constructor() {
        this.renderer = null; this.scene = null; this.camera = null;
        this.physicsWorld = null; this.clock = null; this.inputManager = null;
        this.vehicle = null; this.world = null; this.physicsDebugger = null;

        this.cameraTarget = new THREE.Vector3();
        this.cameraPosition = new THREE.Vector3();

        this.speedElement = document.getElementById('speed-value');
        this.speedElement = document.getElementById('distance-value');

        this.animate = this.animate.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);

        this.init();
    }

    init() {
        this.clock = new THREE.Clock();
        this.inputManager = new InputManager();

        // --- Renderer ---
        const canvas = document.querySelector('#c');
        if (!canvas) { console.error("Canvas element #c not found!"); return; }
        this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.physicsWorld = new CANNON.World();
        this.physicsWorld.gravity.set(0, -9.82, 0);
        this.physicsWorld.broadphase = new CANNON.SAPBroadphase(this.physicsWorld);
        this.physicsWorld.allowSleep = false; // Disable sleep globally
        this.physicsWorld.solver.iterations = 20; // Increase iterations
        this.physicsWorld.defaultContactMaterial.contactEquationStiffness = 1e8;
        this.physicsWorld.defaultContactMaterial.contactEquationRelaxation = 3;


        // --- Scene ---
        this.scene = new THREE.Scene();
        setupBackground(this.scene, this.renderer);

        // --- Camera ---
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
        // Initial camera position might need slight adjustment based on new offset
        this.camera.position.set(0, 6, -10); // Slightly adjusted initial
        this.camera.lookAt(0, 0, 0);
        this.cameraPosition.copy(this.camera.position);

        // --- Lighting ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
        directionalLight.position.set(50, 60, 30);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 1;
        directionalLight.shadow.camera.far = 200;
        directionalLight.shadow.camera.left = -80;
        directionalLight.shadow.camera.right = 80;
        directionalLight.shadow.camera.top = 80;
        directionalLight.shadow.camera.bottom = -80;
        directionalLight.target.position.set(0, 0, 0);
        this.scene.add(directionalLight);
        this.scene.add(directionalLight.target);

        // --- Physics ---
        this.physicsWorld = new CANNON.World();
        this.physicsWorld.gravity.set(0, -9.82, 0);
        this.physicsWorld.broadphase = new CANNON.SAPBroadphase(this.physicsWorld);
        this.physicsWorld.allowSleep = true;
        this.physicsWorld.solver.iterations = 15;

        // --- Physics Debugger ---
        this.physicsDebugger = new CannonDebugger(this.scene, this.physicsWorld, {
            color: 0xff00ff, // Magenta wireframes
            scale: 1.0,
        });

        // --- World (Terrain using Heightfield) ---
        this.world = new World(this.scene, this.physicsWorld);

        // --- Vehicle ---
        const startPosition = new THREE.Vector3(0, 5, 0); // Start high enough
        this.vehicle = new Vehicle(this.scene, this.physicsWorld, this.inputManager, startPosition);

         // --- Initial World Update ---
         if (this.vehicle && this.vehicle.chassisBody) {
             this.world.update(this.vehicle.getPosition());
         } else {
              console.error("Vehicle not ready for initial world update.");
              this.world.update(new THREE.Vector3(0, 0, 0));
         }

        window.addEventListener('resize', this.onWindowResize);
        console.log("Initialization complete. Starting animation loop.");
        this.animate();
    }

    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updateCamera(dt) {
        // *** CAR VISUAL CHANGE: Check for chassisGroup ***
         if (!this.vehicle || !this.vehicle.chassisGroup || !this.vehicle.chassisBody) return;

        // *** CAR VISUAL CHANGE: Use chassisGroup for matrix world ***
        const carChassisGroup = this.vehicle.chassisGroup;

        // *** CAMERA ADJUSTMENT: Lower Y, Closer X ***
        const relativeCameraOffset = new THREE.Vector3( -7, 4, 0); // Was (-8, 5, 0) - Closer and Lower
        const cameraOffset = relativeCameraOffset.clone().applyMatrix4(carChassisGroup.matrixWorld);

        // Adjust lookAt target if needed (looking slightly higher/further relative to car)
        const lookAtTargetOffset = new THREE.Vector3(4, 1.5, 0); // Look slightly higher
        const worldLookAtTarget = lookAtTargetOffset.clone().applyMatrix4(carChassisGroup.matrixWorld);

        // Damping factors for smooth camera movement
        const posLerpFactor = dampingFactor(0.02, dt);
        const targetLerpFactor = dampingFactor(0.01, dt);

        this.cameraPosition.lerp(cameraOffset, posLerpFactor);
        this.cameraTarget.lerp(worldLookAtTarget, targetLerpFactor);

        this.camera.position.copy(this.cameraPosition);
        this.camera.lookAt(this.cameraTarget);

        // Update light target
        const light = this.scene.children.find(c => c instanceof THREE.DirectionalLight);
        if (light) {
            light.target.position.copy(this.cameraTarget);
            light.target.updateMatrixWorld();
        }
    }

    updateUI() {
        if (this.vehicle && this.speedElement) {
            const speed = this.vehicle.getCurrentSpeedKmH();
            this.speedElement.textContent = speed;
        }
    }

    animate() {
         const dt = Math.min(this.clock.getDelta(), 0.05);
         requestAnimationFrame(this.animate);

        // --- Physics Update ---
        if (this.physicsWorld) {
            const fixedTimeStep = 1 / 60;
            const maxSubSteps = 10;  // Increased from 5
            try {
                this.physicsWorld.step(fixedTimeStep, dt, maxSubSteps);
            } catch (error) { console.error("Physics step failed:", error); }
        }

        // --- Game Object Updates ---
        if (this.vehicle) { this.vehicle.update(dt); }
        if (this.world && this.vehicle) { this.world.update(this.vehicle.getPosition()); }

        // --- Camera Update ---
        this.updateCamera(dt);

        // --- UI Update ---
        this.updateUI();

        // --- UPDATE PHYSICS DEBUGGER ---
        if (this.physicsDebugger) { this.physicsDebugger.update(); }

        // --- Render ---
        if (this.renderer && this.scene && this.camera) {
             this.renderer.render(this.scene, this.camera);
        }
    }
}

// Start the game
window.addEventListener('DOMContentLoaded', () => {
     console.log("DOM Loaded. Initializing Game...");
     try { new Game(); }
     catch(error) {
         console.error("Failed to initialize game:", error);
         document.body.innerHTML = `<div style="color: red; padding: 20px; font-family: monospace; white-space: pre-wrap;">Error initializing game. Check console (F12) for details. <br><br>${error.stack}</div>`;
     }
});

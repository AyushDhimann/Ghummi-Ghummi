// js/main.js

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
// Note: Not using GSSolver here, relying on default + iterations + compound shape
import CannonDebugger from 'cannon-es-debugger';

import { Vehicle } from './Vehicle.js';
import { World } from './World.js';
import { InputManager } from './InputManager.js';
import { setupBackground, dampingFactor } from './utils.js';

// --- Performance / Debug Flags ---
const USE_PHYSICS_DEBUGGER = true; // Set to true to see physics wireframes

// --- Physics Settings ---
const PHYSICS_FIXED_TIMESTEP = 1 / 60;
const PHYSICS_MAX_SUBSTEPS = 8;
const SOLVER_ITERATIONS = 25; // Keep iterations high for stability

class Game {
    constructor() {
        this.renderer = null; this.scene = null; this.camera = null;
        this.physicsWorld = null; this.clock = null; this.inputManager = null;
        this.vehicle = null; this.world = null;
        this.physicsDebugger = null;
        this.cameraTarget = new THREE.Vector3();
        this.cameraPosition = new THREE.Vector3();
        this.speedElement = document.getElementById('speed-value');
        this.distanceElement = document.getElementById('distance-value');
        this.animate = this.animate.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
        this.init();
    }

    init() {
        console.log("Initializing Game...");
        this.clock = new THREE.Clock();
        this.inputManager = new InputManager();

        const canvas = document.querySelector('#c');
        if (!canvas) { this.showError("Canvas element #c not found!"); return; }
        this.renderer = new THREE.WebGLRenderer({
            antialias: true, canvas: canvas, powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.scene = new THREE.Scene();
        setupBackground(this.scene, this.renderer);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 1000);
        this.camera.position.set(0, 8, -12); // Initial camera position
        this.camera.lookAt(0, 0, 0);
        this.cameraPosition.copy(this.camera.position);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(40, 50, 20);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        const shadowCamSize = 60;
        directionalLight.shadow.camera.near = 1; directionalLight.shadow.camera.far = 150;
        directionalLight.shadow.camera.left = -shadowCamSize; directionalLight.shadow.camera.right = shadowCamSize;
        directionalLight.shadow.camera.top = shadowCamSize; directionalLight.shadow.camera.bottom = -shadowCamSize;
        directionalLight.shadow.bias = -0.001;
        this.scene.add(directionalLight);
        this.scene.add(directionalLight.target);

        this.physicsWorld = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0),
            broadphase: new CANNON.SAPBroadphase(this.physicsWorld),
            allowSleep: true,
        });
        this.physicsWorld.solver.iterations = SOLVER_ITERATIONS;
        this.physicsWorld.defaultContactMaterial.contactEquationStiffness = 1e8; // Base stiffness
        this.physicsWorld.defaultContactMaterial.contactEquationRelaxation = 3;
        this.physicsWorld.defaultContactMaterial.friction = 0.3;
        this.physicsWorld.defaultContactMaterial.restitution = 0.1;

        if (USE_PHYSICS_DEBUGGER) {
            this.physicsDebugger = new CannonDebugger(this.scene, this.physicsWorld, { color: 0x00ff00, scale: 1.0 });
            console.log("CannonDebugger initialized.");
        }

        try { this.world = new World(this.scene, this.physicsWorld); }
        catch (error) { this.showError(`Failed to initialize World:\n${error.stack}`); return; }

        try {
            const startPosition = new THREE.Vector3(0, 5, 0);
            this.vehicle = new Vehicle(this.scene, this.physicsWorld, this.inputManager, startPosition);
        } catch (error) { this.showError(`Failed to initialize Vehicle:\n${error.stack}`); return; }

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
        if (!this.vehicle || !this.vehicle.chassisGroup || !this.vehicle.chassisBody) return;

        const carChassisGroup = this.vehicle.chassisGroup;
        const carPosition = this.vehicle.getPosition(); // Use getter for consistency

        // Camera offset relative to car's local space (X: Forward/Backward, Y: Up/Down, Z: Left/Right)
        const relativeCameraOffset = new THREE.Vector3(-10, 5, 0); // Behind, Up, Centered

        // Look-at target relative to car's local space
        const lookAtTargetOffset = new THREE.Vector3(5, 1.5, 0); // Ahead, Slightly Up, Centered

        // Calculate world positions
        const cameraOffset = relativeCameraOffset.clone().applyQuaternion(carChassisGroup.quaternion).add(carPosition);
        const worldLookAtTarget = lookAtTargetOffset.clone().applyQuaternion(carChassisGroup.quaternion).add(carPosition);

        // Smooth interpolation
        const posLerpFactor = dampingFactor(0.03, dt);
        const targetLerpFactor = dampingFactor(0.05, dt);

        // Prevent camera going too low relative to car
        const minCameraHeightAboveCar = 1.5;
        if (cameraOffset.y < carPosition.y + minCameraHeightAboveCar) {
             cameraOffset.y = carPosition.y + minCameraHeightAboveCar;
        }

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
        if (this.vehicle) {
            if (this.speedElement) this.speedElement.textContent = this.vehicle.getCurrentSpeedKmH();
            if (this.distanceElement) {
                const distMeters = this.vehicle.getDistanceTraveled('meters');
                this.distanceElement.textContent = (distMeters < 1000) ? `${distMeters} m` : `${this.vehicle.getDistanceTraveled('km')} km`;
            }
        }
    }

    animate() {
        requestAnimationFrame(this.animate);
        const dt = Math.min(this.clock.getDelta(), 0.1);

        if (this.physicsWorld) {
            try { this.physicsWorld.step(PHYSICS_FIXED_TIMESTEP, dt, PHYSICS_MAX_SUBSTEPS); }
            catch (error) { console.error("Physics step failed:", error); }
        }

        if (this.vehicle) this.vehicle.update(dt);
        // if (this.world) this.world.update(this.vehicle.getPosition()); // If world needed updates

        this.updateCamera(dt);
        this.updateUI();
        if (this.physicsDebugger) this.physicsDebugger.update();

        if (this.renderer) this.renderer.render(this.scene, this.camera);
    }

    showError(message) {
        console.error("GAME ERROR:", message); // Log full error too
        const errorDivId = 'game-error-message';
        let errorDiv = document.getElementById(errorDivId);
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = errorDivId;
            errorDiv.style.position = 'absolute'; errorDiv.style.top = '0'; errorDiv.style.left = '0';
            errorDiv.style.width = '100%'; errorDiv.style.padding = '20px';
            errorDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.8)'; errorDiv.style.color = 'white';
            errorDiv.style.fontFamily = 'monospace'; errorDiv.style.whiteSpace = 'pre-wrap';
            errorDiv.style.zIndex = '1000'; errorDiv.style.boxSizing = 'border-box';
            document.body.appendChild(errorDiv);
        }
        errorDiv.textContent = `ERROR:\n${message}\n\nPlease check the console (F12) for more details.`;
        // Optionally hide canvas/UI
        // document.getElementById('c')?.style.display = 'none';
        // document.getElementById('ui-container')?.style.display = 'none';
    }

    dispose() {
        console.log("Disposing game...");
        // Cancel animation frame if ID stored
        window.removeEventListener('resize', this.onWindowResize);
        if (this.inputManager) this.inputManager.dispose();
        if (this.vehicle) this.vehicle.dispose();
        if (this.world) this.world.dispose();
        if (this.renderer) this.renderer.dispose();
        // Nullify references
        Object.keys(this).forEach(key => this[key] = null);
    }
}

// --- Global Error Handling ---
window.addEventListener('error', (event) => {
    console.error("Unhandled global error:", event.error);
    window.gameInstance?.showError(`Unhandled Error: ${event.message}\n${event.error?.stack}`);
});
window.addEventListener('unhandledrejection', (event) => {
    console.error("Unhandled promise rejection:", event.reason);
    window.gameInstance?.showError(`Unhandled Promise Rejection: ${event.reason?.message}\n${event.reason?.stack}`);
});

// --- Start the Game ---
window.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Loaded. Initializing Game...");
    try { window.gameInstance = new Game(); }
    catch (error) {
        console.error("Fatal error during game initialization:", error);
        document.body.innerHTML = `<div style="color: red; background: black; padding: 20px; font-family: monospace; white-space: pre-wrap; position: absolute; top:0; left:0; width: 100%; z-index: 1000; box-sizing: border-box;">FATAL ERROR initializing game. Check console (F12) for details. <br><br>${error.stack}</div>`;
    }
});

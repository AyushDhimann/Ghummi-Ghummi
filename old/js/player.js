// import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js'; // REMOVE THIS LINE
import { PLAYER_SPEED, PLAYER_TURN_SPEED, PLAYER_HEIGHT } from './constants.js';

// THREE should be available globally from the script tag in index.html
if (typeof THREE === 'undefined') {
    console.error("Player.js: THREE is not defined. Make sure three.min.js is loaded before this script.");
}

export class Player {
    constructor(scene) {
        if (typeof THREE === 'undefined') return; // Prevent errors if THREE not loaded

        this.scene = scene;
        const geometry = new THREE.BoxGeometry(1.5, 1, 3); // Car-like shape
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.y = PLAYER_HEIGHT; // Position slightly above ground
        this.scene.add(this.mesh);
        console.log("Player mesh added to scene:", this.mesh); // Debug log

        this.velocity = new THREE.Vector3();
        this.rotation = this.mesh.rotation;
        this.rotation.order = 'YXZ'; // Use Y-axis for turning

        this.currentSpeed = 0;
    }

    update(deltaTime, input) {
        if (typeof THREE === 'undefined') return 0;

        // --- Steering ---
        let turnDirection = 0;
        if (input.left) turnDirection = 1;
        if (input.right) turnDirection = -1;
        this.rotation.y += turnDirection * PLAYER_TURN_SPEED * deltaTime;

        // --- Acceleration/Deceleration ---
        let targetSpeed = 0;
        if (input.forward) targetSpeed = PLAYER_SPEED;
        if (input.backward) targetSpeed = -PLAYER_SPEED / 2; // Slower reverse

        // Simple acceleration/deceleration (can be improved)
        this.currentSpeed += (targetSpeed - this.currentSpeed) * deltaTime * 5.0;

        // --- Movement ---
        const forwardDirection = new THREE.Vector3(0, 0, -1);
        forwardDirection.applyEuler(this.rotation); // Apply current rotation

        this.velocity.copy(forwardDirection).multiplyScalar(this.currentSpeed);
        this.mesh.position.addScaledVector(this.velocity, deltaTime);

        // Return distance moved for scoring
        const distanceMoved = this.velocity.length() * deltaTime;
        return distanceMoved;
    }

    getPosition() {
        return this.mesh.position;
    }

    reset() {
        if (!this.mesh) return;
        this.mesh.position.set(0, PLAYER_HEIGHT, 0);
        this.mesh.rotation.set(0, 0, 0);
        if (this.velocity) this.velocity.set(0, 0, 0);
        this.currentSpeed = 0;
    }

    dispose() {
        if (!this.scene || !this.mesh) return;
        this.scene.remove(this.mesh);
        if (this.mesh.geometry) this.mesh.geometry.dispose();
        if (this.mesh.material) this.mesh.material.dispose();
        this.mesh = null; // Help garbage collection
    }
}

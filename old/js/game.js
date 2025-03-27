// import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js'; // REMOVE THIS LINE
import { Player } from './player.js';
import { Road } from './road.js';
import { InputHandler } from './input.js';
import { UIManager } from './ui.js';
import {
    CAMERA_DISTANCE, CAMERA_HEIGHT, CAMERA_LAG,
    GROUND_COLOR, FALL_LIMIT_Y
} from './constants.js';

// THREE should be available globally
if (typeof THREE === 'undefined') {
    console.error("Game.js: THREE is not defined.");
}

export class Game {
    constructor(containerId, uiManager) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container with id "${containerId}" not found.`);
            return; // Stop if container doesn't exist
        }
        this.uiManager = uiManager;

        // Initialize properties to null
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.road = null;
        this.input = null;
        this.clock = null;
        this.animationFrameId = null;
        this.gameState = 'menu'; // 'menu', 'playing', 'gameover'
        this.score = 0;
        this.targetCameraPosition = null; // Will be initialized as Vector3
    }

    init() {
        // Prevent initialization if THREE is not loaded
        if (typeof THREE === 'undefined') {
             console.error("Game.init: THREE is not loaded. Cannot initialize game.");
             // Optionally display an error message to the user here
             return;
        }

        console.log("Game Initializing..."); // Debug log

        // --- Basic Setup ---
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 150); // Add fog

        // --- Camera ---
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.targetCameraPosition = new THREE.Vector3(); // Initialize here
        this.resetCameraPosition(); // Set initial position

        // --- Renderer ---
        try {
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.container.appendChild(this.renderer.domElement);
            console.log("Renderer created and canvas appended."); // Debug log
        } catch (error) {
            console.error("Failed to create WebGLRenderer:", error);
            // Display a user-friendly message about WebGL support
            this.container.innerHTML = '<p style="color: red; padding: 20px;">Error: Could not initialize 3D graphics. Your browser might not support WebGL, or it might be disabled.</p>';
            return; // Stop initialization if renderer fails
        }


        // --- Lighting ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 25);
        this.scene.add(directionalLight);

        // --- Ground ---
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: GROUND_COLOR });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.05; // Slightly below road
        this.scene.add(ground);

        // --- Game Elements ---
        this.player = new Player(this.scene);
        this.road = new Road(this.scene);
        this.input = new InputHandler();
        this.clock = new THREE.Clock(); // Initialize clock here

        // --- Event Listeners ---
        // Use arrow function or .bind(this) to maintain 'this' context
        this.resizeHandler = () => this.onWindowResize();
        window.addEventListener('resize', this.resizeHandler);

        console.log("Game Initialized Successfully");
        this.resetGame(); // Set initial state (mostly UI and player/road position)
    }

    startGame() {
        // Ensure game was initialized properly
        if (!this.renderer || !this.player || !this.road || !this.input || !this.clock) {
            console.error("Cannot start game, initialization failed or incomplete.");
            return;
        }
        if (this.gameState === 'playing') return;

        console.log("Starting Game...");
        this.resetGame(); // Reset positions, score etc.
        this.gameState = 'playing';
        this.uiManager.showGameUI();
        this.score = 0;
        this.uiManager.updateScore(this.score);
        this.clock.start(); // Ensure clock is running
        this.clock.getDelta(); // Call once to reset delta timer after potential pause
        this.loop(); // Start the game loop
    }

    gameOver() {
        if (this.gameState !== 'playing') return;
        console.log("Game Over");
        this.gameState = 'gameover';
        if (this.clock) this.clock.stop(); // Stop the clock
        this.uiManager.showGameOverMenu(this.score);
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    resetGame() {
        this.score = 0;
        if (this.player) this.player.reset();
        if (this.road) this.road.reset();
        this.resetCameraPosition(); // Reset camera
        if (this.uiManager) this.uiManager.reset();
        // Don't change gameState here, let startGame or showMenu handle it
    }

     resetCameraPosition() {
        if (!this.camera || !this.targetCameraPosition) return;
        const initialOffset = new THREE.Vector3(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
        // If player exists, base initial position on player's reset position
        const lookAtTarget = this.player ? this.player.getPosition() : new THREE.Vector3(0, 0, 0);
        this.camera.position.copy(lookAtTarget).add(initialOffset);
        this.targetCameraPosition.copy(this.camera.position); // Sync target
        this.camera.lookAt(lookAtTarget);
    }


    loop() {
        // Stop loop if game state is not 'playing'
        if (this.gameState !== 'playing') {
             if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
            console.log("Loop stopped. Game state:", this.gameState);
            return;
        }

        this.animationFrameId = requestAnimationFrame(() => this.loop()); // Use arrow function

        // Ensure clock is running and get delta time
        if (!this.clock || !this.clock.running) {
            console.warn("Clock not running in game loop.");
            return; // Avoid updates with bad delta time
        }
        const deltaTime = this.clock.getDelta();

        // --- Update ---
        if (this.player && this.input) {
            const distanceMoved = this.player.update(deltaTime, this.input.keys);
            this.score += distanceMoved * 0.1; // Adjust scoring multiplier as needed
        }
        if (this.road && this.player) {
            this.road.update(this.player.getPosition());
        }
        if (this.camera && this.player) {
            this.updateCamera(deltaTime);
        }
        if (this.uiManager) {
            this.uiManager.updateScore(this.score);
        }

        // --- Check Game Over Condition ---
        if (this.player && this.player.getPosition().y < FALL_LIMIT_Y) {
            this.gameOver();
            return; // Exit loop immediately on game over
        }

        // --- Render ---
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        } else {
            console.warn("Render skipped: Renderer, Scene or Camera missing.");
        }
    }

    updateCamera(deltaTime) {
        if (!this.camera || !this.player || !this.targetCameraPosition) return;

        const playerPos = this.player.getPosition();
        const playerRot = this.player.rotation; // Get player's rotation

        // Calculate desired camera position relative to player
        const cameraOffset = new THREE.Vector3(0, CAMERA_HEIGHT, CAMERA_DISTANCE);

        // Apply player's Y rotation to the offset vector
        // Create a quaternion from the player's Y rotation
        const playerQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, playerRot.y, 0, 'YXZ'));
        cameraOffset.applyQuaternion(playerQuaternion);

        // Add the rotated offset to the player's position
        this.targetCameraPosition.copy(playerPos).add(cameraOffset);

        // Smoothly interpolate camera position using deltaTime for frame-rate independence
        const lerpFactor = 1.0 - Math.exp(-CAMERA_LAG * deltaTime * 60); // Adjust lag based on delta time (approx)
        this.camera.position.lerp(this.targetCameraPosition, lerpFactor);

        // Always look at the player's current position
        this.camera.lookAt(playerPos);
    }

    onWindowResize() {
        if (!this.camera || !this.renderer || !this.container) return;
        console.log("Window resized"); // Debug log
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width === 0 || height === 0) return; // Avoid issues if container is hidden

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    cleanup() {
        console.log("Cleaning up game resources...");
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }

        if (this.input) {
            this.input.dispose();
            this.input = null;
        }
        if (this.player) {
            this.player.dispose();
            this.player = null;
        }
        if (this.road) {
            this.road.dispose();
            this.road = null;
        }

        // Dispose Three.js objects
        if (this.scene) {
            // Remove all children and dispose their resources
            while(this.scene.children.length > 0){
                const object = this.scene.children[0];
                this.scene.remove(object);
                if (object !== this.player?.mesh && object !== this.road?.segments[0]) { // Avoid double dispose if player/road handle it
                    if (object.geometry) object.geometry.dispose();
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(material => material.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                }
                 // Special handling for lights, ground plane if needed
            }
             this.scene = null;
        }

        if (this.renderer) {
            this.renderer.dispose();
             if (this.renderer.domElement && this.container.contains(this.renderer.domElement)) {
                try {
                    this.container.removeChild(this.renderer.domElement);
                } catch (e) {
                    console.warn("Error removing renderer DOM element:", e);
                }
            }
            this.renderer = null;
        }

        this.camera = null;
        this.clock = null;
        this.targetCameraPosition = null;
        this.gameState = 'menu';
        console.log("Cleanup complete.");
    }
}

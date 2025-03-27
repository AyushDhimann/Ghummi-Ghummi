// js/utils.js

// Import THREE locally, assuming it's installed via npm/yarn
import * as THREE from 'three';

/**
 * Linear interpolation between two values.
 * @param {number} start Start value.
 * @param {number} end End value.
 * @param {number} t Interpolation factor (0.0 to 1.0).
 * @returns {number} Interpolated value.
 */
export function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

/**
 * Calculates a frame-rate independent damping factor for lerp.
 * @param {number} decayFactor How much percentage remains after 1 second (e.g., 0.01 for 1%).
 * @param {number} dt Delta time in seconds.
 * @returns {number} The lerp factor to use for this frame.
 */
export function dampingFactor(decayFactor, dt) {
    // Ensure decayFactor is within a reasonable range to avoid Math.pow issues
    const clampedDecay = Math.max(1e-9, Math.min(1.0, decayFactor));
    // Calculate the lerp amount needed this frame to achieve the desired decay over 1 second
    return 1.0 - Math.pow(clampedDecay, dt);
}

/**
 * Sets up the scene's background color and fog.
 * @param {THREE.Scene} scene The Three.js scene object.
 * @param {THREE.WebGLRenderer} renderer The Three.js renderer (optional, needed for env map).
 */
export function setupBackground(scene, renderer) {
    const skyColor = 0x0a0a32; // A lighter sky blue
    const groundColor = 0xB8860B; // DarkGoldenrod like color for fog blend

    scene.background = new THREE.Color(skyColor);
    // Fog( color, near, far ) - Adjust near/far for desired effect
    scene.fog = new THREE.Fog(skyColor, 50, 300);

    // --- Optional: Add Hemisphere Light for softer ambient lighting ---
    const hemiLight = new THREE.HemisphereLight(skyColor, groundColor, 0.6); // Sky, Ground, Intensity
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);


    // --- Optional Skybox (keep commented unless you have the assets) ---
    /*
    const loader = new THREE.CubeTextureLoader();
    // Make sure you have these images in a 'public/skybox/' folder (or adjust path)
    const texture = loader.setPath('skybox/').load([
        'px.jpg', // Right
        'nx.jpg', // Left
        'py.jpg', // Top
        'ny.jpg', // Bottom
        'pz.jpg', // Front
        'nz.jpg'  // Back
    ]);
    scene.background = texture;
    // Apply as environment map for reflections (requires materials supporting env maps)
    // scene.environment = texture;
    */
}

// Import THREE directly from CDN
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.161.0/three.module.min.js';

// Linear interpolation
export function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

// Frame-rate independent damping (useful for lerp factor)
// decayFactor: How much remains after 1 second (e.g., 0.01 means 1% remains)
// dt: delta time in seconds
export function dampingFactor(decayFactor, dt) {
    return 1.0 - Math.pow(decayFactor, dt);
}

// Setup background color, fog, and optional skybox
export function setupBackground(scene, renderer) { // Pass renderer if needed for env map
    const skyColor = 0xade0ee; // Light blueish sky
    scene.background = new THREE.Color(skyColor);
    scene.fog = new THREE.Fog(skyColor, 60, 250); // Adjust fog distances

    // --- Optional Skybox ---
    /*
    const loader = new THREE.CubeTextureLoader();
    // Make sure you have these images in a 'skybox' folder relative to your public directory
    const texture = loader.setPath('skybox/').load([
        'px.jpg', // Right
        'nx.jpg', // Left
        'py.jpg', // Top
        'ny.jpg', // Bottom
        'pz.jpg', // Front
        'nz.jpg'  // Back
    ]);
    scene.background = texture;
    // Optional: Apply as environment map for reflections (requires materials to be adjusted)
    // scene.environment = texture;
    */
}

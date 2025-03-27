// import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js'; // REMOVE THIS LINE
import { ROAD_WIDTH, ROAD_SEGMENT_LENGTH, ROAD_COLOR, VISIBLE_SEGMENTS } from './constants.js';

// THREE should be available globally
if (typeof THREE === 'undefined') {
    console.error("Road.js: THREE is not defined.");
}

export class Road {
    constructor(scene) {
        if (typeof THREE === 'undefined') return;

        this.scene = scene;
        this.segments = [];
        // Define geometry and material ONCE to share among segments
        this.segmentGeometry = new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_SEGMENT_LENGTH);
        this.segmentMaterial = new THREE.MeshStandardMaterial({
            color: ROAD_COLOR,
            side: THREE.DoubleSide // Render both sides
        });

        this.lastPlayerZ = 0; // Track player progress along Z

        // Initial road generation
        console.log("Road: Initializing segments..."); // Debug log
        for (let i = -Math.floor(VISIBLE_SEGMENTS / 2); i < Math.ceil(VISIBLE_SEGMENTS / 2); i++) {
            this.addSegment(i * ROAD_SEGMENT_LENGTH);
        }
        console.log(`Road: Initialized ${this.segments.length} segments.`); // Debug log
    }

    addSegment(zPos) {
        if (typeof THREE === 'undefined') return;

        const segment = new THREE.Mesh(this.segmentGeometry, this.segmentMaterial);
        segment.rotation.x = -Math.PI / 2; // Rotate flat
        segment.position.set(0, 0, zPos); // Position along Z axis
        this.scene.add(segment);
        this.segments.push(segment);
    }

    removeOldestSegment() {
        if (this.segments.length > 0) {
            const oldestSegment = this.segments.shift(); // Remove from beginning of array
            this.scene.remove(oldestSegment);
            // Note: Geometry and Material are shared, so don't dispose them here
        }
    }

    update(playerPosition) {
        if (typeof THREE === 'undefined') return;

        const playerZ = playerPosition.z;
        // Use Math.round for potentially smoother segment transitions near zero
        const currentSegmentIndex = Math.round(playerZ / ROAD_SEGMENT_LENGTH);
        const lastSegmentIndex = Math.round(this.lastPlayerZ / ROAD_SEGMENT_LENGTH);

        // Check if player has moved to a new segment index
        if (currentSegmentIndex !== lastSegmentIndex && this.segments.length > 0) {
            const segmentsToShift = currentSegmentIndex - lastSegmentIndex;

            if (segmentsToShift > 0) { // Moving forward
                for (let i = 0; i < segmentsToShift; i++) {
                    const leadSegmentZ = this.segments[this.segments.length - 1].position.z;
                    this.addSegment(leadSegmentZ + ROAD_SEGMENT_LENGTH);
                    this.removeOldestSegment();
                }
            } else { // Moving backward
                 for (let i = 0; i < -segmentsToShift; i++) {
                    const rearSegmentZ = this.segments[0].position.z;
                    // Add new segment behind
                    const segment = new THREE.Mesh(this.segmentGeometry, this.segmentMaterial);
                    segment.rotation.x = -Math.PI / 2;
                    segment.position.set(0, 0, rearSegmentZ - ROAD_SEGMENT_LENGTH);
                    this.scene.add(segment);
                    this.segments.unshift(segment); // Add to front

                    // Remove segment furthest ahead
                    if (this.segments.length > VISIBLE_SEGMENTS) {
                         const furthestSegment = this.segments.pop(); // Remove from end
                         this.scene.remove(furthestSegment);
                    }
                 }
            }
            this.lastPlayerZ = playerZ; // Update tracked player position
        }
    }

    reset() {
        if (typeof THREE === 'undefined') return;
        // Remove all existing segments
        while (this.segments.length > 0) {
            this.removeOldestSegment();
        }
        // Regenerate initial segments
        this.lastPlayerZ = 0;
        for (let i = -Math.floor(VISIBLE_SEGMENTS / 2); i < Math.ceil(VISIBLE_SEGMENTS / 2); i++) {
            this.addSegment(i * ROAD_SEGMENT_LENGTH);
        }
    }

    dispose() {
        if (typeof THREE === 'undefined') return;
        // Remove all segments from scene
         while (this.segments.length > 0) {
            this.removeOldestSegment();
        }
        // Dispose shared geometry and material ONLY when the whole road object is destroyed
        if (this.segmentGeometry) this.segmentGeometry.dispose();
        if (this.segmentMaterial) this.segmentMaterial.dispose();
        this.segmentGeometry = null;
        this.segmentMaterial = null;
        this.segments = []; // Clear array
    }
}

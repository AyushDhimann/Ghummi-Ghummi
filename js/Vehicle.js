// js/Vehicle.js

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { lerp, dampingFactor } from './utils.js';

// --- Vehicle Physics Constants ---
// Engine & Brakes
const ENGINE_FORCE_FORWARD = 450;
const ENGINE_FORCE_BACKWARD = 100;
const BRAKE_FORCE = 80;

// Steering
const MAX_STEER_ANGLE = Math.PI / 6.0;

// Suspension & Wheels
const SUSPENSION_STIFFNESS = 35;
const SUSPENSION_DAMPING = 5;
const SUSPENSION_COMPRESSION = 5;
const SUSPENSION_REST_LENGTH = 0.45;
const SUSPENSION_TRAVEL = 0.5;
const FRICTION_SLIP = 2.2;
const WHEEL_RADIUS = 0.4;
const WHEEL_WIDTH = 0.3;

// Chassis Physics Body Properties
const CHASSIS_MASS = 160;
const CHASSIS_LINEAR_DAMPING = 0.25;
const CHASSIS_ANGULAR_DAMPING = 0.7;

// --- Flip Detection Constants ---
const FLIP_THRESHOLD_DOT = 0.3; // Dot product threshold (car_up . world_up)
const FLIP_RESET_DELAY = 2.5; // Seconds the car must be flipped before auto-reset

export class Vehicle {
    constructor(scene, physicsWorld, inputManager, startPos = new THREE.Vector3(0, 5, 0)) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.inputManager = inputManager;
        this.startPosCannon = new CANNON.Vec3(startPos.x, startPos.y, startPos.z);
        this.startPosThree = startPos.clone();

        // Vehicle dimensions
        this.chassisWidth = 1.7;
        this.chassisHeight = 0.5; // Main physics box height
        this.chassisLength = 2.8;
        this.wheelRadius = WHEEL_RADIUS;
        this.wheelWidth = WHEEL_WIDTH;

        // Physics objects
        this.vehicle = null;
        this.chassisBody = null; // This will be the Compound body

        // Visual objects
        this.chassisGroup = null;
        this.wheelMeshes = [];

        // State
        this.currentSteering = 0;
        this.totalDistance = 0;
        this.previousPosition = this.startPosThree.clone();

        // Flip state
        this.isFlipped = false;
        this.timeFlipped = 0;

        this.createPhysicsVehicle(); // Creates compound body now
        this.createVisualVehicle();

        console.log("Vehicle initialized.");
    }

    createPhysicsVehicle() {
        // --- Create Shapes for Compound Body ---
        // 1. Main Chassis Box (visual representation)
        const mainBoxExtents = new CANNON.Vec3(this.chassisLength * 0.5, this.chassisHeight * 0.5, this.chassisWidth * 0.5);
        const mainBoxShape = new CANNON.Box(mainBoxExtents);
        const mainBoxOffset = new CANNON.Vec3(0, 0, 0); // Centered

        // 2. Skid Plate Box (for better ground contact stability)
        const skidHeight = 0.05; // Very thin
        const skidWidth = this.chassisWidth * 0.95; // Almost full width
        const skidLength = this.chassisLength * 0.9; // Almost full length
        const skidPlateExtents = new CANNON.Vec3(skidLength * 0.5, skidHeight * 0.5, skidWidth * 0.5);
        const skidPlateShape = new CANNON.Box(skidPlateExtents);
        // Position it slightly below the main chassis box center
        const skidPlateOffsetY = -mainBoxExtents.y - skidHeight * 0.5 + 0.01; // Place just below the main box bottom
        const skidPlateOffset = new CANNON.Vec3(0, skidPlateOffsetY, 0);

        // --- Create Compound Body ---
        this.chassisBody = new CANNON.Body({
            mass: CHASSIS_MASS,
            material: this.physicsWorld.defaultMaterial, // Assign material here
            position: this.startPosCannon,
            angularVelocity: new CANNON.Vec3(0, 0, 0),
            linearDamping: CHASSIS_LINEAR_DAMPING,
            angularDamping: CHASSIS_ANGULAR_DAMPING,
        });

        // --- Add Shapes to the Compound Body ---
        this.chassisBody.addShape(mainBoxShape, mainBoxOffset);
        this.chassisBody.addShape(skidPlateShape, skidPlateOffset);

        this.chassisBody.allowSleep = false; // Keep vehicle active

        // --- Raycast Vehicle Setup (uses the compound body) ---
        this.vehicle = new CANNON.RaycastVehicle({
            chassisBody: this.chassisBody,
            indexRightAxis: 2,    // Z is right
            indexForwardAxis: 0,  // X is forward
            indexUpAxis: 1,       // Y is up
        });

        // --- Wheel Setup ---
        const wheelOptions = {
            radius: this.wheelRadius,
            directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: SUSPENSION_STIFFNESS,
            suspensionRestLength: SUSPENSION_REST_LENGTH,
            frictionSlip: FRICTION_SLIP,
            dampingRelaxation: SUSPENSION_DAMPING,
            dampingCompression: SUSPENSION_COMPRESSION,
            maxSuspensionForce: 100000,
            maxSuspensionTravel: SUSPENSION_TRAVEL,
            customSlidingRotationalSpeed: -35,
            useCustomSlidingRotationalSpeed: true,
            axleLocal: new CANNON.Vec3(0, 0, 1), // Z-axis for axle rotation
            chassisConnectionPointLocal: new CANNON.Vec3(), // Set per wheel
            isFrontWheel: false,
        };

        // Wheel positions (relative to the compound body's center 0,0,0)
        const axleWidth = this.chassisWidth * 0.45;
        const frontAxlePos = this.chassisLength * 0.4;
        const rearAxlePos = -this.chassisLength * 0.4;
        // Connect wheels relative to the main box's approximate bottom edge height
        const connectionHeight = -this.chassisHeight * 0.4; // Relative to body center (0,0,0)

        // Front Left (Index 0)
        wheelOptions.chassisConnectionPointLocal.set(frontAxlePos, connectionHeight, axleWidth);
        wheelOptions.isFrontWheel = true; this.vehicle.addWheel({ ...wheelOptions });
        // Front Right (Index 1)
        wheelOptions.chassisConnectionPointLocal.set(frontAxlePos, connectionHeight, -axleWidth);
        wheelOptions.isFrontWheel = true; this.vehicle.addWheel({ ...wheelOptions });
        // Rear Left (Index 2)
        wheelOptions.chassisConnectionPointLocal.set(rearAxlePos, connectionHeight, axleWidth);
        wheelOptions.isFrontWheel = false; this.vehicle.addWheel({ ...wheelOptions });
        // Rear Right (Index 3)
        wheelOptions.chassisConnectionPointLocal.set(rearAxlePos, connectionHeight, -axleWidth);
        wheelOptions.isFrontWheel = false; this.vehicle.addWheel({ ...wheelOptions });

        // Add RaycastVehicle specific constraints/logic to the physics world
        this.vehicle.addToWorld(this.physicsWorld);

        console.log("Physics vehicle created with Compound shape.");
    }

    createVisualVehicle() {
        // Visuals remain the same, based on the main chassis dimensions
        this.chassisGroup = new THREE.Group();
        this.scene.add(this.chassisGroup);

        const bodyHeight = 0.4;
        const bodyOffsetY = 0.1;
        const bodyGeo = new THREE.BoxGeometry(this.chassisLength, bodyHeight, this.chassisWidth);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0xcc0000, metalness: 0.7, roughness: 0.3, flatShading: false
        });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = false;
        bodyMesh.position.y = bodyOffsetY;
        this.chassisGroup.add(bodyMesh);

        const cabinLength = this.chassisLength * 0.45;
        const cabinWidth = this.chassisWidth * 0.8;
        const cabinHeight = 0.5;
        const cabinGeo = new THREE.BoxGeometry(cabinLength, cabinHeight, cabinWidth);
        const cabinMat = new THREE.MeshStandardMaterial({
            color: 0x444444, metalness: 0.1, roughness: 0.7, flatShading: false
        });
        const cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
        cabinMesh.castShadow = true;
        cabinMesh.receiveShadow = true;
        cabinMesh.position.y = bodyOffsetY + bodyHeight / 2 + cabinHeight / 2;
        cabinMesh.position.x = -this.chassisLength * 0.15;
        this.chassisGroup.add(cabinMesh);

        const wheelGeo = new THREE.CylinderGeometry(this.wheelRadius, this.wheelRadius, this.wheelWidth, 24);
        wheelGeo.rotateX(Math.PI / 2);
        const wheelMat = new THREE.MeshStandardMaterial({
            color: 0x222222, metalness: 0.1, roughness: 0.8, flatShading: false
        });

        for (let i = 0; i < 4; i++) {
            const wheelMesh = new THREE.Mesh(wheelGeo, wheelMat);
            wheelMesh.castShadow = true;
            wheelMesh.receiveShadow = true;
            this.scene.add(wheelMesh);
            this.wheelMeshes.push(wheelMesh);
        }
    }

    update(dt) {
        if (!this.vehicle || !this.chassisBody || !this.chassisGroup) return;

        // --- Check for Flip Condition & Auto-Reset ---
        this.checkFlipCondition(dt);
        // If reset was triggered by flip check, this.isFlipped will be false after resetPosition runs
        // No explicit return needed here as resetPosition handles state

        // --- Track Distance ---
        const currentPosition = this.getPosition();
        const dx = currentPosition.x - this.previousPosition.x;
        const dz = currentPosition.z - this.previousPosition.z;
        this.totalDistance += Math.sqrt(dx * dx + dz * dz);
        this.previousPosition.copy(currentPosition);

        // --- Input Handling ---
        let engineForce = 0;
        let brakeForce = 0;
        let targetSteering = 0;

        const forwardPressed = this.inputManager.isPressed('forward');
        const backwardPressed = this.inputManager.isPressed('backward');
        const leftPressed = this.inputManager.isPressed('left');
        const rightPressed = this.inputManager.isPressed('right');

        if (forwardPressed) {
            engineForce = ENGINE_FORCE_FORWARD;
        } else if (backwardPressed) {
            const currentSpeed = this.chassisBody.velocity.length();
            const worldVelocity = this.chassisBody.velocity;
            const forwardDir = new CANNON.Vec3();
            this.chassisBody.vectorToWorldFrame(new CANNON.Vec3(1, 0, 0), forwardDir);
            const dot = forwardDir.dot(worldVelocity.unit());

            if (dot > 0.1 && currentSpeed > 0.5) {
                brakeForce = BRAKE_FORCE; engineForce = 0;
            } else {
                engineForce = -ENGINE_FORCE_BACKWARD; brakeForce = 0;
            }
        }

        if (leftPressed) { targetSteering = MAX_STEER_ANGLE; }
        else if (rightPressed) { targetSteering = -MAX_STEER_ANGLE; }
        else { targetSteering = 0; }

        // --- Smooth Steering ---
        const steerLerpFactor = dampingFactor(0.1, dt);
        this.currentSteering = lerp(this.currentSteering, targetSteering, steerLerpFactor);
        this.currentSteering = Math.max(-MAX_STEER_ANGLE, Math.min(MAX_STEER_ANGLE, this.currentSteering));

        // --- Apply Physics ---
        this.vehicle.applyEngineForce(engineForce, 2);
        this.vehicle.applyEngineForce(engineForce, 3);
        for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
            this.vehicle.setBrake(brakeForce, i);
        }
        this.vehicle.setSteeringValue(this.currentSteering, 0);
        this.vehicle.setSteeringValue(this.currentSteering, 1);

        // --- Reset (Manual) ---
        if (this.inputManager.isPressed('reset')) {
            this.resetPosition();
            return; // Skip visual update this frame after manual reset
        }

        // --- Update Visuals ---
        this.chassisGroup.position.copy(this.chassisBody.position);
        this.chassisGroup.quaternion.copy(this.chassisBody.quaternion);

        for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
            this.vehicle.updateWheelTransform(i);
            const transform = this.vehicle.wheelInfos[i].worldTransform;
            const wheelMesh = this.wheelMeshes[i];
            if (wheelMesh) {
                wheelMesh.position.copy(transform.position);
                wheelMesh.quaternion.copy(transform.quaternion);
            }
        }
    }

    checkFlipCondition(dt) {
        if (!this.chassisBody) return;

        const localUp = new CANNON.Vec3(0, 1, 0);
        const worldUp = new CANNON.Vec3();
        this.chassisBody.vectorToWorldFrame(localUp, worldUp);
        const worldTrueUp = new CANNON.Vec3(0, 1, 0);
        const dotProduct = worldUp.dot(worldTrueUp);

        if (dotProduct < FLIP_THRESHOLD_DOT) {
            if (!this.isFlipped) {
                this.isFlipped = true;
                this.timeFlipped = 0;
                console.log("Vehicle flipped!");
            }
            this.timeFlipped += dt;

            if (this.timeFlipped >= FLIP_RESET_DELAY) {
                console.log("Vehicle flipped too long, auto-resetting...");
                this.resetPosition(); // Resets isFlipped and timeFlipped internally
            }
        } else {
            if (this.isFlipped) {
                 console.log("Vehicle recovered from flip.");
            }
            this.isFlipped = false;
            this.timeFlipped = 0;
        }
    }

    resetPosition() {
        if (!this.vehicle || !this.chassisBody) return;
        console.log("Resetting vehicle position...");

        // Reset physics state
        this.chassisBody.position.copy(this.startPosCannon);
        this.chassisBody.quaternion.set(0, 0, 0, 1);
        this.chassisBody.velocity.set(0, 0, 0);
        this.chassisBody.angularVelocity.set(0, 0, 0);

        // Reset vehicle controls state
        this.vehicle.applyEngineForce(0, 2); this.vehicle.applyEngineForce(0, 3);
        this.vehicle.setSteeringValue(0, 0); this.vehicle.setSteeringValue(0, 1);
        this.currentSteering = 0;
        for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
            this.vehicle.setBrake(BRAKE_FORCE * 2, i); // Apply brakes momentarily
        }

        // Reset flip state
        this.isFlipped = false;
        this.timeFlipped = 0;

        // Reset distance tracking
        this.totalDistance = 0;
        this.previousPosition.copy(this.startPosThree);

        this.chassisBody.wakeUp();

        // Release brakes after a short delay
        setTimeout(() => {
            if (this.vehicle) { // Check if vehicle still exists
                for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
                    this.vehicle.setBrake(0, i);
                }
                console.log("Brakes released after reset.");
            }
        }, 150);
    }

    getPosition() {
        if (!this.chassisBody) return this.startPosThree.clone();
        return new THREE.Vector3(
            this.chassisBody.position.x, this.chassisBody.position.y, this.chassisBody.position.z
        );
    }

    getCurrentSpeedKmH() {
        if (!this.chassisBody) return 0;
        return Math.round(this.chassisBody.velocity.length() * 3.6);
    }

    getDistanceTraveled(unit = 'meters') {
        switch (unit.toLowerCase()) {
            case 'kilometers': case 'km': return (this.totalDistance / 1000).toFixed(2);
            case 'miles': case 'mi': return (this.totalDistance / 1609.34).toFixed(2);
            case 'meters': case 'm': default: return Math.round(this.totalDistance);
        }
    }

    dispose() {
        console.log("Disposing vehicle...");
        if (this.vehicle) this.vehicle.removeFromWorld(this.physicsWorld);
        if (this.chassisBody) this.physicsWorld.removeBody(this.chassisBody);

        if (this.chassisGroup) {
            this.scene.remove(this.chassisGroup);
            this.chassisGroup.traverse(child => {
                if (child.isMesh) { child.geometry?.dispose(); child.material?.dispose(); }
            });
        }
        this.wheelMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry?.dispose(); mesh.material?.dispose();
        });

        this.wheelMeshes = []; this.vehicle = null; this.chassisBody = null; this.chassisGroup = null;
    }
}

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { lerp } from './utils.js'; // Removed dampingFactor import as it's not used here

// --- Constants --- Tuned for Heightfield
const ENGINE_FORCE_FORWARD = 300;
const ENGINE_FORCE_BACKWARD = 200;
const BRAKE_FORCE = 60;
const MAX_STEER_ANGLE = Math.PI / 6.5;
const STEERING_SPEED = 4.0;
const SUSPENSION_STIFFNESS = 30;
const SUSPENSION_DAMPING = 5;
const SUSPENSION_COMPRESSION = 4;
const SUSPENSION_REST_LENGTH = 0.5;
const SUSPENSION_TRAVEL = 0.4;
const FRICTION_SLIP = 1.8;
const WHEEL_RADIUS = 0.4;
const WHEEL_WIDTH = 0.25;

export class Vehicle {
    constructor(scene, physicsWorld, inputManager, startPos = new THREE.Vector3(0, 5, 0)) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.inputManager = inputManager;
        this.startPosCannon = new CANNON.Vec3(startPos.x, startPos.y, startPos.z);
        this.startPosThree = startPos;

        // Vehicle dimensions (used for physics mostly)
        this.chassisWidth = 1.1;
        this.chassisHeight = 0.5; // Height of the physics box
        this.chassisLength = 2.2;
        this.wheelRadius = WHEEL_RADIUS;
        this.wheelWidth = WHEEL_WIDTH;

        this.vehicle = null;
        this.chassisBody = null;
        // *** CAR VISUAL CHANGE: Use a Group instead of a single Mesh ***
        this.chassisGroup = null;
        this.wheelMeshes = [];
        // this.wheelBodies = []; // Keep commented out unless needed later

        // Steering state
        this.currentSteering = 0; // Actual current steering value applied

        // Distance tracking
        this.totalDistance = 0;
        this.previousPosition = null;

        this.createPhysicsVehicle();
        this.createVisualVehicle(); // Will now create the group
    }

    createPhysicsVehicle() {
        // Physics shape remains a simple box but with better collision detection
        const chassisShape = new CANNON.Box(new CANNON.Vec3(this.chassisLength * 0.5, this.chassisHeight * 0.5, this.chassisWidth * 0.5));
        this.chassisBody = new CANNON.Body({
            mass: 150,  // Reduced from 180
            material: this.physicsWorld.defaultMaterial,
            collisionFilterGroup: 2,
            collisionFilterMask: 1
        });

        this.chassisBody.addShape(chassisShape);
        this.chassisBody.position.copy(this.startPosCannon);
        this.chassisBody.angularVelocity.set(0, 0, 0);
        this.chassisBody.angularDamping = 0.7;
        this.chassisBody.linearDamping = 0.2;

        // Add this to prevent the physics engine from putting the car to sleep
        this.chassisBody.allowSleep = false;

        // Critical for terrain collision
        this.chassisBody.sleepSpeedLimit = -1;

        this.vehicle = new CANNON.RaycastVehicle({
            chassisBody: this.chassisBody,
            indexRightAxis: 2, indexForwardAxis: 0, indexUpAxis: 1,
        });

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
            customSlidingRotationalSpeed: -30,
            axleLocal: new CANNON.Vec3(0, 0, 1),
            chassisConnectionPointLocal: new CANNON.Vec3(),
            useCustomSlidingRotationalSpeed: true,
            isFrontWheel: false,
        };

        const axleWidth = this.chassisWidth * 0.5;
        // Adjust connection height based on the visual model if needed, but physics box height is key
        const connectionHeight = -this.chassisHeight * 0.4;

        // Front Left (0)
        wheelOptions.chassisConnectionPointLocal.set(this.chassisLength * 0.4, connectionHeight, axleWidth);
        wheelOptions.isFrontWheel = true; this.vehicle.addWheel({ ...wheelOptions });
        // Front Right (1)
        wheelOptions.chassisConnectionPointLocal.set(this.chassisLength * 0.4, connectionHeight, -axleWidth);
        wheelOptions.isFrontWheel = true; this.vehicle.addWheel({ ...wheelOptions });
        // Rear Left (2)
        wheelOptions.chassisConnectionPointLocal.set(-this.chassisLength * 0.4, connectionHeight, axleWidth);
        wheelOptions.isFrontWheel = false; this.vehicle.addWheel({ ...wheelOptions });
        // Rear Right (3)
        wheelOptions.chassisConnectionPointLocal.set(-this.chassisLength * 0.4, connectionHeight, -axleWidth);
        wheelOptions.isFrontWheel = false; this.vehicle.addWheel({ ...wheelOptions });

        this.vehicle.addToWorld(this.physicsWorld);
    }

    createVisualVehicle() {
        // *** CAR VISUAL CHANGE: Create a Group and add parts ***
        this.chassisGroup = new THREE.Group();
        this.scene.add(this.chassisGroup);

        // Main Body (adjust dimensions and position as needed)
        const bodyHeight = 0.4; // Visual height, can differ from physics box
        const bodyGeo = new THREE.BoxGeometry(this.chassisLength, bodyHeight, this.chassisWidth);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcc0000, metalness: 0.6, roughness: 0.4 });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.castShadow = true;
        bodyMesh.position.y = bodyHeight / 2; // Position base slightly above origin (0,0,0) of the group
        this.chassisGroup.add(bodyMesh);

        // Cabin (smaller box on top)
        const cabinLength = this.chassisLength * 0.5;
        const cabinWidth = this.chassisWidth * 0.85;
        const cabinHeight = 0.5;
        const cabinGeo = new THREE.BoxGeometry(cabinLength, cabinHeight, cabinWidth);
        const cabinMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.2, roughness: 0.7 });
        const cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
        cabinMesh.castShadow = true;
        // Position cabin on top of the body, slightly forward
        cabinMesh.position.y = bodyHeight + cabinHeight / 2;
        cabinMesh.position.x = -this.chassisLength * 0.1; // Adjust X offset for placement
        this.chassisGroup.add(cabinMesh);

        // Wheel Meshes (No change needed here)
        const wheelGeo = new THREE.CylinderGeometry(this.wheelRadius, this.wheelRadius, this.wheelWidth, 24);
        wheelGeo.rotateX(Math.PI / 2); // Rotate geometry for correct orientation
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.1, roughness: 0.8 });
        for (let i = 0; i < 4; i++) {
            const wheelMesh = new THREE.Mesh(wheelGeo, wheelMat);
            wheelMesh.castShadow = true;
            // Add wheels directly to the scene for independent updating
            // Alternatively, could add to chassisGroup if offset correctly, but direct scene add is easier with RaycastVehicle updates
            this.scene.add(wheelMesh);
            this.wheelMeshes.push(wheelMesh);
        }
    }

    update(dt) {
        if (!this.vehicle || !this.chassisBody || !this.chassisGroup) return; // Check for group

        // --- Track Distance ---
        const currentPosition = this.getPosition();
        if (this.previousPosition) {
            // Only count horizontal distance (x-z plane)
            const horizontalDist = Math.sqrt(
                Math.pow(currentPosition.x - this.previousPosition.x, 2) +
                Math.pow(currentPosition.z - this.previousPosition.z, 2)
            );
            this.totalDistance += horizontalDist;
        }
        this.previousPosition = currentPosition.clone();

        // --- Input Handling ---
        let engineForce = 0; let brakeForce = 0; let targetSteering = 0;
        const forwardPressed = this.inputManager.isPressed('forward');
        const backwardPressed = this.inputManager.isPressed('backward');
        const leftPressed = this.inputManager.isPressed('left');
        const rightPressed = this.inputManager.isPressed('right');

        // Engine and Brake
        if (forwardPressed) { engineForce = ENGINE_FORCE_FORWARD; }
        if (backwardPressed) {
            const currentSpeed = this.chassisBody.velocity.length();
            const worldVelocity = this.chassisBody.velocity;
            const forwardDir = new CANNON.Vec3();
            this.chassisBody.vectorToWorldFrame(new CANNON.Vec3(1, 0, 0), forwardDir);
            const dot = forwardDir.dot(worldVelocity);
            if (dot > 0.5 && currentSpeed > 1.0) { brakeForce = BRAKE_FORCE; engineForce = 0; }
            else { engineForce = -ENGINE_FORCE_BACKWARD; brakeForce = 0; }
        }

        // Steering Target
        if (leftPressed) { targetSteering = MAX_STEER_ANGLE; }
        else if (rightPressed) { targetSteering = -MAX_STEER_ANGLE; }
        else { targetSteering = 0; }

        // --- Smooth Steering ---
        const steerLerpFactor = STEERING_SPEED * dt;
        this.currentSteering = lerp(this.currentSteering, targetSteering, steerLerpFactor);
        this.currentSteering = Math.max(-MAX_STEER_ANGLE, Math.min(MAX_STEER_ANGLE, this.currentSteering));

        if (this.inputManager.isPressed('reset')) { this.resetPosition(); return; }

        // Apply forces/steering
        this.vehicle.applyEngineForce(engineForce, 2); this.vehicle.applyEngineForce(engineForce, 3);
        this.vehicle.setBrake(brakeForce, 0); this.vehicle.setBrake(brakeForce, 1);
        this.vehicle.setBrake(brakeForce, 2); this.vehicle.setBrake(brakeForce, 3);
        this.vehicle.setSteeringValue(this.currentSteering, 0);
        this.vehicle.setSteeringValue(this.currentSteering, 1);

        // --- Update Visuals ---
        // *** CAR VISUAL CHANGE: Update the Group's position/rotation ***
        this.chassisGroup.position.copy(this.chassisBody.position);
        this.chassisGroup.quaternion.copy(this.chassisBody.quaternion);

        // Update wheel visuals (No change needed here)
        for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
            this.vehicle.updateWheelTransform(i);
            const transform = this.vehicle.wheelInfos[i].worldTransform;
            const wheelMesh = this.wheelMeshes[i];
            wheelMesh.position.copy(transform.position);
            wheelMesh.quaternion.copy(transform.quaternion);
        }
    }

    resetPosition() {
        if (!this.vehicle || !this.chassisBody) return;
        console.log("Resetting vehicle position");
        this.chassisBody.position.copy(this.startPosCannon);
        this.chassisBody.quaternion.set(0, 0, 0, 1);
        this.chassisBody.velocity.set(0, 0, 0);
        this.chassisBody.angularVelocity.set(0, 0, 0);
        this.vehicle.applyEngineForce(0, 2); this.vehicle.applyEngineForce(0, 3);
        this.vehicle.setBrake(BRAKE_FORCE * 2, 0); // Apply brake briefly
        this.vehicle.setBrake(BRAKE_FORCE * 2, 1);
        this.vehicle.setBrake(BRAKE_FORCE * 2, 2);
        this.vehicle.setBrake(BRAKE_FORCE * 2, 3);
        this.vehicle.setSteeringValue(0, 0); this.vehicle.setSteeringValue(0, 1);
        this.currentSteering = 0;
        this.chassisBody.wakeUp();

        // Reset distance tracking
        this.totalDistance = 0;
        this.previousPosition = null;

        setTimeout(() => {
            if (this.vehicle) {
                this.vehicle.setBrake(0, 0); this.vehicle.setBrake(0, 1);
                this.vehicle.setBrake(0, 2); this.vehicle.setBrake(0, 3);
            }
        }, 100);
    }

    getPosition() {
        if (!this.chassisBody) { return this.startPosThree || new THREE.Vector3(0,0,0); }
        return new THREE.Vector3(
            this.chassisBody.position.x, this.chassisBody.position.y, this.chassisBody.position.z
        );
    }

    getCurrentSpeedKmH() {
        if (!this.chassisBody) return 0;
        const speedMs = this.chassisBody.velocity.length();
        return Math.round(speedMs * 3.6);
    }

    getDistanceTraveled(unit = 'meters') {
        switch (unit) {
            case 'kilometers':
                return (this.totalDistance / 1000).toFixed(2);
            case 'miles':
                return (this.totalDistance / 1609.34).toFixed(2);
            case 'meters':
            default:
                return Math.round(this.totalDistance);
        }
    }
}

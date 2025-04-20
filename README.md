# Simple 3D Car Driving Game (Three.js + Cannon-es)

## Table of Contents
- [Features](#features)
- [Upcoming Features](#upcoming-features)
- [TO-FIX](#to-fix)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Project](#running-the-project)
- [Controls](#controls)
- [Technologies Used](#technologies-used)
- [Potential Future Improvements](#potential-future-improvements)
- [License](#license)

This project is a basic 3D car driving simulation built using modern web technologies. It features a car controlled by the player driving on procedurally generated terrain. The project utilizes Three.js for rendering and Cannon-es for physics simulation.

---
## Demo GIF

Wait for the GIF to load:

![car](https://github.com/user-attachments/assets/8448e6ec-290a-4b74-8059-ee9f7bfb453e)


## Features

*   **Vehicle Control:** Drive a car with acceleration, braking/reverse, and steering.
*   **Physics Simulation:** Uses Cannon-es for realistic(ish) vehicle dynamics, including suspension via RaycastVehicle, chassis collision, and gravity.
*   **Procedural Terrain:** Infinite-feeling terrain generated using Simplex noise, with basic coloring based on height.
*   **Trimesh Terrain Physics:** Uses a `CANNON.Trimesh` for more stable terrain collision compared to `Heightfield`.
*   **Compound Chassis Shape:** Vehicle physics uses a compound shape (box + skid plate) for improved stability when the chassis contacts the ground.
*   **Third-Person Camera:** Smoothly follows the car from behind.
*   **Simple UI:** Displays current speed (km/h) and distance traveled (m/km).
*   **Reset Functionality:**
    *   Manual reset using the 'R' key.
    *   Automatic reset if the car stays flipped over for a few seconds.
*   **Physics Debugger:** Optional wireframe view of physics bodies (toggleable in `js/main.js`).
*   **Modern JavaScript:** Uses ES Modules and is set up with Vite for development.

## Upcoming Features
- [ ] **Multiplayer with Friends**: Race against friends in a shared environment  
- [ ] **More Vehicles**: Add different vehicle types with unique handling characteristics  
- [ ] **Track Editor**: Create and share custom racing tracks  
- [ ] **Weather Effects**: Dynamic weather system affecting vehicle handling  

## TO-FIX
- **Ground Penetration**: Fix issue where car sinks into the ground at high speeds  
- **Collision Detection**: Improve vehicle-terrain collision response  
- **Performance Optimization**: Reduce frame drops during complex physics calculations  
- **Camera Transitions**: Smoother camera movement during sharp turns  

## Prerequisites

Before you begin, ensure you have the following installed on your system:

*   [Node.js](https://nodejs.org/) (LTS version recommended, e.g., v18 or v20+)
*   [npm](https://www.npmjs.com/) (comes with Node.js) or [yarn](https://yarnpkg.com/)

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/AyushDhimann/Ghummi-Ghummi
    ```
    
2.  **Navigate to the project directory:**
    ```bash
    cd Ghummi-Ghummi
    ```

3.  **Install dependencies:**
    Using npm:
    ```bash
    npm install
    ```

## Running the Project

1.  **Start the development server:**
    ```bash
    npm run dev
    ```

2.  **Open your browser:**
    Vite will typically output a local URL in the terminal (usually `http://localhost:5173` or the next available port). Open this URL in your web browser.

*   **Note:** The physics debugger view can be enabled/disabled by changing the `USE_PHYSICS_DEBUGGER` constant in `js/main.js`.

## Controls

*   **W / Arrow Up:** Accelerate Forward
*   **S / Arrow Down:** Brake / Accelerate Backward (Reverse)
*   **A / Arrow Left:** Steer Left
*   **D / Arrow Right:** Steer Right
*   **R:** Reset Car Position (Manual)

*(The car will also automatically reset if it remains flipped upside down for a short period.)*

## Technologies Used

*   **Graphics:** [Three.js](https://threejs.org/) (r161+)
*   **Physics:** [Cannon-es](https://github.com/pmndrs/cannon-es) (A maintained fork of Cannon.js)
*   **Physics Debugger:** [cannon-es-debugger](https://github.com/pmndrs/cannon-es/tree/master/packages/cannon-es-debugger)
*   **Terrain Generation:** [simplex-noise](https://github.com/jwagner/simplex-noise.js)
*   **Build Tool / Dev Server:** [Vite](https://vitejs.dev/)

## Potential Future Improvements

*   Add environmental assets (trees, rocks, etc.) with physics interactions.
*   Implement sound effects (engine, collision, braking).
*   Use a more detailed 3D model for the car (e.g., loaded GLTF).
*   Add textures to the car and terrain.
*   Implement objectives or a scoring system.
*   Improve UI/UX (e.g., minimap, better styling).
*   Add different vehicle types with varying physics properties.
*   Optimize terrain generation/rendering for larger worlds (chunking).

## License

This project is under the [GPL-3.0 LICENSE](https://github.com/AyushDhimann/Ghummi-Ghummi?tab=GPL-3.0-1-ov-file)

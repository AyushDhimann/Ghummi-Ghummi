// js/InputManager.js

export class InputManager {
    constructor() {
        this.keys = {};
        this.keyMap = {
            // Arrow Keys
            ArrowUp: 'forward',
            ArrowDown: 'backward',
            ArrowLeft: 'left',
            ArrowRight: 'right',
            // WASD Keys
            KeyW: 'forward',
            KeyS: 'backward',
            KeyA: 'left',
            KeyD: 'right',
            // Reset
            KeyR: 'reset'
        };

        // Using arrow functions to maintain 'this' context
        this._handleKeyDown = this._handleKeyDown.bind(this);
        this._handleKeyUp = this._handleKeyUp.bind(this);

        window.addEventListener('keydown', this._handleKeyDown);
        window.addEventListener('keyup', this._handleKeyUp);

        console.log("InputManager initialized.");
    }

    _handleKeyDown(event) {
        this.onKeyChange(event, true);
    }

    _handleKeyUp(event) {
        this.onKeyChange(event, false);
    }

    onKeyChange(event, isPressed) {
        const keyAction = this.keyMap[event.code];
        // console.log(`InputManager: Key=${event.code}, Action=${keyAction}, Pressed=${isPressed}`); // Keep for debugging if needed
        if (keyAction) {
            this.keys[keyAction] = isPressed;
            // Prevent default browser actions (like scrolling with arrow keys)
            // Only prevent if the key is mapped to an action
            event.preventDefault();
        }
    }

    isPressed(action) {
        return this.keys[action] || false;
    }

    // Optional: Add a dispose method to clean up listeners if the game were to be destroyed
    dispose() {
        window.removeEventListener('keydown', this._handleKeyDown);
        window.removeEventListener('keyup', this._handleKeyUp);
        this.keys = {}; // Clear keys
        console.log("InputManager disposed.");
    }
}

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

        window.addEventListener('keydown', (e) => this.onKeyChange(e, true));
        window.addEventListener('keyup', (e) => this.onKeyChange(e, false));
    }

    onKeyChange(event, isPressed) {
        const keyAction = this.keyMap[event.code];
        // *** ADD LOG ***
        console.log(`InputManager: Key=${event.code}, Action=${keyAction}, Pressed=${isPressed}`);
        if (keyAction) {
            this.keys[keyAction] = isPressed;
            event.preventDefault(); // Prevent default browser actions (scrolling)
        }
    }

    isPressed(action) {
        return this.keys[action] || false;
    }
}

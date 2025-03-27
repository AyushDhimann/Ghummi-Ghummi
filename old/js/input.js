export class InputHandler {
    constructor() {
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
        };
        this._addEventListeners();
    }

    _handleKeyDown = (event) => {
        switch (event.key.toLowerCase()) {
            case 'w': case 'arrowup': this.keys.forward = true; break;
            case 's': case 'arrowdown': this.keys.backward = true; break;
            case 'a': case 'arrowleft': this.keys.left = true; break;
            case 'd': case 'arrowright': this.keys.right = true; break;
        }
    };

    _handleKeyUp = (event) => {
         switch (event.key.toLowerCase()) {
            case 'w': case 'arrowup': this.keys.forward = false; break;
            case 's': case 'arrowdown': this.keys.backward = false; break;
            case 'a': case 'arrowleft': this.keys.left = false; break;
            case 'd': case 'arrowright': this.keys.right = false; break;
        }
    };

    _addEventListeners() {
        window.addEventListener('keydown', this._handleKeyDown);
        window.addEventListener('keyup', this._handleKeyUp);
    }

    dispose() {
        // Important to remove listeners when game stops/restarts
        window.removeEventListener('keydown', this._handleKeyDown);
        window.removeEventListener('keyup', this._handleKeyUp);
    }
}

import { Game } from './game.js';
import { UIManager } from './ui.js';

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const uiManager = new UIManager();
    const game = new Game('game-container', uiManager);

    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');

    // Initialize the game setup (creates scene, renderer etc.)
    game.init();

    // Show the initial menu
    uiManager.showStartMenu();

    // --- Event Listeners for Buttons ---
    startButton.addEventListener('click', () => {
        game.startGame();
    });

    restartButton.addEventListener('click', () => {
        // Cleanup might be too aggressive if just restarting
        // game.cleanup(); // Optional: Full cleanup if needed
        // game.init();    // Re-initialize if cleaned up
        game.startGame(); // Reset and start the loop
    });

    // Optional: Handle browser tab visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Potential pause logic if needed when tab is hidden
            // console.log("Tab hidden - pausing?");
            // if (game.gameState === 'playing') game.pause(); // Need pause implementation
        } else {
            // Potential resume logic
            // console.log("Tab visible - resuming?");
            // if (game.gameState === 'paused') game.resume(); // Need resume implementation
        }
    });

     // Initial setup complete, game is ready in 'menu' state.
     console.log("Application ready. Waiting for user to start.");

});

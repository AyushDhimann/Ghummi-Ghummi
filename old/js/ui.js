import { HIGH_SCORE_KEY } from './constants.js';

export class UIManager {
    constructor() {
        this.scoreElement = document.getElementById('score');
        this.finalScoreElement = document.getElementById('final-score');
        this.highscoreElement = document.getElementById('highscore');
        this.menuHighscoreElement = document.getElementById('menu-highscore-value');

        this.scoreDisplay = document.getElementById('score-display');
        this.highscoreDisplay = document.getElementById('highscore-display');
        this.startMenu = document.getElementById('start-menu');
        this.gameOverMenu = document.getElementById('game-over-menu');

        this.highScore = this.loadHighScore();
        this.updateHighScoreDisplay();
    }

    showStartMenu() {
        this.startMenu.classList.remove('hidden');
        this.gameOverMenu.classList.add('hidden');
        this.scoreDisplay.classList.add('hidden');
        this.highscoreDisplay.classList.add('hidden');
        this.updateHighScoreDisplay(); // Ensure menu shows latest high score
    }

    showGameUI() {
        this.startMenu.classList.add('hidden');
        this.gameOverMenu.classList.add('hidden');
        this.scoreDisplay.classList.remove('hidden');
        this.highscoreDisplay.classList.remove('hidden');
    }

    showGameOverMenu(score) {
        this.finalScoreElement.textContent = Math.floor(score);
        this.highScore = this.saveHighScore(score); // Save and update high score
        this.updateHighScoreDisplay();

        this.startMenu.classList.add('hidden');
        this.gameOverMenu.classList.remove('hidden');
        this.scoreDisplay.classList.add('hidden');
        this.highscoreDisplay.classList.add('hidden');
    }

    updateScore(score) {
        this.scoreElement.textContent = Math.floor(score);
    }

    updateHighScoreDisplay() {
        const scoreToShow = Math.floor(this.highScore);
        this.highscoreElement.textContent = scoreToShow;
        this.menuHighscoreElement.textContent = scoreToShow;
    }

    loadHighScore() {
        try {
            const storedScore = localStorage.getItem(HIGH_SCORE_KEY);
            return storedScore ? parseInt(storedScore, 10) : 0;
        } catch (e) {
            console.error("Could not load high score from localStorage:", e);
            return 0;
        }
    }

    saveHighScore(currentScore) {
        try {
            const newHighScore = Math.max(this.highScore, Math.floor(currentScore));
            if (newHighScore > this.highScore) {
                localStorage.setItem(HIGH_SCORE_KEY, newHighScore);
                this.highScore = newHighScore; // Update internal value
            }
            return newHighScore; // Return the potentially updated high score
        } catch (e) {
            console.error("Could not save high score to localStorage:", e);
            return this.highScore; // Return existing high score on error
        }
    }

    reset() {
        this.updateScore(0);
        this.highScore = this.loadHighScore(); // Reload in case it changed elsewhere
        this.updateHighScoreDisplay();
    }
}

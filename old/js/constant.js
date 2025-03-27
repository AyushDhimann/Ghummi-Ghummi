// Player Constants
export const PLAYER_SPEED = 30.0; // Units per second
export const PLAYER_TURN_SPEED = 1.5; // Radians per second
export const PLAYER_HEIGHT = 0.5; // Half height for positioning on ground

// Camera Constants
export const CAMERA_DISTANCE = 12;
export const CAMERA_HEIGHT = 6;
export const CAMERA_LAG = 0.1; // Smoothing factor (0-1, lower is smoother/slower)

// Road Constants
export const ROAD_WIDTH = 8;
export const ROAD_SEGMENT_LENGTH = 10;
export const ROAD_COLOR = 0x444444; // Dark grey
export const GROUND_COLOR = 0x335533; // Dark green
export const VISIBLE_SEGMENTS = 20; // Number of segments ahead/behind to keep

// Game Constants
export const FALL_LIMIT_Y = -10; // Y position below which game over triggers
export const HIGH_SCORE_KEY = 'basicRoadsHighScore';

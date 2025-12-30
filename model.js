/*
  model.js
  Contains the game state and configuration (Model in MVC).
  Heavily commented for readability and maintenance.
  Generated/modified: 2025-12-30T01:02:23.273Z
*/

(function(){
    // Model constructor - stores all mutable game state and configuration
    function Model(){
        // Canvas and rendering context used by the view
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        // Fallback DOM audio element (used only if WebAudio decoding fails)
        this.bgMusic = document.getElementById('bgMusic');

        // Initialize canvas size to viewport
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Gameplay state variables
        this.score = 0;              // current score
        this.health = 100;          // player integrity (0-100)
        this.gameActive = false;    // whether the main loop is running
        this.files = [];            // active falling file objects
        this.keys = {};             // pressed keys map
        this.highScore = localStorage.getItem('fileSaverScore') || 0; // persisted high score

        // File type palette - each type has an icon (FontAwesome) and a color
        // Keep icons as the Unicode Private Use values for the FontAwesome glyphs
        this.fileTypes = [
            { type: 'image', icon: '\uf1c5', color: '#ff0055' },
            { type: 'code',  icon: '\uf1c9', color: '#00ffcc' },
            { type: 'audio', icon: '\uf1c7', color: '#7a00ff' },
            { type: 'pdf',   icon: '\uf1c1', color: '#ffcc00' }
        ];

        // Selected color index used by Q/E cycling
        this.selectedColorIndex = 0;

        // Player/folder state. Position, movement, current requested type, and color.
        this.player = {
            x: this.canvas.width / 2 - 50,   // left position
            y: this.canvas.height - 120,     // top position of folder glyph
            width: 100,
            speed: 15,                        // keyboard movement speed
            targetType: this.fileTypes[0],    // requested file type (informational)
            selectedColor: this.fileTypes[0].color, // player-chosen catch color
            // hitbox padding expands the collision rectangle so catches are easier
            hitboxPaddingX: 30,
            hitboxPaddingY: 20
        };

        // Timer handle used by the spawn loop
        this.spawnTimer = null;

        // Apply a default difficulty preset so other code can rely on these fields
        this.applyDifficulty('medium');
    }

    /*
      applyDifficulty(name)
      - Sets gameplay parameters (reward/penalty, spawn rates, base speeds) based
        on the chosen difficulty preset. Centralizes balancing constants here.
    */
    Model.prototype.applyDifficulty = function(name){
        var presets = {
            easy:   { catchReward: 12, wrongPenalty: 10, missPenalty: 8,  spawnBase: 1200, minSpawn: 500, spawnReduction: 10, speedMultiplier: 0.9, speedBase: 4 },
            medium: { catchReward: 8,  wrongPenalty: 20, missPenalty: 15, spawnBase: 1000, minSpawn: 350, spawnReduction: 15, speedMultiplier: 1.0, speedBase: 4 },
            hard:   { catchReward: 5,  wrongPenalty: 30, missPenalty: 22, spawnBase: 800,  minSpawn: 300, spawnReduction: 18, speedMultiplier: 1.2, speedBase: 4 },
            crazy:  { catchReward: 3,  wrongPenalty: 40, missPenalty: 30, spawnBase: 650,  minSpawn: 250, spawnReduction: 20, speedMultiplier: 1.5, speedBase: 4 }
        };
        var p = presets[name] || presets.medium;

        // Persist the chosen difficulty and expose the fields used by the controller
        this.difficulty = name || 'medium';
        this.catchReward = p.catchReward;     // health gained on correct catch
        this.wrongPenalty = p.wrongPenalty;   // health lost on wrong catch
        this.missPenalty = p.missPenalty;     // health lost when a file is missed
        this.spawnBase = p.spawnBase;         // spawn interval baseline (ms)
        this.minSpawn = p.minSpawn;           // minimum spawn interval (ms)
        this.spawnReduction = p.spawnReduction; // how much spawn interval reduces per score
        this.speedMultiplier = p.speedMultiplier; // global speed multiplier for files
        this.speedBase = p.speedBase;         // base falling speed
    };

    // getFolderColor: single point of truth for the folder color used by the view/controller
    Model.prototype.getFolderColor = function(){
        return this.player.selectedColor;
    };

    // Export the model as a global so view/controller can access the same instance
    window.Model = Model;
    window.model = new Model();
})();
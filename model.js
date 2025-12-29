(function(){
    function Model(){
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.bgMusic = document.getElementById('bgMusic');

        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.score = 0;
        this.health = 100;
        this.gameActive = false;
        this.files = [];
        this.keys = {};
        this.highScore = localStorage.getItem('fileSaverScore') || 0;

        this.fileTypes = [
            { type: 'image', icon: '\uf1c5', color: '#ff0055' },
            { type: 'code', icon: '\uf1c9', color: '#00ffcc' },
            { type: 'audio', icon: '\uf1c7', color: '#7a00ff' },
            { type: 'pdf', icon: '\uf1c1', color: '#ffcc00' }
        ];

        this.selectedColorIndex = 0;

        this.player = {
            x: this.canvas.width / 2 - 50,
            y: this.canvas.height - 120,
            width: 100,
            speed: 15,
            targetType: this.fileTypes[0],
            selectedColor: this.fileTypes[0].color,
            hitboxPaddingX: 30,
            hitboxPaddingY: 20
        };

        this.folderColorOverride = null;
        this.spawnTimer = null;

        // default difficulty
        this.applyDifficulty('medium');
    }

    Model.prototype.applyDifficulty = function(name){
        var presets = {
            easy: { catchReward: 12, wrongPenalty: 10, missPenalty: 8, spawnBase: 1200, minSpawn: 500, spawnReduction: 10, speedMultiplier: 0.9, speedBase: 4 },
            medium: { catchReward: 8, wrongPenalty: 20, missPenalty: 15, spawnBase: 1000, minSpawn: 350, spawnReduction: 15, speedMultiplier: 1.0, speedBase: 4 },
            hard: { catchReward: 5, wrongPenalty: 30, missPenalty: 22, spawnBase: 800, minSpawn: 300, spawnReduction: 18, speedMultiplier: 1.2, speedBase: 4 },
            crazy: { catchReward: 3, wrongPenalty: 40, missPenalty: 30, spawnBase: 650, minSpawn: 250, spawnReduction: 20, speedMultiplier: 1.5, speedBase: 4 }
        };
        var p = presets[name] || presets.medium;
        this.difficulty = name || 'medium';
        this.catchReward = p.catchReward;
        this.wrongPenalty = p.wrongPenalty;
        this.missPenalty = p.missPenalty;
        this.spawnBase = p.spawnBase;
        this.minSpawn = p.minSpawn;
        this.spawnReduction = p.spawnReduction;
        this.speedMultiplier = p.speedMultiplier;
        this.speedBase = p.speedBase;
    };

    Model.prototype.getFolderColor = function(){
        return this.player.selectedColor;
    };

    window.Model = Model;
    window.model = new Model();
})();
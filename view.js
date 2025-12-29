(function(){
    function View(model){
        this.model = model;
        this.ctx = model.ctx;
        this.canvas = model.canvas;
        this.scoreEl = document.getElementById('score');
        this.healthEl = document.getElementById('health');
        this.highScoreEl = document.getElementById('high-score');
        this.gameOverEl = document.getElementById('game-over');
        this.finalScoreEl = document.getElementById('final-score');
        this.folderColorInput = document.getElementById('folderColor');

        this.highScoreEl.innerText = model.highScore;
    }

    View.prototype.clear = function(){
        this.ctx.fillStyle = 'rgba(13, 13, 26, 0.4)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    };

    View.prototype.drawFiles = function(){
        var ctx = this.ctx;
        function hexToRGBA(hex, a){
            if (!hex) return 'rgba(255,255,255,'+a+')';
            if (hex[0] === '#') hex = hex.slice(1);
            var r = parseInt(hex.slice(0,2),16);
            var g = parseInt(hex.slice(2,4),16);
            var b = parseInt(hex.slice(4,6),16);
            return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
        }
        this.model.files.forEach(function(file){
            ctx.font = '900 40px "Font Awesome 6 Free"';
            // draw trail from oldest to newest
            if (file.trail && file.trail.length){
                for (var i = 0; i < file.trail.length; i++){
                    var t = file.trail[i];
                    var alpha = (i+1) / file.trail.length * 0.35; // subtle
                    ctx.fillStyle = hexToRGBA(file.config.color, alpha);
                    ctx.fillText(file.config.icon, t.x, t.y);
                }
            }
            // main icon
            ctx.fillStyle = file.config.color;
            ctx.fillText(file.config.icon, file.x, file.y);
        });
    };

    View.prototype.drawPlayer = function(){
        var ctx = this.ctx;
        ctx.fillStyle = this.model.getFolderColor();
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.model.getFolderColor();
        ctx.font = '900 80px "Font Awesome 6 Free"';
        ctx.fillText('\uf07b', this.model.player.x, this.model.player.y + 60);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Courier New';
        ctx.fillText('REQ: ' + this.model.player.targetType.type.toUpperCase(), this.model.player.x + 5, this.model.player.y + 90);
    };

    View.prototype.updateUI = function(){
        this.scoreEl.innerText = this.model.score;
        this.healthEl.innerText = Math.max(0, this.model.health);
    };

    View.prototype.showGameOver = function(){
        this.gameOverEl.style.display = 'block';
        this.finalScoreEl.innerText = this.model.score;
    };

    View.prototype.screenShake = function(){
        this.canvas.style.left = '5px';
        setTimeout(() => this.canvas.style.left = '-5px', 40);
        setTimeout(() => this.canvas.style.left = '0', 80);
    };

    View.prototype.showStartText = function(){
        this.ctx.fillStyle = '#00ffcc';
        this.ctx.font = '24px Courier New';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('SYSTEM STANDBY: CLICK TO BOOT', this.canvas.width/2, this.canvas.height/2);
    };

    window.View = View;
    window.View = View;
    window.view = new View(window.model);
})();
/*
  view.js
  Responsible for rendering all visuals to the canvas and updating DOM UI elements.
  Heavily commented to explain drawing logic and helpers.
  Generated/modified: 2025-12-30T01:02:23.273Z
*/

(function(){
    // View constructor - holds references to DOM elements and the shared model
    function View(model){
        this.model = model;
        this.ctx = model.ctx;            // 2D rendering context
        this.canvas = model.canvas;      // canvas element

        // DOM UI elements updated by the view
        this.scoreEl = document.getElementById('score');
        this.healthEl = document.getElementById('health');
        this.highScoreEl = document.getElementById('high-score');
        this.gameOverEl = document.getElementById('game-over');
        this.finalScoreEl = document.getElementById('final-score');
        this.folderColorInput = document.getElementById('folderColor');

        // Initialize displayed high score
        this.highScoreEl.innerText = model.highScore;
    }

    // clear: paints a semi-transparent background to produce motion trails
    View.prototype.clear = function(){
        this.ctx.fillStyle = 'rgba(13, 13, 26, 0.4)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    };

    // drawFiles: draws each falling file and its subtle trail
    View.prototype.drawFiles = function(){
        var ctx = this.ctx;

        // helper: convert hex like '#00ffcc' to an rgba string with alpha
        function hexToRGBA(hex, a){
            if (!hex) return 'rgba(255,255,255,'+a+')';
            if (hex[0] === '#') hex = hex.slice(1);
            var r = parseInt(hex.slice(0,2),16);
            var g = parseInt(hex.slice(2,4),16);
            var b = parseInt(hex.slice(4,6),16);
            return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
        }

        // iterate files and draw trails then the main icon
        this.model.files.forEach(function(file){
            // set font for FontAwesome icons (main glyphs)
            ctx.font = '900 40px "Font Awesome 6 Free"';

            // draw faint trail from oldest to newest for a subtle motion effect
            if (file.trail && file.trail.length){
                for (var i = 0; i < file.trail.length; i++){
                    var t = file.trail[i];
                    // alpha increases along the trail so the head is most visible
                    var alpha = (i+1) / file.trail.length * 0.35; // subtle max alpha
                    ctx.fillStyle = hexToRGBA(file.config.color, alpha);
                    ctx.fillText(file.config.icon, t.x, t.y);
                }
            }

            // draw the main icon for the falling file
            ctx.fillStyle = file.config.color;
            ctx.fillText(file.config.icon, file.x, file.y);
        });
    };

    /*
      drawPlayer: renders the folder glyph and the textual 'REQ:' label.
      - The folder color comes from the model.getFolderColor() which reflects the
        player's selected catch color (Q/E cycling or color input).
    */
    View.prototype.drawPlayer = function(){
        var ctx = this.ctx;
        ctx.fillStyle = this.model.getFolderColor();
        // keep a soft halo to make the folder stand out from the background
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.model.getFolderColor();
        ctx.font = '900 80px "Font Awesome 6 Free"';
        // FontAwesome folder glyph (private use code) — draw at player position
        ctx.fillText('\uf07b', this.model.player.x, this.model.player.y + 60);
        ctx.shadowBlur = 0;

        // Draw a small textual label under the folder indicating the requested type
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Courier New';
        ctx.fillText('REQ: ' + this.model.player.targetType.type.toUpperCase(), this.model.player.x + 5, this.model.player.y + 90);
    };

    // updateUI: copy model values into DOM
    View.prototype.updateUI = function(){
        this.scoreEl.innerText = this.model.score;
        this.healthEl.innerText = Math.max(0, this.model.health);
    };

    // showGameOver: reveal the game over overlay and final score
    View.prototype.showGameOver = function(){
        this.gameOverEl.style.display = 'block';
        this.finalScoreEl.innerText = this.model.score;
    };

    // screenShake: quick visual feedback when damage occurs
    View.prototype.screenShake = function(){
        this.canvas.style.left = '5px';
        setTimeout(() => this.canvas.style.left = '-5px', 40);
        setTimeout(() => this.canvas.style.left = '0', 80);
    };

    // showStartText: used to display an initial hint on the canvas prior to starting
    View.prototype.showStartText = function(){
        this.ctx.fillStyle = '#00ffcc';
        this.ctx.font = '24px Courier New';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('SYSTEM STANDBY: CLICK TO BOOT', this.canvas.width/2, this.canvas.height/2);
    };

    // expose View globally and instantiate the shared view object
    window.View = View;
    window.view = new View(window.model);
})();
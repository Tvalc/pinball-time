class PinballGame {
    constructor(container) {

        this.width = 400;
        this.height = 700;
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.state = 'menu'; // 'menu', 'playing', 'gameover'
        this.score = 0;
        this.lives = 3;

        this.ballRadius = 11;
        this.ball = {
            x: this.width / 2,
            y: this.height - 110,
            vx: 0,
            vy: 0,
            stuck: true // stuck to plunger/launcher until launched
        };

        this.flipperLength = 90; // slightly longer for wider arc
        this.flipperWidth = 22;  // slightly thicker for visual clarity



        this.flipperRestAngleLeft = Math.PI / 6;            // 30deg (down-right at rest)
        this.flipperActiveAngleLeft = -Math.PI / 4;         // -45deg (up-right when pressed)
        this.flipperRestAngleRight = Math.PI - Math.PI / 6; // 150deg (down-left at rest)
        this.flipperActiveAngleRight = Math.PI + Math.PI / 4; // 225deg (up-left when pressed)

        this.flipperSpeed = 0.22;

        this.leftFlipper = {
            x: 110,
            y: this.height - 90,
            angle: this.flipperRestAngleLeft,
            pressed: false
        };
        this.rightFlipper = {
            x: this.width - 110,
            y: this.height - 90,
            angle: this.flipperRestAngleRight,
            pressed: false
        };

        this.bumpers = [
            { x: this.width / 2, y: 200, r: 27, score: 150 },
            { x: 130, y: 300, r: 22, score: 100 },
            { x: this.width - 130, y: 300, r: 22, score: 100 },
            { x: 200, y: 400, r: 18, score: 50 },
        ];

        this.wallPadding = 20;
        this.leftWall = [
            {x: this.wallPadding, y: this.height - 80},
            {x: 60, y: 500},
            {x: 60, y: 100},
            {x: this.width/2-40, y: 40},
            {x: this.width/2, y: 20}
        ];
        this.rightWall = this.leftWall.map(p => ({
            x: this.width - p.x,
            y: p.y
        }));

        this.keys = {};
        this.bindInput();

        this.render();
    }

    bindInput() {
        window.addEventListener('keydown', (e) => {
            if (this.state === 'menu' && (e.key === ' ' || e.key === 'Enter')) {
                this.startGame();
            }
            if (this.state !== 'playing') return;
            if (e.key === 'ArrowLeft' || e.key === 'a') this.leftFlipper.pressed = true;
            if (e.key === 'ArrowRight' || e.key === 'd') this.rightFlipper.pressed = true;
            if ((e.key === ' ' || e.key === 'ArrowDown') && this.ball.stuck) {
                this.launchBall();
            }
        });
        window.addEventListener('keyup', (e) => {
            if (this.state !== 'playing') return;
            if (e.key === 'ArrowLeft' || e.key === 'a') this.leftFlipper.pressed = false;
            if (e.key === 'ArrowRight' || e.key === 'd') this.rightFlipper.pressed = false;
        });
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.state === 'menu') {
                this.startGame();
            }
            if (this.state !== 'playing') return;
            const rect = this.canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            if (mx < this.width/2) this.leftFlipper.pressed = true;
            else this.rightFlipper.pressed = true;
            if (this.ball.stuck) this.launchBall();
        });
        this.canvas.addEventListener('mouseup', (e) => {
            this.leftFlipper.pressed = false;
            this.rightFlipper.pressed = false;
        });
    }

    startGame() {
        this.score = 0;
        this.lives = 3;
        this.state = 'playing';
        this.resetBall();
    }

    resetBall() {
        this.ball.x = this.width - 50;
        this.ball.y = this.height - 110;
        this.ball.vx = 0;
        this.ball.vy = 0;
        this.ball.stuck = true;
    }

    launchBall() {
        if (!this.ball.stuck) return;
        this.ball.stuck = false;

        this.ball.vx = -2.5 + Math.random()*5;
        this.ball.vy = -10 - Math.random()*2;
    }

    render() {

        this.update();
        this.draw();

        requestAnimationFrame(() => this.render());
    }

    update() {
        if (this.state !== 'playing') return;

        this.updateFlipper(this.leftFlipper, 'left');
        this.updateFlipper(this.rightFlipper, 'right');

        if (!this.ball.stuck) {
            this.ball.vy += 0.22; // gravity
            this.ball.x += this.ball.vx;
            this.ball.y += this.ball.vy;

            this.ball.vx *= 0.995;
            this.ball.vy *= 0.995;

            this.handleWallCollisions();

            this.handleFlipperCollision(this.leftFlipper, 'left');
            this.handleFlipperCollision(this.rightFlipper, 'right');

            this.handleBumperCollisions();

            if (this.ball.y > this.height + 30) {
                this.lives--;
                if (this.lives > 0) {
                    this.resetBall();
                } else {
                    this.state = 'gameover';
                }
            }
        } else {

            this.ball.x = this.width - 50;
            this.ball.y = this.height - 110;
        }
    }

    updateFlipper(flipper, side) {
        let restAngle, activeAngle;
        if (side === 'left') {
            restAngle = this.flipperRestAngleLeft;
            activeAngle = this.flipperActiveAngleLeft;
        } else {
            restAngle = this.flipperRestAngleRight;
            activeAngle = this.flipperActiveAngleRight;
        }
        let target = flipper.pressed ? activeAngle : restAngle;
        if (Math.abs(flipper.angle - target) > 0.01) {
            flipper.angle += (target - flipper.angle) * this.flipperSpeed;
        }
    }

    handleWallCollisions() {

        if (this.ball.x - this.ballRadius < this.wallPadding) {
            this.ball.x = this.wallPadding + this.ballRadius;
            this.ball.vx = -this.ball.vx * 0.92;
        }
        if (this.ball.x + this.ballRadius > this.width - this.wallPadding) {
            this.ball.x = this.width - this.wallPadding - this.ballRadius;
            this.ball.vx = -this.ball.vx * 0.92;
        }

        if (this.ball.y - this.ballRadius < this.wallPadding) {
            this.ball.y = this.wallPadding + this.ballRadius;
            this.ball.vy = -this.ball.vy * 0.92;
        }

        this.handlePolygonalWall(this.leftWall, 1);
        this.handlePolygonalWall(this.rightWall, -1);
    }

    handlePolygonalWall(points, side) {
        for (let i=0; i<points.length-1; i++) {
            let p1 = points[i], p2 = points[i+1];

            let cx = this.ball.x, cy = this.ball.y;
            let dx = p2.x - p1.x;
            let dy = p2.y - p1.y;
            let len2 = dx*dx + dy*dy;
            let t = ((cx-p1.x)*dx + (cy-p1.y)*dy) / len2;
            t = Math.max(0, Math.min(1, t));
            let px = p1.x + t*dx;
            let py = p1.y + t*dy;
            let dist = Math.hypot(cx-px, cy-py);
            if (dist < this.ballRadius+2) {

                let nx = (cx-px)/dist, ny = (cy-py)/dist;
                let dot = this.ball.vx*nx + this.ball.vy*ny;
                this.ball.vx -= 2*dot*nx;
                this.ball.vy -= 2*dot*ny;
                this.ball.vx *= 0.95;
                this.ball.vy *= 0.95;

                this.ball.x = px + nx*(this.ballRadius+2);
                this.ball.y = py + ny*(this.ballRadius+2);
            }
        }
    }

    handleFlipperCollision(flipper, side) {
        let fx = flipper.x;
        let fy = flipper.y;
        let angle = flipper.angle;
        let x1 = fx - Math.cos(angle) * this.flipperLength/2;
        let y1 = fy - Math.sin(angle) * this.flipperLength/2;
        let x2 = fx + Math.cos(angle) * this.flipperLength/2;
        let y2 = fy + Math.sin(angle) * this.flipperLength/2;

        let cx = this.ball.x, cy = this.ball.y;
        let dx = x2-x1, dy = y2-y1;
        let len2 = dx*dx + dy*dy;
        let t = ((cx-x1)*dx + (cy-y1)*dy) / len2;
        t = Math.max(0, Math.min(1, t));
        let px = x1 + t*dx;
        let py = y1 + t*dy;
        let dist = Math.hypot(cx-px, cy-py);
        if (dist < this.ballRadius + this.flipperWidth/2) {

            let nx = (cx-px)/dist, ny = (cy-py)/dist;

            let dir = (side === 'left') ? 1 : -1;
            let flipperVel = (flipper.pressed ? dir*6 : 0);
            let dot = this.ball.vx*nx + this.ball.vy*ny;
            this.ball.vx -= 2*dot*nx;
            this.ball.vy -= 2*dot*ny;

            this.ball.vx += nx * flipperVel;
            this.ball.vy += ny * flipperVel;

            this.ball.x = px + nx*(this.ballRadius + this.flipperWidth/2 + 1);
            this.ball.y = py + ny*(this.ballRadius + this.flipperWidth/2 + 1);
        }
    }

    handleBumperCollisions() {
        for (let bumper of this.bumpers) {
            let dx = this.ball.x - bumper.x;
            let dy = this.ball.y - bumper.y;
            let dist = Math.hypot(dx, dy);
            if (dist < bumper.r + this.ballRadius) {

                let nx = dx / dist;
                let ny = dy / dist;
                let dot = this.ball.vx*nx + this.ball.vy*ny;
                this.ball.vx -= 2*dot*nx;
                this.ball.vy -= 2*dot*ny;

                this.ball.vx *= 1.15;
                this.ball.vy *= 1.15;

                this.ball.x = bumper.x + nx*(bumper.r + this.ballRadius + 1);
                this.ball.y = bumper.y + ny*(bumper.r + this.ballRadius + 1);

                this.score += bumper.score;
            }
        }
    }

    drawForestBackground(ctx) {

        let skyGrad = ctx.createLinearGradient(0, 0, 0, this.height);
        skyGrad.addColorStop(0, "#c8e6df");
        skyGrad.addColorStop(0.3, "#b6e2c8");
        skyGrad.addColorStop(1, "#7ec87e");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, this.width, this.height);

        const distantTreeColors = ["#a2b77a", "#8ea65f"];
        for (let layer = 0; layer < 2; layer++) {
            let treeBase = 470 + layer * 40;
            for (let x = -30; x < this.width + 40; x += 55 + 15 * layer) {
                let baseY = treeBase + Math.random() * 12 * (layer+1);
                ctx.save();
                ctx.globalAlpha = 0.25 + 0.09 * layer;
                ctx.fillStyle = distantTreeColors[layer];

                ctx.beginPath();
                ctx.moveTo(x, baseY);
                ctx.lineTo(x + 28 + 8 * layer, baseY);
                ctx.lineTo(x + 14 + 4 * layer, baseY - 55 - 13 * layer);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }

        for (let x = 18; x < this.width; x += 60) {
            let baseY = 525 + 16 * Math.sin(x/80);
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = "#5b7b44";
            ctx.beginPath();
            ctx.ellipse(x, baseY, 28, 17, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = "#7d5e39";
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(x, baseY+12);
            ctx.lineTo(x, baseY+32);
            ctx.stroke();
            ctx.restore();
        }

        for (let x = 30; x < this.width; x += 100) {
            let baseY = 600 + 8 * Math.sin(x/40);

            ctx.save();
            ctx.globalAlpha = 0.8;
            ctx.strokeStyle = "#6e4e2c";
            ctx.lineWidth = 13;
            ctx.beginPath();
            ctx.moveTo(x, baseY + 26);
            ctx.lineTo(x, baseY - 24);
            ctx.stroke();
            ctx.restore();

            ctx.save();
            ctx.globalAlpha = 0.86;
            ctx.fillStyle = "#367d3b";
            ctx.beginPath();
            ctx.ellipse(x, baseY - 22, 34, 19, 0, 0, Math.PI * 2);
            ctx.ellipse(x - 18, baseY - 7, 17, 13, 0, 0, Math.PI * 2);
            ctx.ellipse(x + 15, baseY - 11, 19, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        for (let x = 0; x < this.width; x += 30) {
            let y = 670 + 10 * Math.sin(x / 20);
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = "#225b26";
            ctx.beginPath();
            ctx.ellipse(x, y, 14, 7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }


    draw() {
        let ctx = this.ctx;

        this.drawForestBackground(ctx);

        ctx.save();
        ctx.fillStyle = '#19326a';
        ctx.strokeStyle = '#223f80';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.wallPadding, this.height - 60);
        ctx.lineTo(60, 500);
        ctx.lineTo(60, 100);
        ctx.quadraticCurveTo(this.width/2, 20, this.width-60, 100);
        ctx.lineTo(this.width-60, 500);
        ctx.lineTo(this.width-this.wallPadding, this.height-60);
        ctx.closePath();
        ctx.globalAlpha = 0.80; // slightly see-through to forest
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.stroke();
        ctx.restore();

        this.drawWall(this.leftWall);
        this.drawWall(this.rightWall);

        for (let bumper of this.bumpers) {
            ctx.save();
            let grad = ctx.createRadialGradient(bumper.x, bumper.y, 2, bumper.x, bumper.y, bumper.r);
            grad.addColorStop(0, '#fff9');
            grad.addColorStop(0.5, '#ffe066');
            grad.addColorStop(1, '#c9a312');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(bumper.x, bumper.y, bumper.r, 0, 2*Math.PI);
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#997a1d';
            ctx.stroke();
            ctx.restore();
        }

        this.drawFlipper(this.leftFlipper, 'left');
        this.drawFlipper(this.rightFlipper, 'right');

        ctx.save();
        ctx.shadowColor = '#fff8';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, this.ballRadius, 0, 2*Math.PI);
        ctx.fillStyle = '#e7e6f7';
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#bbb';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#bbb';
        ctx.beginPath();
        ctx.moveTo(this.width-50, this.height-100);
        ctx.lineTo(this.width-50, this.height-40);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText('Score: '+this.score, 22, 36);
        ctx.fillText('Balls: '+this.lives, this.width - 130, 36);
        ctx.restore();

        if (this.state === 'menu') {
            ctx.save();
            ctx.globalAlpha = 0.98;
            ctx.fillStyle = '#222d49';
            ctx.fillRect(38, this.height/2-110, this.width-76, 180);
            ctx.globalAlpha = 1;
            ctx.font = 'bold 38px sans-serif';
            ctx.fillStyle = '#ffe066';
            ctx.textAlign = 'center';
            ctx.fillText('PINBALL', this.width/2, this.height/2-45);
            ctx.font = '20px sans-serif';
            ctx.fillStyle = '#fff';
            ctx.fillText('Press SPACE or CLICK to Start', this.width/2, this.height/2+10);
            ctx.restore();
        }
        if (this.state === 'gameover') {
            ctx.save();
            ctx.globalAlpha = 0.98;
            ctx.fillStyle = '#222d49';
            ctx.fillRect(38, this.height/2-90, this.width-76, 140);
            ctx.globalAlpha = 1;
            ctx.font = 'bold 34px sans-serif';
            ctx.fillStyle = '#e23b46';
            ctx.textAlign = 'center';
            ctx.fillText('Game Over', this.width/2, this.height/2-20);
            ctx.font = '22px sans-serif';
            ctx.fillStyle = '#fff';
            ctx.fillText('Final Score: '+this.score, this.width/2, this.height/2+18);
            ctx.font = '18px sans-serif';
            ctx.fillStyle = '#ffe066';
            ctx.fillText('Press SPACE or CLICK to Play Again', this.width/2, this.height/2+55);
            ctx.restore();

            window.onkeydown = (e) => {
                if (e.key === ' ' || e.key === 'Enter') this.startGame();
            };
            this.canvas.onclick = () => this.startGame();
        }
    }

    drawWall(points) {
        let ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = '#b9c6e0';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let p of points.slice(1)) {
            ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.restore();
    }

    drawFlipper(flipper, side) {
        let ctx = this.ctx;
        ctx.save();
        ctx.translate(flipper.x, flipper.y);
        ctx.rotate(flipper.angle);

        ctx.shadowColor = "#2226";
        ctx.shadowBlur = 8;

        ctx.fillStyle = side === 'left' ? '#ffe066' : '#e23b46';
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-this.flipperLength/2, -this.flipperWidth/2);
        ctx.lineTo(this.flipperLength/2, -this.flipperWidth/2);
        ctx.arc(this.flipperLength/2, 0, this.flipperWidth/2, -Math.PI/2, Math.PI/2);
        ctx.lineTo(-this.flipperLength/2, this.flipperWidth/2);
        ctx.arc(-this.flipperLength/2, 0, this.flipperWidth/2, Math.PI/2, -Math.PI/2);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.stroke();
        ctx.restore();
    }
}

function initGame() {
    const container = document.getElementById('gameContainer');
    new PinballGame(container);
}

window.addEventListener('DOMContentLoaded', initGame);
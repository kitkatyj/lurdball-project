var canvas, ctx, debugMenu = null;
var frameCounter = false;
var frameCount = 0;
var debug = false;

var currentLevel = {};
var tileSize = 32;
var fallAcceleration = 2;
var accelerationInteration = 99;
var fallStepsArray = [];

function Game() {
    this.currentLevel = 1;
    this.setLevel = function () {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                currentLevel = JSON.parse(this.responseText);
        
                var currentBall = new Ball({
                    "xTile":currentLevel.data.ball[0],
                    "yTile":currentLevel.data.ball[1]
                });

                currentLevel.data.ball = currentBall;
            }
        };
        xhttp.open("GET", "leveldata/level"+this.currentLevel+".json", true);
        xhttp.send();
    }
    this.gameOver = false;
    this.levelWin = false;
};

function Ball(data = {}){
    this.direction = 'neutral';
    this.fallSteps = [];
    
    // tile units
    this.xTile = data.xTile || 0;
    this.yTile = data.yTile || 0;
    this.destinationXTile = this.xTile;
    this.destinationYTile = this.yTile;
    
    // pixel units
    this.xVel = 0;
    this.yVel = 0;
    this.xPos = this.xTile * tileSize;
    this.yPos = this.yTile * tileSize;
    this.destinationXPos = this.destinationXTile * tileSize;
    this.destinationYPos = this.destinationYTile * tileSize;
    
    // functions
    this.setDestinationXTile = function(destX){
        this.destinationXTile = destX;
        this.destinationXPos = destX * tileSize;
    }
    this.setDestinationYTile = function(destY){
        this.destinationYTile = destY;
        this.destinationYPos = destY * tileSize;
    }
    this.setDestinationTile = function(destArray){
        this.destinationXTile = destArray[0];
        this.destinationXPos = destArray[0] * tileSize;
        this.destinationYTile = destArray[1];
        this.destinationYPos = destArray[1] * tileSize;
    }
}

function init() {
    canvas = document.getElementById('main');
    ctx = canvas.getContext('2d');

    main = new Game();
    main.setLevel();
    
    for(i = 1; i <= accelerationInteration; i++){
        fallStepsArray[i-1] = i * fallAcceleration;
    }
    
    debugMenu = document.getElementById('debug');
    if(!debug){
        debugMenu.style.display = 'none';
    }

    window.requestAnimationFrame(draw);
    
    document.addEventListener('keydown',function(e){
        
        if(!main.gameOver && currentLevel.data.ball.fallSteps.length === 0){
            if(e.ctrlKey || e.altKey || e.shiftKey || e.metaKey){
                return false;
            }

            // left, up, right, down
            if(e.keyCode === 37){
                ballFallsTo('left');
            }
            else if(e.keyCode === 38){
                ballFallsTo('up');
            }
            else if(e.keyCode === 39){
                ballFallsTo('right');
            }
            else if(e.keyCode === 40){
                ballFallsTo('down');
            }
        }
    });
}

function draw() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    paintBg('#200040');

    if (frameCounter) {
        ctx.font = "bold 16px Courier New";
        ctx.textAlign = "right";
        ctx.fillStyle = "white";
        ctx.fillText(frameCount, canvas.width, 16);
        frameCount++;
    }
    
    drawCurrentLevel();

    window.requestAnimationFrame(draw);
}

function drawCurrentLevel(){
    var levelWidth = tileSize * currentLevel.columns;
    var levelHeight = tileSize * currentLevel.rows;
    var currentBall = currentLevel.data.ball;
    
    currentLevel.levelCorner = [canvas.width/2-levelWidth/2,canvas.height/2-levelHeight/2];

    ctx.strokeStyle = "#ff0000";
    ctx.strokeRect(currentLevel.levelCorner[0],currentLevel.levelCorner[1],levelWidth,levelHeight);
    
    //draw walls
    currentLevel.data.walls.forEach(function(wall){
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(currentLevel.levelCorner[0] + tileSize * wall[0], currentLevel.levelCorner[1] + tileSize * wall[1], tileSize, tileSize);
    });
    
    //draw ball
    ctx.fillStyle = "#00ff00";
    ctx.beginPath();
    ctx.arc(
        currentLevel.levelCorner[0]+currentBall.xPos+tileSize/2, currentLevel.levelCorner[1]+currentBall.yPos+tileSize/2, 
        tileSize/2, 0, 2*Math.PI
    );
    ctx.fill();
    
    if(fallStep = currentBall.fallSteps.shift()){        
        switch(currentBall.direction){
            case 'left':
                currentBall.xPos -= fallStep; 
                currentBall.xTile -= fallStep / tileSize;
                break;
            case 'right':
                currentBall.xPos += fallStep; 
                currentBall.xTile += fallStep / tileSize; 
                break;
            case 'up':
                currentBall.yPos -= fallStep; 
                currentBall.yTile -= fallStep / tileSize; 
                break;
            case 'down':
                currentBall.yPos += fallStep; 
                currentBall.yTile += fallStep / tileSize; 
                break;
        }
    }
    
    //draw end
    ctx.fillStyle = "#0000ff";
    ctx.beginPath();
    ctx.arc(
        currentLevel.levelCorner[0]+currentLevel.data.end[0]*tileSize+tileSize/2,
        currentLevel.levelCorner[1]+currentLevel.data.end[1]*tileSize+tileSize/2, 
        tileSize/4, 0, 2*Math.PI
    );
    ctx.fill();
    
    //draw game over screen
    if(main.gameOver){
        drawScreen('#000000','Game Over','#ffffff');
    }
    
    // draw level complete screen
    if(main.levelWin && currentLevel.data.ball.fallSteps.length === 0){
        // drawScreen('#000000','Level Complete','#00ff00')
        main.levelWin = false;
        main.currentLevel++;
        main.setLevel();
    }
    
    debugMenu.innerHTML = JSON.stringify(currentBall).replace(/\,\"/g,'<br>').replace('{','').replace('}','');
}

function ballFallsTo(direction){
    var currentBall = currentLevel.data.ball;
    var checkTile = [currentBall.xTile,currentBall.yTile];
    var wallFound = false;
    var reachEnd = false;
    
    currentBall.direction = direction;
    
    // in each direction, find if there's a wall in the way and then steps back one step to set ball destination
    if(direction === 'left'){
        for(; checkTile[0] >= -99; checkTile[0]--){
            for(i = 0; i < currentLevel.data.walls.length; i++){
                if(JSON.stringify(checkTile) === JSON.stringify(currentLevel.data.end)){
                    reachEnd = true;
                    console.log("level complete");
                    break;
                }
                if(JSON.stringify(checkTile) === JSON.stringify(currentLevel.data.walls[i])){
                    wallFound = true;
                    console.log("wall found at - "+checkTile);
                    break;
                }
            };
            if(reachEnd) break;
            else if(wallFound){
                checkTile[0]++;
                break;
            };
        };
        
    }
    else if(direction === 'right'){
        for(; checkTile[0] < 99; checkTile[0]++){
            for(i = 0; i < currentLevel.data.walls.length; i++){
                if(JSON.stringify(checkTile) === JSON.stringify(currentLevel.data.end)){
                    reachEnd = true;
                    console.log("level complete");
                    break;
                }
                if(JSON.stringify(checkTile) === JSON.stringify(currentLevel.data.walls[i])){
                    wallFound = true;
                    console.log("wall found at - "+checkTile);
                    break;
                }
            };
            if(reachEnd) break;
            else if(wallFound){
                checkTile[0]--;
                break;
            }
        };
    }
    else if(direction === 'up'){
        for(; checkTile[1] >= -99; checkTile[1]--){
            for(i = 0; i < currentLevel.data.walls.length; i++){
                if(JSON.stringify(checkTile) === JSON.stringify(currentLevel.data.end)){
                    reachEnd = true;
                    console.log("level complete");
                    break;
                }
                if(JSON.stringify(checkTile) === JSON.stringify(currentLevel.data.walls[i])){
                    wallFound = true;
                    console.log("wall found at - "+checkTile);
                    break;
                }
            };
            if(reachEnd) break;
            else if(wallFound){
                checkTile[1]++;
                break;
            }
        };
        
    }
    else if(direction === 'down'){
        for(; checkTile[1] < 99; checkTile[1]++){
            for(i = 0; i < currentLevel.data.walls.length; i++){
                if(JSON.stringify(checkTile) === JSON.stringify(currentLevel.data.end)){
                    reachEnd = true;
                    console.log("level complete");
                    break;
                }
                if(JSON.stringify(checkTile) === JSON.stringify(currentLevel.data.walls[i])){
                    wallFound = true;
                    console.log("wall found at - "+checkTile);
                    break;
                }
            };
            if(reachEnd) break;
            else if(wallFound){
                checkTile[1]--;
                break;
            }
        };
    }
    currentBall.setDestinationTile(checkTile);
    
    if(reachEnd){
        main.levelWin = true;
    }
    else if(!wallFound){
        console.log("no wall found");
        main.gameOver = true;
    }
    
    var fallBuffer,lastFallStepIndex = 0;
    currentBall.fallSteps = [];
    
    // calculate fall distance based on fallStepsArray and getting the fall buffer for last step
    if(direction === 'left' || direction === 'right'){
        fallBuffer = Math.abs(currentBall.destinationXPos - currentBall.xPos);
    }
    else if(direction === 'up' || direction === 'down'){
        fallBuffer = Math.abs(currentBall.destinationYPos - currentBall.yPos);
    }
    
    for(i = 0; i < fallStepsArray.length; i++){
        fallBuffer -= fallStepsArray[i];
        if(fallBuffer < 0){
            lastFallStepIndex = i;
            break;
        }
    }

    for(i = 0; i <= lastFallStepIndex; i++){
        currentBall.fallSteps[i] = fallStepsArray[i];
        // if last index
        if(i === lastFallStepIndex){
            currentBall.fallSteps[i] += fallBuffer;
        }
    }
    
    console.log(currentBall);
}

function drawScreen(bgColor,text,textColor){
    ctx.fillStyle = bgColor;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(currentLevel.levelCorner[0],currentLevel.levelCorner[1],currentLevel.columns * tileSize ,currentLevel.rows*tileSize);
    ctx.globalAlpha = 1;
    ctx.font = "bold 32px Courier New"
    ctx.textAlign = 'center';
    ctx.fillStyle = textColor;
    ctx.fillText(text,currentLevel.levelCorner[0]+currentLevel.columns*tileSize/2,currentLevel.levelCorner[1]+currentLevel.rows*tileSize/2+8);
}

function paintBg(color) {
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.fill();
}

window.onload = init;

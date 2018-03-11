var canvas, ctx, debugMenu = null;
var frameCounter = false;
var frameCount = 0;
var debug = false;

var currentLevel = {};
var tileSize = 64;
var buttonPadding = 8;
var fallAcceleration = 2;
var accelerationInteration = 99;
var fallStepsArray = [];

function Game() {
    this.gameOver = false;
    this.levelWin = false;

    this.cursorPos = [0,0];
    this.mouseDown = false;
    this.mouseUp = false;
    this.buttonHover = false;

    this.totalLevels = 5;
    this.currentLevel = 0;
    this.setLevel = function () {
        this.currentLevel %= this.totalLevels;
        localStorage.currentLevel = this.currentLevel;
        var main = this;

        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                currentLevel = JSON.parse(this.responseText);
        
                currentLevel.data.ball = new Ball({
                    "xTile":currentLevel.data.ball[0],
                    "yTile":currentLevel.data.ball[1]
                });;

                currentLevel.data.spritesTemp = [];

                currentLevel.data.sprites.forEach(function(sprite){
                    sprite.pos.forEach(function(spritePos){
                        var spriteTemp = new Sprite({
                            "xTile":spritePos[0],
                            "yTile":spritePos[1],
                            "totalFrames":sprite.totalFrames,
                            "framesPerRow":sprite.framesPerRow,
                            "src":"res/"+sprite.src+".png",
                            "speed":sprite.speed,
                            "width":sprite.width,
                            "height":sprite.height
                        });

                        currentLevel.data.spritesTemp.push(spriteTemp);
                    });
                });

                if(endPortal = currentLevel.data.end){
                    var endPortalSprite = new Sprite({
                        "xTile":endPortal[0],
                        "yTile":endPortal[1],
                        "totalFrames":24,
                        "framesPerRow":4,
                        "src":"res/endportal.png",
                        "speed":0.5
                    });
                    currentLevel.data.spritesTemp.push(endPortalSprite);
                }

                currentLevel.data.sprites = currentLevel.data.spritesTemp;
                delete currentLevel.data.spritesTemp;

                currentLevel.data.buttonsRow = [];
                currentLevel.data.buttonsWidth = 0;
            }
        };
        xhttp.open("GET", "leveldata/level"+this.currentLevel+".json", true);
        xhttp.send();
    }
    this.resetLevel = function(){
        this.gameOver = false;
        this.levelWin = false;
        this.setLevel();
    }

    this.addButton = function(data = {}){
        var newButton = new Button({
            "name":data.name,
            "bgColor":data.bgColor,
            "bgHoverColor":data.bgHoverColor,
            "bgClickColor":data.bgClickColor,
            "action":data.action
        });
        currentLevel.data.buttonsRow.push(newButton);
        newButton.posOffset += currentLevel.data.buttonsWidth;
        currentLevel.data.buttonsWidth += newButton.width;
    }
    this.removeButton = function(buttonName){
        for(i = 0; i < currentLevel.data.buttonsRow.length; i++){
            if(currentLevel.data.buttonsRow[i].name === buttonName){
                var removedButton = currentLevel.data.buttonsRow.splice(i,1);
                currentLevel.data.buttonsWidth -= removedButton.width;
                break;
            }
        }
    }
    this.addTestButton = function(){
        this.addButton({
            "name":"Test",
            "bgColor":"#007700",
            "bgHoverColor":"#009900",
            "action":"console.log('hi')"
        });
    }
    this.addResetButton = function(){
        this.addButton({
            "name":"Reset level",
            "bgColor":"#990000",
            "bgHoverColor":"#aa0000",
            "bgClickColor":"#cc0000",
            "action":"main.resetLevel()"
        });
    }
    this.removeResetButton = function(){
        this.removeButton("Reset level");
    }
};

function Sprite(data = {}){
    // tile units
    this.xTile = data.xTile || 0;
    this.yTile = data.yTile || 0;

    // pixel units
    this.xPos = this.xTile * tileSize;
    this.yPos = this.yTile * tileSize;
    this.width = data.width || 32;
    this.height = data.height || 32;

    this.totalFrames = data.totalFrames;
    this.framesPerRow = data.framesPerRow;
    this.speed = data.speed || 1/2;
    
    if(data.src){
        this.src = data.src;
        
        var imgTemp = new Image();
        imgTemp.src = data.src;
        this.img = imgTemp;
    }

    this.recalibratePos = function(){
        this.xPos = this.xTile * tileSize;
        this.yPos = this.yTile * tileSize;
    }
}

function Ball(data = {}){
    Sprite.call(this,data);

    this.direction = 'neutral';
    this.fallSteps = [];
    
    // tile units
    this.destinationXTile = this.xTile;
    this.destinationYTile = this.yTile;
    
    // pixel units
    this.xVel = 0;
    this.yVel = 0;
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

function Button(data = {}){
    this.hover = false;

    this.name = data.name;
    this.bgColor = data.bgColor;
    this.bgHoverColor = data.bgHoverColor || data.bgColor;
    this.bgClickColor = data.bgClickColor || data.bgHoverColor || data.bgClickColor;
    this.width = (data.name.length * 10)*2 + buttonPadding*2;
    this.height = 44 + buttonPadding;
    this.posOffset = 0;

    this.action = data.action;
}

function init() {
    canvas = document.getElementById('main');
    ctx = canvas.getContext('2d');

    main = new Game();
    if(localStorage.currentLevel){
        main.currentLevel = parseInt(localStorage.currentLevel);
    }
    main.setLevel();
    
    for(i = 1; i <= accelerationInteration; i++){
        fallStepsArray[i-1] = i * fallAcceleration;
    }
    
    debugMenu = document.getElementById('debug');
    if(!debug) debugMenu.style.display = 'none';

    window.requestAnimationFrame(draw);
    
    document.addEventListener('keydown',function(e){
        if(Object.keys(currentLevel).length > 0 && !main.gameOver && currentLevel.data.ball.fallSteps.length === 0){
            if(e.ctrlKey || e.altKey || e.shiftKey || e.metaKey){
                return false;
            }

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

    document.addEventListener('mousemove',function(e){
        main.cursorPos[0] = e.offsetX;
        main.cursorPos[1] = e.offsetY;
    });
    document.addEventListener('mousedown',function(e){
        main.mouseDown = true;
    });
    document.addEventListener('mouseup',function(e){
        main.mouseDown = false;
        main.mouseUp = true;
    });
}

function draw() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    main.buttonHover = false;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    paintBg('#200040');

    ctx.font = "bold 32px Courier New";

    if (frameCounter) {
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "right";
        ctx.fillText(frameCount, canvas.width, 16);
    }

    frameCount++;
    
    if(Object.keys(currentLevel).length > 0){
        drawCurrentLevel();
    }

    // draw buttons
    currentLevel.data.buttonsRow.forEach(function(button,index){
        drawButton(button,index);
    });

    if(main.buttonHover) canvas.style.cursor = 'pointer';
    else canvas.style.cursor = 'default';

    // draw level counter
    var counterWidth = 100;
    ctx.fillStyle = "#000000";
    ctx.globalAlpha = 0.5;
    ctx.fillRect(canvas.width/2-counterWidth,32,counterWidth*2,44);
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.fillText("Level "+(main.currentLevel+1),canvas.width/2,64);

    if(main.mouseUp){
        main.mouseUp = false;
    }

    window.requestAnimationFrame(draw);
}

function drawCurrentLevel(){
    var levelWidth = tileSize * currentLevel.columns;
    var levelHeight = tileSize * currentLevel.rows;
    var currentBall = currentLevel.data.ball;
    
    currentLevel.levelCorner = [canvas.width/2-levelWidth/2,canvas.height/2-levelHeight/2];

    // draw level perimeter
    // ctx.strokeStyle = "#ff0000";
    // ctx.strokeRect(currentLevel.levelCorner[0],currentLevel.levelCorner[1],levelWidth,levelHeight);
    
    // draw sprites
    currentLevel.data.sprites.forEach(function(sprite){
        drawSprite(sprite);
    });

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
    
    //draw game over screen
    if(main.gameOver){
        drawScreen('#000000','Game Over','#ffffff');
    }
    
    // if level complete
    if(main.levelWin && currentLevel.data.ball.fallSteps.length === 0){
        main.levelWin = false;
        main.currentLevel++;
        main.setLevel();
    }
    
    debugMenu.innerHTML = JSON.stringify(main).replace(/\,\"/g,'<br>"');
}

function drawSprite(sprite){
    var frameIndex = Math.floor(frameCount * sprite.speed) % sprite.totalFrames;
    
    var rows = Math.floor(sprite.totalFrames / sprite.framesPerRow);
    var frameStartX = (frameIndex % sprite.framesPerRow) * sprite.width;
    var frameStartY = (Math.floor(frameIndex / sprite.framesPerRow) % rows) * sprite.height;
    
    ctx.drawImage(sprite.img,frameStartX,frameStartY,sprite.width,sprite.height,currentLevel.levelCorner[0]+sprite.xPos,currentLevel.levelCorner[1]+sprite.yPos,tileSize,tileSize);
}

function drawButton(button,index){
    var padding = 8;
    var noOfButtons = currentLevel.data.buttonsRow.length;
    var buttonsWidth = currentLevel.data.buttonsWidth;
    var xPos = canvas.width/2-buttonsWidth/2+button.posOffset;
    var yPos = canvas.height-74-padding/2;

    if(main.cursorPos[0] > xPos && main.cursorPos[0] < xPos+button.width && main.cursorPos[1] > yPos && main.cursorPos[1] < yPos+button.height){
        main.buttonHover = true;
        ctx.fillStyle = button.bgHoverColor;
        if(main.mouseDown){
            ctx.fillStyle = button.bgClickColor;
        }
        if(main.mouseUp){
            eval(button.action);
        }
    }
    else {
        ctx.fillStyle = button.bgColor;
    }

    ctx.fillRect(xPos, yPos, button.width, button.height);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(button.name,xPos+button.width/2,yPos+button.height-16);
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
                    // console.log("level complete");
                    break;
                }
                if(JSON.stringify(checkTile) === JSON.stringify(currentLevel.data.walls[i])){
                    wallFound = true;
                    // console.log("wall found at - "+checkTile);
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
                    // console.log("level complete");
                    break;
                }
                if(JSON.stringify(checkTile) === JSON.stringify(currentLevel.data.walls[i])){
                    wallFound = true;
                    // console.log("wall found at - "+checkTile);
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
                    // console.log("level complete");
                    break;
                }
                if(JSON.stringify(checkTile) === JSON.stringify(currentLevel.data.walls[i])){
                    wallFound = true;
                    // console.log("wall found at - "+checkTile);
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
                    // console.log("level complete");
                    break;
                }
                if(JSON.stringify(checkTile) === JSON.stringify(currentLevel.data.walls[i])){
                    wallFound = true;
                    // console.log("wall found at - "+checkTile);
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
        // console.log("no wall found");
        main.gameOver = true;
        main.addResetButton();
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
    
    // console.log(currentBall);
}

function drawScreen(bgColor,text,textColor){
    var padding = 20;

    ctx.fillStyle = bgColor;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(currentLevel.levelCorner[0]-padding,currentLevel.levelCorner[1]-padding,currentLevel.columns * tileSize + padding*2 ,currentLevel.rows*tileSize + padding*2);
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

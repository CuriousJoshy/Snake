var stage = document.getElementById("stage"), ctx = stage.getContext("2d");

const GRID_SIZE = 25, CELLS_H = 25, CELLS_V = 20;

function convert(val)
{
    return val * GRID_SIZE;
}

function randInt(min, max)
{
    return Math.floor(Math.random() * (max - min) + min);
}

function randItem(array)
{
	return array[randInt(0, array.length)];
}

stage.width = GRID_SIZE * CELLS_H;
stage.height = GRID_SIZE * CELLS_V;

const WIDTH = stage.width, HEIGHT = stage.height;

function clearScreen()
{
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
}

var keys = {}, boundKeys = {}, psuedoKeys = {};

function handleKeys(e)
{
    let key = e.key == " " ? "space" : e.key.toLowerCase();
    
    if(e.type == "keydown")
    {    
        keys[key] = true;
        
        if(boundKeys[key])
            boundKeys[key](e, key);
    }
    else
        delete keys[key];
}

addEventListener("keydown", handleKeys);
addEventListener("keyup", handleKeys);

function bindKey(key, callback)
{
    this.boundKeys[key] = callback;
}

function unbindKey(key)
{
    delete this.boundKeys[key];
}

// State handler

var states = {}, currentState;

function addState(name, options)
{
    this.states[name] = options;
}

function enterState(name, ...data)
{
    let _new = this.states[name], old = currentState;
    
    if(!_new)
        return;
    
    exitState(...data);
    
    if(_new.keys)
        Object.entries(_new.keys).forEach((pair) => bindKey(pair[0], typeof pair[1] == "string" ? () => enterState(pair[1]) : pair[1]));
    
    if(_new.enter)
        _new.enter(...data);
    
    currentState = _new;
}

function exitState(...data)
{
    let old = currentState;
    
    if(old)
    {
        if(old.exit)
            old.exit(...data);
        
        if(old.keys)
            Object.keys(old.keys).forEach(key => unbindKey(key));
    }
    currentState = null;
}

function stateIs(name)
{
    return this.states[name] == currentState;
}

// Canvas drawing methods

const PI = Math.PI, DEG2RAD = PI / 180;

function rotate(anchorX, anchorY, degrees)
{
	ctx.translate(anchorX, anchorY);
	ctx.rotate(degrees * DEG2RAD);
	ctx.translate(-anchorX, -anchorY);
}

var hexRegex = /^\#|0x|[a-fA-F]/, rawHexRegex = /\#|0x/gi;
var rgbRegex = /^rgb/gi, rawRGBRegex = /rgb|\(|\)| /gi;

function getRGB(RGBorHex)
{
    let red = 0, green = 0, blue = 0;
    
    if(RGBorHex.search(rgbRegex) > -1)
    {
        let rawRGB = RGBorHex.replace(rawRGBRegex, "").split(",");
        
        red = parseInt(rawRGB[0]);
        green = parseInt(rawRGB[1]);
        blue = parseInt(rawRGB[2]);
    }
    else if(RGBorHex.search(hexRegex) > -1)
    {
        let rawHex = RGBorHex.replace(rawHexRegex,"");
        
        red = parseInt("0x" + rawHex.substring(0,2));
        green = parseInt("0x" + rawHex.substring(2,4));
        blue = parseInt("0x" + rawHex.substring(4,6));
    }
    
    return [red, green, blue]
}

function createLinearColorStep(startColor, endColor, partitions)
{
    let result = [];
    
    let startRGB = getRGB(startColor), endRGB = getRGB(endColor);
    
    let startRed = startRGB[0], startGreen = startRGB[1], startBlue = startRGB[2];
    let endRed = endRGB[0], endGreen = endRGB[1], endBlue = endRGB[2];
    
    //console.log(startRGB, endRGB);
    
    let redStep = (endRed - startRed) / partitions;
    let greenStep = (endGreen - startGreen) / partitions;
    let blueStep = (endBlue - startBlue) / partitions;
    
    for(var i = 0; i < partitions - 1; i++){
        let deltaRed = redStep * i, deltaGreen = greenStep * i, deltaBlue = blueStep * i;
                
        result.push(`rgb(${startRed + deltaRed}, ${startGreen + deltaGreen}, ${startBlue + deltaBlue})`);
    }
    
    result.push(`rgb(${endRed}, ${endGreen}, ${endBlue})`);
    
    return result;
}

function createGradientStep(stops, partitions)
{
    if(Array.isArray(stops))
    {
        let stopObj = {};
        
        let l = stops.length - 1, stopPercent = 1 / stops.length;
        
        for(var i = 0; i < l; i++)
        {
            stopObj[stopPercent * i] = stops[i];
        }
        
        stopObj[1] = stops[l];
        
        stops = stopObj;
    }
    
    let result = [], stopEntries = Object.entries(stops).sort();
        
    let lastColor = stopEntries[0][1], lastPercent = stopEntries[0][0];
    
    for(var i = 1, l = stopEntries.length; i < l; i++)
    {
        let color = stopEntries[i][1], percent = stopEntries[i][0];
        
        result.push(...createLinearColorStep(lastColor, color, (percent - lastPercent) * partitions));
        
        lastColor = color;
        lastPercent = percent;
    }
    
    return result;
}

/**
 * Modified version of https://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas - Juan Mendez
 *
 * Draws a rounded rectangle using the current state of the canvas.
 * If you omit the last three params, it will draw a rectangle
 * outline with a 5 pixel border radius
 * @param {Number} x The top left x coordinate
 * @param {Number} y The top left y coordinate
 * @param {Number} width The width of the rectangle
 * @param {Number} height The height of the rectangle
 * @param {Number} [radius = 5] The corner radius; It can also be an object 
 *                 to specify different radii for corners
 * @param {Number} [radius.tl = 0] Top left
 * @param {Number} [radius.tr = 0] Top right
 * @param {Number} [radius.br = 0] Bottom right
 * @param {Number} [radius.bl = 0] Bottom left
 */

function roundRect(x, y, width, height, radius) {    
    if(typeof radius === 'undefined') {
        radius = 5;
    }
    if(typeof radius === 'number') {
        radius = {tl: radius, tr: radius, br: radius, bl: radius};
    } 
    else {
        var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
        for (var side in defaultRadius) {
            radius[side] = radius[side] || defaultRadius[side];
        }
    }
    
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
}

function rect(x, y, w, h)
{
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.closePath();
}

function rightTriangle(x, y, w, h)
{
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
}

function equilateralTriangle(x, y, w, h)
{
	ctx.beginPath();
	ctx.moveTo(x, y);
	ctx.lineTo(x, y + h);
	ctx.lineTo(x + w, y + h / 2);
	ctx.closePath();
}

function circle(x, y, r)
{
    ctx.arc(x, y, r, 0, 2 * Math.PI);
}

function measureText(text)
{
    return ctx.measureText(text).width;
}

function displayText(text, offsetX = 0, offsetY  = 0)
{
    let size = measureText("M");
    
    ctx.fillText(text, WIDTH / 2 - measureText(text) / 2 + offsetX, HEIGHT / 2 - size / 2 + offsetY);
}

ctx.textBaseline = "top";
//ctx.lineJoin = "bevel";
ctx.miterLimit = 1;

// Create the Scoreboard object

const SCORE_SCALE = 10;

var Scoreboard = {
    score: 0,
    highScore: 0,
    
    increment: function(amount)
    {
        this.score += amount;
        
        if(this.score > this.highScore)
        {
            this.highScore = this.score;
        }
    },
    
    reset: function()
    {
        this.score = 0;
    },
    
    draw: function()
    {        
        let scoreText = "Score: " + this.score;
        let highScoreText = "High Score: " + this.highScore;
        
        ctx.fillStyle = "black";
        ctx.font = "bold 20px 'Times New Roman'";
        
        ctx.fillText(scoreText, 5, 5);
        ctx.fillText(highScoreText, WIDTH - measureText(highScoreText) - 25, 5);
    }
};

// Create the Grid object

var Grid = {
    cells: {},
    
    occupy: function(x, y, object)
    {
        this.cells[x + "," + y] = object;
    },
    
    vacate: function(x, y)
    {
        delete this.cells[x + "," + y];
    },
    
    retrieve: function(x, y)
    {
        return this.cells[x + "," + y];
    },
    
    isOccupied: function(x, y)
    {
        return !!this.retrieve(x, y);
    },
    
    clear: function()
    {
        this.cells = {};
    }
};

// Create the Snake object

const SNAKE_HEAD_COLOR = "#00FF00", 
	SNAKE_BODY_GRADIENT = 
	createGradientStep(["#00FF00","#FF0000","#00FFFF","#FF00FF","#FFFF00","#FF0000","#00FF00",], CELLS_H * CELLS_V / 2), 
    SNAKE_GAMEOVER_COLOR = "#808080",
	BASE_SIZE = 5, 
	SIZE_GROWTH = 3,
	TIME_FRAME = 180,
	BASE_SPEED = 10, 
	SPEED_GROWTH = 0.25;

const LEFT = 1, UP = 2, RIGHT = 3, DOWN = 4, DIRECTIONS = [LEFT,UP,RIGHT,DOWN];

const DEFAULT = 0, UP_LEFT = 2, UP_RIGHT = 1, DOWN_LEFT = 3, DOWN_RIGHT = 4, LEFT_UP = 4, LEFT_DOWN = 1, RIGHT_UP = 3, RIGHT_DOWN = 2;

const SEGMENT_TYPES = {
    "1 1": DEFAULT,
    "1 3": DEFAULT,
    "3 1": DEFAULT,
    "3 3": DEFAULT,
    
    "2 2": DEFAULT,
    "2 4": DEFAULT,
    "4 2": DEFAULT,
    "4 4": DEFAULT,
    
    "1 2": LEFT_UP,
    "2 1": UP_LEFT,
    
    "3 2": RIGHT_UP,
    "2 3": UP_RIGHT,
    
    "1 4": LEFT_DOWN,
    "4 1": DOWN_LEFT,
    
    "3 4": RIGHT_DOWN,
    "4 3": DOWN_RIGHT,
};

var Snake = {    
    tick: 0,
    
    x: 0,
    y: 0,
    
    direction: RIGHT,
    lastDirection: RIGHT,
    nextDirection: null,
    
    turned: false,
    
    length: BASE_SIZE,
	deadSegments: 0,
	    
    segments: [],
    	
	reset: function(startingSize)
	{
		let size = startingSize || BASE_SIZE;
		
		Grid.clear();
		
		this.x = Math.floor(CELLS_H / 2) - size;
		this.y = Math.floor(CELLS_V / 2);
		
		this.direction = RIGHT;
		this.tick = 0;
		
		this.length = size;
		this.segments.length = 0;
		this.deadSegments = 0;
		
		for(var i = 0; i < size; i++)
		{
			this.tick = TIME_FRAME;
			this.update();
		}
	},
    
    eat: function()
    {
        this.length += SIZE_GROWTH;
        
        Scoreboard.increment(SIZE_GROWTH * SCORE_SCALE);
        
        Mouse.changeLocation();
    },
    
    moveHead: function()
    {        
        this.lastDirection = this.direction;
        
        switch(this.nextDirection || this.direction)
        {
            case LEFT:
                this.x--;
            break;
                
            case RIGHT:
                this.x++;
            break;
                
            case UP:
                this.y--;
            break;
                
            case DOWN:
                this.y++;
            break;
        }
        
        // The snake will wrap to the other side of the screen when reaching the boundaries 
        if(this.x > CELLS_H - 1)
            this.x = 0;
        if(this.x < 0)
            this.x = CELLS_H - 1;
        if(this.y > CELLS_V - 1)
            this.y = 0;
        if(this.y < 0)
            this.y = CELLS_V - 1;
        
        if(this.nextDirection)
        {
            this.direction = this.nextDirection;
            this.nextDirection = null;
            
            // Used to determine corner segments if necessary
            this.turned = this.direction != this.lastDirection;
        }
    },
    
    moveSegments: function()
    {
        let segments = this.segments, length = this.length;
        
        segments.push(new Segment(this.x, this.y, this.direction));
                
        if(segments.length > length)
        {
            let segment = segments.shift();
            
            Grid.vacate(segment.x, segment.y);
        }
    },
    
    update: function()
    {
        let updateTime = Math.max(TIME_FRAME / (BASE_SPEED + (this.length) * SPEED_GROWTH), 1); 
        
		if(stateIs("playing") || stateIs("start"))
		{
			let listeners = keys;
			
			if(stateIs("start"))
				listeners = psuedoKeys;
			
			if((listeners.a || listeners.arrowleft) && this.direction != RIGHT)
				this.nextDirection = LEFT;
			if((listeners.d || listeners.arrowright) && this.direction != LEFT)
				this.nextDirection = RIGHT;
			if((listeners.w || listeners.arrowup) && this.direction != DOWN)
				this.nextDirection = UP;
			if((listeners.s || listeners.arrowdown) && this.direction != UP)
				this.nextDirection = DOWN;
			
			// Used to determine corner segments if necessary
			this.turned = this.lastDirection != this.nextDirection;
        }
		
        if(++this.tick >= updateTime)
        {
            this.moveSegments();
            this.moveHead();
            
			if(stateIs("playing"))
			{
				let cell = Grid.retrieve(this.x, this.y);
				
				if(cell == Mouse)
					this.eat();
				else if(isSegment(cell))
					enterState("gameover");
				
				Grid.occupy(this.x, this.y, this);
            }
			
            this.tick = 0;
        }
    },
    
    drawHead: function(x, y, direction)
    {    
        x = convert(x);
        y = convert(y);

        let size = GRID_SIZE;

        // Draw the tongue (We want it to be drawn under the head so it doesn't look like it is sticking out on top)

        ctx.save();

        if(direction != LEFT)
            rotate(x + size / 2, y + size / 2, (direction - 1) * 90);
        
        ctx.fillStyle = "red";

        ctx.beginPath();
        ctx.moveTo(x, y + size / 3);
        ctx.lineTo(x - 5, y + size / 3);

        ctx.arcTo(x - 12, y + size / 2, x - 5, y + size * 2 / 3, 5);
        ctx.lineTo(x, y + size * 2 / 3);
        ctx.fill();
        ctx.closePath();

        // Draw the bulk of the head by recycling the drawSegment function

        // this.drawSegment(x / GRID_SIZE, y / GRID_SIZE, DEFAULT, stateIs("gameover") ? SNAKE_GAMEOVER_COLOR : SNAKE_HEAD_COLOR);
        
		ctx.fillStyle = stateIs("gameover") ? SNAKE_GAMEOVER_COLOR : SNAKE_HEAD_COLOR;
		
        ctx.beginPath();
        ctx.miterLimit = 10;
        ctx.moveTo(x + size, y);
        ctx.lineTo(x + size / 2, y);
        ctx.lineTo(x, y + size / 5);
		ctx.lineTo(x, y + size * 4 / 5);
		ctx.lineTo(x + size / 2, y + size);
		ctx.lineTo(x + size, y + size);
        ctx.closePath();
		
		ctx.fill();
        ctx.stroke();

        // Draw the eyes (Fill behavior is odd when attempting to draw both in the same path hence why two seperate beginPath()'s are used)

        ctx.fillStyle = "black";

        ctx.beginPath();
        circle(x + size / 2.5, y + size * 2 / 3, 3);
        ctx.fill();
        ctx.closePath();

        ctx.beginPath();    
        circle(x + size / 2.5, y + size / 3, 3);
        ctx.fill();
        ctx.closePath();

        ctx.restore();
    },
    
    drawSegment: function(x, y, type, color)
    {
        x = convert(x);
        y = convert(y);
        
        let size = GRID_SIZE;

        ctx.fillStyle = color;
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        
        if(type == DEFAULT)
        {
            // roundRect(x, y, size, size);
            rect(x, y, size, size);
        }
        else
        {
            ctx.save();
                rotate(x + size / 2, y + size / 2, (type - 1) * 90);
            
                rightTriangle(x, y, size, size);
            ctx.restore();
        }

        ctx.fill();
        ctx.stroke();
    },
	
	drawTail: function(x, y, direction, color)
	{
		x = convert(x);
		y = convert(y);
		
		let size = GRID_SIZE;
		
		ctx.fillStyle = color;
		
		ctx.save();
			if(direction != LEFT)
				rotate(x + size / 2, y + size / 2, (direction - 1) * 90);
			
			equilateralTriangle(x, y, size, size);
		ctx.restore();
		
		ctx.fill();
		ctx.stroke();
	},
    
    draw: function()
    {        
        let segments = this.segments, segment;
        
        let gradient = SNAKE_BODY_GRADIENT, gradientLength = gradient.length, color;
        
        let dir, next, type;
        
        for(var i = 0, l = segments.length; i < l; i++)
        {            
            segment = segments[i];
            next = segments[i + 1] || this;
            
			color = this.deadSegments > 0 && (l - 1) - i < this.deadSegments ? SNAKE_GAMEOVER_COLOR : gradient[((l - 1) - i) % gradientLength];
			
            if(next)
                type = SEGMENT_TYPES[segment.direction + " " + next.direction];
            else
                type = DEFAULT;
			
			if(i === 0 && type == DEFAULT)
				this.drawTail(segment.x, segment.y, segment.direction, color);
			else
				this.drawSegment(segment.x, segment.y, type, color);
        }
        
        this.drawHead(this.x, this.y, this.direction);
		
		if(stateIs("gameover") && this.deadSegments < this.length)
		{
			this.deadSegments++;
			
			this.deathTicks = 0;
		}
    }
};

var Segment = function(x, y, direction)
{
    this.x = x;
    this.y = y;
    
    this.direction = direction;
    
    Grid.occupy(x, y, this);
}

function isSegment(object)
{
    return object instanceof Segment;
}

// Create the Food object

const FOOD_COLORS = ["red", "blue", "purple", "orange"], MAX_MOVE_ATTEMPTS = 1000;

var Food = {
    x: 0,
    y: 0,
    
    color: "red",
    
    moveAttempts: 0,
    
    move: function()
    {
        if(this.moveAttempts = 0)
        {
            Grid.vacate(this.x, this.y);
        }
        else if(this.moveAttempts >= MAX_MOVE_ATTEMPTS)
        {
            this.moveAttempts = 0;
            
            setTimeout(() => Food.move(), 1000);
            
            return;
        }
        
        this.moveAttempts++;
        
        let x = randInt(0, CELLS_H);
        let y = randInt(0, CELLS_V);
        
        if(Grid.isOccupied(x, y))
            this.move();
        else
        {
            this.x = x;
            this.y = y;
            
            this.color = randItem(FOOD_COLORS);
            
            Grid.occupy(x, y, this);
            
            this.moveAttempts = 0;
        }
    },
    
    draw: function()
    {
        ctx.fillStyle = this.color;
        
        let x = convert(this.x), y = convert(this.y), size = GRID_SIZE / 2;
        
        ctx.beginPath();
        circle(x + size, y + size, size);
        ctx.closePath()
        
        ctx.fill();
    }
};

// Create the Mouse object

const MOUSE_BODY_COLOR = "#C0C0C0", MOUSE_EYE_COLOR = "#ff0000", MOUSE_TAIL_COLOR = "#FF1493";

var Mouse = {
	x: 0,
	y: 0,
	tick: 0,
	
	directionChangeDelay: 120,
	moveDelay: 40,
	
	changeLocation: function()
	{
		this.tick = 0;
		
		Grid.vacate(this.x, this.y);
		
		let x = randInt(0, CELLS_H);
        let y = randInt(0, CELLS_V);
		
		if(Grid.isOccupied(x, y))
			this.changeLocation();
		else
		{
			this.x = x;
			this.y = y;
			
			Grid.occupy(x, y, this);
			
			this.direction = randItem(DIRECTIONS);
		}
	},
	
	changeDirection: function()
	{
		this.direction = randItem(DIRECTIONS);
        
        if(!this.tryMove())
            this.changeDirection();
	},
    
    tryMove: function()
    {
        let x = this.x;
		let y = this.y;
        
        switch(this.direction)
        {
            case LEFT:
                x--;
            break;
                
            case RIGHT:
                x++;
            break;
                
            case UP:
                y--;
            break;
                
            case DOWN:
                y++;
            break;
        }
		
		// The mouse will wrap to the other side of the screen when reaching the boundaries 
        if(x > CELLS_H - 1)
            x = 0;
        if(x < 0)
            x = CELLS_H - 1;
        if(y > CELLS_V - 1)
            y = 0;
        if(y < 0)
            y = CELLS_V - 1;
        
        if(Grid.isOccupied(x, y))
            return false;
        else
            return {
                x: x,
                y: y
            };
    },
	
	move: function()
	{
		let pos = this.tryMove();
        
        if(!pos)
        {
            this.changeDirection();
        }
        else
        {
            Grid.vacate(this.x, this.y)
            
            this.x = pos.x;
            this.y = pos.y;
            
            Grid.occupy(this.x, this.y, this);
        }
	},
	
	update: function()
	{
		if(this.tick > 0)
		{
            let scale = Math.floor(Snake.length / 9);
            
			if(this.tick % Math.floor(this.directionChangeDelay - scale, 60) === 0)
			{
				this.changeDirection();
			}
			else if(this.tick % Math.max(this.moveDelay - scale, 20) == 0)
			{
				this.move();
			}
		}
		
		this.tick++;
	},
	
	draw: function()
	{
		let x = convert(this.x), y = convert(this.y), size = GRID_SIZE, direction = this.direction;
		
		let ax = x + size / 2, ay = y + size / 2;
		
		ctx.save();
			rotate(ax, ay, (this.direction - 1) * 90);
		    
            // Draw the body
        
            ctx.fillStyle = MOUSE_BODY_COLOR;
        
			ctx.beginPath();
			
			let r = size * 1.5, sx = x + size / 2;
			
			ctx.lineJoin = "bevel";
			
			ctx.moveTo(sx, y + size / 6);
			ctx.quadraticCurveTo(sx - r, y + size / 2, sx, y + size * 5 / 6);
			ctx.quadraticCurveTo(x + size + 10, y + size / 2, sx, y + size / 6);
		
			ctx.closePath();
			
			ctx.fill();
			ctx.stroke();
        
            // Draw the eyes
        
            ctx.fillStyle = MOUSE_EYE_COLOR;
        
            ctx.beginPath();
            ctx.arc(x + 3, y + size / 2.5, 2, 0, 2 * PI);
            ctx.arc(x + 3, y + size / 1.65, 2, 0, 2 * PI);
            ctx.closePath();
        
            ctx.fill();
        
            // Draw the tail
        
            ctx.fillStyle = MOUSE_TAIL_COLOR;
        
            ctx.beginPath();
            ctx.moveTo(x + size - 2, y + size / 2.5);
            ctx.lineTo(x + size * 1.5, y + size / 2);
            ctx.lineTo(x + size - 2, y + size / 1.75);
            ctx.closePath();
        
            ctx.fill();
            ctx.stroke();
			
		ctx.restore();
	}
};

// Create the game states

function restartGame()
{
	Snake.reset();
	Mouse.changeLocation();
	Scoreboard.reset();
	
	enterState("countdown");
}

addState("start", {
	tick: 0,
	
	directions: ["w","a","s","d"],
	
	directionChangeDelay: 60,
	
	keys: {
		enter: "countdown"
	},
	
	enter: function()
	{
		this.tick = 0;
		
		Snake.reset(Math.floor(CELLS_H * 0.5));
		Scoreboard.reset();
		
		Mouse.changeLocation();
	},
	
	changeDirection: function()
	{
		let key = randItem(this.directions);
		
		if(key == this.direction)
			this.changeDirection()
		else
			psuedoKeys[key] = true;
	},
	
	update: function()
	{		
		if(++this.tick > this.directionChangeDelay)
		{
			this.changeDirection();
			
			this.tick = 0;
		}
		
        Mouse.update();
		Snake.update();
		
		psuedoKeys = {};
	},
	
    draw: function()
	{
		Mouse.draw();
		Snake.draw();
		Scoreboard.draw();
		
		ctx.fillStyle = "black";
		ctx.font = "bold 70px 'Times New Roman'";
		
		displayText("SNAKE", 0, -HEIGHT / 3);
		
		ctx.fillStyle = this.tick > 40 ? "transparent" : "black";
		ctx.font = "35px 'Times New Romans'";
		
		displayText("Press ENTER to start");
		
		ctx.fillStyle = "black";
		ctx.font = "bold 25px 'Times New Roman'";
		
		displayText("Use W A S D or the Arrow Keys to control the Snake", 0, HEIGHT / 3);
	},
	
	exit: () => Snake.reset()
});

addState("countdown", {
	tick: 0,
	count: 3,
	
	enter: function()
	{
		this.count = 3;
	},
	
	update: function()
	{
		if(++this.tick > 60)
		{
			this.count--;
			
			if(this.count < 0)
			{
				enterState("playing");
				
				this.count = 0;
			}
			
			this.tick = 0;
		}
	},
	
	draw: function()
	{
		Snake.draw();
		Scoreboard.draw();
		
		ctx.font = "100px 'Times New Roman'";
		displayText(this.count || "START");
	}
});

addState("playing", {
    keys: {
        p: "paused"
    },
	
	enter: () => Mouse.changeLocation(),
    
    update: () => {
	   Mouse.update();
       Snake.update();
    },
    
    draw: () => {
        Mouse.draw();
        Snake.draw();
        Scoreboard.draw();
    }
});

addState("paused", {
    keys: {
        p: "playing",
        r: restartGame
    },
    
    draw: () => {
        Snake.draw();
        Mouse.draw();
        Scoreboard.draw();
        
        ctx.fillStyle = "black";
        ctx.font = "60px 'Times New Roman'";
        
        displayText("PAUSED");
    }
});

addState("gameover", {
	keys: {
		r: restartGame,
		escape: "start"
	},
	
	update: () => Mouse.update(),
	
    draw: () => {
        Snake.draw();
        Mouse.draw();
        Scoreboard.draw();
        
        let gameOverText = "GAME OVER";
        
        ctx.fillStyle = "black";
        ctx.font = "60px 'Times New Roman'";
        
        displayText("GAME OVER");
        
        ctx.font = "25px 'Times New Roman'";
        displayText("Press R to restart", 0, 60);
        
        displayText("Press ESC to exit", 0, 85);
    }
});

enterState("start");

// Create and initialize the game loop

function loop()
{
    requestAnimationFrame(loop);
    
    clearScreen();
    
    let state = currentState;
    
    if(state)
    {
        if(state.update)
            state.update();
        
        if(state.draw)
            state.draw();
    }
}

loop();

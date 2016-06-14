var vshader_src = 
"precision mediump float;\n"
+"uniform vec2 uScale;\n"
+"uniform float uTimer;\n"
+"attribute vec2 aPos;\n"
+"varying vec2 vUV;\n"
+"void main() {\n"
+"  vUV = vec2(sin(0.1*uTimer+0.1*aPos.x),sin(0.08*uTimer+0.12*aPos.y));\n"
+"	gl_Position = vec4(\n"
+"		-1.0 + 2.0*aPos.x/uScale.x,\n"
+"		 1.0 - 2.0*aPos.y/uScale.y,\n"
+"		0.0, 1.0);\n"
+"}\n";

var fshader_src =
"precision mediump float;\n"
+"uniform sampler2D uTex1;\n"

//+"uniform vec4 uColor;\n"
+"varying vec2 vUV;\n"
+"void main() {\n"
+"	gl_FragColor = texture2D(uTex1, vUV);\n"
+"}\n";




var spritevs_src = 
"// draw single sprite using triangle or triangle strip\n"
+"precision mediump float;\n"
+"uniform vec2 uScale;\n"
+"uniform vec2 uObjScale;\n"
+"attribute vec2 aObjCen;\n"
+"attribute float aObjRot;\n"
+"\n"
+"// point indexes, always 0..3\n"
+"// 0 = topleft\n"
+"// 1 = bottomleft\n"
+"// 2 = topright\n"
+"// 3 = bottomright\n"
+"attribute float aIdx;\n"
+"\n"
+"varying vec2 uv;\n"
+"\n"
+"void main(void) {\n"
+"	// find uvs corresponding to index\n"
+"	if (aIdx==0.0) {\n"
+"		uv = vec2(0.0,0.0);\n"
+"	} else if (aIdx==1.0) {\n"
+"		uv = vec2(1.0,0.0);\n"
+"	} else if (aIdx==2.0) {\n"
+"		uv = vec2(0.0,1.0);\n"
+"	} else { // 3.0\n"
+"		uv = vec2(1.0,1.0);\n"
+"	}\n"
+"	vec2 pos = vec2(\n"
+"		aObjCen.x + sin(aObjRot)*uObjScale.y*(-0.5 + uv.y)\n"
+"				  + cos(aObjRot)*uObjScale.x*(-0.5 + uv.x),\n"
+"		aObjCen.y + cos(aObjRot)*uObjScale.y*(-0.5 + uv.y)\n"
+"			      - sin(aObjRot)*uObjScale.x*(-0.5 + uv.x)\n"
+"	);\n"
+"\n"
+"	gl_Position = vec4(\n"
+"		-1.0 + 2.0*pos.x/uScale.x,\n"
+"		 1.0 - 2.0*pos.y/uScale.y,\n"
+"		0.0, 1.0);\n"
+"}\n"
;


var spritefs_src =
"precision mediump float;\n"
+"uniform sampler2D uTex1;\n"
+"\n"
+"varying vec2 uv;\n"
+"\n"
+"void main(void) {\n"
+"	gl_FragColor = texture2D(uTex1, uv);\n"
+"	if (gl_FragColor.a < 0.5) discard;\n"
+"}\n"
;




// GL

var shaderprogramid;

var posbuffer,rotbuffer,idxbuffer;

var NROBJ=40000;
// 6 verts per sprite
var spritepos = new Float32Array(NROBJ*12); // 2 coords per vert
var spriterot = new Float32Array(NROBJ*6);
var spriteidx = new Float32Array(NROBJ*6);

var birdtexture, titletexture;

// canvas

var width=800, height=480;

var realwidth=800, realheight=480;

var canvas;

var gl;

var mousex=width/2, mousey=height/2;
var mouseout = true;

// game logic
var sensitivity = 2.5;

var timer = 0;

var playerx = width/2;
var playery = height/2;

var mousestartx=mousex,mousestarty=mousey;
var prevmouseout=true;

var gameobjs = [];

function gameobject(x,y,angle) {
	this.x = x;
	this.y = y;
	this.angle = angle;
	var speed = random(0.5,2.0);
	this.xspeed = Math.sin(angle)*speed;
	this.yspeed = Math.cos(angle)*speed;
}

function resizeCanvas() {
	var canvas = document.getElementById("game-canvas");
	canvas.style.width = window.innerWidth;
	canvas.style.height = window.innerHeight;
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	realwidth = window.innerWidth;
	realheight = window.innerHeight;
}


function _GLStart() {
	canvas = document.getElementById("game-canvas");
	canvas.addEventListener("mousemove", mymousemovehandler,false);
	canvas.addEventListener("mouseup", mymouseuphandler,false);
	canvas.addEventListener("mousedown", mymousedownhandler,false);
	canvas.addEventListener("mouseout", mymouseouthandler,false);
	gl = canvas.getContext("webgl", {antialias:false});
	window.addEventListener('resize', resizeCanvas, false);
	resizeCanvas();

	// compile shaders
	vshaderid = gl.createShader(gl.VERTEX_SHADER);
	fshaderid = gl.createShader(gl.FRAGMENT_SHADER);
	//compileShader(0,vshaderid,vshader_src);
	//compileShader(1,fshaderid,fshader_src);
	compileShader(0,vshaderid,spritevs_src);
	compileShader(1,fshaderid,spritefs_src);
	// create program
	shaderprogramid = gl.createProgram();
	gl.attachShader(shaderprogramid, vshaderid);
	gl.attachShader(shaderprogramid, fshaderid);
	gl.linkProgram(shaderprogramid);

	// is getProgramiv, with return value as third parameter
	//if (!gl.getProgramParameter(shaderprogramid, gl.LINK_STATUS)) {
	//	throw "Could not initialise shaders";
	//}

	gl.viewport(0, 0, realwidth,realheight);
	gl.disable(gl.BLEND);
	//gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	posbuffer = gl.createBuffer();
	rotbuffer = gl.createBuffer();
	idxbuffer = gl.createBuffer();

	birdtexture = initTexture(gl,"images/flappybird-6b-16.png",false,false);
	titletexture = initTexture(gl,"images/glesjs-title-256.png",true,false);

	// init objects
	for (var i=0; i<NROBJ; i++) {
		gameobjs[i] = new gameobject(
			random(0,width),
			random(0,height),
			random(0,6.15) );
		// uv indexes are fixed. We generate the vbo once.
		// TRI1        TRI2
		// 00--01        01
		//  | /         / |
		//  10        10--11
		spriteidx[6*i + 0] = 0;
		spriteidx[6*i + 1] = 1;
		spriteidx[6*i + 2] = 2;
		spriteidx[6*i + 3] = 1;
		spriteidx[6*i + 4] = 2;
		spriteidx[6*i + 5] = 3;
	}
	// immutable
	setAttribute(shaderprogramid,idxbuffer,"aIdx",NROBJ*6,1,spriteidx);

	DrawFrame();

}

function DrawFrame() {
	window.requestAnimationFrame(DrawFrame);
	gl.clearColor(0.4,0.4,0.5,1);
	gl.clear(gl.COLOR_BUFFER_BIT);
	timer ++;
	if (timer >= 999999) timer=0;

	//console.log("### Start draw: "+gl.getError());
	gl.useProgram(shaderprogramid);

	var loc = gl.getUniformLocation(shaderprogramid, "uScale");
	gl.uniform2f(loc, width, height);

	var loc = gl.getUniformLocation(shaderprogramid, "uObjScale");
	gl.uniform2f(loc, 16, 16);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, birdtexture);
	gl.uniform1i(gl.getUniformLocation(shaderprogramid, "uTex1"), 0);

	//var loc = gl.getUniformLocation(shaderprogramid, "uTimer");
	//gl.uniform1f(loc, timer);

	var cenx,ceny;
	for (var i=0; i<NROBJ; i++) {
		cenx = gameobjs[i].x;// + (0.14*i)*Math.sin(0.2*i+timer*0.015);
		ceny = gameobjs[i].y;// + (0.13*i)*Math.sin(0.2*i+timer*0.017);
		for (var j=0; j<6; j++) {
			spritepos[12*i + 2*j    ] = cenx;
			spritepos[12*i + 2*j + 1] = ceny;
			spriterot[6*i + j] = gameobjs[i].angle - Math.PI/2;
		}
		// move
		var xspeed = gameobjs[i].xspeed;
		var yspeed = gameobjs[i].yspeed;
		gameobjs[i].x += xspeed;
		gameobjs[i].y += yspeed;
		// bounce
		if (cenx<0) {
			if (xspeed < 0) gameobjs[i].xspeed = -xspeed;
			gameobjs[i].angle = Math.atan2(yspeed,-xspeed) - Math.PI/2;
		}
		if (ceny<0) {
			if (yspeed < 0) gameobjs[i].yspeed = -yspeed;
			gameobjs[i].angle = Math.atan2(-yspeed,xspeed) + Math.PI/2;
		}
		if (cenx>width) {
			if (xspeed > 0) gameobjs[i].xspeed = -xspeed;
			gameobjs[i].angle = Math.atan2(yspeed,-xspeed) - Math.PI/2;
		}
		if (ceny>height) {
			if (yspeed > 0) gameobjs[i].yspeed = -yspeed;
			gameobjs[i].angle = Math.atan2(-yspeed,xspeed) + Math.PI/2;
		}
	}
	setAttribute(shaderprogramid,posbuffer,"aObjCen",NROBJ*6,2,spritepos);
	setAttribute(shaderprogramid,rotbuffer,"aObjRot",NROBJ*6,1,spriterot);
	// re-activate but do not write data
	setAttribute(shaderprogramid,idxbuffer,"aIdx",NROBJ*6,1);

	gl.drawArrays(gl.TRIANGLES, 0, NROBJ*6);


	// title
	for (var i=0; i<6; i++) {
		spritepos[2*i] = width/2;
		spritepos[2*i + 1] = height/4;
		spriterot[i] = 0;
	}

	// uScale remains the same

	var loc = gl.getUniformLocation(shaderprogramid, "uObjScale");
	gl.uniform2f(loc, 256,100);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, titletexture);
	gl.uniform1i(gl.getUniformLocation(shaderprogramid, "uTex1"), 0);

	setAttribute(shaderprogramid,posbuffer,"aObjCen",6,2,spritepos);
	setAttribute(shaderprogramid,rotbuffer,"aObjRot",6,1,spriterot);
	setAttribute(shaderprogramid,idxbuffer,"aIdx",6,1);

	gl.drawArrays(gl.TRIANGLES, 0, 6);

	//console.log("### End draw: "+gl.getError());
	//console.log("Err 2: "+gl.getError());
	if (prevmouseout && !mouseout) {
		// reset offset
		mousestartx = mousex;
		mousestarty = mousey;
	} else if (!mouseout) {
		// add offset to position
		playerx += sensitivity * (mousex - mousestartx);
		playery += sensitivity * (mousey - mousestarty);
		mousestartx = mousex;
		mousestarty = mousey;
	}
	prevmouseout = mouseout;
	gl.finish();
	window.stats.update();
}



function mymousemovehandler(event) {
	var rect = canvas.getBoundingClientRect();
	mousex = (event.clientX - rect.left) / (realwidth / width);
	mousey = (event.clientY - rect.top) / (realheight / height);
}

function mymousedownhandler(event) {
	mouseout = false;
}

function mymouseuphandler(event) {
}

function mymouseouthandler(event) {
	mouseout = true;
}

function compileShader(type,shader,shader_src) {
	gl.shaderSource(shader, shader_src);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		throw "shader "+type+" compile error: "+gl.getShaderInfoLog(shader);
	}
}



/** Load array of floats into shader attribute.
* @param {string} varname - name of shader attribute
* @param {int} numitems - number of vertices
* @param {int} itemsize - size of single item (in # floats)
* @param {float[]} values - flat array[numitems*itemsize] of values to load
*/
function setAttribute(programid,buffer,varname,numitems,itemsize,values) {
	var attribute = gl.getAttribLocation(programid, varname);
	gl.enableVertexAttribArray(attribute);
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	if (values) {
		gl.bufferData(gl.ARRAY_BUFFER, values,//new Float32Array(values),
			gl.DYNAMIC_DRAW);
	}
	//buffer.itemSize = itemsize;
	//buffer.numItems = numitems;

	gl.vertexAttribPointer(attribute, itemsize, gl.FLOAT,
		false, 0, 0);
}


// returns texture id
function initTexture(gl,imageurl,smooth,wrap) {
	var texture = gl.createTexture();
	var image = new Image();
	image.onload = function() {
		gl.bindTexture(gl.TEXTURE_2D, texture);
		// XXX image.src -> image
		gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA, gl.UNSIGNED_BYTE,
			image);
		if (smooth) {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		} else {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		}
		if (wrap) {
			gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S, gl.REPEAT);
			gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T, gl.REPEAT);
		} else {
			gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		}
		gl.bindTexture(gl.TEXTURE_2D, null);
	};
	image.src = imageurl;
	return texture;
}



/**
* @param {float} min - lower bound
* @param {float} max - upper bound exclusive
* @return {float}
*/
function random(min, max) {
	return min + Math.random()*(max-min);
}
/**
* @param {float} min - lower bound
* @param {float} max - upper bound exclusive
* @param {float} interval - step size
* @return {float}
*/
function randomstep(min, max, interval) {
	var steps = Math.floor(0.00001 + (max-min)/interval);
	return min + ( Math.floor(Math.random()*(steps+0.99)) )*interval;
}




"Game loaded";

var gl;

function initGL(canvas) {
	try {
		gl = canvas.getContext("experimental-webgl");
		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;
	} catch (e) {
	}
	if (!gl) {
		alert("Could not initialise WebGL, sorry :-(");
	}
}

function getShader(gl, id) {
	var shaderScript = document.getElementById(id);
	if (!shaderScript) {
		return null;
	}

	var str = "";
	var k = shaderScript.firstChild;
	while (k) {
		if (k.nodeType == 3) {
			str += k.textContent;
		}
		k = k.nextSibling;
	}

	var shader;
	if (shaderScript.type == "x-shader/x-fragment") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderScript.type == "x-shader/x-vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;
	}

	gl.shaderSource(shader, str);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}

var shaderProgram;

function initShaders() {
	var fragmentShader = getShader(gl, "per-fragment-lighting-fs");
	var vertexShader = getShader(gl, "per-fragment-lighting-vs");

	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Could not initialise shaders");
	}

	gl.useProgram(shaderProgram);

	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram,
			"aVertexPosition");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

	shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram,
			"aVertexNormal");
	gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

	shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram,
			"aTextureCoord");
	gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram,
			"uPMatrix");
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram,
			"uMVMatrix");
	shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram,
			"uNMatrix");
	shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram,
			"uSampler");
	shaderProgram.materialShininessUniform = gl.getUniformLocation(
			shaderProgram, "uMaterialShininess");
	shaderProgram.showSpecularHighlightsUniform = gl.getUniformLocation(
			shaderProgram, "uShowSpecularHighlights");
	shaderProgram.useTexturesUniform = gl.getUniformLocation(shaderProgram,
			"uUseTextures");
	shaderProgram.useLightingUniform = gl.getUniformLocation(shaderProgram,
			"uUseLighting");
	shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram,
			"uAmbientColor");
	shaderProgram.pointLightingLocationUniform = gl.getUniformLocation(
			shaderProgram, "uPointLightingLocation");
	shaderProgram.pointLightingSpecularColorUniform = gl.getUniformLocation(
			shaderProgram, "uPointLightingSpecularColor");
	shaderProgram.pointLightingDiffuseColorUniform = gl.getUniformLocation(
			shaderProgram, "uPointLightingDiffuseColor");
}

function handleLoadedTexture(texture) {
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
			texture.image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
			gl.LINEAR_MIPMAP_NEAREST);
	gl.generateMipmap(gl.TEXTURE_2D);

	gl.bindTexture(gl.TEXTURE_2D, null);
}

var earthTexture;
var slopeTexture;

function initTextures() {
	slopeTexture = gl.createTexture();
	slopeTexture.image = new Image();
	slopeTexture.image.onload = function() {
		handleLoadedTexture(slopeTexture)
	}
	slopeTexture.image.src = "arroway.de_metal+structure+06_d100_flat.jpg";
}

var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();

function mvPushMatrix() {
	var copy = mat4.create();
	mat4.set(mvMatrix, copy);
	mvMatrixStack.push(copy);
}

function mvPopMatrix() {
	if (mvMatrixStack.length == 0) {
		throw "Invalid popMatrix!";
	}
	mvMatrix = mvMatrixStack.pop();
}

function setMatrixUniforms() {
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

	var normalMatrix = mat3.create();
	mat4.toInverseMat3(mvMatrix, normalMatrix);
	mat3.transpose(normalMatrix);
	gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
}

function degToRad(degrees) {
	return degrees * Math.PI / 180;
}

var slopeVertexPositionBuffer;
var slopeVertexNormalBuffer;
var slopeVertexTextureCoordBuffer;
var slopeVertexIndexBuffer;

function handleLoadedModel(slopeData) {
	slopeVertexNormalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, slopeVertexNormalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(slopeData.vertexNormals),
			gl.STATIC_DRAW);
	slopeVertexNormalBuffer.itemSize = 3;
	slopeVertexNormalBuffer.numItems = slopeData.vertexNormals.length / 3;

	slopeVertexTextureCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, slopeVertexTextureCoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(
			slopeData.vertexTextureCoords), gl.STATIC_DRAW);
	slopeVertexTextureCoordBuffer.itemSize = 2;
	slopeVertexTextureCoordBuffer.numItems = slopeData.vertexTextureCoords.length / 2;

	slopeVertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, slopeVertexPositionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER,
			new Float32Array(slopeData.vertexPositions), gl.STATIC_DRAW);
	slopeVertexPositionBuffer.itemSize = 3;
	slopeVertexPositionBuffer.numItems = slopeData.vertexPositions.length / 3;

	slopeVertexIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, slopeVertexIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(slopeData.indices),
			gl.STATIC_DRAW);
	slopeVertexIndexBuffer.itemSize = 1;
	slopeVertexIndexBuffer.numItems = slopeData.indices.length;

}

function loadModel() {
	var request = new XMLHttpRequest();
	request.open("GET", "Teapot.json");
	request.onreadystatechange = function() {
		if (request.readyState == 4) {
			handleLoadedModel(JSON.parse(request.responseText));
		}
	}
	request.send();
}

var teapotAngle = 180;

function drawScene() {
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	if (slopeVertexPositionBuffer == null /*|| slopeVertexNormalBuffer == null*/
			|| slopeVertexTextureCoordBuffer == null
			|| slopeVertexIndexBuffer == null) {
		return;
	}

	mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0,
			pMatrix);

	gl.uniform1i(shaderProgram.showSpecularHighlightsUniform, 1);
	gl.uniform1i(shaderProgram.useLightingUniform, 1);

	gl.uniform3f(shaderProgram.ambientColorUniform,0.2,0.2,0.2);
	gl.uniform3f(shaderProgram.pointLightingLocationUniform,0,0,0);
	gl.uniform3f(shaderProgram.pointLightingSpecularColorUniform,0.8,0.8,0.8);
	gl.uniform3f(shaderProgram.pointLightingDiffuseColorUniform,0.8,0.8,0.8);
	
	gl.uniform1i(shaderProgram.useTexturesUniform,1);
	
	
	mat4.identity(mvMatrix);

	mat4.translate(mvMatrix, [ -5, 0, -30 ]);
//	mat4.rotate(mvMatrix, degToRad(30.4), [ 1, 0, -1 ]);
	mat4.rotate(mvMatrix, degToRad(23.4), [ 1, 0, 0 ]);
	mat4.rotate(mvMatrix, degToRad(teapotAngle), [ 0, 1, 0 ]);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, slopeTexture);

	gl.uniform1i(shaderProgram.samplerUniform, 0);

	gl.uniform1f(shaderProgram.materialShininessUniform, 32.0);

	gl.bindBuffer(gl.ARRAY_BUFFER, slopeVertexPositionBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
			slopeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, slopeVertexTextureCoordBuffer);
	gl.vertexAttribPointer(shaderProgram.textureCoordAttribute,
			slopeVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, slopeVertexNormalBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
			slopeVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, slopeVertexIndexBuffer);
	setMatrixUniforms();
	gl.drawElements(gl.TRIANGLES, slopeVertexIndexBuffer.numItems,
			gl.UNSIGNED_SHORT, 0);
}
var lastTime = 0;

function animate() {
	var timeNow = new Date().getTime();
	if (lastTime != 0) {
		var elapsed = timeNow - lastTime;

		teapotAngle += 0.05 * elapsed;
	}
	lastTime = timeNow;
}

function tick() {
	requestAnimFrame(tick);
	drawScene();
	animate();
}

function webGLStart() {
	var canvas = document.getElementById("landscape-canvas");
	initGL(canvas);
	initShaders();
	initTextures();
	loadModel();

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);

	tick();
}

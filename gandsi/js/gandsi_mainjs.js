var canvas = document.getElementById("renderCanvas");
var engine = new BABYLON.Engine(canvas, true);
/*Player Var*/
var play = false;
var moveSpeed = 3;
var moveSpeedShift = 5;
var playerHeight = 2;
var active = false;
var arrayNumber;
var arrayZahl = 1;
var room2 = false;
var room3 = false;
var hover = false;
var doorOneOpened = false;
var allowToInt = true;
var notPressed = true;
var schalterZahl = 23;
var currentZahlSchalter = 0;
var room2Scene = false;
var room3Scene = false;
var endScene = false;
var timesPlayed = 0;
var door1Plane;
var door2Plane;
var player;
var resetV = false;
var secretRaumDoor;
var createSceneMenu = function(){
	console.log("scene1");
	 var sceneMenu = new BABYLON.Scene(engine);
	 var camera = new BABYLON.FreeCamera("FreeCamera", new BABYLON.Vector3(0, playerHeight, -15), sceneMenu);
	 
	camera.attachControl(canvas);
	camera.setTarget(BABYLON.Vector3.Zero());
	var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
	var button = BABYLON.GUI.Button.CreateSimpleButton("but", "Play");
	button.width = 0.2;
    button.height = "40px";
    button.color = "white";
    button.background = "green";
	button.onPointerClickObservable.add(function () {
		play = true;
	});
    advancedTexture.addControl(button);   
	
	 return sceneMenu;
}

var createScene = function () {
    var scene = new BABYLON.Scene(engine);

    //lights
    var light0 = new BABYLON.HemisphericLight("l1", new BABYLON.Vector3(0,5,0), scene);
	//light0.intensity = 0.7;
	
	//camera
    var camera = new BABYLON.UniversalCamera("FreeCamera", new BABYLON.Vector3(0, playerHeight, -15), scene);
	
    camera.attachControl(canvas, true);
	
	camera.inertia = 0; //set camera smoothing to 0
	camera.speed = moveSpeed;
	
	//movement camera
    camera.keysUp.push(87); 	//W
    camera.keysDown.push(83); 	//S
    camera.keysLeft.push(65); 	//A
    camera.keysRight.push(68); 	//D
	
	//material
	var myMaterial = new BABYLON.StandardMaterial("myMaterial", scene);
	myMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
	
	var matRot = new BABYLON.StandardMaterial("matRot", scene);
	matRot.diffuseColor = new BABYLON.Color3(1, 0, 0);
	
	var matGruen = new BABYLON.StandardMaterial("matGruen", scene);
	matGruen.diffuseColor = new BABYLON.Color3(0, 1, 0);
	//myMaterial.backFaceCulling = false;
	
	var mat23 = new BABYLON.StandardMaterial("mat23", scene);
	var texture23 = new BABYLON.Texture("images/23_2.png", scene);
	mat23.diffuseTexture = texture23;
	mat23.diffuseTexture.hasAlpha = true;
	
	//TEXURE LOAD
	var matA = new BABYLON.StandardMaterial("matA", scene);
	matA.diffuseTexture = new BABYLON.Texture("images/a.png", scene);
	matA.diffuseTexture.hasAlpha = true;
	var matB = new BABYLON.StandardMaterial("matB", scene);
	matB.diffuseTexture = new BABYLON.Texture("images/b.png", scene);
	matB.diffuseTexture.hasAlpha = true;
	var matC = new BABYLON.StandardMaterial("matC", scene);
	matC.diffuseTexture = new BABYLON.Texture("images/c.png", scene);
	matC.diffuseTexture.hasAlpha = true;
	var matD = new BABYLON.StandardMaterial("matD", scene);
	matD.diffuseTexture = new BABYLON.Texture("images/d.png", scene);
	matD.diffuseTexture.hasAlpha = true;
	var matE = new BABYLON.StandardMaterial("matE", scene);
	matE.diffuseTexture = new BABYLON.Texture("images/e.png", scene);
	matE.diffuseTexture.hasAlpha = true;
	var matF = new BABYLON.StandardMaterial("matF", scene);
	matF.diffuseTexture = new BABYLON.Texture("images/f.png", scene);
	matF.diffuseTexture.hasAlpha = true;
	var matG = new BABYLON.StandardMaterial("matG", scene);
	matG.diffuseTexture = new BABYLON.Texture("images/g.png", scene);
	matG.diffuseTexture.hasAlpha = true;
	var matH = new BABYLON.StandardMaterial("matH", scene);
	matH.diffuseTexture = new BABYLON.Texture("images/h.png", scene);
	matH.diffuseTexture.hasAlpha = true;
	var matI = new BABYLON.StandardMaterial("matI", scene);
	matI.diffuseTexture = new BABYLON.Texture("images/i.png", scene);
	matI.diffuseTexture.hasAlpha = true;
	
	
	var secretRaumDoor = new BABYLON.Mesh.CreatePlane("secretRaumDoor",40,scene);
	secretRaumDoor.position = new BABYLON.Vector3(0,0,-35);
	secretRaumDoor.rotation.x = grad2Rad(180);
	
    //Ground/Map/World
	roomMaker1();
   
	
	 player = new BABYLON.Mesh.CreateSphere("player",10,10,scene);
	player.position = camera.position;
	
	
	
	//text boxen
	var box23 = new BABYLON.Mesh.CreateBox("box23",7,scene);
	box23.position = new BABYLON.Vector3(-5,10,37.7);
	box23.material = mat23;
	
	var boxA = new BABYLON.Mesh.CreateBox("boxA",2,scene);
	boxA.position = new BABYLON.Vector3(-25,5,35.7);
	boxA.material = matA;
	var boxB = new BABYLON.Mesh.CreateBox("boxB",2,scene);
	boxB.position = new BABYLON.Vector3(-20,5,35.7);
	boxB.material = matB;
	var boxC = new BABYLON.Mesh.CreateBox("boxC",2,scene);
	boxC.position = new BABYLON.Vector3(-15,5,35.7);
	boxC.material = matC;
	var boxD = new BABYLON.Mesh.CreateBox("boxD",2,scene);
	boxD.position = new BABYLON.Vector3(-10,5,35.7);
	boxD.material = matD;
	var boxE = new BABYLON.Mesh.CreateBox("boxE",2,scene);
	boxE.position = new BABYLON.Vector3(-5,5,35.7);
	boxE.material = matE;
	var boxF = new BABYLON.Mesh.CreateBox("boxF",2,scene);
	boxF.position = new BABYLON.Vector3(0,5,35.7);
	boxF.material = matF;
	var boxG = new BABYLON.Mesh.CreateBox("boxG",2,scene);
	boxG.position = new BABYLON.Vector3(5,5,35.7);
	boxG.material = matG;
	var boxH = new BABYLON.Mesh.CreateBox("boxH",2,scene);
	boxH.position = new BABYLON.Vector3(10,5,35.7);
	boxH.material = matH;
	var boxI = new BABYLON.Mesh.CreateBox("boxI",2,scene);
	boxI.position = new BABYLON.Vector3(15,5,35.7);
	boxI.material = matI;
	
	
	//button
	var podest = new BABYLON.Mesh.CreateBox("podest",0.8,scene);
	podest.scaling = new BABYLON.Vector3(0.5,2.0,0.5);
	podest.material = matGruen;
	podest.position = new BABYLON.Vector3(999,-1,20);
	var buttonDoor = new BABYLON.Mesh.CreateSphere("buttonDoor", 10,0.3, scene);
	buttonDoor.parent = podest;
	buttonDoor.scaling = new BABYLON.Vector3(1.8,1,1.8);
	buttonDoor.position = new BABYLON.Vector3(0,0.3,0);
	//Create a scaling animation at 30 FPS
    var animationSchalter = new BABYLON.Animation(
		"tutoAnimation",
		"position",
		30,
		BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
		BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
	);
	// An array with all animation keys
	var anKeys = []; 

	//button animation
	var numberOfKeyframes = 200;
	var alpha = 0;
	
	for (var t = 0; t < numberOfKeyframes; t++){
		var x = -30;
    	var y = -1  * Math.cos(alpha);
    	var z = 15;
		anKeys.push({
	        frame: t,
	        value: new BABYLON.Vector3(x, y, z)
		});
		
		alpha += 0.15;
	}
	
	//console.log(anKeys);
	animationSchalter.setKeys(anKeys);
	podest.animations = [];
	podest.animations.push(animationSchalter);
	
	//schalter
	var schalter = [9];
	
	for (var i = 0; i < 9; i++){
		schalter[i] = new BABYLON.Mesh.CreateBox("schalter" + i, 2, scene);
		schalter[i].position = new BABYLON.Vector3(-25 + (i * 5), 2, 35 );
		schalter[i].material = matRot;
		schalter[i].arrayNumber = arrayZahl;
		arrayZahl++;
	}
	
    //Set gravity for the scene
    scene.gravity = new BABYLON.Vector3(0, -0.9, 0);

    //Enable Collisions
    scene.collisionsEnabled = true;

    //Then apply collisions and gravity to the active camera
    camera.checkCollisions = true;
    camera.applyGravity = true;

    //Set the ellipsoid around the camera (player)
    camera.ellipsoid = new BABYLON.Vector3(2, 1, 2);
	//camera.ellipsoidOffset = new BABYLON.Vector3(2, 2, 2);

    //collide on
	podest.checkCollisions = true;
	
	//camera lock Browser
	scene.onPointerDown = function (evt) {
		canvas.requestPointerLock = canvas.requestPointerLock || canvas.msRequestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock || false;
		if (canvas.requestPointerLock && play) {
			canvas.requestPointerLock();
		}
	};

    
    //key event
	const keys = {}
		window.addEventListener('keydown', e => {
			keys[e.keyCode] = true
			if (e.keyCode === 9) e.preventDefault()
		})
		window.addEventListener('keyup', e => {
			keys[e.keyCode] = false
			if (e.keyCode === 9) e.preventDefault()
		})
	scene.registerBeforeRender(e => {
		if (keys[16]) {
			camera.speed = moveSpeedShift; //on shift faster
		}else{
			camera.speed = moveSpeed;
		}
		
	});
	var mousePressed = false;
	window.addEventListener("click", function () {	
		if(hover){
			mousePressed = true;
		}
		
	});
	
	//hand gui
	var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
	var hand = new BABYLON.GUI.Image("inter", "images/hand.png");  
	hand.width = 0.1;
	hand.height = "60px";
	hand.width = "60px";
	advancedTexture.addControl(hand); 
	
	//raycast
	var ray = new BABYLON.Ray();
	var rayHelper = new BABYLON.RayHelper(ray);
	
	var localMeshDirection = new BABYLON.Vector3(0, 0, 1);
	var localMeshOrigin = new BABYLON.Vector3(0, 0, 0);
	
	rayHelper.attachToMesh(camera, localMeshDirection, localMeshOrigin, 8);
	rayHelper.show(scene);
	var sphere = BABYLON.MeshBuilder.CreateSphere('', {diameter: .50}, scene);
    sphere.setEnabled(false);
	
	scene.registerBeforeRender(function() {
		//for(var j = 0; j = 9; j++){
		if(camera.position.x <= -36) {
			camera.position = new BABYLON.Vector3(0,playerHeight,0);
			player.position = camera.position;
			room2Scene = true;
		}
		var hitInfo = ray.intersectsMeshes(schalter);
		var buttonInfo = ray.intersectsMeshes([buttonDoor, podest]);
		//}
		if(buttonInfo.length){
			hover = true;
			if(mousePressed){
				if(doorOneOpened == false){
					openDoor(1);
					doorOneOpened = true;
				}
			}
		}else{
			hover = false;
		}
		
		//console.log(hitInfo.length);
		if(hitInfo.length){
			hover = true;
			if(notPressed){
				mousePressed = false;
				notPressed = false;
			}
			//sphere.setEnabled(true);
			//console.log(currentZahlSchalter);
			if(mousePressed && allowToInt){
				mousePressed = false;
				//console.log("pressed");
				if(hitInfo[0].pickedMesh.active){
					hitInfo[0].pickedMesh.active = false;
					hitInfo[0].pickedMesh.material = matRot;
					currentZahlSchalter -= hitInfo[0].pickedMesh.arrayNumber;
				}else{
					hitInfo[0].pickedMesh.material = matGruen;
					currentZahlSchalter += hitInfo[0].pickedMesh.arrayNumber;
					hitInfo[0].pickedMesh.active = true;
				}
			}
			//sphere.position.copyFrom(hitInfo[0].pickedPoint);
		}else{
			if(allowToInt){
				hover = false;
				sphere.setEnabled(false);
			}
			
		}
		if(currentZahlSchalter == schalterZahl){
			scene.beginAnimation(podest, 0, 32, false);
			//soundPlay Level 1 Fertig
			currentZahlSchalter = 9999;
			allowToInt = false;
		}
		if(hover){
			
			advancedTexture.isForeground = true;
		}else{
			advancedTexture.isForeground = false;
		}
		if(timesPlayed >= 3){                  //wie oft
			secretRaumDoor.dispose();
			roomMakerSecret();
		}
	});
	
	//gui load
	gui();
	
	
	//return scene
    return scene;
}

var createScene2 = function(){
	var scene1 = new BABYLON.Scene(engine);
	var robotspeed = 1;
	
	var light0 = new BABYLON.HemisphericLight("l1", new BABYLON.Vector3(0,5,0), scene1);
	var camera = new BABYLON.UniversalCamera("FreeCamera", new BABYLON.Vector3(30, playerHeight, 0), scene1);
    camera.attachControl(canvas, true);
	
	camera.inertia = 0; //set camera smoothing to 0
	camera.speed = moveSpeed;
	
	var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
	var hand = new BABYLON.GUI.Image("inter", "images/hand.png");  
	hand.width = 0.1;
	hand.height = "60px";
	hand.width = "60px";
	advancedTexture.addControl(hand); 
	
	//movement camera
    camera.keysUp.push(87); 	//W
    camera.keysDown.push(83); 	//S
    camera.keysLeft.push(65); 	//A
    camera.keysRight.push(68); 	//D
	
	
	var matGruen = new BABYLON.StandardMaterial("matGruen", scene1);
	matGruen.diffuseColor = new BABYLON.Color3(0, 1, 0);
	
	var podest = new BABYLON.Mesh.CreateBox("podest",0.8,scene1);
	podest.scaling = new BABYLON.Vector3(0.5,2.0,0.5);
	podest.material = matGruen;
	podest.position = new BABYLON.Vector3(-20,0,0);
	var buttonDoor = new BABYLON.Mesh.CreateSphere("buttonDoor", 10,0.3, scene1);
	buttonDoor.parent = podest;
	buttonDoor.scaling = new BABYLON.Vector3(1.8,1,1.8);
	buttonDoor.position = new BABYLON.Vector3(0,0.3,0);
	
	var player = new BABYLON.Mesh.CreateSphere("player",3,3,scene1);
	player.position = camera.position;
	var ground = new BABYLON.Mesh.CreateGround("ground",50,50,50,scene1);
	//Set gravity for the scene
    scene1.gravity = new BABYLON.Vector3(0, -0.9, 0);

    //Enable Collisions
    scene1.collisionsEnabled = true;

    //Then apply collisions and gravity to the active camera
    camera.checkCollisions = true;
    camera.applyGravity = true;

	ground.checkCollisions = true;
    //Set the ellipsoid around the camera (player)
    camera.ellipsoid = new BABYLON.Vector3(2, 1, 2);
	//camera.ellipsoidOffset = new BABYLON.Vector3(2, 2, 2);
	roomMaker2();
	var robot = [5];
	var speedRobot = [5];
	for (var i = 0; i < 5; i++){
		robot[i] =  BABYLON.Mesh.CreateBox("rob" + i,2,scene1);
		robot[i].scaling.y = 2;
		robot[i].position = new BABYLON.Vector3(0 + (5*i) ,1, -10 );
		//robot[i].checkCollisions = true;
		speedRobot[i] = Math.random() * 0.9;
		
	}
	BABYLON.SceneLoader.ImportMesh("","","blender/flarobo.babylon", scene1,
		function(newMeshes){
			newMeshes.forEach(function(mesh){
				console.log("succesfully load"); 
				scene1.registerBeforeRender(function() {
		         mesh.position = robot[1].position;
				});
			});
		});
	scene1.registerBeforeRender(function() {
		if(camera.position.x <= -36) {
			camera.position = new BABYLON.Vector3(28,playerHeight,0);
			player.position = camera.position;
			room3Scene = true;
			room2Scene = false;
		}
		//console.log(camera.position);
		for (var j = 0; j < 5; j++){
		 robot[j].position.z += speedRobot[j];
		 if((robot[j].position.z >= 35)){
			 speedRobot[j] = -speedRobot[j];
		 }
		 if((robot[j].position.z <= -35)){
			 speedRobot[j] = -speedRobot[j];
		 }
		if (robot[j].intersectsMesh(player, false)) {
				//respawn(30, 20, 0);
				console.log("hit");
				camera.position = new BABYLON.Vector3(30,playerHeight,0);
				player.position = camera.position;
			}
		}
	});
	
	
	var mousePressed = false;
	window.addEventListener("click", function () {	
		if(hover){
			mousePressed = true;
		}
		
	});
	var ray = new BABYLON.Ray();
	var rayHelper = new BABYLON.RayHelper(ray);
	
	var localMeshDirection = new BABYLON.Vector3(0, 0, 1);
	var localMeshOrigin = new BABYLON.Vector3(0, 0, 0);
	
	rayHelper.attachToMesh(camera, localMeshDirection, localMeshOrigin, 8);
	rayHelper.show(scene1);
	scene1.registerBeforeRender(function() {
	
		var buttonInfo = ray.intersectsMeshes([buttonDoor, podest]);
	
		if(buttonInfo.length){
			hover = true;
			if(mousePressed){
				openDoor(2);
				//console.log("openDoor2");
			}
		}else{
			mousePressed = false;
			hover = false;
		}
			
		if(hover){
			
			advancedTexture.isForeground = true;
		}else{
			advancedTexture.isForeground = false;
		}
	});
	gui();
	return scene1;
	
}
var createScene3 = function(){
	var scene2 = new BABYLON.Scene(engine);
	
	var light0 = new BABYLON.HemisphericLight("l1", new BABYLON.Vector3(0,5,0), scene2);
	var camera = new BABYLON.UniversalCamera("FreeCamera", new BABYLON.Vector3(30, playerHeight, 0), scene2);
    camera.attachControl(canvas, true);
	
	camera.inertia = 0; //set camera smoothing to 0
	camera.speed = moveSpeed;
	 
	//movement camera
    camera.keysUp.push(87); 	//W
    camera.keysDown.push(83); 	//S
    camera.keysLeft.push(65); 	//A
    camera.keysRight.push(68); 	//D
	
	var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
	var hand = new BABYLON.GUI.Image("inter", "images/hand.png");  
	hand.width = 0.1;
	hand.height = "60px";
	hand.width = "60px";
	advancedTexture.addControl(hand); 
	
	var matGruen = new BABYLON.StandardMaterial("matGruen", scene2);
	matGruen.diffuseColor = new BABYLON.Color3(0, 1, 0);
	
	var podest = new BABYLON.Mesh.CreateBox("podest",0.8,scene2);
	podest.scaling = new BABYLON.Vector3(0.5,2.0,0.5);
	podest.material = matGruen;
	podest.position = new BABYLON.Vector3(34,0,0);
	var buttonDoor = new BABYLON.Mesh.CreateSphere("buttonDoor", 10,0.3, scene2);
	buttonDoor.parent = podest;
	buttonDoor.scaling = new BABYLON.Vector3(1.8,1,1.8);
	buttonDoor.position = new BABYLON.Vector3(0,0.3,0);
	
	var player = new BABYLON.Mesh.CreateSphere("player",3,3,scene2);
	player.position = camera.position;
	var ground = new BABYLON.Mesh.CreateGround("ground",150,150,150,scene2);
	//Set gravity for the scene
	
	scene2.gravity = new BABYLON.Vector3(0, -0.9, 0);

    //Enable Collisions
    scene2.collisionsEnabled = true;

    //Then apply collisions and gravity to the active camera
    camera.checkCollisions = true;
    camera.applyGravity = true;

	ground.checkCollisions = true;
    //Set the ellipsoid around the camera (player)
    camera.ellipsoid = new BABYLON.Vector3(2, 1, 2);
	//camera.ellipsoidOffset = new BABYLON.Vector3(2, 2, 2);
	roomMaker3();
	
	var wallLeft = new BABYLON.Mesh.CreatePlane("wallLeft",175,scene2);
	wallLeft.position = new BABYLON.Vector3(0,0,-35);
	wallLeft.rotation.x = grad2Rad(180);
	
	var wallRight = new BABYLON.Mesh.CreatePlane("wallRight",175,scene2);
	wallRight.position = new BABYLON.Vector3(0,0,35);
	wallRight.rotation.z = grad2Rad(90);
	var ray = new BABYLON.Ray();
	var rayHelper = new BABYLON.RayHelper(ray);
	
	var localMeshDirection = new BABYLON.Vector3(0, 0, 1);
	var localMeshOrigin = new BABYLON.Vector3(0, 0, 0);
	
	rayHelper.attachToMesh(camera, localMeshDirection, localMeshOrigin, 8);
	rayHelper.show(scene2);
	
	var mousePressed = false;
	window.addEventListener("click", function () {	
		if(hover){
			mousePressed = true;
		}
		
	});
	
	var buttonPressed = false;
	
	scene2.registerBeforeRender(function() {
		if(!buttonPressed){
			wallRight.position.z -= 0.09;
			wallLeft.position.z += 0.09;
		}
		
		if ((wallRight.intersectsMesh(player, false)) || (wallLeft.intersectsMesh(player, false))  ){
			console.log("death");
			camera.position = new BABYLON.Vector3(30,playerHeight,0);
			player.position = camera.position;
			wallRight.position.z = 35;
			wallLeft.position.z = -35;
		}
		
		var buttonInfo = ray.intersectsMeshes([buttonDoor, podest]);
		
		if(buttonInfo.length){
			hover = true;
			if(mousePressed){
				buttonPressed = true;
				openDoor(3);
				//console.log("openDoor2");
			}
		}else{
			mousePressed = false;
			hover = false;
		}
			
		if(hover){
			
			advancedTexture.isForeground = true;
		}else{
			advancedTexture.isForeground = false;
		}
		//console.log(player.position.x);
		if(player.position.x <= -76){
			camera.position = new BABYLON.Vector3(28,playerHeight,0);
			player.position = camera.position;
			console.log("endscene");
			room3Scene = false;
			endScene = true;
			
		}
	});
	
	
	
	gui();
	return scene2;
}

var createEndScene = function(){

	var scene3 = new BABYLON.Scene(engine);
	
	var light0 = new BABYLON.HemisphericLight("l1", new BABYLON.Vector3(0,5,0), scene3);
	var camera = new BABYLON.UniversalCamera("FreeCamera", new BABYLON.Vector3(30, playerHeight, 0), scene3);
	
    camera.attachControl(canvas, true);
	camera.setTarget(BABYLON.Vector3.Zero());
	camera.moveSensibility = 0;
	camera.inertia = 0; //set camera smoothing to 0
	//camera.speed = moveSpeed;
	
	var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
	var black = new BABYLON.GUI.Image("black", "images/black.png");  
	var paddingBottom = 500;
	//black.width = 0.1;
   // black.height = "100px";
	//black.width = "100px";
	black.paddingBottom = "500px" - paddingBottom;
    advancedTexture.addControl(black);  
	
	var g = 0.5;
	var world = BABYLON.SceneLoader.ImportMesh("","","blender/world.babylon", scene3,
	function(newMeshes){
		
		
		newMeshes.forEach(function(mesh){
		console.log("succesfully load"); 
		scene3.registerBeforeRender(function() {
			paddingBottom -= 2;
			black.paddingBottom = paddingBottom.toString() + "px";
			//console.log(paddingBottom);
			 mesh.rotation = new BABYLON.Vector3(0,grad2Rad(5+g),0);
			 g+= 0.5; 
			 light0.intensity -= 0.004;
			 //console.log(light0.intensity);
			 if(light0.intensity <= -1){
				 timesPlayed += 1;
				 console.log(timesPlayed);
				 camera.position = new BABYLON.Vector3(0,playerHeight,0);
				 endScene = false;
				 room2Scene = false;
				 room3Scene = false;
				 paddingBottom = 500;
				 g = 0.5;
				 light0.intensity = 1;
				 
			 }
		            
		});
		});
	});
	
	var player = new BABYLON.Mesh.CreateSphere("player",3,3,scene3);
	player.position = camera.position;
	var ground = new BABYLON.Mesh.CreateGround("ground",150,150,150,scene3);
	//Set gravity for the scene
	
	scene3.gravity = new BABYLON.Vector3(0, -0.9, 0);

    //Enable Collisions
    scene3.collisionsEnabled = true;

    //Then apply collisions and gravity to the active camera
    camera.checkCollisions = true;
    camera.applyGravity = true;

	ground.checkCollisions = true;
	ground.isVisible = false;
    //Set the ellipsoid around the camera (player)
	
	
	return scene3;
}


var scene = createScene();
var scene1 = createScene2();
var scene2 = createScene3();
var sceneMenu = createSceneMenu();
var scene3 = createEndScene();
//loop scene 
engine.runRenderLoop(function() {
    if(play){
		if(room2Scene){
			scene1.render();
		}
		else if(room3Scene){
			scene2.render();
		}
		else if(endScene){
			scene3.render();
		}
		else{
			scene.render();
		}
	}else{
		sceneMenu.render();
	}
});

//grad2Rad function for rotation
function grad2Rad(p_angle){
	return (p_angle / 180) * Math.PI;
}

//gui function for gui Elements
function gui(){
	//crosshair
	var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
	var iconImage = new BABYLON.GUI.Image("cross_icon", "images/crosshair.png");  
	iconImage.width = 0.1;
    iconImage.height = "100px";
	iconImage.width = "100px";
    advancedTexture.addControl(iconImage);  
}

//openDoor function
function openDoor(doorNumber){
	console.log("Open Door " + doorNumber);
	if(doorNumber == 1){
		door1Plane.dispose() ;
	}
	if(doorNumber == 2){
		door2Plane.dispose();
	}
	if(doorNumber == 3){
		//door3Plane.dispose();
	}
}

//respawn function
function respawn(x,y,z){
	console.log("respawn");
	camera.position = new BABYLON.Vector3(x,y,z);
}
function roomMaker1(){
	//var boxi = new BABYLON.Mesh.CreateBox("boxi",10,scene
	var ground = new BABYLON.Mesh.CreateGround("ground",75,75,75, scene);
	var wall1 = new BABYLON.Mesh.CreatePlane("wall1",75,scene);
	wall1.position = new BABYLON.Vector3(0,0,35);
	//wall1.rotation.z = grad2Rad(90);
	//wall1.material = myMaterial;
	var wall2 = new BABYLON.Mesh.CreatePlane("wall2",75,scene);
	wall2.position = new BABYLON.Vector3(40,0,-35);
	wall2.rotation.x = grad2Rad(180);
	//wall2.material = myMaterial;
	var wall22 = new BABYLON.Mesh.CreatePlane("wall22",75,scene);
	wall22.position = new BABYLON.Vector3(-40,0,-35);
	wall22.rotation.x = grad2Rad(180);
	//wall2.material = myMaterial;
	var wall23 = new BABYLON.Mesh.CreatePlane("wall23",75,scene);
	wall23.position = new BABYLON.Vector3(0,50,-35);
	wall23.rotation.x = grad2Rad(180);
	//wall2.material = myMaterial;
	var wall3 = new BABYLON.Mesh.CreatePlane("wall3",75,scene);
	wall3.position = new BABYLON.Vector3(35,0,0);
	wall3.rotation.y = grad2Rad(90);
	//wall3.material = myMaterial;
	var wall4 = new BABYLON.Mesh.CreatePlane("wall4",20,scene);
	wall4.scaling = new BABYLON.Vector3(20,2,2);
	wall4.position = new BABYLON.Vector3(-35,35,0);
	wall4.rotation.y = grad2Rad(-90);
	//wall4.material = myMaterial;
	var wall5 = new BABYLON.Mesh.CreatePlane("wall5",30,scene);
	wall5.position = new BABYLON.Vector3(-35,5,-25);
	wall5.rotation.y = grad2Rad(-90);
	//wall5.material = myMaterial;
	var wall6 = new BABYLON.Mesh.CreatePlane("wall6",30,scene);
	wall6.position = new BABYLON.Vector3(-35,5,25);
	wall6.rotation.y = grad2Rad(-90);
	door1Plane = new BABYLON.Mesh.CreatePlane("door1",30,scene);
	door1Plane.position = new BABYLON.Vector3(-35,5,0);
	door1Plane.rotation.y = grad2Rad(-90);
	console.log(door1Plane.position);
	//wall6.material = myMaterial;
	
	ground.checkCollisions = true;
	wall1.checkCollisions = true;
	wall2.checkCollisions = true;
	wall3.checkCollisions = true;
	wall4.checkCollisions = true;
	wall5.checkCollisions = true;
	wall6.checkCollisions = true;
	door1Plane.checkCollisions = true;
}
function roomMaker2(){
	//var boxi = new BABYLON.Mesh.CreateBox("boxi",10,scene
	var ground = new BABYLON.Mesh.CreateGround("ground",75,75,75, scene1);
	var wall1 = new BABYLON.Mesh.CreatePlane("wall1",75,scene1);
	wall1.position = new BABYLON.Vector3(0,0,35);
	wall1.rotation.z = grad2Rad(90);
	//wall1.material = myMaterial;
	var wall2 = new BABYLON.Mesh.CreatePlane("wall2",75,scene1);
	wall2.position = new BABYLON.Vector3(0,0,-35);
	wall2.rotation.x = grad2Rad(180);
	//wall2.material = myMaterial;
	var wall3 = new BABYLON.Mesh.CreatePlane("wall3",75,scene1);
	wall3.position = new BABYLON.Vector3(35,0,0);
	wall3.rotation.y = grad2Rad(90);
	//wall3.material = myMaterial;
	var wall4 = new BABYLON.Mesh.CreatePlane("wall4",20,scene1);
	wall4.scaling = new BABYLON.Vector3(20,2,2);
	wall4.position = new BABYLON.Vector3(-35,35,0);
	wall4.rotation.y = grad2Rad(-90);
	//wall4.material = myMaterial;
	var wall5 = new BABYLON.Mesh.CreatePlane("wall5",30,scene1);
	wall5.position = new BABYLON.Vector3(-35,5,-25);
	wall5.rotation.y = grad2Rad(-90);
	//wall5.material = myMaterial;
	var wall6 = new BABYLON.Mesh.CreatePlane("wall6",30,scene1);
	wall6.position = new BABYLON.Vector3(-35,5,25);
	wall6.rotation.y = grad2Rad(-90);
	//wall6.material = myMaterial;
	
	door2Plane = new BABYLON.Mesh.CreatePlane("door2",30,scene1);
	door2Plane.position = new BABYLON.Vector3(-35,5,0);
	door2Plane.rotation.y = grad2Rad(-90);
	
	ground.checkCollisions = true;
	wall1.checkCollisions = true;
	wall2.checkCollisions = true;
	wall3.checkCollisions = true;
	wall4.checkCollisions = true;
	wall5.checkCollisions = true;
	wall6.checkCollisions = true;
	door2Plane.checkCollisions = true;
}
function roomMaker3(){
	var wall1 = new BABYLON.Mesh.CreatePlane("wall1",175,scene2);
	wall1.position = new BABYLON.Vector3(0,0,35);
	wall1.rotation.z = grad2Rad(90);
	//wall1.material = myMaterial;
	var wall2 = new BABYLON.Mesh.CreatePlane("wall2",175,scene2);
	wall2.position = new BABYLON.Vector3(0,0,-35);
	wall2.rotation.x = grad2Rad(180);
	//wall2.material = myMaterial;
	var wall3 = new BABYLON.Mesh.CreatePlane("wall3",175,scene2);
	wall3.position = new BABYLON.Vector3(35,0,0);
	wall3.rotation.y = grad2Rad(90);
	//wall3.material = myMaterial;
	var wall4 = new BABYLON.Mesh.CreatePlane("wall4",20,scene2);
	wall4.scaling = new BABYLON.Vector3(20,2,2);
	wall4.position = new BABYLON.Vector3(-75,35,0);
	wall4.rotation.y = grad2Rad(-90);
	//wall4.material = myMaterial;
	var wall5 = new BABYLON.Mesh.CreatePlane("wall5",30,scene2);
	wall5.position = new BABYLON.Vector3(-75,5,-25);
	wall5.rotation.y = grad2Rad(-90);
	//wall5.material = myMaterial;
	var wall6 = new BABYLON.Mesh.CreatePlane("wall6",30,scene2);
	wall6.position = new BABYLON.Vector3(-75,5,25);
	wall6.rotation.y = grad2Rad(-90);
}
function roomMakerSecret(){
	
}

function controller(sc){
	
}
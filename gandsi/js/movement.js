 var camera = new BABYLON.UniversalCamera("FreeCamera", new BABYLON.Vector3(0, playerHeight, -15), scene);
    camera.attachControl(canvas, true);
	
	camera.inertia = 0; //set camera smoothing to 0
	camera.speed = moveSpeed;
	
	//movement camera
    camera.keysUp.push(87); 	//W
    camera.keysDown.push(83); 	//S
    camera.keysLeft.push(65); 	//A
    camera.keysRight.push(68); 	//D
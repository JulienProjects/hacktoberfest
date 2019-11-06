t1;\nvec3 t3=b3*Nx+t2;\nreturn t3;\n}\n#endif",pbrLightFunctions:"\nstruct lightingInfo\n{\nvec3 diffuse;\n#ifdef SPECULARTERM\nvec3 specular;\n#endif\n};\nstruct pointLightingInfo\n{\nvec3 lightOffset;\nfloat lightDistanceSquared;\nfloat attenuation;\n};\nstruct spotLightingInfo\n{\nvec3 lightOffset;\nfloat lightDistanceSquared;\nvec3 directionToLightCenterW;\nfloat attenuation;\n};\nfloat computeDistanceLightFalloff_Standard(vec3 lightOffset,float range)\n{\nreturn max(0.,1.0-length(lightOffset)/range);\n}\nfloat computeDistanceLightFalloff_Physical(float lightDistanceSquared)\n{\nreturn 1.0/((lightDistanceSquared+0.001));\n}\nfloat computeDistanceLightFalloff_GLTF(float lightDistanceSquared,float inverseSquaredRange)\n{\nconst float minDistanceSquared=0.01*0.01;\nfloat lightDistanceFalloff=1.0/(max(lightDistanceSquared,minDistanceSquared));\nfloat factor=lightDistanceSquared*inverseSquaredRange;\nfloat attenuation=clamp(1.0-factor*factor,0.,1.);\nattenuation*=attenuation;\n\nlightDistanceFalloff*=attenuation;\nreturn lightDistanceFalloff;\n}\nfloat computeDistanceLightFalloff(vec3 lightOffset,float lightDistanceSquared,float range,float inverseSquaredRange)\n{ \n#ifdef USEPHYSICALLIGHTFALLOFF\nreturn computeDistanceLightFalloff_Physical(lightDistanceSquared);\n#elif defined(USEGLTFLIGHTFALLOFF)\nreturn computeDistanceLightFalloff_GLTF(lightDistanceSquared,inverseSquaredRange);\n#else\nreturn computeDistanceLightFalloff_Standard(lightOffset,range);\n#endif\n}\nfloat computeDirectionalLightFalloff_Standard(vec3 lightDirection,vec3 directionToLightCenterW,float cosHalfAngle,float exponent)\n{\nfloat falloff=0.0;\nfloat cosAngle=max(0.000000000000001,dot(-lightDirection,directionToLightCenterW));\nif (cosAngle>=cosHalfAngle)\n{\nfalloff=max(0.,pow(cosAngle,exponent));\n}\nreturn falloff;\n}\nfloat computeDirectionalLightFalloff_Physical(vec3 lightDirection,vec3 directionToLightCenterW,float cosHalfAngle)\n{\nconst float kMinusLog2ConeAngleIntensityRatio=6.64385618977; \n\n\n\n\n\nfloat concentrationKappa=kMinusLog2ConeAngleIntensityRatio/(1.0-cosHalfAngle);\n\n\nvec4 lightDirectionSpreadSG=vec4(-lightDirection*concentrationKappa,-concentrationKappa);\nfloat falloff=exp2(dot(vec4(directionToLightCenterW,1.0),lightDirectionSpreadSG));\nreturn falloff;\n}\nfloat computeDirectionalLightFalloff_GLTF(vec3 lightDirection,vec3 directionToLightCenterW,float lightAngleScale,float lightAngleOffset)\n{\n\n\n\nfloat cd=dot(-lightDirection,directionToLightCenterW);\nfloat falloff=clamp(cd*lightAngleScale+lightAngleOffset,0.,1.);\n\nfalloff*=falloff;\nreturn falloff;\n}\nfloat computeDirectionalLightFalloff(vec3 lightDirection,vec3 directionToLightCenterW,float cosHalfAngle,float exponent,float lightAngleScale,float lightAngleOffset)\n{\n#ifdef USEPHYSICALLIGHTFALLOFF\nreturn computeDirectionalLightFalloff_Physical(lightDirection,directionToLightCenterW,cosHalfAngle);\n#elif defined(USEGLTFLIGHTFALLOFF)\nreturn computeDirectionalLightFalloff_GLTF(lightDirection,directionToLightCenterW,lightAngleScale,lightAngleOffset);\n#else\nreturn computeDirectionalLightFalloff_Standard(lightDirection,directionToLightCenterW,cosHalfAngle,exponent);\n#endif\n}\npointLightingInfo computePointLightingInfo(vec4 lightData) {\npointLightingInfo result;\nresult.lightOffset=lightData.xyz-vPositionW;\nresult.lightDistanceSquared=dot(result.lightOffset,result.lightOffset);\nreturn result;\n}\nspotLightingInfo computeSpotLightingInfo(vec4 lightData) {\nspotLightingInfo result;\nresult.lightOffset=lightData.xyz-vPositionW;\nresult.directionToLightCenterW=normalize(result.lightOffset);\nresult.lightDistanceSquared=dot(result.lightOffset,result.lightOffset);\nreturn result;\n}\nlightingInfo computePointLighting(pointLightingInfo info,vec3 viewDirectionW,vec3 vNormal,vec3 diffuseColor,float lightRadius,float roughness,float NdotV,vec3 reflectance0,vec3 reflectance90,float geometricRoughnessFactor,out float NdotL) {\nlightingInfo result;\nfloat lightDistance=sqrt(info.lightDistanceSquared);\nvec3 lightDirection=normalize(info.lightOffset);\n\nroughness=adjustRoughnessFromLightProperties(roughness,lightRadius,lightDistance);\n\nvec3 H=normalize(viewDirectionW+lightDirection);\nNdotL=clamp(dot(vNormal,lightDirection),0.00000000001,1.0);\nfloat VdotH=clamp(dot(viewDirectionW,H),0.0,1.0);\nfloat diffuseTerm=computeDiffuseTerm(NdotL,NdotV,VdotH,roughness);\nresult.diffuse=diffuseTerm*diffuseColor*info.attenuation;\n#ifdef SPECULARTERM\n\nfloat NdotH=clamp(dot(vNormal,H),0.000000000001,1.0);\nvec3 specTerm=computeSpecularTerm(NdotH,NdotL,NdotV,VdotH,roughness,reflectance0,reflectance90,geometricRoughnessFactor);\nresult.specular=specTerm*diffuseColor*info.attenuation;\n#endif\nreturn result;\n}\nlightingInfo computeSpotLighting(spotLightingInfo info,vec3 viewDirectionW,vec3 vNormal,vec4 lightDirection,vec3 diffuseColor,float lightRadius,float roughness,float NdotV,vec3 reflectance0,vec3 reflectance90,float geometricRoughnessFactor,out float NdotL) {\nlightingInfo result;\n\nfloat lightDistance=sqrt(info.lightDistanceSquared);\nroughness=adjustRoughnessFromLightProperties(roughness,lightRadius,lightDistance);\n\nvec3 H=normalize(viewDirectionW+info.directionToLightCenterW);\nNdotL=clamp(dot(vNormal,info.directionToLightCenterW),0.000000000001,1.0);\nfloat VdotH=clamp(dot(viewDirectionW,H),0.0,1.0);\nfloat diffuseTerm=computeDiffuseTerm(NdotL,NdotV,VdotH,roughness);\nresult.diffuse=diffuseTerm*diffuseColor*info.attenuation;\n#ifdef SPECULARTERM\n\nfloat NdotH=clamp(dot(vNormal,H),0.000000000001,1.0);\nvec3 specTerm=computeSpecularTerm(NdotH,NdotL,NdotV,VdotH,roughness,reflectance0,reflectance90,geometricRoughnessFactor);\nresult.specular=specTerm*diffuseColor*info.attenuation;\n#endif\nreturn result;\n}\nlightingInfo computeDirectionalLighting(vec3 viewDirectionW,vec3 vNormal,vec4 lightData,vec3 diffuseColor,vec3 specularColor,float lightRadius,float roughness,float NdotV,vec3 reflectance0,vec3 reflectance90,float geometricRoughnessFactor,out float NdotL) {\nlightingInfo result;\nfloat lightDistance=length(-lightData.xyz);\nvec3 lightDirection=normalize(-lightData.xyz);\n\nroughness=adjustRoughnessFromLightProperties(roughness,lightRadius,lightDistance);\n\nvec3 H=normalize(viewDirectionW+lightDirection);\nNdotL=clamp(dot(vNormal,lightDirection),0.00000000001,1.0);\nfloat VdotH=clamp(dot(viewDirectionW,H),0.0,1.0);\nfloat diffuseTerm=computeDiffuseTerm(NdotL,NdotV,VdotH,roughness);\nresult.diffuse=diffuseTerm*diffuseColor;\n#ifdef SPECULARTERM\n\nfloat NdotH=clamp(dot(vNormal,H),0.000000000001,1.0);\nvec3 specTerm=computeSpecularTerm(NdotH,NdotL,NdotV,VdotH,roughness,reflectance0,reflectance90,geometricRoughnessFactor);\nresult.specular=specTerm*diffuseColor;\n#endif\nreturn result;\n}\nlightingInfo computeHemisphericLighting(vec3 viewDirectionW,vec3 vNormal,vec4 lightData,vec3 diffuseColor,vec3 specularColor,vec3 groundColor,float roughness,float NdotV,vec3 reflectance0,vec3 reflectance90,float geometricRoughnessFactor,out float NdotL) {\nlightingInfo result;\n\n\n\nNdotL=dot(vNormal,lightData.xyz)*0.5+0.5;\nresult.diffuse=mix(groundColor,diffuseColor,NdotL);\n#ifdef SPECULARTERM\n\nvec3 lightVectorW=normalize(lightData.xyz);\nvec3 H=normalize(viewDirectionW+lightVectorW);\nfloat NdotH=clamp(dot(vNormal,H),0.000000000001,1.0);\nNdotL=clamp(NdotL,0.000000000001,1.0);\nfloat VdotH=clamp(dot(viewDirectionW,H),0.0,1.0);\nvec3 specTerm=computeSpecularTerm(NdotH,NdotL,NdotV,VdotH,roughness,reflectance0,reflectance90,geometricRoughnessFactor);\nresult.specular=specTerm*diffuseColor;\n#endif\nreturn result;\n}\nvec3 computeProjectionTextureDiffuseLighting(sampler2D projectionLightSampler,mat4 textureProjectionMatrix){\nvec4 strq=textureProjectionMatrix*vec4(vPositionW,1.0);\nstrq/=strq.w;\nvec3 textureColor=texture2D(projectionLightSampler,strq.xy).rgb;\nreturn toLinearSpace(textureColor);\n}",clipPlaneVertexDeclaration2:"#ifdef CLIPPLANE\nuniform vec4 vClipPlane;\nout float fClipDistance;\n#endif\n#ifdef CLIPPLANE2\nuniform vec4 vClipPlane2;\nout float fClipDistance2;\n#endif\n#ifdef CLIPPLANE3\nuniform vec4 vClipPlane3;\nout float fClipDistance3;\n#endif\n#ifdef CLIPPLANE4\nuniform vec4 vClipPlane4;\nout float fClipDistance4;\n#endif",clipPlaneFragmentDeclaration2:"#ifdef CLIPPLANE\nin float fClipDistance;\n#endif\n#ifdef CLIPPLANE2\nin float fClipDistance2;\n#endif\n#ifdef CLIPPLANE3\nin float fClipDistance3;\n#endif\n#ifdef CLIPPLANE4\nin float fClipDistance4;\n#endif",mrtFragmentDeclaration:"#if __VERSION__>=200\nlayout(location=0) out vec4 glFragData[{X}];\n#endif\n",bones300Declaration:"#if NUM_BONE_INFLUENCERS>0\nuniform mat4 mBones[BonesPerMesh];\nin vec4 matricesIndices;\nin vec4 matricesWeights;\n#if NUM_BONE_INFLUENCERS>4\nin vec4 matricesIndicesExtra;\nin vec4 matricesWeightsExtra;\n#endif\n#endif",instances300Declaration:"#ifdef INSTANCES\nin vec4 world0;\nin vec4 world1;\nin vec4 world2;\nin vec4 world3;\n#else\nuniform mat4 world;\n#endif",kernelBlurFragment:"#ifdef DOF\nfactor=sampleCoC(sampleCoord{X}); \ncomputedWeight=KERNEL_WEIGHT{X}*factor;\nsumOfWeights+=computedWeight;\n#else\ncomputedWeight=KERNEL_WEIGHT{X};\n#endif\n#ifdef PACKEDFLOAT\nblend+=unpack(texture2D(textureSampler,sampleCoord{X}))*computedWeight;\n#else\nblend+=texture2D(textureSampler,sampleCoord{X})*computedWeight;\n#endif",kernelBlurFragment2:"#ifdef DOF\nfactor=sampleCoC(sampleCenter+delta*KERNEL_DEP_OFFSET{X});\ncomputedWeight=KERNEL_DEP_WEIGHT{X}*factor;\nsumOfWeights+=computedWeight;\n#else\ncomputedWeight=KERNEL_DEP_WEIGHT{X};\n#endif\n#ifdef PACKEDFLOAT\nblend+=unpack(texture2D(textureSampler,sampleCenter+delta*KERNEL_DEP_OFFSET{X}))*computedWeight;\n#else\nblend+=texture2D(textureSampler,sampleCenter+delta*KERNEL_DEP_OFFSET{X})*computedWeight;\n#endif",kernelBlurVaryingDeclaration:"varying vec2 sampleCoord{X};",kernelBlurVertex:"sampleCoord{X}=sampleCenter+delta*KERNEL_OFFSET{X};",backgroundVertexDeclaration:"uniform mat4 view;\nuniform mat4 viewProjection;\nuniform float shadowLevel;\n#ifdef DIFFUSE\nuniform mat4 diffuseMatrix;\nuniform vec2 vDiffuseInfos;\n#endif\n#ifdef REFLECTION\nuniform vec2 vReflectionInfos;\nuniform mat4 reflectionMatrix;\nuniform vec3 vReflectionMicrosurfaceInfos;\nuniform float fFovMultiplier;\n#endif\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif",backgroundFragmentDeclaration:" uniform vec4 vPrimaryColor;\n#ifdef USEHIGHLIGHTANDSHADOWCOLORS\nuniform vec4 vPrimaryColorShadow;\n#endif\nuniform float shadowLevel;\nuniform float alpha;\n#ifdef DIFFUSE\nuniform vec2 vDiffuseInfos;\n#endif\n#ifdef REFLECTION\nuniform vec2 vReflectionInfos;\nuniform mat4 reflectionMatrix;\nuniform vec3 vReflectionMicrosurfaceInfos;\n#endif\n#if defined(REFLECTIONFRESNEL) || defined(OPACITYFRESNEL)\nuniform vec3 vBackgroundCenter;\n#endif\n#ifdef REFLECTIONFRESNEL\nuniform vec4 vReflectionControl;\n#endif\n#if defined(REFLECTIONMAP_SPHERICAL) || defined(REFLECTIONMAP_PROJECTION) || defined(REFRACTION)\nuniform mat4 view;\n#endif",backgroundUboDeclaration:"layout(std140,column_major) uniform;\nuniform Material\n{\nuniform vec4 vPrimaryColor;\nuniform vec4 vPrimaryColorShadow;\nuniform vec2 vDiffuseInfos;\nuniform vec2 vReflectionInfos;\nuniform mat4 diffuseMatrix;\nuniform mat4 reflectionMatrix;\nuniform vec3 vReflectionMicrosurfaceInfos;\nuniform float fFovMultiplier;\nuniform float pointSize;\nuniform float shadowLevel;\nuniform float alpha;\n#if defined(REFLECTIONFRESNEL) || defined(OPACITYFRESNEL)\nuniform vec3 vBackgroundCenter;\n#endif\n#ifdef REFLECTIONFRESNEL\nuniform vec4 vReflectionControl;\n#endif\n};\nuniform Scene {\nmat4 viewProjection;\nmat4 view;\n};"},$a.CollisionWorker='var BABYLON;!function(D){var a,x=(a={root:0,found:!1},function(t,e,o,i){a.root=0,a.found=!1;var s=e*e-4*t*o;if(s<0)return a;var r=Math.sqrt(s),n=(-e-r)/(2*t),c=(-e+r)/(2*t);if(c<n){var h=c;c=n,n=h}return 0<n&&n<i?(a.root=n,a.found=!0):0<c&&c<i&&(a.root=c,a.found=!0),a}),t=function(){function t(){this._collisionPoint=D.Vector3.Zero(),this._planeIntersectionPoint=D.Vector3.Zero(),this._tempVector=D.Vector3.Zero(),this._tempVector2=D.Vector3.Zero(),this._tempVector3=D.Vector3.Zero(),this._tempVector4=D.Vector3.Zero(),this._edge=D.Vector3.Zero(),this._baseToVertex=D.Vector3.Zero(),this._destinationPoint=D.Vector3.Zero(),this._slidePlaneNormal=D.Vector3.Zero(),this._displacementVector=D.Vector3.Zero(),this._radius=D.Vector3.One(),this._retry=0,this._basePointWorld=D.Vector3.Zero(),this._velocityWorld=D.Vector3.Zero(),this._normalizedVelocity=D.Vector3.Zero(),this._collisionMask=-1}return Object.defineProperty(t.prototype,"collisionMask",{get:function(){return this._collisionMask},set:function(t){this._collisionMask=isNaN(t)?-1:t},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"slidePlaneNormal",{get:function(){return this._slidePlaneNormal},enumerable:!0,configurable:!0}),t.prototype._initialize=function(t,e,o){this._velocity=e,D.Vector3.NormalizeToRef(e,this._normalizedVelocity),(this._basePoint=t).multiplyToRef(this._radius,this._basePointWorld),e.multiplyToRef(this._radius,this._velocityWorld),this._velocityWorldLength=this._velocityWorld.length(),this._epsilon=o,this.collisionFound=!1},t.prototype._checkPointInTriangle=function(t,e,o,i,s){e.subtractToRef(t,this._tempVector),o.subtractToRef(t,this._tempVector2),D.Vector3.CrossToRef(this._tempVector,this._tempVector2,this._tempVector4);var r=D.Vector3.Dot(this._tempVector4,s);return!(r<0)&&(i.subtractToRef(t,this._tempVector3),D.Vector3.CrossToRef(this._tempVector2,this._tempVector3,this._tempVector4),!((r=D.Vector3.Dot(this._tempVector4,s))<0)&&(D.Vector3.CrossToRef(this._tempVector3,this._tempVector,this._tempVector4),0<=(r=D.Vector3.Dot(this._tempVector4,s))))},t.prototype._canDoCollision=function(t,e,o,i){var s,r,n,c,h=D.Vector3.Distance(this._basePointWorld,t),a=Math.max(this._radius.x,this._radius.y,this._radius.z);return!(h>this._velocityWorldLength+a+e)&&(s=o,r=i,n=this._basePointWorld,c=this._velocityWorldLength+a,!(s.x>n.x+c||n.x-c>r.x||s.y>n.y+c||n.y-c>r.y||s.z>n.z+c||n.z-c>r.z))},t.prototype._testTriangle=function(t,e,o,i,s,r){var n,c=!1;e||(e=[]),e[t]||(e[t]=new D.Plane(0,0,0,0),e[t].copyFromPoints(o,i,s));var h=e[t];if(r||h.isFrontFacingTo(this._normalizedVelocity,0)){var a=h.signedDistanceTo(this._basePoint),l=D.Vector3.Dot(h.normal,this._velocity);if(0==l){if(1<=Math.abs(a))return;c=!0,n=0}else{var _=(1-a)/l;if(_<(n=(-1-a)/l)){var d=_;_=n,n=d}if(1<n||_<0)return;n<0&&(n=0),1<n&&(n=1)}this._collisionPoint.copyFromFloats(0,0,0);var V=!1,u=1;if(c||(this._basePoint.subtractToRef(h.normal,this._planeIntersectionPoint),this._velocity.scaleToRef(n,this._tempVector),this._planeIntersectionPoint.addInPlace(this._tempVector),this._checkPointInTriangle(this._planeIntersectionPoint,o,i,s,h.normal)&&(V=!0,u=n,this._collisionPoint.copyFrom(this._planeIntersectionPoint))),!V){var p=this._velocity.lengthSquared(),P=p;this._basePoint.subtractToRef(o,this._tempVector);var f=2*D.Vector3.Dot(this._velocity,this._tempVector),m=this._tempVector.lengthSquared()-1,b=x(P,f,m,u);b.found&&(u=b.root,V=!0,this._collisionPoint.copyFrom(o)),this._basePoint.subtractToRef(i,this._tempVector),f=2*D.Vector3.Dot(this._velocity,this._tempVector),m=this._tempVector.lengthSquared()-1,(b=x(P,f,m,u)).found&&(u=b.root,V=!0,this._collisionPoint.copyFrom(i)),this._basePoint.subtractToRef(s,this._tempVector),f=2*D.Vector3.Dot(this._velocity,this._tempVector),m=this._tempVector.lengthSquared()-1,(b=x(P,f,m,u)).found&&(u=b.root,V=!0,this._collisionPoint.copyFrom(s)),i.subtractToRef(o,this._edge),o.subtractToRef(this._basePoint,this._baseToVertex);var y=this._edge.lengthSquared(),T=D.Vector3.Dot(this._edge,this._velocity),g=D.Vector3.Dot(this._edge,this._baseToVertex);if(P=y*-p+T*T,f=y*(2*D.Vector3.Dot(this._velocity,this._baseToVertex))-2*T*g,m=y*(1-this._baseToVertex.lengthSquared())+g*g,(b=x(P,f,m,u)).found){var v=(T*b.root-g)/y;0<=v&&v<=1&&(u=b.root,V=!0,this._edge.scaleInPlace(v),o.addToRef(this._edge,this._collisionPoint))}s.subtractToRef(i,this._edge),i.subtractToRef(this._basePoint,this._baseToVertex),y=this._edge.lengthSquared(),T=D.Vector3.Dot(this._edge,this._velocity),g=D.Vector3.Dot(this._edge,this._baseToVertex),P=y*-p+T*T,f=y*(2*D.Vector3.Dot(this._velocity,this._baseToVertex))-2*T*g,m=y*(1-this._baseToVertex.lengthSquared())+g*g,(b=x(P,f,m,u)).found&&0<=(v=(T*b.root-g)/y)&&v<=1&&(u=b.root,V=!0,this._edge.scaleInPlace(v),i.addToRef(this._edge,this._collisionPoint)),o.subtractToRef(s,this._edge),s.subtractToRef(this._basePoint,this._baseToVertex),y=this._edge.lengthSquared(),T=D.Vector3.Dot(this._edge,this._velocity),g=D.Vector3.Dot(this._edge,this._baseToVertex),P=y*-p+T*T,f=y*(2*D.Vector3.Dot(this._velocity,this._baseToVertex))-2*T*g,m=y*(1-this._baseToVertex.lengthSquared())+g*g,(b=x(P,f,m,u)).found&&0<=(v=(T*b.root-g)/y)&&v<=1&&(u=b.root,V=!0,this._edge.scaleInPlace(v),s.addToRef(this._edge,this._collisionPoint))}if(V){var R=u*this._velocity.length();(!this.collisionFound||R<this._nearestDistance)&&(this.intersectionPoint?this.intersectionPoint.copyFrom(this._collisionPoint):this.intersectionPoint=this._collisionPoint.clone(),this._nearestDistance=R,this.collisionFound=!0)}}},t.prototype._collide=function(t,e,o,i,s,r,n){for(var c=i;c<s;c+=3){var h=e[o[c]-r],a=e[o[c+1]-r],l=e[o[c+2]-r];this._testTriangle(c,t,l,a,h,n)}},t.prototype._getResponse=function(t,e){t.addToRef(e,this._destinationPoint),e.scaleInPlace(this._nearestDistance/e.length()),this._basePoint.addToRef(e,t),t.subtractToRef(this.intersectionPoint,this._slidePlaneNormal),this._slidePlaneNormal.normalize(),this._slidePlaneNormal.scaleToRef(this._epsilon,this._displacementVector),t.addInPlace(this._displacementVector),this.intersectionPoint.addInPlace(this._displacementVector),this._slidePlaneNormal.scaleInPlace(D.Plane.SignedDistanceToPlaneFromPositionAndNormal(this.intersectionPoint,this._slidePlaneNormal,this._destinationPoint)),this._destinationPoint.subtractInPlace(this._slidePlaneNormal),this._destinationPoint.subtractToRef(this.intersectionPoint,e)},t}();D.Collider=t}(BABYLON||(BABYLON={}));var BABYLON,safePostMessage=self.postMessage;!function(a){a.WorkerIncluded=!0;var i=function(){function e(){this._meshes={},this._geometries={}}return e.prototype.getMeshes=function(){return this._meshes},e.prototype.getGeometries=function(){return this._geometries},e.prototype.getMesh=function(e){return this._meshes[e]},e.prototype.addMesh=function(e){this._meshes[e.uniqueId]=e},e.prototype.removeMesh=function(e){delete this._meshes[e]},e.prototype.getGeometry=function(e){return this._geometries[e]},e.prototype.addGeometry=function(e){this._geometries[e.id]=e},e.prototype.removeGeometry=function(e){delete this._geometries[e]},e}();a.CollisionCache=i;var s=function(){function e(e,o,i){this.collider=e,this._collisionCache=o,this.finalPosition=i,this.collisionsScalingMatrix=a.Matrix.Zero(),this.collisionTranformationMatrix=a.Matrix.Zero()}return e.prototype.collideWithWorld=function(e,o,i,r){if(this.collider._retry>=i)this.finalPosition.copyFrom(e);else{this.collider._initialize(e,o,.01);for(var t,s=this._collisionCache.getMeshes(),l=Object.keys(s),n=l.length,a=0;a<n;++a)if(t=l[a],parseInt(t)!=r){var c=s[t];c.checkCollisions&&this.checkCollision(c)}this.collider.collisionFound?(0===o.x&&0===o.y&&0===o.z||this.collider._getResponse(e,o),o.length()<=.01?this.finalPosition.copyFrom(e):(this.collider._retry++,this.collideWithWorld(e,o,i,r))):e.addToRef(o,this.finalPosition)}},e.prototype.checkCollision=function(e){this.collider._canDoCollision(a.Vector3.FromArray(e.sphereCenter),e.sphereRadius,a.Vector3.FromArray(e.boxMinimum),a.Vector3.FromArray(e.boxMaximum))&&(a.Matrix.ScalingToRef(1/this.collider._radius.x,1/this.collider._radius.y,1/this.collider._radius.z,this.collisionsScalingMatrix),a.Matrix.FromArray(e.worldMatrixFromCache).multiplyToRef(this.collisionsScalingMatrix,this.collisionTranformationMatrix),this.processCollisionsForSubMeshes(this.collisionTranformationMatrix,e))},e.prototype.processCollisionsForSubMeshes=function(e,o){var i=o.subMeshes,r=i.length;if(o.geometryId){var t=this._collisionCache.getGeometry(o.geometryId);if(t)for(var s=0;s<r;s++){var l=i[s];1<r&&!this.checkSubmeshCollision(l)||(this.collideForSubMesh(l,e,t),this.collider.collisionFound&&(this.collider.collidedMesh=o.uniqueId))}else console.log("couldn\'t find geometry",o.geometryId)}else console.log("no mesh geometry id")},e.prototype.collideForSubMesh=function(e,o,i){if(!i.positionsArray){i.positionsArray=[];for(var r=0,t=i.positions.length;r<t;r+=3){var s=a.Vector3.FromArray([i.positions[r],i.positions[r+1],i.positions[r+2]]);i.positionsArray.push(s)}}if(!e._lastColliderWorldVertices||!e._lastColliderTransformMatrix.equals(o)){e._lastColliderTransformMatrix=o.clone(),e._lastColliderWorldVertices=[],e._trianglePlanes=[];var l=e.verticesStart,n=e.verticesStart+e.verticesCount;for(r=l;r<n;r++)e._lastColliderWorldVertices.push(a.Vector3.TransformCoordinates(i.positionsArray[r],o))}this.collider._collide(e._trianglePlanes,e._lastColliderWorldVertices,i.indices,e.indexStart,e.indexStart+e.indexCount,e.verticesStart,e.hasMaterial)},e.prototype.checkSubmeshCollision=function(e){return this.collider._canDoCollision(a.Vector3.FromArray(e.sphereCenter),e.sphereRadius,a.Vector3.FromArray(e.boxMinimum),a.Vector3.FromArray(e.boxMaximum))},e}();a.CollideWorker=s;var e=function(){function e(){}return e.prototype.onInit=function(e){this._collisionCache=new i;var o={error:a.WorkerReplyType.SUCCESS,taskType:a.WorkerTaskType.INIT};safePostMessage(o)},e.prototype.onUpdate=function(e){var o=this,i={error:a.WorkerReplyType.SUCCESS,taskType:a.WorkerTaskType.UPDATE};try{for(var r in e.updatedGeometries)e.updatedGeometries.hasOwnProperty(r)&&this._collisionCache.addGeometry(e.updatedGeometries[r]);for(var t in e.updatedMeshes)e.updatedMeshes.hasOwnProperty(t)&&this._collisionCache.addMesh(e.updatedMeshes[t]);e.removedGeometries.forEach(function(e){o._collisionCache.removeGeometry(e)}),e.removedMeshes.forEach(function(e){o._collisionCache.removeMesh(e)})}catch(e){i.error=a.WorkerReplyType.UNKNOWN_ERROR}safePostMessage(i)},e.prototype.onCollision=function(e){var o=a.Vector3.Zero(),i=new a.Collider;i._radius=a.Vector3.FromArray(e.collider.radius),new s(i,this._collisionCache,o).collideWithWorld(a.Vector3.FromArray(e.collider.position),a.Vector3.FromArray(e.collider.velocity),e.maximumRetry,e.excludedMeshUniqueId);var r={collidedMeshUniqueId:i.collidedMesh,collisionId:e.collisionId,newPosition:o.asArray()},t={error:a.WorkerReplyType.SUCCESS,taskType:a.WorkerTaskType.COLLIDE,payload:r};safePostMessage(t)},e}();a.CollisionDetectorTransferable=e;try{if(self&&self instanceof WorkerGlobalScope){window={},a.Collider||(importScripts("./babylon.collisionCoordinator.js"),importScripts("./babylon.collider.js"),importScripts("../Math/babylon.math.js"));var r=new e;self.onmessage=function(e){var o=e.data;switch(o.taskType){case a.WorkerTaskType.INIT:r.onInit(o.payload);break;case a.WorkerTaskType.COLLIDE:r.onCollision(o.payload);break;case a.WorkerTaskType.UPDATE:r.onUpdate(o.payload)}}}}catch(e){console.log("single worker init")}}(BABYLON||(BABYLON={}));var BABYLON;!function(c){var d,e,n,o;c.CollisionWorker="",(e=d=c.WorkerTaskType||(c.WorkerTaskType={}))[e.INIT=0]="INIT",e[e.UPDATE=1]="UPDATE",e[e.COLLIDE=2]="COLLIDE",(o=n=c.WorkerReplyType||(c.WorkerReplyType={}))[o.SUCCESS=0]="SUCCESS",o[o.UNKNOWN_ERROR=1]="UNKNOWN_ERROR";var i=function(){function o(){var s=this;this._scaledPosition=c.Vector3.Zero(),this._scaledVelocity=c.Vector3.Zero(),this.onMeshUpdated=function(e){s._addUpdateMeshesList[e.uniqueId]=o.SerializeMesh(e)},this.onGeometryUpdated=function(e){s._addUpdateGeometriesList[e.id]=o.SerializeGeometry(e)},this._afterRender=function(){if(s._init&&!(0==s._toRemoveGeometryArray.length&&0==s._toRemoveMeshesArray.length&&0==Object.keys(s._addUpdateGeometriesList).length&&0==Object.keys(s._addUpdateMeshesList).length||4<s._runningUpdated)){++s._runningUpdated;var e={updatedMeshes:s._addUpdateMeshesList,updatedGeometries:s._addUpdateGeometriesList,removedGeometries:s._toRemoveGeometryArray,removedMeshes:s._toRemoveMeshesArray},o={payload:e,taskType:d.UPDATE},i=[];for(var t in e.updatedGeometries)e.updatedGeometries.hasOwnProperty(t)&&(i.push(o.payload.updatedGeometries[t].indices.buffer),i.push(o.payload.updatedGeometries[t].normals.buffer),i.push(o.payload.updatedGeometries[t].positions.buffer));s._worker.postMessage(o,i),s._addUpdateMeshesList={},s._addUpdateGeometriesList={},s._toRemoveGeometryArray=[],s._toRemoveMeshesArray=[]}},this._onMessageFromWorker=function(e){var o=e.data;if(o.error==n.SUCCESS)switch(o.taskType){case d.INIT:s._init=!0,s._scene.meshes.forEach(function(e){s.onMeshAdded(e)}),s._scene.getGeometries().forEach(function(e){s.onGeometryAdded(e)});break;case d.UPDATE:s._runningUpdated--;break;case d.COLLIDE:var i=o.payload;if(!s._collisionsCallbackArray[i.collisionId])return;var t=s._collisionsCallbackArray[i.collisionId];if(t){var r=s._scene.getMeshByUniqueID(i.collidedMeshUniqueId);r&&t(i.collisionId,c.Vector3.FromArray(i.newPosition),r)}s._collisionsCallbackArray[i.collisionId]=null}else c.Tools.Warn("error returned from worker!")},this._collisionsCallbackArray=[],this._init=!1,this._runningUpdated=0,this._addUpdateMeshesList={},this._addUpdateGeometriesList={},this._toRemoveGeometryArray=[],this._toRemoveMeshesArray=[]}return o.prototype.getNewPosition=function(e,o,i,t,r,s,n){if(this._init&&!this._collisionsCallbackArray[n]&&!this._collisionsCallbackArray[n+1e5]){e.divideToRef(i._radius,this._scaledPosition),o.divideToRef(i._radius,this._scaledVelocity),this._collisionsCallbackArray[n]=s;var a={payload:{collider:{position:this._scaledPosition.asArray(),velocity:this._scaledVelocity.asArray(),radius:i._radius.asArray()},collisionId:n,excludedMeshUniqueId:r?r.uniqueId:null,maximumRetry:t},taskType:d.COLLIDE};this._worker.postMessage(a)}},o.prototype.init=function(e){this._scene=e,this._scene.registerAfterRender(this._afterRender);var o=c.WorkerIncluded?c.Engine.CodeRepository+"Collisions/babylon.collisionWorker.js":URL.createObjectURL(new Blob([c.CollisionWorker],{type:"application/javascript"}));this._worker=new Worker(o),this._worker.onmessage=this._onMessageFromWorker;var i={payload:{},taskType:d.INIT};this._worker.postMessage(i)},o.prototype.destroy=function(){this._scene.unregisterAfterRender(this._afterRender),this._worker.terminate()},o.prototype.onMeshAdded=function(e){e.registerAfterWorldMatrixUpdate(this.onMeshUpdated),this.onMeshUpdated(e)},o.prototype.onMeshRemoved=function(e){this._toRemoveMeshesArray.push(e.uniqueId)},o.prototype.onGeometryAdded=function(e){e.onGeometryUpdated=this.onGeometryUpdated,this.onGeometryUpdated(e)},o.prototype.onGeometryDeleted=function(e){this._toRemoveGeometryArray.push(e.id)},o.SerializeMesh=function(e){var o=[];e.subMeshes&&(o=e.subMeshes.map(function(e,o){var i=e.getBoundingInfo();return{position:o,verticesStart:e.verticesStart,verticesCount:e.verticesCount,indexStart:e.indexStart,indexCount:e.indexCount,hasMaterial:!!e.getMaterial(),sphereCenter:i.boundingSphere.centerWorld.asArray(),sphereRadius:i.boundingSphere.radiusWorld,boxMinimum:i.boundingBox.minimumWorld.asArray(),boxMaximum:i.boundingBox.maximumWorld.asArray()}}));var i=null;if(e instanceof c.Mesh)i=(t=e.geometry)?t.id:null;else if(e instanceof c.InstancedMesh){var t;i=(t=e.sourceMesh&&e.sourceMesh.geometry)?t.id:null}var r=e.getBoundingInfo();return{uniqueId:e.uniqueId,id:e.id,name:e.name,geometryId:i,sphereCenter:r.boundingSphere.centerWorld.asArray(),sphereRadius:r.boundingSphere.radiusWorld,boxMinimum:r.boundingBox.minimumWorld.asArray(),boxMaximum:r.boundingBox.maximumWorld.asArray(),worldMatrixFromCache:e.worldMatrixFromCache.asArray(),subMeshes:o,checkCollisions:e.checkCollisions}},o.SerializeGeometry=function(e){return{id:e.id,positions:new Float32Array(e.getVerticesData(c.VertexBuffer.PositionKind)||[]),normals:new Float32Array(e.getVerticesData(c.VertexBuffer.NormalKind)||[]),indices:new Uint32Array(e.getIndices()||[])}},o}();c.CollisionCoordinatorWorker=i;var t=function(){function e(){this._scaledPosition=c.Vector3.Zero(),this._scaledVelocity=c.Vector3.Zero(),this._finalPosition=c.Vector3.Zero()}return e.prototype.getNewPosition=function(e,o,i,t,r,s,n){e.divideToRef(i._radius,this._scaledPosition),o.divideToRef(i._radius,this._scaledVelocity),i.collidedMesh=null,i._retry=0,i._initialVelocity=this._scaledVelocity,i._initialPosition=this._scaledPosition,this._collideWithWorld(this._scaledPosition,this._scaledVelocity,i,t,this._finalPosition,r),this._finalPosition.multiplyInPlace(i._radius),s(n,this._finalPosition,i.collidedMesh)},e.prototype.init=function(e){this._scene=e},e.prototype.destroy=function(){},e.prototype.onMeshAdded=function(e){},e.prototype.onMeshUpdated=function(e){},e.prototype.onMeshRemoved=function(e){},e.prototype.onGeometryAdded=function(e){},e.prototype.onGeometryUpdated=function(e){},e.prototype.onGeometryDeleted=function(e){},e.prototype._collideWithWorld=function(e,o,i,t,r,s){void 0===s&&(s=null);var n=10*c.Engine.CollisionsEpsilon;if(i._retry>=t)r.copyFrom(e);else{var a=s?s.collisionMask:i.collisionMask;i._initialize(e,o,n);for(var d=0;d<this._scene.meshes.length;d++){var l=this._scene.meshes[d];l.isEnabled()&&l.checkCollisions&&l.subMeshes&&l!==s&&0!=(a&l.collisionGroup)&&l._checkCollision(i)}i.collisionFound?(0===o.x&&0===o.y&&0===o.z||i._getResponse(e,o),o.length()<=n?r.copyFrom(e):(i._retry++,this._collideWithWorld(e,o,i,t,r,s))):e.addToRef(o,r)}},e}();c.CollisionCoordinatorLegacy=t}(BABYLON||(BABYLON={}));var BABYLON;!function(p){p.ToGammaSpace=1/2.2,p.ToLinearSpace=2.2,p.Epsilon=.001;var i=function(){function n(t,i,r){void 0===t&&(t=0),void 0===i&&(i=0),void 0===r&&(r=0),this.r=t,this.g=i,this.b=r}return n.prototype.toString=function(){return"{R: "+this.r+" G:"+this.g+" B:"+this.b+"}"},n.prototype.getClassName=function(){return"Color3"},n.prototype.getHashCode=function(){var t=this.r||0;return t=397*(t=397*t^(this.g||0))^(this.b||0)},n.prototype.toArray=function(t,i){return void 0===i&&(i=0),t[i]=this.r,t[i+1]=this.g,t[i+2]=this.b,this},n.prototype.toColor4=function(t){return void 0===t&&(t=1),new r(this.r,this.g,this.b,t)},n.prototype.asArray=function(){var t=new Array;return this.toArray(t,0),t},n.prototype.toLuminance=function(){return.3*this.r+.59*this.g+.11*this.b},n.prototype.multiply=function(t){return new n(this.r*t.r,this.g*t.g,this.b*t.b)},n.prototype.multiplyToRef=function(t,i){return i.r=this.r*t.r,i.g=this.g*t.g,i.b=this.b*t.b,this},n.prototype.equals=function(t){return t&&this.r===t.r&&this.g===t.g&&this.b===t.b},n.prototype.equalsFloats=function(t,i,r){return this.r===t&&this.g===i&&this.b===r},n.prototype.scale=function(t){return new n(this.r*t,this.g*t,this.b*t)},n.prototype.scaleToRef=function(t,i){return i.r=this.r*t,i.g=this.g*t,i.b=this.b*t,this},n.prototype.scaleAndAddToRef=function(t,i){return i.r+=this.r*t,i.g+=this.g*t,i.b+=this.b*t,this},n.prototype.clampToRef=function(t,i,r){return void 0===t&&(t=0),void 0===i&&(i=1),r.r=p.Scalar.Clamp(this.r,t,i),r.g=p.Scalar.Clamp(this.g,t,i),r.b=p.Scalar.Clamp(this.b,t,i),this},n.prototype.add=function(t){return new n(this.r+t.r,this.g+t.g,this.b+t.b)},n.prototype.addToRef=function(t,i){return i.r=this.r+t.r,i.g=this.g+t.g,i.b=this.b+t.b,this},n.prototype.subtract=function(t){return new n(this.r-t.r,this.g-t.g,this.b-t.b)},n.prototype.subtractToRef=function(t,i){return i.r=this.r-t.r,i.g=this.g-t.g,i.b=this.b-t.b,this},n.prototype.clone=function(){return new n(this.r,this.g,this.b)},n.prototype.copyFrom=function(t){return this.r=t.r,this.g=t.g,this.b=t.b,this},n.prototype.copyFromFloats=function(t,i,r){return this.r=t,this.g=i,this.b=r,this},n.prototype.set=function(t,i,r){return this.copyFromFloats(t,i,r)},n.prototype.toHexString=function(){var t=255*this.r|0,i=255*this.g|0,r=255*this.b|0;return"#"+p.Scalar.ToHex(t)+p.Scalar.ToHex(i)+p.Scalar.ToHex(r)},n.prototype.toLinearSpace=function(){var t=new n;return this.toLinearSpaceToRef(t),t},n.prototype.toLinearSpaceToRef=function(t){return t.r=Math.pow(this.r,p.ToLinearSpace),t.g=Math.pow(this.g,p.ToLinearSpace),t.b=Math.pow(this.b,p.ToLinearSpace),this},n.prototype.toGammaSpace=function(){var t=new n;return this.toGammaSpaceToRef(t),t},n.prototype.toGammaSpaceToRef=function(t){return t.r=Math.pow(this.r,p.ToGammaSpace),t.g=Math.pow(this.g,p.ToGammaSpace),t.b=Math.pow(this.b,p.ToGammaSpace),this},n.FromHexString=function(t){if("#"!==t.substring(0,1)||7!==t.length)return new n(0,0,0);var i=parseInt(t.substring(1,3),16),r=parseInt(t.substring(3,5),16),o=parseInt(t.substring(5,7),16);return n.FromInts(i,r,o)},n.FromArray=function(t,i){return void 0===i&&(i=0),new n(t[i],t[i+1],t[i+2])},n.FromInts=function(t,i,r){return new n(t/255,i/255,r/255)},n.Lerp=function(t,i,r){var o=new n(0,0,0);return n.LerpToRef(t,i,r,o),o},n.LerpToRef=function(t,i,r,o){o.r=t.r+(i.r-t.r)*r,o.g=t.g+(i.g-t.g)*r,o.b=t.b+(i.b-t.b)*r},n.Red=function(){return new n(1,0,0)},n.Green=function(){return new n(0,1,0)},n.Blue=function(){return new n(0,0,1)},n.Black=function(){return new n(0,0,0)},n.White=function(){return new n(1,1,1)},n.Purple=function(){return new n(.5,0,.5)},n.Magenta=function(){return new n(1,0,1)},n.Yellow=function(){return new n(1,1,0)},n.Gray=function(){return new n(.5,.5,.5)},n.Teal=function(){return new n(0,1,1)},n.Random=function(){return new n(Math.random(),Math.random(),Math.random())},n}();p.Color3=i;var r=function(){function e(t,i,r,o){void 0===t&&(t=0),void 0===i&&(i=0),void 0===r&&(r=0),void 0===o&&(o=1),this.r=t,this.g=i,this.b=r,this.a=o}return e.prototype.addInPlace=function(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this.a+=t.a,this},e.prototype.asArray=function(){var t=new Array;return this.toArray(t,0),t},e.prototype.toArray=function(t,i){return void 0===i&&(i=0),t[i]=this.r,t[i+1]=this.g,t[i+2]=this.b,t[i+3]=this.a,this},e.prototype.add=function(t){return new e(this.r+t.r,this.g+t.g,this.b+t.b,this.a+t.a)},e.prototype.subtract=function(t){return new e(this.r-t.r,this.g-t.g,this.b-t.b,this.a-t.a)},e.prototype.subtractToRef=function(t,i){return i.r=this.r-t.r,i.g=this.g-t.g,i.b=this.b-t.b,i.a=this.a-t.a,this},e.prototype.scale=function(t){return new e(this.r*t,this.g*t,this.b*t,this.a*t)},e.prototype.scaleToRef=function(t,i){return i.r=this.r*t,i.g=this.g*t,i.b=this.b*t,i.a=this.a*t,this},e.prototype.scaleAndAddToRef=function(t,i){return i.r+=this.r*t,i.g+=this.g*t,i.b+=this.b*t,i.a+=this.a*t,this},e.prototype.clampToRef=function(t,i,r){return void 0===t&&(t=0),void 0===i&&(i=1),r.r=p.Scalar.Clamp(this.r,t,i),r.g=p.Scalar.Clamp(this.g,t,i),r.b=p.Scalar.Clamp(this.b,t,i),r.a=p.Scalar.Clamp(this.a,t,i),this},e.prototype.multiply=function(t){return new e(this.r*t.r,this.g*t.g,this.b*t.b,this.a*t.a)},e.prototype.multiplyToRef=function(t,i){return i.r=this.r*t.r,i.g=this.g*t.g,i.b=this.b*t.b,i.a=this.a*t.a,i},e.prototype.toString=function(){return"{R: "+this.r+" G:"+this.g+" B:"+this.b+" A:"+this.a+"}"},e.prototype.getClassName=function(){return"Color4"},e.prototype.getHashCode=function(){var t=this.r||0;return t=397*(t=397*(t=397*t^(this.g||0))^(this.b||0))^(this.a||0)},e.prototype.clone=function(){return new e(this.r,this.g,this.b,this.a)},e.prototype.copyFrom=function(t){return this.r=t.r,this.g=t.g,this.b=t.b,this.a=t.a,this},e.prototype.copyFromFloats=function(t,i,r,o){return this.r=t,this.g=i,this.b=r,this.a=o,this},e.prototype.set=function(t,i,r,o){return this.copyFromFloats(t,i,r,o)},e.prototype.toHexString=function(){var t=255*this.r|0,i=255*this.g|0,r=255*this.b|0,o=255*this.a|0;return"#"+p.Scalar.ToHex(t)+p.Scalar.ToHex(i)+p.Scalar.ToHex(r)+p.Scalar.ToHex(o)},e.prototype.toLinearSpace=function(){var t=new e;return this.toLinearSpaceToRef(t),t},e.prototype.toLinearSpaceToRef=function(t){return t.r=Math.pow(this.r,p.ToLinearSpace),t.g=Math.pow(this.g,p.ToLinearSpace),t.b=Math.pow(this.b,p.ToLinearSpace),t.a=this.a,this},e.prototype.toGammaSpace=function(){var t=new e;return this.toGammaSpaceToRef(t),t},e.prototype.toGammaSpaceToRef=function(t){return t.r=Math.pow(this.r,p.ToGammaSpace),t.g=Math.pow(this.g,p.ToGammaSpace),t.b=Math.pow(this.b,p.ToGammaSpace),t.a=this.a,this},e.FromHexString=function(t){if("#"!==t.substring(0,1)||9!==t.length)return new e(0,0,0,0);var i=parseInt(t.substring(1,3),16),r=parseInt(t.substring(3,5),16),o=parseInt(t.substring(5,7),16),n=parseInt(t.substring(7,9),16);return e.FromInts(i,r,o,n)},e.Lerp=function(t,i,r){var o=new e(0,0,0,0);return e.LerpToRef(t,i,r,o),o},e.LerpToRef=function(t,i,r,o){o.r=t.r+(i.r-t.r)*r,o.g=t.g+(i.g-t.g)*r,o.b=t.b+(i.b-t.b)*r,o.a=t.a+(i.a-t.a)*r},e.FromColor3=function(t,i){return void 0===i&&(i=1),new e(t.r,t.g,t.b,i)},e.FromArray=function(t,i){return void 0===i&&(i=0),new e(t[i],t[i+1],t[i+2],t[i+3])},e.FromInts=function(t,i,r,o){return new e(t/255,i/255,r/255,o/255)},e.CheckColors4=function(t,i){if(t.length===3*i){for(var r=[],o=0;o<t.length;o+=3){var n=o/3*4;r[n]=t[o],r[n+1]=t[o+1],r[n+2]=t[o+2],r[n+3]=1}return r}return t},e}();p.Color4=r;var f=function(){function y(t,i){void 0===t&&(t=0),void 0===i&&(i=0),this.x=t,this.y=i}return y.prototype.toString=function(){return"{X: "+this.x+" Y:"+this.y+"}"},y.prototype.getClassName=function(){return"Vector2"},y.prototype.getHashCode=function(){var t=this.x||0;return t=397*t^(this.y||0)},y.prototype.toArray=function(t,i){return void 0===i&&(i=0),t[i]=this.x,t[i+1]=this.y,this},y.prototype.asArray=function(){var t=new Array;return this.toArray(t,0),t},y.prototype.copyFrom=function(t){return this.x=t.x,this.y=t.y,this},y.prototype.copyFromFloats=function(t,i){return this.x=t,this.y=i,this},y.prototype.set=function(t,i){return this.copyFromFloats(t,i)},y.prototype.add=function(t){return new y(this.x+t.x,this.y+t.y)},y.prototype.addToRef=function(t,i){return i.x=this.x+t.x,i.y=this.y+t.y,this},y.prototype.addInPlace=function(t){return this.x+=t.x,this.y+=t.y,this},y.prototype.addVector3=function(t){return new y(this.x+t.x,this.y+t.y)},y.prototype.subtract=function(t){return new y(this.x-t.x,this.y-t.y)},y.prototype.subtractToRef=function(t,i){return i.x=this.x-t.x,i.y=this.y-t.y,this},y.prototype.subtractInPlace=function(t){return this.x-=t.x,this.y-=t.y,this},y.prototype.multiplyInPlace=function(t){return this.x*=t.x,this.y*=t.y,this},y.prototype.multiply=function(t){return new y(this.x*t.x,this.y*t.y)},y.prototype.multiplyToRef=function(t,i){return i.x=this.x*t.x,i.y=this.y*t.y,this},y.prototype.multiplyByFloats=function(t,i){return new y(this.x*t,this.y*i)},y.prototype.divide=function(t){return new y(this.x/t.x,this.y/t.y)},y.prototype.divideToRef=function(t,i){return i.x=this.x/t.x,i.y=this.y/t.y,this},y.prototype.divideInPlace=function(t){return this.divideToRef(t,this)},y.prototype.negate=function(){return new y(-this.x,-this.y)},y.prototype.scaleInPlace=function(t){return this.x*=t,this.y*=t,this},y.prototype.scale=function(t){var i=new y(0,0);return this.scaleToRef(t,i),i},y.prototype.scaleToRef=function(t,i){return i.x=this.x*t,i.y=this.y*t,this},y.prototype.scaleAndAddToRef=function(t,i){return i.x+=this.x*t,i.y+=this.y*t,this},y.prototype.equals=function(t){return t&&this.x===t.x&&this.y===t.y},y.prototype.equalsWithEpsilon=function(t,i){return void 0===i&&(i=p.Epsilon),t&&p.Scalar.WithinEpsilon(this.x,t.x,i)&&p.Scalar.WithinEpsilon(this.y,t.y,i)},y.prototype.floor=function(){return new y(Math.floor(this.x),Math.floor(this.y))},y.prototype.fract=function(){return new y(this.x-Math.floor(this.x),this.y-Math.floor(this.y))},y.prototype.length=function(){return Math.sqrt(this.x*this.x+this.y*this.y)},y.prototype.lengthSquared=function(){return this.x*this.x+this.y*this.y},y.prototype.normalize=function(){var t=this.length();if(0===t)return this;var i=1/t;return this.x*=i,this.y*=i,this},y.prototype.clone=function(){return new y(this.x,this.y)},y.Zero=function(){return new y(0,0)},y.One=function(){return new y(1,1)},y.FromArray=function(t,i){return void 0===i&&(i=0),new y(t[i],t[i+1])},y.FromArrayToRef=function(t,i,r){r.x=t[i],r.y=t[i+1]},y.CatmullRom=function(t,i,r,o,n){var e=n*n,s=n*e;return new y(.5*(2*i.x+(-t.x+r.x)*n+(2*t.x-5*i.x+4*r.x-o.x)*e+(-t.x+3*i.x-3*r.x+o.x)*s),.5*(2*i.y+(-t.y+r.y)*n+(2*t.y-5*i.y+4*r.y-o.y)*e+(-t.y+3*i.y-3*r.y+o.y)*s))},y.Clamp=function(t,i,r){var o=t.x;o=(o=o>r.x?r.x:o)<i.x?i.x:o;var n=t.y;return new y(o,n=(n=n>r.y?r.y:n)<i.y?i.y:n)},y.Hermite=function(t,i,r,o,n){var e=n*n,s=n*e,h=2*s-3*e+1,a=-2*s+3*e,u=s-2*e+n,m=s-e;return new y(t.x*h+r.x*a+i.x*u+o.x*m,t.y*h+r.y*a+i.y*u+o.y*m)},y.Lerp=function(t,i,r){return new y(t.x+(i.x-t.x)*r,t.y+(i.y-t.y)*r)},y.Dot=function(t,i){return t.x*i.x+t.y*i.y},y.Normalize=function(t){var i=t.clone();return i.normalize(),i},y.Minimize=function(t,i){return new y(t.x<i.x?t.x:i.x,t.y<i.y?t.y:i.y)},y.Maximize=function(t,i){return new y(t.x>i.x?t.x:i.x,t.y>i.y?t.y:i.y)},y.Transform=function(t,i){var r=y.Zero();return y.TransformToRef(t,i,r),r},y.TransformToRef=function(t,i,r){var o=t.x*i.m[0]+t.y*i.m[4]+i.m[12],n=t.x*i.m[1]+t.y*i.m[5]+i.m[13];r.x=o,r.y=n},y.PointInTriangle=function(t,i,r,o){var n=.5*(-r.y*o.x+i.y*(-r.x+o.x)+i.x*(r.y-o.y)+r.x*o.y),e=n<0?-1:1,s=(i.y*o.x-i.x*o.y+(o.y-i.y)*t.x+(i.x-o.x)*t.y)*e,h=(i.x*r.y-i.y*r.x+(i.y-r.y)*t.x+(r.x-i.x)*t.y)*e;return 0<s&&0<h&&s+h<2*n*e},y.Distance=function(t,i){return Math.sqrt(y.DistanceSquared(t,i))},y.DistanceSquared=function(t,i){var r=t.x-i.x,o=t.y-i.y;return r*r+o*o},y.Center=function(t,i){var r=t.add(i);return r.scaleInPlace(.5),r},y.DistanceOfPointFromSegment=function(t,i,r){var o=y.DistanceSquared(i,r);if(0===o)return y.Distance(t,i);var n=r.subtract(i),e=Math.max(0,Math.min(1,y.Dot(t.subtract(i),n)/o)),s=i.add(n.multiplyByFloats(e,e));return y.Distance(t,s)},y}();p.Vector2=f;var l=function(){function c(t,i,r){void 0===t&&(t=0),void 0===i&&(i=0),void 0===r&&(r=0),this.x=t,this.y=i,this.z=r}return c.prototype.toString=function(){return"{X: "+this.x+" Y:"+this.y+" Z:"+this.z+"}"},c.prototype.getClassName=function(){return"Vector3"},c.prototype.getHashCode=function(){var t=this.x||0;return t=397*(t=397*t^(this.y||0))^(this.z||0)},c.prototype.asArray=function(){var t=[];return this.toArray(t,0),t},c.prototype.toArray=function(t,i){return void 0===i&&(i=0),t[i]=this.x,t[i+1]=this.y,t[i+2]=this.z,this},c.prototype.toQuaternion=function(){return p.Quaternion.RotationYawPitchRoll(this.x,this.y,this.z)},c.prototype.addInPlace=function(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this},c.prototype.add=function(t){return new c(this.x+t.x,this.y+t.y,this.z+t.z)},c.prototype.addToRef=function(t,i){return i.x=this.x+t.x,i.y=this.y+t.y,i.z=this.z+t.z,this},c.prototype.subtractInPlace=function(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this},c.prototype.subtract=function(t){return new c(this.x-t.x,this.y-t.y,this.z-t.z)},c.prototype.subtractToRef=function(t,i){return i.x=this.x-t.x,i.y=this.y-t.y,i.z=this.z-t.z,this},c.prototype.subtractFromFloats=function(t,i,r){return new c(this.x-t,this.y-i,this.z-r)},c.prototype.subtractFromFloatsToRef=function(t,i,r,o){return o.x=this.x-t,o.y=this.y-i,o.z=this.z-r,this},c.prototype.negate=function(){return new c(-this.x,-this.y,-this.z)},c.prototype.scaleInPlace=function(t){return this.x*=t,this.y*=t,this.z*=t,this},c.prototype.scale=function(t){return new c(this.x*t,this.y*t,this.z*t)},c.prototype.scaleToRef=function(t,i){return i.x=this.x*t,i.y=this.y*t,i.z=this.z*t,this},c.prototype.scaleAndAddToRef=function(t,i){return i.x+=this.x*t,i.y+=this.y*t,i.z+=this.z*t,this},c.prototype.equals=function(t){return t&&this.x===t.x&&this.y===t.y&&this.z===t.z},c.prototype.equalsWithEpsilon=function(t,i){return void 0===i&&(i=p.Epsilon),t&&p.Scalar.WithinEpsilon(this.x,t.x,i)&&p.Scalar.WithinEpsilon(this.y,t.y,i)&&p.Scalar.WithinEpsilon(this.z,t.z,i)},c.prototype.equalsToFloats=function(t,i,r){return this.x===t&&this.y===i&&this.z===r},c.prototype.multiplyInPlace=function(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this},c.prototype.multiply=function(t){return new c(this.x*t.x,this.y*t.y,this.z*t.z)},c.prototype.multiplyToRef=function(t,i){return i.x=this.x*t.x,i.y=this.y*t.y,i.z=this.z*t.z,this},c.prototype.multiplyByFloats=function(t,i,r){return new c(this.x*t,this.y*i,this.z*r)},c.prototype.divide=function(t){return new c(this.x/t.x,this.y/t.y,this.z/t.z)},c.prototype.divideToRef=function(t,i){return i.x=this.x/t.x,i.y=this.y/t.y,i.z=this.z/t.z,this},c.prototype.divideInPlace=function(t){return this.divideToRef(t,this)},c.prototype.minimizeInPlace=function(t){return this.minimizeInPlaceFromFloats(t.x,t.y,t.z)},c.prototype.maximizeInPlace=function(t){return this.maximizeInPlaceFromFloats(t.x,t.y,t.z)},c.prototype.minimizeInPlaceFromFloats=function(t,i,r){return t<this.x&&(this.x=t),i<this.y&&(this.y=i),r<this.z&&(this.z=r),this},c.prototype.maximizeInPlaceFromFloats=function(t,i,r){return t>this.x&&(this.x=t),i>this.y&&(this.y=i),r>this.z&&(this.z=r),this},Object.defineProperty(c.prototype,"isNonUniform",{get:function(){var t=Math.abs(this.x),i=Math.abs(this.y);if(t!==i)return!0;var r=Math.abs(this.z);return t!==r||i!==r},enumerable:!0,configurable:!0}),c.prototype.floor=function(){return new c(Math.floor(this.x),Math.floor(this.y),Math.floor(this.z))},c.prototype.fract=function(){return new c(this.x-Math.floor(this.x),this.y-Math.floor(this.y),this.z-Math.floor(this.z))},c.prototype.length=function(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)},c.prototype.lengthSquared=function(){return this.x*this.x+this.y*this.y+this.z*this.z},c.prototype.normalize=function(){var t=this.length();if(0===t||1===t)return this;var i=1/t;return this.x*=i,this.y*=i,this.z*=i,this},c.prototype.normalizeToNew=function(){var t=new c(0,0,0);return this.normalizeToRef(t),t},c.prototype.normalizeToRef=function(t){var i=this.length();if(0===i||1===i)return t.set(this.x,this.y,this.z),t;var r=1/i;return this.scaleToRef(r,t),t},c.prototype.clone=function(){return new c(this.x,this.y,this.z)},c.prototype.copyFrom=function(t){return this.x=t.x,this.y=t.y,this.z=t.z,this},c.prototype.copyFromFloats=function(t,i,r){return this.x=t,this.y=i,this.z=r,this},c.prototype.set=function(t,i,r){return this.copyFromFloats(t,i,r)},c.GetClipFactor=function(t,i,r,o){var n=c.Dot(t,r)-o;return n/(n-(c.Dot(i,r)-o))},c.GetAngleBetweenVectors=function(t,i,r){var o=_.Vector3[1].copyFrom(t).normalize(),n=_.Vector3[2].copyFrom(i).normalize(),e=c.Dot(o,n),s=_.Vector3[3];return c.CrossToRef(o,n,s),0<c.Dot(s,r)?Math.acos(e):-Math.acos(e)},c.FromArray=function(t,i){return i||(i=0),new c(t[i],t[i+1],t[i+2])},c.FromFloatArray=function(t,i){return c.FromArray(t,i)},c.FromArrayToRef=function(t,i,r){r.x=t[i],r.y=t[i+1],r.z=t[i+2]},c.FromFloatArrayToRef=function(t,i,r){return c.FromArrayToRef(t,i,r)},c.FromFloatsToRef=function(t,i,r,o){o.x=t,o.y=i,o.z=r},c.Zero=function(){return new c(0,0,0)},c.One=function(){return new c(1,1,1)},c.Up=function(){return new c(0,1,0)},c.Down=function(){return new c(0,-1,0)},c.Forward=function(){return new c(0,0,1)},c.Backward=function(){return new c(0,0,-1)},c.Right=function(){return new c(1,0,0)},c.Left=function(){return new c(-1,0,0)},c.TransformCoordinates=function(t,i){var r=c.Zero();return c.TransformCoordinatesToRef(t,i,r),r},c.TransformCoordinatesToRef=function(t,i,r){var o=t.x*i.m[0]+t.y*i.m[4]+t.z*i.m[8]+i.m[12],n=t.x*i.m[1]+t.y*i.m[5]+t.z*i.m[9]+i.m[13],e=t.x*i.m[2]+t.y*i.m[6]+t.z*i.m[10]+i.m[14],s=t.x*i.m[3]+t.y*i.m[7]+t.z*i.m[11]+i.m[15];r.x=o/s,r.y=n/s,r.z=e/s},c.TransformCoordinatesFromFloatsToRef=function(t,i,r,o,n){var e=t*o.m[0]+i*o.m[4]+r*o.m[8]+o.m[12],s=t*o.m[1]+i*o.m[5]+r*o.m[9]+o.m[13],h=t*o.m[2]+i*o.m[6]+r*o.m[10]+o.m[14],a=t*o.m[3]+i*o.m[7]+r*o.m[11]+o.m[15];n.x=e/a,n.y=s/a,n.z=h/a},c.TransformNormal=function(t,i){var r=c.Zero();return c.TransformNormalToRef(t,i,r),r},c.TransformNormalToRef=function(t,i,r){var o=t.x*i.m[0]+t.y*i.m[4]+t.z*i.m[8],n=t.x*i.m[1]+t.y*i.m[5]+t.z*i.m[9],e=t.x*i.m[2]+t.y*i.m[6]+t.z*i.m[10];r.x=o,r.y=n,r.z=e},c.TransformNormalFromFloatsToRef=function(t,i,r,o,n){n.x=t*o.m[0]+i*o.m[4]+r*o.m[8],n.y=t*o.m[1]+i*o.m[5]+r*o.m[9],n.z=t*o.m[2]+i*o.m[6]+r*o.m[10]},c.CatmullRom=function(t,i,r,o,n){var e=n*n,s=n*e;return new c(.5*(2*i.x+(-t.x+r.x)*n+(2*t.x-5*i.x+4*r.x-o.x)*e+(-t.x+3*i.x-3*r.x+o.x)*s),.5*(2*i.y+(-t.y+r.y)*n+(2*t.y-5*i.y+4*r.y-o.y)*e+(-t.y+3*i.y-3*r.y+o.y)*s),.5*(2*i.z+(-t.z+r.z)*n+(2*t.z-5*i.z+4*r.z-o.z)*e+(-t.z+3*i.z-3*r.z+o.z)*s))},c.Clamp=function(t,i,r){var o=t.x;o=(o=o>r.x?r.x:o)<i.x?i.x:o;var n=t.y;n=(n=n>r.y?r.y:n)<i.y?i.y:n;var e=t.z;return new c(o,n,e=(e=e>r.z?r.z:e)<i.z?i.z:e)},c.Hermite=function(t,i,r,o,n){var e=n*n,s=n*e,h=2*s-3*e+1,a=-2*s+3*e,u=s-2*e+n,m=s-e;return new c(t.x*h+r.x*a+i.x*u+o.x*m,t.y*h+r.y*a+i.y*u+o.y*m,t.z*h+r.z*a+i.z*u+o.z*m)},c.Lerp=function(t,i,r){var o=new c(0,0,0);return c.LerpToRef(t,i,r,o),o},c.LerpToRef=function(t,i,r,o){o.x=t.x+(i.x-t.x)*r,o.y=t.y+(i.y-t.y)*r,o.z=t.z+(i.z-t.z)*r},c.Dot=function(t,i){return t.x*i.x+t.y*i.y+t.z*i.z},c.Cross=function(t,i){var r=c.Zero();return c.CrossToRef(t,i,r),r},c.CrossToRef=function(t,i,r){_.Vector3[0].x=t.y*i.z-t.z*i.y,_.Vector3[0].y=t.z*i.x-t.x*i.z,_.Vector3[0].z=t.x*i.y-t.y*i.x,r.copyFrom(_.Vector3[0])},c.Normalize=function(t){var i=c.Zero();return c.NormalizeToRef(t,i),i},c.NormalizeToRef=function(t,i){i.copyFrom(t),i.normalize()},c.Project=function(t,i,r,o){var n=o.width,e=o.height,s=o.x,h=o.y,a=c._viewportMatrixCache?c._viewportMatrixCache:c._viewportMatrixCache=new m;m.FromValuesToRef(n/2,0,0,0,0,-e/2,0,0,0,0,.5,0,s+n/2,e/2+h,.5,1,a);var u=_.Matrix[0];return i.multiplyToRef(r,u),u.multiplyToRef(a,u),c.TransformCoordinates(t,u)},c.UnprojectFromTransform=function(t,i,r,o,n){var e=_.Matrix[0];o.multiplyToRef(n,e),e.invert(),t.x=t.x/i*2-1,t.y=-(t.y/r*2-1);var s=c.TransformCoordinates(t,e),h=t.x*e.m[3]+t.y*e.m[7]+t.z*e.m[11]+e.m[15];return p.Scalar.WithinEpsilon(h,1)&&(s=s.scale(1/h)),s},c.Unproject=function(t,i,r,o,n,e){var s=c.Zero();return c.UnprojectToRef(t,i,r,o,n,e,s),s},c.UnprojectToRef=function(t,i,r,o,n,e,s){c.UnprojectFloatsToRef(t.x,t.y,t.z,i,r,o,n,e,s)},c.UnprojectFloatsToRef=function(t,i,r,o,n,e,s,h,a){var u=_.Matrix[0];e.multiplyToRef(s,u),u.multiplyToRef(h,u),u.invert();var m=_.Vector3[0];m.x=t/o*2-1,m.y=-(i/n*2-1),m.z=2*r-1,c.TransformCoordinatesToRef(m,u,a);var y=m.x*u.m[3]+m.y*u.m[7]+m.z*u.m[11]+u.m[15];p.Scalar.WithinEpsilon(y,1)&&a.scaleInPlace(1/y)},c.Minimize=function(t,i){var r=t.clone();return r.minimizeInPlace(i),r},c.Maximize=function(t,i){var r=t.clone();return r.maximizeInPlace(i),r},c.Distance=function(t,i){return Math.sqrt(c.DistanceSquared(t,i))},c.DistanceSquared=function(t,i){var r=t.x-i.x,o=t.y-i.y,n=t.z-i.z;return r*r+o*o+n*n},c.Center=function(t,i){var r=t.add(i);return r.scaleInPlace(.5),r},c.RotationFromAxis=function(t,i,r){var o=c.Zero();return c.RotationFromAxisToRef(t,i,r,o),o},c.RotationFromAxisToRef=function(t,i,r,o){var n=_.Quaternion[0];x.RotationQuaternionFromAxisToRef(t,i,r,n),n.toEulerAnglesToRef(o)},c}();p.Vector3=l;var o=function(){function n(t,i,r,o){this.x=t,this.y=i,this.z=r,this.w=o}return n.prototype.toString=function(){return"{X: "+this.x+" Y:"+this.y+" Z:"+this.z+" W:"+this.w+"}"},n.prototype.getClassName=function(){return"Vector4"},n.prototype.getHashCode=function(){var t=this.x||0;return t=397*(t=397*(t=397*t^(this.y||0))^(this.z||0))^(this.w||0)},n.prototype.asArray=function(){var t=new Array;return this.toArray(t,0),t},n.prototype.toArray=function(t,i){return void 0===i&&(i=0),t[i]=this.x,t[i+1]=this.y,t[i+2]=this.z,t[i+3]=this.w,this},n.prototype.addInPlace=function(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this},n.prototype.add=function(t){return new n(this.x+t.x,this.y+t.y,this.z+t.z,this.w+t.w)},n.prototype.addToRef=function(t,i){return i.x=this.x+t.x,i.y=this.y+t.y,i.z=this.z+t.z,i.w=this.w+t.w,this},n.prototype.subtractInPlace=function(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this},n.prototype.subtract=function(t){return new n(this.x-t.x,this.y-t.y,this.z-t.z,this.w-t.w)},n.prototype.subtractToRef=function(t,i){return i.x=this.x-t.x,i.y=this.y-t.y,i.z=this.z-t.z,i.w=this.w-t.w,this},n.prototype.subtractFromFloats=function(t,i,r,o){return new n(this.x-t,this.y-i,this.z-r,this.w-o)},n.prototype.subtractFromFloatsToRef=function(t,i,r,o,n){return n.x=this.x-t,n.y=this.y-i,n.z=this.z-r,n.w=this.w-o,this},n.prototype.negate=function(){return new n(-this.x,-this.y,-this.z,-this.w)},n.prototype.scaleInPlace=function(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this},n.prototype.scale=function(t){return new n(this.x*t,this.y*t,this.z*t,this.w*t)},n.prototype.scaleToRef=function(t,i){return i.x=this.x*t,i.y=this.y*t,i.z=this.z*t,i.w=this.w*t,this},n.prototype.scaleAndAddToRef=function(t,i){return i.x+=this.x*t,i.y+=this.y*t,i.z+=this.z*t,i.w+=this.w*t,this},n.prototype.equals=function(t){return t&&this.x===t.x&&this.y===t.y&&this.z===t.z&&this.w===t.w},n.prototype.equalsWithEpsilon=function(t,i){return void 0===i&&(i=p.Epsilon),t&&p.Scalar.WithinEpsilon(this.x,t.x,i)&&p.Scalar.WithinEpsilon(this.y,t.y,i)&&p.Scalar.WithinEpsilon(this.z,t.z,i)&&p.Scalar.WithinEpsilon(this.w,t.w,i)},n.prototype.equalsToFloats=function(t,i,r,o){return this.x===t&&this.y===i&&this.z===r&&this.w===o},n.prototype.multiplyInPlace=function(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this},n.prototype.multiply=function(t){return new n(this.x*t.x,this.y*t.y,this.z*t.z,this.w*t.w)},n.prototype.multiplyToRef=function(t,i){return i.x=this.x*t.x,i.y=this.y*t.y,i.z=this.z*t.z,i.w=this.w*t.w,this},n.prototype.multiplyByFloats=function(t,i,r,o){return new n(this.x*t,this.y*i,this.z*r,this.w*o)},n.prototype.divide=function(t){return new n(this.x/t.x,this.y/t.y,this.z/t.z,this.w/t.w)},n.prototype.divideToRef=function(t,i){return i.x=this.x/t.x,i.y=this.y/t.y,i.z=this.z/t.z,i.w=this.w/t.w,this},n.prototype.divideInPlace=function(t){return this.divideToRef(t,this)},n.prototype.minimizeInPlace=function(t){return t.x<this.x&&(this.x=t.x),t.y<this.y&&(this.y=t.y),t.z<this.z&&(this.z=t.z),t.w<this.w&&(this.w=t.w),this},n.prototype.maximizeInPlace=function(t){return t.x>this.x&&(this.x=t.x),t.y>this.y&&(this.y=t.y),t.z>this.z&&(this.z=t.z),t.w>this.w&&(this.w=t.w),this},n.prototype.floor=function(){return new n(Math.floor(this.x),Math.floor(this.y),Math.floor(this.z),Math.floor(this.w))},n.prototype.fract=function(){return new n(this.x-Math.floor(this.x),this.y-Math.floor(this.y),this.z-Math.floor(this.z),this.w-Math.floor(this.w))},n.prototype.length=function(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)},n.prototype.lengthSquared=function(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w},n.prototype.normalize=function(){var t=this.length();if(0===t)return this;var i=1/t;return this.x*=i,this.y*=i,this.z*=i,this.w*=i,this},n.prototype.toVector3=function(){return new l(this.x,this.y,this.z)},n.prototype.clone=function(){return new n(this.x,this.y,this.z,this.w)},n.prototype.copyFrom=function(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w,this},n.prototype.copyFromFloats=function(t,i,r,o){return this.x=t,this.y=i,this.z=r,this.w=o,this},n.prototype.set=function(t,i,r,o){return this.copyFromFloats(t,i,r,o)},n.FromArray=function(t,i){return i||(i=0),new n(t[i],t[i+1],t[i+2],t[i+3])},n.FromArrayToRef=function(t,i,r){r.x=t[i],r.y=t[i+1],r.z=t[i+2],r.w=t[i+3]},n.FromFloatArrayToRef=function(t,i,r){n.FromArrayToRef(t,i,r)},n.FromFloatsToRef=function(t,i,r,o,n){n.x=t,n.y=i,n.z=r,n.w=o},n.Zero=function(){return new n(0,0,0,0)},n.One=function(){return new n(1,1,1,1)},n.Normalize=function(t){var i=n.Zero();return n.NormalizeToRef(t,i),i},n.NormalizeToRef=function(t,i){i.copyFrom(t),i.normalize()},n.Minimize=function(t,i){var r=t.clone();return r.minimizeInPlace(i),r},n.Maximize=function(t,i){var r=t.clone();return r.maximizeInPlace(i),r},n.Distance=function(t,i){return Math.sqrt(n.DistanceSquared(t,i))},n.DistanceSquared=function(t,i){var r=t.x-i.x,o=t.y-i.y,n=t.z-i.z,e=t.w-i.w;return r*r+o*o+n*n+e*e},n.Center=function(t,i){var r=t.add(i);return r.scaleInPlace(.5),r},n.TransformNormal=function(t,i){var r=n.Zero();return n.TransformNormalToRef(t,i,r),r},n.TransformNormalToRef=function(t,i,r){var o=t.x*i.m[0]+t.y*i.m[4]+t.z*i.m[8],n=t.x*i.m[1]+t.y*i.m[5]+t.z*i.m[9],e=t.x*i.m[2]+t.y*i.m[6]+t.z*i.m[10];r.x=o,r.y=n,r.z=e,r.w=t.w},n.TransformNormalFromFloatsToRef=function(t,i,r,o,n,e){e.x=t*n.m[0]+i*n.m[4]+r*n.m[8],e.y=t*n.m[1]+i*n.m[5]+r*n.m[9],e.z=t*n.m[2]+i*n.m[6]+r*n.m[10],e.w=o},n}();p.Vector4=o;var t=function(){function o(t,i){this.width=t,this.height=i}return o.prototype.toString=function(){return"{W: "+this.width+", H: "+this.height+"}"},o.prototype.getClassName=function(){return"Size"},o.prototype.getHashCode=function(){var t=this.width||0;return t=397*t^(this.height||0)},o.prototype.copyFrom=function(t){this.width=t.width,this.height=t.height},o.prototype.copyFromFloats=function(t,i){return this.width=t,this.height=i,this},o.prototype.set=function(t,i){return this.copyFromFloats(t,i)},o.prototype.multiplyByFloats=function(t,i){return new o(this.width*t,this.height*i)},o.prototype.clone=function(){return new o(this.width,this.height)},o.prototype.equals=function(t){return!!t&&(this.width===t.width&&this.height===t.height)},Object.defineProperty(o.prototype,"surface",{get:function(){return this.width*this.height},enumerable:!0,configurable:!0}),o.Zero=function(){return new o(0,0)},o.prototype.add=function(t){return new o(this.width+t.width,this.height+t.height)},o.prototype.subtract=function(t){return new o(this.width-t.width,this.height-t.height)},o.Lerp=function(t,i,r){return new o(t.width+(i.width-t.width)*r,t.height+(i.height-t.height)*r)},o}();p.Size=t;var x=function(){function y(t,i,r,o){void 0===t&&(t=0),void 0===i&&(i=0),void 0===r&&(r=0),void 0===o&&(o=1),this.x=t,this.y=i,this.z=r,this.w=o}return y.prototype.toString=function(){return"{X: "+this.x+" Y:"+this.y+" Z:"+this.z+" W:"+this.w+"}"},y.prototype.getClassName=function(){return"Quaternion"},y.prototype.getHashCode=function(){var t=this.x||0;return t=397*(t=397*(t=397*t^(this.y||0))^(this.z||0))^(this.w||0)},y.prototype.asArray=function(){return[this.x,this.y,this.z,this.w]},y.prototype.equals=function(t){return t&&this.x===t.x&&this.y===t.y&&this.z===t.z&&this.w===t.w},y.prototype.clone=function(){return new y(this.x,this.y,this.z,this.w)},y.prototype.copyFrom=function(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w,this},y.prototype.copyFromFloats=function(t,i,r,o){return this.x=t,this.y=i,this.z=r,this.w=o,this},y.prototype.set=function(t,i,r,o){return this.copyFromFloats(t,i,r,o)},y.prototype.add=function(t){return new y(this.x+t.x,this.y+t.y,this.z+t.z,this.w+t.w)},y.prototype.addInPlace=function(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this},y.prototype.subtract=function(t){return new y(this.x-t.x,this.y-t.y,this.z-t.z,this.w-t.w)},y.prototype.scale=function(t){return new y(this.x*t,this.y*t,this.z*t,this.w*t)},y.prototype.scaleToRef=function(t,i){return i.x=this.x*t,i.y=this.y*t,i.z=this.z*t,i.w=this.w*t,this},y.prototype.scaleInPlace=function(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this},y.prototype.scaleAndAddToRef=function(t,i){return i.x+=this.x*t,i.y+=this.y*t,i.z+=this.z*t,i.w+=this.w*t,this},y.prototype.multiply=function(t){var i=new y(0,0,0,1);return this.multiplyToRef(t,i),i},y.prototype.multiplyToRef=function(t,i){var r=this.x*t.w+this.y*t.z-this.z*t.y+this.w*t.x,o=-this.x*t.z+this.y*t.w+this.z*t.x+this.w*t.y,n=this.x*t.y-this.y*t.x+this.z*t.w+this.w*t.z,e=-this.x*t.x-this.y*t.y-this.z*t.z+this.w*t.w;return i.copyFromFloats(r,o,n,e),this},y.prototype.multiplyInPlace=function(t){return this.multiplyToRef(t,this),this},y.prototype.conjugateToRef=function(t){return t.copyFromFloats(-this.x,-this.y,-this.z,this.w),this},y.prototype.conjugateInPlace=function(){return this.x*=-1,this.y*=-1,this.z*=-1,this},y.prototype.conjugate=function(){return new y(-this.x,-this.y,-this.z,this.w)},y.prototype.length=function(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)},y.prototype.normalize=function(){var t=1/this.length();return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this},y.prototype.toEulerAngles=function(t){void 0===t&&(t="YZX");var i=l.Zero();return this.toEulerAnglesToRef(i,t),i},y.prototype.toEulerAnglesToRef=function(t,i){void 0===i&&(i="YZX");var r=this.z,o=this.x,n=this.y,e=this.w,s=e*e,h=r*r,a=o*o,u=n*n,m=n*r-o*e;return m<-.4999999?(t.y=2*Math.atan2(n,e),t.x=Math.PI/2,t.z=0):.4999999<m?(t.y=2*Math.atan2(n,e),t.x=-Math.PI/2,t.z=0):(t.z=Math.atan2(2*(o*n+r*e),-h-a+u+s),t.x=Math.asin(-2*(r*n-o*e)),t.y=Math.atan2(2*(r*o+n*e),h-a-u+s)),this},y.prototype.toRotationMatrix=function(t){var i=this.x*this.x,r=this.y*this.y,o=this.z*this.z,n=this.x*this.y,e=this.z*this.w,s=this.z*this.x,h=this.y*this.w,a=this.y*this.z,u=this.x*this.w;return t.m[0]=1-2*(r+o),t.m[1]=2*(n+e),t.m[2]=2*(s-h),t.m[3]=0,t.m[4]=2*(n-e),t.m[5]=1-2*(o+i),t.m[6]=2*(a+u),t.m[7]=0,t.m[8]=2*(s+h),t.m[9]=2*(a-u),t.m[10]=1-2*(r+i),t.m[11]=0,t.m[12]=0,t.m[13]=0,t.m[14]=0,t.m[15]=1,t._markAsUpdated(),this},y.prototype.fromRotationMatrix=function(t){return y.FromRotationMatrixToRef(t,this),this},y.FromRotationMatrix=function(t){var i=new y;return y.FromRotationMatrixToRef(t,i),i},y.FromRotationMatrixToRef=function(t,i){var r,o=t.m,n=o[0],e=o[4],s=o[8],h=o[1],a=o[5],u=o[9],m=o[2],y=o[6],c=o[10],p=n+a+c;0<p?(r=.5/Math.sqrt(p+1),i.w=.25/r,i.x=(y-u)*r,i.y=(s-m)*r,i.z=(h-e)*r):a<n&&c<n?(r=2*Math.sqrt(1+n-a-c),i.w=(y-u)/r,i.x=.25*r,i.y=(e+h)/r,i.z=(s+m)/r):c<a?(r=2*Math.sqrt(1+a-n-c),i.w=(s-m)/r,i.x=(e+h)/r,i.y=.25*r,i.z=(u+y)/r):(r=2*Math.sqrt(1+c-n-a),i.w=(h-e)/r,i.x=(s+m)/r,i.y=(u+y)/r,i.z=.25*r)},y.Dot=function(t,i){return t.x*i.x+t.y*i.y+t.z*i.z+t.w*i.w},y.AreClose=function(t,i){return 0<=y.Dot(t,i)},y.Zero=function(){return new y(0,0,0,0)},y.Inverse=function(t){return new y(-t.x,-t.y,-t.z,t.w)},y.Identity=function(){return new y(0,0,0,1)},y.IsIdentity=function(t){return t&&0===t.x&&0===t.y&&0===t.z&&1===t.w},y.RotationAxis=function(t,i){return y.RotationAxisToRef(t,i,new y)},y.RotationAxisToRef=function(t,i,r){var o=Math.sin(i/2);return t.normalize(),r.w=Math.cos(i/2),r.x=t.x*o,r.y=t.y*o,r.z=t.z*o,r},y.FromArray=function(t,i){return i||(i=0),new y(t[i],t[i+1],t[i+2],t[i+3])},y.RotationYawPitchRoll=function(t,i,r){var o=new y;return y.RotationYawPitchRollToRef(t,i,r,o),o},y.RotationYawPitchRollToRef=function(t,i,r,o){var n=.5*r,e=.5*i,s=.5*t,h=Math.sin(n),a=Math.cos(n),u=Math.sin(e),m=Math.cos(e),y=Math.sin(s),c=Math.cos(s);o.x=c*u*a+y*m*h,o.y=y*m*a-c*u*h,o.z=c*m*h-y*u*a,o.w=c*m*a+y*u*h},y.RotationAlphaBetaGamma=function(t,i,r){var o=new y;return y.RotationAlphaBetaGammaToRef(t,i,r,o),o},y.RotationAlphaBetaGammaToRef=function(t,i,r,o){var n=.5*(r+t),e=.5*(r-t),s=.5*i;o.x=Math.cos(e)*Math.sin(s),o.y=Math.sin(e)*Math.sin(s),o.z=Math.sin(n)*Math.cos(s),o.w=Math.cos(n)*Math.cos(s)},y.RotationQuaternionFromAxis=function(t,i,r){var o=new y(0,0,0,0);return y.RotationQuaternionFromAxisToRef(t,i,r,o),o},y.RotationQuaternionFromAxisToRef=function(t,i,r,o){var n=_.Matrix[0];m.FromXYZAxesToRef(t.normalize(),i.normalize(),r.normalize(),n),y.FromRotationMatrixToRef(n,o)},y.Slerp=function(t,i,r){var o=y.Identity();return y.SlerpToRef(t,i,r,o),o},y.SlerpToRef=function(t,i,r,o){var n,e,s=t.x*i.x+t.y*i.y+t.z*i.z+t.w*i.w,h=!1;if(s<0&&(h=!0,s=-s),.999999<s)e=1-r,n=h?-r:r;else{var a=Math.acos(s),u=1/Math.sin(a);e=Math.sin((1-r)*a)*u,n=h?-Math.sin(r*a)*u:Math.sin(r*a)*u}o.x=e*t.x+n*i.x,o.y=e*t.y+n*i.y,o.z=e*t.z+n*i.z,o.w=e*t.w+n*i.w},y.Hermite=function(t,i,r,o,n){var e=n*n,s=n*e,h=2*s-3*e+1,a=-2*s+3*e,u=s-2*e+n,m=s-e;return new y(t.x*h+r.x*a+i.x*u+o.x*m,t.y*h+r.y*a+i.y*u+o.y*m,t.z*h+r.z*a+i.z*u+o.z*m,t.w*h+r.w*a+i.w*u+o.w*m)},y}();p.Quaternion=x;var m=function(){function z(){this._isIdentity=!1,this._isIdentityDirty=!0,this.m=new Float32Array(16),this._markAsUpdated()}return z.prototype._markAsUpdated=function(){this.updateFlag=z._updateFlagSeed++,this._isIdentityDirty=!0},z.prototype.isIdentity=function(t){return void 0===t&&(t=!1),this._isIdentityDirty&&(this._isIdentityDirty=!1,1!==this.m[0]||1!==this.m[5]||1!==this.m[15]?this._isIdentity=!1:0!==this.m[1]||0!==this.m[2]||0!==this.m[3]||0!==this.m[4]||0!==this.m[6]||0!==this.m[7]||0!==this.m[8]||0!==this.m[9]||0!==this.m[11]||0!==this.m[12]||0!==this.m[13]||0!==this.m[14]?this._isIdentity=!1:this._isIdentity=!0,t||1===this.m[10]||(this._isIdentity=!1)),this._isIdentity},z.prototype.determinant=function(){var t=this.m[10]*this.m[15]-this.m[11]*this.m[14],i=this.m[9]*this.m[15]-this.m[11]*this.m[13],r=this.m[9]*this.m[14]-this.m[10]*this.m[13],o=this.m[8]*this.m[15]-this.m[11]*this.m[12],n=this.m[8]*this.m[14]-this.m[10]*this.m[12],e=this.m[8]*this.m[13]-this.m[9]*this.m[12];return this.m[0]*(this.m[5]*t-this.m[6]*i+this.m[7]*r)-this.m[1]*(this.m[4]*t-this.m[6]*o+this.m[7]*n)+this.m[2]*(this.m[4]*i-this.m[5]*o+this.m[7]*e)-this.m[3]*(this.m[4]*r-this.m[5]*n+this.m[6]*e)},z.prototype.toArray=function(){return this.m},z.prototype.asArray=function(){return this.toArray()},z.prototype.invert=function(){return this.invertToRef(this),this},z.prototype.reset=function(){for(var t=0;t<16;t++)this.m[t]=0;return this._markAsUpdated(),this},z.prototype.add=function(t){var i=new z;return this.addToRef(t,i),i},z.prototype.addToRef=function(t,i){for(var r=0;r<16;r++)i.m[r]=this.m[r]+t.m[r];return i._markAsUpdated(),this},z.prototype.addToSelf=function(t){for(var i=0;i<16;i++)this.m[i]+=t.m[i];return this._markAsUpdated(),this},z.prototype.invertToRef=function(t){var i=this.m[0],r=this.m[1],o=this.m[2],n=this.m[3],e=this.m[4],s=this.m[5],h=this.m[6],a=this.m[7],u=this.m[8],m=this.m[9],y=this.m[10],c=this.m[11],p=this.m[12],f=this.m[13],l=this.m[14],x=this.m[15],z=y*x-c*l,w=m*x-c*f,d=m*l-y*f,v=u*x-c*p,R=u*l-y*p,T=u*f-m*p,g=s*z-h*w+a*d,A=-(e*z-h*v+a*R),_=e*w-s*v+a*T,F=-(e*d-s*R+h*T),M=1/(i*g+r*A+o*_+n*F),b=h*x-a*l,P=s*x-a*f,C=s*l-h*f,S=e*x-a*p,Z=e*l-h*p,I=e*f-s*p,L=h*c-a*y,V=s*c-a*m,D=s*y-h*m,H=e*c-a*u,N=e*y-h*u,q=e*m-s*u;return t.m[0]=g*M,t.m[4]=A*M,t.m[8]=_*M,t.m[12]=F*M,t.m[1]=-(r*z-o*w+n*d)*M,t.m[5]=(i*z-o*v+n*R)*M,t.m[9]=-(i*w-r*v+n*T)*M,t.m[13]=(i*d-r*R+o*T)*M,t.m[2]=(r*b-o*P+n*C)*M,t.m[6]=-(i*b-o*S+n*Z)*M,t.m[10]=(i*P-r*S+n*I)*M,t.m[14]=-(i*C-r*Z+o*I)*M,t.m[3]=-(r*L-o*V+n*D)*M,t.m[7]=(i*L-o*H+n*N)*M,t.m[11]=-(i*V-r*H+n*q)*M,t.m[15]=(i*D-r*N+o*q)*M,t._markAsUpdated(),this},z.prototype.setTranslationFromFloats=function(t,i,r){return this.m[12]=t,this.m[13]=i,this.m[14]=r,this._markAsUpdated(),this},z.prototype.setTranslation=function(t){return this.m[12]=t.x,this.m[13]=t.y,this.m[14]=t.z,this._markAsUpdated(),this},z.prototype.getTranslation=function(){return new l(this.m[12],this.m[13],this.m[14])},z.prototype.getTranslationToRef=function(t){return t.x=this.m[12],t.y=this.m[13],t.z=this.m[14],this},z.prototype.removeRotationAndScaling=function(){return this.setRowFromFloats(0,1,0,0,0),this.setRowFromFloats(1,0,1,0,0),this.setRowFromFloats(2,0,0,1,0),this},z.prototype.multiply=function(t){var i=new z;return this.multiplyToRef(t,i),i},z.prototype.copyFrom=function(t){for(var i=0;i<16;i++)this.m[i]=t.m[i];return this._markAsUpdated(),this},z.prototype.copyToArray=function(t,i){void 0===i&&(i=0);for(var r=0;r<16;r++)t[i+r]=this.m[r];return this},z.prototype.multiplyToRef=function(t,i){return this.multiplyToArray(t,i.m,0),i._markAsUpdated(),this},z.prototype.multiplyToArray=function(t,i,r){var o=this.m[0],n=this.m[1],e=this.m[2],s=this.m[3],h=this.m[4],a=this.m[5],u=this.m[6],m=this.m[7],y=this.m[8],c=this.m[9],p=this.m[10],f=this.m[11],l=this.m[12],x=this.m[13],z=this.m[14],w=this.m[15],d=t.m[0],v=t.m[1],R=t.m[2],T=t.m[3],g=t.m[4],A=t.m[5],_=t.m[6],F=t.m[7],M=t.m[8],b=t.m[9],P=t.m[10],C=t.m[11],S=t.m[12],Z=t.m[13],I=t.m[14],L=t.m[15];return i[r]=o*d+n*g+e*M+s*S,i[r+1]=o*v+n*A+e*b+s*Z,i[r+2]=o*R+n*_+e*P+s*I,i[r+3]=o*T+n*F+e*C+s*L,i[r+4]=h*d+a*g+u*M+m*S,i[r+5]=h*v+a*A+u*b+m*Z,i[r+6]=h*R+a*_+u*P+m*I,i[r+7]=h*T+a*F+u*C+m*L,i[r+8]=y*d+c*g+p*M+f*S,i[r+9]=y*v+c*A+p*b+f*Z,i[r+10]=y*R+c*_+p*P+f*I,i[r+11]=y*T+c*F+p*C+f*L,i[r+12]=l*d+x*g+z*M+w*S,i[r+13]=l*v+x*A+z*b+w*Z,i[r+14]=l*R+x*_+z*P+w*I,i[r+15]=l*T+x*F+z*C+w*L,this},z.prototype.equals=function(t){return t&&this.m[0]===t.m[0]&&this.m[1]===t.m[1]&&this.m[2]===t.m[2]&&this.m[3]===t.m[3]&&this.m[4]===t.m[4]&&this.m[5]===t.m[5]&&this.m[6]===t.m[6]&&this.m[7]===t.m[7]&&this.m[8]===t.m[8]&&this.m[9]===t.m[9]&&this.m[10]===t.m[10]&&this.m[11]===t.m[11]&&this.m[12]===t.m[12]&&this.m[13]===t.m[13]&&this.m[14]===t.m[14]&&this.m[15]===t.m[15]},z.prototype.clone=function(){return z.FromValues(this.m[0],this.m[1],this.m[2],this.m[3],this.m[4],this.m[5],this.m[6],this.m[7],this.m[8],this.m[9],this.m[10],this.m[11],this.m[12],this.m[13],this.m[14],this.m[15])},z.prototype.getClassName=function(){return"Matrix"},z.prototype.getHashCode=function(){for(var t=this.m[0]||0,i=1;i<16;i++)t=397*t^(this.m[i]||0);return t},z.prototype.decompose=function(t,i,r){return r&&(r.x=this.m[12],r.y=this.m[13],r.z=this.m[14]),(t=t||_.Vector3[0]).x=Math.sqrt(this.m[0]*this.m[0]+this.m[1]*this.m[1]+this.m[2]*this.m[2]),t.y=Math.sqrt(this.m[4]*this.m[4]+this.m[5]*this.m[5]+this.m[6]*this.m[6]),t.z=Math.sqrt(this.m[8]*this.m[8]+this.m[9]*this.m[9]+this.m[10]*this.m[10]),this.determinant()<=0&&(t.y*=-1),0===t.x||0===t.y||0===t.z?(i&&(i.x=0,i.y=0,i.z=0,i.w=1),!1):(i&&(z.FromValuesToRef(this.m[0]/t.x,this.m[1]/t.x,this.m[2]/t.x,0,this.m[4]/t.y,this.m[5]/t.y,this.m[6]/t.y,0,this.m[8]/t.z,this.m[9]/t.z,this.m[10]/t.z,0,0,0,0,1,_.Matrix[0]),x.FromRotationMatrixToRef(_.Matrix[0],i)),!0)},z.prototype.getRow=function(t){if(t<0||3<t)return null;var i=4*t;return new o(this.m[i+0],this.m[i+1],this.m[i+2],this.m[i+3])},z.prototype.setRow=function(t,i){if(t<0||3<t)return this;var r=4*t;return this.m[r+0]=i.x,this.m[r+1]=i.y,this.m[r+2]=i.z,this.m[r+3]=i.w,this._markAsUpdated(),this},z.prototype.transpose=function(){return z.Transpose(this)},z.prototype.transposeToRef=function(t){return z.TransposeToRef(this,t),this},z.prototype.setRowFromFloats=function(t,i,r,o,n){if(t<0||3<t)return this;var e=4*t;return this.m[e+0]=i,this.m[e+1]=r,this.m[e+2]=o,this.m[e+3]=n,this._markAsUpdated(),this},z.prototype.scale=function(t){var i=new z;return this.scaleToRef(t,i),i},z.prototype.scaleToRef=function(t,i){for(var r=0;r<16;r++)i.m[r]=this.m[r]*t;return i._markAsUpdated(),this},z.prototype.scaleAndAddToRef=function(t,i){for(var r=0;r<16;r++)i.m[r]+=this.m[r]*t;return i._markAsUpdated(),this},z.prototype.toNormalMatrix=function(t){this.invertToRef(t),t.transpose();var i=t.m;z.FromValuesToRef(i[0],i[1],i[2],0,i[4],i[5],i[6],0,i[8],i[9],i[10],0,0,0,0,1,t)},z.prototype.getRotationMatrix=function(){var t=z.Identity();return this.getRotationMatrixToRef(t),t},z.prototype.getRotationMatrixToRef=function(t){var i=this.m,r=Math.sqrt(i[0]*i[0]+i[1]*i[1]+i[2]*i[2]),o=Math.sqrt(i[4]*i[4]+i[5]*i[5]+i[6]*i[6]),n=Math.sqrt(i[8]*i[8]+i[9]*i[9]+i[10]*i[10]);return this.determinant()<=0&&(o*=-1),0===r||0===o||0===n?z.IdentityToRef(t):z.FromValuesToRef(i[0]/r,i[1]/r,i[2]/r,0,i[4]/o,i[5]/o,i[6]/o,0,i[8]/n,i[9]/n,i[10]/n,0,0,0,0,1,t),this},z.FromArray=function(t,i){var r=new z;return i||(i=0),z.FromArrayToRef(t,i,r),r},z.FromArrayToRef=function(t,i,r){for(var o=0;o<16;o++)r.m[o]=t[o+i];r._markAsUpdated()},z.FromFloat32ArrayToRefScaled=function(t,i,r,o){for(var n=0;n<16;n++)o.m[n]=t[n+i]*r;o._markAsUpdated()},z.FromValuesToRef=function(t,i,r,o,n,e,s,h,a,u,m,y,c,p,f,l,x){x.m[0]=t,x.m[1]=i,x.m[2]=r,x.m[3]=o,x.m[4]=n,x.m[5]=e,x.m[6]=s,x.m[7]=h,x.m[8]=a,x.m[9]=u,x.m[10]=m,x.m[11]=y,x.m[12]=c,x.m[13]=p,x.m[14]=f,x.m[15]=l,x._markAsUpdated()},Object.defineProperty(z,"IdentityReadOnly",{get:function(){return z._identityReadOnly},enumerable:!0,configurable:!0}),z.FromValues=function(t,i,r,o,n,e,s,h,a,u,m,y,c,p,f,l){var x=new z;return x.m[0]=t,x.m[1]=i,x.m[2]=r,x.m[3]=o,x.m[4]=n,x.m[5]=e,x.m[6]=s,x.m[7]=h,x.m[8]=a,x.m[9]=u,x.m[10]=m,x.m[11]=y,x.m[12]=c,x.m[13]=p,x.m[14]=f,x.m[15]=l,x},z.Compose=function(t,i,r){var o=z.Identity();return z.ComposeToRef(t,i,r,o),o},z.ComposeToRef=function(t,i,r,o){z.FromValuesToRef(t.x,0,0,0,0,t.y,0,0,0,0,t.z,0,0,0,0,1,_.Matrix[1]),i.toRotationMatrix(_.Matrix[0]),_.Matrix[1].multiplyToRef(_.Matrix[0],o),o.setTranslation(r)},z.Identity=function(){return z.FromValues(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)},z.IdentityToRef=function(t){z.FromValuesToRef(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,t)},z.Zero=function(){return z.FromValues(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0)},z.RotationX=function(t){var i=new z;return z.RotationXToRef(t,i),i},z.Invert=function(t){var i=new z;return t.invertToRef(i),i},z.RotationXToRef=function(t,i){var r=Math.sin(t),o=Math.cos(t);i.m[0]=1,i.m[15]=1,i.m[5]=o,i.m[10]=o,i.m[9]=-r,i.m[6]=r,i.m[1]=0,i.m[2]=0,i.m[3]=0,i.m[4]=0,i.m[7]=0,i.m[8]=0,i.m[11]=0,i.m[12]=0,i.m[13]=0,i.m[14]=0,i._markAsUpdated()},z.RotationY=function(t){var i=new z;return z.RotationYToRef(t,i),i},z.RotationYToRef=function(t,i){var r=Math.sin(t),o=Math.cos(t);i.m[5]=1,i.m[15]=1,i.m[0]=o,i.m[2]=-r,i.m[8]=r,i.m[10]=o,i.m[1]=0,i.m[3]=0,i.m[4]=0,i.m[6]=0,i.m[7]=0,i.m[9]=0,i.m[11]=0,i.m[12]=0,i.m[13]=0,i.m[14]=0,i._markAsUpdated()},z.RotationZ=function(t){var i=new z;return z.RotationZToRef(t,i),i},z.RotationZToRef=function(t,i){var r=Math.sin(t),o=Math.cos(t);i.m[10]=1,i.m[15]=1,i.m[0]=o,i.m[1]=r,i.m[4]=-r,i.m[5]=o,i.m[2]=0,i.m[3]=0,i.m[6]=0,i.m[7]=0,i.m[8]=0,i.m[9]=0,i.m[11]=0,i.m[12]=0,i.m[13]=0,i.m[14]=0,i._markAsUpdated()},z.RotationAxis=function(t,i){var r=z.Zero();return z.RotationAxisToRef(t,i,r),r},z.RotationAxisToRef=function(t,i,r){var o=Math.sin(-i),n=Math.cos(-i),e=1-n;t.normalize(),r.m[0]=t.x*t.x*e+n,r.m[1]=t.x*t.y*e-t.z*o,r.m[2]=t.x*t.z*e+t.y*o,r.m[3]=0,r.m[4]=t.y*t.x*e+t.z*o,r.m[5]=t.y*t.y*e+n,r.m[6]=t.y*t.z*e-t.x*o,r.m[7]=0,r.m[8]=t.z*t.x*e-t.y*o,r.m[9]=t.z*t.y*e+t.x*o,r.m[10]=t.z*t.z*e+n,r.m[11]=0,r.m[15]=1,r._markAsUpdated()},z.RotationYawPitchRoll=function(t,i,r){var o=new z;return z.RotationYawPitchRollToRef(t,i,r,o),o},z.RotationYawPitchRollToRef=function(t,i,r,o){x.RotationYawPitchRollToRef(t,i,r,this._tempQuaternion),this._tempQuaternion.toRotationMatrix(o)},z.Scaling=function(t,i,r){var o=z.Zero();return z.ScalingToRef(t,i,r,o),o},z.ScalingToRef=function(t,i,r,o){o.m[0]=t,o.m[1]=0,o.m[2]=0,o.m[3]=0,o.m[4]=0,o.m[5]=i,o.m[6]=0,o.m[7]=0,o.m[8]=0,o.m[9]=0,o.m[10]=r,o.m[11]=0,o.m[12]=0,o.m[13]=0,o.m[14]=0,o.m[15]=1,o._markAsUpdated()},z.Translation=function(t,i,r){var o=z.Identity();return z.TranslationToRef(t,i,r,o),o},z.TranslationToRef=function(t,i,r,o){z.FromValuesToRef(1,0,0,0,0,1,0,0,0,0,1,0,t,i,r,1,o)},z.Lerp=function(t,i,r){var o=z.Zero();return z.LerpToRef(t,i,r,o),o},z.LerpToRef=function(t,i,r,o){for(var n=0;n<16;n++)o.m[n]=t.m[n]*(1-r)+i.m[n]*r;o._markAsUpdated()},z.DecomposeLerp=function(t,i,r){var o=z.Zero();return z.DecomposeLerpToRef(t,i,r,o),o},z.DecomposeLerpToRef=function(t,i,r,o){var n=_.Vector3[0],e=_.Quaternion[0],s=_.Vector3[1];t.decompose(n,e,s);var h=_.Vector3[2],a=_.Quaternion[1],u=_.Vector3[3];i.decompose(h,a,u);var m=_.Vector3[4];l.LerpToRef(n,h,r,m);var y=_.Quaternion[2];x.SlerpToRef(e,a,r,y);var c=_.Vector3[5];l.LerpToRef(s,u,r,c),z.ComposeToRef(m,y,c,o)},z.LookAtLH=function(t,i,r){var o=z.Zero();return z.LookAtLHToRef(t,i,r,o),o},z.LookAtLHToRef=function(t,i,r,o){i.subtractToRef(t,this._zAxis),this._zAxis.normalize(),l.CrossToRef(r,this._zAxis,this._xAxis),0===this._xAxis.lengthSquared()?this._xAxis.x=1:this._xAxis.normalize(),l.CrossToRef(this._zAxis,this._xAxis,this._yAxis),this._yAxis.normalize();var n=-l.Dot(this._xAxis,t),e=-l.Dot(this._yAxis,t),s=-l.Dot(this._zAxis,t);return z.FromValuesToRef(this._xAxis.x,this._yAxis.x,this._zAxis.x,0,this._xAxis.y,this._yAxis.y,this._zAxis.y,0,this._xAxis.z,this._yAxis.z,this._zAxis.z,0,n,e,s,1,o)},z.LookAtRH=function(t,i,r){var o=z.Zero();return z.LookAtRHToRef(t,i,r,o),o},z.LookAtRHToRef=function(t,i,r,o){t.subtractToRef(i,this._zAxis),this._zAxis.normalize(),l.CrossToRef(r,this._zAxis,this._xAxis),0===this._xAxis.lengthSquared()?this._xAxis.x=1:this._xAxis.normalize(),l.CrossToRef(this._zAxis,this._xAxis,this._yAxis),this._yAxis.normalize();var n=-l.Dot(this._xAxis,t),e=-l.Dot(this._yAxis,t),s=-l.Dot(this._zAxis,t);return z.FromValuesToRef(this._xAxis.x,this._yAxis.x,this._zAxis.x,0,this._xAxis.y,this._yAxis.y,this._zAxis.y,0,this._xAxis.z,this._yAxis.z,this._zAxis.z,0,n,e,s,1,o)},z.OrthoLH=function(t,i,r,o){var n=z.Zero();return z.OrthoLHToRef(t,i,r,o,n),n},z.OrthoLHToRef=function(t,i,r,o,n){z.FromValuesToRef(2/t,0,0,0,0,2/i,0,0,0,0,2/(o-r),0,0,0,-(o+r)/(o-r),1,n)},z.OrthoOffCenterLH=function(t,i,r,o,n,e){var s=z.Zero();return z.OrthoOffCenterLHToRef(t,i,r,o,n,e,s),s},z.OrthoOffCenterLHToRef=function(t,i,r,o,n,e,s){z.FromValuesToRef(2/(i-t),0,0,0,0,2/(o-r),0,0,0,0,2/(e-n),0,(t+i)/(t-i),(o+r)/(r-o),-(e+n)/(e-n),1,s)},z.OrthoOffCenterRH=function(t,i,r,o,n,e){var s=z.Zero();return z.OrthoOffCenterRHToRef(t,i,r,o,n,e,s),s},z.OrthoOffCenterRHToRef=function(t,i,r,o,n,e,s){z.OrthoOffCenterLHToRef(t,i,r,o,n,e,s),s.m[10]*=-1},z.PerspectiveLH=function(t,i,r,o){var n=z.Zero();return z.FromValuesToRef(2*r/t,0,0,0,0,2*r/i,0,0,0,0,(o+r)/(o-r),1,0,0,-2*o*r/(o-r),0,n),n},z.PerspectiveFovLH=function(t,i,r,o){var n=z.Zero();return z.PerspectiveFovLHToRef(t,i,r,o,n),n},z.PerspectiveFovLHToRef=function(t,i,r,o,n,e){void 0===e&&(e=!0);var s=r,h=o,a=1/Math.tan(.5*t);z.FromValuesToRef(e?a/i:a,0,0,0,0,e?a:a*i,0,0,0,0,(h+s)/(h-s),1,0,0,-2*h*s/(h-s),0,n)},z.PerspectiveFovRH=function(t,i,r,o){var n=z.Zero();return z.PerspectiveFovRHToRef(t,i,r,o,n),n},z.PerspectiveFovRHToRef=function(t,i,r,o,n,e){void 0===e&&(e=!0);var s=r,h=o,a=1/Math.tan(.5*t);z.FromValuesToRef(e?a/i:a,0,0,0,0,e?a:a*i,0,0,0,0,-(h+s)/(h-s),-1,0,0,-2*h*s/(h-s),0,n)},z.PerspectiveFovWebVRToRef=function(t,i,r,o,n){void 0===n&&(n=!1);var e=n?-1:1,s=Math.tan(t.upDegrees*Math.PI/180),h=Math.tan(t.downDegrees*Math.PI/180),a=Math.tan(t.leftDegrees*Math.PI/180),u=Math.tan(t.rightDegrees*Math.PI/180),m=2/(a+u),y=2/(s+h);o.m[0]=m,o.m[1]=o.m[2]=o.m[3]=o.m[4]=0,o.m[5]=y,o.m[6]=o.m[7]=0,o.m[8]=(a-u)*m*.5,o.m[9]=-(s-h)*y*.5,o.m[10]=-r/(i-r),o.m[11]=1*e,o.m[12]=o.m[13]=o.m[15]=0,o.m[14]=-2*r*i/(r-i),o._markAsUpdated()},z.GetFinalMatrix=function(t,i,r,o,n,e){var s=t.width,h=t.height,a=t.x,u=t.y,m=z.FromValues(s/2,0,0,0,0,-h/2,0,0,0,0,e-n,0,a+s/2,h/2+u,n,1);return i.multiply(r).multiply(o).multiply(m)},z.GetAsMatrix2x2=function(t){return new Float32Array([t.m[0],t.m[1],t.m[4],t.m[5]])},z.GetAsMatrix3x3=function(t){return new Float32Array([t.m[0],t.m[1],t.m[2],t.m[4],t.m[5],t.m[6],t.m[8],t.m[9],t.m[10]])},z.Transpose=function(t){var i=new z;return z.TransposeToRef(t,i),i},z.TransposeToRef=function(t,i){i.m[0]=t.m[0],i.m[1]=t.m[4],i.m[2]=t.m[8],i.m[3]=t.m[12],i.m[4]=t.m[1],i.m[5]=t.m[5],i.m[6]=t.m[9],i.m[7]=t.m[13],i.m[8]=t.m[2],i.m[9]=t.m[6],i.m[10]=t.m[10],i.m[11]=t.m[14],i.m[12]=t.m[3],i.m[13]=t.m[7],i.m[14]=t.m[11],i.m[15]=t.m[15]},z.Reflection=function(t){var i=new z;return z.ReflectionToRef(t,i),i},z.ReflectionToRef=function(t,i){t.normalize();var r=t.normal.x,o=t.normal.y,n=t.normal.z,e=-2*r,s=-2*o,h=-2*n;i.m[0]=e*r+1,i.m[1]=s*r,i.m[2]=h*r,i.m[3]=0,i.m[4]=e*o,i.m[5]=s*o+1,i.m[6]=h*o,i.m[7]=0,i.m[8]=e*n,i.m[9]=s*n,i.m[10]=h*n+1,i.m[11]=0,i.m[12]=e*t.d,i.m[13]=s*t.d,i.m[14]=h*t.d,i.m[15]=1,i._markAsUpdated()},z.FromXYZAxesToRef=function(t,i,r,o){o.m[0]=t.x,o.m[1]=t.y,o.m[2]=t.z,o.m[3]=0,o.m[4]=i.x,o.m[5]=i.y,o.m[6]=i.z,o.m[7]=0,o.m[8]=r.x,o.m[9]=r.y,o.m[10]=r.z,o.m[11]=0,o.m[12]=0,o.m[13]=0,o.m[14]=0,o.m[15]=1,o._markAsUpdated()},z.FromQuaternionToRef=function(t,i){var r=t.x*t.x,o=t.y*t.y,n=t.z*t.z,e=t.x*t.y,s=t.z*t.w,h=t.z*t.x,a=t.y*t.w,u=t.y*t.z,m=t.x*t.w;i.m[0]=1-2*(o+n),i.m[1]=2*(e+s),i.m[2]=2*(h-a),i.m[3]=0,i.m[4]=2*(e-s),i.m[5]=1-2*(n+r),i.m[6]=2*(u+m),i.m[7]=0,i.m[8]=2*(h+a),i.m[9]=2*(u-m),i.m[10]=1-2*(o+r),i.m[11]=0,i.m[12]=0,i.m[13]=0,i.m[14]=0,i.m[15]=1,i._markAsUpdated()},z._tempQuaternion=new x,z._xAxis=l.Zero(),z._yAxis=l.Zero(),z._zAxis=l.Zero(),z._updateFlagSeed=0,z._identityReadOnly=z.Identity(),z}();p.Matrix=m;var n=function(){function s(t,i,r,o){this.normal=new l(t,i,r),this.d=o}return s.prototype.asArray=function(){return[this.normal.x,this.normal.y,this.normal.z,this.d]},s.prototype.clone=function(){return new s(this.normal.x,this.normal.y,this.normal.z,this.d)},s.prototype.getClassName=function(){return"Plane"},s.prototype.getHashCode=function(){var t=this.normal.getHashCode();return t=397*t^(this.d||0)},s.prototype.normalize=function(){var t=Math.sqrt(this.normal.x*this.normal.x+this.normal.y*this.normal.y+this.normal.z*this.normal.z),i=0;return 0!==t&&(i=1/t),this.normal.x*=i,this.normal.y*=i,this.normal.z*=i,this.d*=i,this},s.prototype.transform=function(t){var i=m.Transpose(t),r=this.normal.x,o=this.normal.y,n=this.normal.z,e=this.d;return new s(r*i.m[0]+o*i.m[1]+n*i.m[2]+e*i.m[3],r*i.m[4]+o*i.m[5]+n*i.m[6]+e*i.m[7],r*i.m[8]+o*i.m[9]+n*i.m[10]+e*i.m[11],r*i.m[12]+o*i.m[13]+n*i.m[14]+e*i.m[15])},s.prototype.dotCoordinate=function(t){return this.normal.x*t.x+this.normal.y*t.y+this.normal.z*t.z+this.d},s.prototype.copyFromPoints=function(t,i,r){var o,n=i.x-t.x,e=i.y-t.y,s=i.z-t.z,h=r.x-t.x,a=r.y-t.y,u=r.z-t.z,m=e*u-s*a,y=s*h-n*u,c=n*a-e*h,p=Math.sqrt(m*m+y*y+c*c);return o=0!==p?1/p:0,this.normal.x=m*o,this.normal.y=y*o,this.normal.z=c*o,this.d=-(this.normal.x*t.x+this.normal.y*t.y+this.normal.z*t.z),this},s.prototype.isFrontFacingTo=function(t,i){return l.Dot(this.normal,t)<=i},s.prototype.signedDistanceTo=function(t){return l.Dot(t,this.normal)+this.d},s.FromArray=function(t){return new s(t[0],t[1],t[2],t[3])},s.FromPoints=function(t,i,r){var o=new s(0,0,0,0);return o.copyFromPoints(t,i,r),o},s.FromPositionAndNormal=function(t,i){var r=new s(0,0,0,0);return i.normalize(),r.normal=i,r.d=-(i.x*t.x+i.y*t.y+i.z*t.z),r},s.SignedDistanceToPlaneFromPositionAndNormal=function(t,i,r){var o=-(i.x*t.x+i.y*t.y+i.z*t.z);return l.Dot(r,i)+o},s}();p.Plane=n;var e=function(){function n(t,i,r,o){this.x=t,this.y=i,this.width=r,this.height=o}return n.prototype.toGlobal=function(t,i){if(t.getRenderWidth){var r=t;return this.toGlobal(r.getRenderWidth(),r.getRenderHeight())}var o=t;return new n(this.x*o,this.y*i,this.width*o,this.height*i)},n.prototype.clone=function(){return new n(this.x,this.y,this.width,this.height)},n}();p.Viewport=e;var s,h=function(){function o(){}return o.GetPlanes=function(t){for(var i=[],r=0;r<6;r++)i.push(new n(0,0,0,0));return o.GetPlanesToRef(t,i),i},o.GetNearPlaneToRef=function(t,i){i.normal.x=t.m[3]+t.m[2],i.normal.y=t.m[7]+t.m[6],i.normal.z=t.m[11]+t.m[10],i.d=t.m[15]+t.m[14],i.normalize()},o.GetFarPlaneToRef=function(t,i){i.normal.x=t.m[3]-t.m[2],i.normal.y=t.m[7]-t.m[6],i.normal.z=t.m[11]-t.m[10],i.d=t.m[15]-t.m[14],i.normalize()},o.GetLeftPlaneToRef=function(t,i){i.normal.x=t.m[3]+t.m[0],i.normal.y=t.m[7]+t.m[4],i.normal.z=t.m[11]+t.m[8],i.d=t.m[15]+t.m[12],i.normalize()},o.GetRightPlaneToRef=function(t,i){i.normal.x=t.m[3]-t.m[0],i.normal.y=t.m[7]-t.m[4],i.normal.z=t.m[11]-t.m[8],i.d=t.m[15]-t.m[12],i.normalize()},o.GetTopPlaneToRef=function(t,i){i.normal.x=t.m[3]-t.m[1],i.normal.y=t.m[7]-t.m[5],i.normal.z=t.m[11]-t.m[9],i.d=t.m[15]-t.m[13],i.normalize()},o.GetBottomPlaneToRef=function(t,i){i.normal.x=t.m[3]+t.m[1],i.normal.y=t.m[7]+t.m[5],i.normal.z=t.m[11]+t.m[9],i.d=t.m[15]+t.m[13],i.normalize()},o.GetPlanesToRef=function(t,i){o.GetNearPlaneToRef(t,i[0]),o.GetFarPlaneToRef(t,i[1]),o.GetLeftPlaneToRef(t,i[2]),o.GetRightPlaneToRef(t,i[3]),o.GetTopPlaneToRef(t,i[4]),o.GetBottomPlaneToRef(t,i[5])},o}();p.Frustum=h,(s=p.Space||(p.Space={}))[s.LOCAL=0]="LOCAL",s[s.WORLD=1]="WORLD",s[s.BONE=2]="BONE";var a=function(){function t(){}return t.X=new l(1,0,0),t.Y=new l(0,1,0),t.Z=new l(0,0,1),t}();p.Axis=a;var z,u,y=function(){function t(){}return t.Interpolate=function(t,i,r,o,n){for(var e=1-3*o+3*i,s=3*o-6*i,h=3*i,a=t,u=0;u<5;u++){var m=a*a;a-=(e*(m*a)+s*m+h*a-t)*(1/(3*e*m+2*s*a+h)),a=Math.min(1,Math.max(0,a))}return 3*Math.pow(1-a,2)*a*r+3*(1-a)*Math.pow(a,2)*n+Math.pow(a,3)},t}();p.BezierCurve=y,(u=z=p.Orientation||(p.Orientation={}))[u.CW=0]="CW",u[u.CCW=1]="CCW";var c=function(){function o(t){this._radians=t,this._radians<0&&(this._radians+=2*Math.PI)}return o.prototype.degrees=function(){return 180*this._radians/Math.PI},o.prototype.radians=function(){return this._radians},o.BetweenTwoPoints=function(t,i){var r=i.subtract(t);return new o(Math.atan2(r.y,r.x))},o.FromRadians=function(t){return new o(t)},o.FromDegrees=function(t){return new o(t*Math.PI/180)},o}();p.Angle=c;var w=function(t,i,r){this.startPoint=t,this.midPoint=i,this.endPoint=r;var o=Math.pow(i.x,2)+Math.pow(i.y,2),n=(Math.pow(t.x,2)+Math.pow(t.y,2)-o)/2,e=(o-Math.pow(r.x,2)-Math.pow(r.y,2))/2,s=(t.x-i.x)*(i.y-r.y)-(i.x-r.x)*(t.y-i.y);this.centerPoint=new f((n*(i.y-r.y)-e*(t.y-i.y))/s,((t.x-i.x)*e-(i.x-r.x)*n)/s),this.radius=this.centerPoint.subtract(this.startPoint).length(),this.startAngle=c.BetweenTwoPoints(this.centerPoint,this.startPoint);var h=this.startAngle.degrees(),a=c.BetweenTwoPoints(this.centerPoint,this.midPoint).degrees(),u=c.BetweenTwoPoints(this.centerPoint,this.endPoint).degrees();180<a-h&&(a-=360),a-h<-180&&(a+=360),180<u-a&&(u-=360),u-a<-180&&(u+=360),this.orientation=a-h<0?z.CW:z.CCW,this.angle=c.FromDegrees(this.orientation===z.CW?h-u:u-h)};p.Arc2=w;var d=function(){function r(t,i){this._points=new Array,this._length=0,this.closed=!1,this._points.push(new f(t,i))}return r.prototype.addLineTo=function(t,i){if(this.closed)return this;var r=new f(t,i),o=this._points[this._points.length-1];return this._points.push(r),this._length+=r.subtract(o).length(),this},r.prototype.addArcTo=function(t,i,r,o,n){if(void 0===n&&(n=36),this.closed)return this;var e=this._points[this._points.length-1],s=new f(t,i),h=new f(r,o),a=new w(e,s,h),u=a.angle.radians()/n;a.orientation===z.CW&&(u*=-1);for(var m=a.startAngle.radians()+u,y=0;y<n;y++){var c=Math.cos(m)*a.radius+a.centerPoint.x,p=Math.sin(m)*a.radius+a.centerPoint.y;this.addLineTo(c,p),m+=u}return this},r.prototype.close=function(){return this.closed=!0,this},r.prototype.length=function(){var t=this._length;if(!this.closed){var i=this._points[this._points.length-1];t+=this._points[0].subtract(i).length()}return t},r.prototype.getPoints=function(){return this._points},r.prototype.getPointAtLengthPosition=function(t){if(t<0||1<t)return f.Zero();for(var i=t*this.length(),r=0,o=0;o<this._points.length;o++){var n=(o+1)%this._points.length,e=this._points[o],s=this._points[n].subtract(e),h=s.length()+r;if(r<=i&&i<=h){var a=s.normalize(),u=i-r;return new f(e.x+a.x*u,e.y+a.y*u)}r=h}return f.Zero()},r.StartingAt=function(t,i){return new r(t,i)},r}();p.Path2=d;var v=function(){function t(t,i,r){void 0===i&&(i=null),this.path=t,this._curve=new Array,this._distances=new Array,this._tangents=new Array,this._normals=new Array,this._binormals=new Array;for(var o=0;o<t.length;o++)this._curve[o]=t[o].clone();this._raw=r||!1,this._compute(i)}return t.prototype.getCurve=function(){return this._curve},t.prototype.getTangents=function(){return this._tangents},t.prototype.getNormals=function(){return this._normals},t.prototype.getBinormals=function(){return this._binormals},t.prototype.getDistances=function(){return this._distances},t.prototype.update=function(t,i){void 0===i&&(i=null);for(var r=0;r<t.length;r++)this._curve[r].x=t[r].x,this._curve[r].y=t[r].y,this._curve[r].z=t[r].z;return this._compute(i),this},t.prototype._compute=function(t){var i=this._curve.length;this._tangents[0]=this._getFirstNonNullVector(0),this._raw||this._tangents[0].normalize(),this._tangents[i-1]=this._curve[i-1].subtract(this._curve[i-2]),this._raw||this._tangents[i-1].normalize();var r,o,n,e,s=this._tangents[0],h=this._normalVector(this._curve[0],s,t);this._normals[0]=h,this._raw||this._normals[0].normalize(),this._binormals[0]=l.Cross(s,this._normals[0]),this._raw||this._binormals[0].normalize(),this._distances[0]=0;for(var a=1;a<i;a++)r=this._getLastNonNullVector(a),a<i-1&&(o=this._getFirstNonNullVector(a),this._tangents[a]=r.add(o),this._tangents[a].normalize()),this._distances[a]=this._distances[a-1]+r.length(),n=this._tangents[a],e=this._binormals[a-1],this._normals[a]=l.Cross(e,n),this._raw||this._normals[a].normalize(),this._binormals[a]=l.Cross(n,this._normals[a]),this._raw||this._binormals[a].normalize()},t.prototype._getFirstNonNullVector=function(t){for(var i=1,r=this._curve[t+i].subtract(this._curve[t]);0===r.length()&&t+i+1<this._curve.length;)i++,r=this._curve[t+i].subtract(this._curve[t]);return r},t.prototype._getLastNonNullVector=function(t){for(var i=1,r=this._curve[t].subtract(this._curve[t-i]);0===r.length()&&i+1<t;)i++,r=this._curve[t].subtract(this._curve[t-i]);return r},t.prototype._normalVector=function(t,i,r){var o,n,e=i.length();(0===e&&(e=1),null==r)?(n=p.Scalar.WithinEpsilon(Math.abs(i.y)/e,1,p.Epsilon)?p.Scalar.WithinEpsilon(Math.abs(i.x)/e,1,p.Epsilon)?p.Scalar.WithinEpsilon(Math.abs(i.z)/e,1,p.Epsilon)?l.Zero():new l(0,0,1):new l(1,0,0):new l(0,-1,0),o=l.Cross(i,n)):(o=l.Cross(i,r),l.CrossToRef(o,i,o));return o.normalize(),o},t}();p.Path3D=v;var R=function(){function m(t){this._length=0,this._points=t,this._length=this._computeLength(t)}return m.CreateQuadraticBezier=function(t,i,r,o){o=2<o?o:3;for(var n=new Array,e=function(t,i,r,o){return(1-t)*(1-t)*i+2*t*(1-t)*r+t*t*o},s=0;s<=o;s++)n.push(new l(e(s/o,t.x,i.x,r.x),e(s/o,t.y,i.y,r.y),e(s/o,t.z,i.z,r.z)));return new m(n)},m.CreateCubicBezier=function(t,i,r,o,n){n=3<n?n:4;for(var e=new Array,s=function(t,i,r,o,n){return(1-t)*(1-t)*(1-t)*i+3*t*(1-t)*(1-t)*r+3*t*t*(1-t)*o+t*t*t*n},h=0;h<=n;h++)e.push(new l(s(h/n,t.x,i.x,r.x,o.x),s(h/n,t.y,i.y,r.y,o.y),s(h/n,t.z,i.z,r.z,o.z)));return new m(e)},m.CreateHermiteSpline=function(t,i,r,o,n){for(var e=new Array,s=1/n,h=0;h<=n;h++)e.push(l.Hermite(t,i,r,o,h*s));return new m(e)},m.CreateCatmullRomSpline=function(t,i,r){var o=new Array,n=1/i,e=0;if(r){for(var s=t.length,h=0;h<s;h++)for(var a=e=0;a<i;a++)o.push(l.CatmullRom(t[h%s],t[(h+1)%s],t[(h+2)%s],t[(h+3)%s],e)),e+=n;o.push(o[0])}else{var u=new Array;u.push(t[0].clone()),Array.prototype.push.apply(u,t),u.push(t[t.length-1].clone());for(h=0;h<u.length-3;h++)for(a=e=0;a<i;a++)o.push(l.CatmullRom(u[h],u[h+1],u[h+2],u[h+3],e)),e+=n;h--,o.push(l.CatmullRom(u[h],u[h+1],u[h+2],u[h+3],e))}return new m(o)},m.prototype.getPoints=function(){return this._points},m.prototype.length=function(){return this._length},m.prototype.continue=function(t){for(var i=this._points[this._points.length-1],r=this._points.slice(),o=t.getPoints(),n=1;n<o.length;n++)r.push(o[n].subtract(o[0]).add(i));return new m(r)},m.prototype._computeLength=function(t){for(var i=0,r=1;r<t.length;r++)i+=t[r].subtract(t[r-1]).length();return i},m}();p.Curve3=R;var T=function(){function t(t,i){void 0===t&&(t=l.Zero()),void 0===i&&(i=l.Up()),this.position=t,this.normal=i}return t.prototype.clone=function(){return new t(this.position.clone(),this.normal.clone())},t}();p.PositionNormalVertex=T;var g=function(){function t(t,i,r){void 0===t&&(t=l.Zero()),void 0===i&&(i=l.Up()),void 0===r&&(r=f.Zero()),this.position=t,this.normal=i,this.uv=r}return t.prototype.clone=function(){return new t(this.position.clone(),this.normal.clone(),this.uv.clone())},t}();p.PositionNormalTextureVertex=g;var A=function(){function t(){}return t.Color3=[i.Black(),i.Black(),i.Black()],t.Color4=[new r(0,0,0,0),new r(0,0,0,0)],t.Vector2=[f.Zero(),f.Zero(),f.Zero()],t.Vector3=[l.Zero(),l.Zero(),l.Zero(),l.Zero(),l.Zero(),l.Zero(),l.Zero(),l.Zero(),l.Zero()],t.Vector4=[o.Zero(),o.Zero(),o.Zero()],t.Quaternion=[x.Zero(),x.Zero()],t.Matrix=[m.Zero(),m.Zero(),m.Zero(),m.Zero(),m.Zero(),m.Zero(),m.Zero(),m.Zero()],t}();p.Tmp=A;var _=function(){function t(){}return t.Vector3=[l.Zero(),l.Zero(),l.Zero(),l.Zero(),l.Zero(),l.Zero()],t.Matrix=[m.Zero(),m.Zero()],t.Quaternion=[x.Zero(),x.Zero(),x.Zero()],t}()}(BABYLON||(BABYLON={}));';var tl="undefined"!=typeof global?global:"undefined"!=typeof window?window:this;return tl.BABYLON=$a,void 0!==_&&(tl.Earcut={earcut:_}),$a}));

/*
 * Copyright (c) 2015 cannon.js Authors
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use, copy,
 * modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&false)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.CANNON=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
module.exports={
  "name": "cannon",
  "version": "0.6.2",
  "description": "A lightweight 3D physics engine written in JavaScript.",
  "homepage": "https://github.com/schteppe/cannon.js",
  "author": "Stefan Hedman <schteppe@gmail.com> (http://steffe.se)",
  "keywords": [
    "cannon.js",
    "cannon",
    "physics",
    "engine",
    "3d"
  ],
  "main": "./build/cannon.js",
  "engines": {
    "node": "*"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/schteppe/cannon.js.git"
  },
  "bugs": {
    "url": "https://github.com/schteppe/cannon.js/issues"
  },
  "licenses": [
    {
      "type": "MIT"
    }
  ],
  "devDependencies": {
    "jshint": "latest",
    "uglify-js": "latest",
    "nodeunit": "^0.9.0",
    "grunt": "~0.4.0",
    "grunt-contrib-jshint": "~0.1.1",
    "grunt-contrib-nodeunit": "^0.4.1",
    "grunt-contrib-concat": "~0.1.3",
    "grunt-contrib-uglify": "^0.5.1",
    "grunt-browserify": "^2.1.4",
    "grunt-contrib-yuidoc": "^0.5.2",
    "browserify": "*"
  },
  "dependencies": {}
}

},{}],2:[function(_dereq_,module,exports){
// Export classes
module.exports = {
    version :                       _dereq_('../package.json').version,

    AABB :                          _dereq_('./collision/AABB'),
    ArrayCollisionMatrix :          _dereq_('./collision/ArrayCollisionMatrix'),
    Body :                          _dereq_('./objects/Body'),
    Box :                           _dereq_('./shapes/Box'),
    Broadphase :                    _dereq_('./collision/Broadphase'),
    Constraint :                    _dereq_('./constraints/Constraint'),
    ContactEquation :               _dereq_('./equations/ContactEquation'),
    Narrowphase :                   _dereq_('./world/Narrowphase'),
    ConeTwistConstraint :           _dereq_('./constraints/ConeTwistConstraint'),
    ContactMaterial :               _dereq_('./material/ContactMaterial'),
    ConvexPolyhedron :              _dereq_('./shapes/ConvexPolyhedron'),
    Cylinder :                      _dereq_('./shapes/Cylinder'),
    DistanceConstraint :            _dereq_('./constraints/DistanceConstraint'),
    Equation :                      _dereq_('./equations/Equation'),
    EventTarget :                   _dereq_('./utils/EventTarget'),
    FrictionEquation :              _dereq_('./equations/FrictionEquation'),
    GSSolver :                      _dereq_('./solver/GSSolver'),
    GridBroadphase :                _dereq_('./collision/GridBroadphase'),
    Heightfield :                   _dereq_('./shapes/Heightfield'),
    HingeConstraint :               _dereq_('./constraints/HingeConstraint'),
    LockConstraint :                _dereq_('./constraints/LockConstraint'),
    Mat3 :                          _dereq_('./math/Mat3'),
    Material :                      _dereq_('./material/Material'),
    NaiveBroadphase :               _dereq_('./collision/NaiveBroadphase'),
    ObjectCollisionMatrix :         _dereq_('./collision/ObjectCollisionMatrix'),
    Pool :                          _dereq_('./utils/Pool'),
    Particle :                      _dereq_('./shapes/Particle'),
    Plane :                         _dereq_('./shapes/Plane'),
    PointToPointConstraint :        _dereq_('./constraints/PointToPointConstraint'),
    Quaternion :                    _dereq_('./math/Quaternion'),
    Ray :                           _dereq_('./collision/Ray'),
    RaycastVehicle :                _dereq_('./objects/RaycastVehicle'),
    RaycastResult :                 _dereq_('./collision/RaycastResult'),
    RigidVehicle :                  _dereq_('./objects/RigidVehicle'),
    RotationalEquation :            _dereq_('./equations/RotationalEquation'),
    RotationalMotorEquation :       _dereq_('./equations/RotationalMotorEquation'),
    SAPBroadphase :                 _dereq_('./collision/SAPBroadphase'),
    SPHSystem :                     _dereq_('./objects/SPHSystem'),
    Shape :                         _dereq_('./shapes/Shape'),
    Solver :                        _dereq_('./solver/Solver'),
    Sphere :                        _dereq_('./shapes/Sphere'),
    SplitSolver :                   _dereq_('./solver/SplitSolver'),
    Spring :                        _dereq_('./objects/Spring'),
    Trimesh :                       _dereq_('./shapes/Trimesh'),
    Vec3 :                          _dereq_('./math/Vec3'),
    Vec3Pool :                      _dereq_('./utils/Vec3Pool'),
    World :                         _dereq_('./world/World'),
};

},{"../package.json":1,"./collision/AABB":3,"./collision/ArrayCollisionMatrix":4,"./collision/Broadphase":5,"./collision/GridBroadphase":6,"./collision/NaiveBroadphase":7,"./collision/ObjectCollisionMatrix":8,"./collision/Ray":9,"./collision/RaycastResult":10,"./collision/SAPBroadphase":11,"./constraints/ConeTwistConstraint":12,"./constraints/Constraint":13,"./constraints/DistanceConstraint":14,"./constraints/HingeConstraint":15,"./constraints/LockConstraint":16,"./constraints/PointToPointConstraint":17,"./equations/ContactEquation":19,"./equations/Equation":20,"./equations/FrictionEquation":21,"./equations/RotationalEquation":22,"./equations/RotationalMotorEquation":23,"./material/ContactMaterial":24,"./material/Material":25,"./math/Mat3":27,"./math/Quaternion":28,"./math/Vec3":30,"./objects/Body":31,"./objects/RaycastVehicle":32,"./objects/RigidVehicle":33,"./objects/SPHSystem":34,"./objects/Spring":35,"./shapes/Box":37,"./shapes/ConvexPolyhedron":38,"./shapes/Cylinder":39,"./shapes/Heightfield":40,"./shapes/Particle":41,"./shapes/Plane":42,"./shapes/Shape":43,"./shapes/Sphere":44,"./shapes/Trimesh":45,"./solver/GSSolver":46,"./solver/Solver":47,"./solver/SplitSolver":48,"./utils/EventTarget":49,"./utils/Pool":51,"./utils/Vec3Pool":54,"./world/Narrowphase":55,"./world/World":56}],3:[function(_dereq_,module,exports){
var Vec3 = _dereq_('../math/Vec3');
var Utils = _dereq_('../utils/Utils');

module.exports = AABB;

/**
 * Axis aligned bounding box class.
 * @class AABB
 * @constructor
 * @param {Object} [options]
 * @param {Vec3}   [options.upperBound]
 * @param {Vec3}   [options.lowerBound]
 */
function AABB(options){
    options = options || {};

    /**
     * The lower bound of the bounding box.
     * @property lowerBound
     * @type {Vec3}
     */
    this.lowerBound = new Vec3();
    if(options.lowerBound){
        this.lowerBound.copy(options.lowerBound);
    }

    /**
     * The upper bound of the bounding box.
     * @property upperBound
     * @type {Vec3}
     */
    this.upperBound = new Vec3();
    if(options.upperBound){
        this.upperBound.copy(options.upperBound);
    }
}

var tmp = new Vec3();

/**
 * Set the AABB bounds from a set of points.
 * @method setFromPoints
 * @param {Array} points An array of Vec3's.
 * @param {Vec3} position
 * @param {Quaternion} quaternion
 * @param {number} skinSize
 * @return {AABB} The self object
 */
AABB.prototype.setFromPoints = function(points, position, quaternion, skinSize){
    var l = this.lowerBound,
        u = this.upperBound,
        q = quaternion;

    // Set to the first point
    l.copy(points[0]);
    if(q){
        q.vmult(l, l);
    }
    u.copy(l);

    for(var i = 1; i<points.length; i++){
        var p = points[i];

        if(q){
            q.vmult(p, tmp);
            p = tmp;
        }

        if(p.x > u.x){ u.x = p.x; }
        if(p.x < l.x){ l.x = p.x; }
        if(p.y > u.y){ u.y = p.y; }
        if(p.y < l.y){ l.y = p.y; }
        if(p.z > u.z){ u.z = p.z; }
        if(p.z < l.z){ l.z = p.z; }
    }

    // Add offset
    if (position) {
        position.vadd(l, l);
        position.vadd(u, u);
    }

    if(skinSize){
        l.x -= skinSize;
        l.y -= skinSize;
        l.z -= skinSize;
        u.x += skinSize;
        u.y += skinSize;
        u.z += skinSize;
    }

    return this;
};

/**
 * Copy bounds from an AABB to this AABB
 * @method copy
 * @param  {AABB} aabb Source to copy from
 * @return {AABB} The this object, for chainability
 */
AABB.prototype.copy = function(aabb){
    this.lowerBound.copy(aabb.lowerBound);
    this.upperBound.copy(aabb.upperBound);
    return this;
};

/**
 * Clone an AABB
 * @method clone
 */
AABB.prototype.clone = function(){
    return new AABB().copy(this);
};

/**
 * Extend this AABB so that it covers the given AABB too.
 * @method extend
 * @param  {AABB} aabb
 */
AABB.prototype.extend = function(aabb){
    // Extend lower bound
    var l = aabb.lowerBound.x;
    if(this.lowerBound.x > l){
        this.lowerBound.x = l;
    }

    // Upper
    var u = aabb.upperBound.x;
    if(this.upperBound.x < u){
        this.upperBound.x = u;
    }

    // Extend lower bound
    var l = aabb.lowerBound.y;
    if(this.lowerBound.y > l){
        this.lowerBound.y = l;
    }

    // Upper
    var u = aabb.upperBound.y;
    if(this.upperBound.y < u){
        this.upperBound.y = u;
    }

    // Extend lower bound
    var l = aabb.lowerBound.z;
    if(this.lowerBound.z > l){
        this.lowerBound.z = l;
    }

    // Upper
    var u = aabb.upperBound.z;
    if(this.upperBound.z < u){
        this.upperBound.z = u;
    }
};

/**
 * Returns true if the given AABB overlaps this AABB.
 * @method overlaps
 * @param  {AABB} aabb
 * @return {Boolean}
 */
AABB.prototype.overlaps = function(aabb){
    var l1 = this.lowerBound,
        u1 = this.upperBound,
        l2 = aabb.lowerBound,
        u2 = aabb.upperBound;

    //      l2        u2
    //      |---------|
    // |--------|
    // l1       u1

    return ((l2.x <= u1.x && u1.x <= u2.x) || (l1.x <= u2.x && u2.x <= u1.x)) &&
           ((l2.y <= u1.y && u1.y <= u2.y) || (l1.y <= u2.y && u2.y <= u1.y)) &&
           ((l2.z <= u1.z && u1.z <= u2.z) || (l1.z <= u2.z && u2.z <= u1.z));
};

/**
 * Returns true if the given AABB is fully contained in this AABB.
 * @method contains
 * @param {AABB} aabb
 * @return {Boolean}
 */
AABB.prototype.contains = function(aabb){
    var l1 = this.lowerBound,
        u1 = this.upperBound,
        l2 = aabb.lowerBound,
        u2 = aabb.upperBound;

    //      l2        u2
    //      |---------|
    // |---------------|
    // l1              u1

    return (
        (l1.x <= l2.x && u1.x >= u2.x) &&
        (l1.y <= l2.y && u1.y >= u2.y) &&
        (l1.z <= l2.z && u1.z >= u2.z)
    );
};

/**
 * @method getCorners
 * @param {Vec3} a
 * @param {Vec3} b
 * @param {Vec3} c
 * @param {Vec3} d
 * @param {Vec3} e
 * @param {Vec3} f
 * @param {Vec3} g
 * @param {Vec3} h
 */
AABB.prototype.getCorners = function(a, b, c, d, e, f, g, h){
    var l = this.lowerBound,
        u = this.upperBound;

    a.copy(l);
    b.set( u.x, l.y, l.z );
    c.set( u.x, u.y, l.z );
    d.set( l.x, u.y, u.z );
    e.set( u.x, l.y, l.z );
    f.set( l.x, u.y, l.z );
    g.set( l.x, l.y, u.z );
    h.copy(u);
};

var transformIntoFrame_corners = [
    new Vec3(),
    new Vec3(),
    new Vec3(),
    new Vec3(),
    new Vec3(),
    new Vec3(),
    new Vec3(),
    new Vec3()
];

/**
 * Get the representation of an AABB in another frame.
 * @method toLocalFrame
 * @param  {Transform} frame
 * @param  {AABB} target
 * @return {AABB} The "target" AABB object.
 */
AABB.prototype.toLocalFrame = function(frame, target){

    var corners = transformIntoFrame_corners;
    var a = corners[0];
    var b = corners[1];
    var c = corners[2];
    var d = corners[3];
    var e = corners[4];
    var f = corners[5];
    var g = corners[6];
    var h = corners[7];

    // Get corners in current frame
    this.getCorners(a, b, c, d, e, f, g, h);

    // Transform them to new local frame
    for(var i=0; i !== 8; i++){
        var corner = corners[i];
        frame.pointToLocal(corner, corner);
    }

    return target.setFromPoints(corners);
};

/**
 * Get the representation of an AABB in the global frame.
 * @method toWorldFrame
 * @param  {Transform} frame
 * @param  {AABB} target
 * @return {AABB} The "target" AABB object.
 */
AABB.prototype.toWorldFrame = function(frame, target){

    var corners = transformIntoFrame_corners;
    var a = corners[0];
    var b = corners[1];
    var c = corners[2];
    var d = corners[3];
    var e = corners[4];
    var f = corners[5];
    var g = corners[6];
    var h = corners[7];

    // Get corners in current frame
    this.getCorners(a, b, c, d, e, f, g, h);

    // Transform them to new local frame
    for(var i=0; i !== 8; i++){
        var corner = corners[i];
        frame.pointToWorld(corner, corner);
    }

    return target.setFromPoints(corners);
};

},{"../math/Vec3":30,"../utils/Utils":53}],4:[function(_dereq_,module,exports){
module.exports = ArrayCollisionMatrix;

/**
 * Collision "matrix". It's actually a triangular-shaped array of whether two bodies are touching this step, for reference next step
 * @class ArrayCollisionMatrix
 * @constructor
 */
function ArrayCollisionMatrix() {

    /**
     * The matrix storage
     * @property matrix
     * @type {Array}
     */
	this.matrix = [];
}

/**
 * Get an element
 * @method get
 * @param  {Number} i
 * @param  {Number} j
 * @return {Number}
 */
ArrayCollisionMatrix.prototype.get = function(i, j) {
	i = i.index;
	j = j.index;
    if (j > i) {
        var temp = j;
        j = i;
        i = temp;
    }
	return this.matrix[(i*(i + 1)>>1) + j-1];
};

/**
 * Set an element
 * @method set
 * @param {Number} i
 * @param {Number} j
 * @param {Number} value
 */
ArrayCollisionMatrix.prototype.set = function(i, j, value) {
	i = i.index;
	j = j.index;
    if (j > i) {
        var temp = j;
        j = i;
        i = temp;
    }
	this.matrix[(i*(i + 1)>>1) + j-1] = value ? 1 : 0;
};

/**
 * Sets all elements to zero
 * @method reset
 */
ArrayCollisionMatrix.prototype.reset = function() {
	for (var i=0, l=this.matrix.length; i!==l; i++) {
		this.matrix[i]=0;
	}
};

/**
 * Sets the max number of objects
 * @method setNumObjects
 * @param {Number} n
 */
ArrayCollisionMatrix.prototype.setNumObjects = function(n) {
	this.matrix.length = n*(n-1)>>1;
};

},{}],5:[function(_dereq_,module,exports){
var Body = _dereq_('../objects/Body');
var Vec3 = _dereq_('../math/Vec3');
var Quaternion = _dereq_('../math/Quaternion');
var Shape = _dereq_('../shapes/Shape');
var Plane = _dereq_('../shapes/Plane');

module.exports = Broadphase;

/**
 * Base class for broadphase implementations
 * @class Broadphase
 * @constructor
 * @author schteppe
 */
function Broadphase(){
    /**
    * The world to search for collisions in.
    * @property world
    * @type {World}
    */
    this.world = null;

    /**
     * If set to true, the broadphase uses bounding boxes for intersection test, else it uses bounding spheres.
     * @property useBoundingBoxes
     * @type {Boolean}
     */
    this.useBoundingBoxes = false;

    /**
     * Set to true if the objects in the world moved.
     * @property {Boolean} dirty
     */
    this.dirty = true;
}

/**
 * Get the collision pairs from the world
 * @method collisionPairs
 * @param {World} world The world to search in
 * @param {Array} p1 Empty array to be filled with body objects
 * @param {Array} p2 Empty array to be filled with body objects
 */
Broadphase.prototype.collisionPairs = function(world,p1,p2){
    throw new Error("collisionPairs not implemented for this BroadPhase class!");
};

/**
 * Check if a body pair needs to be intersection tested at all.
 * @method needBroadphaseCollision
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @return {bool}
 */
var Broadphase_needBroadphaseCollision_STATIC_OR_KINEMATIC = Body.STATIC | Body.KINEMATIC;
Broadphase.prototype.needBroadphaseCollision = function(bodyA,bodyB){

    // Check collision filter masks
    if( (bodyA.collisionFilterGroup & bodyB.collisionFilterMask)===0 || (bodyB.collisionFilterGroup & bodyA.collisionFilterMask)===0){
        return false;
    }

    // Check types
    if(((bodyA.type & Broadphase_needBroadphaseCollision_STATIC_OR_KINEMATIC)!==0 || bodyA.sleepState === Body.SLEEPING) &&
       ((bodyB.type & Broadphase_needBroadphaseCollision_STATIC_OR_KINEMATIC)!==0 || bodyB.sleepState === Body.SLEEPING)) {
        // Both bodies are static, kinematic or sleeping. Skip.
        return false;
    }

    return true;
};

/**
 * Check if the bounding volumes of two bodies intersect.
 * @method intersectionTest
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @param {array} pairs1
 * @param {array} pairs2
  */
Broadphase.prototype.intersectionTest = function(bodyA, bodyB, pairs1, pairs2){
    if(this.useBoundingBoxes){
        this.doBoundingBoxBroadphase(bodyA,bodyB,pairs1,pairs2);
    } else {
        this.doBoundingSphereBroadphase(bodyA,bodyB,pairs1,pairs2);
    }
};

/**
 * Check if the bounding spheres of two bodies are intersecting.
 * @method doBoundingSphereBroadphase
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @param {Array} pairs1 bodyA is appended to this array if intersection
 * @param {Array} pairs2 bodyB is appended to this array if intersection
 */
var Broadphase_collisionPairs_r = new Vec3(), // Temp objects
    Broadphase_collisionPairs_normal =  new Vec3(),
    Broadphase_collisionPairs_quat =  new Quaternion(),
    Broadphase_collisionPairs_relpos  =  new Vec3();
Broadphase.prototype.doBoundingSphereBroadphase = function(bodyA,bodyB,pairs1,pairs2){
    var r = Broadphase_collisionPairs_r;
    bodyB.position.vsub(bodyA.position,r);
    var boundingRadiusSum2 = Math.pow(bodyA.boundingRadius + bodyB.boundingRadius, 2);
    var norm2 = r.norm2();
    if(norm2 < boundingRadiusSum2){
        pairs1.push(bodyA);
        pairs2.push(bodyB);
    }
};

/**
 * Check if the bounding boxes of two bodies are intersecting.
 * @method doBoundingBoxBroadphase
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @param {Array} pairs1
 * @param {Array} pairs2
 */
Broadphase.prototype.doBoundingBoxBroadphase = function(bodyA,bodyB,pairs1,pairs2){
    if(bodyA.aabbNeedsUpdate){
        bodyA.computeAABB();
    }
    if(bodyB.aabbNeedsUpdate){
        bodyB.computeAABB();
    }

    // Check AABB / AABB
    if(bodyA.aabb.overlaps(bodyB.aabb)){
        pairs1.push(bodyA);
        pairs2.push(bodyB);
    }
};

/**
 * Removes duplicate pairs from the pair arrays.
 * @method makePairsUnique
 * @param {Array} pairs1
 * @param {Array} pairs2
 */
var Broadphase_makePairsUnique_temp = { keys:[] },
    Broadphase_makePairsUnique_p1 = [],
    Broadphase_makePairsUnique_p2 = [];
Broadphase.prototype.makePairsUnique = function(pairs1,pairs2){
    var t = Broadphase_makePairsUnique_temp,
        p1 = Broadphase_makePairsUnique_p1,
        p2 = Broadphase_makePairsUnique_p2,
        N = pairs1.length;

    for(var i=0; i!==N; i++){
        p1[i] = pairs1[i];
        p2[i] = pairs2[i];
    }

    pairs1.length = 0;
    pairs2.length = 0;

    for(var i=0; i!==N; i++){
        var id1 = p1[i].id,
            id2 = p2[i].id;
        var key = id1 < id2 ? id1+","+id2 :  id2+","+id1;
        t[key] = i;
        t.keys.push(key);
    }

    for(var i=0; i!==t.keys.length; i++){
        var key = t.keys.pop(),
            pairIndex = t[key];
        pairs1.push(p1[pairIndex]);
        pairs2.push(p2[pairIndex]);
        delete t[key];
    }
};

/**
 * To be implemented by subcasses
 * @method setWorld
 * @param {World} world
 */
Broadphase.prototype.setWorld = function(world){
};

/**
 * Check if the bounding spheres of two bodies overlap.
 * @method boundingSphereCheck
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @return {boolean}
 */
var bsc_dist = new Vec3();
Broadphase.boundingSphereCheck = function(bodyA,bodyB){
    var dist = bsc_dist;
    bodyA.position.vsub(bodyB.position,dist);
    return Math.pow(bodyA.shape.boundingSphereRadius + bodyB.shape.boundingSphereRadius,2) > dist.norm2();
};

/**
 * Returns all the bodies within the AABB.
 * @method aabbQuery
 * @param  {World} world
 * @param  {AABB} aabb
 * @param  {array} result An array to store resulting bodies in.
 * @return {array}
 */
Broadphase.prototype.aabbQuery = function(world, aabb, result){
    console.warn('.aabbQuery is not implemented in this Broadphase subclass.');
    return [];
};
},{"../math/Quaternion":28,"../math/Vec3":30,"../objects/Body":31,"../shapes/Plane":42,"../shapes/Shape":43}],6:[function(_dereq_,module,exports){
module.exports = GridBroadphase;

var Broadphase = _dereq_('./Broadphase');
var Vec3 = _dereq_('../math/Vec3');
var Shape = _dereq_('../shapes/Shape');

/**
 * Axis aligned uniform grid broadphase.
 * @class GridBroadphase
 * @constructor
 * @extends Broadphase
 * @todo Needs support for more than just planes and spheres.
 * @param {Vec3} aabbMin
 * @param {Vec3} aabbMax
 * @param {Number} nx Number of boxes along x
 * @param {Number} ny Number of boxes along y
 * @param {Number} nz Number of boxes along z
 */
function GridBroadphase(aabbMin,aabbMax,nx,ny,nz){
    Broadphase.apply(this);
    this.nx = nx || 10;
    this.ny = ny || 10;
    this.nz = nz || 10;
    this.aabbMin = aabbMin || new Vec3(100,100,100);
    this.aabbMax = aabbMax || new Vec3(-100,-100,-100);
	var nbins = this.nx * this.ny * this.nz;
	if (nbins <= 0) {
		throw "GridBroadphase: Each dimension's n must be >0";
	}
    this.bins = [];
	this.binLengths = []; //Rather than continually resizing arrays (thrashing the memory), just record length and allow them to grow
	this.bins.length = nbins;
	this.binLengths.length = nbins;
	for (var i=0;i<nbins;i++) {
		this.bins[i]=[];
		this.binLengths[i]=0;
	}
}
GridBroadphase.prototype = new Broadphase();
GridBroadphase.prototype.constructor = GridBroadphase;

/**
 * Get all the collision pairs in the physics world
 * @method collisionPairs
 * @param {World} world
 * @param {Array} pairs1
 * @param {Array} pairs2
 */
var GridBroadphase_collisionPairs_d = new Vec3();
var GridBroadphase_collisionPairs_binPos = new Vec3();
GridBroadphase.prototype.collisionPairs = function(world,pairs1,pairs2){
    var N = world.numObjects(),
        bodies = world.bodies;

    var max = this.aabbMax,
        min = this.aabbMin,
        nx = this.nx,
        ny = this.ny,
        nz = this.nz;

	var xstep = ny*nz;
	var ystep = nz;
	var zstep = 1;

    var xmax = max.x,
        ymax = max.y,
        zmax = max.z,
        xmin = min.x,
        ymin = min.y,
        zmin = min.z;

    var xmult = nx / (xmax-xmin),
        ymult = ny / (ymax-ymin),
        zmult = nz / (zmax-zmin);

    var binsizeX = (xmax - xmin) / nx,
        binsizeY = (ymax - ymin) / ny,
        binsizeZ = (zmax - zmin) / nz;

	var binRadius = Math.sqrt(binsizeX*binsizeX + binsizeY*binsizeY + binsizeZ*binsizeZ) * 0.5;

    var types = Shape.types;
    var SPHERE =            types.SPHERE,
        PLANE =             types.PLANE,
        BOX =               types.BOX,
        COMPOUND =          types.COMPOUND,
        CONVEXPOLYHEDRON =  types.CONVEXPOLYHEDRON;

    var bins=this.bins,
		binLengths=this.binLengths,
        Nbins=this.bins.length;

    // Reset bins
    for(var i=0; i!==Nbins; i++){
        binLengths[i] = 0;
    }

    var ceil = Math.ceil;
	var min = Math.min;
	var max = Math.max;

	function addBoxToBins(x0,y0,z0,x1,y1,z1,bi) {
		var xoff0 = ((x0 - xmin) * xmult)|0,
			yoff0 = ((y0 - ymin) * ymult)|0,
			zoff0 = ((z0 - zmin) * zmult)|0,
			xoff1 = ceil((x1 - xmin) * xmult),
			yoff1 = ceil((y1 - ymin) * ymult),
			zoff1 = ceil((z1 - zmin) * zmult);

		if (xoff0 < 0) { xoff0 = 0; } else if (xoff0 >= nx) { xoff0 = nx - 1; }
		if (yoff0 < 0) { yoff0 = 0; } else if (yoff0 >= ny) { yoff0 = ny - 1; }
		if (zoff0 < 0) { zoff0 = 0; } else if (zoff0 >= nz) { zoff0 = nz - 1; }
		if (xoff1 < 0) { xoff1 = 0; } else if (xoff1 >= nx) { xoff1 = nx - 1; }
		if (yoff1 < 0) { yoff1 = 0; } else if (yoff1 >= ny) { yoff1 = ny - 1; }
		if (zoff1 < 0) { zoff1 = 0; } else if (zoff1 >= nz) { zoff1 = nz - 1; }

		xoff0 *= xstep;
		yoff0 *= ystep;
		zoff0 *= zstep;
		xoff1 *= xstep;
		yoff1 *= ystep;
		zoff1 *= zstep;

		for (var xoff = xoff0; xoff <= xoff1; xoff += xstep) {
			for (var yoff = yoff0; yoff <= yoff1; yoff += ystep) {
				for (var zoff = zoff0; zoff <= zoff1; zoff += zstep) {
					var idx = xoff+yoff+zoff;
					bins[idx][binLengths[idx]++] = bi;
				}
			}
		}
	}

    // Put all bodies into the bins
    for(var i=0; i!==N; i++){
        var bi = bodies[i];
        var si = bi.shape;

        switch(si.type){
        case SPHERE:
            // Put in bin
            // check if overlap with other bins
            var x = bi.position.x,
                y = bi.position.y,
                z = bi.position.z;
            var r = si.radius;

			addBoxToBins(x-r, y-r, z-r, x+r, y+r, z+r, bi);
            break;

        case PLANE:
            if(si.worldNormalNeedsUpdate){
                si.computeWorldNormal(bi.quaternion);
            }
            var planeNormal = si.worldNormal;

			//Relative position from origin of plane object to the first bin
			//Incremented as we iterate through the bins
			var xreset = xmin + binsizeX*0.5 - bi.position.x,
				yreset = ymin + binsizeY*0.5 - bi.position.y,
				zreset = zmin + binsizeZ*0.5 - bi.position.z;

            var d = GridBroadphase_collisionPairs_d;
			d.set(xreset, yreset, zreset);

			for (var xi = 0, xoff = 0; xi !== nx; xi++, xoff += xstep, d.y = yreset, d.x += binsizeX) {
				for (var yi = 0, yoff = 0; yi !== ny; yi++, yoff += ystep, d.z = zreset, d.y += binsizeY) {
					for (var zi = 0, zoff = 0; zi !== nz; zi++, zoff += zstep, d.z += binsizeZ) {
						if (d.dot(planeNormal) < binRadius) {
							var idx = xoff + yoff + zoff;
							bins[idx][binLengths[idx]++] = bi;
						}
					}
				}
			}
            break;

        default:
			if (bi.aabbNeedsUpdate) {
				bi.computeAABB();
			}

			addBoxToBins(
				bi.aabb.lowerBound.x,
				bi.aabb.lowerBound.y,
				bi.aabb.lowerBound.z,
				bi.aabb.upperBound.x,
				bi.aabb.upperBound.y,
				bi.aabb.upperBound.z,
				bi);
            break;
        }
    }

    // Check each bin
    for(var i=0; i!==Nbins; i++){
		var binLength = binLengths[i];
		//Skip bins with no potential collisions
		if (binLength > 1) {
			var bin = bins[i];

			// Do N^2 broadphase inside
			for(var xi=0; xi!==binLength; xi++){
				var bi = bin[xi];
				for(var yi=0; yi!==xi; yi++){
					var bj = bin[yi];
					if(this.needBroadphaseCollision(bi,bj)){
						this.intersectionTest(bi,bj,pairs1,pairs2);
					}
				}
			}
		}
    }

//	for (var zi = 0, zoff=0; zi < nz; zi++, zoff+= zstep) {
//		console.log("layer "+zi);
//		for (var yi = 0, yoff=0; yi < ny; yi++, yoff += ystep) {
//			var row = '';
//			for (var xi = 0, xoff=0; xi < nx; xi++, xoff += xstep) {
//				var idx = xoff + yoff + zoff;
//				row += ' ' + binLengths[idx];
//			}
//			console.log(row);
//		}
//	}

    this.makePairsUnique(pairs1,pairs2);
};

},{"../math/Vec3":30,"../shapes/Shape":43,"./Broadphase":5}],7:[function(_dereq_,module,exports){
module.exports = NaiveBroadphase;

var Broadphase = _dereq_('./Broadphase');
var AABB = _dereq_('./AABB');

/**
 * Naive broadphase implementation, used in lack of better ones.
 * @class NaiveBroadphase
 * @constructor
 * @description The naive broadphase looks at all possible pairs without restriction, therefore it has complexity N^2 (which is bad)
 * @extends Broadphase
 */
function NaiveBroadphase(){
    Broadphase.apply(this);
}
NaiveBroadphase.prototype = new Broadphase();
NaiveBroadphase.prototype.constructor = NaiveBroadphase;

/**
 * Get all the collision pairs in the physics world
 * @method collisionPairs
 * @param {World} world
 * @param {Array} pairs1
 * @param {Array} pairs2
 */
NaiveBroadphase.prototype.collisionPairs = function(world,pairs1,pairs2){
    var bodies = world.bodies,
        n = bodies.length,
        i,j,bi,bj;

    // Naive N^2 ftw!
    for(i=0; i!==n; i++){
        for(j=0; j!==i; j++){

            bi = bodies[i];
            bj = bodies[j];

            if(!this.needBroadphaseCollision(bi,bj)){
                continue;
            }

            this.intersectionTest(bi,bj,pairs1,pairs2);
        }
    }
};

var tmpAABB = new AABB();

/**
 * Returns all the bodies within an AABB.
 * @method aabbQuery
 * @param  {World} world
 * @param  {AABB} aabb
 * @param {array} result An array to store resulting bodies in.
 * @return {array}
 */
NaiveBroadphase.prototype.aabbQuery = function(world, aabb, result){
    result = result || [];

    for(var i = 0; i < world.bodies.length; i++){
        var b = world.bodies[i];

        if(b.aabbNeedsUpdate){
            b.computeAABB();
        }

        // Ugly hack until Body gets aabb
        if(b.aabb.overlaps(aabb)){
            result.push(b);
        }
    }

    return result;
};
},{"./AABB":3,"./Broadphase":5}],8:[function(_dereq_,module,exports){
module.exports = ObjectCollisionMatrix;

/**
 * Records what objects are colliding with each other
 * @class ObjectCollisionMatrix
 * @constructor
 */
function ObjectCollisionMatrix() {

    /**
     * The matrix storage
     * @property matrix
     * @type {Object}
     */
	this.matrix = {};
}

/**
 * @method get
 * @param  {Number} i
 * @param  {Number} j
 * @return {Number}
 */
ObjectCollisionMatrix.prototype.get = function(i, j) {
	i = i.id;
	j = j.id;
    if (j > i) {
        var temp = j;
        j = i;
        i = temp;
    }
	return i+'-'+j in this.matrix;
};

/**
 * @method set
 * @param  {Number} i
 * @param  {Number} j
 * @param {Number} value
 */
ObjectCollisionMatrix.prototype.set = function(i, j, value) {
	i = i.id;
	j = j.id;
    if (j > i) {
        var temp = j;
        j = i;
        i = temp;
	}
	if (value) {
		this.matrix[i+'-'+j] = true;
	}
	else {
		delete this.matrix[i+'-'+j];
	}
};

/**
 * Empty the matrix
 * @method reset
 */
ObjectCollisionMatrix.prototype.reset = function() {
	this.matrix = {};
};

/**
 * Set max number of objects
 * @method setNumObjects
 * @param {Number} n
 */
ObjectCollisionMatrix.prototype.setNumObjects = function(n) {
};

},{}],9:[function(_dereq_,module,exports){
module.exports = Ray;

var Vec3 = _dereq_('../math/Vec3');
var Quaternion = _dereq_('../math/Quaternion');
var Transform = _dereq_('../math/Transform');
var ConvexPolyhedron = _dereq_('../shapes/ConvexPolyhedron');
var Box = _dereq_('../shapes/Box');
var RaycastResult = _dereq_('../collision/RaycastResult');
var Shape = _dereq_('../shapes/Shape');
var AABB = _dereq_('../collision/AABB');

/**
 * A line in 3D space that intersects bodies and return points.
 * @class Ray
 * @constructor
 * @param {Vec3} from
 * @param {Vec3} to
 */
function Ray(from, to){
    /**
     * @property {Vec3} from
     */
    this.from = from ? from.clone() : new Vec3();

    /**
     * @property {Vec3} to
     */
    this.to = to ? to.clone() : new Vec3();

    /**
     * @private
     * @property {Vec3} _direction
     */
    this._direction = new Vec3();

    /**
     * The precision of the ray. Used when checking parallelity etc.
     * @property {Number} precision
     */
    this.precision = 0.0001;

    /**
     * Set to true if you want the Ray to take .collisionResponse flags into account on bodies and shapes.
     * @property {Boolean} checkCollisionResponse
     */
    this.checkCollisionResponse = true;

    /**
     * If set to true, the ray skips any hits with normal.dot(rayDirection) < 0.
     * @property {Boolean} skipBackfaces
     */
    this.skipBackfaces = false;

    /**
     * @property {number} collisionFilterMask
     * @default -1
     */
    this.collisionFilterMask = -1;

    /**
     * @property {number} collisionFilterGroup
     * @default -1
     */
    this.collisionFilterGroup = -1;

    /**
     * The intersection mode. Should be Ray.ANY, Ray.ALL or Ray.CLOSEST.
     * @property {number} mode
     */
    this.mode = Ray.ANY;

    /**
     * Current result object.
     * @property {RaycastResult} result
     */
    this.result = new RaycastResult();

    /**
     * Will be set to true during intersectWorld() if the ray hit anything.
     * @property {Boolean} hasHit
     */
    this.hasHit = false;

    /**
     * Current, user-provided result callback. Will be used if mode is Ray.ALL.
     * @property {Function} callback
     */
    this.callback = function(result){};
}
Ray.prototype.constructor = Ray;

Ray.CLOSEST = 1;
Ray.ANY = 2;
Ray.ALL = 4;

var tmpAABB = new AABB();
var tmpArray = [];

/**
 * Do itersection against all bodies in the given World.
 * @method intersectWorld
 * @param  {World} world
 * @param  {object} options
 * @return {Boolean} True if the ray hit anything, otherwise false.
 */
Ray.prototype.intersectWorld = function (world, options) {
    this.mode = options.mode || Ray.ANY;
    this.result = options.result || new RaycastResult();
    this.skipBackfaces = !!options.skipBackfaces;
    this.collisionFilterMask = typeof(options.collisionFilterMask) !== 'undefined' ? options.collisionFilterMask : -1;
    this.collisionFilterGroup = typeof(options.collisionFilterGroup) !== 'undefined' ? options.collisionFilterGroup : -1;
    if(options.from){
        this.from.copy(options.from);
    }
    if(options.to){
        this.to.copy(options.to);
    }
    this.callback = options.callback || function(){};
    this.hasHit = false;

    this.result.reset();
    this._updateDirection();

    this.getAABB(tmpAABB);
    tmpArray.length = 0;
    world.broadphase.aabbQuery(world, tmpAABB, tmpArray);
    this.intersectBodies(tmpArray);

    return this.hasHit;
};

var v1 = new Vec3(),
    v2 = new Vec3();

/*
 * As per "Barycentric Technique" as named here http://www.blackpawn.com/texts/pointinpoly/default.html But without the division
 */
Ray.pointInTriangle = pointInTriangle;
function pointInTriangle(p, a, b, c) {
    c.vsub(a,v0);
    b.vsub(a,v1);
    p.vsub(a,v2);

    var dot00 = v0.dot( v0 );
    var dot01 = v0.dot( v1 );
    var dot02 = v0.dot( v2 );
    var dot11 = v1.dot( v1 );
    var dot12 = v1.dot( v2 );

    var u,v;

    return  ( (u = dot11 * dot02 - dot01 * dot12) >= 0 ) &&
            ( (v = dot00 * dot12 - dot01 * dot02) >= 0 ) &&
            ( u + v < ( dot00 * dot11 - dot01 * dot01 ) );
}

/**
 * Shoot a ray at a body, get back information about the hit.
 * @method intersectBody
 * @private
 * @param {Body} body
 * @param {RaycastResult} [result] Deprecated - set the result property of the Ray instead.
 */
var intersectBody_xi = new Vec3();
var intersectBody_qi = new Quaternion();
Ray.prototype.intersectBody = function (body, result) {
    if(result){
        this.result = result;
        this._updateDirection();
    }
    var checkCollisionResponse = this.checkCollisionResponse;

    if(checkCollisionResponse && !body.collisionResponse){
        return;
    }

    if((this.collisionFilterGroup & body.collisionFilterMask)===0 || (body.collisionFilterGroup & this.collisionFilterMask)===0){
        return;
    }

    var xi = intersectBody_xi;
    var qi = intersectBody_qi;

    for (var i = 0, N = body.shapes.length; i < N; i++) {
        var shape = body.shapes[i];

        if(checkCollisionResponse && !shape.collisionResponse){
            continue; // Skip
        }

        body.quaternion.mult(body.shapeOrientations[i], qi);
        body.quaternion.vmult(body.shapeOffsets[i], xi);
        xi.vadd(body.position, xi);

        this.intersectShape(
            shape,
            qi,
            xi,
            body
        );

        if(this.result._shouldStop){
            break;
        }
    }
};

/**
 * @method intersectBodies
 * @param {Array} bodies An array of Body objects.
 * @param {RaycastResult} [result] Deprecated
 */
Ray.prototype.intersectBodies = function (bodies, result) {
    if(result){
        this.result = result;
        this._updateDirection();
    }

    for ( var i = 0, l = bodies.length; !this.result._shouldStop && i < l; i ++ ) {
        this.intersectBody(bodies[i]);
    }
};

/**
 * Updates the _direction vector.
 * @private
 * @method _updateDirection
 */
Ray.prototype._updateDirection = function(){
    this.to.vsub(this.from, this._direction);
    this._direction.normalize();
};

/**
 * @method intersectShape
 * @private
 * @param {Shape} shape
 * @param {Quaternion} quat
 * @param {Vec3} position
 * @param {Body} body
 */
Ray.prototype.intersectShape = function(shape, quat, position, body){
    var from = this.from;


    // Checking boundingSphere
    var distance = distanceFromIntersection(from, this._direction, position);
    if ( distance > shape.boundingSphereRadius ) {
        return;
    }

    var intersectMethod = this[shape.type];
    if(intersectMethod){
        intersectMethod.call(this, shape, quat, position, body);
    }
};

var vector = new Vec3();
var normal = new Vec3();
var intersectPoint = new Vec3();

var a = new Vec3();
var b = new Vec3();
var c = new Vec3();
var d = new Vec3();

var tmpRaycastResult = new RaycastResult();

/**
 * @method intersectBox
 * @private
 * @param  {Shape} shape
 * @param  {Quaternion} quat
 * @param  {Vec3} position
 * @param  {Body} body
 */
Ray.prototype.intersectBox = function(shape, quat, position, body){
    return this.intersectConvex(shape.convexPolyhedronRepresentation, quat, position, body);
};
Ray.prototype[Shape.types.BOX] = Ray.prototype.intersectBox;

/**
 * @method intersectPlane
 * @private
 * @param  {Shape} shape
 * @param  {Quaternion} quat
 * @param  {Vec3} position
 * @param  {Body} body
 */
Ray.prototype.intersectPlane = function(shape, quat, position, body){
    var from = this.from;
    var to = this.to;
    var direction = this._direction;

    // Get plane normal
    var worldNormal = new Vec3(0, 0, 1);
    quat.vmult(worldNormal, worldNormal);

    var len = new Vec3();
    from.vsub(position, len);
    var planeToFrom = len.dot(worldNormal);
    to.vsub(position, len);
    var planeToTo = len.dot(worldNormal);

    if(planeToFrom * planeToTo > 0){
        // "from" and "to" are on the same side of the plane... bail out
        return;
    }

    if(from.distanceTo(to) < planeToFrom){
        return;
    }

    var n_dot_dir = worldNormal.dot(direction);

    if (Math.abs(n_dot_dir) < this.precision) {
        // No intersection
        return;
    }

    var planePointToFrom = new Vec3();
    var dir_scaled_with_t = new Vec3();
    var hitPointWorld = new Vec3();

    from.vsub(position, planePointToFrom);
    var t = -worldNormal.dot(planePointToFrom) / n_dot_dir;
    direction.scale(t, dir_scaled_with_t);
    from.vadd(dir_scaled_with_t, hitPointWorld);

    this.reportIntersection(worldNormal, hitPointWorld, shape, body, -1);
};
Ray.prototype[Shape.types.PLANE] = Ray.prototype.intersectPlane;

/**
 * Get the world AABB of the ray.
 * @method getAABB
 * @param  {AABB} aabb
 */
Ray.prototype.getAABB = function(result){
    var to = this.to;
    var from = this.from;
    result.lowerBound.x = Math.min(to.x, from.x);
    result.lowerBound.y = Math.min(to.y, from.y);
    result.lowerBound.z = Math.min(to.z, from.z);
    result.upperBound.x = Math.max(to.x, from.x);
    result.upperBound.y = Math.max(to.y, from.y);
    result.upperBound.z = Math.max(to.z, from.z);
};

var intersectConvexOptions = {
    faceList: [0]
};

/**
 * @method intersectHeightfield
 * @private
 * @param  {Shape} shape
 * @param  {Quaternion} quat
 * @param  {Vec3} position
 * @param  {Body} body
 */
Ray.prototype.intersectHeightfield = function(shape, quat, position, body){
    var data = shape.data,
        w = shape.elementSize,
        worldPillarOffset = new Vec3();

    // Convert the ray to local heightfield coordinates
    var localRay = new Ray(this.from, this.to);
    Transform.pointToLocalFrame(position, quat, localRay.from, localRay.from);
    Transform.pointToLocalFrame(position, quat, localRay.to, localRay.to);

    // Get the index of the data points to test against
    var index = [];
    var iMinX = null;
    var iMinY = null;
    var iMaxX = null;
    var iMaxY = null;

    var inside = shape.getIndexOfPosition(localRay.from.x, localRay.from.y, index, false);
    if(inside){
        iMinX = index[0];
        iMinY = index[1];
        iMaxX = index[0];
        iMaxY = index[1];
    }
    inside = shape.getIndexOfPosition(localRay.to.x, localRay.to.y, index, false);
    if(inside){
        if (iMinX === null || index[0] < iMinX) { iMinX = index[0]; }
        if (iMaxX === null || index[0] > iMaxX) { iMaxX = index[0]; }
        if (iMinY === null || index[1] < iMinY) { iMinY = index[1]; }
        if (iMaxY === null || index[1] > iMaxY) { iMaxY = index[1]; }
    }

    if(iMinX === null){
        return;
    }

    var minMax = [];
    shape.getRectMinMax(iMinX, iMinY, iMaxX, iMaxY, minMax);
    var min = minMax[0];
    var max = minMax[1];

    // // Bail out if the ray can't touch the bounding box
    // // TODO
    // var aabb = new AABB();
    // this.getAABB(aabb);
    // if(aabb.intersects()){
    //     return;
    // }

    for(var i = iMinX; i <= iMaxX; i++){
        for(var j = iMinY; j <= iMaxY; j++){

            if(this.result._shouldStop){
                return;
            }

            // Lower triangle
            shape.getConvexTrianglePillar(i, j, false);
            Transform.pointToWorldFrame(position, quat, shape.pillarOffset, worldPillarOffset);
            this.intersectConvex(shape.pillarConvex, quat, worldPillarOffset, body, intersectConvexOptions);

            if(this.result._shouldStop){
                return;
            }

            // Upper triangle
            shape.getConvexTrianglePillar(i, j, true);
            Transform.pointToWorldFrame(position, quat, shape.pillarOffset, worldPillarOffset);
            this.intersectConvex(shape.pillarConvex, quat, worldPillarOffset, body, intersectConvexOptions);
        }
    }
};
Ray.prototype[Shape.types.HEIGHTFIELD] = Ray.prototype.intersectHeightfield;

var Ray_intersectSphere_intersectionPoint = new Vec3();
var Ray_intersectSphere_normal = new Vec3();

/**
 * @method intersectSphere
 * @private
 * @param  {Shape} shape
 * @param  {Quaternion} quat
 * @param  {Vec3} position
 * @param  {Body} body
 */
Ray.prototype.intersectSphere = function(shape, quat, position, body){
    var from = this.from,
        to = this.to,
        r = shape.radius;

    var a = Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2) + Math.pow(to.z - from.z, 2);
    var b = 2 * ((to.x - from.x) * (from.x - position.x) + (to.y - from.y) * (from.y - position.y) + (to.z - from.z) * (from.z - position.z));
    var c = Math.pow(from.x - position.x, 2) + Math.pow(from.y - position.y, 2) + Math.pow(from.z - position.z, 2) - Math.pow(r, 2);

    var delta = Math.pow(b, 2) - 4 * a * c;

    var intersectionPoint = Ray_intersectSphere_intersectionPoint;
    var normal = Ray_intersectSphere_normal;

    if(delta < 0){
        // No intersection
        return;

    } else if(delta === 0){
        // single intersection point
        from.lerp(to, delta, intersectionPoint);

        intersectionPoint.vsub(position, normal);
        normal.normalize();

        this.reportIntersection(normal, intersectionPoint, shape, body, -1);

    } else {
        var d1 = (- b - Math.sqrt(delta)) / (2 * a);
        var d2 = (- b + Math.sqrt(delta)) / (2 * a);

        if(d1 >= 0 && d1 <= 1){
            from.lerp(to, d1, intersectionPoint);
            intersectionPoint.vsub(position, normal);
            normal.normalize();
            this.reportIntersection(normal, intersectionPoint, shape, body, -1);
        }

        if(this.result._shouldStop){
            return;
        }

        if(d2 >= 0 && d2 <= 1){
            from.lerp(to, d2, intersectionPoint);
            intersectionPoint.vsub(position, normal);
            normal.normalize();
            this.reportIntersection(normal, intersectionPoint, shape, body, -1);
        }
    }
};
Ray.prototype[Shape.types.SPHERE] = Ray.prototype.intersectSphere;


var intersectConvex_normal = new Vec3();
var intersectConvex_minDistNormal = new Vec3();
var intersectConvex_minDistIntersect = new Vec3();
var intersectConvex_vector = new Vec3();

/**
 * @method intersectConvex
 * @private
 * @param  {Shape} shape
 * @param  {Quaternion} quat
 * @param  {Vec3} position
 * @param  {Body} body
 * @param {object} [options]
 * @param {array} [options.faceList]
 */
Ray.prototype.intersectConvex = function intersectConvex(
    shape,
    quat,
    position,
    body,
    options
){
    var minDistNormal = intersectConvex_minDistNormal;
    var normal = intersectConvex_normal;
    var vector = intersectConvex_vector;
    var minDistIntersect = intersectConvex_minDistIntersect;
    var faceList = (options && options.faceList) || null;

    // Checking faces
    var faces = shape.faces,
        vertices = shape.vertices,
        normals = shape.faceNormals;
    var direction = this._direction;

    var from = this.from;
    var to = this.to;
    var fromToDistance = from.distanceTo(to);

    var minDist = -1;
    var Nfaces = faceList ? faceList.length : faces.length;
    var result = this.result;

    for (var j = 0; !result._shouldStop && j < Nfaces; j++) {
        var fi = faceList ? faceList[j] : j;

        var face = faces[fi];
        var faceNormal = normals[fi];
        var q = quat;
        var x = position;

        // determine if ray intersects the plane of the face
        // note: this works regardless of the direction of the face normal

        // Get plane point in world coordinates...
        vector.copy(vertices[face[0]]);
        q.vmult(vector,vector);
        vector.vadd(x,vector);

        // ...but make it relative to the ray from. We'll fix this later.
        vector.vsub(from,vector);

        // Get plane normal
        q.vmult(faceNormal,normal);

        // If this dot product is negative, we have something interesting
        var dot = direction.dot(normal);

        // Bail out if ray and plane are parallel
        if ( Math.abs( dot ) < this.precision ){
            continue;
        }

        // calc distance to plane
        var scalar = normal.dot(vector) / dot;

        // if negative distance, then plane is behind ray
        if (scalar < 0){
            continue;
        }

        // if (dot < 0) {

        // Intersection point is from + direction * scalar
        direction.mult(scalar,intersectPoint);
        intersectPoint.vadd(from,intersectPoint);

        // a is the point we compare points b and c with.
        a.copy(vertices[face[0]]);
        q.vmult(a,a);
        x.vadd(a,a);

        for(var i = 1; !result._shouldStop && i < face.length - 1; i++){
            // Transform 3 vertices to world coords
            b.copy(vertices[face[i]]);
            c.copy(vertices[face[i+1]]);
            q.vmult(b,b);
            q.vmult(c,c);
            x.vadd(b,b);
            x.vadd(c,c);

            var distance = intersectPoint.distanceTo(from);

            if(!(pointInTriangle(intersectPoint, a, b, c) || pointInTriangle(intersectPoint, b, a, c)) || distance > fromToDistance){
                continue;
            }

            this.reportIntersection(normal, intersectPoint, shape, body, fi);
        }
        // }
    }
};
Ray.prototype[Shape.types.CONVEXPOLYHEDRON] = Ray.prototype.intersectConvex;

var intersectTrimesh_normal = new Vec3();
var intersectTrimesh_localDirection = new Vec3();
var intersectTrimesh_localFrom = new Vec3();
var intersectTrimesh_localTo = new Vec3();
var intersectTrimesh_worldNormal = new Vec3();
var intersectTrimesh_worldIntersectPoint = new Vec3();
var intersectTrimesh_localAABB = new AABB();
var intersectTrimesh_triangles = [];
var intersectTrimesh_treeTransform = new Transform();

/**
 * @method intersectTrimesh
 * @private
 * @param  {Shape} shape
 * @param  {Quaternion} quat
 * @param  {Vec3} position
 * @param  {Body} body
 * @param {object} [options]
 * @todo Optimize by transforming the world to local space first.
 * @todo Use Octree lookup
 */
Ray.prototype.intersectTrimesh = function intersectTrimesh(
    mesh,
    quat,
    position,
    body,
    options
){
    var normal = intersectTrimesh_normal;
    var triangles = intersectTrimesh_triangles;
    var treeTransform = intersectTrimesh_treeTransform;
    var minDistNormal = intersectConvex_minDistNormal;
    var vector = intersectConvex_vector;
    var minDistIntersect = intersectConvex_minDistIntersect;
    var localAABB = intersectTrimesh_localAABB;
    var localDirection = intersectTrimesh_localDirection;
    var localFrom = intersectTrimesh_localFrom;
    var localTo = intersectTrimesh_localTo;
    var worldIntersectPoint = intersectTrimesh_worldIntersectPoint;
    var worldNormal = intersectTrimesh_worldNormal;
    var faceList = (options && options.faceList) || null;

    // Checking faces
    var indices = mesh.indices,
        vertices = mesh.vertices,
        normals = mesh.faceNormals;

    var from = this.from;
    var to = this.to;
    var direction = this._direction;

    var minDist = -1;
    treeTransform.position.copy(position);
    treeTransform.quaternion.copy(quat);

    // Transform ray to local space!
    Transform.vectorToLocalFrame(position, quat, direction, localDirection);
    //body.vectorToLocalFrame(direction, localDirection);
    Transform.pointToLocalFrame(position, quat, from, localFrom);
    //body.pointToLocalFrame(from, localFrom);
    Transform.pointToLocalFrame(position, quat, to, localTo);
    //body.pointToLocalFrame(to, localTo);
    var fromToDistanceSquared = localFrom.distanceSquared(localTo);

    mesh.tree.rayQuery(this, treeTransform, triangles);

    for (var i = 0, N = triangles.length; !this.result._shouldStop && i !== N; i++) {
        var trianglesIndex = triangles[i];

        mesh.getNormal(trianglesIndex, normal);

        // determine if ray intersects the plane of the face
        // note: this works regardless of the direction of the face normal

        // Get plane point in world coordinates...
        mesh.getVertex(indices[trianglesIndex * 3], a);

        // ...but make it relative to the ray from. We'll fix this later.
        a.vsub(localFrom,vector);

        // Get plane normal
        // quat.vmult(normal, normal);

        // If this dot product is negative, we have something interesting
        var dot = localDirection.dot(normal);

        // Bail out if ray and plane are parallel
        // if (Math.abs( dot ) < this.precision){
        //     continue;
        // }

        // calc distance to plane
        var scalar = normal.dot(vector) / dot;

        // if negative distance, then plane is behind ray
        if (scalar < 0){
            continue;
        }

        // Intersection point is from + direction * scalar
        localDirection.scale(scalar,intersectPoint);
        intersectPoint.vadd(localFrom,intersectPoint);

        // Get triangle vertices
        mesh.getVertex(indices[trianglesIndex * 3 + 1], b);
        mesh.getVertex(indices[trianglesIndex * 3 + 2], c);

        var squaredDistance = intersectPoint.distanceSquared(localFrom);

        if(!(pointInTriangle(intersectPoint, b, a, c) || pointInTriangle(intersectPoint, a, b, c)) || squaredDistance > fromToDistanceSquared){
            continue;
        }

        // transform intersectpoint and normal to world
        Transform.vectorToWorldFrame(quat, normal, worldNormal);
        //body.vectorToWorldFrame(normal, worldNormal);
        Transform.pointToWorldFrame(position, quat, intersectPoint, worldIntersectPoint);
        //body.pointToWorldFrame(intersectPoint, worldIntersectPoint);
        this.reportIntersection(worldNormal, worldIntersectPoint, mesh, body, trianglesIndex);
    }
    triangles.length = 0;
};
Ray.prototype[Shape.types.TRIMESH] = Ray.prototype.intersectTrimesh;


/**
 * @method reportIntersection
 * @private
 * @param  {Vec3} normal
 * @param  {Vec3} hitPointWorld
 * @param  {Shape} shape
 * @param  {Body} body
 * @return {boolean} True if the intersections should continue
 */
Ray.prototype.reportIntersection = function(normal, hitPointWorld, shape, body, hitFaceIndex){
    var from = this.from;
    var to = this.to;
    var distance = from.distanceTo(hitPointWorld);
    var result = this.result;

    // Skip back faces?
    if(this.skipBackfaces && normal.dot(this._direction) > 0){
        return;
    }

    result.hitFaceIndex = typeof(hitFaceIndex) !== 'undefined' ? hitFaceIndex : -1;

    switch(this.mode){
    case Ray.ALL:
        this.hasHit = true;
        result.set(
            from,
            to,
            normal,
            hitPointWorld,
            shape,
            body,
            distance
        );
        result.hasHit = true;
        this.callback(result);
        break;

    case Ray.CLOSEST:

        // Store if closer than current closest
        if(distance < result.distance || !result.hasHit){
            this.hasHit = true;
            result.hasHit = true;
            result.set(
                from,
                to,
                normal,
                hitPointWorld,
                shape,
                body,
                distance
            );
        }
        break;

    case Ray.ANY:

        // Report and stop.
        this.hasHit = true;
        result.hasHit = true;
        result.set(
            from,
            to,
            normal,
            hitPointWorld,
            shape,
            body,
            distance
        );
        result._shouldStop = true;
        break;
    }
};

var v0 = new Vec3(),
    intersect = new Vec3();
function distanceFromIntersection(from, direction, position) {

    // v0 is vector from from to position
    position.vsub(from,v0);
    var dot = v0.dot(direction);

    // intersect = direction*dot + from
    direction.mult(dot,intersect);
    intersect.vadd(from,intersect);

    var distance = position.distanceTo(intersect);

    return distance;
}


},{"../collision/AABB":3,"../collision/RaycastResult":10,"../math/Quaternion":28,"../math/Transform":29,"../math/Vec3":30,"../shapes/Box":37,"../shapes/ConvexPolyhedron":38,"../shapes/Shape":43}],10:[function(_dereq_,module,exports){
var Vec3 = _dereq_('../math/Vec3');

module.exports = RaycastResult;

/**
 * Storage for Ray casting data.
 * @class RaycastResult
 * @constructor
 */
function RaycastResult(){

	/**
	 * @property {Vec3} rayFromWorld
	 */
	this.rayFromWorld = new Vec3();

	/**
	 * @property {Vec3} rayToWorld
	 */
	this.rayToWorld = new Vec3();

	/**
	 * @property {Vec3} hitNormalWorld
	 */
	this.hitNormalWorld = new Vec3();

	/**
	 * @property {Vec3} hitPointWorld
	 */
	this.hitPointWorld = new Vec3();

	/**
	 * @property {boolean} hasHit
	 */
	this.hasHit = false;

	/**
	 * The hit shape, or null.
	 * @property {Shape} shape
	 */
	this.shape = null;

	/**
	 * The hit body, or null.
	 * @property {Body} body
	 */
	this.body = null;

	/**
	 * The index of the hit triangle, if the hit shape was a trimesh.
	 * @property {number} hitFaceIndex
	 * @default -1
	 */
	this.hitFaceIndex = -1;

	/**
	 * Distance to the hit. Will be set to -1 if there was no hit.
	 * @property {number} distance
	 * @default -1
	 */
	this.distance = -1;

	/**
	 * If the ray should stop traversing the bodies.
	 * @private
	 * @property {Boolean} _shouldStop
	 * @default false
	 */
	this._shouldStop = false;
}

/**
 * Reset all result data.
 * @method reset
 */
RaycastResult.prototype.reset = function () {
	this.rayFromWorld.setZero();
	this.rayToWorld.setZero();
	this.hitNormalWorld.setZero();
	this.hitPointWorld.setZero();
	this.hasHit = false;
	this.shape = null;
	this.body = null;
	this.hitFaceIndex = -1;
	this.distance = -1;
	this._shouldStop = false;
};

/**
 * @method abort
 */
RaycastResult.prototype.abort = function(){
	this._shouldStop = true;
};

/**
 * @method set
 * @param {Vec3} rayFromWorld
 * @param {Vec3} rayToWorld
 * @param {Vec3} hitNormalWorld
 * @param {Vec3} hitPointWorld
 * @param {Shape} shape
 * @param {Body} body
 * @param {number} distance
 */
RaycastResult.prototype.set = function(
	rayFromWorld,
	rayToWorld,
	hitNormalWorld,
	hitPointWorld,
	shape,
	body,
	distance
){
	this.rayFromWorld.copy(rayFromWorld);
	this.rayToWorld.copy(rayToWorld);
	this.hitNormalWorld.copy(hitNormalWorld);
	this.hitPointWorld.copy(hitPointWorld);
	this.shape = shape;
	this.body = body;
	this.distance = distance;
};
},{"../math/Vec3":30}],11:[function(_dereq_,module,exports){
var Shape = _dereq_('../shapes/Shape');
var Broadphase = _dereq_('../collision/Broadphase');

module.exports = SAPBroadphase;

/**
 * Sweep and prune broadphase along one axis.
 *
 * @class SAPBroadphase
 * @constructor
 * @param {World} [world]
 * @extends Broadphase
 */
function SAPBroadphase(world){
    Broadphase.apply(this);

    /**
     * List of bodies currently in the broadphase.
     * @property axisList
     * @type {Array}
     */
    this.axisList = [];

    /**
     * The world to search in.
     * @property world
     * @type {World}
     */
    this.world = null;

    /**
     * Axis to sort the bodies along. Set to 0 for x axis, and 1 for y axis. For best performance, choose an axis that the bodies are spread out more on.
     * @property axisIndex
     * @type {Number}
     */
    this.axisIndex = 0;

    var axisList = this.axisList;

    this._addBodyHandler = function(e){
        axisList.push(e.body);
    };

    this._removeBodyHandler = function(e){
        var idx = axisList.indexOf(e.body);
        if(idx !== -1){
            axisList.splice(idx,1);
        }
    };

    if(world){
        this.setWorld(world);
    }
}
SAPBroadphase.prototype = new Broadphase();

/**
 * Change the world
 * @method setWorld
 * @param  {World} world
 */
SAPBroadphase.prototype.setWorld = function(world){
    // Clear the old axis array
    this.axisList.length = 0;

    // Add all bodies from the new world
    for(var i=0; i<world.bodies.length; i++){
        this.axisList.push(world.bodies[i]);
    }

    // Remove old handlers, if any
    world.removeEventListener("addBody", this._addBodyHandler);
    world.removeEventListener("removeBody", this._removeBodyHandler);

    // Add handlers to update the list of bodies.
    world.addEventListener("addBody", this._addBodyHandler);
    world.addEventListener("removeBody", this._removeBodyHandler);

    this.world = world;
    this.dirty = true;
};

/**
 * @static
 * @method insertionSortX
 * @param  {Array} a
 * @return {Array}
 */
SAPBroadphase.insertionSortX = function(a) {
    for(var i=1,l=a.length;i<l;i++) {
        var v = a[i];
        for(var j=i - 1;j>=0;j--) {
            if(a[j].aabb.lowerBound.x <= v.aabb.lowerBound.x){
                break;
            }
            a[j+1] = a[j];
        }
        a[j+1] = v;
    }
    return a;
};

/**
 * @static
 * @method insertionSortY
 * @param  {Array} a
 * @return {Array}
 */
SAPBroadphase.insertionSortY = function(a) {
    for(var i=1,l=a.length;i<l;i++) {
        var v = a[i];
        for(var j=i - 1;j>=0;j--) {
            if(a[j].aabb.lowerBound.y <= v.aabb.lowerBound.y){
                break;
            }
            a[j+1] = a[j];
        }
        a[j+1] = v;
    }
    return a;
};

/**
 * @static
 * @method insertionSortZ
 * @param  {Array} a
 * @return {Array}
 */
SAPBroadphase.insertionSortZ = function(a) {
    for(var i=1,l=a.length;i<l;i++) {
        var v = a[i];
        for(var j=i - 1;j>=0;j--) {
            if(a[j].aabb.lowerBound.z <= v.aabb.lowerBound.z){
                break;
            }
            a[j+1] = a[j];
        }
        a[j+1] = v;
    }
    return a;
};

/**
 * Collect all collision pairs
 * @method collisionPairs
 * @param  {World} world
 * @param  {Array} p1
 * @param  {Array} p2
 */
SAPBroadphase.prototype.collisionPairs = function(world,p1,p2){
    var bodies = this.axisList,
        N = bodies.length,
        axisIndex = this.axisIndex,
        i, j;

    if(this.dirty){
        this.sortList();
        this.dirty = false;
    }

    // Look through the list
    for(i=0; i !== N; i++){
        var bi = bodies[i];

        for(j=i+1; j < N; j++){
            var bj = bodies[j];

            if(!this.needBroadphaseCollision(bi,bj)){
                continue;
            }

            if(!SAPBroadphase.checkBounds(bi,bj,axisIndex)){
                break;
            }

            this.intersectionTest(bi,bj,p1,p2);
        }
    }
};

SAPBroadphase.prototype.sortList = function(){
    var axisList = this.axisList;
    var axisIndex = this.axisIndex;
    var N = axisList.length;

    // Update AABBs
    for(var i = 0; i!==N; i++){
        var bi = axisList[i];
        if(bi.aabbNeedsUpdate){
            bi.computeAABB();
        }
    }

    // Sort the list
    if(axisIndex === 0){
        SAPBroadphase.insertionSortX(axisList);
    } else if(axisIndex === 1){
        SAPBroadphase.insertionSortY(axisList);
    } else if(axisIndex === 2){
        SAPBroadphase.insertionSortZ(axisList);
    }
};

/**
 * Check if the bounds of two bodies overlap, along the given SAP axis.
 * @static
 * @method checkBounds
 * @param  {Body} bi
 * @param  {Body} bj
 * @param  {Number} axisIndex
 * @return {Boolean}
 */
SAPBroadphase.checkBounds = function(bi, bj, axisIndex){
    var biPos;
    var bjPos;

    if(axisIndex === 0){
        biPos = bi.position.x;
        bjPos = bj.position.x;
    } else if(axisIndex === 1){
        biPos = bi.position.y;
        bjPos = bj.position.y;
    } else if(axisIndex === 2){
        biPos = bi.position.z;
        bjPos = bj.position.z;
    }

    var ri = bi.boundingRadius,
        rj = bj.boundingRadius,
        boundA1 = biPos - ri,
        boundA2 = biPos + ri,
        boundB1 = bjPos - rj,
        boundB2 = bjPos + rj;

    return boundB1 < boundA2;
};

/**
 * Computes the variance of the body positions and estimates the best
 * axis to use. Will automatically set property .axisIndex.
 * @method autoDetectAxis
 */
SAPBroadphase.prototype.autoDetectAxis = function(){
    var sumX=0,
        sumX2=0,
        sumY=0,
        sumY2=0,
        sumZ=0,
        sumZ2=0,
        bodies = this.axisList,
        N = bodies.length,
        invN=1/N;

    for(var i=0; i!==N; i++){
        var b = bodies[i];

        var centerX = b.position.x;
        sumX += centerX;
        sumX2 += centerX*centerX;

        var centerY = b.position.y;
        sumY += centerY;
        sumY2 += centerY*centerY;

        var centerZ = b.position.z;
        sumZ += centerZ;
        sumZ2 += centerZ*centerZ;
    }

    var varianceX = sumX2 - sumX*sumX*invN,
        varianceY = sumY2 - sumY*sumY*invN,
        varianceZ = sumZ2 - sumZ*sumZ*invN;

    if(varianceX > varianceY){
        if(varianceX > varianceZ){
            this.axisIndex = 0;
        } else{
            this.axisIndex = 2;
        }
    } else if(varianceY > varianceZ){
        this.axisIndex = 1;
    } else{
        this.axisIndex = 2;
    }
};

/**
 * Returns all the bodies within an AABB.
 * @method aabbQuery
 * @param  {World} world
 * @param  {AABB} aabb
 * @param {array} result An array to store resulting bodies in.
 * @return {array}
 */
SAPBroadphase.prototype.aabbQuery = function(world, aabb, result){
    result = result || [];

    if(this.dirty){
        this.sortList();
        this.dirty = false;
    }

    var axisIndex = this.axisIndex, axis = 'x';
    if(axisIndex === 1){ axis = 'y'; }
    if(axisIndex === 2){ axis = 'z'; }

    var axisList = this.axisList;
    var lower = aabb.lowerBound[axis];
    var upper = aabb.upperBound[axis];
    for(var i = 0; i < axisList.length; i++){
        var b = axisList[i];

        if(b.aabbNeedsUpdate){
            b.computeAABB();
        }

        if(b.aabb.overlaps(aabb)){
            result.push(b);
        }
    }

    return result;
};
},{"../collision/Broadphase":5,"../shapes/Shape":43}],12:[function(_dereq_,module,exports){
module.exports = ConeTwistConstraint;

var Constraint = _dereq_('./Constraint');
var PointToPointConstraint = _dereq_('./PointToPointConstraint');
var ConeEquation = _dereq_('../equations/ConeEquation');
var RotationalEquation = _dereq_('../equations/RotationalEquation');
var ContactEquation = _dereq_('../equations/ContactEquation');
var Vec3 = _dereq_('../math/Vec3');

/**
 * @class ConeTwistConstraint
 * @constructor
 * @author schteppe
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @param {object} [options]
 * @param {Vec3} [options.pivotA]
 * @param {Vec3} [options.pivotB]
 * @param {Vec3} [options.axisA]
 * @param {Vec3} [options.axisB]
 * @param {Number} [options.maxForce=1e6]
 * @extends PointToPointConstraint
 */
function ConeTwistConstraint(bodyA, bodyB, options){
    options = options || {};
    var maxForce = typeof(options.maxForce) !== 'undefined' ? options.maxForce : 1e6;

    // Set pivot point in between
    var pivotA = options.pivotA ? options.pivotA.clone() : new Vec3();
    var pivotB = options.pivotB ? options.pivotB.clone() : new Vec3();
    this.axisA = options.axisA ? options.axisA.clone() : new Vec3();
    this.axisB = options.axisB ? options.axisB.clone() : new Vec3();

    PointToPointConstraint.call(this, bodyA, pivotA, bodyB, pivotB, maxForce);

    this.collideConnected = !!options.collideConnected;

    this.angle = typeof(options.angle) !== 'undefined' ? options.angle : 0;

    /**
     * @property {ConeEquation} coneEquation
     */
    var c = this.coneEquation = new ConeEquation(bodyA,bodyB,options);

    /**
     * @property {RotationalEquation} twistEquation
     */
    var t = this.twistEquation = new RotationalEquation(bodyA,bodyB,options);
    this.twistAngle = typeof(options.twistAngle) !== 'undefined' ? options.twistAngle : 0;

    // Make the cone equation push the bodies toward the cone axis, not outward
    c.maxForce = 0;
    c.minForce = -maxForce;

    // Make the twist equation add torque toward the initial position
    t.maxForce = 0;
    t.minForce = -maxForce;

    this.equations.push(c, t);
}
ConeTwistConstraint.prototype = new PointToPointConstraint();
ConeTwistConstraint.constructor = ConeTwistConstraint;

var ConeTwistConstraint_update_tmpVec1 = new Vec3();
var ConeTwistConstraint_update_tmpVec2 = new Vec3();

ConeTwistConstraint.prototype.update = function(){
    var bodyA = this.bodyA,
        bodyB = this.bodyB,
        cone = this.coneEquation,
        twist = this.twistEquation;

    PointToPointConstraint.prototype.update.call(this);

    // Update the axes to the cone constraint
    bodyA.vectorToWorldFrame(this.axisA, cone.axisA);
    bodyB.vectorToWorldFrame(this.axisB, cone.axisB);

    // Update the world axes in the twist constraint
    this.axisA.tangents(twist.axisA, twist.axisA);
    bodyA.vectorToWorldFrame(twist.axisA, twist.axisA);

    this.axisB.tangents(twist.axisB, twist.axisB);
    bodyB.vectorToWorldFrame(twist.axisB, twist.axisB);

    cone.angle = this.angle;
    twist.maxAngle = this.twistAngle;
};


},{"../equations/ConeEquation":18,"../equations/ContactEquation":19,"../equations/RotationalEquation":22,"../math/Vec3":30,"./Constraint":13,"./PointToPointConstraint":17}],13:[function(_dereq_,module,exports){
module.exports = Constraint;

var Utils = _dereq_('../utils/Utils');

/**
 * Constraint base class
 * @class Constraint
 * @author schteppe
 * @constructor
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @param {object} [options]
 * @param {boolean} [options.collideConnected=true]
 * @param {boolean} [options.wakeUpBodies=true]
 */
function Constraint(bodyA, bodyB, options){
    options = Utils.defaults(options,{
        collideConnected : true,
        wakeUpBodies : true,
    });

    /**
     * Equations to be solved in this constraint
     * @property equations
     * @type {Array}
     */
    this.equations = [];

    /**
     * @property {Body} bodyA
     */
    this.bodyA = bodyA;

    /**
     * @property {Body} bodyB
     */
    this.bodyB = bodyB;

    /**
     * @property {Number} id
     */
    this.id = Constraint.idCounter++;

    /**
     * Set to true if you want the bodies to collide when they are connected.
     * @property collideConnected
     * @type {boolean}
     */
    this.collideConnected = options.collideConnected;

    if(options.wakeUpBodies){
        if(bodyA){
            bodyA.wakeUp();
        }
        if(bodyB){
            bodyB.wakeUp();
        }
    }
}

/**
 * Update all the equations with data.
 * @method update
 */
Constraint.prototype.update = function(){
    throw new Error("method update() not implmemented in this Constraint subclass!");
};

/**
 * Enables all equations in the constraint.
 * @method enable
 */
Constraint.prototype.enable = function(){
    var eqs = this.equations;
    for(var i=0; i<eqs.length; i++){
        eqs[i].enabled = true;
    }
};

/**
 * Disables all equations in the constraint.
 * @method disable
 */
Constraint.prototype.disable = function(){
    var eqs = this.equations;
    for(var i=0; i<eqs.length; i++){
        eqs[i].enabled = false;
    }
};

Constraint.idCounter = 0;

},{"../utils/Utils":53}],14:[function(_dereq_,module,exports){
module.exports = DistanceConstraint;

var Constraint = _dereq_('./Constraint');
var ContactEquation = _dereq_('../equations/ContactEquation');

/**
 * Constrains two bodies to be at a constant distance from each others center of mass.
 * @class DistanceConstraint
 * @constructor
 * @author schteppe
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @param {Number} [distance] The distance to keep. If undefined, it will be set to the current distance between bodyA and bodyB
 * @param {Number} [maxForce=1e6]
 * @extends Constraint
 */
function DistanceConstraint(bodyA,bodyB,distance,maxForce){
    Constraint.call(this,bodyA,bodyB);

    if(typeof(distance)==="undefined") {
        distance = bodyA.position.distanceTo(bodyB.position);
    }

    if(typeof(maxForce)==="undefined") {
        maxForce = 1e6;
    }

    /**
     * @property {number} distance
     */
    this.distance = distance;

    /**
     * @property {ContactEquation} distanceEquation
     */
    var eq = this.distanceEquation = new ContactEquation(bodyA, bodyB);
    this.equations.push(eq);

    // Make it bidirectional
    eq.minForce = -maxForce;
    eq.maxForce =  maxForce;
}
DistanceConstraint.prototype = new Constraint();

DistanceConstraint.prototype.update = function(){
    var bodyA = this.bodyA;
    var bodyB = this.bodyB;
    var eq = this.distanceEquation;
    var halfDist = this.distance * 0.5;
    var normal = eq.ni;

    bodyB.position.vsub(bodyA.position, normal);
    normal.normalize();
    normal.mult(halfDist, eq.ri);
    normal.mult(-halfDist, eq.rj);
};
},{"../equations/ContactEquation":19,"./Constraint":13}],15:[function(_dereq_,module,exports){
module.exports = HingeConstraint;

var Constraint = _dereq_('./Constraint');
var PointToPointConstraint = _dereq_('./PointToPointConstraint');
var RotationalEquation = _dereq_('../equations/RotationalEquation');
var RotationalMotorEquation = _dereq_('../equations/RotationalMotorEquation');
var ContactEquation = _dereq_('../equations/ContactEquation');
var Vec3 = _dereq_('../math/Vec3');

/**
 * Hinge constraint. Think of it as a door hinge. It tries to keep the door in the correct place and with the correct orientation.
 * @class HingeConstraint
 * @constructor
 * @author schteppe
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @param {object} [options]
 * @param {Vec3} [options.pivotA] A point defined locally in bodyA. This defines the offset of axisA.
 * @param {Vec3} [options.axisA] An axis that bodyA can rotate around, defined locally in bodyA.
 * @param {Vec3} [options.pivotB]
 * @param {Vec3} [options.axisB]
 * @param {Number} [options.maxForce=1e6]
 * @extends PointToPointConstraint
 */
function HingeConstraint(bodyA, bodyB, options){
    options = options || {};
    var maxForce = typeof(options.maxForce) !== 'undefined' ? options.maxForce : 1e6;
    var pivotA = options.pivotA ? options.pivotA.clone() : new Vec3();
    var pivotB = options.pivotB ? options.pivotB.clone() : new Vec3();

    PointToPointConstraint.call(this, bodyA, pivotA, bodyB, pivotB, maxForce);

    /**
     * Rotation axis, defined locally in bodyA.
     * @property {Vec3} axisA
     */
    var axisA = this.axisA = options.axisA ? options.axisA.clone() : new Vec3(1,0,0);
    axisA.normalize();

    /**
     * Rotation axis, defined locally in bodyB.
     * @property {Vec3} axisB
     */
    var axisB = this.axisB = options.axisB ? options.axisB.clone() : new Vec3(1,0,0);
    axisB.normalize();

    /**
     * @property {RotationalEquation} rotationalEquation1
     */
    var r1 = this.rotationalEquation1 = new RotationalEquation(bodyA,bodyB,options);

    /**
     * @property {RotationalEquation} rotationalEquation2
     */
    var r2 = this.rotationalEquation2 = new RotationalEquation(bodyA,bodyB,options);

    /**
     * @property {RotationalMotorEquation} motorEquation
     */
    var motor = this.motorEquation = new RotationalMotorEquation(bodyA,bodyB,maxForce);
    motor.enabled = false; // Not enabled by default

    // Equations to be fed to the solver
    this.equations.push(
        r1, // rotational1
        r2, // rotational2
        motor
    );
}
HingeConstraint.prototype = new PointToPointConstraint();
HingeConstraint.constructor = HingeConstraint;

/**
 * @method enableMotor
 */
HingeConstraint.prototype.enableMotor = function(){
    this.motorEquation.enabled = true;
};

/**
 * @method disableMotor
 */
HingeConstraint.prototype.disableMotor = function(){
    this.motorEquation.enabled = false;
};

/**
 * @method setMotorSpeed
 * @param {number} speed
 */
HingeConstraint.prototype.setMotorSpeed = function(speed){
    this.motorEquation.targetVelocity = speed;
};

/**
 * @method setMotorMaxForce
 * @param {number} maxForce
 */
HingeConstraint.prototype.setMotorMaxForce = function(maxForce){
    this.motorEquation.maxForce = maxForce;
    this.motorEquation.minForce = -maxForce;
};

var HingeConstraint_update_tmpVec1 = new Vec3();
var HingeConstraint_update_tmpVec2 = new Vec3();

HingeConstraint.prototype.update = function(){
    var bodyA = this.bodyA,
        bodyB = this.bodyB,
        motor = this.motorEquation,
        r1 = this.rotationalEquation1,
        r2 = this.rotationalEquation2,
        worldAxisA = HingeConstraint_update_tmpVec1,
        worldAxisB = HingeConstraint_update_tmpVec2;

    var axisA = this.axisA;
    var axisB = this.axisB;

    PointToPointConstraint.prototype.update.call(this);

    // Get world axes
    bodyA.quaternion.vmult(axisA, worldAxisA);
    bodyB.quaternion.vmult(axisB, worldAxisB);

    worldAxisA.tangents(r1.axisA, r2.axisA);
    r1.axisB.copy(worldAxisB);
    r2.axisB.copy(worldAxisB);

    if(this.motorEquation.enabled){
        bodyA.quaternion.vmult(this.axisA, motor.axisA);
        bodyB.quaternion.vmult(this.axisB, motor.axisB);
    }
};


},{"../equations/ContactEquation":19,"../equations/RotationalEquation":22,"../equations/RotationalMotorEquation":23,"../math/Vec3":30,"./Constraint":13,"./PointToPointConstraint":17}],16:[function(_dereq_,module,exports){
module.exports = LockConstraint;

var Constraint = _dereq_('./Constraint');
var PointToPointConstraint = _dereq_('./PointToPointConstraint');
var RotationalEquation = _dereq_('../equations/RotationalEquation');
var RotationalMotorEquation = _dereq_('../equations/RotationalMotorEquation');
var ContactEquation = _dereq_('../equations/ContactEquation');
var Vec3 = _dereq_('../math/Vec3');

/**
 * Lock constraint. Will remove all degrees of freedom between the bodies.
 * @class LockConstraint
 * @constructor
 * @author schteppe
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @param {object} [options]
 * @param {Number} [options.maxForce=1e6]
 * @extends PointToPointConstraint
 */
function LockConstraint(bodyA, bodyB, options){
    options = options || {};
    var maxForce = typeof(options.maxForce) !== 'undefined' ? options.maxForce : 1e6;

    // Set pivot point in between
    var pivotA = new Vec3();
    var pivotB = new Vec3();
    var halfWay = new Vec3();
    bodyA.position.vadd(bodyB.position, halfWay);
    halfWay.scale(0.5, halfWay);
    bodyB.pointToLocalFrame(halfWay, pivotB);
    bodyA.pointToLocalFrame(halfWay, pivotA);
    PointToPointConstraint.call(this, bodyA, pivotA, bodyB, pivotB, maxForce);

    /**
     * @property {RotationalEquation} rotationalEquation1
     */
    var r1 = this.rotationalEquation1 = new RotationalEquation(bodyA,bodyB,options);

    /**
     * @property {RotationalEquation} rotationalEquation2
     */
    var r2 = this.rotationalEquation2 = new RotationalEquation(bodyA,bodyB,options);

    /**
     * @property {RotationalEquation} rotationalEquation3
     */
    var r3 = this.rotationalEquation3 = new RotationalEquation(bodyA,bodyB,options);

    this.equations.push(r1, r2, r3);
}
LockConstraint.prototype = new PointToPointConstraint();
LockConstraint.constructor = LockConstraint;

var LockConstraint_update_tmpVec1 = new Vec3();
var LockConstraint_update_tmpVec2 = new Vec3();

LockConstraint.prototype.update = function(){
    var bodyA = this.bodyA,
        bodyB = this.bodyB,
        motor = this.motorEquation,
        r1 = this.rotationalEquation1,
        r2 = this.rotationalEquation2,
        r3 = this.rotationalEquation3,
        worldAxisA = LockConstraint_update_tmpVec1,
        worldAxisB = LockConstraint_update_tmpVec2;

    PointToPointConstraint.prototype.update.call(this);

    bodyA.vectorToWorldFrame(Vec3.UNIT_X, r1.axisA);
    bodyB.vectorToWorldFrame(Vec3.UNIT_Y, r1.axisB);

    bodyA.vectorToWorldFrame(Vec3.UNIT_Y, r2.axisA);
    bodyB.vectorToWorldFrame(Vec3.UNIT_Z, r2.axisB);

    bodyA.vectorToWorldFrame(Vec3.UNIT_Z, r3.axisA);
    bodyB.vectorToWorldFrame(Vec3.UNIT_X, r3.axisB);
};


},{"../equations/ContactEquation":19,"../equations/RotationalEquation":22,"../equations/RotationalMotorEquation":23,"../math/Vec3":30,"./Constraint":13,"./PointToPointConstraint":17}],17:[function(_dereq_,module,exports){
module.exports = PointToPointConstraint;

var Constraint = _dereq_('./Constraint');
var ContactEquation = _dereq_('../equations/ContactEquation');
var Vec3 = _dereq_('../math/Vec3');

/**
 * Connects two bodies at given offset points.
 * @class PointToPointConstraint
 * @extends Constraint
 * @constructor
 * @param {Body} bodyA
 * @param {Vec3} pivotA The point relative to the center of mass of bodyA which bodyA is constrained to.
 * @param {Body} bodyB Body that will be constrained in a similar way to the same point as bodyA. We will therefore get a link between bodyA and bodyB. If not specified, bodyA will be constrained to a static point.
 * @param {Vec3} pivotB See pivotA.
 * @param {Number} maxForce The maximum force that should be applied to constrain the bodies.
 *
 * @example
 *     var bodyA = new Body({ mass: 1 });
 *     var bodyB = new Body({ mass: 1 });
 *     bodyA.position.set(-1, 0, 0);
 *     bodyB.position.set(1, 0, 0);
 *     bodyA.addShape(shapeA);
 *     bodyB.addShape(shapeB);
 *     world.addBody(bodyA);
 *     world.addBody(bodyB);
 *     var localPivotA = new Vec3(1, 0, 0);
 *     var localPivotB = new Vec3(-1, 0, 0);
 *     var constraint = new PointToPointConstraint(bodyA, localPivotA, bodyB, localPivotB);
 *     world.addConstraint(constraint);
 */
function PointToPointConstraint(bodyA,pivotA,bodyB,pivotB,maxForce){
    Constraint.call(this,bodyA,bodyB);

    maxForce = typeof(maxForce) !== 'undefined' ? maxForce : 1e6;

    /**
     * Pivot, defined locally in bodyA.
     * @property {Vec3} pivotA
     */
    this.pivotA = pivotA ? pivotA.clone() : new Vec3();

    /**
     * Pivot, defined locally in bodyB.
     * @property {Vec3} pivotB
     */
    this.pivotB = pivotB ? pivotB.clone() : new Vec3();

    /**
     * @property {ContactEquation} equationX
     */
    var x = this.equationX = new ContactEquation(bodyA,bodyB);

    /**
     * @property {ContactEquation} equationY
     */
    var y = this.equationY = new ContactEquation(bodyA,bodyB);

    /**
     * @property {ContactEquation} equationZ
     */
    var z = this.equationZ = new ContactEquation(bodyA,bodyB);

    // Equations to be fed to the solver
    this.equations.push(x, y, z);

    // Make the equations bidirectional
    x.minForce = y.minForce = z.minForce = -maxForce;
    x.maxForce = y.maxForce = z.maxForce =  maxForce;

    x.ni.set(1, 0, 0);
    y.ni.set(0, 1, 0);
    z.ni.set(0, 0, 1);
}
PointToPointConstraint.prototype = new Constraint();

PointToPointConstraint.prototype.update = function(){
    var bodyA = this.bodyA;
    var bodyB = this.bodyB;
    var x = this.equationX;
    var y = this.equationY;
    var z = this.equationZ;

    // Rotate the pivots to world space
    bodyA.quaternion.vmult(this.pivotA,x.ri);
    bodyB.quaternion.vmult(this.pivotB,x.rj);

    y.ri.copy(x.ri);
    y.rj.copy(x.rj);
    z.ri.copy(x.ri);
    z.rj.copy(x.rj);
};
},{"../equations/ContactEquation":19,"../math/Vec3":30,"./Constraint":13}],18:[function(_dereq_,module,exports){
module.exports = ConeEquation;

var Vec3 = _dereq_('../math/Vec3');
var Mat3 = _dereq_('../math/Mat3');
var Equation = _dereq_('./Equation');

/**
 * Cone equation. Works to keep the given body world vectors aligned, or tilted within a given angle from each other.
 * @class ConeEquation
 * @constructor
 * @author schteppe
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @param {Vec3} [options.axisA] Local axis in A
 * @param {Vec3} [options.axisB] Local axis in B
 * @param {Vec3} [options.angle] The "cone angle" to keep
 * @param {number} [options.maxForce=1e6]
 * @extends Equation
 */
function ConeEquation(bodyA, bodyB, options){
    options = options || {};
    var maxForce = typeof(options.maxForce) !== 'undefined' ? options.maxForce : 1e6;

    Equation.call(this,bodyA,bodyB,-maxForce, maxForce);

    this.axisA = options.axisA ? options.axisA.clone() : new Vec3(1, 0, 0);
    this.axisB = options.axisB ? options.axisB.clone() : new Vec3(0, 1, 0);

    /**
     * The cone angle to keep
     * @property {number} angle
     */
    this.angle = typeof(options.angle) !== 'undefined' ? options.angle : 0;
}

ConeEquation.prototype = new Equation();
ConeEquation.prototype.constructor = ConeEquation;

var tmpVec1 = new Vec3();
var tmpVec2 = new Vec3();

ConeEquation.prototype.computeB = function(h){
    var a = this.a,
        b = this.b,

        ni = this.axisA,
        nj = this.axisB,

        nixnj = tmpVec1,
        njxni = tmpVec2,

        GA = this.jacobianElementA,
        GB = this.jacobianElementB;

    // Caluclate cross products
    ni.cross(nj, nixnj);
    nj.cross(ni, njxni);

    // The angle between two vector is:
    // cos(theta) = a * b / (length(a) * length(b) = { len(a) = len(b) = 1 } = a * b

    // g = a * b
    // gdot = (b x a) * wi + (a x b) * wj
    // G = [0 bxa 0 axb]
    // W = [vi wi vj wj]
    GA.rotational.copy(njxni);
    GB.rotational.copy(nixnj);

    var g = Math.cos(this.angle) - ni.dot(nj),
        GW = this.computeGW(),
        GiMf = this.computeGiMf();

    var B = - g * a - GW * b - h * GiMf;

    return B;
};


},{"../math/Mat3":27,"../math/Vec3":30,"./Equation":20}],19:[function(_dereq_,module,exports){
module.exports = ContactEquation;

var Equation = _dereq_('./Equation');
var Vec3 = _dereq_('../math/Vec3');
var Mat3 = _dereq_('../math/Mat3');

/**
 * Contact/non-penetration constraint equation
 * @class ContactEquation
 * @constructor
 * @author schteppe
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @extends Equation
 */
function ContactEquation(bodyA, bodyB, maxForce){
    maxForce = typeof(maxForce) !== 'undefined' ? maxForce : 1e6;
    Equation.call(this, bodyA, bodyB, 0, maxForce);

    /**
     * @property restitution
     * @type {Number}
     */
    this.restitution = 0.0; // "bounciness": u1 = -e*u0

    /**
     * World-oriented vector that goes from the center of bi to the contact point.
     * @property {Vec3} ri
     */
    this.ri = new Vec3();

    /**
     * World-oriented vector that starts in body j position and goes to the contact point.
     * @property {Vec3} rj
     */
    this.rj = new Vec3();

    /**
     * Contact normal, pointing out of body i.
     * @property {Vec3} ni
     */
    this.ni = new Vec3();
}

ContactEquation.prototype = new Equation();
ContactEquation.prototype.constructor = ContactEquation;

var ContactEquation_computeB_temp1 = new Vec3(); // Temp vectors
var ContactEquation_computeB_temp2 = new Vec3();
var ContactEquation_computeB_temp3 = new Vec3();
ContactEquation.prototype.computeB = function(h){
    var a = this.a,
        b = this.b,
        bi = this.bi,
        bj = this.bj,
        ri = this.ri,
        rj = this.rj,
        rixn = ContactEquation_computeB_temp1,
        rjxn = ContactEquation_computeB_temp2,

        vi = bi.velocity,
        wi = bi.angularVelocity,
        fi = bi.force,
        taui = bi.torque,

        vj = bj.velocity,
        wj = bj.angularVelocity,
        fj = bj.force,
        tauj = bj.torque,

        penetrationVec = ContactEquation_computeB_temp3,

        GA = this.jacobianElementA,
        GB = this.jacobianElementB,

        n = this.ni;

    // Caluclate cross products
    ri.cross(n,rixn);
    rj.cross(n,rjxn);

    // g = xj+rj -(xi+ri)
    // G = [ -ni  -rixn  ni  rjxn ]
    n.negate(GA.spatial);
    rixn.negate(GA.rotational);
    GB.spatial.copy(n);
    GB.rotational.copy(rjxn);

    // Calculate the penetration vector
    penetrationVec.copy(bj.position);
    penetrationVec.vadd(rj,penetrationVec);
    penetrationVec.vsub(bi.position,penetrationVec);
    penetrationVec.vsub(ri,penetrationVec);

    var g = n.dot(penetrationVec);

    // Compute iteration
    var ePlusOne = this.restitution + 1;
    var GW = ePlusOne * vj.dot(n) - ePlusOne * vi.dot(n) + wj.dot(rjxn) - wi.dot(rixn);
    var GiMf = this.computeGiMf();

    var B = - g * a - GW * b - h*GiMf;

    return B;
};

var ContactEquation_getImpactVelocityAlongNormal_vi = new Vec3();
var ContactEquation_getImpactVelocityAlongNormal_vj = new Vec3();
var ContactEquation_getImpactVelocityAlongNormal_xi = new Vec3();
var ContactEquation_getImpactVelocityAlongNormal_xj = new Vec3();
var ContactEquation_getImpactVelocityAlongNormal_relVel = new Vec3();

/**
 * Get the current relative velocity in the contact point.
 * @method getImpactVelocityAlongNormal
 * @return {number}
 */
ContactEquation.prototype.getImpactVelocityAlongNormal = function(){
    var vi = ContactEquation_getImpactVelocityAlongNormal_vi;
    var vj = ContactEquation_getImpactVelocityAlongNormal_vj;
    var xi = ContactEquation_getImpactVelocityAlongNormal_xi;
    var xj = ContactEquation_getImpactVelocityAlongNormal_xj;
    var relVel = ContactEquation_getImpactVelocityAlongNormal_relVel;

    this.bi.position.vadd(this.ri, xi);
    this.bj.position.vadd(this.rj, xj);

    this.bi.getVelocityAtWorldPoint(xi, vi);
    this.bj.getVelocityAtWorldPoint(xj, vj);

    vi.vsub(vj, relVel);

    return this.ni.dot(relVel);
};


},{"../math/Mat3":27,"../math/Vec3":30,"./Equation":20}],20:[function(_dereq_,module,exports){
module.exports = Equation;

var JacobianElement = _dereq_('../math/JacobianElement'),
    Vec3 = _dereq_('../math/Vec3');

/**
 * Equation base class
 * @class Equation
 * @constructor
 * @author schteppe
 * @param {Body} bi
 * @param {Body} bj
 * @param {Number} minForce Minimum (read: negative max) force to be applied by the constraint.
 * @param {Number} maxForce Maximum (read: positive max) force to be applied by the constraint.
 */
function Equation(bi,bj,minForce,maxForce){
    this.id = Equation.id++;

    /**
     * @property {number} minForce
     */
    this.minForce = typeof(minForce)==="undefined" ? -1e6 : minForce;

    /**
     * @property {number} maxForce
     */
    this.maxForce = typeof(maxForce)==="undefined" ? 1e6 : maxForce;

    /**
     * @property bi
     * @type {Body}
     */
    this.bi = bi;

    /**
     * @property bj
     * @type {Body}
     */
    this.bj = bj;

    /**
     * SPOOK parameter
     * @property {number} a
     */
    this.a = 0.0;

    /**
     * SPOOK parameter
     * @property {number} b
     */
    this.b = 0.0;

    /**
     * SPOOK parameter
     * @property {number} eps
     */
    this.eps = 0.0;

    /**
     * @property {JacobianElement} jacobianElementA
     */
    this.jacobianElementA = new JacobianElement();

    /**
     * @property {JacobianElement} jacobianElementB
     */
    this.jacobianElementB = new JacobianElement();

    /**
     * @property {boolean} enabled
     * @default true
     */
    this.enabled = true;

    // Set typical spook params
    this.setSpookParams(1e7,4,1/60);
}
Equation.prototype.constructor = Equation;

Equation.id = 0;

/**
 * Recalculates a,b,eps.
 * @method setSpookParams
 */
Equation.prototype.setSpookParams = function(stiffness,relaxation,timeStep){
    var d = relaxation,
        k = stiffness,
        h = timeStep;
    this.a = 4.0 / (h * (1 + 4 * d));
    this.b = (4.0 * d) / (1 + 4 * d);
    this.eps = 4.0 / (h * h * k * (1 + 4 * d));
};

/**
 * Computes the RHS of the SPOOK equation
 * @method computeB
 * @return {Number}
 */
Equation.prototype.computeB = function(a,b,h){
    var GW = this.computeGW(),
        Gq = this.computeGq(),
        GiMf = this.computeGiMf();
    return - Gq * a - GW * b - GiMf*h;
};

/**
 * Computes G*q, where q are the generalized body coordinates
 * @method computeGq
 * @return {Number}
 */
Equation.prototype.computeGq = function(){
    var GA = this.jacobianElementA,
        GB = this.jacobianElementB,
        bi = this.bi,
        bj = this.bj,
        xi = bi.position,
        xj = bj.position;
    return GA.spatial.dot(xi) + GB.spatial.dot(xj);
};

var zero = new Vec3();

/**
 * Computes G*W, where W are the body velocities
 * @method computeGW
 * @return {Number}
 */
Equation.prototype.computeGW = function(){
    var GA = this.jacobianElementA,
        GB = this.jacobianElementB,
        bi = this.bi,
        bj = this.bj,
        vi = bi.velocity,
        vj = bj.velocity,
        wi = bi.angularVelocity || zero,
        wj = bj.angularVelocity || zero;
    return GA.multiplyVectors(vi,wi) + GB.multiplyVectors(vj,wj);
};


/**
 * Computes G*Wlambda, where W are the body velocities
 * @method computeGWlambda
 * @return {Number}
 */
Equation.prototype.computeGWlambda = function(){
    var GA = this.jacobianElementA,
        GB = this.jacobianElementB,
        bi = this.bi,
        bj = this.bj,
        vi = bi.vlambda,
        vj = bj.vlambda,
        wi = bi.wlambda || zero,
        wj = bj.wlambda || zero;
    return GA.multiplyVectors(vi,wi) + GB.multiplyVectors(vj,wj);
};

/**
 * Computes G*inv(M)*f, where M is the mass matrix with diagonal blocks for each body, and f are the forces on the bodies.
 * @method computeGiMf
 * @return {Number}
 */
var iMfi = new Vec3(),
    iMfj = new Vec3(),
    invIi_vmult_taui = new Vec3(),
    invIj_vmult_tauj = new Vec3();
Equation.prototype.computeGiMf = function(){
    var GA = this.jacobianElementA,
        GB = this.jacobianElementB,
        bi = this.bi,
        bj = this.bj,
        fi = bi.force,
        ti = bi.torque,
        fj = bj.force,
        tj = bj.torque,
        invMassi = bi.invMassSolve,
        invMassj = bj.invMassSolve;

    if(bi.invInertiaWorldSolve){ bi.invInertiaWorldSolve.vmult(ti,invIi_vmult_taui); }
    else { invIi_vmult_taui.set(0,0,0); }
    if(bj.invInertiaWorldSolve){ bj.invInertiaWorldSolve.vmult(tj,invIj_vmult_tauj); }
    else { invIj_vmult_tauj.set(0,0,0); }

    fi.mult(invMassi,iMfi);
    fj.mult(invMassj,iMfj);

    return GA.multiplyVectors(iMfi,invIi_vmult_taui) + GB.multiplyVectors(iMfj,invIj_vmult_tauj);
};

/**
 * Computes G*inv(M)*G'
 * @method computeGiMGt
 * @return {Number}
 */
var tmp = new Vec3();
Equation.prototype.computeGiMGt = function(){
    var GA = this.jacobianElementA,
        GB = this.jacobianElementB,
        bi = this.bi,
        bj = this.bj,
        invMassi = bi.invMassSolve,
        invMassj = bj.invMassSolve,
        invIi = bi.invInertiaWorldSolve,
        invIj = bj.invInertiaWorldSolve,
        result = invMassi + invMassj;

    if(invIi){
        invIi.vmult(GA.rotational,tmp);
        result += tmp.dot(GA.rotational);
    }

    if(invIj){
        invIj.vmult(GB.rotational,tmp);
        result += tmp.dot(GB.rotational);
    }

    return  result;
};

var addToWlambda_temp = new Vec3(),
    addToWlambda_Gi = new Vec3(),
    addToWlambda_Gj = new Vec3(),
    addToWlambda_ri = new Vec3(),
    addToWlambda_rj = new Vec3(),
    addToWlambda_Mdiag = new Vec3();

/**
 * Add constraint velocity to the bodies.
 * @method addToWlambda
 * @param {Number} deltalambda
 */
Equation.prototype.addToWlambda = function(deltalambda){
    var GA = this.jacobianElementA,
        GB = this.jacobianElementB,
        bi = this.bi,
        bj = this.bj,
        temp = addToWlambda_temp;

    // Add to linear velocity
    // v_lambda += inv(M) * delta_lamba * G
    GA.spatial.mult(bi.invMassSolve * deltalambda,temp);
    bi.vlambda.vadd(temp, bi.vlambda);

    GB.spatial.mult(bj.invMassSolve * deltalambda,temp);
    bj.vlambda.vadd(temp, bj.vlambda);

    // Add to angular velocity
    if(bi.invInertiaWorldSolve){
        bi.invInertiaWorldSolve.vmult(GA.rotational,temp);
        temp.mult(deltalambda,temp);
        bi.wlambda.vadd(temp,bi.wlambda);
    }

    if(bj.invInertiaWorldSolve){
        bj.invInertiaWorldSolve.vmult(GB.rotational,temp);
        temp.mult(deltalambda,temp);
        bj.wlambda.vadd(temp,bj.wlambda);
    }
};

/**
 * Compute the denominator part of the SPOOK equation: C = G*inv(M)*G' + eps
 * @method computeInvC
 * @param  {Number} eps
 * @return {Number}
 */
Equation.prototype.computeC = function(){
    return this.computeGiMGt() + this.eps;
};

},{"../math/JacobianElement":26,"../math/Vec3":30}],21:[function(_dereq_,module,exports){
module.exports = FrictionEquation;

var Equation = _dereq_('./Equation');
var Vec3 = _dereq_('../math/Vec3');
var Mat3 = _dereq_('../math/Mat3');

/**
 * Constrains the slipping in a contact along a tangent
 * @class FrictionEquation
 * @constructor
 * @author schteppe
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @param {Number} slipForce should be +-F_friction = +-mu * F_normal = +-mu * m * g
 * @extends Equation
 */
function FrictionEquation(bodyA, bodyB, slipForce){
    Equation.call(this,bodyA, bodyB, -slipForce, slipForce);
    this.ri = new Vec3();
    this.rj = new Vec3();
    this.t = new Vec3(); // tangent
}

FrictionEquation.prototype = new Equation();
FrictionEquation.prototype.constructor = FrictionEquation;

var FrictionEquation_computeB_temp1 = new Vec3();
var FrictionEquation_computeB_temp2 = new Vec3();
FrictionEquation.prototype.computeB = function(h){
    var a = this.a,
        b = this.b,
        bi = this.bi,
        bj = this.bj,
        ri = this.ri,
        rj = this.rj,
        rixt = FrictionEquation_computeB_temp1,
        rjxt = FrictionEquation_computeB_temp2,
        t = this.t;

    // Caluclate cross products
    ri.cross(t,rixt);
    rj.cross(t,rjxt);

    // G = [-t -rixt t rjxt]
    // And remember, this is a pure velocity constraint, g is always zero!
    var GA = this.jacobianElementA,
        GB = this.jacobianElementB;
    t.negate(GA.spatial);
    rixt.negate(GA.rotational);
    GB.spatial.copy(t);
    GB.rotational.copy(rjxt);

    var GW = this.computeGW();
    var GiMf = this.computeGiMf();

    var B = - GW * b - h * GiMf;

    return B;
};

},{"../math/Mat3":27,"../math/Vec3":30,"./Equation":20}],22:[function(_dereq_,module,exports){
module.exports = RotationalEquation;

var Vec3 = _dereq_('../math/Vec3');
var Mat3 = _dereq_('../math/Mat3');
var Equation = _dereq_('./Equation');

/**
 * Rotational constraint. Works to keep the local vectors orthogonal to each other in world space.
 * @class RotationalEquation
 * @constructor
 * @author schteppe
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @param {Vec3} [options.axisA]
 * @param {Vec3} [options.axisB]
 * @param {number} [options.maxForce]
 * @extends Equation
 */
function RotationalEquation(bodyA, bodyB, options){
    options = options || {};
    var maxForce = typeof(options.maxForce) !== 'undefined' ? options.maxForce : 1e6;

    Equation.call(this,bodyA,bodyB,-maxForce, maxForce);

    this.axisA = options.axisA ? options.axisA.clone() : new Vec3(1, 0, 0);
    this.axisB = options.axisB ? options.axisB.clone() : new Vec3(0, 1, 0);

    this.maxAngle = Math.PI / 2;
}

RotationalEquation.prototype = new Equation();
RotationalEquation.prototype.constructor = RotationalEquation;

var tmpVec1 = new Vec3();
var tmpVec2 = new Vec3();

RotationalEquation.prototype.computeB = function(h){
    var a = this.a,
        b = this.b,

        ni = this.axisA,
        nj = this.axisB,

        nixnj = tmpVec1,
        njxni = tmpVec2,

        GA = this.jacobianElementA,
        GB = this.jacobianElementB;

    // Caluclate cross products
    ni.cross(nj, nixnj);
    nj.cross(ni, njxni);

    // g = ni * nj
    // gdot = (nj x ni) * wi + (ni x nj) * wj
    // G = [0 njxni 0 nixnj]
    // W = [vi wi vj wj]
    GA.rotational.copy(njxni);
    GB.rotational.copy(nixnj);

    var g = Math.cos(this.maxAngle) - ni.dot(nj),
        GW = this.computeGW(),
        GiMf = this.computeGiMf();

    var B = - g * a - GW * b - h * GiMf;

    return B;
};


},{"../math/Mat3":27,"../math/Vec3":30,"./Equation":20}],23:[function(_dereq_,module,exports){
module.exports = RotationalMotorEquation;

var Vec3 = _dereq_('../math/Vec3');
var Mat3 = _dereq_('../math/Mat3');
var Equation = _dereq_('./Equation');

/**
 * Rotational motor constraint. Tries to keep the relative angular velocity of the bodies to a given value.
 * @class RotationalMotorEquation
 * @constructor
 * @author schteppe
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @param {Number} maxForce
 * @extends Equation
 */
function RotationalMotorEquation(bodyA, bodyB, maxForce){
    maxForce = typeof(maxForce)!=='undefined' ? maxForce : 1e6;
    Equation.call(this,bodyA,bodyB,-maxForce,maxForce);

    /**
     * World oriented rotational axis
     * @property {Vec3} axisA
     */
    this.axisA = new Vec3();

    /**
     * World oriented rotational axis
     * @property {Vec3} axisB
     */
    this.axisB = new Vec3(); // World oriented rotational axis

    /**
     * Motor velocity
     * @property {Number} targetVelocity
     */
    this.targetVelocity = 0;
}

RotationalMotorEquation.prototype = new Equation();
RotationalMotorEquation.prototype.constructor = RotationalMotorEquation;

RotationalMotorEquation.prototype.computeB = function(h){
    var a = this.a,
        b = this.b,
        bi = this.bi,
        bj = this.bj,

        axisA = this.axisA,
        axisB = this.axisB,

        GA = this.jacobianElementA,
        GB = this.jacobianElementB;

    // g = 0
    // gdot = axisA * wi - axisB * wj
    // gdot = G * W = G * [vi wi vj wj]
    // =>
    // G = [0 axisA 0 -axisB]

    GA.rotational.copy(axisA);
    axisB.negate(GB.rotational);

    var GW = this.computeGW() - this.targetVelocity,
        GiMf = this.computeGiMf();

    var B = - GW * b - h * GiMf;

    return B;
};

},{"../math/Mat3":27,"../math/Vec3":30,"./Equation":20}],24:[function(_dereq_,module,exports){
var Utils = _dereq_('../utils/Utils');

module.exports = ContactMaterial;

/**
 * Defines what happens when two materials meet.
 * @class ContactMaterial
 * @constructor
 * @param {Material} m1
 * @param {Material} m2
 * @param {object} [options]
 * @param {Number} [options.friction=0.3]
 * @param {Number} [options.restitution=0.3]
 * @param {number} [options.contactEquationStiffness=1e7]
 * @param {number} [options.contactEquationRelaxation=3]
 * @param {number} [options.frictionEquationStiffness=1e7]
 * @param {Number} [options.frictionEquationRelaxation=3]
 */
function ContactMaterial(m1, m2, options){
    options = Utils.defaults(options, {
        friction: 0.3,
        restitution: 0.3,
        contactEquationStiffness: 1e7,
        contactEquationRelaxation: 3,
        frictionEquationStiffness: 1e7,
        frictionEquationRelaxation: 3
    });

    /**
     * Identifier of this material
     * @property {Number} id
     */
    this.id = ContactMaterial.idCounter++;

    /**
     * Participating materials
     * @property {Array} materials
     * @todo  Should be .materialA and .materialB instead
     */
    this.materials = [m1, m2];

    /**
     * Friction coefficient
     * @property {Number} friction
     */
    this.friction = options.friction;

    /**
     * Restitution coefficient
     * @property {Number} restitution
     */
    this.restitution = options.restitution;

    /**
     * Stiffness of the produced contact equations
     * @property {Number} contactEquationStiffness
     */
    this.contactEquationStiffness = options.contactEquationStiffness;

    /**
     * Relaxation time of the produced contact equations
     * @property {Number} contactEquationRelaxation
     */
    this.contactEquationRelaxation = options.contactEquationRelaxation;

    /**
     * Stiffness of the produced friction equations
     * @property {Number} frictionEquationStiffness
     */
    this.frictionEquationStiffness = options.frictionEquationStiffness;

    /**
     * Relaxation time of the produced friction equations
     * @property {Number} frictionEquationRelaxation
     */
    this.frictionEquationRelaxation = options.frictionEquationRelaxation;
}

ContactMaterial.idCounter = 0;

},{"../utils/Utils":53}],25:[function(_dereq_,module,exports){
module.exports = Material;

/**
 * Defines a physics material.
 * @class Material
 * @constructor
 * @param {object} [options]
 * @author schteppe
 */
function Material(options){
    var name = '';
    options = options || {};

    // Backwards compatibility fix
    if(typeof(options) === 'string'){
        name = options;
        options = {};
    } else if(typeof(options) === 'object') {
        name = '';
    }

    /**
     * @property name
     * @type {String}
     */
    this.name = name;

    /**
     * material id.
     * @property id
     * @type {number}
     */
    this.id = Material.idCounter++;

    /**
     * Friction for this material. If non-negative, it will be used instead of the friction given by ContactMaterials. If there's no matching ContactMaterial, the value from .defaultContactMaterial in the World will be used.
     * @property {number} friction
     */
    this.friction = typeof(options.friction) !== 'undefined' ? options.friction : -1;

    /**
     * Restitution for this material. If non-negative, it will be used instead of the restitution given by ContactMaterials. If there's no matching ContactMaterial, the value from .defaultContactMaterial in the World will be used.
     * @property {number} restitution
     */
    this.restitution = typeof(options.restitution) !== 'undefined' ? options.restitution : -1;
}

Material.idCounter = 0;

},{}],26:[function(_dereq_,module,exports){
module.exports = JacobianElement;

var Vec3 = _dereq_('./Vec3');

/**
 * An element containing 6 entries, 3 spatial and 3 rotational degrees of freedom.
 * @class JacobianElement
 * @constructor
 */
function JacobianElement(){

    /**
     * @property {Vec3} spatial
     */
    this.spatial = new Vec3();

    /**
     * @property {Vec3} rotational
     */
    this.rotational = new Vec3();
}

/**
 * Multiply with other JacobianElement
 * @method multiplyElement
 * @param  {JacobianElement} element
 * @return {Number}
 */
JacobianElement.prototype.multiplyElement = function(element){
    return element.spatial.dot(this.spatial) + element.rotational.dot(this.rotational);
};

/**
 * Multiply with two vectors
 * @method multiplyVectors
 * @param  {Vec3} spatial
 * @param  {Vec3} rotational
 * @return {Number}
 */
JacobianElement.prototype.multiplyVectors = function(spatial,rotational){
    return spatial.dot(this.spatial) + rotational.dot(this.rotational);
};

},{"./Vec3":30}],27:[function(_dereq_,module,exports){
module.exports = Mat3;

var Vec3 = _dereq_('./Vec3');

/**
 * A 3x3 matrix.
 * @class Mat3
 * @constructor
 * @param array elements Array of nine elements. Optional.
 * @author schteppe / http://github.com/schteppe
 */
function Mat3(elements){
    /**
     * A vector of length 9, containing all matrix elements
     * @property {Array} elements
     */
    if(elements){
        this.elements = elements;
    } else {
        this.elements = [0,0,0,0,0,0,0,0,0];
    }
}

/**
 * Sets the matrix to identity
 * @method identity
 * @todo Should perhaps be renamed to setIdentity() to be more clear.
 * @todo Create another function that immediately creates an identity matrix eg. eye()
 */
Mat3.prototype.identity = function(){
    var e = this.elements;
    e[0] = 1;
    e[1] = 0;
    e[2] = 0;

    e[3] = 0;
    e[4] = 1;
    e[5] = 0;

    e[6] = 0;
    e[7] = 0;
    e[8] = 1;
};

/**
 * Set all elements to zero
 * @method setZero
 */
Mat3.prototype.setZero = function(){
    var e = this.elements;
    e[0] = 0;
    e[1] = 0;
    e[2] = 0;
    e[3] = 0;
    e[4] = 0;
    e[5] = 0;
    e[6] = 0;
    e[7] = 0;
    e[8] = 0;
};

/**
 * Sets the matrix diagonal elements from a Vec3
 * @method setTrace
 * @param {Vec3} vec3
 */
Mat3.prototype.setTrace = function(vec3){
    var e = this.elements;
    e[0] = vec3.x;
    e[4] = vec3.y;
    e[8] = vec3.z;
};

/**
 * Gets the matrix diagonal elements
 * @method getTrace
 * @return {Vec3}
 */
Mat3.prototype.getTrace = function(target){
    var target = target || new Vec3();
    var e = this.elements;
    target.x = e[0];
    target.y = e[4];
    target.z = e[8];
};

/**
 * Matrix-Vector multiplication
 * @method vmult
 * @param {Vec3} v The vector to multiply with
 * @param {Vec3} target Optional, target to save the result in.
 */
Mat3.prototype.vmult = function(v,target){
    target = target || new Vec3();

    var e = this.elements,
        x = v.x,
        y = v.y,
        z = v.z;
    target.x = e[0]*x + e[1]*y + e[2]*z;
    target.y = e[3]*x + e[4]*y + e[5]*z;
    target.z = e[6]*x + e[7]*y + e[8]*z;

    return target;
};

/**
 * Matrix-scalar multiplication
 * @method smult
 * @param {Number} s
 */
Mat3.prototype.smult = function(s){
    for(var i=0; i<this.elements.length; i++){
        this.elements[i] *= s;
    }
};

/**
 * Matrix multiplication
 * @method mmult
 * @param {Mat3} m Matrix to multiply with from left side.
 * @return {Mat3} The result.
 */
Mat3.prototype.mmult = function(m,target){
    var r = target || new Mat3();
    for(var i=0; i<3; i++){
        for(var j=0; j<3; j++){
            var sum = 0.0;
            for(var k=0; k<3; k++){
                sum += m.elements[i+k*3] * this.elements[k+j*3];
            }
            r.elements[i+j*3] = sum;
        }
    }
    return r;
};

/**
 * Scale each column of the matrix
 * @method scale
 * @param {Vec3} v
 * @return {Mat3} The result.
 */
Mat3.prototype.scale = function(v,target){
    target = target || new Mat3();
    var e = this.elements,
        t = target.elements;
    for(var i=0; i!==3; i++){
        t[3*i + 0] = v.x * e[3*i + 0];
        t[3*i + 1] = v.y * e[3*i + 1];
        t[3*i + 2] = v.z * e[3*i + 2];
    }
    return target;
};

/**
 * Solve Ax=b
 * @method solve
 * @param {Vec3} b The right hand side
 * @param {Vec3} target Optional. Target vector to save in.
 * @return {Vec3} The solution x
 * @todo should reuse arrays
 */
Mat3.prototype.solve = function(b,target){
    target = target || new Vec3();

    // Construct equations
    var nr = 3; // num rows
    var nc = 4; // num cols
    var eqns = [];
    for(var i=0; i<nr*nc; i++){
        eqns.push(0);
    }
    var i,j;
    for(i=0; i<3; i++){
        for(j=0; j<3; j++){
            eqns[i+nc*j] = this.elements[i+3*j];
        }
    }
    eqns[3+4*0] = b.x;
    eqns[3+4*1] = b.y;
    eqns[3+4*2] = b.z;

    // Compute right upper triangular version of the matrix - Gauss elimination
    var n = 3, k = n, np;
    var kp = 4; // num rows
    var p, els;
    do {
        i = k - n;
        if (eqns[i+nc*i] === 0) {
            // the pivot is null, swap lines
            for (j = i + 1; j < k; j++) {
                if (eqns[i+nc*j] !== 0) {
                    np = kp;
                    do {  // do ligne( i ) = ligne( i ) + ligne( k )
                        p = kp - np;
                        eqns[p+nc*i] += eqns[p+nc*j];
                    } while (--np);
                    break;
                }
            }
        }
        if (eqns[i+nc*i] !== 0) {
            for (j = i + 1; j < k; j++) {
                var multiplier = eqns[i+nc*j] / eqns[i+nc*i];
                np = kp;
                do {  // do ligne( k ) = ligne( k ) - multiplier * ligne( i )
                    p = kp - np;
                    eqns[p+nc*j] = p <= i ? 0 : eqns[p+nc*j] - eqns[p+nc*i] * multiplier ;
                } while (--np);
            }
        }
    } while (--n);

    // Get the solution
    target.z = eqns[2*nc+3] / eqns[2*nc+2];
    target.y = (eqns[1*nc+3] - eqns[1*nc+2]*target.z) / eqns[1*nc+1];
    target.x = (eqns[0*nc+3] - eqns[0*nc+2]*target.z - eqns[0*nc+1]*target.y) / eqns[0*nc+0];

    if(isNaN(target.x) || isNaN(target.y) || isNaN(target.z) || target.x===Infinity || target.y===Infinity || target.z===Infinity){
        throw "Could not solve equation! Got x=["+target.toString()+"], b=["+b.toString()+"], A=["+this.toString()+"]";
    }

    return target;
};

/**
 * Get an element in the matrix by index. Index starts at 0, not 1!!!
 * @method e
 * @param {Number} row
 * @param {Number} column
 * @param {Number} value Optional. If provided, the matrix element will be set to this value.
 * @return {Number}
 */
Mat3.prototype.e = function( row , column ,value){
    if(value===undefined){
        return this.elements[column+3*row];
    } else {
        // Set value
        this.elements[column+3*row] = value;
    }
};

/**
 * Copy another matrix into this matrix object.
 * @method copy
 * @param {Mat3} source
 * @return {Mat3} this
 */
Mat3.prototype.copy = function(source){
    for(var i=0; i < source.elements.length; i++){
        this.elements[i] = source.elements[i];
    }
    return this;
};

/**
 * Returns a string representation of the matrix.
 * @method toString
 * @return string
 */
Mat3.prototype.toString = function(){
    var r = "";
    var sep = ",";
    for(var i=0; i<9; i++){
        r += this.elements[i] + sep;
    }
    return r;
};

/**
 * reverse the matrix
 * @method reverse
 * @param {Mat3} target Optional. Target matrix to save in.
 * @return {Mat3} The solution x
 */
Mat3.prototype.reverse = function(target){

    target = target || new Mat3();

    // Construct equations
    var nr = 3; // num rows
    var nc = 6; // num cols
    var eqns = [];
    for(var i=0; i<nr*nc; i++){
        eqns.push(0);
    }
    var i,j;
    for(i=0; i<3; i++){
        for(j=0; j<3; j++){
            eqns[i+nc*j] = this.elements[i+3*j];
        }
    }
    eqns[3+6*0] = 1;
    eqns[3+6*1] = 0;
    eqns[3+6*2] = 0;
    eqns[4+6*0] = 0;
    eqns[4+6*1] = 1;
    eqns[4+6*2] = 0;
    eqns[5+6*0] = 0;
    eqns[5+6*1] = 0;
    eqns[5+6*2] = 1;

    // Compute right upper triangular version of the matrix - Gauss elimination
    var n = 3, k = n, np;
    var kp = nc; // num rows
    var p;
    do {
        i = k - n;
        if (eqns[i+nc*i] === 0) {
            // the pivot is null, swap lines
            for (j = i + 1; j < k; j++) {
                if (eqns[i+nc*j] !== 0) {
                    np = kp;
                    do { // do line( i ) = line( i ) + line( k )
                        p = kp - np;
                        eqns[p+nc*i] += eqns[p+nc*j];
                    } while (--np);
                    break;
                }
            }
        }
        if (eqns[i+nc*i] !== 0) {
            for (j = i + 1; j < k; j++) {
                var multiplier = eqns[i+nc*j] / eqns[i+nc*i];
                np = kp;
                do { // do line( k ) = line( k ) - multiplier * line( i )
                    p = kp - np;
                    eqns[p+nc*j] = p <= i ? 0 : eqns[p+nc*j] - eqns[p+nc*i] * multiplier ;
                } while (--np);
            }
        }
    } while (--n);

    // eliminate the upper left triangle of the matrix
    i = 2;
    do {
        j = i-1;
        do {
            var multiplier = eqns[i+nc*j] / eqns[i+nc*i];
            np = nc;
            do {
                p = nc - np;
                eqns[p+nc*j] =  eqns[p+nc*j] - eqns[p+nc*i] * multiplier ;
            } while (--np);
        } while (j--);
    } while (--i);

    // operations on the diagonal
    i = 2;
    do {
        var multiplier = 1 / eqns[i+nc*i];
        np = nc;
        do {
            p = nc - np;
            eqns[p+nc*i] = eqns[p+nc*i] * multiplier ;
        } while (--np);
    } while (i--);

    i = 2;
    do {
        j = 2;
        do {
            p = eqns[nr+j+nc*i];
            if( isNaN( p ) || p ===Infinity ){
                throw "Could not reverse! A=["+this.toString()+"]";
            }
            target.e( i , j , p );
        } while (j--);
    } while (i--);

    return target;
};

/**
 * Set the matrix from a quaterion
 * @method setRotationFromQuaternion
 * @param {Quaternion} q
 */
Mat3.prototype.setRotationFromQuaternion = function( q ) {
    var x = q.x, y = q.y, z = q.z, w = q.w,
        x2 = x + x, y2 = y + y, z2 = z + z,
        xx = x * x2, xy = x * y2, xz = x * z2,
        yy = y * y2, yz = y * z2, zz = z * z2,
        wx = w * x2, wy = w * y2, wz = w * z2,
        e = this.elements;

    e[3*0 + 0] = 1 - ( yy + zz );
    e[3*0 + 1] = xy - wz;
    e[3*0 + 2] = xz + wy;

    e[3*1 + 0] = xy + wz;
    e[3*1 + 1] = 1 - ( xx + zz );
    e[3*1 + 2] = yz - wx;

    e[3*2 + 0] = xz - wy;
    e[3*2 + 1] = yz + wx;
    e[3*2 + 2] = 1 - ( xx + yy );

    return this;
};

/**
 * Transpose the matrix
 * @method transpose
 * @param  {Mat3} target Where to store the result.
 * @return {Mat3} The target Mat3, or a new Mat3 if target was omitted.
 */
Mat3.prototype.transpose = function( target ) {
    target = target || new Mat3();

    var Mt = target.elements,
        M = this.elements;

    for(var i=0; i!==3; i++){
        for(var j=0; j!==3; j++){
            Mt[3*i + j] = M[3*j + i];
        }
    }

    return target;
};

},{"./Vec3":30}],28:[function(_dereq_,module,exports){
module.exports = Quaternion;

var Vec3 = _dereq_('./Vec3');

/**
 * A Quaternion describes a rotation in 3D space. The Quaternion is mathematically defined as Q = x*i + y*j + z*k + w, where (i,j,k) are imaginary basis vectors. (x,y,z) can be seen as a vector related to the axis of rotation, while the real multiplier, w, is related to the amount of rotation.
 * @class Quaternion
 * @constructor
 * @param {Number} x Multiplier of the imaginary basis vector i.
 * @param {Number} y Multiplier of the imaginary basis vector j.
 * @param {Number} z Multiplier of the imaginary basis vector k.
 * @param {Number} w Multiplier of the real part.
 * @see http://en.wikipedia.org/wiki/Quaternion
 */
function Quaternion(x,y,z,w){
    /**
     * @property {Number} x
     */
    this.x = x!==undefined ? x : 0;

    /**
     * @property {Number} y
     */
    this.y = y!==undefined ? y : 0;

    /**
     * @property {Number} z
     */
    this.z = z!==undefined ? z : 0;

    /**
     * The multiplier of the real quaternion basis vector.
     * @property {Number} w
     */
    this.w = w!==undefined ? w : 1;
}

/**
 * Set the value of the quaternion.
 * @method set
 * @param {Number} x
 * @param {Number} y
 * @param {Number} z
 * @param {Number} w
 */
Quaternion.prototype.set = function(x,y,z,w){
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
};

/**
 * Convert to a readable format
 * @method toString
 * @return string
 */
Quaternion.prototype.toString = function(){
    return this.x+","+this.y+","+this.z+","+this.w;
};

/**
 * Convert to an Array
 * @method toArray
 * @return Array
 */
Quaternion.prototype.toArray = function(){
    return [this.x, this.y, this.z, this.w];
};

/**
 * Set the quaternion components given an axis and an angle.
 * @method setFromAxisAngle
 * @param {Vec3} axis
 * @param {Number} angle in radians
 */
Quaternion.prototype.setFromAxisAngle = function(axis,angle){
    var s = Math.sin(angle*0.5);
    this.x = axis.x * s;
    this.y = axis.y * s;
    this.z = axis.z * s;
    this.w = Math.cos(angle*0.5);
};

/**
 * Converts the quaternion to axis/angle representation.
 * @method toAxisAngle
 * @param {Vec3} targetAxis Optional. A vector object to reuse for storing the axis.
 * @return Array An array, first elemnt is the axis and the second is the angle in radians.
 */
Quaternion.prototype.toAxisAngle = function(targetAxis){
    targetAxis = targetAxis || new Vec3();
    this.normalize(); // if w>1 acos and sqrt will produce errors, this cant happen if quaternion is normalised
    var angle = 2 * Math.acos(this.w);
    var s = Math.sqrt(1-this.w*this.w); // assuming quaternion normalised then w is less than 1, so term always positive.
    if (s < 0.001) { // test to avoid divide by zero, s is always positive due to sqrt
        // if s close to zero then direction of axis not important
        targetAxis.x = this.x; // if it is important that axis is normalised then replace with x=1; y=z=0;
        targetAxis.y = this.y;
        targetAxis.z = this.z;
    } else {
        targetAxis.x = this.x / s; // normalise axis
        targetAxis.y = this.y / s;
        targetAxis.z = this.z / s;
    }
    return [targetAxis,angle];
};

var sfv_t1 = new Vec3(),
    sfv_t2 = new Vec3();

/**
 * Set the quaternion value given two vectors. The resulting rotation will be the needed rotation to rotate u to v.
 * @method setFromVectors
 * @param {Vec3} u
 * @param {Vec3} v
 */
Quaternion.prototype.setFromVectors = function(u,v){
    if(u.isAntiparallelTo(v)){
        var t1 = sfv_t1;
        var t2 = sfv_t2;

        u.tangents(t1,t2);
        this.setFromAxisAngle(t1,Math.PI);
    } else {
        var a = u.cross(v);
        this.x = a.x;
        this.y = a.y;
        this.z = a.z;
        this.w = Math.sqrt(Math.pow(u.norm(),2) * Math.pow(v.norm(),2)) + u.dot(v);
        this.normalize();
    }
};

/**
 * Quaternion multiplication
 * @method mult
 * @param {Quaternion} q
 * @param {Quaternion} target Optional.
 * @return {Quaternion}
 */
var Quaternion_mult_va = new Vec3();
var Quaternion_mult_vb = new Vec3();
var Quaternion_mult_vaxvb = new Vec3();
Quaternion.prototype.mult = function(q,target){
    target = target || new Quaternion();
    var w = this.w,
        va = Quaternion_mult_va,
        vb = Quaternion_mult_vb,
        vaxvb = Quaternion_mult_vaxvb;

    va.set(this.x,this.y,this.z);
    vb.set(q.x,q.y,q.z);
    target.w = w*q.w - va.dot(vb);
    va.cross(vb,vaxvb);

    target.x = w * vb.x + q.w*va.x + vaxvb.x;
    target.y = w * vb.y + q.w*va.y + vaxvb.y;
    target.z = w * vb.z + q.w*va.z + vaxvb.z;

    return target;
};

/**
 * Get the inverse quaternion rotation.
 * @method inverse
 * @param {Quaternion} target
 * @return {Quaternion}
 */
Quaternion.prototype.inverse = function(target){
    var x = this.x, y = this.y, z = this.z, w = this.w;
    target = target || new Quaternion();

    this.conjugate(target);
    var inorm2 = 1/(x*x + y*y + z*z + w*w);
    target.x *= inorm2;
    target.y *= inorm2;
    target.z *= inorm2;
    target.w *= inorm2;

    return target;
};

/**
 * Get the quaternion conjugate
 * @method conjugate
 * @param {Quaternion} target
 * @return {Quaternion}
 */
Quaternion.prototype.conjugate = function(target){
    target = target || new Quaternion();

    target.x = -this.x;
    target.y = -this.y;
    target.z = -this.z;
    target.w = this.w;

    return target;
};

/**
 * Normalize the quaternion. Note that this changes the values of the quaternion.
 * @method normalize
 */
Quaternion.prototype.normalize = function(){
    var l = Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w);
    if ( l === 0 ) {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.w = 0;
    } else {
        l = 1 / l;
        this.x *= l;
        this.y *= l;
        this.z *= l;
        this.w *= l;
    }
};

/**
 * Approximation of quaternion normalization. Works best when quat is already almost-normalized.
 * @method normalizeFast
 * @see http://jsperf.com/fast-quaternion-normalization
 * @author unphased, https://github.com/unphased
 */
Quaternion.prototype.normalizeFast = function () {
    var f = (3.0-(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w))/2.0;
    if ( f === 0 ) {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.w = 0;
    } else {
        this.x *= f;
        this.y *= f;
        this.z *= f;
        this.w *= f;
    }
};

/**
 * Multiply the quaternion by a vector
 * @method vmult
 * @param {Vec3} v
 * @param {Vec3} target Optional
 * @return {Vec3}
 */
Quaternion.prototype.vmult = function(v,target){
    target = target || new Vec3();

    var x = v.x,
        y = v.y,
        z = v.z;

    var qx = this.x,
        qy = this.y,
        qz = this.z,
        qw = this.w;

    // q*v
    var ix =  qw * x + qy * z - qz * y,
    iy =  qw * y + qz * x - qx * z,
    iz =  qw * z + qx * y - qy * x,
    iw = -qx * x - qy * y - qz * z;

    target.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    target.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    target.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;

    return target;
};

/**
 * Copies value of source to this quaternion.
 * @method copy
 * @param {Quaternion} source
 * @return {Quaternion} this
 */
Quaternion.prototype.copy = function(source){
    this.x = source.x;
    this.y = source.y;
    this.z = source.z;
    this.w = source.w;
    return this;
};

/**
 * Convert the quaternion to euler angle representation. Order: YZX, as this page describes: http://www.euclideanspace.com/maths/standards/index.htm
 * @method toEuler
 * @param {Vec3} target
 * @param string order Three-character string e.g. "YZX", which also is default.
 */
Quaternion.prototype.toEuler = function(target,order){
    order = order || "YZX";

    var heading, attitude, bank;
    var x = this.x, y = this.y, z = this.z, w = this.w;

    switch(order){
    case "YZX":
        var test = x*y + z*w;
        if (test > 0.499) { // singularity at north pole
            heading = 2 * Math.atan2(x,w);
            attitude = Math.PI/2;
            bank = 0;
        }
        if (test < -0.499) { // singularity at south pole
            heading = -2 * Math.atan2(x,w);
            attitude = - Math.PI/2;
            bank = 0;
        }
        if(isNaN(heading)){
            var sqx = x*x;
            var sqy = y*y;
            var sqz = z*z;
            heading = Math.atan2(2*y*w - 2*x*z , 1 - 2*sqy - 2*sqz); // Heading
            attitude = Math.asin(2*test); // attitude
            bank = Math.atan2(2*x*w - 2*y*z , 1 - 2*sqx - 2*sqz); // bank
        }
        break;
    default:
        throw new Error("Euler order "+order+" not supported yet.");
    }

    target.y = heading;
    target.z = attitude;
    target.x = bank;
};

/**
 * See http://www.mathworks.com/matlabcentral/fileexchange/20696-function-to-convert-between-dcm-euler-angles-quaternions-and-euler-vectors/content/SpinCalc.m
 * @method setFromEuler
 * @param {Number} x
 * @param {Number} y
 * @param {Number} z
 * @param {String} order The order to apply angles: 'XYZ' or 'YXZ' or any other combination
 */
Quaternion.prototype.setFromEuler = function ( x, y, z, order ) {
    order = order || "XYZ";

    var c1 = Math.cos( x / 2 );
    var c2 = Math.cos( y / 2 );
    var c3 = Math.cos( z / 2 );
    var s1 = Math.sin( x / 2 );
    var s2 = Math.sin( y / 2 );
    var s3 = Math.sin( z / 2 );

    if ( order === 'XYZ' ) {

        this.x = s1 * c2 * c3 + c1 * s2 * s3;
        this.y = c1 * s2 * c3 - s1 * c2 * s3;
        this.z = c1 * c2 * s3 + s1 * s2 * c3;
        this.w = c1 * c2 * c3 - s1 * s2 * s3;

    } else if ( order === 'YXZ' ) {

        this.x = s1 * c2 * c3 + c1 * s2 * s3;
        this.y = c1 * s2 * c3 - s1 * c2 * s3;
        this.z = c1 * c2 * s3 - s1 * s2 * c3;
        this.w = c1 * c2 * c3 + s1 * s2 * s3;

    } else if ( order === 'ZXY' ) {

        this.x = s1 * c2 * c3 - c1 * s2 * s3;
        this.y = c1 * s2 * c3 + s1 * c2 * s3;
        this.z = c1 * c2 * s3 + s1 * s2 * c3;
        this.w = c1 * c2 * c3 - s1 * s2 * s3;

    } else if ( order === 'ZYX' ) {

        this.x = s1 * c2 * c3 - c1 * s2 * s3;
        this.y = c1 * s2 * c3 + s1 * c2 * s3;
        this.z = c1 * c2 * s3 - s1 * s2 * c3;
        this.w = c1 * c2 * c3 + s1 * s2 * s3;

    } else if ( order === 'YZX' ) {

        this.x = s1 * c2 * c3 + c1 * s2 * s3;
        this.y = c1 * s2 * c3 + s1 * c2 * s3;
        this.z = c1 * c2 * s3 - s1 * s2 * c3;
        this.w = c1 * c2 * c3 - s1 * s2 * s3;

    } else if ( order === 'XZY' ) {

        this.x = s1 * c2 * c3 - c1 * s2 * s3;
        this.y = c1 * s2 * c3 - s1 * c2 * s3;
        this.z = c1 * c2 * s3 + s1 * s2 * c3;
        this.w = c1 * c2 * c3 + s1 * s2 * s3;

    }

    return this;

};

Quaternion.prototype.clone = function(){
    return new Quaternion(this.x, this.y, this.z, this.w);
};
},{"./Vec3":30}],29:[function(_dereq_,module,exports){
var Vec3 = _dereq_('./Vec3');
var Quaternion = _dereq_('./Quaternion');

module.exports = Transform;

/**
 * @class Transform
 * @constructor
 */
function Transform(options) {
    options = options || {};

	/**
	 * @property {Vec3} position
	 */
	this.position = new Vec3();
    if(options.position){
        this.position.copy(options.position);
    }

	/**
	 * @property {Quaternion} quaternion
	 */
	this.quaternion = new Quaternion();
    if(options.quaternion){
        this.quaternion.copy(options.quaternion);
    }
}

var tmpQuat = new Quaternion();

/**
 * @static
 * @method pointToLocaFrame
 * @param {Vec3} position
 * @param {Quaternion} quaternion
 * @param {Vec3} worldPoint
 * @param {Vec3} result
 */
Transform.pointToLocalFrame = function(position, quaternion, worldPoint, result){
    var result = result || new Vec3();
    worldPoint.vsub(position, result);
    quaternion.conjugate(tmpQuat);
    tmpQuat.vmult(result, result);
    return result;
};

/**
 * Get a global point in local transform coordinates.
 * @method pointToLocal
 * @param  {Vec3} point
 * @param  {Vec3} result
 * @return {Vec3} The "result" vector object
 */
Transform.prototype.pointToLocal = function(worldPoint, result){
    return Transform.pointToLocalFrame(this.position, this.quaternion, worldPoint, result);
};

/**
 * @static
 * @method pointToWorldFrame
 * @param {Vec3} position
 * @param {Vec3} quaternion
 * @param {Vec3} localPoint
 * @param {Vec3} result
 */
Transform.pointToWorldFrame = function(position, quaternion, localPoint, result){
    var result = result || new Vec3();
    quaternion.vmult(localPoint, result);
    result.vadd(position, result);
    return result;
};

/**
 * Get a local point in global transform coordinates.
 * @method pointToWorld
 * @param  {Vec3} point
 * @param  {Vec3} result
 * @return {Vec3} The "result" vector object
 */
Transform.prototype.pointToWorld = function(localPoint, result){
    return Transform.pointToWorldFrame(this.position, this.quaternion, localPoint, result);
};


Transform.prototype.vectorToWorldFrame = function(localVector, result){
    var result = result || new Vec3();
    this.quaternion.vmult(localVector, result);
    return result;
};

Transform.vectorToWorldFrame = function(quaternion, localVector, result){
    quaternion.vmult(localVector, result);
    return result;
};

Transform.vectorToLocalFrame = function(position, quaternion, worldVector, result){
    var result = result || new Vec3();
    quaternion.w *= -1;
    quaternion.vmult(worldVector, result);
    quaternion.w *= -1;
    return result;
};

},{"./Quaternion":28,"./Vec3":30}],30:[function(_dereq_,module,exports){
module.exports = Vec3;

var Mat3 = _dereq_('./Mat3');

/**
 * 3-dimensional vector
 * @class Vec3
 * @constructor
 * @param {Number} x
 * @param {Number} y
 * @param {Number} z
 * @author schteppe
 * @example
 *     var v = new Vec3(1, 2, 3);
 *     console.log('x=' + v.x); // x=1
 */
function Vec3(x,y,z){
    /**
     * @property x
     * @type {Number}
     */
    this.x = x||0.0;

    /**
     * @property y
     * @type {Number}
     */
    this.y = y||0.0;

    /**
     * @property z
     * @type {Number}
     */
    this.z = z||0.0;
}

/**
 * @static
 * @property {Vec3} ZERO
 */
Vec3.ZERO = new Vec3(0, 0, 0);

/**
 * @static
 * @property {Vec3} UNIT_X
 */
Vec3.UNIT_X = new Vec3(1, 0, 0);

/**
 * @static
 * @property {Vec3} UNIT_Y
 */
Vec3.UNIT_Y = new Vec3(0, 1, 0);

/**
 * @static
 * @property {Vec3} UNIT_Z
 */
Vec3.UNIT_Z = new Vec3(0, 0, 1);

/**
 * Vector cross product
 * @method cross
 * @param {Vec3} v
 * @param {Vec3} target Optional. Target to save in.
 * @return {Vec3}
 */
Vec3.prototype.cross = function(v,target){
    var vx=v.x, vy=v.y, vz=v.z, x=this.x, y=this.y, z=this.z;
    target = target || new Vec3();

    target.x = (y * vz) - (z * vy);
    target.y = (z * vx) - (x * vz);
    target.z = (x * vy) - (y * vx);

    return target;
};

/**
 * Set the vectors' 3 elements
 * @method set
 * @param {Number} x
 * @param {Number} y
 * @param {Number} z
 * @return Vec3
 */
Vec3.prototype.set = function(x,y,z){
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
};

/**
 * Set all components of the vector to zero.
 * @method setZero
 */
Vec3.prototype.setZero = function(){
    this.x = this.y = this.z = 0;
};

/**
 * Vector addition
 * @method vadd
 * @param {Vec3} v
 * @param {Vec3} target Optional.
 * @return {Vec3}
 */
Vec3.prototype.vadd = function(v,target){
    if(target){
        target.x = v.x + this.x;
        target.y = v.y + this.y;
        target.z = v.z + this.z;
    } else {
        return new Vec3(this.x + v.x,
                               this.y + v.y,
                               this.z + v.z);
    }
};

/**
 * Vector subtraction
 * @method vsub
 * @param {Vec3} v
 * @param {Vec3} target Optional. Target to save in.
 * @return {Vec3}
 */
Vec3.prototype.vsub = function(v,target){
    if(target){
        target.x = this.x - v.x;
        target.y = this.y - v.y;
        target.z = this.z - v.z;
    } else {
        return new Vec3(this.x-v.x,
                               this.y-v.y,
                               this.z-v.z);
    }
};

/**
 * Get the cross product matrix a_cross from a vector, such that a x b = a_cross * b = c
 * @method crossmat
 * @see http://www8.cs.umu.se/kurser/TDBD24/VT06/lectures/Lecture6.pdf
 * @return {Mat3}
 */
Vec3.prototype.crossmat = function(){
    return new Mat3([     0,  -this.z,   this.y,
                            this.z,        0,  -this.x,
                           -this.y,   this.x,        0]);
};

/**
 * Normalize the vector. Note that this changes the values in the vector.
 * @method normalize
 * @return {Number} Returns the norm of the vector
 */
Vec3.prototype.normalize = function(){
    var x=this.x, y=this.y, z=this.z;
    var n = Math.sqrt(x*x + y*y + z*z);
    if(n>0.0){
        var invN = 1/n;
        this.x *= invN;
        this.y *= invN;
        this.z *= invN;
    } else {
        // Make something up
        this.x = 0;
        this.y = 0;
        this.z = 0;
    }
    return n;
};

/**
 * Get the version of this vector that is of length 1.
 * @method unit
 * @param {Vec3} target Optional target to save in
 * @return {Vec3} Returns the unit vector
 */
Vec3.prototype.unit = function(target){
    target = target || new Vec3();
    var x=this.x, y=this.y, z=this.z;
    var ninv = Math.sqrt(x*x + y*y + z*z);
    if(ninv>0.0){
        ninv = 1.0/ninv;
        target.x = x * ninv;
        target.y = y * ninv;
        target.z = z * ninv;
    } else {
        target.x = 1;
        target.y = 0;
        target.z = 0;
    }
    return target;
};

/**
 * Get the length of the vector
 * @method norm
 * @return {Number}
 * @deprecated Use .length() instead
 */
Vec3.prototype.norm = function(){
    var x=this.x, y=this.y, z=this.z;
    return Math.sqrt(x*x + y*y + z*z);
};

/**
 * Get the length of the vector
 * @method length
 * @return {Number}
 */
Vec3.prototype.length = Vec3.prototype.norm;

/**
 * Get the squared length of the vector
 * @method norm2
 * @return {Number}
 * @deprecated Use .lengthSquared() instead.
 */
Vec3.prototype.norm2 = function(){
    return this.dot(this);
};

/**
 * Get the squared length of the vector.
 * @method lengthSquared
 * @return {Number}
 */
Vec3.prototype.lengthSquared = Vec3.prototype.norm2;

/**
 * Get distance from this point to another point
 * @method distanceTo
 * @param  {Vec3} p
 * @return {Number}
 */
Vec3.prototype.distanceTo = function(p){
    var x=this.x, y=this.y, z=this.z;
    var px=p.x, py=p.y, pz=p.z;
    return Math.sqrt((px-x)*(px-x)+
                     (py-y)*(py-y)+
                     (pz-z)*(pz-z));
};

/**
 * Get squared distance from this point to another point
 * @method distanceSquared
 * @param  {Vec3} p
 * @return {Number}
 */
Vec3.prototype.distanceSquared = function(p){
    var x=this.x, y=this.y, z=this.z;
    var px=p.x, py=p.y, pz=p.z;
    return (px-x)*(px-x) + (py-y)*(py-y) + (pz-z)*(pz-z);
};

/**
 * Multiply all the components of the vector with a scalar.
 * @deprecated Use .scale instead
 * @method mult
 * @param {Number} scalar
 * @param {Vec3} target The vector to save the result in.
 * @return {Vec3}
 * @deprecated Use .scale() instead
 */
Vec3.prototype.mult = function(scalar,target){
    target = target || new Vec3();
    var x = this.x,
        y = this.y,
        z = this.z;
    target.x = scalar * x;
    target.y = scalar * y;
    target.z = scalar * z;
    return target;
};

/**
 * Multiply the vector with a scalar.
 * @method scale
 * @param {Number} scalar
 * @param {Vec3} target
 * @return {Vec3}
 */
Vec3.prototype.scale = Vec3.prototype.mult;

/**
 * Calculate dot product
 * @method dot
 * @param {Vec3} v
 * @return {Number}
 */
Vec3.prototype.dot = function(v){
    return this.x * v.x + this.y * v.y + this.z * v.z;
};

/**
 * @method isZero
 * @return bool
 */
Vec3.prototype.isZero = function(){
    return this.x===0 && this.y===0 && this.z===0;
};

/**
 * Make the vector point in the opposite direction.
 * @method negate
 * @param {Vec3} target Optional target to save in
 * @return {Vec3}
 */
Vec3.prototype.negate = function(target){
    target = target || new Vec3();
    target.x = -this.x;
    target.y = -this.y;
    target.z = -this.z;
    return target;
};

/**
 * Compute two artificial tangents to the vector
 * @method tangents
 * @param {Vec3} t1 Vector object to save the first tangent in
 * @param {Vec3} t2 Vector object to save the second tangent in
 */
var Vec3_tangents_n = new Vec3();
var Vec3_tangents_randVec = new Vec3();
Vec3.prototype.tangents = function(t1,t2){
    var norm = this.norm();
    if(norm>0.0){
        var n = Vec3_tangents_n;
        var inorm = 1/norm;
        n.set(this.x*inorm,this.y*inorm,this.z*inorm);
        var randVec = Vec3_tangents_randVec;
        if(Math.abs(n.x) < 0.9){
            randVec.set(1,0,0);
            n.cross(randVec,t1);
        } else {
            randVec.set(0,1,0);
            n.cross(randVec,t1);
        }
        n.cross(t1,t2);
    } else {
        // The normal length is zero, make something up
        t1.set(1, 0, 0);
        t2.set(0, 1, 0);
    }
};

/**
 * Converts to a more readable format
 * @method toString
 * @return string
 */
Vec3.prototype.toString = function(){
    return this.x+","+this.y+","+this.z;
};

/**
 * Converts to an array
 * @method toArray
 * @return Array
 */
Vec3.prototype.toArray = function(){
    return [this.x, this.y, this.z];
};

/**
 * Copies value of source to this vector.
 * @method copy
 * @param {Vec3} source
 * @return {Vec3} this
 */
Vec3.prototype.copy = function(source){
    this.x = source.x;
    this.y = source.y;
    this.z = source.z;
    return this;
};


/**
 * Do a linear interpolation between two vectors
 * @method lerp
 * @param {Vec3} v
 * @param {Number} t A number between 0 and 1. 0 will make this function return u, and 1 will make it return v. Numbers in between will generate a vector in between them.
 * @param {Vec3} target
 */
Vec3.prototype.lerp = function(v,t,target){
    var x=this.x, y=this.y, z=this.z;
    target.x = x + (v.x-x)*t;
    target.y = y + (v.y-y)*t;
    target.z = z + (v.z-z)*t;
};

/**
 * Check if a vector equals is almost equal to another one.
 * @method almostEquals
 * @param {Vec3} v
 * @param {Number} precision
 * @return bool
 */
Vec3.prototype.almostEquals = function(v,precision){
    if(precision===undefined){
        precision = 1e-6;
    }
    if( Math.abs(this.x-v.x)>precision ||
        Math.abs(this.y-v.y)>precision ||
        Math.abs(this.z-v.z)>precision){
        return false;
    }
    return true;
};

/**
 * Check if a vector is almost zero
 * @method almostZero
 * @param {Number} precision
 */
Vec3.prototype.almostZero = function(precision){
    if(precision===undefined){
        precision = 1e-6;
    }
    if( Math.abs(this.x)>precision ||
        Math.abs(this.y)>precision ||
        Math.abs(this.z)>precision){
        return false;
    }
    return true;
};

var antip_neg = new Vec3();

/**
 * Check if the vector is anti-parallel to another vector.
 * @method isAntiparallelTo
 * @param  {Vec3}  v
 * @param  {Number}  precision Set to zero for exact comparisons
 * @return {Boolean}
 */
Vec3.prototype.isAntiparallelTo = function(v,precision){
    this.negate(antip_neg);
    return antip_neg.almostEquals(v,precision);
};

/**
 * Clone the vector
 * @method clone
 * @return {Vec3}
 */
Vec3.prototype.clone = function(){
    return new Vec3(this.x, this.y, this.z);
};
},{"./Mat3":27}],31:[function(_dereq_,module,exports){
module.exports = Body;

var EventTarget = _dereq_('../utils/EventTarget');
var Shape = _dereq_('../shapes/Shape');
var Vec3 = _dereq_('../math/Vec3');
var Mat3 = _dereq_('../math/Mat3');
var Quaternion = _dereq_('../math/Quaternion');
var Material = _dereq_('../material/Material');
var AABB = _dereq_('../collision/AABB');
var Box = _dereq_('../shapes/Box');

/**
 * Base class for all body types.
 * @class Body
 * @constructor
 * @extends EventTarget
 * @param {object} [options]
 * @param {Vec3} [options.position]
 * @param {Vec3} [options.velocity]
 * @param {Vec3} [options.angularVelocity]
 * @param {Quaternion} [options.quaternion]
 * @param {number} [options.mass]
 * @param {Material} [options.material]
 * @param {number} [options.type]
 * @param {number} [options.linearDamping=0.01]
 * @param {number} [options.angularDamping=0.01]
 * @param {boolean} [options.allowSleep=true]
 * @param {number} [options.sleepSpeedLimit=0.1]
 * @param {number} [options.sleepTimeLimit=1]
 * @param {number} [options.collisionFilterGroup=1]
 * @param {number} [options.collisionFilterMask=1]
 * @param {boolean} [options.fixedRotation=false]
 * @param {Body} [options.shape]
 * @example
 *     var body = new Body({
 *         mass: 1
 *     });
 *     var shape = new Sphere(1);
 *     body.addShape(shape);
 *     world.add(body);
 */
function Body(options){
    options = options || {};

    EventTarget.apply(this);

    this.id = Body.idCounter++;

    /**
     * Reference to the world the body is living in
     * @property world
     * @type {World}
     */
    this.world = null;

    /**
     * Callback function that is used BEFORE stepping the system. Use it to apply forces, for example. Inside the function, "this" will refer to this Body object.
     * @property preStep
     * @type {Function}
     * @deprecated Use World events instead
     */
    this.preStep = null;

    /**
     * Callback function that is used AFTER stepping the system. Inside the function, "this" will refer to this Body object.
     * @property postStep
     * @type {Function}
     * @deprecated Use World events instead
     */
    this.postStep = null;

    this.vlambda = new Vec3();

    /**
     * @property {Number} collisionFilterGroup
     */
    this.collisionFilterGroup = typeof(options.collisionFilterGroup) === 'number' ? options.collisionFilterGroup : 1;

    /**
     * @property {Number} collisionFilterMask
     */
    this.collisionFilterMask = typeof(options.collisionFilterMask) === 'number' ? options.collisionFilterMask : 1;

    /**
     * Whether to produce contact forces when in contact with other bodies. Note that contacts will be generated, but they will be disabled.
     * @property {Number} collisionResponse
     */
	this.collisionResponse = true;

    /**
     * @property position
     * @type {Vec3}
     */
    this.position = new Vec3();

    if(options.position){
        this.position.copy(options.position);
    }

    /**
     * @property {Vec3} previousPosition
     */
    this.previousPosition = new Vec3();

    /**
     * Initial position of the body
     * @property initPosition
     * @type {Vec3}
     */
    this.initPosition = new Vec3();

    /**
     * @property velocity
     * @type {Vec3}
     */
    this.velocity = new Vec3();

    if(options.velocity){
        this.velocity.copy(options.velocity);
    }

    /**
     * @property initVelocity
     * @type {Vec3}
     */
    this.initVelocity = new Vec3();

    /**
     * Linear force on the body
     * @property force
     * @type {Vec3}
     */
    this.force = new Vec3();

    var mass = typeof(options.mass) === 'number' ? options.mass : 0;

    /**
     * @property mass
     * @type {Number}
     * @default 0
     */
    this.mass = mass;

    /**
     * @property invMass
     * @type {Number}
     */
    this.invMass = mass > 0 ? 1.0 / mass : 0;

    /**
     * @property material
     * @type {Material}
     */
    this.material = options.material || null;

    /**
     * @property linearDamping
     * @type {Number}
     */
    this.linearDamping = typeof(options.linearDamping) === 'number' ? options.linearDamping : 0.01;

    /**
     * One of: Body.DYNAMIC, Body.STATIC and Body.KINEMATIC.
     * @property type
     * @type {Number}
     */
    this.type = (mass <= 0.0 ? Body.STATIC : Body.DYNAMIC);
    if(typeof(options.type) === typeof(Body.STATIC)){
        this.type = options.type;
    }

    /**
     * If true, the body will automatically fall to sleep.
     * @property allowSleep
     * @type {Boolean}
     * @default true
     */
    this.allowSleep = typeof(options.allowSleep) !== 'undefined' ? options.allowSleep : true;

    /**
     * Current sleep state.
     * @property sleepState
     * @type {Number}
     */
    this.sleepState = 0;

    /**
     * If the speed (the norm of the velocity) is smaller than this value, the body is considered sleepy.
     * @property sleepSpeedLimit
     * @type {Number}
     * @default 0.1
     */
    this.sleepSpeedLimit = typeof(options.sleepSpeedLimit) !== 'undefined' ? options.sleepSpeedLimit : 0.1;

    /**
     * If the body has been sleepy for this sleepTimeLimit seconds, it is considered sleeping.
     * @property sleepTimeLimit
     * @type {Number}
     * @default 1
     */
    this.sleepTimeLimit = typeof(options.sleepTimeLimit) !== 'undefined' ? options.sleepTimeLimit : 1;

    this.timeLastSleepy = 0;

    this._wakeUpAfterNarrowphase = false;


    /**
     * Rotational force on the body, around center of mass
     * @property {Vec3} torque
     */
    this.torque = new Vec3();

    /**
     * Orientation of the body
     * @property quaternion
     * @type {Quaternion}
     */
    this.quaternion = new Quaternion();

    if(options.quaternion){
        this.quaternion.copy(options.quaternion);
    }

    /**
     * @property initQuaternion
     * @type {Quaternion}
     */
    this.initQuaternion = new Quaternion();

    /**
     * @property angularVelocity
     * @type {Vec3}
     */
    this.angularVelocity = new Vec3();

    if(options.angularVelocity){
        this.angularVelocity.copy(options.angularVelocity);
    }

    /**
     * @property initAngularVelocity
     * @type {Vec3}
     */
    this.initAngularVelocity = new Vec3();

    this.interpolatedPosition = new Vec3();
    this.interpolatedQuaternion = new Quaternion();

    /**
     * @property shapes
     * @type {array}
     */
    this.shapes = [];

    /**
     * @property shapeOffsets
     * @type {array}
     */
    this.shapeOffsets = [];

    /**
     * @property shapeOrientations
     * @type {array}
     */
    this.shapeOrientations = [];

    /**
     * @property inertia
     * @type {Vec3}
     */
    this.inertia = new Vec3();

    /**
     * @property {Vec3} invInertia
     */
    this.invInertia = new Vec3();

    /**
     * @property {Mat3} invInertiaWorld
     */
    this.invInertiaWorld = new Mat3();

    this.invMassSolve = 0;

    /**
     * @property {Vec3} invInertiaSolve
     */
    this.invInertiaSolve = new Vec3();

    /**
     * @property {Mat3} invInertiaWorldSolve
     */
    this.invInertiaWorldSolve = new Mat3();

    /**
     * Set to true if you don't want the body to rotate. Make sure to run .updateMassProperties() after changing this.
     * @property {Boolean} fixedRotation
     * @default false
     */
    this.fixedRotation = typeof(options.fixedRotation) !== "undefined" ? options.fixedRotation : false;

    /**
     * @property {Number} angularDamping
     */
    this.angularDamping = typeof(options.angularDamping) !== 'undefined' ? options.angularDamping : 0.01;

    /**
     * @property aabb
     * @type {AABB}
     */
    this.aabb = new AABB();

    /**
     * Indicates if the AABB needs to be updated before use.
     * @property aabbNeedsUpdate
     * @type {Boolean}
     */
    this.aabbNeedsUpdate = true;

    this.wlambda = new Vec3();

    if(options.shape){
        this.addShape(options.shape);
    }

    this.updateMassProperties();
}
Body.prototype = new EventTarget();
Body.prototype.constructor = Body;

/**
 * A dynamic body is fully simulated. Can be moved manually by the user, but normally they move according to forces. A dynamic body can collide with all body types. A dynamic body always has finite, non-zero mass.
 * @static
 * @property DYNAMIC
 * @type {Number}
 */
Body.DYNAMIC = 1;

/**
 * A static body does not move during simulation and behaves as if it has infinite mass. Static bodies can be moved manually by setting the position of the body. The velocity of a static body is always zero. Static bodies do not collide with other static or kinematic bodies.
 * @static
 * @property STATIC
 * @type {Number}
 */
Body.STATIC = 2;

/**
 * A kinematic body moves under simulation according to its velocity. They do not respond to forces. They can be moved manually, but normally a kinematic body is moved by setting its velocity. A kinematic body behaves as if it has infinite mass. Kinematic bodies do not collide with other static or kinematic bodies.
 * @static
 * @property KINEMATIC
 * @type {Number}
 */
Body.KINEMATIC = 4;



/**
 * @static
 * @property AWAKE
 * @type {number}
 */
Body.AWAKE = 0;

/**
 * @static
 * @property SLEEPY
 * @type {number}
 */
Body.SLEEPY = 1;

/**
 * @static
 * @property SLEEPING
 * @type {number}
 */
Body.SLEEPING = 2;

Body.idCounter = 0;

/**
 * Wake the body up.
 * @method wakeUp
 */
Body.prototype.wakeUp = function(){
    var s = this.sleepState;
    this.sleepState = 0;
    if(s === Body.SLEEPING){
        this.dispatchEvent({type:"wakeup"});
    }
};

/**
 * Force body sleep
 * @method sleep
 */
Body.prototype.sleep = function(){
    this.sleepState = Body.SLEEPING;
    this.velocity.set(0,0,0);
    this.angularVelocity.set(0,0,0);
};

Body.sleepyEvent = {
    type: "sleepy"
};

Body.sleepEvent = {
    type: "sleep"
};

/**
 * Called every timestep to update internal sleep timer and change sleep state if needed.
 * @method sleepTick
 * @param {Number} time The world time in seconds
 */
Body.prototype.sleepTick = function(time){
    if(this.allowSleep){
        var sleepState = this.sleepState;
        var speedSquared = this.velocity.norm2() + this.angularVelocity.norm2();
        var speedLimitSquared = Math.pow(this.sleepSpeedLimit,2);
        if(sleepState===Body.AWAKE && speedSquared < speedLimitSquared){
            this.sleepState = Body.SLEEPY; // Sleepy
            this.timeLastSleepy = time;
            this.dispatchEvent(Body.sleepyEvent);
        } else if(sleepState===Body.SLEEPY && speedSquared > speedLimitSquared){
            this.wakeUp(); // Wake up
        } else if(sleepState===Body.SLEEPY && (time - this.timeLastSleepy ) > this.sleepTimeLimit){
            this.sleep(); // Sleeping
            this.dispatchEvent(Body.sleepEvent);
        }
    }
};

/**
 * If the body is sleeping, it should be immovable / have infinite mass during solve. We solve it by having a separate "solve mass".
 * @method updateSolveMassProperties
 */
Body.prototype.updateSolveMassProperties = function(){
    if(this.sleepState === Body.SLEEPING || this.type === Body.KINEMATIC){
        this.invMassSolve = 0;
        this.invInertiaSolve.setZero();
        this.invInertiaWorldSolve.setZero();
    } else {
        this.invMassSolve = this.invMass;
        this.invInertiaSolve.copy(this.invInertia);
        this.invInertiaWorldSolve.copy(this.invInertiaWorld);
    }
};

/**
 * Convert a world point to local body frame.
 * @method pointToLocalFrame
 * @param  {Vec3} worldPoint
 * @param  {Vec3} result
 * @return {Vec3}
 */
Body.prototype.pointToLocalFrame = function(worldPoint,result){
    var result = result || new Vec3();
    worldPoint.vsub(this.position,result);
    this.quaternion.conjugate().vmult(result,result);
    return result;
};

/**
 * Convert a world vector to local body frame.
 * @method vectorToLocalFrame
 * @param  {Vec3} worldPoint
 * @param  {Vec3} result
 * @return {Vec3}
 */
Body.prototype.vectorToLocalFrame = function(worldVector, result){
    var result = result || new Vec3();
    this.quaternion.conjugate().vmult(worldVector,result);
    return result;
};

/**
 * Convert a local body point to world frame.
 * @method pointToWorldFrame
 * @param  {Vec3} localPoint
 * @param  {Vec3} result
 * @return {Vec3}
 */
Body.prototype.pointToWorldFrame = function(localPoint,result){
    var result = result || new Vec3();
    this.quaternion.vmult(localPoint,result);
    result.vadd(this.position,result);
    return result;
};

/**
 * Convert a local body point to world frame.
 * @method vectorToWorldFrame
 * @param  {Vec3} localVector
 * @param  {Vec3} result
 * @return {Vec3}
 */
Body.prototype.vectorToWorldFrame = function(localVector, result){
    var result = result || new Vec3();
    this.quaternion.vmult(localVector, result);
    return result;
};

var tmpVec = new Vec3();
var tmpQuat = new Quaternion();

/**
 * Add a shape to the body with a local offset and orientation.
 * @method addShape
 * @param {Shape} shape
 * @param {Vec3} offset
 * @param {Quaternion} quaternion
 * @return {Body} The body object, for chainability.
 */
Body.prototype.addShape = function(shape, _offset, _orientation){
    var offset = new Vec3();
    var orientation = new Quaternion();

    if(_offset){
        offset.copy(_offset);
    }
    if(_orientation){
        orientation.copy(_orientation);
    }

    this.shapes.push(shape);
    this.shapeOffsets.push(offset);
    this.shapeOrientations.push(orientation);
    this.updateMassProperties();
    this.updateBoundingRadius();

    this.aabbNeedsUpdate = true;

    return this;
};

/**
 * Update the bounding radius of the body. Should be done if any of the shapes are changed.
 * @method updateBoundingRadius
 */
Body.prototype.updateBoundingRadius = function(){
    var shapes = this.shapes,
        shapeOffsets = this.shapeOffsets,
        N = shapes.length,
        radius = 0;

    for(var i=0; i!==N; i++){
        var shape = shapes[i];
        shape.updateBoundingSphereRadius();
        var offset = shapeOffsets[i].norm(),
            r = shape.boundingSphereRadius;
        if(offset + r > radius){
            radius = offset + r;
        }
    }

    this.boundingRadius = radius;
};

var computeAABB_shapeAABB = new AABB();

/**
 * Updates the .aabb
 * @method computeAABB
 * @todo rename to updateAABB()
 */
Body.prototype.computeAABB = function(){
    var shapes = this.shapes,
        shapeOffsets = this.shapeOffsets,
        shapeOrientations = this.shapeOrientations,
        N = shapes.length,
        offset = tmpVec,
        orientation = tmpQuat,
        bodyQuat = this.quaternion,
        aabb = this.aabb,
        shapeAABB = computeAABB_shapeAABB;

    for(var i=0; i!==N; i++){
        var shape = shapes[i];

        // Get shape world quaternion
        shapeOrientations[i].mult(bodyQuat, orientation);

        // Get shape world position
        orientation.vmult(shapeOffsets[i], offset);
        offset.vadd(this.position, offset);

        // vec2.rotate(offset, shapeOffsets[i], bodyAngle);
        // vec2.add(offset, offset, this.position);

        // Get shape AABB
        shape.calculateWorldAABB(offset, orientation, shapeAABB.lowerBound, shapeAABB.upperBound);

        if(i === 0){
            aabb.copy(shapeAABB);
        } else {
            aabb.extend(shapeAABB);
        }
    }

    this.aabbNeedsUpdate = false;
};

var uiw_m1 = new Mat3(),
    uiw_m2 = new Mat3(),
    uiw_m3 = new Mat3();

/**
 * Update .inertiaWorld and .invInertiaWorld
 * @method updateInertiaWorld
 */
Body.prototype.updateInertiaWorld = function(force){
    var I = this.invInertia;
    if (I.x === I.y && I.y === I.z && !force) {
        // If inertia M = s*I, where I is identity and s a scalar, then
        //    R*M*R' = R*(s*I)*R' = s*R*I*R' = s*R*R' = s*I = M
        // where R is the rotation matrix.
        // In other words, we don't have to transform the inertia if all
        // inertia diagonal entries are equal.
    } else {
        var m1 = uiw_m1,
            m2 = uiw_m2,
            m3 = uiw_m3;
        m1.setRotationFromQuaternion(this.quaternion);
        m1.transpose(m2);
        m1.scale(I,m1);
        m1.mmult(m2,this.invInertiaWorld);
        //m3.getTrace(this.invInertiaWorld);
    }

    /*
    this.quaternion.vmult(this.inertia,this.inertiaWorld);
    this.quaternion.vmult(this.invInertia,this.invInertiaWorld);
    */
};

/**
 * Apply force to a world point. This could for example be a point on the Body surface. Applying force this way will add to Body.force and Body.torque.
 * @method applyForce
 * @param  {Vec3} force The amount of force to add.
 * @param  {Vec3} worldPoint A world point to apply the force on.
 */
var Body_applyForce_r = new Vec3();
var Body_applyForce_rotForce = new Vec3();
Body.prototype.applyForce = function(force,worldPoint){
    if(this.type !== Body.DYNAMIC){
        return;
    }

    // Compute point position relative to the body center
    var r = Body_applyForce_r;
    worldPoint.vsub(this.position,r);

    // Compute produced rotational force
    var rotForce = Body_applyForce_rotForce;
    r.cross(force,rotForce);

    // Add linear force
    this.force.vadd(force,this.force);

    // Add rotational force
    this.torque.vadd(rotForce,this.torque);
};

/**
 * Apply force to a local point in the body.
 * @method applyLocalForce
 * @param  {Vec3} force The force vector to apply, defined locally in the body frame.
 * @param  {Vec3} localPoint A local point in the body to apply the force on.
 */
var Body_applyLocalForce_worldForce = new Vec3();
var Body_applyLocalForce_worldPoint = new Vec3();
Body.prototype.applyLocalForce = function(localForce, localPoint){
    if(this.type !== Body.DYNAMIC){
        return;
    }

    var worldForce = Body_applyLocalForce_worldForce;
    var worldPoint = Body_applyLocalForce_worldPoint;

    // Transform the force vector to world space
    this.vectorToWorldFrame(localForce, worldForce);
    this.pointToWorldFrame(localPoint, worldPoint);

    this.applyForce(worldForce, worldPoint);
};

/**
 * Apply impulse to a world point. This could for example be a point on the Body surface. An impulse is a force added to a body during a short period of time (impulse = force * time). Impulses will be added to Body.velocity and Body.angularVelocity.
 * @method applyImpulse
 * @param  {Vec3} impulse The amount of impulse to add.
 * @param  {Vec3} worldPoint A world point to apply the force on.
 */
var Body_applyImpulse_r = new Vec3();
var Body_applyImpulse_velo = new Vec3();
var Body_applyImpulse_rotVelo = new Vec3();
Body.prototype.applyImpulse = function(impulse, worldPoint){
    if(this.type !== Body.DYNAMIC){
        return;
    }

    // Compute point position relative to the body center
    var r = Body_applyImpulse_r;
    worldPoint.vsub(this.position,r);

    // Compute produced central impulse velocity
    var velo = Body_applyImpulse_velo;
    velo.copy(impulse);
    velo.mult(this.invMass,velo);

    // Add linear impulse
    this.velocity.vadd(velo, this.velocity);

    // Compute produced rotational impulse velocity
    var rotVelo = Body_applyImpulse_rotVelo;
    r.cross(impulse,rotVelo);

    /*
    rotVelo.x *= this.invInertia.x;
    rotVelo.y *= this.invInertia.y;
    rotVelo.z *= this.invInertia.z;
    */
    this.invInertiaWorld.vmult(rotVelo,rotVelo);

    // Add rotational Impulse
    this.angularVelocity.vadd(rotVelo, this.angularVelocity);
};

/**
 * Apply locally-defined impulse to a local point in the body.
 * @method applyLocalImpulse
 * @param  {Vec3} force The force vector to apply, defined locally in the body frame.
 * @param  {Vec3} localPoint A local point in the body to apply the force on.
 */
var Body_applyLocalImpulse_worldImpulse = new Vec3();
var Body_applyLocalImpulse_worldPoint = new Vec3();
Body.prototype.applyLocalImpulse = function(localImpulse, localPoint){
    if(this.type !== Body.DYNAMIC){
        return;
    }

    var worldImpulse = Body_applyLocalImpulse_worldImpulse;
    var worldPoint = Body_applyLocalImpulse_worldPoint;

    // Transform the force vector to world space
    this.vectorToWorldFrame(localImpulse, worldImpulse);
    this.pointToWorldFrame(localPoint, worldPoint);

    this.applyImpulse(worldImpulse, worldPoint);
};

var Body_updateMassProperties_halfExtents = new Vec3();

/**
 * Should be called whenever you change the body shape or mass.
 * @method updateMassProperties
 */
Body.prototype.updateMassProperties = function(){
    var halfExtents = Body_updateMassProperties_halfExtents;

    this.invMass = this.mass > 0 ? 1.0 / this.mass : 0;
    var I = this.inertia;
    var fixed = this.fixedRotation;

    // Approximate with AABB box
    this.computeAABB();
    halfExtents.set(
        (this.aabb.upperBound.x-this.aabb.lowerBound.x) / 2,
        (this.aabb.upperBound.y-this.aabb.lowerBound.y) / 2,
        (this.aabb.upperBound.z-this.aabb.lowerBound.z) / 2
    );
    Box.calculateInertia(halfExtents, this.mass, I);

    this.invInertia.set(
        I.x > 0 && !fixed ? 1.0 / I.x : 0,
        I.y > 0 && !fixed ? 1.0 / I.y : 0,
        I.z > 0 && !fixed ? 1.0 / I.z : 0
    );
    this.updateInertiaWorld(true);
};

/**
 * Get world velocity of a point in the body.
 * @method getVelocityAtWorldPoint
 * @param  {Vec3} worldPoint
 * @param  {Vec3} result
 * @return {Vec3} The result vector.
 */
Body.prototype.getVelocityAtWorldPoint = function(worldPoint, result){
    var r = new Vec3();
    worldPoint.vsub(this.position, r);
    this.angularVelocity.cross(r, result);
    this.velocity.vadd(result, result);
    return result;
};

},{"../collision/AABB":3,"../material/Material":25,"../math/Mat3":27,"../math/Quaternion":28,"../math/Vec3":30,"../shapes/Box":37,"../shapes/Shape":43,"../utils/EventTarget":49}],32:[function(_dereq_,module,exports){
var Body = _dereq_('./Body');
var Vec3 = _dereq_('../math/Vec3');
var Quaternion = _dereq_('../math/Quaternion');
var RaycastResult = _dereq_('../collision/RaycastResult');
var Ray = _dereq_('../collision/Ray');
var WheelInfo = _dereq_('../objects/WheelInfo');

module.exports = RaycastVehicle;

/**
 * Vehicle helper class that casts rays from the wheel positions towards the ground and applies forces.
 * @class RaycastVehicle
 * @constructor
 * @param {object} [options]
 * @param {Body} [options.chassisBody] The car chassis body.
 * @param {integer} [options.indexRightAxis] Axis to use for right. x=0, y=1, z=2
 * @param {integer} [options.indexLeftAxis]
 * @param {integer} [options.indexUpAxis]
 */
function RaycastVehicle(options){

    /**
     * @property {Body} chassisBody
     */
    this.chassisBody = options.chassisBody;

    /**
     * An array of WheelInfo objects.
     * @property {array} wheelInfos
     */
    this.wheelInfos = [];

    /**
     * Will be set to true if the car is sliding.
     * @property {boolean} sliding
     */
    this.sliding = false;

    /**
     * @property {World} world
     */
    this.world = null;

    /**
     * Index of the right axis, 0=x, 1=y, 2=z
     * @property {integer} indexRightAxis
     * @default 1
     */
    this.indexRightAxis = typeof(options.indexRightAxis) !== 'undefined' ? options.indexRightAxis : 1;

    /**
     * Index of the forward axis, 0=x, 1=y, 2=z
     * @property {integer} indexForwardAxis
     * @default 0
     */
    this.indexForwardAxis = typeof(options.indexForwardAxis) !== 'undefined' ? options.indexForwardAxis : 0;

    /**
     * Index of the up axis, 0=x, 1=y, 2=z
     * @property {integer} indexUpAxis
     * @default 2
     */
    this.indexUpAxis = typeof(options.indexUpAxis) !== 'undefined' ? options.indexUpAxis : 2;
}

var tmpVec1 = new Vec3();
var tmpVec2 = new Vec3();
var tmpVec3 = new Vec3();
var tmpVec4 = new Vec3();
var tmpVec5 = new Vec3();
var tmpVec6 = new Vec3();
var tmpRay = new Ray();

/**
 * Add a wheel. For information about the options, see WheelInfo.
 * @method addWheel
 * @param {object} [options]
 */
RaycastVehicle.prototype.addWheel = function(options){
    options = options || {};

    var info = new WheelInfo(options);
    var index = this.wheelInfos.length;
    this.wheelInfos.push(info);

    return index;
};

/**
 * Set the steering value of a wheel.
 * @method setSteeringValue
 * @param {number} value
 * @param {integer} wheelIndex
 */
RaycastVehicle.prototype.setSteeringValue = function(value, wheelIndex){
    var wheel = this.wheelInfos[wheelIndex];
    wheel.steering = value;
};

var torque = new Vec3();

/**
 * Set the wheel force to apply on one of the wheels each time step
 * @method applyEngineForce
 * @param  {number} value
 * @param  {integer} wheelIndex
 */
RaycastVehicle.prototype.applyEngineForce = function(value, wheelIndex){
    this.wheelInfos[wheelIndex].engineForce = value;
};

/**
 * Set the braking force of a wheel
 * @method setBrake
 * @param {number} brake
 * @param {integer} wheelIndex
 */
RaycastVehicle.prototype.setBrake = function(brake, wheelIndex){
    this.wheelInfos[wheelIndex].brake = brake;
};

/**
 * Add the vehicle including its constraints to the world.
 * @method addToWorld
 * @param {World} world
 */
RaycastVehicle.prototype.addToWorld = function(world){
    var constraints = this.constraints;
    world.add(this.chassisBody);
    var that = this;
    this.preStepCallback = function(){
        that.updateVehicle(world.dt);
    };
    world.addEventListener('preStep', this.preStepCallback);
    this.world = world;
};

/**
 * Get one of the wheel axles, world-oriented.
 * @private
 * @method getVehicleAxisWorld
 * @param  {integer} axisIndex
 * @param  {Vec3} result
 */
RaycastVehicle.prototype.getVehicleAxisWorld = function(axisIndex, result){
    result.set(
        axisIndex === 0 ? 1 : 0,
        axisIndex === 1 ? 1 : 0,
        axisIndex === 2 ? 1 : 0
    );
    this.chassisBody.vectorToWorldFrame(result, result);
};

RaycastVehicle.prototype.updateVehicle = function(timeStep){
    var wheelInfos = this.wheelInfos;
    var numWheels = wheelInfos.length;
    var chassisBody = this.chassisBody;

    for (var i = 0; i < numWheels; i++) {
        this.updateWheelTransform(i);
    }

    this.currentVehicleSpeedKmHour = 3.6 * chassisBody.velocity.norm();

    var forwardWorld = new Vec3();
    this.getVehicleAxisWorld(this.indexForwardAxis, forwardWorld);

    if (forwardWorld.dot(chassisBody.velocity) < 0){
        this.currentVehicleSpeedKmHour *= -1;
    }

    // simulate suspension
    for (var i = 0; i < numWheels; i++) {
        this.castRay(wheelInfos[i]);
    }

    this.updateSuspension(timeStep);

    var impulse = new Vec3();
    var relpos = new Vec3();
    for (var i = 0; i < numWheels; i++) {
        //apply suspension force
        var wheel = wheelInfos[i];
        var suspensionForce = wheel.suspensionForce;
        if (suspensionForce > wheel.maxSuspensionForce) {
            suspensionForce = wheel.maxSuspensionForce;
        }
        wheel.raycastResult.hitNormalWorld.scale(suspensionForce * timeStep, impulse);

        wheel.raycastResult.hitPointWorld.vsub(chassisBody.position, relpos);
        chassisBody.applyImpulse(impulse, wheel.raycastResult.hitPointWorld/*relpos*/);
    }

    this.updateFriction(timeStep);

    var hitNormalWorldScaledWithProj = new Vec3();
    var fwd  = new Vec3();
    var vel = new Vec3();
    for (i = 0; i < numWheels; i++) {
        var wheel = wheelInfos[i];
        //var relpos = new Vec3();
        //wheel.chassisConnectionPointWorld.vsub(chassisBody.position, relpos);
        chassisBody.getVelocityAtWorldPoint(wheel.chassisConnectionPointWorld, vel);

        // Hack to get the rotation in the correct direction
        var m = 1;
        switch(this.indexUpAxis){
        case 1:
            m = -1;
            break;
        }

        if (wheel.isInContact) {

            this.getVehicleAxisWorld(this.indexForwardAxis, fwd);
            var proj = fwd.dot(wheel.raycastResult.hitNormalWorld);
            wheel.raycastResult.hitNormalWorld.scale(proj, hitNormalWorldScaledWithProj);

            fwd.vsub(hitNormalWorldScaledWithProj, fwd);

            var proj2 = fwd.dot(vel);
            wheel.deltaRotation = m * proj2 * timeStep / wheel.radius;
        }

        if((wheel.sliding || !wheel.isInContact) && wheel.engineForce !== 0 && wheel.useCustomSlidingRotationalSpeed){
            // Apply custom rotation when accelerating and sliding
            wheel.deltaRotation = (wheel.engineForce > 0 ? 1 : -1) * wheel.customSlidingRotationalSpeed * timeStep;
        }

        // Lock wheels
        if(Math.abs(wheel.brake) > Math.abs(wheel.engineForce)){
            wheel.deltaRotation = 0;
        }

        wheel.rotation += wheel.deltaRotation; // Use the old value
        wheel.deltaRotation *= 0.99; // damping of rotation when not in contact
    }
};

RaycastVehicle.prototype.updateSuspension = function(deltaTime) {
    var chassisBody = this.chassisBody;
    var chassisMass = chassisBody.mass;
    var wheelInfos = this.wheelInfos;
    var numWheels = wheelInfos.length;

    for (var w_it = 0; w_it < numWheels; w_it++){
        var wheel = wheelInfos[w_it];

        if (wheel.isInContact){
            var force;

            // Spring
            var susp_length = wheel.suspensionRestLength;
            var current_length = wheel.suspensionLength;
            var length_diff = (susp_length - current_length);

            force = wheel.suspensionStiffness * length_diff * wheel.clippedInvContactDotSuspension;

            // Damper
            var projected_rel_vel = wheel.suspensionRelativeVelocity;
            var susp_damping;
            if (projected_rel_vel < 0) {
                susp_damping = wheel.dampingCompression;
            } else {
                susp_damping = wheel.dampingRelaxation;
            }
            force -= susp_damping * projected_rel_vel;

            wheel.suspensionForce = force * chassisMass;
            if (wheel.suspensionForce < 0) {
                wheel.suspensionForce = 0;
            }
        } else {
            wheel.suspensionForce = 0;
        }
    }
};

/**
 * Remove the vehicle including its constraints from the world.
 * @method removeFromWorld
 * @param {World} world
 */
RaycastVehicle.prototype.removeFromWorld = function(world){
    var constraints = this.constraints;
    world.remove(this.chassisBody);
    world.removeEventListener('preStep', this.preStepCallback);
    this.world = null;
};

var castRay_rayvector = new Vec3();
var castRay_target = new Vec3();
RaycastVehicle.prototype.castRay = function(wheel) {
    var rayvector = castRay_rayvector;
    var target = castRay_target;

    this.updateWheelTransformWorld(wheel);
    var chassisBody = this.chassisBody;

    var depth = -1;

    var raylen = wheel.suspensionRestLength + wheel.radius;

    wheel.directionWorld.scale(raylen, rayvector);
    var source = wheel.chassisConnectionPointWorld;
    source.vadd(rayvector, target);
    var raycastResult = wheel.raycastResult;

    var param = 0;

    raycastResult.reset();
    // Turn off ray collision with the chassis temporarily
    var oldState = chassisBody.collisionResponse;
    chassisBody.collisionResponse = false;

    // Cast ray against world
    this.world.rayTest(source, target, raycastResult);
    chassisBody.collisionResponse = oldState;

    var object = raycastResult.body;

    wheel.raycastResult.groundObject = 0;

    if (object) {
        depth = raycastResult.distance;
        wheel.raycastResult.hitNormalWorld  = raycastResult.hitNormalWorld;
        wheel.isInContact = true;

        var hitDistance = raycastResult.distance;
        wheel.suspensionLength = hitDistance - wheel.radius;

        // clamp on max suspension travel
        var minSuspensionLength = wheel.suspensionRestLength - wheel.maxSuspensionTravel;
        var maxSuspensionLength = wheel.suspensionRestLength + wheel.maxSuspensionTravel;
        if (wheel.suspensionLength < minSuspensionLength) {
            wheel.suspensionLength = minSuspensionLength;
        }
        if (wheel.suspensionLength > maxSuspensionLength) {
            wheel.suspensionLength = maxSuspensionLength;
            wheel.raycastResult.reset();
        }

        var denominator = wheel.raycastResult.hitNormalWorld.dot(wheel.directionWorld);

        var chassis_velocity_at_contactPoint = new Vec3();
        chassisBody.getVelocityAtWorldPoint(wheel.raycastResult.hitPointWorld, chassis_velocity_at_contactPoint);

        var projVel = wheel.raycastResult.hitNormalWorld.dot( chassis_velocity_at_contactPoint );

        if (denominator >= -0.1) {
            wheel.suspensionRelativeVelocity = 0;
            wheel.clippedInvContactDotSuspension = 1 / 0.1;
        } else {
            var inv = -1 / denominator;
            wheel.suspensionRelativeVelocity = projVel * inv;
            wheel.clippedInvContactDotSuspension = inv;
        }

    } else {

        //put wheel info as in rest position
        wheel.suspensionLength = wheel.suspensionRestLength + 0 * wheel.maxSuspensionTravel;
        wheel.suspensionRelativeVelocity = 0.0;
        wheel.directionWorld.scale(-1, wheel.raycastResult.hitNormalWorld);
        wheel.clippedInvContactDotSuspension = 1.0;
    }

    return depth;
};

RaycastVehicle.prototype.updateWheelTransformWorld = function(wheel){
    wheel.isInContact = false;
    var chassisBody = this.chassisBody;
    chassisBody.pointToWorldFrame(wheel.chassisConnectionPointLocal, wheel.chassisConnectionPointWorld);
    chassisBody.vectorToWorldFrame(wheel.directionLocal, wheel.directionWorld);
    chassisBody.vectorToWorldFrame(wheel.axleLocal, wheel.axleWorld);
};


/**
 * Update one of the wheel transform.
 * Note when rendering wheels: during each step, wheel transforms are updated BEFORE the chassis; ie. their position becomes invalid after the step. Thus when you render wheels, you must update wheel transforms before rendering them. See raycastVehicle demo for an example.
 * @method updateWheelTransform
 * @param {integer} wheelIndex The wheel index to update.
 */
RaycastVehicle.prototype.updateWheelTransform = function(wheelIndex){
    var up = tmpVec4;
    var right = tmpVec5;
    var fwd = tmpVec6;

    var wheel = this.wheelInfos[wheelIndex];
    this.updateWheelTransformWorld(wheel);

    wheel.directionLocal.scale(-1, up);
    right.copy(wheel.axleLocal);
    up.cross(right, fwd);
    fwd.normalize();
    right.normalize();

    // Rotate around steering over the wheelAxle
    var steering = wheel.steering;
    var steeringOrn = new Quaternion();
    steeringOrn.setFromAxisAngle(up, steering);

    var rotatingOrn = new Quaternion();
    rotatingOrn.setFromAxisAngle(right, wheel.rotation);

    // World rotation of the wheel
    var q = wheel.worldTransform.quaternion;
    this.chassisBody.quaternion.mult(steeringOrn, q);
    q.mult(rotatingOrn, q);

    q.normalize();

    // world position of the wheel
    var p = wheel.worldTransform.position;
    p.copy(wheel.directionWorld);
    p.scale(wheel.suspensionLength, p);
    p.vadd(wheel.chassisConnectionPointWorld, p);
};

var directions = [
    new Vec3(1, 0, 0),
    new Vec3(0, 1, 0),
    new Vec3(0, 0, 1)
];

/**
 * Get the world transform of one of the wheels
 * @method getWheelTransformWorld
 * @param  {integer} wheelIndex
 * @return {Transform}
 */
RaycastVehicle.prototype.getWheelTransformWorld = function(wheelIndex) {
    return this.wheelInfos[wheelIndex].worldTransform;
};


var updateFriction_surfNormalWS_scaled_proj = new Vec3();
var updateFriction_axle = [];
var updateFriction_forwardWS = [];
var sideFrictionStiffness2 = 1;
RaycastVehicle.prototype.updateFriction = function(timeStep) {
    var surfNormalWS_scaled_proj = updateFriction_surfNormalWS_scaled_proj;

    //calculate the impulse, so that the wheels don't move sidewards
    var wheelInfos = this.wheelInfos;
    var numWheels = wheelInfos.length;
    var chassisBody = this.chassisBody;
    var forwardWS = updateFriction_forwardWS;
    var axle = updateFriction_axle;

    var numWheelsOnGround = 0;

    for (var i = 0; i < numWheels; i++) {
        var wheel = wheelInfos[i];

        var groundObject = wheel.raycastResult.body;
        if (groundObject){
            numWheelsOnGround++;
        }

        wheel.sideImpulse = 0;
        wheel.forwardImpulse = 0;
        if(!forwardWS[i]){
            forwardWS[i] = new Vec3();
        }
        if(!axle[i]){
            axle[i] = new Vec3();
        }
    }

    for (var i = 0; i < numWheels; i++){
        var wheel = wheelInfos[i];

        var groundObject = wheel.raycastResult.body;

        if (groundObject) {
            var axlei = axle[i];
            var wheelTrans = this.getWheelTransformWorld(i);

            // Get world axle
            wheelTrans.vectorToWorldFrame(directions[this.indexRightAxis], axlei);

            var surfNormalWS = wheel.raycastResult.hitNormalWorld;
            var proj = axlei.dot(surfNormalWS);
            surfNormalWS.scale(proj, surfNormalWS_scaled_proj);
            axlei.vsub(surfNormalWS_scaled_proj, axlei);
            axlei.normalize();

            surfNormalWS.cross(axlei, forwardWS[i]);
            forwardWS[i].normalize();

            wheel.sideImpulse = resolveSingleBilateral(
                chassisBody,
                wheel.raycastResult.hitPointWorld,
                groundObject,
                wheel.raycastResult.hitPointWorld,
                axlei
            );

            wheel.sideImpulse *= sideFrictionStiffness2;
        }
    }

    var sideFactor = 1;
    var fwdFactor = 0.5;

    this.sliding = false;
    for (var i = 0; i < numWheels; i++) {
        var wheel = wheelInfos[i];
        var groundObject = wheel.raycastResult.body;

        var rollingFriction = 0;

        wheel.slipInfo = 1;
        if (groundObject) {
            var defaultRollingFrictionImpulse = 0;
            var maxImpulse = wheel.brake ? wheel.brake : defaultRollingFrictionImpulse;

            // btWheelContactPoint contactPt(chassisBody,groundObject,wheelInfraycastInfo.hitPointWorld,forwardWS[wheel],maxImpulse);
            // rollingFriction = calcRollingFriction(contactPt);
            rollingFriction = calcRollingFriction(chassisBody, groundObject, wheel.raycastResult.hitPointWorld, forwardWS[i], maxImpulse);

            rollingFriction += wheel.engineForce * timeStep;

            // rollingFriction = 0;
            var factor = maxImpulse / rollingFriction;
            wheel.slipInfo *= factor;
        }

        //switch between active rolling (throttle), braking and non-active rolling friction (nthrottle/break)

        wheel.forwardImpulse = 0;
        wheel.skidInfo = 1;

        if (groundObject) {
            wheel.skidInfo = 1;

            var maximp = wheel.suspensionForce * timeStep * wheel.frictionSlip;
            var maximpSide = maximp;

            var maximpSquared = maximp * maximpSide;

            wheel.forwardImpulse = rollingFriction;//wheelInfo.engineForce* timeStep;

            var x = wheel.forwardImpulse * fwdFactor;
            var y = wheel.sideImpulse * sideFactor;

            var impulseSquared = x * x + y * y;

            wheel.sliding = false;
            if (impulseSquared > maximpSquared) {
                this.sliding = true;
                wheel.sliding = true;

                var factor = maximp / Math.sqrt(impulseSquared);

                wheel.skidInfo *= factor;
            }
        }
    }

    if (this.sliding) {
        for (var i = 0; i < numWheels; i++) {
            var wheel = wheelInfos[i];
            if (wheel.sideImpulse !== 0) {
                if (wheel.skidInfo < 1){
                    wheel.forwardImpulse *= wheel.skidInfo;
                    wheel.sideImpulse *= wheel.skidInfo;
                }
            }
        }
    }

    // apply the impulses
    for (var i = 0; i < numWheels; i++) {
        var wheel = wheelInfos[i];

        var rel_pos = new Vec3();
        //wheel.raycastResult.hitPointWorld.vsub(chassisBody.position, rel_pos);
        // cannons applyimpulse is using world coord for the position
        rel_pos.copy(wheel.raycastResult.hitPointWorld);

        if (wheel.forwardImpulse !== 0) {
            var impulse = new Vec3();
            forwardWS[i].scale(wheel.forwardImpulse, impulse);
            chassisBody.applyImpulse(impulse, rel_pos);
        }

        if (wheel.sideImpulse !== 0){
            var groundObject = wheel.raycastResult.body;

            var rel_pos2 = new Vec3();
            //wheel.raycastResult.hitPointWorld.vsub(groundObject.position, rel_pos2);
            rel_pos2.copy(wheel.raycastResult.hitPointWorld);
            var sideImp = new Vec3();
            axle[i].scale(wheel.sideImpulse, sideImp);

            // Scale the relative position in the up direction with rollInfluence.
            // If rollInfluence is 1, the impulse will be applied on the hitPoint (easy to roll over), if it is zero it will be applied in the same plane as the center of mass (not easy to roll over).
            chassisBody.pointToLocalFrame(rel_pos, rel_pos);
            rel_pos['xyz'[this.indexUpAxis]] *= wheel.rollInfluence;
            chassisBody.pointToWorldFrame(rel_pos, rel_pos);
            chassisBody.applyImpulse(sideImp, rel_pos);

            //apply friction impulse on the ground
            sideImp.scale(-1, sideImp);
            groundObject.applyImpulse(sideImp, rel_pos2);
        }
    }
};

var calcRollingFriction_vel1 = new Vec3();
var calcRollingFriction_vel2 = new Vec3();
var calcRollingFriction_vel = new Vec3();

function calcRollingFriction(body0, body1, frictionPosWorld, frictionDirectionWorld, maxImpulse) {
    var j1 = 0;
    var contactPosWorld = frictionPosWorld;

    // var rel_pos1 = new Vec3();
    // var rel_pos2 = new Vec3();
    var vel1 = calcRollingFriction_vel1;
    var vel2 = calcRollingFriction_vel2;
    var vel = calcRollingFriction_vel;
    // contactPosWorld.vsub(body0.position, rel_pos1);
    // contactPosWorld.vsub(body1.position, rel_pos2);

    body0.getVelocityAtWorldPoint(contactPosWorld, vel1);
    body1.getVelocityAtWorldPoint(contactPosWorld, vel2);
    vel1.vsub(vel2, vel);

    var vrel = frictionDirectionWorld.dot(vel);

    var denom0 = computeImpulseDenominator(body0, frictionPosWorld, frictionDirectionWorld);
    var denom1 = computeImpulseDenominator(body1, frictionPosWorld, frictionDirectionWorld);
    var relaxation = 1;
    var jacDiagABInv = relaxation / (denom0 + denom1);

    // calculate j that moves us to zero relative velocity
    j1 = -vrel * jacDiagABInv;

    if (maxImpulse < j1) {
        j1 = maxImpulse;
    }
    if (j1 < -maxImpulse) {
        j1 = -maxImpulse;
    }

    return j1;
}

var computeImpulseDenominator_r0 = new Vec3();
var computeImpulseDenominator_c0 = new Vec3();
var computeImpulseDenominator_vec = new Vec3();
var computeImpulseDenominator_m = new Vec3();
function computeImpulseDenominator(body, pos, normal) {
    var r0 = computeImpulseDenominator_r0;
    var c0 = computeImpulseDenominator_c0;
    var vec = computeImpulseDenominator_vec;
    var m = computeImpulseDenominator_m;

    pos.vsub(body.position, r0);
    r0.cross(normal, c0);
    body.invInertiaWorld.vmult(c0, m);
    m.cross(r0, vec);

    return body.invMass + normal.dot(vec);
}


var resolveSingleBilateral_vel1 = new Vec3();
var resolveSingleBilateral_vel2 = new Vec3();
var resolveSingleBilateral_vel = new Vec3();

//bilateral constraint between two dynamic objects
function resolveSingleBilateral(body1, pos1, body2, pos2, normal, impulse){
    var normalLenSqr = normal.norm2();
    if (normalLenSqr > 1.1){
        return 0; // no impulse
    }
    // var rel_pos1 = new Vec3();
    // var rel_pos2 = new Vec3();
    // pos1.vsub(body1.position, rel_pos1);
    // pos2.vsub(body2.position, rel_pos2);

    var vel1 = resolveSingleBilateral_vel1;
    var vel2 = resolveSingleBilateral_vel2;
    var vel = resolveSingleBilateral_vel;
    body1.getVelocityAtWorldPoint(pos1, vel1);
    body2.getVelocityAtWorldPoint(pos2, vel2);

    vel1.vsub(vel2, vel);

    var rel_vel = normal.dot(vel);

    var contactDamping = 0.2;
    var massTerm = 1 / (body1.invMass + body2.invMass);
    var impulse = - contactDamping * rel_vel * massTerm;

    return impulse;
}
},{"../collision/Ray":9,"../collision/RaycastResult":10,"../math/Quaternion":28,"../math/Vec3":30,"../objects/WheelInfo":36,"./Body":31}],33:[function(_dereq_,module,exports){
var Body = _dereq_('./Body');
var Sphere = _dereq_('../shapes/Sphere');
var Box = _dereq_('../shapes/Box');
var Vec3 = _dereq_('../math/Vec3');
var HingeConstraint = _dereq_('../constraints/HingeConstraint');

module.exports = RigidVehicle;

/**
 * Simple vehicle helper class with spherical rigid body wheels.
 * @class RigidVehicle
 * @constructor
 * @param {Body} [options.chassisBody]
 */
function RigidVehicle(options){
    this.wheelBodies = [];

    /**
     * @property coordinateSystem
     * @type {Vec3}
     */
    this.coordinateSystem = typeof(options.coordinateSystem)==='undefined' ? new Vec3(1, 2, 3) : options.coordinateSystem.clone();

    /**
     * @property {Body} chassisBody
     */
    this.chassisBody = options.chassisBody;

    if(!this.chassisBody){
        // No chassis body given. Create it!
        var chassisShape = new Box(new Vec3(5, 2, 0.5));
        this.chassisBody = new Body(1, chassisShape);
    }

    /**
     * @property constraints
     * @type {Array}
     */
    this.constraints = [];

    this.wheelAxes = [];
    this.wheelForces = [];
}

/**
 * Add a wheel
 * @method addWheel
 * @param {object} options
 * @param {boolean} [options.isFrontWheel]
 * @param {Vec3} [options.position] Position of the wheel, locally in the chassis body.
 * @param {Vec3} [options.direction] Slide direction of the wheel along the suspension.
 * @param {Vec3} [options.axis] Axis of rotation of the wheel, locally defined in the chassis.
 * @param {Body} [options.body] The wheel body.
 */
RigidVehicle.prototype.addWheel = function(options){
    options = options || {};
    var wheelBody = options.body;
    if(!wheelBody){
        wheelBody =  new Body(1, new Sphere(1.2));
    }
    this.wheelBodies.push(wheelBody);
    this.wheelForces.push(0);

    // Position constrain wheels
    var zero = new Vec3();
    var position = typeof(options.position) !== 'undefined' ? options.position.clone() : new Vec3();

    // Set position locally to the chassis
    var worldPosition = new Vec3();
    this.chassisBody.pointToWorldFrame(position, worldPosition);
    wheelBody.position.set(worldPosition.x, worldPosition.y, worldPosition.z);

    // Constrain wheel
    var axis = typeof(options.axis) !== 'undefined' ? options.axis.clone() : new Vec3(0, 1, 0);
    this.wheelAxes.push(axis);

    var hingeConstraint = new HingeConstraint(this.chassisBody, wheelBody, {
        pivotA: position,
        axisA: axis,
        pivotB: Vec3.ZERO,
        axisB: axis,
        collideConnected: false
    });
    this.constraints.push(hingeConstraint);

    return this.wheelBodies.length - 1;
};

/**
 * Set the steering value of a wheel.
 * @method setSteeringValue
 * @param {number} value
 * @param {integer} wheelIndex
 * @todo check coordinateSystem
 */
RigidVehicle.prototype.setSteeringValue = function(value, wheelIndex){
    // Set angle of the hinge axis
    var axis = this.wheelAxes[wheelIndex];

    var c = Math.cos(value),
        s = Math.sin(value),
        x = axis.x,
        y = axis.y;
    this.constraints[wheelIndex].axisA.set(
        c*x -s*y,
        s*x +c*y,
        0
    );
};

/**
 * Set the target rotational speed of the hinge constraint.
 * @method setMotorSpeed
 * @param {number} value
 * @param {integer} wheelIndex
 */
RigidVehicle.prototype.setMotorSpeed = function(value, wheelIndex){
    var hingeConstraint = this.constraints[wheelIndex];
    hingeConstraint.enableMotor();
    hingeConstraint.motorTargetVelocity = value;
};

/**
 * Set the target rotational speed of the hinge constraint.
 * @method disableMotor
 * @param {number} value
 * @param {integer} wheelIndex
 */
RigidVehicle.prototype.disableMotor = function(wheelIndex){
    var hingeConstraint = this.constraints[wheelIndex];
    hingeConstraint.disableMotor();
};

var torque = new Vec3();

/**
 * Set the wheel force to apply on one of the wheels each time step
 * @method setWheelForce
 * @param  {number} value
 * @param  {integer} wheelIndex
 */
RigidVehicle.prototype.setWheelForce = function(value, wheelIndex){
    this.wheelForces[wheelIndex] = value;
};

/**
 * Apply a torque on one of the wheels.
 * @method applyWheelForce
 * @param  {number} value
 * @param  {integer} wheelIndex
 */
RigidVehicle.prototype.applyWheelForce = function(value, wheelIndex){
    var axis = this.wheelAxes[wheelIndex];
    var wheelBody = this.wheelBodies[wheelIndex];
    var bodyTorque = wheelBody.torque;

    axis.scale(value, torque);
    wheelBody.vectorToWorldFrame(torque, torque);
    bodyTorque.vadd(torque, bodyTorque);
};

/**
 * Add the vehicle including its constraints to the world.
 * @method addToWorld
 * @param {World} world
 */
RigidVehicle.prototype.addToWorld = function(world){
    var constraints = this.constraints;
    var bodies = this.wheelBodies.concat([this.chassisBody]);

    for (var i = 0; i < bodies.length; i++) {
        world.add(bodies[i]);
    }

    for (var i = 0; i < constraints.length; i++) {
        world.addConstraint(constraints[i]);
    }

    world.addEventListener('preStep', this._update.bind(this));
};

RigidVehicle.prototype._update = function(){
    var wheelForces = this.wheelForces;
    for (var i = 0; i < wheelForces.length; i++) {
        this.applyWheelForce(wheelForces[i], i);
    }
};

/**
 * Remove the vehicle including its constraints from the world.
 * @method removeFromWorld
 * @param {World} world
 */
RigidVehicle.prototype.removeFromWorld = function(world){
    var constraints = this.constraints;
    var bodies = this.wheelBodies.concat([this.chassisBody]);

    for (var i = 0; i < bodies.length; i++) {
        world.remove(bodies[i]);
    }

    for (var i = 0; i < constraints.length; i++) {
        world.removeConstraint(constraints[i]);
    }
};

var worldAxis = new Vec3();

/**
 * Get current rotational velocity of a wheel
 * @method getWheelSpeed
 * @param {integer} wheelIndex
 */
RigidVehicle.prototype.getWheelSpeed = function(wheelIndex){
    var axis = this.wheelAxes[wheelIndex];
    var wheelBody = this.wheelBodies[wheelIndex];
    var w = wheelBody.angularVelocity;
    this.chassisBody.vectorToWorldFrame(axis, worldAxis);
    return w.dot(worldAxis);
};

},{"../constraints/HingeConstraint":15,"../math/Vec3":30,"../shapes/Box":37,"../shapes/Sphere":44,"./Body":31}],34:[function(_dereq_,module,exports){
module.exports = SPHSystem;

var Shape = _dereq_('../shapes/Shape');
var Vec3 = _dereq_('../math/Vec3');
var Quaternion = _dereq_('../math/Quaternion');
var Particle = _dereq_('../shapes/Particle');
var Body = _dereq_('../objects/Body');
var Material = _dereq_('../material/Material');

/**
 * Smoothed-particle hydrodynamics system
 * @class SPHSystem
 * @constructor
 */
function SPHSystem(){
    this.particles = [];
	
    /**
     * Density of the system (kg/m3).
     * @property {number} density
     */
    this.density = 1;
	
    /**
     * Distance below which two particles are considered to be neighbors.
     * It should be adjusted so there are about 15-20 neighbor particles within this radius.
     * @property {number} smoothingRadius
     */
    this.smoothingRadius = 1;
    this.speedOfSound = 1;
	
    /**
     * Viscosity of the system.
     * @property {number} viscosity
     */
    this.viscosity = 0.01;
    this.eps = 0.000001;

    // Stuff Computed per particle
    this.pressures = [];
    this.densities = [];
    this.neighbors = [];
}

/**
 * Add a particle to the system.
 * @method add
 * @param {Body} particle
 */
SPHSystem.prototype.add = function(particle){
    this.particles.push(particle);
    if(this.neighbors.length < this.particles.length){
        this.neighbors.push([]);
    }
};

/**
 * Remove a particle from the system.
 * @method remove
 * @param {Body} particle
 */
SPHSystem.prototype.remove = function(particle){
    var idx = this.particles.indexOf(particle);
    if(idx !== -1){
        this.particles.splice(idx,1);
        if(this.neighbors.length > this.particles.length){
            this.neighbors.pop();
        }
    }
};

/**
 * Get neighbors within smoothing volume, save in the array neighbors
 * @method getNeighbors
 * @param {Body} particle
 * @param {Array} neighbors
 */
var SPHSystem_getNeighbors_dist = new Vec3();
SPHSystem.prototype.getNeighbors = function(particle,neighbors){
    var N = this.particles.length,
        id = particle.id,
        R2 = this.smoothingRadius * this.smoothingRadius,
        dist = SPHSystem_getNeighbors_dist;
    for(var i=0; i!==N; i++){
        var p = this.particles[i];
        p.position.vsub(particle.position,dist);
        if(id!==p.id && dist.norm2() < R2){
            neighbors.push(p);
        }
    }
};

// Temp vectors for calculation
var SPHSystem_update_dist = new Vec3(),
    SPHSystem_update_a_pressure = new Vec3(),
    SPHSystem_update_a_visc = new Vec3(),
    SPHSystem_update_gradW = new Vec3(),
    SPHSystem_update_r_vec = new Vec3(),
    SPHSystem_update_u = new Vec3(); // Relative velocity
SPHSystem.prototype.update = function(){
    var N = this.particles.length,
        dist = SPHSystem_update_dist,
        cs = this.speedOfSound,
        eps = this.eps;

    for(var i=0; i!==N; i++){
        var p = this.particles[i]; // Current particle
        var neighbors = this.neighbors[i];

        // Get neighbors
        neighbors.length = 0;
        this.getNeighbors(p,neighbors);
        neighbors.push(this.particles[i]); // Add current too
        var numNeighbors = neighbors.length;

        // Accumulate density for the particle
        var sum = 0.0;
        for(var j=0; j!==numNeighbors; j++){

            //printf("Current particle has position %f %f %f\n",objects[id].pos.x(),objects[id].pos.y(),objects[id].pos.z());
            p.position.vsub(neighbors[j].position, dist);
            var len = dist.norm();

            var weight = this.w(len);
            sum += neighbors[j].mass * weight;
        }

        // Save
        this.densities[i] = sum;
        this.pressures[i] = cs * cs * (this.densities[i] - this.density);
    }

    // Add forces

    // Sum to these accelerations
    var a_pressure= SPHSystem_update_a_pressure;
    var a_visc =    SPHSystem_update_a_visc;
    var gradW =     SPHSystem_update_gradW;
    var r_vec =     SPHSystem_update_r_vec;
    var u =         SPHSystem_update_u;

    for(var i=0; i!==N; i++){

        var particle = this.particles[i];

        a_pressure.set(0,0,0);
        a_visc.set(0,0,0);

        // Init vars
        var Pij;
        var nabla;
        var Vij;

        // Sum up for all other neighbors
        var neighbors = this.neighbors[i];
        var numNeighbors = neighbors.length;

        //printf("Neighbors: ");
        for(var j=0; j!==numNeighbors; j++){

            var neighbor = neighbors[j];
            //printf("%d ",nj);

            // Get r once for all..
            particle.position.vsub(neighbor.position,r_vec);
            var r = r_vec.norm();

            // Pressure contribution
            Pij = -neighbor.mass * (this.pressures[i] / (this.densities[i]*this.densities[i] + eps) + this.pressures[j] / (this.densities[j]*this.densities[j] + eps));
            this.gradw(r_vec, gradW);
            // Add to pressure acceleration
            gradW.mult(Pij , gradW);
            a_pressure.vadd(gradW, a_pressure);

            // Viscosity contribution
            neighbor.velocity.vsub(particle.velocity, u);
            u.mult( 1.0 / (0.0001+this.densities[i] * this.densities[j]) * this.viscosity * neighbor.mass , u );
            nabla = this.nablaw(r);
            u.mult(nabla,u);
            // Add to viscosity acceleration
            a_visc.vadd( u, a_visc );
        }

        // Calculate force
        a_visc.mult(particle.mass, a_visc);
        a_pressure.mult(particle.mass, a_pressure);

        // Add force to particles
        particle.force.vadd(a_visc, particle.force);
        particle.force.vadd(a_pressure, particle.force);
    }
};

// Calculate the weight using the W(r) weightfunction
SPHSystem.prototype.w = function(r){
    // 315
    var h = this.smoothingRadius;
    return 315.0/(64.0*Math.PI*Math.pow(h,9)) * Math.pow(h*h-r*r,3);
};

// calculate gradient of the weight function
SPHSystem.prototype.gradw = function(rVec,resultVec){
    var r = rVec.norm(),
        h = this.smoothingRadius;
    rVec.mult(945.0/(32.0*Math.PI*Math.pow(h,9)) * Math.pow((h*h-r*r),2) , resultVec);
};

// Calculate nabla(W)
SPHSystem.prototype.nablaw = function(r){
    var h = this.smoothingRadius;
    var nabla = 945.0/(32.0*Math.PI*Math.pow(h,9)) * (h*h-r*r)*(7*r*r - 3*h*h);
    return nabla;
};

},{"../material/Material":25,"../math/Quaternion":28,"../math/Vec3":30,"../objects/Body":31,"../shapes/Particle":41,"../shapes/Shape":43}],35:[function(_dereq_,module,exports){
var Vec3 = _dereq_('../math/Vec3');

module.exports = Spring;

/**
 * A spring, connecting two bodies.
 *
 * @class Spring
 * @constructor
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @param {Object} [options]
 * @param {number} [options.restLength]   A number > 0. Default: 1
 * @param {number} [options.stiffness]    A number >= 0. Default: 100
 * @param {number} [options.damping]      A number >= 0. Default: 1
 * @param {Vec3}  [options.worldAnchorA] Where to hook the spring to body A, in world coordinates.
 * @param {Vec3}  [options.worldAnchorB]
 * @param {Vec3}  [options.localAnchorA] Where to hook the spring to body A, in local body coordinates.
 * @param {Vec3}  [options.localAnchorB]
 */
function Spring(bodyA,bodyB,options){
    options = options || {};

    /**
     * Rest length of the spring.
     * @property restLength
     * @type {number}
     */
    this.restLength = typeof(options.restLength) === "number" ? options.restLength : 1;

    /**
     * Stiffness of the spring.
     * @property stiffness
     * @type {number}
     */
    this.stiffness = options.stiffness || 100;

    /**
     * Damping of the spring.
     * @property damping
     * @type {number}
     */
    this.damping = options.damping || 1;

    /**
     * First connected body.
     * @property bodyA
     * @type {Body}
     */
    this.bodyA = bodyA;

    /**
     * Second connected body.
     * @property bodyB
     * @type {Body}
     */
    this.bodyB = bodyB;

    /**
     * Anchor for bodyA in local bodyA coordinates.
     * @property localAnchorA
     * @type {Vec3}
     */
    this.localAnchorA = new Vec3();

    /**
     * Anchor for bodyB in local bodyB coordinates.
     * @property localAnchorB
     * @type {Vec3}
     */
    this.localAnchorB = new Vec3();

    if(options.localAnchorA){
        this.localAnchorA.copy(options.localAnchorA);
    }
    if(options.localAnchorB){
        this.localAnchorB.copy(options.localAnchorB);
    }
    if(options.worldAnchorA){
        this.setWorldAnchorA(options.worldAnchorA);
    }
    if(options.worldAnchorB){
        this.setWorldAnchorB(options.worldAnchorB);
    }
}

/**
 * Set the anchor point on body A, using world coordinates.
 * @method setWorldAnchorA
 * @param {Vec3} worldAnchorA
 */
Spring.prototype.setWorldAnchorA = function(worldAnchorA){
    this.bodyA.pointToLocalFrame(worldAnchorA,this.localAnchorA);
};

/**
 * Set the anchor point on body B, using world coordinates.
 * @method setWorldAnchorB
 * @param {Vec3} worldAnchorB
 */
Spring.prototype.setWorldAnchorB = function(worldAnchorB){
    this.bodyB.pointToLocalFrame(worldAnchorB,this.localAnchorB);
};

/**
 * Get the anchor point on body A, in world coordinates.
 * @method getWorldAnchorA
 * @param {Vec3} result The vector to store the result in.
 */
Spring.prototype.getWorldAnchorA = function(result){
    this.bodyA.pointToWorldFrame(this.localAnchorA,result);
};

/**
 * Get the anchor point on body B, in world coordinates.
 * @method getWorldAnchorB
 * @param {Vec3} result The vector to store the result in.
 */
Spring.prototype.getWorldAnchorB = function(result){
    this.bodyB.pointToWorldFrame(this.localAnchorB,result);
};

var applyForce_r =              new Vec3(),
    applyForce_r_unit =         new Vec3(),
    applyForce_u =              new Vec3(),
    applyForce_f =              new Vec3(),
    applyForce_worldAnchorA =   new Vec3(),
    applyForce_worldAnchorB =   new Vec3(),
    applyForce_ri =             new Vec3(),
    applyForce_rj =             new Vec3(),
    applyForce_ri_x_f =         new Vec3(),
    applyForce_rj_x_f =         new Vec3(),
    applyForce_tmp =            new Vec3();

/**
 * Apply the spring force to the connected bodies.
 * @method applyForce
 */
Spring.prototype.applyForce = function(){
    var k = this.stiffness,
        d = this.damping,
        l = this.restLength,
        bodyA = this.bodyA,
        bodyB = this.bodyB,
        r = applyForce_r,
        r_unit = applyForce_r_unit,
        u = applyForce_u,
        f = applyForce_f,
        tmp = applyForce_tmp;

    var worldAnchorA = applyForce_worldAnchorA,
        worldAnchorB = applyForce_worldAnchorB,
        ri = applyForce_ri,
        rj = applyForce_rj,
        ri_x_f = applyForce_ri_x_f,
        rj_x_f = applyForce_rj_x_f;

    // Get world anchors
    this.getWorldAnchorA(worldAnchorA);
    this.getWorldAnchorB(worldAnchorB);

    // Get offset points
    worldAnchorA.vsub(bodyA.position,ri);
    worldAnchorB.vsub(bodyB.position,rj);

    // Compute distance vector between world anchor points
    worldAnchorB.vsub(worldAnchorA,r);
    var rlen = r.norm();
    r_unit.copy(r);
    r_unit.normalize();

    // Compute relative velocity of the anchor points, u
    bodyB.velocity.vsub(bodyA.velocity,u);
    // Add rotational velocity

    bodyB.angularVelocity.cross(rj,tmp);
    u.vadd(tmp,u);
    bodyA.angularVelocity.cross(ri,tmp);
    u.vsub(tmp,u);

    // F = - k * ( x - L ) - D * ( u )
    r_unit.mult(-k*(rlen-l) - d*u.dot(r_unit), f);

    // Add forces to bodies
    bodyA.force.vsub(f,bodyA.force);
    bodyB.force.vadd(f,bodyB.force);

    // Angular force
    ri.cross(f,ri_x_f);
    rj.cross(f,rj_x_f);
    bodyA.torque.vsub(ri_x_f,bodyA.torque);
    bodyB.torque.vadd(rj_x_f,bodyB.torque);
};

},{"../math/Vec3":30}],36:[function(_dereq_,module,exports){
var Vec3 = _dereq_('../math/Vec3');
var Transform = _dereq_('../math/Transform');
var RaycastResult = _dereq_('../collision/RaycastResult');
var Utils = _dereq_('../utils/Utils');

module.exports = WheelInfo;

/**
 * @class WheelInfo
 * @constructor
 * @param {Object} [options]
 *
 * @param {Vec3} [options.chassisConnectionPointLocal]
 * @param {Vec3} [options.chassisConnectionPointWorld]
 * @param {Vec3} [options.directionLocal]
 * @param {Vec3} [options.directionWorld]
 * @param {Vec3} [options.axleLocal]
 * @param {Vec3} [options.axleWorld]
 * @param {number} [options.suspensionRestLength=1]
 * @param {number} [options.suspensionMaxLength=2]
 * @param {number} [options.radius=1]
 * @param {number} [options.suspensionStiffness=100]
 * @param {number} [options.dampingCompression=10]
 * @param {number} [options.dampingRelaxation=10]
 * @param {number} [options.frictionSlip=10000]
 * @param {number} [options.steering=0]
 * @param {number} [options.rotation=0]
 * @param {number} [options.deltaRotation=0]
 * @param {number} [options.rollInfluence=0.01]
 * @param {number} [options.maxSuspensionForce]
 * @param {boolean} [options.isFrontWheel=true]
 * @param {number} [options.clippedInvContactDotSuspension=1]
 * @param {number} [options.suspensionRelativeVelocity=0]
 * @param {number} [options.suspensionForce=0]
 * @param {number} [options.skidInfo=0]
 * @param {number} [options.suspensionLength=0]
 * @param {number} [options.maxSuspensionTravel=1]
 * @param {boolean} [options.useCustomSlidingRotationalSpeed=false]
 * @param {number} [options.customSlidingRotationalSpeed=-0.1]
 */
function WheelInfo(options){
    options = Utils.defaults(options, {
        chassisConnectionPointLocal: new Vec3(),
        chassisConnectionPointWorld: new Vec3(),
        directionLocal: new Vec3(),
        directionWorld: new Vec3(),
        axleLocal: new Vec3(),
        axleWorld: new Vec3(),
        suspensionRestLength: 1,
        suspensionMaxLength: 2,
        radius: 1,
        suspensionStiffness: 100,
        dampingCompression: 10,
        dampingRelaxation: 10,
        frictionSlip: 10000,
        steering: 0,
        rotation: 0,
        deltaRotation: 0,
        rollInfluence: 0.01,
        maxSuspensionForce: Number.MAX_VALUE,
        isFrontWheel: true,
        clippedInvContactDotSuspension: 1,
        suspensionRelativeVelocity: 0,
        suspensionForce: 0,
        skidInfo: 0,
        suspensionLength: 0,
        maxSuspensionTravel: 1,
        useCustomSlidingRotationalSpeed: false,
        customSlidingRotationalSpeed: -0.1
    });

    /**
     * Max travel distance of the suspension, in meters.
     * @property {number} maxSuspensionTravel
     */
    this.maxSuspensionTravel = options.maxSuspensionTravel;

    /**
     * Speed to apply to the wheel rotation when the wheel is sliding.
     * @property {number} customSlidingRotationalSpeed
     */
    this.customSlidingRotationalSpeed = options.customSlidingRotationalSpeed;

    /**
     * If the customSlidingRotationalSpeed should be used.
     * @property {Boolean} useCustomSlidingRotationalSpeed
     */
    this.useCustomSlidingRotationalSpeed = options.useCustomSlidingRotationalSpeed;

    /**
     * @property {Boolean} sliding
     */
    this.sliding = false;

    /**
     * Connection point, defined locally in the chassis body frame.
     * @property {Vec3} chassisConnectionPointLocal
     */
    this.chassisConnectionPointLocal = options.chassisConnectionPointLocal.clone();

    /**
     * @property {Vec3} chassisConnectionPointWorld
     */
    this.chassisConnectionPointWorld = options.chassisConnectionPointWorld.clone();

    /**
     * @property {Vec3} directionLocal
     */
    this.directionLocal = options.directionLocal.clone();

    /**
     * @property {Vec3} directionWorld
     */
    this.directionWorld = options.directionWorld.clone();

    /**
     * @property {Vec3} axleLocal
     */
    this.axleLocal = options.axleLocal.clone();

    /**
     * @property {Vec3} axleWorld
     */
    this.axleWorld = options.axleWorld.clone();

    /**
     * @property {number} suspensionRestLength
     */
    this.suspensionRestLength = options.suspensionRestLength;

    /**
     * @property {number} suspensionMaxLength
     */
    this.suspensionMaxLength = options.suspensionMaxLength;

    /**
     * @property {number} radius
     */
    this.radius = options.radius;

    /**
     * @property {number} suspensionStiffness
     */
    this.suspensionStiffness = options.suspensionStiffness;

    /**
     * @property {number} dampingCompression
     */
    this.dampingCompression = options.dampingCompression;

    /**
     * @property {number} dampingRelaxation
     */
    this.dampingRelaxation = options.dampingRelaxation;

    /**
     * @property {number} frictionSlip
     */
    this.frictionSlip = options.frictionSlip;

    /**
     * @property {number} steering
     */
    this.steering = 0;

    /**
     * Rotation value, in radians.
     * @property {number} rotation
     */
    this.rotation = 0;

    /**
     * @property {number} deltaRotation
     */
    this.deltaRotation = 0;

    /**
     * @property {number} rollInfluence
     */
    this.rollInfluence = options.rollInfluence;

    /**
     * @property {number} maxSuspensionForce
     */
    this.maxSuspensionForce = options.maxSuspensionForce;

    /**
     * @property {number} engineForce
     */
    this.engineForce = 0;

    /**
     * @property {number} brake
     */
    this.brake = 0;

    /**
     * @property {number} isFrontWheel
     */
    this.isFrontWheel = options.isFrontWheel;

    /**
     * @property {number} clippedInvContactDotSuspension
     */
    this.clippedInvContactDotSuspension = 1;

    /**
     * @property {number} suspensionRelativeVelocity
     */
    this.suspensionRelativeVelocity = 0;

    /**
     * @property {number} suspensionForce
     */
    this.suspensionForce = 0;

    /**
     * @property {number} skidInfo
     */
    this.skidInfo = 0;

    /**
     * @property {number} suspensionLength
     */
    this.suspensionLength = 0;

    /**
     * @property {number} sideImpulse
     */
    this.sideImpulse = 0;

    /**
     * @property {number} forwardImpulse
     */
    this.forwardImpulse = 0;

    /**
     * The result from raycasting
     * @property {RaycastResult} raycastResult
     */
    this.raycastResult = new RaycastResult();

    /**
     * Wheel world transform
     * @property {Transform} worldTransform
     */
    this.worldTransform = new Transform();

    /**
     * @property {boolean} isInContact
     */
    this.isInContact = false;
}

var chassis_velocity_at_contactPoint = new Vec3();
var relpos = new Vec3();
var chassis_velocity_at_contactPoint = new Vec3();
WheelInfo.prototype.updateWheel = function(chassis){
    var raycastResult = this.raycastResult;

    if (this.isInContact){
        var project= raycastResult.hitNormalWorld.dot(raycastResult.directionWorld);
        raycastResult.hitPointWorld.vsub(chassis.position, relpos);
        chassis.getVelocityAtWorldPoint(relpos, chassis_velocity_at_contactPoint);
        var projVel = raycastResult.hitNormalWorld.dot( chassis_velocity_at_contactPoint );
        if (project >= -0.1) {
            this.suspensionRelativeVelocity = 0.0;
            this.clippedInvContactDotSuspension = 1.0 / 0.1;
        } else {
            var inv = -1 / project;
            this.suspensionRelativeVelocity = projVel * inv;
            this.clippedInvContactDotSuspension = inv;
        }

    } else {
        // Not in contact : position wheel in a nice (rest length) position
        raycastResult.suspensionLength = this.suspensionRestLength;
        this.suspensionRelativeVelocity = 0.0;
        raycastResult.directionWorld.scale(-1, raycastResult.hitNormalWorld);
        this.clippedInvContactDotSuspension = 1.0;
    }
};
},{"../collision/RaycastResult":10,"../math/Transform":29,"../math/Vec3":30,"../utils/Utils":53}],37:[function(_dereq_,module,exports){
module.exports = Box;

var Shape = _dereq_('./Shape');
var Vec3 = _dereq_('../math/Vec3');
var ConvexPolyhedron = _dereq_('./ConvexPolyhedron');

/**
 * A 3d box shape.
 * @class Box
 * @constructor
 * @param {Vec3} halfExtents
 * @author schteppe
 * @extends Shape
 */
function Box(halfExtents){
    Shape.call(this);

    this.type = Shape.types.BOX;

    /**
     * @property halfExtents
     * @type {Vec3}
     */
    this.halfExtents = halfExtents;

    /**
     * Used by the contact generator to make contacts with other convex polyhedra for example
     * @property convexPolyhedronRepresentation
     * @type {ConvexPolyhedron}
     */
    this.convexPolyhedronRepresentation = null;

    this.updateConvexPolyhedronRepresentation();
    this.updateBoundingSphereRadius();
}
Box.prototype = new Shape();
Box.prototype.constructor = Box;

/**
 * Updates the local convex polyhedron representation used for some collisions.
 * @method updateConvexPolyhedronRepresentation
 */
Box.prototype.updateConvexPolyhedronRepresentation = function(){
    var sx = this.halfExtents.x;
    var sy = this.halfExtents.y;
    var sz = this.halfExtents.z;
    var V = Vec3;

    var vertices = [
        new V(-sx,-sy,-sz),
        new V( sx,-sy,-sz),
        new V( sx, sy,-sz),
        new V(-sx, sy,-sz),
        new V(-sx,-sy, sz),
        new V( sx,-sy, sz),
        new V( sx, sy, sz),
        new V(-sx, sy, sz)
    ];

    var indices = [
        [3,2,1,0], // -z
        [4,5,6,7], // +z
        [5,4,0,1], // -y
        [2,3,7,6], // +y
        [0,4,7,3], // -x
        [1,2,6,5], // +x
    ];

    var axes = [
        new V(0, 0, 1),
        new V(0, 1, 0),
        new V(1, 0, 0)
    ];

    var h = new ConvexPolyhedron(vertices, indices);
    this.convexPolyhedronRepresentation = h;
    h.material = this.material;
};

/**
 * @method calculateLocalInertia
 * @param  {Number} mass
 * @param  {Vec3} target
 * @return {Vec3}
 */
Box.prototype.calculateLocalInertia = function(mass,target){
    target = target || new Vec3();
    Box.calculateInertia(this.halfExtents, mass, target);
    return target;
};

Box.calculateInertia = function(halfExtents,mass,target){
    var e = halfExtents;
    target.x = 1.0 / 12.0 * mass * (   2*e.y*2*e.y + 2*e.z*2*e.z );
    target.y = 1.0 / 12.0 * mass * (   2*e.x*2*e.x + 2*e.z*2*e.z );
    target.z = 1.0 / 12.0 * mass * (   2*e.y*2*e.y + 2*e.x*2*e.x );
};

/**
 * Get the box 6 side normals
 * @method getSideNormals
 * @param {array}      sixTargetVectors An array of 6 vectors, to store the resulting side normals in.
 * @param {Quaternion} quat             Orientation to apply to the normal vectors. If not provided, the vectors will be in respect to the local frame.
 * @return {array}
 */
Box.prototype.getSideNormals = function(sixTargetVectors,quat){
    var sides = sixTargetVectors;
    var ex = this.halfExtents;
    sides[0].set(  ex.x,     0,     0);
    sides[1].set(     0,  ex.y,     0);
    sides[2].set(     0,     0,  ex.z);
    sides[3].set( -ex.x,     0,     0);
    sides[4].set(     0, -ex.y,     0);
    sides[5].set(     0,     0, -ex.z);

    if(quat!==undefined){
        for(var i=0; i!==sides.length; i++){
            quat.vmult(sides[i],sides[i]);
        }
    }

    return sides;
};

Box.prototype.volume = function(){
    return 8.0 * this.halfExtents.x * this.halfExtents.y * this.halfExtents.z;
};

Box.prototype.updateBoundingSphereRadius = function(){
    this.boundingSphereRadius = this.halfExtents.norm();
};

var worldCornerTempPos = new Vec3();
var worldCornerTempNeg = new Vec3();
Box.prototype.forEachWorldCorner = function(pos,quat,callback){

    var e = this.halfExtents;
    var corners = [[  e.x,  e.y,  e.z],
                   [ -e.x,  e.y,  e.z],
                   [ -e.x, -e.y,  e.z],
                   [ -e.x, -e.y, -e.z],
                   [  e.x, -e.y, -e.z],
                   [  e.x,  e.y, -e.z],
                   [ -e.x,  e.y, -e.z],
                   [  e.x, -e.y,  e.z]];
    for(var i=0; i<corners.length; i++){
        worldCornerTempPos.set(corners[i][0],corners[i][1],corners[i][2]);
        quat.vmult(worldCornerTempPos,worldCornerTempPos);
        pos.vadd(worldCornerTempPos,worldCornerTempPos);
        callback(worldCornerTempPos.x,
                 worldCornerTempPos.y,
                 worldCornerTempPos.z);
    }
};

var worldCornersTemp = [
    new Vec3(),
    new Vec3(),
    new Vec3(),
    new Vec3(),
    new Vec3(),
    new Vec3(),
    new Vec3(),
    new Vec3()
];
Box.prototype.calculateWorldAABB = function(pos,quat,min,max){

    var e = this.halfExtents;
    worldCornersTemp[0].set(e.x, e.y, e.z);
    worldCornersTemp[1].set(-e.x,  e.y, e.z);
    worldCornersTemp[2].set(-e.x, -e.y, e.z);
    worldCornersTemp[3].set(-e.x, -e.y, -e.z);
    worldCornersTemp[4].set(e.x, -e.y, -e.z);
    worldCornersTemp[5].set(e.x,  e.y, -e.z);
    worldCornersTemp[6].set(-e.x,  e.y, -e.z);
    worldCornersTemp[7].set(e.x, -e.y,  e.z);

    var wc = worldCornersTemp[0];
    quat.vmult(wc, wc);
    pos.vadd(wc, wc);
    max.copy(wc);
    min.copy(wc);
    for(var i=1; i<8; i++){
        var wc = worldCornersTemp[i];
        quat.vmult(wc, wc);
        pos.vadd(wc, wc);
        var x = wc.x;
        var y = wc.y;
        var z = wc.z;
        if(x > max.x){
            max.x = x;
        }
        if(y > max.y){
            max.y = y;
        }
        if(z > max.z){
            max.z = z;
        }

        if(x < min.x){
            min.x = x;
        }
        if(y < min.y){
            min.y = y;
        }
        if(z < min.z){
            min.z = z;
        }
    }

    // Get each axis max
    // min.set(Infinity,Infinity,Infinity);
    // max.set(-Infinity,-Infinity,-Infinity);
    // this.forEachWorldCorner(pos,quat,function(x,y,z){
    //     if(x > max.x){
    //         max.x = x;
    //     }
    //     if(y > max.y){
    //         max.y = y;
    //     }
    //     if(z > max.z){
    //         max.z = z;
    //     }

    //     if(x < min.x){
    //         min.x = x;
    //     }
    //     if(y < min.y){
    //         min.y = y;
    //     }
    //     if(z < min.z){
    //         min.z = z;
    //     }
    // });
};

},{"../math/Vec3":30,"./ConvexPolyhedron":38,"./Shape":43}],38:[function(_dereq_,module,exports){
module.exports = ConvexPolyhedron;

var Shape = _dereq_('./Shape');
var Vec3 = _dereq_('../math/Vec3');
var Quaternion = _dereq_('../math/Quaternion');
var Transform = _dereq_('../math/Transform');

/**
 * A set of polygons describing a convex shape.
 * @class ConvexPolyhedron
 * @constructor
 * @extends Shape
 * @description The shape MUST be convex for the code to work properly. No polygons may be coplanar (contained
 * in the same 3D plane), instead these should be merged into one polygon.
 *
 * @param {array} points An array of Vec3's
 * @param {array} faces Array of integer arrays, describing which vertices that is included in each face.
 *
 * @author qiao / https://github.com/qiao (original author, see https://github.com/qiao/three.js/commit/85026f0c769e4000148a67d45a9e9b9c5108836f)
 * @author schteppe / https://github.com/schteppe
 * @see http://www.altdevblogaday.com/2011/05/13/contact-generation-between-3d-convex-meshes/
 * @see http://bullet.googlecode.com/svn/trunk/src/BulletCollision/NarrowPhaseCollision/btPolyhedralContactClipping.cpp
 *
 * @todo Move the clipping functions to ContactGenerator?
 * @todo Automatically merge coplanar polygons in constructor.
 */
function ConvexPolyhedron(points, faces, uniqueAxes) {
    var that = this;
    Shape.call(this);
    this.type = Shape.types.CONVEXPOLYHEDRON;

    /**
     * Array of Vec3
     * @property vertices
     * @type {Array}
     */
    this.vertices = points||[];

    this.worldVertices = []; // World transformed version of .vertices
    this.worldVerticesNeedsUpdate = true;

    /**
     * Array of integer arrays, indicating which vertices each face consists of
     * @property faces
     * @type {Array}
     */
    this.faces = faces||[];

    /**
     * Array of Vec3
     * @property faceNormals
     * @type {Array}
     */
    this.faceNormals = [];
    this.computeNormals();

    this.worldFaceNormalsNeedsUpdate = true;
    this.worldFaceNormals = []; // World transformed version of .faceNormals

    /**
     * Array of Vec3
     * @property uniqueEdges
     * @type {Array}
     */
    this.uniqueEdges = [];

    /**
     * If given, these locally defined, normalized axes are the only ones being checked when doing separating axis check.
     * @property {Array} uniqueAxes
     */
    this.uniqueAxes = uniqueAxes ? uniqueAxes.slice() : null;

    this.computeEdges();
    this.updateBoundingSphereRadius();
}
ConvexPolyhedron.prototype = new Shape();
ConvexPolyhedron.prototype.constructor = ConvexPolyhedron;

var computeEdges_tmpEdge = new Vec3();
/**
 * Computes uniqueEdges
 * @method computeEdges
 */
ConvexPolyhedron.prototype.computeEdges = function(){
    var faces = this.faces;
    var vertices = this.vertices;
    var nv = vertices.length;
    var edges = this.uniqueEdges;

    edges.length = 0;

    var edge = computeEdges_tmpEdge;

    for(var i=0; i !== faces.length; i++){
        var face = faces[i];
        var numVertices = face.length;
        for(var j = 0; j !== numVertices; j++){
            var k = ( j+1 ) % numVertices;
            vertices[face[j]].vsub(vertices[face[k]], edge);
            edge.normalize();
            var found = false;
            for(var p=0; p !== edges.length; p++){
                if (edges[p].almostEquals(edge) || edges[p].almostEquals(edge)){
                    found = true;
                    break;
                }
            }

            if (!found){
                edges.push(edge.clone());
            }
        }
    }
};

/**
 * Compute the normals of the faces. Will reuse existing Vec3 objects in the .faceNormals array if they exist.
 * @method computeNormals
 */
ConvexPolyhedron.prototype.computeNormals = function(){
    this.faceNormals.length = this.faces.length;

    // Generate normals
    for(var i=0; i<this.faces.length; i++){

        // Check so all vertices exists for this face
        for(var j=0; j<this.faces[i].length; j++){
            if(!this.vertices[this.faces[i][j]]){
                throw new Error("Vertex "+this.faces[i][j]+" not found!");
            }
        }

        var n = this.faceNormals[i] || new Vec3();
        this.getFaceNormal(i,n);
        n.negate(n);
        this.faceNormals[i] = n;
        var vertex = this.vertices[this.faces[i][0]];
        if(n.dot(vertex) < 0){
            console.error(".faceNormals[" + i + "] = Vec3("+n.toString()+") looks like it points into the shape? The vertices follow. Make sure they are ordered CCW around the normal, using the right hand rule.");
            for(var j=0; j<this.faces[i].length; j++){
                console.warn(".vertices["+this.faces[i][j]+"] = Vec3("+this.vertices[this.faces[i][j]].toString()+")");
            }
        }
    }
};

/**
 * Get face normal given 3 vertices
 * @static
 * @method getFaceNormal
 * @param {Vec3} va
 * @param {Vec3} vb
 * @param {Vec3} vc
 * @param {Vec3} target
 */
var cb = new Vec3();
var ab = new Vec3();
ConvexPolyhedron.computeNormal = function ( va, vb, vc, target ) {
    vb.vsub(va,ab);
    vc.vsub(vb,cb);
    cb.cross(ab,target);
    if ( !target.isZero() ) {
        target.normalize();
    }
};

/**
 * Compute the normal of a face from its vertices
 * @method getFaceNormal
 * @param  {Number} i
 * @param  {Vec3} target
 */
ConvexPolyhedron.prototype.getFaceNormal = function(i,target){
    var f = this.faces[i];
    var va = this.vertices[f[0]];
    var vb = this.vertices[f[1]];
    var vc = this.vertices[f[2]];
    return ConvexPolyhedron.computeNormal(va,vb,vc,target);
};

/**
 * @method clipAgainstHull
 * @param {Vec3} posA
 * @param {Quaternion} quatA
 * @param {ConvexPolyhedron} hullB
 * @param {Vec3} posB
 * @param {Quaternion} quatB
 * @param {Vec3} separatingNormal
 * @param {Number} minDist Clamp distance
 * @param {Number} maxDist
 * @param {array} result The an array of contact point objects, see clipFaceAgainstHull
 * @see http://bullet.googlecode.com/svn/trunk/src/BulletCollision/NarrowPhaseCollision/btPolyhedralContactClipping.cpp
 */
var cah_WorldNormal = new Vec3();
ConvexPolyhedron.prototype.clipAgainstHull = function(posA,quatA,hullB,posB,quatB,separatingNormal,minDist,maxDist,result){
    var WorldNormal = cah_WorldNormal;
    var hullA = this;
    var curMaxDist = maxDist;
    var closestFaceB = -1;
    var dmax = -Number.MAX_VALUE;
    for(var face=0; face < hullB.faces.length; face++){
        WorldNormal.copy(hullB.faceNormals[face]);
        quatB.vmult(WorldNormal,WorldNormal);
        //posB.vadd(WorldNormal,WorldNormal);
        var d = WorldNormal.dot(separatingNormal);
        if (d > dmax){
            dmax = d;
            closestFaceB = face;
        }
    }
    var worldVertsB1 = [];
    var polyB = hullB.faces[closestFaceB];
    var numVertices = polyB.length;
    for(var e0=0; e0<numVertices; e0++){
        var b = hullB.vertices[polyB[e0]];
        var worldb = new Vec3();
        worldb.copy(b);
        quatB.vmult(worldb,worldb);
        posB.vadd(worldb,worldb);
        worldVertsB1.push(worldb);
    }

    if (closestFaceB>=0){
        this.clipFaceAgainstHull(separatingNormal,
                                 posA,
                                 quatA,
                                 worldVertsB1,
                                 minDist,
                                 maxDist,
                                 result);
    }
};

/**
 * Find the separating axis between this hull and another
 * @method findSeparatingAxis
 * @param {ConvexPolyhedron} hullB
 * @param {Vec3} posA
 * @param {Quaternion} quatA
 * @param {Vec3} posB
 * @param {Quaternion} quatB
 * @param {Vec3} target The target vector to save the axis in
 * @return {bool} Returns false if a separation is found, else true
 */
var fsa_faceANormalWS3 = new Vec3(),
    fsa_Worldnormal1 = new Vec3(),
    fsa_deltaC = new Vec3(),
    fsa_worldEdge0 = new Vec3(),
    fsa_worldEdge1 = new Vec3(),
    fsa_Cross = new Vec3();
ConvexPolyhedron.prototype.findSeparatingAxis = function(hullB,posA,quatA,posB,quatB,target, faceListA, faceListB){
    var faceANormalWS3 = fsa_faceANormalWS3,
        Worldnormal1 = fsa_Worldnormal1,
        deltaC = fsa_deltaC,
        worldEdge0 = fsa_worldEdge0,
        worldEdge1 = fsa_worldEdge1,
        Cross = fsa_Cross;

    var dmin = Number.MAX_VALUE;
    var hullA = this;
    var curPlaneTests=0;

    if(!hullA.uniqueAxes){

        var numFacesA = faceListA ? faceListA.length : hullA.faces.length;

        // Test face normals from hullA
        for(var i=0; i<numFacesA; i++){
            var fi = faceListA ? faceListA[i] : i;

            // Get world face normal
            faceANormalWS3.copy(hullA.faceNormals[fi]);
            quatA.vmult(faceANormalWS3,faceANormalWS3);

            var d = hullA.testSepAxis(faceANormalWS3, hullB, posA, quatA, posB, quatB);
            if(d===false){
                return false;
            }

            if(d<dmin){
                dmin = d;
                target.copy(faceANormalWS3);
            }
        }

    } else {

        // Test unique axes
        for(var i = 0; i !== hullA.uniqueAxes.length; i++){

            // Get world axis
            quatA.vmult(hullA.uniqueAxes[i],faceANormalWS3);

            var d = hullA.testSepAxis(faceANormalWS3, hullB, posA, quatA, posB, quatB);
            if(d===false){
                return false;
            }

            if(d<dmin){
                dmin = d;
                target.copy(faceANormalWS3);
            }
        }
    }

    if(!hullB.uniqueAxes){

        // Test face normals from hullB
        var numFacesB = faceListB ? faceListB.length : hullB.faces.length;
        for(var i=0;i<numFacesB;i++){

            var fi = faceListB ? faceListB[i] : i;

            Worldnormal1.copy(hullB.faceNormals[fi]);
            quatB.vmult(Worldnormal1,Worldnormal1);
            curPlaneTests++;
            var d = hullA.testSepAxis(Worldnormal1, hullB,posA,quatA,posB,quatB);
            if(d===false){
                return false;
            }

            if(d<dmin){
                dmin = d;
                target.copy(Worldnormal1);
            }
        }
    } else {

        // Test unique axes in B
        for(var i = 0; i !== hullB.uniqueAxes.length; i++){
            quatB.vmult(hullB.uniqueAxes[i],Worldnormal1);

            curPlaneTests++;
            var d = hullA.testSepAxis(Worldnormal1, hullB,posA,quatA,posB,quatB);
            if(d===false){
                return false;
            }

            if(d<dmin){
                dmin = d;
                target.copy(Worldnormal1);
            }
        }
    }

    // Test edges
    for(var e0=0; e0 !== hullA.uniqueEdges.length; e0++){

        // Get world edge
        quatA.vmult(hullA.uniqueEdges[e0],worldEdge0);

        for(var e1=0; e1 !== hullB.uniqueEdges.length; e1++){

            // Get world edge 2
            quatB.vmult(hullB.uniqueEdges[e1], worldEdge1);
            worldEdge0.cross(worldEdge1,Cross);

            if(!Cross.almostZero()){
                Cross.normalize();
                var dist = hullA.testSepAxis(Cross, hullB, posA, quatA, posB, quatB);
                if(dist === false){
                    return false;
                }
                if(dist < dmin){
                    dmin = dist;
                    target.copy(Cross);
                }
            }
        }
    }

    posB.vsub(posA,deltaC);
    if((deltaC.dot(target))>0.0){
        target.negate(target);
    }

    return true;
};

var maxminA=[], maxminB=[];

/**
 * Test separating axis against two hulls. Both hulls are projected onto the axis and the overlap size is returned if there is one.
 * @method testSepAxis
 * @param {Vec3} axis
 * @param {ConvexPolyhedron} hullB
 * @param {Vec3} posA
 * @param {Quaternion} quatA
 * @param {Vec3} posB
 * @param {Quaternion} quatB
 * @return {number} The overlap depth, or FALSE if no penetration.
 */
ConvexPolyhedron.prototype.testSepAxis = function(axis, hullB, posA, quatA, posB, quatB){
    var hullA=this;
    ConvexPolyhedron.project(hullA, axis, posA, quatA, maxminA);
    ConvexPolyhedron.project(hullB, axis, posB, quatB, maxminB);
    var maxA = maxminA[0];
    var minA = maxminA[1];
    var maxB = maxminB[0];
    var minB = maxminB[1];
    if(maxA<minB || maxB<minA){
        return false; // Separated
    }
    var d0 = maxA - minB;
    var d1 = maxB - minA;
    var depth = d0<d1 ? d0:d1;
    return depth;
};

var cli_aabbmin = new Vec3(),
    cli_aabbmax = new Vec3();

/**
 * @method calculateLocalInertia
 * @param  {Number} mass
 * @param  {Vec3} target
 */
ConvexPolyhedron.prototype.calculateLocalInertia = function(mass,target){
    // Approximate with box inertia
    // Exact inertia calculation is overkill, but see http://geometrictools.com/Documentation/PolyhedralMassProperties.pdf for the correct way to do it
    this.computeLocalAABB(cli_aabbmin,cli_aabbmax);
    var x = cli_aabbmax.x - cli_aabbmin.x,
        y = cli_aabbmax.y - cli_aabbmin.y,
        z = cli_aabbmax.z - cli_aabbmin.z;
    target.x = 1.0 / 12.0 * mass * ( 2*y*2*y + 2*z*2*z );
    target.y = 1.0 / 12.0 * mass * ( 2*x*2*x + 2*z*2*z );
    target.z = 1.0 / 12.0 * mass * ( 2*y*2*y + 2*x*2*x );
};

/**
 * @method getPlaneConstantOfFace
 * @param  {Number} face_i Index of the face
 * @return {Number}
 */
ConvexPolyhedron.prototype.getPlaneConstantOfFace = function(face_i){
    var f = this.faces[face_i];
    var n = this.faceNormals[face_i];
    var v = this.vertices[f[0]];
    var c = -n.dot(v);
    return c;
};

/**
 * Clip a face against a hull.
 * @method clipFaceAgainstHull
 * @param {Vec3} separatingNormal
 * @param {Vec3} posA
 * @param {Quaternion} quatA
 * @param {Array} worldVertsB1 An array of Vec3 with vertices in the world frame.
 * @param {Number} minDist Distance clamping
 * @param {Number} maxDist
 * @param Array result Array to store resulting contact points in. Will be objects with properties: point, depth, normal. These are represented in world coordinates.
 */
var cfah_faceANormalWS = new Vec3(),
    cfah_edge0 = new Vec3(),
    cfah_WorldEdge0 = new Vec3(),
    cfah_worldPlaneAnormal1 = new Vec3(),
    cfah_planeNormalWS1 = new Vec3(),
    cfah_worldA1 = new Vec3(),
    cfah_localPlaneNormal = new Vec3(),
    cfah_planeNormalWS = new Vec3();
ConvexPolyhedron.prototype.clipFaceAgainstHull = function(separatingNormal, posA, quatA, worldVertsB1, minDist, maxDist,result){
    var faceANormalWS = cfah_faceANormalWS,
        edge0 = cfah_edge0,
        WorldEdge0 = cfah_WorldEdge0,
        worldPlaneAnormal1 = cfah_worldPlaneAnormal1,
        planeNormalWS1 = cfah_planeNormalWS1,
        worldA1 = cfah_worldA1,
        localPlaneNormal = cfah_localPlaneNormal,
        planeNormalWS = cfah_planeNormalWS;

    var hullA = this;
    var worldVertsB2 = [];
    var pVtxIn = worldVertsB1;
    var pVtxOut = worldVertsB2;
    // Find the face with normal closest to the separating axis
    var closestFaceA = -1;
    var dmin = Number.MAX_VALUE;
    for(var face=0; face<hullA.faces.length; face++){
        faceANormalWS.copy(hullA.faceNormals[face]);
        quatA.vmult(faceANormalWS,faceANormalWS);
        //posA.vadd(faceANormalWS,faceANormalWS);
        var d = faceANormalWS.dot(separatingNormal);
        if (d < dmin){
            dmin = d;
            closestFaceA = face;
        }
    }
    if (closestFaceA < 0){
        // console.log("--- did not find any closest face... ---");
        return;
    }
    //console.log("closest A: ",closestFaceA);
    // Get the face and construct connected faces
    var polyA = hullA.faces[closestFaceA];
    polyA.connectedFaces = [];
    for(var i=0; i<hullA.faces.length; i++){
        for(var j=0; j<hullA.faces[i].length; j++){
            if(polyA.indexOf(hullA.faces[i][j])!==-1 /* Sharing a vertex*/ && i!==closestFaceA /* Not the one we are looking for connections from */ && polyA.connectedFaces.indexOf(i)===-1 /* Not already added */ ){
                polyA.connectedFaces.push(i);
            }
        }
    }
    // Clip the polygon to the back of the planes of all faces of hull A, that are adjacent to the witness face
    var numContacts = pVtxIn.length;
    var numVerticesA = polyA.length;
    var res = [];
    for(var e0=0; e0<numVerticesA; e0++){
        var a = hullA.vertices[polyA[e0]];
        var b = hullA.vertices[polyA[(e0+1)%numVerticesA]];
        a.vsub(b,edge0);
        WorldEdge0.copy(edge0);
        quatA.vmult(WorldEdge0,WorldEdge0);
        posA.vadd(WorldEdge0,WorldEdge0);
        worldPlaneAnormal1.copy(this.faceNormals[closestFaceA]);//transA.getBasis()* btVector3(polyA.m_plane[0],polyA.m_plane[1],polyA.m_plane[2]);
        quatA.vmult(worldPlaneAnormal1,worldPlaneAnormal1);
        posA.vadd(worldPlaneAnormal1,worldPlaneAnormal1);
        WorldEdge0.cross(worldPlaneAnormal1,planeNormalWS1);
        planeNormalWS1.negate(planeNormalWS1);
        worldA1.copy(a);
        quatA.vmult(worldA1,worldA1);
        posA.vadd(worldA1,worldA1);
        var planeEqWS1 = -worldA1.dot(planeNormalWS1);
        var planeEqWS;
        if(true){
            var otherFace = polyA.connectedFaces[e0];
            localPlaneNormal.copy(this.faceNormals[otherFace]);
            var localPlaneEq = this.getPlaneConstantOfFace(otherFace);

            planeNormalWS.copy(localPlaneNormal);
            quatA.vmult(planeNormalWS,planeNormalWS);
            //posA.vadd(planeNormalWS,planeNormalWS);
            var planeEqWS = localPlaneEq - planeNormalWS.dot(posA);
        } else  {
            planeNormalWS.copy(planeNormalWS1);
            planeEqWS = planeEqWS1;
        }

        // Clip face against our constructed plane
        this.clipFaceAgainstPlane(pVtxIn, pVtxOut, planeNormalWS, planeEqWS);

        // Throw away all clipped points, but save the reamining until next clip
        while(pVtxIn.length){
            pVtxIn.shift();
        }
        while(pVtxOut.length){
            pVtxIn.push(pVtxOut.shift());
        }
    }

    //console.log("Resulting points after clip:",pVtxIn);

    // only keep contact points that are behind the witness face
    localPlaneNormal.copy(this.faceNormals[closestFaceA]);

    var localPlaneEq = this.getPlaneConstantOfFace(closestFaceA);
    planeNormalWS.copy(localPlaneNormal);
    quatA.vmult(planeNormalWS,planeNormalWS);

    var planeEqWS = localPlaneEq - planeNormalWS.dot(posA);
    for (var i=0; i<pVtxIn.length; i++){
        var depth = planeNormalWS.dot(pVtxIn[i]) + planeEqWS; //???
        /*console.log("depth calc from normal=",planeNormalWS.toString()," and constant "+planeEqWS+" and vertex ",pVtxIn[i].toString()," gives "+depth);*/
        if (depth <=minDist){
            console.log("clamped: depth="+depth+" to minDist="+(minDist+""));
            depth = minDist;
        }

        if (depth <=maxDist){
            var point = pVtxIn[i];
            if(depth<=0){
                /*console.log("Got contact point ",point.toString(),
                  ", depth=",depth,
                  "contact normal=",separatingNormal.toString(),
                  "plane",planeNormalWS.toString(),
                  "planeConstant",planeEqWS);*/
                var p = {
                    point:point,
                    normal:planeNormalWS,
                    depth: depth,
                };
                result.push(p);
            }
        }
    }
};

/**
 * Clip a face in a hull against the back of a plane.
 * @method clipFaceAgainstPlane
 * @param {Array} inVertices
 * @param {Array} outVertices
 * @param {Vec3} planeNormal
 * @param {Number} planeConstant The constant in the mathematical plane equation
 */
ConvexPolyhedron.prototype.clipFaceAgainstPlane = function(inVertices,outVertices, planeNormal, planeConstant){
    var n_dot_first, n_dot_last;
    var numVerts = inVertices.length;

    if(numVerts < 2){
        return outVertices;
    }

    var firstVertex = inVertices[inVertices.length-1],
        lastVertex =   inVertices[0];

    n_dot_first = planeNormal.dot(firstVertex) + planeConstant;

    for(var vi = 0; vi < numVerts; vi++){
        lastVertex = inVertices[vi];
        n_dot_last = planeNormal.dot(lastVertex) + planeConstant;
        if(n_dot_first < 0){
            if(n_dot_last < 0){
                // Start < 0, end < 0, so output lastVertex
                var newv = new Vec3();
                newv.copy(lastVertex);
                outVertices.push(newv);
            } else {
                // Start < 0, end >= 0, so output intersection
                var newv = new Vec3();
                firstVertex.lerp(lastVertex,
                                 n_dot_first / (n_dot_first - n_dot_last),
                                 newv);
                outVertices.push(newv);
            }
        } else {
            if(n_dot_last<0){
                // Start >= 0, end < 0 so output intersection and end
                var newv = new Vec3();
                firstVertex.lerp(lastVertex,
                                 n_dot_first / (n_dot_first - n_dot_last),
                                 newv);
                outVertices.push(newv);
                outVertices.push(lastVertex);
            }
        }
        firstVertex = lastVertex;
        n_dot_first = n_dot_last;
    }
    return outVertices;
};

// Updates .worldVertices and sets .worldVerticesNeedsUpdate to false.
ConvexPolyhedron.prototype.computeWorldVertices = function(position,quat){
    var N = this.vertices.length;
    while(this.worldVertices.length < N){
        this.worldVertices.push( new Vec3() );
    }

    var verts = this.vertices,
        worldVerts = this.worldVertices;
    for(var i=0; i!==N; i++){
        quat.vmult( verts[i] , worldVerts[i] );
        position.vadd( worldVerts[i] , worldVerts[i] );
    }

    this.worldVerticesNeedsUpdate = false;
};

var computeLocalAABB_worldVert = new Vec3();
ConvexPolyhedron.prototype.computeLocalAABB = function(aabbmin,aabbmax){
    var n = this.vertices.length,
        vertices = this.vertices,
        worldVert = computeLocalAABB_worldVert;

    aabbmin.set(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
    aabbmax.set(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);

    for(var i=0; i<n; i++){
        var v = vertices[i];
        if     (v.x < aabbmin.x){
            aabbmin.x = v.x;
        } else if(v.x > aabbmax.x){
            aabbmax.x = v.x;
        }
        if     (v.y < aabbmin.y){
            aabbmin.y = v.y;
        } else if(v.y > aabbmax.y){
            aabbmax.y = v.y;
        }
        if     (v.z < aabbmin.z){
            aabbmin.z = v.z;
        } else if(v.z > aabbmax.z){
            aabbmax.z = v.z;
        }
    }
};

/**
 * Updates .worldVertices and sets .worldVerticesNeedsUpdate to false.
 * @method computeWorldFaceNormals
 * @param  {Quaternion} quat
 */
ConvexPolyhedron.prototype.computeWorldFaceNormals = function(quat){
    var N = this.faceNormals.length;
    while(this.worldFaceNormals.length < N){
        this.worldFaceNormals.push( new Vec3() );
    }

    var normals = this.faceNormals,
        worldNormals = this.worldFaceNormals;
    for(var i=0; i!==N; i++){
        quat.vmult( normals[i] , worldNormals[i] );
    }

    this.worldFaceNormalsNeedsUpdate = false;
};

/**
 * @method updateBoundingSphereRadius
 */
ConvexPolyhedron.prototype.updateBoundingSphereRadius = function(){
    // Assume points are distributed with local (0,0,0) as center
    var max2 = 0;
    var verts = this.vertices;
    for(var i=0, N=verts.length; i!==N; i++) {
        var norm2 = verts[i].norm2();
        if(norm2 > max2){
            max2 = norm2;
        }
    }
    this.boundingSphereRadius = Math.sqrt(max2);
};

var tempWorldVertex = new Vec3();

/**
 * @method calculateWorldAABB
 * @param {Vec3}        pos
 * @param {Quaternion}  quat
 * @param {Vec3}        min
 * @param {Vec3}        max
 */
ConvexPolyhedron.prototype.calculateWorldAABB = function(pos,quat,min,max){
    var n = this.vertices.length, verts = this.vertices;
    var minx,miny,minz,maxx,maxy,maxz;
    for(var i=0; i<n; i++){
        tempWorldVertex.copy(verts[i]);
        quat.vmult(tempWorldVertex,tempWorldVertex);
        pos.vadd(tempWorldVertex,tempWorldVertex);
        var v = tempWorldVertex;
        if     (v.x < minx || minx===undefined){
            minx = v.x;
        } else if(v.x > maxx || maxx===undefined){
            maxx = v.x;
        }

        if     (v.y < miny || miny===undefined){
            miny = v.y;
        } else if(v.y > maxy || maxy===undefined){
            maxy = v.y;
        }

        if     (v.z < minz || minz===undefined){
            minz = v.z;
        } else if(v.z > maxz || maxz===undefined){
            maxz = v.z;
        }
    }
    min.set(minx,miny,minz);
    max.set(maxx,maxy,maxz);
};

/**
 * Get approximate convex volume
 * @method volume
 * @return {Number}
 */
ConvexPolyhedron.prototype.volume = function(){
    return 4.0 * Math.PI * this.boundingSphereRadius / 3.0;
};

/**
 * Get an average of all the vertices positions
 * @method getAveragePointLocal
 * @param  {Vec3} target
 * @return {Vec3}
 */
ConvexPolyhedron.prototype.getAveragePointLocal = function(target){
    target = target || new Vec3();
    var n = this.vertices.length,
        verts = this.vertices;
    for(var i=0; i<n; i++){
        target.vadd(verts[i],target);
    }
    target.mult(1/n,target);
    return target;
};

/**
 * Transform all local points. Will change the .vertices
 * @method transformAllPoints
 * @param  {Vec3} offset
 * @param  {Quaternion} quat
 */
ConvexPolyhedron.prototype.transformAllPoints = function(offset,quat){
    var n = this.vertices.length,
        verts = this.vertices;

    // Apply rotation
    if(quat){
        // Rotate vertices
        for(var i=0; i<n; i++){
            var v = verts[i];
            quat.vmult(v,v);
        }
        // Rotate face normals
        for(var i=0; i<this.faceNormals.length; i++){
            var v = this.faceNormals[i];
            quat.vmult(v,v);
        }
        /*
        // Rotate edges
        for(var i=0; i<this.uniqueEdges.length; i++){
            var v = this.uniqueEdges[i];
            quat.vmult(v,v);
        }*/
    }

    // Apply offset
    if(offset){
        for(var i=0; i<n; i++){
            var v = verts[i];
            v.vadd(offset,v);
        }
    }
};

/**
 * Checks whether p is inside the polyhedra. Must be in local coords. The point lies outside of the convex hull of the other points if and only if the direction of all the vectors from it to those other points are on less than one half of a sphere around it.
 * @method pointIsInside
 * @param  {Vec3} p      A point given in local coordinates
 * @return {Boolean}
 */
var ConvexPolyhedron_pointIsInside = new Vec3();
var ConvexPolyhedron_vToP = new Vec3();
var ConvexPolyhedron_vToPointInside = new Vec3();
ConvexPolyhedron.prototype.pointIsInside = function(p){
    var n = this.vertices.length,
        verts = this.vertices,
        faces = this.faces,
        normals = this.faceNormals;
    var positiveResult = null;
    var N = this.faces.length;
    var pointInside = ConvexPolyhedron_pointIsInside;
    this.getAveragePointLocal(pointInside);
    for(var i=0; i<N; i++){
        var numVertices = this.faces[i].length;
        var n = normals[i];
        var v = verts[faces[i][0]]; // We only need one point in the face

        // This dot product determines which side of the edge the point is
        var vToP = ConvexPolyhedron_vToP;
        p.vsub(v,vToP);
        var r1 = n.dot(vToP);

        var vToPointInside = ConvexPolyhedron_vToPointInside;
        pointInside.vsub(v,vToPointInside);
        var r2 = n.dot(vToPointInside);

        if((r1<0 && r2>0) || (r1>0 && r2<0)){
            return false; // Encountered some other sign. Exit.
        } else {
        }
    }

    // If we got here, all dot products were of the same sign.
    return positiveResult ? 1 : -1;
};

/**
 * Get max and min dot product of a convex hull at position (pos,quat) projected onto an axis. Results are saved in the array maxmin.
 * @static
 * @method project
 * @param {ConvexPolyhedron} hull
 * @param {Vec3} axis
 * @param {Vec3} pos
 * @param {Quaternion} quat
 * @param {array} result result[0] and result[1] will be set to maximum and minimum, respectively.
 */
var project_worldVertex = new Vec3();
var project_localAxis = new Vec3();
var project_localOrigin = new Vec3();
ConvexPolyhedron.project = function(hull, axis, pos, quat, result){
    var n = hull.vertices.length,
        worldVertex = project_worldVertex,
        localAxis = project_localAxis,
        max = 0,
        min = 0,
        localOrigin = project_localOrigin,
        vs = hull.vertices;

    localOrigin.setZero();

    // Transform the axis to local
    Transform.vectorToLocalFrame(pos, quat, axis, localAxis);
    Transform.pointToLocalFrame(pos, quat, localOrigin, localOrigin);
    var add = localOrigin.dot(localAxis);

    min = max = vs[0].dot(localAxis);

    for(var i = 1; i < n; i++){
        var val = vs[i].dot(localAxis);

        if(val > max){
            max = val;
        }

        if(val < min){
            min = val;
        }
    }

    min -= add;
    max -= add;

    if(min > max){
        // Inconsistent - swap
        var temp = min;
        min = max;
        max = temp;
    }
    // Output
    result[0] = max;
    result[1] = min;
};

},{"../math/Quaternion":28,"../math/Transform":29,"../math/Vec3":30,"./Shape":43}],39:[function(_dereq_,module,exports){
module.exports = Cylinder;

var Shape = _dereq_('./Shape');
var Vec3 = _dereq_('../math/Vec3');
var Quaternion = _dereq_('../math/Quaternion');
var ConvexPolyhedron = _dereq_('./ConvexPolyhedron');

/**
 * @class Cylinder
 * @constructor
 * @extends ConvexPolyhedron
 * @author schteppe / https://github.com/schteppe
 * @param {Number} radiusTop
 * @param {Number} radiusBottom
 * @param {Number} height
 * @param {Number} numSegments The number of segments to build the cylinder out of
 */
function Cylinder( radiusTop, radiusBottom, height , numSegments ) {
    var N = numSegments,
        verts = [],
        axes = [],
        faces = [],
        bottomface = [],
        topface = [],
        cos = Math.cos,
        sin = Math.sin;

    // First bottom point
    verts.push(new Vec3(radiusBottom*cos(0),
                               radiusBottom*sin(0),
                               -height*0.5));
    bottomface.push(0);

    // First top point
    verts.push(new Vec3(radiusTop*cos(0),
                               radiusTop*sin(0),
                               height*0.5));
    topface.push(1);

    for(var i=0; i<N; i++){
        var theta = 2*Math.PI/N * (i+1);
        var thetaN = 2*Math.PI/N * (i+0.5);
        if(i<N-1){
            // Bottom
            verts.push(new Vec3(radiusBottom*cos(theta),
                                       radiusBottom*sin(theta),
                                       -height*0.5));
            bottomface.push(2*i+2);
            // Top
            verts.push(new Vec3(radiusTop*cos(theta),
                                       radiusTop*sin(theta),
                                       height*0.5));
            topface.push(2*i+3);

            // Face
            faces.push([2*i+2, 2*i+3, 2*i+1,2*i]);
        } else {
            faces.push([0,1, 2*i+1, 2*i]); // Connect
        }

        // Axis: we can cut off half of them if we have even number of segments
        if(N % 2 === 1 || i < N / 2){
            axes.push(new Vec3(cos(thetaN), sin(thetaN), 0));
        }
    }
    faces.push(topface);
    axes.push(new Vec3(0,0,1));

    // Reorder bottom face
    var temp = [];
    for(var i=0; i<bottomface.length; i++){
        temp.push(bottomface[bottomface.length - i - 1]);
    }
    faces.push(temp);

    this.type = Shape.types.CONVEXPOLYHEDRON;
    ConvexPolyhedron.call( this, verts, faces, axes );
}

Cylinder.prototype = new ConvexPolyhedron();

},{"../math/Quaternion":28,"../math/Vec3":30,"./ConvexPolyhedron":38,"./Shape":43}],40:[function(_dereq_,module,exports){
var Shape = _dereq_('./Shape');
var ConvexPolyhedron = _dereq_('./ConvexPolyhedron');
var Vec3 = _dereq_('../math/Vec3');
var Utils = _dereq_('../utils/Utils');

module.exports = Heightfield;

/**
 * Heightfield shape class. Height data is given as an array. These data points are spread out evenly with a given distance.
 * @class Heightfield
 * @extends Shape
 * @constructor
 * @param {Array} data An array of Y values that will be used to construct the terrain.
 * @param {object} options
 * @param {Number} [options.minValue] Minimum value of the data points in the data array. Will be computed automatically if not given.
 * @param {Number} [options.maxValue] Maximum value.
 * @param {Number} [options.elementSize=0.1] World spacing between the data points in X direction.
 * @todo Should be possible to use along all axes, not just y
 *
 * @example
 *     // Generate some height data (y-values).
 *     var data = [];
 *     for(var i = 0; i < 1000; i++){
 *         var y = 0.5 * Math.cos(0.2 * i);
 *         data.push(y);
 *     }
 *
 *     // Create the heightfield shape
 *     var heightfieldShape = new Heightfield(data, {
 *         elementSize: 1 // Distance between the data points in X and Y directions
 *     });
 *     var heightfieldBody = new Body();
 *     heightfieldBody.addShape(heightfieldShape);
 *     world.addBody(heightfieldBody);
 */
function Heightfield(data, options){
    options = Utils.defaults(options, {
        maxValue : null,
        minValue : null,
        elementSize : 1
    });

    /**
     * An array of numbers, or height values, that are spread out along the x axis.
     * @property {array} data
     */
    this.data = data;

    /**
     * Max value of the data
     * @property {number} maxValue
     */
    this.maxValue = options.maxValue;

    /**
     * Max value of the data
     * @property {number} minValue
     */
    this.minValue = options.minValue;

    /**
     * The width of each element
     * @property {number} elementSize
     * @todo elementSizeX and Y
     */
    this.elementSize = options.elementSize;

    if(options.minValue === null){
        this.updateMinValue();
    }
    if(options.maxValue === null){
        this.updateMaxValue();
    }

    this.cacheEnabled = true;

    Shape.call(this);

    this.pillarConvex = new ConvexPolyhedron();
    this.pillarOffset = new Vec3();

    this.type = Shape.types.HEIGHTFIELD;
    this.updateBoundingSphereRadius();

    // "i_j_isUpper" => { convex: ..., offset: ... }
    // for example:
    // _cachedPillars["0_2_1"]
    this._cachedPillars = {};
}
Heightfield.prototype = new Shape();

/**
 * Call whenever you change the data array.
 * @method update
 */
Heightfield.prototype.update = function(){
    this._cachedPillars = {};
};

/**
 * Update the .minValue property
 * @method updateMinValue
 */
Heightfield.prototype.updateMinValue = function(){
    var data = this.data;
    var minValue = data[0][0];
    for(var i=0; i !== data.length; i++){
        for(var j=0; j !== data[i].length; j++){
            var v = data[i][j];
            if(v < minValue){
                minValue = v;
            }
        }
    }
    this.minValue = minValue;
};

/**
 * Update the .maxValue property
 * @method updateMaxValue
 */
Heightfield.prototype.updateMaxValue = function(){
    var data = this.data;
    var maxValue = data[0][0];
    for(var i=0; i !== data.length; i++){
        for(var j=0; j !== data[i].length; j++){
            var v = data[i][j];
            if(v > maxValue){
                maxValue = v;
            }
        }
    }
    this.maxValue = maxValue;
};

/**
 * Set the height value at an index. Don't forget to update maxValue and minValue after you're done.
 * @method setHeightValueAtIndex
 * @param {integer} xi
 * @param {integer} yi
 * @param {number} value
 */
Heightfield.prototype.setHeightValueAtIndex = function(xi, yi, value){
    var data = this.data;
    data[xi][yi] = value;

    // Invalidate cache
    this.clearCachedConvexTrianglePillar(xi, yi, false);
    if(xi > 0){
        this.clearCachedConvexTrianglePillar(xi - 1, yi, true);
        this.clearCachedConvexTrianglePillar(xi - 1, yi, false);
    }
    if(yi > 0){
        this.clearCachedConvexTrianglePillar(xi, yi - 1, true);
        this.clearCachedConvexTrianglePillar(xi, yi - 1, false);
    }
    if(yi > 0 && xi > 0){
        this.clearCachedConvexTrianglePillar(xi - 1, yi - 1, true);
    }
};

/**
 * Get max/min in a rectangle in the matrix data
 * @method getRectMinMax
 * @param  {integer} iMinX
 * @param  {integer} iMinY
 * @param  {integer} iMaxX
 * @param  {integer} iMaxY
 * @param  {array} [result] An array to store the results in.
 * @return {array} The result array, if it was passed in. Minimum will be at position 0 and max at 1.
 */
Heightfield.prototype.getRectMinMax = function (iMinX, iMinY, iMaxX, iMaxY, result) {
    result = result || [];

    // Get max and min of the data
    var data = this.data,
        max = this.minValue; // Set first value
    for(var i = iMinX; i <= iMaxX; i++){
        for(var j = iMinY; j <= iMaxY; j++){
            var height = data[i][j];
            if(height > max){
                max = height;
            }
        }
    }

    result[0] = this.minValue;
    result[1] = max;
};

/**
 * Get the index of a local position on the heightfield. The indexes indicate the rectangles, so if your terrain is made of N x N height data points, you will have rectangle indexes ranging from 0 to N-1.
 * @method getIndexOfPosition
 * @param  {number} x
 * @param  {number} y
 * @param  {array} result Two-element array
 * @param  {boolean} clamp If the position should be clamped to the heightfield edge.
 * @return {boolean}
 */
Heightfield.prototype.getIndexOfPosition = function (x, y, result, clamp) {

    // Get the index of the data points to test against
    var w = this.elementSize;
    var data = this.data;
    var xi = Math.floor(x / w);
    var yi = Math.floor(y / w);

    result[0] = xi;
    result[1] = yi;

    if(clamp){
        // Clamp index to edges
        if(xi < 0){ xi = 0; }
        if(yi < 0){ yi = 0; }
        if(xi >= data.length - 1){ xi = data.length - 1; }
        if(yi >= data[0].length - 1){ yi = data[0].length - 1; }
    }

    // Bail out if we are out of the terrain
    if(xi < 0 || yi < 0 || xi >= data.length-1 || yi >= data[0].length-1){
        return false;
    }

    return true;
};

Heightfield.prototype.getHeightAt = function(x, y, edgeClamp){
    var idx = [];
    this.getIndexOfPosition(x, y, idx, edgeClamp);

    // TODO: get upper or lower triangle, then use barycentric interpolation to get the height in the triangle.
    var minmax = [];
    this.getRectMinMax(idx[0], idx[1] + 1, idx[0], idx[1] + 1, minmax);

    return (minmax[0] + minmax[1]) / 2; // average
};

Heightfield.prototype.getCacheConvexTrianglePillarKey = function(xi, yi, getUpperTriangle){
    return xi + '_' + yi + '_' + (getUpperTriangle ? 1 : 0);
};

Heightfield.prototype.getCachedConvexTrianglePillar = function(xi, yi, getUpperTriangle){
    return this._cachedPillars[this.getCacheConvexTrianglePillarKey(xi, yi, getUpperTriangle)];
};

Heightfield.prototype.setCachedConvexTrianglePillar = function(xi, yi, getUpperTriangle, convex, offset){
    this._cachedPillars[this.getCacheConvexTrianglePillarKey(xi, yi, getUpperTriangle)] = {
        convex: convex,
        offset: offset
    };
};

Heightfield.prototype.clearCachedConvexTrianglePillar = function(xi, yi, getUpperTriangle){
    delete this._cachedPillars[this.getCacheConvexTrianglePillarKey(xi, yi, getUpperTriangle)];
};

/**
 * Get a triangle in the terrain in the form of a triangular convex shape.
 * @method getConvexTrianglePillar
 * @param  {integer} i
 * @param  {integer} j
 * @param  {boolean} getUpperTriangle
 */
Heightfield.prototype.getConvexTrianglePillar = function(xi, yi, getUpperTriangle){
    var result = this.pillarConvex;
    var offsetResult = this.pillarOffset;

    if(this.cacheEnabled){
        var data = this.getCachedConvexTrianglePillar(xi, yi, getUpperTriangle);
        if(data){
            this.pillarConvex = data.convex;
            this.pillarOffset = data.offset;
            return;
        }

        result = new ConvexPolyhedron();
        offsetResult = new Vec3();

        this.pillarConvex = result;
        this.pillarOffset = offsetResult;
    }

    var data = this.data;
    var elementSize = this.elementSize;
    var faces = result.faces;

    // Reuse verts if possible
    result.vertices.length = 6;
    for (var i = 0; i < 6; i++) {
        if(!result.vertices[i]){
            result.vertices[i] = new Vec3();
        }
    }

    // Reuse faces if possible
    faces.length = 5;
    for (var i = 0; i < 5; i++) {
        if(!faces[i]){
            faces[i] = [];
        }
    }

    var verts = result.vertices;

    var h = (Math.min(
        data[xi][yi],
        data[xi+1][yi],
        data[xi][yi+1],
        data[xi+1][yi+1]
    ) - this.minValue ) / 2 + this.minValue;

    if (!getUpperTriangle) {

        // Center of the triangle pillar - all polygons are given relative to this one
        offsetResult.set(
            (xi + 0.25) * elementSize, // sort of center of a triangle
            (yi + 0.25) * elementSize,
            h // vertical center
        );

        // Top triangle verts
        verts[0].set(
            -0.25 * elementSize,
            -0.25 * elementSize,
            data[xi][yi] - h
        );
        verts[1].set(
            0.75 * elementSize,
            -0.25 * elementSize,
            data[xi + 1][yi] - h
        );
        verts[2].set(
            -0.25 * elementSize,
            0.75 * elementSize,
            data[xi][yi + 1] - h
        );

        // bottom triangle verts
        verts[3].set(
            -0.25 * elementSize,
            -0.25 * elementSize,
            -h-1
        );
        verts[4].set(
            0.75 * elementSize,
            -0.25 * elementSize,
            -h-1
        );
        verts[5].set(
            -0.25 * elementSize,
            0.75  * elementSize,
            -h-1
        );

        // top triangle
        faces[0][0] = 0;
        faces[0][1] = 1;
        faces[0][2] = 2;

        // bottom triangle
        faces[1][0] = 5;
        faces[1][1] = 4;
        faces[1][2] = 3;

        // -x facing quad
        faces[2][0] = 0;
        faces[2][1] = 2;
        faces[2][2] = 5;
        faces[2][3] = 3;

        // -y facing quad
        faces[3][0] = 1;
        faces[3][1] = 0;
        faces[3][2] = 3;
        faces[3][3] = 4;

        // +xy facing quad
        faces[4][0] = 4;
        faces[4][1] = 5;
        faces[4][2] = 2;
        faces[4][3] = 1;


    } else {

        // Center of the triangle pillar - all polygons are given relative to this one
        offsetResult.set(
            (xi + 0.75) * elementSize, // sort of center of a triangle
            (yi + 0.75) * elementSize,
            h // vertical center
        );

        // Top triangle verts
        verts[0].set(
            0.25 * elementSize,
            0.25 * elementSize,
            data[xi + 1][yi + 1] - h
        );
        verts[1].set(
            -0.75 * elementSize,
            0.25 * elementSize,
            data[xi][yi + 1] - h
        );
        verts[2].set(
            0.25 * elementSize,
            -0.75 * elementSize,
            data[xi + 1][yi] - h
        );

        // bottom triangle verts
        verts[3].set(
            0.25 * elementSize,
            0.25 * elementSize,
            - h-1
        );
        verts[4].set(
            -0.75 * elementSize,
            0.25 * elementSize,
            - h-1
        );
        verts[5].set(
            0.25 * elementSize,
            -0.75 * elementSize,
            - h-1
        );

        // Top triangle
        faces[0][0] = 0;
        faces[0][1] = 1;
        faces[0][2] = 2;

        // bottom triangle
        faces[1][0] = 5;
        faces[1][1] = 4;
        faces[1][2] = 3;

        // +x facing quad
        faces[2][0] = 2;
        faces[2][1] = 5;
        faces[2][2] = 3;
        faces[2][3] = 0;

        // +y facing quad
        faces[3][0] = 3;
        faces[3][1] = 4;
        faces[3][2] = 1;
        faces[3][3] = 0;

        // -xy facing quad
        faces[4][0] = 1;
        faces[4][1] = 4;
        faces[4][2] = 5;
        faces[4][3] = 2;
    }

    result.computeNormals();
    result.computeEdges();
    result.updateBoundingSphereRadius();

    this.setCachedConvexTrianglePillar(xi, yi, getUpperTriangle, result, offsetResult);
};

Heightfield.prototype.calculateLocalInertia = function(mass, target){
    target = target || new Vec3();
    target.set(0, 0, 0);
    return target;
};

Heightfield.prototype.volume = function(){
    return Number.MAX_VALUE; // The terrain is infinite
};

Heightfield.prototype.calculateWorldAABB = function(pos, quat, min, max){
    // TODO: do it properly
    min.set(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
    max.set(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
};

Heightfield.prototype.updateBoundingSphereRadius = function(){
    // Use the bounding box of the min/max values
    var data = this.data,
        s = this.elementSize;
    this.boundingSphereRadius = new Vec3(data.length * s, data[0].length * s, Math.max(Math.abs(this.maxValue), Math.abs(this.minValue))).norm();
};

},{"../math/Vec3":30,"../utils/Utils":53,"./ConvexPolyhedron":38,"./Shape":43}],41:[function(_dereq_,module,exports){
module.exports = Particle;

var Shape = _dereq_('./Shape');
var Vec3 = _dereq_('../math/Vec3');

/**
 * Particle shape.
 * @class Particle
 * @constructor
 * @author schteppe
 * @extends Shape
 */
function Particle(){
    Shape.call(this);

    this.type = Shape.types.PARTICLE;
}
Particle.prototype = new Shape();
Particle.prototype.constructor = Particle;

/**
 * @method calculateLocalInertia
 * @param  {Number} mass
 * @param  {Vec3} target
 * @return {Vec3}
 */
Particle.prototype.calculateLocalInertia = function(mass,target){
    target = target || new Vec3();
    target.set(0, 0, 0);
    return target;
};

Particle.prototype.volume = function(){
    return 0;
};

Particle.prototype.updateBoundingSphereRadius = function(){
    this.boundingSphereRadius = 0;
};

Particle.prototype.calculateWorldAABB = function(pos,quat,min,max){
    // Get each axis max
    min.copy(pos);
    max.copy(pos);
};

},{"../math/Vec3":30,"./Shape":43}],42:[function(_dereq_,module,exports){
module.exports = Plane;

var Shape = _dereq_('./Shape');
var Vec3 = _dereq_('../math/Vec3');

/**
 * A plane, facing in the Z direction. The plane has its surface at z=0 and everything below z=0 is assumed to be solid plane. To make the plane face in some other direction than z, you must put it inside a RigidBody and rotate that body. See the demos.
 * @class Plane
 * @constructor
 * @extends Shape
 * @author schteppe
 */
function Plane(){
    Shape.call(this);
    this.type = Shape.types.PLANE;

    // World oriented normal
    this.worldNormal = new Vec3();
    this.worldNormalNeedsUpdate = true;

    this.boundingSphereRadius = Number.MAX_VALUE;
}
Plane.prototype = new Shape();
Plane.prototype.constructor = Plane;

Plane.prototype.computeWorldNormal = function(quat){
    var n = this.worldNormal;
    n.set(0,0,1);
    quat.vmult(n,n);
    this.worldNormalNeedsUpdate = false;
};

Plane.prototype.calculateLocalInertia = function(mass,target){
    target = target || new Vec3();
    return target;
};

Plane.prototype.volume = function(){
    return Number.MAX_VALUE; // The plane is infinite...
};

var tempNormal = new Vec3();
Plane.prototype.calculateWorldAABB = function(pos, quat, min, max){
    // The plane AABB is infinite, except if the normal is pointing along any axis
    tempNormal.set(0,0,1); // Default plane normal is z
    quat.vmult(tempNormal,tempNormal);
    var maxVal = Number.MAX_VALUE;
    min.set(-maxVal, -maxVal, -maxVal);
    max.set(maxVal, maxVal, maxVal);

    if(tempNormal.x === 1){ max.x = pos.x; }
    if(tempNormal.y === 1){ max.y = pos.y; }
    if(tempNormal.z === 1){ max.z = pos.z; }

    if(tempNormal.x === -1){ min.x = pos.x; }
    if(tempNormal.y === -1){ min.y = pos.y; }
    if(tempNormal.z === -1){ min.z = pos.z; }
};

Plane.prototype.updateBoundingSphereRadius = function(){
    this.boundingSphereRadius = Number.MAX_VALUE;
};
},{"../math/Vec3":30,"./Shape":43}],43:[function(_dereq_,module,exports){
module.exports = Shape;

var Shape = _dereq_('./Shape');
var Vec3 = _dereq_('../math/Vec3');
var Quaternion = _dereq_('../math/Quaternion');
var Material = _dereq_('../material/Material');

/**
 * Base class for shapes
 * @class Shape
 * @constructor
 * @author schteppe
 * @todo Should have a mechanism for caching bounding sphere radius instead of calculating it each time
 */
function Shape(){

    /**
     * Identifyer of the Shape.
     * @property {number} id
     */
    this.id = Shape.idCounter++;

    /**
     * The type of this shape. Must be set to an int > 0 by subclasses.
     * @property type
     * @type {Number}
     * @see Shape.types
     */
    this.type = 0;

    /**
     * The local bounding sphere radius of this shape.
     * @property {Number} boundingSphereRadius
     */
    this.boundingSphereRadius = 0;

    /**
     * Whether to produce contact forces when in contact with other bodies. Note that contacts will be generated, but they will be disabled.
     * @property {boolean} collisionResponse
     */
    this.collisionResponse = true;

    /**
     * @property {Material} material
     */
    this.material = null;
}
Shape.prototype.constructor = Shape;

/**
 * Computes the bounding sphere radius. The result is stored in the property .boundingSphereRadius
 * @method updateBoundingSphereRadius
 * @return {Number}
 */
Shape.prototype.updateBoundingSphereRadius = function(){
    throw "computeBoundingSphereRadius() not implemented for shape type "+this.type;
};

/**
 * Get the volume of this shape
 * @method volume
 * @return {Number}
 */
Shape.prototype.volume = function(){
    throw "volume() not implemented for shape type "+this.type;
};

/**
 * Calculates the inertia in the local frame for this shape.
 * @method calculateLocalInertia
 * @return {Vec3}
 * @see http://en.wikipedia.org/wiki/List_of_moments_of_inertia
 */
Shape.prototype.calculateLocalInertia = function(mass,target){
    throw "calculateLocalInertia() not implemented for shape type "+this.type;
};

Shape.idCounter = 0;

/**
 * The available shape types.
 * @static
 * @property types
 * @type {Object}
 */
Shape.types = {
    SPHERE:1,
    PLANE:2,
    BOX:4,
    COMPOUND:8,
    CONVEXPOLYHEDRON:16,
    HEIGHTFIELD:32,
    PARTICLE:64,
    CYLINDER:128,
    TRIMESH:256
};


},{"../material/Material":25,"../math/Quaternion":28,"../math/Vec3":30,"./Shape":43}],44:[function(_dereq_,module,exports){
module.exports = Sphere;

var Shape = _dereq_('./Shape');
var Vec3 = _dereq_('../math/Vec3');

/**
 * Spherical shape
 * @class Sphere
 * @constructor
 * @extends Shape
 * @param {Number} radius The radius of the sphere, a non-negative number.
 * @author schteppe / http://github.com/schteppe
 */
function Sphere(radius){
    Shape.call(this);

    /**
     * @property {Number} radius
     */
    this.radius = radius!==undefined ? Number(radius) : 1.0;
    this.type = Shape.types.SPHERE;

    if(this.radius < 0){
        throw new Error('The sphere radius cannot be negative.');
    }

    this.updateBoundingSphereRadius();
}
Sphere.prototype = new Shape();
Sphere.prototype.constructor = Sphere;

Sphere.prototype.calculateLocalInertia = function(mass,target){
    target = target || new Vec3();
    var I = 2.0*mass*this.radius*this.radius/5.0;
    target.x = I;
    target.y = I;
    target.z = I;
    return target;
};

Sphere.prototype.volume = function(){
    return 4.0 * Math.PI * this.radius / 3.0;
};

Sphere.prototype.updateBoundingSphereRadius = function(){
    this.boundingSphereRadius = this.radius;
};

Sphere.prototype.calculateWorldAABB = function(pos,quat,min,max){
    var r = this.radius;
    var axes = ['x','y','z'];
    for(var i=0; i<axes.length; i++){
        var ax = axes[i];
        min[ax] = pos[ax] - r;
        max[ax] = pos[ax] + r;
    }
};

},{"../math/Vec3":30,"./Shape":43}],45:[function(_dereq_,module,exports){
module.exports = Trimesh;

var Shape = _dereq_('./Shape');
var Vec3 = _dereq_('../math/Vec3');
var Quaternion = _dereq_('../math/Quaternion');
var Transform = _dereq_('../math/Transform');
var AABB = _dereq_('../collision/AABB');
var Octree = _dereq_('../utils/Octree');

/**
 * @class Trimesh
 * @constructor
 * @param {array} vertices
 * @param {array} indices
 * @extends Shape
 * @example
 *     // How to make a mesh with a single triangle
 *     var vertices = [
 *         0, 0, 0, // vertex 0
 *         1, 0, 0, // vertex 1
 *         0, 1, 0  // vertex 2
 *     ];
 *     var indices = [
 *         0, 1, 2  // triangle 0
 *     ];
 *     var trimeshShape = new Trimesh(vertices, indices);
 */
function Trimesh(vertices, indices) {
    Shape.call(this);
    this.type = Shape.types.TRIMESH;

    /**
     * @property vertices
     * @type {Array}
     */
    this.vertices = new Float32Array(vertices);

    /**
     * Array of integers, indicating which vertices each triangle consists of. The length of this array is thus 3 times the number of triangles.
     * @property indices
     * @type {Array}
     */
    this.indices = new Int16Array(indices);

    /**
     * The normals data.
     * @property normals
     * @type {Array}
     */
    this.normals = new Float32Array(indices.length);

    /**
     * The local AABB of the mesh.
     * @property aabb
     * @type {Array}
     */
    this.aabb = new AABB();

    /**
     * References to vertex pairs, making up all unique edges in the trimesh.
     * @property {array} edges
     */
    this.edges = null;

    /**
     * Local scaling of the mesh. Use .setScale() to set it.
     * @property {Vec3} scale
     */
    this.scale = new Vec3(1, 1, 1);

    /**
     * The indexed triangles. Use .updateTree() to update it.
     * @property {Octree} tree
     */
    this.tree = new Octree();

    this.updateEdges();
    this.updateNormals();
    this.updateAABB();
    this.updateBoundingSphereRadius();
    this.updateTree();
}
Trimesh.prototype = new Shape();
Trimesh.prototype.constructor = Trimesh;

var computeNormals_n = new Vec3();

/**
 * @method updateTree
 */
Trimesh.prototype.updateTree = function(){
    var tree = this.tree;

    tree.reset();
    tree.aabb.copy(this.aabb);
    var scale = this.scale; // The local mesh AABB is scaled, but the octree AABB should be unscaled
    tree.aabb.lowerBound.x *= 1 / scale.x;
    tree.aabb.lowerBound.y *= 1 / scale.y;
    tree.aabb.lowerBound.z *= 1 / scale.z;
    tree.aabb.upperBound.x *= 1 / scale.x;
    tree.aabb.upperBound.y *= 1 / scale.y;
    tree.aabb.upperBound.z *= 1 / scale.z;

    // Insert all triangles
    var triangleAABB = new AABB();
    var a = new Vec3();
    var b = new Vec3();
    var c = new Vec3();
    var points = [a, b, c];
    for (var i = 0; i < this.indices.length / 3; i++) {
        //this.getTriangleVertices(i, a, b, c);

        // Get unscaled triangle verts
        var i3 = i * 3;
        this._getUnscaledVertex(this.indices[i3], a);
        this._getUnscaledVertex(this.indices[i3 + 1], b);
        this._getUnscaledVertex(this.indices[i3 + 2], c);

        triangleAABB.setFromPoints(points);
        tree.insert(triangleAABB, i);
    }
    tree.removeEmptyNodes();
};

var unscaledAABB = new AABB();

/**
 * Get triangles in a local AABB from the trimesh.
 * @method getTrianglesInAABB
 * @param  {AABB} aabb
 * @param  {array} result An array of integers, referencing the queried triangles.
 */
Trimesh.prototype.getTrianglesInAABB = function(aabb, result){
    unscaledAABB.copy(aabb);

    // Scale it to local
    var scale = this.scale;
    var isx = scale.x;
    var isy = scale.y;
    var isz = scale.z;
    var l = unscaledAABB.lowerBound;
    var u = unscaledAABB.upperBound;
    l.x /= isx;
    l.y /= isy;
    l.z /= isz;
    u.x /= isx;
    u.y /= isy;
    u.z /= isz;

    return this.tree.aabbQuery(unscaledAABB, result);
};

/**
 * @method setScale
 * @param {Vec3} scale
 */
Trimesh.prototype.setScale = function(scale){
    var wasUniform = this.scale.x === this.scale.y === this.scale.z;
    var isUniform = scale.x === scale.y === scale.z;

    if(!(wasUniform && isUniform)){
        // Non-uniform scaling. Need to update normals.
        this.updateNormals();
    }
    this.scale.copy(scale);
    this.updateAABB();
    this.updateBoundingSphereRadius();
};

/**
 * Compute the normals of the faces. Will save in the .normals array.
 * @method updateNormals
 */
Trimesh.prototype.updateNormals = function(){
    var n = computeNormals_n;

    // Generate normals
    var normals = this.normals;
    for(var i=0; i < this.indices.length / 3; i++){
        var i3 = i * 3;

        var a = this.indices[i3],
            b = this.indices[i3 + 1],
            c = this.indices[i3 + 2];

        this.getVertex(a, va);
        this.getVertex(b, vb);
        this.getVertex(c, vc);

        Trimesh.computeNormal(vb, va, vc, n);

        normals[i3] = n.x;
        normals[i3 + 1] = n.y;
        normals[i3 + 2] = n.z;
    }
};

/**
 * Update the .edges property
 * @method updateEdges
 */
Trimesh.prototype.updateEdges = function(){
    var edges = {};
    var add = function(indexA, indexB){
        var key = a < b ? a + '_' + b : b + '_' + a;
        edges[key] = true;
    };
    for(var i=0; i < this.indices.length / 3; i++){
        var i3 = i * 3;
        var a = this.indices[i3],
            b = this.indices[i3 + 1],
            c = this.indices[i3 + 2];
        add(a,b);
        add(b,c);
        add(c,a);
    }
    var keys = Object.keys(edges);
    this.edges = new Int16Array(keys.length * 2);
    for (var i = 0; i < keys.length; i++) {
        var indices = keys[i].split('_');
        this.edges[2 * i] = parseInt(indices[0], 10);
        this.edges[2 * i + 1] = parseInt(indices[1], 10);
    }
};

/**
 * Get an edge vertex
 * @method getEdgeVertex
 * @param  {number} edgeIndex
 * @param  {number} firstOrSecond 0 or 1, depending on which one of the vertices you need.
 * @param  {Vec3} vertexStore Where to store the result
 */
Trimesh.prototype.getEdgeVertex = function(edgeIndex, firstOrSecond, vertexStore){
    var vertexIndex = this.edges[edgeIndex * 2 + (firstOrSecond ? 1 : 0)];
    this.getVertex(vertexIndex, vertexStore);
};

var getEdgeVector_va = new Vec3();
var getEdgeVector_vb = new Vec3();

/**
 * Get a vector along an edge.
 * @method getEdgeVector
 * @param  {number} edgeIndex
 * @param  {Vec3} vectorStore
 */
Trimesh.prototype.getEdgeVector = function(edgeIndex, vectorStore){
    var va = getEdgeVector_va;
    var vb = getEdgeVector_vb;
    this.getEdgeVertex(edgeIndex, 0, va);
    this.getEdgeVertex(edgeIndex, 1, vb);
    vb.vsub(va, vectorStore);
};

/**
 * Get face normal given 3 vertices
 * @static
 * @method computeNormal
 * @param {Vec3} va
 * @param {Vec3} vb
 * @param {Vec3} vc
 * @param {Vec3} target
 */
var cb = new Vec3();
var ab = new Vec3();
Trimesh.computeNormal = function ( va, vb, vc, target ) {
    vb.vsub(va,ab);
    vc.vsub(vb,cb);
    cb.cross(ab,target);
    if ( !target.isZero() ) {
        target.normalize();
    }
};

var va = new Vec3();
var vb = new Vec3();
var vc = new Vec3();

/**
 * Get vertex i.
 * @method getVertex
 * @param  {number} i
 * @param  {Vec3} out
 * @return {Vec3} The "out" vector object
 */
Trimesh.prototype.getVertex = function(i, out){
    var scale = this.scale;
    this._getUnscaledVertex(i, out);
    out.x *= scale.x;
    out.y *= scale.y;
    out.z *= scale.z;
    return out;
};

/**
 * Get raw vertex i
 * @private
 * @method _getUnscaledVertex
 * @param  {number} i
 * @param  {Vec3} out
 * @return {Vec3} The "out" vector object
 */
Trimesh.prototype._getUnscaledVertex = function(i, out){
    var i3 = i * 3;
    var vertices = this.vertices;
    return out.set(
        vertices[i3],
        vertices[i3 + 1],
        vertices[i3 + 2]
    );
};

/**
 * Get a vertex from the trimesh,transformed by the given position and quaternion.
 * @method getWorldVertex
 * @param  {number} i
 * @param  {Vec3} pos
 * @param  {Quaternion} quat
 * @param  {Vec3} out
 * @return {Vec3} The "out" vector object
 */
Trimesh.prototype.getWorldVertex = function(i, pos, quat, out){
    this.getVertex(i, out);
    Transform.pointToWorldFrame(pos, quat, out, out);
    return out;
};

/**
 * Get the three vertices for triangle i.
 * @method getTriangleVertices
 * @param  {number} i
 * @param  {Vec3} a
 * @param  {Vec3} b
 * @param  {Vec3} c
 */
Trimesh.prototype.getTriangleVertices = function(i, a, b, c){
    var i3 = i * 3;
    this.getVertex(this.indices[i3], a);
    this.getVertex(this.indices[i3 + 1], b);
    this.getVertex(this.indices[i3 + 2], c);
};

/**
 * Compute the normal of triangle i.
 * @method getNormal
 * @param  {Number} i
 * @param  {Vec3} target
 * @return {Vec3} The "target" vector object
 */
Trimesh.prototype.getNormal = function(i, target){
    var i3 = i * 3;
    return target.set(
        this.normals[i3],
        this.normals[i3 + 1],
        this.normals[i3 + 2]
    );
};

var cli_aabb = new AABB();

/**
 * @method calculateLocalInertia
 * @param  {Number} mass
 * @param  {Vec3} target
 * @return {Vec3} The "target" vector object
 */
Trimesh.prototype.calculateLocalInertia = function(mass,target){
    // Approximate with box inertia
    // Exact inertia calculation is overkill, but see http://geometrictools.com/Documentation/PolyhedralMassProperties.pdf for the correct way to do it
    this.computeLocalAABB(cli_aabb);
    var x = cli_aabb.upperBound.x - cli_aabb.lowerBound.x,
        y = cli_aabb.upperBound.y - cli_aabb.lowerBound.y,
        z = cli_aabb.upperBound.z - cli_aabb.lowerBound.z;
    return target.set(
        1.0 / 12.0 * mass * ( 2*y*2*y + 2*z*2*z ),
        1.0 / 12.0 * mass * ( 2*x*2*x + 2*z*2*z ),
        1.0 / 12.0 * mass * ( 2*y*2*y + 2*x*2*x )
    );
};

var computeLocalAABB_worldVert = new Vec3();

/**
 * Compute the local AABB for the trimesh
 * @method computeLocalAABB
 * @param  {AABB} aabb
 */
Trimesh.prototype.computeLocalAABB = function(aabb){
    var l = aabb.lowerBound,
        u = aabb.upperBound,
        n = this.vertices.length,
        vertices = this.vertices,
        v = computeLocalAABB_worldVert;

    this.getVertex(0, v);
    l.copy(v);
    u.copy(v);

    for(var i=0; i !== n; i++){
        this.getVertex(i, v);

        if(v.x < l.x){
            l.x = v.x;
        } else if(v.x > u.x){
            u.x = v.x;
        }

        if(v.y < l.y){
            l.y = v.y;
        } else if(v.y > u.y){
            u.y = v.y;
        }

        if(v.z < l.z){
            l.z = v.z;
        } else if(v.z > u.z){
            u.z = v.z;
        }
    }
};


/**
 * Update the .aabb property
 * @method updateAABB
 */
Trimesh.prototype.updateAABB = function(){
    this.computeLocalAABB(this.aabb);
};

/**
 * Will update the .boundingSphereRadius property
 * @method updateBoundingSphereRadius
 */
Trimesh.prototype.updateBoundingSphereRadius = function(){
    // Assume points are distributed with local (0,0,0) as center
    var max2 = 0;
    var vertices = this.vertices;
    var v = new Vec3();
    for(var i=0, N=vertices.length / 3; i !== N; i++) {
        this.getVertex(i, v);
        var norm2 = v.norm2();
        if(norm2 > max2){
            max2 = norm2;
        }
    }
    this.boundingSphereRadius = Math.sqrt(max2);
};

var tempWorldVertex = new Vec3();
var calculateWorldAABB_frame = new Transform();
var calculateWorldAABB_aabb = new AABB();

/**
 * @method calculateWorldAABB
 * @param {Vec3}        pos
 * @param {Quaternion}  quat
 * @param {Vec3}        min
 * @param {Vec3}        max
 */
Trimesh.prototype.calculateWorldAABB = function(pos,quat,min,max){
    /*
    var n = this.vertices.length / 3,
        verts = this.vertices;
    var minx,miny,minz,maxx,maxy,maxz;

    var v = tempWorldVertex;
    for(var i=0; i<n; i++){
        this.getVertex(i, v);
        quat.vmult(v, v);
        pos.vadd(v, v);
        if (v.x < minx || minx===undefined){
            minx = v.x;
        } else if(v.x > maxx || maxx===undefined){
            maxx = v.x;
        }

        if (v.y < miny || miny===undefined){
            miny = v.y;
        } else if(v.y > maxy || maxy===undefined){
            maxy = v.y;
        }

        if (v.z < minz || minz===undefined){
            minz = v.z;
        } else if(v.z > maxz || maxz===undefined){
            maxz = v.z;
        }
    }
    min.set(minx,miny,minz);
    max.set(maxx,maxy,maxz);
    */

    // Faster approximation using local AABB
    var frame = calculateWorldAABB_frame;
    var result = calculateWorldAABB_aabb;
    frame.position = pos;
    frame.quaternion = quat;
    this.aabb.toWorldFrame(frame, result);
    min.copy(result.lowerBound);
    max.copy(result.upperBound);
};

/**
 * Get approximate volume
 * @method volume
 * @return {Number}
 */
Trimesh.prototype.volume = function(){
    return 4.0 * Math.PI * this.boundingSphereRadius / 3.0;
};

/**
 * Create a Trimesh instance, shaped as a torus.
 * @static
 * @method createTorus
 * @param  {number} [radius=1]
 * @param  {number} [tube=0.5]
 * @param  {number} [radialSegments=8]
 * @param  {number} [tubularSegments=6]
 * @param  {number} [arc=6.283185307179586]
 * @return {Trimesh} A torus
 */
Trimesh.createTorus = function (radius, tube, radialSegments, tubularSegments, arc) {
    radius = radius || 1;
    tube = tube || 0.5;
    radialSegments = radialSegments || 8;
    tubularSegments = tubularSegments || 6;
    arc = arc || Math.PI * 2;

    var vertices = [];
    var indices = [];

    for ( var j = 0; j <= radialSegments; j ++ ) {
        for ( var i = 0; i <= tubularSegments; i ++ ) {
            var u = i / tubularSegments * arc;
            var v = j / radialSegments * Math.PI * 2;

            var x = ( radius + tube * Math.cos( v ) ) * Math.cos( u );
            var y = ( radius + tube * Math.cos( v ) ) * Math.sin( u );
            var z = tube * Math.sin( v );

            vertices.push( x, y, z );
        }
    }

    for ( var j = 1; j <= radialSegments; j ++ ) {
        for ( var i = 1; i <= tubularSegments; i ++ ) {
            var a = ( tubularSegments + 1 ) * j + i - 1;
            var b = ( tubularSegments + 1 ) * ( j - 1 ) + i - 1;
            var c = ( tubularSegments + 1 ) * ( j - 1 ) + i;
            var d = ( tubularSegments + 1 ) * j + i;

            indices.push(a, b, d);
            indices.push(b, c, d);
        }
    }

    return new Trimesh(vertices, indices);
};

},{"../collision/AABB":3,"../math/Quaternion":28,"../math/Transform":29,"../math/Vec3":30,"../utils/Octree":50,"./Shape":43}],46:[function(_dereq_,module,exports){
module.exports = GSSolver;

var Vec3 = _dereq_('../math/Vec3');
var Quaternion = _dereq_('../math/Quaternion');
var Solver = _dereq_('./Solver');

/**
 * Constraint equation Gauss-Seidel solver.
 * @class GSSolver
 * @constructor
 * @todo The spook parameters should be specified for each constraint, not globally.
 * @author schteppe / https://github.com/schteppe
 * @see https://www8.cs.umu.se/kurser/5DV058/VT09/lectures/spooknotes.pdf
 * @extends Solver
 */
function GSSolver(){
    Solver.call(this);

    /**
     * The number of solver iterations determines quality of the constraints in the world. The more iterations, the more correct simulation. More iterations need more computations though. If you have a large gravity force in your world, you will need more iterations.
     * @property iterations
     * @type {Number}
     * @todo write more about solver and iterations in the wiki
     */
    this.iterations = 10;

    /**
     * When tolerance is reached, the system is assumed to be converged.
     * @property tolerance
     * @type {Number}
     */
    this.tolerance = 1e-7;
}
GSSolver.prototype = new Solver();

var GSSolver_solve_lambda = []; // Just temporary number holders that we want to reuse each solve.
var GSSolver_solve_invCs = [];
var GSSolver_solve_Bs = [];
GSSolver.prototype.solve = function(dt,world){
    var iter = 0,
        maxIter = this.iterations,
        tolSquared = this.tolerance*this.tolerance,
        equations = this.equations,
        Neq = equations.length,
        bodies = world.bodies,
        Nbodies = bodies.length,
        h = dt,
        q, B, invC, deltalambda, deltalambdaTot, GWlambda, lambdaj;

    // Update solve mass
    if(Neq !== 0){
        for(var i=0; i!==Nbodies; i++){
            bodies[i].updateSolveMassProperties();
        }
    }

    // Things that does not change during iteration can be computed once
    var invCs = GSSolver_solve_invCs,
        Bs = GSSolver_solve_Bs,
        lambda = GSSolver_solve_lambda;
    invCs.length = Neq;
    Bs.length = Neq;
    lambda.length = Neq;
    for(var i=0; i!==Neq; i++){
        var c = equations[i];
        lambda[i] = 0.0;
        Bs[i] = c.computeB(h);
        invCs[i] = 1.0 / c.computeC();
    }

    if(Neq !== 0){

        // Reset vlambda
        for(var i=0; i!==Nbodies; i++){
            var b=bodies[i],
                vlambda=b.vlambda,
                wlambda=b.wlambda;
            vlambda.set(0,0,0);
            if(wlambda){
                wlambda.set(0,0,0);
            }
        }

        // Iterate over equations
        for(iter=0; iter!==maxIter; iter++){

            // Accumulate the total error for each iteration.
            deltalambdaTot = 0.0;

            for(var j=0; j!==Neq; j++){

                var c = equations[j];

                // Compute iteration
                B = Bs[j];
                invC = invCs[j];
                lambdaj = lambda[j];
                GWlambda = c.computeGWlambda();
                deltalambda = invC * ( B - GWlambda - c.eps * lambdaj );

                // Clamp if we are not within the min/max interval
                if(lambdaj + deltalambda < c.minForce){
                    deltalambda = c.minForce - lambdaj;
                } else if(lambdaj + deltalambda > c.maxForce){
                    deltalambda = c.maxForce - lambdaj;
                }
                lambda[j] += deltalambda;

                deltalambdaTot += deltalambda > 0.0 ? deltalambda : -deltalambda; // abs(deltalambda)

                c.addToWlambda(deltalambda);
            }

            // If the total error is small enough - stop iterate
            if(deltalambdaTot*deltalambdaTot < tolSquared){
                break;
            }
        }

        // Add result to velocity
        for(var i=0; i!==Nbodies; i++){
            var b=bodies[i],
                v=b.velocity,
                w=b.angularVelocity;
            v.vadd(b.vlambda, v);
            if(w){
                w.vadd(b.wlambda, w);
            }
        }
    }

    return iter;
};

},{"../math/Quaternion":28,"../math/Vec3":30,"./Solver":47}],47:[function(_dereq_,module,exports){
module.exports = Solver;

/**
 * Constraint equation solver base class.
 * @class Solver
 * @constructor
 * @author schteppe / https://github.com/schteppe
 */
function Solver(){
    /**
     * All equations to be solved
     * @property {Array} equations
     */
    this.equations = [];
}

/**
 * Should be implemented in subclasses!
 * @method solve
 * @param  {Number} dt
 * @param  {World} world
 */
Solver.prototype.solve = function(dt,world){
    // Should return the number of iterations done!
    return 0;
};

/**
 * Add an equation
 * @method addEquation
 * @param {Equation} eq
 */
Solver.prototype.addEquation = function(eq){
    if (eq.enabled) {
        this.equations.push(eq);
    }
};

/**
 * Remove an equation
 * @method removeEquation
 * @param {Equation} eq
 */
Solver.prototype.removeEquation = function(eq){
    var eqs = this.equations;
    var i = eqs.indexOf(eq);
    if(i !== -1){
        eqs.splice(i,1);
    }
};

/**
 * Add all equations
 * @method removeAllEquations
 */
Solver.prototype.removeAllEquations = function(){
    this.equations.length = 0;
};


},{}],48:[function(_dereq_,module,exports){
module.exports = SplitSolver;

var Vec3 = _dereq_('../math/Vec3');
var Quaternion = _dereq_('../math/Quaternion');
var Solver = _dereq_('./Solver');
var Body = _dereq_('../objects/Body');

/**
 * Splits the equations into islands and solves them independently. Can improve performance.
 * @class SplitSolver
 * @constructor
 * @extends Solver
 * @param {Solver} subsolver
 */
function SplitSolver(subsolver){
    Solver.call(this);
    this.iterations = 10;
    this.tolerance = 1e-7;
    this.subsolver = subsolver;
    this.nodes = [];
    this.nodePool = [];

    // Create needed nodes, reuse if possible
    while(this.nodePool.length < 128){
        this.nodePool.push(this.createNode());
    }
}
SplitSolver.prototype = new Solver();

// Returns the number of subsystems
var SplitSolver_solve_nodes = []; // All allocated node objects
var SplitSolver_solve_nodePool = []; // All allocated node objects
var SplitSolver_solve_eqs = [];   // Temp array
var SplitSolver_solve_bds = [];   // Temp array
var SplitSolver_solve_dummyWorld = {bodies:[]}; // Temp object

var STATIC = Body.STATIC;
function getUnvisitedNode(nodes){
    var Nnodes = nodes.length;
    for(var i=0; i!==Nnodes; i++){
        var node = nodes[i];
        if(!node.visited && !(node.body.type & STATIC)){
            return node;
        }
    }
    return false;
}

var queue = [];
function bfs(root,visitFunc,bds,eqs){
    queue.push(root);
    root.visited = true;
    visitFunc(root,bds,eqs);
    while(queue.length) {
        var node = queue.pop();
        // Loop over unvisited child nodes
        var child;
        while((child = getUnvisitedNode(node.children))) {
            child.visited = true;
            visitFunc(child,bds,eqs);
            queue.push(child);
        }
    }
}

function visitFunc(node,bds,eqs){
    bds.push(node.body);
    var Neqs = node.eqs.length;
    for(var i=0; i!==Neqs; i++){
        var eq = node.eqs[i];
        if(eqs.indexOf(eq) === -1){
            eqs.push(eq);
        }
    }
}

SplitSolver.prototype.createNode = function(){
    return { body:null, children:[], eqs:[], visited:false };
};

/**
 * Solve the subsystems
 * @method solve
 * @param  {Number} dt
 * @param  {World} world
 */
SplitSolver.prototype.solve = function(dt,world){
    var nodes=SplitSolver_solve_nodes,
        nodePool=this.nodePool,
        bodies=world.bodies,
        equations=this.equations,
        Neq=equations.length,
        Nbodies=bodies.length,
        subsolver=this.subsolver;

    // Create needed nodes, reuse if possible
    while(nodePool.length < Nbodies){
        nodePool.push(this.createNode());
    }
    nodes.length = Nbodies;
    for (var i = 0; i < Nbodies; i++) {
        nodes[i] = nodePool[i];
    }

    // Reset node values
    for(var i=0; i!==Nbodies; i++){
        var node = nodes[i];
        node.body = bodies[i];
        node.children.length = 0;
        node.eqs.length = 0;
        node.visited = false;
    }
    for(var k=0; k!==Neq; k++){
        var eq=equations[k],
            i=bodies.indexOf(eq.bi),
            j=bodies.indexOf(eq.bj),
            ni=nodes[i],
            nj=nodes[j];
        ni.children.push(nj);
        ni.eqs.push(eq);
        nj.children.push(ni);
        nj.eqs.push(eq);
    }

    var child, n=0, eqs=SplitSolver_solve_eqs;

    subsolver.tolerance = this.tolerance;
    subsolver.iterations = this.iterations;

    var dummyWorld = SplitSolver_solve_dummyWorld;
    while((child = getUnvisitedNode(nodes))){
        eqs.length = 0;
        dummyWorld.bodies.length = 0;
        bfs(child, visitFunc, dummyWorld.bodies, eqs);

        var Neqs = eqs.length;

        eqs = eqs.sort(sortById);

        for(var i=0; i!==Neqs; i++){
            subsolver.addEquation(eqs[i]);
        }

        var iter = subsolver.solve(dt,dummyWorld);
        subsolver.removeAllEquations();
        n++;
    }

    return n;
};

function sortById(a, b){
    return b.id - a.id;
}
},{"../math/Quaternion":28,"../math/Vec3":30,"../objects/Body":31,"./Solver":47}],49:[function(_dereq_,module,exports){
/**
 * Base class for objects that dispatches events.
 * @class EventTarget
 * @constructor
 */
var EventTarget = function () {

};

module.exports = EventTarget;

EventTarget.prototype = {
    constructor: EventTarget,

    /**
     * Add an event listener
     * @method addEventListener
     * @param  {String} type
     * @param  {Function} listener
     * @return {EventTarget} The self object, for chainability.
     */
    addEventListener: function ( type, listener ) {
        if ( this._listeners === undefined ){ this._listeners = {}; }
        var listeners = this._listeners;
        if ( listeners[ type ] === undefined ) {
            listeners[ type ] = [];
        }
        if ( listeners[ type ].indexOf( listener ) === - 1 ) {
            listeners[ type ].push( listener );
        }
        return this;
    },

    /**
     * Check if an event listener is added
     * @method hasEventListener
     * @param  {String} type
     * @param  {Function} listener
     * @return {Boolean}
     */
    hasEventListener: function ( type, listener ) {
        if ( this._listeners === undefined ){ return false; }
        var listeners = this._listeners;
        if ( listeners[ type ] !== undefined && listeners[ type ].indexOf( listener ) !== - 1 ) {
            return true;
        }
        return false;
    },

    /**
     * Remove an event listener
     * @method removeEventListener
     * @param  {String} type
     * @param  {Function} listener
     * @return {EventTarget} The self object, for chainability.
     */
    removeEventListener: function ( type, listener ) {
        if ( this._listeners === undefined ){ return this; }
        var listeners = this._listeners;
        if ( listeners[type] === undefined ){ return this; }
        var index = listeners[ type ].indexOf( listener );
        if ( index !== - 1 ) {
            listeners[ type ].splice( index, 1 );
        }
        return this;
    },

    /**
     * Emit an event.
     * @method dispatchEvent
     * @param  {Object} event
     * @param  {String} event.type
     * @return {EventTarget} The self object, for chainability.
     */
    dispatchEvent: function ( event ) {
        if ( this._listeners === undefined ){ return this; }
        var listeners = this._listeners;
        var listenerArray = listeners[ event.type ];
        if ( listenerArray !== undefined ) {
            event.target = this;
            for ( var i = 0, l = listenerArray.length; i < l; i ++ ) {
                listenerArray[ i ].call( this, event );
            }
        }
        return this;
    }
};

},{}],50:[function(_dereq_,module,exports){
var AABB = _dereq_('../collision/AABB');
var Vec3 = _dereq_('../math/Vec3');

module.exports = Octree;

/**
 * @class OctreeNode
 * @param {object} [options]
 * @param {Octree} [options.root]
 * @param {AABB} [options.aabb]
 */
function OctreeNode(options){
    options = options || {};

    /**
     * The root node
     * @property {OctreeNode} root
     */
    this.root = options.root || null;

    /**
     * Boundary of this node
     * @property {AABB} aabb
     */
    this.aabb = options.aabb ? options.aabb.clone() : new AABB();

    /**
     * Contained data at the current node level.
     * @property {Array} data
     */
    this.data = [];

    /**
     * Children to this node
     * @property {Array} children
     */
    this.children = [];
}

/**
 * @class Octree
 * @param {AABB} aabb The total AABB of the tree
 * @param {object} [options]
 * @param {number} [options.maxDepth=8]
 * @extends OctreeNode
 */
function Octree(aabb, options){
    options = options || {};
    options.root = null;
    options.aabb = aabb;
    OctreeNode.call(this, options);

    /**
     * Maximum subdivision depth
     * @property {number} maxDepth
     */
    this.maxDepth = typeof(options.maxDepth) !== 'undefined' ? options.maxDepth : 8;
}
Octree.prototype = new OctreeNode();

OctreeNode.prototype.reset = function(aabb, options){
    this.children.length = this.data.length = 0;
};

/**
 * Insert data into this node
 * @method insert
 * @param  {AABB} aabb
 * @param  {object} elementData
 * @return {boolean} True if successful, otherwise false
 */
OctreeNode.prototype.insert = function(aabb, elementData, level){
    var nodeData = this.data;
    level = level || 0;

    // Ignore objects that do not belong in this node
    if (!this.aabb.contains(aabb)){
        return false; // object cannot be added
    }

    var children = this.children;

    if(level < (this.maxDepth || this.root.maxDepth)){
        // Subdivide if there are no children yet
        var subdivided = false;
        if (!children.length){
            this.subdivide();
            subdivided = true;
        }

        // add to whichever node will accept it
        for (var i = 0; i !== 8; i++) {
            if (children[i].insert(aabb, elementData, level + 1)){
                return true;
            }
        }

        if(subdivided){
            // No children accepted! Might as well just remove em since they contain none
            children.length = 0;
        }
    }

    // Too deep, or children didnt want it. add it in current node
    nodeData.push(elementData);

    return true;
};

var halfDiagonal = new Vec3();

/**
 * Create 8 equally sized children nodes and put them in the .children array.
 * @method subdivide
 */
OctreeNode.prototype.subdivide = function() {
    var aabb = this.aabb;
    var l = aabb.lowerBound;
    var u = aabb.upperBound;

    var children = this.children;

    children.push(
        new OctreeNode({ aabb: new AABB({ lowerBound: new Vec3(0,0,0) }) }),
        new OctreeNode({ aabb: new AABB({ lowerBound: new Vec3(1,0,0) }) }),
        new OctreeNode({ aabb: new AABB({ lowerBound: new Vec3(1,1,0) }) }),
        new OctreeNode({ aabb: new AABB({ lowerBound: new Vec3(1,1,1) }) }),
        new OctreeNode({ aabb: new AABB({ lowerBound: new Vec3(0,1,1) }) }),
        new OctreeNode({ aabb: new AABB({ lowerBound: new Vec3(0,0,1) }) }),
        new OctreeNode({ aabb: new AABB({ lowerBound: new Vec3(1,0,1) }) }),
        new OctreeNode({ aabb: new AABB({ lowerBound: new Vec3(0,1,0) }) })
    );

    u.vsub(l, halfDiagonal);
    halfDiagonal.scale(0.5, halfDiagonal);

    var root = this.root || this;

    for (var i = 0; i !== 8; i++) {
        var child = children[i];

        // Set current node as root
        child.root = root;

        // Compute bounds
        var lowerBound = child.aabb.lowerBound;
        lowerBound.x *= halfDiagonal.x;
        lowerBound.y *= halfDiagonal.y;
        lowerBound.z *= halfDiagonal.z;

        lowerBound.vadd(l, lowerBound);

        // Upper bound is always lower bound + halfDiagonal
        lowerBound.vadd(halfDiagonal, child.aabb.upperBound);
    }
};

/**
 * Get all data, potentially within an AABB
 * @method aabbQuery
 * @param  {AABB} aabb
 * @param  {array} result
 * @return {array} The "result" object
 */
OctreeNode.prototype.aabbQuery = function(aabb, result) {

    var nodeData = this.data;

    // abort if the range does not intersect this node
    // if (!this.aabb.overlaps(aabb)){
    //     return result;
    // }

    // Add objects at this level
    // Array.prototype.push.apply(result, nodeData);

    // Add child data
    // @todo unwrap recursion into a queue / loop, that's faster in JS
    var children = this.children;


    // for (var i = 0, N = this.children.length; i !== N; i++) {
    //     children[i].aabbQuery(aabb, result);
    // }

    var queue = [this];
    while (queue.length) {
        var node = queue.pop();
        if (node.aabb.overlaps(aabb)){
            Array.prototype.push.apply(result, node.data);
        }
        Array.prototype.push.apply(queue, node.children);
    }

    return result;
};

var tmpAABB = new AABB();

/**
 * Get all data, potentially intersected by a ray.
 * @method rayQuery
 * @param  {Ray} ray
 * @param  {Transform} treeTransform
 * @param  {array} result
 * @return {array} The "result" object
 */
OctreeNode.prototype.rayQuery = function(ray, treeTransform, result) {

    // Use aabb query for now.
    // @todo implement real ray query which needs less lookups
    ray.getAABB(tmpAABB);
    tmpAABB.toLocalFrame(treeTransform, tmpAABB);
    this.aabbQuery(tmpAABB, result);

    return result;
};

/**
 * @method removeEmptyNodes
 */
OctreeNode.prototype.removeEmptyNodes = function() {
    var queue = [this];
    while (queue.length) {
        var node = queue.pop();
        for (var i = node.children.length - 1; i >= 0; i--) {
            if(!node.children[i].data.length){
                node.children.splice(i, 1);
            }
        }
        Array.prototype.push.apply(queue, node.children);
    }
};

},{"../collision/AABB":3,"../math/Vec3":30}],51:[function(_dereq_,module,exports){
module.exports = Pool;

/**
 * For pooling objects that can be reused.
 * @class Pool
 * @constructor
 */
function Pool(){
    /**
     * The pooled objects
     * @property {Array} objects
     */
    this.objects = [];

    /**
     * Constructor of the objects
     * @property {mixed} type
     */
    this.type = Object;
}

/**
 * Release an object after use
 * @method release
 * @param {Object} obj
 */
Pool.prototype.release = function(){
    var Nargs = arguments.length;
    for(var i=0; i!==Nargs; i++){
        this.objects.push(arguments[i]);
    }
};

/**
 * Get an object
 * @method get
 * @return {mixed}
 */
Pool.prototype.get = function(){
    if(this.objects.length===0){
        return this.constructObject();
    } else {
        return this.objects.pop();
    }
};

/**
 * Construct an object. Should be implmented in each subclass.
 * @method constructObject
 * @return {mixed}
 */
Pool.prototype.constructObject = function(){
    throw new Error("constructObject() not implemented in this Pool subclass yet!");
};

},{}],52:[function(_dereq_,module,exports){
module.exports = TupleDictionary;

/**
 * @class TupleDictionary
 * @constructor
 */
function TupleDictionary() {

    /**
     * The data storage
     * @property data
     * @type {Object}
     */
    this.data = { keys:[] };
}

/**
 * @method get
 * @param  {Number} i
 * @param  {Number} j
 * @return {Number}
 */
TupleDictionary.prototype.get = function(i, j) {
    if (i > j) {
        // swap
        var temp = j;
        j = i;
        i = temp;
    }
    return this.data[i+'-'+j];
};

/**
 * @method set
 * @param  {Number} i
 * @param  {Number} j
 * @param {Number} value
 */
TupleDictionary.prototype.set = function(i, j, value) {
    if (i > j) {
        var temp = j;
        j = i;
        i = temp;
    }
    var key = i+'-'+j;

    // Check if key already exists
    if(!this.get(i,j)){
        this.data.keys.push(key);
    }

    this.data[key] = value;
};

/**
 * @method reset
 */
TupleDictionary.prototype.reset = function() {
    var data = this.data,
        keys = data.keys;
    while(keys.length > 0){
        var key = keys.pop();
        delete data[key];
    }
};

},{}],53:[function(_dereq_,module,exports){
function Utils(){}

module.exports = Utils;

/**
 * Extend an options object with default values.
 * @static
 * @method defaults
 * @param  {object} options The options object. May be falsy: in this case, a new object is created and returned.
 * @param  {object} defaults An object containing default values.
 * @return {object} The modified options object.
 */
Utils.defaults = function(options, defaults){
    options = options || {};

    for(var key in defaults){
        if(!(key in options)){
            options[key] = defaults[key];
        }
    }

    return options;
};

},{}],54:[function(_dereq_,module,exports){
module.exports = Vec3Pool;

var Vec3 = _dereq_('../math/Vec3');
var Pool = _dereq_('./Pool');

/**
 * @class Vec3Pool
 * @constructor
 * @extends Pool
 */
function Vec3Pool(){
    Pool.call(this);
    this.type = Vec3;
}
Vec3Pool.prototype = new Pool();

/**
 * Construct a vector
 * @method constructObject
 * @return {Vec3}
 */
Vec3Pool.prototype.constructObject = function(){
    return new Vec3();
};

},{"../math/Vec3":30,"./Pool":51}],55:[function(_dereq_,module,exports){
module.exports = Narrowphase;

var AABB = _dereq_('../collision/AABB');
var Shape = _dereq_('../shapes/Shape');
var Ray = _dereq_('../collision/Ray');
var Vec3 = _dereq_('../math/Vec3');
var Transform = _dereq_('../math/Transform');
var ConvexPolyhedron = _dereq_('../shapes/ConvexPolyhedron');
var Quaternion = _dereq_('../math/Quaternion');
var Solver = _dereq_('../solver/Solver');
var Vec3Pool = _dereq_('../utils/Vec3Pool');
var ContactEquation = _dereq_('../equations/ContactEquation');
var FrictionEquation = _dereq_('../equations/FrictionEquation');

/**
 * Helper class for the World. Generates ContactEquations.
 * @class Narrowphase
 * @constructor
 * @todo Sphere-ConvexPolyhedron contacts
 * @todo Contact reduction
 * @todo  should move methods to prototype
 */
function Narrowphase(world){

    /**
     * Internal storage of pooled contact points.
     * @property {Array} contactPointPool
     */
    this.contactPointPool = [];

    this.frictionEquationPool = [];

    this.result = [];
    this.frictionResult = [];

    /**
     * Pooled vectors.
     * @property {Vec3Pool} v3pool
     */
    this.v3pool = new Vec3Pool();

    this.world = world;
    this.currentContactMaterial = null;

    /**
     * @property {Boolean} enableFrictionReduction
     */
    this.enableFrictionReduction = false;
}

/**
 * Make a contact object, by using the internal pool or creating a new one.
 * @method createContactEquation
 * @return {ContactEquation}
 */
Narrowphase.prototype.createContactEquation = function(bi, bj, si, sj, rsi, rsj){
    var c;
    if(this.contactPointPool.length){
        c = this.contactPointPool.pop();
        c.bi = bi;
        c.bj = bj;
    } else {
        c = new ContactEquation(bi, bj);
    }

    c.enabled = bi.collisionResponse && bj.collisionResponse && si.collisionResponse && sj.collisionResponse;

    var cm = this.currentContactMaterial;

    c.restitution = cm.restitution;

    c.setSpookParams(
        cm.contactEquationStiffness,
        cm.contactEquationRelaxation,
        this.world.dt
    );

    var matA = si.material || bi.material;
    var matB = sj.material || bj.material;
    if(matA && matB && matA.restitution >= 0 && matB.restitution >= 0){
        c.restitution = matA.restitution * matB.restitution;
    }

    c.si = rsi || si;
    c.sj = rsj || sj;

    return c;
};

Narrowphase.prototype.createFrictionEquationsFromContact = function(contactEquation, outArray){
    var bodyA = contactEquation.bi;
    var bodyB = contactEquation.bj;
    var shapeA = contactEquation.si;
    var shapeB = contactEquation.sj;

    var world = this.world;
    var cm = this.currentContactMaterial;

    // If friction or restitution were specified in the material, use them
    var friction = cm.friction;
    var matA = shapeA.material || bodyA.material;
    var matB = shapeB.material || bodyB.material;
    if(matA && matB && matA.friction >= 0 && matB.friction >= 0){
        friction = matA.friction * matB.friction;
    }

    if(friction > 0){

        // Create 2 tangent equations
        var mug = friction * world.gravity.length();
        var reducedMass = (bodyA.invMass + bodyB.invMass);
        if(reducedMass > 0){
            reducedMass = 1/reducedMass;
        }
        var pool = this.frictionEquationPool;
        var c1 = pool.length ? pool.pop() : new FrictionEquation(bodyA,bodyB,mug*reducedMass);
        var c2 = pool.length ? pool.pop() : new FrictionEquation(bodyA,bodyB,mug*reducedMass);

        c1.bi = c2.bi = bodyA;
        c1.bj = c2.bj = bodyB;
        c1.minForce = c2.minForce = -mug*reducedMass;
        c1.maxForce = c2.maxForce = mug*reducedMass;

        // Copy over the relative vectors
        c1.ri.copy(contactEquation.ri);
        c1.rj.copy(contactEquation.rj);
        c2.ri.copy(contactEquation.ri);
        c2.rj.copy(contactEquation.rj);

        // Construct tangents
        contactEquation.ni.tangents(c1.t, c2.t);

        // Set spook params
        c1.setSpookParams(cm.frictionEquationStiffness, cm.frictionEquationRelaxation, world.dt);
        c2.setSpookParams(cm.frictionEquationStiffness, cm.frictionEquationRelaxation, world.dt);

        c1.enabled = c2.enabled = contactEquation.enabled;

        outArray.push(c1, c2);

        return true;
    }

    return false;
};

var averageNormal = new Vec3();
var averageContactPointA = new Vec3();
var averageContactPointB = new Vec3();

// Take the average N latest contact point on the plane.
Narrowphase.prototype.createFrictionFromAverage = function(numContacts){
    // The last contactEquation
    var c = this.result[this.result.length - 1];

    // Create the result: two "average" friction equations
    if (!this.createFrictionEquationsFromContact(c, this.frictionResult) || numContacts === 1) {
        return;
    }

    var f1 = this.frictionResult[this.frictionResult.length - 2];
    var f2 = this.frictionResult[this.frictionResult.length - 1];

    averageNormal.setZero();
    averageContactPointA.setZero();
    averageContactPointB.setZero();

    var bodyA = c.bi;
    var bodyB = c.bj;
    for(var i=0; i!==numContacts; i++){
        c = this.result[this.result.length - 1 - i];
        if(c.bodyA !== bodyA){
            averageNormal.vadd(c.ni, averageNormal); // vec2.add(eq.t, eq.t, c.normalA);
            averageContactPointA.vadd(c.ri, averageContactPointA); // vec2.add(eq.contactPointA, eq.contactPointA, c.contactPointA);
            averageContactPointB.vadd(c.rj, averageContactPointB);
        } else {
            averageNormal.vsub(c.ni, averageNormal); // vec2.sub(eq.t, eq.t, c.normalA);
            averageContactPointA.vadd(c.rj, averageContactPointA); // vec2.add(eq.contactPointA, eq.contactPointA, c.contactPointA);
            averageContactPointB.vadd(c.ri, averageContactPointB);
        }
    }

    var invNumContacts = 1 / numContacts;
    averageContactPointA.scale(invNumContacts, f1.ri); // vec2.scale(eq.contactPointA, eq.contactPointA, invNumContacts);
    averageContactPointB.scale(invNumContacts, f1.rj); // vec2.scale(eq.contactPointB, eq.contactPointB, invNumContacts);
    f2.ri.copy(f1.ri); // Should be the same
    f2.rj.copy(f1.rj);
    averageNormal.normalize();
    averageNormal.tangents(f1.t, f2.t);
    // return eq;
};


var tmpVec1 = new Vec3();
var tmpVec2 = new Vec3();
var tmpQuat1 = new Quaternion();
var tmpQuat2 = new Quaternion();

/**
 * Generate all contacts between a list of body pairs
 * @method getContacts
 * @param {array} p1 Array of body indices
 * @param {array} p2 Array of body indices
 * @param {World} world
 * @param {array} result Array to store generated contacts
 * @param {array} oldcontacts Optional. Array of reusable contact objects
 */
Narrowphase.prototype.getContacts = function(p1, p2, world, result, oldcontacts, frictionResult, frictionPool){
    // Save old contact objects
    this.contactPointPool = oldcontacts;
    this.frictionEquationPool = frictionPool;
    this.result = result;
    this.frictionResult = frictionResult;

    var qi = tmpQuat1;
    var qj = tmpQuat2;
    var xi = tmpVec1;
    var xj = tmpVec2;

    for(var k=0, N=p1.length; k!==N; k++){

        // Get current collision bodies
        var bi = p1[k],
            bj = p2[k];

        // Get contact material
        var bodyContactMaterial = null;
        if(bi.material && bj.material){
            bodyContactMaterial = world.getContactMaterial(bi.material,bj.material) || null;
        }

        for (var i = 0; i < bi.shapes.length; i++) {
            bi.quaternion.mult(bi.shapeOrientations[i], qi);
            bi.quaternion.vmult(bi.shapeOffsets[i], xi);
            xi.vadd(bi.position, xi);
            var si = bi.shapes[i];

            for (var j = 0; j < bj.shapes.length; j++) {

                // Compute world transform of shapes
                bj.quaternion.mult(bj.shapeOrientations[j], qj);
                bj.quaternion.vmult(bj.shapeOffsets[j], xj);
                xj.vadd(bj.position, xj);
                var sj = bj.shapes[j];

                if(xi.distanceTo(xj) > si.boundingSphereRadius + sj.boundingSphereRadius){
                    continue;
                }

                // Get collision material
                var shapeContactMaterial = null;
                if(si.material && sj.material){
                    shapeContactMaterial = world.getContactMaterial(si.material,sj.material) || null;
                }

                this.currentContactMaterial = shapeContactMaterial || bodyContactMaterial || world.defaultContactMaterial;

                // Get contacts
                var resolver = this[si.type | sj.type];
                if(resolver){
                    if (si.type < sj.type) {
                        resolver.call(this, si, sj, xi, xj, qi, qj, bi, bj, si, sj);
                    } else {
                        resolver.call(this, sj, si, xj, xi, qj, qi, bj, bi, si, sj);
                    }
                }
            }
        }
    }
};

var numWarnings = 0;
var maxWarnings = 10;

function warn(msg){
    if(numWarnings > maxWarnings){
        return;
    }

    numWarnings++;

    console.warn(msg);
}

Narrowphase.prototype[Shape.types.BOX | Shape.types.BOX] =
Narrowphase.prototype.boxBox = function(si,sj,xi,xj,qi,qj,bi,bj){
    si.convexPolyhedronRepresentation.material = si.material;
    sj.convexPolyhedronRepresentation.material = sj.material;
    si.convexPolyhedronRepresentation.collisionResponse = si.collisionResponse;
    sj.convexPolyhedronRepresentation.collisionResponse = sj.collisionResponse;
    this.convexConvex(si.convexPolyhedronRepresentation,sj.convexPolyhedronRepresentation,xi,xj,qi,qj,bi,bj,si,sj);
};

Narrowphase.prototype[Shape.types.BOX | Shape.types.CONVEXPOLYHEDRON] =
Narrowphase.prototype.boxConvex = function(si,sj,xi,xj,qi,qj,bi,bj){
    si.convexPolyhedronRepresentation.material = si.material;
    si.convexPolyhedronRepresentation.collisionResponse = si.collisionResponse;
    this.convexConvex(si.convexPolyhedronRepresentation,sj,xi,xj,qi,qj,bi,bj,si,sj);
};

Narrowphase.prototype[Shape.types.BOX | Shape.types.PARTICLE] =
Narrowphase.prototype.boxParticle = function(si,sj,xi,xj,qi,qj,bi,bj){
    si.convexPolyhedronRepresentation.material = si.material;
    si.convexPolyhedronRepresentation.collisionResponse = si.collisionResponse;
    this.convexParticle(si.convexPolyhedronRepresentation,sj,xi,xj,qi,qj,bi,bj,si,sj);
};

/**
 * @method sphereSphere
 * @param  {Shape}      si
 * @param  {Shape}      sj
 * @param  {Vec3}       xi
 * @param  {Vec3}       xj
 * @param  {Quaternion} qi
 * @param  {Quaternion} qj
 * @param  {Body}       bi
 * @param  {Body}       bj
 */
Narrowphase.prototype[Shape.types.SPHERE] =
Narrowphase.prototype.sphereSphere = function(si,sj,xi,xj,qi,qj,bi,bj){
    // We will have only one contact in this case
    var r = this.createContactEquation(bi,bj,si,sj);

    // Contact normal
    xj.vsub(xi, r.ni);
    r.ni.normalize();

    // Contact point locations
    r.ri.copy(r.ni);
    r.rj.copy(r.ni);
    r.ri.mult(si.radius, r.ri);
    r.rj.mult(-sj.radius, r.rj);

    r.ri.vadd(xi, r.ri);
    r.ri.vsub(bi.position, r.ri);

    r.rj.vadd(xj, r.rj);
    r.rj.vsub(bj.position, r.rj);

    this.result.push(r);

    this.createFrictionEquationsFromContact(r, this.frictionResult);
};

/**
 * @method planeTrimesh
 * @param  {Shape}      si
 * @param  {Shape}      sj
 * @param  {Vec3}       xi
 * @param  {Vec3}       xj
 * @param  {Quaternion} qi
 * @param  {Quaternion} qj
 * @param  {Body}       bi
 * @param  {Body}       bj
 */
var planeTrimesh_normal = new Vec3();
var planeTrimesh_relpos = new Vec3();
var planeTrimesh_projected = new Vec3();
Narrowphase.prototype[Shape.types.PLANE | Shape.types.TRIMESH] =
Narrowphase.prototype.planeTrimesh = function(
    planeShape,
    trimeshShape,
    planePos,
    trimeshPos,
    planeQuat,
    trimeshQuat,
    planeBody,
    trimeshBody
){
    // Make contacts!
    var v = new Vec3();

    var normal = planeTrimesh_normal;
    normal.set(0,0,1);
    planeQuat.vmult(normal,normal); // Turn normal according to plane

    for(var i=0; i<trimeshShape.vertices.length / 3; i++){

        // Get world vertex from trimesh
        trimeshShape.getVertex(i, v);

        // Safe up
        var v2 = new Vec3();
        v2.copy(v);
        Transform.pointToWorldFrame(trimeshPos, trimeshQuat, v2, v);

        // Check plane side
        var relpos = planeTrimesh_relpos;
        v.vsub(planePos, relpos);
        var dot = normal.dot(relpos);

        if(dot <= 0.0){
            var r = this.createContactEquation(planeBody,trimeshBody,planeShape,trimeshShape);

            r.ni.copy(normal); // Contact normal is the plane normal

            // Get vertex position projected on plane
            var projected = planeTrimesh_projected;
            normal.scale(relpos.dot(normal), projected);
            v.vsub(projected,projected);

            // ri is the projected world position minus plane position
            r.ri.copy(projected);
            r.ri.vsub(planeBody.position, r.ri);

            r.rj.copy(v);
            r.rj.vsub(trimeshBody.position, r.rj);

            // Store result
            this.result.push(r);
            this.createFrictionEquationsFromContact(r, this.frictionResult);
        }
    }
};

/**
 * @method sphereTrimesh
 * @param  {Shape}      sphereShape
 * @param  {Shape}      trimeshShape
 * @param  {Vec3}       spherePos
 * @param  {Vec3}       trimeshPos
 * @param  {Quaternion} sphereQuat
 * @param  {Quaternion} trimeshQuat
 * @param  {Body}       sphereBody
 * @param  {Body}       trimeshBody
 */
var sphereTrimesh_normal = new Vec3();
var sphereTrimesh_relpos = new Vec3();
var sphereTrimesh_projected = new Vec3();
var sphereTrimesh_v = new Vec3();
var sphereTrimesh_v2 = new Vec3();
var sphereTrimesh_edgeVertexA = new Vec3();
var sphereTrimesh_edgeVertexB = new Vec3();
var sphereTrimesh_edgeVector = new Vec3();
var sphereTrimesh_edgeVectorUnit = new Vec3();
var sphereTrimesh_localSpherePos = new Vec3();
var sphereTrimesh_tmp = new Vec3();
var sphereTrimesh_va = new Vec3();
var sphereTrimesh_vb = new Vec3();
var sphereTrimesh_vc = new Vec3();
var sphereTrimesh_localSphereAABB = new AABB();
var sphereTrimesh_triangles = [];
Narrowphase.prototype[Shape.types.SPHERE | Shape.types.TRIMESH] =
Narrowphase.prototype.sphereTrimesh = function (
    sphereShape,
    trimeshShape,
    spherePos,
    trimeshPos,
    sphereQuat,
    trimeshQuat,
    sphereBody,
    trimeshBody
) {

    var edgeVertexA = sphereTrimesh_edgeVertexA;
    var edgeVertexB = sphereTrimesh_edgeVertexB;
    var edgeVector = sphereTrimesh_edgeVector;
    var edgeVectorUnit = sphereTrimesh_edgeVectorUnit;
    var localSpherePos = sphereTrimesh_localSpherePos;
    var tmp = sphereTrimesh_tmp;
    var localSphereAABB = sphereTrimesh_localSphereAABB;
    var v2 = sphereTrimesh_v2;
    var relpos = sphereTrimesh_relpos;
    var triangles = sphereTrimesh_triangles;

    // Convert sphere position to local in the trimesh
    Transform.pointToLocalFrame(trimeshPos, trimeshQuat, spherePos, localSpherePos);

    // Get the aabb of the sphere locally in the trimesh
    var sphereRadius = sphereShape.radius;
    localSphereAABB.lowerBound.set(
        localSpherePos.x - sphereRadius,
        localSpherePos.y - sphereRadius,
        localSpherePos.z - sphereRadius
    );
    localSphereAABB.upperBound.set(
        localSpherePos.x + sphereRadius,
        localSpherePos.y + sphereRadius,
        localSpherePos.z + sphereRadius
    );

    trimeshShape.getTrianglesInAABB(localSphereAABB, triangles);
    //for (var i = 0; i < trimeshShape.indices.length / 3; i++) triangles.push(i); // All

    // Vertices
    var v = sphereTrimesh_v;
    var radiusSquared = sphereShape.radius * sphereShape.radius;
    for(var i=0; i<triangles.length; i++){
        for (var j = 0; j < 3; j++) {

            trimeshShape.getVertex(trimeshShape.indices[triangles[i] * 3 + j], v);

            // Check vertex overlap in sphere
            v.vsub(localSpherePos, relpos);

            if(relpos.norm2() <= radiusSquared){

                // Safe up
                v2.copy(v);
                Transform.pointToWorldFrame(trimeshPos, trimeshQuat, v2, v);

                v.vsub(spherePos, relpos);

                var r = this.createContactEquation(sphereBody,trimeshBody,sphereShape,trimeshShape);
                r.ni.copy(relpos);
                r.ni.normalize();

                // ri is the vector from sphere center to the sphere surface
                r.ri.copy(r.ni);
                r.ri.scale(sphereShape.radius, r.ri);
                r.ri.vadd(spherePos, r.ri);
                r.ri.vsub(sphereBody.position, r.ri);

                r.rj.copy(v);
                r.rj.vsub(trimeshBody.position, r.rj);

                // Store result
                this.result.push(r);
                this.createFrictionEquationsFromContact(r, this.frictionResult);
            }
        }
    }

    // Check all edges
    for(var i=0; i<triangles.length; i++){
        for (var j = 0; j < 3; j++) {

            trimeshShape.getVertex(trimeshShape.indices[triangles[i] * 3 + j], edgeVertexA);
            trimeshShape.getVertex(trimeshShape.indices[triangles[i] * 3 + ((j+1)%3)], edgeVertexB);
            edgeVertexB.vsub(edgeVertexA, edgeVector);

            // Project sphere position to the edge
            localSpherePos.vsub(edgeVertexB, tmp);
            var positionAlongEdgeB = tmp.dot(edgeVector);

            localSpherePos.vsub(edgeVertexA, tmp);
            var positionAlongEdgeA = tmp.dot(edgeVector);

            if(positionAlongEdgeA > 0 && positionAlongEdgeB < 0){

                // Now check the orthogonal distance from edge to sphere center
                localSpherePos.vsub(edgeVertexA, tmp);

                edgeVectorUnit.copy(edgeVector);
                edgeVectorUnit.normalize();
                positionAlongEdgeA = tmp.dot(edgeVectorUnit);

                edgeVectorUnit.scale(positionAlongEdgeA, tmp);
                tmp.vadd(edgeVertexA, tmp);

                // tmp is now the sphere center position projected to the edge, defined locally in the trimesh frame
                var dist = tmp.distanceTo(localSpherePos);
                if(dist < sphereShape.radius){
                    var r = this.createContactEquation(sphereBody, trimeshBody, sphereShape, trimeshShape);

                    tmp.vsub(localSpherePos, r.ni);
                    r.ni.normalize();
                    r.ni.scale(sphereShape.radius, r.ri);

                    Transform.pointToWorldFrame(trimeshPos, trimeshQuat, tmp, tmp);
                    tmp.vsub(trimeshBody.position, r.rj);

                    Transform.vectorToWorldFrame(trimeshQuat, r.ni, r.ni);
                    Transform.vectorToWorldFrame(trimeshQuat, r.ri, r.ri);

                    this.result.push(r);
                    this.createFrictionEquationsFromContact(r, this.frictionResult);
                }
            }
        }
    }

    // Triangle faces
    var va = sphereTrimesh_va;
    var vb = sphereTrimesh_vb;
    var vc = sphereTrimesh_vc;
    var normal = sphereTrimesh_normal;
    for(var i=0, N = triangles.length; i !== N; i++){
        trimeshShape.getTriangleVertices(triangles[i], va, vb, vc);
        trimeshShape.getNormal(triangles[i], normal);
        localSpherePos.vsub(va, tmp);
        var dist = tmp.dot(normal);
        normal.scale(dist, tmp);
        localSpherePos.vsub(tmp, tmp);

        // tmp is now the sphere position projected to the triangle plane
        dist = tmp.distanceTo(localSpherePos);
        if(Ray.pointInTriangle(tmp, va, vb, vc) && dist < sphereShape.radius){
            var r = this.createContactEquation(sphereBody, trimeshBody, sphereShape, trimeshShape);

            tmp.vsub(localSpherePos, r.ni);
            r.ni.normalize();
            r.ni.scale(sphereShape.radius, r.ri);

            Transform.pointToWorldFrame(trimeshPos, trimeshQuat, tmp, tmp);
            tmp.vsub(trimeshBody.position, r.rj);

            Transform.vectorToWorldFrame(trimeshQuat, r.ni, r.ni);
            Transform.vectorToWorldFrame(trimeshQuat, r.ri, r.ri);

            this.result.push(r);
            this.createFrictionEquationsFromContact(r, this.frictionResult);
        }
    }

    triangles.length = 0;
};

var point_on_plane_to_sphere = new Vec3();
var plane_to_sphere_ortho = new Vec3();

/**
 * @method spherePlane
 * @param  {Shape}      si
 * @param  {Shape}      sj
 * @param  {Vec3}       xi
 * @param  {Vec3}       xj
 * @param  {Quaternion} qi
 * @param  {Quaternion} qj
 * @param  {Body}       bi
 * @param  {Body}       bj
 */
Narrowphase.prototype[Shape.types.SPHERE | Shape.types.PLANE] =
Narrowphase.prototype.spherePlane = function(si,sj,xi,xj,qi,qj,bi,bj){
    // We will have one contact in this case
    var r = this.createContactEquation(bi,bj,si,sj);

    // Contact normal
    r.ni.set(0,0,1);
    qj.vmult(r.ni, r.ni);
    r.ni.negate(r.ni); // body i is the sphere, flip normal
    r.ni.normalize(); // Needed?

    // Vector from sphere center to contact point
    r.ni.mult(si.radius, r.ri);

    // Project down sphere on plane
    xi.vsub(xj, point_on_plane_to_sphere);
    r.ni.mult(r.ni.dot(point_on_plane_to_sphere), plane_to_sphere_ortho);
    point_on_plane_to_sphere.vsub(plane_to_sphere_ortho,r.rj); // The sphere position projected to plane

    if(-point_on_plane_to_sphere.dot(r.ni) <= si.radius){

        // Make it relative to the body
        var ri = r.ri;
        var rj = r.rj;
        ri.vadd(xi, ri);
        ri.vsub(bi.position, ri);
        rj.vadd(xj, rj);
        rj.vsub(bj.position, rj);

        this.result.push(r);
        this.createFrictionEquationsFromContact(r, this.frictionResult);
    }
};

// See http://bulletphysics.com/Bullet/BulletFull/SphereTriangleDetector_8cpp_source.html
var pointInPolygon_edge = new Vec3();
var pointInPolygon_edge_x_normal = new Vec3();
var pointInPolygon_vtp = new Vec3();
function pointInPolygon(verts, normal, p){
    var positiveResult = null;
    var N = verts.length;
    for(var i=0; i!==N; i++){
        var v = verts[i];

        // Get edge to the next vertex
        var edge = pointInPolygon_edge;
        verts[(i+1) % (N)].vsub(v,edge);

        // Get cross product between polygon normal and the edge
        var edge_x_normal = pointInPolygon_edge_x_normal;
        //var edge_x_normal = new Vec3();
        edge.cross(normal,edge_x_normal);

        // Get vector between point and current vertex
        var vertex_to_p = pointInPolygon_vtp;
        p.vsub(v,vertex_to_p);

        // This dot product determines which side of the edge the point is
        var r = edge_x_normal.dot(vertex_to_p);

        // If all such dot products have same sign, we are inside the polygon.
        if(positiveResult===null || (r>0 && positiveResult===true) || (r<=0 && positiveResult===false)){
            if(positiveResult===null){
                positiveResult = r>0;
            }
            continue;
        } else {
            return false; // Encountered some other sign. Exit.
        }
    }

    // If we got here, all dot products were of the same sign.
    return true;
}

var box_to_sphere = new Vec3();
var sphereBox_ns = new Vec3();
var sphereBox_ns1 = new Vec3();
var sphereBox_ns2 = new Vec3();
var sphereBox_sides = [new Vec3(),new Vec3(),new Vec3(),new Vec3(),new Vec3(),new Vec3()];
var sphereBox_sphere_to_corner = new Vec3();
var sphereBox_side_ns = new Vec3();
var sphereBox_side_ns1 = new Vec3();
var sphereBox_side_ns2 = new Vec3();

/**
 * @method sphereBox
 * @param  {Shape}      si
 * @param  {Shape}      sj
 * @param  {Vec3}       xi
 * @param  {Vec3}       xj
 * @param  {Quaternion} qi
 * @param  {Quaternion} qj
 * @param  {Body}       bi
 * @param  {Body}       bj
 */
Narrowphase.prototype[Shape.types.SPHERE | Shape.types.BOX] =
Narrowphase.prototype.sphereBox = function(si,sj,xi,xj,qi,qj,bi,bj){
    var v3pool = this.v3pool;

    // we refer to the box as body j
    var sides = sphereBox_sides;
    xi.vsub(xj,box_to_sphere);
    sj.getSideNormals(sides,qj);
    var R =     si.radius;
    var penetrating_sides = [];

    // Check side (plane) intersections
    var found = false;

    // Store the resulting side penetration info
    var side_ns = sphereBox_side_ns;
    var side_ns1 = sphereBox_side_ns1;
    var side_ns2 = sphereBox_side_ns2;
    var side_h = null;
    var side_penetrations = 0;
    var side_dot1 = 0;
    var side_dot2 = 0;
    var side_distance = null;
    for(var idx=0,nsides=sides.length; idx!==nsides && found===false; idx++){
        // Get the plane side normal (ns)
        var ns = sphereBox_ns;
        ns.copy(sides[idx]);

        var h = ns.norm();
        ns.normalize();

        // The normal/distance dot product tells which side of the plane we are
        var dot = box_to_sphere.dot(ns);

        if(dot<h+R && dot>0){
            // Intersects plane. Now check the other two dimensions
            var ns1 = sphereBox_ns1;
            var ns2 = sphereBox_ns2;
            ns1.copy(sides[(idx+1)%3]);
            ns2.copy(sides[(idx+2)%3]);
            var h1 = ns1.norm();
            var h2 = ns2.norm();
            ns1.normalize();
            ns2.normalize();
            var dot1 = box_to_sphere.dot(ns1);
            var dot2 = box_to_sphere.dot(ns2);
            if(dot1<h1 && dot1>-h1 && dot2<h2 && dot2>-h2){
                var dist = Math.abs(dot-h-R);
                if(side_distance===null || dist < side_distance){
                    side_distance = dist;
                    side_dot1 = dot1;
                    side_dot2 = dot2;
                    side_h = h;
                    side_ns.copy(ns);
                    side_ns1.copy(ns1);
                    side_ns2.copy(ns2);
                    side_penetrations++;
                }
            }
        }
    }
    if(side_penetrations){
        found = true;
        var r = this.createContactEquation(bi,bj,si,sj);
        side_ns.mult(-R,r.ri); // Sphere r
        r.ni.copy(side_ns);
        r.ni.negate(r.ni); // Normal should be out of sphere
        side_ns.mult(side_h,side_ns);
        side_ns1.mult(side_dot1,side_ns1);
        side_ns.vadd(side_ns1,side_ns);
        side_ns2.mult(side_dot2,side_ns2);
        side_ns.vadd(side_ns2,r.rj);

        // Make relative to bodies
        r.ri.vadd(xi, r.ri);
        r.ri.vsub(bi.position, r.ri);
        r.rj.vadd(xj, r.rj);
        r.rj.vsub(bj.position, r.rj);

        this.result.push(r);
        this.createFrictionEquationsFromContact(r, this.frictionResult);
    }

    // Check corners
    var rj = v3pool.get();
    var sphere_to_corner = sphereBox_sphere_to_corner;
    for(var j=0; j!==2 && !found; j++){
        for(var k=0; k!==2 && !found; k++){
            for(var l=0; l!==2 && !found; l++){
                rj.set(0,0,0);
                if(j){
                    rj.vadd(sides[0],rj);
                } else {
                    rj.vsub(sides[0],rj);
                }
                if(k){
                    rj.vadd(sides[1],rj);
                } else {
                    rj.vsub(sides[1],rj);
                }
                if(l){
                    rj.vadd(sides[2],rj);
                } else {
                    rj.vsub(sides[2],rj);
                }

                // World position of corner
                xj.vadd(rj,sphere_to_corner);
                sphere_to_corner.vsub(xi,sphere_to_corner);

                if(sphere_to_corner.norm2() < R*R){
                    found = true;
                    var r = this.createContactEquation(bi,bj,si,sj);
                    r.ri.copy(sphere_to_corner);
                    r.ri.normalize();
                    r.ni.copy(r.ri);
                    r.ri.mult(R,r.ri);
                    r.rj.copy(rj);

                    // Make relative to bodies
                    r.ri.vadd(xi, r.ri);
                    r.ri.vsub(bi.position, r.ri);
                    r.rj.vadd(xj, r.rj);
                    r.rj.vsub(bj.position, r.rj);

                    this.result.push(r);
                    this.createFrictionEquationsFromContact(r, this.frictionResult);
                }
            }
        }
    }
    v3pool.release(rj);
    rj = null;

    // Check edges
    var edgeTangent = v3pool.get();
    var edgeCenter = v3pool.get();
    var r = v3pool.get(); // r = edge center to sphere center
    var orthogonal = v3pool.get();
    var dist = v3pool.get();
    var Nsides = sides.length;
    for(var j=0; j!==Nsides && !found; j++){
        for(var k=0; k!==Nsides && !found; k++){
            if(j%3 !== k%3){
                // Get edge tangent
                sides[k].cross(sides[j],edgeTangent);
                edgeTangent.normalize();
                sides[j].vadd(sides[k], edgeCenter);
                r.copy(xi);
                r.vsub(edgeCenter,r);
                r.vsub(xj,r);
                var orthonorm = r.dot(edgeTangent); // distance from edge center to sphere center in the tangent direction
                edgeTangent.mult(orthonorm,orthogonal); // Vector from edge center to sphere center in the tangent direction

                // Find the third side orthogonal to this one
                var l = 0;
                while(l===j%3 || l===k%3){
                    l++;
                }

                // vec from edge center to sphere projected to the plane orthogonal to the edge tangent
                dist.copy(xi);
                dist.vsub(orthogonal,dist);
                dist.vsub(edgeCenter,dist);
                dist.vsub(xj,dist);

                // Distances in tangent direction and distance in the plane orthogonal to it
                var tdist = Math.abs(orthonorm);
                var ndist = dist.norm();

                if(tdist < sides[l].norm() && ndist<R){
                    found = true;
                    var res = this.createContactEquation(bi,bj,si,sj);
                    edgeCenter.vadd(orthogonal,res.rj); // box rj
                    res.rj.copy(res.rj);
                    dist.negate(res.ni);
                    res.ni.normalize();

                    res.ri.copy(res.rj);
                    res.ri.vadd(xj,res.ri);
                    res.ri.vsub(xi,res.ri);
                    res.ri.normalize();
                    res.ri.mult(R,res.ri);

                    // Make relative to bodies
                    res.ri.vadd(xi, res.ri);
                    res.ri.vsub(bi.position, res.ri);
                    res.rj.vadd(xj, res.rj);
                    res.rj.vsub(bj.position, res.rj);

                    this.result.push(res);
                    this.createFrictionEquationsFromContact(res, this.frictionResult);
                }
            }
        }
    }
    v3pool.release(edgeTangent,edgeCenter,r,orthogonal,dist);
};

var convex_to_sphere = new Vec3();
var sphereConvex_edge = new Vec3();
var sphereConvex_edgeUnit = new Vec3();
var sphereConvex_sphereToCorner = new Vec3();
var sphereConvex_worldCorner = new Vec3();
var sphereConvex_worldNormal = new Vec3();
var sphereConvex_worldPoint = new Vec3();
var sphereConvex_worldSpherePointClosestToPlane = new Vec3();
var sphereConvex_penetrationVec = new Vec3();
var sphereConvex_sphereToWorldPoint = new Vec3();

/**
 * @method sphereConvex
 * @param  {Shape}      si
 * @param  {Shape}      sj
 * @param  {Vec3}       xi
 * @param  {Vec3}       xj
 * @param  {Quaternion} qi
 * @param  {Quaternion} qj
 * @param  {Body}       bi
 * @param  {Body}       bj
 */
Narrowphase.prototype[Shape.types.SPHERE | Shape.types.CONVEXPOLYHEDRON] =
Narrowphase.prototype.sphereConvex = function(si,sj,xi,xj,qi,qj,bi,bj){
    var v3pool = this.v3pool;
    xi.vsub(xj,convex_to_sphere);
    var normals = sj.faceNormals;
    var faces = sj.faces;
    var verts = sj.vertices;
    var R =     si.radius;
    var penetrating_sides = [];

    // if(convex_to_sphere.norm2() > si.boundingSphereRadius + sj.boundingSphereRadius){
    //     return;
    // }

    // Check corners
    for(var i=0; i!==verts.length; i++){
        var v = verts[i];

        // World position of corner
        var worldCorner = sphereConvex_worldCorner;
        qj.vmult(v,worldCorner);
        xj.vadd(worldCorner,worldCorner);
        var sphere_to_corner = sphereConvex_sphereToCorner;
        worldCorner.vsub(xi, sphere_to_corner);
        if(sphere_to_corner.norm2() < R * R){
            found = true;
            var r = this.createContactEquation(bi,bj,si,sj);
            r.ri.copy(sphere_to_corner);
            r.ri.normalize();
            r.ni.copy(r.ri);
            r.ri.mult(R,r.ri);
            worldCorner.vsub(xj,r.rj);

            // Should be relative to the body.
            r.ri.vadd(xi, r.ri);
            r.ri.vsub(bi.position, r.ri);

            // Should be relative to the body.
            r.rj.vadd(xj, r.rj);
            r.rj.vsub(bj.position, r.rj);

            this.result.push(r);
            this.createFrictionEquationsFromContact(r, this.frictionResult);
            return;
        }
    }

    // Check side (plane) intersections
    var found = false;
    for(var i=0, nfaces=faces.length; i!==nfaces && found===false; i++){
        var normal = normals[i];
        var face = faces[i];

        // Get world-transformed normal of the face
        var worldNormal = sphereConvex_worldNormal;
        qj.vmult(normal,worldNormal);

        // Get a world vertex from the face
        var worldPoint = sphereConvex_worldPoint;
        qj.vmult(verts[face[0]],worldPoint);
        worldPoint.vadd(xj,worldPoint);

        // Get a point on the sphere, closest to the face normal
        var worldSpherePointClosestToPlane = sphereConvex_worldSpherePointClosestToPlane;
        worldNormal.mult(-R, worldSpherePointClosestToPlane);
        xi.vadd(worldSpherePointClosestToPlane, worldSpherePointClosestToPlane);

        // Vector from a face point to the closest point on the sphere
        var penetrationVec = sphereConvex_penetrationVec;
        worldSpherePointClosestToPlane.vsub(worldPoint,penetrationVec);

        // The penetration. Negative value means overlap.
        var penetration = penetrationVec.dot(worldNormal);

        var worldPointToSphere = sphereConvex_sphereToWorldPoint;
        xi.vsub(worldPoint, worldPointToSphere);

        if(penetration < 0 && worldPointToSphere.dot(worldNormal)>0){
            // Intersects plane. Now check if the sphere is inside the face polygon
            var faceVerts = []; // Face vertices, in world coords
            for(var j=0, Nverts=face.length; j!==Nverts; j++){
                var worldVertex = v3pool.get();
                qj.vmult(verts[face[j]], worldVertex);
                xj.vadd(worldVertex,worldVertex);
                faceVerts.push(worldVertex);
            }

            if(pointInPolygon(faceVerts,worldNormal,xi)){ // Is the sphere center in the face polygon?
                found = true;
                var r = this.createContactEquation(bi,bj,si,sj);

                worldNormal.mult(-R, r.ri); // Contact offset, from sphere center to contact
                worldNormal.negate(r.ni); // Normal pointing out of sphere

                var penetrationVec2 = v3pool.get();
                worldNormal.mult(-penetration, penetrationVec2);
                var penetrationSpherePoint = v3pool.get();
                worldNormal.mult(-R, penetrationSpherePoint);

                //xi.vsub(xj).vadd(penetrationSpherePoint).vadd(penetrationVec2 , r.rj);
                xi.vsub(xj,r.rj);
                r.rj.vadd(penetrationSpherePoint,r.rj);
                r.rj.vadd(penetrationVec2 , r.rj);

                // Should be relative to the body.
                r.rj.vadd(xj, r.rj);
                r.rj.vsub(bj.position, r.rj);

                // Should be relative to the body.
                r.ri.vadd(xi, r.ri);
                r.ri.vsub(bi.position, r.ri);

                v3pool.release(penetrationVec2);
                v3pool.release(penetrationSpherePoint);

                this.result.push(r);
                this.createFrictionEquationsFromContact(r, this.frictionResult);

                // Release world vertices
                for(var j=0, Nfaceverts=faceVerts.length; j!==Nfaceverts; j++){
                    v3pool.release(faceVerts[j]);
                }

                return; // We only expect *one* face contact
            } else {
                // Edge?
                for(var j=0; j!==face.length; j++){

                    // Get two world transformed vertices
                    var v1 = v3pool.get();
                    var v2 = v3pool.get();
                    qj.vmult(verts[face[(j+1)%face.length]], v1);
                    qj.vmult(verts[face[(j+2)%face.length]], v2);
                    xj.vadd(v1, v1);
                    xj.vadd(v2, v2);

                    // Construct edge vector
                    var edge = sphereConvex_edge;
                    v2.vsub(v1,edge);

                    // Construct the same vector, but normalized
                    var edgeUnit = sphereConvex_edgeUnit;
                    edge.unit(edgeUnit);

                    // p is xi projected onto the edge
                    var p = v3pool.get();
                    var v1_to_xi = v3pool.get();
                    xi.vsub(v1, v1_to_xi);
                    var dot = v1_to_xi.dot(edgeUnit);
                    edgeUnit.mult(dot, p);
                    p.vadd(v1, p);

                    // Compute a vector from p to the center of the sphere
                    var xi_to_p = v3pool.get();
                    p.vsub(xi, xi_to_p);

                    // Collision if the edge-sphere distance is less than the radius
                    // AND if p is in between v1 and v2
                    if(dot > 0 && dot*dot<edge.norm2() && xi_to_p.norm2() < R*R){ // Collision if the edge-sphere distance is less than the radius
                        // Edge contact!
                        var r = this.createContactEquation(bi,bj,si,sj);
                        p.vsub(xj,r.rj);

                        p.vsub(xi,r.ni);
                        r.ni.normalize();

                        r.ni.mult(R,r.ri);

                        // Should be relative to the body.
                        r.rj.vadd(xj, r.rj);
                        r.rj.vsub(bj.position, r.rj);

                        // Should be relative to the body.
                        r.ri.vadd(xi, r.ri);
                        r.ri.vsub(bi.position, r.ri);

                        this.result.push(r);
                        this.createFrictionEquationsFromContact(r, this.frictionResult);

                        // Release world vertices
                        for(var j=0, Nfaceverts=faceVerts.length; j!==Nfaceverts; j++){
                            v3pool.release(faceVerts[j]);
                        }

                        v3pool.release(v1);
                        v3pool.release(v2);
                        v3pool.release(p);
                        v3pool.release(xi_to_p);
                        v3pool.release(v1_to_xi);

                        return;
                    }

                    v3pool.release(v1);
                    v3pool.release(v2);
                    v3pool.release(p);
                    v3pool.release(xi_to_p);
                    v3pool.release(v1_to_xi);
                }
            }

            // Release world vertices
            for(var j=0, Nfaceverts=faceVerts.length; j!==Nfaceverts; j++){
                v3pool.release(faceVerts[j]);
            }
        }
    }
};

var planeBox_normal = new Vec3();
var plane_to_corner = new Vec3();

/**
 * @method planeBox
 * @param  {Array}      result
 * @param  {Shape}      si
 * @param  {Shape}      sj
 * @param  {Vec3}       xi
 * @param  {Vec3}       xj
 * @param  {Quaternion} qi
 * @param  {Quaternion} qj
 * @param  {Body}       bi
 * @param  {Body}       bj
 */
Narrowphase.prototype[Shape.types.PLANE | Shape.types.BOX] =
Narrowphase.prototype.planeBox = function(si,sj,xi,xj,qi,qj,bi,bj){
    sj.convexPolyhedronRepresentation.material = sj.material;
    sj.convexPolyhedronRepresentation.collisionResponse = sj.collisionResponse;
    this.planeConvex(si,sj.convexPolyhedronRepresentation,xi,xj,qi,qj,bi,bj);
};

var planeConvex_v = new Vec3();
var planeConvex_normal = new Vec3();
var planeConvex_relpos = new Vec3();
var planeConvex_projected = new Vec3();

/**
 * @method planeConvex
 * @param  {Shape}      si
 * @param  {Shape}      sj
 * @param  {Vec3}       xi
 * @param  {Vec3}       xj
 * @param  {Quaternion} qi
 * @param  {Quaternion} qj
 * @param  {Body}       bi
 * @param  {Body}       bj
 */
Narrowphase.prototype[Shape.types.PLANE | Shape.types.CONVEXPOLYHEDRON] =
Narrowphase.prototype.planeConvex = function(
    planeShape,
    convexShape,
    planePosition,
    convexPosition,
    planeQuat,
    convexQuat,
    planeBody,
    convexBody
){
    // Simply return the points behind the plane.
    var worldVertex = planeConvex_v,
        worldNormal = planeConvex_normal;
    worldNormal.set(0,0,1);
    planeQuat.vmult(worldNormal,worldNormal); // Turn normal according to plane orientation

    var numContacts = 0;
    var relpos = planeConvex_relpos;
    for(var i = 0; i !== convexShape.vertices.length; i++){

        // Get world convex vertex
        worldVertex.copy(convexShape.vertices[i]);
        convexQuat.vmult(worldVertex, worldVertex);
        convexPosition.vadd(worldVertex, worldVertex);
        worldVertex.vsub(planePosition, relpos);

        var dot = worldNormal.dot(relpos);
        if(dot <= 0.0){

            var r = this.createContactEquation(planeBody, convexBody, planeShape, convexShape);

            // Get vertex position projected on plane
            var projected = planeConvex_projected;
            worldNormal.mult(worldNormal.dot(relpos),projected);
            worldVertex.vsub(projected, projected);
            projected.vsub(planePosition, r.ri); // From plane to vertex projected on plane

            r.ni.copy(worldNormal); // Contact normal is the plane normal out from plane

            // rj is now just the vector from the convex center to the vertex
            worldVertex.vsub(convexPosition, r.rj);

            // Make it relative to the body
            r.ri.vadd(planePosition, r.ri);
            r.ri.vsub(planeBody.position, r.ri);
            r.rj.vadd(convexPosition, r.rj);
            r.rj.vsub(convexBody.position, r.rj);

            this.result.push(r);
            numContacts++;
            if(!this.enableFrictionReduction){
                this.createFrictionEquationsFromContact(r, this.frictionResult);
            }
        }
    }

    if(this.enableFrictionReduction && numContacts){
        this.createFrictionFromAverage(numContacts);
    }
};

var convexConvex_sepAxis = new Vec3();
var convexConvex_q = new Vec3();

/**
 * @method convexConvex
 * @param  {Shape}      si
 * @param  {Shape}      sj
 * @param  {Vec3}       xi
 * @param  {Vec3}       xj
 * @param  {Quaternion} qi
 * @param  {Quaternion} qj
 * @param  {Body}       bi
 * @param  {Body}       bj
 */
Narrowphase.prototype[Shape.types.CONVEXPOLYHEDRON] =
Narrowphase.prototype.convexConvex = function(si,sj,xi,xj,qi,qj,bi,bj,rsi,rsj,faceListA,faceListB){
    var sepAxis = convexConvex_sepAxis;

    if(xi.distanceTo(xj) > si.boundingSphereRadius + sj.boundingSphereRadius){
        return;
    }

    if(si.findSeparatingAxis(sj,xi,qi,xj,qj,sepAxis,faceListA,faceListB)){
        var res = [];
        var q = convexConvex_q;
        si.clipAgainstHull(xi,qi,sj,xj,qj,sepAxis,-100,100,res);
        var numContacts = 0;
        for(var j = 0; j !== res.length; j++){
            var r = this.createContactEquation(bi,bj,si,sj,rsi,rsj),
                ri = r.ri,
                rj = r.rj;
            sepAxis.negate(r.ni);
            res[j].normal.negate(q);
            q.mult(res[j].depth, q);
            res[j].point.vadd(q, ri);
            rj.copy(res[j].point);

            // Contact points are in world coordinates. Transform back to relative
            ri.vsub(xi,ri);
            rj.vsub(xj,rj);

            // Make relative to bodies
            ri.vadd(xi, ri);
            ri.vsub(bi.position, ri);
            rj.vadd(xj, rj);
            rj.vsub(bj.position, rj);

            this.result.push(r);
            numContacts++;
            if(!this.enableFrictionReduction){
                this.createFrictionEquationsFromContact(r, this.frictionResult);
            }
        }
        if(this.enableFrictionReduction && numContacts){
            this.createFrictionFromAverage(numContacts);
        }
    }
};


/**
 * @method convexTrimesh
 * @param  {Array}      result
 * @param  {Shape}      si
 * @param  {Shape}      sj
 * @param  {Vec3}       xi
 * @param  {Vec3}       xj
 * @param  {Quaternion} qi
 * @param  {Quaternion} qj
 * @param  {Body}       bi
 * @param  {Body}       bj
 */
// Narrowphase.prototype[Shape.types.CONVEXPOLYHEDRON | Shape.types.TRIMESH] =
// Narrowphase.prototype.convexTrimesh = function(si,sj,xi,xj,qi,qj,bi,bj,rsi,rsj,faceListA,faceListB){
//     var sepAxis = convexConvex_sepAxis;

//     if(xi.distanceTo(xj) > si.boundingSphereRadius + sj.boundingSphereRadius){
//         return;
//     }

//     // Construct a temp hull for each triangle
//     var hullB = new ConvexPolyhedron();

//     hullB.faces = [[0,1,2]];
//     var va = new Vec3();
//     var vb = new Vec3();
//     var vc = new Vec3();
//     hullB.vertices = [
//         va,
//         vb,
//         vc
//     ];

//     for (var i = 0; i < sj.indices.length / 3; i++) {

//         var triangleNormal = new Vec3();
//         sj.getNormal(i, triangleNormal);
//         hullB.faceNormals = [triangleNormal];

//         sj.getTriangleVertices(i, va, vb, vc);

//         var d = si.testSepAxis(triangleNormal, hullB, xi, qi, xj, qj);
//         if(!d){
//             triangleNormal.scale(-1, triangleNormal);
//             d = si.testSepAxis(triangleNormal, hullB, xi, qi, xj, qj);

//             if(!d){
//                 continue;
//             }
//         }

//         var res = [];
//         var q = convexConvex_q;
//         si.clipAgainstHull(xi,qi,hullB,xj,qj,triangleNormal,-100,100,res);
//         for(var j = 0; j !== res.length; j++){
//             var r = this.createContactEquation(bi,bj,si,sj,rsi,rsj),
//                 ri = r.ri,
//                 rj = r.rj;
//             r.ni.copy(triangleNormal);
//             r.ni.negate(r.ni);
//             res[j].normal.negate(q);
//             q.mult(res[j].depth, q);
//             res[j].point.vadd(q, ri);
//             rj.copy(res[j].point);

//             // Contact points are in world coordinates. Transform back to relative
//             ri.vsub(xi,ri);
//             rj.vsub(xj,rj);

//             // Make relative to bodies
//             ri.vadd(xi, ri);
//             ri.vsub(bi.position, ri);
//             rj.vadd(xj, rj);
//             rj.vsub(bj.position, rj);

//             result.push(r);
//         }
//     }
// };

var particlePlane_normal = new Vec3();
var particlePlane_relpos = new Vec3();
var particlePlane_projected = new Vec3();

/**
 * @method particlePlane
 * @param  {Array}      result
 * @param  {Shape}      si
 * @param  {Shape}      sj
 * @param  {Vec3}       xi
 * @param  {Vec3}       xj
 * @param  {Quaternion} qi
 * @param  {Quaternion} qj
 * @param  {Body}       bi
 * @param  {Body}       bj
 */
Narrowphase.prototype[Shape.types.PLANE | Shape.types.PARTICLE] =
Narrowphase.prototype.planeParticle = function(sj,si,xj,xi,qj,qi,bj,bi){
    var normal = particlePlane_normal;
    normal.set(0,0,1);
    bj.quaternion.vmult(normal,normal); // Turn normal according to plane orientation
    var relpos = particlePlane_relpos;
    xi.vsub(bj.position,relpos);
    var dot = normal.dot(relpos);
    if(dot <= 0.0){
        var r = this.createContactEquation(bi,bj,si,sj);
        r.ni.copy(normal); // Contact normal is the plane normal
        r.ni.negate(r.ni);
        r.ri.set(0,0,0); // Center of particle

        // Get particle position projected on plane
        var projected = particlePlane_projected;
        normal.mult(normal.dot(xi),projected);
        xi.vsub(projected,projected);
        //projected.vadd(bj.position,projected);

        // rj is now the projected world position minus plane position
        r.rj.copy(projected);
        this.result.push(r);
        this.createFrictionEquationsFromContact(r, this.frictionResult);
    }
};

var particleSphere_normal = new Vec3();

/**
 * @method particleSphere
 * @param  {Array}      result
 * @param  {Shape}      si
 * @param  {Shape}      sj
 * @param  {Vec3}       xi
 * @param  {Vec3}       xj
 * @param  {Quaternion} qi
 * @param  {Quaternion} qj
 * @param  {Body}       bi
 * @param  {Body}       bj
 */
Narrowphase.prototype[Shape.types.PARTICLE | Shape.types.SPHERE] =
Narrowphase.prototype.sphereParticle = function(sj,si,xj,xi,qj,qi,bj,bi){
    // The normal is the unit vector from sphere center to particle center
    var normal = particleSphere_normal;
    normal.set(0,0,1);
    xi.vsub(xj,normal);
    var lengthSquared = normal.norm2();

    if(lengthSquared <= sj.radius * sj.radius){
        var r = this.createContactEquation(bi,bj,si,sj);
        normal.normalize();
        r.rj.copy(normal);
        r.rj.mult(sj.radius,r.rj);
        r.ni.copy(normal); // Contact normal
        r.ni.negate(r.ni);
        r.ri.set(0,0,0); // Center of particle
        this.result.push(r);
        this.createFrictionEquationsFromContact(r, this.frictionResult);
    }
};

// WIP
var cqj = new Quaternion();
var convexParticle_local = new Vec3();
var convexParticle_normal = new Vec3();
var convexParticle_penetratedFaceNormal = new Vec3();
var convexParticle_vertexToParticle = new Vec3();
var convexParticle_worldPenetrationVec = new Vec3();

/**
 * @method convexParticle
 * @param  {Array}      result
 * @param  {Shape}      si
 * @param  {Shape}      sj
 * @param  {Vec3}       xi
 * @param  {Vec3}       xj
 * @param  {Quaternion} qi
 * @param  {Quaternion} qj
 * @param  {Body}       bi
 * @param  {Body}       bj
 */
Narrowphase.prototype[Shape.types.PARTICLE | Shape.types.CONVEXPOLYHEDRON] =
Narrowphase.prototype.convexParticle = function(sj,si,xj,xi,qj,qi,bj,bi){
    var penetratedFaceIndex = -1;
    var penetratedFaceNormal = convexParticle_penetratedFaceNormal;
    var worldPenetrationVec = convexParticle_worldPenetrationVec;
    var minPenetration = null;
    var numDetectedFaces = 0;

    // Convert particle position xi to local coords in the convex
    var local = convexParticle_local;
    local.copy(xi);
    local.vsub(xj,local); // Convert position to relative the convex origin
    qj.conjugate(cqj);
    cqj.vmult(local,local);

    if(sj.pointIsInside(local)){

        if(sj.worldVerticesNeedsUpdate){
            sj.computeWorldVertices(xj,qj);
        }
        if(sj.worldFaceNormalsNeedsUpdate){
            sj.computeWorldFaceNormals(qj);
        }

        // For each world polygon in the polyhedra
        for(var i=0,nfaces=sj.faces.length; i!==nfaces; i++){

            // Construct world face vertices
            var verts = [ sj.worldVertices[ sj.faces[i][0] ] ];
            var normal = sj.worldFaceNormals[i];

            // Check how much the particle penetrates the polygon plane.
            xi.vsub(verts[0],convexParticle_vertexToParticle);
            var penetration = -normal.dot(convexParticle_vertexToParticle);
            if(minPenetration===null || Math.abs(penetration)<Math.abs(minPenetration)){
                minPenetration = penetration;
                penetratedFaceIndex = i;
                penetratedFaceNormal.copy(normal);
                numDetectedFaces++;
            }
        }

        if(penetratedFaceIndex!==-1){
            // Setup contact
            var r = this.createContactEquation(bi,bj,si,sj);
            penetratedFaceNormal.mult(minPenetration, worldPenetrationVec);

            // rj is the particle position projected to the face
            worldPenetrationVec.vadd(xi,worldPenetrationVec);
            worldPenetrationVec.vsub(xj,worldPenetrationVec);
            r.rj.copy(worldPenetrationVec);
            //var projectedToFace = xi.vsub(xj).vadd(worldPenetrationVec);
            //projectedToFace.copy(r.rj);

            //qj.vmult(r.rj,r.rj);
            penetratedFaceNormal.negate( r.ni ); // Contact normal
            r.ri.set(0,0,0); // Center of particle

            var ri = r.ri,
                rj = r.rj;

            // Make relative to bodies
            ri.vadd(xi, ri);
            ri.vsub(bi.position, ri);
            rj.vadd(xj, rj);
            rj.vsub(bj.position, rj);

            this.result.push(r);
            this.createFrictionEquationsFromContact(r, this.frictionResult);
        } else {
            console.warn("Point found inside convex, but did not find penetrating face!");
        }
    }
};

Narrowphase.prototype[Shape.types.BOX | Shape.types.HEIGHTFIELD] =
Narrowphase.prototype.boxHeightfield = function (si,sj,xi,xj,qi,qj,bi,bj){
    si.convexPolyhedronRepresentation.material = si.material;
    si.convexPolyhedronRepresentation.collisionResponse = si.collisionResponse;
    this.convexHeightfield(si.convexPolyhedronRepresentation,sj,xi,xj,qi,qj,bi,bj);
};

var convexHeightfield_tmp1 = new Vec3();
var convexHeightfield_tmp2 = new Vec3();
var convexHeightfield_faceList = [0];

/**
 * @method convexHeightfield
 */
Narrowphase.prototype[Shape.types.CONVEXPOLYHEDRON | Shape.types.HEIGHTFIELD] =
Narrowphase.prototype.convexHeightfield = function (
    convexShape,
    hfShape,
    convexPos,
    hfPos,
    convexQuat,
    hfQuat,
    convexBody,
    hfBody
){
    var data = hfShape.data,
        w = hfShape.elementSize,
        radius = convexShape.boundingSphereRadius,
        worldPillarOffset = convexHeightfield_tmp2,
        faceList = convexHeightfield_faceList;

    // Get sphere position to heightfield local!
    var localConvexPos = convexHeightfield_tmp1;
    Transform.pointToLocalFrame(hfPos, hfQuat, convexPos, localConvexPos);

    // Get the index of the data points to test against
    var iMinX = Math.floor((localConvexPos.x - radius) / w) - 1,
        iMaxX = Math.ceil((localConvexPos.x + radius) / w) + 1,
        iMinY = Math.floor((localConvexPos.y - radius) / w) - 1,
        iMaxY = Math.ceil((localConvexPos.y + radius) / w) + 1;

    // Bail out if we are out of the terrain
    if(iMaxX < 0 || iMaxY < 0 || iMinX > data.length || iMinY > data[0].length){
        return;
    }

    // Clamp index to edges
    if(iMinX < 0){ iMinX = 0; }
    if(iMaxX < 0){ iMaxX = 0; }
    if(iMinY < 0){ iMinY = 0; }
    if(iMaxY < 0){ iMaxY = 0; }
    if(iMinX >= data.length){ iMinX = data.length - 1; }
    if(iMaxX >= data.length){ iMaxX = data.length - 1; }
    if(iMaxY >= data[0].length){ iMaxY = data[0].length - 1; }
    if(iMinY >= data[0].length){ iMinY = data[0].length - 1; }

    var minMax = [];
    hfShape.getRectMinMax(iMinX, iMinY, iMaxX, iMaxY, minMax);
    var min = minMax[0];
    var max = minMax[1];

    // Bail out if we're cant touch the bounding height box
    if(localConvexPos.z - radius > max || localConvexPos.z + radius < min){
        return;
    }

    for(var i = iMinX; i < iMaxX; i++){
        for(var j = iMinY; j < iMaxY; j++){

            // Lower triangle
            hfShape.getConvexTrianglePillar(i, j, false);
            Transform.pointToWorldFrame(hfPos, hfQuat, hfShape.pillarOffset, worldPillarOffset);
            if (convexPos.distanceTo(worldPillarOffset) < hfShape.pillarConvex.boundingSphereRadius + convexShape.boundingSphereRadius) {
                this.convexConvex(convexShape, hfShape.pillarConvex, convexPos, worldPillarOffset, convexQuat, hfQuat, convexBody, hfBody, null, null, faceList, null);
            }

            // Upper triangle
            hfShape.getConvexTrianglePillar(i, j, true);
            Transform.pointToWorldFrame(hfPos, hfQuat, hfShape.pillarOffset, worldPillarOffset);
            if (convexPos.distanceTo(worldPillarOffset) < hfShape.pillarConvex.boundingSphereRadius + convexShape.boundingSphereRadius) {
                this.convexConvex(convexShape, hfShape.pillarConvex, convexPos, worldPillarOffset, convexQuat, hfQuat, convexBody, hfBody, null, null, faceList, null);
            }
        }
    }
};

var sphereHeightfield_tmp1 = new Vec3();
var sphereHeightfield_tmp2 = new Vec3();

/**
 * @method sphereHeightfield
 */
Narrowphase.prototype[Shape.types.SPHERE | Shape.types.HEIGHTFIELD] =
Narrowphase.prototype.sphereHeightfield = function (
    sphereShape,
    hfShape,
    spherePos,
    hfPos,
    sphereQuat,
    hfQuat,
    sphereBody,
    hfBody
){
    var data = hfShape.data,
        radius = sphereShape.radius,
        w = hfShape.elementSize,
        worldPillarOffset = sphereHeightfield_tmp2;

    // Get sphere position to heightfield local!
    var localSpherePos = sphereHeightfield_tmp1;
    Transform.pointToLocalFrame(hfPos, hfQuat, spherePos, localSpherePos);

    // Get the index of the data points to test against
    var iMinX = Math.floor((localSpherePos.x - radius) / w) - 1,
        iMaxX = Math.ceil((localSpherePos.x + radius) / w) + 1,
        iMinY = Math.floor((localSpherePos.y - radius) / w) - 1,
        iMaxY = Math.ceil((localSpherePos.y + radius) / w) + 1;

    // Bail out if we are out of the terrain
    if(iMaxX < 0 || iMaxY < 0 || iMinX > data.length || iMaxY > data[0].length){
        return;
    }

    // Clamp index to edges
    if(iMinX < 0){ iMinX = 0; }
    if(iMaxX < 0){ iMaxX = 0; }
    if(iMinY < 0){ iMinY = 0; }
    if(iMaxY < 0){ iMaxY = 0; }
    if(iMinX >= data.length){ iMinX = data.length - 1; }
    if(iMaxX >= data.length){ iMaxX = data.length - 1; }
    if(iMaxY >= data[0].length){ iMaxY = data[0].length - 1; }
    if(iMinY >= data[0].length){ iMinY = data[0].length - 1; }

    var minMax = [];
    hfShape.getRectMinMax(iMinX, iMinY, iMaxX, iMaxY, minMax);
    var min = minMax[0];
    var max = minMax[1];

    // Bail out if we're cant touch the bounding height box
    if(localSpherePos.z - radius > max || localSpherePos.z + radius < min){
        return;
    }

    var result = this.result;
    for(var i = iMinX; i < iMaxX; i++){
        for(var j = iMinY; j < iMaxY; j++){

            var numContactsBefore = result.length;

            // Lower triangle
            hfShape.getConvexTrianglePillar(i, j, false);
            Transform.pointToWorldFrame(hfPos, hfQuat, hfShape.pillarOffset, worldPillarOffset);
            if (spherePos.distanceTo(worldPillarOffset) < hfShape.pillarConvex.boundingSphereRadius + sphereShape.boundingSphereRadius) {
                this.sphereConvex(sphereShape, hfShape.pillarConvex, spherePos, worldPillarOffset, sphereQuat, hfQuat, sphereBody, hfBody);
            }

            // Upper triangle
            hfShape.getConvexTrianglePillar(i, j, true);
            Transform.pointToWorldFrame(hfPos, hfQuat, hfShape.pillarOffset, worldPillarOffset);
            if (spherePos.distanceTo(worldPillarOffset) < hfShape.pillarConvex.boundingSphereRadius + sphereShape.boundingSphereRadius) {
                this.sphereConvex(sphereShape, hfShape.pillarConvex, spherePos, worldPillarOffset, sphereQuat, hfQuat, sphereBody, hfBody);
            }

            var numContacts = result.length - numContactsBefore;

            if(numContacts > 2){
                return;
            }
            /*
            // Skip all but 1
            for (var k = 0; k < numContacts - 1; k++) {
                result.pop();
            }
            */
        }
    }
};

},{"../collision/AABB":3,"../collision/Ray":9,"../equations/ContactEquation":19,"../equations/FrictionEquation":21,"../math/Quaternion":28,"../math/Transform":29,"../math/Vec3":30,"../shapes/ConvexPolyhedron":38,"../shapes/Shape":43,"../solver/Solver":47,"../utils/Vec3Pool":54}],56:[function(_dereq_,module,exports){
/* global performance */

module.exports = World;

var Shape = _dereq_('../shapes/Shape');
var Vec3 = _dereq_('../math/Vec3');
var Quaternion = _dereq_('../math/Quaternion');
var GSSolver = _dereq_('../solver/GSSolver');
var Vec3Pool = _dereq_('../utils/Vec3Pool');
var ContactEquation = _dereq_('../equations/ContactEquation');
var FrictionEquation = _dereq_('../equations/FrictionEquation');
var Narrowphase = _dereq_('./Narrowphase');
var EventTarget = _dereq_('../utils/EventTarget');
var ArrayCollisionMatrix = _dereq_('../collision/ArrayCollisionMatrix');
var Material = _dereq_('../material/Material');
var ContactMaterial = _dereq_('../material/ContactMaterial');
var Body = _dereq_('../objects/Body');
var TupleDictionary = _dereq_('../utils/TupleDictionary');
var RaycastResult = _dereq_('../collision/RaycastResult');
var AABB = _dereq_('../collision/AABB');
var Ray = _dereq_('../collision/Ray');
var NaiveBroadphase = _dereq_('../collision/NaiveBroadphase');

/**
 * The physics world
 * @class World
 * @constructor
 * @extends EventTarget
 */
function World(){
    EventTarget.apply(this);

    /**
     * Currently / last used timestep. Is set to -1 if not available. This value is updated before each internal step, which means that it is "fresh" inside event callbacks.
     * @property {Number} dt
     */
    this.dt = -1;

    /**
     * Makes bodies go to sleep when they've been inactive
     * @property allowSleep
     * @type {Boolean}
     */
    this.allowSleep = false;

    /**
     * All the current contacts (instances of ContactEquation) in the world.
     * @property contacts
     * @type {Array}
     */
    this.contacts = [];
    this.frictionEquations = [];

    /**
     * How often to normalize quaternions. Set to 0 for every step, 1 for every second etc.. A larger value increases performance. If bodies tend to explode, set to a smaller value (zero to be sure nothing can go wrong).
     * @property quatNormalizeSkip
     * @type {Number}
     */
    this.quatNormalizeSkip = 0;

    /**
     * Set to true to use fast quaternion normalization. It is often enough accurate to use. If bodies tend to explode, set to false.
     * @property quatNormalizeFast
     * @type {Boolean}
     * @see Quaternion.normalizeFast
     * @see Quaternion.normalize
     */
    this.quatNormalizeFast = false;

    /**
     * The wall-clock time since simulation start
     * @property time
     * @type {Number}
     */
    this.time = 0.0;

    /**
     * Number of timesteps taken since start
     * @property stepnumber
     * @type {Number}
     */
    this.stepnumber = 0;

    /// Default and last timestep sizes
    this.default_dt = 1/60;

    this.nextId = 0;
    /**
     * @property gravity
     * @type {Vec3}
     */
    this.gravity = new Vec3();

    /**
     * @property broadphase
     * @type {Broadphase}
     */
    this.broadphase = new NaiveBroadphase();

    /**
     * @property bodies
     * @type {Array}
     */
    this.bodies = [];

    /**
     * @property solver
     * @type {Solver}
     */
    this.solver = new GSSolver();

    /**
     * @property constraints
     * @type {Array}
     */
    this.constraints = [];

    /**
     * @property narrowphase
     * @type {Narrowphase}
     */
    this.narrowphase = new Narrowphase(this);

    /**
     * @property {ArrayCollisionMatrix} collisionMatrix
	 * @type {ArrayCollisionMatrix}
	 */
	this.collisionMatrix = new ArrayCollisionMatrix();

    /**
     * CollisionMatrix from the previous step.
     * @property {ArrayCollisionMatrix} collisionMatrixPrevious
	 * @type {ArrayCollisionMatrix}
	 */
	this.collisionMatrixPrevious = new ArrayCollisionMatrix();

    /**
     * All added materials
     * @property materials
     * @type {Array}
     */
    this.materials = [];

    /**
     * @property contactmaterials
     * @type {Array}
     */
    this.contactmaterials = [];

    /**
     * Used to look up a ContactMaterial given two instances of Material.
     * @property {TupleDictionary} contactMaterialTable
     */
    this.contactMaterialTable = new TupleDictionary();

    this.defaultMaterial = new Material("default");

    /**
     * This contact material is used if no suitable contactmaterial is found for a contact.
     * @property defaultContactMaterial
     * @type {ContactMaterial}
     */
    this.defaultContactMaterial = new ContactMaterial(this.defaultMaterial, this.defaultMaterial, { friction: 0.3, restitution: 0.0 });

    /**
     * @property doProfiling
     * @type {Boolean}
     */
    this.doProfiling = false;

    /**
     * @property profile
     * @type {Object}
     */
    this.profile = {
        solve:0,
        makeContactConstraints:0,
        broadphase:0,
        integrate:0,
        narrowphase:0,
    };

    /**
     * @property subsystems
     * @type {Array}
     */
    this.subsystems = [];

    this.addBodyEvent = {
        type:"addBody",
        body : null,
    };

    this.removeBodyEvent = {
        type:"removeBody",
        body : null,
    };
}
World.prototype = new EventTarget();

// Temp stuff
var tmpAABB1 = new AABB();
var tmpArray1 = [];
var tmpRay = new Ray();

/**
 * Get the contact material between materials m1 and m2
 * @method getContactMaterial
 * @param {Material} m1
 * @param {Material} m2
 * @return {ContactMaterial} The contact material if it was found.
 */
World.prototype.getContactMaterial = function(m1,m2){
    return this.contactMaterialTable.get(m1.id,m2.id); //this.contactmaterials[this.mats2cmat[i+j*this.materials.length]];
};

/**
 * Get number of objects in the world.
 * @method numObjects
 * @return {Number}
 * @deprecated
 */
World.prototype.numObjects = function(){
    return this.bodies.length;
};

/**
 * Store old collision state info
 * @method collisionMatrixTick
 */
World.prototype.collisionMatrixTick = function(){
	var temp = this.collisionMatrixPrevious;
	this.collisionMatrixPrevious = this.collisionMatrix;
	this.collisionMatrix = temp;
	this.collisionMatrix.reset();
};

/**
 * Add a rigid body to the simulation.
 * @method add
 * @param {Body} body
 * @todo If the simulation has not yet started, why recrete and copy arrays for each body? Accumulate in dynamic arrays in this case.
 * @todo Adding an array of bodies should be possible. This would save some loops too
 * @deprecated Use .addBody instead
 */
World.prototype.add = World.prototype.addBody = function(body){
    if(this.bodies.indexOf(body) !== -1){
        return;
    }
    body.index = this.bodies.length;
    this.bodies.push(body);
    body.world = this;
    body.initPosition.copy(body.position);
    body.initVelocity.copy(body.velocity);
    body.timeLastSleepy = this.time;
    if(body instanceof Body){
        body.initAngularVelocity.copy(body.angularVelocity);
        body.initQuaternion.copy(body.quaternion);
    }
	this.collisionMatrix.setNumObjects(this.bodies.length);
    this.addBodyEvent.body = body;
    this.dispatchEvent(this.addBodyEvent);
};

/**
 * Add a constraint to the simulation.
 * @method addConstraint
 * @param {Constraint} c
 */
World.prototype.addConstraint = function(c){
    this.constraints.push(c);
};

/**
 * Removes a constraint
 * @method removeConstraint
 * @param {Constraint} c
 */
World.prototype.removeConstraint = function(c){
    var idx = this.constraints.indexOf(c);
    if(idx!==-1){
        this.constraints.splice(idx,1);
    }
};

/**
 * Raycast test
 * @method rayTest
 * @param {Vec3} from
 * @param {Vec3} to
 * @param {Function|RaycastResult} result
 * @deprecated Use .raycastAll, .raycastClosest or .raycastAny instead.
 */
World.prototype.rayTest = function(from, to, result){
    if(result instanceof RaycastResult){
        // Do raycastclosest
        this.raycastClosest(from, to, {
            skipBackfaces: true
        }, result);
    } else {
        // Do raycastAll
        this.raycastAll(from, to, {
            skipBackfaces: true
        }, result);
    }
};

/**
 * Ray cast against all bodies. The provided callback will be executed for each hit with a RaycastResult as single argument.
 * @method raycastAll
 * @param  {Vec3} from
 * @param  {Vec3} to
 * @param  {Object} options
 * @param  {number} [options.collisionFilterMask=-1]
 * @param  {number} [options.collisionFilterGroup=-1]
 * @param  {boolean} [options.skipBackfaces=false]
 * @param  {boolean} [options.checkCollisionResponse=true]
 * @param  {Function} callback
 * @return {boolean} True if any body was hit.
 */
World.prototype.raycastAll = function(from, to, options, callback){
    options.mode = Ray.ALL;
    options.from = from;
    options.to = to;
    options.callback = callback;
    return tmpRay.intersectWorld(this, options);
};

/**
 * Ray cast, and stop at the first result. Note that the order is random - but the method is fast.
 * @method raycastAny
 * @param  {Vec3} from
 * @param  {Vec3} to
 * @param  {Object} options
 * @param  {number} [options.collisionFilterMask=-1]
 * @param  {number} [options.collisionFilterGroup=-1]
 * @param  {boolean} [options.skipBackfaces=false]
 * @param  {boolean} [options.checkCollisionResponse=true]
 * @param  {RaycastResult} result
 * @return {boolean} True if any body was hit.
 */
World.prototype.raycastAny = function(from, to, options, result){
    options.mode = Ray.ANY;
    options.from = from;
    options.to = to;
    options.result = result;
    return tmpRay.intersectWorld(this, options);
};

/**
 * Ray cast, and return information of the closest hit.
 * @method raycastClosest
 * @param  {Vec3} from
 * @param  {Vec3} to
 * @param  {Object} options
 * @param  {number} [options.collisionFilterMask=-1]
 * @param  {number} [options.collisionFilterGroup=-1]
 * @param  {boolean} [options.skipBackfaces=false]
 * @param  {boolean} [options.checkCollisionResponse=true]
 * @param  {RaycastResult} result
 * @return {boolean} True if any body was hit.
 */
World.prototype.raycastClosest = function(from, to, options, result){
    options.mode = Ray.CLOSEST;
    options.from = from;
    options.to = to;
    options.result = result;
    return tmpRay.intersectWorld(this, options);
};

/**
 * Remove a rigid body from the simulation.
 * @method remove
 * @param {Body} body
 * @deprecated Use .removeBody instead
 */
World.prototype.remove = function(body){
    body.world = null;
    var n = this.bodies.length-1,
        bodies = this.bodies,
        idx = bodies.indexOf(body);
    if(idx !== -1){
        bodies.splice(idx, 1); // Todo: should use a garbage free method

        // Recompute index
        for(var i=0; i!==bodies.length; i++){
            bodies[i].index = i;
        }

        this.collisionMatrix.setNumObjects(n);
        this.removeBodyEvent.body = body;
        this.dispatchEvent(this.removeBodyEvent);
    }
};

/**
 * Remove a rigid body from the simulation.
 * @method removeBody
 * @param {Body} body
 */
World.prototype.removeBody = World.prototype.remove;

/**
 * Adds a material to the World.
 * @method addMaterial
 * @param {Material} m
 * @todo Necessary?
 */
World.prototype.addMaterial = function(m){
    this.materials.push(m);
};

/**
 * Adds a contact material to the World
 * @method addContactMaterial
 * @param {ContactMaterial} cmat
 */
World.prototype.addContactMaterial = function(cmat) {

    // Add contact material
    this.contactmaterials.push(cmat);

    // Add current contact material to the material table
    this.contactMaterialTable.set(cmat.materials[0].id,cmat.materials[1].id,cmat);
};

// performance.now()
if(typeof performance === 'undefined'){
    performance = {};
}
if(!performance.now){
    var nowOffset = Date.now();
    if (performance.timing && performance.timing.navigationStart){
        nowOffset = performance.timing.navigationStart;
    }
    performance.now = function(){
        return Date.now() - nowOffset;
    };
}

var step_tmp1 = new Vec3();

/**
 * Step the physics world forward in time.
 *
 * There are two modes. The simple mode is fixed timestepping without interpolation. In this case you only use the first argument. The second case uses interpolation. In that you also provide the time since the function was last used, as well as the maximum fixed timesteps to take.
 *
 * @method step
 * @param {Number} dt                       The fixed time step size to use.
 * @param {Number} [timeSinceLastCalled]    The time elapsed since the function was last called.
 * @param {Number} [maxSubSteps=10]         Maximum number of fixed steps to take per function call.
 *
 * @example
 *     // fixed timestepping without interpolation
 *     world.step(1/60);
 *
 * @see http://bulletphysics.org/mediawiki-1.5.8/index.php/Stepping_The_World
 */
World.prototype.step = function(dt, timeSinceLastCalled, maxSubSteps){
    maxSubSteps = maxSubSteps || 10;
    timeSinceLastCalled = timeSinceLastCalled || 0;

    if(timeSinceLastCalled === 0){ // Fixed, simple stepping

        this.internalStep(dt);

        // Increment time
        this.time += dt;

    } else {

        // Compute the number of fixed steps we should have taken since the last step
        var internalSteps = Math.floor((this.time + timeSinceLastCalled) / dt) - Math.floor(this.time / dt);
        internalSteps = Math.min(internalSteps,maxSubSteps);

        // Do some fixed steps to catch up
        var t0 = performance.now();
        for(var i=0; i!==internalSteps; i++){
            this.internalStep(dt);
            if(performance.now() - t0 > dt * 1000){
                // We are slower than real-time. Better bail out.
                break;
            }
        }

        // Increment internal clock
        this.time += timeSinceLastCalled;

        // Compute "Left over" time step
        var h = this.time % dt;
        var h_div_dt = h / dt;
        var interpvelo = step_tmp1;
        var bodies = this.bodies;

        for(var j=0; j !== bodies.length; j++){
            var b = bodies[j];
            if(b.type !== Body.STATIC && b.sleepState !== Body.SLEEPING){

                // Interpolate
                b.position.vsub(b.previousPosition, interpvelo);
                interpvelo.scale(h_div_dt, interpvelo);
                b.position.vadd(interpvelo, b.interpolatedPosition);

                // TODO: interpolate quaternion
                // b.interpolatedAngle = b.angle + (b.angle - b.previousAngle) * h_div_dt;

            } else {

                // For static bodies, just copy. Who else will do it?
                b.interpolatedPosition.copy(b.position);
                b.interpolatedQuaternion.copy(b.quaternion);
            }
        }
    }
};

/**
 * Step the simulation
 * @method step
 * @param {Number} dt
 */
var World_step_postStepEvent = {type:"postStep"}, // Reusable event objects to save memory
    World_step_preStepEvent = {type:"preStep"},
    World_step_collideEvent = {type:"collide", body:null, contact:null },
    World_step_oldContacts = [], // Pools for unused objects
    World_step_frictionEquationPool = [],
    World_step_p1 = [], // Reusable arrays for collision pairs
    World_step_p2 = [],
    World_step_gvec = new Vec3(), // Temporary vectors and quats
    World_step_vi = new Vec3(),
    World_step_vj = new Vec3(),
    World_step_wi = new Vec3(),
    World_step_wj = new Vec3(),
    World_step_t1 = new Vec3(),
    World_step_t2 = new Vec3(),
    World_step_rixn = new Vec3(),
    World_step_rjxn = new Vec3(),
    World_step_step_q = new Quaternion(),
    World_step_step_w = new Quaternion(),
    World_step_step_wq = new Quaternion(),
    invI_tau_dt = new Vec3();
World.prototype.internalStep = function(dt){
    this.dt = dt;

    var world = this,
        that = this,
        contacts = this.contacts,
        p1 = World_step_p1,
        p2 = World_step_p2,
        N = this.numObjects(),
        bodies = this.bodies,
        solver = this.solver,
        gravity = this.gravity,
        doProfiling = this.doProfiling,
        profile = this.profile,
        DYNAMIC = Body.DYNAMIC,
        profilingStart,
        constraints = this.constraints,
        frictionEquationPool = World_step_frictionEquationPool,
        gnorm = gravity.norm(),
        gx = gravity.x,
        gy = gravity.y,
        gz = gravity.z,
        i=0;

    if(doProfiling){
        profilingStart = performance.now();
    }

    // Add gravity to all objects
    for(i=0; i!==N; i++){
        var bi = bodies[i];
        if(bi.type & DYNAMIC){ // Only for dynamic bodies
            var f = bi.force, m = bi.mass;
            f.x += m*gx;
            f.y += m*gy;
            f.z += m*gz;
        }
    }

    // Update subsystems
    for(var i=0, Nsubsystems=this.subsystems.length; i!==Nsubsystems; i++){
        this.subsystems[i].update();
    }

    // Collision detection
    if(doProfiling){ profilingStart = performance.now(); }
    p1.length = 0; // Clean up pair arrays from last step
    p2.length = 0;
    this.broadphase.collisionPairs(this,p1,p2);
    if(doProfiling){ profile.broadphase = performance.now() - profilingStart; }

    // Remove constrained pairs with collideConnected == false
    var Nconstraints = constraints.length;
    for(i=0; i!==Nconstraints; i++){
        var c = constraints[i];
        if(!c.collideConnected){
            for(var j = p1.length-1; j>=0; j-=1){
                if( (c.bodyA === p1[j] && c.bodyB === p2[j]) ||
                    (c.bodyB === p1[j] && c.bodyA === p2[j])){
                    p1.splice(j, 1);
                    p2.splice(j, 1);
                }
            }
        }
    }

    this.collisionMatrixTick();

    // Generate contacts
    if(doProfiling){ profilingStart = performance.now(); }
    var oldcontacts = World_step_oldContacts;
    var NoldContacts = contacts.length;

    for(i=0; i!==NoldContacts; i++){
        oldcontacts.push(contacts[i]);
    }
    contacts.length = 0;

    // Transfer FrictionEquation from current list to the pool for reuse
    var NoldFrictionEquations = this.frictionEquations.length;
    for(i=0; i!==NoldFrictionEquations; i++){
        frictionEquationPool.push(this.frictionEquations[i]);
    }
    this.frictionEquations.length = 0;

    this.narrowphase.getContacts(
        p1,
        p2,
        this,
        contacts,
        oldcontacts, // To be reused
        this.frictionEquations,
        frictionEquationPool
    );

    if(doProfiling){
        profile.narrowphase = performance.now() - profilingStart;
    }

    // Loop over all collisions
    if(doProfiling){
        profilingStart = performance.now();
    }

    // Add all friction eqs
    for (var i = 0; i < this.frictionEquations.length; i++) {
        solver.addEquation(this.frictionEquations[i]);
    }

    var ncontacts = contacts.length;
    for(var k=0; k!==ncontacts; k++){

        // Current contact
        var c = contacts[k];

        // Get current collision indeces
        var bi = c.bi,
            bj = c.bj,
            si = c.si,
            sj = c.sj;

        // Get collision properties
        var cm;
        if(bi.material && bj.material){
            cm = this.getContactMaterial(bi.material,bj.material) || this.defaultContactMaterial;
        } else {
            cm = this.defaultContactMaterial;
        }

        // c.enabled = bi.collisionResponse && bj.collisionResponse && si.collisionResponse && sj.collisionResponse;

        var mu = cm.friction;
        // c.restitution = cm.restitution;

        // If friction or restitution were specified in the material, use them
        if(bi.material && bj.material){
            if(bi.material.friction >= 0 && bj.material.friction >= 0){
                mu = bi.material.friction * bj.material.friction;
            }

            if(bi.material.restitution >= 0 && bj.material.restitution >= 0){
                c.restitution = bi.material.restitution * bj.material.restitution;
            }
        }

		// c.setSpookParams(
  //           cm.contactEquationStiffness,
  //           cm.contactEquationRelaxation,
  //           dt
  //       );

		solver.addEquation(c);

		// // Add friction constraint equation
		// if(mu > 0){

		// 	// Create 2 tangent equations
		// 	var mug = mu * gnorm;
		// 	var reducedMass = (bi.invMass + bj.invMass);
		// 	if(reducedMass > 0){
		// 		reducedMass = 1/reducedMass;
		// 	}
		// 	var pool = frictionEquationPool;
		// 	var c1 = pool.length ? pool.pop() : new FrictionEquation(bi,bj,mug*reducedMass);
		// 	var c2 = pool.length ? pool.pop() : new FrictionEquation(bi,bj,mug*reducedMass);
		// 	this.frictionEquations.push(c1, c2);

		// 	c1.bi = c2.bi = bi;
		// 	c1.bj = c2.bj = bj;
		// 	c1.minForce = c2.minForce = -mug*reducedMass;
		// 	c1.maxForce = c2.maxForce = mug*reducedMass;

		// 	// Copy over the relative vectors
		// 	c1.ri.copy(c.ri);
		// 	c1.rj.copy(c.rj);
		// 	c2.ri.copy(c.ri);
		// 	c2.rj.copy(c.rj);

		// 	// Construct tangents
		// 	c.ni.tangents(c1.t, c2.t);

  //           // Set spook params
  //           c1.setSpookParams(cm.frictionEquationStiffness, cm.frictionEquationRelaxation, dt);
  //           c2.setSpookParams(cm.frictionEquationStiffness, cm.frictionEquationRelaxation, dt);

  //           c1.enabled = c2.enabled = c.enabled;

		// 	// Add equations to solver
		// 	solver.addEquation(c1);
		// 	solver.addEquation(c2);
		// }

        if( bi.allowSleep &&
            bi.type === Body.DYNAMIC &&
            bi.sleepState  === Body.SLEEPING &&
            bj.sleepState  === Body.AWAKE &&
            bj.type !== Body.STATIC
        ){
            var speedSquaredB = bj.velocity.norm2() + bj.angularVelocity.norm2();
            var speedLimitSquaredB = Math.pow(bj.sleepSpeedLimit,2);
            if(speedSquaredB >= speedLimitSquaredB*2){
                bi._wakeUpAfterNarrowphase = true;
            }
        }

        if( bj.allowSleep &&
            bj.type === Body.DYNAMIC &&
            bj.sleepState  === Body.SLEEPING &&
            bi.sleepState  === Body.AWAKE &&
            bi.type !== Body.STATIC
        ){
            var speedSquaredA = bi.velocity.norm2() + bi.angularVelocity.norm2();
            var speedLimitSquaredA = Math.pow(bi.sleepSpeedLimit,2);
            if(speedSquaredA >= speedLimitSquaredA*2){
                bj._wakeUpAfterNarrowphase = true;
            }
        }

        // Now we know that i and j are in contact. Set collision matrix state
		this.collisionMatrix.set(bi, bj, true);

        if (!this.collisionMatrixPrevious.get(bi, bj)) {
            // First contact!
            // We reuse the collideEvent object, otherwise we will end up creating new objects for each new contact, even if there's no event listener attached.
            World_step_collideEvent.body = bj;
            World_step_collideEvent.contact = c;
            bi.dispatchEvent(World_step_collideEvent);

            World_step_collideEvent.body = bi;
            bj.dispatchEvent(World_step_collideEvent);
        }
    }
    if(doProfiling){
        profile.makeContactConstraints = performance.now() - profilingStart;
        profilingStart = performance.now();
    }

    // Wake up bodies
    for(i=0; i!==N; i++){
        var bi = bodies[i];
        if(bi._wakeUpAfterNarrowphase){
            bi.wakeUp();
            bi._wakeUpAfterNarrowphase = false;
        }
    }

    // Add user-added constraints
    var Nconstraints = constraints.length;
    for(i=0; i!==Nconstraints; i++){
        var c = constraints[i];
        c.update();
        for(var j=0, Neq=c.equations.length; j!==Neq; j++){
            var eq = c.equations[j];
            solver.addEquation(eq);
        }
    }

    // Solve the constrained system
    solver.solve(dt,this);

    if(doProfiling){
        profile.solve = performance.now() - profilingStart;
    }

    // Remove all contacts from solver
    solver.removeAllEquations();

    // Apply damping, see http://code.google.com/p/bullet/issues/detail?id=74 for details
    var pow = Math.pow;
    for(i=0; i!==N; i++){
        var bi = bodies[i];
        if(bi.type & DYNAMIC){ // Only for dynamic bodies
            var ld = pow(1.0 - bi.linearDamping,dt);
            var v = bi.velocity;
            v.mult(ld,v);
            var av = bi.angularVelocity;
            if(av){
                var ad = pow(1.0 - bi.angularDamping,dt);
                av.mult(ad,av);
            }
        }
    }

    this.dispatchEvent(World_step_preStepEvent);

    // Invoke pre-step callbacks
    for(i=0; i!==N; i++){
        var bi = bodies[i];
        if(bi.preStep){
            bi.preStep.call(bi);
        }
    }

    // Leap frog
    // vnew = v + h*f/m
    // xnew = x + h*vnew
    if(doProfiling){
        profilingStart = performance.now();
    }
    var q = World_step_step_q;
    var w = World_step_step_w;
    var wq = World_step_step_wq;
    var stepnumber = this.stepnumber;
    var DYNAMIC_OR_KINEMATIC = Body.DYNAMIC | Body.KINEMATIC;
    var quatNormalize = stepnumber % (this.quatNormalizeSkip+1) === 0;
    var quatNormalizeFast = this.quatNormalizeFast;
    var half_dt = dt * 0.5;
    var PLANE = Shape.types.PLANE,
        CONVEX = Shape.types.CONVEXPOLYHEDRON;

    for(i=0; i!==N; i++){
        var b = bodies[i],
            force = b.force,
            tau = b.torque;
        if((b.type & DYNAMIC_OR_KINEMATIC) && b.sleepState !== Body.SLEEPING){ // Only for dynamic
            var velo = b.velocity,
                angularVelo = b.angularVelocity,
                pos = b.position,
                quat = b.quaternion,
                invMass = b.invMass,
                invInertia = b.invInertiaWorld;

            velo.x += force.x * invMass * dt;
            velo.y += force.y * invMass * dt;
            velo.z += force.z * invMass * dt;

            if(b.angularVelocity){
                invInertia.vmult(tau,invI_tau_dt);
                invI_tau_dt.mult(dt,invI_tau_dt);
                invI_tau_dt.vadd(angularVelo,angularVelo);
            }

            // Use new velocity  - leap frog
            pos.x += velo.x * dt;
            pos.y += velo.y * dt;
            pos.z += velo.z * dt;

            if(b.angularVelocity){
                w.set(angularVelo.x, angularVelo.y, angularVelo.z, 0);
                w.mult(quat,wq);
                quat.x += half_dt * wq.x;
                quat.y += half_dt * wq.y;
                quat.z += half_dt * wq.z;
                quat.w += half_dt * wq.w;
                if(quatNormalize){
                    if(quatNormalizeFast){
                        quat.normalizeFast();
                    } else {
                        quat.normalize();
                    }
                }
            }

            if(b.aabb){
                b.aabbNeedsUpdate = true;
            }

            // Update world inertia
            if(b.updateInertiaWorld){
                b.updateInertiaWorld();
            }
        }
    }
    this.clearForces();

    this.broadphase.dirty = true;

    if(doProfiling){
        profile.integrate = performance.now() - profilingStart;
    }

    // Update world time
    this.time += dt;
    this.stepnumber += 1;

    this.dispatchEvent(World_step_postStepEvent);

    // Invoke post-step callbacks
    for(i=0; i!==N; i++){
        var bi = bodies[i];
        var postStep = bi.postStep;
        if(postStep){
            postStep.call(bi);
        }
    }

    // Sleeping update
    if(this.allowSleep){
        for(i=0; i!==N; i++){
            bodies[i].sleepTick(this.time);
        }
    }
};

/**
 * Sets all body forces in the world to zero.
 * @method clearForces
 */
World.prototype.clearForces = function(){
    var bodies = this.bodies;
    var N = bodies.length;
    for(var i=0; i !== N; i++){
        var b = bodies[i],
            force = b.force,
            tau = b.torque;

        b.force.set(0,0,0);
        b.torque.set(0,0,0);
    }
};

},{"../collision/AABB":3,"../collision/ArrayCollisionMatrix":4,"../collision/NaiveBroadphase":7,"../collision/Ray":9,"../collision/RaycastResult":10,"../equations/ContactEquation":19,"../equations/FrictionEquation":21,"../material/ContactMaterial":24,"../material/Material":25,"../math/Quaternion":28,"../math/Vec3":30,"../objects/Body":31,"../shapes/Shape":43,"../solver/GSSolver":46,"../utils/EventTarget":49,"../utils/TupleDictionary":52,"../utils/Vec3Pool":54,"./Narrowphase":55}]},{},[2])
(2)
});

!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e(require("babylonjs")):"function"==typeof define&&define.amd?define("babylonjs-gui",["babylonjs"],e):"object"==typeof exports?exports["babylonjs-gui"]=e(require("babylonjs")):(t.BABYLON=t.BABYLON||{},t.BABYLON.GUI=e(t.BABYLON))}(window,function(t){return function(t){var e={};function i(r){if(e[r])return e[r].exports;var o=e[r]={i:r,l:!1,exports:{}};return t[r].call(o.exports,o,o.exports,i),o.l=!0,o.exports}return i.m=t,i.c=e,i.d=function(t,e,r){i.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:r})},i.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},i.t=function(t,e){if(1&e&&(t=i(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var r=Object.create(null);if(i.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var o in t)i.d(r,o,function(e){return t[e]}.bind(null,o));return r},i.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return i.d(e,"a",e),e},i.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},i.p="",i(i.s=27)}([function(e,i){e.exports=t},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=i(2),o=i(0),n=i(7),s=i(17),a=function(){function t(e){this.name=e,this._alpha=1,this._alphaSet=!1,this._zIndex=0,this._currentMeasure=n.Measure.Empty(),this._fontFamily="Arial",this._fontStyle="",this._fontWeight="",this._fontSize=new r.ValueAndUnit(18,r.ValueAndUnit.UNITMODE_PIXEL,!1),this._width=new r.ValueAndUnit(1,r.ValueAndUnit.UNITMODE_PERCENTAGE,!1),this._height=new r.ValueAndUnit(1,r.ValueAndUnit.UNITMODE_PERCENTAGE,!1),this._color="",this._style=null,this._horizontalAlignment=t.HORIZONTAL_ALIGNMENT_CENTER,this._verticalAlignment=t.VERTICAL_ALIGNMENT_CENTER,this._isDirty=!0,this._tempParentMeasure=n.Measure.Empty(),this._cachedParentMeasure=n.Measure.Empty(),this._paddingLeft=new r.ValueAndUnit(0),this._paddingRight=new r.ValueAndUnit(0),this._paddingTop=new r.ValueAndUnit(0),this._paddingBottom=new r.ValueAndUnit(0),this._left=new r.ValueAndUnit(0),this._top=new r.ValueAndUnit(0),this._scaleX=1,this._scaleY=1,this._rotation=0,this._transformCenterX=.5,this._transformCenterY=.5,this._transformMatrix=s.Matrix2D.Identity(),this._invertTransformMatrix=s.Matrix2D.Identity(),this._transformedPosition=o.Vector2.Zero(),this._onlyMeasureMode=!1,this._isMatrixDirty=!0,this._isVisible=!0,this._fontSet=!1,this._dummyVector2=o.Vector2.Zero(),this._downCount=0,this._enterCount=-1,this._doNotRender=!1,this._downPointerIds={},this._isEnabled=!0,this._disabledColor="#9a9a9a",this.isHitTestVisible=!0,this.isPointerBlocker=!1,this.isFocusInvisible=!1,this.shadowOffsetX=0,this.shadowOffsetY=0,this.shadowBlur=0,this.shadowColor="#000",this.hoverCursor="",this._linkOffsetX=new r.ValueAndUnit(0),this._linkOffsetY=new r.ValueAndUnit(0),this.onPointerMoveObservable=new o.Observable,this.onPointerOutObservable=new o.Observable,this.onPointerDownObservable=new o.Observable,this.onPointerUpObservable=new o.Observable,this.onPointerClickObservable=new o.Observable,this.onPointerEnterObservable=new o.Observable,this.onDirtyObservable=new o.Observable,this.onAfterDrawObservable=new o.Observable}return Object.defineProperty(t.prototype,"typeName",{get:function(){return this._getTypeName()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontOffset",{get:function(){return this._fontOffset},set:function(t){this._fontOffset=t},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"alpha",{get:function(){return this._alpha},set:function(t){this._alpha!==t&&(this._alphaSet=!0,this._alpha=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"scaleX",{get:function(){return this._scaleX},set:function(t){this._scaleX!==t&&(this._scaleX=t,this._markAsDirty(),this._markMatrixAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"scaleY",{get:function(){return this._scaleY},set:function(t){this._scaleY!==t&&(this._scaleY=t,this._markAsDirty(),this._markMatrixAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"rotation",{get:function(){return this._rotation},set:function(t){this._rotation!==t&&(this._rotation=t,this._markAsDirty(),this._markMatrixAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"transformCenterY",{get:function(){return this._transformCenterY},set:function(t){this._transformCenterY!==t&&(this._transformCenterY=t,this._markAsDirty(),this._markMatrixAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"transformCenterX",{get:function(){return this._transformCenterX},set:function(t){this._transformCenterX!==t&&(this._transformCenterX=t,this._markAsDirty(),this._markMatrixAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"horizontalAlignment",{get:function(){return this._horizontalAlignment},set:function(t){this._horizontalAlignment!==t&&(this._horizontalAlignment=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"verticalAlignment",{get:function(){return this._verticalAlignment},set:function(t){this._verticalAlignment!==t&&(this._verticalAlignment=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"width",{get:function(){return this._width.toString(this._host)},set:function(t){this._width.toString(this._host)!==t&&this._width.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"widthInPixels",{get:function(){return this._width.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"height",{get:function(){return this._height.toString(this._host)},set:function(t){this._height.toString(this._host)!==t&&this._height.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"heightInPixels",{get:function(){return this._height.getValueInPixel(this._host,this._cachedParentMeasure.height)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontFamily",{get:function(){return this._fontFamily},set:function(t){this._fontFamily!==t&&(this._fontFamily=t,this._resetFontCache())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontStyle",{get:function(){return this._fontStyle},set:function(t){this._fontStyle!==t&&(this._fontStyle=t,this._resetFontCache())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontWeight",{get:function(){return this._fontWeight},set:function(t){this._fontWeight!==t&&(this._fontWeight=t,this._resetFontCache())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"style",{get:function(){return this._style},set:function(t){var e=this;this._style&&(this._style.onChangedObservable.remove(this._styleObserver),this._styleObserver=null),this._style=t,this._style&&(this._styleObserver=this._style.onChangedObservable.add(function(){e._markAsDirty(),e._resetFontCache()})),this._markAsDirty(),this._resetFontCache()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"_isFontSizeInPercentage",{get:function(){return this._fontSize.isPercentage},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontSizeInPixels",{get:function(){var t=this._style?this._style._fontSize:this._fontSize;return t.isPixel?t.getValue(this._host):t.getValueInPixel(this._host,this._tempParentMeasure.height||this._cachedParentMeasure.height)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontSize",{get:function(){return this._fontSize.toString(this._host)},set:function(t){this._fontSize.toString(this._host)!==t&&this._fontSize.fromString(t)&&(this._markAsDirty(),this._resetFontCache())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"color",{get:function(){return this._color},set:function(t){this._color!==t&&(this._color=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"zIndex",{get:function(){return this._zIndex},set:function(t){this.zIndex!==t&&(this._zIndex=t,this._root&&this._root._reOrderControl(this))},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"notRenderable",{get:function(){return this._doNotRender},set:function(t){this._doNotRender!==t&&(this._doNotRender=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"isVisible",{get:function(){return this._isVisible},set:function(t){this._isVisible!==t&&(this._isVisible=t,this._markAsDirty(!0))},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"isDirty",{get:function(){return this._isDirty},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"linkedMesh",{get:function(){return this._linkedMesh},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"paddingLeft",{get:function(){return this._paddingLeft.toString(this._host)},set:function(t){this._paddingLeft.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"paddingLeftInPixels",{get:function(){return this._paddingLeft.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"paddingRight",{get:function(){return this._paddingRight.toString(this._host)},set:function(t){this._paddingRight.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"paddingRightInPixels",{get:function(){return this._paddingRight.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"paddingTop",{get:function(){return this._paddingTop.toString(this._host)},set:function(t){this._paddingTop.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"paddingTopInPixels",{get:function(){return this._paddingTop.getValueInPixel(this._host,this._cachedParentMeasure.height)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"paddingBottom",{get:function(){return this._paddingBottom.toString(this._host)},set:function(t){this._paddingBottom.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"paddingBottomInPixels",{get:function(){return this._paddingBottom.getValueInPixel(this._host,this._cachedParentMeasure.height)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"left",{get:function(){return this._left.toString(this._host)},set:function(t){this._left.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"leftInPixels",{get:function(){return this._left.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"top",{get:function(){return this._top.toString(this._host)},set:function(t){this._top.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"topInPixels",{get:function(){return this._top.getValueInPixel(this._host,this._cachedParentMeasure.height)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"linkOffsetX",{get:function(){return this._linkOffsetX.toString(this._host)},set:function(t){this._linkOffsetX.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"linkOffsetXInPixels",{get:function(){return this._linkOffsetX.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"linkOffsetY",{get:function(){return this._linkOffsetY.toString(this._host)},set:function(t){this._linkOffsetY.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"linkOffsetYInPixels",{get:function(){return this._linkOffsetY.getValueInPixel(this._host,this._cachedParentMeasure.height)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"centerX",{get:function(){return this._currentMeasure.left+this._currentMeasure.width/2},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"centerY",{get:function(){return this._currentMeasure.top+this._currentMeasure.height/2},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"isEnabled",{get:function(){return this._isEnabled},set:function(t){this._isEnabled!==t&&(this._isEnabled=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"disabledColor",{get:function(){return this._disabledColor},set:function(t){this._disabledColor!==t&&(this._disabledColor=t,this._markAsDirty())},enumerable:!0,configurable:!0}),t.prototype._getTypeName=function(){return"Control"},t.prototype._resetFontCache=function(){this._fontSet=!0,this._markAsDirty()},t.prototype.isAscendant=function(t){return!!this.parent&&(this.parent===t||this.parent.isAscendant(t))},t.prototype.getLocalCoordinates=function(t){var e=o.Vector2.Zero();return this.getLocalCoordinatesToRef(t,e),e},t.prototype.getLocalCoordinatesToRef=function(t,e){return e.x=t.x-this._currentMeasure.left,e.y=t.y-this._currentMeasure.top,this},t.prototype.getParentLocalCoordinates=function(t){var e=o.Vector2.Zero();return e.x=t.x-this._cachedParentMeasure.left,e.y=t.y-this._cachedParentMeasure.top,e},t.prototype.moveToVector3=function(e,i){if(this._host&&this._root===this._host._rootContainer){this.horizontalAlignment=t.HORIZONTAL_ALIGNMENT_LEFT,this.verticalAlignment=t.VERTICAL_ALIGNMENT_TOP;var r=this._host._getGlobalViewport(i),n=o.Vector3.Project(e,o.Matrix.Identity(),i.getTransformMatrix(),r);this._moveToProjectedPosition(n),n.z<0||n.z>1?this.notRenderable=!0:this.notRenderable=!1}else o.Tools.Error("Cannot move a control to a vector3 if the control is not at root level")},t.prototype.linkWithMesh=function(e){if(!this._host||this._root&&this._root!==this._host._rootContainer)e&&o.Tools.Error("Cannot link a control to a mesh if the control is not at root level");else{var i=this._host._linkedControls.indexOf(this);if(-1!==i)return this._linkedMesh=e,void(e||this._host._linkedControls.splice(i,1));e&&(this.horizontalAlignment=t.HORIZONTAL_ALIGNMENT_LEFT,this.verticalAlignment=t.VERTICAL_ALIGNMENT_TOP,this._linkedMesh=e,this._onlyMeasureMode=0===this._currentMeasure.width||0===this._currentMeasure.height,this._host._linkedControls.push(this))}},t.prototype._moveToProjectedPosition=function(t){var e=this._left.getValue(this._host),i=this._top.getValue(this._host),r=t.x+this._linkOffsetX.getValue(this._host)-this._currentMeasure.width/2,o=t.y+this._linkOffsetY.getValue(this._host)-this._currentMeasure.height/2;this._left.ignoreAdaptiveScaling&&this._top.ignoreAdaptiveScaling&&(Math.abs(r-e)<.5&&(r=e),Math.abs(o-i)<.5&&(o=i)),this.left=r+"px",this.top=o+"px",this._left.ignoreAdaptiveScaling=!0,this._top.ignoreAdaptiveScaling=!0},t.prototype._markMatrixAsDirty=function(){this._isMatrixDirty=!0,this._flagDescendantsAsMatrixDirty()},t.prototype._flagDescendantsAsMatrixDirty=function(){},t.prototype._markAsDirty=function(t){void 0===t&&(t=!1),(this._isVisible||t)&&(this._isDirty=!0,this._host&&this._host.markAsDirty())},t.prototype._markAllAsDirty=function(){this._markAsDirty(),this._font&&this._prepareFont()},t.prototype._link=function(t,e){this._root=t,this._host=e},t.prototype._transform=function(t){if(this._isMatrixDirty||1!==this._scaleX||1!==this._scaleY||0!==this._rotation){var e=this._currentMeasure.width*this._transformCenterX+this._currentMeasure.left,i=this._currentMeasure.height*this._transformCenterY+this._currentMeasure.top;t.translate(e,i),t.rotate(this._rotation),t.scale(this._scaleX,this._scaleY),t.translate(-e,-i),(this._isMatrixDirty||this._cachedOffsetX!==e||this._cachedOffsetY!==i)&&(this._cachedOffsetX=e,this._cachedOffsetY=i,this._isMatrixDirty=!1,this._flagDescendantsAsMatrixDirty(),s.Matrix2D.ComposeToRef(-e,-i,this._rotation,this._scaleX,this._scaleY,this._root?this._root._transformMatrix:null,this._transformMatrix),this._transformMatrix.invertToRef(this._invertTransformMatrix))}},t.prototype._applyStates=function(t){this._isFontSizeInPercentage&&(this._fontSet=!0),this._fontSet&&(this._prepareFont(),this._fontSet=!1),this._font&&(t.font=this._font),this._color&&(t.fillStyle=this._color),this._alphaSet&&(t.globalAlpha=this.parent?this.parent.alpha*this._alpha:this._alpha)},t.prototype._processMeasures=function(t,e){return!this._isDirty&&this._cachedParentMeasure.isEqualsTo(t)||(this._isDirty=!1,this._currentMeasure.copyFrom(t),this._preMeasure(t,e),this._measure(),this._computeAlignment(t,e),this._currentMeasure.left=0|this._currentMeasure.left,this._currentMeasure.top=0|this._currentMeasure.top,this._currentMeasure.width=0|this._currentMeasure.width,this._currentMeasure.height=0|this._currentMeasure.height,this._additionalProcessing(t,e),this._cachedParentMeasure.copyFrom(t),this.onDirtyObservable.hasObservers()&&this.onDirtyObservable.notifyObservers(this)),!(this._currentMeasure.left>t.left+t.width)&&(!(this._currentMeasure.left+this._currentMeasure.width<t.left)&&(!(this._currentMeasure.top>t.top+t.height)&&(!(this._currentMeasure.top+this._currentMeasure.height<t.top)&&(this._transform(e),this._onlyMeasureMode?(this._onlyMeasureMode=!1,!1):(this._clip(e),e.clip(),!0)))))},t.prototype._clip=function(t){if(t.beginPath(),this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY){var e=this.shadowOffsetX,i=this.shadowOffsetY,r=this.shadowBlur,o=Math.min(Math.min(e,0)-2*r,0),n=Math.max(Math.max(e,0)+2*r,0),s=Math.min(Math.min(i,0)-2*r,0),a=Math.max(Math.max(i,0)+2*r,0);t.rect(this._currentMeasure.left+o,this._currentMeasure.top+s,this._currentMeasure.width+n-o,this._currentMeasure.height+a-s)}else t.rect(this._currentMeasure.left,this._currentMeasure.top,this._currentMeasure.width,this._currentMeasure.height)},t.prototype._measure=function(){this._width.isPixel?this._currentMeasure.width=this._width.getValue(this._host):this._currentMeasure.width*=this._width.getValue(this._host),this._height.isPixel?this._currentMeasure.height=this._height.getValue(this._host):this._currentMeasure.height*=this._height.getValue(this._host)},t.prototype._computeAlignment=function(e,i){var r=this._currentMeasure.width,o=this._currentMeasure.height,n=e.width,s=e.height,a=0,h=0;switch(this.horizontalAlignment){case t.HORIZONTAL_ALIGNMENT_LEFT:a=0;break;case t.HORIZONTAL_ALIGNMENT_RIGHT:a=n-r;break;case t.HORIZONTAL_ALIGNMENT_CENTER:a=(n-r)/2}switch(this.verticalAlignment){case t.VERTICAL_ALIGNMENT_TOP:h=0;break;case t.VERTICAL_ALIGNMENT_BOTTOM:h=s-o;break;case t.VERTICAL_ALIGNMENT_CENTER:h=(s-o)/2}this._paddingLeft.isPixel?(this._currentMeasure.left+=this._paddingLeft.getValue(this._host),this._currentMeasure.width-=this._paddingLeft.getValue(this._host)):(this._currentMeasure.left+=n*this._paddingLeft.getValue(this._host),this._currentMeasure.width-=n*this._paddingLeft.getValue(this._host)),this._paddingRight.isPixel?this._currentMeasure.width-=this._paddingRight.getValue(this._host):this._currentMeasure.width-=n*this._paddingRight.getValue(this._host),this._paddingTop.isPixel?(this._currentMeasure.top+=this._paddingTop.getValue(this._host),this._currentMeasure.height-=this._paddingTop.getValue(this._host)):(this._currentMeasure.top+=s*this._paddingTop.getValue(this._host),this._currentMeasure.height-=s*this._paddingTop.getValue(this._host)),this._paddingBottom.isPixel?this._currentMeasure.height-=this._paddingBottom.getValue(this._host):this._currentMeasure.height-=s*this._paddingBottom.getValue(this._host),this._left.isPixel?this._currentMeasure.left+=this._left.getValue(this._host):this._currentMeasure.left+=n*this._left.getValue(this._host),this._top.isPixel?this._currentMeasure.top+=this._top.getValue(this._host):this._currentMeasure.top+=s*this._top.getValue(this._host),this._currentMeasure.left+=a,this._currentMeasure.top+=h},t.prototype._preMeasure=function(t,e){},t.prototype._additionalProcessing=function(t,e){},t.prototype._draw=function(t,e){},t.prototype.contains=function(t,e){return this._invertTransformMatrix.transformCoordinates(t,e,this._transformedPosition),t=this._transformedPosition.x,e=this._transformedPosition.y,!(t<this._currentMeasure.left)&&(!(t>this._currentMeasure.left+this._currentMeasure.width)&&(!(e<this._currentMeasure.top)&&(!(e>this._currentMeasure.top+this._currentMeasure.height)&&(this.isPointerBlocker&&(this._host._shouldBlockPointer=!0),!0))))},t.prototype._processPicking=function(t,e,i,r,o){return!!this._isEnabled&&(!(!this.isHitTestVisible||!this.isVisible||this._doNotRender)&&(!!this.contains(t,e)&&(this._processObservables(i,t,e,r,o),!0)))},t.prototype._onPointerMove=function(t,e){this.onPointerMoveObservable.notifyObservers(e,-1,t,this)&&null!=this.parent&&this.parent._onPointerMove(t,e)},t.prototype._onPointerEnter=function(t){return!!this._isEnabled&&(!(this._enterCount>0)&&(-1===this._enterCount&&(this._enterCount=0),this._enterCount++,this.onPointerEnterObservable.notifyObservers(this,-1,t,this)&&null!=this.parent&&this.parent._onPointerEnter(t),!0))},t.prototype._onPointerOut=function(t){this._isEnabled&&(this._enterCount=0,this.onPointerOutObservable.notifyObservers(this,-1,t,this)&&null!=this.parent&&this.parent._onPointerOut(t))},t.prototype._onPointerDown=function(t,e,i,r){return this._onPointerEnter(this),0===this._downCount&&(this._downCount++,this._downPointerIds[i]=!0,this.onPointerDownObservable.notifyObservers(new s.Vector2WithInfo(e,r),-1,t,this)&&null!=this.parent&&this.parent._onPointerDown(t,e,i,r),!0)},t.prototype._onPointerUp=function(t,e,i,r,o){if(this._isEnabled){this._downCount=0,delete this._downPointerIds[i];var n=o;o&&(this._enterCount>0||-1===this._enterCount)&&(n=this.onPointerClickObservable.notifyObservers(new s.Vector2WithInfo(e,r),-1,t,this)),this.onPointerUpObservable.notifyObservers(new s.Vector2WithInfo(e,r),-1,t,this)&&null!=this.parent&&this.parent._onPointerUp(t,e,i,r,n)}},t.prototype._forcePointerUp=function(t){if(void 0===t&&(t=null),null!==t)this._onPointerUp(this,o.Vector2.Zero(),t,0,!0);else for(var e in this._downPointerIds)this._onPointerUp(this,o.Vector2.Zero(),+e,0,!0)},t.prototype._processObservables=function(t,e,i,r,n){if(!this._isEnabled)return!1;if(this._dummyVector2.copyFromFloats(e,i),t===o.PointerEventTypes.POINTERMOVE){this._onPointerMove(this,this._dummyVector2);var s=this._host._lastControlOver[r];return s&&s!==this&&s._onPointerOut(this),s!==this&&this._onPointerEnter(this),this._host._lastControlOver[r]=this,!0}return t===o.PointerEventTypes.POINTERDOWN?(this._onPointerDown(this,this._dummyVector2,r,n),this._host._lastControlDown[r]=this,this._host._lastPickedControl=this,!0):t===o.PointerEventTypes.POINTERUP&&(this._host._lastControlDown[r]&&this._host._lastControlDown[r]._onPointerUp(this,this._dummyVector2,r,n,!0),delete this._host._lastControlDown[r],!0)},t.prototype._prepareFont=function(){(this._font||this._fontSet)&&(this._style?this._font=this._style.fontStyle+" "+this._style.fontWeight+" "+this.fontSizeInPixels+"px "+this._style.fontFamily:this._font=this._fontStyle+" "+this._fontWeight+" "+this.fontSizeInPixels+"px "+this._fontFamily,this._fontOffset=t._GetFontOffset(this._font))},t.prototype.dispose=function(){(this.onDirtyObservable.clear(),this.onAfterDrawObservable.clear(),this.onPointerDownObservable.clear(),this.onPointerEnterObservable.clear(),this.onPointerMoveObservable.clear(),this.onPointerOutObservable.clear(),this.onPointerUpObservable.clear(),this.onPointerClickObservable.clear(),this._styleObserver&&this._style&&(this._style.onChangedObservable.remove(this._styleObserver),this._styleObserver=null),this._root&&(this._root.removeControl(this),this._root=null),this._host)&&(this._host._linkedControls.indexOf(this)>-1&&this.linkWithMesh(null))},Object.defineProperty(t,"HORIZONTAL_ALIGNMENT_LEFT",{get:function(){return t._HORIZONTAL_ALIGNMENT_LEFT},enumerable:!0,configurable:!0}),Object.defineProperty(t,"HORIZONTAL_ALIGNMENT_RIGHT",{get:function(){return t._HORIZONTAL_ALIGNMENT_RIGHT},enumerable:!0,configurable:!0}),Object.defineProperty(t,"HORIZONTAL_ALIGNMENT_CENTER",{get:function(){return t._HORIZONTAL_ALIGNMENT_CENTER},enumerable:!0,configurable:!0}),Object.defineProperty(t,"VERTICAL_ALIGNMENT_TOP",{get:function(){return t._VERTICAL_ALIGNMENT_TOP},enumerable:!0,configurable:!0}),Object.defineProperty(t,"VERTICAL_ALIGNMENT_BOTTOM",{get:function(){return t._VERTICAL_ALIGNMENT_BOTTOM},enumerable:!0,configurable:!0}),Object.defineProperty(t,"VERTICAL_ALIGNMENT_CENTER",{get:function(){return t._VERTICAL_ALIGNMENT_CENTER},enumerable:!0,configurable:!0}),t._GetFontOffset=function(e){if(t._FontHeightSizes[e])return t._FontHeightSizes[e];var i=document.createElement("span");i.innerHTML="Hg",i.style.font=e;var r=document.createElement("div");r.style.display="inline-block",r.style.width="1px",r.style.height="0px",r.style.verticalAlign="bottom";var o=document.createElement("div");o.appendChild(i),o.appendChild(r),document.body.appendChild(o);var n=0,s=0;try{s=r.getBoundingClientRect().top-i.getBoundingClientRect().top,r.style.verticalAlign="baseline",n=r.getBoundingClientRect().top-i.getBoundingClientRect().top}finally{document.body.removeChild(o)}var a={ascent:n,height:s,descent:s-n};return t._FontHeightSizes[e]=a,a},t.drawEllipse=function(t,e,i,r,o){o.translate(t,e),o.scale(i,r),o.beginPath(),o.arc(0,0,1,0,2*Math.PI),o.closePath(),o.scale(1/i,1/r),o.translate(-t,-e)},t._HORIZONTAL_ALIGNMENT_LEFT=0,t._HORIZONTAL_ALIGNMENT_RIGHT=1,t._HORIZONTAL_ALIGNMENT_CENTER=2,t._VERTICAL_ALIGNMENT_TOP=0,t._VERTICAL_ALIGNMENT_BOTTOM=1,t._VERTICAL_ALIGNMENT_CENTER=2,t._FontHeightSizes={},t.AddHeader=function(){},t}();e.Control=a},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=function(){function t(e,i,r){void 0===i&&(i=t.UNITMODE_PIXEL),void 0===r&&(r=!0),this.unit=i,this.negativeValueAllowed=r,this._value=1,this.ignoreAdaptiveScaling=!1,this._value=e}return Object.defineProperty(t.prototype,"isPercentage",{get:function(){return this.unit===t.UNITMODE_PERCENTAGE},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"isPixel",{get:function(){return this.unit===t.UNITMODE_PIXEL},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"internalValue",{get:function(){return this._value},enumerable:!0,configurable:!0}),t.prototype.getValueInPixel=function(t,e){return this.isPixel?this.getValue(t):this.getValue(t)*e},t.prototype.getValue=function(e){if(e&&!this.ignoreAdaptiveScaling&&this.unit!==t.UNITMODE_PERCENTAGE){var i=0,r=0;if(e.idealWidth&&(i=this._value*e.getSize().width/e.idealWidth),e.idealHeight&&(r=this._value*e.getSize().height/e.idealHeight),e.useSmallestIdeal&&e.idealWidth&&e.idealHeight)return window.innerWidth<window.innerHeight?i:r;if(e.idealWidth)return i;if(e.idealHeight)return r}return this._value},t.prototype.toString=function(e){switch(this.unit){case t.UNITMODE_PERCENTAGE:return 100*this.getValue(e)+"%";case t.UNITMODE_PIXEL:return this.getValue(e)+"px"}return this.unit.toString()},t.prototype.fromString=function(e){var i=t._Regex.exec(e.toString());if(!i||0===i.length)return!1;var r=parseFloat(i[1]),o=this.unit;if(this.negativeValueAllowed||r<0&&(r=0),4===i.length)switch(i[3]){case"px":o=t.UNITMODE_PIXEL;break;case"%":o=t.UNITMODE_PERCENTAGE,r/=100}return(r!==this._value||o!==this.unit)&&(this._value=r,this.unit=o,!0)},Object.defineProperty(t,"UNITMODE_PERCENTAGE",{get:function(){return t._UNITMODE_PERCENTAGE},enumerable:!0,configurable:!0}),Object.defineProperty(t,"UNITMODE_PIXEL",{get:function(){return t._UNITMODE_PIXEL},enumerable:!0,configurable:!0}),t._Regex=/(^-?\d*(\.\d+)?)(%|px)?/,t._UNITMODE_PERCENTAGE=0,t._UNITMODE_PIXEL=1,t}();e.ValueAndUnit=r},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(13),n=i(0),s=function(t){function e(e){var i=t.call(this,e)||this;return i._blockLayout=!1,i._children=new Array,i}return r(e,t),Object.defineProperty(e.prototype,"children",{get:function(){return this._children},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"blockLayout",{get:function(){return this._blockLayout},set:function(t){this._blockLayout!==t&&(this._blockLayout=t,this._blockLayout||this._arrangeChildren())},enumerable:!0,configurable:!0}),e.prototype.updateLayout=function(){return this._arrangeChildren(),this},e.prototype.containsControl=function(t){return-1!==this._children.indexOf(t)},e.prototype.addControl=function(t){return-1!==this._children.indexOf(t)?this:(t.parent=this,t._host=this._host,this._children.push(t),this._host.utilityLayer&&(t._prepareNode(this._host.utilityLayer.utilityLayerScene),t.node&&(t.node.parent=this.node),this.blockLayout||this._arrangeChildren()),this)},e.prototype._arrangeChildren=function(){},e.prototype._createNode=function(t){return new n.TransformNode("ContainerNode",t)},e.prototype.removeControl=function(t){var e=this._children.indexOf(t);return-1!==e&&(this._children.splice(e,1),t.parent=null,t._disposeNode()),this},e.prototype._getTypeName=function(){return"Container3D"},e.prototype.dispose=function(){for(var e=0,i=this._children;e<i.length;e++){i[e].dispose()}this._children=[],t.prototype.dispose.call(this)},e.UNSET_ORIENTATION=0,e.FACEORIGIN_ORIENTATION=1,e.FACEORIGINREVERSED_ORIENTATION=2,e.FACEFORWARD_ORIENTATION=3,e.FACEFORWARDREVERSED_ORIENTATION=4,e}(o.Control3D);e.Container3D=s},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(7),s=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._children=new Array,i._measureForChildren=n.Measure.Empty(),i._adaptWidthToChildren=!1,i._adaptHeightToChildren=!1,i}return r(e,t),Object.defineProperty(e.prototype,"adaptHeightToChildren",{get:function(){return this._adaptHeightToChildren},set:function(t){this._adaptHeightToChildren!==t&&(this._adaptHeightToChildren=t,t&&(this.height="100%"),this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"adaptWidthToChildren",{get:function(){return this._adaptWidthToChildren},set:function(t){this._adaptWidthToChildren!==t&&(this._adaptWidthToChildren=t,t&&(this.width="100%"),this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"background",{get:function(){return this._background},set:function(t){this._background!==t&&(this._background=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"children",{get:function(){return this._children},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"Container"},e.prototype._flagDescendantsAsMatrixDirty=function(){for(var t=0,e=this.children;t<e.length;t++){e[t]._markMatrixAsDirty()}},e.prototype.getChildByName=function(t){for(var e=0,i=this.children;e<i.length;e++){var r=i[e];if(r.name===t)return r}return null},e.prototype.getChildByType=function(t,e){for(var i=0,r=this.children;i<r.length;i++){var o=r[i];if(o.typeName===e)return o}return null},e.prototype.containsControl=function(t){return-1!==this.children.indexOf(t)},e.prototype.addControl=function(t){return t?-1!==this._children.indexOf(t)?this:(t._link(this,this._host),t._markAllAsDirty(),this._reOrderControl(t),this._markAsDirty(),this):this},e.prototype.clearControls=function(){for(var t=0,e=this._children.slice();t<e.length;t++){var i=e[t];this.removeControl(i)}return this},e.prototype.removeControl=function(t){var e=this._children.indexOf(t);return-1!==e&&(this._children.splice(e,1),t.parent=null),t.linkWithMesh(null),this._host&&this._host._cleanControlAfterRemoval(t),this._markAsDirty(),this},e.prototype._reOrderControl=function(t){this.removeControl(t);for(var e=0;e<this._children.length;e++)if(this._children[e].zIndex>t.zIndex)return void this._children.splice(e,0,t);this._children.push(t),t.parent=this,this._markAsDirty()},e.prototype._markAllAsDirty=function(){t.prototype._markAllAsDirty.call(this);for(var e=0;e<this._children.length;e++)this._children[e]._markAllAsDirty()},e.prototype._localDraw=function(t){this._background&&((this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(t.shadowColor=this.shadowColor,t.shadowBlur=this.shadowBlur,t.shadowOffsetX=this.shadowOffsetX,t.shadowOffsetY=this.shadowOffsetY),t.fillStyle=this._background,t.fillRect(this._currentMeasure.left,this._currentMeasure.top,this._currentMeasure.width,this._currentMeasure.height),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(t.shadowBlur=0,t.shadowOffsetX=0,t.shadowOffsetY=0))},e.prototype._link=function(e,i){t.prototype._link.call(this,e,i);for(var r=0,o=this._children;r<o.length;r++){o[r]._link(this,i)}},e.prototype._draw=function(t,e){if(this.isVisible&&!this.notRenderable){if(e.save(),this._applyStates(e),this._processMeasures(t,e)){this._localDraw(e),this._clipForChildren(e);for(var i=-1,r=-1,o=0,n=this._children;o<n.length;o++){var s=n[o];s.isVisible&&!s.notRenderable&&(s._tempParentMeasure.copyFrom(this._measureForChildren),s._draw(this._measureForChildren,e),s.onAfterDrawObservable.hasObservers()&&s.onAfterDrawObservable.notifyObservers(s),this.adaptWidthToChildren&&s._width.isPixel&&(i=Math.max(i,s._currentMeasure.width)),this.adaptHeightToChildren&&s._height.isPixel&&(r=Math.max(r,s._currentMeasure.height)))}this.adaptWidthToChildren&&i>=0&&(this.width=i+"px"),this.adaptHeightToChildren&&r>=0&&(this.height=r+"px")}e.restore(),this.onAfterDrawObservable.hasObservers()&&this.onAfterDrawObservable.notifyObservers(this)}},e.prototype._processPicking=function(e,i,r,o,n){if(!this.isVisible||this.notRenderable)return!1;if(!t.prototype.contains.call(this,e,i))return!1;for(var s=this._children.length-1;s>=0;s--){var a=this._children[s];if(a._processPicking(e,i,r,o,n))return a.hoverCursor&&this._host._changeCursor(a.hoverCursor),!0}return!!this.isHitTestVisible&&this._processObservables(r,e,i,o,n)},e.prototype._clipForChildren=function(t){},e.prototype._additionalProcessing=function(e,i){t.prototype._additionalProcessing.call(this,e,i),this._measureForChildren.copyFrom(this._currentMeasure)},e.prototype.dispose=function(){t.prototype.dispose.call(this);for(var e=0,i=this._children;e<i.length;e++){i[e].dispose()}},e}(o.Control);e.Container=s},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o,n=i(0),s=i(2),a=i(1);!function(t){t[t.Clip=0]="Clip",t[t.WordWrap=1]="WordWrap",t[t.Ellipsis=2]="Ellipsis"}(o=e.TextWrapping||(e.TextWrapping={}));var h=function(t){function e(e,i){void 0===i&&(i="");var r=t.call(this,e)||this;return r.name=e,r._text="",r._textWrapping=o.Clip,r._textHorizontalAlignment=a.Control.HORIZONTAL_ALIGNMENT_CENTER,r._textVerticalAlignment=a.Control.VERTICAL_ALIGNMENT_CENTER,r._resizeToFit=!1,r._lineSpacing=new s.ValueAndUnit(0),r._outlineWidth=0,r._outlineColor="white",r.onTextChangedObservable=new n.Observable,r.onLinesReadyObservable=new n.Observable,r.text=i,r}return r(e,t),Object.defineProperty(e.prototype,"lines",{get:function(){return this._lines},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"resizeToFit",{get:function(){return this._resizeToFit},set:function(t){this._resizeToFit=t,this._resizeToFit&&(this._width.ignoreAdaptiveScaling=!0,this._height.ignoreAdaptiveScaling=!0)},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"textWrapping",{get:function(){return this._textWrapping},set:function(t){this._textWrapping!==t&&(this._textWrapping=+t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"text",{get:function(){return this._text},set:function(t){this._text!==t&&(this._text=t,this._markAsDirty(),this.onTextChangedObservable.notifyObservers(this))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"textHorizontalAlignment",{get:function(){return this._textHorizontalAlignment},set:function(t){this._textHorizontalAlignment!==t&&(this._textHorizontalAlignment=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"textVerticalAlignment",{get:function(){return this._textVerticalAlignment},set:function(t){this._textVerticalAlignment!==t&&(this._textVerticalAlignment=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"lineSpacing",{get:function(){return this._lineSpacing.toString(this._host)},set:function(t){this._lineSpacing.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"outlineWidth",{get:function(){return this._outlineWidth},set:function(t){this._outlineWidth!==t&&(this._outlineWidth=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"outlineColor",{get:function(){return this._outlineColor},set:function(t){this._outlineColor!==t&&(this._outlineColor=t,this._markAsDirty())},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"TextBlock"},e.prototype._drawText=function(t,e,i,r){var o=this._currentMeasure.width,n=0;switch(this._textHorizontalAlignment){case a.Control.HORIZONTAL_ALIGNMENT_LEFT:n=0;break;case a.Control.HORIZONTAL_ALIGNMENT_RIGHT:n=o-e;break;case a.Control.HORIZONTAL_ALIGNMENT_CENTER:n=(o-e)/2}(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(r.shadowColor=this.shadowColor,r.shadowBlur=this.shadowBlur,r.shadowOffsetX=this.shadowOffsetX,r.shadowOffsetY=this.shadowOffsetY),this.outlineWidth&&r.strokeText(t,this._currentMeasure.left+n,i),r.fillText(t,this._currentMeasure.left+n,i)},e.prototype._draw=function(t,e){e.save(),this._applyStates(e),this._processMeasures(t,e)&&this._renderLines(e),e.restore()},e.prototype._applyStates=function(e){t.prototype._applyStates.call(this,e),this.outlineWidth&&(e.lineWidth=this.outlineWidth,e.strokeStyle=this.outlineColor)},e.prototype._additionalProcessing=function(t,e){this._lines=this._breakLines(this._currentMeasure.width,e),this.onLinesReadyObservable.notifyObservers(this)},e.prototype._breakLines=function(t,e){var i=[],r=this.text.split("\n");if(this._textWrapping!==o.Ellipsis||this._resizeToFit)if(this._textWrapping!==o.WordWrap||this._resizeToFit)for(var n=0,s=r;n<s.length;n++){l=s[n];i.push(this._parseLine(l,e))}else for(var a=0,h=r;a<h.length;a++){var l=h[a];i.push.apply(i,this._parseLineWordWrap(l,t,e))}else for(var u=0,c=r;u<c.length;u++){var l=c[u];i.push(this._parseLineEllipsis(l,t,e))}return i},e.prototype._parseLine=function(t,e){return void 0===t&&(t=""),{text:t,width:e.measureText(t).width}},e.prototype._parseLineEllipsis=function(t,e,i){void 0===t&&(t="");var r=i.measureText(t).width;for(r>e&&(t+="…");t.length>2&&r>e;)t=t.slice(0,-2)+"…",r=i.measureText(t).width;return{text:t,width:r}},e.prototype._parseLineWordWrap=function(t,e,i){void 0===t&&(t="");for(var r=[],o=t.split(" "),n=0,s=0;s<o.length;s++){var a=s>0?t+" "+o[s]:o[0],h=i.measureText(a).width;h>e&&s>0?(r.push({text:t,width:n}),t=o[s],n=i.measureText(t).width):(n=h,t=a)}return r.push({text:t,width:n}),r},e.prototype._renderLines=function(t){var e=this._currentMeasure.height;this._fontOffset||(this._fontOffset=a.Control._GetFontOffset(t.font));var i=0;switch(this._textVerticalAlignment){case a.Control.VERTICAL_ALIGNMENT_TOP:i=this._fontOffset.ascent;break;case a.Control.VERTICAL_ALIGNMENT_BOTTOM:i=e-this._fontOffset.height*(this._lines.length-1)-this._fontOffset.descent;break;case a.Control.VERTICAL_ALIGNMENT_CENTER:i=this._fontOffset.ascent+(e-this._fontOffset.height*this._lines.length)/2}i+=this._currentMeasure.top;for(var r=0,o=0;o<this._lines.length;o++){var n=this._lines[o];0!==o&&0!==this._lineSpacing.internalValue&&(this._lineSpacing.isPixel?i+=this._lineSpacing.getValue(this._host):i+=this._lineSpacing.getValue(this._host)*this._height.getValueInPixel(this._host,this._cachedParentMeasure.height)),this._drawText(n.text,n.width,i,t),i+=this._fontOffset.height,n.width>r&&(r=n.width)}this._resizeToFit&&(this.width=this.paddingLeftInPixels+this.paddingRightInPixels+r+"px",this.height=this.paddingTopInPixels+this.paddingBottomInPixels+this._fontOffset.height*this._lines.length+"px")},e.prototype.computeExpectedHeight=function(){if(this.text&&this.widthInPixels){var t=document.createElement("canvas").getContext("2d");if(t){this._applyStates(t),this._fontOffset||(this._fontOffset=a.Control._GetFontOffset(t.font));var e=this._lines?this._lines:this._breakLines(this.widthInPixels-this.paddingLeftInPixels-this.paddingRightInPixels,t);return this.paddingTopInPixels+this.paddingBottomInPixels+this._fontOffset.height*e.length}}return 0},e.prototype.dispose=function(){t.prototype.dispose.call(this),this.onTextChangedObservable.clear()},e}(a.Control);e.TextBlock=h},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(4),n=i(7),s=i(1),a=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._isVertical=!0,i._manualWidth=!1,i._manualHeight=!1,i._doNotTrackManualChanges=!1,i._tempMeasureStore=n.Measure.Empty(),i}return r(e,t),Object.defineProperty(e.prototype,"isVertical",{get:function(){return this._isVertical},set:function(t){this._isVertical!==t&&(this._isVertical=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"width",{get:function(){return this._width.toString(this._host)},set:function(t){this._doNotTrackManualChanges||(this._manualWidth=!0),this._width.toString(this._host)!==t&&this._width.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"height",{get:function(){return this._height.toString(this._host)},set:function(t){this._doNotTrackManualChanges||(this._manualHeight=!0),this._height.toString(this._host)!==t&&this._height.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"StackPanel"},e.prototype._preMeasure=function(e,i){for(var r=0,o=0,n=0,a=this._children;n<a.length;n++){var h=a[n];this._tempMeasureStore.copyFrom(h._currentMeasure),h._currentMeasure.copyFrom(e),h._measure(),this._isVertical?(h.top=o+"px",h._top.ignoreAdaptiveScaling||h._markAsDirty(),h._top.ignoreAdaptiveScaling=!0,o+=h._currentMeasure.height,h._currentMeasure.width>r&&(r=h._currentMeasure.width),h.verticalAlignment=s.Control.VERTICAL_ALIGNMENT_TOP):(h.left=r+"px",h._left.ignoreAdaptiveScaling||h._markAsDirty(),h._left.ignoreAdaptiveScaling=!0,r+=h._currentMeasure.width,h._currentMeasure.height>o&&(o=h._currentMeasure.height),h.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT),h._currentMeasure.copyFrom(this._tempMeasureStore)}this._doNotTrackManualChanges=!0;var l,u,c=this.height,_=this.width;this._manualHeight||(this.height=o+"px"),this._manualWidth||(this.width=r+"px"),l=_!==this.width||!this._width.ignoreAdaptiveScaling,(u=c!==this.height||!this._height.ignoreAdaptiveScaling)&&(this._height.ignoreAdaptiveScaling=!0),l&&(this._width.ignoreAdaptiveScaling=!0),this._doNotTrackManualChanges=!1,(l||u)&&this._markAllAsDirty(),t.prototype._preMeasure.call(this,e,i)},e}(o.Container);e.StackPanel=a},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=function(){function t(t,e,i,r){this.left=t,this.top=e,this.width=i,this.height=r}return t.prototype.copyFrom=function(t){this.left=t.left,this.top=t.top,this.width=t.width,this.height=t.height},t.prototype.isEqualsTo=function(t){return this.left===t.left&&(this.top===t.top&&(this.width===t.width&&this.height===t.height))},t.Empty=function(){return new t(0,0,0,0)},t}();e.Measure=r},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(3),n=i(0),s=function(t){function e(){var e=t.call(this)||this;return e._columns=10,e._rows=0,e._rowThenColum=!0,e._orientation=o.Container3D.FACEORIGIN_ORIENTATION,e.margin=0,e}return r(e,t),Object.defineProperty(e.prototype,"orientation",{get:function(){return this._orientation},set:function(t){var e=this;this._orientation!==t&&(this._orientation=t,n.Tools.SetImmediate(function(){e._arrangeChildren()}))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"columns",{get:function(){return this._columns},set:function(t){var e=this;this._columns!==t&&(this._columns=t,this._rowThenColum=!0,n.Tools.SetImmediate(function(){e._arrangeChildren()}))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"rows",{get:function(){return this._rows},set:function(t){var e=this;this._rows!==t&&(this._rows=t,this._rowThenColum=!1,n.Tools.SetImmediate(function(){e._arrangeChildren()}))},enumerable:!0,configurable:!0}),e.prototype._arrangeChildren=function(){this._cellWidth=0,this._cellHeight=0;for(var t=0,e=0,i=0,r=n.Matrix.Invert(this.node.computeWorldMatrix(!0)),o=0,s=this._children;o<s.length;o++){if((b=s[o]).mesh){i++,b.mesh.computeWorldMatrix(!0);var a=b.mesh.getHierarchyBoundingVectors(),h=n.Tmp.Vector3[0],l=n.Tmp.Vector3[1];a.max.subtractToRef(a.min,l),l.scaleInPlace(.5),n.Vector3.TransformNormalToRef(l,r,h),this._cellWidth=Math.max(this._cellWidth,2*h.x),this._cellHeight=Math.max(this._cellHeight,2*h.y)}}this._cellWidth+=2*this.margin,this._cellHeight+=2*this.margin,this._rowThenColum?(e=this._columns,t=Math.ceil(i/this._columns)):(t=this._rows,e=Math.ceil(i/this._rows));var u=.5*e*this._cellWidth,c=.5*t*this._cellHeight,_=[],f=0;if(this._rowThenColum)for(var p=0;p<t;p++)for(var d=0;d<e&&(_.push(new n.Vector3(d*this._cellWidth-u+this._cellWidth/2,p*this._cellHeight-c+this._cellHeight/2,0)),!(++f>i));d++);else for(d=0;d<e;d++)for(p=0;p<t&&(_.push(new n.Vector3(d*this._cellWidth-u+this._cellWidth/2,p*this._cellHeight-c+this._cellHeight/2,0)),!(++f>i));p++);f=0;for(var y=0,g=this._children;y<g.length;y++){var b;(b=g[y]).mesh&&(this._mapGridNode(b,_[f]),f++)}this._finalProcessing()},e.prototype._finalProcessing=function(){},e}(o.Container3D);e.VolumeBasedPanel=s},function(t,e,i){"use strict";function r(t){for(var i in t)e.hasOwnProperty(i)||(e[i]=t[i])}Object.defineProperty(e,"__esModule",{value:!0}),r(i(16)),r(i(18)),r(i(30)),r(i(4)),r(i(1)),r(i(31)),r(i(32)),r(i(11)),r(i(19)),r(i(33)),r(i(34)),r(i(35)),r(i(21)),r(i(6)),r(i(36)),r(i(5)),r(i(37)),r(i(22)),r(i(10)),r(i(38)),r(i(39))},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._thickness=1,i._cornerRadius=0,i}return r(e,t),Object.defineProperty(e.prototype,"thickness",{get:function(){return this._thickness},set:function(t){this._thickness!==t&&(this._thickness=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"cornerRadius",{get:function(){return this._cornerRadius},set:function(t){t<0&&(t=0),this._cornerRadius!==t&&(this._cornerRadius=t,this._markAsDirty())},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"Rectangle"},e.prototype._localDraw=function(t){t.save(),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(t.shadowColor=this.shadowColor,t.shadowBlur=this.shadowBlur,t.shadowOffsetX=this.shadowOffsetX,t.shadowOffsetY=this.shadowOffsetY),this._background&&(t.fillStyle=this._background,this._cornerRadius?(this._drawRoundedRect(t,this._thickness/2),t.fill()):t.fillRect(this._currentMeasure.left,this._currentMeasure.top,this._currentMeasure.width,this._currentMeasure.height)),this._thickness&&((this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(t.shadowBlur=0,t.shadowOffsetX=0,t.shadowOffsetY=0),this.color&&(t.strokeStyle=this.color),t.lineWidth=this._thickness,this._cornerRadius?(this._drawRoundedRect(t,this._thickness/2),t.stroke()):t.strokeRect(this._currentMeasure.left+this._thickness/2,this._currentMeasure.top+this._thickness/2,this._currentMeasure.width-this._thickness,this._currentMeasure.height-this._thickness)),t.restore()},e.prototype._additionalProcessing=function(e,i){t.prototype._additionalProcessing.call(this,e,i),this._measureForChildren.width-=2*this._thickness,this._measureForChildren.height-=2*this._thickness,this._measureForChildren.left+=this._thickness,this._measureForChildren.top+=this._thickness},e.prototype._drawRoundedRect=function(t,e){void 0===e&&(e=0);var i=this._currentMeasure.left+e,r=this._currentMeasure.top+e,o=this._currentMeasure.width-2*e,n=this._currentMeasure.height-2*e,s=Math.min(n/2-2,Math.min(o/2-2,this._cornerRadius));t.beginPath(),t.moveTo(i+s,r),t.lineTo(i+o-s,r),t.quadraticCurveTo(i+o,r,i+o,r+s),t.lineTo(i+o,r+n-s),t.quadraticCurveTo(i+o,r+n,i+o-s,r+n),t.lineTo(i+s,r+n),t.quadraticCurveTo(i,r+n,i,r+n-s),t.lineTo(i,r+s),t.quadraticCurveTo(i,r,i+s,r),t.closePath()},e.prototype._clipForChildren=function(t){this._cornerRadius&&(this._drawRoundedRect(t,this._thickness),t.clip())},e}(i(4).Container);e.Rectangle=o},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(0),s=function(t){function e(i,r){void 0===r&&(r=null);var o=t.call(this,i)||this;return o.name=i,o._loaded=!1,o._stretch=e.STRETCH_FILL,o._autoScale=!1,o._sourceLeft=0,o._sourceTop=0,o._sourceWidth=0,o._sourceHeight=0,o._cellWidth=0,o._cellHeight=0,o._cellId=-1,o.source=r,o}return r(e,t),Object.defineProperty(e.prototype,"sourceLeft",{get:function(){return this._sourceLeft},set:function(t){this._sourceLeft!==t&&(this._sourceLeft=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"sourceTop",{get:function(){return this._sourceTop},set:function(t){this._sourceTop!==t&&(this._sourceTop=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"sourceWidth",{get:function(){return this._sourceWidth},set:function(t){this._sourceWidth!==t&&(this._sourceWidth=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"sourceHeight",{get:function(){return this._sourceHeight},set:function(t){this._sourceHeight!==t&&(this._sourceHeight=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"autoScale",{get:function(){return this._autoScale},set:function(t){this._autoScale!==t&&(this._autoScale=t,t&&this._loaded&&this.synchronizeSizeWithContent())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"stretch",{get:function(){return this._stretch},set:function(t){this._stretch!==t&&(this._stretch=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"domImage",{get:function(){return this._domImage},set:function(t){var e=this;this._domImage=t,this._loaded=!1,this._domImage.width?this._onImageLoaded():this._domImage.onload=function(){e._onImageLoaded()}},enumerable:!0,configurable:!0}),e.prototype._onImageLoaded=function(){this._imageWidth=this._domImage.width,this._imageHeight=this._domImage.height,this._loaded=!0,this._autoScale&&this.synchronizeSizeWithContent(),this._markAsDirty()},Object.defineProperty(e.prototype,"source",{set:function(t){var e=this;this._source!==t&&(this._loaded=!1,this._source=t,this._domImage=document.createElement("img"),this._domImage.onload=function(){e._onImageLoaded()},t&&(n.Tools.SetCorsBehavior(t,this._domImage),this._domImage.src=t))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"cellWidth",{get:function(){return this._cellWidth},set:function(t){this._cellWidth!==t&&(this._cellWidth=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"cellHeight",{get:function(){return this._cellHeight},set:function(t){this._cellHeight!==t&&(this._cellHeight=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"cellId",{get:function(){return this._cellId},set:function(t){this._cellId!==t&&(this._cellId=t,this._markAsDirty())},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"Image"},e.prototype.synchronizeSizeWithContent=function(){this._loaded&&(this.width=this._domImage.width+"px",this.height=this._domImage.height+"px")},e.prototype._draw=function(t,i){var r,o,n,s;if(i.save(),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(i.shadowColor=this.shadowColor,i.shadowBlur=this.shadowBlur,i.shadowOffsetX=this.shadowOffsetX,i.shadowOffsetY=this.shadowOffsetY),-1==this.cellId)r=this._sourceLeft,o=this._sourceTop,n=this._sourceWidth?this._sourceWidth:this._imageWidth,s=this._sourceHeight?this._sourceHeight:this._imageHeight;else{var a=this._domImage.naturalWidth/this.cellWidth,h=this.cellId/a>>0,l=this.cellId%a;r=this.cellWidth*l,o=this.cellHeight*h,n=this.cellWidth,s=this.cellHeight}if(this._applyStates(i),this._processMeasures(t,i)&&this._loaded)switch(this._stretch){case e.STRETCH_NONE:case e.STRETCH_FILL:i.drawImage(this._domImage,r,o,n,s,this._currentMeasure.left,this._currentMeasure.top,this._currentMeasure.width,this._currentMeasure.height);break;case e.STRETCH_UNIFORM:var u=this._currentMeasure.width/n,c=this._currentMeasure.height/s,_=Math.min(u,c),f=(this._currentMeasure.width-n*_)/2,p=(this._currentMeasure.height-s*_)/2;i.drawImage(this._domImage,r,o,n,s,this._currentMeasure.left+f,this._currentMeasure.top+p,n*_,s*_);break;case e.STRETCH_EXTEND:i.drawImage(this._domImage,r,o,n,s,this._currentMeasure.left,this._currentMeasure.top,this._currentMeasure.width,this._currentMeasure.height),this._autoScale&&this.synchronizeSizeWithContent(),this._root&&this._root.parent&&(this._root.width=this.width,this._root.height=this.height)}i.restore()},e.STRETCH_NONE=0,e.STRETCH_FILL=1,e.STRETCH_UNIFORM=2,e.STRETCH_EXTEND=3,e}(o.Control);e.Image=s},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(0),n=i(4),s=i(23),a=i(7),h=function(t){function e(e,i,r,s,a,h){void 0===i&&(i=0),void 0===r&&(r=0),void 0===a&&(a=!1),void 0===h&&(h=o.Texture.NEAREST_SAMPLINGMODE);var l=t.call(this,e,{width:i,height:r},s,a,h,o.Engine.TEXTUREFORMAT_RGBA)||this;return l._isDirty=!1,l._rootContainer=new n.Container("root"),l._lastControlOver={},l._lastControlDown={},l._capturingControl={},l._linkedControls=new Array,l._isFullscreen=!1,l._fullscreenViewport=new o.Viewport(0,0,1,1),l._idealWidth=0,l._idealHeight=0,l._useSmallestIdeal=!1,l._renderAtIdealSize=!1,l._blockNextFocusCheck=!1,l._renderScale=1,l.premulAlpha=!1,(s=l.getScene())&&l._texture?(l._rootCanvas=s.getEngine().getRenderingCanvas(),l._renderObserver=s.onBeforeCameraRenderObservable.add(function(t){return l._checkUpdate(t)}),l._preKeyboardObserver=s.onPreKeyboardObservable.add(function(t){l._focusedControl&&(t.type===o.KeyboardEventTypes.KEYDOWN&&l._focusedControl.processKeyboard(t.event),t.skipOnPointerObservable=!0)}),l._rootContainer._link(null,l),l.hasAlpha=!0,i&&r||(l._resizeObserver=s.getEngine().onResizeObservable.add(function(){return l._onResize()}),l._onResize()),l._texture.isReady=!0,l):l}return r(e,t),Object.defineProperty(e.prototype,"renderScale",{get:function(){return this._renderScale},set:function(t){t!==this._renderScale&&(this._renderScale=t,this._onResize())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"background",{get:function(){return this._background},set:function(t){this._background!==t&&(this._background=t,this.markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"idealWidth",{get:function(){return this._idealWidth},set:function(t){this._idealWidth!==t&&(this._idealWidth=t,this.markAsDirty(),this._rootContainer._markAllAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"idealHeight",{get:function(){return this._idealHeight},set:function(t){this._idealHeight!==t&&(this._idealHeight=t,this.markAsDirty(),this._rootContainer._markAllAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"useSmallestIdeal",{get:function(){return this._useSmallestIdeal},set:function(t){this._useSmallestIdeal!==t&&(this._useSmallestIdeal=t,this.markAsDirty(),this._rootContainer._markAllAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"renderAtIdealSize",{get:function(){return this._renderAtIdealSize},set:function(t){this._renderAtIdealSize!==t&&(this._renderAtIdealSize=t,this._onResize())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"layer",{get:function(){return this._layerToDispose},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"rootContainer",{get:function(){return this._rootContainer},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"focusedControl",{get:function(){return this._focusedControl},set:function(t){this._focusedControl!=t&&(this._focusedControl&&this._focusedControl.onBlur(),t&&t.onFocus(),this._focusedControl=t)},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"isForeground",{get:function(){return!this.layer||!this.layer.isBackground},set:function(t){this.layer&&this.layer.isBackground!==!t&&(this.layer.isBackground=!t)},enumerable:!0,configurable:!0}),e.prototype.executeOnAllControls=function(t,e){e||(e=this._rootContainer),t(e);for(var i=0,r=e.children;i<r.length;i++){var o=r[i];o.children?this.executeOnAllControls(t,o):t(o)}},e.prototype.markAsDirty=function(){this._isDirty=!0},e.prototype.createStyle=function(){return new s.Style(this)},e.prototype.addControl=function(t){return this._rootContainer.addControl(t),this},e.prototype.removeControl=function(t){return this._rootContainer.removeControl(t),this},e.prototype.dispose=function(){var e=this.getScene();e&&(this._rootCanvas=null,e.onBeforeCameraRenderObservable.remove(this._renderObserver),this._resizeObserver&&e.getEngine().onResizeObservable.remove(this._resizeObserver),this._pointerMoveObserver&&e.onPrePointerObservable.remove(this._pointerMoveObserver),this._pointerObserver&&e.onPointerObservable.remove(this._pointerObserver),this._preKeyboardObserver&&e.onPreKeyboardObservable.remove(this._preKeyboardObserver),this._canvasPointerOutObserver&&e.getEngine().onCanvasPointerOutObservable.remove(this._canvasPointerOutObserver),this._layerToDispose&&(this._layerToDispose.texture=null,this._layerToDispose.dispose(),this._layerToDispose=null),this._rootContainer.dispose(),t.prototype.dispose.call(this))},e.prototype._onResize=function(){var t=this.getScene();if(t){var e=t.getEngine(),i=this.getSize(),r=e.getRenderWidth()*this._renderScale,o=e.getRenderHeight()*this._renderScale;this._renderAtIdealSize&&(this._idealWidth?(o=o*this._idealWidth/r,r=this._idealWidth):this._idealHeight&&(r=r*this._idealHeight/o,o=this._idealHeight)),i.width===r&&i.height===o||(this.scaleTo(r,o),this.markAsDirty(),(this._idealWidth||this._idealHeight)&&this._rootContainer._markAllAsDirty())}},e.prototype._getGlobalViewport=function(t){var e=t.getEngine();return this._fullscreenViewport.toGlobal(e.getRenderWidth(),e.getRenderHeight())},e.prototype.getProjectedPosition=function(t,e){var i=this.getScene();if(!i)return o.Vector2.Zero();var r=this._getGlobalViewport(i),n=o.Vector3.Project(t,e,i.getTransformMatrix(),r);return n.scaleInPlace(this.renderScale),new o.Vector2(n.x,n.y)},e.prototype._checkUpdate=function(t){if(!this._layerToDispose||0!=(t.layerMask&this._layerToDispose.layerMask)){if(this._isFullscreen&&this._linkedControls.length){var e=this.getScene();if(!e)return;for(var i=this._getGlobalViewport(e),r=0,n=this._linkedControls;r<n.length;r++){var s=n[r];if(s.isVisible){var a=s._linkedMesh;if(a&&!a.isDisposed()){var h=a.getBoundingInfo().boundingSphere.center,l=o.Vector3.Project(h,a.getWorldMatrix(),e.getTransformMatrix(),i);l.z<0||l.z>1?s.notRenderable=!0:(s.notRenderable=!1,l.scaleInPlace(this.renderScale),s._moveToProjectedPosition(l))}else o.Tools.SetImmediate(function(){s.linkWithMesh(null)})}}}(this._isDirty||this._rootContainer.isDirty)&&(this._isDirty=!1,this._render(),this.update(!0,this.premulAlpha))}},e.prototype._render=function(){var t=this.getSize(),e=t.width,i=t.height,r=this.getContext();r.clearRect(0,0,e,i),this._background&&(r.save(),r.fillStyle=this._background,r.fillRect(0,0,e,i),r.restore()),r.font="18px Arial",r.strokeStyle="white";var o=new a.Measure(0,0,e,i);this._rootContainer._draw(o,r)},e.prototype._changeCursor=function(t){this._rootCanvas&&(this._rootCanvas.style.cursor=t)},e.prototype._doPicking=function(t,e,i,r,n){var s=this.getScene();if(s){var a=s.getEngine(),h=this.getSize();this._isFullscreen&&(t*=h.width/a.getRenderWidth(),e*=h.height/a.getRenderHeight()),this._capturingControl[r]?this._capturingControl[r]._processObservables(i,t,e,r,n):(this._rootContainer._processPicking(t,e,i,r,n)||(this._changeCursor(""),i===o.PointerEventTypes.POINTERMOVE&&(this._lastControlOver[r]&&this._lastControlOver[r]._onPointerOut(this._lastControlOver[r]),delete this._lastControlOver[r])),this._manageFocus())}},e.prototype._cleanControlAfterRemovalFromList=function(t,e){for(var i in t){if(t.hasOwnProperty(i))t[i]===e&&delete t[i]}},e.prototype._cleanControlAfterRemoval=function(t){this._cleanControlAfterRemovalFromList(this._lastControlDown,t),this._cleanControlAfterRemovalFromList(this._lastControlOver,t)},e.prototype.attach=function(){var t=this,e=this.getScene();e&&(this._pointerMoveObserver=e.onPrePointerObservable.add(function(i,r){if(!e.isPointerCaptured(i.event.pointerId)&&(i.type===o.PointerEventTypes.POINTERMOVE||i.type===o.PointerEventTypes.POINTERUP||i.type===o.PointerEventTypes.POINTERDOWN)&&e){var n=e.cameraToUseForPointers||e.activeCamera;if(n){var s=e.getEngine(),a=n.viewport,h=(e.pointerX/s.getHardwareScalingLevel()-a.x*s.getRenderWidth())/a.width,l=(e.pointerY/s.getHardwareScalingLevel()-a.y*s.getRenderHeight())/a.height;t._shouldBlockPointer=!1,t._doPicking(h,l,i.type,i.event.pointerId||0,i.event.button),t._shouldBlockPointer&&(i.skipOnPointerObservable=t._shouldBlockPointer)}}}),this._attachToOnPointerOut(e))},e.prototype.attachToMesh=function(t,e){var i=this;void 0===e&&(e=!0);var r=this.getScene();r&&(this._pointerObserver=r.onPointerObservable.add(function(e,r){if(e.type===o.PointerEventTypes.POINTERMOVE||e.type===o.PointerEventTypes.POINTERUP||e.type===o.PointerEventTypes.POINTERDOWN){var n=e.event.pointerId||0;if(e.pickInfo&&e.pickInfo.hit&&e.pickInfo.pickedMesh===t){var s=e.pickInfo.getTextureCoordinates();if(s){var a=i.getSize();i._doPicking(s.x*a.width,(1-s.y)*a.height,e.type,n,e.event.button)}}else if(e.type===o.PointerEventTypes.POINTERUP){if(i._lastControlDown[n]&&i._lastControlDown[n]._forcePointerUp(n),delete i._lastControlDown[n],i.focusedControl){var h=i.focusedControl.keepsFocusWith(),l=!0;if(h)for(var u=0,c=h;u<c.length;u++){var _=c[u];if(i!==_._host){var f=_._host;if(f._lastControlOver[n]&&f._lastControlOver[n].isAscendant(_)){l=!1;break}}}l&&(i.focusedControl=null)}}else e.type===o.PointerEventTypes.POINTERMOVE&&(i._lastControlOver[n]&&i._lastControlOver[n]._onPointerOut(i._lastControlOver[n]),delete i._lastControlOver[n])}}),t.enablePointerMoveEvents=e,this._attachToOnPointerOut(r))},e.prototype.moveFocusToControl=function(t){this.focusedControl=t,this._lastPickedControl=t,this._blockNextFocusCheck=!0},e.prototype._manageFocus=function(){if(this._blockNextFocusCheck)return this._blockNextFocusCheck=!1,void(this._lastPickedControl=this._focusedControl);if(this._focusedControl&&this._focusedControl!==this._lastPickedControl){if(this._lastPickedControl.isFocusInvisible)return;this.focusedControl=null}},e.prototype._attachToOnPointerOut=function(t){var e=this;this._canvasPointerOutObserver=t.getEngine().onCanvasPointerOutObservable.add(function(t){e._lastControlOver[t.pointerId]&&e._lastControlOver[t.pointerId]._onPointerOut(e._lastControlOver[t.pointerId]),delete e._lastControlOver[t.pointerId],e._lastControlDown[t.pointerId]&&e._lastControlDown[t.pointerId]._forcePointerUp(),delete e._lastControlDown[t.pointerId]})},e.CreateForMesh=function(t,i,r,n,s){void 0===i&&(i=1024),void 0===r&&(r=1024),void 0===n&&(n=!0),void 0===s&&(s=!1);var a=new e(t.name+" AdvancedDynamicTexture",i,r,t.getScene(),!0,o.Texture.TRILINEAR_SAMPLINGMODE),h=new o.StandardMaterial("AdvancedDynamicTextureMaterial",t.getScene());return h.backFaceCulling=!1,h.diffuseColor=o.Color3.Black(),h.specularColor=o.Color3.Black(),s?(h.diffuseTexture=a,h.emissiveTexture=a,a.hasAlpha=!0):(h.emissiveTexture=a,h.opacityTexture=a),t.material=h,a.attachToMesh(t,n),a},e.CreateFullscreenUI=function(t,i,r,n){void 0===i&&(i=!0),void 0===r&&(r=null),void 0===n&&(n=o.Texture.BILINEAR_SAMPLINGMODE);var s=new e(t,0,0,r,!1,n),a=new o.Layer(t+"_layer",null,r,!i);return a.texture=s,s._layerToDispose=a,s._isFullscreen=!0,s.attach(),s},e}(o.DynamicTexture);e.AdvancedDynamicTexture=h},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=i(0),o=i(25),n=function(){function t(t){this.name=t,this._downCount=0,this._enterCount=-1,this._downPointerIds={},this._isVisible=!0,this.onPointerMoveObservable=new r.Observable,this.onPointerOutObservable=new r.Observable,this.onPointerDownObservable=new r.Observable,this.onPointerUpObservable=new r.Observable,this.onPointerClickObservable=new r.Observable,this.onPointerEnterObservable=new r.Observable,this._behaviors=new Array}return Object.defineProperty(t.prototype,"position",{get:function(){return this._node?this._node.position:r.Vector3.Zero()},set:function(t){this._node&&(this._node.position=t)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"scaling",{get:function(){return this._node?this._node.scaling:new r.Vector3(1,1,1)},set:function(t){this._node&&(this._node.scaling=t)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"behaviors",{get:function(){return this._behaviors},enumerable:!0,configurable:!0}),t.prototype.addBehavior=function(t){var e=this;if(-1!==this._behaviors.indexOf(t))return this;t.init();var i=this._host.scene;return i.isLoading?i.onDataLoadedObservable.addOnce(function(){t.attach(e)}):t.attach(this),this._behaviors.push(t),this},t.prototype.removeBehavior=function(t){var e=this._behaviors.indexOf(t);return-1===e?this:(this._behaviors[e].detach(),this._behaviors.splice(e,1),this)},t.prototype.getBehaviorByName=function(t){for(var e=0,i=this._behaviors;e<i.length;e++){var r=i[e];if(r.name===t)return r}return null},Object.defineProperty(t.prototype,"isVisible",{get:function(){return this._isVisible},set:function(t){if(this._isVisible!==t){this._isVisible=t;var e=this.mesh;e&&e.setEnabled(t)}},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"typeName",{get:function(){return this._getTypeName()},enumerable:!0,configurable:!0}),t.prototype._getTypeName=function(){return"Control3D"},Object.defineProperty(t.prototype,"node",{get:function(){return this._node},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"mesh",{get:function(){return this._node instanceof r.AbstractMesh?this._node:null},enumerable:!0,configurable:!0}),t.prototype.linkToTransformNode=function(t){return this._node&&(this._node.parent=t),this},t.prototype._prepareNode=function(t){if(!this._node){if(this._node=this._createNode(t),!this.node)return;this._node.metadata=this,this._node.position=this.position,this._node.scaling=this.scaling;var e=this.mesh;e&&(e.isPickable=!0,this._affectMaterial(e))}},t.prototype._createNode=function(t){return null},t.prototype._affectMaterial=function(t){t.material=null},t.prototype._onPointerMove=function(t,e){this.onPointerMoveObservable.notifyObservers(e,-1,t,this)},t.prototype._onPointerEnter=function(t){return!(this._enterCount>0)&&(-1===this._enterCount&&(this._enterCount=0),this._enterCount++,this.onPointerEnterObservable.notifyObservers(this,-1,t,this),this.pointerEnterAnimation&&this.pointerEnterAnimation(),!0)},t.prototype._onPointerOut=function(t){this._enterCount=0,this.onPointerOutObservable.notifyObservers(this,-1,t,this),this.pointerOutAnimation&&this.pointerOutAnimation()},t.prototype._onPointerDown=function(t,e,i,r){return 0===this._downCount&&(this._downCount++,this._downPointerIds[i]=!0,this.onPointerDownObservable.notifyObservers(new o.Vector3WithInfo(e,r),-1,t,this),this.pointerDownAnimation&&this.pointerDownAnimation(),!0)},t.prototype._onPointerUp=function(t,e,i,r,n){this._downCount=0,delete this._downPointerIds[i],n&&(this._enterCount>0||-1===this._enterCount)&&this.onPointerClickObservable.notifyObservers(new o.Vector3WithInfo(e,r),-1,t,this),this.onPointerUpObservable.notifyObservers(new o.Vector3WithInfo(e,r),-1,t,this),this.pointerUpAnimation&&this.pointerUpAnimation()},t.prototype.forcePointerUp=function(t){if(void 0===t&&(t=null),null!==t)this._onPointerUp(this,r.Vector3.Zero(),t,0,!0);else for(var e in this._downPointerIds)this._onPointerUp(this,r.Vector3.Zero(),+e,0,!0)},t.prototype._processObservables=function(t,e,i,o){if(t===r.PointerEventTypes.POINTERMOVE){this._onPointerMove(this,e);var n=this._host._lastControlOver[i];return n&&n!==this&&n._onPointerOut(this),n!==this&&this._onPointerEnter(this),this._host._lastControlOver[i]=this,!0}return t===r.PointerEventTypes.POINTERDOWN?(this._onPointerDown(this,e,i,o),this._host._lastControlDown[i]=this,this._host._lastPickedControl=this,!0):t===r.PointerEventTypes.POINTERUP&&(this._host._lastControlDown[i]&&this._host._lastControlDown[i]._onPointerUp(this,e,i,o,!0),delete this._host._lastControlDown[i],!0)},t.prototype._disposeNode=function(){this._node&&(this._node.dispose(),this._node=null)},t.prototype.dispose=function(){this.onPointerDownObservable.clear(),this.onPointerEnterObservable.clear(),this.onPointerMoveObservable.clear(),this.onPointerOutObservable.clear(),this.onPointerUpObservable.clear(),this.onPointerClickObservable.clear(),this._disposeNode();for(var t=0,e=this._behaviors;t<e.length;t++){e[t].detach()}},t}();e.Control3D=n},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(24),n=i(0),s=i(12),a=function(t){function e(e){var i=t.call(this,e)||this;return i._contentResolution=512,i._contentScaleRatio=2,i.pointerEnterAnimation=function(){i.mesh&&(i._currentMaterial.emissiveColor=n.Color3.Red())},i.pointerOutAnimation=function(){i._currentMaterial.emissiveColor=n.Color3.Black()},i.pointerDownAnimation=function(){i.mesh&&i.mesh.scaling.scaleInPlace(.95)},i.pointerUpAnimation=function(){i.mesh&&i.mesh.scaling.scaleInPlace(1/.95)},i}return r(e,t),Object.defineProperty(e.prototype,"contentResolution",{get:function(){return this._contentResolution},set:function(t){this._contentResolution!==t&&(this._contentResolution=t,this._resetContent())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"contentScaleRatio",{get:function(){return this._contentScaleRatio},set:function(t){this._contentScaleRatio!==t&&(this._contentScaleRatio=t,this._resetContent())},enumerable:!0,configurable:!0}),e.prototype._disposeFacadeTexture=function(){this._facadeTexture&&(this._facadeTexture.dispose(),this._facadeTexture=null)},e.prototype._resetContent=function(){this._disposeFacadeTexture(),this.content=this._content},Object.defineProperty(e.prototype,"content",{get:function(){return this._content},set:function(t){this._content=t,this._host&&this._host.utilityLayer&&(this._facadeTexture||(this._facadeTexture=new s.AdvancedDynamicTexture("Facade",this._contentResolution,this._contentResolution,this._host.utilityLayer.utilityLayerScene,!0,n.Texture.TRILINEAR_SAMPLINGMODE),this._facadeTexture.rootContainer.scaleX=this._contentScaleRatio,this._facadeTexture.rootContainer.scaleY=this._contentScaleRatio,this._facadeTexture.premulAlpha=!0),this._facadeTexture.addControl(t),this._applyFacade(this._facadeTexture))},enumerable:!0,configurable:!0}),e.prototype._applyFacade=function(t){this._currentMaterial.emissiveTexture=t},e.prototype._getTypeName=function(){return"Button3D"},e.prototype._createNode=function(t){for(var e=new Array(6),i=0;i<6;i++)e[i]=new n.Vector4(0,0,0,0);return e[1]=new n.Vector4(0,0,1,1),n.MeshBuilder.CreateBox(this.name+"_rootMesh",{width:1,height:1,depth:.08,faceUV:e},t)},e.prototype._affectMaterial=function(t){var e=new n.StandardMaterial(this.name+"Material",t.getScene());e.specularColor=n.Color3.Black(),t.material=e,this._currentMaterial=e,this._resetContent()},e.prototype.dispose=function(){t.prototype.dispose.call(this),this._disposeFacadeTexture(),this._currentMaterial&&this._currentMaterial.dispose()},e}(o.AbstractButton3D);e.Button3D=a},function(t,e,i){"use strict";function r(t){for(var i in t)e.hasOwnProperty(i)||(e[i]=t[i])}Object.defineProperty(e,"__esModule",{value:!0}),r(i(29)),r(i(40))},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(10),n=i(1),s=i(5),a=i(11),h=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i.thickness=1,i.isPointerBlocker=!0,i.pointerEnterAnimation=function(){i.alpha-=.1},i.pointerOutAnimation=function(){i.alpha+=.1},i.pointerDownAnimation=function(){i.scaleX-=.05,i.scaleY-=.05},i.pointerUpAnimation=function(){i.scaleX+=.05,i.scaleY+=.05},i}return r(e,t),e.prototype._getTypeName=function(){return"Button"},e.prototype._processPicking=function(e,i,r,o,n){return!(!this.isHitTestVisible||!this.isVisible||this.notRenderable)&&(!!t.prototype.contains.call(this,e,i)&&(this._processObservables(r,e,i,o,n),!0))},e.prototype._onPointerEnter=function(e){return!!t.prototype._onPointerEnter.call(this,e)&&(this.pointerEnterAnimation&&this.pointerEnterAnimation(),!0)},e.prototype._onPointerOut=function(e){this.pointerOutAnimation&&this.pointerOutAnimation(),t.prototype._onPointerOut.call(this,e)},e.prototype._onPointerDown=function(e,i,r,o){return!!t.prototype._onPointerDown.call(this,e,i,r,o)&&(this.pointerDownAnimation&&this.pointerDownAnimation(),!0)},e.prototype._onPointerUp=function(e,i,r,o,n){this.pointerUpAnimation&&this.pointerUpAnimation(),t.prototype._onPointerUp.call(this,e,i,r,o,n)},e.CreateImageButton=function(t,i,r){var o=new e(t),h=new s.TextBlock(t+"_button",i);h.textWrapping=!0,h.textHorizontalAlignment=n.Control.HORIZONTAL_ALIGNMENT_CENTER,h.paddingLeft="20%",o.addControl(h);var l=new a.Image(t+"_icon",r);return l.width="20%",l.stretch=a.Image.STRETCH_UNIFORM,l.horizontalAlignment=n.Control.HORIZONTAL_ALIGNMENT_LEFT,o.addControl(l),o},e.CreateImageOnlyButton=function(t,i){var r=new e(t),o=new a.Image(t+"_icon",i);return o.stretch=a.Image.STRETCH_FILL,o.horizontalAlignment=n.Control.HORIZONTAL_ALIGNMENT_LEFT,r.addControl(o),r},e.CreateSimpleButton=function(t,i){var r=new e(t),o=new s.TextBlock(t+"_button",i);return o.textWrapping=!0,o.textHorizontalAlignment=n.Control.HORIZONTAL_ALIGNMENT_CENTER,r.addControl(o),r},e.CreateImageWithCenterTextButton=function(t,i,r){var o=new e(t),h=new a.Image(t+"_icon",r);h.stretch=a.Image.STRETCH_FILL,o.addControl(h);var l=new s.TextBlock(t+"_button",i);return l.textWrapping=!0,l.textHorizontalAlignment=n.Control.HORIZONTAL_ALIGNMENT_CENTER,o.addControl(l),o},e}(o.Rectangle);e.Button=h},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(0),n=function(t){function e(e,i){void 0===i&&(i=0);var r=t.call(this,e.x,e.y)||this;return r.buttonIndex=i,r}return r(e,t),e}(o.Vector2);e.Vector2WithInfo=n;var s=function(){function t(t,e,i,r,o,n){this.m=new Float32Array(6),this.fromValues(t,e,i,r,o,n)}return t.prototype.fromValues=function(t,e,i,r,o,n){return this.m[0]=t,this.m[1]=e,this.m[2]=i,this.m[3]=r,this.m[4]=o,this.m[5]=n,this},t.prototype.determinant=function(){return this.m[0]*this.m[3]-this.m[1]*this.m[2]},t.prototype.invertToRef=function(t){var e=this.m[0],i=this.m[1],r=this.m[2],n=this.m[3],s=this.m[4],a=this.m[5],h=this.determinant();if(h<o.Epsilon*o.Epsilon)return t.m[0]=0,t.m[1]=0,t.m[2]=0,t.m[3]=0,t.m[4]=0,t.m[5]=0,this;var l=1/h,u=r*a-n*s,c=i*s-e*a;return t.m[0]=n*l,t.m[1]=-i*l,t.m[2]=-r*l,t.m[3]=e*l,t.m[4]=u*l,t.m[5]=c*l,this},t.prototype.multiplyToRef=function(t,e){var i=this.m[0],r=this.m[1],o=this.m[2],n=this.m[3],s=this.m[4],a=this.m[5],h=t.m[0],l=t.m[1],u=t.m[2],c=t.m[3],_=t.m[4],f=t.m[5];return e.m[0]=i*h+r*u,e.m[1]=i*l+r*c,e.m[2]=o*h+n*u,e.m[3]=o*l+n*c,e.m[4]=s*h+a*u+_,e.m[5]=s*l+a*c+f,this},t.prototype.transformCoordinates=function(t,e,i){return i.x=t*this.m[0]+e*this.m[2]+this.m[4],i.y=t*this.m[1]+e*this.m[3]+this.m[5],this},t.Identity=function(){return new t(1,0,0,1,0,0)},t.TranslationToRef=function(t,e,i){i.fromValues(1,0,0,1,t,e)},t.ScalingToRef=function(t,e,i){i.fromValues(t,0,0,e,0,0)},t.RotationToRef=function(t,e){var i=Math.sin(t),r=Math.cos(t);e.fromValues(r,i,-i,r,0,0)},t.ComposeToRef=function(e,i,r,o,n,s,a){t.TranslationToRef(e,i,t._TempPreTranslationMatrix),t.ScalingToRef(o,n,t._TempScalingMatrix),t.RotationToRef(r,t._TempRotationMatrix),t.TranslationToRef(-e,-i,t._TempPostTranslationMatrix),t._TempPreTranslationMatrix.multiplyToRef(t._TempScalingMatrix,t._TempCompose0),t._TempCompose0.multiplyToRef(t._TempRotationMatrix,t._TempCompose1),s?(t._TempCompose1.multiplyToRef(t._TempPostTranslationMatrix,t._TempCompose2),t._TempCompose2.multiplyToRef(s,a)):t._TempCompose1.multiplyToRef(t._TempPostTranslationMatrix,a)},t._TempPreTranslationMatrix=t.Identity(),t._TempPostTranslationMatrix=t.Identity(),t._TempRotationMatrix=t.Identity(),t._TempScalingMatrix=t.Identity(),t._TempCompose0=t.Identity(),t._TempCompose1=t.Identity(),t._TempCompose2=t.Identity(),t}();e.Matrix2D=s},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(0),s=i(6),a=i(5),h=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._isChecked=!1,i._background="black",i._checkSizeRatio=.8,i._thickness=1,i.onIsCheckedChangedObservable=new n.Observable,i.isPointerBlocker=!0,i}return r(e,t),Object.defineProperty(e.prototype,"thickness",{get:function(){return this._thickness},set:function(t){this._thickness!==t&&(this._thickness=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"checkSizeRatio",{get:function(){return this._checkSizeRatio},set:function(t){t=Math.max(Math.min(1,t),0),this._checkSizeRatio!==t&&(this._checkSizeRatio=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"background",{get:function(){return this._background},set:function(t){this._background!==t&&(this._background=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"isChecked",{get:function(){return this._isChecked},set:function(t){this._isChecked!==t&&(this._isChecked=t,this._markAsDirty(),this.onIsCheckedChangedObservable.notifyObservers(t))},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"CheckBox"},e.prototype._draw=function(t,e){if(e.save(),this._applyStates(e),this._processMeasures(t,e)){var i=this._currentMeasure.width-this._thickness,r=this._currentMeasure.height-this._thickness;if((this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowColor=this.shadowColor,e.shadowBlur=this.shadowBlur,e.shadowOffsetX=this.shadowOffsetX,e.shadowOffsetY=this.shadowOffsetY),e.fillStyle=this._isEnabled?this._background:this._disabledColor,e.fillRect(this._currentMeasure.left+this._thickness/2,this._currentMeasure.top+this._thickness/2,i,r),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowBlur=0,e.shadowOffsetX=0,e.shadowOffsetY=0),this._isChecked){e.fillStyle=this._isEnabled?this.color:this._disabledColor;var o=i*this._checkSizeRatio,n=r*this._checkSizeRatio;e.fillRect(this._currentMeasure.left+this._thickness/2+(i-o)/2,this._currentMeasure.top+this._thickness/2+(r-n)/2,o,n)}e.strokeStyle=this.color,e.lineWidth=this._thickness,e.strokeRect(this._currentMeasure.left+this._thickness/2,this._currentMeasure.top+this._thickness/2,i,r)}e.restore()},e.prototype._onPointerDown=function(e,i,r,o){return!!t.prototype._onPointerDown.call(this,e,i,r,o)&&(this.isChecked=!this.isChecked,!0)},e.AddCheckBoxWithHeader=function(t,i){var r=new s.StackPanel;r.isVertical=!1,r.height="30px";var n=new e;n.width="20px",n.height="20px",n.isChecked=!0,n.color="green",n.onIsCheckedChangedObservable.add(i),r.addControl(n);var h=new a.TextBlock;return h.text=t,h.width="180px",h.paddingLeft="5px",h.textHorizontalAlignment=o.Control.HORIZONTAL_ALIGNMENT_LEFT,h.color="white",r.addControl(h),r},e}(o.Control);e.Checkbox=h},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(2),s=i(0),a=function(t){function e(e,i){void 0===i&&(i="");var r=t.call(this,e)||this;return r.name=e,r._text="",r._placeholderText="",r._background="#222222",r._focusedBackground="#000000",r._placeholderColor="gray",r._thickness=1,r._margin=new n.ValueAndUnit(10,n.ValueAndUnit.UNITMODE_PIXEL),r._autoStretchWidth=!0,r._maxWidth=new n.ValueAndUnit(1,n.ValueAndUnit.UNITMODE_PERCENTAGE,!1),r._isFocused=!1,r._blinkIsEven=!1,r._cursorOffset=0,r._deadKey=!1,r._addKey=!0,r._currentKey="",r.promptMessage="Please enter text:",r.onTextChangedObservable=new s.Observable,r.onBeforeKeyAddObservable=new s.Observable,r.onFocusObservable=new s.Observable,r.onBlurObservable=new s.Observable,r.text=i,r}return r(e,t),Object.defineProperty(e.prototype,"maxWidth",{get:function(){return this._maxWidth.toString(this._host)},set:function(t){this._maxWidth.toString(this._host)!==t&&this._maxWidth.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"maxWidthInPixels",{get:function(){return this._maxWidth.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"margin",{get:function(){return this._margin.toString(this._host)},set:function(t){this._margin.toString(this._host)!==t&&this._margin.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"marginInPixels",{get:function(){return this._margin.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"autoStretchWidth",{get:function(){return this._autoStretchWidth},set:function(t){this._autoStretchWidth!==t&&(this._autoStretchWidth=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"thickness",{get:function(){return this._thickness},set:function(t){this._thickness!==t&&(this._thickness=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"focusedBackground",{get:function(){return this._focusedBackground},set:function(t){this._focusedBackground!==t&&(this._focusedBackground=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"background",{get:function(){return this._background},set:function(t){this._background!==t&&(this._background=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"placeholderColor",{get:function(){return this._placeholderColor},set:function(t){this._placeholderColor!==t&&(this._placeholderColor=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"placeholderText",{get:function(){return this._placeholderText},set:function(t){this._placeholderText!==t&&(this._placeholderText=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"deadKey",{get:function(){return this._deadKey},set:function(t){this._deadKey=t},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"addKey",{get:function(){return this._addKey},set:function(t){this._addKey=t},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"currentKey",{get:function(){return this._currentKey},set:function(t){this._currentKey=t},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"text",{get:function(){return this._text},set:function(t){this._text!==t&&(this._text=t,this._markAsDirty(),this.onTextChangedObservable.notifyObservers(this))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"width",{get:function(){return this._width.toString(this._host)},set:function(t){this._width.toString(this._host)!==t&&(this._width.fromString(t)&&this._markAsDirty(),this.autoStretchWidth=!1)},enumerable:!0,configurable:!0}),e.prototype.onBlur=function(){this._isFocused=!1,this._scrollLeft=null,this._cursorOffset=0,clearTimeout(this._blinkTimeout),this._markAsDirty(),this.onBlurObservable.notifyObservers(this)},e.prototype.onFocus=function(){if(this._isEnabled&&(this._scrollLeft=null,this._isFocused=!0,this._blinkIsEven=!1,this._cursorOffset=0,this._markAsDirty(),this.onFocusObservable.notifyObservers(this),-1!==navigator.userAgent.indexOf("Mobile"))){var t=prompt(this.promptMessage);return null!==t&&(this.text=t),void(this._host.focusedControl=null)}},e.prototype._getTypeName=function(){return"InputText"},e.prototype.keepsFocusWith=function(){return this._connectedVirtualKeyboard?[this._connectedVirtualKeyboard]:null},e.prototype.processKey=function(t,e){switch(t){case 32:e=" ";break;case 8:if(this._text&&this._text.length>0)if(0===this._cursorOffset)this.text=this._text.substr(0,this._text.length-1);else(i=this._text.length-this._cursorOffset)>0&&(this.text=this._text.slice(0,i-1)+this._text.slice(i));return;case 46:if(this._text&&this._text.length>0){var i=this._text.length-this._cursorOffset;this.text=this._text.slice(0,i)+this._text.slice(i+1),this._cursorOffset--}return;case 13:return void(this._host.focusedControl=null);case 35:return this._cursorOffset=0,this._blinkIsEven=!1,void this._markAsDirty();case 36:return this._cursorOffset=this._text.length,this._blinkIsEven=!1,void this._markAsDirty();case 37:return this._cursorOffset++,this._cursorOffset>this._text.length&&(this._cursorOffset=this._text.length),this._blinkIsEven=!1,void this._markAsDirty();case 39:return this._cursorOffset--,this._cursorOffset<0&&(this._cursorOffset=0),this._blinkIsEven=!1,void this._markAsDirty();case 222:return void(this.deadKey=!0)}if(e&&(-1===t||32===t||t>47&&t<58||t>64&&t<91||t>185&&t<193||t>218&&t<223||t>95&&t<112)&&(this._currentKey=e,this.onBeforeKeyAddObservable.notifyObservers(this),e=this._currentKey,this._addKey))if(0===this._cursorOffset)this.text+=e;else{var r=this._text.length-this._cursorOffset;this.text=this._text.slice(0,r)+e+this._text.slice(r)}},e.prototype.processKeyboard=function(t){this.processKey(t.keyCode,t.key)},e.prototype._draw=function(t,e){var i=this;if(e.save(),this._applyStates(e),this._processMeasures(t,e)){(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowColor=this.shadowColor,e.shadowBlur=this.shadowBlur,e.shadowOffsetX=this.shadowOffsetX,e.shadowOffsetY=this.shadowOffsetY),this._isFocused?this._focusedBackground&&(e.fillStyle=this._isEnabled?this._focusedBackground:this._disabledColor,e.fillRect(this._currentMeasure.left,this._currentMeasure.top,this._currentMeasure.width,this._currentMeasure.height)):this._background&&(e.fillStyle=this._isEnabled?this._background:this._disabledColor,e.fillRect(this._currentMeasure.left,this._currentMeasure.top,this._currentMeasure.width,this._currentMeasure.height)),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowBlur=0,e.shadowOffsetX=0,e.shadowOffsetY=0),this._fontOffset||(this._fontOffset=o.Control._GetFontOffset(e.font));var r=this._currentMeasure.left+this._margin.getValueInPixel(this._host,t.width);this.color&&(e.fillStyle=this.color);var n=this._beforeRenderText(this._text);this._isFocused||this._text||!this._placeholderText||(n=this._placeholderText,this._placeholderColor&&(e.fillStyle=this._placeholderColor)),this._textWidth=e.measureText(n).width;var s=2*this._margin.getValueInPixel(this._host,t.width);this._autoStretchWidth&&(this.width=Math.min(this._maxWidth.getValueInPixel(this._host,t.width),this._textWidth+s)+"px");var a=this._fontOffset.ascent+(this._currentMeasure.height-this._fontOffset.height)/2,h=this._width.getValueInPixel(this._host,t.width)-s;if(e.save(),e.beginPath(),e.rect(r,this._currentMeasure.top+(this._currentMeasure.height-this._fontOffset.height)/2,h+2,this._currentMeasure.height),e.clip(),this._isFocused&&this._textWidth>h){var l=r-this._textWidth+h;this._scrollLeft||(this._scrollLeft=l)}else this._scrollLeft=r;if(e.fillText(n,this._scrollLeft,this._currentMeasure.top+a),this._isFocused){if(this._clickedCoordinate){var u=this._scrollLeft+this._textWidth-this._clickedCoordinate,c=0;this._cursorOffset=0;var _=0;do{this._cursorOffset&&(_=Math.abs(u-c)),this._cursorOffset++,c=e.measureText(n.substr(n.length-this._cursorOffset,this._cursorOffset)).width}while(c<u&&n.length>=this._cursorOffset);Math.abs(u-c)>_&&this._cursorOffset--,this._blinkIsEven=!1,this._clickedCoordinate=null}if(!this._blinkIsEven){var f=this.text.substr(this._text.length-this._cursorOffset),p=e.measureText(f).width,d=this._scrollLeft+this._textWidth-p;d<r?(this._scrollLeft+=r-d,d=r,this._markAsDirty()):d>r+h&&(this._scrollLeft+=r+h-d,d=r+h,this._markAsDirty()),e.fillRect(d,this._currentMeasure.top+(this._currentMeasure.height-this._fontOffset.height)/2,2,this._fontOffset.height)}clearTimeout(this._blinkTimeout),this._blinkTimeout=setTimeout(function(){i._blinkIsEven=!i._blinkIsEven,i._markAsDirty()},500)}e.restore(),this._thickness&&(this.color&&(e.strokeStyle=this.color),e.lineWidth=this._thickness,e.strokeRect(this._currentMeasure.left+this._thickness/2,this._currentMeasure.top+this._thickness/2,this._currentMeasure.width-this._thickness,this._currentMeasure.height-this._thickness))}e.restore()},e.prototype._onPointerDown=function(e,i,r,o){return!!t.prototype._onPointerDown.call(this,e,i,r,o)&&(this._clickedCoordinate=i.x,this._host.focusedControl===this?(clearTimeout(this._blinkTimeout),this._markAsDirty(),!0):!!this._isEnabled&&(this._host.focusedControl=this,!0))},e.prototype._onPointerUp=function(e,i,r,o,n){t.prototype._onPointerUp.call(this,e,i,r,o,n)},e.prototype._beforeRenderText=function(t){return t},e.prototype.dispose=function(){t.prototype.dispose.call(this),this.onBlurObservable.clear(),this.onFocusObservable.clear(),this.onTextChangedObservable.clear()},e}(o.Control);e.InputText=a},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=i(2),o=i(0),n=function(){function t(t){this._multiLine=t,this._x=new r.ValueAndUnit(0),this._y=new r.ValueAndUnit(0),this._point=new o.Vector2(0,0)}return Object.defineProperty(t.prototype,"x",{get:function(){return this._x.toString(this._multiLine._host)},set:function(t){this._x.toString(this._multiLine._host)!==t&&this._x.fromString(t)&&this._multiLine._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"y",{get:function(){return this._y.toString(this._multiLine._host)},set:function(t){this._y.toString(this._multiLine._host)!==t&&this._y.fromString(t)&&this._multiLine._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"control",{get:function(){return this._control},set:function(t){this._control!==t&&(this._control&&this._controlObserver&&(this._control.onDirtyObservable.remove(this._controlObserver),this._controlObserver=null),this._control=t,this._control&&(this._controlObserver=this._control.onDirtyObservable.add(this._multiLine.onPointUpdate)),this._multiLine._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"mesh",{get:function(){return this._mesh},set:function(t){this._mesh!==t&&(this._mesh&&this._meshObserver&&this._mesh.getScene().onAfterCameraRenderObservable.remove(this._meshObserver),this._mesh=t,this._mesh&&(this._meshObserver=this._mesh.getScene().onAfterCameraRenderObservable.add(this._multiLine.onPointUpdate)),this._multiLine._markAsDirty())},enumerable:!0,configurable:!0}),t.prototype.resetLinks=function(){this.control=null,this.mesh=null},t.prototype.translate=function(){return this._point=this._translatePoint(),this._point},t.prototype._translatePoint=function(){if(null!=this._mesh)return this._multiLine._host.getProjectedPosition(this._mesh.getBoundingInfo().boundingSphere.center,this._mesh.getWorldMatrix());if(null!=this._control)return new o.Vector2(this._control.centerX,this._control.centerY);var t=this._multiLine._host,e=this._x.getValueInPixel(t,Number(t._canvas.width)),i=this._y.getValueInPixel(t,Number(t._canvas.height));return new o.Vector2(e,i)},t.prototype.dispose=function(){this.resetLinks()},t}();e.MultiLinePoint=n},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(0),s=i(9),a=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._isChecked=!1,i._background="black",i._checkSizeRatio=.8,i._thickness=1,i.group="",i.onIsCheckedChangedObservable=new n.Observable,i.isPointerBlocker=!0,i}return r(e,t),Object.defineProperty(e.prototype,"thickness",{get:function(){return this._thickness},set:function(t){this._thickness!==t&&(this._thickness=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"checkSizeRatio",{get:function(){return this._checkSizeRatio},set:function(t){t=Math.max(Math.min(1,t),0),this._checkSizeRatio!==t&&(this._checkSizeRatio=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"background",{get:function(){return this._background},set:function(t){this._background!==t&&(this._background=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"isChecked",{get:function(){return this._isChecked},set:function(t){var e=this;this._isChecked!==t&&(this._isChecked=t,this._markAsDirty(),this.onIsCheckedChangedObservable.notifyObservers(t),this._isChecked&&this._host&&this._host.executeOnAllControls(function(t){if(t!==e&&void 0!==t.group){var i=t;i.group===e.group&&(i.isChecked=!1)}}))},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"RadioButton"},e.prototype._draw=function(t,e){if(e.save(),this._applyStates(e),this._processMeasures(t,e)){var i=this._currentMeasure.width-this._thickness,r=this._currentMeasure.height-this._thickness;if((this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowColor=this.shadowColor,e.shadowBlur=this.shadowBlur,e.shadowOffsetX=this.shadowOffsetX,e.shadowOffsetY=this.shadowOffsetY),o.Control.drawEllipse(this._currentMeasure.left+this._currentMeasure.width/2,this._currentMeasure.top+this._currentMeasure.height/2,this._currentMeasure.width/2-this._thickness/2,this._currentMeasure.height/2-this._thickness/2,e),e.fillStyle=this._isEnabled?this._background:this._disabledColor,e.fill(),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowBlur=0,e.shadowOffsetX=0,e.shadowOffsetY=0),e.strokeStyle=this.color,e.lineWidth=this._thickness,e.stroke(),this._isChecked){e.fillStyle=this._isEnabled?this.color:this._disabledColor;var n=i*this._checkSizeRatio,s=r*this._checkSizeRatio;o.Control.drawEllipse(this._currentMeasure.left+this._currentMeasure.width/2,this._currentMeasure.top+this._currentMeasure.height/2,n/2-this._thickness/2,s/2-this._thickness/2,e),e.fill()}}e.restore()},e.prototype._onPointerDown=function(e,i,r,o){return!!t.prototype._onPointerDown.call(this,e,i,r,o)&&(this.isChecked||(this.isChecked=!0),!0)},e.AddRadioButtonWithHeader=function(t,i,r,n){var a=new s.StackPanel;a.isVertical=!1,a.height="30px";var h=new e;h.width="20px",h.height="20px",h.isChecked=r,h.color="green",h.group=i,h.onIsCheckedChangedObservable.add(function(t){return n(h,t)}),a.addControl(h);var l=new s.TextBlock;return l.text=t,l.width="180px",l.paddingLeft="5px",l.textHorizontalAlignment=o.Control.HORIZONTAL_ALIGNMENT_LEFT,l.color="white",a.addControl(l),a},e}(o.Control);e.RadioButton=a},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(2),s=i(0),a=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._thumbWidth=new n.ValueAndUnit(20,n.ValueAndUnit.UNITMODE_PIXEL,!1),i._minimum=0,i._maximum=100,i._value=50,i._isVertical=!1,i._background="black",i._borderColor="white",i._barOffset=new n.ValueAndUnit(5,n.ValueAndUnit.UNITMODE_PIXEL,!1),i._isThumbCircle=!1,i._isThumbClamped=!1,i.onValueChangedObservable=new s.Observable,i._pointerIsDown=!1,i.isPointerBlocker=!0,i}return r(e,t),Object.defineProperty(e.prototype,"borderColor",{get:function(){return this._borderColor},set:function(t){this._borderColor!==t&&(this._borderColor=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"background",{get:function(){return this._background},set:function(t){this._background!==t&&(this._background=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"barOffset",{get:function(){return this._barOffset.toString(this._host)},set:function(t){this._barOffset.toString(this._host)!==t&&this._barOffset.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"barOffsetInPixels",{get:function(){return this._barOffset.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"thumbWidth",{get:function(){return this._thumbWidth.toString(this._host)},set:function(t){this._thumbWidth.toString(this._host)!==t&&this._thumbWidth.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"thumbWidthInPixels",{get:function(){return this._thumbWidth.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"minimum",{get:function(){return this._minimum},set:function(t){this._minimum!==t&&(this._minimum=t,this._markAsDirty(),this.value=Math.max(Math.min(this.value,this._maximum),this._minimum))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"maximum",{get:function(){return this._maximum},set:function(t){this._maximum!==t&&(this._maximum=t,this._markAsDirty(),this.value=Math.max(Math.min(this.value,this._maximum),this._minimum))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"value",{get:function(){return this._value},set:function(t){t=Math.max(Math.min(t,this._maximum),this._minimum),this._value!==t&&(this._value=t,this._markAsDirty(),this.onValueChangedObservable.notifyObservers(this._value))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"isVertical",{get:function(){return this._isVertical},set:function(t){this._isVertical!==t&&(this._isVertical=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"isThumbCircle",{get:function(){return this._isThumbCircle},set:function(t){this._isThumbCircle!==t&&(this._isThumbCircle=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"isThumbClamped",{get:function(){return this._isThumbClamped},set:function(t){this._isThumbClamped!==t&&(this._isThumbClamped=t,this._markAsDirty())},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"Slider"},e.prototype._getThumbThickness=function(t,e){var i=0;switch(t){case"circle":i=this._thumbWidth.isPixel?Math.max(this._thumbWidth.getValue(this._host),e):e*this._thumbWidth.getValue(this._host);break;case"rectangle":i=this._thumbWidth.isPixel?Math.min(this._thumbWidth.getValue(this._host),e):e*this._thumbWidth.getValue(this._host)}return i},e.prototype._draw=function(t,e){if(e.save(),this._applyStates(e),this._processMeasures(t,e)){var i=0,r=this.isThumbCircle?"circle":"rectangle",o=this._currentMeasure.left,n=this._currentMeasure.top,s=this._currentMeasure.width,a=this._currentMeasure.height,h=Math.max(this._currentMeasure.width,this._currentMeasure.height),l=Math.min(this._currentMeasure.width,this._currentMeasure.height),u=this._getThumbThickness(r,l);h-=u;var c=0;if(this._isVertical&&this._currentMeasure.height<this._currentMeasure.width)return void console.error("Height should be greater than width");l-=2*(i=this._barOffset.isPixel?Math.min(this._barOffset.getValue(this._host),l):l*this._barOffset.getValue(this._host)),this._isVertical?(o+=i,this.isThumbClamped||(n+=u/2),a=h,s=l):(n+=i,this.isThumbClamped||(o+=u/2),a=l,s=h),this.isThumbClamped&&this.isThumbCircle?(this._isVertical?n+=u/2:o+=u/2,c=l/2):c=(u-i)/2,(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowColor=this.shadowColor,e.shadowBlur=this.shadowBlur,e.shadowOffsetX=this.shadowOffsetX,e.shadowOffsetY=this.shadowOffsetY);var _=this._isVertical?(this._maximum-this._value)/(this._maximum-this._minimum)*h:(this._value-this._minimum)/(this._maximum-this._minimum)*h;e.fillStyle=this._background,this._isVertical?this.isThumbClamped?this.isThumbCircle?(e.beginPath(),e.arc(o+l/2,n,c,Math.PI,2*Math.PI),e.fill(),e.fillRect(o,n,s,a)):e.fillRect(o,n,s,a+u):e.fillRect(o,n,s,a):this.isThumbClamped?this.isThumbCircle?(e.beginPath(),e.arc(o+h,n+l/2,c,0,2*Math.PI),e.fill(),e.fillRect(o,n,s,a)):e.fillRect(o,n,s+u,a):e.fillRect(o,n,s,a),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowBlur=0,e.shadowOffsetX=0,e.shadowOffsetY=0),e.fillStyle=this.color,this._isVertical?this.isThumbClamped?this.isThumbCircle?(e.beginPath(),e.arc(o+l/2,n+h,c,0,2*Math.PI),e.fill(),e.fillRect(o,n+_,s,a-_)):e.fillRect(o,n+_,s,this._currentMeasure.height-_):e.fillRect(o,n+_,s,a-_):this.isThumbClamped&&this.isThumbCircle?(e.beginPath(),e.arc(o,n+l/2,c,0,2*Math.PI),e.fill(),e.fillRect(o,n,_,a)):e.fillRect(o,n,_,a),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowColor=this.shadowColor,e.shadowBlur=this.shadowBlur,e.shadowOffsetX=this.shadowOffsetX,e.shadowOffsetY=this.shadowOffsetY),this._isThumbCircle?(e.beginPath(),this._isVertical?e.arc(o+l/2,n+_,c,0,2*Math.PI):e.arc(o+_,n+l/2,c,0,2*Math.PI),e.fill(),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowBlur=0,e.shadowOffsetX=0,e.shadowOffsetY=0),e.strokeStyle=this._borderColor,e.stroke()):(this._isVertical?e.fillRect(o-i,this._currentMeasure.top+_,this._currentMeasure.width,u):e.fillRect(this._currentMeasure.left+_,this._currentMeasure.top,u,this._currentMeasure.height),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowBlur=0,e.shadowOffsetX=0,e.shadowOffsetY=0),e.strokeStyle=this._borderColor,this._isVertical?e.strokeRect(o-i,this._currentMeasure.top+_,this._currentMeasure.width,u):e.strokeRect(this._currentMeasure.left+_,this._currentMeasure.top,u,this._currentMeasure.height))}e.restore()},e.prototype._updateValueFromPointer=function(t,e){0!=this.rotation&&(this._invertTransformMatrix.transformCoordinates(t,e,this._transformedPosition),t=this._transformedPosition.x,e=this._transformedPosition.y),this._isVertical?this.value=this._minimum+(1-(e-this._currentMeasure.top)/this._currentMeasure.height)*(this._maximum-this._minimum):this.value=this._minimum+(t-this._currentMeasure.left)/this._currentMeasure.width*(this._maximum-this._minimum)},e.prototype._onPointerDown=function(e,i,r,o){return!!t.prototype._onPointerDown.call(this,e,i,r,o)&&(this._pointerIsDown=!0,this._updateValueFromPointer(i.x,i.y),this._host._capturingControl[r]=this,!0)},e.prototype._onPointerMove=function(e,i){this._pointerIsDown&&this._updateValueFromPointer(i.x,i.y),t.prototype._onPointerMove.call(this,e,i)},e.prototype._onPointerUp=function(e,i,r,o,n){this._pointerIsDown=!1,delete this._host._capturingControl[r],t.prototype._onPointerUp.call(this,e,i,r,o,n)},e}(o.Control);e.Slider=a},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=i(0),o=i(2),n=function(){function t(t){this._fontFamily="Arial",this._fontStyle="",this._fontWeight="",this._fontSize=new o.ValueAndUnit(18,o.ValueAndUnit.UNITMODE_PIXEL,!1),this.onChangedObservable=new r.Observable,this._host=t}return Object.defineProperty(t.prototype,"fontSize",{get:function(){return this._fontSize.toString(this._host)},set:function(t){this._fontSize.toString(this._host)!==t&&this._fontSize.fromString(t)&&this.onChangedObservable.notifyObservers(this)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontFamily",{get:function(){return this._fontFamily},set:function(t){this._fontFamily!==t&&(this._fontFamily=t,this.onChangedObservable.notifyObservers(this))},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontStyle",{get:function(){return this._fontStyle},set:function(t){this._fontStyle!==t&&(this._fontStyle=t,this.onChangedObservable.notifyObservers(this))},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontWeight",{get:function(){return this._fontWeight},set:function(t){this._fontWeight!==t&&(this._fontWeight=t,this.onChangedObservable.notifyObservers(this))},enumerable:!0,configurable:!0}),t.prototype.dispose=function(){this.onChangedObservable.clear()},t}();e.Style=n},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(13),n=i(0),s=function(t){function e(e){return t.call(this,e)||this}return r(e,t),e.prototype._getTypeName=function(){return"AbstractButton3D"},e.prototype._createNode=function(t){return new n.TransformNode("button"+this.name)},e}(o.Control3D);e.AbstractButton3D=s},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=function(t){function e(e,i){void 0===i&&(i=0);var r=t.call(this,e.x,e.y,e.z)||this;return r.buttonIndex=i,r}return r(e,t),e}(i(0).Vector3);e.Vector3WithInfo=o},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}(),o=this&&this.__decorate||function(t,e,i,r){var o,n=arguments.length,s=n<3?e:null===r?r=Object.getOwnPropertyDescriptor(e,i):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)s=Reflect.decorate(t,e,i,r);else for(var a=t.length-1;a>=0;a--)(o=t[a])&&(s=(n<3?o(s):n>3?o(e,i,s):o(e,i))||s);return n>3&&s&&Object.defineProperty(e,i,s),s};Object.defineProperty(e,"__esModule",{value:!0});var n=i(0);i(44).registerShader();var s=function(t){function e(){var e=t.call(this)||this;return e.INNERGLOW=!1,e.BORDER=!1,e.HOVERLIGHT=!1,e.TEXTURE=!1,e.rebuild(),e}return r(e,t),e}(n.MaterialDefines);e.FluentMaterialDefines=s;var a=function(t){function e(e,i){var r=t.call(this,e,i)||this;return r.innerGlowColorIntensity=.5,r.innerGlowColor=new n.Color3(1,1,1),r.alpha=1,r.albedoColor=new n.Color3(.3,.35,.4),r.renderBorders=!1,r.borderWidth=.5,r.edgeSmoothingValue=.02,r.borderMinValue=.1,r.renderHoverLight=!1,r.hoverRadius=1,r.hoverColor=new n.Color4(.3,.3,.3,1),r.hoverPosition=n.Vector3.Zero(),r}return r(e,t),e.prototype.needAlphaBlending=function(){return 1!==this.alpha},e.prototype.needAlphaTesting=function(){return!1},e.prototype.getAlphaTestTexture=function(){return null},e.prototype.isReadyForSubMesh=function(t,e,i){if(this.isFrozen&&this._wasPreviouslyReady&&e.effect)return!0;e._materialDefines||(e._materialDefines=new s);var r=this.getScene(),o=e._materialDefines;if(!this.checkReadyOnEveryCall&&e.effect&&o._renderId===r.getRenderId())return!0;if(o._areTexturesDirty)if(o.INNERGLOW=this.innerGlowColorIntensity>0,o.BORDER=this.renderBorders,o.HOVERLIGHT=this.renderHoverLight,this._albedoTexture){if(!this._albedoTexture.isReadyOrNotBlocking())return!1;o.TEXTURE=!0}else o.TEXTURE=!1;var a=r.getEngine();if(o.isDirty){o.markAsProcessed(),r.resetCachedMaterial();var h=[n.VertexBuffer.PositionKind];h.push(n.VertexBuffer.NormalKind),h.push(n.VertexBuffer.UVKind);var l=["world","viewProjection","innerGlowColor","albedoColor","borderWidth","edgeSmoothingValue","scaleFactor","borderMinValue","hoverColor","hoverPosition","hoverRadius"],u=["albedoSampler"],c=new Array;n.MaterialHelper.PrepareUniformsAndSamplersList({uniformsNames:l,uniformBuffersNames:c,samplers:u,defines:o,maxSimultaneousLights:4});var _=o.toString();e.setEffect(r.getEngine().createEffect("fluent",{attributes:h,uniformsNames:l,uniformBuffersNames:c,samplers:u,defines:_,fallbacks:null,onCompiled:this.onCompiled,onError:this.onError,indexParameters:{maxSimultaneousLights:4}},a))}return!(!e.effect||!e.effect.isReady())&&(o._renderId=r.getRenderId(),this._wasPreviouslyReady=!0,!0)},e.prototype.bindForSubMesh=function(t,e,i){var r=this.getScene(),o=i._materialDefines;if(o){var s=i.effect;s&&(this._activeEffect=s,this.bindOnlyWorldMatrix(t),this._activeEffect.setMatrix("viewProjection",r.getTransformMatrix()),this._mustRebind(r,s)&&(this._activeEffect.setColor4("albedoColor",this.albedoColor,this.alpha),o.INNERGLOW&&this._activeEffect.setColor4("innerGlowColor",this.innerGlowColor,this.innerGlowColorIntensity),o.BORDER&&(this._activeEffect.setFloat("borderWidth",this.borderWidth),this._activeEffect.setFloat("edgeSmoothingValue",this.edgeSmoothingValue),this._activeEffect.setFloat("borderMinValue",this.borderMinValue),e.getBoundingInfo().boundingBox.extendSize.multiplyToRef(e.scaling,n.Tmp.Vector3[0]),this._activeEffect.setVector3("scaleFactor",n.Tmp.Vector3[0])),o.HOVERLIGHT&&(this._activeEffect.setDirectColor4("hoverColor",this.hoverColor),this._activeEffect.setFloat("hoverRadius",this.hoverRadius),this._activeEffect.setVector3("hoverPosition",this.hoverPosition)),o.TEXTURE&&this._activeEffect.setTexture("albedoSampler",this._albedoTexture)),this._afterBind(e,this._activeEffect))}},e.prototype.getActiveTextures=function(){return t.prototype.getActiveTextures.call(this)},e.prototype.hasTexture=function(e){return!!t.prototype.hasTexture.call(this,e)},e.prototype.dispose=function(e){t.prototype.dispose.call(this,e)},e.prototype.clone=function(t){var i=this;return n.SerializationHelper.Clone(function(){return new e(t,i.getScene())},this)},e.prototype.serialize=function(){var t=n.SerializationHelper.Serialize(this);return t.customType="BABYLON.GUI.FluentMaterial",t},e.prototype.getClassName=function(){return"FluentMaterial"},e.Parse=function(t,i,r){return n.SerializationHelper.Parse(function(){return new e(t.name,i)},t,i,r)},o([n.serialize(),n.expandToProperty("_markAllSubMeshesAsTexturesDirty")],e.prototype,"innerGlowColorIntensity",void 0),o([n.serializeAsColor3()],e.prototype,"innerGlowColor",void 0),o([n.serialize()],e.prototype,"alpha",void 0),o([n.serializeAsColor3()],e.prototype,"albedoColor",void 0),o([n.serialize(),n.expandToProperty("_markAllSubMeshesAsTexturesDirty")],e.prototype,"renderBorders",void 0),o([n.serialize()],e.prototype,"borderWidth",void 0),o([n.serialize()],e.prototype,"edgeSmoothingValue",void 0),o([n.serialize()],e.prototype,"borderMinValue",void 0),o([n.serialize(),n.expandToProperty("_markAllSubMeshesAsTexturesDirty")],e.prototype,"renderHoverLight",void 0),o([n.serialize()],e.prototype,"hoverRadius",void 0),o([n.serializeAsColor4()],e.prototype,"hoverColor",void 0),o([n.serializeAsVector3()],e.prototype,"hoverPosition",void 0),o([n.serializeAsTexture("albedoTexture")],e.prototype,"_albedoTexture",void 0),o([n.expandToProperty("_markAllSubMeshesAsTexturesAndMiscDirty")],e.prototype,"albedoTexture",void 0),e}(n.PushMaterial);e.FluentMaterial=a},function(t,e,i){"use strict";(function(t){Object.defineProperty(e,"__esModule",{value:!0});var r=i(15),o=void 0!==t?t:"undefined"!=typeof window?window:void 0;void 0!==o&&(o.BABYLON=o.BABYLON||{},o.BABYLON.GUI=r),function(t){for(var i in t)e.hasOwnProperty(i)||(e[i]=t[i])}(i(15))}).call(this,i(28))},function(t,e){var i;i=function(){return this}();try{i=i||Function("return this")()||(0,eval)("this")}catch(t){"object"==typeof window&&(i=window)}t.exports=i},function(t,e,i){"use strict";function r(t){for(var i in t)e.hasOwnProperty(i)||(e[i]=t[i])}Object.defineProperty(e,"__esModule",{value:!0}),r(i(9)),r(i(12)),r(i(17)),r(i(7)),r(i(20)),r(i(23)),r(i(2))},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(0),s=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._value=n.Color3.Red(),i._tmpColor=new n.Color3,i._pointerStartedOnSquare=!1,i._pointerStartedOnWheel=!1,i._squareLeft=0,i._squareTop=0,i._squareSize=0,i._h=360,i._s=1,i._v=1,i.onValueChangedObservable=new n.Observable,i._pointerIsDown=!1,i.value=new n.Color3(.88,.1,.1),i.size="200px",i.isPointerBlocker=!0,i}return r(e,t),Object.defineProperty(e.prototype,"value",{get:function(){return this._value},set:function(t){this._value.equals(t)||(this._value.copyFrom(t),this._RGBtoHSV(this._value,this._tmpColor),this._h=this._tmpColor.r,this._s=Math.max(this._tmpColor.g,1e-5),this._v=Math.max(this._tmpColor.b,1e-5),this._markAsDirty(),this.onValueChangedObservable.notifyObservers(this._value))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"width",{set:function(t){this._width.toString(this._host)!==t&&this._width.fromString(t)&&(this._height.fromString(t),this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"height",{set:function(t){this._height.toString(this._host)!==t&&this._height.fromString(t)&&(this._width.fromString(t),this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"size",{get:function(){return this.width},set:function(t){this.width=t},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"ColorPicker"},e.prototype._updateSquareProps=function(){var t=.5*Math.min(this._currentMeasure.width,this._currentMeasure.height),e=2*(t-.2*t)/Math.sqrt(2),i=t-.5*e;this._squareLeft=this._currentMeasure.left+i,this._squareTop=this._currentMeasure.top+i,this._squareSize=e},e.prototype._drawGradientSquare=function(t,e,i,r,o,n){var s=n.createLinearGradient(e,i,r+e,i);s.addColorStop(0,"#fff"),s.addColorStop(1,"hsl("+t+", 100%, 50%)"),n.fillStyle=s,n.fillRect(e,i,r,o);var a=n.createLinearGradient(e,i,e,o+i);a.addColorStop(0,"rgba(0,0,0,0)"),a.addColorStop(1,"#000"),n.fillStyle=a,n.fillRect(e,i,r,o)},e.prototype._drawCircle=function(t,e,i,r){r.beginPath(),r.arc(t,e,i+1,0,2*Math.PI,!1),r.lineWidth=3,r.strokeStyle="#333333",r.stroke(),r.beginPath(),r.arc(t,e,i,0,2*Math.PI,!1),r.lineWidth=3,r.strokeStyle="#ffffff",r.stroke()},e.prototype._createColorWheelCanvas=function(t,e){var i=document.createElement("canvas");i.width=2*t,i.height=2*t;for(var r=i.getContext("2d"),o=r.getImageData(0,0,2*t,2*t),n=o.data,s=this._tmpColor,a=t*t,h=t-e,l=h*h,u=-t;u<t;u++)for(var c=-t;c<t;c++){var _=u*u+c*c;if(!(_>a||_<l)){var f=Math.sqrt(_),p=Math.atan2(c,u);this._HSVtoRGB(180*p/Math.PI+180,f/t,1,s);var d=4*(u+t+2*(c+t)*t);n[d]=255*s.r,n[d+1]=255*s.g,n[d+2]=255*s.b;var y=.2;y=t<50?.2:t>150?.04:-.16*(t-50)/100+.2;var g=(f-h)/(t-h);n[d+3]=g<y?g/y*255:g>1-y?255*(1-(g-(1-y))/y):255}}return r.putImageData(o,0,0),i},e.prototype._RGBtoHSV=function(t,e){var i=t.r,r=t.g,o=t.b,n=Math.max(i,r,o),s=Math.min(i,r,o),a=0,h=0,l=n,u=n-s;0!==n&&(h=u/n),n!=s&&(n==i?(a=(r-o)/u,r<o&&(a+=6)):n==r?a=(o-i)/u+2:n==o&&(a=(i-r)/u+4),a*=60),e.r=a,e.g=h,e.b=l},e.prototype._HSVtoRGB=function(t,e,i,r){var o=i*e,n=t/60,s=o*(1-Math.abs(n%2-1)),a=0,h=0,l=0;n>=0&&n<=1?(a=o,h=s):n>=1&&n<=2?(a=s,h=o):n>=2&&n<=3?(h=o,l=s):n>=3&&n<=4?(h=s,l=o):n>=4&&n<=5?(a=s,l=o):n>=5&&n<=6&&(a=o,l=s);var u=i-o;r.set(a+u,h+u,l+u)},e.prototype._draw=function(t,e){if(e.save(),this._applyStates(e),this._processMeasures(t,e)){var i=.5*Math.min(this._currentMeasure.width,this._currentMeasure.height),r=.2*i,o=this._currentMeasure.left,n=this._currentMeasure.top;this._colorWheelCanvas&&this._colorWheelCanvas.width==2*i||(this._colorWheelCanvas=this._createColorWheelCanvas(i,r)),this._updateSquareProps(),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowColor=this.shadowColor,e.shadowBlur=this.shadowBlur,e.shadowOffsetX=this.shadowOffsetX,e.shadowOffsetY=this.shadowOffsetY,e.fillRect(this._squareLeft,this._squareTop,this._squareSize,this._squareSize)),e.drawImage(this._colorWheelCanvas,o,n),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowBlur=0,e.shadowOffsetX=0,e.shadowOffsetY=0),this._drawGradientSquare(this._h,this._squareLeft,this._squareTop,this._squareSize,this._squareSize,e);var s=this._squareLeft+this._squareSize*this._s,a=this._squareTop+this._squareSize*(1-this._v);this._drawCircle(s,a,.04*i,e);var h=i-.5*r;s=o+i+Math.cos((this._h-180)*Math.PI/180)*h,a=n+i+Math.sin((this._h-180)*Math.PI/180)*h,this._drawCircle(s,a,.35*r,e)}e.restore()},e.prototype._updateValueFromPointer=function(t,e){if(this._pointerStartedOnWheel){var i=.5*Math.min(this._currentMeasure.width,this._currentMeasure.height),r=i+this._currentMeasure.left,o=i+this._currentMeasure.top;this._h=180*Math.atan2(e-o,t-r)/Math.PI+180}else this._pointerStartedOnSquare&&(this._updateSquareProps(),this._s=(t-this._squareLeft)/this._squareSize,this._v=1-(e-this._squareTop)/this._squareSize,this._s=Math.min(this._s,1),this._s=Math.max(this._s,1e-5),this._v=Math.min(this._v,1),this._v=Math.max(this._v,1e-5));this._HSVtoRGB(this._h,this._s,this._v,this._tmpColor),this.value=this._tmpColor},e.prototype._isPointOnSquare=function(t){this._updateSquareProps();var e=this._squareLeft,i=this._squareTop,r=this._squareSize;return t.x>=e&&t.x<=e+r&&t.y>=i&&t.y<=i+r},e.prototype._isPointOnWheel=function(t){var e=.5*Math.min(this._currentMeasure.width,this._currentMeasure.height),i=e+this._currentMeasure.left,r=e+this._currentMeasure.top,o=e-.2*e,n=e*e,s=o*o,a=t.x-i,h=t.y-r,l=a*a+h*h;return l<=n&&l>=s},e.prototype._onPointerDown=function(e,i,r,o){return!!t.prototype._onPointerDown.call(this,e,i,r,o)&&(this._pointerIsDown=!0,this._pointerStartedOnSquare=!1,this._pointerStartedOnWheel=!1,this._isPointOnSquare(i)?this._pointerStartedOnSquare=!0:this._isPointOnWheel(i)&&(this._pointerStartedOnWheel=!0),this._updateValueFromPointer(i.x,i.y),this._host._capturingControl[r]=this,!0)},e.prototype._onPointerMove=function(e,i){this._pointerIsDown&&this._updateValueFromPointer(i.x,i.y),t.prototype._onPointerMove.call(this,e,i)},e.prototype._onPointerUp=function(e,i,r,o,n){this._pointerIsDown=!1,delete this._host._capturingControl[r],t.prototype._onPointerUp.call(this,e,i,r,o,n)},e}(o.Control);e.ColorPicker=s},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(4),n=i(1),s=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._thickness=1,i}return r(e,t),Object.defineProperty(e.prototype,"thickness",{get:function(){return this._thickness},set:function(t){this._thickness!==t&&(this._thickness=t,this._markAsDirty())},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"Ellipse"},e.prototype._localDraw=function(t){t.save(),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(t.shadowColor=this.shadowColor,t.shadowBlur=this.shadowBlur,t.shadowOffsetX=this.shadowOffsetX,t.shadowOffsetY=this.shadowOffsetY),n.Control.drawEllipse(this._currentMeasure.left+this._currentMeasure.width/2,this._currentMeasure.top+this._currentMeasure.height/2,this._currentMeasure.width/2-this._thickness/2,this._currentMeasure.height/2-this._thickness/2,t),this._background&&(t.fillStyle=this._background,t.fill()),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(t.shadowBlur=0,t.shadowOffsetX=0,t.shadowOffsetY=0),this._thickness&&(this.color&&(t.strokeStyle=this.color),t.lineWidth=this._thickness,t.stroke()),t.restore()},e.prototype._additionalProcessing=function(e,i){t.prototype._additionalProcessing.call(this,e,i),this._measureForChildren.width-=2*this._thickness,this._measureForChildren.height-=2*this._thickness,this._measureForChildren.left+=this._thickness,this._measureForChildren.top+=this._thickness},e.prototype._clipForChildren=function(t){n.Control.drawEllipse(this._currentMeasure.left+this._currentMeasure.width/2,this._currentMeasure.top+this._currentMeasure.height/2,this._currentMeasure.width/2,this._currentMeasure.height/2,t),t.clip()},e}(o.Container);e.Ellipse=s},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(4),n=i(2),s=i(1),a=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._rowDefinitions=new Array,i._columnDefinitions=new Array,i._cells={},i._childControls=new Array,i}return r(e,t),Object.defineProperty(e.prototype,"children",{get:function(){return this._childControls},enumerable:!0,configurable:!0}),e.prototype.addRowDefinition=function(t,e){return void 0===e&&(e=!1),this._rowDefinitions.push(new n.ValueAndUnit(t,e?n.ValueAndUnit.UNITMODE_PIXEL:n.ValueAndUnit.UNITMODE_PERCENTAGE)),this._markAsDirty(),this},e.prototype.addColumnDefinition=function(t,e){return void 0===e&&(e=!1),this._columnDefinitions.push(new n.ValueAndUnit(t,e?n.ValueAndUnit.UNITMODE_PIXEL:n.ValueAndUnit.UNITMODE_PERCENTAGE)),this._markAsDirty(),this},e.prototype.setRowDefinition=function(t,e,i){return void 0===i&&(i=!1),t<0||t>=this._rowDefinitions.length?this:(this._rowDefinitions[t]=new n.ValueAndUnit(e,i?n.ValueAndUnit.UNITMODE_PIXEL:n.ValueAndUnit.UNITMODE_PERCENTAGE),this._markAsDirty(),this)},e.prototype.setColumnDefinition=function(t,e,i){return void 0===i&&(i=!1),t<0||t>=this._columnDefinitions.length?this:(this._columnDefinitions[t]=new n.ValueAndUnit(e,i?n.ValueAndUnit.UNITMODE_PIXEL:n.ValueAndUnit.UNITMODE_PERCENTAGE),this._markAsDirty(),this)},e.prototype._removeCell=function(e,i){if(e){t.prototype.removeControl.call(this,e);for(var r=0,o=e.children;r<o.length;r++){var n=o[r],s=this._childControls.indexOf(n);-1!==s&&this._childControls.splice(s,1)}delete this._cells[i]}},e.prototype._offsetCell=function(t,e){if(this._cells[e]){this._cells[t]=this._cells[e];for(var i=0,r=this._cells[t].children;i<r.length;i++){r[i]._tag=t}delete this._cells[e]}},e.prototype.removeColumnDefinition=function(t){if(t<0||t>=this._columnDefinitions.length)return this;for(var e=0;e<this._rowDefinitions.length;e++){var i=e+":"+t,r=this._cells[i];this._removeCell(r,i)}for(e=0;e<this._rowDefinitions.length;e++)for(var o=t+1;o<this._columnDefinitions.length;o++){var n=e+":"+(o-1);i=e+":"+o;this._offsetCell(n,i)}return this._columnDefinitions.splice(t,1),this._markAsDirty(),this},e.prototype.removeRowDefinition=function(t){if(t<0||t>=this._rowDefinitions.length)return this;for(var e=0;e<this._columnDefinitions.length;e++){var i=t+":"+e,r=this._cells[i];this._removeCell(r,i)}for(e=0;e<this._columnDefinitions.length;e++)for(var o=t+1;o<this._rowDefinitions.length;o++){var n=o-1+":"+e;i=o+":"+e;this._offsetCell(n,i)}return this._rowDefinitions.splice(t,1),this._markAsDirty(),this},e.prototype.addControl=function(e,i,r){void 0===i&&(i=0),void 0===r&&(r=0),0===this._rowDefinitions.length&&this.addRowDefinition(1,!1),0===this._columnDefinitions.length&&this.addColumnDefinition(1,!1);var n=Math.min(i,this._rowDefinitions.length-1)+":"+Math.min(r,this._columnDefinitions.length-1),a=this._cells[n];return a||(a=new o.Container(n),this._cells[n]=a,a.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,a.verticalAlignment=s.Control.VERTICAL_ALIGNMENT_TOP,t.prototype.addControl.call(this,a)),a.addControl(e),this._childControls.push(e),e._tag=n,this._markAsDirty(),this},e.prototype.removeControl=function(t){var e=this._childControls.indexOf(t);-1!==e&&this._childControls.splice(e,1);var i=this._cells[t._tag];return i&&i.removeControl(t),this._markAsDirty(),this},e.prototype._getTypeName=function(){return"Grid"},e.prototype._additionalProcessing=function(e,i){for(var r=[],o=[],n=[],s=[],a=this._currentMeasure.width,h=0,l=this._currentMeasure.height,u=0,c=0,_=0,f=this._rowDefinitions;_<f.length;_++){if((b=f[_]).isPixel)l-=g=b.getValue(this._host),o[c]=g;else u+=b.internalValue;c++}var p=0;c=0;for(var d=0,y=this._rowDefinitions;d<y.length;d++){var g,b=y[d];if(s.push(p),b.isPixel)p+=b.getValue(this._host);else p+=g=b.internalValue/u*l,o[c]=g;c++}c=0;for(var m=0,v=this._columnDefinitions;m<v.length;m++){if((b=v[m]).isPixel)a-=w=b.getValue(this._host),r[c]=w;else h+=b.internalValue;c++}var O=0;c=0;for(var P=0,C=this._columnDefinitions;P<C.length;P++){var w;b=C[P];if(n.push(O),b.isPixel)O+=b.getValue(this._host);else O+=w=b.internalValue/h*a,r[c]=w;c++}for(var T in this._cells)if(this._cells.hasOwnProperty(T)){var M=T.split(":"),x=parseInt(M[0]),A=parseInt(M[1]),k=this._cells[T];k.left=n[A]+"px",k.top=s[x]+"px",k.width=r[A]+"px",k.height=o[x]+"px"}t.prototype._additionalProcessing.call(this,e,i)},e.prototype.dispose=function(){t.prototype.dispose.call(this);for(var e=0,i=this._childControls;e<i.length;e++){i[e].dispose()}},e}(o.Container);e.Grid=a},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return r(e,t),e.prototype._beforeRenderText=function(t){for(var e="",i=0;i<t.length;i++)e+="•";return e},e}(i(19).InputText);e.InputPassword=o},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(2),s=i(0),a=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._lineWidth=1,i._x1=new n.ValueAndUnit(0),i._y1=new n.ValueAndUnit(0),i._x2=new n.ValueAndUnit(0),i._y2=new n.ValueAndUnit(0),i._dash=new Array,i.isHitTestVisible=!1,i._horizontalAlignment=o.Control.HORIZONTAL_ALIGNMENT_LEFT,i._verticalAlignment=o.Control.VERTICAL_ALIGNMENT_TOP,i}return r(e,t),Object.defineProperty(e.prototype,"dash",{get:function(){return this._dash},set:function(t){this._dash!==t&&(this._dash=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"connectedControl",{get:function(){return this._connectedControl},set:function(t){var e=this;this._connectedControl!==t&&(this._connectedControlDirtyObserver&&this._connectedControl&&(this._connectedControl.onDirtyObservable.remove(this._connectedControlDirtyObserver),this._connectedControlDirtyObserver=null),t&&(this._connectedControlDirtyObserver=t.onDirtyObservable.add(function(){return e._markAsDirty()})),this._connectedControl=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"x1",{get:function(){return this._x1.toString(this._host)},set:function(t){this._x1.toString(this._host)!==t&&this._x1.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"y1",{get:function(){return this._y1.toString(this._host)},set:function(t){this._y1.toString(this._host)!==t&&this._y1.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"x2",{get:function(){return this._x2.toString(this._host)},set:function(t){this._x2.toString(this._host)!==t&&this._x2.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"y2",{get:function(){return this._y2.toString(this._host)},set:function(t){this._y2.toString(this._host)!==t&&this._y2.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"lineWidth",{get:function(){return this._lineWidth},set:function(t){this._lineWidth!==t&&(this._lineWidth=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"horizontalAlignment",{set:function(t){},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"verticalAlignment",{set:function(t){},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"_effectiveX2",{get:function(){return(this._connectedControl?this._connectedControl.centerX:0)+this._x2.getValue(this._host)},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"_effectiveY2",{get:function(){return(this._connectedControl?this._connectedControl.centerY:0)+this._y2.getValue(this._host)},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"Line"},e.prototype._draw=function(t,e){e.save(),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowColor=this.shadowColor,e.shadowBlur=this.shadowBlur,e.shadowOffsetX=this.shadowOffsetX,e.shadowOffsetY=this.shadowOffsetY),this._applyStates(e),this._processMeasures(t,e)&&(e.strokeStyle=this.color,e.lineWidth=this._lineWidth,e.setLineDash(this._dash),e.beginPath(),e.moveTo(this._x1.getValue(this._host),this._y1.getValue(this._host)),e.lineTo(this._effectiveX2,this._effectiveY2),e.stroke()),e.restore()},e.prototype._measure=function(){this._currentMeasure.width=Math.abs(this._x1.getValue(this._host)-this._effectiveX2)+this._lineWidth,this._currentMeasure.height=Math.abs(this._y1.getValue(this._host)-this._effectiveY2)+this._lineWidth},e.prototype._computeAlignment=function(t,e){this._currentMeasure.left=Math.min(this._x1.getValue(this._host),this._effectiveX2)-this._lineWidth/2,this._currentMeasure.top=Math.min(this._y1.getValue(this._host),this._effectiveY2)-this._lineWidth/2},e.prototype.moveToVector3=function(t,e,i){if(void 0===i&&(i=!1),this._host&&this._root===this._host._rootContainer){var r=this._host._getGlobalViewport(e),o=s.Vector3.Project(t,s.Matrix.Identity(),e.getTransformMatrix(),r);this._moveToProjectedPosition(o,i),o.z<0||o.z>1?this.notRenderable=!0:this.notRenderable=!1}else s.Tools.Error("Cannot move a control to a vector3 if the control is not at root level")},e.prototype._moveToProjectedPosition=function(t,e){void 0===e&&(e=!1);var i=t.x+this._linkOffsetX.getValue(this._host)+"px",r=t.y+this._linkOffsetY.getValue(this._host)+"px";e?(this.x2=i,this.y2=r,this._x2.ignoreAdaptiveScaling=!0,this._y2.ignoreAdaptiveScaling=!0):(this.x1=i,this.y1=r,this._x1.ignoreAdaptiveScaling=!0,this._y1.ignoreAdaptiveScaling=!0)},e}(o.Control);e.Line=a},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(20),s=i(0),a=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._lineWidth=1,i.onPointUpdate=function(){i._markAsDirty()},i.isHitTestVisible=!1,i._horizontalAlignment=o.Control.HORIZONTAL_ALIGNMENT_LEFT,i._verticalAlignment=o.Control.VERTICAL_ALIGNMENT_TOP,i._dash=[],i._points=[],i}return r(e,t),Object.defineProperty(e.prototype,"dash",{get:function(){return this._dash},set:function(t){this._dash!==t&&(this._dash=t,this._markAsDirty())},enumerable:!0,configurable:!0}),e.prototype.getAt=function(t){return this._points[t]||(this._points[t]=new n.MultiLinePoint(this)),this._points[t]},e.prototype.add=function(){for(var t=this,e=[],i=0;i<arguments.length;i++)e[i]=arguments[i];return e.map(function(e){return t.push(e)})},e.prototype.push=function(t){var e=this.getAt(this._points.length);return null==t?e:(t instanceof s.AbstractMesh?e.mesh=t:t instanceof o.Control?e.control=t:null!=t.x&&null!=t.y&&(e.x=t.x,e.y=t.y),e)},e.prototype.remove=function(t){var e;if(t instanceof n.MultiLinePoint){if(-1===(e=this._points.indexOf(t)))return}else e=t;var i=this._points[e];i&&(i.dispose(),this._points.splice(e,1))},e.prototype.reset=function(){for(;this._points.length>0;)this.remove(this._points.length-1)},e.prototype.resetLinks=function(){this._points.forEach(function(t){null!=t&&t.resetLinks()})},Object.defineProperty(e.prototype,"lineWidth",{get:function(){return this._lineWidth},set:function(t){this._lineWidth!==t&&(this._lineWidth=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"horizontalAlignment",{set:function(t){},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"verticalAlignment",{set:function(t){},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"MultiLine"},e.prototype._draw=function(t,e){if(e.save(),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowColor=this.shadowColor,e.shadowBlur=this.shadowBlur,e.shadowOffsetX=this.shadowOffsetX,e.shadowOffsetY=this.shadowOffsetY),this._applyStates(e),this._processMeasures(t,e)){e.strokeStyle=this.color,e.lineWidth=this._lineWidth,e.setLineDash(this._dash),e.beginPath();var i=!0;this._points.forEach(function(t){t&&(i?(e.moveTo(t._point.x,t._point.y),i=!1):e.lineTo(t._point.x,t._point.y))}),e.stroke()}e.restore()},e.prototype._additionalProcessing=function(t,e){var i=this;this._minX=null,this._minY=null,this._maxX=null,this._maxY=null,this._points.forEach(function(t,e){t&&(t.translate(),(null==i._minX||t._point.x<i._minX)&&(i._minX=t._point.x),(null==i._minY||t._point.y<i._minY)&&(i._minY=t._point.y),(null==i._maxX||t._point.x>i._maxX)&&(i._maxX=t._point.x),(null==i._maxY||t._point.y>i._maxY)&&(i._maxY=t._point.y))}),null==this._minX&&(this._minX=0),null==this._minY&&(this._minY=0),null==this._maxX&&(this._maxX=0),null==this._maxY&&(this._maxY=0)},e.prototype._measure=function(){null!=this._minX&&null!=this._maxX&&null!=this._minY&&null!=this._maxY&&(this._currentMeasure.width=Math.abs(this._maxX-this._minX)+this._lineWidth,this._currentMeasure.height=Math.abs(this._maxY-this._minY)+this._lineWidth)},e.prototype._computeAlignment=function(t,e){null!=this._minX&&null!=this._minY&&(this._currentMeasure.left=this._minX-this._lineWidth/2,this._currentMeasure.top=this._minY-this._lineWidth/2)},e.prototype.dispose=function(){this.reset(),t.prototype.dispose.call(this)},e}(o.Control);e.MultiLine=a},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(10),n=i(6),s=i(1),a=i(5),h=i(18),l=i(21),u=i(22),c=i(4),_=function(){function t(t){this.name=t,this._groupPanel=new n.StackPanel,this._selectors=new Array,this._groupPanel.verticalAlignment=s.Control.VERTICAL_ALIGNMENT_TOP,this._groupPanel.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,this._groupHeader=this._addGroupHeader(t)}return Object.defineProperty(t.prototype,"groupPanel",{get:function(){return this._groupPanel},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"selectors",{get:function(){return this._selectors},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"header",{get:function(){return this._groupHeader.text},set:function(t){"label"!==this._groupHeader.text&&(this._groupHeader.text=t)},enumerable:!0,configurable:!0}),t.prototype._addGroupHeader=function(t){var e=new a.TextBlock("groupHead",t);return e.width=.9,e.height="30px",e.textWrapping=!0,e.color="black",e.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,e.textHorizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,e.left="2px",this._groupPanel.addControl(e),e},t.prototype._getSelector=function(t){if(!(t<0||t>=this._selectors.length))return this._selectors[t]},t.prototype.removeSelector=function(t){t<0||t>=this._selectors.length||(this._groupPanel.removeControl(this._selectors[t]),this._selectors.splice(t,1))},t}();e.SelectorGroup=_;var f=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return r(e,t),e.prototype.addCheckbox=function(t,e,i){void 0===e&&(e=function(t){}),void 0===i&&(i=!1);i=i||!1;var r=new h.Checkbox;r.width="20px",r.height="20px",r.color="#364249",r.background="#CCCCCC",r.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,r.onIsCheckedChangedObservable.add(function(t){e(t)});var o=s.Control.AddHeader(r,t,"200px",{isHorizontal:!0,controlFirst:!0});o.height="30px",o.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,o.left="4px",this.groupPanel.addControl(o),this.selectors.push(o),r.isChecked=i,this.groupPanel.parent&&this.groupPanel.parent.parent&&(r.color=this.groupPanel.parent.parent.buttonColor,r.background=this.groupPanel.parent.parent.buttonBackground)},e.prototype._setSelectorLabel=function(t,e){this.selectors[t].children[1].text=e},e.prototype._setSelectorLabelColor=function(t,e){this.selectors[t].children[1].color=e},e.prototype._setSelectorButtonColor=function(t,e){this.selectors[t].children[0].color=e},e.prototype._setSelectorButtonBackground=function(t,e){this.selectors[t].children[0].background=e},e}(_);e.CheckboxGroup=f;var p=function(t){function e(){var e=null!==t&&t.apply(this,arguments)||this;return e._selectNb=0,e}return r(e,t),e.prototype.addRadio=function(t,e,i){void 0===e&&(e=function(t){}),void 0===i&&(i=!1);var r=this._selectNb++,o=new l.RadioButton;o.name=t,o.width="20px",o.height="20px",o.color="#364249",o.background="#CCCCCC",o.group=this.name,o.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,o.onIsCheckedChangedObservable.add(function(t){t&&e(r)});var n=s.Control.AddHeader(o,t,"200px",{isHorizontal:!0,controlFirst:!0});n.height="30px",n.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,n.left="4px",this.groupPanel.addControl(n),this.selectors.push(n),o.isChecked=i,this.groupPanel.parent&&this.groupPanel.parent.parent&&(o.color=this.groupPanel.parent.parent.buttonColor,o.background=this.groupPanel.parent.parent.buttonBackground)},e.prototype._setSelectorLabel=function(t,e){this.selectors[t].children[1].text=e},e.prototype._setSelectorLabelColor=function(t,e){this.selectors[t].children[1].color=e},e.prototype._setSelectorButtonColor=function(t,e){this.selectors[t].children[0].color=e},e.prototype._setSelectorButtonBackground=function(t,e){this.selectors[t].children[0].background=e},e}(_);e.RadioGroup=p;var d=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return r(e,t),e.prototype.addSlider=function(t,e,i,r,o,n,a){void 0===e&&(e=function(t){}),void 0===i&&(i="Units"),void 0===r&&(r=0),void 0===o&&(o=0),void 0===n&&(n=0),void 0===a&&(a=function(t){return 0|t});var h=new u.Slider;h.name=i,h.value=n,h.minimum=r,h.maximum=o,h.width=.9,h.height="20px",h.color="#364249",h.background="#CCCCCC",h.borderColor="black",h.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,h.left="4px",h.paddingBottom="4px",h.onValueChangedObservable.add(function(t){h.parent.children[0].text=h.parent.children[0].name+": "+a(t)+" "+h.name,e(t)});var l=s.Control.AddHeader(h,t+": "+a(n)+" "+i,"30px",{isHorizontal:!1,controlFirst:!1});l.height="60px",l.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,l.left="4px",l.children[0].name=t,this.groupPanel.addControl(l),this.selectors.push(l),this.groupPanel.parent&&this.groupPanel.parent.parent&&(h.color=this.groupPanel.parent.parent.buttonColor,h.background=this.groupPanel.parent.parent.buttonBackground)},e.prototype._setSelectorLabel=function(t,e){this.selectors[t].children[0].name=e,this.selectors[t].children[0].text=e+": "+this.selectors[t].children[1].value+" "+this.selectors[t].children[1].name},e.prototype._setSelectorLabelColor=function(t,e){this.selectors[t].children[0].color=e},e.prototype._setSelectorButtonColor=function(t,e){this.selectors[t].children[1].color=e},e.prototype._setSelectorButtonBackground=function(t,e){this.selectors[t].children[1].background=e},e}(_);e.SliderGroup=d;var y=function(t){function e(e,i){void 0===i&&(i=[]);var r=t.call(this,e)||this;if(r.name=e,r.groups=i,r._buttonColor="#364249",r._buttonBackground="#CCCCCC",r._headerColor="black",r._barColor="white",r._barHeight="2px",r._spacerHeight="20px",r._bars=new Array,r._groups=i,r.thickness=2,r._panel=new n.StackPanel,r._panel.verticalAlignment=s.Control.VERTICAL_ALIGNMENT_TOP,r._panel.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,r._panel.top=5,r._panel.left=5,r._panel.width=.95,i.length>0){for(var o=0;o<i.length-1;o++)r._panel.addControl(i[o].groupPanel),r._addSpacer();r._panel.addControl(i[i.length-1].groupPanel)}return r.addControl(r._panel),r}return r(e,t),e.prototype._getTypeName=function(){return"SelectionPanel"},Object.defineProperty(e.prototype,"headerColor",{get:function(){return this._headerColor},set:function(t){this._headerColor!==t&&(this._headerColor=t,this._setHeaderColor())},enumerable:!0,configurable:!0}),e.prototype._setHeaderColor=function(){for(var t=0;t<this._groups.length;t++)this._groups[t].groupPanel.children[0].color=this._headerColor},Object.defineProperty(e.prototype,"buttonColor",{get:function(){return this._buttonColor},set:function(t){this._buttonColor!==t&&(this._buttonColor=t,this._setbuttonColor())},enumerable:!0,configurable:!0}),e.prototype._setbuttonColor=function(){for(var t=0;t<this._groups.length;t++)for(var e=0;e<this._groups[t].selectors.length;e++)this._groups[t]._setSelectorButtonColor(e,this._buttonColor)},Object.defineProperty(e.prototype,"labelColor",{get:function(){return this._labelColor},set:function(t){this._labelColor!==t&&(this._labelColor=t,this._setLabelColor())},enumerable:!0,configurable:!0}),e.prototype._setLabelColor=function(){for(var t=0;t<this._groups.length;t++)for(var e=0;e<this._groups[t].selectors.length;e++)this._groups[t]._setSelectorLabelColor(e,this._labelColor)},Object.defineProperty(e.prototype,"buttonBackground",{get:function(){return this._buttonBackground},set:function(t){this._buttonBackground!==t&&(this._buttonBackground=t,this._setButtonBackground())},enumerable:!0,configurable:!0}),e.prototype._setButtonBackground=function(){for(var t=0;t<this._groups.length;t++)for(var e=0;e<this._groups[t].selectors.length;e++)this._groups[t]._setSelectorButtonBackground(e,this._buttonBackground)},Object.defineProperty(e.prototype,"barColor",{get:function(){return this._barColor},set:function(t){this._barColor!==t&&(this._barColor=t,this._setBarColor())},enumerable:!0,configurable:!0}),e.prototype._setBarColor=function(){for(var t=0;t<this._bars.length;t++)this._bars[t].children[0].background=this._barColor},Object.defineProperty(e.prototype,"barHeight",{get:function(){return this._barHeight},set:function(t){this._barHeight!==t&&(this._barHeight=t,this._setBarHeight())},enumerable:!0,configurable:!0}),e.prototype._setBarHeight=function(){for(var t=0;t<this._bars.length;t++)this._bars[t].children[0].height=this._barHeight},Object.defineProperty(e.prototype,"spacerHeight",{get:function(){return this._spacerHeight},set:function(t){this._spacerHeight!==t&&(this._spacerHeight=t,this._setSpacerHeight())},enumerable:!0,configurable:!0}),e.prototype._setSpacerHeight=function(){for(var t=0;t<this._bars.length;t++)this._bars[t].height=this._spacerHeight},e.prototype._addSpacer=function(){var t=new c.Container;t.width=1,t.height=this._spacerHeight,t.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT;var e=new o.Rectangle;e.width=1,e.height=this._barHeight,e.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,e.verticalAlignment=s.Control.VERTICAL_ALIGNMENT_CENTER,e.background=this._barColor,e.color="transparent",t.addControl(e),this._panel.addControl(t),this._bars.push(t)},e.prototype.addGroup=function(t){this._groups.length>0&&this._addSpacer(),this._panel.addControl(t.groupPanel),this._groups.push(t),t.groupPanel.children[0].color=this._headerColor;for(var e=0;e<t.selectors.length;e++)t._setSelectorButtonColor(e,this._buttonColor),t._setSelectorButtonBackground(e,this._buttonBackground)},e.prototype.removeGroup=function(t){if(!(t<0||t>=this._groups.length)){var e=this._groups[t];this._panel.removeControl(e.groupPanel),this._groups.splice(t,1),t<this._bars.length&&(this._panel.removeControl(this._bars[t]),this._bars.splice(t,1))}},e.prototype.setHeaderName=function(t,e){e<0||e>=this._groups.length||(this._groups[e].groupPanel.children[0].text=t)},e.prototype.relabel=function(t,e,i){if(!(e<0||e>=this._groups.length)){var r=this._groups[e];i<0||i>=r.selectors.length||r._setSelectorLabel(i,t)}},e.prototype.removeFromGroupSelector=function(t,e){if(!(t<0||t>=this._groups.length)){var i=this._groups[t];e<0||e>=i.selectors.length||i.removeSelector(e)}},e.prototype.addToGroupCheckbox=function(t,e,i,r){(void 0===i&&(i=function(){}),void 0===r&&(r=!1),t<0||t>=this._groups.length)||this._groups[t].addCheckbox(e,i,r)},e.prototype.addToGroupRadio=function(t,e,i,r){(void 0===i&&(i=function(){}),void 0===r&&(r=!1),t<0||t>=this._groups.length)||this._groups[t].addRadio(e,i,r)},e.prototype.addToGroupSlider=function(t,e,i,r,o,n,s,a){(void 0===i&&(i=function(){}),void 0===r&&(r="Units"),void 0===o&&(o=0),void 0===n&&(n=0),void 0===s&&(s=0),void 0===a&&(a=function(t){return 0|t}),t<0||t>=this._groups.length)||this._groups[t].addSlider(e,i,r,o,n,s,a)},e}(o.Rectangle);e.SelectionPanel=y},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(6),n=i(0),s=i(16),a=function(){return function(){}}();e.KeyPropertySet=a;var h=function(t){function e(){var e=null!==t&&t.apply(this,arguments)||this;return e.onKeyPressObservable=new n.Observable,e.defaultButtonWidth="40px",e.defaultButtonHeight="40px",e.defaultButtonPaddingLeft="2px",e.defaultButtonPaddingRight="2px",e.defaultButtonPaddingTop="2px",e.defaultButtonPaddingBottom="2px",e.defaultButtonColor="#DDD",e.defaultButtonBackground="#070707",e.shiftButtonColor="#7799FF",e.selectedShiftThickness=1,e.shiftState=0,e._currentlyConnectedInputText=null,e._connectedInputTexts=[],e._onKeyPressObserver=null,e}return r(e,t),e.prototype._getTypeName=function(){return"VirtualKeyboard"},e.prototype._createKey=function(t,e){var i=this,r=s.Button.CreateSimpleButton(t,t);return r.width=e&&e.width?e.width:this.defaultButtonWidth,r.height=e&&e.height?e.height:this.defaultButtonHeight,r.color=e&&e.color?e.color:this.defaultButtonColor,r.background=e&&e.background?e.background:this.defaultButtonBackground,r.paddingLeft=e&&e.paddingLeft?e.paddingLeft:this.defaultButtonPaddingLeft,r.paddingRight=e&&e.paddingRight?e.paddingRight:this.defaultButtonPaddingRight,r.paddingTop=e&&e.paddingTop?e.paddingTop:this.defaultButtonPaddingTop,r.paddingBottom=e&&e.paddingBottom?e.paddingBottom:this.defaultButtonPaddingBottom,r.thickness=0,r.isFocusInvisible=!0,r.shadowColor=this.shadowColor,r.shadowBlur=this.shadowBlur,r.shadowOffsetX=this.shadowOffsetX,r.shadowOffsetY=this.shadowOffsetY,r.onPointerUpObservable.add(function(){i.onKeyPressObservable.notifyObservers(t)}),r},e.prototype.addKeysRow=function(t,e){var i=new o.StackPanel;i.isVertical=!1,i.isFocusInvisible=!0;for(var r=0;r<t.length;r++){var n=null;e&&e.length===t.length&&(n=e[r]),i.addControl(this._createKey(t[r],n))}this.addControl(i)},e.prototype.applyShiftState=function(t){if(this.children)for(var e=0;e<this.children.length;e++){var i=this.children[e];if(i&&i.children)for(var r=i,o=0;o<r.children.length;o++){var n=r.children[o];if(n&&n.children[0]){var s=n.children[0];"⇧"===s.text&&(n.color=t?this.shiftButtonColor:this.defaultButtonColor,n.thickness=t>1?this.selectedShiftThickness:0),s.text=t>0?s.text.toUpperCase():s.text.toLowerCase()}}}},Object.defineProperty(e.prototype,"connectedInputText",{get:function(){return this._currentlyConnectedInputText},enumerable:!0,configurable:!0}),e.prototype.connect=function(t){var e=this;if(!this._connectedInputTexts.some(function(e){return e.input===t})){null===this._onKeyPressObserver&&(this._onKeyPressObserver=this.onKeyPressObservable.add(function(t){if(e._currentlyConnectedInputText){switch(e._currentlyConnectedInputText._host.focusedControl=e._currentlyConnectedInputText,t){case"⇧":return e.shiftState++,e.shiftState>2&&(e.shiftState=0),void e.applyShiftState(e.shiftState);case"←":return void e._currentlyConnectedInputText.processKey(8);case"↵":return void e._currentlyConnectedInputText.processKey(13)}e._currentlyConnectedInputText.processKey(-1,e.shiftState?t.toUpperCase():t),1===e.shiftState&&(e.shiftState=0,e.applyShiftState(e.shiftState))}})),this.isVisible=!1,this._currentlyConnectedInputText=t,t._connectedVirtualKeyboard=this;var i=t.onFocusObservable.add(function(){e._currentlyConnectedInputText=t,t._connectedVirtualKeyboard=e,e.isVisible=!0}),r=t.onBlurObservable.add(function(){t._connectedVirtualKeyboard=null,e._currentlyConnectedInputText=null,e.isVisible=!1});this._connectedInputTexts.push({input:t,onBlurObserver:r,onFocusObserver:i})}},e.prototype.disconnect=function(t){var e=this;if(t){var i=this._connectedInputTexts.filter(function(e){return e.input===t});1===i.length&&(this._removeConnectedInputObservables(i[0]),this._connectedInputTexts=this._connectedInputTexts.filter(function(e){return e.input!==t}),this._currentlyConnectedInputText===t&&(this._currentlyConnectedInputText=null))}else this._connectedInputTexts.forEach(function(t){e._removeConnectedInputObservables(t)}),this._connectedInputTexts=[];0===this._connectedInputTexts.length&&(this._currentlyConnectedInputText=null,this.onKeyPressObservable.remove(this._onKeyPressObserver),this._onKeyPressObserver=null)},e.prototype._removeConnectedInputObservables=function(t){t.input._connectedVirtualKeyboard=null,t.input.onFocusObservable.remove(t.onFocusObserver),t.input.onBlurObservable.remove(t.onBlurObserver)},e.prototype.dispose=function(){t.prototype.dispose.call(this),this.disconnect()},e.CreateDefaultLayout=function(t){var i=new e(t);return i.addKeysRow(["1","2","3","4","5","6","7","8","9","0","←"]),i.addKeysRow(["q","w","e","r","t","y","u","i","o","p"]),i.addKeysRow(["a","s","d","f","g","h","j","k","l",";","'","↵"]),i.addKeysRow(["⇧","z","x","c","v","b","n","m",",",".","/"]),i.addKeysRow([" "],[{width:"200px"}]),i},e}(o.StackPanel);e.VirtualKeyboard=h},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._cellWidth=20,i._cellHeight=20,i._minorLineTickness=1,i._minorLineColor="DarkGray",i._majorLineTickness=2,i._majorLineColor="White",i._majorLineFrequency=5,i._background="Black",i._displayMajorLines=!0,i._displayMinorLines=!0,i}return r(e,t),Object.defineProperty(e.prototype,"displayMinorLines",{get:function(){return this._displayMinorLines},set:function(t){this._displayMinorLines!==t&&(this._displayMinorLines=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"displayMajorLines",{get:function(){return this._displayMajorLines},set:function(t){this._displayMajorLines!==t&&(this._displayMajorLines=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"background",{get:function(){return this._background},set:function(t){this._background!==t&&(this._background=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"cellWidth",{get:function(){return this._cellWidth},set:function(t){this._cellWidth=t,this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"cellHeight",{get:function(){return this._cellHeight},set:function(t){this._cellHeight=t,this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"minorLineTickness",{get:function(){return this._minorLineTickness},set:function(t){this._minorLineTickness=t,this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"minorLineColor",{get:function(){return this._minorLineColor},set:function(t){this._minorLineColor=t,this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"majorLineTickness",{get:function(){return this._majorLineTickness},set:function(t){this._majorLineTickness=t,this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"majorLineColor",{get:function(){return this._majorLineColor},set:function(t){this._majorLineColor=t,this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"majorLineFrequency",{get:function(){return this._majorLineFrequency},set:function(t){this._majorLineFrequency=t,this._markAsDirty()},enumerable:!0,configurable:!0}),e.prototype._draw=function(t,e){if(e.save(),this._applyStates(e),this._isEnabled&&this._processMeasures(t,e)){this._background&&(e.fillStyle=this._background,e.fillRect(this._currentMeasure.left,this._currentMeasure.top,this._currentMeasure.width,this._currentMeasure.height));var i=this._currentMeasure.width/this._cellWidth,r=this._currentMeasure.height/this._cellHeight,o=this._currentMeasure.left+this._currentMeasure.width/2,n=this._currentMeasure.top+this._currentMeasure.height/2;if(this._displayMinorLines){e.strokeStyle=this._minorLineColor,e.lineWidth=this._minorLineTickness;for(var s=-i/2;s<i/2;s++){var a=o+s*this.cellWidth;e.beginPath(),e.moveTo(a,this._currentMeasure.top),e.lineTo(a,this._currentMeasure.top+this._currentMeasure.height),e.stroke()}for(var h=-r/2;h<r/2;h++){var l=n+h*this.cellHeight;e.beginPath(),e.moveTo(this._currentMeasure.left,l),e.lineTo(this._currentMeasure.left+this._currentMeasure.width,l),e.stroke()}}if(this._displayMajorLines){e.strokeStyle=this._majorLineColor,e.lineWidth=this._majorLineTickness;for(s=-i/2+this._majorLineFrequency;s<i/2;s+=this._majorLineFrequency){a=o+s*this.cellWidth;e.beginPath(),e.moveTo(a,this._currentMeasure.top),e.lineTo(a,this._currentMeasure.top+this._currentMeasure.height),e.stroke()}for(h=-r/2+this._majorLineFrequency;h<r/2;h+=this._majorLineFrequency){l=n+h*this.cellHeight;e.moveTo(this._currentMeasure.left,l),e.lineTo(this._currentMeasure.left+this._currentMeasure.width,l),e.closePath(),e.stroke()}}}e.restore()},e.prototype._getTypeName=function(){return"DisplayGrid"},e}(i(9).Control);e.DisplayGrid=o},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=i(1),o=i(6),n=i(5);e.name="Statics",r.Control.AddHeader=function(t,e,i,s){var a=new o.StackPanel("panel"),h=!s||s.isHorizontal,l=!s||s.controlFirst;a.isVertical=!h;var u=new n.TextBlock("header");return u.text=e,u.textHorizontalAlignment=r.Control.HORIZONTAL_ALIGNMENT_LEFT,h?u.width=i:u.height=i,l?(a.addControl(t),a.addControl(u),u.paddingLeft="5px"):(a.addControl(u),a.addControl(t),u.paddingRight="5px"),u.shadowBlur=t.shadowBlur,u.shadowColor=t.shadowColor,u.shadowOffsetX=t.shadowOffsetX,u.shadowOffsetY=t.shadowOffsetY,a}},function(t,e,i){"use strict";function r(t){for(var i in t)e.hasOwnProperty(i)||(e[i]=t[i])}Object.defineProperty(e,"__esModule",{value:!0}),r(i(41)),r(i(52)),r(i(53)),r(i(25))},function(t,e,i){"use strict";function r(t){for(var i in t)e.hasOwnProperty(i)||(e[i]=t[i])}Object.defineProperty(e,"__esModule",{value:!0}),r(i(24)),r(i(14)),r(i(3)),r(i(13)),r(i(42)),r(i(43)),r(i(47)),r(i(48)),r(i(49)),r(i(50)),r(i(51)),r(i(8))},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(8),n=i(0),s=i(3),a=function(t){function e(){var e=null!==t&&t.apply(this,arguments)||this;return e._radius=5,e}return r(e,t),Object.defineProperty(e.prototype,"radius",{get:function(){return this._radius},set:function(t){var e=this;this._radius!==t&&(this._radius=t,n.Tools.SetImmediate(function(){e._arrangeChildren()}))},enumerable:!0,configurable:!0}),e.prototype._mapGridNode=function(t,e){var i=t.mesh;if(i){var r=this._cylindricalMapping(e);switch(t.position=r,this.orientation){case s.Container3D.FACEORIGIN_ORIENTATION:i.lookAt(new BABYLON.Vector3(-r.x,r.y,-r.z));break;case s.Container3D.FACEORIGINREVERSED_ORIENTATION:i.lookAt(new BABYLON.Vector3(2*r.x,r.y,2*r.z));break;case s.Container3D.FACEFORWARD_ORIENTATION:break;case s.Container3D.FACEFORWARDREVERSED_ORIENTATION:i.rotate(BABYLON.Axis.Y,Math.PI,BABYLON.Space.LOCAL)}}},e.prototype._cylindricalMapping=function(t){var e=new n.Vector3(0,t.y,this._radius),i=t.x/this._radius;return n.Matrix.RotationYawPitchRollToRef(i,0,0,n.Tmp.Matrix[0]),n.Vector3.TransformNormal(e,n.Tmp.Matrix[0])},e}(o.VolumeBasedPanel);e.CylinderPanel=a},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(14),n=i(0),s=i(26),a=i(6),h=i(11),l=i(5),u=i(12),c=function(t){function e(e,i){void 0===i&&(i=!0);var r=t.call(this,e)||this;return r._shareMaterials=!0,r._shareMaterials=i,r.pointerEnterAnimation=function(){r.mesh&&r._frontPlate.setEnabled(!0)},r.pointerOutAnimation=function(){r.mesh&&r._frontPlate.setEnabled(!1)},r}return r(e,t),e.prototype._disposeTooltip=function(){this._tooltipFade=null,this._tooltipTextBlock&&this._tooltipTextBlock.dispose(),this._tooltipTexture&&this._tooltipTexture.dispose(),this._tooltipMesh&&this._tooltipMesh.dispose(),this.onPointerEnterObservable.remove(this._tooltipHoverObserver),this.onPointerOutObservable.remove(this._tooltipOutObserver)},Object.defineProperty(e.prototype,"tooltipText",{get:function(){return this._tooltipTextBlock?this._tooltipTextBlock.text:null},set:function(t){var e=this;if(t){if(!this._tooltipFade){this._tooltipMesh=BABYLON.MeshBuilder.CreatePlane("",{size:1},this._backPlate._scene);var i=BABYLON.MeshBuilder.CreatePlane("",{size:1,sideOrientation:BABYLON.Mesh.DOUBLESIDE},this._backPlate._scene),r=new n.StandardMaterial("",this._backPlate._scene);r.diffuseColor=BABYLON.Color3.FromHexString("#212121"),i.material=r,i.isPickable=!1,this._tooltipMesh.addChild(i),i.position.z=.05,this._tooltipMesh.scaling.y=1/3,this._tooltipMesh.position.y=.7,this._tooltipMesh.position.z=-.15,this._tooltipMesh.isPickable=!1,this._tooltipMesh.parent=this._backPlate,this._tooltipTexture=u.AdvancedDynamicTexture.CreateForMesh(this._tooltipMesh),this._tooltipTextBlock=new l.TextBlock,this._tooltipTextBlock.scaleY=3,this._tooltipTextBlock.color="white",this._tooltipTextBlock.fontSize=130,this._tooltipTexture.addControl(this._tooltipTextBlock),this._tooltipFade=new BABYLON.FadeInOutBehavior,this._tooltipFade.delay=500,this._tooltipMesh.addBehavior(this._tooltipFade),this._tooltipHoverObserver=this.onPointerEnterObservable.add(function(){e._tooltipFade&&e._tooltipFade.fadeIn(!0)}),this._tooltipOutObserver=this.onPointerOutObservable.add(function(){e._tooltipFade&&e._tooltipFade.fadeIn(!1)})}this._tooltipTextBlock&&(this._tooltipTextBlock.text=t)}else this._disposeTooltip()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"text",{get:function(){return this._text},set:function(t){this._text!==t&&(this._text=t,this._rebuildContent())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"imageUrl",{get:function(){return this._imageUrl},set:function(t){this._imageUrl!==t&&(this._imageUrl=t,this._rebuildContent())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"backMaterial",{get:function(){return this._backMaterial},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"frontMaterial",{get:function(){return this._frontMaterial},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"plateMaterial",{get:function(){return this._plateMaterial},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"shareMaterials",{get:function(){return this._shareMaterials},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"HolographicButton"},e.prototype._rebuildContent=function(){this._disposeFacadeTexture();var t=new a.StackPanel;if(t.isVertical=!0,this._imageUrl){var e=new h.Image;e.source=this._imageUrl,e.paddingTop="40px",e.height="180px",e.width="100px",e.paddingBottom="40px",t.addControl(e)}if(this._text){var i=new l.TextBlock;i.text=this._text,i.color="white",i.height="30px",i.fontSize=24,t.addControl(i)}this._frontPlate&&(this.content=t)},e.prototype._createNode=function(e){return this._backPlate=n.MeshBuilder.CreateBox(this.name+"BackMesh",{width:1,height:1,depth:.08},e),this._frontPlate=n.MeshBuilder.CreateBox(this.name+"FrontMesh",{width:1,height:1,depth:.08},e),this._frontPlate.parent=this._backPlate,this._frontPlate.position.z=-.08,this._frontPlate.isPickable=!1,this._frontPlate.setEnabled(!1),this._textPlate=t.prototype._createNode.call(this,e),this._textPlate.parent=this._backPlate,this._textPlate.position.z=-.08,this._textPlate.isPickable=!1,this._backPlate},e.prototype._applyFacade=function(t){this._plateMaterial.emissiveTexture=t,this._plateMaterial.opacityTexture=t},e.prototype._createBackMaterial=function(t){var e=this;this._backMaterial=new s.FluentMaterial(this.name+"Back Material",t.getScene()),this._backMaterial.renderHoverLight=!0,this._pickedPointObserver=this._host.onPickedPointChangedObservable.add(function(t){t?(e._backMaterial.hoverPosition=t,e._backMaterial.hoverColor.a=1):e._backMaterial.hoverColor.a=0})},e.prototype._createFrontMaterial=function(t){this._frontMaterial=new s.FluentMaterial(this.name+"Front Material",t.getScene()),this._frontMaterial.innerGlowColorIntensity=0,this._frontMaterial.alpha=.5,this._frontMaterial.renderBorders=!0},e.prototype._createPlateMaterial=function(t){this._plateMaterial=new n.StandardMaterial(this.name+"Plate Material",t.getScene()),this._plateMaterial.specularColor=n.Color3.Black()},e.prototype._affectMaterial=function(t){this._shareMaterials?(this._host._sharedMaterials.backFluentMaterial?this._backMaterial=this._host._sharedMaterials.backFluentMaterial:(this._createBackMaterial(t),this._host._sharedMaterials.backFluentMaterial=this._backMaterial),this._host._sharedMaterials.frontFluentMaterial?this._frontMaterial=this._host._sharedMaterials.frontFluentMaterial:(this._createFrontMaterial(t),this._host._sharedMaterials.frontFluentMaterial=this._frontMaterial)):(this._createBackMaterial(t),this._createFrontMaterial(t)),this._createPlateMaterial(t),this._backPlate.material=this._backMaterial,this._frontPlate.material=this._frontMaterial,this._textPlate.material=this._plateMaterial,this._rebuildContent()},e.prototype.dispose=function(){t.prototype.dispose.call(this),this._disposeTooltip(),this.shareMaterials||(this._backMaterial.dispose(),this._frontMaterial.dispose(),this._plateMaterial.dispose(),this._pickedPointObserver&&(this._host.onPickedPointChangedObservable.remove(this._pickedPointObserver),this._pickedPointObserver=null))},e}(o.Button3D);e.HolographicButton=c},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=i(0),o=i(45);e.fShader=o;var n=i(46);e.vShader=n,e.registerShader=function(){r.Effect.ShadersStore.fluentVertexShader=n,r.Effect.ShadersStore.fluentPixelShader=o}},function(t,e){t.exports="precision highp float;\nvarying vec2 vUV;\nuniform vec4 albedoColor;\n#ifdef INNERGLOW\nuniform vec4 innerGlowColor;\n#endif\n#ifdef BORDER\nvarying vec2 scaleInfo;\nuniform float edgeSmoothingValue;\nuniform float borderMinValue;\n#endif\n#ifdef HOVERLIGHT\nvarying vec3 worldPosition;\nuniform vec3 hoverPosition;\nuniform vec4 hoverColor;\nuniform float hoverRadius;\n#endif\n#ifdef TEXTURE\nuniform sampler2D albedoSampler;\n#endif\nvoid main(void) {\nvec3 albedo=albedoColor.rgb;\nfloat alpha=albedoColor.a;\n#ifdef TEXTURE\nalbedo=texture2D(albedoSampler,vUV).rgb;\n#endif\n#ifdef HOVERLIGHT\nfloat pointToHover=(1.0-clamp(length(hoverPosition-worldPosition)/hoverRadius,0.,1.))*hoverColor.a;\nalbedo=clamp(albedo+hoverColor.rgb*pointToHover,0.,1.);\n#else\nfloat pointToHover=1.0;\n#endif\n#ifdef BORDER \nfloat borderPower=10.0;\nfloat inverseBorderPower=1.0/borderPower;\nvec3 borderColor=albedo*borderPower;\nvec2 distanceToEdge;\ndistanceToEdge.x=abs(vUV.x-0.5)*2.0;\ndistanceToEdge.y=abs(vUV.y-0.5)*2.0;\nfloat borderValue=max(smoothstep(scaleInfo.x-edgeSmoothingValue,scaleInfo.x+edgeSmoothingValue,distanceToEdge.x),\nsmoothstep(scaleInfo.y-edgeSmoothingValue,scaleInfo.y+edgeSmoothingValue,distanceToEdge.y));\nborderColor=borderColor*borderValue*max(borderMinValue*inverseBorderPower,pointToHover); \nalbedo+=borderColor;\nalpha=max(alpha,borderValue);\n#endif\n#ifdef INNERGLOW\n\nvec2 uvGlow=(vUV-vec2(0.5,0.5))*(innerGlowColor.a*2.0);\nuvGlow=uvGlow*uvGlow;\nuvGlow=uvGlow*uvGlow;\nalbedo+=mix(vec3(0.0,0.0,0.0),innerGlowColor.rgb,uvGlow.x+uvGlow.y); \n#endif\ngl_FragColor=vec4(albedo,alpha);\n}"},function(t,e){t.exports="precision highp float;\n\nattribute vec3 position;\nattribute vec3 normal;\nattribute vec2 uv;\n\nuniform mat4 world;\nuniform mat4 viewProjection;\nvarying vec2 vUV;\n#ifdef BORDER\nvarying vec2 scaleInfo;\nuniform float borderWidth;\nuniform vec3 scaleFactor;\n#endif\n#ifdef HOVERLIGHT\nvarying vec3 worldPosition;\n#endif\nvoid main(void) {\nvUV=uv;\n#ifdef BORDER\nvec3 scale=scaleFactor;\nfloat minScale=min(min(scale.x,scale.y),scale.z);\nfloat maxScale=max(max(scale.x,scale.y),scale.z);\nfloat minOverMiddleScale=minScale/(scale.x+scale.y+scale.z-minScale-maxScale);\nfloat areaYZ=scale.y*scale.z;\nfloat areaXZ=scale.x*scale.z;\nfloat areaXY=scale.x*scale.y;\nfloat scaledBorderWidth=borderWidth; \nif (abs(normal.x) == 1.0) \n{\nscale.x=scale.y;\nscale.y=scale.z;\nif (areaYZ>areaXZ && areaYZ>areaXY)\n{\nscaledBorderWidth*=minOverMiddleScale;\n}\n}\nelse if (abs(normal.y) == 1.0) \n{\nscale.x=scale.z;\nif (areaXZ>areaXY && areaXZ>areaYZ)\n{\nscaledBorderWidth*=minOverMiddleScale;\n}\n}\nelse \n{\nif (areaXY>areaYZ && areaXY>areaXZ)\n{\nscaledBorderWidth*=minOverMiddleScale;\n}\n}\nfloat scaleRatio=min(scale.x,scale.y)/max(scale.x,scale.y);\nif (scale.x>scale.y)\n{\nscaleInfo.x=1.0-(scaledBorderWidth*scaleRatio);\nscaleInfo.y=1.0-scaledBorderWidth;\n}\nelse\n{\nscaleInfo.x=1.0-scaledBorderWidth;\nscaleInfo.y=1.0-(scaledBorderWidth*scaleRatio);\n} \n#endif \nvec4 worldPos=world*vec4(position,1.0);\n#ifdef HOVERLIGHT\nworldPosition=worldPos.xyz;\n#endif\ngl_Position=viewProjection*worldPos;\n}\n"},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=function(t){function e(e,i){var r=t.call(this,i)||this;return r._currentMesh=e,r.pointerEnterAnimation=function(){r.mesh&&r.mesh.scaling.scaleInPlace(1.1)},r.pointerOutAnimation=function(){r.mesh&&r.mesh.scaling.scaleInPlace(1/1.1)},r.pointerDownAnimation=function(){r.mesh&&r.mesh.scaling.scaleInPlace(.95)},r.pointerUpAnimation=function(){r.mesh&&r.mesh.scaling.scaleInPlace(1/.95)},r}return r(e,t),e.prototype._getTypeName=function(){return"MeshButton3D"},e.prototype._createNode=function(t){var e=this;return this._currentMesh.getChildMeshes().forEach(function(t){t.metadata=e}),this._currentMesh},e.prototype._affectMaterial=function(t){},e}(i(14).Button3D);e.MeshButton3D=o},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(0),n=i(3),s=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return r(e,t),e.prototype._mapGridNode=function(t,e){var i=t.mesh;if(i){t.position=e.clone();var r=o.Tmp.Vector3[0];switch(r.copyFrom(e),this.orientation){case n.Container3D.FACEORIGIN_ORIENTATION:case n.Container3D.FACEFORWARD_ORIENTATION:r.addInPlace(new BABYLON.Vector3(0,0,-1)),i.lookAt(r);break;case n.Container3D.FACEFORWARDREVERSED_ORIENTATION:case n.Container3D.FACEORIGINREVERSED_ORIENTATION:r.addInPlace(new BABYLON.Vector3(0,0,1)),i.lookAt(r)}}},e}(i(8).VolumeBasedPanel);e.PlanePanel=s},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(8),n=i(0),s=i(3),a=function(t){function e(){var e=null!==t&&t.apply(this,arguments)||this;return e._iteration=100,e}return r(e,t),Object.defineProperty(e.prototype,"iteration",{get:function(){return this._iteration},set:function(t){var e=this;this._iteration!==t&&(this._iteration=t,n.Tools.SetImmediate(function(){e._arrangeChildren()}))},enumerable:!0,configurable:!0}),e.prototype._mapGridNode=function(t,e){var i=t.mesh,r=this._scatterMapping(e);if(i){switch(this.orientation){case s.Container3D.FACEORIGIN_ORIENTATION:case s.Container3D.FACEFORWARD_ORIENTATION:i.lookAt(new n.Vector3(0,0,-1));break;case s.Container3D.FACEFORWARDREVERSED_ORIENTATION:case s.Container3D.FACEORIGINREVERSED_ORIENTATION:i.lookAt(new n.Vector3(0,0,1))}t.position=r}},e.prototype._scatterMapping=function(t){return t.x=(1-2*Math.random())*this._cellWidth,t.y=(1-2*Math.random())*this._cellHeight,t},e.prototype._finalProcessing=function(){for(var t=[],e=0,i=this._children;e<i.length;e++){var r=i[e];r.mesh&&t.push(r.mesh)}for(var o=0;o<this._iteration;o++){t.sort(function(t,e){var i=t.position.lengthSquared(),r=e.position.lengthSquared();return i<r?1:i>r?-1:0});for(var s=Math.pow(this.margin,2),a=Math.max(this._cellWidth,this._cellHeight),h=n.Tmp.Vector2[0],l=n.Tmp.Vector3[0],u=0;u<t.length-1;u++)for(var c=u+1;c<t.length;c++)if(u!=c){t[c].position.subtractToRef(t[u].position,l),h.x=l.x,h.y=l.y;var _=a,f=h.lengthSquared()-s;(f-=Math.min(f,s))<Math.pow(_,2)&&(h.normalize(),l.scaleInPlace(.5*(_-Math.sqrt(f))),t[c].position.addInPlace(l),t[u].position.subtractInPlace(l))}}},e}(o.VolumeBasedPanel);e.ScatterPanel=a},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(8),n=i(0),s=i(3),a=function(t){function e(){var e=null!==t&&t.apply(this,arguments)||this;return e._radius=5,e}return r(e,t),Object.defineProperty(e.prototype,"radius",{get:function(){return this._radius},set:function(t){var e=this;this._radius!==t&&(this._radius=t,n.Tools.SetImmediate(function(){e._arrangeChildren()}))},enumerable:!0,configurable:!0}),e.prototype._mapGridNode=function(t,e){var i=t.mesh;if(i){var r=this._sphericalMapping(e);switch(t.position=r,this.orientation){case s.Container3D.FACEORIGIN_ORIENTATION:i.lookAt(new BABYLON.Vector3(-r.x,-r.y,-r.z));break;case s.Container3D.FACEORIGINREVERSED_ORIENTATION:i.lookAt(new BABYLON.Vector3(2*r.x,2*r.y,2*r.z));break;case s.Container3D.FACEFORWARD_ORIENTATION:break;case s.Container3D.FACEFORWARDREVERSED_ORIENTATION:i.rotate(BABYLON.Axis.Y,Math.PI,BABYLON.Space.LOCAL)}}},e.prototype._sphericalMapping=function(t){var e=new n.Vector3(0,0,this._radius),i=t.y/this._radius,r=-t.x/this._radius;return n.Matrix.RotationYawPitchRollToRef(r,i,0,n.Tmp.Matrix[0]),n.Vector3.TransformNormal(e,n.Tmp.Matrix[0])},e}(o.VolumeBasedPanel);e.SpherePanel=a},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(3),n=i(0),s=function(t){function e(e){void 0===e&&(e=!1);var i=t.call(this)||this;return i._isVertical=!1,i.margin=.1,i._isVertical=e,i}return r(e,t),Object.defineProperty(e.prototype,"isVertical",{get:function(){return this._isVertical},set:function(t){var e=this;this._isVertical!==t&&(this._isVertical=t,n.Tools.SetImmediate(function(){e._arrangeChildren()}))},enumerable:!0,configurable:!0}),e.prototype._arrangeChildren=function(){for(var t,e=0,i=0,r=0,o=[],s=n.Matrix.Invert(this.node.computeWorldMatrix(!0)),a=0,h=this._children;a<h.length;a++){if((p=h[a]).mesh){r++,p.mesh.computeWorldMatrix(!0),p.mesh.getWorldMatrix().multiplyToRef(s,n.Tmp.Matrix[0]);var l=p.mesh.getBoundingInfo().boundingBox,u=n.Vector3.TransformNormal(l.extendSize,n.Tmp.Matrix[0]);o.push(u),this._isVertical?i+=u.y:e+=u.x}}this._isVertical?i+=(r-1)*this.margin/2:e+=(r-1)*this.margin/2,t=this._isVertical?-i:-e;for(var c=0,_=0,f=this._children;_<f.length;_++){var p;if((p=f[_]).mesh){r--;u=o[c++];this._isVertical?(p.position.y=t+u.y,p.position.x=0,t+=2*u.y):(p.position.x=t+u.x,p.position.y=0,t+=2*u.x),t+=r>0?this.margin:0}}},e}(o.Container3D);e.StackPanel3D=s},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),function(t){for(var i in t)e.hasOwnProperty(i)||(e[i]=t[i])}(i(26))},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=i(0),o=i(3),n=function(){function t(t){var e=this;this._lastControlOver={},this._lastControlDown={},this.onPickedPointChangedObservable=new r.Observable,this._sharedMaterials={},this._scene=t||r.Engine.LastCreatedScene,this._sceneDisposeObserver=this._scene.onDisposeObservable.add(function(){e._sceneDisposeObserver=null,e._utilityLayer=null,e.dispose()}),this._utilityLayer=new r.UtilityLayerRenderer(this._scene),this._utilityLayer.onlyCheckPointerDownEvents=!1,this._utilityLayer.mainSceneTrackerPredicate=function(t){return t&&t.metadata&&t.metadata._node},this._rootContainer=new o.Container3D("RootContainer"),this._rootContainer._host=this;var i=this._utilityLayer.utilityLayerScene;this._pointerOutObserver=this._utilityLayer.onPointerOutObservable.add(function(t){e._handlePointerOut(t,!0)}),this._pointerObserver=i.onPointerObservable.add(function(t,i){e._doPicking(t)}),this._utilityLayer.utilityLayerScene.autoClear=!1,this._utilityLayer.utilityLayerScene.autoClearDepthAndStencil=!1,new r.HemisphericLight("hemi",r.Vector3.Up(),this._utilityLayer.utilityLayerScene)}return Object.defineProperty(t.prototype,"scene",{get:function(){return this._scene},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"utilityLayer",{get:function(){return this._utilityLayer},enumerable:!0,configurable:!0}),t.prototype._handlePointerOut=function(t,e){var i=this._lastControlOver[t];i&&(i._onPointerOut(i),delete this._lastControlOver[t]),e&&this._lastControlDown[t]&&(this._lastControlDown[t].forcePointerUp(),delete this._lastControlDown[t]),this.onPickedPointChangedObservable.notifyObservers(null)},t.prototype._doPicking=function(t){if(!this._utilityLayer||!this._utilityLayer.utilityLayerScene.activeCamera)return!1;var e=t.event,i=e.pointerId||0,o=e.button,n=t.pickInfo;if(!n||!n.hit)return this._handlePointerOut(i,t.type===r.PointerEventTypes.POINTERUP),!1;var s=n.pickedMesh.metadata;return n.pickedPoint&&this.onPickedPointChangedObservable.notifyObservers(n.pickedPoint),s._processObservables(t.type,n.pickedPoint,i,o)||t.type===r.PointerEventTypes.POINTERMOVE&&(this._lastControlOver[i]&&this._lastControlOver[i]._onPointerOut(this._lastControlOver[i]),delete this._lastControlOver[i]),t.type===r.PointerEventTypes.POINTERUP&&(this._lastControlDown[e.pointerId]&&(this._lastControlDown[e.pointerId].forcePointerUp(),delete this._lastControlDown[e.pointerId]),"touch"===e.pointerType&&this._handlePointerOut(i,!1)),!0},Object.defineProperty(t.prototype,"rootContainer",{get:function(){return this._rootContainer},enumerable:!0,configurable:!0}),t.prototype.containsControl=function(t){return this._rootContainer.containsControl(t)},t.prototype.addControl=function(t){return this._rootContainer.addControl(t),this},t.prototype.removeControl=function(t){return this._rootContainer.removeControl(t),this},t.prototype.dispose=function(){for(var t in this._rootContainer.dispose(),this._sharedMaterials)this._sharedMaterials.hasOwnProperty(t)&&this._sharedMaterials[t].dispose();this._sharedMaterials={},this._pointerOutObserver&&this._utilityLayer&&(this._utilityLayer.onPointerOutObservable.remove(this._pointerOutObserver),this._pointerOutObserver=null),this.onPickedPointChangedObservable.clear();var e=this._utilityLayer?this._utilityLayer.utilityLayerScene:null;e&&this._pointerObserver&&(e.onPointerObservable.remove(this._pointerObserver),this._pointerObserver=null),this._scene&&this._sceneDisposeObserver&&(this._scene.onDisposeObservable.remove(this._sceneDisposeObserver),this._sceneDisposeObserver=null),this._utilityLayer&&this._utilityLayer.dispose()},t}();e.GUI3DManager=n}])});
//# sourceMappingURL=babylon.gui.min.js.map

!(function(i){var e,t,n,r,o;(t=e=i.GLTFLoaderCoordinateSystemMode||(i.GLTFLoaderCoordinateSystemMode={}))[t.AUTO=0]="AUTO",t[t.FORCE_RIGHT_HANDED=1]="FORCE_RIGHT_HANDED",(r=n=i.GLTFLoaderAnimationStartMode||(i.GLTFLoaderAnimationStartMode={}))[r.NONE=0]="NONE",r[r.FIRST=1]="FIRST",r[r.ALL=2]="ALL",(o=i.GLTFLoaderState||(i.GLTFLoaderState={}))[o.LOADING=0]="LOADING",o[o.READY=1]="READY",o[o.COMPLETE=2]="COMPLETE";var a=(function(){function l(){this.onParsedObservable=new i.Observable,this.coordinateSystemMode=e.AUTO,this.animationStartMode=n.FIRST,this.compileMaterials=!1,this.useClipPlane=!1,this.compileShadowGenerators=!1,this.transparencyAsCoverage=!1,this.preprocessUrlAsync=function(e){return Promise.resolve(e)},this.onMeshLoadedObservable=new i.Observable,this.onTextureLoadedObservable=new i.Observable,this.onMaterialLoadedObservable=new i.Observable,this.onCameraLoadedObservable=new i.Observable,this.onCompleteObservable=new i.Observable,this.onErrorObservable=new i.Observable,this.onDisposeObservable=new i.Observable,this.onExtensionLoadedObservable=new i.Observable,this.validate=!1,this.onValidatedObservable=new i.Observable,this._loader=null,this.name="gltf",this.extensions={".gltf":{isBinary:!1},".glb":{isBinary:!0}},this._logIndentLevel=0,this._loggingEnabled=!1,this._log=this._logDisabled,this._capturePerformanceCounters=!1,this._startPerformanceCounter=this._startPerformanceCounterDisabled,this._endPerformanceCounter=this._endPerformanceCounterDisabled}return Object.defineProperty(l.prototype,"onParsed",{set:function(e){this._onParsedObserver&&this.onParsedObservable.remove(this._onParsedObserver),this._onParsedObserver=this.onParsedObservable.add(e)},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"onMeshLoaded",{set:function(e){this._onMeshLoadedObserver&&this.onMeshLoadedObservable.remove(this._onMeshLoadedObserver),this._onMeshLoadedObserver=this.onMeshLoadedObservable.add(e)},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"onTextureLoaded",{set:function(e){this._onTextureLoadedObserver&&this.onTextureLoadedObservable.remove(this._onTextureLoadedObserver),this._onTextureLoadedObserver=this.onTextureLoadedObservable.add(e)},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"onMaterialLoaded",{set:function(e){this._onMaterialLoadedObserver&&this.onMaterialLoadedObservable.remove(this._onMaterialLoadedObserver),this._onMaterialLoadedObserver=this.onMaterialLoadedObservable.add(e)},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"onCameraLoaded",{set:function(e){this._onCameraLoadedObserver&&this.onCameraLoadedObservable.remove(this._onCameraLoadedObserver),this._onCameraLoadedObserver=this.onCameraLoadedObservable.add(e)},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"onComplete",{set:function(e){this._onCompleteObserver&&this.onCompleteObservable.remove(this._onCompleteObserver),this._onCompleteObserver=this.onCompleteObservable.add(e)},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"onError",{set:function(e){this._onErrorObserver&&this.onErrorObservable.remove(this._onErrorObserver),this._onErrorObserver=this.onErrorObservable.add(e)},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"onDispose",{set:function(e){this._onDisposeObserver&&this.onDisposeObservable.remove(this._onDisposeObserver),this._onDisposeObserver=this.onDisposeObservable.add(e)},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"onExtensionLoaded",{set:function(e){this._onExtensionLoadedObserver&&this.onExtensionLoadedObservable.remove(this._onExtensionLoadedObserver),this._onExtensionLoadedObserver=this.onExtensionLoadedObservable.add(e)},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"loggingEnabled",{get:function(){return this._loggingEnabled},set:function(e){this._loggingEnabled!==e&&(this._loggingEnabled=e,this._loggingEnabled?this._log=this._logEnabled:this._log=this._logDisabled)},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"capturePerformanceCounters",{get:function(){return this._capturePerformanceCounters},set:function(e){this._capturePerformanceCounters!==e&&(this._capturePerformanceCounters=e,this._capturePerformanceCounters?(this._startPerformanceCounter=this._startPerformanceCounterEnabled,this._endPerformanceCounter=this._endPerformanceCounterEnabled):(this._startPerformanceCounter=this._startPerformanceCounterDisabled,this._endPerformanceCounter=this._endPerformanceCounterDisabled))},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"onValidated",{set:function(e){this._onValidatedObserver&&this.onValidatedObservable.remove(this._onValidatedObserver),this._onValidatedObserver=this.onValidatedObservable.add(e)},enumerable:!0,configurable:!0}),l.prototype.dispose=function(){this._loader&&(this._loader.dispose(),this._loader=null),this._clear(),this.onDisposeObservable.notifyObservers(void 0),this.onDisposeObservable.clear()},l.prototype._clear=function(){this.preprocessUrlAsync=function(e){return Promise.resolve(e)},this.onMeshLoadedObservable.clear(),this.onTextureLoadedObservable.clear(),this.onMaterialLoadedObservable.clear(),this.onCameraLoadedObservable.clear(),this.onCompleteObservable.clear(),this.onExtensionLoadedObservable.clear()},l.prototype.importMeshAsync=function(t,n,e,r,o,a){var i=this;return this._parseAsync(n,e,r,a).then((function(e){return i._log("Loading "+(a||"")),i._loader=i._getLoader(e),i._loader.importMeshAsync(t,n,e,r,o,a)}))},l.prototype.loadAsync=function(t,e,n,r,o){var a=this;return this._parseAsync(t,e,n,o).then((function(e){return a._log("Loading "+(o||"")),a._loader=a._getLoader(e),a._loader.loadAsync(t,e,n,r,o)}))},l.prototype.loadAssetContainerAsync=function(n,e,t,r,o){var a=this;return this._parseAsync(n,e,t,o).then((function(e){return a._log("Loading "+(o||"")),a._loader=a._getLoader(e),a._loader.importMeshAsync(null,n,e,t,r,o).then((function(e){var t=new i.AssetContainer(n);return Array.prototype.push.apply(t.meshes,e.meshes),Array.prototype.push.apply(t.particleSystems,e.particleSystems),Array.prototype.push.apply(t.skeletons,e.skeletons),Array.prototype.push.apply(t.animationGroups,e.animationGroups),t.removeAllFromScene(),t}))}))},l.prototype.canDirectLoad=function(e){return-1!==e.indexOf("scene")&&-1!==e.indexOf("node")},l.prototype.createPlugin=function(){return new l},Object.defineProperty(l.prototype,"loaderState",{get:function(){return this._loader?this._loader.state:null},enumerable:!0,configurable:!0}),l.prototype.whenCompleteAsync=function(){var n=this;return new Promise(function(e,t){n.onCompleteObservable.addOnce((function(){e()})),n.onErrorObservable.addOnce((function(e){t(e)}))})},l.prototype._parseAsync=function(e,n,r,o){var a=this;return Promise.resolve().then((function(){var t=n instanceof ArrayBuffer?a._unpackBinary(n):{json:n,bin:null};return a._validateAsync(e,t.json,r,o).then((function(){a._startPerformanceCounter("Parse JSON"),a._log("JSON length: "+t.json.length);var e={json:JSON.parse(t.json),bin:t.bin};return a._endPerformanceCounter("Parse JSON"),a.onParsedObservable.notifyObservers(e),a.onParsedObservable.clear(),e}))}))},l.prototype._validateAsync=function(t,e,n,r){var o=this;if(!this.validate||"undefined"==typeof GLTFValidator)return Promise.resolve();this._startPerformanceCounter("Validate JSON");var a={externalResourceFunction:function(e){return o.preprocessUrlAsync(n+e).then((function(e){return t._loadFileAsync(e,!0,!0)})).then((function(e){return new Uint8Array(e)}))}};return r&&"data:"!==r.substr(0,5)&&(a.uri="file:"===n?r:""+n+r),GLTFValidator.validateString(e,a).then((function(e){o._endPerformanceCounter("Validate JSON"),o.onValidatedObservable.notifyObservers(e),o.onValidatedObservable.clear()}))},l.prototype._getLoader=function(e){var t=e.json.asset||{};this._log("Asset version: "+t.version),t.minVersion&&this._log("Asset minimum version: "+t.minVersion),t.generator&&this._log("Asset generator: "+t.generator);var n=l._parseVersion(t.version);if(!n)throw new Error("Invalid version: "+t.version);if(void 0!==t.minVersion){var r=l._parseVersion(t.minVersion);if(!r)throw new Error("Invalid minimum version: "+t.minVersion);if(0<l._compareVersion(r,{major:2,minor:0}))throw new Error("Incompatible minimum version: "+t.minVersion)}var o={1:l._CreateGLTFLoaderV1,2:l._CreateGLTFLoaderV2}[n.major];if(!o)throw new Error("Unsupported version: "+t.version);return o(this)},l.prototype._unpackBinary=function(e){this._startPerformanceCounter("Unpack binary"),this._log("Binary length: "+e.byteLength);var t=new s(e),n=t.readUint32();if(1179937895!==n)throw new Error("Unexpected magic: "+n);var r,o=t.readUint32();switch(this.loggingEnabled&&this._log("Binary version: "+o),o){case 1:r=this._unpackBinaryV1(t);break;case 2:r=this._unpackBinaryV2(t);break;default:throw new Error("Unsupported version: "+o)}return this._endPerformanceCounter("Unpack binary"),r},l.prototype._unpackBinaryV1=function(e){var t=e.readUint32();if(t!=e.getLength())throw new Error("Length in header does not match actual data length: "+t+" != "+e.getLength());var n,r=e.readUint32(),o=e.readUint32();switch(o){case 0:n=l._decodeBufferToText(e.readUint8Array(r));break;default:throw new Error("Unexpected content format: "+o)}var a=e.getLength()-e.getPosition();return{json:n,bin:e.readUint8Array(a)}},l.prototype._unpackBinaryV2=function(e){var t=1313821514,n=5130562,r=e.readUint32();if(r!==e.getLength())throw new Error("Length in header does not match actual data length: "+r+" != "+e.getLength());var o=e.readUint32();if(e.readUint32()!==t)throw new Error("First chunk format is not JSON");for(var a=l._decodeBufferToText(e.readUint8Array(o)),i=null;e.getPosition()<e.getLength();){var s=e.readUint32();switch(e.readUint32()){case t:throw new Error("Unexpected JSON chunk");case n:i=e.readUint8Array(s);break;default:e.skipBytes(s)}}return{json:a,bin:i}},l._parseVersion=function(e){if("1.0"===e||"1.0.1"===e)return{major:1,minor:0};var t=(e+"").match(/^(\d+)\.(\d+)/);return t?{major:parseInt(t[1]),minor:parseInt(t[2])}:null},l._compareVersion=function(e,t){return e.major>t.major?1:e.major<t.major?-1:e.minor>t.minor?1:e.minor<t.minor?-1:0},l._decodeBufferToText=function(e){for(var t="",n=e.byteLength,r=0;r<n;r++)t+=String.fromCharCode(e[r]);return t},l.prototype._logOpen=function(e){this._log(e),this._logIndentLevel++},l.prototype._logClose=function(){--this._logIndentLevel},l.prototype._logEnabled=function(e){var t=l._logSpaces.substr(0,2*this._logIndentLevel);i.Tools.Log(""+t+e)},l.prototype._logDisabled=function(e){},l.prototype._startPerformanceCounterEnabled=function(e){i.Tools.StartPerformanceCounter(e)},l.prototype._startPerformanceCounterDisabled=function(e){},l.prototype._endPerformanceCounterEnabled=function(e){i.Tools.EndPerformanceCounter(e)},l.prototype._endPerformanceCounterDisabled=function(e){},l.IncrementalLoading=!0,l.HomogeneousCoordinates=!1,l._logSpaces="                                ",l})();i.GLTFFileLoader=a;var s=(function(){function e(e){this._arrayBuffer=e,this._dataView=new DataView(e),this._byteOffset=0}return e.prototype.getPosition=function(){return this._byteOffset},e.prototype.getLength=function(){return this._arrayBuffer.byteLength},e.prototype.readUint32=function(){var e=this._dataView.getUint32(this._byteOffset,!0);return this._byteOffset+=4,e},e.prototype.readUint8Array=function(e){var t=new Uint8Array(this._arrayBuffer,this._byteOffset,e);return this._byteOffset+=e,t},e.prototype.skipBytes=function(e){this._byteOffset+=e},e})();i.SceneLoader&&i.SceneLoader.RegisterPlugin(new a)})(BABYLON||(BABYLON={})),(function(e){var t,n,r,o,a,i,s,l,u;t=e.GLTF1||(e.GLTF1={}),(n=t.EComponentType||(t.EComponentType={}))[n.BYTE=5120]="BYTE",n[n.UNSIGNED_BYTE=5121]="UNSIGNED_BYTE",n[n.SHORT=5122]="SHORT",n[n.UNSIGNED_SHORT=5123]="UNSIGNED_SHORT",n[n.FLOAT=5126]="FLOAT",(r=t.EShaderType||(t.EShaderType={}))[r.FRAGMENT=35632]="FRAGMENT",r[r.VERTEX=35633]="VERTEX",(o=t.EParameterType||(t.EParameterType={}))[o.BYTE=5120]="BYTE",o[o.UNSIGNED_BYTE=5121]="UNSIGNED_BYTE",o[o.SHORT=5122]="SHORT",o[o.UNSIGNED_SHORT=5123]="UNSIGNED_SHORT",o[o.INT=5124]="INT",o[o.UNSIGNED_INT=5125]="UNSIGNED_INT",o[o.FLOAT=5126]="FLOAT",o[o.FLOAT_VEC2=35664]="FLOAT_VEC2",o[o.FLOAT_VEC3=35665]="FLOAT_VEC3",o[o.FLOAT_VEC4=35666]="FLOAT_VEC4",o[o.INT_VEC2=35667]="INT_VEC2",o[o.INT_VEC3=35668]="INT_VEC3",o[o.INT_VEC4=35669]="INT_VEC4",o[o.BOOL=35670]="BOOL",o[o.BOOL_VEC2=35671]="BOOL_VEC2",o[o.BOOL_VEC3=35672]="BOOL_VEC3",o[o.BOOL_VEC4=35673]="BOOL_VEC4",o[o.FLOAT_MAT2=35674]="FLOAT_MAT2",o[o.FLOAT_MAT3=35675]="FLOAT_MAT3",o[o.FLOAT_MAT4=35676]="FLOAT_MAT4",o[o.SAMPLER_2D=35678]="SAMPLER_2D",(a=t.ETextureWrapMode||(t.ETextureWrapMode={}))[a.CLAMP_TO_EDGE=33071]="CLAMP_TO_EDGE",a[a.MIRRORED_REPEAT=33648]="MIRRORED_REPEAT",a[a.REPEAT=10497]="REPEAT",(i=t.ETextureFilterType||(t.ETextureFilterType={}))[i.NEAREST=9728]="NEAREST",i[i.LINEAR=9728]="LINEAR",i[i.NEAREST_MIPMAP_NEAREST=9984]="NEAREST_MIPMAP_NEAREST",i[i.LINEAR_MIPMAP_NEAREST=9985]="LINEAR_MIPMAP_NEAREST",i[i.NEAREST_MIPMAP_LINEAR=9986]="NEAREST_MIPMAP_LINEAR",i[i.LINEAR_MIPMAP_LINEAR=9987]="LINEAR_MIPMAP_LINEAR",(s=t.ETextureFormat||(t.ETextureFormat={}))[s.ALPHA=6406]="ALPHA",s[s.RGB=6407]="RGB",s[s.RGBA=6408]="RGBA",s[s.LUMINANCE=6409]="LUMINANCE",s[s.LUMINANCE_ALPHA=6410]="LUMINANCE_ALPHA",(l=t.ECullingType||(t.ECullingType={}))[l.FRONT=1028]="FRONT",l[l.BACK=1029]="BACK",l[l.FRONT_AND_BACK=1032]="FRONT_AND_BACK",(u=t.EBlendingFunction||(t.EBlendingFunction={}))[u.ZERO=0]="ZERO",u[u.ONE=1]="ONE",u[u.SRC_COLOR=768]="SRC_COLOR",u[u.ONE_MINUS_SRC_COLOR=769]="ONE_MINUS_SRC_COLOR",u[u.DST_COLOR=774]="DST_COLOR",u[u.ONE_MINUS_DST_COLOR=775]="ONE_MINUS_DST_COLOR",u[u.SRC_ALPHA=770]="SRC_ALPHA",u[u.ONE_MINUS_SRC_ALPHA=771]="ONE_MINUS_SRC_ALPHA",u[u.DST_ALPHA=772]="DST_ALPHA",u[u.ONE_MINUS_DST_ALPHA=773]="ONE_MINUS_DST_ALPHA",u[u.CONSTANT_COLOR=32769]="CONSTANT_COLOR",u[u.ONE_MINUS_CONSTANT_COLOR=32770]="ONE_MINUS_CONSTANT_COLOR",u[u.CONSTANT_ALPHA=32771]="CONSTANT_ALPHA",u[u.ONE_MINUS_CONSTANT_ALPHA=32772]="ONE_MINUS_CONSTANT_ALPHA",u[u.SRC_ALPHA_SATURATE=776]="SRC_ALPHA_SATURATE"})(BABYLON||(BABYLON={})),(function(W){!(function(B){var D,e;(e=D||(D={}))[e.IDENTIFIER=1]="IDENTIFIER",e[e.UNKNOWN=2]="UNKNOWN",e[e.END_OF_INPUT=3]="END_OF_INPUT";var G=(function(){function e(e){this._pos=0,this.currentToken=D.UNKNOWN,this.currentIdentifier="",this.currentString="",this.isLetterOrDigitPattern=/^[a-zA-Z0-9]+$/,this._toParse=e,this._maxPos=e.length}return e.prototype.getNextToken=function(){if(this.isEnd())return D.END_OF_INPUT;if(this.currentString=this.read(),this.currentToken=D.UNKNOWN,"_"===this.currentString||this.isLetterOrDigitPattern.test(this.currentString))for(this.currentToken=D.IDENTIFIER,this.currentIdentifier=this.currentString;!this.isEnd()&&(this.isLetterOrDigitPattern.test(this.currentString=this.peek())||"_"===this.currentString);)this.currentIdentifier+=this.currentString,this.forward();return this.currentToken},e.prototype.peek=function(){return this._toParse[this._pos]},e.prototype.read=function(){return this._toParse[this._pos++]},e.prototype.forward=function(){this._pos++},e.prototype.isEnd=function(){return this._pos>=this._maxPos},e})(),V=["MODEL","VIEW","PROJECTION","MODELVIEW","MODELVIEWPROJECTION","JOINTMATRIX"],U=["world","view","projection","worldView","worldViewProjection","mBones"],w=["translation","rotation","scale"],S=["position","rotationQuaternion","scaling"],o=function(e,t,n){for(var r in e){var o=e[r];n[t][r]=o}},N=function(e){if(e)for(var t=0;t<e.length/2;t++)e[2*t+1]=1-e[2*t+1]},k=function(e){if("NORMAL"===e.semantic)return"normal";if("POSITION"===e.semantic)return"position";if("JOINT"===e.semantic)return"matricesIndices";if("WEIGHT"===e.semantic)return"matricesWeights";if("COLOR"===e.semantic)return"color";if(e.semantic&&-1!==e.semantic.indexOf("TEXCOORD_")){var t=Number(e.semantic.split("_")[1]);return"uv"+(0===t?"":t+1)}return null},v=function(e){var t=null;if(e.translation||e.rotation||e.scale){var n=W.Vector3.FromArray(e.scale||[1,1,1]),r=W.Quaternion.FromArray(e.rotation||[0,0,0,1]),o=W.Vector3.FromArray(e.translation||[0,0,0]);t=W.Matrix.Compose(n,r,o)}else t=W.Matrix.FromArray(e.matrix);return t},b=function(e,t,n,r){for(var o=0;o<r.bones.length;o++)if(r.bones[o].name===n)return r.bones[o];var a=e.nodes;for(var i in a){var s=a[i];if(s.jointName){var l=s.children;for(o=0;o<l.length;o++){var u=e.nodes[l[o]];if(u.jointName&&u.jointName===n){var c=v(s),d=new W.Bone(s.name||"",r,b(e,t,s.jointName,r),c);return d.id=i,d}}}}return null},T=function(e,t){for(var n=0;n<e.length;n++)for(var r=e[n],o=0;o<r.node.children.length;o++){if(r.node.children[o]===t)return r.bone}return null},L=function(e,t){var n=e.nodes,r=n[t];if(r)return{node:r,id:t};for(var o in n)if((r=n[o]).jointName===t)return{node:r,id:o};return null},E=function(e,t){for(var n=0;n<e.jointNames.length;n++)if(e.jointNames[n]===t)return!0;return!1},x=function(e,t,n,r,o){if(r||(r=new W.Skeleton(t.name||"","",e.scene)),!t.babylonSkeleton)return r;var a=[],i=[];!(function(e,t,n,r){for(var o in e.nodes){var a=e.nodes[o],i=o;if(a.jointName&&!E(n,a.jointName)){var s=v(a),l=new W.Bone(a.name||"",t,null,s);l.id=i,r.push({bone:l,node:a,id:i})}}for(var u=0;u<r.length;u++)for(var c=r[u],d=c.node.children,f=0;f<d.length;f++){for(var h=null,p=0;p<r.length;p++)if(r[p].id===d[f]){h=r[p];break}h&&(h.bone._parent=c.bone,c.bone.children.push(h.bone))}})(e,r,t,a),r.bones=[];for(var s=0;s<t.jointNames.length;s++){if(g=L(e,t.jointNames[s])){var l=g.node;if(l){o=g.id;var u=e.scene.getBoneByID(o);if(u)r.bones.push(u);else{for(var c=!1,d=null,f=0;f<s;f++){var h=L(e,t.jointNames[f]);if(h){var p=h.node;if(p){var m=p.children;if(m){c=!1;for(var _=0;_<m.length;_++)if(m[_]===o){d=b(e,t,t.jointNames[f],r),c=!0;break}if(c)break}}else W.Tools.Warn("Joint named "+t.jointNames[f]+" does not exist when looking for parent")}}var y=v(l);!d&&0<a.length&&(d=T(a,o))&&-1===i.indexOf(d)&&i.push(d),new W.Bone(l.jointName||"",r,d,y).id=o}}else W.Tools.Warn("Joint named "+t.jointNames[s]+" does not exist")}}var A=r.bones;r.bones=[];for(s=0;s<t.jointNames.length;s++){var g;if(g=L(e,t.jointNames[s]))for(f=0;f<A.length;f++)if(A[f].id===g.id){r.bones.push(A[f]);break}}r.prepare();for(s=0;s<i.length;s++)r.bones.push(i[s]);return r},O=function(e,t,n,r,o){if(o||((o=new W.Mesh(t.name||"",e.scene)).id=r),!t.babylonNode)return o;for(var a,i=[],s=null,l=new Array,u=new Array,c=new Array,d=new Array,f=0;f<n.length;f++){var h=n[f];if(w=e.meshes[h])for(var p=0;p<w.primitives.length;p++){var m=new W.VertexData,_=w.primitives[p];_.mode;var y=_.attributes,A=null,g=null;for(var v in y)if(A=e.accessors[y[v]],g=B.GLTFUtils.GetBufferFromAccessor(e,A),"NORMAL"===v)m.normals=new Float32Array(g.length),m.normals.set(g);else if("POSITION"===v){if(W.GLTFFileLoader.HomogeneousCoordinates){m.positions=new Float32Array(g.length-g.length/4);for(var b=0;b<g.length;b+=4)m.positions[b]=g[b],m.positions[b+1]=g[b+1],m.positions[b+2]=g[b+2]}else m.positions=new Float32Array(g.length),m.positions.set(g);u.push(m.positions.length)}else if(-1!==v.indexOf("TEXCOORD_")){var T=Number(v.split("_")[1]),L=W.VertexBuffer.UVKind+(0===T?"":T+1),E=new Float32Array(g.length);E.set(g),N(E),m.set(E,L)}else"JOINT"===v?(m.matricesIndices=new Float32Array(g.length),m.matricesIndices.set(g)):"WEIGHT"===v?(m.matricesWeights=new Float32Array(g.length),m.matricesWeights.set(g)):"COLOR"===v&&(m.colors=new Float32Array(g.length),m.colors.set(g));if(A=e.accessors[_.indices])g=B.GLTFUtils.GetBufferFromAccessor(e,A),m.indices=new Int32Array(g.length),m.indices.set(g),d.push(m.indices.length);else{var x=[];for(b=0;b<m.positions.length/3;b++)x.push(b);m.indices=new Int32Array(x),d.push(m.indices.length)}s?s.merge(m):s=m;var O=e.scene.getMaterialByID(_.material);i.push(null===O?B.GLTFUtils.GetDefaultMaterial(e.scene):O),l.push(0===l.length?0:l[l.length-1]+u[u.length-2]),c.push(0===c.length?0:c[c.length-1]+d[d.length-2])}}1<i.length?(a=new W.MultiMaterial("multimat"+r,e.scene)).subMaterials=i:a=new W.StandardMaterial("multimat"+r,e.scene),1===i.length&&(a=i[0]),o.material||(o.material=a),new W.Geometry(r,e.scene,s,!1,o),o.computeWorldMatrix(!0),o.subMeshes=[];var M=0;for(f=0;f<n.length;f++){var w;h=n[f];if(w=e.meshes[h])for(p=0;p<w.primitives.length;p++)w.primitives[p].mode,W.SubMesh.AddToMesh(M,l[M],u[M],c[M],d[M],o,o,!0),M++}return o},M=function(e,t,n,r){e.position&&(e.position=t),(e.rotationQuaternion||e.rotation)&&(e.rotationQuaternion=n),e.scaling&&(e.scaling=r)},s=function(e,t,n,r){var o=null;if(e.importOnlyMeshes&&(t.skin||t.meshes)&&e.importMeshesNames&&0<e.importMeshesNames.length&&-1===e.importMeshesNames.indexOf(t.name||""))return null;if(t.skin){if(t.meshes){var a=e.skins[t.skin];(i=O(e,t,t.meshes,n,t.babylonNode)).skeleton=e.scene.getLastSkeletonByID(t.skin),null===i.skeleton&&(i.skeleton=x(e,a,0,a.babylonSkeleton,t.skin),a.babylonSkeleton||(a.babylonSkeleton=i.skeleton)),o=i}}else if(t.meshes){var i;o=i=O(e,t,t.mesh?[t.mesh]:t.meshes,n,t.babylonNode)}else if(!t.light||t.babylonNode||e.importOnlyMeshes){if(t.camera&&!t.babylonNode&&!e.importOnlyMeshes){var s=e.cameras[t.camera];if(s)if("orthographic"===s.type){var l=new W.FreeCamera(t.camera,W.Vector3.Zero(),e.scene,!1);l.name=t.name||"",l.mode=W.Camera.ORTHOGRAPHIC_CAMERA,l.attachControl(e.scene.getEngine().getRenderingCanvas()),o=l}else if("perspective"===s.type){var u=s[s.type],c=new W.FreeCamera(t.camera,W.Vector3.Zero(),e.scene,!1);c.name=t.name||"",c.attachControl(e.scene.getEngine().getRenderingCanvas()),u.aspectRatio||(u.aspectRatio=e.scene.getEngine().getRenderWidth()/e.scene.getEngine().getRenderHeight()),u.znear&&u.zfar&&(c.maxZ=u.zfar,c.minZ=u.znear),o=c}}}else{var d=e.lights[t.light];if(d)if("ambient"===d.type){var f=d[d.type],h=new W.HemisphericLight(t.light,W.Vector3.Zero(),e.scene);h.name=t.name||"",f.color&&(h.diffuse=W.Color3.FromArray(f.color)),o=h}else if("directional"===d.type){var p=d[d.type],m=new W.DirectionalLight(t.light,W.Vector3.Zero(),e.scene);m.name=t.name||"",p.color&&(m.diffuse=W.Color3.FromArray(p.color)),o=m}else if("point"===d.type){var _=d[d.type],y=new W.PointLight(t.light,W.Vector3.Zero(),e.scene);y.name=t.name||"",_.color&&(y.diffuse=W.Color3.FromArray(_.color)),o=y}else if("spot"===d.type){var A=d[d.type],g=new W.SpotLight(t.light,W.Vector3.Zero(),W.Vector3.Zero(),0,0,e.scene);g.name=t.name||"",A.color&&(g.diffuse=W.Color3.FromArray(A.color)),A.fallOfAngle&&(g.angle=A.fallOfAngle),A.fallOffExponent&&(g.exponent=A.fallOffExponent),o=g}}if(!t.jointName){if(t.babylonNode)return t.babylonNode;if(null===o){var v=new W.Mesh(t.name||"",e.scene);o=t.babylonNode=v}}if(null!==o){if(t.matrix&&o instanceof W.Mesh)!(function(e,t,n){if(t.matrix){var r=new W.Vector3(0,0,0),o=new W.Quaternion,a=new W.Vector3(0,0,0);W.Matrix.FromArray(t.matrix).decompose(a,o,r),M(e,r,o,a)}else t.translation&&t.rotation&&t.scale&&M(e,W.Vector3.FromArray(t.translation),W.Quaternion.FromArray(t.rotation),W.Vector3.FromArray(t.scale));e.computeWorldMatrix(!0)})(o,t);else{var b=t.translation||[0,0,0],T=t.rotation||[0,0,0,1],L=t.scale||[1,1,1];M(o,W.Vector3.FromArray(b),W.Quaternion.FromArray(T),W.Vector3.FromArray(L))}o.updateCache(!0),t.babylonNode=o}return o},l=function(e,t,n,r){void 0===r&&(r=!1);var o=e.nodes[t],a=null;if(r=!(e.importOnlyMeshes&&!r&&e.importMeshesNames)||(-1!==e.importMeshesNames.indexOf(o.name||"")||0===e.importMeshesNames.length),!o.jointName&&r&&null!==(a=s(e,o,t))&&(a.id=t,a.parent=n),o.children)for(var i=0;i<o.children.length;i++)l(e,o.children[i],a,r)},d=function(e){var t=e.currentScene;if(t)for(var n=0;n<t.nodes.length;n++)l(e,t.nodes[n],null);else for(var r in e.scenes){t=e.scenes[r];for(n=0;n<t.nodes.length;n++)l(e,t.nodes[n],null)}!(function(e){for(var t in e.animations){var n=e.animations[t];if(n.channels&&n.samplers)for(var r=null,o=0;o<n.channels.length;o++){var a=n.channels[o],i=n.samplers[a.sampler];if(i){var s=null,l=null;n.parameters?(s=n.parameters[i.input],l=n.parameters[i.output]):(s=i.input,l=i.output);var u=B.GLTFUtils.GetBufferFromAccessor(e,e.accessors[s]),c=B.GLTFUtils.GetBufferFromAccessor(e,e.accessors[l]),d=a.target.id,f=e.scene.getNodeByID(d);if(null===f&&(f=e.scene.getNodeByName(d)),null!==f){var h=f instanceof W.Bone,p=a.target.path,m=w.indexOf(p);-1!==m&&(p=S[m]);var _=W.Animation.ANIMATIONTYPE_MATRIX;h||("rotationQuaternion"===p?(_=W.Animation.ANIMATIONTYPE_QUATERNION,f.rotationQuaternion=new W.Quaternion):_=W.Animation.ANIMATIONTYPE_VECTOR3);var y=null,A=[],g=0,v=!1;h&&r&&r.getKeys().length===u.length&&(y=r,v=!0),v||(y=new W.Animation(t,h?"_matrix":p,1,_,W.Animation.ANIMATIONLOOPMODE_CYCLE));for(var b=0;b<u.length;b++){var T=null;if("rotationQuaternion"===p?(T=W.Quaternion.FromArray([c[g],c[g+1],c[g+2],c[g+3]]),g+=4):(T=W.Vector3.FromArray([c[g],c[g+1],c[g+2]]),g+=3),h){var L=f,E=W.Vector3.Zero(),x=new W.Quaternion,O=W.Vector3.Zero(),M=L.getBaseMatrix();v&&r&&(M=r.getKeys()[b].value),M.decompose(O,x,E),"position"===p?E=T:"rotationQuaternion"===p?x=T:O=T,T=W.Matrix.Compose(O,x,E)}v?r&&(r.getKeys()[b].value=T):A.push({frame:u[b],value:T})}!v&&y&&(y.setKeys(A),f.animations.push(y)),r=y,e.scene.stopAnimation(f),e.scene.beginAnimation(f,0,u[u.length-1],!0,1)}else W.Tools.Warn("Creating animation named "+t+". But cannot find node named "+d+" to attach to")}}}})(e);for(n=0;n<e.scene.skeletons.length;n++){var o=e.scene.skeletons[n];e.scene.beginAnimation(o,0,Number.MAX_VALUE,!0,1)}},H=function(t,n,r,o,a,i){return function(e){!(function(e,n,t,r,o){var a=r.values||t.parameters,i=t.uniforms;for(var s in o){var l=o[s],u=l.type,c=a[i[s]];if(void 0===c&&(c=l.value),c){var d=function(t){return function(e){l.value&&t&&(n.setTexture(t,e),delete o[t])}};u===B.EParameterType.SAMPLER_2D?B.GLTFLoaderExtension.LoadTextureAsync(e,r.values?c:l.value,d(s),(function(){return d(null)})):l.value&&B.GLTFUtils.SetUniform(n,s,r.values?c:l.value,u)&&delete o[s]}}})(t,n,r,o,a),n.onBind=function(e){!(function(e,t,n,r,o,a,i){var s=a.values||o.parameters;for(var l in n){var u=n[l],c=u.type;if(c===B.EParameterType.FLOAT_MAT2||c===B.EParameterType.FLOAT_MAT3||c===B.EParameterType.FLOAT_MAT4)if(!u.semantic||u.source||u.node){if(u.semantic&&(u.source||u.node)){var d=t.scene.getNodeByName(u.source||u.node||"");if(null===d&&(d=t.scene.getNodeByID(u.source||u.node||"")),null===d)continue;B.GLTFUtils.SetMatrix(t.scene,d,u,l,r.getEffect())}}else B.GLTFUtils.SetMatrix(t.scene,e,u,l,r.getEffect());else{var f=s[o.uniforms[l]];if(!f)continue;if(c===B.EParameterType.SAMPLER_2D){var h=t.textures[a.values?f:u.value].babylonTexture;if(null==h)continue;r.getEffect().setTexture(l,h)}else B.GLTFUtils.SetUniform(r.getEffect(),l,f,c)}}i(r)})(e,t,a,n,r,o,i)}}},j=function(e,t,n){for(var r in t.uniforms){var o=t.uniforms[r],a=t.parameters[o];if(e.currentIdentifier===r&&a.semantic&&!a.source&&!a.node){var i=V.indexOf(a.semantic);if(-1!==i)return delete n[r],U[i]}}return e.currentIdentifier},f=function(e){for(var t in e.materials)B.GLTFLoaderExtension.LoadMaterialAsync(e,t,(function(e){}),(function(){}))},t=(function(){function e(){}return e.CreateRuntime=function(e,t,n){var r={extensions:{},accessors:{},buffers:{},bufferViews:{},meshes:{},lights:{},cameras:{},nodes:{},images:{},textures:{},shaders:{},programs:{},samplers:{},techniques:{},materials:{},animations:{},skins:{},extensionsUsed:[],scenes:{},buffersCount:0,shaderscount:0,scene:t,rootUrl:n,loadedBufferCount:0,loadedBufferViews:{},loadedShaderCount:0,importOnlyMeshes:!1,dummyNodes:[]};return e.extensions&&o(e.extensions,"extensions",r),e.extensionsUsed&&o(e.extensionsUsed,"extensionsUsed",r),e.buffers&&(function(e,t){for(var n in e){var r=e[n];t.buffers[n]=r,t.buffersCount++}})(e.buffers,r),e.bufferViews&&o(e.bufferViews,"bufferViews",r),e.accessors&&o(e.accessors,"accessors",r),e.meshes&&o(e.meshes,"meshes",r),e.lights&&o(e.lights,"lights",r),e.cameras&&o(e.cameras,"cameras",r),e.nodes&&o(e.nodes,"nodes",r),e.images&&o(e.images,"images",r),e.textures&&o(e.textures,"textures",r),e.shaders&&(function(e,t){for(var n in e){var r=e[n];t.shaders[n]=r,t.shaderscount++}})(e.shaders,r),e.programs&&o(e.programs,"programs",r),e.samplers&&o(e.samplers,"samplers",r),e.techniques&&o(e.techniques,"techniques",r),e.materials&&o(e.materials,"materials",r),e.animations&&o(e.animations,"animations",r),e.skins&&o(e.skins,"skins",r),e.scenes&&(r.scenes=e.scenes),e.scene&&e.scenes&&(r.currentScene=e.scenes[e.scene]),r},e.LoadBufferAsync=function(e,t,n,r,o){var a=e.buffers[t];W.Tools.IsBase64(a.uri)?setTimeout((function(){return n(new Uint8Array(W.Tools.DecodeBase64(a.uri)))})):W.Tools.LoadFile(e.rootUrl+a.uri,(function(e){return n(new Uint8Array(e))}),o,void 0,!0,(function(e){e&&r(e.status+" "+e.statusText)}))},e.LoadTextureBufferAsync=function(e,t,n,r){var o=e.textures[t];if(o&&o.source)if(o.babylonTexture)n(null);else{var a=e.images[o.source];W.Tools.IsBase64(a.uri)?setTimeout((function(){return n(new Uint8Array(W.Tools.DecodeBase64(a.uri)))})):W.Tools.LoadFile(e.rootUrl+a.uri,(function(e){return n(new Uint8Array(e))}),void 0,void 0,!0,(function(e){e&&r(e.status+" "+e.statusText)}))}else r("")},e.CreateTextureAsync=function(e,t,n,r,o){var a=e.textures[t];if(a.babylonTexture)r(a.babylonTexture);else{var i=e.samplers[a.sampler],s=i.minFilter===B.ETextureFilterType.NEAREST_MIPMAP_NEAREST||i.minFilter===B.ETextureFilterType.NEAREST_MIPMAP_LINEAR||i.minFilter===B.ETextureFilterType.LINEAR_MIPMAP_NEAREST||i.minFilter===B.ETextureFilterType.LINEAR_MIPMAP_LINEAR,l=W.Texture.BILINEAR_SAMPLINGMODE,u=null==n?new Blob:new Blob([n]),c=URL.createObjectURL(u),d=function(){return URL.revokeObjectURL(c)},f=new W.Texture(c,e.scene,!s,!0,l,d,d);void 0!==i.wrapS&&(f.wrapU=B.GLTFUtils.GetWrapMode(i.wrapS)),void 0!==i.wrapT&&(f.wrapV=B.GLTFUtils.GetWrapMode(i.wrapT)),f.name=t,r(a.babylonTexture=f)}},e.LoadShaderStringAsync=function(e,t,n,r){var o=e.shaders[t];if(W.Tools.IsBase64(o.uri)){var a=atob(o.uri.split(",")[1]);n&&n(a)}else W.Tools.LoadFile(e.rootUrl+o.uri,n,void 0,void 0,!1,(function(e){e&&r&&r(e.status+" "+e.statusText)}))},e.LoadMaterialAsync=function(e,t,n,r){var o=e.materials[t];if(o.technique){var a=e.techniques[o.technique];if(!a){var i=new W.StandardMaterial(t,e.scene);return i.diffuseColor=new W.Color3(.5,.5,.5),i.sideOrientation=W.Material.CounterClockWiseSideOrientation,void n(i)}var s=e.programs[a.program],l=a.states,u=W.Effect.ShadersStore[s.vertexShader+"VertexShader"],c=W.Effect.ShadersStore[s.fragmentShader+"PixelShader"],d="",f="",h=new G(u),p=new G(c),m={},_=[],y=[],A=[];for(var g in a.uniforms){var v=a.uniforms[g],b=a.parameters[v];if(!(m[g]=b).semantic||b.node||b.source)b.type===B.EParameterType.SAMPLER_2D?A.push(g):_.push(g);else{var T=V.indexOf(b.semantic);-1!==T?(_.push(U[T]),delete m[g]):_.push(g)}}for(var L in a.attributes){var E=a.attributes[L];if((M=a.parameters[E]).semantic){var x=k(M);x&&y.push(x)}}for(;!h.isEnd()&&h.getNextToken();){if(h.currentToken===D.IDENTIFIER){var O=!1;for(var L in a.attributes){E=a.attributes[L];var M=a.parameters[E];if(h.currentIdentifier===L&&M.semantic){d+=k(M),O=!0;break}}O||(d+=j(h,a,m))}else d+=h.currentString}for(;!p.isEnd()&&p.getNextToken();){p.currentToken===D.IDENTIFIER?f+=j(p,a,m):f+=p.currentString}var w={vertex:s.vertexShader+t,fragment:s.fragmentShader+t},S={attributes:y,uniforms:_,samplers:A,needAlphaBlending:l&&l.enable&&-1!==l.enable.indexOf(3042)};W.Effect.ShadersStore[s.vertexShader+t+"VertexShader"]=d,W.Effect.ShadersStore[s.fragmentShader+t+"PixelShader"]=f;var N,F,C,P=new W.ShaderMaterial(t,e.scene,w,S);if(P.onError=(N=s,F=P,C=r,function(e,t){F.dispose(!0),C("Cannot compile program named "+N.name+". Error: "+t+". Default material will be applied")}),P.onCompiled=H(e,P,a,o,m,n),P.sideOrientation=W.Material.CounterClockWiseSideOrientation,l&&l.functions){var I=l.functions;I.cullFace&&I.cullFace[0]!==B.ECullingType.BACK&&(P.backFaceCulling=!1);var R=I.blendFuncSeparate;R&&(R[0]===B.EBlendingFunction.SRC_ALPHA&&R[1]===B.EBlendingFunction.ONE_MINUS_SRC_ALPHA&&R[2]===B.EBlendingFunction.ONE&&R[3]===B.EBlendingFunction.ONE?P.alphaMode=W.Engine.ALPHA_COMBINE:R[0]===B.EBlendingFunction.ONE&&R[1]===B.EBlendingFunction.ONE&&R[2]===B.EBlendingFunction.ZERO&&R[3]===B.EBlendingFunction.ONE?P.alphaMode=W.Engine.ALPHA_ONEONE:R[0]===B.EBlendingFunction.SRC_ALPHA&&R[1]===B.EBlendingFunction.ONE&&R[2]===B.EBlendingFunction.ZERO&&R[3]===B.EBlendingFunction.ONE?P.alphaMode=W.Engine.ALPHA_ADD:R[0]===B.EBlendingFunction.ZERO&&R[1]===B.EBlendingFunction.ONE_MINUS_SRC_COLOR&&R[2]===B.EBlendingFunction.ONE&&R[3]===B.EBlendingFunction.ONE?P.alphaMode=W.Engine.ALPHA_SUBTRACT:R[0]===B.EBlendingFunction.DST_COLOR&&R[1]===B.EBlendingFunction.ZERO&&R[2]===B.EBlendingFunction.ONE&&R[3]===B.EBlendingFunction.ONE?P.alphaMode=W.Engine.ALPHA_MULTIPLY:R[0]===B.EBlendingFunction.SRC_ALPHA&&R[1]===B.EBlendingFunction.ONE_MINUS_SRC_COLOR&&R[2]===B.EBlendingFunction.ONE&&R[3]===B.EBlendingFunction.ONE&&(P.alphaMode=W.Engine.ALPHA_MAXIMIZED))}}else r&&r("No technique found.")},e})();B.GLTFLoaderBase=t;var n=(function(){function t(){this.state=null}return t.RegisterExtension=function(e){t.Extensions[e.name]?W.Tools.Error('Tool with the same name "'+e.name+'" already exists'):t.Extensions[e.name]=e},t.prototype.dispose=function(){},t.prototype._importMeshAsync=function(s,e,t,n,l,u,r){var c=this;return e.useRightHandedSystem=!0,B.GLTFLoaderExtension.LoadRuntimeAsync(e,t,n,(function(e){e.importOnlyMeshes=!0,""===s?e.importMeshesNames=[]:"string"==typeof s?e.importMeshesNames=[s]:!s||s instanceof Array?(e.importMeshesNames=[],W.Tools.Warn("Argument meshesNames must be of type string or string[]")):e.importMeshesNames=[s],c._createNodes(e);var t=new Array,n=new Array;for(var r in e.nodes){var o=e.nodes[r];o.babylonNode instanceof W.AbstractMesh&&t.push(o.babylonNode)}for(var a in e.skins){var i=e.skins[a];i.babylonSkeleton instanceof W.Skeleton&&n.push(i.babylonSkeleton)}c._loadBuffersAsync(e,(function(){c._loadShadersAsync(e,(function(){f(e),d(e),!W.GLTFFileLoader.IncrementalLoading&&l&&l(t,n)}))}),u),W.GLTFFileLoader.IncrementalLoading&&l&&l(t,n)}),r),!0},t.prototype.importMeshAsync=function(e,r,o,a,i){var s=this;return new Promise(function(n,t){s._importMeshAsync(e,r,o,a,(function(e,t){n({meshes:e,particleSystems:[],skeletons:t,animationGroups:[]})}),i,(function(e){t(new Error(e))}))})},t.prototype._loadAsync=function(e,t,n,r,o,a){var i=this;e.useRightHandedSystem=!0,B.GLTFLoaderExtension.LoadRuntimeAsync(e,t,n,(function(e){B.GLTFLoaderExtension.LoadRuntimeExtensionsAsync(e,(function(){i._createNodes(e),i._loadBuffersAsync(e,(function(){i._loadShadersAsync(e,(function(){f(e),d(e),W.GLTFFileLoader.IncrementalLoading||r()}))})),W.GLTFFileLoader.IncrementalLoading&&r()}),a)}),a)},t.prototype.loadAsync=function(n,r,o,a){var i=this;return new Promise(function(e,t){i._loadAsync(n,r,o,(function(){e()}),a,(function(e){t(new Error(e))}))})},t.prototype._loadShadersAsync=function(r,o){var e=!1,t=function(t,n){B.GLTFLoaderExtension.LoadShaderStringAsync(r,t,(function(e){e instanceof ArrayBuffer||(r.loadedShaderCount++,e&&(W.Effect.ShadersStore[t+(n.type===B.EShaderType.VERTEX?"VertexShader":"PixelShader")]=e),r.loadedShaderCount===r.shaderscount&&o())}),(function(){W.Tools.Error("Error when loading shader program named "+t+" located at "+n.uri)}))};for(var n in r.shaders){e=!0;var a=r.shaders[n];a?t.bind(this,n,a)():W.Tools.Error("No shader named: "+n)}e||o()},t.prototype._loadBuffersAsync=function(r,o,e){var t=!1,n=function(t,n){B.GLTFLoaderExtension.LoadBufferAsync(r,t,(function(e){r.loadedBufferCount++,e&&(e.byteLength!=r.buffers[t].byteLength&&W.Tools.Error("Buffer named "+t+" is length "+e.byteLength+". Expected: "+n.byteLength),r.loadedBufferViews[t]=e),r.loadedBufferCount===r.buffersCount&&o()}),(function(){W.Tools.Error("Error when loading buffer named "+t+" located at "+n.uri)}))};for(var a in r.buffers){t=!0;var i=r.buffers[a];i?n.bind(this,a,i)():W.Tools.Error("No buffer named: "+a)}t||o()},t.prototype._createNodes=function(e){var t=e.currentScene;if(t)for(var n=0;n<t.nodes.length;n++)l(e,t.nodes[n],null);else for(var r in e.scenes){t=e.scenes[r];for(n=0;n<t.nodes.length;n++)l(e,t.nodes[n],null)}},t.Extensions={},t})();B.GLTFLoader=n,W.GLTFFileLoader._CreateGLTFLoaderV1=function(){return new n}})(W.GLTF1||(W.GLTF1={}))})(BABYLON||(BABYLON={})),(function(i){var s,e;s=i.GLTF1||(i.GLTF1={}),e=(function(){function o(){}return o.SetMatrix=function(e,t,n,r,o){var a=null;if("MODEL"===n.semantic?a=t.getWorldMatrix():"PROJECTION"===n.semantic?a=e.getProjectionMatrix():"VIEW"===n.semantic?a=e.getViewMatrix():"MODELVIEWINVERSETRANSPOSE"===n.semantic?a=i.Matrix.Transpose(t.getWorldMatrix().multiply(e.getViewMatrix()).invert()):"MODELVIEW"===n.semantic?a=t.getWorldMatrix().multiply(e.getViewMatrix()):"MODELVIEWPROJECTION"===n.semantic?a=t.getWorldMatrix().multiply(e.getTransformMatrix()):"MODELINVERSE"===n.semantic?a=t.getWorldMatrix().invert():"VIEWINVERSE"===n.semantic?a=e.getViewMatrix().invert():"PROJECTIONINVERSE"===n.semantic?a=e.getProjectionMatrix().invert():"MODELVIEWINVERSE"===n.semantic?a=t.getWorldMatrix().multiply(e.getViewMatrix()).invert():"MODELVIEWPROJECTIONINVERSE"===n.semantic?a=t.getWorldMatrix().multiply(e.getTransformMatrix()).invert():"MODELINVERSETRANSPOSE"===n.semantic&&(a=i.Matrix.Transpose(t.getWorldMatrix().invert())),a)switch(n.type){case s.EParameterType.FLOAT_MAT2:o.setMatrix2x2(r,i.Matrix.GetAsMatrix2x2(a));break;case s.EParameterType.FLOAT_MAT3:o.setMatrix3x3(r,i.Matrix.GetAsMatrix3x3(a));break;case s.EParameterType.FLOAT_MAT4:o.setMatrix(r,a)}},o.SetUniform=function(e,t,n,r){switch(r){case s.EParameterType.FLOAT:return e.setFloat(t,n),!0;case s.EParameterType.FLOAT_VEC2:return e.setVector2(t,i.Vector2.FromArray(n)),!0;case s.EParameterType.FLOAT_VEC3:return e.setVector3(t,i.Vector3.FromArray(n)),!0;case s.EParameterType.FLOAT_VEC4:return e.setVector4(t,i.Vector4.FromArray(n)),!0;default:return!1}},o.GetWrapMode=function(e){switch(e){case s.ETextureWrapMode.CLAMP_TO_EDGE:return i.Texture.CLAMP_ADDRESSMODE;case s.ETextureWrapMode.MIRRORED_REPEAT:return i.Texture.MIRROR_ADDRESSMODE;case s.ETextureWrapMode.REPEAT:default:return i.Texture.WRAP_ADDRESSMODE}},o.GetByteStrideFromType=function(e){switch(e.type){case"VEC2":return 2;case"VEC3":return 3;case"VEC4":case"MAT2":return 4;case"MAT3":return 9;case"MAT4":return 16;default:return 1}},o.GetTextureFilterMode=function(e){switch(e){case s.ETextureFilterType.LINEAR:case s.ETextureFilterType.LINEAR_MIPMAP_NEAREST:case s.ETextureFilterType.LINEAR_MIPMAP_LINEAR:return i.Texture.TRILINEAR_SAMPLINGMODE;case s.ETextureFilterType.NEAREST:case s.ETextureFilterType.NEAREST_MIPMAP_NEAREST:return i.Texture.NEAREST_SAMPLINGMODE;default:return i.Texture.BILINEAR_SAMPLINGMODE}},o.GetBufferFromBufferView=function(e,t,n,r,o){n=t.byteOffset+n;var a=e.loadedBufferViews[t.buffer];if(n+r>a.byteLength)throw new Error("Buffer access is out of range");var i=a.buffer;switch(n+=a.byteOffset,o){case s.EComponentType.BYTE:return new Int8Array(i,n,r);case s.EComponentType.UNSIGNED_BYTE:return new Uint8Array(i,n,r);case s.EComponentType.SHORT:return new Int16Array(i,n,r);case s.EComponentType.UNSIGNED_SHORT:return new Uint16Array(i,n,r);default:return new Float32Array(i,n,r)}},o.GetBufferFromAccessor=function(e,t){var n=e.bufferViews[t.bufferView],r=t.count*o.GetByteStrideFromType(t);return o.GetBufferFromBufferView(e,n,t.byteOffset,r,t.componentType)},o.DecodeBufferToText=function(e){for(var t="",n=e.byteLength,r=0;r<n;++r)t+=String.fromCharCode(e[r]);return t},o.GetDefaultMaterial=function(e){if(!o._DefaultMaterial){i.Effect.ShadersStore.GLTFDefaultMaterialVertexShader=["precision highp float;","","uniform mat4 worldView;","uniform mat4 projection;","","attribute vec3 position;","","void main(void)","{","    gl_Position = projection * worldView * vec4(position, 1.0);","}"].join("\n"),i.Effect.ShadersStore.GLTFDefaultMaterialPixelShader=["precision highp float;","","uniform vec4 u_emission;","","void main(void)","{","    gl_FragColor = u_emission;","}"].join("\n");var t={attributes:["position"],uniforms:["worldView","projection","u_emission"],samplers:new Array,needAlphaBlending:!1};(o._DefaultMaterial=new i.ShaderMaterial("GLTFDefaultMaterial",e,{vertex:"GLTFDefaultMaterial",fragment:"GLTFDefaultMaterial"},t)).setColor4("u_emission",new i.Color4(.5,.5,.5,1))}return o._DefaultMaterial},o._DefaultMaterial=null,o})(),s.GLTFUtils=e})(BABYLON||(BABYLON={})),(function(e){var s,t;s=e.GLTF1||(e.GLTF1={}),t=(function(){function i(e){this._name=e}return Object.defineProperty(i.prototype,"name",{get:function(){return this._name},enumerable:!0,configurable:!0}),i.prototype.loadRuntimeAsync=function(e,t,n,r,o){return!1},i.prototype.loadRuntimeExtensionsAsync=function(e,t,n){return!1},i.prototype.loadBufferAsync=function(e,t,n,r,o){return!1},i.prototype.loadTextureBufferAsync=function(e,t,n,r){return!1},i.prototype.createTextureAsync=function(e,t,n,r,o){return!1},i.prototype.loadShaderStringAsync=function(e,t,n,r){return!1},i.prototype.loadMaterialAsync=function(e,t,n,r){return!1},i.LoadRuntimeAsync=function(t,n,r,o,a){i.ApplyExtensions((function(e){return e.loadRuntimeAsync(t,n,r,o,a)}),(function(){setTimeout((function(){o&&o(s.GLTFLoaderBase.CreateRuntime(n.json,t,r))}))}))},i.LoadRuntimeExtensionsAsync=function(t,n,r){i.ApplyExtensions((function(e){return e.loadRuntimeExtensionsAsync(t,n,r)}),(function(){setTimeout((function(){n()}))}))},i.LoadBufferAsync=function(t,n,r,o,a){i.ApplyExtensions((function(e){return e.loadBufferAsync(t,n,r,o,a)}),(function(){s.GLTFLoaderBase.LoadBufferAsync(t,n,r,o,a)}))},i.LoadTextureAsync=function(t,n,r,o){i.LoadTextureBufferAsync(t,n,(function(e){e&&i.CreateTextureAsync(t,n,e,r,o)}),o)},i.LoadShaderStringAsync=function(t,n,r,o){i.ApplyExtensions((function(e){return e.loadShaderStringAsync(t,n,r,o)}),(function(){s.GLTFLoaderBase.LoadShaderStringAsync(t,n,r,o)}))},i.LoadMaterialAsync=function(t,n,r,o){i.ApplyExtensions((function(e){return e.loadMaterialAsync(t,n,r,o)}),(function(){s.GLTFLoaderBase.LoadMaterialAsync(t,n,r,o)}))},i.LoadTextureBufferAsync=function(t,n,r,o){i.ApplyExtensions((function(e){return e.loadTextureBufferAsync(t,n,r,o)}),(function(){s.GLTFLoaderBase.LoadTextureBufferAsync(t,n,r,o)}))},i.CreateTextureAsync=function(t,n,r,o,a){i.ApplyExtensions((function(e){return e.createTextureAsync(t,n,r,o,a)}),(function(){s.GLTFLoaderBase.CreateTextureAsync(t,n,r,o,a)}))},i.ApplyExtensions=function(e,t){for(var n in s.GLTFLoader.Extensions){if(e(s.GLTFLoader.Extensions[n]))return}t()},i})(),s.GLTFLoaderExtension=t})(BABYLON||(BABYLON={}));var __extends=this&&this.__extends||(function(){var r=function(e,t){return(r=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t}||function(e,t){for(var n in t)t.hasOwnProperty(n)&&(e[n]=t[n])})(e,t)};return function(e,t){function n(){this.constructor=e}r(e,t),e.prototype=null===t?Object.create(t):(n.prototype=t.prototype,new n)}})();!(function(e){var l,t;l=e.GLTF1||(e.GLTF1={}),t=(function(e){function t(){return e.call(this,"KHR_binary_glTF")||this}return __extends(t,e),t.prototype.loadRuntimeAsync=function(e,t,n,r,o){var a=t.json.extensionsUsed;return!(!a||-1===a.indexOf(this.name)||!t.bin)&&(this._bin=t.bin,r(l.GLTFLoaderBase.CreateRuntime(t.json,e,n)),!0)},t.prototype.loadBufferAsync=function(e,t,n,r){return-1!==e.extensionsUsed.indexOf(this.name)&&("binary_glTF"===t&&(n(this._bin),!0))},t.prototype.loadTextureBufferAsync=function(e,t,n,r){var o=e.textures[t],a=e.images[o.source];if(!(a.extensions&&this.name in a.extensions))return!1;var i=a.extensions[this.name],s=e.bufferViews[i.bufferView];return n(l.GLTFUtils.GetBufferFromBufferView(e,s,0,s.byteLength,l.EComponentType.UNSIGNED_BYTE)),!0},t.prototype.loadShaderStringAsync=function(e,t,n,r){var o=e.shaders[t];if(!(o.extensions&&this.name in o.extensions))return!1;var a=o.extensions[this.name],i=e.bufferViews[a.bufferView],s=l.GLTFUtils.GetBufferFromBufferView(e,i,0,i.byteLength,l.EComponentType.UNSIGNED_BYTE);return setTimeout((function(){var e=l.GLTFUtils.DecodeBufferToText(s);n(e)})),!0},t})(l.GLTFLoaderExtension),l.GLTFBinaryExtension=t,l.GLTFLoader.RegisterExtension(new t)})(BABYLON||(BABYLON={}));var BABYLON;__extends=this&&this.__extends||(function(){var r=function(e,t){return(r=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t}||function(e,t){for(var n in t)t.hasOwnProperty(n)&&(e[n]=t[n])})(e,t)};return function(e,t){function n(){this.constructor=e}r(e,t),e.prototype=null===t?Object.create(t):(n.prototype=t.prototype,new n)}})();!(function(p){var i,e;i=p.GLTF1||(p.GLTF1={}),e=(function(e){function t(){return e.call(this,"KHR_materials_common")||this}return __extends(t,e),t.prototype.loadRuntimeExtensionsAsync=function(e,t,n){if(!e.extensions)return!1;var r=e.extensions[this.name];if(!r)return!1;var o=r.lights;if(o)for(var a in o){var i=o[a];switch(i.type){case"ambient":var s=new p.HemisphericLight(i.name,new p.Vector3(0,1,0),e.scene),l=i.ambient;l&&(s.diffuse=p.Color3.FromArray(l.color||[1,1,1]));break;case"point":var u=new p.PointLight(i.name,new p.Vector3(10,10,10),e.scene),c=i.point;c&&(u.diffuse=p.Color3.FromArray(c.color||[1,1,1]));break;case"directional":var d=new p.DirectionalLight(i.name,new p.Vector3(0,-1,0),e.scene),f=i.directional;f&&(d.diffuse=p.Color3.FromArray(f.color||[1,1,1]));break;case"spot":var h=i.spot;if(h)new p.SpotLight(i.name,new p.Vector3(0,10,0),new p.Vector3(0,-1,0),h.fallOffAngle||Math.PI,h.fallOffExponent||0,e.scene).diffuse=p.Color3.FromArray(h.color||[1,1,1]);break;default:p.Tools.Warn('GLTF Material Common extension: light type "'+i.type+"” not supported")}}return!1},t.prototype.loadMaterialAsync=function(e,t,n,r){var o=e.materials[t];if(!o||!o.extensions)return!1;var a=o.extensions[this.name];if(!a)return!1;var i=new p.StandardMaterial(t,e.scene);return i.sideOrientation=p.Material.CounterClockWiseSideOrientation,"CONSTANT"===a.technique&&(i.disableLighting=!0),i.backFaceCulling=void 0!==a.doubleSided&&!a.doubleSided,i.alpha=void 0===a.values.transparency?1:a.values.transparency,i.specularPower=void 0===a.values.shininess?0:a.values.shininess,"string"==typeof a.values.ambient?this._loadTexture(e,a.values.ambient,i,"ambientTexture",r):i.ambientColor=p.Color3.FromArray(a.values.ambient||[0,0,0]),"string"==typeof a.values.diffuse?this._loadTexture(e,a.values.diffuse,i,"diffuseTexture",r):i.diffuseColor=p.Color3.FromArray(a.values.diffuse||[0,0,0]),"string"==typeof a.values.emission?this._loadTexture(e,a.values.emission,i,"emissiveTexture",r):i.emissiveColor=p.Color3.FromArray(a.values.emission||[0,0,0]),"string"==typeof a.values.specular?this._loadTexture(e,a.values.specular,i,"specularTexture",r):i.specularColor=p.Color3.FromArray(a.values.specular||[0,0,0]),!0},t.prototype._loadTexture=function(t,n,r,o,a){i.GLTFLoaderBase.LoadTextureBufferAsync(t,n,(function(e){i.GLTFLoaderBase.CreateTextureAsync(t,n,e,(function(e){return r[o]=e}),a)}),a)},t})(i.GLTFLoaderExtension),i.GLTFMaterialsCommonExtension=e,i.GLTFLoader.RegisterExtension(new e)})(BABYLON||(BABYLON={})),(function(b){!(function(e){var v=(function(){function e(){}return e.Get=function(e,t,n){if(!t||null==n||!t[n])throw new Error(e+": Failed to find index ("+n+")");return t[n]},e.Assign=function(e){if(e)for(var t=0;t<e.length;t++)e[t].index=t},e})();e.ArrayItem=v;var t=(function(){function p(e){this._completePromises=new Array,this._disposed=!1,this._state=null,this._extensions={},this._defaultBabylonMaterialData={},this._requests=new Array,this._parent=e}return p.RegisterExtension=function(e,t){p.UnregisterExtension(e)&&b.Tools.Warn("Extension with the name '"+e+"' already exists"),p._ExtensionFactories[e]=t,p._ExtensionNames.push(e)},p.UnregisterExtension=function(e){if(!p._ExtensionFactories[e])return!1;delete p._ExtensionFactories[e];var t=p._ExtensionNames.indexOf(e);return-1!==t&&p._ExtensionNames.splice(t,1),!0},Object.defineProperty(p.prototype,"state",{get:function(){return this._state},enumerable:!0,configurable:!0}),p.prototype.dispose=function(){if(!this._disposed){this._disposed=!0;for(var e=0,t=this._requests;e<t.length;e++){t[e].abort()}for(var n in this._requests.length=0,delete this.gltf,delete this.babylonScene,this._completePromises.length=0,this._extensions){this._extensions[n].dispose&&this._extensions[n].dispose()}this._extensions={},delete this._rootBabylonMesh,delete this._progressCallback,this._parent._clear()}},p.prototype.importMeshAsync=function(a,i,s,l,u,c){var d=this;return Promise.resolve().then((function(){d.babylonScene=i,d._rootUrl=l,d._fileName=c||"scene",d._progressCallback=u,d._loadData(s);var e=null;if(a){var n={};if(d.gltf.nodes)for(var t=0,r=d.gltf.nodes;t<r.length;t++){var o=r[t];o.name&&(n[o.name]=o.index)}e=(a instanceof Array?a:[a]).map((function(e){var t=n[e];if(void 0===t)throw new Error("Failed to find node '"+e+"'");return t}))}return d._loadAsync(e,(function(){return{meshes:d._getMeshes(),particleSystems:[],skeletons:d._getSkeletons(),animationGroups:d._getAnimationGroups()}}))}))},p.prototype.loadAsync=function(e,t,n,r,o){var a=this;return Promise.resolve().then((function(){return a.babylonScene=e,a._rootUrl=n,a._fileName=o||"scene",a._progressCallback=r,a._loadData(t),a._loadAsync(null,(function(){}))}))},p.prototype._loadAsync=function(a,i){var s=this;return Promise.resolve().then((function(){s._uniqueRootUrl=-1===s._rootUrl.indexOf("file:")&&s._fileName?s._rootUrl:""+s._rootUrl+Date.now()+"/",s._loadExtensions(),s._checkExtensions();var e=b.GLTFLoaderState[b.GLTFLoaderState.LOADING]+" => "+b.GLTFLoaderState[b.GLTFLoaderState.READY],t=b.GLTFLoaderState[b.GLTFLoaderState.LOADING]+" => "+b.GLTFLoaderState[b.GLTFLoaderState.COMPLETE];s._parent._startPerformanceCounter(e),s._parent._startPerformanceCounter(t),s._setState(b.GLTFLoaderState.LOADING),s._extensionsOnLoading();var n=new Array;if(a)n.push(s.loadSceneAsync("#/nodes",{nodes:a,index:-1}));else{var r=v.Get("#/scene",s.gltf.scenes,s.gltf.scene||0);n.push(s.loadSceneAsync("#/scenes/"+r.index,r))}s._parent.compileMaterials&&n.push(s._compileMaterialsAsync()),s._parent.compileShadowGenerators&&n.push(s._compileShadowGeneratorsAsync());var o=Promise.all(n).then((function(){return s._setState(b.GLTFLoaderState.READY),s._extensionsOnReady(),s._startAnimations(),i()}));return o.then((function(){s._parent._endPerformanceCounter(e),b.Tools.SetImmediate((function(){s._disposed||Promise.all(s._completePromises).then((function(){s._parent._endPerformanceCounter(t),s._setState(b.GLTFLoaderState.COMPLETE),s._parent.onCompleteObservable.notifyObservers(void 0),s._parent.onCompleteObservable.clear(),s.dispose()}),(function(e){s._parent.onErrorObservable.notifyObservers(e),s._parent.onErrorObservable.clear(),s.dispose()}))}))})),o}),(function(e){throw s._disposed||(s._parent.onErrorObservable.notifyObservers(e),s._parent.onErrorObservable.clear(),s.dispose()),e}))},p.prototype._loadData=function(e){if(this.gltf=e.json,this._setupData(),e.bin){var t=this.gltf.buffers;if(t&&t[0]&&!t[0].uri){var n=t[0];(n.byteLength<e.bin.byteLength-3||n.byteLength>e.bin.byteLength)&&b.Tools.Warn("Binary buffer length ("+n.byteLength+") from JSON does not match chunk length ("+e.bin.byteLength+")"),n._data=Promise.resolve(e.bin)}else b.Tools.Warn("Unexpected BIN chunk")}},p.prototype._setupData=function(){if(v.Assign(this.gltf.accessors),v.Assign(this.gltf.animations),v.Assign(this.gltf.buffers),v.Assign(this.gltf.bufferViews),v.Assign(this.gltf.cameras),v.Assign(this.gltf.images),v.Assign(this.gltf.materials),v.Assign(this.gltf.meshes),v.Assign(this.gltf.nodes),v.Assign(this.gltf.samplers),v.Assign(this.gltf.scenes),v.Assign(this.gltf.skins),v.Assign(this.gltf.textures),this.gltf.nodes){for(var e={},t=0,n=this.gltf.nodes;t<n.length;t++){if((l=n[t]).children)for(var r=0,o=l.children;r<o.length;r++){e[o[r]]=l.index}}for(var a=this._createRootNode(),i=0,s=this.gltf.nodes;i<s.length;i++){var l,u=e[(l=s[i]).index];l.parent=void 0===u?a:this.gltf.nodes[u]}}},p.prototype._loadExtensions=function(){for(var e=0,t=p._ExtensionNames;e<t.length;e++){var n=t[e],r=p._ExtensionFactories[n](this);this._extensions[n]=r,this._parent.onExtensionLoadedObservable.notifyObservers(r)}this._parent.onExtensionLoadedObservable.clear()},p.prototype._checkExtensions=function(){if(this.gltf.extensionsRequired)for(var e=0,t=this.gltf.extensionsRequired;e<t.length;e++){var n=t[e],r=this._extensions[n];if(!r||!r.enabled)throw new Error("Require extension "+n+" is not available")}},p.prototype._setState=function(e){this._state=e,this.log(b.GLTFLoaderState[this._state])},p.prototype._createRootNode=function(){this._rootBabylonMesh=new b.Mesh("__root__",this.babylonScene);var e={_babylonMesh:this._rootBabylonMesh,index:-1};switch(this._parent.coordinateSystemMode){case b.GLTFLoaderCoordinateSystemMode.AUTO:this.babylonScene.useRightHandedSystem||(e.rotation=[0,1,0,0],e.scale=[1,1,-1],p._LoadTransform(e,this._rootBabylonMesh));break;case b.GLTFLoaderCoordinateSystemMode.FORCE_RIGHT_HANDED:this.babylonScene.useRightHandedSystem=!0;break;default:throw new Error("Invalid coordinate system mode ("+this._parent.coordinateSystemMode+")")}return this._parent.onMeshLoadedObservable.notifyObservers(this._rootBabylonMesh),e},p.prototype.loadSceneAsync=function(e,t){var n=this,r=this._extensionsLoadSceneAsync(e,t);if(r)return r;var o=new Array;if(this.logOpen(e+" "+(t.name||"")),t.nodes)for(var a=0,i=t.nodes;a<i.length;a++){var s=i[a],l=v.Get(e+"/nodes/"+s,this.gltf.nodes,s);o.push(this.loadNodeAsync("#/nodes/"+l.index,l,(function(e){e.parent=n._rootBabylonMesh})))}return o.push(this._loadAnimationsAsync()),this.logClose(),Promise.all(o).then((function(){}))},p.prototype._forEachPrimitive=function(e,t){if(e._primitiveBabylonMeshes)for(var n=0,r=e._primitiveBabylonMeshes;n<r.length;n++){t(r[n])}else t(e._babylonMesh)},p.prototype._getMeshes=function(){var e=new Array;e.push(this._rootBabylonMesh);var t=this.gltf.nodes;if(t)for(var n=0,r=t;n<r.length;n++){var o=r[n];if(o._babylonMesh&&e.push(o._babylonMesh),o._primitiveBabylonMeshes)for(var a=0,i=o._primitiveBabylonMeshes;a<i.length;a++){var s=i[a];e.push(s)}}return e},p.prototype._getSkeletons=function(){var e=new Array,t=this.gltf.skins;if(t)for(var n=0,r=t;n<r.length;n++){var o=r[n];o._babylonSkeleton&&e.push(o._babylonSkeleton)}return e},p.prototype._getAnimationGroups=function(){var e=new Array,t=this.gltf.animations;if(t)for(var n=0,r=t;n<r.length;n++){var o=r[n];o._babylonAnimationGroup&&e.push(o._babylonAnimationGroup)}return e},p.prototype._startAnimations=function(){switch(this._parent.animationStartMode){case b.GLTFLoaderAnimationStartMode.NONE:break;case b.GLTFLoaderAnimationStartMode.FIRST:0!==(e=this._getAnimationGroups()).length&&e[0].start(!0);break;case b.GLTFLoaderAnimationStartMode.ALL:for(var e,t=0,n=e=this._getAnimationGroups();t<n.length;t++){n[t].start(!0)}break;default:return void b.Tools.Error("Invalid animation start mode ("+this._parent.animationStartMode+")")}},p.prototype.loadNodeAsync=function(n,r,e){var o=this;void 0===e&&(e=function(){});var t=this._extensionsLoadNodeAsync(n,r,e);if(t)return t;if(r._babylonMesh)throw new Error(n+": Invalid recursive node hierarchy");var a=new Array;this.logOpen(n+" "+(r.name||""));var i=new b.Mesh(r.name||"node"+r.index,this.babylonScene);if((r._babylonMesh=i).setEnabled(!1),p._LoadTransform(r,i),null!=r.mesh){var s=v.Get(n+"/mesh",this.gltf.meshes,r.mesh);a.push(this._loadMeshAsync("#/meshes/"+s.index,r,s,i))}if(null!=r.camera){var l=v.Get(n+"/camera",this.gltf.cameras,r.camera);a.push(this.loadCameraAsync("#/cameras/"+l.index,l,(function(e){e.parent=i})))}if(r.children)for(var u=function(e){var t=v.Get(n+"/children/"+e,c.gltf.nodes,e);a.push(c.loadNodeAsync("#/nodes/"+r.index,t,(function(e){null==t.skin?e.parent=i:e.parent=o._rootBabylonMesh})))},c=this,d=0,f=r.children;d<f.length;d++){u(f[d])}return e(i),this._parent.onMeshLoadedObservable.notifyObservers(i),this.logClose(),Promise.all(a).then((function(){return i.setEnabled(!0),i}))},p.prototype._loadMeshAsync=function(e,t,n,r){var o=this,a=new Array;this.logOpen(e+" "+(n.name||""));var i=n.primitives;if(!i||0===i.length)throw new Error(e+": Primitives are missing");if(v.Assign(i),1===i.length){var s=i[0];a.push(this._loadMeshPrimitiveAsync(e+"/primitives/"+s.index,t,n,s,r))}else{t._primitiveBabylonMeshes=[];for(var l=0,u=i;l<u.length;l++){s=u[l];var c=new b.Mesh((n.name||r.name)+"_"+s.index,this.babylonScene,r);t._primitiveBabylonMeshes.push(c),a.push(this._loadMeshPrimitiveAsync(e+"/primitives/"+s.index,t,n,s,c)),this._parent.onMeshLoadedObservable.notifyObservers(r)}}if(null!=t.skin){var d=v.Get(e+"/skin",this.gltf.skins,t.skin);a.push(this._loadSkinAsync("#/skins/"+d.index,t,d))}return this.logClose(),Promise.all(a).then((function(){o._forEachPrimitive(t,(function(e){e._refreshBoundingInfo(!0)}))}))},p.prototype._loadMeshPrimitiveAsync=function(t,e,n,r,o){var a=this,i=new Array;this.logOpen(""+t),this._createMorphTargets(t,e,n,r,o),i.push(this._loadVertexDataAsync(t,r,o).then((function(e){return a._loadMorphTargetsAsync(t,r,o,e).then((function(){e.applyToMesh(o)}))})));var s=p._GetDrawMode(t,r.mode);if(null==r.material){var l=this._defaultBabylonMaterialData[s];l||(l=this._createDefaultMaterial("__gltf_default",s),this._parent.onMaterialLoadedObservable.notifyObservers(l),this._defaultBabylonMaterialData[s]=l),o.material=l}else{var u=v.Get(t+"/material",this.gltf.materials,r.material);i.push(this._loadMaterialAsync("#/materials/"+u.index,u,o,s,(function(e){o.material=e})))}return this.logClose(),Promise.all(i).then((function(){}))},p.prototype._loadVertexDataAsync=function(o,e,a){var i=this,t=this._extensionsLoadVertexDataAsync(o,e,a);if(t)return t;var s=e.attributes;if(!s)throw new Error(o+": Attributes are missing");var l=new Array,u=new b.Geometry(a.name,this.babylonScene);if(null==e.indices)a.isUnIndexed=!0;else{var n=v.Get(o+"/indices",this.gltf.accessors,e.indices);l.push(this._loadIndicesAccessorAsync("#/accessors/"+n.index,n).then((function(e){u.setIndices(e)})))}var r=function(e,t,n){if(null!=s[e]){a._delayInfo=a._delayInfo||[],-1===a._delayInfo.indexOf(t)&&a._delayInfo.push(t);var r=v.Get(o+"/attributes/"+e,i.gltf.accessors,s[e]);l.push(i._loadVertexAccessorAsync("#/accessors/"+r.index,r,t).then((function(e){u.setVerticesBuffer(e,r.count)}))),n&&n(r)}};return r("POSITION",b.VertexBuffer.PositionKind),r("NORMAL",b.VertexBuffer.NormalKind),r("TANGENT",b.VertexBuffer.TangentKind),r("TEXCOORD_0",b.VertexBuffer.UVKind),r("TEXCOORD_1",b.VertexBuffer.UV2Kind),r("JOINTS_0",b.VertexBuffer.MatricesIndicesKind),r("WEIGHTS_0",b.VertexBuffer.MatricesWeightsKind),r("COLOR_0",b.VertexBuffer.ColorKind,(function(e){"VEC4"===e.type&&(a.hasVertexAlpha=!0)})),Promise.all(l).then((function(){return u}))},p.prototype._createMorphTargets=function(e,t,n,r,o){if(r.targets){if(null==t._numMorphTargets)t._numMorphTargets=r.targets.length;else if(r.targets.length!==t._numMorphTargets)throw new Error(e+": Primitives do not have the same number of targets");o.morphTargetManager=new b.MorphTargetManager;for(var a=0;a<r.targets.length;a++){var i=t.weights?t.weights[a]:n.weights?n.weights[a]:0;o.morphTargetManager.addTarget(new b.MorphTarget("morphTarget"+a,i))}}},p.prototype._loadMorphTargetsAsync=function(e,t,n,r){if(!t.targets)return Promise.resolve();for(var o=new Array,a=n.morphTargetManager,i=0;i<a.numTargets;i++){var s=a.getTarget(i);o.push(this._loadMorphTargetVertexDataAsync(e+"/targets/"+i,r,t.targets[i],s))}return Promise.all(o).then((function(){}))},p.prototype._loadMorphTargetVertexDataAsync=function(a,i,s,t){var l=this,u=new Array,e=function(e,t,n){if(null!=s[e]){var r=i.getVertexBuffer(t);if(r){var o=v.Get(a+"/"+e,l.gltf.accessors,s[e]);u.push(l._loadFloatAccessorAsync("#/accessors/"+o.index,o).then((function(e){n(r,e)})))}}};return e("POSITION",b.VertexBuffer.PositionKind,(function(e,n){e.forEach(n.length,(function(e,t){n[t]+=e})),t.setPositions(n)})),e("NORMAL",b.VertexBuffer.NormalKind,(function(e,n){e.forEach(n.length,(function(e,t){n[t]+=e})),t.setNormals(n)})),e("TANGENT",b.VertexBuffer.TangentKind,(function(e,n){var r=0;e.forEach(n.length/3*4,(function(e,t){(t+1)%4!=0&&(n[r++]+=e)})),t.setTangents(n)})),Promise.all(u).then((function(){}))},p._LoadTransform=function(e,t){var n=b.Vector3.Zero(),r=b.Quaternion.Identity(),o=b.Vector3.One();e.matrix?b.Matrix.FromArray(e.matrix).decompose(o,r,n):(e.translation&&(n=b.Vector3.FromArray(e.translation)),e.rotation&&(r=b.Quaternion.FromArray(e.rotation)),e.scale&&(o=b.Vector3.FromArray(e.scale)));t.position=n,t.rotationQuaternion=r,t.scaling=o},p.prototype._loadSkinAsync=function(e,n,t){var r=this,o=function(t){r._forEachPrimitive(n,(function(e){e.skeleton=t})),n._babylonMesh.position=b.Vector3.Zero(),n._babylonMesh.rotationQuaternion=b.Quaternion.Identity(),n._babylonMesh.scaling=b.Vector3.One()};if(t._promise)return t._promise.then((function(){o(t._babylonSkeleton)}));var a="skeleton"+t.index,i=new b.Skeleton(t.name||a,a,this.babylonScene);return t._babylonSkeleton=i,this._loadBones(e,t),o(i),t._promise=this._loadSkinInverseBindMatricesDataAsync(e,t).then((function(e){r._updateBoneMatrices(i,e)}))},p.prototype._loadBones=function(e,t){for(var n={},r=0,o=t.joints;r<o.length;r++){var a=o[r],i=v.Get(e+"/joints/"+a,this.gltf.nodes,a);this._loadBone(i,t,n)}},p.prototype._loadBone=function(e,t,n){var r=n[e.index];if(r)return r;var o=null;e.parent&&e.parent._babylonMesh!==this._rootBabylonMesh&&(o=this._loadBone(e.parent,t,n));var a=t.joints.indexOf(e.index);return r=new b.Bone(e.name||"joint"+e.index,t._babylonSkeleton,o,this._getNodeMatrix(e),null,null,a),n[e.index]=r,e._babylonBones=e._babylonBones||[],e._babylonBones.push(r),r},p.prototype._loadSkinInverseBindMatricesDataAsync=function(e,t){if(null==t.inverseBindMatrices)return Promise.resolve(null);var n=v.Get(e+"/inverseBindMatrices",this.gltf.accessors,t.inverseBindMatrices);return this._loadFloatAccessorAsync("#/accessors/"+n.index,n)},p.prototype._updateBoneMatrices=function(e,t){for(var n=0,r=e.bones;n<r.length;n++){var o=r[n],a=b.Matrix.Identity(),i=o._index;t&&-1!==i&&(b.Matrix.FromArrayToRef(t,16*i,a),a.invertToRef(a));var s=o.getParent();s&&a.multiplyToRef(s.getInvertedAbsoluteTransform(),a),o.updateMatrix(a,!1,!1),o._updateDifferenceMatrix(void 0,!1)}},p.prototype._getNodeMatrix=function(e){return e.matrix?b.Matrix.FromArray(e.matrix):b.Matrix.Compose(e.scale?b.Vector3.FromArray(e.scale):b.Vector3.One(),e.rotation?b.Quaternion.FromArray(e.rotation):b.Quaternion.Identity(),e.translation?b.Vector3.FromArray(e.translation):b.Vector3.Zero())},p.prototype.loadCameraAsync=function(e,t,n){void 0===n&&(n=function(){});var r=this._extensionsLoadCameraAsync(e,t,n);if(r)return r;var o=new Array;this.logOpen(e+" "+(t.name||""));var a=new b.FreeCamera(t.name||"camera"+t.index,b.Vector3.Zero(),this.babylonScene,!1);switch(a.rotation=new b.Vector3(0,Math.PI,0),t.type){case"perspective":var i=t.perspective;if(!i)throw new Error(e+": Camera perspective properties are missing");a.fov=i.yfov,a.minZ=i.znear,a.maxZ=i.zfar||Number.MAX_VALUE;break;case"orthographic":if(!t.orthographic)throw new Error(e+": Camera orthographic properties are missing");a.mode=b.Camera.ORTHOGRAPHIC_CAMERA,a.orthoLeft=-t.orthographic.xmag,a.orthoRight=t.orthographic.xmag,a.orthoBottom=-t.orthographic.ymag,a.orthoTop=t.orthographic.ymag,a.minZ=t.orthographic.znear,a.maxZ=t.orthographic.zfar;break;default:throw new Error(e+": Invalid camera type ("+t.type+")")}return n(a),this._parent.onCameraLoadedObservable.notifyObservers(a),Promise.all(o).then((function(){return a}))},p.prototype._loadAnimationsAsync=function(){var e=this.gltf.animations;if(!e)return Promise.resolve();for(var t=new Array,n=0;n<e.length;n++){var r=e[n];t.push(this.loadAnimationAsync("#/animations/"+r.index,r))}return Promise.all(t).then((function(){}))},p.prototype.loadAnimationAsync=function(e,t){var n=this._extensionsLoadAnimationAsync(e,t);if(n)return n;var r=new b.AnimationGroup(t.name||"animation"+t.index,this.babylonScene);t._babylonAnimationGroup=r;var o=new Array;v.Assign(t.channels),v.Assign(t.samplers);for(var a=0,i=t.channels;a<i.length;a++){var s=i[a];o.push(this._loadAnimationChannelAsync(e+"/channels/"+s.index,e,t,s,r))}return Promise.all(o).then((function(){return r.normalize(0),r}))},p.prototype._loadAnimationChannelAsync=function(m,e,t,_,y){var A=this,g=v.Get(m+"/target/node",this.gltf.nodes,_.target.node);if("weights"===_.target.path&&!g._numMorphTargets||"weights"!==_.target.path&&!g._babylonMesh)return Promise.resolve();if(null!=g.skin&&"weights"!==_.target.path)return Promise.resolve();var n=v.Get(m+"/sampler",t.samplers,_.sampler);return this._loadAnimationSamplerAsync(e+"/samplers/"+_.sampler,n).then((function(n){var t,a;switch(_.target.path){case"translation":t="position",a=b.Animation.ANIMATIONTYPE_VECTOR3;break;case"rotation":t="rotationQuaternion",a=b.Animation.ANIMATIONTYPE_QUATERNION;break;case"scale":t="scaling",a=b.Animation.ANIMATIONTYPE_VECTOR3;break;case"weights":t="influence",a=b.Animation.ANIMATIONTYPE_FLOAT;break;default:throw new Error(m+"/target/path: Invalid value ("+_.target.path+")")}var r,e,o=0;switch(t){case"position":r=function(){var e=b.Vector3.FromArray(n.output,o);return o+=3,e};break;case"rotationQuaternion":r=function(){var e=b.Quaternion.FromArray(n.output,o);return o+=4,e};break;case"scaling":r=function(){var e=b.Vector3.FromArray(n.output,o);return o+=3,e};break;case"influence":r=function(){for(var e=new Array(g._numMorphTargets),t=0;t<g._numMorphTargets;t++)e[t]=n.output[o++];return e}}switch(n.interpolation){case"STEP":e=function(e){return{frame:n.input[e],value:r(),interpolation:b.AnimationKeyInterpolation.STEP}};break;case"LINEAR":e=function(e){return{frame:n.input[e],value:r()}};break;case"CUBICSPLINE":e=function(e){return{frame:n.input[e],inTangent:r(),value:r(),outTangent:r()}}}for(var i=new Array(n.input.length),s=0;s<n.input.length;s++)i[s]=e(s);if("influence"===t)for(var l=function(r){var e=y.name+"_channel"+y.targetedAnimations.length,o=new b.Animation(e,t,1,a);o.setKeys(i.map((function(e){return{frame:e.frame,inTangent:e.inTangent?e.inTangent[r]:void 0,value:e.value[r],outTangent:e.outTangent?e.outTangent[r]:void 0}}))),A._forEachPrimitive(g,(function(e){var t=e.morphTargetManager.getTarget(r),n=o.clone();t.animations.push(n),y.addTargetedAnimation(n,t)}))},u=0;u<g._numMorphTargets;u++)l(u);else{var c=y.name+"_channel"+y.targetedAnimations.length,d=new b.Animation(c,t,1,a);if(d.setKeys(i),g._babylonBones){for(var f=[g._babylonMesh].concat(g._babylonBones),h=0,p=f;h<p.length;h++){p[h].animations.push(d)}y.addTargetedAnimation(d,f)}else g._babylonMesh.animations.push(d),y.addTargetedAnimation(d,g._babylonMesh)}}))},p.prototype._loadAnimationSamplerAsync=function(e,t){if(t._data)return t._data;var r=t.interpolation||"LINEAR";switch(r){case"STEP":case"LINEAR":case"CUBICSPLINE":break;default:throw new Error(e+"/interpolation: Invalid value ("+t.interpolation+")")}var n=v.Get(e+"/input",this.gltf.accessors,t.input),o=v.Get(e+"/output",this.gltf.accessors,t.output);return t._data=Promise.all([this._loadFloatAccessorAsync("#/accessors/"+n.index,n),this._loadFloatAccessorAsync("#/accessors/"+o.index,o)]).then((function(e){var t=e[0],n=e[1];return{input:t,interpolation:r,output:n}})),t._data},p.prototype._loadBufferAsync=function(e,t){if(t._data)return t._data;if(!t.uri)throw new Error(e+"/uri: Value is missing");return t._data=this.loadUriAsync(e+"/uri",t.uri),t._data},p.prototype.loadBufferViewAsync=function(t,n){if(n._data)return n._data;var e=v.Get(t+"/buffer",this.gltf.buffers,n.buffer);return n._data=this._loadBufferAsync("#/buffers/"+e.index,e).then((function(e){try{return new Uint8Array(e.buffer,e.byteOffset+(n.byteOffset||0),n.byteLength)}catch(e){throw new Error(t+": "+e.message)}})),n._data},p.prototype._loadIndicesAccessorAsync=function(t,n){if("SCALAR"!==n.type)throw new Error(t+"/type: Invalid value "+n.type);if(5121!==n.componentType&&5123!==n.componentType&&5125!==n.componentType)throw new Error(t+"/componentType: Invalid value "+n.componentType);if(n._data)return n._data;var e=v.Get(t+"/bufferView",this.gltf.bufferViews,n.bufferView);return n._data=this.loadBufferViewAsync("#/bufferViews/"+e.index,e).then((function(e){return p._GetTypedArray(t,n.componentType,e,n.byteOffset,n.count)})),n._data},p.prototype._loadFloatAccessorAsync=function(c,d){var n=this;if(5126!==d.componentType)throw new Error("Invalid component type "+d.componentType);if(d._data)return d._data;var f=p._GetNumComponents(c,d.type),t=f*d.count;if(null==d.bufferView)d._data=Promise.resolve(new Float32Array(t));else{var e=v.Get(c+"/bufferView",this.gltf.bufferViews,d.bufferView);d._data=this.loadBufferViewAsync("#/bufferViews/"+e.index,e).then((function(e){return p._GetTypedArray(c,d.componentType,e,d.byteOffset,t)}))}if(d.sparse){var h=d.sparse;d._data=d._data.then((function(u){var e=v.Get(c+"/sparse/indices/bufferView",n.gltf.bufferViews,h.indices.bufferView),t=v.Get(c+"/sparse/values/bufferView",n.gltf.bufferViews,h.values.bufferView);return Promise.all([n.loadBufferViewAsync("#/bufferViews/"+e.index,e),n.loadBufferViewAsync("#/bufferViews/"+t.index,t)]).then((function(e){for(var t=e[0],n=e[1],r=p._GetTypedArray(c+"/sparse/indices",h.indices.componentType,t,h.indices.byteOffset,h.count),o=p._GetTypedArray(c+"/sparse/values",d.componentType,n,h.values.byteOffset,f*h.count),a=0,i=0;i<r.length;i++)for(var s=r[i]*f,l=0;l<f;l++)u[s++]=o[a++];return u}))}))}return d._data},p.prototype._loadVertexBufferViewAsync=function(e,t){var n=this;return e._babylonBuffer||(e._babylonBuffer=this.loadBufferViewAsync("#/bufferViews/"+e.index,e).then((function(e){return new b.Buffer(n.babylonScene.getEngine(),e,!1)}))),e._babylonBuffer},p.prototype._loadVertexAccessorAsync=function(n,r,o){var a=this;if(r._babylonVertexBuffer)return r._babylonVertexBuffer;if(r.sparse)r._babylonVertexBuffer=this._loadFloatAccessorAsync("#/accessors/"+r.index,r).then((function(e){return new b.VertexBuffer(a.babylonScene.getEngine(),e,o,!1)}));else if(r.byteOffset&&r.byteOffset%b.VertexBuffer.GetTypeByteLength(r.componentType)!=0)b.Tools.Warn("Accessor byte offset is not a multiple of component type byte length"),r._babylonVertexBuffer=this._loadFloatAccessorAsync("#/accessors/"+r.index,r).then((function(e){return new b.VertexBuffer(a.babylonScene.getEngine(),e,o,!1)}));else{var i=v.Get(n+"/bufferView",this.gltf.bufferViews,r.bufferView);r._babylonVertexBuffer=this._loadVertexBufferViewAsync(i,o).then((function(e){var t=p._GetNumComponents(n,r.type);return new b.VertexBuffer(a.babylonScene.getEngine(),e,o,!1,!1,i.byteStride,!1,r.byteOffset,t,r.componentType,r.normalized,!0)}))}return r._babylonVertexBuffer},p.prototype._loadMaterialMetallicRoughnessPropertiesAsync=function(e,t,n){if(!(n instanceof b.PBRMaterial))throw new Error(e+": Material type not supported");var r=new Array;return t&&(t.baseColorFactor?(n.albedoColor=b.Color3.FromArray(t.baseColorFactor),n.alpha=t.baseColorFactor[3]):n.albedoColor=b.Color3.White(),n.metallic=null==t.metallicFactor?1:t.metallicFactor,n.roughness=null==t.roughnessFactor?1:t.roughnessFactor,t.baseColorTexture&&r.push(this.loadTextureInfoAsync(e+"/baseColorTexture",t.baseColorTexture,(function(e){n.albedoTexture=e}))),t.metallicRoughnessTexture&&(r.push(this.loadTextureInfoAsync(e+"/metallicRoughnessTexture",t.metallicRoughnessTexture,(function(e){n.metallicTexture=e}))),n.useMetallnessFromMetallicTextureBlue=!0,n.useRoughnessFromMetallicTextureGreen=!0,n.useRoughnessFromMetallicTextureAlpha=!1)),Promise.all(r).then((function(){}))},p.prototype._loadMaterialAsync=function(e,t,n,r,o){void 0===o&&(o=function(){});var a=this._extensionsLoadMaterialAsync(e,t,n,r,o);if(a)return a;t._babylonData=t._babylonData||{};var i=t._babylonData[r];if(!i){this.logOpen(e+" "+(t.name||""));var s=this.createMaterial(e,t,r);i={material:s,meshes:[],promise:this.loadMaterialPropertiesAsync(e,t,s)},t._babylonData[r]=i,this._parent.onMaterialLoadedObservable.notifyObservers(s),this.logClose()}return i.meshes.push(n),n.onDisposeObservable.addOnce((function(){var e=i.meshes.indexOf(n);-1!==e&&i.meshes.splice(e,1)})),o(i.material),i.promise.then((function(){return i.material}))},p.prototype._createDefaultMaterial=function(e,t){var n=new b.PBRMaterial(e,this.babylonScene);return n.sideOrientation=this.babylonScene.useRightHandedSystem?b.Material.CounterClockWiseSideOrientation:b.Material.ClockWiseSideOrientation,n.fillMode=t,n.enableSpecularAntiAliasing=!0,n.useRadianceOverAlpha=!this._parent.transparencyAsCoverage,n.useSpecularOverAlpha=!this._parent.transparencyAsCoverage,n.transparencyMode=b.PBRMaterial.PBRMATERIAL_OPAQUE,n.metallic=1,n.roughness=1,n},p.prototype.createMaterial=function(e,t,n){var r=this._extensionsCreateMaterial(e,t,n);if(r)return r;var o=t.name||"material"+t.index;return this._createDefaultMaterial(o,n)},p.prototype.loadMaterialPropertiesAsync=function(e,t,n){var r=this._extensionsLoadMaterialPropertiesAsync(e,t,n);if(r)return r;var o=new Array;return o.push(this.loadMaterialBasePropertiesAsync(e,t,n)),t.pbrMetallicRoughness&&o.push(this._loadMaterialMetallicRoughnessPropertiesAsync(e+"/pbrMetallicRoughness",t.pbrMetallicRoughness,n)),this.loadMaterialAlphaProperties(e,t,n),Promise.all(o).then((function(){}))},p.prototype.loadMaterialBasePropertiesAsync=function(e,t,n){if(!(n instanceof b.PBRMaterial))throw new Error(e+": Material type not supported");var r=new Array;return n.emissiveColor=t.emissiveFactor?b.Color3.FromArray(t.emissiveFactor):new b.Color3(0,0,0),t.doubleSided&&(n.backFaceCulling=!1,n.twoSidedLighting=!0),t.normalTexture&&(r.push(this.loadTextureInfoAsync(e+"/normalTexture",t.normalTexture,(function(e){n.bumpTexture=e}))),n.invertNormalMapX=!this.babylonScene.useRightHandedSystem,n.invertNormalMapY=this.babylonScene.useRightHandedSystem,null!=t.normalTexture.scale&&(n.bumpTexture.level=t.normalTexture.scale)),t.occlusionTexture&&(r.push(this.loadTextureInfoAsync(e+"/occlusionTexture",t.occlusionTexture,(function(e){n.ambientTexture=e}))),n.useAmbientInGrayScale=!0,null!=t.occlusionTexture.strength&&(n.ambientTextureStrength=t.occlusionTexture.strength)),t.emissiveTexture&&r.push(this.loadTextureInfoAsync(e+"/emissiveTexture",t.emissiveTexture,(function(e){n.emissiveTexture=e}))),Promise.all(r).then((function(){}))},p.prototype.loadMaterialAlphaProperties=function(e,t,n){if(!(n instanceof b.PBRMaterial))throw new Error(e+": Material type not supported");switch(t.alphaMode||"OPAQUE"){case"OPAQUE":n.transparencyMode=b.PBRMaterial.PBRMATERIAL_OPAQUE;break;case"MASK":n.transparencyMode=b.PBRMaterial.PBRMATERIAL_ALPHATEST,n.alphaCutOff=null==t.alphaCutoff?.5:t.alphaCutoff,n.albedoTexture&&(n.albedoTexture.hasAlpha=!0);break;case"BLEND":n.transparencyMode=b.PBRMaterial.PBRMATERIAL_ALPHABLEND,n.albedoTexture&&(n.albedoTexture.hasAlpha=!0,n.useAlphaFromAlbedoTexture=!0);break;default:throw new Error(e+"/alphaMode: Invalid value ("+t.alphaMode+")")}},p.prototype.loadTextureInfoAsync=function(e,t,n){void 0===n&&(n=function(){});var r=this._extensionsLoadTextureInfoAsync(e,t,n);if(r)return r;this.logOpen(""+e);var o=v.Get(e+"/index",this.gltf.textures,t.index),a=this._loadTextureAsync("#/textures/"+t.index,o,(function(e){e.coordinatesIndex=t.texCoord||0,n(e)}));return this.logClose(),a},p.prototype._loadTextureAsync=function(n,e,t){var r=this;void 0===t&&(t=function(){});var o=new Array;this.logOpen(n+" "+(e.name||""));var a=null==e.sampler?p._DefaultSampler:v.Get(n+"/sampler",this.gltf.samplers,e.sampler),i=this._loadSampler("#/samplers/"+a.index,a),s=new b.Deferred,l=new b.Texture(null,this.babylonScene,i.noMipMaps,!1,i.samplingMode,function(){r._disposed||s.resolve()},function(e,t){r._disposed||s.reject(new Error(n+": "+(t&&t.message?t.message:e||"Failed to load texture")))});o.push(s.promise),l.name=e.name||"texture"+e.index,l.wrapU=i.wrapU,l.wrapV=i.wrapV;var u=v.Get(n+"/source",this.gltf.images,e.source);return o.push(this.loadImageAsync("#/images/"+u.index,u).then((function(e){var t=u.uri||r._fileName+"#image"+u.index,n="data:"+r._uniqueRootUrl+t;l.updateURL(n,new Blob([e],{type:u.mimeType}))}))),t(l),this._parent.onTextureLoadedObservable.notifyObservers(l),this.logClose(),Promise.all(o).then((function(){return l}))},p.prototype._loadSampler=function(e,t){return t._data||(t._data={noMipMaps:9728===t.minFilter||9729===t.minFilter,samplingMode:p._GetTextureSamplingMode(e,t),wrapU:p._GetTextureWrapMode(e+"/wrapS",t.wrapS),wrapV:p._GetTextureWrapMode(e+"/wrapT",t.wrapT)}),t._data},p.prototype.loadImageAsync=function(e,t){if(!t._data){if(this.logOpen(e+" "+(t.name||"")),t.uri)t._data=this.loadUriAsync(e+"/uri",t.uri);else{var n=v.Get(e+"/bufferView",this.gltf.bufferViews,t.bufferView);t._data=this.loadBufferViewAsync("#/bufferViews/"+n.index,n)}this.logClose()}return t._data},p.prototype.loadUriAsync=function(o,a){var i=this,e=this._extensionsLoadUriAsync(o,a);if(e)return e;if(!p._ValidateUri(a))throw new Error(o+": '"+a+"' is invalid");if(b.Tools.IsBase64(a)){var t=new Uint8Array(b.Tools.DecodeBase64(a));return this.log("Decoded "+a.substr(0,64)+"... ("+t.length+" bytes)"),Promise.resolve(t)}return this.log("Loading "+a),this._parent.preprocessUrlAsync(this._rootUrl+a).then((function(e){return new Promise(function(n,r){if(!i._disposed){var t=b.Tools.LoadFile(e,(function(e){if(!i._disposed){var t=new Uint8Array(e);i.log("Loaded "+a+" ("+t.length+" bytes)"),n(t)}}),(function(e){if(!i._disposed&&(t&&(t._lengthComputable=e.lengthComputable,t._loaded=e.loaded,t._total=e.total),i._state===b.GLTFLoaderState.LOADING))try{i._onProgress()}catch(e){r(e)}}),i.babylonScene.database,!0,(function(e,t){i._disposed||r(new b.LoadFileError(o+": Failed to load '"+a+"'"+(e?": "+e.status+" "+e.statusText:""),e))}));i._requests.push(t)}})}))},p.prototype._onProgress=function(){if(this._progressCallback){for(var e=!0,t=0,n=0,r=0,o=this._requests;r<o.length;r++){var a=o[r];if(void 0===a._lengthComputable||void 0===a._loaded||void 0===a._total)return;e=e&&a._lengthComputable,t+=a._loaded,n+=a._total}this._progressCallback(new b.SceneLoaderProgressEvent(e,t,e?n:0))}},p._GetTextureWrapMode=function(e,t){switch(t=null==t?10497:t){case 33071:return b.Texture.CLAMP_ADDRESSMODE;case 33648:return b.Texture.MIRROR_ADDRESSMODE;case 10497:return b.Texture.WRAP_ADDRESSMODE;default:return b.Tools.Warn(e+": Invalid value ("+t+")"),b.Texture.WRAP_ADDRESSMODE}},p._GetTextureSamplingMode=function(e,t){var n=null==t.magFilter?9729:t.magFilter,r=null==t.minFilter?9987:t.minFilter;if(9729===n)switch(r){case 9728:return b.Texture.LINEAR_NEAREST;case 9729:return b.Texture.LINEAR_LINEAR;case 9984:return b.Texture.LINEAR_NEAREST_MIPNEAREST;case 9985:return b.Texture.LINEAR_LINEAR_MIPNEAREST;case 9986:return b.Texture.LINEAR_NEAREST_MIPLINEAR;case 9987:return b.Texture.LINEAR_LINEAR_MIPLINEAR;default:return b.Tools.Warn(e+"/minFilter: Invalid value ("+r+")"),b.Texture.LINEAR_LINEAR_MIPLINEAR}else switch(9728!==n&&b.Tools.Warn(e+"/magFilter: Invalid value ("+n+")"),r){case 9728:return b.Texture.NEAREST_NEAREST;case 9729:return b.Texture.NEAREST_LINEAR;case 9984:return b.Texture.NEAREST_NEAREST_MIPNEAREST;case 9985:return b.Texture.NEAREST_LINEAR_MIPNEAREST;case 9986:return b.Texture.NEAREST_NEAREST_MIPLINEAR;case 9987:return b.Texture.NEAREST_LINEAR_MIPLINEAR;default:return b.Tools.Warn(e+"/minFilter: Invalid value ("+r+")"),b.Texture.NEAREST_NEAREST_MIPNEAREST}},p._GetTypedArray=function(t,e,n,r,o){var a=n.buffer;r=n.byteOffset+(r||0);try{switch(e){case 5120:return new Int8Array(a,r,o);case 5121:return new Uint8Array(a,r,o);case 5122:return new Int16Array(a,r,o);case 5123:return new Uint16Array(a,r,o);case 5125:return new Uint32Array(a,r,o);case 5126:return new Float32Array(a,r,o);default:throw new Error("Invalid component type "+e)}}catch(e){throw new Error(t+": "+e)}},p._GetNumComponents=function(e,t){switch(t){case"SCALAR":return 1;case"VEC2":return 2;case"VEC3":return 3;case"VEC4":case"MAT2":return 4;case"MAT3":return 9;case"MAT4":return 16}throw new Error(e+": Invalid type ("+t+")")},p._ValidateUri=function(e){return b.Tools.IsBase64(e)||-1===e.indexOf("..")},p._GetDrawMode=function(e,t){switch(null==t&&(t=4),t){case 0:return b.Material.PointListDrawMode;case 1:return b.Material.LineListDrawMode;case 2:return b.Material.LineLoopDrawMode;case 3:return b.Material.LineStripDrawMode;case 4:return b.Material.TriangleFillMode;case 5:return b.Material.TriangleStripDrawMode;case 6:return b.Material.TriangleFanDrawMode}throw new Error(e+": Invalid mesh primitive mode ("+t+")")},p.prototype._compileMaterialsAsync=function(){var e=this;this._parent._startPerformanceCounter("Compile materials");var t=new Array;if(this.gltf.materials)for(var n=0,r=this.gltf.materials;n<r.length;n++){var o=r[n];if(o._babylonData)for(var a in o._babylonData)for(var i=o._babylonData[a],s=0,l=i.meshes;s<l.length;s++){var u=l[s];u.computeWorldMatrix(!0);var c=i.material;t.push(c.forceCompilationAsync(u)),this._parent.useClipPlane&&t.push(c.forceCompilationAsync(u,{clipPlane:!0}))}}return Promise.all(t).then((function(){e._parent._endPerformanceCounter("Compile materials")}))},p.prototype._compileShadowGeneratorsAsync=function(){var e=this;this._parent._startPerformanceCounter("Compile shadow generators");for(var t=new Array,n=0,r=this.babylonScene.lights;n<r.length;n++){var o=r[n].getShadowGenerator();o&&t.push(o.forceCompilationAsync())}return Promise.all(t).then((function(){e._parent._endPerformanceCounter("Compile shadow generators")}))},p.prototype._forEachExtensions=function(e){for(var t=0,n=p._ExtensionNames;t<n.length;t++){var r=n[t],o=this._extensions[r];o.enabled&&e(o)}},p.prototype._applyExtensions=function(e,t){for(var n=0,r=p._ExtensionNames;n<r.length;n++){var o=r[n],a=this._extensions[o];if(a.enabled){var i=e;i._activeLoaderExtensions=i._activeLoaderExtensions||{};var s=i._activeLoaderExtensions;if(!s[o]){s[o]=!0;try{var l=t(a);if(l)return l}finally{delete s[o]}}}}return null},p.prototype._extensionsOnLoading=function(){this._forEachExtensions((function(e){return e.onLoading&&e.onLoading()}))},p.prototype._extensionsOnReady=function(){this._forEachExtensions((function(e){return e.onReady&&e.onReady()}))},p.prototype._extensionsLoadSceneAsync=function(t,n){return this._applyExtensions(n,(function(e){return e.loadSceneAsync&&e.loadSceneAsync(t,n)}))},p.prototype._extensionsLoadNodeAsync=function(t,n,r){return this._applyExtensions(n,(function(e){return e.loadNodeAsync&&e.loadNodeAsync(t,n,r)}))},p.prototype._extensionsLoadCameraAsync=function(t,n,r){return this._applyExtensions(n,(function(e){return e.loadCameraAsync&&e.loadCameraAsync(t,n,r)}))},p.prototype._extensionsLoadVertexDataAsync=function(t,n,r){return this._applyExtensions(n,(function(e){return e._loadVertexDataAsync&&e._loadVertexDataAsync(t,n,r)}))},p.prototype._extensionsLoadMaterialAsync=function(t,n,r,o,a){return this._applyExtensions(n,(function(e){return e._loadMaterialAsync&&e._loadMaterialAsync(t,n,r,o,a)}))},p.prototype._extensionsCreateMaterial=function(t,n,r){return this._applyExtensions({},(function(e){return e.createMaterial&&e.createMaterial(t,n,r)}))},p.prototype._extensionsLoadMaterialPropertiesAsync=function(t,n,r){return this._applyExtensions(n,(function(e){return e.loadMaterialPropertiesAsync&&e.loadMaterialPropertiesAsync(t,n,r)}))},p.prototype._extensionsLoadTextureInfoAsync=function(t,n,r){return this._applyExtensions(n,(function(e){return e.loadTextureInfoAsync&&e.loadTextureInfoAsync(t,n,r)}))},p.prototype._extensionsLoadAnimationAsync=function(t,n){return this._applyExtensions(n,(function(e){return e.loadAnimationAsync&&e.loadAnimationAsync(t,n)}))},p.prototype._extensionsLoadUriAsync=function(t,n){return this._applyExtensions({},(function(e){return e._loadUriAsync&&e._loadUriAsync(t,n)}))},p.LoadExtensionAsync=function(e,t,n,r){if(!t.extensions)return null;var o=t.extensions[n];return o?r(e+"/extensions/"+n,o):null},p.LoadExtraAsync=function(e,t,n,r){if(!t.extras)return null;var o=t.extras[n];return o?r(e+"/extras/"+n,o):null},p.prototype.logOpen=function(e){this._parent._logOpen(e)},p.prototype.logClose=function(){this._parent._logClose()},p.prototype.log=function(e){this._parent._log(e)},p.prototype.startPerformanceCounter=function(e){this._parent._startPerformanceCounter(e)},p.prototype.endPerformanceCounter=function(e){this._parent._endPerformanceCounter(e)},p._DefaultSampler={index:-1},p._ExtensionNames=new Array,p._ExtensionFactories={},p})();e.GLTFLoader=t,b.GLTFFileLoader._CreateGLTFLoaderV2=function(e){return new t(e)}})(b.GLTF2||(b.GLTF2={}))})(BABYLON||(BABYLON={})),(function(l){var d,e,t,n,r;d=l.GLTF2||(l.GLTF2={}),e=d.Loader||(d.Loader={}),t=e.Extensions||(e.Extensions={}),n="MSFT_lod",r=(function(){function e(e){this.name=n,this.enabled=!0,this.maxLODsToLoad=Number.MAX_VALUE,this.onNodeLODsLoadedObservable=new l.Observable,this.onMaterialLODsLoadedObservable=new l.Observable,this._nodeIndexLOD=null,this._nodeSignalLODs=new Array,this._nodePromiseLODs=new Array,this._materialIndexLOD=null,this._materialSignalLODs=new Array,this._materialPromiseLODs=new Array,this._loader=e}return e.prototype.dispose=function(){delete this._loader,this._nodeIndexLOD=null,this._nodeSignalLODs.length=0,this._nodePromiseLODs.length=0,this._materialIndexLOD=null,this._materialSignalLODs.length=0,this._materialPromiseLODs.length=0,this.onMaterialLODsLoadedObservable.clear(),this.onNodeLODsLoadedObservable.clear()},e.prototype.onReady=function(){for(var n=this,e=function(e){var t=Promise.all(r._nodePromiseLODs[e]).then((function(){0!==e&&n._loader.endPerformanceCounter("Node LOD "+e),n._loader.log("Loaded node LOD "+e),n.onNodeLODsLoadedObservable.notifyObservers(e),e!==n._nodePromiseLODs.length-1&&(n._loader.startPerformanceCounter("Node LOD "+(e+1)),n._nodeSignalLODs[e]&&n._nodeSignalLODs[e].resolve())}));r._loader._completePromises.push(t)},r=this,t=0;t<this._nodePromiseLODs.length;t++)e(t);var o=function(e){var t=Promise.all(a._materialPromiseLODs[e]).then((function(){0!==e&&n._loader.endPerformanceCounter("Material LOD "+e),n._loader.log("Loaded material LOD "+e),n.onMaterialLODsLoadedObservable.notifyObservers(e),e!==n._materialPromiseLODs.length-1&&(n._loader.startPerformanceCounter("Material LOD "+(e+1)),n._materialSignalLODs[e]&&n._materialSignalLODs[e].resolve())}));a._loader._completePromises.push(t)},a=this;for(t=0;t<this._materialPromiseLODs.length;t++)o(t)},e.prototype.loadNodeAsync=function(e,i,t){var s=this;return d.GLTFLoader.LoadExtensionAsync(e,i,this.name,(function(e,t){var r,o=s._getLODs(e,i,s._loader.gltf.nodes,t.ids);s._loader.logOpen(""+e);for(var n=function(n){var e=o[n];0!==n&&(s._nodeIndexLOD=n,s._nodeSignalLODs[n]=s._nodeSignalLODs[n]||new l.Deferred);var t=s._loader.loadNodeAsync("#/nodes/"+e.index,e).then((function(e){if(0!==n){var t=o[n-1];t._babylonMesh&&(t._babylonMesh.dispose(),delete t._babylonMesh,s._disposeUnusedMaterials())}return e}));0===n?r=t:s._nodeIndexLOD=null,s._nodePromiseLODs[n]=s._nodePromiseLODs[n]||[],s._nodePromiseLODs[n].push(t)},a=0;a<o.length;a++)n(a);return s._loader.logClose(),r}))},e.prototype._loadMaterialAsync=function(e,i,s,l,u){var c=this;return this._nodeIndexLOD?null:d.GLTFLoader.LoadExtensionAsync(e,i,this.name,(function(e,t){var r,o=c._getLODs(e,i,c._loader.gltf.materials,t.ids);c._loader.logOpen(""+e);for(var n=function(n){var e=o[n];0!==n&&(c._materialIndexLOD=n);var t=c._loader._loadMaterialAsync("#/materials/"+e.index,e,s,l,(function(e){0===n&&u(e)})).then((function(e){if(0!==n){u(e);var t=o[n-1]._babylonData;t[l]&&(t[l].material.dispose(),delete t[l])}return e}));0===n?r=t:c._materialIndexLOD=null,c._materialPromiseLODs[n]=c._materialPromiseLODs[n]||[],c._materialPromiseLODs[n].push(t)},a=0;a<o.length;a++)n(a);return c._loader.logClose(),r}))},e.prototype._loadUriAsync=function(e,t){var n=this;if(null!==this._materialIndexLOD){this._loader.log("deferred");var r=this._materialIndexLOD-1;return this._materialSignalLODs[r]=this._materialSignalLODs[r]||new l.Deferred,this._materialSignalLODs[r].promise.then((function(){return n._loader.loadUriAsync(e,t)}))}return null!==this._nodeIndexLOD?(this._loader.log("deferred"),r=this._nodeIndexLOD-1,this._nodeSignalLODs[r]=this._nodeSignalLODs[r]||new l.Deferred,this._nodeSignalLODs[this._nodeIndexLOD-1].promise.then((function(){return n._loader.loadUriAsync(e,t)}))):null},e.prototype._getLODs=function(e,t,n,r){if(this.maxLODsToLoad<=0)throw new Error("maxLODsToLoad must be greater than zero");for(var o=new Array,a=r.length-1;0<=a;a--)if(o.push(d.ArrayItem.Get(e+"/ids/"+r[a],n,r[a])),o.length===this.maxLODsToLoad)return o;return o.push(t),o},e.prototype._disposeUnusedMaterials=function(){var e=this._loader.gltf.materials;if(e)for(var t=0,n=e;t<n.length;t++){var r=n[t];if(r._babylonData)for(var o in r._babylonData){var a=r._babylonData[o];0===a.meshes.length&&(a.material.dispose(!1,!0),delete r._babylonData[o])}}},e})(),t.MSFT_lod=r,d.GLTFLoader.RegisterExtension(n,(function(e){return new r(e)}))})(BABYLON||(BABYLON={})),(function(s){var t,e,n,r,o;t=s.GLTF2||(s.GLTF2={}),e=t.Loader||(t.Loader={}),n=e.Extensions||(e.Extensions={}),r="MSFT_minecraftMesh",o=(function(){function e(e){this.name=r,this.enabled=!0,this._loader=e}return e.prototype.dispose=function(){delete this._loader},e.prototype.loadMaterialPropertiesAsync=function(r,o,a){var i=this;return t.GLTFLoader.LoadExtraAsync(r,o,this.name,(function(e,t){if(t){if(!(a instanceof s.PBRMaterial))throw new Error(e+": Material type not supported");var n=i._loader.loadMaterialPropertiesAsync(r,o,a);return a.needAlphaBlending()&&(a.forceDepthWrite=!0,a.separateCullingPass=!0),a.backFaceCulling=a.forceDepthWrite,a.twoSidedLighting=!0,n}return null}))},e})(),n.MSFT_minecraftMesh=o,t.GLTFLoader.RegisterExtension(r,(function(e){return new o(e)}))})(BABYLON||(BABYLON={})),(function(s){var t,e,n,r,o;t=s.GLTF2||(s.GLTF2={}),e=t.Loader||(t.Loader={}),n=e.Extensions||(e.Extensions={}),r="MSFT_sRGBFactors",o=(function(){function e(e){this.name=r,this.enabled=!0,this._loader=e}return e.prototype.dispose=function(){delete this._loader},e.prototype.loadMaterialPropertiesAsync=function(r,o,a){var i=this;return t.GLTFLoader.LoadExtraAsync(r,o,this.name,(function(e,t){if(t){if(!(a instanceof s.PBRMaterial))throw new Error(e+": Material type not supported");var n=i._loader.loadMaterialPropertiesAsync(r,o,a);return a.albedoTexture||a.albedoColor.toLinearSpaceToRef(a.albedoColor),a.reflectivityTexture||a.reflectivityColor.toLinearSpaceToRef(a.reflectivityColor),n}return null}))},e})(),n.MSFT_sRGBFactors=o,t.GLTFLoader.RegisterExtension(r,(function(e){return new o(e)}))})(BABYLON||(BABYLON={})),(function(c){var d,e,t,n,r;d=c.GLTF2||(c.GLTF2={}),e=d.Loader||(d.Loader={}),t=e.Extensions||(e.Extensions={}),n="MSFT_audio_emitter",r=(function(){function e(e){this.name=n,this.enabled=!0,this._loader=e}return e.prototype.dispose=function(){delete this._loader,delete this._clips,delete this._emitters},e.prototype.onLoading=function(){var e=this._loader.gltf.extensions;if(e&&e[this.name]){var t=e[this.name];this._clips=t.clips,this._emitters=t.emitters,d.ArrayItem.Assign(this._clips),d.ArrayItem.Assign(this._emitters)}},e.prototype.loadSceneAsync=function(s,l){var u=this;return d.GLTFLoader.LoadExtensionAsync(s,l,this.name,(function(e,t){var n=new Array;n.push(u._loader.loadSceneAsync(s,l));for(var r=0,o=t.emitters;r<o.length;r++){var a=o[r],i=d.ArrayItem.Get(e+"/emitters",u._emitters,a);if(null!=i.refDistance||null!=i.maxDistance||null!=i.rolloffFactor||null!=i.distanceModel||null!=i.innerAngle||null!=i.outerAngle)throw new Error(e+": Direction or Distance properties are not allowed on emitters attached to a scene");n.push(u._loadEmitterAsync(e+"/emitters/"+i.index,i))}return Promise.all(n).then((function(){}))}))},e.prototype.loadNodeAsync=function(e,t,s){var l=this;return d.GLTFLoader.LoadExtensionAsync(e,t,this.name,(function(a,r){var i=new Array;return l._loader.loadNodeAsync(a,t,(function(o){for(var e=function(e){var r=d.ArrayItem.Get(a+"/emitters",l._emitters,e);i.push(l._loadEmitterAsync(a+"/emitters/"+r.index,r).then((function(){for(var e=0,t=r._babylonSounds;e<t.length;e++){var n=t[e];n.attachToMesh(o),null==r.innerAngle&&null==r.outerAngle||(n.setLocalDirectionToMesh(c.Vector3.Forward()),n.setDirectionalCone(2*c.Tools.ToDegrees(null==r.innerAngle?Math.PI:r.innerAngle),2*c.Tools.ToDegrees(null==r.outerAngle?Math.PI:r.outerAngle),0))}})))},t=0,n=r.emitters;t<n.length;t++)e(n[t]);s(o)})).then((function(e){return Promise.all(i).then((function(){return e}))}))}))},e.prototype.loadAnimationAsync=function(s,l){var u=this;return d.GLTFLoader.LoadExtensionAsync(s,l,this.name,(function(a,i){return u._loader.loadAnimationAsync(s,l).then((function(e){var t=new Array;d.ArrayItem.Assign(i.events);for(var n=0,r=i.events;n<r.length;n++){var o=r[n];t.push(u._loadAnimationEventAsync(a+"/events/"+o.index,s,l,o,e))}return Promise.all(t).then((function(){return e}))}))}))},e.prototype._loadClipAsync=function(e,t){if(t._objectURL)return t._objectURL;var n;if(t.uri)n=this._loader.loadUriAsync(e,t.uri);else{var r=d.ArrayItem.Get(e+"/bufferView",this._loader.gltf.bufferViews,t.bufferView);n=this._loader.loadBufferViewAsync("#/bufferViews/"+r.index,r)}return t._objectURL=n.then((function(e){return URL.createObjectURL(new Blob([e],{type:t.mimeType}))})),t._objectURL},e.prototype._loadEmitterAsync=function(e,r){var o=this;if(r._babylonSounds=r._babylonSounds||[],!r._babylonData){for(var a=new Array,i=r.name||"emitter"+r.index,s={loop:!1,autoplay:!1,volume:null==r.volume?1:r.volume},t=function(n){var e="#/extensions/"+l.name+"/clips",t=d.ArrayItem.Get(e,l._clips,r.clips[n].clip);a.push(l._loadClipAsync(e+"/"+r.clips[n].clip,t).then((function(e){var t=r._babylonSounds[n]=new c.Sound(i,e,o._loader.babylonScene,null,s);t.refDistance=r.refDistance||1,t.maxDistance=r.maxDistance||256,t.rolloffFactor=r.rolloffFactor||1,t.distanceModel=r.distanceModel||"exponential",t._positionInEmitterSpace=!0})))},l=this,n=0;n<r.clips.length;n++)t(n);var u=Promise.all(a).then((function(){var e=r.clips.map((function(e){return e.weight||1})),t=new c.WeightedSound(r.loop||!1,r._babylonSounds,e);r.innerAngle&&(t.directionalConeInnerAngle=2*c.Tools.ToDegrees(r.innerAngle)),r.outerAngle&&(t.directionalConeOuterAngle=2*c.Tools.ToDegrees(r.outerAngle)),r.volume&&(t.volume=r.volume),r._babylonData.sound=t}));r._babylonData={loaded:u}}return r._babylonData.loaded},e.prototype._getEventAction=function(e,n,t,r,o){switch(t){case"play":return function(e){var t=(o||0)+(e-r);n.play(t)};case"stop":return function(e){n.stop()};case"pause":return function(e){n.pause()};default:throw new Error(e+": Unsupported action "+t)}},e.prototype._loadAnimationEventAsync=function(n,e,t,r,o){var a=this;if(0==o.targetedAnimations.length)return Promise.resolve();var i=o.targetedAnimations[0],s=r.emitter,l=d.ArrayItem.Get("#/extensions/"+this.name+"/emitters",this._emitters,s);return this._loadEmitterAsync(n,l).then((function(){var e=l._babylonData.sound;if(e){var t=new c.AnimationEvent(r.time,a._getEventAction(n,e,r.action,r.time,r.startOffset));i.animation.addEvent(t),o.onAnimationGroupEndObservable.add((function(){e.stop()})),o.onAnimationGroupPauseObservable.add((function(){e.pause()}))}}))},e})(),t.MSFT_audio_emitter=r,d.GLTFLoader.RegisterExtension(n,(function(e){return new r(e)}))})(BABYLON||(BABYLON={})),(function(u){var c,e,t,n,r;c=u.GLTF2||(u.GLTF2={}),e=c.Loader||(c.Loader={}),t=e.Extensions||(e.Extensions={}),n="KHR_draco_mesh_compression",r=(function(){function e(e){this.name=n,this.enabled=u.DracoCompression.DecoderAvailable,this._loader=e}return e.prototype.dispose=function(){this._dracoCompression&&(this._dracoCompression.dispose(),delete this._dracoCompression),delete this._loader},e.prototype._loadVertexDataAsync=function(a,i,s){var l=this;return c.GLTFLoader.LoadExtensionAsync(a,i,this.name,(function(e,r){if(null!=i.mode){if(5!==i.mode&&4!==i.mode)throw new Error(a+": Unsupported mode "+i.mode);if(5===i.mode)throw new Error(a+": Mode "+i.mode+" is not currently supported")}var o={},t=function(e,t){var n=r.attributes[e];null!=n&&(s._delayInfo=s._delayInfo||[],-1===s._delayInfo.indexOf(t)&&s._delayInfo.push(t),o[t]=n)};t("POSITION",u.VertexBuffer.PositionKind),t("NORMAL",u.VertexBuffer.NormalKind),t("TANGENT",u.VertexBuffer.TangentKind),t("TEXCOORD_0",u.VertexBuffer.UVKind),t("TEXCOORD_1",u.VertexBuffer.UV2Kind),t("JOINTS_0",u.VertexBuffer.MatricesIndicesKind),t("WEIGHTS_0",u.VertexBuffer.MatricesWeightsKind),t("COLOR_0",u.VertexBuffer.ColorKind);var n=c.ArrayItem.Get(e,l._loader.gltf.bufferViews,r.bufferView);return n._dracoBabylonGeometry||(n._dracoBabylonGeometry=l._loader.loadBufferViewAsync("#/bufferViews/"+n.index,n).then((function(e){return l._dracoCompression||(l._dracoCompression=new u.DracoCompression),l._dracoCompression.decodeMeshAsync(e,o).then((function(e){var t=new u.Geometry(s.name,l._loader.babylonScene);return e.applyToGeometry(t),t})).catch((function(e){throw new Error(a+": "+e.message)}))}))),n._dracoBabylonGeometry}))},e})(),t.KHR_draco_mesh_compression=r,c.GLTFLoader.RegisterExtension(n,(function(e){return new r(e)}))})(BABYLON||(BABYLON={})),(function(a){var t,e,n,r,o;t=a.GLTF2||(a.GLTF2={}),e=t.Loader||(t.Loader={}),n=e.Extensions||(e.Extensions={}),r="KHR_materials_pbrSpecularGlossiness",o=(function(){function e(e){this.name=r,this.enabled=!0,this._loader=e}return e.prototype.dispose=function(){delete this._loader},e.prototype.loadMaterialPropertiesAsync=function(r,o,a){var i=this;return t.GLTFLoader.LoadExtensionAsync(r,o,this.name,(function(e,t){var n=new Array;return n.push(i._loader.loadMaterialBasePropertiesAsync(r,o,a)),n.push(i._loadSpecularGlossinessPropertiesAsync(e,o,t,a)),i._loader.loadMaterialAlphaProperties(r,o,a),Promise.all(n).then((function(){}))}))},e.prototype._loadSpecularGlossinessPropertiesAsync=function(e,t,n,r){if(!(r instanceof a.PBRMaterial))throw new Error(e+": Material type not supported");var o=new Array;return r.metallic=null,r.roughness=null,n.diffuseFactor?(r.albedoColor=a.Color3.FromArray(n.diffuseFactor),r.alpha=n.diffuseFactor[3]):r.albedoColor=a.Color3.White(),r.reflectivityColor=n.specularFactor?a.Color3.FromArray(n.specularFactor):a.Color3.White(),r.microSurface=null==n.glossinessFactor?1:n.glossinessFactor,n.diffuseTexture&&o.push(this._loader.loadTextureInfoAsync(e+"/diffuseTexture",n.diffuseTexture,(function(e){return r.albedoTexture=e,Promise.resolve()}))),n.specularGlossinessTexture&&(o.push(this._loader.loadTextureInfoAsync(e+"/specularGlossinessTexture",n.specularGlossinessTexture,(function(e){return r.reflectivityTexture=e,Promise.resolve()}))),r.reflectivityTexture.hasAlpha=!0,r.useMicroSurfaceFromReflectivityMapAlpha=!0),Promise.all(o).then((function(){}))},e})(),n.KHR_materials_pbrSpecularGlossiness=o,t.GLTFLoader.RegisterExtension(r,(function(e){return new o(e)}))})(BABYLON||(BABYLON={})),(function(a){var o,e,t,n,r;o=a.GLTF2||(a.GLTF2={}),e=o.Loader||(o.Loader={}),t=e.Extensions||(e.Extensions={}),n="KHR_materials_unlit",r=(function(){function e(e){this.name=n,this.enabled=!0,this._loader=e}return e.prototype.dispose=function(){delete this._loader},e.prototype.loadMaterialPropertiesAsync=function(e,t,n){var r=this;return o.GLTFLoader.LoadExtensionAsync(e,t,this.name,(function(){return r._loadUnlitPropertiesAsync(e,t,n)}))},e.prototype._loadUnlitPropertiesAsync=function(e,t,n){if(!(n instanceof a.PBRMaterial))throw new Error(e+": Material type not supported");var r=new Array;n.unlit=!0;var o=t.pbrMetallicRoughness;return o&&(o.baseColorFactor?(n.albedoColor=a.Color3.FromArray(o.baseColorFactor),n.alpha=o.baseColorFactor[3]):n.albedoColor=a.Color3.White(),o.baseColorTexture&&r.push(this._loader.loadTextureInfoAsync(e+"/baseColorTexture",o.baseColorTexture,(function(e){return n.albedoTexture=e,Promise.resolve()})))),t.doubleSided&&(n.backFaceCulling=!1,n.twoSidedLighting=!0),this._loader.loadMaterialAlphaProperties(e,t,n),Promise.all(r).then((function(){}))},e})(),t.KHR_materials_unlit=r,o.GLTFLoader.RegisterExtension(n,(function(e){return new r(e)}))})(BABYLON||(BABYLON={})),(function(c){var d,e;d=c.GLTF2||(c.GLTF2={}),(function(e){var u,t,n="KHR_lights_punctual";(t=u||(u={})).DIRECTIONAL="directional",t.POINT="point",t.SPOT="spot";var r=(function(){function e(e){this.name=n,this.enabled=!0,this._loader=e}return e.prototype.dispose=function(){delete this._loader,delete this._lights},e.prototype.onLoading=function(){var e=this._loader.gltf.extensions;if(e&&e[this.name]){var t=e[this.name];this._lights=t.lights}},e.prototype.loadNodeAsync=function(e,t,s){var l=this;return d.GLTFLoader.LoadExtensionAsync(e,t,this.name,(function(a,i){return l._loader.loadNodeAsync(e,t,(function(e){var t,n=d.ArrayItem.Get(a,l._lights,i.light),r=n.name||e.name;switch(n.type){case u.DIRECTIONAL:t=new c.DirectionalLight(r,c.Vector3.Backward(),l._loader.babylonScene);break;case u.POINT:t=new c.PointLight(r,c.Vector3.Zero(),l._loader.babylonScene);break;case u.SPOT:var o=new c.SpotLight(r,c.Vector3.Zero(),c.Vector3.Backward(),0,1,l._loader.babylonScene);o.angle=2*(n.spot&&n.spot.outerConeAngle||Math.PI/4),o.innerAngle=2*(n.spot&&n.spot.innerConeAngle||0),t=o;break;default:throw new Error(a+": Invalid light type ("+n.type+")")}t.falloffType=c.Light.FALLOFF_GLTF,t.diffuse=n.color?c.Color3.FromArray(n.color):c.Color3.White(),t.intensity=null==n.intensity?1:n.intensity,t.range=null==n.range?Number.MAX_VALUE:n.range,t.parent=e,s(e)}))}))},e})();e.KHR_lights=r,d.GLTFLoader.RegisterExtension(n,(function(e){return new r(e)}))})((e=d.Loader||(d.Loader={})).Extensions||(e.Extensions={}))})(BABYLON||(BABYLON={})),(function(i){var t,e,n,r,o;t=i.GLTF2||(i.GLTF2={}),e=t.Loader||(t.Loader={}),n=e.Extensions||(e.Extensions={}),r="KHR_texture_transform",o=(function(){function e(e){this.name=r,this.enabled=!0,this._loader=e}return e.prototype.dispose=function(){delete this._loader},e.prototype.loadTextureInfoAsync=function(e,r,o){var a=this;return t.GLTFLoader.LoadExtensionAsync(e,r,this.name,(function(t,n){return a._loader.loadTextureInfoAsync(e,r,(function(e){if(!(e instanceof i.Texture))throw new Error(t+": Texture type not supported");n.offset&&(e.uOffset=n.offset[0],e.vOffset=n.offset[1]),e.uRotationCenter=0,e.vRotationCenter=0,n.rotation&&(e.wAng=-n.rotation),n.scale&&(e.uScale=n.scale[0],e.vScale=n.scale[1]),null!=n.texCoord&&(e.coordinatesIndex=n.texCoord),o(e)}))}))},e})(),n.KHR_texture_transform=o,t.GLTFLoader.RegisterExtension(r,(function(e){return new o(e)}))})(BABYLON||(BABYLON={})),(function(d){var f,e,t,n,r;f=d.GLTF2||(d.GLTF2={}),e=f.Loader||(f.Loader={}),t=e.Extensions||(e.Extensions={}),n="EXT_lights_image_based",r=(function(){function e(e){this.name=n,this.enabled=!0,this._loader=e}return e.prototype.dispose=function(){delete this._loader,delete this._lights},e.prototype.onLoading=function(){var e=this._loader.gltf.extensions;if(e&&e[this.name]){var t=e[this.name];this._lights=t.lights}},e.prototype.loadSceneAsync=function(o,a){var i=this;return f.GLTFLoader.LoadExtensionAsync(o,a,this.name,(function(e,t){var n=new Array;n.push(i._loader.loadSceneAsync(o,a)),i._loader.logOpen(""+e);var r=f.ArrayItem.Get(e+"/light",i._lights,t.light);return n.push(i._loadLightAsync("#/extensions/"+i.name+"/lights/"+t.light,r).then((function(e){i._loader.babylonScene.environmentTexture=e}))),i._loader.logClose(),Promise.all(n).then((function(){}))}))},e.prototype._loadLightAsync=function(i,s){var a=this;if(!s._loaded){var l=new Array;this._loader.logOpen(""+i);for(var u=new Array(s.specularImages.length),e=function(o){var a=s.specularImages[o];u[o]=new Array(a.length);for(var e=function(t){var e=i+"/specularImages/"+o+"/"+t;c._loader.logOpen(""+e);var n=a[t],r=f.ArrayItem.Get(e,c._loader.gltf.images,n);l.push(c._loader.loadImageAsync("#/images/"+n,r).then((function(e){u[o][t]=e}))),c._loader.logClose()},t=0;t<a.length;t++)e(t)},c=this,t=0;t<s.specularImages.length;t++)e(t);this._loader.logClose(),s._loaded=Promise.all(l).then((function(){var e=new d.RawCubeTexture(a._loader.babylonScene,null,s.specularImageSize);if(s._babylonTexture=e,null!=s.intensity&&(e.level=s.intensity),s.rotation){var t=d.Quaternion.FromArray(s.rotation);a._loader.babylonScene.useRightHandedSystem||(t=d.Quaternion.Inverse(t)),d.Matrix.FromQuaternionToRef(t,e.getReflectionTextureMatrix())}var n=d.SphericalHarmonics.FromArray(s.irradianceCoefficients);n.scale(s.intensity),n.convertIrradianceToLambertianRadiance();var r=d.SphericalPolynomial.FromHarmonics(n),o=(u.length-1)/d.Scalar.Log2(s.specularImageSize);return e.updateRGBDAsync(u,r,o)}))}return s._loaded.then((function(){return s._babylonTexture}))},e})(),t.EXT_lights_image_based=r,f.GLTFLoader.RegisterExtension(n,(function(e){return new r(e)}))})(BABYLON||(BABYLON={}));

var BABYLON;!(function(g){var e=(function(){function e(){this.solidPattern=/solid (\S*)([\S\s]*)endsolid[ ]*(\S*)/g,this.facetsPattern=/facet([\s\S]*?)endfacet/g,this.normalPattern=/normal[\s]+([\-+]?[0-9]+\.?[0-9]*([eE][\-+]?[0-9]+)?)+[\s]+([\-+]?[0-9]*\.?[0-9]+([eE][\-+]?[0-9]+)?)+[\s]+([\-+]?[0-9]*\.?[0-9]+([eE][\-+]?[0-9]+)?)+/g,this.vertexPattern=/vertex[\s]+([\-+]?[0-9]+\.?[0-9]*([eE][\-+]?[0-9]+)?)+[\s]+([\-+]?[0-9]*\.?[0-9]+([eE][\-+]?[0-9]+)?)+[\s]+([\-+]?[0-9]*\.?[0-9]+([eE][\-+]?[0-9]+)?)+/g,this.name="stl",this.extensions={".stl":{isBinary:!0}}}return e.prototype.importMesh=function(e,t,r,n,a,i,s){var o;if("string"!=typeof r){if(this.isBinary(r)){var l=new g.Mesh("stlmesh",t);return this.parseBinary(l,r),a&&a.push(l),!0}for(var u=new Uint8Array(r),f="",h=0;h<r.byteLength;h++)f+=String.fromCharCode(u[h]);r=f}for(;o=this.solidPattern.exec(r);){var c=o[1];if(c!=o[3])return g.Tools.Error("Error in STL, solid name != endsolid name"),!1;if(e&&c)if(e instanceof Array){if(!e.indexOf(c))continue}else if(c!==e)continue;c=c||"stlmesh";l=new g.Mesh(c,t);this.parseASCII(l,o[2]),a&&a.push(l)}return!0},e.prototype.load=function(e,t,r){var n=this.importMesh(null,e,t,r,null,null,null);return n&&e.createDefaultCameraOrLight(),n},e.prototype.loadAssetContainer=function(e,t,r,n){var a=new g.AssetContainer(e);return this.importMesh(null,e,t,r,a.meshes,null,null),a.removeAllFromScene(),a},e.prototype.isBinary=function(e){var t;if(84+50*(t=new DataView(e)).getUint32(80,!0)===t.byteLength)return!0;for(var r=t.byteLength,n=0;n<r;n++)if(127<t.getUint8(n))return!0;return!1},e.prototype.parseBinary=function(e,t){for(var r=new DataView(t),n=r.getUint32(80,!0),a=0,i=new Float32Array(3*n*3),s=new Float32Array(3*n*3),o=new Uint32Array(3*n),l=0,u=0;u<n;u++){for(var f=84+50*u,h=r.getFloat32(f,!0),c=r.getFloat32(f+4,!0),d=r.getFloat32(f+8,!0),m=1;m<=3;m++){var p=f+12*m;i[a]=r.getFloat32(p,!0),i[a+2]=r.getFloat32(p+4,!0),i[a+1]=r.getFloat32(p+8,!0),s[a]=h,s[a+2]=c,s[a+1]=d,a+=3}o[l]=l++,o[l]=l++,o[l]=l++}e.setVerticesData(g.VertexBuffer.PositionKind,i),e.setVerticesData(g.VertexBuffer.NormalKind,s),e.setIndices(o),e.computeWorldMatrix(!0)},e.prototype.parseASCII=function(e,t){for(var r,n=[],a=[],i=[],s=0;r=this.facetsPattern.exec(t);){var o=r[1],l=this.normalPattern.exec(o);if(this.normalPattern.lastIndex=0,l){for(var u,f=[Number(l[1]),Number(l[5]),Number(l[3])];u=this.vertexPattern.exec(o);)n.push(Number(u[1]),Number(u[5]),Number(u[3])),a.push(f[0],f[1],f[2]);i.push(s++,s++,s++),this.vertexPattern.lastIndex=0}}this.facetsPattern.lastIndex=0,e.setVerticesData(g.VertexBuffer.PositionKind,n),e.setVerticesData(g.VertexBuffer.NormalKind,a),e.setIndices(i),e.computeWorldMatrix(!0)},e})();g.STLFileLoader=e,g.SceneLoader&&g.SceneLoader.RegisterPlugin(new e)})(BABYLON||(BABYLON={}));

var BABYLON;!(function(D){var J=(function(){function f(){this.materials=[]}return f.prototype.parseMTL=function(e,t,r){if(!(t instanceof ArrayBuffer)){for(var s,n=t.split("\n"),a=/\s+/,i=null,o=0;o<n.length;o++){var l=n[o].trim();if(0!==l.length&&"#"!==l.charAt(0)){var u=l.indexOf(" "),p=0<=u?l.substring(0,u):l;p=p.toLowerCase();var h=0<=u?l.substring(u+1).trim():"";"newmtl"===p?(i&&this.materials.push(i),i=new D.StandardMaterial(h,e)):"kd"===p&&i?(s=h.split(a,3).map(parseFloat),i.diffuseColor=D.Color3.FromArray(s)):"ka"===p&&i?(s=h.split(a,3).map(parseFloat),i.ambientColor=D.Color3.FromArray(s)):"ks"===p&&i?(s=h.split(a,3).map(parseFloat),i.specularColor=D.Color3.FromArray(s)):"ke"===p&&i?(s=h.split(a,3).map(parseFloat),i.emissiveColor=D.Color3.FromArray(s)):"ns"===p&&i?i.specularPower=parseFloat(h):"d"===p&&i?i.alpha=parseFloat(h):"map_ka"===p&&i?i.ambientTexture=f._getTexture(r,h,e):"map_kd"===p&&i?i.diffuseTexture=f._getTexture(r,h,e):"map_ks"===p&&i?i.specularTexture=f._getTexture(r,h,e):"map_ns"===p||("map_bump"===p&&i?i.bumpTexture=f._getTexture(r,h,e):"map_d"===p&&i&&(i.opacityTexture=f._getTexture(r,h,e)))}}i&&this.materials.push(i)}},f._getTexture=function(e,t,r){if(!t)return null;var s=e;if("file:"===e){var n=t.lastIndexOf("\\");-1===n&&(n=t.lastIndexOf("/")),s+=-1<n?t.substr(n+1):t}else s+=t;return new D.Texture(s,r)},f})();D.MTLFileLoader=J;var e=(function(){function G(){this.name="obj",this.extensions=".obj",this.obj=/^o/,this.group=/^g/,this.mtllib=/^mtllib /,this.usemtl=/^usemtl /,this.smooth=/^s /,this.vertexPattern=/v( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)/,this.normalPattern=/vn( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)/,this.uvPattern=/vt( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)/,this.facePattern1=/f\s+(([\d]{1,}[\s]?){3,})+/,this.facePattern2=/f\s+((([\d]{1,}\/[\d]{1,}[\s]?){3,})+)/,this.facePattern3=/f\s+((([\d]{1,}\/[\d]{1,}\/[\d]{1,}[\s]?){3,})+)/,this.facePattern4=/f\s+((([\d]{1,}\/\/[\d]{1,}[\s]?){3,})+)/,this.facePattern5=/f\s+(((-[\d]{1,}\/-[\d]{1,}\/-[\d]{1,}[\s]?){3,})+)/}return G.prototype._loadMTL=function(e,t,r){var s=D.Tools.BaseUrl+t+e;D.Tools.LoadFile(s,r,void 0,void 0,!1,(function(){console.warn("Error - Unable to load "+s)}))},G.prototype.importMeshAsync=function(e,t,r,s,n,a){return this._parseSolid(e,t,r,s).then((function(e){return{meshes:e,particleSystems:[],skeletons:[],animationGroups:[]}}))},G.prototype.loadAsync=function(e,t,r,s,n){return this.importMeshAsync(null,e,t,r,s).then((function(){}))},G.prototype.loadAssetContainerAsync=function(r,e,t,s,n){return this.importMeshAsync(null,r,e,t).then((function(e){var t=new D.AssetContainer(r);return e.meshes.forEach((function(e){return t.meshes.push(e)})),t.removeAllFromScene(),t}))},G.prototype._parseSolid=function(e,l,t,u){for(var r,s=this,o=[],p=[],h=[],n=[],f=[],m=[],c=[],d=[],v=[],g=0,a=!1,i=[],x=[],T=[],y=[],I="",_="",P=new J,F=1,A=!0,b=function(e,t,r,s,n,a){var i;-1==(i=G.OPTIMIZE_WITH_UV?(function(e,t){e[t[0]]||(e[t[0]]={normals:[],idx:[],uv:[]});var r=e[t[0]].normals.indexOf(t[1]);return 1!=r&&t[2]==e[t[0]].uv[r]?e[t[0]].idx[r]:-1})(v,[e,r,t]):(function(e,t){e[t[0]]||(e[t[0]]={normals:[],idx:[]});var r=e[t[0]].normals.indexOf(t[1]);return-1===r?-1:e[t[0]].idx[r]})(v,[e,r]))?(f.push(m.length),m.push(s),c.push(n),d.push(a),v[e].normals.push(r),v[e].idx.push(g++),G.OPTIMIZE_WITH_UV&&v[e].uv.push(t)):f.push(i)},w=function(){for(var e=0;e<m.length;e++)i.push(m[e].x,m[e].y,m[e].z),x.push(d[e].x,d[e].y,d[e].z),T.push(c[e].x,c[e].y);m=[],d=[],c=[],v=[],g=0},E=function(e,t){t+1<e.length&&(y.push(e[0],e[t],e[t+1]),E(e,t+=1))},L=function(e,t){E(e,t);for(var r=0;r<y.length;r++){var s=parseInt(y[r])-1;b(s,0,0,o[s],D.Vector2.Zero(),D.Vector3.Up())}y=[]},M=function(e,t){E(e,t);for(var r=0;r<y.length;r++){var s=y[r].split("/"),n=parseInt(s[0])-1,a=parseInt(s[1])-1;b(n,a,0,o[n],h[a],D.Vector3.Up())}y=[]},O=function(e,t){E(e,t);for(var r=0;r<y.length;r++){var s=y[r].split("/"),n=parseInt(s[0])-1,a=parseInt(s[1])-1,i=parseInt(s[2])-1;b(n,a,i,o[n],h[a],p[i])}y=[]},V=function(e,t){E(e,t);for(var r=0;r<y.length;r++){var s=y[r].split("//"),n=parseInt(s[0])-1,a=parseInt(s[1])-1;b(n,1,a,o[n],D.Vector2.Zero(),p[a])}y=[]},C=function(e,t){E(e,t);for(var r=0;r<y.length;r++){var s=y[r].split("/"),n=o.length+parseInt(s[0]),a=h.length+parseInt(s[1]),i=p.length+parseInt(s[2]);b(n,a,i,o[n],h[a],p[i])}y=[]},N=function(){0<n.length&&(r=n[n.length-1],w(),f.reverse(),r.indices=f.slice(),r.positions=i.slice(),r.normals=x.slice(),r.uvs=T.slice(),f=[],i=[],x=[],T=[])},B=t.split("\n"),k=0;k<B.length;k++){var S,U=B[k].trim();if(0!==U.length&&"#"!==U.charAt(0))if(null!==(S=this.vertexPattern.exec(U)))o.push(new D.Vector3(parseFloat(S[1]),parseFloat(S[2]),parseFloat(S[3])));else if(null!==(S=this.normalPattern.exec(U)))p.push(new D.Vector3(parseFloat(S[1]),parseFloat(S[2]),parseFloat(S[3])));else if(null!==(S=this.uvPattern.exec(U)))h.push(new D.Vector2(parseFloat(S[1]),parseFloat(S[2])));else if(null!==(S=this.facePattern3.exec(U)))O(S[1].trim().split(" "),1);else if(null!==(S=this.facePattern4.exec(U)))V(S[1].trim().split(" "),1);else if(null!==(S=this.facePattern5.exec(U)))C(S[1].trim().split(" "),1);else if(null!==(S=this.facePattern2.exec(U)))M(S[1].trim().split(" "),1);else if(null!==(S=this.facePattern1.exec(U)))L(S[1].trim().split(" "),1);else if(this.group.test(U)||this.obj.test(U)){var Y={name:U.substring(2).trim(),indices:void 0,positions:void 0,normals:void 0,uvs:void 0,materialName:""};N(),n.push(Y),A=a=!0,F=1}else if(this.usemtl.test(U)){if(I=U.substring(7).trim(),!A){N();Y={name:"_mm"+F.toString(),indices:void 0,positions:void 0,normals:void 0,uvs:void 0,materialName:I};F++,n.push(Y)}a&&A&&(n[n.length-1].materialName=I,A=!1)}else this.mtllib.test(U)?_=U.substring(7).trim():this.smooth.test(U)||console.log("Unhandled expression at line : "+U)}a&&(r=n[n.length-1],f.reverse(),w(),r.indices=f,r.positions=i,r.normals=x,r.uvs=T),a||(f.reverse(),w(),n.push({name:D.Geometry.RandomId(),indices:f,positions:i,normals:x,uvs:T,materialName:I}));for(var Z=[],j=new Array,R=0;R<n.length;R++){if(e&&n[R].name)if(e instanceof Array){if(-1==e.indexOf(n[R].name))continue}else if(n[R].name!==e)continue;r=n[R];var H=new D.Mesh(n[R].name,l);j.push(n[R].materialName);var W=new D.VertexData;W.positions=r.positions,W.normals=r.normals,W.uvs=r.uvs,W.indices=r.indices,W.applyToMesh(H),G.INVERT_Y&&(H.scaling.y*=-1),Z.push(H)}var z=[];return""!==_&&z.push(new Promise(function(i,o){s._loadMTL(_,u,(function(e){try{P.parseMTL(l,e,u);for(var t=0;t<P.materials.length;t++){for(var r,s=0,n=[];-1<(r=j.indexOf(P.materials[t].name,s));)n.push(r),s=r+1;if(-1==r&&0==n.length)P.materials[t].dispose();else for(var a=0;a<n.length;a++)Z[n[a]].material=P.materials[t]}i()}catch(e){o(e)}}))})),Promise.all(z).then((function(){return Z}))},G.OPTIMIZE_WITH_UV=!1,G.INVERT_Y=!1,G})();D.OBJFileLoader=e,D.SceneLoader&&D.SceneLoader.RegisterPlugin(new e)})(BABYLON||(BABYLON={}));

var BABYLON,__extends=this&&this.__extends||(function(){var r=function(e,t){return(r=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t}||function(e,t){for(var i in t)t.hasOwnProperty(i)&&(e[i]=t[i])})(e,t)};return function(e,t){function i(){this.constructor=e}r(e,t),e.prototype=null===t?Object.create(t):(i.prototype=t.prototype,new i)}})(),__decorate=this&&this.__decorate||function(e,t,i,r){var n,o=arguments.length,s=o<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,i):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)s=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;0<=a;a--)(n=e[a])&&(s=(o<3?n(s):3<o?n(t,i,s):n(t,i))||s);return 3<o&&s&&Object.defineProperty(t,i,s),s};!(function(u){var d=(function(t){function e(){var e=t.call(this)||this;return e.DIFFUSE=!1,e.CLIPPLANE=!1,e.CLIPPLANE2=!1,e.CLIPPLANE3=!1,e.CLIPPLANE4=!1,e.ALPHATEST=!1,e.DEPTHPREPASS=!1,e.POINTSIZE=!1,e.FOG=!1,e.UV1=!1,e.VERTEXCOLOR=!1,e.VERTEXALPHA=!1,e.BonesPerMesh=0,e.NUM_BONE_INFLUENCERS=0,e.INSTANCES=!1,e.rebuild(),e}return __extends(e,t),e})(u.MaterialDefines),e=(function(r){function n(e,t){var i=r.call(this,e,t)||this;return i.diffuseColor=new u.Color3(1,1,1),i.speed=1,i._scaledDiffuse=new u.Color3,i._lastTime=0,i}return __extends(n,r),n.prototype.needAlphaBlending=function(){return!1},n.prototype.needAlphaTesting=function(){return!0},n.prototype.getAlphaTestTexture=function(){return null},n.prototype.isReadyForSubMesh=function(e,t,i){if(this.isFrozen&&this._wasPreviouslyReady&&t.effect)return!0;t._materialDefines||(t._materialDefines=new d);var r=t._materialDefines,n=this.getScene();if(!this.checkReadyOnEveryCall&&t.effect&&this._renderId===n.getRenderId())return!0;var o=n.getEngine();if(r._areTexturesDirty&&(r._needUVs=!1,this._diffuseTexture&&u.StandardMaterial.DiffuseTextureEnabled)){if(!this._diffuseTexture.isReady())return!1;r._needUVs=!0,r.DIFFUSE=!0}if(r.ALPHATEST=!!this._opacityTexture,r._areMiscDirty&&(r.POINTSIZE=this.pointsCloud||n.forcePointsCloud,r.FOG=n.fogEnabled&&e.applyFog&&n.fogMode!==u.Scene.FOGMODE_NONE&&this.fogEnabled),u.MaterialHelper.PrepareDefinesForFrameBoundValues(n,o,r,!!i),u.MaterialHelper.PrepareDefinesForAttributes(e,r,!1,!0),r.isDirty){r.markAsProcessed(),n.resetCachedMaterial();var s=new u.EffectFallbacks;r.FOG&&s.addFallback(1,"FOG"),0<r.NUM_BONE_INFLUENCERS&&s.addCPUSkinningFallback(0,e);var a=[u.VertexBuffer.PositionKind];r.UV1&&a.push(u.VertexBuffer.UVKind),r.VERTEXCOLOR&&a.push(u.VertexBuffer.ColorKind),u.MaterialHelper.PrepareAttributesForBones(a,e,r,s),u.MaterialHelper.PrepareAttributesForInstances(a,r);var f=r.toString();t.setEffect(n.getEngine().createEffect("fire",{attributes:a,uniformsNames:["world","view","viewProjection","vEyePosition","vFogInfos","vFogColor","pointSize","vDiffuseInfos","mBones","vClipPlane","vClipPlane2","vClipPlane3","vClipPlane4","diffuseMatrix","time","speed"],uniformBuffersNames:[],samplers:["diffuseSampler","distortionSampler","opacitySampler"],defines:f,fallbacks:s,onCompiled:this.onCompiled,onError:this.onError,indexParameters:null,maxSimultaneousLights:4,transformFeedbackVaryings:null},o),r)}return!(!t.effect||!t.effect.isReady())&&(this._renderId=n.getRenderId(),this._wasPreviouslyReady=!0)},n.prototype.bindForSubMesh=function(e,t,i){var r=this.getScene();if(i._materialDefines){var n=i.effect;n&&(this._activeEffect=n,this.bindOnlyWorldMatrix(e),this._activeEffect.setMatrix("viewProjection",r.getTransformMatrix()),u.MaterialHelper.BindBonesParameters(t,this._activeEffect),this._mustRebind(r,n)&&(this._diffuseTexture&&u.StandardMaterial.DiffuseTextureEnabled&&(this._activeEffect.setTexture("diffuseSampler",this._diffuseTexture),this._activeEffect.setFloat2("vDiffuseInfos",this._diffuseTexture.coordinatesIndex,this._diffuseTexture.level),this._activeEffect.setMatrix("diffuseMatrix",this._diffuseTexture.getTextureMatrix()),this._activeEffect.setTexture("distortionSampler",this._distortionTexture),this._activeEffect.setTexture("opacitySampler",this._opacityTexture)),u.MaterialHelper.BindClipPlane(this._activeEffect,r),this.pointsCloud&&this._activeEffect.setFloat("pointSize",this.pointSize),u.MaterialHelper.BindEyePosition(n,r)),this._activeEffect.setColor4("vDiffuseColor",this._scaledDiffuse,this.alpha*t.visibility),r.fogEnabled&&t.applyFog&&r.fogMode!==u.Scene.FOGMODE_NONE&&this._activeEffect.setMatrix("view",r.getViewMatrix()),u.MaterialHelper.BindFogParameters(r,t,this._activeEffect),this._lastTime+=r.getEngine().getDeltaTime(),this._activeEffect.setFloat("time",this._lastTime),this._activeEffect.setFloat("speed",this.speed),this._afterBind(t,this._activeEffect))}},n.prototype.getAnimatables=function(){var e=[];return this._diffuseTexture&&this._diffuseTexture.animations&&0<this._diffuseTexture.animations.length&&e.push(this._diffuseTexture),this._distortionTexture&&this._distortionTexture.animations&&0<this._distortionTexture.animations.length&&e.push(this._distortionTexture),this._opacityTexture&&this._opacityTexture.animations&&0<this._opacityTexture.animations.length&&e.push(this._opacityTexture),e},n.prototype.getActiveTextures=function(){var e=r.prototype.getActiveTextures.call(this);return this._diffuseTexture&&e.push(this._diffuseTexture),this._distortionTexture&&e.push(this._distortionTexture),this._opacityTexture&&e.push(this._opacityTexture),e},n.prototype.hasTexture=function(e){return!!r.prototype.hasTexture.call(this,e)||(this._diffuseTexture===e||(this._distortionTexture===e||this._opacityTexture===e))},n.prototype.getClassName=function(){return"FireMaterial"},n.prototype.dispose=function(e){this._diffuseTexture&&this._diffuseTexture.dispose(),this._distortionTexture&&this._distortionTexture.dispose(),r.prototype.dispose.call(this,e)},n.prototype.clone=function(e){var t=this;return u.SerializationHelper.Clone((function(){return new n(e,t.getScene())}),this)},n.prototype.serialize=function(){var e=r.prototype.serialize.call(this);return e.customType="BABYLON.FireMaterial",e.diffuseColor=this.diffuseColor.asArray(),e.speed=this.speed,this._diffuseTexture&&(e._diffuseTexture=this._diffuseTexture.serialize()),this._distortionTexture&&(e._distortionTexture=this._distortionTexture.serialize()),this._opacityTexture&&(e._opacityTexture=this._opacityTexture.serialize()),e},n.Parse=function(e,t,i){var r=new n(e.name,t);return r.diffuseColor=u.Color3.FromArray(e.diffuseColor),r.speed=e.speed,r.alpha=e.alpha,r.id=e.id,u.Tags.AddTagsTo(r,e.tags),r.backFaceCulling=e.backFaceCulling,r.wireframe=e.wireframe,e._diffuseTexture&&(r._diffuseTexture=u.Texture.Parse(e._diffuseTexture,t,i)),e._distortionTexture&&(r._distortionTexture=u.Texture.Parse(e._distortionTexture,t,i)),e._opacityTexture&&(r._opacityTexture=u.Texture.Parse(e._opacityTexture,t,i)),e.checkReadyOnlyOnce&&(r.checkReadyOnlyOnce=e.checkReadyOnlyOnce),r},__decorate([u.serializeAsTexture("diffuseTexture")],n.prototype,"_diffuseTexture",void 0),__decorate([u.expandToProperty("_markAllSubMeshesAsTexturesDirty")],n.prototype,"diffuseTexture",void 0),__decorate([u.serializeAsTexture("distortionTexture")],n.prototype,"_distortionTexture",void 0),__decorate([u.expandToProperty("_markAllSubMeshesAsTexturesDirty")],n.prototype,"distortionTexture",void 0),__decorate([u.serializeAsTexture("opacityTexture")],n.prototype,"_opacityTexture",void 0),__decorate([u.expandToProperty("_markAllSubMeshesAsTexturesDirty")],n.prototype,"opacityTexture",void 0),__decorate([u.serializeAsColor3("diffuse")],n.prototype,"diffuseColor",void 0),__decorate([u.serialize()],n.prototype,"speed",void 0),n})(u.PushMaterial);u.FireMaterial=e})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.fireVertexShader="precision highp float;\n\nattribute vec3 position;\n#ifdef UV1\nattribute vec2 uv;\n#endif\n#ifdef UV2\nattribute vec2 uv2;\n#endif\n#ifdef VERTEXCOLOR\nattribute vec4 color;\n#endif\n#include<bonesDeclaration>\n\n#include<instancesDeclaration>\nuniform mat4 view;\nuniform mat4 viewProjection;\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\n#endif\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif\n\nvarying vec3 vPositionW;\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#include<clipPlaneVertexDeclaration>\n#include<fogVertexDeclaration>\n\nuniform float time;\nuniform float speed;\n#ifdef DIFFUSE\nvarying vec2 vDistortionCoords1;\nvarying vec2 vDistortionCoords2;\nvarying vec2 vDistortionCoords3;\n#endif\nvoid main(void) {\n#include<instancesVertex>\n#include<bonesVertex>\ngl_Position=viewProjection*finalWorld*vec4(position,1.0);\nvec4 worldPos=finalWorld*vec4(position,1.0);\nvPositionW=vec3(worldPos);\n\n#ifdef DIFFUSE\nvDiffuseUV=uv;\nvDiffuseUV.y-=0.2;\n#endif\n\n#include<clipPlaneVertex>\n\n#include<fogVertex>\n\n#ifdef VERTEXCOLOR\nvColor=color;\n#endif\n\n#ifdef POINTSIZE\ngl_PointSize=pointSize;\n#endif\n#ifdef DIFFUSE\n\nvec3 layerSpeed=vec3(-0.2,-0.52,-0.1)*speed;\nvDistortionCoords1.x=uv.x;\nvDistortionCoords1.y=uv.y+layerSpeed.x*time/1000.0;\nvDistortionCoords2.x=uv.x;\nvDistortionCoords2.y=uv.y+layerSpeed.y*time/1000.0;\nvDistortionCoords3.x=uv.x;\nvDistortionCoords3.y=uv.y+layerSpeed.z*time/1000.0;\n#endif\n}\n",BABYLON.Effect.ShadersStore.firePixelShader="precision highp float;\n\nuniform vec3 vEyePosition;\n\nvarying vec3 vPositionW;\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform sampler2D diffuseSampler;\nuniform vec2 vDiffuseInfos;\n#endif\n\nuniform sampler2D distortionSampler;\nuniform sampler2D opacitySampler;\n#ifdef DIFFUSE\nvarying vec2 vDistortionCoords1;\nvarying vec2 vDistortionCoords2;\nvarying vec2 vDistortionCoords3;\n#endif\n#include<clipPlaneFragmentDeclaration>\n\n#include<fogFragmentDeclaration>\nvec4 bx2(vec4 x)\n{\nreturn vec4(2.0)*x-vec4(1.0);\n}\nvoid main(void) {\n\n#include<clipPlaneFragment>\nvec3 viewDirectionW=normalize(vEyePosition-vPositionW);\n\nvec4 baseColor=vec4(1.,1.,1.,1.);\n\nfloat alpha=1.0;\n#ifdef DIFFUSE\n\nconst float distortionAmount0=0.092;\nconst float distortionAmount1=0.092;\nconst float distortionAmount2=0.092;\nvec2 heightAttenuation=vec2(0.3,0.39);\nvec4 noise0=texture2D(distortionSampler,vDistortionCoords1);\nvec4 noise1=texture2D(distortionSampler,vDistortionCoords2);\nvec4 noise2=texture2D(distortionSampler,vDistortionCoords3);\nvec4 noiseSum=bx2(noise0)*distortionAmount0+bx2(noise1)*distortionAmount1+bx2(noise2)*distortionAmount2;\nvec4 perturbedBaseCoords=vec4(vDiffuseUV,0.0,1.0)+noiseSum*(vDiffuseUV.y*heightAttenuation.x+heightAttenuation.y);\nvec4 opacityColor=texture2D(opacitySampler,perturbedBaseCoords.xy);\n#ifdef ALPHATEST\nif (opacityColor.r<0.1)\ndiscard;\n#endif\n#include<depthPrePass>\nbaseColor=texture2D(diffuseSampler,perturbedBaseCoords.xy)*2.0;\nbaseColor*=opacityColor;\nbaseColor.rgb*=vDiffuseInfos.y;\n#endif\n#ifdef VERTEXCOLOR\nbaseColor.rgb*=vColor.rgb;\n#endif\n\nvec3 diffuseBase=vec3(1.0,1.0,1.0);\n#ifdef VERTEXALPHA\nalpha*=vColor.a;\n#endif\n\nvec4 color=vec4(baseColor.rgb,alpha);\n#include<fogFragment>\ngl_FragColor=color;\n}";

var BABYLON,__extends=this&&this.__extends||(function(){var r=function(e,t){return(r=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t}||function(e,t){for(var i in t)t.hasOwnProperty(i)&&(e[i]=t[i])})(e,t)};return function(e,t){function i(){this.constructor=e}r(e,t),e.prototype=null===t?Object.create(t):(i.prototype=t.prototype,new i)}})(),__decorate=this&&this.__decorate||function(e,t,i,r){var n,f=arguments.length,o=f<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,i):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;0<=a;a--)(n=e[a])&&(o=(f<3?n(o):3<f?n(t,i,o):n(t,i))||o);return 3<f&&o&&Object.defineProperty(t,i,o),o};!(function(h){var d=(function(t){function e(){var e=t.call(this)||this;return e.DIFFUSE=!1,e.HEIGHTMAP=!1,e.CLIPPLANE=!1,e.CLIPPLANE2=!1,e.CLIPPLANE3=!1,e.CLIPPLANE4=!1,e.ALPHATEST=!1,e.DEPTHPREPASS=!1,e.POINTSIZE=!1,e.FOG=!1,e.NORMAL=!1,e.UV1=!1,e.UV2=!1,e.VERTEXCOLOR=!1,e.VERTEXALPHA=!1,e.NUM_BONE_INFLUENCERS=0,e.BonesPerMesh=0,e.INSTANCES=!1,e.HIGHLEVEL=!1,e.rebuild(),e}return __extends(e,t),e})(h.MaterialDefines),e=(function(r){function a(e,t){var i=r.call(this,e,t)||this;return i.diffuseColor=new h.Color3(1,1,1),i.furLength=1,i.furAngle=0,i.furColor=new h.Color3(.44,.21,.02),i.furOffset=0,i.furSpacing=12,i.furGravity=new h.Vector3(0,0,0),i.furSpeed=100,i.furDensity=20,i.furOcclusion=0,i._disableLighting=!1,i._maxSimultaneousLights=4,i.highLevelFur=!0,i._furTime=0,i}return __extends(a,r),Object.defineProperty(a.prototype,"furTime",{get:function(){return this._furTime},set:function(e){this._furTime=e},enumerable:!0,configurable:!0}),a.prototype.needAlphaBlending=function(){return this.alpha<1},a.prototype.needAlphaTesting=function(){return!1},a.prototype.getAlphaTestTexture=function(){return null},a.prototype.updateFur=function(){for(var e=1;e<this._meshes.length;e++){var t=this._meshes[e].material;t.furLength=this.furLength,t.furAngle=this.furAngle,t.furGravity=this.furGravity,t.furSpacing=this.furSpacing,t.furSpeed=this.furSpeed,t.furColor=this.furColor,t.diffuseTexture=this.diffuseTexture,t.furTexture=this.furTexture,t.highLevelFur=this.highLevelFur,t.furTime=this.furTime,t.furDensity=this.furDensity}},a.prototype.isReadyForSubMesh=function(e,t,i){if(this.isFrozen&&this._wasPreviouslyReady&&t.effect)return!0;t._materialDefines||(t._materialDefines=new d);var r=t._materialDefines,n=this.getScene();if(!this.checkReadyOnEveryCall&&t.effect&&this._renderId===n.getRenderId())return!0;var f=n.getEngine();if(r._areTexturesDirty&&n.texturesEnabled){if(this.diffuseTexture&&h.StandardMaterial.DiffuseTextureEnabled){if(!this.diffuseTexture.isReady())return!1;r._needUVs=!0,r.DIFFUSE=!0}if(this.heightTexture&&f.getCaps().maxVertexTextureImageUnits){if(!this.heightTexture.isReady())return!1;r._needUVs=!0,r.HEIGHTMAP=!0}}if(this.highLevelFur!==r.HIGHLEVEL&&(r.HIGHLEVEL=!0,r.markAsUnprocessed()),h.MaterialHelper.PrepareDefinesForMisc(e,n,!1,this.pointsCloud,this.fogEnabled,this._shouldTurnAlphaTestOn(e),r),r._needNormals=h.MaterialHelper.PrepareDefinesForLights(n,e,r,!1,this._maxSimultaneousLights,this._disableLighting),h.MaterialHelper.PrepareDefinesForFrameBoundValues(n,f,r,!!i),h.MaterialHelper.PrepareDefinesForAttributes(e,r,!0,!0),r.isDirty){r.markAsProcessed(),n.resetCachedMaterial();var o=new h.EffectFallbacks;r.FOG&&o.addFallback(1,"FOG"),h.MaterialHelper.HandleFallbacksForShadows(r,o,this.maxSimultaneousLights),0<r.NUM_BONE_INFLUENCERS&&o.addCPUSkinningFallback(0,e);var a=[h.VertexBuffer.PositionKind];r.NORMAL&&a.push(h.VertexBuffer.NormalKind),r.UV1&&a.push(h.VertexBuffer.UVKind),r.UV2&&a.push(h.VertexBuffer.UV2Kind),r.VERTEXCOLOR&&a.push(h.VertexBuffer.ColorKind),h.MaterialHelper.PrepareAttributesForBones(a,e,r,o),h.MaterialHelper.PrepareAttributesForInstances(a,r);var s=r.toString(),u=["world","view","viewProjection","vEyePosition","vLightsType","vDiffuseColor","vFogInfos","vFogColor","pointSize","vDiffuseInfos","mBones","vClipPlane","vClipPlane2","vClipPlane3","vClipPlane4","diffuseMatrix","furLength","furAngle","furColor","furOffset","furGravity","furTime","furSpacing","furDensity","furOcclusion"],l=["diffuseSampler","heightTexture","furTexture"],c=new Array;h.MaterialHelper.PrepareUniformsAndSamplersList({uniformsNames:u,uniformBuffersNames:c,samplers:l,defines:r,maxSimultaneousLights:this.maxSimultaneousLights}),t.setEffect(n.getEngine().createEffect("fur",{attributes:a,uniformsNames:u,uniformBuffersNames:c,samplers:l,defines:s,fallbacks:o,onCompiled:this.onCompiled,onError:this.onError,indexParameters:{maxSimultaneousLights:this.maxSimultaneousLights}},f),r)}return!(!t.effect||!t.effect.isReady())&&(this._renderId=n.getRenderId(),this._wasPreviouslyReady=!0)},a.prototype.bindForSubMesh=function(e,t,i){var r=this.getScene(),n=i._materialDefines;if(n){var f=i.effect;f&&(this._activeEffect=f,this.bindOnlyWorldMatrix(e),this._activeEffect.setMatrix("viewProjection",r.getTransformMatrix()),h.MaterialHelper.BindBonesParameters(t,this._activeEffect),r.getCachedMaterial()!==this&&(this._diffuseTexture&&h.StandardMaterial.DiffuseTextureEnabled&&(this._activeEffect.setTexture("diffuseSampler",this._diffuseTexture),this._activeEffect.setFloat2("vDiffuseInfos",this._diffuseTexture.coordinatesIndex,this._diffuseTexture.level),this._activeEffect.setMatrix("diffuseMatrix",this._diffuseTexture.getTextureMatrix())),this._heightTexture&&this._activeEffect.setTexture("heightTexture",this._heightTexture),h.MaterialHelper.BindClipPlane(this._activeEffect,r),this.pointsCloud&&this._activeEffect.setFloat("pointSize",this.pointSize),h.MaterialHelper.BindEyePosition(f,r)),this._activeEffect.setColor4("vDiffuseColor",this.diffuseColor,this.alpha*t.visibility),r.lightsEnabled&&!this.disableLighting&&h.MaterialHelper.BindLights(r,t,this._activeEffect,n,this.maxSimultaneousLights),r.fogEnabled&&t.applyFog&&r.fogMode!==h.Scene.FOGMODE_NONE&&this._activeEffect.setMatrix("view",r.getViewMatrix()),h.MaterialHelper.BindFogParameters(r,t,this._activeEffect),this._activeEffect.setFloat("furLength",this.furLength),this._activeEffect.setFloat("furAngle",this.furAngle),this._activeEffect.setColor4("furColor",this.furColor,1),this.highLevelFur&&(this._activeEffect.setVector3("furGravity",this.furGravity),this._activeEffect.setFloat("furOffset",this.furOffset),this._activeEffect.setFloat("furSpacing",this.furSpacing),this._activeEffect.setFloat("furDensity",this.furDensity),this._activeEffect.setFloat("furOcclusion",this.furOcclusion),this._furTime+=this.getScene().getEngine().getDeltaTime()/this.furSpeed,this._activeEffect.setFloat("furTime",this._furTime),this._activeEffect.setTexture("furTexture",this.furTexture)),this._afterBind(t,this._activeEffect))}},a.prototype.getAnimatables=function(){var e=[];return this.diffuseTexture&&this.diffuseTexture.animations&&0<this.diffuseTexture.animations.length&&e.push(this.diffuseTexture),this.heightTexture&&this.heightTexture.animations&&0<this.heightTexture.animations.length&&e.push(this.heightTexture),e},a.prototype.getActiveTextures=function(){var e=r.prototype.getActiveTextures.call(this);return this._diffuseTexture&&e.push(this._diffuseTexture),this._heightTexture&&e.push(this._heightTexture),e},a.prototype.hasTexture=function(e){return!!r.prototype.hasTexture.call(this,e)||(this.diffuseTexture===e||this._heightTexture===e)},a.prototype.dispose=function(e){if(this.diffuseTexture&&this.diffuseTexture.dispose(),this._meshes)for(var t=1;t<this._meshes.length;t++){var i=this._meshes[t].material;i&&i.dispose(e),this._meshes[t].dispose()}r.prototype.dispose.call(this,e)},a.prototype.clone=function(e){var t=this;return h.SerializationHelper.Clone((function(){return new a(e,t.getScene())}),this)},a.prototype.serialize=function(){var e=h.SerializationHelper.Serialize(this);return e.customType="BABYLON.FurMaterial",this._meshes&&(e.sourceMeshName=this._meshes[0].name,e.quality=this._meshes.length),e},a.prototype.getClassName=function(){return"FurMaterial"},a.Parse=function(i,r,e){var n=h.SerializationHelper.Parse((function(){return new a(i.name,r)}),i,r,e);return i.sourceMeshName&&n.highLevelFur&&r.executeWhenReady((function(){var e=r.getMeshByName(i.sourceMeshName);if(e){var t=a.GenerateTexture("Fur Texture",r);n.furTexture=t,a.FurifyMesh(e,i.quality)}})),n},a.GenerateTexture=function(e,t){for(var i=new h.DynamicTexture("FurTexture "+e,256,t,!0),r=i.getContext(),n=0;n<2e4;++n)r.fillStyle="rgba(255, "+Math.floor(255*Math.random())+", "+Math.floor(255*Math.random())+", 1)",r.fillRect(Math.random()*i.getSize().width,Math.random()*i.getSize().height,2,2);return i.update(!1),i.wrapU=h.Texture.WRAP_ADDRESSMODE,i.wrapV=h.Texture.WRAP_ADDRESSMODE,i},a.FurifyMesh=function(e,t){var i,r=[e],n=e.material;if(!(n instanceof a))throw"The material of the source mesh must be a Fur Material";for(i=1;i<t;i++){var f=new h.FurMaterial(n.name+i,e.getScene());e.getScene().materials.pop(),h.Tags.EnableFor(f),h.Tags.AddTagsTo(f,"furShellMaterial"),f.furLength=n.furLength,f.furAngle=n.furAngle,f.furGravity=n.furGravity,f.furSpacing=n.furSpacing,f.furSpeed=n.furSpeed,f.furColor=n.furColor,f.diffuseTexture=n.diffuseTexture,f.furOffset=i/t,f.furTexture=n.furTexture,f.highLevelFur=n.highLevelFur,f.furTime=n.furTime,f.furDensity=n.furDensity;var o=e.clone(e.name+i);o.material=f,o.skeleton=e.skeleton,o.position=h.Vector3.Zero(),r.push(o)}for(i=1;i<r.length;i++)r[i].parent=e;return e.material._meshes=r},__decorate([h.serializeAsTexture("diffuseTexture")],a.prototype,"_diffuseTexture",void 0),__decorate([h.expandToProperty("_markAllSubMeshesAsTexturesDirty")],a.prototype,"diffuseTexture",void 0),__decorate([h.serializeAsTexture("heightTexture")],a.prototype,"_heightTexture",void 0),__decorate([h.expandToProperty("_markAllSubMeshesAsTexturesDirty")],a.prototype,"heightTexture",void 0),__decorate([h.serializeAsColor3()],a.prototype,"diffuseColor",void 0),__decorate([h.serialize()],a.prototype,"furLength",void 0),__decorate([h.serialize()],a.prototype,"furAngle",void 0),__decorate([h.serializeAsColor3()],a.prototype,"furColor",void 0),__decorate([h.serialize()],a.prototype,"furOffset",void 0),__decorate([h.serialize()],a.prototype,"furSpacing",void 0),__decorate([h.serializeAsVector3()],a.prototype,"furGravity",void 0),__decorate([h.serialize()],a.prototype,"furSpeed",void 0),__decorate([h.serialize()],a.prototype,"furDensity",void 0),__decorate([h.serialize()],a.prototype,"furOcclusion",void 0),__decorate([h.serialize("disableLighting")],a.prototype,"_disableLighting",void 0),__decorate([h.expandToProperty("_markAllSubMeshesAsLightsDirty")],a.prototype,"disableLighting",void 0),__decorate([h.serialize("maxSimultaneousLights")],a.prototype,"_maxSimultaneousLights",void 0),__decorate([h.expandToProperty("_markAllSubMeshesAsLightsDirty")],a.prototype,"maxSimultaneousLights",void 0),__decorate([h.serialize()],a.prototype,"highLevelFur",void 0),__decorate([h.serialize()],a.prototype,"furTime",null),a})(h.PushMaterial);h.FurMaterial=e})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.furVertexShader="precision highp float;\n\nattribute vec3 position;\nattribute vec3 normal;\n#ifdef UV1\nattribute vec2 uv;\n#endif\n#ifdef UV2\nattribute vec2 uv2;\n#endif\n#ifdef VERTEXCOLOR\nattribute vec4 color;\n#endif\n#include<bonesDeclaration>\n\nuniform float furLength;\nuniform float furAngle;\n#ifdef HIGHLEVEL\nuniform float furOffset;\nuniform vec3 furGravity;\nuniform float furTime;\nuniform float furSpacing;\nuniform float furDensity;\n#endif\n#ifdef HEIGHTMAP\nuniform sampler2D heightTexture;\n#endif\n#ifdef HIGHLEVEL\nvarying vec2 vFurUV;\n#endif\n#include<instancesDeclaration>\nuniform mat4 view;\nuniform mat4 viewProjection;\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform mat4 diffuseMatrix;\nuniform vec2 vDiffuseInfos;\n#endif\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif\n\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\nvarying float vfur_length;\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#include<clipPlaneVertexDeclaration>\n#include<fogVertexDeclaration>\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\nfloat Rand(vec3 rv) {\nfloat x=dot(rv,vec3(12.9898,78.233,24.65487));\nreturn fract(sin(x)*43758.5453);\n}\nvoid main(void) {\n#include<instancesVertex>\n#include<bonesVertex>\n\nfloat r=Rand(position);\n#ifdef HEIGHTMAP\n#if __VERSION__>100\nvfur_length=furLength*texture(heightTexture,uv).x;\n#else\nvfur_length=furLength*texture2D(heightTexture,uv).r;\n#endif\n#else \nvfur_length=(furLength*r);\n#endif\nvec3 tangent1=vec3(normal.y,-normal.x,0);\nvec3 tangent2=vec3(-normal.z,0,normal.x);\nr=Rand(tangent1*r);\nfloat J=(2.0+4.0*r);\nr=Rand(tangent2*r);\nfloat K=(2.0+2.0*r);\ntangent1=tangent1*J+tangent2*K;\ntangent1=normalize(tangent1);\nvec3 newPosition=position+normal*vfur_length*cos(furAngle)+tangent1*vfur_length*sin(furAngle);\n#ifdef HIGHLEVEL\n\nvec3 forceDirection=vec3(0.0,0.0,0.0);\nforceDirection.x=sin(furTime+position.x*0.05)*0.2;\nforceDirection.y=cos(furTime*0.7+position.y*0.04)*0.2;\nforceDirection.z=sin(furTime*0.7+position.z*0.04)*0.2;\nvec3 displacement=vec3(0.0,0.0,0.0);\ndisplacement=furGravity+forceDirection;\nfloat displacementFactor=pow(furOffset,3.0);\nvec3 aNormal=normal;\naNormal.xyz+=displacement*displacementFactor;\nnewPosition=vec3(newPosition.x,newPosition.y,newPosition.z)+(normalize(aNormal)*furOffset*furSpacing);\n#endif\n#ifdef NORMAL\nvNormalW=normalize(vec3(finalWorld*vec4(normal,0.0)));\n#endif\n\ngl_Position=viewProjection*finalWorld*vec4(newPosition,1.0);\nvec4 worldPos=finalWorld*vec4(newPosition,1.0);\nvPositionW=vec3(worldPos);\n\n#ifndef UV1\nvec2 uv=vec2(0.,0.);\n#endif\n#ifndef UV2\nvec2 uv2=vec2(0.,0.);\n#endif\n#ifdef DIFFUSE\nif (vDiffuseInfos.x == 0.)\n{\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv,1.0,0.0));\n}\nelse\n{\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv2,1.0,0.0));\n}\n#ifdef HIGHLEVEL\nvFurUV=vDiffuseUV*furDensity;\n#endif\n#else\n#ifdef HIGHLEVEL\nvFurUV=uv*furDensity;\n#endif\n#endif\n\n#include<clipPlaneVertex>\n\n#include<fogVertex>\n\n#include<shadowsVertex>[0..maxSimultaneousLights]\n\n#ifdef VERTEXCOLOR\nvColor=color;\n#endif\n\n#ifdef POINTSIZE\ngl_PointSize=pointSize;\n#endif\n}\n",BABYLON.Effect.ShadersStore.furPixelShader="precision highp float;\n\nuniform vec3 vEyePosition;\nuniform vec4 vDiffuseColor;\n\nuniform vec4 furColor;\nuniform float furLength;\nvarying vec3 vPositionW;\nvarying float vfur_length;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n\n#include<helperFunctions>\n\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\n\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform sampler2D diffuseSampler;\nuniform vec2 vDiffuseInfos;\n#endif\n\n#ifdef HIGHLEVEL\nuniform float furOffset;\nuniform float furOcclusion;\nuniform sampler2D furTexture;\nvarying vec2 vFurUV;\n#endif\n#include<lightsFragmentFunctions>\n#include<shadowsFragmentFunctions>\n#include<fogFragmentDeclaration>\n#include<clipPlaneFragmentDeclaration>\nfloat Rand(vec3 rv) {\nfloat x=dot(rv,vec3(12.9898,78.233,24.65487));\nreturn fract(sin(x)*43758.5453);\n}\nvoid main(void) {\n\n#include<clipPlaneFragment>\nvec3 viewDirectionW=normalize(vEyePosition-vPositionW);\n\nvec4 baseColor=furColor;\nvec3 diffuseColor=vDiffuseColor.rgb;\n\nfloat alpha=vDiffuseColor.a;\n#ifdef DIFFUSE\nbaseColor*=texture2D(diffuseSampler,vDiffuseUV);\n#ifdef ALPHATEST\nif (baseColor.a<0.4)\ndiscard;\n#endif\n#include<depthPrePass>\nbaseColor.rgb*=vDiffuseInfos.y;\n#endif\n#ifdef VERTEXCOLOR\nbaseColor.rgb*=vColor.rgb;\n#endif\n\n#ifdef NORMAL\nvec3 normalW=normalize(vNormalW);\n#else\nvec3 normalW=vec3(1.0,1.0,1.0);\n#endif\n#ifdef HIGHLEVEL\n\nvec4 furTextureColor=texture2D(furTexture,vec2(vFurUV.x,vFurUV.y));\nif (furTextureColor.a<=0.0 || furTextureColor.g<furOffset) {\ndiscard;\n}\nfloat occlusion=mix(0.0,furTextureColor.b*1.2,furOffset);\nbaseColor=vec4(baseColor.xyz*max(occlusion,furOcclusion),1.1-furOffset);\n#endif\n\nvec3 diffuseBase=vec3(0.,0.,0.);\nlightingInfo info;\nfloat shadow=1.;\nfloat glossiness=0.;\n#ifdef SPECULARTERM\nvec3 specularBase=vec3(0.,0.,0.);\n#endif\n#include<lightFragment>[0..maxSimultaneousLights]\n#ifdef VERTEXALPHA\nalpha*=vColor.a;\n#endif\nvec3 finalDiffuse=clamp(diffuseBase.rgb*baseColor.rgb,0.0,1.0);\n\n#ifdef HIGHLEVEL\nvec4 color=vec4(finalDiffuse,alpha);\n#else\nfloat r=vfur_length/furLength*0.5;\nvec4 color=vec4(finalDiffuse*(0.5+r),alpha);\n#endif\n#include<fogFragment>\ngl_FragColor=color;\n}";

var BABYLON,__extends=this&&this.__extends||(function(){var t=function(e,n){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,n){e.__proto__=n}||function(e,n){for(var i in n)n.hasOwnProperty(i)&&(e[i]=n[i])})(e,n)};return function(e,n){function i(){this.constructor=e}t(e,n),e.prototype=null===n?Object.create(n):(i.prototype=n.prototype,new i)}})(),__decorate=this&&this.__decorate||function(e,n,i,t){var o,r=arguments.length,a=r<3?n:null===t?t=Object.getOwnPropertyDescriptor(n,i):t;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,n,i,t);else for(var s=e.length-1;0<=s;s--)(o=e[s])&&(a=(r<3?o(a):3<r?o(n,i,a):o(n,i))||a);return 3<r&&a&&Object.defineProperty(n,i,a),a};!(function(u){var p=(function(n){function e(){var e=n.call(this)||this;return e.DIFFUSE=!1,e.CLIPPLANE=!1,e.CLIPPLANE2=!1,e.CLIPPLANE3=!1,e.CLIPPLANE4=!1,e.ALPHATEST=!1,e.DEPTHPREPASS=!1,e.POINTSIZE=!1,e.FOG=!1,e.LIGHT0=!1,e.LIGHT1=!1,e.LIGHT2=!1,e.LIGHT3=!1,e.SPOTLIGHT0=!1,e.SPOTLIGHT1=!1,e.SPOTLIGHT2=!1,e.SPOTLIGHT3=!1,e.HEMILIGHT0=!1,e.HEMILIGHT1=!1,e.HEMILIGHT2=!1,e.HEMILIGHT3=!1,e.DIRLIGHT0=!1,e.DIRLIGHT1=!1,e.DIRLIGHT2=!1,e.DIRLIGHT3=!1,e.POINTLIGHT0=!1,e.POINTLIGHT1=!1,e.POINTLIGHT2=!1,e.POINTLIGHT3=!1,e.SHADOW0=!1,e.SHADOW1=!1,e.SHADOW2=!1,e.SHADOW3=!1,e.SHADOWS=!1,e.SHADOWESM0=!1,e.SHADOWESM1=!1,e.SHADOWESM2=!1,e.SHADOWESM3=!1,e.SHADOWPOISSON0=!1,e.SHADOWPOISSON1=!1,e.SHADOWPOISSON2=!1,e.SHADOWPOISSON3=!1,e.SHADOWPCF0=!1,e.SHADOWPCF1=!1,e.SHADOWPCF2=!1,e.SHADOWPCF3=!1,e.SHADOWPCSS0=!1,e.SHADOWPCSS1=!1,e.SHADOWPCSS2=!1,e.SHADOWPCSS3=!1,e.NORMAL=!1,e.UV1=!1,e.UV2=!1,e.VERTEXCOLOR=!1,e.VERTEXALPHA=!1,e.NUM_BONE_INFLUENCERS=0,e.BonesPerMesh=0,e.INSTANCES=!1,e.rebuild(),e}return __extends(e,n),e})(u.MaterialDefines),e=(function(t){function o(e,n){var i=t.call(this,e,n)||this;return i._maxSimultaneousLights=4,i.topColor=new u.Color3(1,0,0),i.topColorAlpha=1,i.bottomColor=new u.Color3(0,0,1),i.bottomColorAlpha=1,i.offset=0,i.scale=1,i.smoothness=1,i.disableLighting=!1,i._scaledDiffuse=new u.Color3,i}return __extends(o,t),o.prototype.needAlphaBlending=function(){return this.alpha<1||this.topColorAlpha<1||this.bottomColorAlpha<1},o.prototype.needAlphaTesting=function(){return!0},o.prototype.getAlphaTestTexture=function(){return null},o.prototype.isReadyForSubMesh=function(e,n,i){if(this.isFrozen&&this._wasPreviouslyReady&&n.effect)return!0;n._materialDefines||(n._materialDefines=new p);var t=n._materialDefines,o=this.getScene();if(!this.checkReadyOnEveryCall&&n.effect&&this._renderId===o.getRenderId())return!0;var r=o.getEngine();if(u.MaterialHelper.PrepareDefinesForFrameBoundValues(o,r,t,!!i),u.MaterialHelper.PrepareDefinesForMisc(e,o,!1,this.pointsCloud,this.fogEnabled,this._shouldTurnAlphaTestOn(e),t),t._needNormals=u.MaterialHelper.PrepareDefinesForLights(o,e,t,!1,this._maxSimultaneousLights),u.MaterialHelper.PrepareDefinesForAttributes(e,t,!1,!0),t.isDirty){t.markAsProcessed(),o.resetCachedMaterial();var a=new u.EffectFallbacks;t.FOG&&a.addFallback(1,"FOG"),u.MaterialHelper.HandleFallbacksForShadows(t,a),0<t.NUM_BONE_INFLUENCERS&&a.addCPUSkinningFallback(0,e);var s=[u.VertexBuffer.PositionKind];t.NORMAL&&s.push(u.VertexBuffer.NormalKind),t.UV1&&s.push(u.VertexBuffer.UVKind),t.UV2&&s.push(u.VertexBuffer.UV2Kind),t.VERTEXCOLOR&&s.push(u.VertexBuffer.ColorKind),u.MaterialHelper.PrepareAttributesForBones(s,e,t,a),u.MaterialHelper.PrepareAttributesForInstances(s,t);var l=t.toString(),f=["world","view","viewProjection","vEyePosition","vLightsType","vDiffuseColor","vFogInfos","vFogColor","pointSize","vDiffuseInfos","mBones","vClipPlane","vClipPlane2","vClipPlane3","vClipPlane4","diffuseMatrix","topColor","bottomColor","offset","smoothness","scale"],c=["diffuseSampler"],d=new Array;u.MaterialHelper.PrepareUniformsAndSamplersList({uniformsNames:f,uniformBuffersNames:d,samplers:c,defines:t,maxSimultaneousLights:4}),n.setEffect(o.getEngine().createEffect("gradient",{attributes:s,uniformsNames:f,uniformBuffersNames:d,samplers:c,defines:l,fallbacks:a,onCompiled:this.onCompiled,onError:this.onError,indexParameters:{maxSimultaneousLights:4}},r),t)}return!(!n.effect||!n.effect.isReady())&&(this._renderId=o.getRenderId(),this._wasPreviouslyReady=!0)},o.prototype.bindForSubMesh=function(e,n,i){var t=this.getScene(),o=i._materialDefines;if(o){var r=i.effect;r&&(this._activeEffect=r,this.bindOnlyWorldMatrix(e),this._activeEffect.setMatrix("viewProjection",t.getTransformMatrix()),u.MaterialHelper.BindBonesParameters(n,r),this._mustRebind(t,r)&&(u.MaterialHelper.BindClipPlane(r,t),this.pointsCloud&&this._activeEffect.setFloat("pointSize",this.pointSize),u.MaterialHelper.BindEyePosition(r,t)),this._activeEffect.setColor4("vDiffuseColor",this._scaledDiffuse,this.alpha*n.visibility),t.lightsEnabled&&!this.disableLighting&&u.MaterialHelper.BindLights(t,n,this._activeEffect,o),t.fogEnabled&&n.applyFog&&t.fogMode!==u.Scene.FOGMODE_NONE&&this._activeEffect.setMatrix("view",t.getViewMatrix()),u.MaterialHelper.BindFogParameters(t,n,this._activeEffect),this._activeEffect.setColor4("topColor",this.topColor,this.topColorAlpha),this._activeEffect.setColor4("bottomColor",this.bottomColor,this.bottomColorAlpha),this._activeEffect.setFloat("offset",this.offset),this._activeEffect.setFloat("scale",this.scale),this._activeEffect.setFloat("smoothness",this.smoothness),this._afterBind(n,this._activeEffect))}},o.prototype.getAnimatables=function(){return[]},o.prototype.dispose=function(e){t.prototype.dispose.call(this,e)},o.prototype.clone=function(e){var n=this;return u.SerializationHelper.Clone((function(){return new o(e,n.getScene())}),this)},o.prototype.serialize=function(){var e=u.SerializationHelper.Serialize(this);return e.customType="BABYLON.GradientMaterial",e},o.prototype.getClassName=function(){return"GradientMaterial"},o.Parse=function(e,n,i){return u.SerializationHelper.Parse((function(){return new o(e.name,n)}),e,n,i)},__decorate([u.serialize("maxSimultaneousLights")],o.prototype,"_maxSimultaneousLights",void 0),__decorate([u.expandToProperty("_markAllSubMeshesAsLightsDirty")],o.prototype,"maxSimultaneousLights",void 0),__decorate([u.serializeAsColor3()],o.prototype,"topColor",void 0),__decorate([u.serialize()],o.prototype,"topColorAlpha",void 0),__decorate([u.serializeAsColor3()],o.prototype,"bottomColor",void 0),__decorate([u.serialize()],o.prototype,"bottomColorAlpha",void 0),__decorate([u.serialize()],o.prototype,"offset",void 0),__decorate([u.serialize()],o.prototype,"scale",void 0),__decorate([u.serialize()],o.prototype,"smoothness",void 0),__decorate([u.serialize()],o.prototype,"disableLighting",void 0),o})(u.PushMaterial);u.GradientMaterial=e})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.gradientVertexShader="precision highp float;\n\nattribute vec3 position;\n#ifdef NORMAL\nattribute vec3 normal;\n#endif\n#ifdef UV1\nattribute vec2 uv;\n#endif\n#ifdef UV2\nattribute vec2 uv2;\n#endif\n#ifdef VERTEXCOLOR\nattribute vec4 color;\n#endif\n#include<bonesDeclaration>\n\n#include<instancesDeclaration>\nuniform mat4 view;\nuniform mat4 viewProjection;\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform mat4 diffuseMatrix;\nuniform vec2 vDiffuseInfos;\n#endif\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif\n\nvarying vec3 vPositionW;\nvarying vec3 vPosition;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#include<clipPlaneVertexDeclaration>\n#include<fogVertexDeclaration>\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\nvoid main(void) {\n#include<instancesVertex>\n#include<bonesVertex> \ngl_Position=viewProjection*finalWorld*vec4(position,1.0);\nvec4 worldPos=finalWorld*vec4(position,1.0);\nvPositionW=vec3(worldPos);\nvPosition=position;\n#ifdef NORMAL\nvNormalW=normalize(vec3(finalWorld*vec4(normal,0.0)));\n#endif\n\n#ifndef UV1\nvec2 uv=vec2(0.,0.);\n#endif\n#ifndef UV2\nvec2 uv2=vec2(0.,0.);\n#endif\n#ifdef DIFFUSE\nif (vDiffuseInfos.x == 0.)\n{\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv,1.0,0.0));\n}\nelse\n{\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv2,1.0,0.0));\n}\n#endif\n\n#include<clipPlaneVertex>\n\n#include<fogVertex>\n#include<shadowsVertex>[0..maxSimultaneousLights]\n\n#ifdef VERTEXCOLOR\nvColor=color;\n#endif\n\n#ifdef POINTSIZE\ngl_PointSize=pointSize;\n#endif\n}\n",BABYLON.Effect.ShadersStore.gradientPixelShader="precision highp float;\n\nuniform vec3 vEyePosition;\nuniform vec4 vDiffuseColor;\n\nuniform vec4 topColor;\nuniform vec4 bottomColor;\nuniform float offset;\nuniform float scale;\nuniform float smoothness;\n\nvarying vec3 vPositionW;\nvarying vec3 vPosition;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n\n#include<helperFunctions>\n\n#include<__decl__lightFragment>[0]\n#include<__decl__lightFragment>[1]\n#include<__decl__lightFragment>[2]\n#include<__decl__lightFragment>[3]\n#include<lightsFragmentFunctions>\n#include<shadowsFragmentFunctions>\n\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform sampler2D diffuseSampler;\nuniform vec2 vDiffuseInfos;\n#endif\n#include<clipPlaneFragmentDeclaration>\n\n#include<fogFragmentDeclaration>\nvoid main(void) {\n#include<clipPlaneFragment>\nvec3 viewDirectionW=normalize(vEyePosition-vPositionW);\nfloat h=vPosition.y*scale+offset;\nfloat mysmoothness=clamp(smoothness,0.01,max(smoothness,10.));\nvec4 baseColor=mix(bottomColor,topColor,max(pow(max(h,0.0),mysmoothness),0.0));\n\nvec3 diffuseColor=baseColor.rgb;\n\nfloat alpha=baseColor.a;\n#ifdef ALPHATEST\nif (baseColor.a<0.4)\ndiscard;\n#endif\n#include<depthPrePass>\n#ifdef VERTEXCOLOR\nbaseColor.rgb*=vColor.rgb;\n#endif\n\n#ifdef NORMAL\nvec3 normalW=normalize(vNormalW);\n#else\nvec3 normalW=vec3(1.0,1.0,1.0);\n#endif\n\nvec3 diffuseBase=vec3(0.,0.,0.);\nlightingInfo info;\nfloat shadow=1.;\nfloat glossiness=0.;\n#include<lightFragment>[0]\n#include<lightFragment>[1]\n#include<lightFragment>[2]\n#include<lightFragment>[3]\n#ifdef VERTEXALPHA\nalpha*=vColor.a;\n#endif\nvec3 finalDiffuse=clamp(diffuseBase*diffuseColor,0.0,1.0)*baseColor.rgb;\n\nvec4 color=vec4(finalDiffuse,alpha);\n#include<fogFragment>\ngl_FragColor=color;\n}\n";

var BABYLON,__extends=this&&this.__extends||(function(){var n=function(i,t){return(n=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(i,t){i.__proto__=t}||function(i,t){for(var e in t)t.hasOwnProperty(e)&&(i[e]=t[e])})(i,t)};return function(i,t){function e(){this.constructor=i}n(i,t),i.prototype=null===t?Object.create(t):(e.prototype=t.prototype,new e)}})(),__decorate=this&&this.__decorate||function(i,t,e,n){var o,r=arguments.length,a=r<3?t:null===n?n=Object.getOwnPropertyDescriptor(t,e):n;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(i,t,e,n);else for(var l=i.length-1;0<=l;l--)(o=i[l])&&(a=(r<3?o(a):3<r?o(t,e,a):o(t,e))||a);return 3<r&&a&&Object.defineProperty(t,e,a),a};!(function(l){var s=(function(t){function i(){var i=t.call(this)||this;return i.TRANSPARENT=!1,i.FOG=!1,i.PREMULTIPLYALPHA=!1,i.rebuild(),i}return __extends(i,t),i})(l.MaterialDefines),i=(function(n){function o(i,t){var e=n.call(this,i,t)||this;return e.mainColor=l.Color3.Black(),e.lineColor=l.Color3.Teal(),e.gridRatio=1,e.gridOffset=l.Vector3.Zero(),e.majorUnitFrequency=10,e.minorUnitVisibility=.33,e.opacity=1,e.preMultiplyAlpha=!1,e._gridControl=new l.Vector4(e.gridRatio,e.majorUnitFrequency,e.minorUnitVisibility,e.opacity),e}return __extends(o,n),o.prototype.needAlphaBlending=function(){return this.opacity<1},o.prototype.needAlphaBlendingForMesh=function(i){return this.needAlphaBlending()},o.prototype.isReadyForSubMesh=function(i,t,e){if(this.isFrozen&&this._wasPreviouslyReady&&t.effect)return!0;t._materialDefines||(t._materialDefines=new s);var n=t._materialDefines,o=this.getScene();if(!this.checkReadyOnEveryCall&&t.effect&&this._renderId===o.getRenderId())return!0;if(n.TRANSPARENT!==this.opacity<1&&(n.TRANSPARENT=!n.TRANSPARENT,n.markAsUnprocessed()),n.PREMULTIPLYALPHA!=this.preMultiplyAlpha&&(n.PREMULTIPLYALPHA=!n.PREMULTIPLYALPHA,n.markAsUnprocessed()),l.MaterialHelper.PrepareDefinesForMisc(i,o,!1,!1,this.fogEnabled,!1,n),n.isDirty){n.markAsProcessed(),o.resetCachedMaterial();var r=[l.VertexBuffer.PositionKind,l.VertexBuffer.NormalKind],a=n.toString();t.setEffect(o.getEngine().createEffect("grid",r,["projection","worldView","mainColor","lineColor","gridControl","gridOffset","vFogInfos","vFogColor","world","view"],[],a,void 0,this.onCompiled,this.onError),n)}return!(!t.effect||!t.effect.isReady())&&(this._renderId=o.getRenderId(),this._wasPreviouslyReady=!0)},o.prototype.bindForSubMesh=function(i,t,e){var n=this.getScene();if(e._materialDefines){var o=e.effect;o&&(this._activeEffect=o,this.bindOnlyWorldMatrix(i),this._activeEffect.setMatrix("worldView",i.multiply(n.getViewMatrix())),this._activeEffect.setMatrix("view",n.getViewMatrix()),this._activeEffect.setMatrix("projection",n.getProjectionMatrix()),this._mustRebind(n,o)&&(this._activeEffect.setColor3("mainColor",this.mainColor),this._activeEffect.setColor3("lineColor",this.lineColor),this._activeEffect.setVector3("gridOffset",this.gridOffset),this._gridControl.x=this.gridRatio,this._gridControl.y=Math.round(this.majorUnitFrequency),this._gridControl.z=this.minorUnitVisibility,this._gridControl.w=this.opacity,this._activeEffect.setVector4("gridControl",this._gridControl)),l.MaterialHelper.BindFogParameters(n,t,this._activeEffect),this._afterBind(t,this._activeEffect))}},o.prototype.dispose=function(i){n.prototype.dispose.call(this,i)},o.prototype.clone=function(i){var t=this;return l.SerializationHelper.Clone((function(){return new o(i,t.getScene())}),this)},o.prototype.serialize=function(){var i=l.SerializationHelper.Serialize(this);return i.customType="BABYLON.GridMaterial",i},o.prototype.getClassName=function(){return"GridMaterial"},o.Parse=function(i,t,e){return l.SerializationHelper.Parse((function(){return new o(i.name,t)}),i,t,e)},__decorate([l.serializeAsColor3()],o.prototype,"mainColor",void 0),__decorate([l.serializeAsColor3()],o.prototype,"lineColor",void 0),__decorate([l.serialize()],o.prototype,"gridRatio",void 0),__decorate([l.serializeAsColor3()],o.prototype,"gridOffset",void 0),__decorate([l.serialize()],o.prototype,"majorUnitFrequency",void 0),__decorate([l.serialize()],o.prototype,"minorUnitVisibility",void 0),__decorate([l.serialize()],o.prototype,"opacity",void 0),__decorate([l.serialize()],o.prototype,"preMultiplyAlpha",void 0),o})(l.PushMaterial);l.GridMaterial=i})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.gridVertexShader="precision highp float;\n\nattribute vec3 position;\nattribute vec3 normal;\n\nuniform mat4 projection;\nuniform mat4 world;\nuniform mat4 view;\nuniform mat4 worldView;\n\n#ifdef TRANSPARENT\nvarying vec4 vCameraSpacePosition;\n#endif\nvarying vec3 vPosition;\nvarying vec3 vNormal;\n#include<fogVertexDeclaration>\nvoid main(void) {\n#ifdef FOG\nvec4 worldPos=world*vec4(position,1.0);\n#endif\n#include<fogVertex>\nvec4 cameraSpacePosition=worldView*vec4(position,1.0);\ngl_Position=projection*cameraSpacePosition;\n#ifdef TRANSPARENT\nvCameraSpacePosition=cameraSpacePosition;\n#endif\nvPosition=position;\nvNormal=normal;\n}",BABYLON.Effect.ShadersStore.gridPixelShader="#extension GL_OES_standard_derivatives : enable\n#define SQRT2 1.41421356\n#define PI 3.14159\nprecision highp float;\nuniform vec3 mainColor;\nuniform vec3 lineColor;\nuniform vec4 gridControl;\nuniform vec3 gridOffset;\n\n#ifdef TRANSPARENT\nvarying vec4 vCameraSpacePosition;\n#endif\nvarying vec3 vPosition;\nvarying vec3 vNormal;\n#include<fogFragmentDeclaration>\nfloat getVisibility(float position) {\n\nfloat majorGridFrequency=gridControl.y;\nif (floor(position+0.5) == floor(position/majorGridFrequency+0.5)*majorGridFrequency)\n{\nreturn 1.0;\n} \nreturn gridControl.z;\n}\nfloat getAnisotropicAttenuation(float differentialLength) {\nconst float maxNumberOfLines=10.0;\nreturn clamp(1.0/(differentialLength+1.0)-1.0/maxNumberOfLines,0.0,1.0);\n}\nfloat isPointOnLine(float position,float differentialLength) {\nfloat fractionPartOfPosition=position-floor(position+0.5); \nfractionPartOfPosition/=differentialLength; \nfractionPartOfPosition=clamp(fractionPartOfPosition,-1.,1.);\nfloat result=0.5+0.5*cos(fractionPartOfPosition*PI); \nreturn result; \n}\nfloat contributionOnAxis(float position) {\nfloat differentialLength=length(vec2(dFdx(position),dFdy(position)));\ndifferentialLength*=SQRT2; \n\nfloat result=isPointOnLine(position,differentialLength);\n\nfloat visibility=getVisibility(position);\nresult*=visibility;\n\nfloat anisotropicAttenuation=getAnisotropicAttenuation(differentialLength);\nresult*=anisotropicAttenuation;\nreturn result;\n}\nfloat normalImpactOnAxis(float x) {\nfloat normalImpact=clamp(1.0-3.0*abs(x*x*x),0.0,1.0);\nreturn normalImpact;\n}\nvoid main(void) {\n\nfloat gridRatio=gridControl.x;\nvec3 gridPos=(vPosition+gridOffset)/gridRatio;\n\nfloat x=contributionOnAxis(gridPos.x);\nfloat y=contributionOnAxis(gridPos.y);\nfloat z=contributionOnAxis(gridPos.z);\n\nvec3 normal=normalize(vNormal);\nx*=normalImpactOnAxis(normal.x);\ny*=normalImpactOnAxis(normal.y);\nz*=normalImpactOnAxis(normal.z);\n\nfloat grid=clamp(x+y+z,0.,1.);\n\nvec3 color=mix(mainColor,lineColor,grid);\n#ifdef FOG\n#include<fogFragment>\n#endif\n#ifdef TRANSPARENT\nfloat distanceToFragment=length(vCameraSpacePosition.xyz);\nfloat cameraPassThrough=clamp(distanceToFragment-0.25,0.0,1.0);\nfloat opacity=clamp(grid,0.08,cameraPassThrough*gridControl.w*grid);\ngl_FragColor=vec4(color.rgb,opacity);\n#ifdef PREMULTIPLYALPHA\ngl_FragColor.rgb*=opacity;\n#endif\n#else\n\ngl_FragColor=vec4(color.rgb,1.0);\n#endif\n}";

var BABYLON,__extends=this&&this.__extends||(function(){var i=function(e,n){return(i=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,n){e.__proto__=n}||function(e,n){for(var t in n)n.hasOwnProperty(t)&&(e[t]=n[t])})(e,n)};return function(e,n){function t(){this.constructor=e}i(e,n),e.prototype=null===n?Object.create(n):(t.prototype=n.prototype,new t)}})(),__decorate=this&&this.__decorate||function(e,n,t,i){var o,r=arguments.length,a=r<3?n:null===i?i=Object.getOwnPropertyDescriptor(n,t):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,n,t,i);else for(var s=e.length-1;0<=s;s--)(o=e[s])&&(a=(r<3?o(a):3<r?o(n,t,a):o(n,t))||a);return 3<r&&a&&Object.defineProperty(n,t,a),a};!(function(u){var v=(function(n){function e(){var e=n.call(this)||this;return e.DIFFUSE=!1,e.CLIPPLANE=!1,e.CLIPPLANE2=!1,e.CLIPPLANE3=!1,e.CLIPPLANE4=!1,e.ALPHATEST=!1,e.DEPTHPREPASS=!1,e.POINTSIZE=!1,e.FOG=!1,e.LIGHT0=!1,e.LIGHT1=!1,e.LIGHT2=!1,e.LIGHT3=!1,e.SPOTLIGHT0=!1,e.SPOTLIGHT1=!1,e.SPOTLIGHT2=!1,e.SPOTLIGHT3=!1,e.HEMILIGHT0=!1,e.HEMILIGHT1=!1,e.HEMILIGHT2=!1,e.HEMILIGHT3=!1,e.DIRLIGHT0=!1,e.DIRLIGHT1=!1,e.DIRLIGHT2=!1,e.DIRLIGHT3=!1,e.POINTLIGHT0=!1,e.POINTLIGHT1=!1,e.POINTLIGHT2=!1,e.POINTLIGHT3=!1,e.SHADOW0=!1,e.SHADOW1=!1,e.SHADOW2=!1,e.SHADOW3=!1,e.SHADOWS=!1,e.SHADOWESM0=!1,e.SHADOWESM1=!1,e.SHADOWESM2=!1,e.SHADOWESM3=!1,e.SHADOWPOISSON0=!1,e.SHADOWPOISSON1=!1,e.SHADOWPOISSON2=!1,e.SHADOWPOISSON3=!1,e.SHADOWPCF0=!1,e.SHADOWPCF1=!1,e.SHADOWPCF2=!1,e.SHADOWPCF3=!1,e.SHADOWPCSS0=!1,e.SHADOWPCSS1=!1,e.SHADOWPCSS2=!1,e.SHADOWPCSS3=!1,e.NORMAL=!1,e.UV1=!1,e.UV2=!1,e.VERTEXCOLOR=!1,e.VERTEXALPHA=!1,e.NUM_BONE_INFLUENCERS=0,e.BonesPerMesh=0,e.INSTANCES=!1,e.UNLIT=!1,e.rebuild(),e}return __extends(e,n),e})(u.MaterialDefines),e=(function(i){function o(e,n){var t=i.call(this,e,n)||this;return t.speed=1,t.movingSpeed=1,t.lowFrequencySpeed=1,t.fogDensity=.15,t._lastTime=0,t.diffuseColor=new u.Color3(1,1,1),t._disableLighting=!1,t._unlit=!1,t._maxSimultaneousLights=4,t._scaledDiffuse=new u.Color3,t}return __extends(o,i),o.prototype.needAlphaBlending=function(){return this.alpha<1},o.prototype.needAlphaTesting=function(){return!1},o.prototype.getAlphaTestTexture=function(){return null},o.prototype.isReadyForSubMesh=function(e,n,t){if(this.isFrozen&&this._wasPreviouslyReady&&n.effect)return!0;n._materialDefines||(n._materialDefines=new v);var i=n._materialDefines,o=this.getScene();if(!this.checkReadyOnEveryCall&&n.effect&&this._renderId===o.getRenderId())return!0;var r=o.getEngine();if(i._areTexturesDirty&&(i._needUVs=!1,o.texturesEnabled&&this._diffuseTexture&&u.StandardMaterial.DiffuseTextureEnabled)){if(!this._diffuseTexture.isReady())return!1;i._needUVs=!0,i.DIFFUSE=!0}if(u.MaterialHelper.PrepareDefinesForMisc(e,o,!1,this.pointsCloud,this.fogEnabled,this._shouldTurnAlphaTestOn(e),i),i._needNormals=!0,u.MaterialHelper.PrepareDefinesForLights(o,e,i,!1,this._maxSimultaneousLights,this._disableLighting),u.MaterialHelper.PrepareDefinesForFrameBoundValues(o,r,i,!!t),u.MaterialHelper.PrepareDefinesForAttributes(e,i,!0,!0),i.isDirty){i.markAsProcessed(),o.resetCachedMaterial();var a=new u.EffectFallbacks;i.FOG&&a.addFallback(1,"FOG"),u.MaterialHelper.HandleFallbacksForShadows(i,a),0<i.NUM_BONE_INFLUENCERS&&a.addCPUSkinningFallback(0,e);var s=[u.VertexBuffer.PositionKind];i.NORMAL&&s.push(u.VertexBuffer.NormalKind),i.UV1&&s.push(u.VertexBuffer.UVKind),i.UV2&&s.push(u.VertexBuffer.UV2Kind),i.VERTEXCOLOR&&s.push(u.VertexBuffer.ColorKind),u.MaterialHelper.PrepareAttributesForBones(s,e,i,a),u.MaterialHelper.PrepareAttributesForInstances(s,i);var f=i.toString(),l=["world","view","viewProjection","vEyePosition","vLightsType","vDiffuseColor","vFogInfos","vFogColor","pointSize","vDiffuseInfos","mBones","vClipPlane","vClipPlane2","vClipPlane3","vClipPlane4","diffuseMatrix","time","speed","movingSpeed","fogColor","fogDensity","lowFrequencySpeed"],c=["diffuseSampler","noiseTexture"],d=new Array;u.MaterialHelper.PrepareUniformsAndSamplersList({uniformsNames:l,uniformBuffersNames:d,samplers:c,defines:i,maxSimultaneousLights:this.maxSimultaneousLights}),n.setEffect(o.getEngine().createEffect("lava",{attributes:s,uniformsNames:l,uniformBuffersNames:d,samplers:c,defines:f,fallbacks:a,onCompiled:this.onCompiled,onError:this.onError,indexParameters:{maxSimultaneousLights:this.maxSimultaneousLights}},r),i)}return!(!n.effect||!n.effect.isReady())&&(this._renderId=o.getRenderId(),this._wasPreviouslyReady=!0)},o.prototype.bindForSubMesh=function(e,n,t){var i=this.getScene(),o=t._materialDefines;if(o){var r=t.effect;r&&(this._activeEffect=r,o.UNLIT=this._unlit,this.bindOnlyWorldMatrix(e),this._activeEffect.setMatrix("viewProjection",i.getTransformMatrix()),u.MaterialHelper.BindBonesParameters(n,this._activeEffect),this._mustRebind(i,r)&&(this.diffuseTexture&&u.StandardMaterial.DiffuseTextureEnabled&&(this._activeEffect.setTexture("diffuseSampler",this.diffuseTexture),this._activeEffect.setFloat2("vDiffuseInfos",this.diffuseTexture.coordinatesIndex,this.diffuseTexture.level),this._activeEffect.setMatrix("diffuseMatrix",this.diffuseTexture.getTextureMatrix())),this.noiseTexture&&this._activeEffect.setTexture("noiseTexture",this.noiseTexture),u.MaterialHelper.BindClipPlane(this._activeEffect,i),this.pointsCloud&&this._activeEffect.setFloat("pointSize",this.pointSize),u.MaterialHelper.BindEyePosition(r,i)),this._activeEffect.setColor4("vDiffuseColor",this._scaledDiffuse,this.alpha*n.visibility),i.lightsEnabled&&!this.disableLighting&&u.MaterialHelper.BindLights(i,n,this._activeEffect,o),i.fogEnabled&&n.applyFog&&i.fogMode!==u.Scene.FOGMODE_NONE&&this._activeEffect.setMatrix("view",i.getViewMatrix()),u.MaterialHelper.BindFogParameters(i,n,this._activeEffect),this._lastTime+=i.getEngine().getDeltaTime(),this._activeEffect.setFloat("time",this._lastTime*this.speed/1e3),this.fogColor||(this.fogColor=u.Color3.Black()),this._activeEffect.setColor3("fogColor",this.fogColor),this._activeEffect.setFloat("fogDensity",this.fogDensity),this._activeEffect.setFloat("lowFrequencySpeed",this.lowFrequencySpeed),this._activeEffect.setFloat("movingSpeed",this.movingSpeed),this._afterBind(n,this._activeEffect))}},o.prototype.getAnimatables=function(){var e=[];return this.diffuseTexture&&this.diffuseTexture.animations&&0<this.diffuseTexture.animations.length&&e.push(this.diffuseTexture),this.noiseTexture&&this.noiseTexture.animations&&0<this.noiseTexture.animations.length&&e.push(this.noiseTexture),e},o.prototype.getActiveTextures=function(){var e=i.prototype.getActiveTextures.call(this);return this._diffuseTexture&&e.push(this._diffuseTexture),e},o.prototype.hasTexture=function(e){return!!i.prototype.hasTexture.call(this,e)||this.diffuseTexture===e},o.prototype.dispose=function(e){this.diffuseTexture&&this.diffuseTexture.dispose(),this.noiseTexture&&this.noiseTexture.dispose(),i.prototype.dispose.call(this,e)},o.prototype.clone=function(e){var n=this;return u.SerializationHelper.Clone((function(){return new o(e,n.getScene())}),this)},o.prototype.serialize=function(){var e=u.SerializationHelper.Serialize(this);return e.customType="BABYLON.LavaMaterial",e},o.prototype.getClassName=function(){return"LavaMaterial"},o.Parse=function(e,n,t){return u.SerializationHelper.Parse((function(){return new o(e.name,n)}),e,n,t)},__decorate([u.serializeAsTexture("diffuseTexture")],o.prototype,"_diffuseTexture",void 0),__decorate([u.expandToProperty("_markAllSubMeshesAsTexturesDirty")],o.prototype,"diffuseTexture",void 0),__decorate([u.serializeAsTexture()],o.prototype,"noiseTexture",void 0),__decorate([u.serializeAsColor3()],o.prototype,"fogColor",void 0),__decorate([u.serialize()],o.prototype,"speed",void 0),__decorate([u.serialize()],o.prototype,"movingSpeed",void 0),__decorate([u.serialize()],o.prototype,"lowFrequencySpeed",void 0),__decorate([u.serialize()],o.prototype,"fogDensity",void 0),__decorate([u.serializeAsColor3()],o.prototype,"diffuseColor",void 0),__decorate([u.serialize("disableLighting")],o.prototype,"_disableLighting",void 0),__decorate([u.expandToProperty("_markAllSubMeshesAsLightsDirty")],o.prototype,"disableLighting",void 0),__decorate([u.serialize("unlit")],o.prototype,"_unlit",void 0),__decorate([u.expandToProperty("_markAllSubMeshesAsLightsDirty")],o.prototype,"unlit",void 0),__decorate([u.serialize("maxSimultaneousLights")],o.prototype,"_maxSimultaneousLights",void 0),__decorate([u.expandToProperty("_markAllSubMeshesAsLightsDirty")],o.prototype,"maxSimultaneousLights",void 0),o})(u.PushMaterial);u.LavaMaterial=e})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.lavaVertexShader="precision highp float;\n\nuniform float time;\nuniform float lowFrequencySpeed;\n\nvarying float noise;\n\nattribute vec3 position;\n#ifdef NORMAL\nattribute vec3 normal;\n#endif\n#ifdef UV1\nattribute vec2 uv;\n#endif\n#ifdef UV2\nattribute vec2 uv2;\n#endif\n#ifdef VERTEXCOLOR\nattribute vec4 color;\n#endif\n#include<bonesDeclaration>\n\n#include<instancesDeclaration>\nuniform mat4 view;\nuniform mat4 viewProjection;\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform mat4 diffuseMatrix;\nuniform vec2 vDiffuseInfos;\n#endif\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif\n\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#include<clipPlaneVertexDeclaration>\n#include<fogVertexDeclaration>\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\n\n\n\nvec3 mod289(vec3 x)\n{\nreturn x-floor(x*(1.0/289.0))*289.0;\n}\nvec4 mod289(vec4 x)\n{\nreturn x-floor(x*(1.0/289.0))*289.0;\n}\nvec4 permute(vec4 x)\n{\nreturn mod289(((x*34.0)+1.0)*x);\n}\nvec4 taylorInvSqrt(vec4 r)\n{\nreturn 1.79284291400159-0.85373472095314*r;\n}\nvec3 fade(vec3 t) {\nreturn t*t*t*(t*(t*6.0-15.0)+10.0);\n}\n\nfloat pnoise(vec3 P,vec3 rep)\n{\nvec3 Pi0=mod(floor(P),rep); \nvec3 Pi1=mod(Pi0+vec3(1.0),rep); \nPi0=mod289(Pi0);\nPi1=mod289(Pi1);\nvec3 Pf0=fract(P); \nvec3 Pf1=Pf0-vec3(1.0); \nvec4 ix=vec4(Pi0.x,Pi1.x,Pi0.x,Pi1.x);\nvec4 iy=vec4(Pi0.yy,Pi1.yy);\nvec4 iz0=Pi0.zzzz;\nvec4 iz1=Pi1.zzzz;\nvec4 ixy=permute(permute(ix)+iy);\nvec4 ixy0=permute(ixy+iz0);\nvec4 ixy1=permute(ixy+iz1);\nvec4 gx0=ixy0*(1.0/7.0);\nvec4 gy0=fract(floor(gx0)*(1.0/7.0))-0.5;\ngx0=fract(gx0);\nvec4 gz0=vec4(0.5)-abs(gx0)-abs(gy0);\nvec4 sz0=step(gz0,vec4(0.0));\ngx0-=sz0*(step(0.0,gx0)-0.5);\ngy0-=sz0*(step(0.0,gy0)-0.5);\nvec4 gx1=ixy1*(1.0/7.0);\nvec4 gy1=fract(floor(gx1)*(1.0/7.0))-0.5;\ngx1=fract(gx1);\nvec4 gz1=vec4(0.5)-abs(gx1)-abs(gy1);\nvec4 sz1=step(gz1,vec4(0.0));\ngx1-=sz1*(step(0.0,gx1)-0.5);\ngy1-=sz1*(step(0.0,gy1)-0.5);\nvec3 g000=vec3(gx0.x,gy0.x,gz0.x);\nvec3 g100=vec3(gx0.y,gy0.y,gz0.y);\nvec3 g010=vec3(gx0.z,gy0.z,gz0.z);\nvec3 g110=vec3(gx0.w,gy0.w,gz0.w);\nvec3 g001=vec3(gx1.x,gy1.x,gz1.x);\nvec3 g101=vec3(gx1.y,gy1.y,gz1.y);\nvec3 g011=vec3(gx1.z,gy1.z,gz1.z);\nvec3 g111=vec3(gx1.w,gy1.w,gz1.w);\nvec4 norm0=taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));\ng000*=norm0.x;\ng010*=norm0.y;\ng100*=norm0.z;\ng110*=norm0.w;\nvec4 norm1=taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));\ng001*=norm1.x;\ng011*=norm1.y;\ng101*=norm1.z;\ng111*=norm1.w;\nfloat n000=dot(g000,Pf0);\nfloat n100=dot(g100,vec3(Pf1.x,Pf0.yz));\nfloat n010=dot(g010,vec3(Pf0.x,Pf1.y,Pf0.z));\nfloat n110=dot(g110,vec3(Pf1.xy,Pf0.z));\nfloat n001=dot(g001,vec3(Pf0.xy,Pf1.z));\nfloat n101=dot(g101,vec3(Pf1.x,Pf0.y,Pf1.z));\nfloat n011=dot(g011,vec3(Pf0.x,Pf1.yz));\nfloat n111=dot(g111,Pf1);\nvec3 fade_xyz=fade(Pf0);\nvec4 n_z=mix(vec4(n000,n100,n010,n110),vec4(n001,n101,n011,n111),fade_xyz.z);\nvec2 n_yz=mix(n_z.xy,n_z.zw,fade_xyz.y);\nfloat n_xyz=mix(n_yz.x,n_yz.y,fade_xyz.x);\nreturn 2.2*n_xyz;\n}\n\nfloat turbulence( vec3 p ) {\nfloat w=100.0;\nfloat t=-.5;\nfor (float f=1.0 ; f<=10.0 ; f++ ){\nfloat power=pow( 2.0,f );\nt+=abs( pnoise( vec3( power*p ),vec3( 10.0,10.0,10.0 ) )/power );\n}\nreturn t;\n}\nvoid main(void) {\n#include<instancesVertex>\n#include<bonesVertex>\n#ifdef NORMAL\n\nnoise=10.0*-.10*turbulence( .5*normal+time*1.15 );\n\nfloat b=lowFrequencySpeed*5.0*pnoise( 0.05*position +vec3(time*1.025),vec3( 100.0 ) );\n\nfloat displacement =-1.5*noise+b;\n\nvec3 newPosition=position+normal*displacement;\ngl_Position=viewProjection*finalWorld*vec4( newPosition,1.0 );\nvec4 worldPos=finalWorld*vec4(newPosition,1.0);\nvPositionW=vec3(worldPos);\nvNormalW=normalize(vec3(finalWorld*vec4(normal,0.0)));\n#endif\n\n#ifndef UV1\nvec2 uv=vec2(0.,0.);\n#endif\n#ifndef UV2\nvec2 uv2=vec2(0.,0.);\n#endif\n#ifdef DIFFUSE\nif (vDiffuseInfos.x == 0.)\n{\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv,1.0,0.0));\n}\nelse\n{\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv2,1.0,0.0));\n}\n#endif\n\n#include<clipPlaneVertex>\n\n#include<fogVertex>\n#include<shadowsVertex>[0..maxSimultaneousLights]\n\n#ifdef VERTEXCOLOR\nvColor=color;\n#endif\n\n#ifdef POINTSIZE\ngl_PointSize=pointSize;\n#endif\n}",BABYLON.Effect.ShadersStore.lavaPixelShader="precision highp float;\n\nuniform vec3 vEyePosition;\nuniform vec4 vDiffuseColor;\n\nvarying vec3 vPositionW;\n\nuniform float time;\nuniform float speed;\nuniform float movingSpeed;\nuniform vec3 fogColor;\nuniform sampler2D noiseTexture;\nuniform float fogDensity;\n\nvarying float noise;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n\n#include<helperFunctions>\n\n#include<__decl__lightFragment>[0]\n#include<__decl__lightFragment>[1]\n#include<__decl__lightFragment>[2]\n#include<__decl__lightFragment>[3]\n#include<lightsFragmentFunctions>\n#include<shadowsFragmentFunctions>\n\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform sampler2D diffuseSampler;\nuniform vec2 vDiffuseInfos;\n#endif\n#include<clipPlaneFragmentDeclaration>\n\n#include<fogFragmentDeclaration>\nfloat random( vec3 scale,float seed ){\nreturn fract( sin( dot( gl_FragCoord.xyz+seed,scale ) )*43758.5453+seed ) ;\n}\nvoid main(void) {\n#include<clipPlaneFragment>\nvec3 viewDirectionW=normalize(vEyePosition-vPositionW);\n\nvec4 baseColor=vec4(1.,1.,1.,1.);\nvec3 diffuseColor=vDiffuseColor.rgb;\n\nfloat alpha=vDiffuseColor.a;\n#ifdef DIFFUSE\n\nvec4 noiseTex=texture2D( noiseTexture,vDiffuseUV );\nvec2 T1=vDiffuseUV+vec2( 1.5,-1.5 )*time*0.02;\nvec2 T2=vDiffuseUV+vec2( -0.5,2.0 )*time*0.01*speed;\nT1.x+=noiseTex.x*2.0;\nT1.y+=noiseTex.y*2.0;\nT2.x-=noiseTex.y*0.2+time*0.001*movingSpeed;\nT2.y+=noiseTex.z*0.2+time*0.002*movingSpeed;\nfloat p=texture2D( noiseTexture,T1*3.0 ).a;\nvec4 lavaColor=texture2D( diffuseSampler,T2*4.0);\nvec4 temp=lavaColor*( vec4( p,p,p,p )*2. )+( lavaColor*lavaColor-0.1 );\nbaseColor=temp;\nfloat depth=gl_FragCoord.z*4.0;\nconst float LOG2=1.442695;\nfloat fogFactor=exp2(-fogDensity*fogDensity*depth*depth*LOG2 );\nfogFactor=1.0-clamp( fogFactor,0.0,1.0 );\nbaseColor=mix( baseColor,vec4( fogColor,baseColor.w ),fogFactor );\ndiffuseColor=baseColor.rgb;\n\n\n#ifdef ALPHATEST\nif (baseColor.a<0.4)\ndiscard;\n#endif\n#include<depthPrePass>\nbaseColor.rgb*=vDiffuseInfos.y;\n#endif\n#ifdef VERTEXCOLOR\nbaseColor.rgb*=vColor.rgb;\n#endif\n\n#ifdef NORMAL\nvec3 normalW=normalize(vNormalW);\n#else\nvec3 normalW=vec3(1.0,1.0,1.0);\n#endif\n#ifdef UNLIT\nvec3 diffuseBase=vec3(1.,1.,1.);\n#else\n\nvec3 diffuseBase=vec3(0.,0.,0.);\nlightingInfo info;\nfloat shadow=1.;\nfloat glossiness=0.;\n#include<lightFragment>[0]\n#include<lightFragment>[1]\n#include<lightFragment>[2]\n#include<lightFragment>[3]\n#endif\n#ifdef VERTEXALPHA\nalpha*=vColor.a;\n#endif\nvec3 finalDiffuse=clamp(diffuseBase*diffuseColor,0.0,1.0)*baseColor.rgb;\n\nvec4 color=vec4(finalDiffuse,alpha);\n#include<fogFragment>\ngl_FragColor=color;\n}";

var BABYLON,__extends=this&&this.__extends||(function(){var i=function(e,r){return(i=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,r){e.__proto__=r}||function(e,r){for(var t in r)r.hasOwnProperty(t)&&(e[t]=r[t])})(e,r)};return function(e,r){function t(){this.constructor=e}i(e,r),e.prototype=null===r?Object.create(r):(t.prototype=r.prototype,new t)}})(),__decorate=this&&this.__decorate||function(e,r,t,i){var n,a=arguments.length,o=a<3?r:null===i?i=Object.getOwnPropertyDescriptor(r,t):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,r,t,i);else for(var l=e.length-1;0<=l;l--)(n=e[l])&&(o=(a<3?n(o):3<a?n(r,t,o):n(r,t))||o);return 3<a&&o&&Object.defineProperty(r,t,o),o};!(function(h){var v=(function(r){function e(){var e=r.call(this)||this;return e.DIFFUSEX=!1,e.DIFFUSEY=!1,e.DIFFUSEZ=!1,e.BUMPX=!1,e.BUMPY=!1,e.BUMPZ=!1,e.CLIPPLANE=!1,e.CLIPPLANE2=!1,e.CLIPPLANE3=!1,e.CLIPPLANE4=!1,e.ALPHATEST=!1,e.DEPTHPREPASS=!1,e.POINTSIZE=!1,e.FOG=!1,e.SPECULARTERM=!1,e.NORMAL=!1,e.VERTEXCOLOR=!1,e.VERTEXALPHA=!1,e.NUM_BONE_INFLUENCERS=0,e.BonesPerMesh=0,e.INSTANCES=!1,e.rebuild(),e}return __extends(e,r),e})(h.MaterialDefines),e=(function(i){function n(e,r){var t=i.call(this,e,r)||this;return t.tileSize=1,t.diffuseColor=new h.Color3(1,1,1),t.specularColor=new h.Color3(.2,.2,.2),t.specularPower=64,t._disableLighting=!1,t._maxSimultaneousLights=4,t}return __extends(n,i),n.prototype.needAlphaBlending=function(){return this.alpha<1},n.prototype.needAlphaTesting=function(){return!1},n.prototype.getAlphaTestTexture=function(){return null},n.prototype.isReadyForSubMesh=function(e,r,t){if(this.isFrozen&&this._wasPreviouslyReady&&r.effect)return!0;r._materialDefines||(r._materialDefines=new v);var i=r._materialDefines,n=this.getScene();if(!this.checkReadyOnEveryCall&&r.effect&&this._renderId===n.getRenderId())return!0;var a=n.getEngine();if(i._areTexturesDirty&&n.texturesEnabled){if(h.StandardMaterial.DiffuseTextureEnabled)for(var o=[this.diffuseTextureX,this.diffuseTextureY,this.diffuseTextureZ],l=["DIFFUSEX","DIFFUSEY","DIFFUSEZ"],s=0;s<o.length;s++)if(o[s]){if(!o[s].isReady())return!1;i[l[s]]=!0}if(h.StandardMaterial.BumpTextureEnabled)for(o=[this.normalTextureX,this.normalTextureY,this.normalTextureZ],l=["BUMPX","BUMPY","BUMPZ"],s=0;s<o.length;s++)if(o[s]){if(!o[s].isReady())return!1;i[l[s]]=!0}}if(h.MaterialHelper.PrepareDefinesForMisc(e,n,!1,this.pointsCloud,this.fogEnabled,this._shouldTurnAlphaTestOn(e),i),i._needNormals=h.MaterialHelper.PrepareDefinesForLights(n,e,i,!1,this._maxSimultaneousLights,this._disableLighting),h.MaterialHelper.PrepareDefinesForFrameBoundValues(n,a,i,!!t),h.MaterialHelper.PrepareDefinesForAttributes(e,i,!0,!0),i.isDirty){i.markAsProcessed(),n.resetCachedMaterial();var f=new h.EffectFallbacks;i.FOG&&f.addFallback(1,"FOG"),h.MaterialHelper.HandleFallbacksForShadows(i,f,this.maxSimultaneousLights),0<i.NUM_BONE_INFLUENCERS&&f.addCPUSkinningFallback(0,e);var u=[h.VertexBuffer.PositionKind];i.NORMAL&&u.push(h.VertexBuffer.NormalKind),i.VERTEXCOLOR&&u.push(h.VertexBuffer.ColorKind),h.MaterialHelper.PrepareAttributesForBones(u,e,i,f),h.MaterialHelper.PrepareAttributesForInstances(u,i);var d=i.toString(),c=["world","view","viewProjection","vEyePosition","vLightsType","vDiffuseColor","vSpecularColor","vFogInfos","vFogColor","pointSize","mBones","vClipPlane","vClipPlane2","vClipPlane3","vClipPlane4","tileSize"],p=["diffuseSamplerX","diffuseSamplerY","diffuseSamplerZ","normalSamplerX","normalSamplerY","normalSamplerZ"],m=new Array;h.MaterialHelper.PrepareUniformsAndSamplersList({uniformsNames:c,uniformBuffersNames:m,samplers:p,defines:i,maxSimultaneousLights:this.maxSimultaneousLights}),r.setEffect(n.getEngine().createEffect("triplanar",{attributes:u,uniformsNames:c,uniformBuffersNames:m,samplers:p,defines:d,fallbacks:f,onCompiled:this.onCompiled,onError:this.onError,indexParameters:{maxSimultaneousLights:this.maxSimultaneousLights}},a),i)}return!(!r.effect||!r.effect.isReady())&&(this._renderId=n.getRenderId(),this._wasPreviouslyReady=!0)},n.prototype.bindForSubMesh=function(e,r,t){var i=this.getScene(),n=t._materialDefines;if(n){var a=t.effect;a&&(this._activeEffect=a,this.bindOnlyWorldMatrix(e),this._activeEffect.setMatrix("viewProjection",i.getTransformMatrix()),h.MaterialHelper.BindBonesParameters(r,this._activeEffect),this._activeEffect.setFloat("tileSize",this.tileSize),i.getCachedMaterial()!==this&&(this.diffuseTextureX&&this._activeEffect.setTexture("diffuseSamplerX",this.diffuseTextureX),this.diffuseTextureY&&this._activeEffect.setTexture("diffuseSamplerY",this.diffuseTextureY),this.diffuseTextureZ&&this._activeEffect.setTexture("diffuseSamplerZ",this.diffuseTextureZ),this.normalTextureX&&this._activeEffect.setTexture("normalSamplerX",this.normalTextureX),this.normalTextureY&&this._activeEffect.setTexture("normalSamplerY",this.normalTextureY),this.normalTextureZ&&this._activeEffect.setTexture("normalSamplerZ",this.normalTextureZ),h.MaterialHelper.BindClipPlane(this._activeEffect,i),this.pointsCloud&&this._activeEffect.setFloat("pointSize",this.pointSize),h.MaterialHelper.BindEyePosition(a,i)),this._activeEffect.setColor4("vDiffuseColor",this.diffuseColor,this.alpha*r.visibility),n.SPECULARTERM&&this._activeEffect.setColor4("vSpecularColor",this.specularColor,this.specularPower),i.lightsEnabled&&!this.disableLighting&&h.MaterialHelper.BindLights(i,r,this._activeEffect,n,this.maxSimultaneousLights),i.fogEnabled&&r.applyFog&&i.fogMode!==h.Scene.FOGMODE_NONE&&this._activeEffect.setMatrix("view",i.getViewMatrix()),h.MaterialHelper.BindFogParameters(i,r,this._activeEffect),this._afterBind(r,this._activeEffect))}},n.prototype.getAnimatables=function(){var e=[];return this.mixTexture&&this.mixTexture.animations&&0<this.mixTexture.animations.length&&e.push(this.mixTexture),e},n.prototype.getActiveTextures=function(){var e=i.prototype.getActiveTextures.call(this);return this._diffuseTextureX&&e.push(this._diffuseTextureX),this._diffuseTextureY&&e.push(this._diffuseTextureY),this._diffuseTextureZ&&e.push(this._diffuseTextureZ),this._normalTextureX&&e.push(this._normalTextureX),this._normalTextureY&&e.push(this._normalTextureY),this._normalTextureZ&&e.push(this._normalTextureZ),e},n.prototype.hasTexture=function(e){return!!i.prototype.hasTexture.call(this,e)||(this._diffuseTextureX===e||(this._diffuseTextureY===e||(this._diffuseTextureZ===e||(this._normalTextureX===e||(this._normalTextureY===e||this._normalTextureZ===e)))))},n.prototype.dispose=function(e){this.mixTexture&&this.mixTexture.dispose(),i.prototype.dispose.call(this,e)},n.prototype.clone=function(e){var r=this;return h.SerializationHelper.Clone((function(){return new n(e,r.getScene())}),this)},n.prototype.serialize=function(){var e=h.SerializationHelper.Serialize(this);return e.customType="BABYLON.TriPlanarMaterial",e},n.prototype.getClassName=function(){return"TriPlanarMaterial"},n.Parse=function(e,r,t){return h.SerializationHelper.Parse((function(){return new n(e.name,r)}),e,r,t)},__decorate([h.serializeAsTexture()],n.prototype,"mixTexture",void 0),__decorate([h.serializeAsTexture("diffuseTextureX")],n.prototype,"_diffuseTextureX",void 0),__decorate([h.expandToProperty("_markAllSubMeshesAsTexturesDirty")],n.prototype,"diffuseTextureX",void 0),__decorate([h.serializeAsTexture("diffuseTexturY")],n.prototype,"_diffuseTextureY",void 0),__decorate([h.expandToProperty("_markAllSubMeshesAsTexturesDirty")],n.prototype,"diffuseTextureY",void 0),__decorate([h.serializeAsTexture("diffuseTextureZ")],n.prototype,"_diffuseTextureZ",void 0),__decorate([h.expandToProperty("_markAllSubMeshesAsTexturesDirty")],n.prototype,"diffuseTextureZ",void 0),__decorate([h.serializeAsTexture("normalTextureX")],n.prototype,"_normalTextureX",void 0),__decorate([h.expandToProperty("_markAllSubMeshesAsTexturesDirty")],n.prototype,"normalTextureX",void 0),__decorate([h.serializeAsTexture("normalTextureY")],n.prototype,"_normalTextureY",void 0),__decorate([h.expandToProperty("_markAllSubMeshesAsTexturesDirty")],n.prototype,"normalTextureY",void 0),__decorate([h.serializeAsTexture("normalTextureZ")],n.prototype,"_normalTextureZ",void 0),__decorate([h.expandToProperty("_markAllSubMeshesAsTexturesDirty")],n.prototype,"normalTextureZ",void 0),__decorate([h.serialize()],n.prototype,"tileSize",void 0),__decorate([h.serializeAsColor3()],n.prototype,"diffuseColor",void 0),__decorate([h.serializeAsColor3()],n.prototype,"specularColor",void 0),__decorate([h.serialize()],n.prototype,"specularPower",void 0),__decorate([h.serialize("disableLighting")],n.prototype,"_disableLighting",void 0),__decorate([h.expandToProperty("_markAllSubMeshesAsLightsDirty")],n.prototype,"disableLighting",void 0),__decorate([h.serialize("maxSimultaneousLights")],n.prototype,"_maxSimultaneousLights",void 0),__decorate([h.expandToProperty("_markAllSubMeshesAsLightsDirty")],n.prototype,"maxSimultaneousLights",void 0),n})(h.PushMaterial);h.TriPlanarMaterial=e})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.triplanarVertexShader="precision highp float;\n\nattribute vec3 position;\n#ifdef NORMAL\nattribute vec3 normal;\n#endif\n#ifdef VERTEXCOLOR\nattribute vec4 color;\n#endif\n#include<bonesDeclaration>\n\n#include<instancesDeclaration>\nuniform mat4 view;\nuniform mat4 viewProjection;\n#ifdef DIFFUSEX\nvarying vec2 vTextureUVX;\n#endif\n#ifdef DIFFUSEY\nvarying vec2 vTextureUVY;\n#endif\n#ifdef DIFFUSEZ\nvarying vec2 vTextureUVZ;\n#endif\nuniform float tileSize;\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif\n\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying mat3 tangentSpace;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#include<clipPlaneVertexDeclaration>\n#include<fogVertexDeclaration>\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\nvoid main(void)\n{\n#include<instancesVertex>\n#include<bonesVertex>\ngl_Position=viewProjection*finalWorld*vec4(position,1.0);\nvec4 worldPos=finalWorld*vec4(position,1.0);\nvPositionW=vec3(worldPos);\n#ifdef DIFFUSEX\nvTextureUVX=worldPos.zy/tileSize;\n#endif\n#ifdef DIFFUSEY\nvTextureUVY=worldPos.xz/tileSize;\n#endif\n#ifdef DIFFUSEZ\nvTextureUVZ=worldPos.xy/tileSize;\n#endif\n#ifdef NORMAL\n\nvec3 xtan=vec3(0,0,1);\nvec3 xbin=vec3(0,1,0);\nvec3 ytan=vec3(1,0,0);\nvec3 ybin=vec3(0,0,1);\nvec3 ztan=vec3(1,0,0);\nvec3 zbin=vec3(0,1,0);\nvec3 normalizedNormal=normalize(normal);\nnormalizedNormal*=normalizedNormal;\nvec3 worldBinormal=normalize(xbin*normalizedNormal.x+ybin*normalizedNormal.y+zbin*normalizedNormal.z);\nvec3 worldTangent=normalize(xtan*normalizedNormal.x+ytan*normalizedNormal.y+ztan*normalizedNormal.z);\nworldTangent=(world*vec4(worldTangent,1.0)).xyz;\nworldBinormal=(world*vec4(worldBinormal,1.0)).xyz;\nvec3 worldNormal=normalize(cross(worldTangent,worldBinormal));\ntangentSpace[0]=worldTangent;\ntangentSpace[1]=worldBinormal;\ntangentSpace[2]=worldNormal;\n#endif\n\n#include<clipPlaneVertex>\n\n#include<fogVertex>\n\n#include<shadowsVertex>[0..maxSimultaneousLights]\n\n#ifdef VERTEXCOLOR\nvColor=color;\n#endif\n\n#ifdef POINTSIZE\ngl_PointSize=pointSize;\n#endif\n}\n",BABYLON.Effect.ShadersStore.triplanarPixelShader="precision highp float;\n\nuniform vec3 vEyePosition;\nuniform vec4 vDiffuseColor;\n#ifdef SPECULARTERM\nuniform vec4 vSpecularColor;\n#endif\n\nvarying vec3 vPositionW;\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n\n#include<helperFunctions>\n\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\n\n#ifdef DIFFUSEX\nvarying vec2 vTextureUVX;\nuniform sampler2D diffuseSamplerX;\n#ifdef BUMPX\nuniform sampler2D normalSamplerX;\n#endif\n#endif\n#ifdef DIFFUSEY\nvarying vec2 vTextureUVY;\nuniform sampler2D diffuseSamplerY;\n#ifdef BUMPY\nuniform sampler2D normalSamplerY;\n#endif\n#endif\n#ifdef DIFFUSEZ\nvarying vec2 vTextureUVZ;\nuniform sampler2D diffuseSamplerZ;\n#ifdef BUMPZ\nuniform sampler2D normalSamplerZ;\n#endif\n#endif\n#ifdef NORMAL\nvarying mat3 tangentSpace;\n#endif\n#include<lightsFragmentFunctions>\n#include<shadowsFragmentFunctions>\n#include<clipPlaneFragmentDeclaration>\n#include<fogFragmentDeclaration>\nvoid main(void) {\n\n#include<clipPlaneFragment>\nvec3 viewDirectionW=normalize(vEyePosition-vPositionW);\n\nvec4 baseColor=vec4(0.,0.,0.,1.);\nvec3 diffuseColor=vDiffuseColor.rgb;\n\nfloat alpha=vDiffuseColor.a;\n\n#ifdef NORMAL\nvec3 normalW=tangentSpace[2];\n#else\nvec3 normalW=vec3(1.0,1.0,1.0);\n#endif\nvec4 baseNormal=vec4(0.0,0.0,0.0,1.0);\nnormalW*=normalW;\n#ifdef DIFFUSEX\nbaseColor+=texture2D(diffuseSamplerX,vTextureUVX)*normalW.x;\n#ifdef BUMPX\nbaseNormal+=texture2D(normalSamplerX,vTextureUVX)*normalW.x;\n#endif\n#endif\n#ifdef DIFFUSEY\nbaseColor+=texture2D(diffuseSamplerY,vTextureUVY)*normalW.y;\n#ifdef BUMPY\nbaseNormal+=texture2D(normalSamplerY,vTextureUVY)*normalW.y;\n#endif\n#endif\n#ifdef DIFFUSEZ\nbaseColor+=texture2D(diffuseSamplerZ,vTextureUVZ)*normalW.z;\n#ifdef BUMPZ\nbaseNormal+=texture2D(normalSamplerZ,vTextureUVZ)*normalW.z;\n#endif\n#endif\n#ifdef NORMAL\nnormalW=normalize((2.0*baseNormal.xyz-1.0)*tangentSpace);\n#endif\n#ifdef ALPHATEST\nif (baseColor.a<0.4)\ndiscard;\n#endif\n#include<depthPrePass>\n#ifdef VERTEXCOLOR\nbaseColor.rgb*=vColor.rgb;\n#endif\n\nvec3 diffuseBase=vec3(0.,0.,0.);\nlightingInfo info;\nfloat shadow=1.;\n#ifdef SPECULARTERM\nfloat glossiness=vSpecularColor.a;\nvec3 specularBase=vec3(0.,0.,0.);\nvec3 specularColor=vSpecularColor.rgb;\n#else\nfloat glossiness=0.;\n#endif\n#include<lightFragment>[0..maxSimultaneousLights]\n#ifdef VERTEXALPHA\nalpha*=vColor.a;\n#endif\n#ifdef SPECULARTERM\nvec3 finalSpecular=specularBase*specularColor;\n#else\nvec3 finalSpecular=vec3(0.0);\n#endif\nvec3 finalDiffuse=clamp(diffuseBase*diffuseColor,0.0,1.0)*baseColor.rgb;\n\nvec4 color=vec4(finalDiffuse+finalSpecular,alpha);\n#include<fogFragment>\ngl_FragColor=color;\n}\n";

var BABYLON,__extends=this&&this.__extends||(function(){var o=function(t,e){return(o=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var r in e)e.hasOwnProperty(r)&&(t[r]=e[r])})(t,e)};return function(t,e){function r(){this.constructor=t}o(t,e),t.prototype=null===e?Object.create(e):(r.prototype=e.prototype,new r)}})(),__decorate=this&&this.__decorate||function(t,e,r,o){var n,i=arguments.length,a=i<3?e:null===o?o=Object.getOwnPropertyDescriptor(e,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,r,o);else for(var c=t.length-1;0<=c;c--)(n=t[c])&&(a=(i<3?n(a):3<i?n(e,r,a):n(e,r))||a);return 3<i&&a&&Object.defineProperty(e,r,a),a};!(function(x){var l=(function(g){function r(t,e,r,o){void 0===o&&(o=null);var n=g.call(this,o)||this;if(!(o=n.getScene()))return n;n.name=t,n._text,n._font,n.wrapU=x.Texture.CLAMP_ADDRESSMODE,n.wrapV=x.Texture.CLAMP_ADDRESSMODE;var i=n.getFontHeight(e),a=n.getFontWidth(e);n._charSize=Math.max(i.height,a);var c=Math.ceil(n._charSize*r.length),l=n._charSize;n._texture=o.getEngine().createDynamicTexture(c,l,!1,x.Texture.NEAREST_SAMPLINGMODE);var f=n.getSize(),s=document.createElement("canvas");s.width=f.width,s.height=f.height;var u=s.getContext("2d");u.textBaseline="top",u.font=e,u.fillStyle="white",u.imageSmoothingEnabled=!1;for(var h=0;h<r.length;h++)u.fillText(r[h],h*n._charSize,-i.offset);return o.getEngine().updateDynamicTexture(n._texture,s,!1,!0),n}return __extends(r,g),Object.defineProperty(r.prototype,"charSize",{get:function(){return this._charSize},enumerable:!0,configurable:!0}),r.prototype.getFontWidth=function(t){var e=document.createElement("canvas").getContext("2d");return e.fillStyle="white",e.font=t,e.measureText("W").width},r.prototype.getFontHeight=function(t){var e=document.createElement("canvas"),r=e.getContext("2d");r.fillRect(0,0,e.width,e.height),r.textBaseline="top",r.fillStyle="white",r.font=t,r.fillText("jH|",0,0);for(var o=r.getImageData(0,0,e.width,e.height).data,n=-1,i=-1,a=0;a<e.height;a++)for(var c=0;c<e.width;c++){if(0!==o[4*(a*e.width+c)]){-1===n&&(n=a);break}if(c===e.width-1&&-1!==n){i=a,a=e.height;break}}return{height:i-n+1,offset:n-1}},r.prototype.clone=function(){return new r(this.name,this._font,this._text,this.getScene())},r.Parse=function(t,e){return x.SerializationHelper.Parse((function(){return new r(t.name,t.font,t.text,e)}),t,e,null)},__decorate([x.serialize("font")],r.prototype,"_font",void 0),__decorate([x.serialize("text")],r.prototype,"_text",void 0),r})(x.BaseTexture);x.AsciiArtFontTexture=l;var t=(function(c){function t(t,e,r){var o=c.call(this,t,"asciiart",["asciiArtFontInfos","asciiArtOptions"],["asciiArtFont"],{width:e.getEngine().getRenderWidth(),height:e.getEngine().getRenderHeight()},e,x.Texture.TRILINEAR_SAMPLINGMODE,e.getEngine(),!0)||this;o.mixToTile=0,o.mixToNormal=0;var n="40px Monospace",i=" `-.'_:,\"=^;<+!*?/cL\\zrs7TivJtC{3F)Il(xZfY5S2eajo14[nuyE]P6V9kXpKwGhqAUbOd8#HRDB0$mgMW&Q%N@";r&&("string"==typeof r?n=r:(n=r.font||n,i=r.characterSet||i,o.mixToTile=r.mixToTile||o.mixToTile,o.mixToNormal=r.mixToNormal||o.mixToNormal)),o._asciiArtFontTexture=new l(t,n,i,e.getScene());var a=o._asciiArtFontTexture.getSize();return o.onApply=function(t){t.setTexture("asciiArtFont",o._asciiArtFontTexture),t.setFloat4("asciiArtFontInfos",o._asciiArtFontTexture.charSize,i.length,a.width,a.height),t.setFloat4("asciiArtOptions",o.width,o.height,o.mixToNormal,o.mixToTile)},o}return __extends(t,c),t})(x.PostProcess);x.AsciiArtPostProcess=t})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.asciiartPixelShader="\nvarying vec2 vUV;\nuniform sampler2D textureSampler;\nuniform sampler2D asciiArtFont;\n\nuniform vec4 asciiArtFontInfos;\nuniform vec4 asciiArtOptions;\n\nfloat getLuminance(vec3 color)\n{\nreturn clamp(dot(color,vec3(0.2126,0.7152,0.0722)),0.,1.);\n}\n\nvoid main(void) \n{\nfloat caracterSize=asciiArtFontInfos.x;\nfloat numChar=asciiArtFontInfos.y-1.0;\nfloat fontx=asciiArtFontInfos.z;\nfloat fonty=asciiArtFontInfos.w;\nfloat screenx=asciiArtOptions.x;\nfloat screeny=asciiArtOptions.y;\nfloat tileX=float(floor((gl_FragCoord.x)/caracterSize))*caracterSize/screenx;\nfloat tileY=float(floor((gl_FragCoord.y)/caracterSize))*caracterSize/screeny;\nvec2 tileUV=vec2(tileX,tileY);\nvec4 tileColor=texture2D(textureSampler,tileUV);\nvec4 baseColor=texture2D(textureSampler,vUV);\nfloat tileLuminance=getLuminance(tileColor.rgb);\nfloat offsetx=(float(floor(tileLuminance*numChar)))*caracterSize/fontx;\nfloat offsety=0.0;\nfloat x=float(mod(gl_FragCoord.x,caracterSize))/fontx;\nfloat y=float(mod(gl_FragCoord.y,caracterSize))/fonty;\nvec4 finalColor=texture2D(asciiArtFont,vec2(offsetx+x,offsety+(caracterSize/fonty-y)));\nfinalColor.rgb*=tileColor.rgb;\nfinalColor.a=1.0;\nfinalColor=mix(finalColor,tileColor,asciiArtOptions.w);\nfinalColor=mix(finalColor,baseColor,asciiArtOptions.z);\ngl_FragColor=finalColor;\n}";

var BABYLON,__extends=this&&this.__extends||(function(){var o=function(e,r){return(o=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,r){e.__proto__=r}||function(e,r){for(var t in r)r.hasOwnProperty(t)&&(e[t]=r[t])})(e,r)};return function(e,r){function t(){this.constructor=e}o(e,r),e.prototype=null===r?Object.create(r):(t.prototype=r.prototype,new t)}})(),__decorate=this&&this.__decorate||function(e,r,t,o){var n,i=arguments.length,c=i<3?r:null===o?o=Object.getOwnPropertyDescriptor(r,t):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)c=Reflect.decorate(e,r,t,o);else for(var l=e.length-1;0<=l;l--)(n=e[l])&&(c=(i<3?n(c):3<i?n(r,t,c):n(r,t))||c);return 3<i&&c&&Object.defineProperty(r,t,c),c};!(function(l){var e=(function(c){function o(e,r,t,o,n){var i=c.call(this,e,r,"brickProceduralTexture",t,o,n)||this;return i._numberOfBricksHeight=15,i._numberOfBricksWidth=5,i._jointColor=new l.Color3(.72,.72,.72),i._brickColor=new l.Color3(.77,.47,.4),i.updateShaderUniforms(),i}return __extends(o,c),o.prototype.updateShaderUniforms=function(){this.setFloat("numberOfBricksHeight",this._numberOfBricksHeight),this.setFloat("numberOfBricksWidth",this._numberOfBricksWidth),this.setColor3("brickColor",this._brickColor),this.setColor3("jointColor",this._jointColor)},Object.defineProperty(o.prototype,"numberOfBricksHeight",{get:function(){return this._numberOfBricksHeight},set:function(e){this._numberOfBricksHeight=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(o.prototype,"numberOfBricksWidth",{get:function(){return this._numberOfBricksWidth},set:function(e){this._numberOfBricksWidth=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(o.prototype,"jointColor",{get:function(){return this._jointColor},set:function(e){this._jointColor=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(o.prototype,"brickColor",{get:function(){return this._brickColor},set:function(e){this._brickColor=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),o.prototype.serialize=function(){var e=l.SerializationHelper.Serialize(this,c.prototype.serialize.call(this));return e.customType="BABYLON.BrickProceduralTexture",e},o.Parse=function(e,r,t){return l.SerializationHelper.Parse((function(){return new o(e.name,e._size,r,void 0,e._generateMipMaps)}),e,r,t)},__decorate([l.serialize()],o.prototype,"numberOfBricksHeight",null),__decorate([l.serialize()],o.prototype,"numberOfBricksWidth",null),__decorate([l.serializeAsColor3()],o.prototype,"jointColor",null),__decorate([l.serializeAsColor3()],o.prototype,"brickColor",null),o})(l.ProceduralTexture);l.BrickProceduralTexture=e})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.brickProceduralTexturePixelShader="precision highp float;\nvarying vec2 vPosition;\nvarying vec2 vUV;\nuniform float numberOfBricksHeight;\nuniform float numberOfBricksWidth;\nuniform vec3 brickColor;\nuniform vec3 jointColor;\nfloat rand(vec2 n) {\nreturn fract(cos(dot(n,vec2(12.9898,4.1414)))*43758.5453);\n}\nfloat noise(vec2 n) {\nconst vec2 d=vec2(0.0,1.0);\nvec2 b=floor(n),f=smoothstep(vec2(0.0),vec2(1.0),fract(n));\nreturn mix(mix(rand(b),rand(b+d.yx),f.x),mix(rand(b+d.xy),rand(b+d.yy),f.x),f.y);\n}\nfloat fbm(vec2 n) {\nfloat total=0.0,amplitude=1.0;\nfor (int i=0; i<4; i++) {\ntotal+=noise(n)*amplitude;\nn+=n;\namplitude*=0.5;\n}\nreturn total;\n}\nfloat roundF(float number){\nreturn sign(number)*floor(abs(number)+0.5);\n}\nvoid main(void)\n{\nfloat brickW=1.0/numberOfBricksWidth;\nfloat brickH=1.0/numberOfBricksHeight;\nfloat jointWPercentage=0.01;\nfloat jointHPercentage=0.05;\nvec3 color=brickColor;\nfloat yi=vUV.y/brickH;\nfloat nyi=roundF(yi);\nfloat xi=vUV.x/brickW;\nif (mod(floor(yi),2.0) == 0.0){\nxi=xi-0.5;\n}\nfloat nxi=roundF(xi);\nvec2 brickvUV=vec2((xi-floor(xi))/brickH,(yi-floor(yi))/brickW);\nif (yi<nyi+jointHPercentage && yi>nyi-jointHPercentage){\ncolor=mix(jointColor,vec3(0.37,0.25,0.25),(yi-nyi)/jointHPercentage+0.2);\n}\nelse if (xi<nxi+jointWPercentage && xi>nxi-jointWPercentage){\ncolor=mix(jointColor,vec3(0.44,0.44,0.44),(xi-nxi)/jointWPercentage+0.2);\n}\nelse {\nfloat brickColorSwitch=mod(floor(yi)+floor(xi),3.0);\nif (brickColorSwitch == 0.0)\ncolor=mix(color,vec3(0.33,0.33,0.33),0.3);\nelse if (brickColorSwitch == 2.0)\ncolor=mix(color,vec3(0.11,0.11,0.11),0.3);\n}\ngl_FragColor=vec4(color,1.0);\n}";

var BABYLON,__extends=this&&this.__extends||(function(){var t=function(e,o){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,o){e.__proto__=o}||function(e,o){for(var r in o)o.hasOwnProperty(r)&&(e[r]=o[r])})(e,o)};return function(e,o){function r(){this.constructor=e}t(e,o),e.prototype=null===o?Object.create(o):(r.prototype=o.prototype,new r)}})(),__decorate=this&&this.__decorate||function(e,o,r,t){var n,i=arguments.length,l=i<3?o:null===t?t=Object.getOwnPropertyDescriptor(o,r):t;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,o,r,t);else for(var c=e.length-1;0<=c;c--)(n=e[c])&&(l=(i<3?n(l):3<i?n(o,r,l):n(o,r))||l);return 3<i&&l&&Object.defineProperty(o,r,l),l};!(function(c){var e=(function(l){function t(e,o,r,t,n){var i=l.call(this,e,o,"cloudProceduralTexture",r,t,n)||this;return i._skyColor=new c.Color4(.15,.68,1,1),i._cloudColor=new c.Color4(1,1,1,1),i.updateShaderUniforms(),i}return __extends(t,l),t.prototype.updateShaderUniforms=function(){this.setColor4("skyColor",this._skyColor),this.setColor4("cloudColor",this._cloudColor)},Object.defineProperty(t.prototype,"skyColor",{get:function(){return this._skyColor},set:function(e){this._skyColor=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"cloudColor",{get:function(){return this._cloudColor},set:function(e){this._cloudColor=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),t.prototype.serialize=function(){var e=c.SerializationHelper.Serialize(this,l.prototype.serialize.call(this));return e.customType="BABYLON.CloudProceduralTexture",e},t.Parse=function(e,o,r){return c.SerializationHelper.Parse((function(){return new t(e.name,e._size,o,void 0,e._generateMipMaps)}),e,o,r)},__decorate([c.serializeAsColor4()],t.prototype,"skyColor",null),__decorate([c.serializeAsColor4()],t.prototype,"cloudColor",null),t})(c.ProceduralTexture);c.CloudProceduralTexture=e})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.cloudProceduralTexturePixelShader="precision highp float;\nvarying vec2 vUV;\nuniform vec4 skyColor;\nuniform vec4 cloudColor;\nfloat rand(vec2 n) {\nreturn fract(cos(dot(n,vec2(12.9898,4.1414)))*43758.5453);\n}\nfloat noise(vec2 n) {\nconst vec2 d=vec2(0.0,1.0);\nvec2 b=floor(n),f=smoothstep(vec2(0.0),vec2(1.0),fract(n));\nreturn mix(mix(rand(b),rand(b+d.yx),f.x),mix(rand(b+d.xy),rand(b+d.yy),f.x),f.y);\n}\nfloat fbm(vec2 n) {\nfloat total=0.0,amplitude=1.0;\nfor (int i=0; i<4; i++) {\ntotal+=noise(n)*amplitude;\nn+=n;\namplitude*=0.5;\n}\nreturn total;\n}\nvoid main() {\nvec2 p=vUV*12.0;\nvec4 c=mix(skyColor,cloudColor,fbm(p));\ngl_FragColor=c;\n}\n";

var BABYLON,__extends=this&&this.__extends||(function(){var t=function(e,r){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,r){e.__proto__=r}||function(e,r){for(var o in r)r.hasOwnProperty(o)&&(e[o]=r[o])})(e,r)};return function(e,r){function o(){this.constructor=e}t(e,r),e.prototype=null===r?Object.create(r):(o.prototype=r.prototype,new o)}})(),__decorate=this&&this.__decorate||function(e,r,o,t){var n,i=arguments.length,l=i<3?r:null===t?t=Object.getOwnPropertyDescriptor(r,o):t;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,r,o,t);else for(var a=e.length-1;0<=a;a--)(n=e[a])&&(l=(i<3?n(l):3<i?n(r,o,l):n(r,o))||l);return 3<i&&l&&Object.defineProperty(r,o,l),l};!(function(s){var e=(function(l){function a(e,r,o,t,n){var i=l.call(this,e,r,"fireProceduralTexture",o,t,n)||this;return i._time=0,i._speed=new s.Vector2(.5,.3),i._autoGenerateTime=!0,i._alphaThreshold=.5,i._fireColors=a.RedFireColors,i.updateShaderUniforms(),i}return __extends(a,l),a.prototype.updateShaderUniforms=function(){this.setFloat("time",this._time),this.setVector2("speed",this._speed),this.setColor3("c1",this._fireColors[0]),this.setColor3("c2",this._fireColors[1]),this.setColor3("c3",this._fireColors[2]),this.setColor3("c4",this._fireColors[3]),this.setColor3("c5",this._fireColors[4]),this.setColor3("c6",this._fireColors[5]),this.setFloat("alphaThreshold",this._alphaThreshold)},a.prototype.render=function(e){var r=this.getScene();this._autoGenerateTime&&r&&(this._time+=.03*r.getAnimationRatio(),this.updateShaderUniforms()),l.prototype.render.call(this,e)},Object.defineProperty(a,"PurpleFireColors",{get:function(){return[new s.Color3(.5,0,1),new s.Color3(.9,0,1),new s.Color3(.2,0,1),new s.Color3(1,.9,1),new s.Color3(.1,.1,1),new s.Color3(.9,.9,1)]},enumerable:!0,configurable:!0}),Object.defineProperty(a,"GreenFireColors",{get:function(){return[new s.Color3(.5,1,0),new s.Color3(.5,1,0),new s.Color3(.3,.4,0),new s.Color3(.5,1,0),new s.Color3(.2,0,0),new s.Color3(.5,1,0)]},enumerable:!0,configurable:!0}),Object.defineProperty(a,"RedFireColors",{get:function(){return[new s.Color3(.5,0,.1),new s.Color3(.9,0,0),new s.Color3(.2,0,0),new s.Color3(1,.9,0),new s.Color3(.1,.1,.1),new s.Color3(.9,.9,.9)]},enumerable:!0,configurable:!0}),Object.defineProperty(a,"BlueFireColors",{get:function(){return[new s.Color3(.1,0,.5),new s.Color3(0,0,.5),new s.Color3(.1,0,.2),new s.Color3(0,0,1),new s.Color3(.1,.2,.3),new s.Color3(0,.2,.9)]},enumerable:!0,configurable:!0}),Object.defineProperty(a.prototype,"autoGenerateTime",{get:function(){return this._autoGenerateTime},set:function(e){this._autoGenerateTime=e},enumerable:!0,configurable:!0}),Object.defineProperty(a.prototype,"fireColors",{get:function(){return this._fireColors},set:function(e){this._fireColors=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(a.prototype,"time",{get:function(){return this._time},set:function(e){this._time=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(a.prototype,"speed",{get:function(){return this._speed},set:function(e){this._speed=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(a.prototype,"alphaThreshold",{get:function(){return this._alphaThreshold},set:function(e){this._alphaThreshold=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),a.prototype.serialize=function(){var e=s.SerializationHelper.Serialize(this,l.prototype.serialize.call(this));e.customType="BABYLON.FireProceduralTexture",e.fireColors=[];for(var r=0;r<this._fireColors.length;r++)e.fireColors.push(this._fireColors[r].asArray());return e},a.Parse=function(e,r,o){for(var t=s.SerializationHelper.Parse((function(){return new a(e.name,e._size,r,void 0,e._generateMipMaps)}),e,r,o),n=[],i=0;i<e.fireColors.length;i++)n.push(s.Color3.FromArray(e.fireColors[i]));return t.fireColors=n,t},__decorate([s.serialize()],a.prototype,"autoGenerateTime",null),__decorate([s.serialize()],a.prototype,"time",null),__decorate([s.serializeAsVector2()],a.prototype,"speed",null),__decorate([s.serialize()],a.prototype,"alphaThreshold",null),a})(s.ProceduralTexture);s.FireProceduralTexture=e})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.fireProceduralTexturePixelShader="precision highp float;\nuniform float time;\nuniform vec3 c1;\nuniform vec3 c2;\nuniform vec3 c3;\nuniform vec3 c4;\nuniform vec3 c5;\nuniform vec3 c6;\nuniform vec2 speed;\nuniform float shift;\nuniform float alphaThreshold;\nvarying vec2 vUV;\nfloat rand(vec2 n) {\nreturn fract(cos(dot(n,vec2(12.9898,4.1414)))*43758.5453);\n}\nfloat noise(vec2 n) {\nconst vec2 d=vec2(0.0,1.0);\nvec2 b=floor(n),f=smoothstep(vec2(0.0),vec2(1.0),fract(n));\nreturn mix(mix(rand(b),rand(b+d.yx),f.x),mix(rand(b+d.xy),rand(b+d.yy),f.x),f.y);\n}\nfloat fbm(vec2 n) {\nfloat total=0.0,amplitude=1.0;\nfor (int i=0; i<4; i++) {\ntotal+=noise(n)*amplitude;\nn+=n;\namplitude*=0.5;\n}\nreturn total;\n}\nvoid main() {\nvec2 p=vUV*8.0;\nfloat q=fbm(p-time*0.1);\nvec2 r=vec2(fbm(p+q+time*speed.x-p.x-p.y),fbm(p+q-time*speed.y));\nvec3 c=mix(c1,c2,fbm(p+r))+mix(c3,c4,r.x)-mix(c5,c6,r.y);\nvec3 color=c*cos(shift*vUV.y);\nfloat luminance=dot(color.rgb,vec3(0.3,0.59,0.11));\ngl_FragColor=vec4(color,luminance*alphaThreshold+(1.0-alphaThreshold));\n}";

var BABYLON,__extends=this&&this.__extends||(function(){var t=function(r,o){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(r,o){r.__proto__=o}||function(r,o){for(var e in o)o.hasOwnProperty(e)&&(r[e]=o[e])})(r,o)};return function(r,o){function e(){this.constructor=r}t(r,o),r.prototype=null===o?Object.create(o):(e.prototype=o.prototype,new e)}})(),__decorate=this&&this.__decorate||function(r,o,e,t){var n,s=arguments.length,i=s<3?o:null===t?t=Object.getOwnPropertyDescriptor(o,e):t;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)i=Reflect.decorate(r,o,e,t);else for(var l=r.length-1;0<=l;l--)(n=r[l])&&(i=(s<3?n(i):3<s?n(o,e,i):n(o,e))||i);return 3<s&&i&&Object.defineProperty(o,e,i),i};!(function(a){var r=(function(i){function l(r,o,e,t,n){var s=i.call(this,r,o,"grassProceduralTexture",e,t,n)||this;return s._groundColor=new a.Color3(1,1,1),s._grassColors=[new a.Color3(.29,.38,.02),new a.Color3(.36,.49,.09),new a.Color3(.51,.6,.28)],s.updateShaderUniforms(),s}return __extends(l,i),l.prototype.updateShaderUniforms=function(){this.setColor3("herb1Color",this._grassColors[0]),this.setColor3("herb2Color",this._grassColors[1]),this.setColor3("herb3Color",this._grassColors[2]),this.setColor3("groundColor",this._groundColor)},Object.defineProperty(l.prototype,"grassColors",{get:function(){return this._grassColors},set:function(r){this._grassColors=r,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"groundColor",{get:function(){return this._groundColor},set:function(r){this._groundColor=r,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),l.prototype.serialize=function(){var r=a.SerializationHelper.Serialize(this,i.prototype.serialize.call(this));r.customType="BABYLON.GrassProceduralTexture",r.grassColors=[];for(var o=0;o<this._grassColors.length;o++)r.grassColors.push(this._grassColors[o].asArray());return r},l.Parse=function(r,o,e){for(var t=a.SerializationHelper.Parse((function(){return new l(r.name,r._size,o,void 0,r._generateMipMaps)}),r,o,e),n=[],s=0;s<r.grassColors.length;s++)n.push(a.Color3.FromArray(r.grassColors[s]));return t.grassColors=n,t},__decorate([a.serializeAsColor3()],l.prototype,"groundColor",null),l})(a.ProceduralTexture);a.GrassProceduralTexture=r})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.grassProceduralTexturePixelShader="precision highp float;\nvarying vec2 vPosition;\nvarying vec2 vUV;\nuniform vec3 herb1Color;\nuniform vec3 herb2Color;\nuniform vec3 herb3Color;\nuniform vec3 groundColor;\nfloat rand(vec2 n) {\nreturn fract(cos(dot(n,vec2(12.9898,4.1414)))*43758.5453);\n}\nfloat noise(vec2 n) {\nconst vec2 d=vec2(0.0,1.0);\nvec2 b=floor(n),f=smoothstep(vec2(0.0),vec2(1.0),fract(n));\nreturn mix(mix(rand(b),rand(b+d.yx),f.x),mix(rand(b+d.xy),rand(b+d.yy),f.x),f.y);\n}\nfloat fbm(vec2 n) {\nfloat total=0.0,amplitude=1.0;\nfor (int i=0; i<4; i++) {\ntotal+=noise(n)*amplitude;\nn+=n;\namplitude*=0.5;\n}\nreturn total;\n}\nvoid main(void) {\nvec3 color=mix(groundColor,herb1Color,rand(gl_FragCoord.xy*4.0));\ncolor=mix(color,herb2Color,rand(gl_FragCoord.xy*8.0));\ncolor=mix(color,herb3Color,rand(gl_FragCoord.xy));\ncolor=mix(color,herb1Color,fbm(gl_FragCoord.xy*16.0));\ngl_FragColor=vec4(color,1.0);\n}";

var BABYLON,__extends=this&&this.__extends||(function(){var r=function(e,t){return(r=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t}||function(e,t){for(var n in t)t.hasOwnProperty(n)&&(e[n]=t[n])})(e,t)};return function(e,t){function n(){this.constructor=e}r(e,t),e.prototype=null===t?Object.create(t):(n.prototype=t.prototype,new n)}})(),__decorate=this&&this.__decorate||function(e,t,n,r){var i,o=arguments.length,l=o<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,n):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;0<=a;a--)(i=e[a])&&(l=(o<3?i(l):3<o?i(t,n,l):i(t,n))||l);return 3<o&&l&&Object.defineProperty(t,n,l),l};!(function(a){var e=(function(l){function r(e,t,n,r,i){var o=l.call(this,e,t,"marbleProceduralTexture",n,r,i)||this;return o._numberOfTilesHeight=3,o._numberOfTilesWidth=3,o._amplitude=9,o._jointColor=new a.Color3(.72,.72,.72),o.updateShaderUniforms(),o}return __extends(r,l),r.prototype.updateShaderUniforms=function(){this.setFloat("numberOfTilesHeight",this._numberOfTilesHeight),this.setFloat("numberOfTilesWidth",this._numberOfTilesWidth),this.setFloat("amplitude",this._amplitude),this.setColor3("jointColor",this._jointColor)},Object.defineProperty(r.prototype,"numberOfTilesHeight",{get:function(){return this._numberOfTilesHeight},set:function(e){this._numberOfTilesHeight=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(r.prototype,"amplitude",{get:function(){return this._amplitude},set:function(e){this._amplitude=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(r.prototype,"numberOfTilesWidth",{get:function(){return this._numberOfTilesWidth},set:function(e){this._numberOfTilesWidth=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(r.prototype,"jointColor",{get:function(){return this._jointColor},set:function(e){this._jointColor=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),r.prototype.serialize=function(){var e=a.SerializationHelper.Serialize(this,l.prototype.serialize.call(this));return e.customType="BABYLON.MarbleProceduralTexture",e},r.Parse=function(e,t,n){return a.SerializationHelper.Parse((function(){return new r(e.name,e._size,t,void 0,e._generateMipMaps)}),e,t,n)},__decorate([a.serialize()],r.prototype,"numberOfTilesHeight",null),__decorate([a.serialize()],r.prototype,"amplitude",null),__decorate([a.serialize()],r.prototype,"numberOfTilesWidth",null),__decorate([a.serialize()],r.prototype,"jointColor",null),r})(a.ProceduralTexture);a.MarbleProceduralTexture=e})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.marbleProceduralTexturePixelShader="precision highp float;\nvarying vec2 vPosition;\nvarying vec2 vUV;\nuniform float numberOfTilesHeight;\nuniform float numberOfTilesWidth;\nuniform float amplitude;\nuniform vec3 marbleColor;\nuniform vec3 jointColor;\nconst vec3 tileSize=vec3(1.1,1.0,1.1);\nconst vec3 tilePct=vec3(0.98,1.0,0.98);\nfloat rand(vec2 n) {\nreturn fract(cos(dot(n,vec2(12.9898,4.1414)))*43758.5453);\n}\nfloat noise(vec2 n) {\nconst vec2 d=vec2(0.0,1.0);\nvec2 b=floor(n),f=smoothstep(vec2(0.0),vec2(1.0),fract(n));\nreturn mix(mix(rand(b),rand(b+d.yx),f.x),mix(rand(b+d.xy),rand(b+d.yy),f.x),f.y);\n}\nfloat turbulence(vec2 P)\n{\nfloat val=0.0;\nfloat freq=1.0;\nfor (int i=0; i<4; i++)\n{\nval+=abs(noise(P*freq)/freq);\nfreq*=2.07;\n}\nreturn val;\n}\nfloat roundF(float number){\nreturn sign(number)*floor(abs(number)+0.5);\n}\nvec3 marble_color(float x)\n{\nvec3 col;\nx=0.5*(x+1.);\nx=sqrt(x); \nx=sqrt(x);\nx=sqrt(x);\ncol=vec3(.2+.75*x); \ncol.b*=0.95; \nreturn col;\n}\nvoid main()\n{\nfloat brickW=1.0/numberOfTilesWidth;\nfloat brickH=1.0/numberOfTilesHeight;\nfloat jointWPercentage=0.01;\nfloat jointHPercentage=0.01;\nvec3 color=marbleColor;\nfloat yi=vUV.y/brickH;\nfloat nyi=roundF(yi);\nfloat xi=vUV.x/brickW;\nif (mod(floor(yi),2.0) == 0.0){\nxi=xi-0.5;\n}\nfloat nxi=roundF(xi);\nvec2 brickvUV=vec2((xi-floor(xi))/brickH,(yi-floor(yi))/brickW);\nif (yi<nyi+jointHPercentage && yi>nyi-jointHPercentage){\ncolor=mix(jointColor,vec3(0.37,0.25,0.25),(yi-nyi)/jointHPercentage+0.2);\n}\nelse if (xi<nxi+jointWPercentage && xi>nxi-jointWPercentage){\ncolor=mix(jointColor,vec3(0.44,0.44,0.44),(xi-nxi)/jointWPercentage+0.2);\n}\nelse {\nfloat t=6.28*brickvUV.x/(tileSize.x+noise(vec2(vUV)*6.0));\nt+=amplitude*turbulence(brickvUV.xy);\nt=sin(t);\ncolor=marble_color(t);\n}\ngl_FragColor=vec4(color,0.0);\n}";

var BABYLON,__extends=this&&this.__extends||(function(){var t=function(e,r){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,r){e.__proto__=r}||function(e,r){for(var o in r)r.hasOwnProperty(o)&&(e[o]=r[o])})(e,r)};return function(e,r){function o(){this.constructor=e}t(e,r),e.prototype=null===r?Object.create(r):(o.prototype=r.prototype,new o)}})(),__decorate=this&&this.__decorate||function(e,r,o,t){var n,a=arguments.length,i=a<3?r:null===t?t=Object.getOwnPropertyDescriptor(r,o):t;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)i=Reflect.decorate(e,r,o,t);else for(var c=e.length-1;0<=c;c--)(n=e[c])&&(i=(a<3?n(i):3<a?n(r,o,i):n(r,o))||i);return 3<a&&i&&Object.defineProperty(r,o,i),i};!(function(c){var e=(function(i){function t(e,r,o,t,n){var a=i.call(this,e,r,"roadProceduralTexture",o,t,n)||this;return a._roadColor=new c.Color3(.53,.53,.53),a.updateShaderUniforms(),a}return __extends(t,i),t.prototype.updateShaderUniforms=function(){this.setColor3("roadColor",this._roadColor)},Object.defineProperty(t.prototype,"roadColor",{get:function(){return this._roadColor},set:function(e){this._roadColor=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),t.prototype.serialize=function(){var e=c.SerializationHelper.Serialize(this,i.prototype.serialize.call(this));return e.customType="BABYLON.RoadProceduralTexture",e},t.Parse=function(e,r,o){return c.SerializationHelper.Parse((function(){return new t(e.name,e._size,r,void 0,e._generateMipMaps)}),e,r,o)},__decorate([c.serializeAsColor3()],t.prototype,"roadColor",null),t})(c.ProceduralTexture);c.RoadProceduralTexture=e})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.roadProceduralTexturePixelShader="precision highp float;\nvarying vec2 vUV; \nuniform vec3 roadColor;\nfloat rand(vec2 n) {\nreturn fract(cos(dot(n,vec2(12.9898,4.1414)))*43758.5453);\n}\nfloat noise(vec2 n) {\nconst vec2 d=vec2(0.0,1.0);\nvec2 b=floor(n),f=smoothstep(vec2(0.0),vec2(1.0),fract(n));\nreturn mix(mix(rand(b),rand(b+d.yx),f.x),mix(rand(b+d.xy),rand(b+d.yy),f.x),f.y);\n}\nfloat fbm(vec2 n) {\nfloat total=0.0,amplitude=1.0;\nfor (int i=0; i<4; i++) {\ntotal+=noise(n)*amplitude;\nn+=n;\namplitude*=0.5;\n}\nreturn total;\n}\nvoid main(void) {\nfloat ratioy=mod(gl_FragCoord.y*100.0 ,fbm(vUV*2.0));\nvec3 color=roadColor*ratioy;\ngl_FragColor=vec4(color,1.0);\n}";

var BABYLON,__extends=this&&this.__extends||(function(){var i=function(t,e){return(i=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var r in e)e.hasOwnProperty(r)&&(t[r]=e[r])})(t,e)};return function(t,e){function r(){this.constructor=t}i(t,e),t.prototype=null===e?Object.create(e):(r.prototype=e.prototype,new r)}})(),__decorate=this&&this.__decorate||function(t,e,r,i){var n,o=arguments.length,a=o<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,r,i);else for(var s=t.length-1;0<=s;s--)(n=t[s])&&(a=(o<3?n(a):3<o?n(e,r,a):n(e,r))||a);return 3<o&&a&&Object.defineProperty(e,r,a),a};!(function(n){var t=(function(a){function i(t,e,r,i,n){var o=a.call(this,t,e,"starfieldProceduralTexture",r,i,n)||this;return o._time=1,o._alpha=.5,o._beta=.8,o._zoom=.8,o._formuparam=.53,o._stepsize=.1,o._tile=.85,o._brightness=.0015,o._darkmatter=.4,o._distfading=.73,o._saturation=.85,o.updateShaderUniforms(),o}return __extends(i,a),i.prototype.updateShaderUniforms=function(){this.setFloat("time",this._time),this.setFloat("alpha",this._alpha),this.setFloat("beta",this._beta),this.setFloat("zoom",this._zoom),this.setFloat("formuparam",this._formuparam),this.setFloat("stepsize",this._stepsize),this.setFloat("tile",this._tile),this.setFloat("brightness",this._brightness),this.setFloat("darkmatter",this._darkmatter),this.setFloat("distfading",this._distfading),this.setFloat("saturation",this._saturation)},Object.defineProperty(i.prototype,"time",{get:function(){return this._time},set:function(t){this._time=t,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(i.prototype,"alpha",{get:function(){return this._alpha},set:function(t){this._alpha=t,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(i.prototype,"beta",{get:function(){return this._beta},set:function(t){this._beta=t,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(i.prototype,"formuparam",{get:function(){return this._formuparam},set:function(t){this._formuparam=t,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(i.prototype,"stepsize",{get:function(){return this._stepsize},set:function(t){this._stepsize=t,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(i.prototype,"zoom",{get:function(){return this._zoom},set:function(t){this._zoom=t,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(i.prototype,"tile",{get:function(){return this._tile},set:function(t){this._tile=t,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(i.prototype,"brightness",{get:function(){return this._brightness},set:function(t){this._brightness=t,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(i.prototype,"darkmatter",{get:function(){return this._darkmatter},set:function(t){this._darkmatter=t,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(i.prototype,"distfading",{get:function(){return this._distfading},set:function(t){this._distfading=t,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(i.prototype,"saturation",{get:function(){return this._saturation},set:function(t){this._saturation=t,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),i.prototype.serialize=function(){var t=n.SerializationHelper.Serialize(this,a.prototype.serialize.call(this));return t.customType="BABYLON.StarfieldProceduralTexture",t},i.Parse=function(t,e,r){return n.SerializationHelper.Parse((function(){return new i(t.name,t._size,e,void 0,t._generateMipMaps)}),t,e,r)},__decorate([n.serialize()],i.prototype,"time",null),__decorate([n.serialize()],i.prototype,"alpha",null),__decorate([n.serialize()],i.prototype,"beta",null),__decorate([n.serialize()],i.prototype,"formuparam",null),__decorate([n.serialize()],i.prototype,"stepsize",null),__decorate([n.serialize()],i.prototype,"zoom",null),__decorate([n.serialize()],i.prototype,"tile",null),__decorate([n.serialize()],i.prototype,"brightness",null),__decorate([n.serialize()],i.prototype,"darkmatter",null),__decorate([n.serialize()],i.prototype,"distfading",null),__decorate([n.serialize()],i.prototype,"saturation",null),i})(n.ProceduralTexture);n.StarfieldProceduralTexture=t})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.starfieldProceduralTexturePixelShader="precision highp float;\n\n#define volsteps 20\n#define iterations 15\nvarying vec2 vPosition;\nvarying vec2 vUV;\nuniform float time;\nuniform float alpha;\nuniform float beta;\nuniform float zoom;\nuniform float formuparam;\nuniform float stepsize;\nuniform float tile;\nuniform float brightness;\nuniform float darkmatter;\nuniform float distfading;\nuniform float saturation;\nvoid main()\n{\nvec3 dir=vec3(vUV*zoom,1.);\nfloat localTime=time*0.0001;\n\nmat2 rot1=mat2(cos(alpha),sin(alpha),-sin(alpha),cos(alpha));\nmat2 rot2=mat2(cos(beta),sin(beta),-sin(beta),cos(beta));\ndir.xz*=rot1;\ndir.xy*=rot2;\nvec3 from=vec3(1.,.5,0.5);\nfrom+=vec3(-2.,localTime*2.,localTime);\nfrom.xz*=rot1;\nfrom.xy*=rot2;\n\nfloat s=0.1,fade=1.;\nvec3 v=vec3(0.);\nfor (int r=0; r<volsteps; r++) {\nvec3 p=from+s*dir*.5;\np=abs(vec3(tile)-mod(p,vec3(tile*2.))); \nfloat pa,a=pa=0.;\nfor (int i=0; i<iterations; i++) {\np=abs(p)/dot(p,p)-formuparam; \na+=abs(length(p)-pa); \npa=length(p);\n}\nfloat dm=max(0.,darkmatter-a*a*.001); \na*=a*a; \nif (r>6) fade*=1.-dm; \n\nv+=fade;\nv+=vec3(s,s*s,s*s*s*s)*a*brightness*fade; \nfade*=distfading; \ns+=stepsize;\n}\nv=mix(vec3(length(v)),v,saturation); \ngl_FragColor=vec4(v*.01,1.);\n}";
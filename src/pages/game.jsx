import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import * as CANNON from "cannon-es";
import BaddieSealBar from "../components/BaddieSealBar";
import ControlsOverlay from "../components/ControlsOverlay";

// Import models
import genUrl from "../models/gen.glb";
import tyreUrl from "../models/tyre.glb";
import collegeUrl from "../models/college.glb";
import shopUrl from "../models/shop.glb";
import groundUrl from "../models/env/ground2.glb";
import laddernpcUrl from "../models/laddernpc.glb";
import normalNpcUrl from "../models/npc.glb";
import bgmUrl from "../models/music/bgm1.ogg";
import generatorSoundUrl from "../models/music/genrator .ogg";
import npcScreamUrl from "../models/music/npc-scream.mp3";
import collisionUrl from "../models/music/collision.mp3";
import explosionSoundUrl from "../models/music/explosion.mp3";
import finalBgmUrl from "../models/music/bgm.ogg";
import debUrl from "../models/deb.glb";
import prashantUrl from "../models/prashant.glb";
import hsUrl from "../models/hs.jpeg";

export default function Game() {
  const [uiHealth, setUiHealth] = useState(100);
  const [hasTyreUI, setHasTyreUI] = useState(false);
  const [damagePops, setDamagePops] = useState([]); // Transient damage feedback array
  const [uiGameState, setUiGameState] = useState('home'); // For React UI
  const gameStateRef = useRef('home'); // For game loop/listeners
  const [cinematicPhase, setCinematicPhase] = useState(null); // 'shaking', 'blackout', 'revealed'
  const [cinematicMessage, setCinematicMessage] = useState(""); 
  const [showControls, setShowControls] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const mountRef = useRef(null);
  const playerRef = useRef(null);
  const collegeModelRef = useRef(null);
  const shakeIntensity = useRef(0);
  const rewardMixer = useRef(null);
  const hasSpawnedReward = useRef(false);
  const axleRef = useRef(null); // Ref for the generator axle animation
  const generatorRef = useRef(null); // Ref for the generator model
  const tyreRef = useRef(null); // Ref for the torus tyre
  const bgmRef = useRef(null); // Ref for background music session
  const finalBgmRef = useRef(null); // Ref for final atmospheric music
  const explosionSoundRef = useRef(null); // Ref for explosion SFX
  const generatorSoundRef = useRef(null); // Ref for engine sound
  const activeTyres = useRef([]); // Track multiple launched tyres
  const tyreVelocity = useRef(new THREE.Vector3(0, 0, 0));
  const hasTyre = useRef(false); // Player inventory
  const isTopView = useRef(false); // Debug camera toggle
  const buildingHealth = useRef(100); // College Health
  const currentWave = useRef(0); // Tracking NPC wave
  const activeNPCs = useRef([]); // NPC synchronization collection
  const activeLanes = useRef([-6, -2, 2, 6]); // Tracking available orthogonal spawn lanes

  // Physics Refs
  const worldRef = useRef(null);
  const playerBodyRef = useRef(null);
  const generatorBodyRef = useRef(null);
  const groundBodyRef = useRef(null);
  const buildingBodyRef = useRef(null);
  const introTimerRef = useRef(null);

  useEffect(() => {
    if (uiGameState === 'intro') {
      // Start audio immediately for atmosphere
      if (bgmRef.current && bgmRef.current.context.state === 'suspended') {
        bgmRef.current.context.resume();
      }
      if (bgmRef.current && !bgmRef.current.isPlaying) bgmRef.current.play();
      if (generatorSoundRef.current && !generatorSoundRef.current.isPlaying) generatorSoundRef.current.play();

      introTimerRef.current = setTimeout(() => {
        setUiGameState('playing');
        gameStateRef.current = 'playing';
      }, 7500); // 7.5s for slow reveal + reading time + final fade
    }
    return () => {
      if (introTimerRef.current) clearTimeout(introTimerRef.current);
    };
  }, [uiGameState]);

  useEffect(() => {
    // Mobile detection
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Camera Rotation State
  const yaw = useRef(0);
  const pitch = useRef(0);
  const cameraDistance = useRef(8);
  const sensitivity = 0.002;

  useEffect(() => {
    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Slate dark
    const clock = new THREE.Clock(); // Shared delta clock

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Mobile efficiency
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace; // Critical for GLTF textures
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    if (mountRef.current) mountRef.current.innerHTML = "";
    mountRef.current.appendChild(renderer.domElement);

    // Pointer Lock Controls (Minecraft-style lock)
    const controls = new PointerLockControls(camera, renderer.domElement);
    const handleLock = () => {
      if (gameStateRef.current !== 'playing') return;
      if (!('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
        controls.lock();
      }
      if (bgmRef.current && bgmRef.current.context.state === 'suspended') {
        bgmRef.current.context.resume();
      }
    };
    renderer.domElement.addEventListener("click", handleLock);

    // Touch Camera Control
    let lastTouchX = 0;
    let lastTouchY = 0;
    const onTouchMove = (e) => {
      if (e.touches.length === 1 && gameStateRef.current === 'playing') {
        const touch = e.touches[0];
        const deltaX = touch.pageX - lastTouchX;
        const deltaY = touch.pageY - lastTouchY;
        
        yaw.current -= deltaX * sensitivity * 0.8;
        pitch.current -= deltaY * sensitivity * 0.8;
        const limit = Math.PI / 3;
        pitch.current = Math.max(-limit, Math.min(limit, pitch.current));
        
        lastTouchX = touch.pageX;
        lastTouchY = touch.pageY;
      }
    };
    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        lastTouchX = e.touches[0].pageX;
        lastTouchY = e.touches[0].pageY;
      }
    };
    document.addEventListener("touchstart", onTouchStart);
    document.addEventListener("touchmove", onTouchMove);

    // Update yaw/pitch based on mouse movement
    const onMouseMove = (e) => {
      if (controls.isLocked) {
        yaw.current -= e.movementX * sensitivity;
        pitch.current -= e.movementY * sensitivity;

        // Clamp pitch
        const limit = Math.PI / 3;
        pitch.current = Math.max(-limit, Math.min(limit, pitch.current));
      }
    };
    document.addEventListener("mousemove", onMouseMove);
    
    const onWheel = (e) => {
      cameraDistance.current += e.deltaY * 0.05;
      cameraDistance.current = Math.max(3, Math.min(200, cameraDistance.current)); // Clamp zoom
    };
    window.addEventListener("wheel", onWheel);

    // 2. Physics World Initialisation (Requirement 1 & 2)
    const groundSize = 500; // Define early to avoid ReferenceError
    const loader = new GLTFLoader(); // Define early to avoid ReferenceError
    
    const autoScale = (model, targetSize = 4) => {
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        model.scale.setScalar(targetSize / maxDim);
      }
      model.updateMatrixWorld();
      const updatedBox = new THREE.Box3().setFromObject(model);
      model.position.y -= updatedBox.min.y;
    };

    // 2.5 Audio setup
    const listener = new THREE.AudioListener();
    camera.add(listener);
    const bgm = new THREE.Audio(listener);
    bgmRef.current = bgm;
    const audioLoader = new THREE.AudioLoader();

    audioLoader.load(bgmUrl, (buffer) => {
      bgm.setBuffer(buffer);
      bgm.setLoop(true);
      bgm.setVolume(0.4);
    });

    const generatorSound = new THREE.PositionalAudio(listener);
    generatorSoundRef.current = generatorSound;
    audioLoader.load(generatorSoundUrl, (buffer) => {
      generatorSound.setBuffer(buffer);
      generatorSound.setLoop(true);
      generatorSound.setVolume(0.126);
      generatorSound.setRefDistance(2);
      generatorSound.setMaxDistance(10);
      generatorSound.setRolloffFactor(4);
    });

    const npcScream = new THREE.Audio(listener);
    audioLoader.load(npcScreamUrl, (buffer) => {
      npcScream.setBuffer(buffer);
      npcScream.setVolume(0.4);
    });

    const explosionSound = new THREE.Audio(listener);
    explosionSoundRef.current = explosionSound;
    audioLoader.load(explosionSoundUrl, (buffer) => {
      explosionSound.setBuffer(buffer);
      explosionSound.setVolume(0.8);
    });

    const finalBgm = new THREE.Audio(listener);
    finalBgmRef.current = finalBgm;
    audioLoader.load(finalBgmUrl, (buffer) => {
      finalBgm.setBuffer(buffer);
      finalBgm.setLoop(true);
      finalBgm.setVolume(0.25);
    });

    const collisionSound = new THREE.Audio(listener);
    audioLoader.load(collisionUrl, (buffer) => {
      collisionSound.setBuffer(buffer);
      collisionSound.setVolume(0.35);
    });

    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    worldRef.current = world;

    // Physics Materials
    const groundMaterial = new CANNON.Material("groundMaterial");
    const tyreMaterial = new CANNON.Material("tyreMaterial");

    const tyreGroundContact = new CANNON.ContactMaterial(groundMaterial, tyreMaterial, {
      friction: 0.2, // Restored to previous value
      restitution: 0.3,
      contactEquationStiffness: 1e8,
      contactEquationRelaxation: 3,
      frictionEquationStiffness: 1e8,
      frictionEquationRelaxation: 3
    });
    world.addContactMaterial(tyreGroundContact);

    const npcMaterial = new CANNON.Material("npcMaterial");
    // Despawn helper to clear previous wave
    const despawnAllNPCs = () => {
      activeNPCs.current.forEach(npc => {
        world.removeBody(npc.body);
        scene.remove(npc.mesh);
      });
      activeNPCs.current = [];
    };

    // NPC Spawning Helper
    const spawnNPC = (type, count) => {
      for (let i = 0; i < count; i++) {
        // Random non-overlapping spawn logic
        let posX, posZ;
        let attempts = 0;
        let isOverlapping = true;

        while (isOverlapping && attempts < 15) {
          posX = (Math.random() - 0.5) * 16; // Random horizontal offset within trajectory
          posZ = -90 - Math.random() * 40;   // Randomized depth
          
          isOverlapping = activeNPCs.current.some(npc => {
            const dist = Math.sqrt(
              Math.pow(npc.body.position.x - posX, 2) + 
              Math.pow(npc.body.position.z - posZ, 2)
            );
            return dist < 4; // Ensure at least 4 units of space between NPCs
          });
          attempts++;
        }        
        const isLadder = type === 'ladder';
        
        const npcBody = new CANNON.Body({
          mass: isLadder ? 5 : 2,
          material: npcMaterial,
          linearDamping: 0.9,
          angularDamping: 0.9,
          fixedRotation: true
        });

        // Core central shape
        const mainShape = new CANNON.Box(new CANNON.Vec3(0.75, 1.25, 0.75));
        npcBody.addShape(mainShape);

        if (isLadder) {
           // Physical slanted ramp bounding box facing the generator track
           const rampShape = new CANNON.Box(new CANNON.Vec3(0.75, 0.5, 0.75));
           const rampQuat = new CANNON.Quaternion();
           rampQuat.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 4); // Pitched back to create upward sliding wedge
           npcBody.addShape(rampShape, new CANNON.Vec3(0, -0.5, 1.0), rampQuat); 
        }

        npcBody.position.set(posX, 2, posZ);
        
        // Metadata for high-speed movement and advanced wave logics
        npcBody.userData = {
          speed: 45, // Extreme speed for maximum collision probability
          direction: Math.random() > 0.5 ? 1 : -1,
          type: isLadder ? 'ladder' : 'normal',
          state: 'blocking',
          timer: 0
        };
        
        const wrapper = new THREE.Object3D();
        scene.add(wrapper);

        npcBody.addEventListener("collide", (e) => {
          if (e.body.isTyre) {
            if (isLadder) {
              const currentV = e.body.velocity;
              // Deflect upward and AWAY from the building (reverse Z)
              e.body.velocity.set(currentV.x, currentV.y + 12, -currentV.z);
            } else {
              npcBody.fixedRotation = false;
              npcBody.updateMassProperties();
              // 1. Launch the NPC away (kept from before)
              const v = npcBody.velocity;
              npcBody.velocity.set(v.x * 2, v.y + 6, v.z);
              
              // Consistent scream effect (Plays every time on touch)
              if (npcScream.buffer) {
                 if (npcScream.isPlaying) npcScream.stop();
                 npcScream.play();
              }
              
              // 2. Immediately stop the tyre movement
              e.body.velocity.set(0, 0, 0);
              e.body.angularVelocity.set(0, 0, 0);
              
              // 3. Despawn the tyre quickly to prevent any clipping damage to building behind it
              if (!e.body.isDespawning) {
                e.body.isDespawning = true;
                setTimeout(() => {
                  if (world.bodies.includes(e.body)) world.removeBody(e.body);
                  const tIndex = activeTyres.current.findIndex(t => t.body === e.body);
                  if (tIndex !== -1) {
                    scene.remove(activeTyres.current[tIndex].mesh);
                    activeTyres.current.splice(tIndex, 1);
                  }
                }, 50);
              }
              
              // Despawn after short delay
              setTimeout(() => {
                world.removeBody(npcBody);
                scene.remove(wrapper);
                activeNPCs.current = activeNPCs.current.filter(n => n.body !== npcBody);
              }, 1000);
            }
          }
        });

        world.addBody(npcBody);

        if (isLadder) {
           loader.load(laddernpcUrl, (gltf) => {
             const ladderMesh = gltf.scene;
             autoScale(ladderMesh, 4); // Scaled to half of previous
             
             ladderMesh.traverse((child) => {
               if (child.isMesh) {
                 child.castShadow = true;
                 child.receiveShadow = true;
               }
             });
             
             ladderMesh.position.y = -2; // center it against the collision box vertical bounds
             wrapper.add(ladderMesh);
           });
        } else {
           loader.load(normalNpcUrl, (gltf) => {
             const npcMesh = gltf.scene;
             autoScale(npcMesh, 3.5); // Normalized reasonable size
             npcMesh.scale.y *= 1.25; // "height 1.25 times kr de"
             
             npcMesh.traverse((child) => {
               if (child.isMesh) {
                 child.castShadow = true;
                 child.receiveShadow = true;
               }
             });
             
             npcMesh.position.y = -1; // Align to collider vertical center
             wrapper.add(npcMesh);
           });
        }
        
        activeNPCs.current.push({ body: npcBody, mesh: wrapper });
      }
    };

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(5, 10, 7);
    sunLight.castShadow = true;
    scene.add(sunLight);

    // Initial fallback physics plane to stop player from falling during async load
    const fallbackGroundBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(groundSize / 2, 5, groundSize / 2)),
      material: groundMaterial
    });
    fallbackGroundBody.position.set(0, -5, 0);
    world.addBody(fallbackGroundBody);

    // 4. Create Fast Optimized Ground Platform
    // Size bounded around building (-160z) and shop (40z)
    const groundShape = new CANNON.Box(new CANNON.Vec3(80, 1, 140)); // half extents
    const platformBody = new CANNON.Body({ mass: 0, material: groundMaterial });
    platformBody.addShape(groundShape);
    platformBody.position.set(0, -1, -60); // Offset down by 1 unit thickness so top surface is y=0
    
    world.addBody(platformBody);
    groundBodyRef.current = platformBody;
    world.removeBody(fallbackGroundBody);

    // Load original glb as visual overlay matching exact dimensions
    loader.load(groundUrl, (gltf) => {
      const model = gltf.scene;

      const initialBox = new THREE.Box3().setFromObject(model);
      const initialSize = initialBox.getSize(new THREE.Vector3());

      if (initialSize.x > 0 && initialSize.z > 0) {
        // Scale to force-fit exactly into 160x280 area
        const scaleX = 160 / initialSize.x;
        const scaleZ = 280 / initialSize.z;
        model.scale.set(scaleX, scaleX, scaleZ); // Uniform height scale relative to width
      }

      model.updateMatrixWorld();
      const box = new THREE.Box3().setFromObject(model);
      
      // Align top geometry to y=0 and position inside physics zone
      model.position.y -= box.max.y;
      model.position.x = 0;
      model.position.z = -60;

      model.traverse((child) => {
        if (child.isMesh) {
          child.receiveShadow = true;
          child.castShadow = true;
        }
      });
      scene.add(model);
    });

    // Grid removed as per request

    // 5. Player (Mesh & Body Separation - Requirement 1)
    const playerGeo = new THREE.BoxGeometry(1, 1, 1);
    const playerMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
    const player = new THREE.Mesh(playerGeo, playerMat);
    player.position.y = 0.5;
    player.castShadow = true;
    scene.add(player);
    playerRef.current = player;

    const playerBody = new CANNON.Body({
      mass: 1,
      shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
      fixedRotation: true
    });
    playerBody.position.set(0, 0.5, 0);
    world.addBody(playerBody);
    playerBodyRef.current = playerBody;

    // 6. Load 3D Models

    loader.load(genUrl, (gltf) => {
      const model = gltf.scene;
      model.position.set(0, 0, -10);
      autoScale(model, 5);
      generatorRef.current = model;

      // Generator Physics Body
      const genBody = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(2.5, 1, 1.5))
      });
      genBody.position.set(0, 1, -10);
      world.addBody(genBody);
      generatorBodyRef.current = genBody;

      // Attach machinery sound to the model
      model.add(generatorSound);

      // 6.2 Manual Axle & Tyre (Inside model hierarchy)
      const axleGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.2, 32);
      const axleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 });
      const axle = new THREE.Mesh(axleGeo, axleMat);
      axle.position.set(-0.55, 0.36, 0); // Original model offset
      axle.rotation.z = Math.PI / 2;
      axle.castShadow = true;
      model.add(axle);
      axleRef.current = axle;

      const torusGeo = new THREE.TorusGeometry(0.18, 0.05, 16, 64);
      const torusMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 });
      const tyre = new THREE.Mesh(torusGeo, torusMat);
      tyre.rotation.x = Math.PI / 2;
      tyre.castShadow = true;
      tyre.receiveShadow = true;
      tyre.position.set(0, 0, 0); // Centered on axle
      axle.add(tyre);
      tyreRef.current = tyre;
      tyre.visible = false; // Start with no tyre mounted (Requirement 3)

      // Kinematic tyre body removed to allow dynamic spawning

      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          // Hide internal model tyre if it exists to prevent duplicates
          if (child.name.toLowerCase().includes("tyre") || child.name.toLowerCase().includes("wheel")) {
            child.visible = false;
          }
        }
      });
      scene.add(model);
    });



    loader.load(collegeUrl, (gltf) => {
      // 1. Double-Load Prevention
      const existing = scene.getObjectByName("BUILDING_ROOT");
      if (existing) scene.remove(existing);

      const model = gltf.scene;
      model.name = "BUILDING_ROOT";
      collegeModelRef.current = model; // Store for cinematic swap
      model.position.set(0, 0, -160); // Shifted closer by 50 units
      autoScale(model, 120); // Massive building

      // Calculate Bounding Box for Physics Body
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      const buildingShape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
      const buildingBody = new CANNON.Body({ mass: 0 });
      buildingBody.addShape(buildingShape);
      buildingBody.position.copy(center);
      buildingBodyRef.current = buildingBody;
      world.addBody(buildingBody);
      
      buildingBody.addEventListener("collide", (e) => {
        if (e.body.isTyre && !e.body.hasDamaged && buildingHealth.current > 0) {
          e.body.hasDamaged = true; // Prevent multihit from same tyre
          
          // Collision sound with pitch variation
          if (collisionSound.buffer) {
            collisionSound.playbackRate = 0.9 + Math.random() * 0.2;
            if (collisionSound.isPlaying) collisionSound.stop();
            collisionSound.play();
          }

          const damage = THREE.MathUtils.randInt(3, 7);
          buildingHealth.current = Math.max(0, buildingHealth.current - damage);
          setUiHealth(buildingHealth.current);
          
          // Add floating damage text
          const id = Date.now();
          setDamagePops(prev => [...prev, { id, value: damage }]);
          setTimeout(() => {
            setDamagePops(prev => prev.filter(p => p.id !== id));
          }, 1000);
          
          if (buildingHealth.current === 0) {
            // CINEMATIC SEQUENCE START
            setCinematicPhase('shaking');
            shakeIntensity.current = 3.0; // Explosion impact shake
            
            // 1. Shake for 1 second then blackout
            setTimeout(() => {
              setCinematicPhase('blackout');
              if (explosionSound.buffer) explosionSound.play();
                            // 2. While black: Swap Model, Music, and show first text
                setTimeout(() => {
                  setCinematicMessage("THE TIME HAS COME");
                  
                  // Aggressive BGM Swap Logic
                  if (bgmRef.current) {
                    if (bgmRef.current.isPlaying) bgmRef.current.stop();
                  }
                  
                  if (finalBgmRef.current && finalBgmRef.current.buffer) {
                    if (!finalBgmRef.current.isPlaying) {
                      finalBgmRef.current.setLoop(true);
                      finalBgmRef.current.setVolume(0.5);
                      finalBgmRef.current.play();
                    }
                  }
                
                // Model Swap Logic: Bulletproof replacement of College with Deb
                if (collegeModelRef.current) {
                  const oldModel = collegeModelRef.current;
                  
                  // Capture transforms for sync
                  const targetPos = oldModel.position.clone();
                  const targetRot = oldModel.rotation.clone();
                  
                  // 1. Aggressive NUCLEAR removal to fix overlap issue
                  // Remove by reference
                  if (oldModel) {
                    oldModel.visible = false;
                    scene.remove(oldModel);
                  }
                  
                  // Remove by name (catches duplicates if any)
                  let found;
                  while((found = scene.getObjectByName("BUILDING_ROOT"))) {
                    found.visible = false;
                    scene.remove(found);
                  }

                  // 1.5 Physics Removal (Crucial for fixing "invisible wall" after destruction)
                  if (buildingBodyRef.current) {
                    world.removeBody(buildingBodyRef.current);
                    buildingBodyRef.current = null;
                  }

                  // Traverse and kill anything remotely related to the college
                  const toRemove = [];
                  scene.traverse((obj) => {
                    if (obj.isMesh && (
                        obj.name.toLowerCase().includes("college") || 
                        obj.name.toLowerCase().includes("building") ||
                        obj === oldModel
                    )) {
                      toRemove.push(obj);
                    }
                  });
                  
                  toRemove.forEach(obj => {
                    obj.visible = false;
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) {
                        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                        else obj.material.dispose();
                    }
                    scene.remove(obj);
                  });

                  collegeModelRef.current = null;
                  
                  // 2. Load and place new model
                  loader.load(debUrl, (gltf) => {
                    const debModel = gltf.scene;
                    
                    // Use same target size and position as original building for perfect sync
                    debModel.position.set(0, 0, -160);
                    debModel.rotation.copy(targetRot);
                    autoScale(debModel, 120); // Sync dimensions with original
                    
                    debModel.traverse((child) => {
                      if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        // Ensure textures are in the correct color space
                        if (child.material.map) child.material.map.colorSpace = THREE.SRGBColorSpace;
                        if (child.material.emissiveMap) child.material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
                      }
                    });
                    
                    scene.add(debModel);
                  });
                }
                
                // 3. Stay in darkness for 3 seconds then fade back in
                setTimeout(() => {
                  setCinematicMessage("");
                  setCinematicPhase('revealed');
                  
                  // 4. Final Reward Message
                  setTimeout(() => {
                    setCinematicMessage("YOUR REWARD IS BEHIND THE PRASHANT TYRE SHOP");
                    
                    // SPAWN REWARD CHARACTER
                    if (!hasSpawnedReward.current) {
                      hasSpawnedReward.current = true;
                      loader.load(prashantUrl, (gltf) => {
                        const prashant = gltf.scene;
                        prashant.position.set(-52, 0, 42); // Inside/Behind the tyre shop
                        autoScale(prashant, 3.8); // Match human scale
                        
                        // Face the player initially
                        const pPos = new THREE.Vector3();
                        if (playerRef.current) {
                          playerRef.current.getWorldPosition(pPos);
                          prashant.lookAt(pPos.x, 0, pPos.z);
                        }
                        
                        // Add Dance Animation if available
                        if (gltf.animations && gltf.animations.length > 0) {
                          const mixer = new THREE.AnimationMixer(prashant);
                          const action = mixer.clipAction(gltf.animations[0]);
                          action.play();
                          rewardMixer.current = mixer;
                        }
                        
                        prashant.traverse((child) => {
                          if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            // Ensure textures are in the correct color space
                            if (child.material.map) child.material.map.colorSpace = THREE.SRGBColorSpace;
                          }
                        });
                        
                        scene.add(prashant);
                      });
                    }
                    
                    setTimeout(() => setCinematicMessage(""), 6000);
                  }, 1500);
                }, 3000);
              }, 1000);
            }, 1000);
          }

          // WAVE TRIGGER LOGIC
          const hp = buildingHealth.current;
          
          const triggerWave = (waveNum, spawnNormal, spawnLadder) => {
            currentWave.current = waveNum;
            activeLanes.current = [-6, -2, 2, 6]; // Refresh unique spawn lanes securely each wave
            
            // Trigger visual text UI
            const waveUI = document.getElementById("wave-ui");
            if(waveUI) {
              waveUI.innerHTML = `WAVE ${waveNum} INCOMING`;
              waveUI.style.animation = 'none';
              void waveUI.offsetWidth; // trigger reflow for animation restart
              waveUI.style.animation = 'wave-incoming 1.8s ease-out forwards';
            }
            
            despawnAllNPCs();
            if (spawnNormal > 0) spawnNPC('normal', spawnNormal);
            if (spawnLadder > 0) spawnNPC('ladder', spawnLadder);
          };

          if (hp <= 80 && hp > 60 && currentWave.current < 2) {
             triggerWave(2, 2, 0);
          } else if (hp <= 60 && hp > 40 && currentWave.current < 3) {
             triggerWave(3, 3, 0); // Spawning 3 normal given plural description
          } else if (hp <= 40 && hp > 20 && currentWave.current < 4) {
             triggerWave(4, 2, 1);
          } else if (hp <= 20 && currentWave.current < 5) {
             triggerWave(5, 0, 2);
          }
        }
      });

      world.addBody(buildingBody);

      model.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
      scene.add(model);
    });

    loader.load(shopUrl, (gltf) => {
      const model = gltf.scene;
      model.position.set(-50, 0, 40); 
      model.rotation.y = Math.PI / 2; // 90 Degree Rotation
      autoScale(model, 25); 
      
      // Calculate Bounding Box for Physics Body
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      
      const shopBody = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3((size.x / 2) * 0.8, (size.y / 2) * 0.8, (size.z / 2) * 0.8))
      });
      shopBody.position.set(-50, size.y / 2, 40);
      shopBody.quaternion.setFromEuler(0, Math.PI / 2, 0); // Rotate Physics Body
      
      shopBody.addEventListener("collide", (e) => {
        if (e.body.isTyre && collisionSound.buffer) {
          collisionSound.playbackRate = 0.9 + Math.random() * 0.2;
          if (collisionSound.isPlaying) collisionSound.stop();
          collisionSound.play();
        }
      });
      
      world.addBody(shopBody);
      
      model.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
      scene.add(model);
    });

    // 7. Input Management
    const activeKeys = new Set();
    const onKeyDown = (e) => {
      if (gameStateRef.current !== 'playing') return; // Use ref to avoid stale closure
      const key = e.key.toLowerCase();
      activeKeys.add(key);

      const player = playerRef.current;
      const playerBody = playerBodyRef.current;
      const inventoryUI = document.getElementById("inventory-ui");

      // INTERACTION LOGIC (Requirement 2 & 4)
      if (key === "e" && playerBody) {
        // Distance to Shop (-50, 40)
        const distToShop = playerBody.position.distanceTo(new CANNON.Vec3(-50, 0.5, 40));
        // Distance to Generator (0, -10)
        const distToGen = playerBody.position.distanceTo(new CANNON.Vec3(0, 0.5, -10));

        if (distToShop < 8 && !hasTyre.current) {
          hasTyre.current = true;
          setHasTyreUI(true);
          console.log("Tyre picked up!");
        } else if (distToGen < 8 && hasTyre.current) {
          if (tyreRef.current && axleRef.current) {
            tyreRef.current.visible = true;
            axleRef.current.add(tyreRef.current);
            tyreRef.current.position.set(0, 0, 0); // Center on axle relative coordinates
          }
          hasTyre.current = false;
          setHasTyreUI(false);
          console.log("Tyre mounted!");
        }
      }

      if (e.key === " " && tyreRef.current && tyreRef.current.visible) {
        const tyre = tyreRef.current;
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        const worldScale = new THREE.Vector3();

        tyre.getWorldPosition(worldPos);
        tyre.getWorldQuaternion(worldQuat);
        tyre.getWorldScale(worldScale);

        // 1. Clone tyre mesh
        const launchedTyre = tyre.clone();
        scene.add(launchedTyre);
        launchedTyre.position.copy(worldPos);
        launchedTyre.quaternion.copy(worldQuat);
        launchedTyre.scale.copy(worldScale);
        
        // 2. Hide original visual tyre (make axle empty immediately)
        tyre.visible = false;

        // 3. Create dynamic physics body explicitly for this tyre (Sync radius with visual)
        const tyreBox = new THREE.Box3().setFromObject(launchedTyre);
        const tyreSize = new THREE.Vector3();
        tyreBox.getSize(tyreSize);
        const tyreRadius = Math.max(tyreSize.x, tyreSize.y, tyreSize.z) / 2;

        const body = new CANNON.Body({
          mass: 1,
          shape: new CANNON.Sphere(tyreRadius),
          type: CANNON.Body.DYNAMIC,
          material: tyreMaterial, // Accessing from outer scope
          linearDamping: 0.01, // Minimal air resistance
          angularDamping: 0.05 // Extreme momentum preservation
        });
        body.isTyre = true; // Identify for collisions
        body.hasDamaged = false; // Prevent multi-hit
        
        // Shift slightly forward to clear generator geometry
        body.position.set(worldPos.x, worldPos.y, worldPos.z - 2);
        body.quaternion.set(worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w);

        // Calculate dynamic launch direction based on camera aim with a forward cone constraint
        const buildingPos = new THREE.Vector3(0, 0, -160);
        const playerPos = new THREE.Vector3(playerBody.position.x, playerBody.position.y, playerBody.position.z);
        
        const targetDir = new THREE.Vector3().subVectors(buildingPos, playerPos).normalize();
        const launchDir = new THREE.Vector3();
        camera.getWorldDirection(launchDir);

        // Horizontal Cone Clamp: Ensure tyres stay within a triangular area toward the building
        const targetDirXZ = new THREE.Vector2(targetDir.x, targetDir.z).normalize();
        const launchDirXZ = new THREE.Vector2(launchDir.x, launchDir.z).normalize();
        const angle = Math.acos(THREE.MathUtils.clamp(targetDirXZ.dot(launchDirXZ), -1, 1));
        const maxAngle = Math.PI / 8; // Allowed shooting cone half-width

        if (angle > maxAngle) {
          launchDir.x = targetDir.x;
          launchDir.z = targetDir.z;
        }
        
        // Add vertical boost as requested and re-normalize for consistent speed
        launchDir.y += 0.35;
        launchDir.normalize();

        const power = 68; 
        body.velocity.set(launchDir.x * power, launchDir.y * power, launchDir.z * power);
        body.angularVelocity.set(20, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);

        world.addBody(body);
        activeTyres.current.push({ mesh: launchedTyre, body: body });

        // 4. Autodespawn after 20 seconds
        setTimeout(() => {
          scene.remove(launchedTyre);
          world.removeBody(body);
          activeTyres.current = activeTyres.current.filter((t) => t.mesh !== launchedTyre);
        }, 20000);
      }
    };
    const onKeyUp = (e) => activeKeys.delete(e.key.toLowerCase());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // 8. Animation Loop
    let animationId;
    const moveSpeed = 35; // Physics velocity speed

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);

      // STEP PHYSICS (Requirement 2)
      world.step(1 / 60, delta, 3);

      const player = playerRef.current;
      const playerBody = playerBodyRef.current;

      if (player && playerBody) {
        // SYNC MESH TO BODY (Requirement 3)
        player.position.copy(playerBody.position);

        // RESPONSIVE PHYSICS MOVEMENT (Requirement 4)
        const forward = new THREE.Vector3(Math.sin(yaw.current), 0, Math.cos(yaw.current)).negate();
        const side = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        const moveX = (activeKeys.has("d") || activeKeys.has("arrowright") ? 1 : 0) - (activeKeys.has("a") || activeKeys.has("arrowleft") ? 1 : 0);
        const moveZ = (activeKeys.has("s") || activeKeys.has("arrowdown") ? 1 : 0) - (activeKeys.has("w") || activeKeys.has("arrowup") ? 1 : 0);

        const velocity = new THREE.Vector3(0, 0, 0);
        if (moveZ !== 0) velocity.addScaledVector(forward, -moveZ);
        if (moveX !== 0) velocity.addScaledVector(side, moveX);

        if (velocity.length() > 0) {
          velocity.normalize().multiplyScalar(moveSpeed);
          playerBody.velocity.x = velocity.x;
          playerBody.velocity.z = velocity.z;

          // Face direction
          player.rotation.y = Math.atan2(velocity.x, velocity.z);
        } else {
          playerBody.velocity.x = 0;
          playerBody.velocity.z = 0;
        }

        // INSTANT FALL DEATH
        if (playerBody.position.y < -0.5) {
          window.location.reload();
          return;
        }

        // Camera Update
        if (!isTopView.current) {
          const distance = cameraDistance.current;
          const h = 2;
          const x = distance * Math.sin(yaw.current) * Math.cos(pitch.current);
          const y = distance * Math.sin(pitch.current) + h;
          const z = distance * Math.cos(yaw.current) * Math.cos(pitch.current);
          camera.position.copy(player.position).add(new THREE.Vector3(x, y, z));
          if (camera.position.y < 1) camera.position.y = 1;
          camera.lookAt(player.position.x, player.position.y + 0.5, player.position.z);
        } else {
          camera.position.set(0, 300, 0); // High position to see 500x500 map
          camera.lookAt(0, 0, 0);
        }
      }

      // Rotate Axle continually
      if (axleRef.current) {
        axleRef.current.rotation.x += 0.1;
      }

      // SYNC ALL ACTIVE LAUNCHED TYRES
      activeTyres.current.forEach((t) => {
        t.mesh.position.copy(t.body.position);
        t.mesh.quaternion.copy(t.body.quaternion);
      });

      // SYNC ALL ENABLED NPCs (With Movement Logic)
      activeNPCs.current.forEach((npc) => {
        if (npc.body.userData) {
          // Normalize initial states for new logic
          if (npc.body.userData.state === 'blocking') npc.body.userData.state = 'block';
          
          npc.body.userData.timer += delta;

          if (npc.body.userData.state === 'block') {
            // Block State: slide across tyre path evaluating boundaries
            npc.body.position.x += npc.body.userData.direction * npc.body.userData.speed * delta;
            
            if (npc.body.position.x > 12) {
              npc.body.position.x = 11.5;
              npc.body.userData.direction = -1;
            } else if (npc.body.position.x < -12) {
              npc.body.position.x = -11.5;
              npc.body.userData.direction = 1;
            }

            // Exceed block threshold duration
            if (npc.body.userData.timer > 3) {
              npc.body.userData.state = 'gap';
              npc.body.userData.timer = 0;
              // Teleport firmly outside the trajectory lane (gap mechanics)
              npc.body.position.x = (npc.body.position.x >= 0) ? 35 : -35; 
            }
          } else if (npc.body.userData.state === 'gap') {
            // During gap time, NPC rests safely at extreme flanks (e.g. +/- 35)

            if (npc.body.userData.timer > 1.2) {
              npc.body.userData.state = 'block';
              npc.body.userData.timer = 0;
              // Return symmetrically onto the edge of the trajectory lane
              npc.body.position.x = (npc.body.position.x > 0) ? 11 : -11;
            }
          }
        }

        npc.mesh.position.copy(npc.body.position);
        npc.mesh.quaternion.copy(npc.body.quaternion);
      });

      // UI Proximity Prompt Update
      const promptUI = document.getElementById("prompt-ui");
      if (playerBody && promptUI) {
        const distToShop = playerBody.position.distanceTo(new CANNON.Vec3(-50, 0.5, 40));
        const distToGen = playerBody.position.distanceTo(new CANNON.Vec3(0, 0.5, -10));

        if (distToShop < 8 && !hasTyre.current) {
          promptUI.style.opacity = 1;
          promptUI.innerHTML = "Press E to Pick Up Tyre";
        } else if (distToGen < 8 && hasTyre.current) {
          promptUI.style.opacity = 1;
          promptUI.innerHTML = "Press E to Mount Tyre";
        } else {
          promptUI.style.opacity = 0;
        }
      }

      // Handle Screen Shake
      if (shakeIntensity.current > 0) {
        camera.position.x += (Math.random() - 0.5) * shakeIntensity.current;
        camera.position.y += (Math.random() - 0.5) * shakeIntensity.current;
        shakeIntensity.current *= 0.92; // Decay
        if (shakeIntensity.current < 0.01) shakeIntensity.current = 0;
      }

      // Update Reward Character Animation
      if (rewardMixer.current) {
        rewardMixer.current.update(delta);
      }

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("click", handleLock);
      cancelAnimationFrame(animationId);
      controls.dispose();
      renderer.dispose();
      if (mountRef.current) mountRef.current.innerHTML = "";
      if (bgm.isPlaying) bgm.stop();
      if (generatorSound.isPlaying) generatorSound.stop();
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100dvw", height: "100dvh", overflow: "hidden", backgroundColor: "#000" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }} />
      
      {/* GAMEPLAY UI - Only visible when playing */}
      {uiGameState === 'playing' && (
        <>
          <div id="inventory-ui" style={{
        position: "absolute",
        bottom: "2rem",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(0,0,0,0.75)",
        padding: "0.8rem 2rem",
        borderRadius: "2rem",
        color: hasTyreUI ? "#4ade80" : "#94a3b8",
        fontSize: "1.2rem",
        fontWeight: "900",
        letterSpacing: "0.1rem",
        fontFamily: "'Outfit', 'Inter', sans-serif",
        pointerEvents: "none",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: hasTyreUI ? "0 0 15px rgba(74, 222, 128, 0.2)" : "none",
        zIndex: 100,
        transition: "all 0.3s ease"
      }}>
        {hasTyreUI ? "🛞 TYRE READY" : "NO TYRE"}
      </div>

      <div id="prompt-ui" style={{
        position: "absolute",
        zIndex: 10,
        top: "60%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        color: "white",
        background: "rgba(0,0,0,0.7)",
        padding: "0.8rem 1.5rem",
        borderRadius: "0.5rem",
        pointerEvents: "none",
        fontFamily: "Inter, sans-serif",
        fontWeight: "bold",
        fontSize: "1.5rem",
        opacity: 0,
        transition: "opacity 0.2s",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)"
      }}>
        Press E
      </div>

      {!cinematicPhase && <BaddieSealBar health={uiHealth} />}

      {/* CINEMATIC OVERLAY SYSTEM */}
      {(cinematicPhase === 'blackout' || cinematicMessage) && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: cinematicPhase === 'blackout' ? '#000' : 'transparent',
          transition: 'background 2s ease-in-out',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5000, // Top of everything
          pointerEvents: 'none'
        }}>
          {cinematicMessage && (
            <div style={{
              color: '#fff',
              fontSize: '3rem',
              fontWeight: '900',
              textTransform: 'uppercase',
              letterSpacing: '0.4rem',
              fontFamily: "'Outfit', sans-serif",
              textAlign: 'center',
              textShadow: '0 0 20px rgba(255, 255, 255, 0.5)',
              animation: 'reveal-fade 2s forwards',
              padding: '2rem'
            }}>
              {cinematicMessage}
            </div>
          )}
        </div>
      )}

      {/* Shared Cinematic Animations */}
      <style>
        {`
          @keyframes reveal-fade {
            0% { opacity: 0; transform: translateY(10px) scale(0.95); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}
      </style>
        </>
      )}

      {/* HOME SCREEN UI */}
      {uiGameState === 'home' && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `url(${hsUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          display: 'flex',
          zIndex: 4000,
          overflow: 'hidden'
        }}>
          {/* Circular Pulse Play Button */}
          <div 
            onClick={() => setUiGameState('intro')}
            style={{
              position: 'absolute',
              bottom: isMobile ? '12%' : '15%', 
              right: isMobile ? '8%' : '12%', 
              width: isMobile ? '90px' : '110px',
              height: isMobile ? '90px' : '110px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              border: '4px solid #39FF14',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(57, 255, 20, 0.5)',
              animation: 'neon-pulse-glow 2s infinite',
              transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}
          >
            <svg width="45" height="45" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '6px' }}>
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>

          <div style={{
            position: 'absolute',
            bottom: '1rem',
            left: '1.5rem',
            color: 'white',
            fontFamily: "'Outfit', sans-serif",
            fontSize: 'max(0.7rem, 1.5vw)',
            opacity: 0.6,
            letterSpacing: '0.1rem'
          }}>
            TECHFEST HACKATHON | IIITL
          </div>
        </div>
      )}

      {/* CINEMATIC INTRO OVERLAY */}
      {uiGameState === 'intro' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: '#000',
          zIndex: 6000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: "'Outfit', sans-serif",
          textAlign: 'center',
          padding: '2rem'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            animation: 'intro-zoom-out 8s forwards linear'
          }}>
            {[
              "A STORY FROM OUR CAMPUS",
              "A BADDIE HAS BEEN TRAPPED INSIDE THE BUILDING.",
              "THE SEAL CAN ONLY BE BROKEN ONE WAY.",
              "DESTROY THE BUILDING.",
              "USE MY INATOR."
            ].map((text, i) => (
              <p key={i} style={{
                fontSize: i === 0 ? '1.2rem' : '1.8rem',
                fontWeight: i === 0 ? '400' : '900',
                margin: 0,
                opacity: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.3rem',
                textShadow: '0 0 15px rgba(255, 255, 255, 0.4)',
                animation: `story-reveal-line 1.5s forwards ${i * 1.2 + 0.5}s cubic-bezier(0.4, 0, 0.2, 1)`
              }}>
                {text}
              </p>
            ))}
          </div>
        </div>
      )}

      {uiGameState === 'playing' && isMobile && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1000 }}>
          {/* Virtual Joystick Placeholder Logic - Handled via raw touch for now */}
          <div style={{ 
            position: 'absolute', 
            bottom: '2rem', 
            left: '2rem', 
            width: '120px', 
            height: '120px', 
            background: 'rgba(255,255,255,0.1)', 
            borderRadius: '50%', 
            border: '2px solid rgba(255,255,255,0.2)',
            pointerEvents: 'auto',
            touchAction: 'none'
          }}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            const rect = e.currentTarget.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const move = (t) => {
              const dx = t.pageX - centerX;
              const dy = t.pageY - centerY;
              if (dy < -20) activeKeys.add('w'); else activeKeys.delete('w');
              if (dy > 20) activeKeys.add('s'); else activeKeys.delete('s');
              if (dx < -20) activeKeys.add('a'); else activeKeys.delete('a');
              if (dx > 20) activeKeys.add('d'); else activeKeys.delete('d');
            };
            move(touch);
            const moveHandler = (me) => move(me.touches[0]);
            const endHandler = () => {
              activeKeys.delete('w'); activeKeys.delete('a'); activeKeys.delete('s'); activeKeys.delete('d');
              window.removeEventListener('touchmove', moveHandler);
              window.removeEventListener('touchend', endHandler);
            };
            window.addEventListener('touchmove', moveHandler);
            window.addEventListener('touchend', endHandler);
          }}
          >
            <div style={{ position: 'absolute', top: '50%', left: '50%', width: '40px', height: '40px', background: 'rgba(255,255,255,0.3)', borderRadius: '50%', transform: 'translate(-50%, -50%)' }} />
          </div>

          {/* Action Buttons */}
          <div style={{ position: 'absolute', bottom: '2rem', right: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', pointerEvents: 'auto' }}>
            <div 
              onTouchStart={() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })) }}
              style={{ width: '80px', height: '80px', background: 'rgba(255,122,24,0.3)', border: '2px solid #ff7a18', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
              LAUNCH
            </div>
            <div 
              onTouchStart={() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' })) }}
              style={{ width: '70px', height: '70px', background: 'rgba(57,255,20,0.2)', border: '2px solid #39FF14', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
              E
            </div>
          </div>
        </div>
      )}

      {showControls && <ControlsOverlay onClose={() => setShowControls(false)} />}


      {/* Critical Health Warning Overlay */}
      {uiHealth < 20 && uiHealth > 0 && (
        <div style={{
          position: 'absolute',
          top: '10rem',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#ff3b3b',
          fontSize: '1.8rem',
          fontWeight: '900',
          letterSpacing: '0.2rem',
          fontFamily: "'Outfit', sans-serif",
          textShadow: '0 0 15px rgba(255, 0, 0, 0.6)',
          animation: 'warning-pulse 0.5s infinite alternate',
          pointerEvents: 'none',
          zIndex: 200
        }}>
          ⚠ SEAL BREAKING ⚠
        </div>
      )}

      {/* Floating Damage Text Container */}
      <div style={{
        position: 'absolute',
        top: '6rem', // Positioned below/around the title but conceptually "above" health logic
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        zIndex: 150
      }}>
        {damagePops.map(pop => (
          <div key={pop.id} style={{
            position: 'absolute',
            color: '#ff4d4d',
            fontSize: '2rem',
            fontWeight: '900',
            textShadow: '0 0 10px rgba(255, 77, 77, 0.6)',
            animation: 'damage-float 1s forwards',
            whiteSpace: 'nowrap'
          }}>
            -{pop.value}
          </div>
        ))}
      </div>

      <style>
        {`
          @keyframes intro-zoom-out {
            from { transform: scale(1); }
            to { transform: scale(1.05); }
          }
          @keyframes story-reveal-line {
            0% { opacity: 0; transform: translateY(15px) scale(0.95); filter: blur(10px); }
            100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0px); }
          }
          @keyframes neon-pulse-glow {
            0% { box-shadow: 0 0 15px rgba(57, 255, 20, 0.4); transform: scale(1); }
            50% { box-shadow: 0 0 35px rgba(57, 255, 20, 0.7); transform: scale(1.06); }
            100% { box-shadow: 0 0 15px rgba(57, 255, 20, 0.4); transform: scale(1); }
          }
          @keyframes warning-pulse {
            from { opacity: 0.4; scale: 0.95; filter: brightness(1); }
            to { opacity: 1; scale: 1.05; filter: brightness(1.5); }
          }
          @keyframes damage-float {
            0% { transform: translateY(0); opacity: 1; scale: 1; }
            50% { opacity: 1; scale: 1.2; }
            100% { transform: translateY(-50px); opacity: 0; scale: 1; }
          }
          @keyframes wave-incoming {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); filter: blur(10px); }
            15% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); filter: blur(0px); }
            85% { opacity: 1; transform: translate(-50%, -50%) scale(1.0); filter: blur(0px); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(1.5); filter: blur(5px); }
          }
          .chaos-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 0 30px rgba(255, 122, 24, 0.8) !important;
            background: #ff7a18 !important;
            color: #000 !important;
          }
          .chaos-btn:active {
            transform: scale(0.95);
          }
        `}
      </style>

      <div id="wave-ui" style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        color: "#fff",
        fontSize: "5rem",
        fontWeight: "900",
        fontFamily: "'Outfit', 'Inter', sans-serif",
        textTransform: "uppercase",
        letterSpacing: "0.5rem",
        textShadow: "0 0 20px rgba(255, 255, 255, 0.4), 0 0 40px rgba(255, 255, 255, 0.2)",
        pointerEvents: "none",
        zIndex: 1000,
        opacity: 0,
        whiteSpace: "nowrap"
      }}></div>
    </div>
  );
}

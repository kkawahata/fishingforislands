import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { ISLANDS, ISLAND_GRID, ISLAND_SPACING, getIslandWorldPos, getTurtleBridgeBand, RESOURCES } from './data.js';

const TILE = 1;

// ── Water shader ──
const WATER_VERT = /* glsl */ `
uniform float uTime;
varying vec3 vWorldPos;
varying vec3 vNormal;

// Gerstner wave: trochoidal peaks, flat troughs
vec3 gerstner(vec2 xz, float wl, float amp, float spd, vec2 dir, float t) {
  float k = 6.2832 / wl;
  float c = sqrt(9.8 / k);
  vec2 d = normalize(dir);
  float f = k * (dot(d, xz) - c * spd * t);
  return vec3(d.x * amp * cos(f), amp * sin(f), d.y * amp * cos(f));
}

void main() {
  vec3 pos = position;
  pos += gerstner(pos.xz, 12.0, 0.25, 1.0, vec2(1.0, 0.3), uTime);
  pos += gerstner(pos.xz, 7.0,  0.12, 1.3, vec2(0.4, 1.0), uTime);
  pos += gerstner(pos.xz, 4.0,  0.06, 0.8, vec2(-0.6,0.8), uTime);
  pos += gerstner(pos.xz, 2.5,  0.03, 1.5, vec2(0.9,-0.4), uTime);

  vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;

  // Approximate normal from displacement gradient
  float eps = 0.5;
  vec3 posR = position + vec3(eps, 0.0, 0.0);
  posR += gerstner(posR.xz, 12.0, 0.25, 1.0, vec2(1.0,0.3), uTime);
  posR += gerstner(posR.xz, 7.0, 0.12, 1.3, vec2(0.4,1.0), uTime);
  vec3 posF = position + vec3(0.0, 0.0, eps);
  posF += gerstner(posF.xz, 12.0, 0.25, 1.0, vec2(1.0,0.3), uTime);
  posF += gerstner(posF.xz, 7.0, 0.12, 1.3, vec2(0.4,1.0), uTime);
  vNormal = normalize(cross(posF - pos, posR - pos));

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const WATER_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uColorShallow;
uniform vec3 uColorDeep;
varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
  // Depth-based color (distance from center of island cluster)
  float dist = length(vWorldPos.xz - vec2(16.0, 16.0));
  float depthMix = smoothstep(5.0, 50.0, dist);
  vec3 color = mix(uColorShallow, uColorDeep, depthMix);

  // Foam stripe near water level
  float foamLine = smoothstep(-0.15, 0.05, vWorldPos.y) * (1.0 - smoothstep(0.05, 0.25, vWorldPos.y));
  color = mix(color, vec3(0.9, 0.95, 1.0), foamLine * 0.6);

  // Subtle wave highlight pattern
  float pattern = sin(vWorldPos.x * 3.0 + uTime * 2.0) * sin(vWorldPos.z * 2.5 + uTime * 1.5);
  color += vec3(0.03) * smoothstep(0.3, 0.8, pattern);

  // Sun specular
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  vec3 refl = reflect(-uSunDir, vNormal);
  float spec = pow(max(dot(viewDir, refl), 0.0), 128.0);
  color += vec3(1.0, 0.95, 0.8) * spec * 0.7;

  // Fresnel-ish rim
  float fresnel = 1.0 - max(dot(viewDir, vNormal), 0.0);
  fresnel = pow(fresnel, 3.0);
  color += vec3(0.15, 0.2, 0.25) * fresnel;

  gl_FragColor = vec4(color, 0.78);
}
`;

// ── Cloud shader ──
const CLOUD_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const CLOUD_FRAG = /* glsl */ `
uniform float uTime;
varying vec2 vUv;

// Simple 2D hash noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.1;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv * 4.0;
  uv.x += uTime * 0.015;
  uv.y += uTime * 0.005;
  float cloud = fbm(uv);
  cloud = smoothstep(0.42, 0.68, cloud);

  // Fade edges
  float edgeFade = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x)
                 * smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);

  gl_FragColor = vec4(1.0, 1.0, 1.0, cloud * 0.55 * edgeFade);
}
`;

export class World {
  constructor(scene) {
    this.scene = scene;
    this.islandGroups = {};
    this.interactables = [];
    this.resourceMeshes = [];
    this.npcMeshes = [];
    this.bridges = [];
    this.groundMeshes = [];
    this._createOcean();
    this._createSky();
    this._createClouds();
    this._createLighting();
    this._highlightRing = this._createHighlightRing();
  }

  _createOcean() {
    const geo = new THREE.PlaneGeometry(200, 200, 80, 80);
    geo.rotateX(-Math.PI / 2);

    const sunDir = new THREE.Vector3(0.5, 0.6, -0.3).normalize();
    this._waterUniforms = {
      uTime: { value: 0 },
      uSunDir: { value: sunDir },
      uColorShallow: { value: new THREE.Color(0x40c8e0) },
      uColorDeep: { value: new THREE.Color(0x0a3d6b) },
    };

    const mat = new THREE.ShaderMaterial({
      vertexShader: WATER_VERT,
      fragmentShader: WATER_FRAG,
      uniforms: this._waterUniforms,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.ocean = new THREE.Mesh(geo, mat);
    this.ocean.position.y = -0.15;
    this.scene.add(this.ocean);
  }

  _createSky() {
    const sky = new Sky();
    sky.scale.setScalar(10000);
    this.scene.add(sky);
    this.sky = sky;

    const uniforms = sky.material.uniforms;
    uniforms['turbidity'].value = 2;
    uniforms['rayleigh'].value = 1.0;
    uniforms['mieCoefficient'].value = 0.005;
    uniforms['mieDirectionalG'].value = 0.8;

    const sunPos = new THREE.Vector3();
    const phi = THREE.MathUtils.degToRad(90 - 30); // 30 deg elevation
    const theta = THREE.MathUtils.degToRad(200);
    sunPos.setFromSphericalCoords(1, phi, theta);
    uniforms['sunPosition'].value.copy(sunPos);
    this._sunPosition = sunPos;
  }

  _createClouds() {
    const geo = new THREE.PlaneGeometry(160, 160);
    geo.rotateX(-Math.PI / 2);

    this._cloudUniforms = { uTime: { value: 0 } };
    const mat = new THREE.ShaderMaterial({
      vertexShader: CLOUD_VERT,
      fragmentShader: CLOUD_FRAG,
      uniforms: this._cloudUniforms,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.clouds = new THREE.Mesh(geo, mat);
    this.clouds.position.set(16, 25, 16); // high above the island grid center
    this.scene.add(this.clouds);
  }

  animateOcean(time) {
    this._waterUniforms.uTime.value = time;
    this._cloudUniforms.uTime.value = time;
  }

  _createLighting() {
    const ambient = new THREE.AmbientLight(0xffeedd, 0.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff5e0, 1.0);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -40;
    sun.shadow.camera.right = 40;
    sun.shadow.camera.top = 40;
    sun.shadow.camera.bottom = -40;
    this.sun = sun;
    this.scene.add(sun);

    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 0.3);
    this.scene.add(hemi);
  }

  // ── Grid → World position ──
  getIslandWorldPos(islandId) {
    const p = getIslandWorldPos(islandId);
    return new THREE.Vector3(p.x, p.y, p.z);
  }

  // ── Build / rebuild visible islands ──
  buildIslands(gameState) {
    // Clear old
    for (const id of Object.keys(this.islandGroups)) {
      this.scene.remove(this.islandGroups[id]);
    }
    this.islandGroups = {};
    this.interactables = [];
    this.resourceMeshes = [];
    this.npcMeshes = [];
    this.groundMeshes = [];
    for (const b of this.bridges) this.scene.remove(b);
    this.bridges = [];

    for (const islandId of gameState.unlockedIslands) {
      const def = ISLANDS[islandId];
      if (!def) continue;
      const group = this._createIsland(def, gameState);
      const pos = this.getIslandWorldPos(islandId);
      group.position.copy(pos);
      group.userData.islandId = islandId;
      this.scene.add(group);
      this.islandGroups[islandId] = group;
    }

    // Bridges between adjacent islands
    this._buildBridges(gameState);
  }

  _createIsland(def, gameState) {
    const group = new THREE.Group();
    const size = def.size;

    // Winter: override ground color to snowy white
    const isWinter = gameState.winter && gameState.winter.active;
    const topColor = isWinter ? 0xe8e8f0 : def.groundColor;

    // Island platform — top surface at y=0.5
    const platGeo = new THREE.BoxGeometry(size, 1.5, size);
    const platMats = [
      new THREE.MeshLambertMaterial({ color: 0x8b6d3c, flatShading: true }), // right
      new THREE.MeshLambertMaterial({ color: 0x8b6d3c, flatShading: true }), // left
      new THREE.MeshLambertMaterial({ color: topColor, flatShading: true }), // top
      new THREE.MeshLambertMaterial({ color: 0x6b4d2c, flatShading: true }), // bottom
      new THREE.MeshLambertMaterial({ color: 0x7b5d2c, flatShading: true }), // front
      new THREE.MeshLambertMaterial({ color: 0x7b5d2c, flatShading: true }), // back
    ];
    const platform = new THREE.Mesh(platGeo, platMats);
    platform.position.y = -0.25;
    platform.receiveShadow = true;
    platform.userData.isGround = true;
    platform.userData.islandId = def.id;
    group.add(platform);
    this.groundMeshes.push(platform);

    // Sandy beach rim — only on turtle, which still floats offshore.
    // Non-turtle islands share edges with neighbors, so a sand rim between
    // two land biomes would look wrong.
    if (def.isTurtleIsland) {
      const beachGeo = new THREE.BoxGeometry(size + 0.4, 0.3, size + 0.4);
      const beachMat = new THREE.MeshLambertMaterial({ color: 0xe8d78a, flatShading: true });
      const beach = new THREE.Mesh(beachGeo, beachMat);
      beach.position.y = -0.6;
      group.add(beach);
      this._addTurtleIsland(group, def);
      return group;
    }

    // Add some grass patches
    for (let i = 0; i < 6; i++) {
      const gx = (Math.random() - 0.5) * (size - 2);
      const gz = (Math.random() - 0.5) * (size - 2);
      const grassGeo = new THREE.ConeGeometry(0.15, 0.4, 4);
      const grassMat = new THREE.MeshLambertMaterial({
        color: new THREE.Color(def.groundColor).offsetHSL(0, 0, -0.1),
        flatShading: true,
      });
      const grass = new THREE.Mesh(grassGeo, grassMat);
      grass.position.set(gx, 0.6, gz);
      group.add(grass);
    }

    // Add objects
    for (const obj of def.objects) {
      const mesh = this._createObject(obj, def, gameState);
      if (mesh) {
        const ox = (obj.x - def.size / 2 + 0.5) * TILE;
        const oz = (obj.z - def.size / 2 + 0.5) * TILE;
        mesh.position.set(ox, 0.5, oz);
        mesh.userData = { ...obj, islandId: def.id, type: 'object' };
        group.add(mesh);
        if (obj.interaction) this.interactables.push(mesh);
      }
    }

    // Add NPCs
    for (const npc of def.npcs) {
      // Mouse chase: skip mouse on wrong island, render it where it currently is
      if (npc.id === 'mouse' && gameState.mouseIsland !== def.id) continue;

      const mesh = this._createNPC(npc);
      const nx = (npc.x - def.size / 2 + 0.5) * TILE;
      const nz = (npc.z - def.size / 2 + 0.5) * TILE;
      mesh.position.set(nx, 0.5, nz);
      mesh.userData = { ...npc, islandId: def.id, type: 'npc' };
      group.add(mesh);
      if (npc.interaction) this.interactables.push(mesh);
      this.npcMeshes.push(mesh);
    }

    // Add mouse to this island if it's the mouse's current location (chase mechanic)
    if (gameState.mouseIsland === def.id && def.id !== 'bakery' &&
        (gameState.flags.mouse_catches || 0) < 5) {
      const mouseNpc = { id: 'mouse', name: 'Mouse', color: 0x888888, shape: 'mouse', interaction: 'mouse' };
      const mesh = this._createNPC(mouseNpc);
      mesh.position.set(0, 0.5, 0); // center of island
      mesh.userData = { ...mouseNpc, islandId: def.id, type: 'npc' };
      group.add(mesh);
      this.interactables.push(mesh);
      this.npcMeshes.push(mesh);
    }

    return group;
  }

  _addTurtleIsland(group, def) {
    // The turtle "island" is small, with the turtle as the main feature
    // Turtle body (ellipsoid)
    const bodyGeo = new THREE.SphereGeometry(2.0, 8, 6);
    bodyGeo.scale(1.4, 0.5, 1);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x5a8a3a, flatShading: true });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.3, 0);
    group.add(body);

    // Shell pattern
    const shellGeo = new THREE.SphereGeometry(1.8, 6, 4);
    shellGeo.scale(1.3, 0.6, 0.9);
    const shellMat = new THREE.MeshLambertMaterial({ color: 0x4a7a2a, flatShading: true });
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.position.set(0, 0.5, 0);
    group.add(shell);

    // Head
    const headGeo = new THREE.SphereGeometry(0.6, 6, 6);
    const headMat = new THREE.MeshLambertMaterial({ color: 0x6a9a4a, flatShading: true });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(-2.2, 0.5, 0);
    head.userData = { id: 'turtle_npc', name: 'Turtle', islandId: 'turtle', type: 'npc', interaction: 'turtle' };
    group.add(head);
    this.interactables.push(head);
    this.npcMeshes.push(head);

    // Flippers
    for (const side of [-1, 1]) {
      const flipGeo = new THREE.BoxGeometry(1.2, 0.15, 0.5);
      const flip = new THREE.Mesh(flipGeo, bodyMat);
      flip.position.set(-0.5, 0.1, side * 1.8);
      flip.rotation.y = side * 0.3;
      group.add(flip);
    }
  }

  _createObject(obj, def, gameState) {
    const g = new THREE.Group();

    switch (obj.shape) {
      case 'well': {
        // Stone cylinder well
        const wallGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.8, 8);
        const wallMat = new THREE.MeshLambertMaterial({ color: 0x707070, flatShading: true });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        g.add(wall);
        // Water inside
        const waterGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 8);
        const waterMat = new THREE.MeshLambertMaterial({ color: 0x4a90d9, flatShading: true });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.position.y = 0.2;
        g.add(water);
        // Roof
        const roofGeo = new THREE.ConeGeometry(0.6, 0.5, 4);
        const roofMat = new THREE.MeshLambertMaterial({ color: 0x8b6914, flatShading: true });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 0.9;
        g.add(roof);
        break;
      }

      case 'fire_pit': {
        // Ring of stones
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const stoneGeo = new THREE.SphereGeometry(0.15, 4, 4);
          const stoneMat = new THREE.MeshLambertMaterial({ color: 0x666666, flatShading: true });
          const stone = new THREE.Mesh(stoneGeo, stoneMat);
          stone.position.set(Math.cos(angle) * 0.4, -0.1, Math.sin(angle) * 0.4);
          g.add(stone);
        }
        // Fire (if lit)
        if (gameState.flags.fire_lit) {
          const fireGeo = new THREE.ConeGeometry(0.25, 0.6, 5);
          const fireMat = new THREE.MeshLambertMaterial({
            color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 0.8, flatShading: true,
          });
          const fire = new THREE.Mesh(fireGeo, fireMat);
          fire.position.y = 0.2;
          fire.userData.isFire = true;
          g.add(fire);

          const fireLight = new THREE.PointLight(0xff6600, 1, 5);
          fireLight.position.y = 0.6;
          g.add(fireLight);
        }
        // Some sticks/logs
        const logGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 4);
        const logMat = new THREE.MeshLambertMaterial({ color: 0x6b4226, flatShading: true });
        for (let i = 0; i < 3; i++) {
          const log = new THREE.Mesh(logGeo, logMat);
          log.rotation.z = Math.PI / 2 + (i - 1) * 0.4;
          log.rotation.y = i * 0.8;
          log.position.y = -0.05;
          g.add(log);
        }
        break;
      }

      case 'rock': {
        // Check if it should be a crafting table now
        if (gameState.flags.has_crafting_table && obj.station === 'big_rock') {
          // Crafting table
          const tableGeo = new THREE.BoxGeometry(1, 0.15, 0.8);
          const tableMat = new THREE.MeshLambertMaterial({ color: 0x8b6914, flatShading: true });
          const table = new THREE.Mesh(tableGeo, tableMat);
          table.position.y = 0.35;
          g.add(table);
          // Legs
          for (const [lx, lz] of [[-0.4, -0.3], [0.4, -0.3], [-0.4, 0.3], [0.4, 0.3]]) {
            const legGeo = new THREE.BoxGeometry(0.08, 0.35, 0.08);
            const leg = new THREE.Mesh(legGeo, tableMat);
            leg.position.set(lx, 0.1, lz);
            g.add(leg);
          }
          g.userData.station = 'crafting_table';
          g.userData.name = 'Crafting Table';
        } else {
          // Big rock
          const rockGeo = new THREE.DodecahedronGeometry(0.6, 0);
          const rockMat = new THREE.MeshLambertMaterial({ color: obj.color, flatShading: true });
          const rock = new THREE.Mesh(rockGeo, rockMat);
          rock.scale.y = 0.6;
          g.add(rock);
        }
        break;
      }

      case 'item': {
        // Pickup item on ground
        if (obj.oneTime && gameState.flags.picked_axe && obj.resource === 'axe') return null;
        const itemGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const itemMat = new THREE.MeshLambertMaterial({
          color: obj.color, emissive: obj.color, emissiveIntensity: 0.2, flatShading: true,
        });
        const item = new THREE.Mesh(itemGeo, itemMat);
        item.rotation.y = Math.PI / 4;
        g.add(item);
        break;
      }

      case 'field': {
        // Wheat field area
        const fieldGeo = new THREE.BoxGeometry(
          (obj.width || 3) * TILE, 0.1, (obj.height || 2) * TILE
        );
        const fieldMat = new THREE.MeshLambertMaterial({ color: 0x7a6a30, flatShading: true });
        const field = new THREE.Mesh(fieldGeo, fieldMat);
        g.add(field);

        // Add wheat stalks if planted
        if (gameState.flags.planted_seeds) {
          const daysSincePlant = gameState.day - gameState.flags.wheat_planted_day;
          const height = Math.min(daysSincePlant * 0.25, 0.8);
          const wheatColor = daysSincePlant >= 3 ? 0xdaa520 : 0x7ec850;
          for (let wx = -1.5; wx <= 1.5; wx += 0.5) {
            for (let wz = -0.8; wz <= 0.8; wz += 0.5) {
              const stalkGeo = new THREE.CylinderGeometry(0.03, 0.03, height, 4);
              const stalkMat = new THREE.MeshLambertMaterial({ color: wheatColor, flatShading: true });
              const stalk = new THREE.Mesh(stalkGeo, stalkMat);
              stalk.position.set(wx + Math.random() * 0.2, height / 2, wz + Math.random() * 0.2);
              g.add(stalk);
            }
          }
        }
        break;
      }

      case 'hut': {
        // Small hut
        const wallGeo = new THREE.BoxGeometry(1.2, 0.8, 1.0);
        const wallMat = new THREE.MeshLambertMaterial({ color: obj.color, flatShading: true });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.y = 0.1;
        g.add(wall);
        const roofGeo = new THREE.ConeGeometry(1.0, 0.6, 4);
        const roofMat = new THREE.MeshLambertMaterial({ color: 0xaa4444, flatShading: true });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 0.8;
        roof.rotation.y = Math.PI / 4;
        g.add(roof);
        break;
      }

      case 'pier': {
        // Wooden pier extending into water
        const plankGeo = new THREE.BoxGeometry(3, 0.1, 1.2);
        const plankMat = new THREE.MeshLambertMaterial({ color: 0x8b6914, flatShading: true });
        const plank = new THREE.Mesh(plankGeo, plankMat);
        plank.position.set(-1.5, -0.2, 0);
        g.add(plank);
        // Posts
        for (const px of [-2.5, -0.5]) {
          const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 4);
          const post = new THREE.Mesh(postGeo, plankMat);
          post.position.set(px, -0.5, 0.5);
          g.add(post);
        }
        break;
      }

      case 'oven': {
        // Stone dome oven with chimney
        const domeGeo = new THREE.SphereGeometry(0.5, 6, 5, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMat = new THREE.MeshLambertMaterial({ color: 0x8a4a2a, flatShading: true });
        const dome = new THREE.Mesh(domeGeo, domeMat);
        g.add(dome);
        // Base
        const baseGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.2, 8);
        const baseMat = new THREE.MeshLambertMaterial({ color: 0x666666, flatShading: true });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = -0.1;
        g.add(base);
        // Chimney
        const chimGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.5, 5);
        const chim = new THREE.Mesh(chimGeo, domeMat);
        chim.position.set(0, 0.5, -0.2);
        g.add(chim);
        break;
      }

      case 'sack': {
        const sackGeo = new THREE.SphereGeometry(0.3, 5, 5);
        sackGeo.scale(1, 0.8, 1);
        const sackMat = new THREE.MeshLambertMaterial({ color: obj.color, flatShading: true });
        g.add(new THREE.Mesh(sackGeo, sackMat));
        break;
      }

      case 'logging_camp': {
        // Log pile + sawhorse
        for (let i = 0; i < 4; i++) {
          const logGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 5);
          const logMat = new THREE.MeshLambertMaterial({ color: 0x6b4226, flatShading: true });
          const log = new THREE.Mesh(logGeo, logMat);
          log.rotation.z = Math.PI / 2;
          log.position.set(0, i * 0.14, (i - 1.5) * 0.15);
          g.add(log);
        }
        // Sawhorse
        const sawGeo = new THREE.BoxGeometry(0.8, 0.06, 0.3);
        const sawMat = new THREE.MeshLambertMaterial({ color: 0x8b6914, flatShading: true });
        const saw = new THREE.Mesh(sawGeo, sawMat);
        saw.position.set(0.8, 0.3, 0);
        g.add(saw);
        break;
      }

      case 'pool': {
        // Shallow rock pool
        const poolGeo = new THREE.CylinderGeometry(0.8, 0.9, 0.1, 8);
        const poolMat = new THREE.MeshLambertMaterial({ color: 0x4a90d9, flatShading: true, transparent: true, opacity: 0.7 });
        const pool = new THREE.Mesh(poolGeo, poolMat);
        pool.position.y = -0.05;
        g.add(pool);
        // Rim stones
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const rimGeo = new THREE.SphereGeometry(0.12, 4, 4);
          const rimMat = new THREE.MeshLambertMaterial({ color: 0x777777, flatShading: true });
          const rim = new THREE.Mesh(rimGeo, rimMat);
          rim.position.set(Math.cos(angle) * 0.85, 0, Math.sin(angle) * 0.85);
          g.add(rim);
        }
        break;
      }

      case 'windmill': {
        // Stone base + rotating blades
        const millBase = new THREE.CylinderGeometry(0.4, 0.5, 1.2, 6);
        const millMat = new THREE.MeshLambertMaterial({ color: 0x8a7a5a, flatShading: true });
        const base = new THREE.Mesh(millBase, millMat);
        base.position.y = 0.3;
        g.add(base);
        // Cone roof
        const roofGeo = new THREE.ConeGeometry(0.45, 0.4, 6);
        const roofMat = new THREE.MeshLambertMaterial({ color: 0x6b4226, flatShading: true });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 1.1;
        g.add(roof);
        // Blades hub
        const bladeGroup = new THREE.Group();
        bladeGroup.position.set(0, 0.7, 0.45);
        const bladeMat = new THREE.MeshLambertMaterial({ color: 0x8b6914, flatShading: true });
        for (let i = 0; i < 4; i++) {
          const bladeGeo = new THREE.BoxGeometry(0.08, 0.6, 0.03);
          const blade = new THREE.Mesh(bladeGeo, bladeMat);
          blade.position.y = 0.3;
          const arm = new THREE.Group();
          arm.add(blade);
          arm.rotation.z = (i / 4) * Math.PI * 2;
          bladeGroup.add(arm);
        }
        bladeGroup.userData.isWindmill = true;
        g.add(bladeGroup);
        break;
      }

      case 'stall': {
        // Market stall with canopy
        const counterGeo = new THREE.BoxGeometry(1.4, 0.6, 0.6);
        const counterMat = new THREE.MeshLambertMaterial({ color: 0x8b6914, flatShading: true });
        const counter = new THREE.Mesh(counterGeo, counterMat);
        counter.position.y = 0.1;
        g.add(counter);
        // Canopy
        const canopyGeo = new THREE.BoxGeometry(1.6, 0.06, 0.9);
        const canopyMat = new THREE.MeshLambertMaterial({ color: obj.color, flatShading: true });
        const canopy = new THREE.Mesh(canopyGeo, canopyMat);
        canopy.position.y = 0.8;
        g.add(canopy);
        // Posts
        for (const px of [-0.7, 0.7]) {
          const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 4);
          const post = new THREE.Mesh(postGeo, counterMat);
          post.position.set(px, 0.4, 0.35);
          g.add(post);
        }
        break;
      }

      case 'altar': {
        // Stone altar platform
        const altarGeo = new THREE.CylinderGeometry(0.6, 0.7, 0.3, 6);
        const altarMat = new THREE.MeshLambertMaterial({ color: obj.color, flatShading: true });
        g.add(new THREE.Mesh(altarGeo, altarMat));
        // Glowing center
        const glowGeo = new THREE.SphereGeometry(0.15, 6, 6);
        const glowMat = new THREE.MeshLambertMaterial({ color: 0x66ffff, emissive: 0x44aaaa, flatShading: true });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.y = 0.25;
        g.add(glow);
        break;
      }

      case 'portal': {
        // Glowing ring portal
        const ringGeo = new THREE.TorusGeometry(0.6, 0.08, 6, 12);
        const ringMat = new THREE.MeshLambertMaterial({ color: obj.color, emissive: 0x44aa44, flatShading: true });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = 0.6;
        g.add(ring);
        // Inner glow
        const innerGeo = new THREE.CircleGeometry(0.5, 8);
        const innerMat = new THREE.MeshBasicMaterial({ color: 0xaaffaa, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
        const inner = new THREE.Mesh(innerGeo, innerMat);
        inner.position.y = 0.6;
        g.add(inner);
        break;
      }

      case 'mountain': {
        // Tall cone mountain
        const mtnGeo = new THREE.ConeGeometry(1.5, 3, 6);
        const mtnMat = new THREE.MeshLambertMaterial({ color: obj.color, flatShading: true });
        const mtn = new THREE.Mesh(mtnGeo, mtnMat);
        mtn.position.y = 1.2;
        g.add(mtn);
        // Snow cap
        const snowGeo = new THREE.ConeGeometry(0.5, 0.6, 6);
        const snowMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
        const snow = new THREE.Mesh(snowGeo, snowMat);
        snow.position.y = 2.5;
        g.add(snow);
        break;
      }

      default: {
        const boxGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const boxMat = new THREE.MeshLambertMaterial({ color: obj.color, flatShading: true });
        g.add(new THREE.Mesh(boxGeo, boxMat));
      }
    }

    return g;
  }

  _createNPC(npc) {
    // All NPCs built with feet/base at y=0
    const g = new THREE.Group();

    switch (npc.shape) {
      case 'person': {
        // Legs (y=0 to y=0.3)
        for (const side of [-0.08, 0.08]) {
          const legGeo = new THREE.BoxGeometry(0.1, 0.3, 0.1);
          const legMat = new THREE.MeshLambertMaterial({ color: 0x554433, flatShading: true });
          const leg = new THREE.Mesh(legGeo, legMat);
          leg.position.set(side, 0.15, 0);
          g.add(leg);
        }
        // Body (y=0.3 to y=0.8)
        const bodyGeo = new THREE.BoxGeometry(0.4, 0.5, 0.3);
        const bodyMat = new THREE.MeshLambertMaterial({ color: npc.color, flatShading: true });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.55;
        g.add(body);
        // Head
        const headGeo = new THREE.SphereGeometry(0.18, 6, 6);
        const headMat = new THREE.MeshLambertMaterial({ color: 0xf0c090, flatShading: true });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 0.95;
        g.add(head);
        break;
      }

      case 'dog': {
        // Legs (y=0 to y=0.2)
        for (const [lx, lz] of [[-0.15, -0.08], [0.15, -0.08], [-0.15, 0.08], [0.15, 0.08]]) {
          const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 4);
          const legMat = new THREE.MeshLambertMaterial({ color: npc.color, flatShading: true });
          const leg = new THREE.Mesh(legGeo, legMat);
          leg.position.set(lx, 0.1, lz);
          g.add(leg);
        }
        // Body (y=0.2 to y=0.45)
        const bodyGeo = new THREE.BoxGeometry(0.5, 0.25, 0.25);
        const bodyMat = new THREE.MeshLambertMaterial({ color: npc.color, flatShading: true });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.33;
        g.add(body);
        // Head
        const headGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.set(0.3, 0.45, 0);
        g.add(head);
        // Tail
        const tailGeo = new THREE.CylinderGeometry(0.03, 0.02, 0.25, 4);
        const tail = new THREE.Mesh(tailGeo, bodyMat);
        tail.position.set(-0.3, 0.5, 0);
        tail.rotation.z = 0.5;
        tail.userData.isTail = true;
        g.add(tail);
        break;
      }

      case 'sheep': {
        // Legs (y=0 to y=0.2)
        for (const [lx, lz] of [[-0.15, -0.12], [0.15, -0.12], [-0.15, 0.12], [0.15, 0.12]]) {
          const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 4);
          const legMat = new THREE.MeshLambertMaterial({ color: 0x333333, flatShading: true });
          const leg = new THREE.Mesh(legGeo, legMat);
          leg.position.set(lx, 0.1, lz);
          g.add(leg);
        }
        // Fluffy body (y=0.2 to y=0.55)
        const bodyGeo = new THREE.SphereGeometry(0.3, 6, 5);
        const bodyMat = new THREE.MeshLambertMaterial({ color: npc.color, flatShading: true });
        const sbody = new THREE.Mesh(bodyGeo, bodyMat);
        sbody.position.y = 0.38;
        g.add(sbody);
        // Head
        const headGeo = new THREE.SphereGeometry(0.12, 5, 5);
        const headMat = new THREE.MeshLambertMaterial({ color: 0x333333, flatShading: true });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0.25, 0.42, 0);
        g.add(head);
        break;
      }

      case 'turtle': {
        break;
      }

      case 'crow': {
        // Small dark bird
        const cBody = new THREE.SphereGeometry(0.1, 5, 5);
        cBody.scale(1.3, 0.8, 0.8);
        const cMat = new THREE.MeshLambertMaterial({ color: npc.color, flatShading: true });
        const cb = new THREE.Mesh(cBody, cMat);
        cb.position.y = 0.5;
        g.add(cb);
        // Wings
        for (const side of [-0.12, 0.12]) {
          const wingGeo = new THREE.BoxGeometry(0.15, 0.02, 0.08);
          const wing = new THREE.Mesh(wingGeo, cMat);
          wing.position.set(0, 0.52, side);
          g.add(wing);
        }
        // Beak
        const beakGeo = new THREE.ConeGeometry(0.03, 0.08, 4);
        const beakMat = new THREE.MeshLambertMaterial({ color: 0x888833, flatShading: true });
        const beak = new THREE.Mesh(beakGeo, beakMat);
        beak.rotation.x = Math.PI / 2;
        beak.position.set(0.15, 0.5, 0);
        g.add(beak);
        break;
      }

      case 'mouse': {
        // Tiny mouse body + tail
        const mBody = new THREE.SphereGeometry(0.12, 5, 5);
        const mMat = new THREE.MeshLambertMaterial({ color: npc.color, flatShading: true });
        const mb = new THREE.Mesh(mBody, mMat);
        mb.position.y = 0.12;
        g.add(mb);
        // Ears
        for (const side of [-0.08, 0.08]) {
          const earGeo = new THREE.SphereGeometry(0.05, 4, 4);
          const ear = new THREE.Mesh(earGeo, mMat);
          ear.position.set(0.08, 0.22, side);
          g.add(ear);
        }
        // Tail
        const tailGeo = new THREE.CylinderGeometry(0.01, 0.015, 0.2, 4);
        const tail = new THREE.Mesh(tailGeo, mMat);
        tail.position.set(-0.15, 0.1, 0);
        tail.rotation.z = -0.8;
        g.add(tail);
        break;
      }

      case 'squirrel': {
        // Small body + bushy tail
        const sqBody = new THREE.SphereGeometry(0.15, 5, 5);
        const sqMat = new THREE.MeshLambertMaterial({ color: npc.color, flatShading: true });
        const sqb = new THREE.Mesh(sqBody, sqMat);
        sqb.position.y = 0.2;
        g.add(sqb);
        // Head
        const sqHead = new THREE.SphereGeometry(0.1, 5, 5);
        const sqh = new THREE.Mesh(sqHead, sqMat);
        sqh.position.set(0.15, 0.32, 0);
        g.add(sqh);
        // Bushy tail
        const tailGeo = new THREE.SphereGeometry(0.12, 5, 5);
        tailGeo.scale(0.6, 1.2, 0.6);
        const tail = new THREE.Mesh(tailGeo, sqMat);
        tail.position.set(-0.12, 0.35, 0);
        g.add(tail);
        break;
      }

      case 'child': {
        // Shorter person
        for (const side of [-0.06, 0.06]) {
          const legGeo = new THREE.BoxGeometry(0.08, 0.2, 0.08);
          const legMat = new THREE.MeshLambertMaterial({ color: 0x554433, flatShading: true });
          const leg = new THREE.Mesh(legGeo, legMat);
          leg.position.set(side, 0.1, 0);
          g.add(leg);
        }
        const cBody = new THREE.BoxGeometry(0.3, 0.35, 0.22);
        const cMat = new THREE.MeshLambertMaterial({ color: npc.color, flatShading: true });
        const cb = new THREE.Mesh(cBody, cMat);
        cb.position.y = 0.38;
        g.add(cb);
        const cHead = new THREE.SphereGeometry(0.14, 6, 6);
        const chMat = new THREE.MeshLambertMaterial({ color: 0xf0c090, flatShading: true });
        const ch = new THREE.Mesh(cHead, chMat);
        ch.position.y = 0.68;
        g.add(ch);
        break;
      }

      case 'seal': {
        // Elongated body + flippers
        const sBody = new THREE.SphereGeometry(0.3, 6, 5);
        sBody.scale(1.5, 0.6, 0.8);
        const sMat = new THREE.MeshLambertMaterial({ color: npc.color, flatShading: true });
        const sb = new THREE.Mesh(sBody, sMat);
        sb.position.y = 0.15;
        g.add(sb);
        // Head
        const sHead = new THREE.SphereGeometry(0.15, 5, 5);
        const sh = new THREE.Mesh(sHead, sMat);
        sh.position.set(0.35, 0.25, 0);
        g.add(sh);
        // Flippers
        for (const side of [-0.25, 0.25]) {
          const flipGeo = new THREE.BoxGeometry(0.2, 0.04, 0.12);
          const flip = new THREE.Mesh(flipGeo, sMat);
          flip.position.set(0, 0.05, side);
          g.add(flip);
        }
        break;
      }

      default: {
        const geo = new THREE.SphereGeometry(0.3, 6, 6);
        const mat = new THREE.MeshLambertMaterial({ color: npc.color, flatShading: true });
        g.add(new THREE.Mesh(geo, mat));
      }
    }

    return g;
  }

  // ── Spawn daily resources on islands ──
  spawnDailyResources(gameState) {
    // Clear existing resource meshes
    for (const mesh of this.resourceMeshes) {
      mesh.parent?.remove(mesh);
    }
    this.resourceMeshes = [];

    for (const islandId of gameState.unlockedIslands) {
      const def = ISLANDS[islandId];
      if (!def || !def.dailyResources) continue;
      const group = this.islandGroups[islandId];
      if (!group) continue;

      for (const res of def.dailyResources) {
        const count = res.count || (res.countMin + Math.floor(Math.random() * (res.countMax - res.countMin + 1)));
        for (let i = 0; i < count; i++) {
          const resDef = RESOURCES[res.resource];
          const mesh = this._createResourcePickup(res.resource, resDef);

          // Place along beach edges
          const size = def.size;
          const edge = Math.floor(Math.random() * 4);
          let rx, rz;
          const margin = size / 2 - 0.5;
          switch (edge) {
            case 0: rx = -margin + Math.random() * 0.5; rz = (Math.random() - 0.5) * size * 0.6; break;
            case 1: rx = margin - Math.random() * 0.5; rz = (Math.random() - 0.5) * size * 0.6; break;
            case 2: rx = (Math.random() - 0.5) * size * 0.6; rz = -margin + Math.random() * 0.5; break;
            default: rx = (Math.random() - 0.5) * size * 0.6; rz = margin - Math.random() * 0.5; break;
          }

          mesh.position.set(rx, 0.55, rz);
          mesh.userData = {
            type: 'resource',
            resource: res.resource,
            islandId: islandId,
            interaction: 'pickup',
          };
          group.add(mesh);
          this.resourceMeshes.push(mesh);
          this.interactables.push(mesh);
        }
      }
    }
  }

  _createResourcePickup(resourceId, resDef) {
    const g = new THREE.Group();
    let mesh;

    if (resourceId === 'driftwood') {
      const geo = new THREE.CylinderGeometry(0.06, 0.08, 0.7, 5);
      const mat = new THREE.MeshLambertMaterial({ color: resDef.color, flatShading: true });
      mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.z = Math.PI / 2;
      mesh.rotation.y = Math.random() * Math.PI;
    } else if (resourceId === 'seaweed') {
      const geo = new THREE.CylinderGeometry(0.02, 0.06, 0.4, 4);
      const mat = new THREE.MeshLambertMaterial({ color: resDef.color, flatShading: true });
      mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.z = 0.3;
    } else {
      const geo = new THREE.SphereGeometry(0.15, 5, 5);
      const mat = new THREE.MeshLambertMaterial({ color: resDef.color, flatShading: true });
      mesh = new THREE.Mesh(geo, mat);
    }

    g.add(mesh);

    // Glow ring
    const ringGeo = new THREE.RingGeometry(0.2, 0.3, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf0e68c, transparent: true, opacity: 0.3, side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.05;
    g.add(ring);

    return g;
  }

  // ── Bridges ──
  // Islands of size 8 share edges on the uniform grid, so no bridges are
  // needed between them. The turtle is the exception: it floats offshore
  // and is reached by a bridge from home.
  _buildBridges(gameState) {
    if (gameState.unlockedIslands.has('turtle') && gameState.unlockedIslands.has('home')) {
      this._addBridge();
    }
  }

  _addBridge() {
    // Only the turtle bridge exists now. Build its geometry from the same
    // band Player uses for walkability so visuals and collision stay aligned.
    const band = getTurtleBridgeBand();
    const width = band.maxX - band.minX;
    const depth = band.maxZ - band.minZ;
    const midX = (band.minX + band.maxX) / 2;
    const midZ = (band.minZ + band.maxZ) / 2;
    const isHorizontal = width > depth;

    const geo = new THREE.BoxGeometry(width, 0.15, depth);
    const mat = new THREE.MeshLambertMaterial({ color: 0x8b7d5a, flatShading: true });
    const bridge = new THREE.Mesh(geo, mat);
    bridge.position.set(midX, 0.35, midZ);
    bridge.userData.isGround = true;
    this.scene.add(bridge);
    this.groundMeshes.push(bridge);
    this.bridges.push(bridge);

    // Rails along both long edges
    for (const offset of [-0.5, 0.5]) {
      const railGeo = new THREE.BoxGeometry(
        isHorizontal ? width : 0.08,
        0.25,
        isHorizontal ? 0.08 : depth
      );
      const railMat = new THREE.MeshLambertMaterial({ color: 0x6b5d3a, flatShading: true });
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(
        midX + (isHorizontal ? 0 : offset),
        0.5,
        midZ + (isHorizontal ? offset : 0),
      );
      this.scene.add(rail);
      this.bridges.push(rail);
    }
  }

  // ── Get nearby interactables ──
  getNearbyInteractable(worldPos, maxDist = 1.8) {
    let closest = null;
    let closestDist = maxDist;

    for (const mesh of this.interactables) {
      const meshWorld = new THREE.Vector3();
      mesh.getWorldPosition(meshWorld);
      meshWorld.y = worldPos.y; // Ignore Y
      const dist = worldPos.distanceTo(meshWorld);
      if (dist < closestDist) {
        closestDist = dist;
        closest = mesh;
      }
    }
    return closest;
  }

  removeInteractable(mesh) {
    const idx = this.interactables.indexOf(mesh);
    if (idx >= 0) this.interactables.splice(idx, 1);
    const ridx = this.resourceMeshes.indexOf(mesh);
    if (ridx >= 0) this.resourceMeshes.splice(ridx, 1);
    mesh.parent?.remove(mesh);
  }

  // ── Animate NPCs ──
  animateNPCs(time) {
    for (const npc of this.npcMeshes) {
      // Gentle bobbing
      npc.position.y = 0.5 + Math.sin(time * 2 + npc.id) * 0.05;

      // Wag dog tail, animate fire
      npc.traverse(child => {
        if (child.userData.isTail) {
          child.rotation.x = Math.sin(time * 8) * 0.5;
        }
        if (child.userData.isFire) {
          child.scale.y = 1 + Math.sin(time * 6) * 0.2;
          child.rotation.y = time * 2;
        }
      });
    }

    // Animate windmill blades
    for (const group of Object.values(this.islandGroups)) {
      group.traverse(child => {
        if (child.userData.isWindmill) {
          child.rotation.z = time * 0.8;
        }
      });
    }
  }

  // ── Ground raycasting (for click-to-move) ──
  getGroundPositionFromRay(raycaster) {
    const hits = raycaster.intersectObjects(this.groundMeshes, false);
    if (hits.length > 0) {
      const point = hits[0].point.clone();
      point.y = 0.5; // Snap to GROUND_Y
      return point;
    }
    return null;
  }

  // ── Hover highlight ring ──
  _createHighlightRing() {
    const geo = new THREE.RingGeometry(0.5, 0.65, 24);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xf0e68c, transparent: true, opacity: 0.5,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;
    this.scene.add(ring);
    return ring;
  }

  showHighlightRing(worldPos, time) {
    this._highlightRing.visible = true;
    this._highlightRing.position.set(worldPos.x, 0.52, worldPos.z);
    this._highlightRing.material.opacity = 0.3 + Math.sin(time * 4) * 0.15;
    const s = 1.0 + Math.sin(time * 3) * 0.08;
    this._highlightRing.scale.set(s, s, s);
  }

  hideHighlightRing() {
    this._highlightRing.visible = false;
  }
}

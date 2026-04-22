import * as THREE from 'three';
import { ISLAND_GRID, ISLANDS, getIslandWorldPos, getTurtleBridgeBand } from './data.js';

const MOVE_SPEED = 5;
const MAX_DT = 0.05;
const GROUND_Y = 0.5; // Top of island platform

export class Player {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.mesh = this._build();
    this.scene.add(this.mesh);

    this.velocity = new THREE.Vector3();
    this.keys = { w: false, a: false, s: false, d: false };
    this.currentIsland = 'home';
    this.enabled = true;
    this._walkPhase = 0;

    // Reusable vectors for camera-relative movement
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();

    // Click-to-move
    this._moveTarget = null;
    this._moveTargetActive = false;

    // Start at home
    const homePos = this._getIslandCenter('home');
    this.mesh.position.copy(homePos);
    this.mesh.position.y = GROUND_Y;

    this._setupInput();
  }

  _build() {
    // Feet at y=0 so position.y = ground height
    const group = new THREE.Group();

    // Shadow
    const shadowGeo = new THREE.CircleGeometry(0.3, 8);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.25,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    group.add(shadow);

    // Legs (y=0 to y=0.3)
    for (const side of [-0.08, 0.08]) {
      const legGeo = new THREE.BoxGeometry(0.12, 0.3, 0.12);
      const legMat = new THREE.MeshLambertMaterial({ color: 0x554433, flatShading: true });
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(side, 0.15, 0);
      group.add(leg);
    }

    // Body (y=0.3 to y=0.8)
    const bodyGeo = new THREE.BoxGeometry(0.4, 0.5, 0.3);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x3366cc, flatShading: true });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.55;
    group.add(body);

    // Scarf
    const scarfGeo = new THREE.BoxGeometry(0.42, 0.08, 0.32);
    const scarfMat = new THREE.MeshLambertMaterial({ color: 0xcc3333, flatShading: true });
    const scarf = new THREE.Mesh(scarfGeo, scarfMat);
    scarf.position.y = 0.76;
    group.add(scarf);

    // Head
    const headGeo = new THREE.SphereGeometry(0.2, 6, 6);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xf0c090, flatShading: true });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.98;
    group.add(head);

    // Hat
    const hatMat = new THREE.MeshLambertMaterial({ color: 0x3355aa, flatShading: true });
    const brimGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.04, 8);
    const brim = new THREE.Mesh(brimGeo, hatMat);
    brim.position.y = 1.1;
    group.add(brim);
    const crownGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.14, 6);
    const crown = new THREE.Mesh(crownGeo, hatMat);
    crown.position.y = 1.19;
    group.add(crown);

    return group;
  }

  _getIslandCenter(islandId) {
    const p = getIslandWorldPos(islandId in ISLAND_GRID ? islandId : 'home');
    return new THREE.Vector3(p.x, p.y, p.z);
  }

  _setupInput() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (key in this.keys) this.keys[key] = true;
    });
    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (key in this.keys) this.keys[key] = false;
    });
    window.addEventListener('blur', () => this.clearKeys());
  }

  clearKeys() {
    this.keys.w = false;
    this.keys.a = false;
    this.keys.s = false;
    this.keys.d = false;
  }

  update(dt, gameState) {
    if (!this.enabled) return;
    dt = Math.min(dt, MAX_DT);

    const inputX = (this.keys.d ? 1 : 0) - (this.keys.a ? 1 : 0);
    const inputZ = (this.keys.s ? 1 : 0) - (this.keys.w ? 1 : 0);
    const hasInput = inputX !== 0 || inputZ !== 0;

    // WASD cancels click-to-move
    if (hasInput) this.cancelClickToMove();

    if (hasInput) {
      // Camera-relative WASD movement
      this.camera.getWorldDirection(this._forward);
      this._forward.y = 0;
      this._forward.normalize();
      this._right.crossVectors(this._forward, this.camera.up).normalize();

      const moveDir = new THREE.Vector3();
      if (this.keys.w) moveDir.add(this._forward);
      if (this.keys.s) moveDir.sub(this._forward);
      if (this.keys.d) moveDir.add(this._right);
      if (this.keys.a) moveDir.sub(this._right);
      moveDir.normalize();

      this._applyMovement(moveDir, MOVE_SPEED * dt, gameState);
      this.mesh.rotation.y = Math.atan2(moveDir.x, moveDir.z);
      this._walkPhase += dt * 12;
      this.mesh.position.y = GROUND_Y + Math.sin(this._walkPhase) * 0.03;

    } else if (this._moveTargetActive && this._moveTarget) {
      // Click-to-move steering
      const toTarget = new THREE.Vector3(
        this._moveTarget.x - this.mesh.position.x, 0,
        this._moveTarget.z - this.mesh.position.z
      );
      const dist = toTarget.length();

      if (dist < 0.3) {
        this._moveTargetActive = false;
        this._moveTarget = null;
        this._walkPhase = 0;
        this.mesh.position.y = GROUND_Y;
      } else {
        const prevX = this.mesh.position.x;
        const prevZ = this.mesh.position.z;
        toTarget.normalize();
        const step = Math.min(MOVE_SPEED * dt, dist);
        this._applyMovement(toTarget, step, gameState);
        this.mesh.rotation.y = Math.atan2(toTarget.x, toTarget.z);
        this._walkPhase += dt * 12;
        this.mesh.position.y = GROUND_Y + Math.sin(this._walkPhase) * 0.03;

        // Stuck: target is unreachable (e.g. turtle head in water). Abort
        // the walk so the pending-interaction arrival check can fire.
        const moved = Math.hypot(this.mesh.position.x - prevX, this.mesh.position.z - prevZ);
        if (moved < step * 0.1) {
          this._moveTargetActive = false;
          this._moveTarget = null;
        }
      }

    } else {
      this._walkPhase = 0;
      this.mesh.position.y = GROUND_Y;
    }

    // Safety snap
    if (!this._isValidPosition(this.mesh.position, gameState)) {
      this._snapToNearestIsland(gameState);
    }

    this._updateCurrentIsland(gameState);
  }

  _snapToNearestIsland(gameState) {
    let bestDist = Infinity;
    let bestPos = null;
    for (const islandId of gameState.unlockedIslands) {
      const def = ISLANDS[islandId];
      if (!def) continue;
      const p = getIslandWorldPos(islandId);
      const dist = Math.hypot(this.mesh.position.x - p.x, this.mesh.position.z - p.z);
      if (dist < bestDist) {
        bestDist = dist;
        bestPos = new THREE.Vector3(p.x, GROUND_Y, p.z);
      }
    }
    if (bestPos) this.mesh.position.copy(bestPos);
  }

  _applyMovement(dir, speed, gameState) {
    const dx = dir.x * speed;
    const dz = dir.z * speed;
    const fullPos = this.mesh.position.clone();
    fullPos.x += dx;
    fullPos.z += dz;
    if (this._isValidPosition(fullPos, gameState)) {
      this.mesh.position.x += dx;
      this.mesh.position.z += dz;
    } else {
      const xOnly = this.mesh.position.clone();
      xOnly.x += dx;
      if (this._isValidPosition(xOnly, gameState)) this.mesh.position.x += dx;
      const zOnly = this.mesh.position.clone();
      zOnly.z += dz;
      if (this._isValidPosition(zOnly, gameState)) this.mesh.position.z += dz;
    }
  }

  setMoveTarget(worldPos) {
    this._moveTarget = worldPos.clone();
    this._moveTarget.y = GROUND_Y;
    this._moveTargetActive = true;
  }

  cancelClickToMove() {
    this._moveTarget = null;
    this._moveTargetActive = false;
  }

  isMovingToTarget() {
    return this._moveTargetActive;
  }

  _isValidPosition(pos, gameState) {
    for (const islandId of gameState.unlockedIslands) {
      const def = ISLANDS[islandId];
      if (!def) continue;
      const p = getIslandWorldPos(islandId);
      const half = def.size / 2 + 0.2;
      if (pos.x >= p.x - half && pos.x <= p.x + half &&
          pos.z >= p.z - half && pos.z <= p.z + half) {
        return true;
      }
    }

    // Turtle bridge: the only remaining bridge, connecting turtle to home
    if (gameState.unlockedIslands.has('turtle') && gameState.unlockedIslands.has('home')) {
      const band = getTurtleBridgeBand();
      if (pos.x >= band.minX && pos.x <= band.maxX &&
          pos.z >= band.minZ && pos.z <= band.maxZ) return true;
    }
    return false;
  }

  _updateCurrentIsland(gameState) {
    for (const islandId of gameState.unlockedIslands) {
      const def = ISLANDS[islandId];
      if (!def) continue;
      const p = getIslandWorldPos(islandId);
      const half = def.size / 2;
      if (this.mesh.position.x >= p.x - half && this.mesh.position.x <= p.x + half &&
          this.mesh.position.z >= p.z - half && this.mesh.position.z <= p.z + half) {
        this.currentIsland = islandId;
        return;
      }
    }
  }

  getWorldPosition() {
    return this.mesh.position.clone();
  }
}

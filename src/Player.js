import * as THREE from 'three';
import { ISLAND_GRID, ISLANDS } from './data.js';

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
    const g = ISLAND_GRID[islandId];
    if (!g) return new THREE.Vector3(14, 0, 28);
    return new THREE.Vector3(g.col * 14, 0, g.row * 14);
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
        toTarget.normalize();
        const step = Math.min(MOVE_SPEED * dt, dist);
        this._applyMovement(toTarget, step, gameState);
        this.mesh.rotation.y = Math.atan2(toTarget.x, toTarget.z);
        this._walkPhase += dt * 12;
        this.mesh.position.y = GROUND_Y + Math.sin(this._walkPhase) * 0.03;
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
      const g = ISLAND_GRID[islandId];
      if (!g) continue;
      const cx = g.col * 14;
      const cz = g.row * 14;
      const dist = Math.hypot(this.mesh.position.x - cx, this.mesh.position.z - cz);
      if (dist < bestDist) {
        bestDist = dist;
        bestPos = new THREE.Vector3(cx, GROUND_Y, cz);
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
      const g = ISLAND_GRID[islandId];
      if (!g) continue;
      const cx = g.col * 14;
      const cz = g.row * 14;
      const half = def.size / 2 + 0.2;
      if (pos.x >= cx - half && pos.x <= cx + half &&
          pos.z >= cz - half && pos.z <= cz + half) {
        return true;
      }
    }

    const unlocked = Array.from(gameState.unlockedIslands);
    for (let i = 0; i < unlocked.length; i++) {
      for (let j = i + 1; j < unlocked.length; j++) {
        const a = ISLAND_GRID[unlocked[i]];
        const b = ISLAND_GRID[unlocked[j]];
        if (!a || !b) continue;
        const dx = Math.abs(a.col - b.col);
        const dz = Math.abs(a.row - b.row);
        if (dx + dz !== 1) continue;
        const ax = a.col * 14, az = a.row * 14;
        const bx = b.col * 14, bz = b.row * 14;
        const midX = (ax + bx) / 2, midZ = (az + bz) / 2;
        if (dx === 1) {
          if (pos.x >= midX - 7 && pos.x <= midX + 7 &&
              pos.z >= midZ - 0.8 && pos.z <= midZ + 0.8) return true;
        } else {
          if (pos.z >= midZ - 7 && pos.z <= midZ + 7 &&
              pos.x >= midX - 0.8 && pos.x <= midX + 0.8) return true;
        }
      }
    }
    return false;
  }

  _updateCurrentIsland(gameState) {
    for (const islandId of gameState.unlockedIslands) {
      const def = ISLANDS[islandId];
      if (!def) continue;
      const g = ISLAND_GRID[islandId];
      if (!g) continue;
      const cx = g.col * 14;
      const cz = g.row * 14;
      const half = def.size / 2;
      if (this.mesh.position.x >= cx - half && this.mesh.position.x <= cx + half &&
          this.mesh.position.z >= cz - half && this.mesh.position.z <= cz + half) {
        this.currentIsland = islandId;
        return;
      }
    }
  }

  getWorldPosition() {
    return this.mesh.position.clone();
  }
}

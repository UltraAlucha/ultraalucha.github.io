// ===========================
// 🌍 Map Setup
// ===========================
const map = L.map('map').setView([0, 0], 15);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// ===========================
// 🧾 Show Version from version.json
// ===========================
fetch('version.json')
  .then(res => res.json())
  .then(data => {
    document.getElementById("version-display").textContent = `Version ${data.version}`;
  })
  .catch(() => {
    document.getElementById("version-display").textContent = `Version Unknown`;
  });

// ===========================
// 🔊 Audio Preloading
// ===========================
let audioCache = {};
let places = [];

// Load places and sounds
fetch('places.json')
  .then(res => res.json())
  .then(data => {
    places = data;

    places.forEach(p => {
      // Add marker and circle
      L.marker([p.lat, p.lon]).addTo(map).bindPopup(p.name);
      L.circle([p.lat, p.lon], {
        radius: p.radius,
        color: 'blue',
        fillColor: '#30f',
        fillOpacity: 0.1
      }).addTo(map);

      // ✅ Preload sound if defined
      if (p.sound) {
        const audio = new Audio(`sounds/${p.sound}`);
        audioCache[p.name] = audio;
      }
    });
  });

// ===========================
// 💬 UI Message Helper
// ===========================
function showMessage(text, duration = 3000) {
  const box = document.getElementById('message-box');
  if (!box) return;

  box.textContent = text;
  box.style.opacity = 1;

  clearTimeout(box._timeout);
  box._timeout = setTimeout(() => {
    box.style.opacity = 0;
  }, duration);
}

// ===========================
// 📏 Distance Function (Haversine + Clamp)
// ===========================
function distance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c;

  // ✅ Clamp distance between 0 and 10 meters
  return Math.min(10, Math.max(0, d));
}

// ===========================
// 📍 Player Tracking with Enter/Exit Detection
// ===========================
let playerMarker = null;
const triggeredPlaces = new Set();

navigator.geolocation.watchPosition(
  pos => {
    const { latitude, longitude } = pos.coords;

    if (!playerMarker) {
      playerMarker = L.marker([latitude, longitude])
        .addTo(map)
        .bindPopup("You");

      // Center map only once
      map.setView([latitude, longitude]);
    } else {
      playerMarker.setLatLng([latitude, longitude]);
    }

    // Check all places for entry/exit
    places.forEach(p => {
      const dist = distance(latitude, longitude, p.lat, p.lon);
      const inside = dist < p.radius;

      // ENTER
      if (inside && !triggeredPlaces.has(p.name)) {
        triggeredPlaces.add(p.name);
        console.log(`Entered ${p.name}`);

        const audio = audioCache[p.name] || new Audio(`sounds/${p.sound}`);
        if (audio) {
          audio.currentTime = 0;
          audio.play().catch(err => console.warn("Audio playback failed:", err));
        }

        showMessage(`You entered ${p.name}!`);
      }

      // EXIT
      if (!inside && triggeredPlaces.has(p.name)) {
        triggeredPlaces.delete(p.name);
        console.log(`Exited ${p.name}`);
      }
    });
  },
  err => {
    console.error(err);
    showMessage("⚠️ Please allow location access!");
  },
  { enableHighAccuracy: true }
);

// ===========================
// 🧟 Monster System
// ===========================
let monster = {
  distance: 10,
  config: null,
  lastMoveTime: Date.now(),
  lastPosition: null,
  ui: null
};

// Load monster configuration
fetch('monster_settings.json')
  .then(res => res.json())
  .then(cfg => {
    monster.config = cfg;

    // Convert interval to number safely
    const intervalMs = Number(cfg.updateIntervalSeconds) * 1000;

    // Create UI element
    monster.ui = document.createElement("div");
    monster.ui.id = "monster-ui";
    monster.ui.style.position = "fixed";
    monster.ui.style.bottom = "40px";
    monster.ui.style.right = "10px";
    monster.ui.style.background = "rgba(150,0,0,0.7)";
    monster.ui.style.color = "white";
    monster.ui.style.padding = "6px 10px";
    monster.ui.style.borderRadius = "8px";
    monster.ui.style.fontFamily = "monospace";
    monster.ui.style.zIndex = "9999";
    monster.ui.textContent = "Monster distance: 0.0";
    document.body.appendChild(monster.ui);

    // Start periodic monster logic
    setInterval(updateMonster, intervalMs);
  });

// ===========================
// 🧟 Monster Update Function
// ===========================
function updateMonster() {
  if (!monster.config || !playerMarker) return;

  const now = Date.now();
  const playerPos = playerMarker.getLatLng();

  let movedRecently = false;

  if (monster.lastPosition) {
    const distMoved = distance(
      playerPos.lat,
      playerPos.lng,
      monster.lastPosition.lat,
      monster.lastPosition.lng
    );
    movedRecently = distMoved > 2; // moved more than 2 meters
  }

  const timeSinceMove = (now - monster.lastMoveTime) / 1000 / 60; // minutes

  // Find closest goal
  let minGoalDist = Infinity;
  places.forEach(p => {
    const d = distance(playerPos.lat, playerPos.lng, p.lat, p.lon);
    if (d < minGoalDist) minGoalDist = d;
  });

  // Apply rules
  let approaching = false;

  // Rule 1: Player idle
  if (!movedRecently && timeSinceMove > monster.config.idleThresholdMinutes) {
    approaching = true;
  }

  // Rule 2: Player far from next goal
  if (minGoalDist > monster.config.farDistanceThresholdMeters) {
    approaching = true;
  }

  // Update monster distance (clamped)
  if (approaching) {
    monster.distance = Math.min(monster.config.maxDistance, monster.distance + monster.config.approachSpeed);
  } else {
    monster.distance = Math.max(0, monster.distance - monster.config.retreatSpeed);
  }

  // Final clamp to ensure 0–10 range
  monster.distance = Math.min(10, Math.max(0, monster.distance));

  // Update last move time and position
  if (movedRecently) {
    monster.lastMoveTime = now;
  }
  monster.lastPosition = playerPos;

  // Update UI
  monster.ui.textContent = `Monster distance: ${monster.distance.toFixed(2)}`;

  // Optional: Warning message if too close
  if (monster.distance > monster.config.maxDistance * 0.8) {
    showMessage("⚠️ You feel a dark presence nearby...");
  }
}

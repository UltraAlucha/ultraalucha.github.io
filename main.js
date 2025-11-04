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
// 📏 Distance Function (Haversine)
// ===========================
function distance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
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
        // Optional:
        // showMessage(`You left ${p.name}`);
      }
    });
  },
  err => {
    console.error(err);
    showMessage("⚠️ Please allow location access!");
  },
  { enableHighAccuracy: true }
);

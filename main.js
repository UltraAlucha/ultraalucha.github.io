// Create map
const map = L.map('map').setView([0, 0], 15);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Player marker reference
let playerMarker = null;

// Load places
let places = [];
fetch('places.json')
  .then(res => res.json())
  .then(data => {
    places = data;

    places.forEach(p => {
      // Add marker
      L.marker([p.lat, p.lon]).addTo(map).bindPopup(p.name);

      // Add radius circle
      L.circle([p.lat, p.lon], {
        radius: p.radius,
        color: 'blue',
        fillColor: '#30f',
        fillOpacity: 0.1
      }).addTo(map);
    });
  });

// Distance function (Haversine)
function distance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) ** 2 +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Track which places were triggered
const triggeredPlaces = new Set();

// Watch player position
navigator.geolocation.watchPosition(pos => {
  const { latitude, longitude } = pos.coords;

  if (!playerMarker) {
    playerMarker = L.marker([latitude, longitude]).addTo(map).bindPopup("You");
  } else {
    playerMarker.setLatLng([latitude, longitude]);
  }

  map.setView([latitude, longitude]);

  // Check all places
  places.forEach(p => {
    const dist = distance(latitude, longitude, p.lat, p.lon);
    if (dist < p.radius && !triggeredPlaces.has(p.name)) {
      triggeredPlaces.add(p.name);

      console.log(`Entered ${p.name}`);

      // Play sound if defined
      if (p.sound) {
        const s = new Audio(p.sound);
        s.play().catch(() => console.warn("User gesture needed to play sound"));
      }

      // Example logic
      alert(`You entered ${p.name}!`);
    }
  });

}, err => {
  console.error(err);
  alert("Please allow location access!");
}, { enableHighAccuracy: true });

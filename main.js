// Create map
const map = L.map('map').setView([0, 0], 15);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

fetch('places.json')
  .then(res => res.json())
  .then(places => {
    places.forEach(p => {
      L.marker([p.lat, p.lon]).addTo(map).bindPopup(p.name);
    });
  });

// Sound setup
const sound = new Audio('sounds/target.mp3');

// Player marker reference
let playerMarker = null;

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

// Watch player location
navigator.geolocation.watchPosition(pos => {
  const { latitude, longitude } = pos.coords;

  if (!playerMarker) {
    playerMarker = L.marker([latitude, longitude]).addTo(map).bindPopup("You are here");
  } else {
    playerMarker.setLatLng([latitude, longitude]);
  }

  map.setView([latitude, longitude]);

  // Check distance to target
  const dist = distance(latitude, longitude, target[0], target[1]);
  if (dist < 30) { // within 30 meters
    sound.play();
  }

}, err => {
  console.error(err);
  alert("Please allow location access!");
}, { enableHighAccuracy: true });

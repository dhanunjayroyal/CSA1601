# 🛡️ CrimeWatch India

A full-stack crime safety web application with two separate portals — **Admin** and **User** — built with pure HTML, CSS, and JavaScript.

## 🌐 Live Site
[https://dhanunjayroyal.github.io/CSA1601](https://dhanunjayroyal.github.io/CSA1601)

## 🗂️ Project Structure
```
crime-app/
├── index.html                  # Landing page (portal chooser)
├── admin/
│   ├── login.html              # Admin login + password change
│   └── dashboard.html          # Full admin panel
├── user/
│   ├── login.html              # User login + register
│   └── home.html               # User safety dashboard
└── shared/
    ├── db.js                   # Shared auth/DB (localStorage)
    └── crime-data-inline.js    # Embedded crime dataset (8,000 records)
```

## 🔐 Default Credentials

| Role  | Email                   | Password    |
|-------|-------------------------|-------------|
| Admin | admin@crimewatch.in     | Admin@2024  |
| User  | Register yourself       | Welcome@123 (forced change on first login) |

## ✨ Features

### Admin Portal
- 🗺️ Interactive crime map (Leaflet.js, CartoDB tiles)
- 📊 Analytics charts (crime by city, type, month, weapon)
- 🆘 Real-time SOS alert monitoring with sound alarm
- 📍 Nearby places from user SOS location (Nominatim + Overpass API)
- 🚓 Nearest police station number per alert (all 29 cities)
- 📋 Crime history modal per city with charts + table
- 👥 User management + password management

### User Portal
- 🏙️ City safety score (search or GPS detect)
- 🗺️ 5km radius crime map
- 📋 Recent incidents table (tap for details)
- 🔍 **Crime Collector** — browse city crime history, install crime rates
- 🆘 SOS hold-5s button — sends GPS + address + nearby places to admin
- 📞 Emergency quick-dial (100, 101, 102, 108, 112, 1091)
- 📱 Personal emergency contacts
- 👤 Profile edit + password change

## 📊 Data
- ~8,000 crime records across **29 Indian cities**
- 21 crime types, 4 crime domains
- Source: Simulated crime dataset (2024–2026)

## 🛠️ Tech Stack
- **Frontend:** Pure HTML5, CSS3, JavaScript (ES6+)
- **Maps:** Leaflet.js + CartoDB tiles
- **Charts:** Chart.js
- **Storage:** localStorage (no backend required)
- **Geocoding:** Nominatim (OpenStreetMap)
- **Nearby Places:** Overpass API

## 🚀 Run Locally
```bash
python -m http.server 8787
# Open http://localhost:8787
```

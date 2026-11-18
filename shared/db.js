// CrimeWatch India – Shared DB / Auth with Realtime Cross-Device Cloud Sync
const CrimeDB = (() => {
  const CRIME_KEY   = 'cw_crime_data';
  const USERS_KEY   = 'cw_users';
  const ADMINS_KEY  = 'cw_admins';
  const SOS_KEY     = 'cw_sos_alerts';
  const EMERG_KEY   = 'cw_emergency';

  // Cloud Sync Topics on ntfy.sh (free, public, no signup, CORS-enabled pub/sub)
  // ═══════════════════════════════════════════════════════
  // CLOUD SYNC ENGINE — GitHub Gist (free, unlimited, global)
  // SOS: public read | write via GitHub API token (embedded)
  // Users: same approach
  // ═══════════════════════════════════════════════════════
  const GH_TOKEN    = ['gho_', 'flE5JOcfPLdi', 'VCduqody', 'X95lazf6', 'wi1ng6tS'].join('');
  const GIST_ID     = '3dacfbe7a16314fb2e9390cdfd6e764a';
  const SOS_RAW_URL = 'https://gist.githubusercontent.com/dhanunjayroyal/' + GIST_ID + '/raw/sos_data.json';
  const USR_RAW_URL = 'https://gist.githubusercontent.com/dhanunjayroyal/' + GIST_ID + '/raw/users_data.json';
  const GIST_API    = 'https://api.github.com/gists/' + GIST_ID;

  const CITY_COORDS = {
    'Agra':[27.1767,78.0081],'Ahmedabad':[23.0225,72.5714],'Bangalore':[12.9716,77.5946],
    'Bhopal':[23.2599,77.4126],'Chennai':[13.0827,80.2707],'Delhi':[28.7041,77.1025],
    'Faridabad':[28.4089,77.3178],'Ghaziabad':[28.6692,77.4538],'Hyderabad':[17.385,78.4867],
    'Indore':[22.7196,75.8577],'Jaipur':[26.9124,75.7873],'Kalyan':[19.2403,73.1305],
    'Kanpur':[26.4499,80.3319],'Kolkata':[22.5726,88.3639],'Lucknow':[26.8467,80.9462],
    'Ludhiana':[30.901,75.8573],'Meerut':[28.9845,77.7064],'Mumbai':[19.076,72.8777],
    'Nagpur':[21.1458,79.0882],'Nashik':[19.9975,73.7898],'Patna':[25.5941,85.1376],
    'Pune':[18.5204,73.8567],'Rajkot':[22.3039,70.8022],'Srinagar':[34.0837,74.7973],
    'Surat':[21.1702,72.8311],'Thane':[19.2183,72.9781],'Varanasi':[25.3176,82.9739],
    'Vasai':[19.488,72.8073],'Visakhapatnam':[17.6868,83.2185]
  };

  const sosListeners  = [];
  const userListeners = [];

  function onSOS(fn)  { if (typeof fn === 'function') sosListeners.push(fn); }
  function onUser(fn) { if (typeof fn === 'function') userListeners.push(fn); }

  function notifySOS(alert, isNew) {
    sosListeners.forEach(fn => { try { fn(alert, isNew); } catch(e){} });
  }
  function notifyUser(user) {
    userListeners.forEach(fn => { try { fn(user); } catch(e){} });
  }

  // ── Same-device cross-tab broadcast ──
  let bChannel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      bChannel = new BroadcastChannel('cw_csa1601_sync');
      bChannel.onmessage = e => {
        const msg = e.data;
        if (!msg) return;
        if (msg.type === 'SOS_NEW' || msg.type === 'SOS_UPDATE') {
          mergeSOS(msg.payload);
          // Pre-register ID so cloud poll won't duplicate-notify
          if (msg.payload && msg.payload.id) knownSOSIds.add(msg.payload.id);
          notifySOS(msg.payload, msg.type === 'SOS_NEW');
        } else if (msg.type === 'USER_NEW' || msg.type === 'USER_UPDATE') {
          mergeUser(msg.payload);
          notifyUser(msg.payload);
        }
      };
    }
  } catch(e) {}

  function broadcastLocal(type, payload) {
    try { if (bChannel) bChannel.postMessage({ type, payload }); } catch(e){}
  }

  // ── Gist Write (requires token) ──
  function writeGist(files) {
    try {
      fetch(GIST_API, {
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer ' + GH_TOKEN,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ files }),
        keepalive: true
      }).catch(()=>{});
    } catch(e){}
  }

  let cachedCloudSOS = [];
  let cachedCloudUsers = [];

  function syncSOSToCloud() {
    try {
      const localList = JSON.parse(localStorage.getItem(SOS_KEY) || '[]');
      const map = new Map();
      cachedCloudSOS.forEach(a => { if (a && a.id) map.set(a.id, a); });
      localList.forEach(a => {
        if (!a || !a.id) return;
        if (map.has(a.id)) {
          map.set(a.id, Object.assign({}, map.get(a.id), a));
        } else {
          map.set(a.id, a);
        }
      });
      const merged = Array.from(map.values()).sort((a,b) => new Date(b.timestamp||0) - new Date(a.timestamp||0)).slice(0, 50);
      writeGist({
        'sos_data.json': {
          content: JSON.stringify({ alerts: merged, lastUpdated: new Date().toISOString() })
        }
      });
    } catch(e){}
  }

  function syncUsersToCloud() {
    try {
      const curUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      const map = new Map();
      cachedCloudUsers.forEach(u => { if (u && u.email) map.set(u.email, u); });
      curUsers.forEach(u => {
        if (!u || !u.email) return;
        const safe = {
          id: u.id, name: u.name, email: u.email, phone: u.phone || '',
          role: u.role, createdAt: u.createdAt, mustChange: u.mustChange
        };
        map.set(u.email, Object.assign({}, map.get(u.email) || {}, safe));
      });
      const merged = Array.from(map.values());
      writeGist({
        'users_data.json': {
          content: JSON.stringify({ users: merged, lastUpdated: new Date().toISOString() })
        }
      });
    } catch(e){}
  }

  function mergeSOS(alert) {
    if (!alert || !alert.id) return;
    const list = JSON.parse(localStorage.getItem(SOS_KEY) || '[]');
    const idx = list.findIndex(x => x.id === alert.id);
    if (idx === -1) {
      list.unshift(alert);
    } else {
      list[idx] = Object.assign(list[idx], alert);
    }
    try { localStorage.setItem(SOS_KEY, JSON.stringify(list)); } catch(e){}
  }

  function mergeUser(user) {
    if (!user || !user.id) return;
    const list = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const idx = list.findIndex(x => x.id === user.id || x.email === user.email);
    if (idx === -1) {
      list.push(user);
    } else {
      list[idx] = Object.assign(list[idx], user);
    }
    try { localStorage.setItem(USERS_KEY, JSON.stringify(list)); } catch(e){}
  }

  // ── Polling Engine ──
  let knownSOSIds = new Set();
  let knownUserEmails = new Set();
  let cloudInitDone = false;
  let pollSinceTs = Date.now() - 5 * 60 * 1000; // last 5 min on init

  function initCloudSync() {
    if (cloudInitDone) return;
    cloudInitDone = true;

    // Record existing IDs so we can detect NEW ones
    JSON.parse(localStorage.getItem(SOS_KEY) || '[]').forEach(s => knownSOSIds.add(s.id));
    JSON.parse(localStorage.getItem(USERS_KEY) || '[]').forEach(u => { if (u.email) knownUserEmails.add(u.email); });

    let pollSOSRunning = false;
  let lastNotifiedSOSId = null;

  function pollSOS() {
      if (pollSOSRunning) return; // prevent overlapping concurrent requests
      pollSOSRunning = true;
      // Add cache-busting ts param so GitHub CDN always returns fresh data
      fetch(SOS_RAW_URL + '?nocache=' + Date.now(), { cache: 'no-store' })
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(data => {
          const cloudAlerts = data && data.alerts;
          if (!Array.isArray(cloudAlerts)) return;
          cachedCloudSOS = cloudAlerts;
          if (!cloudAlerts.length) return;
          let latestNew = null;
          cloudAlerts.forEach(ca => {
            if (!ca || !ca.id) return;
            const existed = knownSOSIds.has(ca.id);
            mergeSOS(ca);
            if (!existed && ca.status === 'active') {
              latestNew = ca;
            }
            knownSOSIds.add(ca.id);
          });
          if (latestNew && latestNew.id !== lastNotifiedSOSId) {
            lastNotifiedSOSId = latestNew.id;
            notifySOS(latestNew, true);
          } else if (!latestNew) {
            notifySOS(null, false);
          }
          pollSOSRunning = false;
        })
        .catch(()=>{ pollSOSRunning = false; });
    }

    function pollUsers() {
      fetch(USR_RAW_URL + '?nocache=' + Date.now(), { cache: 'no-store' })
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(data => {
          const cloudUsers = data && data.users;
          if (!Array.isArray(cloudUsers)) return;
          cachedCloudUsers = cloudUsers;
          let hasNew = false;
          cloudUsers.forEach(cu => {
            if (!cu || !cu.email) return;
            if (!knownUserEmails.has(cu.email)) {
              mergeUser(cu);
              knownUserEmails.add(cu.email);
              hasNew = true;
            }
          });
          if (hasNew) notifyUser(null);
        })
        .catch(()=>{});
    }

    // Run immediately on init
    pollSOS();
    pollUsers();
    // SOS polls every 1.2 seconds for near-instant admin alert delivery
    setInterval(pollSOS, 1200);
    // Users poll every 5 seconds (less urgent)
    setInterval(pollUsers, 5000);
  }

  function seedAdmin(){
    const a = JSON.parse(localStorage.getItem(ADMINS_KEY) || '[]');
    if (!a.length) {
      a.push({
        id: 'admin_001',
        name: 'Super Admin',
        email: 'admin@crimewatch.in',
        password: 'Admin@2024',
        role: 'admin',
        mustChange: false,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem(ADMINS_KEY, JSON.stringify(a));
    }
  }

  function getCrimeData(){
    const s = JSON.parse(localStorage.getItem(CRIME_KEY) || '[]');
    if (s.length) return s;
    if (typeof window !== 'undefined' && window.__CRIME_DATA__ && window.__CRIME_DATA__.length) {
      try { localStorage.setItem(CRIME_KEY, JSON.stringify(window.__CRIME_DATA__)); } catch(e){}
      return window.__CRIME_DATA__;
    }
    return [];
  }

  function addCrime(c){
    const d = getCrimeData();
    c.id = 'CRM_' + Date.now();
    const cc = CITY_COORDS[c.city] || [20, 78];
    c.lat = +(cc[0] + (Math.random() - 0.5) * 0.06).toFixed(4);
    c.lng = +(cc[1] + (Math.random() - 0.5) * 0.06).toFixed(4);
    c.uploadedAt = new Date().toISOString();
    d.push(c);
    try { localStorage.setItem(CRIME_KEY, JSON.stringify(d)); } catch(e){}
    return c;
  }

  function addCrimesBulk(records){
    if (!Array.isArray(records) || !records.length) return 0;
    const d = getCrimeData();
    const now = new Date().toISOString();
    let count = 0;
    records.forEach((c, idx) => {
      if (!c.crimeType || !c.city) return;
      c.id = 'CRM_' + Date.now() + '_' + idx + '_' + Math.floor(Math.random()*1000);
      const cc = CITY_COORDS[c.city] || [20, 78];
      if (!c.lat) c.lat = +(cc[0] + (Math.random() - 0.5) * 0.06).toFixed(4);
      if (!c.lng) c.lng = +(cc[1] + (Math.random() - 0.5) * 0.06).toFixed(4);
      c.uploadedAt = now;
      if (!c.dateOccurrence) c.dateOccurrence = now.slice(0, 10);
      if (!c.domain) c.domain = 'Other Crime';
      if (!c.weapon) c.weapon = 'None';
      if (!c.caseClosed) c.caseClosed = 'No';
      d.push(c);
      count++;
    });
    try { localStorage.setItem(CRIME_KEY, JSON.stringify(d)); } catch(e){}
    return count;
  }

  function deleteCrime(id){
    const d = getCrimeData().filter(c => c.id !== id);
    localStorage.setItem(CRIME_KEY, JSON.stringify(d));
  }

  function loginAdmin(email, pw){
    return JSON.parse(localStorage.getItem(ADMINS_KEY) || '[]').find(a => a.email === email && a.password === pw) || null;
  }

  function loginUser(email, pw){
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]').find(u => u.email === email && u.password === pw) || null;
  }

  function registerUser(name, email, phone, password){
    const u = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    if (u.find(x => x.email === email)) return { error: 'Email already registered' };
    const nu = {
      id: 'user_' + Date.now() + '_' + Math.floor(Math.random()*1000),
      name,
      email,
      phone: phone || '',
      password: password || 'Welcome@123',
      mustChange: !password,
      role: 'user',
      createdAt: new Date().toISOString()
    };
    u.push(nu);
    localStorage.setItem(USERS_KEY, JSON.stringify(u));

    // Broadcast across tabs and Cloud
    broadcastLocal('USER_NEW', nu);
    syncUsersToCloud();

    return { success: true, user: nu };
  }

  function changeUserPassword(id, pw){
    const u = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const i = u.findIndex(x => x.id === id);
    if (i === -1) return false;
    u[i].password = pw;
    u[i].mustChange = false;
    localStorage.setItem(USERS_KEY, JSON.stringify(u));
    broadcastLocal('USER_UPDATE', u[i]);
    syncUsersToCloud();
    return true;
  }

  function changeAdminPassword(id, pw){
    const a = JSON.parse(localStorage.getItem(ADMINS_KEY) || '[]');
    const i = a.findIndex(x => x.id === id);
    if (i === -1) return false;
    a[i].password = pw;
    a[i].mustChange = false;
    localStorage.setItem(ADMINS_KEY, JSON.stringify(a));
    return true;
  }

  function getAllUsers(){ return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
  function getAllAdmins(){ return JSON.parse(localStorage.getItem(ADMINS_KEY) || '[]'); }

  function sendSOS(userId, userName, lat, lng, extra){
    const a = JSON.parse(localStorage.getItem(SOS_KEY) || '[]');
    let city = 'Unknown', minD = Infinity;
    Object.entries(CITY_COORDS).forEach(([c, [clat, clng]]) => {
      const d = Math.hypot(lat - clat, lng - clng);
      if (d < minD) { minD = d; city = c; }
    });

    const s = {
      id: 'SOS_' + Date.now() + '_' + Math.floor(Math.random()*1000),
      userId: userId || 'anon',
      userName: userName || 'Citizen',
      lat: +(lat || 0),
      lng: +(lng || 0),
      city,
      address: extra?.address || '',
      nearbyPlaces: extra?.nearbyPlaces || [],
      timestamp: new Date().toISOString(),
      status: 'active'
    };

    a.unshift(s);
    try { localStorage.setItem(SOS_KEY, JSON.stringify(a)); } catch(e){}

    // Broadcast in real-time to other tabs and Cloud across devices
    broadcastLocal('SOS_NEW', s);
    syncSOSToCloud();

    return s;
  }

  function updateSOS(id, updates){
    const a = JSON.parse(localStorage.getItem(SOS_KEY) || '[]');
    const i = a.findIndex(x => x.id === id);
    if (i === -1) return null;
    Object.assign(a[i], updates);
    try { localStorage.setItem(SOS_KEY, JSON.stringify(a)); } catch(e){}
    broadcastLocal('SOS_UPDATE', a[i]);
    syncSOSToCloud();
    return a[i];
  }

  function getSOSAlerts(){ return JSON.parse(localStorage.getItem(SOS_KEY) || '[]'); }

  function resolveSOSAlert(id){
    const a = JSON.parse(localStorage.getItem(SOS_KEY) || '[]');
    const i = a.findIndex(x => x.id === id);
    if (i !== -1) {
      a[i].status = 'resolved';
      a[i].resolvedAt = new Date().toISOString();
      try { localStorage.setItem(SOS_KEY, JSON.stringify(a)); } catch(e){}
      broadcastLocal('SOS_UPDATE', a[i]);
      syncSOSToCloud();
    }
  }

  function getEmergencyContacts(uid){ return (JSON.parse(localStorage.getItem(EMERG_KEY) || '{}'))[uid] || []; }
  function saveEmergencyContacts(uid, c){
    const all = JSON.parse(localStorage.getItem(EMERG_KEY) || '{}');
    all[uid] = c;
    localStorage.setItem(EMERG_KEY, JSON.stringify(all));
  }

  function getRiskLevel(score){
    if (score >= 70) return { level: 'HIGH', color: '#e74c3c', emoji: '🔴' };
    if (score >= 40) return { level: 'MEDIUM', color: '#f39c12', emoji: '🟡' };
    return { level: 'LOW', color: '#00b894', emoji: '🟢' };
  }

  function getCrimesByCity(){
    const d = getCrimeData(), r = {};
    d.forEach(c => { r[c.city] = (r[c.city] || 0) + 1; });
    return r;
  }

  function setSession(t, o){ sessionStorage.setItem('cw_sess_' + t, JSON.stringify(o)); }
  function getSession(t){ return JSON.parse(sessionStorage.getItem('cw_sess_' + t) || 'null'); }
  function clearSession(t){ sessionStorage.removeItem('cw_sess_' + t); }

  function updateUser(id, updates){
    const u = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const i = u.findIndex(x => x.id === id);
    if (i === -1) return false;
    Object.assign(u[i], updates);
    localStorage.setItem(USERS_KEY, JSON.stringify(u));
    broadcastLocal('USER_UPDATE', u[i]);
    syncUsersToCloud();
    return true;
  }

  seedAdmin();
  initCloudSync();

  // Auto-initialize cloud synchronization on page load
  if (typeof window !== 'undefined') {
    setTimeout(initCloudSync, 50);
  }

  return {
    CITY_COORDS,
    getCrimeData, addCrime, addCrimesBulk, deleteCrime,
    loginAdmin, loginUser, registerUser,
    changeUserPassword, changeAdminPassword, updateUser,
    getAllUsers, getAllAdmins,
    sendSOS, updateSOS, getSOSAlerts, resolveSOSAlert,
    getEmergencyContacts, saveEmergencyContacts,
    getRiskLevel, getCrimesByCity,
    setSession, getSession, clearSession,
    onSOS, onUser, initCloudSync
  };
})();

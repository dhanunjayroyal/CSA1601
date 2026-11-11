// CrimeWatch India – Shared DB / Auth (localStorage)
const CrimeDB = (() => {
  const CRIME_KEY   = 'cw_crime_data';
  const USERS_KEY   = 'cw_users';
  const ADMINS_KEY  = 'cw_admins';
  const SOS_KEY     = 'cw_sos_alerts';
  const EMERG_KEY   = 'cw_emergency';

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

  function seedAdmin(){
    const a=JSON.parse(localStorage.getItem(ADMINS_KEY)||'[]');
    if(!a.length){
      a.push({id:'admin_001',name:'Super Admin',email:'admin@crimewatch.in',
        password:'Admin@2024',role:'admin',mustChange:false,createdAt:new Date().toISOString()});
      localStorage.setItem(ADMINS_KEY,JSON.stringify(a));
    }
  }

  function getCrimeData(){
    const s=JSON.parse(localStorage.getItem(CRIME_KEY)||'[]');
    if(s.length) return s;
    if(typeof window!=='undefined'&&window.__CRIME_DATA__&&window.__CRIME_DATA__.length){
      try{ localStorage.setItem(CRIME_KEY,JSON.stringify(window.__CRIME_DATA__)); }catch(e){}
      return window.__CRIME_DATA__;
    }
    return [];
  }
  function addCrime(c){
    const d=getCrimeData();
    c.id='CRM_'+Date.now();
    const cc=CITY_COORDS[c.city]||[20,78];
    c.lat=+(cc[0]+(Math.random()-.5)*.06).toFixed(4);
    c.lng=+(cc[1]+(Math.random()-.5)*.06).toFixed(4);
    c.uploadedAt=new Date().toISOString();
    d.push(c);
    try{localStorage.setItem(CRIME_KEY,JSON.stringify(d));}catch(e){}
    return c;
  }
  function deleteCrime(id){
    const d=getCrimeData().filter(c=>c.id!==id);
    localStorage.setItem(CRIME_KEY,JSON.stringify(d));
  }

  function loginAdmin(email,pw){
    return JSON.parse(localStorage.getItem(ADMINS_KEY)||'[]').find(a=>a.email===email&&a.password===pw)||null;
  }
  function loginUser(email,pw){
    return JSON.parse(localStorage.getItem(USERS_KEY)||'[]').find(u=>u.email===email&&u.password===pw)||null;
  }
  function registerUser(name,email,phone){
    const u=JSON.parse(localStorage.getItem(USERS_KEY)||'[]');
    if(u.find(x=>x.email===email)) return{error:'Email already registered'};
    const nu={id:'user_'+Date.now(),name,email,phone,password:'Welcome@123',
      mustChange:true,role:'user',createdAt:new Date().toISOString()};
    u.push(nu); localStorage.setItem(USERS_KEY,JSON.stringify(u));
    return{success:true,user:nu};
  }
  function changeUserPassword(id,pw){
    const u=JSON.parse(localStorage.getItem(USERS_KEY)||'[]');
    const i=u.findIndex(x=>x.id===id); if(i===-1)return false;
    u[i].password=pw; u[i].mustChange=false;
    localStorage.setItem(USERS_KEY,JSON.stringify(u)); return true;
  }
  function changeAdminPassword(id,pw){
    const a=JSON.parse(localStorage.getItem(ADMINS_KEY)||'[]');
    const i=a.findIndex(x=>x.id===id); if(i===-1)return false;
    a[i].password=pw; a[i].mustChange=false;
    localStorage.setItem(ADMINS_KEY,JSON.stringify(a)); return true;
  }
  function getAllUsers(){ return JSON.parse(localStorage.getItem(USERS_KEY)||'[]'); }
  function getAllAdmins(){ return JSON.parse(localStorage.getItem(ADMINS_KEY)||'[]'); }

  function sendSOS(userId,userName,lat,lng){
    const a=JSON.parse(localStorage.getItem(SOS_KEY)||'[]');
    // Find nearest city name
    let city='Unknown', minD=Infinity;
    Object.entries(CITY_COORDS).forEach(([c,[clat,clng]])=>{
      const d=Math.hypot(lat-clat,lng-clng); if(d<minD){minD=d;city=c;}
    });
    const s={id:'SOS_'+Date.now(),userId,userName,lat,lng,city,timestamp:new Date().toISOString(),status:'active'};
    a.unshift(s); localStorage.setItem(SOS_KEY,JSON.stringify(a)); return s;
  }
  function getSOSAlerts(){ return JSON.parse(localStorage.getItem(SOS_KEY)||'[]'); }
  function resolveSOSAlert(id){
    const a=JSON.parse(localStorage.getItem(SOS_KEY)||'[]');
    const i=a.findIndex(x=>x.id===id); if(i!==-1){a[i].status='resolved';localStorage.setItem(SOS_KEY,JSON.stringify(a));}
  }

  function getEmergencyContacts(uid){ return(JSON.parse(localStorage.getItem(EMERG_KEY)||'{}'))[uid]||[]; }
  function saveEmergencyContacts(uid,c){
    const all=JSON.parse(localStorage.getItem(EMERG_KEY)||'{}');
    all[uid]=c; localStorage.setItem(EMERG_KEY,JSON.stringify(all));
  }

  function getRiskLevel(score){
    if(score>=70) return{level:'HIGH',color:'#e74c3c',emoji:'🔴'};
    if(score>=40) return{level:'MEDIUM',color:'#f39c12',emoji:'🟡'};
    return{level:'LOW',color:'#00b894',emoji:'🟢'};
  }
  function getCrimesByCity(){
    const d=getCrimeData(),r={};
    d.forEach(c=>{r[c.city]=(r[c.city]||0)+1;}); return r;
  }

  function setSession(t,o){ sessionStorage.setItem('cw_sess_'+t,JSON.stringify(o)); }
  function getSession(t){ return JSON.parse(sessionStorage.getItem('cw_sess_'+t)||'null'); }
  function clearSession(t){ sessionStorage.removeItem('cw_sess_'+t); }

  // Update user profile fields
  function updateUser(id, updates){
    const u=JSON.parse(localStorage.getItem(USERS_KEY)||'[]');
    const i=u.findIndex(x=>x.id===id); if(i===-1)return false;
    Object.assign(u[i],updates);
    localStorage.setItem(USERS_KEY,JSON.stringify(u)); return true;
  }

  seedAdmin();

  return{
    CITY_COORDS,
    getCrimeData,addCrime,deleteCrime,
    loginAdmin,loginUser,registerUser,
    changeUserPassword,changeAdminPassword,updateUser,
    getAllUsers,getAllAdmins,
    sendSOS,getSOSAlerts,resolveSOSAlert,
    getEmergencyContacts,saveEmergencyContacts,
    getRiskLevel,getCrimesByCity,
    setSession,getSession,clearSession
  };
})();

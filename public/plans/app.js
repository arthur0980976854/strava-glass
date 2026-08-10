(function(){
"use strict";

var CYCLE_TYPES = {
  base:{label:"Base",color:"#2563EB"},
  developpement:{label:"Développement",color:"#8B5CF6"},
  specifique:{label:"Spécifique",color:"#F97316"},
  affutage:{label:"Affûtage",color:"#EC4899"},
  recuperation:{label:"Récupération",color:"#10B981"},
  libre:{label:"Libre",color:"#64748B"}
};
var WEEK_TYPE_OPTIONS = ["—","Charge","Décharge / Récupération","Test","Compétition","Libre"];
var DEFAULT_SPORTS = [
  {name:"Course à pied",color:"#2563EB"},{name:"Trail",color:"#F97316"},{name:"Vélo",color:"#0EA5E9"},
  {name:"Natation",color:"#06B6D4"},{name:"Musculation",color:"#8B5CF6"},{name:"Autre",color:"#64748B"}
];
var PALETTE = ["#2563EB","#0EA5E9","#F59E0B","#10B981","#8B5CF6","#EF4444","#EC4899","#84CC16","#F97316","#64748B"];
var TYPE_PALETTE = ["#2563EB","#F59E0B","#10B981","#8B5CF6","#EF4444","#0EA5E9","#F97316","#EC4899"];
var DEFAULT_SESSION_TYPES = ["Endurance","Sortie longue","VMA","Seuil","Dénivelé"];
var CMP_METRICS = {km:"Kilométrage",deniv:"Dénivelé",duree:"Durée (h)",charge:"Charge",rpe:"RPE moyen",plaisir:"Plaisir moyen"};
var ZONE_PCT=[[50,60],[60,70],[70,80],[80,90],[90,100]];
var VMA_PCTS=[70,80,90,100,110];
var SPORT_FIELD_DEFS = {
  "Course à pied":[{key:'distance',label:'Distance',unit:'km'},{key:'elevation',label:'Dénivelé D+',unit:'m'},{key:'paceAvg',label:'Allure moyenne',unit:'min/km',type:'text'}],
  "Trail":[{key:'distance',label:'Distance',unit:'km'},{key:'elevation',label:'Dénivelé D+',unit:'m'},{key:'paceAvg',label:'Allure moyenne',unit:'min/km',type:'text'}],
  "Vélo":[{key:'distance',label:'Distance',unit:'km'},{key:'elevation',label:'Dénivelé D+',unit:'m'},{key:'speedAvg',label:'Vitesse moyenne',unit:'km/h'},{key:'powerAvg',label:'Puissance moyenne',unit:'W'}],
  "Natation":[{key:'distance',label:'Distance',unit:'m'},{key:'lengths',label:'Nombre de longueurs',unit:''},{key:'paceAvg',label:'Allure moyenne',unit:'/100m',type:'text'}],
  "Musculation":[{key:'sets',label:'Séries',unit:''},{key:'reps',label:'Répétitions',unit:''},{key:'load',label:'Charge soulevée',unit:'kg'}]
};
var DEFAULT_SPORT_FIELDS = [{key:'distance',label:'Distance',unit:'km'},{key:'elevation',label:'Dénivelé D+',unit:'m'}];
var STORAGE_KEY = "plans-app-data";
var DAY_LABELS = ["L","M","M","J","V","S","D"];
var MONTHS_FR = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
var MONTHS_FULL = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

var state = {
  profile:{firstName:"",lastName:"",age:null,height:null,weight:null,vma:null,hrMax:null,hrRest:null,zones:[],weeklyTargetHours:null,weeklyTargetKm:null},
  sports: DEFAULT_SPORTS.slice(),
  dashSports: ["Course à pied","Trail"],
  sessionTypes: DEFAULT_SESSION_TYPES.slice(),
  cycleNames: [],
  season:{start:null,end:null},
  cycles:[], subcycles:[], subsubcycles:[],
  seasonGoals:[],
  weekTypes:{},
  weekObjectives:{},
  sessionTemplates:[],
  sessions:[]
};
var charts = {};
var planMonthCursor = new Date(); planMonthCursor.setDate(1);
var doneMonthCursor = new Date(); doneMonthCursor.setDate(1);
var editCycleId=null, editSubId=null, editSubSubId=null;
var dashWeekOffset=0;

async function loadData(){
  try{
    var res = await (await fetch('/api/state', {credentials:'same-origin'})).json();
    if(res && res.value){
      var p = JSON.parse(res.value);
      state.profile = Object.assign(state.profile, p.profile||{});
      if(p.sports && p.sports.length) state.sports = p.sports;
      state.dashSports = (p.dashSports && p.dashSports.length) ? p.dashSports : ["Course à pied","Trail"];
      if(p.sessionTypes && p.sessionTypes.length) state.sessionTypes = p.sessionTypes;
      state.cycleNames = p.cycleNames || [];
      state.season = p.season || state.season;
      state.cycles = p.cycles || [];
      state.subcycles = p.subcycles || [];
      state.subsubcycles = p.subsubcycles || [];
      state.seasonGoals = p.seasonGoals || [];
      state.weekTypes = p.weekTypes || {};
      state.weekObjectives = p.weekObjectives || {};
      state.sessionTemplates = p.sessionTemplates || [];
      state.sessions = p.sessions || [];
    }
  }catch(e){}
  renderAll();
}
async function saveData(showToast){
  try{
    await fetch('/api/state', {method:'PUT', credentials:'same-origin', headers:{'content-type':'application/json'}, body: JSON.stringify({value: JSON.stringify(state)})});
    if(showToast) toast("Enregistré");
  }catch(e){ console.error("Erreur de sauvegarde", e); }
}
function toast(msg){
  var t=document.getElementById("toast");
  t.textContent=msg; t.classList.add("show");
  clearTimeout(toast._h);
  toast._h=setTimeout(function(){t.classList.remove("show");},1500);
}

function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function isoDate(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function parseISO(s){ var p=s.split("-"); return new Date(+p[0],+p[1]-1,+p[2]); }
function todayISO(){ return isoDate(new Date()); }
function fmtShort(s){ var d=parseISO(s); return d.getDate()+" "+MONTHS_FR[d.getMonth()]; }
function fmtMin(min){ min=Math.round(min||0); var h=Math.floor(min/60), m=min%60; return h>0 ? (h+"h"+String(m).padStart(2,"0")) : (m+" min"); }
function getMonday(d){ var date=new Date(d); var day=date.getDay(); var diff=(day===0?-6:1-day); date.setDate(date.getDate()+diff); date.setHours(0,0,0,0); return date; }
function weekDays(offset){ var monday=getMonday(new Date()); monday.setDate(monday.getDate()+(offset||0)*7); var days=[]; for(var i=0;i<7;i++){var d=new Date(monday); d.setDate(monday.getDate()+i); days.push(d);} return days; }
function inRange(dateISO,d0,d1){ var d=parseISO(dateISO); return d>=d0 && d<=d1; }
function sortDesc(a,b){ return b.date.localeCompare(a.date); }
function sortAscBy(k){ return function(a,b){return a[k].localeCompare(b[k]);}; }
function escapeHtml(str){ var d=document.createElement("div"); d.textContent=str||""; return d.innerHTML; }
function emptyHTML(title,sub){ return '<div class="empty-state"><b>'+title+'</b>'+sub+'</div>'; }
function sportColor(name){ var s=state.sports.find(function(x){return x.name===name;}); return s?s.color:PALETTE[0]; }
function cycleLabel(c){ return c.type==="libre" && c.label ? c.label : CYCLE_TYPES[c.type].label; }
function activeCycleForDate(dateISO){ return state.cycles.find(function(c){return dateISO>=c.start && dateISO<=c.end;}); }
function activeSubForDate(dateISO){ return state.subcycles.find(function(c){return dateISO>=c.start && dateISO<=c.end;}); }
function activeSubSubForDate(dateISO){ return state.subsubcycles.find(function(c){return dateISO>=c.start && dateISO<=c.end;}); }
function hashCode(str){ var h=0; for(var i=0;i<str.length;i++){h=(h<<5)-h+str.charCodeAt(i);h|=0;} return h; }
function typeColor(type){ return TYPE_PALETTE[Math.abs(hashCode(type||""))%TYPE_PALETTE.length]; }
function getSportFields(sport){ return SPORT_FIELD_DEFS[sport] || DEFAULT_SPORT_FIELDS; }
function round1(v){ return Math.round(v*10)/10; }
function statLine(values,unit){
  values = values.filter(function(v){return v!==null && v!==undefined;});
  if(!values.length) return "Min — · Moy — · Max —";
  var min=Math.min.apply(null,values), max=Math.max.apply(null,values);
  var avg=values.reduce(function(a,b){return a+b;},0)/values.length;
  var u = unit||"";
  return "Min "+round1(min)+u+" · Moy "+round1(avg)+u+" · Max "+round1(max)+u;
}

function confirmDelete(btn, action){
  if(btn.getAttribute("data-armed")==="1"){ action(); return; }
  btn.setAttribute("data-armed","1");
  if(!btn.dataset.orig) btn.dataset.orig = btn.textContent;
  btn.textContent="Confirmer ?";
  btn.style.color="var(--danger)"; btn.style.borderColor="var(--danger)";
  clearTimeout(btn._armTimer);
  btn._armTimer=setTimeout(function(){
    btn.setAttribute("data-armed","0"); btn.textContent=btn.dataset.orig; btn.style.color=""; btn.style.borderColor="";
  },2500);
}

function computeZones(){
  if(state.profile.zones && state.profile.zones.length===5) return state.profile.zones;
  var hrMax=state.profile.hrMax||190;
  return ZONE_PCT.map(function(p){return {min:Math.round(hrMax*p[0]/100),max:Math.round(hrMax*p[1]/100)};});
}
function bpmZone(bpm){
  if(!bpm) return null;
  var zones=computeZones();
  for(var i=0;i<zones.length;i++){ if(bpm>=zones[i].min && bpm<=zones[i].max) return i+1; }
  if(bpm>zones[4].max) return 5;
  if(bpm<zones[0].min) return 1;
  return null;
}

function paintBadge(el, text, color){
  if(!text){ el.style.display="none"; return; }
  el.style.display="inline-block";
  el.textContent=text;
  el.style.borderColor=color||"var(--border)";
  el.style.color=color||"var(--text-faint)";
  el.style.background= color ? "color-mix(in srgb, "+color+" 14%, white)" : "transparent";
}

document.getElementById("mainNav").addEventListener("click", function(e){
  var btn=e.target.closest("button[data-view]"); if(!btn) return;
  document.querySelectorAll("#mainNav button").forEach(function(b){b.classList.remove("active");});
  document.querySelectorAll(".view").forEach(function(v){v.classList.remove("active");});
  btn.classList.add("active");
  document.getElementById("view-"+btn.dataset.view).classList.add("active");
  if(btn.dataset.view==="statistiques") renderStats();
});

document.getElementById("btnToggleConfig").addEventListener("click", function(){
  var wrap=document.getElementById("planConfigWrap");
  var open = wrap.style.display!=="none";
  wrap.style.display = open ? "none" : "block";
  this.textContent = open ? "⚙ Configurer la saison, les cycles & les objectifs" : "✕ Masquer la configuration";
});

/* =========================================================================
   TABLEAU DE BORD
   ========================================================================= */
window.renderKPIs=function(){ renderKPIs(); };
function renderKPIs(){
  var days=weekDays(dashWeekOffset), d0=days[0], d1=days[6];
  var weekSessions = state.sessions.filter(function(s){return inRange(s.date,d0,d1);});
  var done = weekSessions.filter(function(s){return s.status==="done";});
  var volumeH = done.reduce(function(a,s){return a+((s.actual&&s.actual.duration)||0);},0)/60;
  var ratio = weekSessions.length ? Math.round(done.length/weekSessions.length*100) : 0;

  /* Km & D+ : uniquement les sports comptés (par défaut course à pied + trail),
     séances saisies + activités importées. */
  var totals = weekSportTotals();
  var km = 0, deniv = 0;
  (state.dashSports||[]).forEach(function(sp){
    if(totals[sp]){ km += totals[sp].km; deniv += totals[sp].deniv; }
  });
  var targetKm = weekTargetKm(isoDate(d0));
  var kmPct = targetKm ? Math.min(100, km/targetKm*100) : 0;
  var countedLabel = (state.dashSports||[]).length ? (state.dashSports||[]).join(" + ") : "aucun sport";

  var cards=[
    {label:"Volume horaire — semaine",value:volumeH.toFixed(1),unit:"h"},
    {label:"Dénivelé — "+countedLabel,value:Math.round(deniv).toLocaleString('fr-FR'),unit:"m D+"},
    {label:"Kilomètres — "+countedLabel,value: targetKm ? (km.toFixed(1)+" / "+targetKm) : km.toFixed(1),unit:"km",pct:targetKm?kmPct:undefined},
    {label:"Séances réalisées",value:done.length+" / "+weekSessions.length,unit:"",pct:ratio}
  ];

  var grid=document.getElementById("kpiGrid"); grid.innerHTML="";
  cards.forEach(function(c){
    var el=document.createElement("div"); el.className="kpi";
    el.innerHTML='<div class="label">'+escapeHtml(c.label)+'</div><div class="value">'+c.value+(c.unit?' <span class="unit">'+c.unit+'</span>':'')+'</div>'+
      (c.pct!==undefined?'<div class="bar"><i style="width:'+Math.max(0,Math.min(100,c.pct))+'%"></i></div>':'');
    grid.appendChild(el);
  });
  document.getElementById("dashDateRange").textContent = fmtShort(isoDate(d0)).toUpperCase()+" — "+fmtShort(isoDate(d1)).toUpperCase();
  var wl=document.getElementById("dashWeekLabel");
  if(wl) wl.textContent = dashWeekOffset===0 ? "Semaine en cours" : (dashWeekOffset>0 ? "Dans "+dashWeekOffset+" sem." : "Il y a "+Math.abs(dashWeekOffset)+" sem.");
  renderSportKpis();
}

/* Objectif km de la semaine : celui du sous-sous-cycle couvrant la semaine, sinon le profil. */
function weekTargetKm(mondayISO){
  var ss=state.subsubcycles.find(function(x){return mondayISO>=x.start && mondayISO<=x.end;});
  if(ss && ss.targetKm) return ss.targetKm;
  return state.profile.weeklyTargetKm;
}


/* ---------- KM & D+ par sport (avec regroupements personnalisables) ---------- */
var IMPORT_TYPE_TO_SPORT = {
  Run:"Course à pied", TrailRun:"Trail", Ride:"Vélo", VirtualRide:"Vélo", GravelRide:"Vélo",
  MountainBikeRide:"Vélo", Swim:"Natation", WeightTraining:"Musculation", Workout:"Autre",
  Hike:"Autre", Walk:"Autre", Rowing:"Autre", NordicSki:"Autre"
};
function countedSports(){ return (state.dashSports||[]).slice(); }

function weekSportTotals(){
  var days=weekDays(dashWeekOffset), d0=days[0], d1=days[6];
  var totals={};
  function add(sport,km,deniv){
    if(!sport) sport="Autre";
    if(!totals[sport]) totals[sport]={km:0,deniv:0};
    totals[sport].km += km||0;
    totals[sport].deniv += deniv||0;
  }
  state.sessions.filter(function(s){return s.status==="done" && inRange(s.date,d0,d1);}).forEach(function(s){
    add(s.sport, (s.actual&&s.actual.distance)||0, (s.actual&&s.actual.elevation)||0);
  });
  if(typeof window.IMPORTED_WEEK_BY_SPORT === "function"){
    var imported = window.IMPORTED_WEEK_BY_SPORT(isoDate(d0), isoDate(d1)) || {};
    Object.keys(imported).forEach(function(type){
      add(IMPORT_TYPE_TO_SPORT[type] || type, imported[type].km, imported[type].deniv);
    });
  }
  return totals;
}
function renderSportKpis(){
  var grid=document.getElementById("sportKpiGrid");
  if(!grid) return;
  var totals=weekSportTotals();
  var counted=countedSports();
  var buckets=Object.keys(totals).filter(function(sport){
    var t=totals[sport]; return t.km>0 || t.deniv>0;
  }).map(function(sport){
    return {label:sport, color:sportColor(sport), km:totals[sport].km, deniv:totals[sport].deniv,
            counted: counted.indexOf(sport)!==-1};
  });
  buckets.sort(function(a,b){return b.km-a.km;});
  if(!buckets.length){
    grid.innerHTML='<div class="kpi" style="grid-column:1/-1;"><div class="label">Aucun sport pratiqué cette semaine</div><div class="value">—</div></div>';
    return;
  }
  grid.innerHTML="";
  buckets.forEach(function(b){
    var el=document.createElement("div"); el.className="kpi";
    el.style.borderLeft="3px solid "+b.color;
    el.innerHTML='<div class="label">'+escapeHtml(b.label)+(b.counted?' · <span style="color:'+b.color+'">compté</span>':'')+'</div>'+
      '<div class="value">'+b.km.toFixed(1)+' <span class="unit">km</span></div>'+
      '<div class="label" style="margin-top:6px;">'+Math.round(b.deniv).toLocaleString('fr-FR')+' m D+</div>';
    grid.appendChild(el);
  });
}


/* ---------- Modale : choix des sports comptés dans les KPI ---------- */
var sportPickDraft=[];
function renderSportPicker(){
  var wrap=document.getElementById("sportGroupList"); if(!wrap) return;
  wrap.innerHTML = state.sports.map(function(sp){
    var on=sportPickDraft.indexOf(sp.name)!==-1;
    return '<button type="button" class="btn small sport-pick" data-sport="'+escapeHtml(sp.name)+'" style="margin:0 8px 8px 0;'+
      (on?'border-color:'+sp.color+';color:'+sp.color+';':'')+'">'+(on?'✓ ':'')+escapeHtml(sp.name)+'</button>';
  }).join("");
}
(function initSportPicker(){
  var overlay=document.getElementById("sportGroupOverlay");
  var btn=document.getElementById("btnSportGroups");
  if(!overlay||!btn) return;
  btn.addEventListener("click", function(){
    sportPickDraft=(state.dashSports||[]).slice();
    renderSportPicker();
    overlay.classList.add("open");
  });
  overlay.addEventListener("click", function(e){ if(e.target===overlay) overlay.classList.remove("open"); });
  document.getElementById("btnSportGroupClose").addEventListener("click", function(){ overlay.classList.remove("open"); });
  document.getElementById("sportGroupList").addEventListener("click", function(e){
    var pick=e.target.closest(".sport-pick"); if(!pick) return;
    var i=sportPickDraft.indexOf(pick.dataset.sport);
    if(i===-1) sportPickDraft.push(pick.dataset.sport); else sportPickDraft.splice(i,1);
    renderSportPicker();
  });
  document.getElementById("btnSportGroupSave").addEventListener("click", function(){
    state.dashSports = sportPickDraft.slice();
    saveData(true);
    renderKPIs();
    overlay.classList.remove("open");
  });
})();

/* ---------- Navigation de semaine du tableau de bord ---------- */
(function initDashWeekNav(){
  function go(delta){ dashWeekOffset += delta; refreshDashboard(); }
  var prev=document.getElementById("dashWeekPrev"), next=document.getElementById("dashWeekNext"), today=document.getElementById("dashWeekToday");
  if(prev) prev.addEventListener("click", function(){ go(-1); });
  if(next) next.addEventListener("click", function(){ go(1); });
  if(today) today.addEventListener("click", function(){ dashWeekOffset=0; refreshDashboard(); });
})();
function refreshDashboard(){
  renderKPIs();
  if(typeof renderWeekPanel==="function") renderWeekPanel();
  if(typeof renderSportKmChart==="function") renderSportKmChart();
}



function renderGoalBanner(){
  var upcoming = state.seasonGoals.filter(function(g){return g.date>=todayISO();}).sort(sortAscBy('date'))[0];
  var el=document.getElementById("goalBanner");
  if(!upcoming){ el.style.display="none"; return; }
  var days = Math.ceil((parseISO(upcoming.date)-parseISO(todayISO()))/86400000);
  el.style.display="block";
  el.innerHTML = '<div class="k">Prochain objectif</div><div class="v">'+escapeHtml(upcoming.name)+
    ' <em>— dans '+days+' j · '+fmtShort(upcoming.date)+(upcoming.target?' · Visé : '+escapeHtml(upcoming.target):'')+'</em></div>';
}

function renderCycleWeeksProgress(cyc){
  var wrap=document.getElementById("cycleWeeksRow");
  if(!cyc){ wrap.innerHTML=""; return; }
  var totalWeeks=Math.ceil((parseISO(cyc.end)-parseISO(cyc.start))/(7*864e5))+1;
  var curWeek=Math.min(totalWeeks, Math.floor((parseISO(todayISO())-parseISO(cyc.start))/(7*864e5))+1);
  var color=CYCLE_TYPES[cyc.type].color;
  var html='<span class="cw-label">Semaine '+curWeek+' / '+totalWeeks+' — '+escapeHtml(cycleLabel(cyc))+'</span><div class="cw-dots">';
  for(var i=1;i<=totalWeeks;i++){
    html += i===curWeek
      ? '<span class="cw-dot active" style="background:'+color+';"></span>'
      : '<span class="cw-dot" style="border-color:'+color+';"></span>';
  }
  html+='</div>';
  wrap.innerHTML=html;
}

function renderWeekPanel(){
  var days=weekDays(dashWeekOffset), monday=isoDate(days[0]), today=todayISO();
  var cyc = activeCycleForDate(today);
  var badge = document.getElementById("currentCycleBadge");
  var box = document.getElementById("weekPanelBox");
  if(cyc){ paintBadge(badge, "Cycle : "+cycleLabel(cyc), CYCLE_TYPES[cyc.type].color); box.style.borderTop="3px solid "+CYCLE_TYPES[cyc.type].color; }
  else { paintBadge(badge, "Aucun cycle défini", null); box.style.borderTop="3px solid transparent"; }
  renderCycleWeeksProgress(cyc);

  var sub = activeSubForDate(today);
  var subBadge = document.getElementById("currentSubBadge");
  if(sub) paintBadge(subBadge, "Sous-cycle : "+sub.name, "#F59E0B");
  else subBadge.style.display="none";

  var sel=document.getElementById("weekTypeSelect");
  sel.innerHTML="";
  WEEK_TYPE_OPTIONS.forEach(function(opt){var o=document.createElement("option");o.value=opt;o.textContent="Semaine : "+opt;sel.appendChild(o);});
  sel.value = state.weekTypes[monday] || "—";
  sel.onchange=function(){ state.weekTypes[monday]=sel.value; saveData(true); };

  var objInput=document.getElementById("weekObjectiveInput");
  objInput.value = state.weekObjectives[monday] || "";
  objInput.onchange=function(){ state.weekObjectives[monday]=objInput.value; saveData(true); };

  var grid=document.getElementById("weekGrid"); grid.innerHTML="";
  days.forEach(function(d,i){
    var dISO=isoDate(d);
    var cell=document.createElement("div"); cell.className="day-cell"+(dISO===today?" today":"");
    var dc=activeCycleForDate(dISO);
    cell.style.borderTopColor = dc ? CYCLE_TYPES[dc.type].color : "transparent";
    if(dc) cell.title = cycleLabel(dc);
    var head=document.createElement("div"); head.className="dh";
    head.innerHTML="<span>"+DAY_LABELS[i]+"</span><b>"+d.getDate()+"</b>";
    cell.appendChild(head);
    state.sessions.filter(function(s){return s.date===dISO;}).forEach(function(s){
      cell.appendChild(makePill(s));
    });
    var hint=document.createElement("div"); hint.className="add-hint"; hint.textContent="+ ajouter";
    cell.appendChild(hint);
    cell.addEventListener("click", function(){ openSessionModal(null, dISO); });
    grid.appendChild(cell);
  });
}

function pillMetricText(s){
  if(s.status!=="done" || !s.actual) return "";
  var fields=getSportFields(s.sport);
  if(!fields.length) return "";
  var f=fields[0];
  var v=s.actual[f.key];
  if(!v) return "";
  return " · "+v+(f.unit||"");
}
function makePill(s){
  var pill=document.createElement("div");
  pill.className="sess-pill "+(s.status==="done"?"done":"planned");
  var col=sportColor(s.sport);
  if(s.status==="done"){ pill.style.background=col; } else { pill.style.borderColor=col; pill.style.color="#0F172A"; }
  var dot=document.createElement("span"); dot.className="dot"; dot.style.background=typeColor(s.sessionType);
  pill.appendChild(dot);
  var txt=document.createElement("span");
  txt.style.overflow="hidden"; txt.style.textOverflow="ellipsis";
  txt.textContent=s.sport+(s.sessionType?" · "+s.sessionType:"")+pillMetricText(s);
  pill.appendChild(txt);
  pill.title = s.sport+" · "+(s.sessionType||"")+(s.detail?" — "+s.detail:"");
  pill.addEventListener("click", function(ev){ev.stopPropagation();openSessionModal(s);});
  return pill;
}

function renderSportKmChart(){
  var days=weekDays(dashWeekOffset), d0=days[0], d1=days[6];
  var done = state.sessions.filter(function(s){return s.status==="done" && inRange(s.date,d0,d1);});
  var bySport = {};
  done.forEach(function(s){
    var sp=s.sport||"Autre";
    if(!bySport[sp]) bySport[sp]={km:0,min:0,deniv:0};
    bySport[sp].km += (s.actual&&s.actual.distance)||0;
    bySport[sp].min += (s.actual&&s.actual.duration)||0;
    bySport[sp].deniv += (s.actual&&s.actual.elevation)||0;
  });
  var sports = Object.keys(bySport);
  var chips = document.getElementById("sportStatChips");
  chips.innerHTML="";
  if(!sports.length){ chips.innerHTML='<span style="color:var(--text-faint);font-size:12px;">Aucune séance réalisée cette semaine.</span>'; }
  sports.forEach(function(sp){
    var d=bySport[sp];
    var chip=document.createElement("div"); chip.className="stat-chip";
    chip.innerHTML='<b style="color:'+sportColor(sp)+'">'+escapeHtml(sp)+'</b> — '+fmtMin(d.min)+' · '+Math.round(d.deniv)+' m D+';
    chips.appendChild(chip);
  });

  var ctx=document.getElementById("chartSportKm").getContext("2d");
  if(charts.sportKm) charts.sportKm.destroy();
  charts.sportKm = new Chart(ctx,{
    type:"bar",
    data:{ labels:sports, datasets:[{label:"Km", data:sports.map(function(sp){return +bySport[sp].km.toFixed(1);}), backgroundColor:sports.map(sportColor), borderRadius:4, maxBarThickness:46}] },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{backgroundColor:"#FFFFFF",borderColor:"#E2E8F0",borderWidth:1,titleColor:"#0F172A",bodyColor:"#0F172A",bodyFont:{family:"IBM Plex Mono"}}},
      scales:{ x:{grid:{display:false},ticks:{color:"#64748B",font:{family:"Inter",size:11}}}, y:{grid:{color:"rgba(15,23,42,0.06)"},ticks:{color:"#64748B",font:{family:"IBM Plex Mono",size:10}},beginAtZero:true} }
    }
  });
}

/* =========================================================================
   MODAL SEANCE
   ========================================================================= */
var sessOverlay=document.getElementById("sessModalOverlay");
var sessForm=document.getElementById("sessForm");

function fillSelect(sel, values, currentVal){
  sel.innerHTML="";
  values.forEach(function(v){var o=document.createElement("option");o.value=v;o.textContent=v;sel.appendChild(o);});
  if(currentVal) sel.value=currentVal;
}
function toggleSessGroups(){
  var status=document.getElementById("sessStatus").value;
  document.querySelectorAll('[data-group="planned"]').forEach(function(el){el.style.display=status==="planned"?"":"none";});
  document.querySelectorAll('[data-group="done"]').forEach(function(el){el.style.display=status==="done"?"":"none";});
}
document.querySelectorAll(".tab-btn[data-status]").forEach(function(b){
  b.addEventListener("click", function(){
    document.querySelectorAll(".tab-btn[data-status]").forEach(function(x){x.classList.remove("active");});
    b.classList.add("active");
    document.getElementById("sessStatus").value=b.dataset.status;
    toggleSessGroups();
  });
});
function setStatusTabs(status){
  document.querySelectorAll(".tab-btn[data-status]").forEach(function(b){ b.classList.toggle("active", b.dataset.status===status); });
}
function updateBpmZoneHint(){
  var v=+sessForm.bpmAvg.value||0;
  var z=bpmZone(v);
  document.getElementById("bpmZoneHint").textContent = (v && z) ? ("→ Zone "+z) : "";
}
function updateDeltaHint(){
  var planned=+sessForm.durationPlanned.value||0;
  var actual=+sessForm.duration.value||0;
  var hint=document.getElementById("durationDeltaHint");
  if(!planned || !actual){ hint.textContent=""; return; }
  var delta=actual-planned;
  hint.textContent = "Écart vs prévu : "+(delta>=0?"+":"")+delta+" min";
  hint.style.color = Math.abs(delta)<=5 ? "var(--accent)" : "#92650a";
}
sessForm.bpmAvg.addEventListener("input", updateBpmZoneHint);
sessForm.duration.addEventListener("input", updateDeltaHint);

function renderSportFields(sport, existing){
  var container=document.getElementById("sportSpecificFields");
  container.innerHTML="";
  var fields=getSportFields(sport);
  document.getElementById("sportFieldsLabel").textContent = "Données spécifiques — "+(sport||"");
  fields.forEach(function(f){
    var val = existing && existing[f.key]!==undefined && existing[f.key]!==null ? existing[f.key] : "";
    var div=document.createElement("div"); div.className="field";
    var inputType = f.type==='text' ? 'text' : 'number';
    div.innerHTML='<label>'+f.label+(f.unit?' ('+f.unit+')':'')+'</label><input type="'+inputType+'" data-metric-key="'+f.key+'" value="'+escapeHtml(String(val))+'"'+(inputType==='number'?' step="0.1"':'')+'>';
    container.appendChild(div);
  });
}
document.getElementById("sessSport").addEventListener("change", function(){ renderSportFields(this.value, null); });

function populateTemplateSelect(){
  var sel=document.getElementById("templateLoadSelect");
  sel.innerHTML='<option value="">— Choisir un modèle —</option>';
  state.sessionTemplates.forEach(function(t){ var o=document.createElement("option"); o.value=t.id; o.textContent=t.name; sel.appendChild(o); });
}
document.getElementById("templateLoadSelect").addEventListener("change", function(){
  var t=state.sessionTemplates.find(function(x){return x.id===this.value;}.bind(this));
  if(!t) return;
  fillSelect(document.getElementById("sessSport"), state.sports.map(function(s){return s.name;}), t.sport);
  fillSelect(document.getElementById("sessType"), state.sessionTypes, t.sessionType);
  sessForm.detail.value=t.detail||"";
  sessForm.objective.value=t.objective||"";
  sessForm.durationPlanned.value=t.durationPlanned||"";
  renderSportFields(t.sport,null);
});
document.getElementById("btnSaveTemplate").addEventListener("click", function(){
  var name=document.getElementById("templateSaveName").value.trim();
  if(!name){ toast("Donnez un nom au modèle"); return; }
  state.sessionTemplates.push({
    id:uid(), name:name, sport:sessForm.sport.value, sessionType:sessForm.sessionType.value,
    detail:sessForm.detail.value, objective:sessForm.objective.value, durationPlanned:sessForm.durationPlanned.value?+sessForm.durationPlanned.value:null
  });
  document.getElementById("templateSaveName").value="";
  saveData(true);
  populateTemplateSelect();
  renderTemplatesList();
});
function renderTemplatesList(){
  var wrap=document.getElementById("templatesList");
  if(!wrap) return;
  wrap.innerHTML="";
  if(!state.sessionTemplates.length){ wrap.innerHTML=emptyHTML("Aucun modèle","Enregistrez une séance comme modèle depuis la fenêtre de planification."); return; }
  state.sessionTemplates.forEach(function(t){
    var row=document.createElement("div"); row.className="tag-row";
    row.innerHTML='<span class="name">'+escapeHtml(t.name)+'</span><span class="hint">'+escapeHtml(t.sport||"")+" · "+escapeHtml(t.sessionType||"")+'</span>';
    var del=document.createElement("button"); del.className="btn ghost small"; del.textContent="Retirer";
    del.addEventListener("click", function(){ confirmDelete(del, function(){ state.sessionTemplates=state.sessionTemplates.filter(function(x){return x.id!==t.id;}); saveData(true); renderTemplatesList(); populateTemplateSelect(); }); });
    row.appendChild(del); wrap.appendChild(row);
  });
}

function openSessionModal(session, presetDate){
  sessForm.reset();
  fillSelect(document.getElementById("sessSport"), state.sports.map(function(s){return s.name;}), session?session.sport:null);
  fillSelect(document.getElementById("sessType"), state.sessionTypes, session?session.sessionType:null);
  populateTemplateSelect();
  document.getElementById("templateLoadRow").style.display = session ? "none" : "grid";
  var delBtn=document.getElementById("btnDeleteSess");
  delBtn.style.display = session ? "inline-block" : "none";
  delBtn.setAttribute("data-armed","0"); delBtn.dataset.orig="Supprimer"; delBtn.textContent="Supprimer"; delBtn.style.color=""; delBtn.style.borderColor="";
  document.getElementById("sessModalTitle").textContent = session ? "Modifier la séance" : "Nouvelle séance";
  sessForm.id.value = session ? session.id : "";
  sessForm.date.value = session ? session.date : (presetDate||todayISO());
  sessForm.status.value = session ? session.status : "planned";
  setStatusTabs(sessForm.status.value);
  sessForm.detail.value = session ? (session.detail||"") : "";
  sessForm.objective.value = session ? (session.objective||"") : "";
  sessForm.durationPlanned.value = session ? (session.durationPlanned||"") : "";
  if(session && session.actual){
    sessForm.duration.value=session.actual.duration||"";
    sessForm.bpmAvg.value=session.actual.bpmAvg||"";
    sessForm.rpe.value=session.actual.rpe||"";
    sessForm.charge.value=session.actual.charge||"";
    sessForm.plaisir.value=session.actual.plaisir||"";
  }
  renderSportFields(session?session.sport:(document.getElementById("sessSport").value), session&&session.actual?session.actual:null);
  toggleSessGroups();
  updateBpmZoneHint();
  updateDeltaHint();
  sessOverlay.classList.add("open");
}
document.getElementById("sessModalCancel").addEventListener("click", function(){sessOverlay.classList.remove("open");});
sessOverlay.addEventListener("click", function(e){ if(e.target===sessOverlay) sessOverlay.classList.remove("open"); });
document.getElementById("btnLogUnplanned").addEventListener("click", function(){
  openSessionModal(null, todayISO());
  sessForm.status.value="done"; setStatusTabs("done"); toggleSessGroups();
});
document.getElementById("btnDeleteSess").addEventListener("click", function(){
  confirmDelete(this, function(){
    var id=sessForm.id.value;
    state.sessions = state.sessions.filter(function(s){return s.id!==id;});
    saveData(true); sessOverlay.classList.remove("open"); renderAll();
  });
});
sessForm.addEventListener("submit", function(e){
  e.preventDefault();
  var fd=new FormData(sessForm);
  var id=fd.get("id");
  var status=fd.get("status");
  var metrics={};
  document.querySelectorAll('#sportSpecificFields [data-metric-key]').forEach(function(inp){
    var key=inp.dataset.metricKey;
    metrics[key] = inp.type==="number" ? (inp.value?+inp.value:0) : inp.value;
  });
  var payload={
    date:fd.get("date"), sport:fd.get("sport"), sessionType:fd.get("sessionType"),
    detail:fd.get("detail")||"", objective:fd.get("objective")||"",
    status:status, durationPlanned: fd.get("durationPlanned")?+fd.get("durationPlanned"):null,
    actual: status==="done" ? Object.assign({
      duration:+fd.get("duration")||0, bpmAvg:fd.get("bpmAvg")?+fd.get("bpmAvg"):null,
      rpe:fd.get("rpe")?+fd.get("rpe"):null, charge:fd.get("charge")?+fd.get("charge"):0,
      plaisir:fd.get("plaisir")?+fd.get("plaisir"):null
    }, metrics) : null
  };
  if(id){ var s=state.sessions.find(function(x){return x.id===id;}); Object.assign(s,payload); }
  else { payload.id=uid(); state.sessions.push(payload); }
  saveData(true);
  sessOverlay.classList.remove("open");
  renderAll();
});

/* =========================================================================
   PLANIFICATION
   ========================================================================= */
document.getElementById("btnSaveSeason").addEventListener("click", function(){
  var s=document.getElementById("seasonStart").value, e=document.getElementById("seasonEnd").value;
  if(!s||!e||s>=e){ toast("Dates de saison invalides"); return; }
  state.season={start:s,end:e}; saveData(true); renderPlanification();
});
document.getElementById("cycleType").addEventListener("change", function(){
  document.getElementById("cycleLabelField").style.display = this.value==="libre" ? "flex" : "none";
});

function resetCycleForm(){
  editCycleId=null;
  document.getElementById("cycleType").value="base";
  document.getElementById("cycleLabelField").style.display="none";
  document.getElementById("cycleLabel").value="";
  document.getElementById("cycleStart").value="";
  document.getElementById("cycleEnd").value="";
  document.getElementById("btnAddCycle").textContent="Ajouter le cycle";
  document.getElementById("cycleEditHint").style.display="none";
}
document.getElementById("cancelCycleEdit").addEventListener("click", function(e){ e.preventDefault(); resetCycleForm(); });
document.getElementById("btnAddCycle").addEventListener("click", function(){
  var type=document.getElementById("cycleType").value;
  var label=document.getElementById("cycleLabel").value.trim();
  var start=document.getElementById("cycleStart").value, end=document.getElementById("cycleEnd").value;
  if(!start||!end||start>=end){ toast("Dates de cycle invalides"); return; }
  if(type==="libre" && !label){ toast("Ajoutez un nom pour un cycle libre"); return; }
  if(editCycleId){
    var c=state.cycles.find(function(x){return x.id===editCycleId;});
    Object.assign(c,{type:type,label:type==="libre"?label:null,start:start,end:end});
    resetCycleForm();
  } else {
    state.cycles.push({id:uid(),type:type,label:type==="libre"?label:null,start:start,end:end});
    document.getElementById("cycleLabel").value=""; document.getElementById("cycleStart").value=""; document.getElementById("cycleEnd").value="";
  }
  if(type==="libre" && label && state.cycleNames.indexOf(label)===-1) state.cycleNames.push(label);
  saveData(true); renderPlanification();
  document.getElementById("timeline").scrollIntoView({behavior:"smooth",block:"center"});
});

function resetSubForm(){
  editSubId=null;
  document.getElementById("subName").value="";
  document.getElementById("subWeeks").value="4";
  document.getElementById("btnAddSub").textContent="Ajouter le sous-cycle";
  document.getElementById("subEditHint").style.display="none";
  autofillSubStart();
}
document.getElementById("cancelSubEdit").addEventListener("click", function(e){ e.preventDefault(); resetSubForm(); });
document.getElementById("subParentCycle").addEventListener("change", autofillSubStart);
function autofillSubStart(){
  var parentId=document.getElementById("subParentCycle").value;
  if(!parentId) return;
  var siblings=state.subcycles.filter(function(s){return s.cycleId===parentId;}).sort(sortAscBy('end'));
  var base;
  if(siblings.length){ base=parseISO(siblings[siblings.length-1].end); base.setDate(base.getDate()+1); }
  else { var parent=state.cycles.find(function(c){return c.id===parentId;}); base= parent? parseISO(parent.start): new Date(); }
  document.getElementById("subStart").value=isoDate(base);
}
document.getElementById("btnAddSub").addEventListener("click", function(){
  var parent=document.getElementById("subParentCycle").value;
  var name=document.getElementById("subName").value.trim();
  var weeks=+document.getElementById("subWeeks").value;
  var start=document.getElementById("subStart").value;
  if(!parent){ toast("Ajoutez d'abord un cycle"); return; }
  if(!name||!weeks||!start){ toast("Champs sous-cycle incomplets"); return; }
  var sd=parseISO(start); var ed=new Date(sd); ed.setDate(ed.getDate()+weeks*7-1);
  if(editSubId){
    var sc=state.subcycles.find(function(x){return x.id===editSubId;});
    Object.assign(sc,{cycleId:parent,name:name,start:start,end:isoDate(ed)});
    resetSubForm();
  } else {
    state.subcycles.push({id:uid(),cycleId:parent,name:name,start:start,end:isoDate(ed)});
    document.getElementById("subName").value="";
    autofillSubStart();
  }
  saveData(true); renderPlanification();
  document.getElementById("timeline").scrollIntoView({behavior:"smooth",block:"center"});
});

function resetSubSubForm(){
  editSubSubId=null;
  document.getElementById("subsubName").value="";
  document.getElementById("subsubWeeks").value="1";
  document.getElementById("subsubTargetKm").value="";
  document.getElementById("btnAddSubSub").textContent="Ajouter";
  document.getElementById("subsubEditHint").style.display="none";
  autofillSubSubStart();
}
document.getElementById("cancelSubSubEdit").addEventListener("click", function(e){ e.preventDefault(); resetSubSubForm(); });
document.getElementById("subsubParentSub").addEventListener("change", autofillSubSubStart);
function autofillSubSubStart(){
  var parentId=document.getElementById("subsubParentSub").value;
  if(!parentId) return;
  var siblings=state.subsubcycles.filter(function(s){return s.subId===parentId;}).sort(sortAscBy('end'));
  var base;
  if(siblings.length){ base=parseISO(siblings[siblings.length-1].end); base.setDate(base.getDate()+1); }
  else { var parent=state.subcycles.find(function(c){return c.id===parentId;}); base= parent? parseISO(parent.start): new Date(); }
  document.getElementById("subsubStart").value=isoDate(base);
}
document.getElementById("btnAddSubSub").addEventListener("click", function(){
  var parent=document.getElementById("subsubParentSub").value;
  var name=document.getElementById("subsubName").value.trim();
  var weeks=+document.getElementById("subsubWeeks").value;
  var start=document.getElementById("subsubStart").value;
  var targetKm=parseFloat(document.getElementById("subsubTargetKm").value)||0;
  if(!parent){ toast("Ajoutez d'abord un sous-cycle"); return; }
  if(!name||!weeks||!start){ toast("Champs incomplets"); return; }
  var sd=parseISO(start); var ed=new Date(sd); ed.setDate(ed.getDate()+weeks*7-1);
  if(editSubSubId){
    var ss=state.subsubcycles.find(function(x){return x.id===editSubSubId;});
    Object.assign(ss,{subId:parent,name:name,start:start,end:isoDate(ed),targetKm:targetKm});
    resetSubSubForm();
  } else {
    state.subsubcycles.push({id:uid(),subId:parent,name:name,start:start,end:isoDate(ed),targetKm:targetKm});
    document.getElementById("subsubName").value="";
    autofillSubSubStart();
  }
  saveData(true); renderPlanification();
  document.getElementById("timeline").scrollIntoView({behavior:"smooth",block:"center"});
});

document.getElementById("btnAddGoal").addEventListener("click", function(){
  var name=document.getElementById("goalName").value.trim();
  var date=document.getElementById("goalDate").value;
  var target=document.getElementById("goalTarget").value.trim();
  if(!name||!date){ toast("Nom et date requis"); return; }
  state.seasonGoals.push({id:uid(),name:name,date:date,target:target});
  document.getElementById("goalName").value=""; document.getElementById("goalDate").value=""; document.getElementById("goalTarget").value="";
  saveData(true); renderGoals(); renderGoalBanner();
});
function renderGoals(){
  var wrap=document.getElementById("goalsList"); wrap.innerHTML="";
  if(!state.seasonGoals.length){ wrap.innerHTML=emptyHTML("Aucun objectif","Ajoutez votre première échéance ci-dessus."); return; }
  state.seasonGoals.slice().sort(sortAscBy('date')).forEach(function(g){
    var row=document.createElement("div"); row.className="row-item";
    row.innerHTML='<div class="bar" style="background:#F59E0B;"></div><div class="main"><div class="t1">'+escapeHtml(g.name)+(g.target?' — '+escapeHtml(g.target):'')+'</div><div class="t2">'+fmtShort(g.date)+'</div></div>';
    var del=document.createElement("button"); del.className="btn ghost small"; del.textContent="Supprimer";
    del.addEventListener("click", function(){ confirmDelete(del, function(){ state.seasonGoals=state.seasonGoals.filter(function(x){return x.id!==g.id;}); saveData(true); renderGoals(); renderGoalBanner(); }); });
    row.appendChild(del); wrap.appendChild(row);
  });
}

function laneAssign(items){
  var sorted=items.slice().sort(function(a,b){return a.start.localeCompare(b.start);});
  var lanes=[];
  sorted.forEach(function(c){
    var cs=parseISO(c.start);
    var idx=lanes.findIndex(function(endDate){return cs>endDate;});
    if(idx===-1) idx=lanes.length;
    lanes[idx]=parseISO(c.end);
    c._lane=idx;
  });
  return {items:sorted, laneCount:lanes.length};
}
/* ---------- Infos d'un cycle au clic sur la timeline ---------- */
function cycleInfoHTML(kind, c){
  var rows=[];
  var d0=parseISO(c.start), d1=parseISO(c.end);
  var weeks=Math.round((d1-d0)/(7*864e5))+1;
  rows.push(["Type", kind]);
  if(kind==="Cycle" && c.type && CYCLE_TYPES[c.type]) rows.push(["Nature", CYCLE_TYPES[c.type].label||c.type]);
  rows.push(["Début", fmtShort(c.start)]);
  rows.push(["Fin", fmtShort(c.end)]);
  rows.push(["Durée", weeks+" semaine"+(weeks>1?"s":"")]);
  if(c.targetKm) rows.push(["Objectif hebdo", c.targetKm+" km"]);
  if(kind!=="Cycle"){
    var parentSub = kind==="Division" ? state.subcycles.find(function(x){return x.id===c.subId;}) : null;
    var parentCycle = kind==="Sous-cycle"
      ? state.cycles.find(function(x){return x.id===c.cycleId;})
      : (parentSub ? state.cycles.find(function(x){return x.id===parentSub.cycleId;}) : null);
    if(parentSub) rows.push(["Sous-cycle parent", parentSub.name]);
    if(parentCycle) rows.push(["Cycle parent", cycleLabel(parentCycle)]);
  }
  var sess=state.sessions.filter(function(s){return inRange(s.date,d0,d1);});
  var done=sess.filter(function(s){return s.status==="done";});
  var km=done.reduce(function(a,s){return a+((s.actual&&s.actual.distance)||0);},0);
  var dplus=done.reduce(function(a,s){return a+((s.actual&&s.actual.elevation)||0);},0);
  var hrs=done.reduce(function(a,s){return a+((s.actual&&s.actual.duration)||0);},0)/60;
  rows.push(["Séances", done.length+" réalisées / "+sess.length+" planifiées"]);
  rows.push(["Volume", hrs.toFixed(1)+" h · "+km.toFixed(1)+" km · "+Math.round(dplus)+" m D+"]);
  return '<div class="info-rows">'+rows.map(function(r){
    return '<div class="info-row"><span>'+escapeHtml(r[0])+'</span><b>'+escapeHtml(String(r[1]))+'</b></div>';
  }).join("")+'</div>';
}
function openCycleInfo(kind, c){
  var ov=document.getElementById("cycleInfoOverlay"); if(!ov) return;
  document.getElementById("cycleInfoTitle").textContent = (kind==="Cycle"? cycleLabel(c) : c.name);
  document.getElementById("cycleInfoBody").innerHTML = cycleInfoHTML(kind, c);
  ov.classList.add("open");
}
(function initCycleInfo(){
  var ov=document.getElementById("cycleInfoOverlay"); if(!ov) return;
  ov.addEventListener("click", function(e){ if(e.target===ov) ov.classList.remove("open"); });
  document.getElementById("btnCycleInfoClose").addEventListener("click", function(){ ov.classList.remove("open"); });
})();

function renderTimelineLevel(containerId, items, colorFn, labelFn, kind){
  var wrap=document.getElementById(containerId);
  wrap.innerHTML="";
  if(!state.season.start||!state.season.end) return;
  var s0=parseISO(state.season.start), s1=parseISO(state.season.end), total=s1-s0;
  if(!items.length){ wrap.style.height="4px"; return; }
  var res=laneAssign(items);
  var laneH=30;
  wrap.style.height=(res.laneCount*laneH+4)+"px";
  res.items.forEach(function(c){
    var cs=parseISO(c.start), ce=parseISO(c.end);
    var left=Math.max(0,(cs-s0)/total*100), width=Math.max(1,(ce-cs)/total*100);
    var block=document.createElement("div");
    block.className="tl-block";
    block.style.left=left+"%"; block.style.width=width+"%"; block.style.top=(c._lane*laneH)+"px";
    block.style.background=colorFn(c);
    block.textContent=labelFn(c);
    block.title=labelFn(c)+" · "+fmtShort(c.start)+" → "+fmtShort(c.end);
    block.style.cursor="pointer";
    block.addEventListener("click", function(){ openCycleInfo(kind||"Cycle", c); });
    wrap.appendChild(block);
  });
}
function renderTimeline(){
  var tlMonths=document.getElementById("tlMonths");
  tlMonths.innerHTML="";
  if(!state.season.start||!state.season.end){
    document.getElementById("tlLanesCycles").innerHTML = '<div class="empty-state"><b>Aucune saison définie</b>Ouvrez la configuration ci-dessous pour renseigner les dates.</div>';
    document.getElementById("tlLanesSub").innerHTML=""; document.getElementById("tlLanesSubSub").innerHTML="";
    return;
  }
  var s0=parseISO(state.season.start), s1=parseISO(state.season.end), total=s1-s0;
  var cur=new Date(s0.getFullYear(),s0.getMonth(),1);
  if(cur<s0) cur.setMonth(cur.getMonth()+1);
  while(cur<=s1){
    var pct=(cur-s0)/total*100;
    var tick=document.createElement("div"); tick.className="tl-month"; tick.style.left=pct+"%";
    tick.textContent=MONTHS_FR[cur.getMonth()]+" "+cur.getFullYear().toString().slice(2);
    tlMonths.appendChild(tick);
    cur.setMonth(cur.getMonth()+1);
  }
  renderTimelineLevel("tlLanesCycles", state.cycles, function(c){return CYCLE_TYPES[c.type].color;}, cycleLabel, "Cycle");
  renderTimelineLevel("tlLanesSub", state.subcycles, function(c){
    var parent=state.cycles.find(function(x){return x.id===c.cycleId;});
    var hex= parent? CYCLE_TYPES[parent.type].color : CYCLE_TYPES.libre.color;
    return "color-mix(in srgb, "+hex+" 55%, white)";
  }, function(c){return c.name;}, "Sous-cycle");
  renderTimelineLevel("tlLanesSubSub", state.subsubcycles, function(c){
    var parentSub=state.subcycles.find(function(x){return x.id===c.subId;});
    var parent= parentSub? state.cycles.find(function(x){return x.id===parentSub.cycleId;}) : null;
    var hex= parent? CYCLE_TYPES[parent.type].color : CYCLE_TYPES.libre.color;
    return "color-mix(in srgb, "+hex+" 30%, white)";
  }, function(c){return c.name;}, "Division");

  var today=new Date(); today.setHours(0,0,0,0);
  if(today>=s0 && today<=s1){
    ["tlLanesCycles","tlLanesSub","tlLanesSubSub"].forEach(function(id){
      var wrap=document.getElementById(id);
      if(!wrap.style.height || wrap.style.height==="4px") return;
      var line=document.createElement("div"); line.className="tl-today";
      line.style.left=((today-s0)/total*100)+"%"; line.style.height=wrap.style.height;
      wrap.appendChild(line);
    });
  }
}

function renderCycleList(){
  var wrap=document.getElementById("cycleList"); wrap.innerHTML="";
  if(!state.cycles.length){ wrap.innerHTML=emptyHTML("Aucun cycle","Ajoutez votre premier cycle ci-dessus."); }
  state.cycles.slice().sort(sortAscBy('start')).forEach(function(c){
    var meta=CYCLE_TYPES[c.type];
    var row=document.createElement("div"); row.className="cycle-row";
    row.innerHTML='<span class="sw" style="background:'+meta.color+'"></span><div class="main"><div class="t1">'+escapeHtml(cycleLabel(c))+'</div><div class="t2">'+fmtShort(c.start)+' → '+fmtShort(c.end)+'</div></div>';
    var btns=document.createElement("div"); btns.className="rowbtns";
    var edit=document.createElement("button"); edit.className="btn small"; edit.textContent="Modifier";
    edit.addEventListener("click", function(){
      editCycleId=c.id;
      document.getElementById("cycleType").value=c.type;
      document.getElementById("cycleLabelField").style.display=c.type==="libre"?"flex":"none";
      document.getElementById("cycleLabel").value=c.label||"";
      document.getElementById("cycleStart").value=c.start;
      document.getElementById("cycleEnd").value=c.end;
      document.getElementById("btnAddCycle").textContent="Enregistrer les modifications";
      document.getElementById("cycleEditHint").style.display="block";
      document.getElementById("cycleType").scrollIntoView({behavior:"smooth",block:"center"});
    });
    var del=document.createElement("button"); del.className="btn ghost small"; del.textContent="Supprimer";
    del.addEventListener("click", function(){
      confirmDelete(del, function(){
        state.cycles=state.cycles.filter(function(x){return x.id!==c.id;});
        state.subcycles=state.subcycles.filter(function(x){return x.cycleId!==c.id;});
        saveData(true); renderPlanification();
      });
    });
    btns.appendChild(edit); btns.appendChild(del);
    row.appendChild(btns); wrap.appendChild(row);
  });
  var sel=document.getElementById("subParentCycle"); var curSel=sel.value; sel.innerHTML="";
  state.cycles.slice().sort(sortAscBy('start')).forEach(function(c){var o=document.createElement("option");o.value=c.id;o.textContent=cycleLabel(c)+" ("+fmtShort(c.start)+"→"+fmtShort(c.end)+")";sel.appendChild(o);});
  if(curSel) sel.value=curSel;
  var dl=document.getElementById("customCycleNamesList"); dl.innerHTML="";
  state.cycleNames.forEach(function(n){var o=document.createElement("option");o.value=n;dl.appendChild(o);});
}

function renderSubList(){
  var wrap=document.getElementById("subList"); wrap.innerHTML="";
  if(!state.subcycles.length){ wrap.innerHTML=emptyHTML("Aucun sous-cycle","Ajoutez-en un ci-dessus."); }
  state.subcycles.slice().sort(sortAscBy('start')).forEach(function(sc){
    var parent=state.cycles.find(function(c){return c.id===sc.cycleId;});
    var row=document.createElement("div"); row.className="cycle-row";
    row.innerHTML='<span class="sw" style="background:#F59E0B"></span><div class="main"><div class="t1">'+escapeHtml(sc.name)+'</div><div class="t2">'+fmtShort(sc.start)+' → '+fmtShort(sc.end)+(parent?' · '+escapeHtml(cycleLabel(parent)):'')+'</div></div>';
    var btns=document.createElement("div"); btns.className="rowbtns";
    var edit=document.createElement("button"); edit.className="btn small"; edit.textContent="Modifier";
    edit.addEventListener("click", function(){
      editSubId=sc.id;
      document.getElementById("subParentCycle").value=sc.cycleId;
      document.getElementById("subName").value=sc.name;
      var weeks=Math.round((parseISO(sc.end)-parseISO(sc.start))/(7*864e5))+1;
      document.getElementById("subWeeks").value=weeks;
      document.getElementById("subStart").value=sc.start;
      document.getElementById("btnAddSub").textContent="Enregistrer les modifications";
      document.getElementById("subEditHint").style.display="block";
      document.getElementById("subParentCycle").scrollIntoView({behavior:"smooth",block:"center"});
    });
    var del=document.createElement("button"); del.className="btn ghost small"; del.textContent="Supprimer";
    del.addEventListener("click", function(){
      confirmDelete(del, function(){
        state.subcycles=state.subcycles.filter(function(x){return x.id!==sc.id;});
        state.subsubcycles=state.subsubcycles.filter(function(x){return x.subId!==sc.id;});
        saveData(true); renderPlanification();
      });
    });
    btns.appendChild(edit); btns.appendChild(del);
    row.appendChild(btns); wrap.appendChild(row);
  });
  var sel=document.getElementById("subsubParentSub"); var curSel=sel.value; sel.innerHTML="";
  state.subcycles.slice().sort(sortAscBy('start')).forEach(function(sc){var o=document.createElement("option");o.value=sc.id;o.textContent=sc.name+" ("+fmtShort(sc.start)+"→"+fmtShort(sc.end)+")";sel.appendChild(o);});
  if(curSel) sel.value=curSel;
  autofillSubStart();
}

function renderSubSubList(){
  var wrap=document.getElementById("subSubList"); wrap.innerHTML="";
  if(!state.subsubcycles.length){ wrap.innerHTML=emptyHTML("Aucune division","Divisez un sous-cycle ci-dessus."); }
  state.subsubcycles.slice().sort(sortAscBy('start')).forEach(function(ss){
    var parent=state.subcycles.find(function(c){return c.id===ss.subId;});
    var row=document.createElement("div"); row.className="cycle-row";
    row.innerHTML='<span class="sw" style="background:#06B6D4"></span><div class="main"><div class="t1">'+escapeHtml(ss.name)+'</div><div class="t2">'+fmtShort(ss.start)+' → '+fmtShort(ss.end)+(parent?' · '+escapeHtml(parent.name):'')+'</div></div>';
    var btns=document.createElement("div"); btns.className="rowbtns";
    var edit=document.createElement("button"); edit.className="btn small"; edit.textContent="Modifier";
    edit.addEventListener("click", function(){
      editSubSubId=ss.id;
      document.getElementById("subsubParentSub").value=ss.subId;
      document.getElementById("subsubName").value=ss.name;
      var weeks=Math.round((parseISO(ss.end)-parseISO(ss.start))/(7*864e5))+1;
      document.getElementById("subsubWeeks").value=weeks;
      document.getElementById("subsubTargetKm").value=ss.targetKm||"";
      document.getElementById("subsubStart").value=ss.start;
      document.getElementById("btnAddSubSub").textContent="Enregistrer les modifications";
      document.getElementById("subsubEditHint").style.display="block";
      document.getElementById("subsubParentSub").scrollIntoView({behavior:"smooth",block:"center"});
    });
    var del=document.createElement("button"); del.className="btn ghost small"; del.textContent="Supprimer";
    del.addEventListener("click", function(){
      confirmDelete(del, function(){ state.subsubcycles=state.subsubcycles.filter(function(x){return x.id!==ss.id;}); saveData(true); renderPlanification(); });
    });
    btns.appendChild(edit); btns.appendChild(del);
    row.appendChild(btns); wrap.appendChild(row);
  });
  autofillSubSubStart();
}

function buildMonthDays(cursor){
  var year=cursor.getFullYear(), month=cursor.getMonth();
  var first=new Date(year,month,1);
  var startOffset=(first.getDay()===0?6:first.getDay()-1);
  var gridStart=new Date(first); gridStart.setDate(first.getDate()-startOffset);
  var days=[];
  for(var i=0;i<42;i++){ var d=new Date(gridStart); d.setDate(gridStart.getDate()+i); days.push(d); }
  return days;
}
function renderMonthGrid(gridEl, cursor, labelEl, cycleBadgeEl){
  labelEl.textContent = MONTHS_FULL[cursor.getMonth()]+" "+cursor.getFullYear();
  if(cycleBadgeEl){
    var cyc=activeCycleForDate(todayISO());
    if(cyc) paintBadge(cycleBadgeEl,"Cycle en cours : "+cycleLabel(cyc),CYCLE_TYPES[cyc.type].color);
    else paintBadge(cycleBadgeEl,"Aucun cycle en cours",null);
  }
  gridEl.innerHTML="";
  var days=buildMonthDays(cursor);
  var today=todayISO();
  days.forEach(function(d){
    var dISO=isoDate(d);
    var cell=document.createElement("div");
    cell.className="day-cell"+(dISO===today?" today":"")+(d.getMonth()!==cursor.getMonth()?" outmonth":"");
    var dc=activeCycleForDate(dISO);
    cell.style.borderTopColor = dc ? CYCLE_TYPES[dc.type].color : "transparent";
    if(dc) cell.title = cycleLabel(dc);
    var head=document.createElement("div"); head.className="dh";
    head.innerHTML="<span>"+DAY_LABELS[d.getDay()===0?6:d.getDay()-1]+"</span><b>"+d.getDate()+"</b>";
    cell.appendChild(head);
    state.sessions.filter(function(s){return s.date===dISO;}).forEach(function(s){
      cell.appendChild(makePill(s));
    });
    cell.addEventListener("click", function(){ openSessionModal(null, dISO); });
    gridEl.appendChild(cell);
  });
}
document.getElementById("planMonthPrev").addEventListener("click", function(){planMonthCursor.setMonth(planMonthCursor.getMonth()-1);renderPlanMonth();});
document.getElementById("planMonthNext").addEventListener("click", function(){planMonthCursor.setMonth(planMonthCursor.getMonth()+1);renderPlanMonth();});
function renderPlanMonth(){ renderMonthGrid(document.getElementById("planMonthGrid"), planMonthCursor, document.getElementById("planMonthLabel"), document.getElementById("planMonthCycleBadge")); }
document.getElementById("doneMonthPrev").addEventListener("click", function(){doneMonthCursor.setMonth(doneMonthCursor.getMonth()-1);renderDoneMonth();});
document.getElementById("doneMonthNext").addEventListener("click", function(){doneMonthCursor.setMonth(doneMonthCursor.getMonth()+1);renderDoneMonth();});
function renderDoneMonth(){ renderMonthGrid(document.getElementById("doneMonthGrid"), doneMonthCursor, document.getElementById("doneMonthLabel"), null); }

function renderPlanification(){
  document.getElementById("seasonStart").value=state.season.start||"";
  document.getElementById("seasonEnd").value=state.season.end||"";
  renderTimeline();
  renderCycleList();
  renderSubList();
  renderSubSubList();
  renderGoals();
  renderPlanMonth();
}

/* =========================================================================
   SEANCES REALISEES
   ========================================================================= */
document.getElementById("realPeriodFilter").addEventListener("change", renderRealisees);
function renderRealisees(){
  renderDoneMonth();
  var sportFilter=document.getElementById("realSportFilter").value;
  renderSportChips(sportFilter);
  var period=document.getElementById("realPeriodFilter").value;
  var list=state.sessions.filter(function(s){return s.status==="done";});
  if(sportFilter!=="all") list=list.filter(function(s){return s.sport===sportFilter;});
  if(period!=="all"){
    var lim=new Date(); lim.setDate(lim.getDate()-(+period));
    list=list.filter(function(s){return parseISO(s.date)>=lim;});
  }
  list.sort(sortDesc);
  var wrap=document.getElementById("realiseesList"); wrap.innerHTML="";
  if(!list.length){ wrap.innerHTML=emptyHTML("Aucune séance","Ajustez les filtres, ou cliquez sur un jour du calendrier pour enregistrer une séance."); return; }
  list.forEach(function(s){
    var a=s.actual||{};
    var z=bpmZone(a.bpmAvg);
    var delta = (s.durationPlanned && a.duration) ? (a.duration-s.durationPlanned) : null;
    var fields=getSportFields(s.sport);
    var metricTxt=fields.map(function(f){ return a[f.key]? (f.label+" "+a[f.key]+(f.unit||"")) : null; }).filter(Boolean).join(' · ');
    var row=document.createElement("div"); row.className="row-item"; row.style.cursor="pointer";
    row.innerHTML='<div class="bar" style="background:'+sportColor(s.sport)+'"></div><div class="main"><div class="t1">'+escapeHtml(s.sport)+' — '+escapeHtml(s.sessionType||'')+'</div>'+
      '<div class="t2">'+fmtShort(s.date)+(metricTxt? ' · '+metricTxt:'')+(a.plaisir? ' · Plaisir '+a.plaisir+'/10':'')+(s.detail? ' · '+escapeHtml(s.detail):'')+'</div></div>'+
      '<div class="meta">'+fmtMin(a.duration)+(a.rpe? ' · RPE '+a.rpe:'')+(z? ' · Z'+z:'')+(delta!==null? ' · écart '+(delta>=0?'+':'')+delta+'min':'')+'</div>';
    row.addEventListener("click", function(){openSessionModal(s);});
    wrap.appendChild(row);
  });
}
function renderSportChips(activeFilter){
  var wrap=document.getElementById("sportChipRow"); wrap.innerHTML="";
  var allChip=document.createElement("button"); allChip.type="button"; allChip.className="chip"+(activeFilter==="all"?" active":"");
  allChip.textContent="Tous";
  allChip.addEventListener("click", function(){ document.getElementById("realSportFilter").value="all"; renderRealisees(); });
  wrap.appendChild(allChip);
  state.sports.forEach(function(sp){
    var chip=document.createElement("button"); chip.type="button"; chip.className="chip"+(activeFilter===sp.name?" active":"");
    if(activeFilter===sp.name){ chip.style.background=sp.color; chip.style.borderColor=sp.color; }
    chip.textContent=sp.name;
    chip.addEventListener("click", function(){ document.getElementById("realSportFilter").value=sp.name; renderRealisees(); });
    wrap.appendChild(chip);
  });
}

/* =========================================================================
   STATISTIQUES
   ========================================================================= */
function weeksBack(n){
  var weeks=[]; var monday=getMonday(new Date());
  for(var i=n-1;i>=0;i--){ var start=new Date(monday); start.setDate(monday.getDate()-i*7); var end=new Date(start); end.setDate(start.getDate()+6); weeks.push({start:start,end:end,label:start.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}); }
  return weeks;
}
function weeksInRange(start,end){
  var weeks=[]; var monday=getMonday(start);
  while(monday<=end){
    var e=new Date(monday); e.setDate(e.getDate()+6);
    weeks.push({start:new Date(monday),end:e,label:monday.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})});
    monday.setDate(monday.getDate()+7);
  }
  return weeks.length?weeks:weeksBack(4);
}
function weekAgg(weeks, doneSessions){
  return weeks.map(function(w){
    var inW=doneSessions.filter(function(s){var d=parseISO(s.date);return d>=w.start&&d<=w.end;});
    var km=inW.reduce(function(a,s){return a+((s.actual&&s.actual.distance)||0);},0);
    var deniv=inW.reduce(function(a,s){return a+((s.actual&&s.actual.elevation)||0);},0);
    var duree=inW.reduce(function(a,s){return a+((s.actual&&s.actual.duration)||0);},0)/60;
    var charge=inW.reduce(function(a,s){return a+((s.actual&&s.actual.charge)||0);},0);
    var rpeVals=inW.map(function(s){return s.actual&&s.actual.rpe;}).filter(function(v){return v;});
    var rpe=rpeVals.length? rpeVals.reduce(function(a,b){return a+b;},0)/rpeVals.length : 0;
    var plaisirVals=inW.map(function(s){return s.actual&&s.actual.plaisir;}).filter(function(v){return v;});
    var plaisir=plaisirVals.length? +(plaisirVals.reduce(function(a,b){return a+b;},0)/plaisirVals.length).toFixed(1) : 0;
    return {km:+km.toFixed(1),deniv:Math.round(deniv),duree:+duree.toFixed(2),charge:Math.round(charge),rpe:+rpe.toFixed(1),plaisir:plaisir};
  });
}
function drawChart(canvasId,config){
  var ctx=document.getElementById(canvasId).getContext("2d");
  if(charts[canvasId]) charts[canvasId].destroy();
  charts[canvasId]=new Chart(ctx,config);
}
function baseOptions(extra){
  return { responsive:true, maintainAspectRatio:false,
    plugins:{legend:{display:!!extra&&!!extra.legend,position:'bottom',labels:{color:"#64748B",font:{family:"Inter",size:11},boxWidth:10,padding:12}},
      tooltip:{backgroundColor:"#FFFFFF",borderColor:"#E2E8F0",borderWidth:1,titleColor:"#0F172A",bodyColor:"#0F172A",bodyFont:{family:"IBM Plex Mono"}}},
    scales:{ x:{grid:{display:false},ticks:{color:"#94A3B8",font:{family:"IBM Plex Mono",size:9}}}, y:{grid:{color:"rgba(15,23,42,0.06)"},ticks:{color:"#64748B",font:{family:"IBM Plex Mono",size:10}},beginAtZero:true} }
  };
}

function renderSportThumbs(){
  var doneSessions=state.sessions.filter(function(s){return s.status==="done";});
  var wrap=document.getElementById("sportThumbs"); wrap.innerHTML="";
  state.sports.forEach(function(sp){
    var list=doneSessions.filter(function(s){return s.sport===sp.name;});
    var km=list.reduce(function(a,s){return a+((s.actual&&s.actual.distance)||0);},0);
    var h=list.reduce(function(a,s){return a+((s.actual&&s.actual.duration)||0);},0)/60;
    var card=document.createElement("div"); card.className="sport-thumb";
    card.style.borderTopColor=sp.color;
    card.innerHTML='<div class="st-name" style="color:'+sp.color+'">'+escapeHtml(sp.name)+'</div><div class="st-stats">'+list.length+' séances · '+h.toFixed(1)+'h'+(km?' · '+km.toFixed(0)+'km':'')+'</div>';
    wrap.appendChild(card);
  });
}

function renderStats(){
  renderSportThumbs();
  var doneSessions=state.sessions.filter(function(s){return s.status==="done";});

  var sportSel=document.getElementById("statsSportFilter");
  if(sportSel.options.length<=1){ state.sports.forEach(function(sp){ var o=document.createElement("option"); o.value=sp.name; o.textContent=sp.name; sportSel.appendChild(o); }); }
  var sportFilterVal=sportSel.value;
  var filteredDone = sportFilterVal==="all" ? doneSessions : doneSessions.filter(function(s){return s.sport===sportFilterVal;});

  var cycSel=document.getElementById("statsCycleFilter");
  var curVal=cycSel.value;
  cycSel.innerHTML='<option value="all">Tous les cycles</option>';
  state.cycles.slice().sort(sortAscBy('start')).forEach(function(c){var o=document.createElement("option");o.value=c.id;o.textContent=cycleLabel(c);cycSel.appendChild(o);});
  if(curVal) cycSel.value=curVal;

  var cycId=cycSel.value;
  var weeksForCycle;
  if(cycId && cycId!=="all"){
    var c=state.cycles.find(function(x){return x.id===cycId;});
    weeksForCycle = c ? weeksInRange(parseISO(c.start),parseISO(c.end)) : weeksBack(12);
  } else { weeksForCycle = weeksBack(12); }
  var aggCycle = weekAgg(weeksForCycle, filteredDone);
  drawChart("chartCycleKmDeniv",{
    data:{ labels:weeksForCycle.map(function(w){return w.label;}),
      datasets:[
        {type:"bar",label:"Km",data:aggCycle.map(function(a){return a.km;}),backgroundColor:"#2563EB",borderRadius:4,yAxisID:"y"},
        {type:"line",label:"D+ (m)",data:aggCycle.map(function(a){return a.deniv;}),borderColor:"#F97316",backgroundColor:"transparent",tension:.3,pointRadius:2,yAxisID:"y1"}
      ]},
    options:Object.assign(baseOptions({legend:true}),{scales:{
      x:{grid:{display:false},ticks:{color:"#94A3B8",font:{family:"IBM Plex Mono",size:9}}},
      y:{position:"left",grid:{color:"rgba(15,23,42,0.06)"},ticks:{color:"#64748B",font:{family:"IBM Plex Mono",size:10}},beginAtZero:true},
      y1:{position:"right",grid:{display:false},ticks:{color:"#64748B",font:{family:"IBM Plex Mono",size:10}},beginAtZero:true}
    }})
  });
  document.getElementById("statsKmDenivStats").textContent = "Km — "+statLine(aggCycle.map(function(a){return a.km;}))+"   ·   D+ — "+statLine(aggCycle.map(function(a){return a.deniv;}));

  var period=+document.getElementById("statsTimePeriod").value;
  var weeksTime=weeksBack(period);
  var aggTime=weekAgg(weeksTime,filteredDone);
  drawChart("chartTime",{ type:"bar",
    data:{labels:weeksTime.map(function(w){return w.label;}),datasets:[{label:"Heures",data:aggTime.map(function(a){return a.duree;}),backgroundColor:"#2563EB",borderRadius:4}]},
    options:baseOptions()
  });
  document.getElementById("statsTimeStats").textContent = statLine(aggTime.map(function(a){return a.duree;}),"h");

  var bySport={};
  doneSessions.forEach(function(s){ var sp=s.sport||"Autre"; bySport[sp]=(bySport[sp]||0)+((s.actual&&s.actual.distance)||0); });
  var sportsK=Object.keys(bySport);
  drawChart("chartBySport",{ type:"doughnut",
    data:{labels:sportsK,datasets:[{data:sportsK.map(function(k){return +bySport[k].toFixed(1);}),backgroundColor:sportsK.map(sportColor),borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'bottom',labels:{color:"#64748B",font:{family:"Inter",size:11},boxWidth:10,padding:10}}}}
  });

  var weeks12=weeksBack(12);
  var agg12=weekAgg(weeks12,filteredDone);
  drawChart("chartLoad",{type:"bar",data:{labels:weeks12.map(function(w){return w.label;}),datasets:[{label:"Charge",data:agg12.map(function(a){return a.charge;}),backgroundColor:"#F59E0B",borderRadius:4}]},options:baseOptions()});
  document.getElementById("statsLoadStats").textContent = statLine(agg12.map(function(a){return a.charge;}));
  drawChart("chartRpe",{type:"bar",data:{labels:weeks12.map(function(w){return w.label;}),datasets:[{label:"RPE moyen",data:agg12.map(function(a){return a.rpe;}),backgroundColor:"#EC4899",borderRadius:4}]},options:baseOptions()});
  document.getElementById("statsRpeStats").textContent = statLine(agg12.map(function(a){return a.rpe;}));
  drawChart("chartPlaisir",{type:"bar",data:{labels:weeks12.map(function(w){return w.label;}),datasets:[{label:"Plaisir /10",data:agg12.map(function(a){return a.plaisir;}),backgroundColor:"#10B981",borderRadius:4}]},options:baseOptions()});
  document.getElementById("statsPlaisirStats").textContent = statLine(agg12.map(function(a){return a.plaisir;}));

  var zoneMins=[0,0,0,0,0];
  filteredDone.forEach(function(s){ if(s.actual && s.actual.bpmAvg){ var z=bpmZone(s.actual.bpmAvg); if(z) zoneMins[z-1]+=s.actual.duration||0; } });
  drawChart("chartZones",{type:"bar",data:{labels:["Zone 1","Zone 2","Zone 3","Zone 4","Zone 5"],datasets:[{label:"Minutes",data:zoneMins,backgroundColor:["#10B981","#2563EB","#F59E0B","#F97316","#EF4444"],borderRadius:4}]},options:baseOptions()});

  var selA=document.getElementById("cmpA"), selB=document.getElementById("cmpB");
  if(!selA.options.length){
    Object.keys(CMP_METRICS).forEach(function(k){
      var oA=document.createElement("option");oA.value=k;oA.textContent=CMP_METRICS[k];selA.appendChild(oA);
      var oB=document.createElement("option");oB.value=k;oB.textContent=CMP_METRICS[k];selB.appendChild(oB);
    });
    selA.value="km"; selB.value="deniv";
    selA.addEventListener("change",renderCompareChart);
    selB.addEventListener("change",renderCompareChart);
  }
  renderCompareChart();
  function renderCompareChart(){
    var a=selA.value,b=selB.value;
    drawChart("chartCompare",{
      data:{labels:weeks12.map(function(w){return w.label;}),
        datasets:[
          {type:"bar",label:CMP_METRICS[a],data:agg12.map(function(x){return x[a];}),backgroundColor:"#2563EB",borderRadius:4,yAxisID:"y"},
          {type:"line",label:CMP_METRICS[b],data:agg12.map(function(x){return x[b];}),borderColor:"#8B5CF6",backgroundColor:"transparent",tension:.3,pointRadius:2,yAxisID:"y1"}
        ]},
      options:Object.assign(baseOptions({legend:true}),{scales:{
        x:{grid:{display:false},ticks:{color:"#94A3B8",font:{family:"IBM Plex Mono",size:9}}},
        y:{position:"left",grid:{color:"rgba(15,23,42,0.06)"},ticks:{color:"#64748B",font:{family:"IBM Plex Mono",size:10}},beginAtZero:true},
        y1:{position:"right",grid:{display:false},ticks:{color:"#64748B",font:{family:"IBM Plex Mono",size:10}},beginAtZero:true}
      }})
    });
  }
}
document.getElementById("statsSportFilter").addEventListener("change", renderStats);
document.getElementById("statsCycleFilter").addEventListener("change", renderStats);
document.getElementById("statsTimePeriod").addEventListener("change", renderStats);

/* =========================================================================
   PARAMETRES
   ========================================================================= */
function renderProfile(){
  var p=state.profile;
  document.getElementById("pFirstName").value=p.firstName||"";
  document.getElementById("pLastName").value=p.lastName||"";
  document.getElementById("pAge").value=p.age||"";
  document.getElementById("pHeight").value=p.height||"";
  document.getElementById("pWeight").value=p.weight||"";
  document.getElementById("pVma").value=p.vma||"";
  document.getElementById("pHrMax").value=p.hrMax||"";
  document.getElementById("pHrRest").value=p.hrRest||"";
  document.getElementById("pWeeklyTarget").value=p.weeklyTargetHours||"";
  document.getElementById("pWeeklyTargetKm").value=p.weeklyTargetKm||"";
  renderVmaTable();
}
function renderVmaTable(){
  var body=document.getElementById("vmaBody"); body.innerHTML="";
  var vma=state.profile.vma;
  if(!vma){ body.innerHTML='<tr><td colspan="3" style="color:var(--text-faint);">Renseignez votre VMA ci-dessus</td></tr>'; return; }
  VMA_PCTS.forEach(function(p){
    var speed=vma*p/100;
    var paceMin=60/speed;
    var min=Math.floor(paceMin), sec=Math.round((paceMin-min)*60);
    var tr=document.createElement("tr");
    tr.innerHTML='<td>'+p+'%</td><td>'+speed.toFixed(1)+' km/h</td><td>'+min+':'+String(sec).padStart(2,'0')+'/km</td>';
    body.appendChild(tr);
  });
}
document.getElementById("btnSaveProfile").addEventListener("click", function(){
  state.profile.firstName=document.getElementById("pFirstName").value;
  state.profile.lastName=document.getElementById("pLastName").value;
  state.profile.age=+document.getElementById("pAge").value||null;
  state.profile.height=+document.getElementById("pHeight").value||null;
  state.profile.weight=+document.getElementById("pWeight").value||null;
  state.profile.vma=+document.getElementById("pVma").value||null;
  state.profile.hrMax=+document.getElementById("pHrMax").value||null;
  state.profile.hrRest=+document.getElementById("pHrRest").value||null;
  state.profile.weeklyTargetHours=+document.getElementById("pWeeklyTarget").value||null;
  state.profile.weeklyTargetKm=+document.getElementById("pWeeklyTargetKm").value||null;
  saveData(true);
  renderVmaTable();
  renderKPIs();
});

function renderZones(){
  var body=document.getElementById("zonesBody"); body.innerHTML="";
  var zones=computeZones();
  zones.forEach(function(z,i){
    var tr=document.createElement("tr");
    tr.innerHTML='<td>Zone '+(i+1)+'</td><td><input type="number" class="zMin" data-i="'+i+'" value="'+z.min+'"></td><td><input type="number" class="zMax" data-i="'+i+'" value="'+z.max+'"></td>';
    body.appendChild(tr);
  });
}
document.getElementById("btnRecalcZones").addEventListener("click", function(){ state.profile.zones=[]; renderZones(); });
document.getElementById("btnSaveZones").addEventListener("click", function(){
  var mins=document.querySelectorAll(".zMin"), maxs=document.querySelectorAll(".zMax");
  var zones=[];
  for(var i=0;i<5;i++){ zones.push({min:+mins[i].value,max:+maxs[i].value}); }
  state.profile.zones=zones; saveData(true);
});

function renderSportsList(){
  var wrap=document.getElementById("sportsList"); wrap.innerHTML="";
  state.sports.forEach(function(s,idx){
    var row=document.createElement("div"); row.className="tag-row";
    row.innerHTML='<span class="sw" style="width:10px;height:10px;border-radius:50%;background:'+s.color+';display:inline-block;"></span><span class="name">'+escapeHtml(s.name)+'</span>';
    var del=document.createElement("button"); del.className="btn ghost small"; del.textContent="Retirer";
    del.addEventListener("click", function(){
      confirmDelete(del, function(){
        if(state.sports.length<=1){toast("Au moins un sport requis");return;}
        state.sports.splice(idx,1); saveData(true); renderParametres();
      });
    });
    row.appendChild(del); wrap.appendChild(row);
  });
}
document.getElementById("btnAddSport").addEventListener("click", function(){
  var name=document.getElementById("newSportName").value.trim(); if(!name) return;
  if(state.sports.find(function(s){return s.name.toLowerCase()===name.toLowerCase();})){toast("Ce sport existe déjà");return;}
  state.sports.push({name:name,color:PALETTE[state.sports.length%PALETTE.length]});
  document.getElementById("newSportName").value="";
  saveData(true); renderParametres();
});

function renderSessionTypesList(){
  var wrap=document.getElementById("sessionTypesList"); wrap.innerHTML="";
  state.sessionTypes.forEach(function(t,idx){
    var row=document.createElement("div"); row.className="tag-row";
    row.innerHTML='<span class="name">'+escapeHtml(t)+'</span>';
    var del=document.createElement("button"); del.className="btn ghost small"; del.textContent="Retirer";
    del.addEventListener("click", function(){
      confirmDelete(del, function(){
        if(state.sessionTypes.length<=1){toast("Au moins un type requis");return;}
        state.sessionTypes.splice(idx,1); saveData(true); renderParametres();
      });
    });
    row.appendChild(del); wrap.appendChild(row);
  });
}
document.getElementById("btnAddSessionType").addEventListener("click", function(){
  var name=document.getElementById("newSessionType").value.trim(); if(!name) return;
  if(state.sessionTypes.indexOf(name)!==-1){toast("Ce type existe déjà");return;}
  state.sessionTypes.push(name);
  document.getElementById("newSessionType").value="";
  saveData(true); renderParametres();
});

function renderCycleNamesList(){
  var wrap=document.getElementById("cycleNamesList"); wrap.innerHTML="";
  if(!state.cycleNames.length){ wrap.innerHTML=emptyHTML("Aucun nom enregistré","Ajoutez-en un ci-dessous, ou créez un cycle « Libre » depuis la planification."); }
  state.cycleNames.forEach(function(n,idx){
    var row=document.createElement("div"); row.className="tag-row";
    row.innerHTML='<span class="name">'+escapeHtml(n)+'</span>';
    var del=document.createElement("button"); del.className="btn ghost small"; del.textContent="Retirer";
    del.addEventListener("click", function(){ confirmDelete(del, function(){ state.cycleNames.splice(idx,1); saveData(true); renderParametres(); }); });
    row.appendChild(del); wrap.appendChild(row);
  });
}
document.getElementById("btnAddCycleName").addEventListener("click", function(){
  var name=document.getElementById("newCycleName").value.trim(); if(!name) return;
  if(state.cycleNames.indexOf(name)!==-1){toast("Ce nom existe déjà");return;}
  state.cycleNames.push(name);
  document.getElementById("newCycleName").value="";
  saveData(true); renderParametres();
});

function renderParametres(){
  renderProfile(); renderZones(); renderSportsList(); renderSessionTypesList(); renderCycleNamesList(); renderTemplatesList();
}

function renderAll(){
  renderKPIs();
  renderGoalBanner();
  renderWeekPanel();
  renderSportKmChart();
  renderPlanification();
  renderRealisees();
  renderParametres();
  if(document.getElementById("view-statistiques").classList.contains("active")) renderStats();
}

loadData();
})();

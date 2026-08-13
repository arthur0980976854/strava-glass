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
  sessionTypes: DEFAULT_SESSION_TYPES.slice(),
  cycleNames: [],
  season:{start:null,end:null},
  cycles:[], subcycles:[], subsubcycles:[],
  seasonGoals:[],
  weekTypes:{},
  weekObjectives:{},
  sessionTemplates:[],
  sportGroups:[],
  sessions:[]
};
var charts = {};
var planMonthCursor = new Date(); planMonthCursor.setDate(1);
var doneMonthCursor = new Date(); doneMonthCursor.setDate(1);
var editCycleId=null, editSubId=null, editSubSubId=null;
var dashWeekOffset=0;
var cycleClipboard=null;

async function loadData(){
  try{
    var res = await (await fetch('/api/state', {credentials:'same-origin'})).json();
    if(res && res.value){
      var p = JSON.parse(res.value);
      state.profile = Object.assign(state.profile, p.profile||{});
      if(p.sports && p.sports.length) state.sports = p.sports;
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
      state.sportGroups = p.sportGroups || [];
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
function isoDate(d){ var y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), dd=String(d.getDate()).padStart(2,"0"); return y+"-"+m+"-"+dd; }
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
function cycleColor(c){ return (c && c.color) ? c.color : CYCLE_TYPES[c.type].color; }
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
function currentWeekDays(){ return weekDays(dashWeekOffset); }
function isSwim(name){ return /natation|swim/i.test(name||""); }
function sportUnit(name){ return isSwim(name) ? "m" : "km"; }
function sportDistance(s){
  var a=s.actual||{}; var v=a.distance||0;
  return v;
}
function weekObjectiveFor(mondayISO){
  var ss = state.subsubcycles.find(function(x){ return mondayISO>=x.start && mondayISO<=x.end && x.objective; });
  if(ss) return {text:ss.objective, source:ss.name};
  var sub = state.subcycles.find(function(x){ return mondayISO>=x.start && mondayISO<=x.end && x.objective; });
  if(sub) return {text:sub.objective, source:sub.name};
  if(state.weekObjectives[mondayISO]) return {text:state.weekObjectives[mondayISO], source:null};
  return null;
}
function renderKPIs(){
  var days=currentWeekDays(), d0=days[0], d1=days[6];
  var weekSessions = state.sessions.filter(function(s){return inRange(s.date,d0,d1);});
  var done = weekSessions.filter(function(s){return s.status==="done";});
  var volumeH = done.reduce(function(a,s){return a+((s.actual&&s.actual.duration)||0);},0)/60;
  var ratio = weekSessions.length ? Math.round(done.length/weekSessions.length*100) : 0;
  var sessionCount = done.length;

  var cards=[
    {label:"Volume horaire — semaine",value:volumeH.toFixed(1),unit:"h"},
    {label:"Séances réalisées",value:done.length+" / "+weekSessions.length,unit:"",pct:ratio},
    {label:"Sports pratiqués",value:String(new Set(done.map(function(s){return s.sport;})).size),unit:""},
    {label:"Charge cumulée",value:Math.round(done.reduce(function(a,s){return a+((s.actual&&s.actual.charge)||0);},0)).toLocaleString('fr-FR'),unit:""}
  ];

  var grid=document.getElementById("kpiGrid"); grid.innerHTML="";
  cards.forEach(function(c){
    var el=document.createElement("div"); el.className="kpi";
    el.innerHTML='<div class="label">'+c.label+'</div><div class="value">'+c.value+(c.unit?' <span class="unit">'+c.unit+'</span>':'')+'</div>'+
      (c.pct!==undefined?'<div class="bar"><i style="width:'+Math.max(0,Math.min(100,c.pct))+'%"></i></div>':'');
    grid.appendChild(el);
  });
  var label = fmtShort(isoDate(d0)).toUpperCase()+" — "+fmtShort(isoDate(d1)).toUpperCase();
  if(dashWeekOffset!==0) label += "  ·  "+(dashWeekOffset>0?"+":"")+dashWeekOffset+" sem.";
  document.getElementById("dashDateRange").textContent = label;
}

/* Compteurs distance / D+ par sport (avec groupes personnalisés) */
function renderSportCounters(){
  var days=currentWeekDays(), d0=days[0], d1=days[6];
  var done = state.sessions.filter(function(s){return s.status==="done" && inRange(s.date,d0,d1);});
  var bySport={};
  done.forEach(function(s){
    var sp=s.sport||"Autre";
    if(!bySport[sp]) bySport[sp]={dist:0,deniv:0,min:0,n:0};
    bySport[sp].dist += sportDistance(s);
    bySport[sp].deniv += (s.actual&&s.actual.elevation)||0;
    bySport[sp].min += (s.actual&&s.actual.duration)||0;
    bySport[sp].n++;
  });

  var used={}, cards=[];
  (state.sportGroups||[]).forEach(function(g){
    var agg={dist:0,deniv:0,min:0,n:0}, any=false;
    (g.sports||[]).forEach(function(sp){
      used[sp]=true;
      var d=bySport[sp]; if(!d) return;
      any=true; agg.dist+=d.dist; agg.deniv+=d.deniv; agg.min+=d.min; agg.n+=d.n;
    });
    if(any) cards.push({name:g.name, color:sportColor((g.sports||[])[0]), data:agg, unit: (g.sports||[]).every(isSwim)?"m":"km", sub:(g.sports||[]).join(" + ")});
  });
  Object.keys(bySport).forEach(function(sp){
    if(used[sp]) return;
    cards.push({name:sp, color:sportColor(sp), data:bySport[sp], unit:sportUnit(sp), sub:null});
  });

  var wrap=document.getElementById("sportCounters"); if(!wrap) return;
  wrap.innerHTML="";
  if(!cards.length){ wrap.innerHTML=emptyHTML("Aucune séance cette semaine","Les compteurs par sport apparaîtront ici."); return; }
  cards.forEach(function(c){
    var dist = c.unit==="m" ? Math.round(c.data.dist) : round1(c.data.dist);
    var el=document.createElement("div"); el.className="sport-counter";
    el.style.borderTopColor=c.color;
    el.innerHTML='<div class="sc-name" style="color:'+c.color+'">'+escapeHtml(c.name)+'</div>'+
      (c.sub?'<div class="sc-sub">'+escapeHtml(c.sub)+'</div>':'')+
      '<div class="sc-main">'+dist.toLocaleString('fr-FR')+' <span>'+c.unit+'</span></div>'+
      '<div class="sc-meta">'+Math.round(c.data.deniv).toLocaleString('fr-FR')+' m D+ · '+fmtMin(c.data.min)+' · '+c.data.n+' séance'+(c.data.n>1?'s':'')+'</div>';
    wrap.appendChild(el);
  });
}

/* ---------- Répartition par intensité ---------- */
function weekObjectiveKm(mondayISO){
  var ss = state.subsubcycles.find(function(x){ return mondayISO>=x.start && mondayISO<=x.end && x.objectiveKm; });
  if(ss) return +ss.objectiveKm;
  var sub = state.subcycles.find(function(x){ return mondayISO>=x.start && mondayISO<=x.end && x.objectiveKm; });
  if(sub) return +sub.objectiveKm;
  var obj = weekObjectiveFor(mondayISO);
  if(obj){ var m=String(obj.text).match(/(\d+(?:[.,]\d+)?)\s*km/i); if(m) return +m[1].replace(",","."); }
  return state.profile.weeklyTargetKm ? +state.profile.weeklyTargetKm : 0;
}
function sessionIntensityKm(s){
  var out={endurance:0,seuil:0,vma:0};
  if(!s.actual) return out;
  var segs=s.actual.segments;
  if(segs && segs.length){
    segs.forEach(function(g){ out[g.intensity||"endurance"] = (out[g.intensity||"endurance"]||0) + (+g.km||0); });
    return out;
  }
  if(!isRunSport(s.sport)) return out;
  var km=+(s.actual.distance||0); if(!km) return out;
  var t=(s.sessionType||"")+" "+(s.name||"");
  if(/vma|fractionn|interval/i.test(t)) out.vma=km;
  else if(/seuil|tempo|allure sp/i.test(t)) out.seuil=km;
  else out.endurance=km;
  return out;
}
function intensityTotals(sessions){
  var tot={endurance:0,seuil:0,vma:0};
  sessions.forEach(function(s){
    var k=sessionIntensityKm(s);
    tot.endurance+=k.endurance; tot.seuil+=k.seuil; tot.vma+=k.vma;
  });
  return tot;
}
function renderIntensityWeek(){
  var canvas=document.getElementById("chartIntensityWeek"); if(!canvas||!window.Chart) return;
  var days=currentWeekDays(), d0=days[0], d1=days[6], monday=isoDate(d0);
  var done=state.sessions.filter(function(s){return s.status==="done" && inRange(s.date,d0,d1);});
  var tot=intensityTotals(done);
  var sum=tot.endurance+tot.seuil+tot.vma;
  var objKm=weekObjectiveKm(monday);
  var badge=document.getElementById("intensityObjBadge");
  if(badge) paintBadge(badge, objKm ? ("Objectif : "+round1(objKm)+" km") : "Objectif km non défini", objKm?"#2563EB":null);

  drawChart("chartIntensityWeek",{
    type:"doughnut",
    data:{labels:["Endurance","Seuil","VMA"],
      datasets:[{data:[round1(tot.endurance),round1(tot.seuil),round1(tot.vma)],
        backgroundColor:[INTENSITIES.endurance.color,INTENSITIES.seuil.color,INTENSITIES.vma.color],borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:"62%",
      plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){
        var pct=sum?Math.round(c.parsed/sum*100):0; return c.label+" : "+c.parsed+" km ("+pct+"%)";
      }}}}}
  });

  var legend=document.getElementById("intensityLegend");
  if(legend){
    if(!sum){ legend.innerHTML=emptyHTML("Aucun km d'intensité","Détaillez vos séances de course à pied ou trail pour alimenter ce diagramme."); return; }
    legend.innerHTML = Object.keys(INTENSITIES).map(function(k){
      var v=tot[k], pct=sum?Math.round(v/sum*100):0;
      var share = objKm ? (objKm*(k==="endurance"?0.8:k==="seuil"?0.15:0.05)) : 0;
      var rest = objKm ? Math.max(0, objKm - sum) : 0;
      return '<div class="int-row"><span class="int-dot" style="background:'+INTENSITIES[k].color+'"></span>'+
        '<span class="int-name">'+INTENSITIES[k].label+'</span>'+
        '<span class="int-pct">'+pct+' %</span>'+
        '<span class="int-km">'+round1(v)+' km</span></div>';
    }).join("") +
    '<div class="int-total">Total '+round1(sum)+' km'+(objKm?(' / '+round1(objKm)+' km · reste '+round1(Math.max(0,objKm-sum))+' km'):'')+'</div>';
  }
}

/* Modale groupes de sports */
function renderGroupsModal(){
  var wrap=document.getElementById("groupsList"); if(!wrap) return;
  wrap.innerHTML="";
  if(!(state.sportGroups||[]).length){ wrap.innerHTML=emptyHTML("Aucun groupe","Créez un groupe pour cumuler plusieurs sports."); }
  (state.sportGroups||[]).forEach(function(g){
    var box=document.createElement("div"); box.className="group-box";
    var head=document.createElement("div"); head.className="group-head";
    head.innerHTML='<b>'+escapeHtml(g.name)+'</b>';
    var del=document.createElement("button"); del.className="btn ghost small"; del.textContent="Supprimer";
    del.addEventListener("click", function(){ confirmDelete(del, function(){ state.sportGroups=state.sportGroups.filter(function(x){return x.id!==g.id;}); saveData(true); renderGroupsModal(); renderSportCounters(); }); });
    head.appendChild(del); box.appendChild(head);
    var chips=document.createElement("div"); chips.className="chip-row";
    state.sports.forEach(function(sp){
      var on=(g.sports||[]).indexOf(sp.name)!==-1;
      var chip=document.createElement("button"); chip.type="button"; chip.className="chip"+(on?" active":"");
      if(on){ chip.style.background=sp.color; chip.style.borderColor=sp.color; }
      chip.textContent=sp.name;
      chip.addEventListener("click", function(){
        g.sports=g.sports||[];
        if(on) g.sports=g.sports.filter(function(x){return x!==sp.name;});
        else g.sports.push(sp.name);
        saveData(true); renderGroupsModal(); renderSportCounters();
      });
      chips.appendChild(chip);
    });
    box.appendChild(chips); wrap.appendChild(box);
  });
}
(function initGroupsModal(){
  var overlay=document.getElementById("groupsOverlay");
  var btn=document.getElementById("btnSportGroups");
  if(!overlay||!btn) return;
  btn.addEventListener("click", function(){ renderGroupsModal(); overlay.classList.add("open"); });
  document.getElementById("groupsClose").addEventListener("click", function(){ overlay.classList.remove("open"); });
  overlay.addEventListener("click", function(e){ if(e.target===overlay) overlay.classList.remove("open"); });
  document.getElementById("btnCreateGroup").addEventListener("click", function(){
    var inp=document.getElementById("newGroupName");
    var name=inp.value.trim(); if(!name){ toast("Nom du groupe requis"); return; }
    state.sportGroups=state.sportGroups||[];
    state.sportGroups.push({id:uid(),name:name,sports:[]});
    inp.value=""; saveData(true); renderGroupsModal(); renderSportCounters();
  });
})();

/* Navigation de semaine */
(function initWeekNav(){
  var prev=document.getElementById("dashWeekPrev"), next=document.getElementById("dashWeekNext"), today=document.getElementById("dashWeekToday");
  function go(delta){ dashWeekOffset+= delta; renderKPIs(); renderWeekPanel(); renderSportCounters(); }
  if(prev) prev.addEventListener("click", function(){ go(-1); });
  if(next) next.addEventListener("click", function(){ go(1); });
  if(today) today.addEventListener("click", function(){ dashWeekOffset=0; renderKPIs(); renderWeekPanel(); renderSportCounters(); });
})();

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
  var color=cycleColor(cyc);
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
  var days=currentWeekDays(), monday=isoDate(days[0]), today=todayISO();
  var refDate = (today>=monday && today<=isoDate(days[6])) ? today : monday;
  var cyc = activeCycleForDate(refDate);
  var badge = document.getElementById("currentCycleBadge");
  var box = document.getElementById("weekPanelBox");
  if(cyc){ paintBadge(badge, "Cycle : "+cycleLabel(cyc), cycleColor(cyc)); box.style.borderTop="3px solid "+cycleColor(cyc); }
  else { paintBadge(badge, "Aucun cycle défini", null); box.style.borderTop="3px solid transparent"; }
  renderCycleWeeksProgress(cyc);

  var sub = activeSubForDate(refDate);
  var subBadge = document.getElementById("currentSubBadge");
  if(sub) paintBadge(subBadge, "Sous-cycle : "+sub.name, "#F59E0B");
  else subBadge.style.display="none";

  var obj = weekObjectiveFor(monday);
  var big=document.getElementById("weekObjectiveBig");
  var hint=document.getElementById("weekObjectiveHint");
  if(big) big.textContent = obj ? obj.text : "Aucun objectif — définissez-le dans le sous-sous-cycle";
  if(big) big.classList.toggle("empty", !obj);
  if(hint) hint.textContent = obj && obj.source ? "Défini par : "+obj.source : "";

  var grid=document.getElementById("weekGrid"); grid.innerHTML="";
  days.forEach(function(d,i){
    var dISO=isoDate(d);
    var cell=document.createElement("div"); cell.className="day-cell"+(dISO===today?" today":"");
    var dc=activeCycleForDate(dISO);
    cell.style.borderTopColor = dc ? cycleColor(dc) : "transparent";
    if(dc) cell.title = cycleLabel(dc);
    var head=document.createElement("div"); head.className="dh";
    head.innerHTML="<span>"+DAY_LABELS[i]+"</span><b>"+d.getDate()+"</b>";
    cell.appendChild(head);
    state.sessions.filter(function(s){return s.date===dISO;}).forEach(function(s){
      cell.appendChild(makePill(s));
    });
    var hintEl=document.createElement("div"); hintEl.className="add-hint"; hintEl.textContent="+ ajouter une séance";
    cell.appendChild(hintEl);
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

/* =========================================================================
   MODAL SEANCE — redesigned + intervals.icu integration
   ========================================================================= */
var sessOverlay=document.getElementById("sessModalOverlay");
var sessForm=document.getElementById("sessForm");

// Spinner buttons (±)
document.querySelectorAll(".sess-spin-btn").forEach(function(btn){
  btn.addEventListener("click", function(){
    var name=btn.dataset.target;
    var delta=parseFloat(btn.dataset.delta)||1;
    var inp=sessForm.elements[name];
    if(!inp) return;
    var min=parseFloat(inp.min)||-9999, max=parseFloat(inp.max)||9999;
    var step=parseFloat(inp.step)||Math.abs(delta);
    var v=parseFloat(inp.value)||0;
    v=Math.min(max, Math.max(min, Math.round((v+delta)/step)*step));
    inp.value=v;
    if(name==="bpmAvg") updateBpmZoneHint();
    if(name==="duration") updateDeltaHint();
  });
});

// Sliders init & sync
function initSlider(sliderId, valId){
  var sl=document.getElementById(sliderId);
  var vl=document.getElementById(valId);
  if(sl && vl){
    sl.addEventListener("input", function(){ vl.textContent=sl.value; });
    vl.textContent=sl.value;
  }
}
initSlider("rpeSlider","rpeVal");
initSlider("plaisirSlider","plaisirVal");

function fillSelect(sel, values, currentVal){
  sel.innerHTML="";
  values.forEach(function(v){var o=document.createElement("option");o.value=v;o.textContent=v;sel.appendChild(o);});
  if(currentVal) sel.value=currentVal;
}

function toggleSessGroups(){
  var status=document.getElementById("sessStatus").value;
  var isDone=status==="done";
  document.querySelectorAll('[data-group="planned"]').forEach(function(el){el.style.display=isDone?"none":"";});
  document.querySelectorAll('[data-group="done"]').forEach(function(el){el.style.display=isDone?"":"none";});
  // Sync banner wording
  var msg=document.getElementById("sessSyncMsg");
  if(msg) msg.textContent = isDone
    ? "Activité réalisée → synchronisée sur intervals.icu via l'API"
    : "Séance planifiée → ajoutée au calendrier intervals.icu";
  // Icon + tab colour
  var icon=document.getElementById("sessModalIcon");
  if(icon) icon.classList.toggle("icon-done", isDone);
  document.querySelectorAll(".sess-tab").forEach(function(t){
    t.classList.toggle("tab-done", isDone && t.dataset.status==="done" && t.classList.contains("active"));
  });
}

// Status tab switching
document.querySelectorAll(".sess-tab[data-status]").forEach(function(b){
  b.addEventListener("click", function(){
    document.querySelectorAll(".sess-tab[data-status]").forEach(function(x){x.classList.remove("active");});
    b.classList.add("active");
    document.getElementById("sessStatus").value=b.dataset.status;
    toggleSessGroups();
  });
});
function setStatusTabs(status){
  document.querySelectorAll(".sess-tab[data-status]").forEach(function(b){
    b.classList.toggle("active", b.dataset.status===status);
  });
  toggleSessGroups();
}

function updateBpmZoneHint(){
  var v=+sessForm.bpmAvg.value||0;
  var z=bpmZone(v);
  var h=document.getElementById("bpmZoneHint");
  if(h) h.textContent = (v && z) ? ("→ Zone "+z) : "";
}
function updateDeltaHint(){
  var planned=+(sessForm.durationPlanned?sessForm.durationPlanned.value:0)||0;
  var actual=+sessForm.duration.value||0;
  var hint=document.getElementById("durationDeltaHint");
  if(!hint) return;
  if(!planned || !actual){ hint.textContent=""; return; }
  var delta=actual-planned;
  hint.textContent = "Écart vs prévu : "+(delta>=0?"+":"")+delta+" min";
  hint.style.color = Math.abs(delta)<=5 ? "var(--accent)" : "#92650a";
}
if(sessForm.bpmAvg) sessForm.bpmAvg.addEventListener("input", updateBpmZoneHint);
if(sessForm.duration) sessForm.duration.addEventListener("input", updateDeltaHint);

// Cancel buttons
document.getElementById("sessModalCancel").addEventListener("click", function(){
  sessOverlay.classList.remove("open");
});
document.getElementById("sessModalCancelBtn").addEventListener("click", function(){
  sessOverlay.classList.remove("open");
});

// intervals.icu: check connection status
var _intervalsConnected = false;
(function checkIntervalsConnection(){
  fetch("/api/intervals/activities",{credentials:"same-origin"})
    .then(function(r){return r.json();})
    .then(function(j){
      _intervalsConnected = !!j.connected;
      var banner=document.getElementById("sessSyncBanner");
      var msg=document.getElementById("sessSyncMsg");
      if(banner && !_intervalsConnected){
        banner.className="sess-sync-banner error";
        if(msg) msg.textContent="Non connecté à intervals.icu — la séance sera sauvegardée localement uniquement";
      }
    }).catch(function(){});
})();

// POST to intervals.icu
async function syncToIntervals(payload, status){
  try {
    var endpoint = status==="done" ? "/api/intervals/activities" : "/api/intervals/events";
    var res = await fetch(endpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: {"content-type":"application/json"},
      body: JSON.stringify(payload)
    });
    var json = await res.json();
    if(!res.ok || json.error){
      return {ok:false, error: json.error || ("HTTP "+res.status)};
    }
    return {ok:true};
  } catch(e) {
    return {ok:false, error:e.message};
  }
}

// Sync banner helper
function setSyncBanner(type, text){
  var banner=document.getElementById("sessSyncBanner");
  var msg=document.getElementById("sessSyncMsg");
  if(!banner) return;
  banner.className="sess-sync-banner"+(type?" "+type:"");
  if(msg) msg.textContent=text;
}

// Save button loader state
function setSaveLoading(on){
  var btn=document.getElementById("sessBtnSave");
  var txt=document.getElementById("sessBtnSaveTxt");
  if(!btn) return;
  btn.disabled=on;
  if(txt) txt.textContent = on ? "Enregistrement…" : "Enregistrer";
}

// DELETE button
document.getElementById("btnDeleteSess").addEventListener("click", function(){
  confirmDelete(this, function(){
    var id=sessForm.id.value;
    state.sessions = state.sessions.filter(function(s){return s.id!==id;});
    saveData(true); sessOverlay.classList.remove("open"); renderAll();
  });
});

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
/* ---------- Détail par intensité & calculateurs d'allure ---------- */
var INTENSITIES = {
  endurance:{label:"Endurance", color:"#10B981"},
  seuil:{label:"Seuil", color:"#F97316"},
  vma:{label:"VMA", color:"#EF4444"}
};
var DEFAULT_SEGMENTS = [
  {name:"Échauffement", km:"", intensity:"endurance"},
  {name:"Bloc de séance", km:"", intensity:"seuil"},
  {name:"Retour au calme", km:"", intensity:"endurance"}
];
var sessSegments = [];
function isRunSport(name){ return /course|trail|run/i.test(name||""); }
function isBike(name){ return /vélo|velo|bike|ride/i.test(name||""); }

function segTotalKm(){ return sessSegments.reduce(function(a,s){ return a+(+s.km||0); },0); }
function renderSegments(){
  var wrap=document.getElementById("sessSegments"); if(!wrap) return;
  wrap.innerHTML="";
  sessSegments.forEach(function(seg, i){
    var row=document.createElement("div"); row.className="seg-row";
    row.innerHTML =
      '<input type="text" class="seg-name" value="'+escapeHtml(seg.name||"")+'" placeholder="Nom du bloc">'+
      '<div class="seg-km"><input type="number" step="0.1" min="0" value="'+(seg.km===""||seg.km==null?"":seg.km)+'" placeholder="0"><span>km</span></div>'+
      '<div class="seg-int">'+Object.keys(INTENSITIES).map(function(k){
        return '<button type="button" class="seg-pill'+(seg.intensity===k?" active":"")+'" data-int="'+k+'" style="--c:'+INTENSITIES[k].color+'">'+INTENSITIES[k].label+'</button>';
      }).join("")+'</div>'+
      '<button type="button" class="seg-del" aria-label="Retirer">✕</button>';
    row.querySelector(".seg-name").addEventListener("input", function(){ seg.name=this.value; });
    row.querySelector(".seg-km input").addEventListener("input", function(){ seg.km=this.value; updateSegHint(); });
    row.querySelectorAll(".seg-pill").forEach(function(b){
      b.addEventListener("click", function(){ seg.intensity=b.dataset.int; renderSegments(); });
    });
    row.querySelector(".seg-del").addEventListener("click", function(){ sessSegments.splice(i,1); renderSegments(); updateSegHint(); });
    wrap.appendChild(row);
  });
  var add=document.createElement("button"); add.type="button"; add.className="btn small seg-add"; add.textContent="＋ Ajouter un bloc";
  add.addEventListener("click", function(){ sessSegments.push({name:"Bloc",km:"",intensity:"endurance"}); renderSegments(); });
  wrap.appendChild(add);
  updateSegHint();
}
function updateSegHint(){
  var hint=document.getElementById("segTotalHint"); if(!hint) return;
  var tot=segTotalKm();
  var by={endurance:0,seuil:0,vma:0};
  sessSegments.forEach(function(s){ by[s.intensity]=(by[s.intensity]||0)+(+s.km||0); });
  hint.textContent = tot ? ("Total "+round1(tot)+" km · End. "+round1(by.endurance)+" · Seuil "+round1(by.seuil)+" · VMA "+round1(by.vma)) : "";
  // reporte le total dans le champ distance si détaillé
  var distInput=document.querySelector('#sportSpecificFields [data-metric-key="distance"]');
  if(distInput && tot) { distInput.value=round1(tot); updatePaceCalc(); }
}
function updateSessIntensityUI(sport, session){
  var wrap=document.getElementById("sessIntensityWrap");
  if(!wrap) return;
  var on = isRunSport(sport);
  wrap.style.display = on ? "block" : "none";
  var box=document.getElementById("sessSegments");
  var btn=document.getElementById("btnToggleSegments");
  var existing = session && session.actual && session.actual.segments;
  sessSegments = existing && existing.length ? existing.map(function(s){return {name:s.name,km:s.km,intensity:s.intensity};}) : DEFAULT_SEGMENTS.map(function(s){return Object.assign({},s);});
  var open = !!(existing && existing.length);
  if(box) box.style.display = open ? "block" : "none";
  if(btn) btn.textContent = open ? "− Masquer le détail" : "＋ Détailler la séance";
  if(on) renderSegments();
}
(function initSegments(){
  var btn=document.getElementById("btnToggleSegments"); if(!btn) return;
  btn.addEventListener("click", function(){
    var box=document.getElementById("sessSegments");
    var open = box.style.display!=="none";
    box.style.display = open ? "none" : "block";
    btn.textContent = open ? "＋ Détailler la séance" : "− Masquer le détail";
    if(!open) renderSegments();
  });
})();

function fmtPace(minPerUnit){
  var m=Math.floor(minPerUnit), s=Math.round((minPerUnit-m)*60);
  if(s===60){ m++; s=0; }
  return m+"'"+String(s).padStart(2,"0")+"\"";
}
function updatePaceCalc(){
  var box=document.getElementById("sessPaceBox"); if(!box) return;
  var sport=(document.getElementById("sessSport")||{value:""}).value;
  var dur=+(sessForm.duration?sessForm.duration.value:0)||0;
  var distInput=document.querySelector('#sportSpecificFields [data-metric-key="distance"]');
  var dist=distInput?+distInput.value||0:0;
  var label=document.getElementById("sessPaceLabel"), val=document.getElementById("sessPaceValue");
  if(!dur || !dist){ box.style.display="none"; return; }
  box.style.display="flex";
  var target=null;
  if(isSwim(sport)){
    label.textContent="Allure moyenne";
    val.textContent = fmtPace(dur/(dist/100))+" /100m";
    target='paceAvg';
  } else if(isBike(sport)){
    label.textContent="Vitesse moyenne";
    val.textContent = round1(dist/(dur/60))+" km/h";
    target='speedAvg';
  } else {
    label.textContent="Allure moyenne";
    val.textContent = fmtPace(dur/dist)+" /km";
    target='paceAvg';
  }
  var t=document.querySelector('#sportSpecificFields [data-metric-key="'+target+'"]');
  if(t) t.value = target==='speedAvg' ? round1(dist/(dur/60)) : val.textContent.replace(/ \/.*$/,"");
}
if(sessForm.duration) sessForm.duration.addEventListener("input", updatePaceCalc);
document.getElementById("sportSpecificFields").addEventListener("input", function(e){
  if(e.target.dataset && e.target.dataset.metricKey==="distance") updatePaceCalc();
});

document.getElementById("sessSport").addEventListener("change", function(){ renderSportFields(this.value, null); updateSessIntensityUI(this.value, null); updatePaceCalc(); });


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
  // Lib row: show only when creating
  var libRow=document.getElementById("templateLoadRow");
  if(libRow) libRow.style.display = session ? "none" : "flex";
  var delBtn=document.getElementById("btnDeleteSess");
  delBtn.style.display = session ? "inline-flex" : "none";
  delBtn.setAttribute("data-armed","0"); delBtn.textContent="Supprimer"; delBtn.style.color=""; delBtn.style.borderColor="";
  // Title + sub
  document.getElementById("sessModalTitle").textContent = session ? "Modifier la séance" : "Nouvelle séance";
  var sub=document.getElementById("sessModalSub");
  if(sub) sub.textContent = _intervalsConnected ? "intervals.icu · Synchronisation activée" : "intervals.icu · Non connecté";
  // Reset sync banner
  setSyncBanner("", _intervalsConnected
    ? "La séance sera synchronisée sur intervals.icu"
    : "Non connecté à intervals.icu — sauvegarde locale uniquement");
  if(!_intervalsConnected){
    var banner=document.getElementById("sessSyncBanner");
    if(banner) banner.className="sess-sync-banner error";
  }
  // Reset save btn
  setSaveLoading(false);
  // Fill fields
  sessForm.id.value = session ? session.id : "";
  sessForm.date.value = session ? session.date : (presetDate||todayISO());
  if(sessForm.sessName) sessForm.sessName.value = session ? (session.name||"") : "";
  sessForm.status.value = session ? session.status : "planned";
  setStatusTabs(sessForm.status.value);
  sessForm.detail.value = session ? (session.detail||"") : "";
  sessForm.objective.value = session ? (session.objective||"") : "";
  if(sessForm.durationPlanned) sessForm.durationPlanned.value = session ? (session.durationPlanned||"") : "";
  // Sliders default
  var rpeSlider=document.getElementById("rpeSlider");
  var plaisirSlider=document.getElementById("plaisirSlider");
  if(session && session.actual){
    if(sessForm.duration) sessForm.duration.value=session.actual.duration||"";
    if(sessForm.bpmAvg) sessForm.bpmAvg.value=session.actual.bpmAvg||"";
    if(sessForm.charge) sessForm.charge.value=session.actual.charge||"";
    if(rpeSlider) rpeSlider.value=session.actual.rpe||5;
    if(plaisirSlider) plaisirSlider.value=session.actual.plaisir||7;
  } else {
    if(rpeSlider) rpeSlider.value=5;
    if(plaisirSlider) plaisirSlider.value=7;
  }
  if(document.getElementById("rpeVal")) document.getElementById("rpeVal").textContent = rpeSlider?rpeSlider.value:"5";
  if(document.getElementById("plaisirVal")) document.getElementById("plaisirVal").textContent = plaisirSlider?plaisirSlider.value:"7";
  renderSportFields(session?session.sport:(document.getElementById("sessSport").value), session&&session.actual?session.actual:null);
  updateSessIntensityUI(session?session.sport:(document.getElementById("sessSport").value), session);
  updatePaceCalc();
  toggleSessGroups();

  updateBpmZoneHint();
  updateDeltaHint();
  sessOverlay.classList.add("open");
}
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
sessForm.addEventListener("submit", async function(e){
  e.preventDefault();
  setSaveLoading(true);
  var fd=new FormData(sessForm);
  var id=fd.get("id");
  var status=fd.get("status");
  var metrics={};
  document.querySelectorAll('#sportSpecificFields [data-metric-key]').forEach(function(inp){
    var key=inp.dataset.metricKey;
    metrics[key] = inp.type==="number" ? (inp.value?+inp.value:0) : inp.value;
  });

  // Collect sport-specific km/elevation from metrics for intervals API
  var distanceKm = metrics["distance"] ? +metrics["distance"] : null;
  var elevation  = metrics["elevation"] ? +metrics["elevation"] : null;

  // Segments d'intensité (course à pied / trail)
  var segsOpen = document.getElementById("sessSegments") && document.getElementById("sessSegments").style.display!=="none";
  var segments = (isRunSport(fd.get("sport")) && segsOpen)
    ? sessSegments.filter(function(s){ return +s.km>0; }).map(function(s){ return {name:s.name||"Bloc", km:+s.km, intensity:s.intensity||"endurance"}; })
    : [];
  if(segments.length && !distanceKm){ distanceKm = segments.reduce(function(a,s){return a+s.km;},0); metrics["distance"]=distanceKm; }

  var payload={
    date:fd.get("date"), sport:fd.get("sport"), sessionType:fd.get("sessionType"),
    detail:fd.get("detail")||"", objective:fd.get("objective")||"",
    name: fd.get("sessName")||fd.get("sport")||"Séance",
    status:status, durationPlanned: fd.get("durationPlanned")?+fd.get("durationPlanned"):null,
    actual: status==="done" ? Object.assign({
      duration:+fd.get("duration")||0,
      bpmAvg:fd.get("bpmAvg")?+fd.get("bpmAvg"):null,
      rpe:fd.get("rpe")?+fd.get("rpe"):null,
      charge:fd.get("charge")?+fd.get("charge"):0,
      plaisir:fd.get("plaisir")?+fd.get("plaisir"):null,
      segments: segments
    }, metrics) : null
  };


  // Save locally first
  if(id){ var s=state.sessions.find(function(x){return x.id===id;}); Object.assign(s,payload); }
  else { payload.id=uid(); state.sessions.push(payload); }
  saveData(true);
  renderAll();

  // Sync to intervals.icu if connected
  if(_intervalsConnected){
    var intervalsPayload = {
      date: fd.get("date"),
      sport: fd.get("sport"),
      name: payload.name,
      detail: fd.get("detail")||"",
      objective: fd.get("objective")||""
    };
    if(status==="planned"){
      intervalsPayload.durationPlanned = fd.get("durationPlanned")?+fd.get("durationPlanned"):null;
    } else {
      intervalsPayload.duration = +fd.get("duration")||0;
      if(fd.get("bpmAvg")) intervalsPayload.bpmAvg = +fd.get("bpmAvg");
      if(fd.get("charge")) intervalsPayload.charge = +fd.get("charge");
      if(fd.get("rpe")) intervalsPayload.rpe = +fd.get("rpe");
      if(distanceKm) intervalsPayload.distance = distanceKm;
      if(elevation) intervalsPayload.elevation = elevation;
    }
    var syncResult = await syncToIntervals(intervalsPayload, status);
    if(syncResult.ok){
      setSyncBanner("success", "✓ Synchronisé sur intervals.icu");
      toast("Séance enregistrée et synchronisée sur intervals.icu ✓");
      setTimeout(function(){ sessOverlay.classList.remove("open"); }, 900);
    } else {
      setSyncBanner("error", "⚠ intervals.icu : "+syncResult.error+" — sauvegardé localement");
      toast("Sauvegardé localement. Erreur intervals.icu : "+syncResult.error);
      setTimeout(function(){ sessOverlay.classList.remove("open"); }, 2200);
    }
  } else {
    toast("Séance enregistrée localement");
    sessOverlay.classList.remove("open");
  }
  setSaveLoading(false);
});

/* =========================================================================
   PLANIFICATION
   ========================================================================= */
document.getElementById("btnSaveSeason").addEventListener("click", function(){
  var s=document.getElementById("seasonStart").value, e=document.getElementById("seasonEnd").value;
  if(!s||!e||s>e){ toast("Dates de saison invalides"); return; }
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
  if(!start||!end||start>end){ toast("Dates de cycle invalides"); return; }
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
  if(document.getElementById("subsubObjective")) document.getElementById("subsubObjective").value="";
  document.getElementById("subsubWeeks").value="1";
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
  var objective=(document.getElementById("subsubObjective")||{value:""}).value.trim();
  if(!parent){ toast("Ajoutez d'abord un sous-cycle"); return; }
  if(!name||!weeks||!start){ toast("Champs incomplets"); return; }
  var sd=parseISO(start); var ed=new Date(sd); ed.setDate(ed.getDate()+weeks*7-1);
  if(editSubSubId){
    var ss=state.subsubcycles.find(function(x){return x.id===editSubSubId;});
    Object.assign(ss,{subId:parent,name:name,start:start,end:isoDate(ed),objective:objective});
    resetSubSubForm();
  } else {
    state.subsubcycles.push({id:uid(),subId:parent,name:name,start:start,end:isoDate(ed),objective:objective});
    document.getElementById("subsubName").value="";
    if(document.getElementById("subsubObjective")) document.getElementById("subsubObjective").value="";
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
    block.title=labelFn(c)+" · "+fmtShort(c.start)+" → "+fmtShort(c.end)+" — cliquez pour les détails";
    block.style.cursor="pointer";
    block.addEventListener("click", function(){ openCycleInfo(kind, c); });
    wrap.appendChild(block);
  });
}

/* Modale d'informations sur un bloc de la timeline */
function periodSummary(startISO, endISO){
  var d0=parseISO(startISO), d1=parseISO(endISO);
  var list=state.sessions.filter(function(s){return inRange(s.date,d0,d1);});
  var done=list.filter(function(s){return s.status==="done";});
  return {
    planned:list.length, done:done.length,
    hours:done.reduce(function(a,s){return a+((s.actual&&s.actual.duration)||0);},0)/60,
    km:done.reduce(function(a,s){return a+((s.actual&&s.actual.distance)||0);},0),
    deniv:done.reduce(function(a,s){return a+((s.actual&&s.actual.elevation)||0);},0)
  };
}
function openCycleInfo(kind, item){
  var overlay=document.getElementById("tlInfoOverlay"); if(!overlay) return;
  var title = kind==="cycle" ? cycleLabel(item) : item.name;
  document.getElementById("tlInfoTitle").textContent=title;
  var weeks=Math.round((parseISO(item.end)-parseISO(item.start))/(7*864e5))+1;
  var sum=periodSummary(item.start,item.end);
  var parentTxt="";
  if(kind==="sub"){ var pc=state.cycles.find(function(x){return x.id===item.cycleId;}); if(pc) parentTxt=cycleLabel(pc); }
  if(kind==="subsub"){ var ps=state.subcycles.find(function(x){return x.id===item.subId;}); if(ps) parentTxt=ps.name; }
  var goals=state.seasonGoals.filter(function(g){return g.date>=item.start && g.date<=item.end;});
  var html='<div class="info-grid">'+
    '<div><span>Début</span><b>'+fmtShort(item.start)+'</b></div>'+
    '<div><span>Fin</span><b>'+fmtShort(item.end)+'</b></div>'+
    '<div><span>Durée</span><b>'+weeks+' semaine'+(weeks>1?'s':'')+'</b></div>'+
    (parentTxt?'<div><span>Parent</span><b>'+escapeHtml(parentTxt)+'</b></div>':'')+
    '<div><span>Séances</span><b>'+sum.done+' / '+sum.planned+'</b></div>'+
    '<div><span>Volume</span><b>'+sum.hours.toFixed(1)+' h</b></div>'+
    '<div><span>Distance</span><b>'+round1(sum.km)+' km</b></div>'+
    '<div><span>D+</span><b>'+Math.round(sum.deniv).toLocaleString('fr-FR')+' m</b></div>'+
    '</div>';
  if(item.objective) html+='<div class="info-obj"><span>Objectif</span><b>'+escapeHtml(item.objective)+'</b></div>';
  if(goals.length) html+='<div class="info-obj"><span>Objectifs de saison</span><b>'+goals.map(function(g){return escapeHtml(g.name)+" ("+fmtShort(g.date)+")";}).join(" · ")+'</b></div>';
  html+='<div class="info-actions"><button class="btn small" id="tlInfoCopy">⧉ Copier ce cycle</button></div>';
  document.getElementById("tlInfoBody").innerHTML=html;
  document.getElementById("tlInfoCopy").addEventListener("click", function(){
    copyCycleItem(kind, item); overlay.classList.remove("open");
  });
  overlay.classList.add("open");
}
(function initInfoModal(){
  var overlay=document.getElementById("tlInfoOverlay"); if(!overlay) return;
  document.getElementById("tlInfoClose").addEventListener("click", function(){ overlay.classList.remove("open"); });
  overlay.addEventListener("click", function(e){ if(e.target===overlay) overlay.classList.remove("open"); });
})();

/* Copier / coller de cycles */
function copyCycleItem(kind, item){
  cycleClipboard={kind:kind, item:JSON.parse(JSON.stringify(item))};
  toast("Copié — collez-le depuis la barre « Presse-papier »");
  renderClipboardBar();
}
function renderClipboardBar(){
  var bar=document.getElementById("cycleClipboardBar");
  if(!bar){
    bar=document.createElement("div"); bar.id="cycleClipboardBar"; bar.className="clipboard-bar";
    var tl=document.getElementById("timeline");
    tl.parentNode.parentNode.appendChild(bar);
  }
  if(!cycleClipboard){ bar.style.display="none"; return; }
  var it=cycleClipboard.item;
  var name = cycleClipboard.kind==="cycle" ? cycleLabel(it) : it.name;
  bar.style.display="flex";
  bar.innerHTML='<span class="cb-label">Presse-papier : <b>'+escapeHtml(name)+'</b></span>'+
    '<input type="date" id="cbDate" value="'+it.start+'">'+
    '<button class="btn primary small" id="cbPaste">Coller à cette date</button>'+
    '<button class="btn ghost small" id="cbClear">Vider</button>';
  document.getElementById("cbClear").addEventListener("click", function(){ cycleClipboard=null; renderClipboardBar(); });
  document.getElementById("cbPaste").addEventListener("click", function(){
    var newStart=document.getElementById("cbDate").value;
    if(!newStart){ toast("Choisissez une date"); return; }
    var days=Math.round((parseISO(it.end)-parseISO(it.start))/864e5);
    var end=parseISO(newStart); end.setDate(end.getDate()+days);
    var copy=Object.assign({},it,{id:uid(),start:newStart,end:isoDate(end)});
    delete copy._lane;
    if(cycleClipboard.kind==="cycle") state.cycles.push(copy);
    else if(cycleClipboard.kind==="sub") state.subcycles.push(copy);
    else state.subsubcycles.push(copy);
    saveData(true); renderPlanification(); toast("Cycle collé");
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
  renderTimelineLevel("tlLanesCycles", state.cycles, function(c){return cycleColor(c);}, cycleLabel, "cycle");
  renderTimelineLevel("tlLanesSub", state.subcycles, function(c){
    var parent=state.cycles.find(function(x){return x.id===c.cycleId;});
    var hex= parent? cycleColor(parent) : CYCLE_TYPES.libre.color;
    return "color-mix(in srgb, "+hex+" 55%, white)";
  }, function(c){return c.name;}, "sub");
  renderTimelineLevel("tlLanesSubSub", state.subsubcycles, function(c){
    var parentSub=state.subcycles.find(function(x){return x.id===c.subId;});
    var parent= parentSub? state.cycles.find(function(x){return x.id===parentSub.cycleId;}) : null;
    var hex= parent? cycleColor(parent) : CYCLE_TYPES.libre.color;
    return "color-mix(in srgb, "+hex+" 30%, white)";
  }, function(c){return c.name;}, "subsub");

  state.seasonGoals.forEach(function(g){
    var gd=parseISO(g.date);
    if(gd<s0 || gd>s1) return;
    var m=document.createElement("div"); m.className="tl-goal";
    m.style.left=((gd-s0)/total*100)+"%";
    m.title=g.name+" · "+fmtShort(g.date)+(g.target?" · "+g.target:"");
    m.innerHTML='<i></i><span>'+escapeHtml(g.name)+'</span>';
    tlMonths.appendChild(m);
  });

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
    var row=document.createElement("div"); row.className="cycle-row";
    row.innerHTML='<span class="sw" style="background:'+cycleColor(c)+'"></span><div class="main"><div class="t1">'+escapeHtml(cycleLabel(c))+'</div><div class="t2">'+fmtShort(c.start)+' → '+fmtShort(c.end)+'</div></div>';
    var btns=document.createElement("div"); btns.className="rowbtns";
    var color=document.createElement("input"); color.type="color"; color.className="cycle-color";
    color.value=cycleColor(c); color.title="Couleur du cycle";
    color.addEventListener("input", function(){ c.color=color.value; renderTimeline(); });
    color.addEventListener("change", function(){ c.color=color.value; saveData(true); renderPlanification(); renderWeekPanel(); });
    btns.appendChild(color);
    var copy=document.createElement("button"); copy.className="btn small"; copy.textContent="Copier";
    copy.addEventListener("click", function(){ copyCycleItem("cycle", c); });
    btns.appendChild(copy);
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
    var copy=document.createElement("button"); copy.className="btn small"; copy.textContent="Copier";
    copy.addEventListener("click", function(){ copyCycleItem("sub", sc); });
    btns.appendChild(copy);
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
    row.innerHTML='<span class="sw" style="background:#06B6D4"></span><div class="main"><div class="t1">'+escapeHtml(ss.name)+'</div><div class="t2">'+fmtShort(ss.start)+' → '+fmtShort(ss.end)+(parent?' · '+escapeHtml(parent.name):'')+(ss.objective?' · 🎯 '+escapeHtml(ss.objective):'')+'</div></div>';
    var btns=document.createElement("div"); btns.className="rowbtns";
    var copy=document.createElement("button"); copy.className="btn small"; copy.textContent="Copier";
    copy.addEventListener("click", function(){ copyCycleItem("subsub", ss); });
    btns.appendChild(copy);
    var edit=document.createElement("button"); edit.className="btn small"; edit.textContent="Modifier";
    edit.addEventListener("click", function(){
      editSubSubId=ss.id;
      document.getElementById("subsubParentSub").value=ss.subId;
      document.getElementById("subsubName").value=ss.name;
      var weeks=Math.round((parseISO(ss.end)-parseISO(ss.start))/(7*864e5))+1;
      document.getElementById("subsubWeeks").value=weeks;
      document.getElementById("subsubStart").value=ss.start;
      if(document.getElementById("subsubObjective")) document.getElementById("subsubObjective").value=ss.objective||"";
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
    if(cyc) paintBadge(cycleBadgeEl,"Cycle en cours : "+cycleLabel(cyc),cycleColor(cyc));
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
    cell.style.borderTopColor = dc ? cycleColor(dc) : "transparent";
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
  renderClipboardBar();
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
  renderSportCounters();
  renderPlanification();
  renderRealisees();
  renderParametres();
  if(document.getElementById("view-statistiques").classList.contains("active")) renderStats();
}

loadData();
})();

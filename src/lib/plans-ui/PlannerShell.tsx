/**
 * PlannerShell — the full static shell of the planner app, transcribed from the
 * legacy `markup.html` into JSX so no raw HTML blob is injected via
 * `dangerouslySetInnerHTML`.
 *
 * Every element ID and class is preserved exactly, because the (legacy,
 * imperative) `app.js`/`coros.js` scripts still enhance this DOM after this
 * component mounts. The shell itself has no reactive state, so React renders it
 * once and never re-renders over the script-injected content.
 */

import type { ReactNode } from "react";
import { InstallPWA } from "./InstallPWA";

function NavItem({ view, active, icon, label }: { view: string; active?: boolean; icon?: ReactNode; label: string }) {
  return (
    <button data-view={view} className={active ? "active" : ""}>
      <span className="n">{icon}</span>
      {label}
    </button>
  );
}

export function PlannerShell() {
  return (
    <>
      <div id="shell">
        <aside id="sidebar">
          <div className="logo">
            <img
              className="brandmark"
              src="/plans-logo.png"
              alt="Plan's"
              width={150}
              height={42}
            />
          </div>

          <nav id="mainNav">
            <NavItem view="dashboard" active icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>} label="Tableau de bord" />
            <NavItem view="planification" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>} label="Planification" />
            <NavItem view="statistiques" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>} label="Statistiques" />
            <NavItem view="realisees" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} label="Séances réalisées" />
            <NavItem view="allures" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>} label="Tableau d'allure" />
            <NavItem view="parametres" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0 .33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>} label="Paramètres" />
            <NavItem view="strava" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="13 2 6 14 10 14 11 22 18 10 14 10 13 2"/></svg>} label="COROS" />
          </nav>

          <div className="sidebar-install-wrap">
            <InstallPWA />
          </div>

          <div className="sidebar-user">
            <div className="sidebar-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name" id="sidebarUserName">Mon profil</span>
              <span className="sidebar-user-sub">Suivi &amp; planification sportive</span>
            </div>
          </div>
        </aside>

        <main id="content">
          {/* Dashboard */}
          <section className="view active" id="view-dashboard">
            <div className="view-head dash-head">
              <div className="dash-head-title"><h1>Tableau de bord</h1><div className="sub" id="dashDateRange" /></div>
              <div className="dash-head-cards">
                <div className="panel goal-banner" id="goalBanner" />
                <div className="panel week-objective-panel" id="weekObjectivePanel">
                  <div className="wo-label">Objectif de la semaine</div>
                  <div className="wo-value" id="weekObjectiveBig">—</div>
                  <div className="wo-hint" id="weekObjectiveHint" />
                </div>
              </div>
            </div>
            <div className="grid cols-4" id="kpiGrid" style={{ marginBottom: 16 }} />
            <div className="panel">
              <div className="week-panel-head">
                <h3 className="block-title" style={{ margin: 0 }}>Distance &amp; D+ par sport — semaine</h3>
                <div className="badges"><button className="btn small" id="btnSportGroups">⛓ Groupes de sports</button></div>
              </div>
              <div className="sport-counter-grid" id="sportCounters" />
            </div>
            <div className="panel" id="weekPanelBox">
              <div className="week-panel-head">
                <h3 className="block-title" style={{ margin: 0 }}>Semaine en cours</h3>
                <div className="badges">
                  <span className="cycle-badge" id="currentCycleBadge">—</span>
                  <span className="cycle-badge" id="currentSubBadge" style={{ display: "none" }}>—</span>
                  <div className="month-nav">
                    <button id="dashWeekPrev">‹</button>
                    <button className="btn small" id="dashWeekToday">Aujourd'hui</button>
                    <button id="dashWeekNext">›</button>
                  </div>
                </div>
              </div>
              <div className="cw-row" id="cycleWeeksRow" />
              <div className="week-grid" id="weekGrid" />
              <div className="legend-row">
                <span><i className="legend-sw done" />Séance réalisée</span>
                <span><i className="legend-sw planned" />Séance planifiée</span>
                <span><i className="legend-sw cycle" />Barre du haut = cycle en cours ce jour-là</span>
              </div>
            </div>
            <div className="panel">
              <div className="week-panel-head">
                <h3 className="block-title" style={{ margin: 0 }}>Répartition par intensité — semaine</h3>
                <div className="badges"><span className="cycle-badge" id="intensityObjBadge">—</span></div>
              </div>
              <div className="intensity-wrap">
                <div className="intensity-chart"><canvas id="chartIntensityWeek" /></div>
                <div className="intensity-legend" id="intensityLegend" />
              </div>
            </div>
          </section>


          {/* Planification */}
          <section className="view" id="view-planification">
            <div className="view-head"><div><h1>Planification</h1><div className="sub">Timeline de saison &amp; calendrier</div></div></div>
            <div className="panel">
              <h3 className="block-title">Timeline de la saison</h3>
              <div className="timeline-wrap">
                <div className="timeline" id="timeline">
                  <div className="tl-months" id="tlMonths" />
                  <div className="tl-level-label">Cycles</div>
                  <div className="tl-lanes" id="tlLanesCycles" />
                  <div className="tl-level-label">Sous-cycles</div>
                  <div className="tl-lanes" id="tlLanesSub" />
                  <div className="tl-level-label">Sous-sous-cycles</div>
                  <div className="tl-lanes" id="tlLanesSubSub" />
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="week-panel-head">
                <h3 className="block-title" style={{ margin: 0 }}>Calendrier mensuel</h3>
                <div className="badges">
                  <span className="cycle-badge" id="planMonthCycleBadge">—</span>
                  <div className="month-nav">
                    <button id="planMonthPrev">‹</button>
                    <span className="month-label" id="planMonthLabel" />
                    <button id="planMonthNext">›</button>
                  </div>
                </div>
              </div>
              <div className="weekday-row"><span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span></div>
              <div className="month-grid" id="planMonthGrid" />
              <div className="legend-row">
                <span><i className="legend-sw done" />Réalisée</span>
                <span><i className="legend-sw planned" />Planifiée</span>
                <span><i className="legend-sw cycle" />Barre du haut = cycle du jour</span>
              </div>
            </div>
            <div className="config-toggle-row">
              <button className="btn primary" id="btnToggleConfig">⚙ Configurer la saison, les cycles &amp; les objectifs</button>
            </div>
            <div id="planConfigWrap" style={{ display: "none" }}>
              <div className="panel">
                <h3 className="block-title">Saison</h3>
                <div className="season-form">
                  <div className="field"><label>Début de saison</label><input type="date" id="seasonStart" /></div>
                  <div className="field"><label>Fin de saison</label><input type="date" id="seasonEnd" /></div>
                  <button className="btn primary" id="btnSaveSeason">Enregistrer la saison</button>
                </div>
              </div>
              <div className="panel">
                <h3 className="block-title">Objectifs de saison</h3>
                <div className="form-grid c3">
                  <div className="field"><label>Nom de l'objectif</label><input type="text" id="goalName" placeholder="Ex : Marathon de Paris" /></div>
                  <div className="field"><label>Date</label><input type="date" id="goalDate" /></div>
                  <div className="field"><label>Temps visé (optionnel)</label><input type="text" id="goalTarget" placeholder="Ex : 3h15" /></div>
                </div>
                <div className="form-actions"><span /><div className="right"><button className="btn primary" id="btnAddGoal">Ajouter l'objectif</button></div></div>
                <div className="list" id="goalsList" style={{ marginTop: 12 }} />
              </div>
              <div className="panel">
                <h3 className="block-title">Ajouter / modifier un cycle</h3>
                <div className="edit-mode-hint" id="cycleEditHint">Modification en cours — <a href="#" id="cancelCycleEdit" style={{ color: "#92650a" }}>annuler</a></div>
                <div className="form-grid c3">
                  <div className="field"><label>Type de cycle</label>
                    <div className="custom-select-wrap">
                      <select id="cycleType" className="custom-select">
                        <option value="base">Base</option>
                        <option value="developpement">Développement</option>
                        <option value="specifique">Spécifique</option>
                        <option value="affutage">Affûtage</option>
                        <option value="recuperation">Récupération</option>
                        <option value="libre">Libre (nom personnalisé)</option>
                      </select>
                      <span className="custom-select-arrow"><ChevronDown /></span>
                    </div>
                  </div>
                  <div className="field" id="cycleLabelField" style={{ display: "none" }}><label>Nom du cycle</label><input type="text" id="cycleLabel" list="customCycleNamesList" placeholder="Ex : Stage altitude" /></div>
                  <div className="field"><label>Début</label><input type="date" id="cycleStart" /></div>
                  <div className="field"><label>Fin</label><input type="date" id="cycleEnd" /></div>
                </div>
                <div className="form-actions"><span /><div className="right"><button className="btn primary" id="btnAddCycle">Ajouter le cycle</button></div></div>
                <div className="cycle-list" id="cycleList" />
                <datalist id="customCycleNamesList" />
              </div>
              <div className="panel">
                <h3 className="block-title">Ajouter / modifier un sous-cycle</h3>
                <div className="edit-mode-hint" id="subEditHint">Modification en cours — <a href="#" id="cancelSubEdit" style={{ color: "#92650a" }}>annuler</a></div>
                <div className="form-grid c3">
                  <div className="field"><label>Cycle parent</label>
                    <div className="custom-select-wrap"><select id="subParentCycle" className="custom-select" /><span className="custom-select-arrow"><ChevronDown /></span></div>
                  </div>
                  <div className="field"><label>Nom du sous-cycle</label><input type="text" id="subName" placeholder="Ex : Bloc 4 semaines" /></div>
                  <div className="field"><label>Durée (semaines)</label><input type="number" id="subWeeks" min={1} defaultValue={4} /></div>
                  <div className="field"><label>Début</label><input type="date" id="subStart" /></div>
                  <div className="field" style={{ gridColumn: "span 2" }}><label>Objectif de la semaine</label><input type="text" id="subObjective" placeholder="Ex : 60 km · 2 séances qualité" /></div>
                  <div className="field"><label>Objectif hebdo (km)</label><input type="number" id="subObjectiveKm" min={0} step={1} placeholder="60" /></div>
                </div>
                <div className="form-actions"><span /><div className="right"><button className="btn primary" id="btnAddSub">Ajouter le sous-cycle</button></div></div>
                <div className="subcycle-list" id="subList" />
              </div>
              <div className="panel">
                <h3 className="block-title">Diviser un sous-cycle (sous-sous-cycles)</h3>
                <div className="edit-mode-hint" id="subsubEditHint">Modification en cours — <a href="#" id="cancelSubSubEdit" style={{ color: "#92650a" }}>annuler</a></div>
                <div className="form-grid c3">
                  <div className="field"><label>Sous-cycle parent</label>
                    <div className="custom-select-wrap"><select id="subsubParentSub" className="custom-select" /><span className="custom-select-arrow"><ChevronDown /></span></div>
                  </div>
                  <div className="field"><label>Nom</label><input type="text" id="subsubName" placeholder="Ex : Semaine de charge" /></div>
                  <div className="field"><label>Durée (semaines)</label><input type="number" id="subsubWeeks" min={1} defaultValue={1} /></div>
                  <div className="field" style={{ gridColumn: "span 2" }}><label>Objectif de la semaine</label><input type="text" id="subsubObjective" placeholder="Ex : 60 km · 2 séances qualité" /></div>
                  <div className="field"><label>Objectif hebdo (km)</label><input type="number" id="subsubObjectiveKm" min={0} step={1} placeholder="60" /></div>
                  <div className="field"><label>Début</label><input type="date" id="subsubStart" /></div>
                </div>
                <div className="form-actions"><span /><div className="right"><button className="btn primary" id="btnAddSubSub">Ajouter</button></div></div>
                <div className="subcycle-list" id="subSubList" />
              </div>
            </div>
          </section>

          {/* Statistiques */}
          <section className="view" id="view-statistiques">
            <div className="view-head"><div><h1>Statistiques</h1><div className="sub">Graphiques &amp; analyse</div></div></div>
            <div className="sport-thumbs" id="sportThumbs" />
            <div className="panel">
              <div className="filters">
                <div className="custom-select-wrap">
                  <select id="statsSportFilter" className="custom-select"><option value="all">Tous les sports</option></select>
                  <span className="custom-select-arrow"><ChevronDown /></span>
                </div>
                <div className="custom-select-wrap">
                  <select id="statsCycleFilter" className="custom-select"><option value="all">Tous les cycles</option></select>
                  <span className="custom-select-arrow"><ChevronDown /></span>
                </div>
              </div>
              <h3 className="block-title" id="statsKmDenivTitle">Distance &amp; dénivelé par semaine</h3>
              <div className="chart-stats" id="statsKmDenivStats" />
              <div className="chart-box"><canvas id="chartCycleKmDeniv" /></div>
            </div>
            <div className="panel">
              <div className="filters">
                <div className="custom-select-wrap">
                  <select id="statsTimePeriod" className="custom-select" defaultValue="12">
                    <option value="4">4 dernières semaines</option>
                    <option value="12">12 dernières semaines</option>
                    <option value="52">Année</option>
                  </select>
                  <span className="custom-select-arrow"><ChevronDown /></span>
                </div>
              </div>
              <h3 className="block-title">Temps d'entraînement par semaine</h3>
              <div className="chart-stats" id="statsTimeStats" />
              <div className="chart-box"><canvas id="chartTime" /></div>
            </div>
            <div className="grid cols-2">
              <div className="panel"><h3 className="block-title">Charge d'entraînement par semaine</h3><div className="chart-stats" id="statsLoadStats" /><div className="chart-box"><canvas id="chartLoad" /></div></div>
              <div className="panel"><h3 className="block-title" title="Ressenti de l'effort, moyenne par semaine">RPE moyen par semaine</h3><div className="chart-stats" id="statsRpeStats" /><div className="chart-box"><canvas id="chartRpe" /></div></div>
              <div className="panel"><h3 className="block-title">Plaisir ressenti par semaine (/10)</h3><div className="chart-stats" id="statsPlaisirStats" /><div className="chart-box"><canvas id="chartPlaisir" /></div></div>
              <div className="panel"><h3 className="block-title">Répartition du volume par sport (heures)</h3><div className="chart-box"><canvas id="chartBySport" /></div></div>
            </div>
            <div className="panel">
              <div className="week-panel-head">
                <h3 className="block-title" style={{ margin: 0 }}>Répartition par intensité</h3>
                <div className="badges">
                  <div className="custom-select-wrap">
                    <select id="statsIntensityMode" className="custom-select">
                      <option value="stack">Km par semaine</option>
                      <option value="pct">Pourcentage par semaine</option>
                    </select>
                    <span className="custom-select-arrow"><ChevronDown /></span>
                  </div>
                </div>
              </div>
              <div className="chart-stats" id="statsIntensityStats">Cliquez une barre pour le détail de la semaine.</div>
              <div className="chart-box"><canvas id="chartIntensityStats" /></div>
            </div>
          </section>

          {/* Séances réalisées */}
          <section className="view" id="view-realisees">
            <div className="view-head"><div><h1>Séances réalisées</h1><div className="sub">Journal &amp; calendrier</div></div></div>
            <div className="panel">
              <div className="week-panel-head">
                <h3 className="block-title" style={{ margin: 0 }}>Calendrier des séances</h3>
                <div className="badges">
                  <button className="btn primary small" id="btnLogUnplanned">+ Séance non planifiée</button>
                  <div className="month-nav">
                    <button id="doneMonthPrev">‹</button>
                    <span className="month-label" id="doneMonthLabel" />
                    <button id="doneMonthNext">›</button>
                  </div>
                </div>
              </div>
              <div className="weekday-row"><span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span></div>
              <div className="month-grid" id="doneMonthGrid" />
              <div className="legend-row">
                <span><i className="legend-sw done" />Réalisée</span>
                <span><i className="legend-sw planned" />Planifiée</span>
                <span><i className="legend-sw cycle" />Barre du haut = cycle du jour</span>
              </div>
            </div>
            <div className="panel">
              <h3 className="block-title">Historique par sport</h3>
              <div className="chip-row" id="sportChipRow" />
              <div className="filters">
                <div className="custom-select-wrap">
                  <select id="realSportFilter" className="custom-select" style={{ display: "none" }}><option value="all">Tous les sports</option></select>
                  <span className="custom-select-arrow" style={{ display: "none" }}><ChevronDown /></span>
                </div>
                <div className="custom-select-wrap">
                  <select id="realPeriodFilter" className="custom-select" defaultValue="all">
                    <option value="30">30 derniers jours</option>
                    <option value="90">90 derniers jours</option>
                    <option value="all">Tout l'historique</option>
                  </select>
                  <span className="custom-select-arrow"><ChevronDown /></span>
                </div>
              </div>
              <div className="list" id="realiseesList" />
            </div>
          </section>

          {/* Paramètres */}
          <section className="view" id="view-parametres">
            <div className="view-head"><div><h1>Paramètres</h1><div className="sub">Données fixes</div></div></div>
            <details className="panel" open>
              <summary>Profil</summary>
              <div className="details-body">
                <div className="form-grid">
                  <div className="field"><label>Prénom</label><input type="text" id="pFirstName" /></div>
                  <div className="field"><label>Nom</label><input type="text" id="pLastName" /></div>
                  <div className="field"><label>Âge</label><input type="number" id="pAge" min={0} /></div>
                  <div className="field"><label>Taille (cm)</label><input type="number" id="pHeight" min={0} /></div>
                  <div className="field"><label>Poids (kg)</label><input type="number" id="pWeight" min={0} step="0.1" /></div>
                  <div className="field"><label title="Vitesse Maximale Aérobie">VMA (km/h)</label><input type="number" id="pVma" min={0} step="0.1" /></div>
                  <div className="field"><label>FC max (bpm)</label><input type="number" id="pHrMax" min={0} /></div>
                  <div className="field"><label>FC repos (bpm)</label><input type="number" id="pHrRest" min={0} /></div>
                  <div className="field"><label>Objectif hebdomadaire (heures)</label><input type="number" id="pWeeklyTarget" min={0} step="0.5" /></div>
                  <div className="field"><label>Objectif hebdomadaire (km)</label><input type="number" id="pWeeklyTargetKm" min={0} step={1} /></div>
                </div>
                <div className="form-actions"><span /><div className="right"><button className="btn primary" id="btnSaveProfile">Enregistrer</button></div></div>
                <div className="section-sep">Repères VMA (calculés)</div>
                <table className="zones-table"><thead><tr><th>% VMA</th><th>Vitesse</th><th>Allure</th></tr></thead><tbody id="vmaBody" /></table>
              </div>
            </details>
            <details className="panel">
              <summary title="Zones de fréquence cardiaque utilisées pour analyser vos séances">5 zones cardio</summary>
              <div className="details-body">
                <table className="zones-table">
                  <thead><tr><th>Zone</th><th>Min (bpm)</th><th>Max (bpm)</th></tr></thead>
                  <tbody id="zonesBody" />
                </table>
                <div className="form-actions">
                  <button className="btn" id="btnRecalcZones">Recalculer depuis FC max</button>
                  <div className="right"><button className="btn primary" id="btnSaveZones">Enregistrer les zones</button></div>
                </div>
              </div>
            </details>
            <details className="panel">
              <summary>Sports</summary>
              <div className="details-body">
                <div className="list" id="sportsList" style={{ marginBottom: 12 }} />
                <div className="form-grid" style={{ gridTemplateColumns: "1fr auto" }}>
                  <div className="field"><label>Nouveau sport</label><input type="text" id="newSportName" /></div>
                  <div className="field"><label>&nbsp;</label><button className="btn" id="btnAddSport">Ajouter</button></div>
                </div>
              </div>
            </details>
            <details className="panel">
              <summary>Types de séances</summary>
              <div className="details-body">
                <div className="list" id="sessionTypesList" style={{ marginBottom: 12 }} />
                <div className="form-grid" style={{ gridTemplateColumns: "1fr auto" }}>
                  <div className="field"><label>Nouveau type</label><input type="text" id="newSessionType" /></div>
                  <div className="field"><label>&nbsp;</label><button className="btn" id="btnAddSessionType">Ajouter</button></div>
                </div>
              </div>
            </details>
            <details className="panel">
              <summary>Noms de cycles personnalisés</summary>
              <div className="details-body">
                <div className="list" id="cycleNamesList" style={{ marginBottom: 12 }} />
                <div className="form-grid" style={{ gridTemplateColumns: "1fr auto" }}>
                  <div className="field"><label>Nouveau nom</label><input type="text" id="newCycleName" /></div>
                  <div className="field"><label>&nbsp;</label><button className="btn" id="btnAddCycleName">Ajouter</button></div>
                </div>
              </div>
            </details>
            <details className="panel">
              <summary>Bibliothèque de séances</summary>
              <div className="details-body"><div className="list" id="templatesList" /></div>
            </details>
          </section>

          {/* COROS */}
          <section className="view" id="view-strava">
            <div className="view-head">
              <div><h1>COROS</h1><div className="sub">Activités COROS synchronisées en temps réel</div></div>
              <div className="badges">
                <span className="live-dot" id="stravaLive" role="status" aria-live="polite"><i aria-hidden="true" /><span id="stravaLiveLabel">Hors ligne</span></span>
              </div>
            </div>
            <div className="panel strava-connect" id="stravaConnectPanel">
              <div className="right" id="stravaConnectedBar" style={{ display: "none" }}>
                <div>
                  <h3 className="block-title" style={{ margin: 0 }}>Compte COROS</h3>
                  <div className="sub" id="stravaAccount">Non connecté</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button className="btn ghost" id="btnStravaDisconnect">Déconnecter</button>
                  <button className="btn" id="btnStravaRefresh">Actualiser</button>
                </div>
              </div>
              <form className="coros-login" id="corosLoginForm">
                <div className="coros-login-fields">
                  <div className="coros-login-field">
                    <label htmlFor="corosEmail">E-mail COROS</label>
                    <input type="email" id="corosEmail" name="email" autoComplete="username" required placeholder="ton.email@exemple.com" />
                  </div>
                  <div className="coros-login-field">
                    <label htmlFor="corosPassword">Mot de passe COROS</label>
                    <input type="password" id="corosPassword" name="password" autoComplete="current-password" required placeholder="••••••••" />
                  </div>
                </div>
                <div className="coros-login-actions">
                  <button type="submit" className="btn primary" id="btnCorosLogin">Se connecter</button>
                </div>
                <div className="coros-login-note">
                  Connecte-toi avec ton compte COROS (l'app COROS / Training Hub).
                  Le mot de passe n'est utilisé qu'une fois pour obtenir un accès — il n'est jamais stocké.
                </div>
              </form>
            </div>
            <div className="panel" style={{ marginBottom: 16 }}>
              <h3 className="block-title" style={{ marginTop: 0 }}>Comment ça marche</h3>
              <div className="sub">
                COROS est connecté avec ton compte&nbsp;: les activités sont
                importées automatiquement et mises à jour en direct, sans aucune autre manipulation.
              </div>
            </div>
            <div className="grid cols-4" id="stravaKpis" style={{ marginBottom: 16 }} />
            <div className="activity-grid" id="stravaActivities" />
          </section>
        </main>
      </div>

      {/* Modale séance */}
      <div className="modal-overlay sess-modal-overlay" id="sessModalOverlay">
        <div className="sess-modal">
          <div className="sess-modal-head">
            <div className="sess-modal-head-left">
              <div className="sess-modal-icon" id="sessModalIcon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="13 2 6 14 10 14 11 22 18 10 14 10 13 2" /></svg>
              </div>
              <div>
                <div className="sess-modal-title" id="sessModalTitle">Nouvelle séance</div>
                <div className="sess-modal-sub" id="sessModalSub">COROS · Synchronisation activée</div>
              </div>
            </div>
            <button className="sess-modal-close" id="sessModalCancel" type="button" aria-label="Fermer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <form id="sessForm" autoComplete="off">
            <input type="hidden" name="id" />
            <div className="sess-modal-body">
              <div className="sess-status-tabs">
                <button type="button" className="sess-tab active" data-status="planned">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  Planifiée
                </button>
                <button type="button" className="sess-tab" data-status="done">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  Réalisée
                </button>
              </div>
              <select name="status" id="sessStatus" style={{ display: "none" }}><option value="planned">Planifiée</option><option value="done">Réalisée</option></select>
              <div className="sess-lib-row" id="templateLoadRow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ flexShrink: 0, color: "var(--text-muted,#94a3b8)" }}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                <div className="custom-select-wrap" style={{ flex: 1 }}>
                  <select id="templateLoadSelect" className="custom-select"><option value="">Charger un modèle de bibliothèque…</option></select>
                  <span className="custom-select-arrow"><ChevronDown /></span>
                </div>
              </div>
              <div className="sess-sep"><span>Informations</span></div>
              <div className="form-grid">
                <div className="field"><label>Date</label><input type="date" name="date" required /></div>
                <div className="field"><label>Nom de la séance</label><input type="text" name="sessName" placeholder="Ex : Fractionné 10×400m" id="sessName" /></div>
                <div className="field"><label>Sport</label>
                  <div className="custom-select-wrap"><select name="sport" id="sessSport" className="custom-select" required /><span className="custom-select-arrow"><ChevronDown /></span></div>
                </div>
                <div className="field"><label>Type de séance</label>
                  <div className="custom-select-wrap"><select name="sessionType" id="sessType" className="custom-select" /><span className="custom-select-arrow"><ChevronDown /></span></div>
                </div>
                <div className="field" style={{ gridColumn: "span 2" }}><label>Objectif</label><input type="text" name="objective" placeholder="Ex : Travail VMA, endurance fondamentale…" /></div>
                <div className="field" style={{ gridColumn: "span 2" }}><label>Description / détail</label><textarea name="detail" placeholder="Ex : 10×400m R2', 3 séries de 10 squats, sortie Z2 60min…" style={{ minHeight: 72 }} /></div>
              </div>
              <div className="sess-sep" data-group="planned"><span>Prévision</span></div>
              <div className="form-grid" data-group="planned">
                <div className="field">
                  <label>Durée prévue (min)</label>
                  <div className="sess-spinner-wrap">
                    <button type="button" className="sess-spin-btn" data-target="durationPlanned" data-delta="-5">−</button>
                    <input type="number" name="durationPlanned" className="sess-spin-input" min={5} max={600} step={5} placeholder="60" />
                    <span className="sess-spin-unit">min</span>
                    <button type="button" className="sess-spin-btn" data-target="durationPlanned" data-delta="5">+</button>
                  </div>
                </div>
              </div>
              <div className="sess-sep" data-group="done"><span>Données réelles</span></div>
              <div className="form-grid c3" data-group="done">
                <div className="field">
                  <label>Durée (min)</label>
                  <div className="sess-spinner-wrap">
                    <button type="button" className="sess-spin-btn" data-target="duration" data-delta="-5">−</button>
                    <input type="number" name="duration" className="sess-spin-input" min={0} max={600} step={5} />
                    <span className="sess-spin-unit">min</span>
                    <button type="button" className="sess-spin-btn" data-target="duration" data-delta="5">+</button>
                  </div>
                  <span className="hint" id="durationDeltaHint" />
                </div>
                <div className="field">
                  <label>FC moyenne (bpm)</label>
                  <div className="sess-spinner-wrap">
                    <button type="button" className="sess-spin-btn" data-target="bpmAvg" data-delta="-1">−</button>
                    <input type="number" name="bpmAvg" className="sess-spin-input" min={60} max={220} />
                    <span className="sess-spin-unit">bpm</span>
                    <button type="button" className="sess-spin-btn" data-target="bpmAvg" data-delta="1">+</button>
                  </div>
                  <span className="hint" id="bpmZoneHint" />
                </div>
                <div className="field">
                  <label>Charge (TSS)</label>
                  <div className="sess-spinner-wrap">
                    <button type="button" className="sess-spin-btn" data-target="charge" data-delta="-5">−</button>
                    <input type="number" name="charge" className="sess-spin-input" min={0} max={500} step={5} />
                    <span className="sess-spin-unit">tss</span>
                    <button type="button" className="sess-spin-btn" data-target="charge" data-delta="5">+</button>
                  </div>
                </div>
              </div>
              <div className="form-grid" data-group="done">
                <div className="field">
                  <label>RPE — effort ressenti <span className="sess-slider-val" id="rpeVal">–</span></label>
                  <div className="sess-slider-wrap">
                    <span className="sess-slider-edge">Facile</span>
                    <input type="range" name="rpe" min={1} max={10} step={1} defaultValue={5} className="sess-slider" id="rpeSlider" />
                    <span className="sess-slider-edge">Max</span>
                  </div>
                  <div className="sess-slider-scale"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span></div>
                </div>
                <div className="field">
                  <label>Plaisir ressenti <span className="sess-slider-val" id="plaisirVal">–</span></label>
                  <div className="sess-slider-wrap">
                    <span className="sess-slider-edge">😐</span>
                    <input type="range" name="plaisir" min={1} max={10} step={1} defaultValue={7} className="sess-slider" id="plaisirSlider" />
                    <span className="sess-slider-edge">😁</span>
                  </div>
                  <div className="sess-slider-scale"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span></div>
                </div>
              </div>
              <div className="sess-sep" data-group="done" id="sportFieldsLabel" style={{ display: "none" }}><span>Données sport</span></div>
              <div className="form-grid c3" data-group="done" id="sportSpecificFields" />
              <div className="sess-pace-box" id="sessPaceBox" data-group="done" style={{ display: "none" }}>
                <span className="pace-label" id="sessPaceLabel">Allure calculée</span>
                <span className="pace-value" id="sessPaceValue">—</span>
              </div>
              <div id="sessIntensityWrap" style={{ display: "none" }}>
                <div className="sess-sep"><span>Détail par intensité</span></div>
                <div className="sess-intensity-head">
                  <button type="button" className="btn small" id="btnToggleSegments">＋ Détailler la séance</button>
                  <span className="hint" id="segTotalHint" />
                </div>
                <div className="sess-segments" id="sessSegments" style={{ display: "none" }} />
              </div>
              <div className="sess-sep"><span>Bibliothèque</span></div>
              <div className="form-grid">
                <div className="field" style={{ gridColumn: "span 2", flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                    <label>Enregistrer comme modèle</label>
                    <input type="text" id="templateSaveName" placeholder="Ex : Fractionné 10×400" />
                  </div>
                  <button type="button" className="btn" id="btnSaveTemplate" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>Sauvegarder</button>
                </div>
              </div>
              <div className="sess-sync-banner" id="sessSyncBanner">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><polyline points="13 2 6 14 10 14 11 22 18 10 14 10 13 2" /></svg>
                <span id="sessSyncMsg">La séance sera synchronisée sur COROS</span>
              </div>
            </div>
            <div className="sess-modal-foot">
              <button type="button" className="sess-btn-del" id="btnDeleteSess" style={{ display: "none" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M9 6V4h6v2" /></svg>
                Supprimer
              </button>
              <div className="sess-foot-right">
                <button type="button" className="sess-btn-cancel" id="sessModalCancelBtn">Annuler</button>
                <button type="submit" className="sess-btn-save" id="sessBtnSave">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                  <span id="sessBtnSaveTxt">Enregistrer</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="toast" id="toast" role="status" aria-live="polite">Enregistré</div>

      {/* Modale groupes de sports */}
      <div className="modal-overlay" id="groupsOverlay">
        <div className="modal-card">
          <div className="modal-head"><h3>Groupes de sports</h3><button className="modal-close" id="groupsClose">✕</button></div>
          <div className="modal-body">
            <p className="modal-hint">Regroupez autant de sports que vous voulez : leurs distances et D+ sont cumulés dans une seule carte du tableau de bord.</p>
            <div id="groupsList" />
            <div className="group-create">
              <input type="text" id="newGroupName" placeholder="Nom du groupe (ex : Running)" />
              <button className="btn primary small" id="btnCreateGroup">Créer le groupe</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modale infos cycle */}
      <div className="modal-overlay" id="tlInfoOverlay">
        <div className="modal-card">
          <div className="modal-head"><h3 id="tlInfoTitle">Cycle</h3><button className="modal-close" id="tlInfoClose">✕</button></div>
          <div className="modal-body" id="tlInfoBody" />
        </div>
      </div>
    </>
  );
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10">
      <polyline points="2 4 6 8 10 4" />
    </svg>
  );
}
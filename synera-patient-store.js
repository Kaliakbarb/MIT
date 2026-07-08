(function () {
  'use strict';

  var PATIENTS_STORAGE_KEY = 'vortexPatients';
  var SELECTED_PATIENT_KEY = 'vortexSelectedPatientId';
  var PATIENTS_UPDATED_KEY = 'bolPatientsUpdatedAt';

  function defaultPatients() {
    return [
      { uid: '1', id: '001', name: 'Айжан К.', age: 34, sex: 'Ж', diagnosis: 'Ишемическая болезнь сердца', lastAnalysisDate: '15.12.2024', riskLevel: 'high', riskLabel: 'Высокий', riskPercentage: 72, analyses: [] },
      { uid: '2', id: '002', name: 'Марат С.', age: 45, sex: 'М', diagnosis: 'Артериальная гипертензия', lastAnalysisDate: '14.12.2024', riskLevel: 'medium', riskLabel: 'Средний', riskPercentage: 45, analyses: [] },
      { uid: '3', id: '003', name: 'Жанар А.', age: 28, sex: 'Ж', diagnosis: 'Аритмия', lastAnalysisDate: '13.12.2024', riskLevel: 'low', riskLabel: 'Низкий', riskPercentage: 25, analyses: [] },
      { uid: '4', id: '004', name: 'Данияр Б.', age: 52, sex: 'М', diagnosis: 'Клапанный порок', lastAnalysisDate: '12.12.2024', riskLevel: 'high', riskLabel: 'Высокий', riskPercentage: 85, analyses: [] },
      { uid: '5', id: '005', name: 'Салтанат Р.', age: 38, sex: 'Ж', diagnosis: 'Миокардит', lastAnalysisDate: '11.12.2024', riskLevel: 'medium', riskLabel: 'Средний', riskPercentage: 55, analyses: [] },
      { uid: '6', id: '006', name: 'Асылбек Н.', age: 41, sex: 'М', diagnosis: 'Гипертрофия левого желудочка', lastAnalysisDate: '10.12.2024', riskLevel: 'high', riskLabel: 'Высокий', riskPercentage: 78, analyses: [] },
      { uid: '7', id: '007', name: 'Камила Т.', age: 29, sex: 'Ж', diagnosis: 'Сердечная недостаточность', lastAnalysisDate: '09.12.2024', riskLevel: 'high', riskLabel: 'Высокий', riskPercentage: 90, analyses: [] },
      { uid: '8', id: '008', name: 'Ерлан У.', age: 35, sex: 'М', diagnosis: 'Тахикардия', lastAnalysisDate: '08.12.2024', riskLevel: 'low', riskLabel: 'Низкий', riskPercentage: 30, analyses: [] }
    ];
  }

  function getAnalysisTime(analysis) {
    var parsed = new Date((analysis && (analysis.timestamp || analysis.date)) || 0);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  function riskLabel(level) {
    return { high: 'Высокий', medium: 'Средний', elevated: 'Средний', low: 'Низкий' }[level] || 'Низкий';
  }

  function normalizePatient(patient, index) {
    var uid = String(patient.uid || patient.id || 'patient-' + ((index || 0) + 1));
    var id = String(patient.id || patient.uid || String((index || 0) + 1).padStart(3, '0'));
    var analyses = Array.isArray(patient.analyses) ? patient.analyses.slice() : [];
    analyses.sort(function (a, b) { return getAnalysisTime(b) - getAnalysisTime(a); });
    var latest = analyses[0] || {};
    var organReports = patient.organReports && typeof patient.organReports === 'object' ? patient.organReports : {};
    var level = latest.riskLevel || patient.riskLevel || 'low';
    return Object.assign({}, patient, {
      uid: uid,
      id: id,
      analyses: analyses,
      organReports: organReports,
      diagnosis: latest.diagnosis || patient.diagnosis || 'Нет заключения',
      lastAnalysisDate: latest.date || patient.lastAnalysisDate || 'Нет анализа',
      riskLevel: level,
      riskLabel: latest.riskLabel || patient.riskLabel || riskLabel(level),
      riskPercentage: latest.riskPercentage || patient.riskPercentage || Math.round(Number(latest.confidence) || 0)
    });
  }

  function loadPatients() {
    try {
      var stored = JSON.parse(localStorage.getItem(PATIENTS_STORAGE_KEY) || '[]');
      if (Array.isArray(stored) && stored.length) {
        var normalized = stored.map(normalizePatient);
        localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(normalized));
        return normalized;
      }
    } catch (error) {
      console.warn('Unable to load SYNERA patients', error);
    }
    var defaults = defaultPatients().map(normalizePatient);
    localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  }

  function savePatients(patients) {
    localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify((patients || []).map(normalizePatient)));
    localStorage.setItem(PATIENTS_UPDATED_KEY, String(Date.now()));
  }

  function getSelectedPatientId() {
    var patients = loadPatients();
    var selected = localStorage.getItem(SELECTED_PATIENT_KEY);
    if (patients.some(function (p) { return p.uid === selected || p.id === selected; })) return selected;
    selected = patients[0] && patients[0].uid;
    if (selected) localStorage.setItem(SELECTED_PATIENT_KEY, selected);
    return selected || '';
  }

  function setSelectedPatientId(id) {
    if (id) localStorage.setItem(SELECTED_PATIENT_KEY, String(id));
  }

  function getPatient(id) {
    var patients = loadPatients();
    var target = id || getSelectedPatientId();
    return patients.find(function (p) { return p.uid === target || p.id === target; }) || patients[0] || null;
  }

  function bandToRiskLevel(band) {
    if (band === 'high' || band === 'urgent') return 'high';
    if (band === 'elevated' || band === 'indeterminate' || band === 'medium') return 'medium';
    return 'low';
  }

  function reportRiskPct(report, fallback) {
    var risk = Number(report && report.risk);
    if (Number.isFinite(risk)) return Math.max(0, Math.min(100, Math.round(risk * 100)));
    return Math.max(0, Math.min(100, Math.round(Number(fallback) || 0)));
  }

  function appendOrganAnalysis(patientId, organ, result, options) {
    var patients = loadPatients();
    var idx = patients.findIndex(function (p) { return p.uid === patientId || p.id === patientId; });
    if (idx < 0) return null;
    var patient = patients[idx];
    var report = (result && result.organ_report) || (options && options.organ_report) || null;
    var level = bandToRiskLevel(report && report.band);
    var pct = reportRiskPct(report, result && result.confidence);
    var title = (options && options.title) || (report && report.prediction) || (result && result.prediction) || organ;
    var analysis = {
      id: organ + '-' + Date.now(),
      modality: organ,
      organ: organ,
      date: new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      timestamp: new Date().toISOString(),
      diagnosis: title,
      confidence: Number((result && result.confidence) || pct || 0),
      riskLevel: level,
      riskLabel: riskLabel(level),
      riskPercentage: pct,
      organ_report: report,
      summary: options && options.summary,
      raw: options && options.keepRaw ? result : undefined
    };
    patient.analyses = [analysis].concat(patient.analyses || []).slice(0, 20);
    patient.organReports = Object.assign({}, patient.organReports || {}, report ? {
      [organ]: Object.assign({}, report, { saved_at: analysis.timestamp })
    } : {});
    patient.diagnosis = analysis.diagnosis;
    patient.lastAnalysisDate = analysis.date;
    patient.riskLevel = analysis.riskLevel;
    patient.riskLabel = analysis.riskLabel;
    patient.riskPercentage = analysis.riskPercentage;
    patients[idx] = patient;
    savePatients(patients);
    return patient;
  }

  function latestOrganReport(patient, organ) {
    if (!patient) return null;
    if (patient.organReports && patient.organReports[organ]) return patient.organReports[organ];
    var analyses = Array.isArray(patient.analyses) ? patient.analyses : [];
    var hit = analyses.find(function (a) { return (a.organ === organ || a.modality === organ) && a.organ_report; });
    return hit ? hit.organ_report : null;
  }

  function heartReportFromAnalysis(patient) {
    var analyses = Array.isArray(patient && patient.analyses) ? patient.analyses : [];
    var hit = analyses.find(function (a) {
      return a.organ === 'heart' || a.modality === 'heart' || a.modality === 'ecg' || (!a.organ && !a.modality && a.diagnosis);
    });
    if (!hit) return null;
    var risk = Math.max(0, Math.min(1, Number(hit.riskPercentage || hit.confidence || 0) / 100));
    var band = hit.riskLevel === 'high' ? 'high' : hit.riskLevel === 'medium' ? 'elevated' : 'low';
    return {
      organ: 'heart',
      prediction: hit.diagnosis || 'ECG result',
      risk: risk,
      band: band,
      findings: [
        { name: 'ECG prediction', value: hit.diagnosis || 'ECG result', flag: band },
        { name: 'ECG risk/confidence', value: risk, flag: band }
      ],
      explanation: 'Последний ЭКГ-анализ пациента из карты SYNERA.',
      recommend_next: band === 'high' ? 'Кардиолог + повтор ЭКГ/тропонины по клиническому контексту' : 'Контроль факторов риска и плановое наблюдение',
      confidence: risk >= 0.7 ? 'high' : 'medium',
      source: 'SYNERA ECG patient record'
    };
  }

  function populatePatientSelect(select, metaNode) {
    if (!select) return null;
    var patients = loadPatients();
    var selected = getSelectedPatientId();
    select.replaceChildren.apply(select, patients.map(function (patient) {
      var opt = document.createElement('option');
      opt.value = patient.uid;
      opt.textContent = patient.name + ' · ID ' + patient.id;
      return opt;
    }));
    select.value = selected;
    var patient = getPatient(selected);
    if (metaNode && patient) {
      metaNode.textContent = 'ID ' + patient.id + ' · ' + patient.age + ' лет · ' + ((patient.analyses || []).length) + ' анализов';
    }
    return patient;
  }

  window.SyneraPatients = {
    keys: { patients: PATIENTS_STORAGE_KEY, selected: SELECTED_PATIENT_KEY, updated: PATIENTS_UPDATED_KEY },
    load: loadPatients,
    save: savePatients,
    getSelectedPatientId: getSelectedPatientId,
    setSelectedPatientId: setSelectedPatientId,
    getPatient: getPatient,
    populatePatientSelect: populatePatientSelect,
    appendOrganAnalysis: appendOrganAnalysis,
    latestOrganReport: latestOrganReport,
    heartReportFromAnalysis: heartReportFromAnalysis,
    bandToRiskLevel: bandToRiskLevel,
    riskLabel: riskLabel
  };
})();

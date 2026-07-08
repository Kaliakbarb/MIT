(function () {
  'use strict';

  var selectedPatientId = '';

  function $(id) { return document.getElementById(id); }

  function pct(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return Math.round(n * 100) + '%';
  }

  function organLabel(organ) {
    return { liver: 'Печень', eye: 'Глаз', heart: 'Сердце' }[organ] || organ;
  }

  function displayPrediction(value) {
    var text = String(value || '');
    var map = {
      diabetic_retinopathy: 'Диабетическая ретинопатия',
      glaucoma: 'Глаукома',
      cataract: 'Катаракта',
      normal: 'Норма',
      Cirrhosis: 'Цирроз',
      Fibrosis: 'Фиброз',
      Hepatitis: 'Гепатит',
      Blood_Donor: 'Без выраженного флага'
    };
    Object.keys(map).forEach(function (key) {
      text = text.replace(new RegExp(key, 'g'), map[key]);
    });
    return text || 'Есть результат';
  }

  function updatePatientContext() {
    var patient = window.SyneraPatients.populatePatientSelect($('consPatientSelect'), $('consPatientMeta'));
    selectedPatientId = (patient && patient.uid) || window.SyneraPatients.getSelectedPatientId();
    if (patient) {
      $('consPatientName').textContent = patient.name;
      $('consPatientLink').href = 'patients.html?patient=' + encodeURIComponent(patient.uid);
    }
    return patient;
  }

  function setOrganCard(organ, report) {
    var title = $(organ + 'Title');
    var meta = $(organ + 'Meta');
    var card = document.querySelector('.organ-card[data-organ="' + organ + '"]');
    if (!title || !meta || !card) return;
    if (!report) {
      card.removeAttribute('data-band');
      title.textContent = 'Нет анализа';
      meta.textContent = organ === 'liver'
        ? 'Запустите гепатологию для этого пациента.'
        : organ === 'eye'
          ? 'Загрузите fundus-снимок для этого пациента.'
          : 'Запустите ЭКГ-анализ или используйте сохранённый результат.';
      return;
    }
    card.setAttribute('data-band', report.band || 'low');
    title.textContent = displayPrediction(report.prediction || organLabel(organ));
    meta.textContent = (report.band || 'low') + ' · риск ' + pct(report.risk) + ' · ' + (report.recommend_next || report.source || '');
  }

  function collectReports(patient) {
    var liver = window.SyneraPatients.latestOrganReport(patient, 'liver');
    var eye = window.SyneraPatients.latestOrganReport(patient, 'eye');
    var heart = window.SyneraPatients.latestOrganReport(patient, 'heart') ||
      window.SyneraPatients.heartReportFromAnalysis(patient);
    setOrganCard('liver', liver);
    setOrganCard('eye', eye);
    setOrganCard('heart', heart);
    return [liver, eye, heart].filter(Boolean);
  }

  function renderEmpty(message) {
    $('consensusPill').textContent = 'нет данных';
    $('finalRecommendation').textContent = 'Недостаточно organ reports';
    $('safetyNote').textContent = message || 'Запустите анализ хотя бы по одному органу.';
    $('axisLevel').textContent = '—';
    $('axisMessage').textContent = '—';
    $('axisEvidence').replaceChildren();
    $('axisCard').removeAttribute('data-active');
  }

  function renderConsilium(out) {
    var axis = out.systemic_axis || {};
    $('consensusPill').textContent = 'consensus ' + (out.consensus_level || '—');
    $('finalRecommendation').textContent = out.final_recommendation || '—';
    $('safetyNote').textContent = out.safety_note || '';
    $('axisLevel').textContent = axis.flag ? (axis.level || 'active') : 'не выражена';
    $('axisMessage').textContent = axis.message || '—';
    $('axisCard').setAttribute('data-active', axis.flag ? 'true' : 'false');
    var items = (axis.evidence || []).map(function (row) {
      var li = document.createElement('li');
      li.textContent = displayPrediction(row);
      return li;
    });
    $('axisEvidence').replaceChildren.apply($('axisEvidence'), items);
  }

  async function runConsilium() {
    var patient = updatePatientContext();
    if (!patient) return renderEmpty('Нет выбранного пациента.');
    var reports = collectReports(patient);
    if (!reports.length) return renderEmpty('У пациента пока нет сохранённых результатов печени, глаза или сердца.');
    $('consensusPill').textContent = 'анализ';
    try {
      var response = await fetch('/consilium/multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient: patient, reports: reports })
      });
      var payload = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(payload.error || 'Не удалось собрать консилиум');
      renderConsilium(payload);
    } catch (error) {
      renderEmpty(error.message || 'Ошибка консилиума.');
    }
  }

  function syncFromQuery() {
    try {
      var target = new URLSearchParams(window.location.search).get('patient');
      if (target) window.SyneraPatients.setSelectedPatientId(target);
    } catch (e) {}
  }

  function init() {
    if (!window.SyneraPatients) return;
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
    syncFromQuery();
    updatePatientContext();
    $('consPatientSelect').addEventListener('change', function () {
      window.SyneraPatients.setSelectedPatientId(this.value);
      runConsilium();
    });
    $('runConsiliumBtn').addEventListener('click', runConsilium);
    window.addEventListener('storage', function (event) {
      if (event.key === window.SyneraPatients.keys.patients || event.key === window.SyneraPatients.keys.updated) {
        runConsilium();
      }
    });
    runConsilium();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

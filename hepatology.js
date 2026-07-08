(function () {
  'use strict';

  var DEMO = {
    age: 62,
    sex: 'm',
    ALT: 95,
    AST: 140,
    ALP: 180,
    BIL: 35,
    ALB: 30,
    GGT: 180,
    PROT: 70,
    PLT: 110,
    CHE: 4.0,
    CHOL: 3.0,
    CREA: 95
  };
  var debounceTimer = null;
  var requestSeq = 0;
  var hasRenderedResult = false;
  var selectedPatientId = '';

  function $(id) { return document.getElementById(id); }
  function fmt(value, digits) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
    return Number(value).toFixed(digits);
  }

  function readForm(form) {
    var data = {};
    Array.from(new FormData(form).entries()).forEach(function (pair) {
      var key = pair[0];
      var value = pair[1];
      if (key === 'sex') data[key] = value;
      else data[key] = value === '' ? null : Number(value);
    });
    var previous = {
      ALT: data.prev_ALT,
      GGT: data.prev_GGT,
      PLT: data.prev_PLT,
      ALB: data.prev_ALB
    };
    var hasPrevious = Object.keys(previous).some(function (key) {
      return previous[key] !== null && previous[key] !== undefined && !Number.isNaN(previous[key]);
    });
    if (hasPrevious) {
      data.history = [
        previous,
        { ALT: data.ALT, GGT: data.GGT, PLT: data.PLT, ALB: data.ALB }
      ];
    }
    return data;
  }

  function fillDemo(form) {
    Object.keys(DEMO).forEach(function (key) {
      var input = form.elements[key];
      if (input) input.value = DEMO[key];
    });
  }

  function currentPatient() {
    return window.SyneraPatients && window.SyneraPatients.getPatient(selectedPatientId);
  }

  function updatePatientContext(form) {
    if (!window.SyneraPatients) return;
    var select = $('hepPatientSelect');
    var meta = $('hepPatientMeta');
    var patient = window.SyneraPatients.populatePatientSelect(select, meta);
    selectedPatientId = (patient && patient.uid) || window.SyneraPatients.getSelectedPatientId();
    if (patient) {
      $('hepPatientName').textContent = patient.name;
      $('hepConsiliumLink').href = 'consilium.html?patient=' + encodeURIComponent(patient.uid);
      if (form && !hasRenderedResult) {
        if (form.elements.age && patient.age) form.elements.age.value = patient.age;
        if (form.elements.sex) {
          form.elements.sex.value = patient.sex === 'Ж' || patient.sex === 'female' || patient.sex === 'f' ? 'f' : 'm';
        }
      }
    }
  }

  function saveResultToPatient(result) {
    if (!window.SyneraPatients || !selectedPatientId || !result || !result.organ_report) return;
    var report = result.organ_report;
    window.SyneraPatients.appendOrganAnalysis(selectedPatientId, 'liver', result, {
      title: 'Печень: ' + (report.prediction || 'liver risk'),
      summary: result.next_action && result.next_action.priority,
      keepRaw: false
    });
    updatePatientContext($('hepForm'));
  }

  function setStatus(text, isError) {
    var node = $('hepStatus');
    if (!node) return;
    node.querySelector('span:last-child').textContent = text;
    if (isError) node.setAttribute('data-state', 'error');
    else node.removeAttribute('data-state');
  }

  function levelFromTriage(value) {
    if (value === 'СРОЧНО') return 'urgent';
    if (value === 'Планово') return 'planned';
    return 'observe';
  }

  function hvgDecision(hvg) {
    if (hvg.recommend_serology) {
      return 'Повышенный риск ХВГ — направить на HBsAg / anti-HCV';
    }
    if (hvg.band === 'high') {
      return 'Высокий лабораторный ХВГ-флаг — рассмотрите серологию';
    }
    if (hvg.band === 'elevated') {
      return 'Умеренный ХВГ-флаг — контроль и серология по клиническому контексту';
    }
    return 'Низкий лабораторный ХВГ-флаг';
  }

  function renderList(node, rows, valueKey) {
    node.innerHTML = '';
    rows.forEach(function (row) {
      var li = document.createElement('li');
      var label = row.feature || row;
      var value = typeof row === 'string' ? '' : fmt(row[valueKey || 'contribution'], 3);
      li.innerHTML = '<span></span><b></b>';
      li.querySelector('span').textContent = label;
      li.querySelector('b').textContent = value;
      node.appendChild(li);
    });
  }

  function renderSteps(node, rows) {
    node.innerHTML = '';
    rows.forEach(function (row) {
      var li = document.createElement('li');
      li.textContent = row;
      node.appendChild(li);
    });
  }

  function confidenceLabel(value) {
    if (value === 'high') return 'высокая';
    if (value === 'medium') return 'средняя';
    if (value === 'low') return 'низкая';
    return value || '-';
  }

  function renderConsilium(consilium) {
    var grid = $('consiliumExperts');
    var experts = consilium.experts || [];
    $('consensusLabel').textContent = 'consensus ' + confidenceLabel(consilium.consensus_level);
    grid.innerHTML = '';
    experts.forEach(function (expert) {
      var card = document.createElement('article');
      var evidence = Array.isArray(expert.evidence) ? expert.evidence.join(' · ') : (expert.evidence || '');
      card.innerHTML = '<span></span><strong></strong><small></small><p></p>';
      card.querySelector('span').textContent = expert.name || '-';
      card.querySelector('strong').textContent = expert.verdict || '-';
      card.querySelector('small').textContent = 'confidence: ' + confidenceLabel(expert.confidence);
      card.querySelector('p').textContent = evidence;
      grid.appendChild(card);
    });
  }

  function renderResult(result) {
    var scores = result.scores || {};
    var ml = result.ml || {};
    var hvg = result.viral_hepatitis || {};
    var rec = result.recommendation || {};
    var nextAction = result.next_action || {};
    var consilium = result.consilium || {};
    var cards = result.model_cards || {};
    var fibCard = cards.fibrosis_stage || {};
    var hvgCard = cards.viral_hepatitis || {};
    var fibMetrics = fibCard.metrics || {};
    var hvgMetrics = hvgCard.metrics || {};
    var stage = ml.predicted_stage || '-';
    var stageProb = (ml.risk_probs && ml.risk_probs[stage] !== undefined) ? ml.risk_probs[stage] : null;

    $('placeholder').hidden = true;
    $('output').hidden = false;
    $('triageBox').setAttribute('data-level', levelFromTriage(rec.triage));
    $('triageLabel').textContent = rec.triage || '-';
    $('stageLabel').textContent = stageProb === null ? stage : stage + ' · ' + Math.round(stageProb * 100) + '%';
    $('protocolText').textContent = rec.protocol_step || '-';

    $('fib4Value').textContent = fmt(scores.fib4, 2);
    $('fib4Band').textContent = scores.fib4_band || '-';
    $('apriValue').textContent = fmt(scores.apri, 2);
    $('deritisValue').textContent = fmt(scores.de_ritis, 2);
    $('hvgValue').textContent = hvg.risk === undefined ? '-' : Math.round(hvg.risk * 100) + '%';
    $('hvgBand').textContent = hvg.recommend_serology ? 'направить на HBsAg / anti-HCV' : (hvg.band || '-');
    $('hvgCard').setAttribute('data-band', hvg.band || '');
    $('hvgDecision').textContent = hvgDecision(hvg);
    $('hvgExplanation').textContent = 'Источник: ' + (hvg.source || 'rule_based') +
      '. Это screening-флаг для приоритизации серологии, не диагноз HBV/HCV.';
    $('hvgScore').textContent = hvg.risk === undefined ? '-' : Math.round(hvg.risk * 100) + '%';
    $('nextPriority').textContent = nextAction.priority || rec.triage || '-';
    renderSteps($('nextSteps'), nextAction.next_steps || []);
    var trends = nextAction.trend_signals || [];
    $('trendSignals').textContent = trends.length ? trends.join(' · ') : (nextAction.note || '-');
    renderConsilium(consilium);

    renderList($('factorList'), ml.top_factors || []);
    renderList($('reasonList'), rec.reasons || []);
    $('fibEvidence').textContent = 'CV balanced acc ' + fmt(fibMetrics.internal_5fold_balanced_acc, 3) +
      ' · NHANES fibrosis AUC ' + fmt(fibMetrics.nhanes_significant_fibrosis_auc, 3);
    $('fibLimit').textContent = (fibCard.limits || [])[0] || '';
    $('hvgEvidence').textContent = 'AUC ' + fmt(hvgMetrics.roc_auc_5fold, 3) +
      ' · temporal OOD ' + fmt(hvgMetrics.temporal_ood_auc_2015_2016, 3) +
      ' · recall ' + fmt(hvgMetrics.recall, 3);
    $('hvgLimit').textContent = (hvgCard.limits || [])[0] || '';
    $('disclaimer').textContent = result.disclaimer || '';
    $('resultPanel').classList.remove('is-stale', 'is-loading');
    hasRenderedResult = true;
  }

  async function submit(form, options) {
    options = options || {};
    var seq = ++requestSeq;
    var button = form.querySelector('button[type="submit"]');
    $('resultPanel').classList.add('is-loading');
    setStatus(options.auto ? 'Пересчёт...' : 'Анализ...', false);
    if (button) button.disabled = true;
    try {
      var response = await fetch('/analyze_liver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(readForm(form))
      });
      var payload = await response.json().catch(function () { return {}; });
      if (seq !== requestSeq) return;
      if (!response.ok) throw new Error(payload.error || 'Не удалось выполнить анализ');
      renderResult(payload);
      if (!options.auto) saveResultToPatient(payload);
      setStatus('Модуль готов', false);
    } finally {
      if (seq === requestSeq && button) button.disabled = false;
    }
  }

  function scheduleAutoSubmit(form) {
    if (!hasRenderedResult) return;
    window.clearTimeout(debounceTimer);
    $('resultPanel').classList.add('is-stale');
    setStatus('Данные изменены — пересчитываю...', false);
    debounceTimer = window.setTimeout(function () {
      submit(form, { auto: true }).catch(function (error) {
        $('resultPanel').classList.remove('is-loading');
        setStatus(error.message, true);
      });
    }, 650);
  }

  function init() {
    var form = $('hepForm');
    if (!form) return;
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
    updatePatientContext(form);
    $('hepPatientSelect').addEventListener('change', function () {
      selectedPatientId = this.value;
      window.SyneraPatients.setSelectedPatientId(selectedPatientId);
      hasRenderedResult = false;
      updatePatientContext(form);
      $('placeholder').hidden = false;
      $('output').hidden = true;
    });
    $('demoBtn').addEventListener('click', function () {
      fillDemo(form);
      submit(form).catch(function (error) {
        $('resultPanel').classList.remove('is-loading');
        setStatus(error.message, true);
      });
    });
    form.querySelectorAll('input, select').forEach(function (input) {
      input.addEventListener('input', function () { scheduleAutoSubmit(form); });
      input.addEventListener('change', function () { scheduleAutoSubmit(form); });
    });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      submit(form).catch(function (error) {
        $('resultPanel').classList.remove('is-loading');
        setStatus(error.message, true);
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

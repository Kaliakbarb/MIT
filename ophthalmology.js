(function () {
  'use strict';

  var selectedFile = null;
  var objectUrl = null;
  var selectedSampleId = '';
  var selectedPatientId = '';

  function $(id) { return document.getElementById(id); }

  function setStatus(text, state) {
    var node = $('eyeStatus');
    if (!node) return;
    node.querySelector('span:last-child').textContent = text;
    if (state) node.setAttribute('data-state', state);
    else node.removeAttribute('data-state');
  }

  function fmtPct(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
    return Math.round(Number(value) * 100) + '%';
  }

  function labelFor(value) {
    var labels = {
      cataract: 'Катаракта',
      diabetic_retinopathy: 'Диабетическая ретинопатия',
      glaucoma: 'Глаукома',
      normal: 'Норма'
    };
    return labels[value] || value || '-';
  }

  function chooseFile(file) {
    if (!file) return;
    selectedFile = file;
    $('eyeFileName').textContent = file.name;
    $('analyzeEyeBtn').disabled = false;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    $('previewImage').src = objectUrl;
    $('eyePreview').hidden = false;
  }

  function chooseManualFile(file) {
    selectedSampleId = '';
    chooseFile(file);
  }

  function updatePatientContext() {
    if (!window.SyneraPatients) return;
    var patient = window.SyneraPatients.populatePatientSelect($('eyePatientSelect'), $('eyePatientMeta'));
    selectedPatientId = (patient && patient.uid) || window.SyneraPatients.getSelectedPatientId();
    if (patient) {
      $('eyePatientName').textContent = patient.name;
      $('eyeConsiliumLink').href = 'consilium.html?patient=' + encodeURIComponent(patient.uid);
    }
  }

  function saveResultToPatient(result) {
    if (!window.SyneraPatients || !selectedPatientId || !result || !result.organ_report) return;
    var report = result.organ_report;
    window.SyneraPatients.appendOrganAnalysis(selectedPatientId, 'eye', result, {
      title: 'Глаз: ' + labelFor(report.prediction || result.prediction),
      summary: result.calibration_warning || report.recommend_next,
      keepRaw: false
    });
    updatePatientContext();
  }

  function renderProbabilities(probabilities) {
    var node = $('probList');
    node.innerHTML = '';
    Object.entries(probabilities || {}).forEach(function (entry) {
      var label = entry[0];
      var value = Number(entry[1] || 0);
      var card = document.createElement('article');
      card.className = 'eye-prob';
      card.innerHTML = '<span><em></em><b></b></span><div class="eye-prob-bar"><i></i></div>';
      card.querySelector('em').textContent = labelFor(label);
      card.querySelector('b').textContent = fmtPct(value);
      card.querySelector('i').style.setProperty('--w', Math.max(2, Math.round(value * 100)) + '%');
      node.appendChild(card);
    });
  }

  function renderFindings(report) {
    var node = $('organFindings');
    node.innerHTML = '';
    (report.findings || []).forEach(function (finding) {
      var li = document.createElement('li');
      li.innerHTML = '<span></span><b></b>';
      li.querySelector('span').textContent = finding.name || '-';
      var value = finding.value;
      li.querySelector('b').textContent = typeof value === 'number' ? fmtPct(value) : (value || '-');
      node.appendChild(li);
    });
  }

  function renderResult(result) {
    var report = result.organ_report || {};
    var band = report.band || 'low';
    var warning = $('eyeCalibrationWarning');
    $('eyePlaceholder').hidden = true;
    $('eyeOutput').hidden = false;
    if (warning) {
      if (result.calibration_warning) {
        warning.textContent = result.calibration_warning;
        warning.hidden = false;
      } else {
        warning.hidden = true;
        warning.textContent = '';
      }
    }
    $('eyeSummary').setAttribute('data-band', band);
    $('eyeBand').textContent = band;
    $('eyePrediction').textContent = labelFor(result.prediction) + ' · ' + fmtPct(result.confidence);
    $('eyeRecommendation').textContent = report.recommend_next || 'Плановый осмотр';

    if (result.saliency_png) {
      $('saliencyImage').src = result.saliency_png;
      $('saliencyBox').hidden = false;
    } else {
      $('saliencyBox').hidden = true;
    }

    renderProbabilities(result.probabilities || {});
    renderFindings(report);
    $('eyeDisclaimer').textContent = result.disclaimer || 'Скрининг, не диагноз.';
    $('eyeResultPanel').classList.remove('is-loading');
  }

  async function checkHealth() {
    try {
      var response = await fetch('/health', { cache: 'no-store' });
      var health = await response.json();
      if (health.eye_available) setStatus('Модуль готов');
      else setStatus('Eye-модель недоступна', 'error');
    } catch (error) {
      setStatus('Нет связи с сервером', 'error');
    }
  }

  async function analyze() {
    if (!selectedFile) return;
    var button = $('analyzeEyeBtn');
    var form = new FormData();
    form.append('file', selectedFile);
    form.append('saliency', $('saliencyToggle').checked ? 'true' : 'false');
    if (selectedSampleId) form.append('sample_id', selectedSampleId);
    button.disabled = true;
    $('eyeResultPanel').classList.add('is-loading');
    setStatus('Анализ...', 'loading');
    try {
      var response = await fetch('/analyze_eye', { method: 'POST', body: form });
      var payload = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(payload.error || 'Не удалось выполнить анализ');
      renderResult(payload);
      saveResultToPatient(payload);
      setStatus('Модуль готов');
    } catch (error) {
      $('eyeResultPanel').classList.remove('is-loading');
      setStatus(error.message, 'error');
      if (window.bolToast) window.bolToast.show(error.message, { kind: 'error' });
    } finally {
      button.disabled = false;
    }
  }

  function initializeSampleLoader() {
    var wrap = $('eyeSampleLoader');
    var select = $('eyeSampleSelect');
    var loadBtn = $('eyeSampleLoadBtn');
    if (!wrap || !select || !loadBtn) return;

    fetch('/eye_samples', { cache: 'no-store' }).then(function (response) {
      return response.ok ? response.json() : null;
    }).then(function (data) {
      var samples = data && Array.isArray(data.samples) ? data.samples : [];
      if (!samples.length) {
        wrap.hidden = true;
        return;
      }
      samples.forEach(function (sample) {
        var option = document.createElement('option');
        option.value = sample.id;
        option.textContent = sample.label;
        if (sample.description) option.title = sample.description;
        select.appendChild(option);
      });
    }).catch(function () {
      wrap.hidden = true;
    });

    select.addEventListener('change', function () {
      loadBtn.disabled = !select.value;
    });

    loadBtn.addEventListener('click', async function () {
      var id = select.value;
      if (!id) return;
      var originalText = loadBtn.textContent;
      var controller = new AbortController();
      var timeout = window.setTimeout(function () { controller.abort(); }, 15000);
      loadBtn.disabled = true;
      loadBtn.textContent = 'Загружаю...';
      try {
        var response = await fetch('/eye_samples/' + encodeURIComponent(id), {
          signal: controller.signal,
          cache: 'no-store'
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        var blob = await response.blob();
        var extension = blob.type && blob.type.indexOf('jpeg') !== -1 ? 'jpg' : 'png';
        var file = new File([blob], id + '.' + extension, { type: blob.type || 'image/png' });
        selectedSampleId = id;
        chooseFile(file);
        window.requestAnimationFrame(function () { analyze(); });
      } catch (error) {
        var message = error && error.name === 'AbortError'
          ? 'таймаут загрузки примера'
          : (error.message || error);
        setStatus('Не удалось загрузить пример', 'error');
        if (window.bolToast) window.bolToast.show('Не удалось загрузить пример: ' + message, { kind: 'error' });
      } finally {
        window.clearTimeout(timeout);
        loadBtn.textContent = originalText;
        loadBtn.disabled = !select.value;
      }
    });
  }

  function init() {
    var drop = $('eyeDrop');
    var input = $('eyeFile');
    if (!drop || !input) return;
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
    checkHealth();
    updatePatientContext();
    initializeSampleLoader();

    $('eyePatientSelect').addEventListener('change', function () {
      selectedPatientId = this.value;
      window.SyneraPatients.setSelectedPatientId(selectedPatientId);
      selectedFile = null;
      selectedSampleId = '';
      $('analyzeEyeBtn').disabled = true;
      $('eyeFileName').textContent = 'Файл не выбран';
      $('eyePreview').hidden = true;
      $('eyePlaceholder').hidden = false;
      $('eyeOutput').hidden = true;
      updatePatientContext();
    });

    drop.addEventListener('click', function () { input.click(); });
    drop.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        input.click();
      }
    });
    input.addEventListener('change', function (event) {
      chooseManualFile(event.target.files && event.target.files[0]);
    });
    ['dragenter', 'dragover'].forEach(function (name) {
      drop.addEventListener(name, function (event) {
        event.preventDefault();
        drop.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach(function (name) {
      drop.addEventListener(name, function (event) {
        event.preventDefault();
        drop.classList.remove('is-dragover');
      });
    });
    drop.addEventListener('drop', function (event) {
      chooseManualFile(event.dataTransfer.files && event.dataTransfer.files[0]);
    });
    $('analyzeEyeBtn').addEventListener('click', analyze);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

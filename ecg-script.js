document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const previewImage = document.getElementById('previewImage');
    const analyzeBtn = document.getElementById('analyzeBtn');
    // --- Signal mode (.npy) elements — new in this sprint ---
    const modeBtnImage = document.getElementById('modeBtnImage');
    const modeBtnSignal = document.getElementById('modeBtnSignal');
    const signalUploadArea = document.getElementById('signalUploadArea');
    const signalFileInput = document.getElementById('signalFileInput');
    const signalFileState = document.getElementById('signalFileState');
    const signalFileName = document.getElementById('signalFileName');
    const signalPreviewCard = document.getElementById('signalPreviewCard');
    const signalPreviewName = document.getElementById('signalPreviewName');
    const signalPreviewMeta = document.getElementById('signalPreviewMeta');
    const ensemblePill = document.getElementById('ensemblePill');
    const ensembleText = document.getElementById('ensembleText');
    const ensembleIcon = document.getElementById('ensembleIcon');
    const conformalCard = document.getElementById('conformalCard');
    const conformalKicker = document.getElementById('conformalKicker');
    const conformalCoverage = document.getElementById('conformalCoverage');
    const conformalLede = document.getElementById('conformalLede');
    const conformalList = document.getElementById('conformalList');
    const conformalFooter = document.getElementById('conformalFooter');
    const conformalSingleton = document.getElementById('conformalSingleton');
    const conformalSingletonText = document.getElementById('conformalSingletonText');
    // --- ECG intervals panel (clinical timing measurements @ 100 Hz) ---
    const intervalsPanel = document.getElementById('intervalsPanel');
    const intHeartRate = document.getElementById('intHeartRate');
    const intPr = document.getElementById('intPr');
    const intQrs = document.getElementById('intQrs');
    const intQt = document.getElementById('intQt');
    const intQtc = document.getElementById('intQtc');
    const intQtcTile = document.getElementById('intQtcTile');
    const intAxis = document.getElementById('intAxis');
    const intAxisLabel = document.getElementById('intAxisLabel');
    const intRhythm = document.getElementById('intRhythm');
    const intervalsNote = document.getElementById('intervalsNote');
    const loading = document.getElementById('loading');
    const loadingTitle = document.getElementById('loadingTitle');
    const loadingSteps = Array.from(document.querySelectorAll('.loading-step'));
    const placeholder = document.getElementById('placeholder');
    const resultCard = document.getElementById('resultCard');
    const resultMain = document.getElementById('resultMain');
    const resultClass = document.getElementById('resultClass');
    const resultConfidence = document.getElementById('resultConfidence');
    const resultDescription = document.getElementById('resultDescription');
    const probabilityList = document.getElementById('probabilityList');
    const confidenceRing = document.getElementById('confidenceRing');
    const confidenceProgress = document.getElementById('confidenceProgress');
    const riskRing = document.getElementById('riskRing');
    const riskProgress = document.getElementById('riskProgress');
    const riskValueEl = document.getElementById('riskValue');
    const riskBreakdown = document.getElementById('riskBreakdown');
    const gradcamFigure = document.getElementById('gradcamFigure');
    const gradcamImage = document.getElementById('gradcamImage');
    const uncertaintyPill = document.getElementById('uncertaintyPill');
    const uncertaintyText = document.getElementById('uncertaintyText');
    const uncertaintyIcon = document.getElementById('uncertaintyIcon');
    const doctorRecommendation = document.getElementById('doctorRecommendation');
    const downloadReportBtn = document.getElementById('downloadReportBtn');
    const downloadFhirBtn = document.getElementById('downloadFhirBtn');
    const fileState = document.getElementById('fileState');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const patientSelect = document.getElementById('patientSelect');
    const selectedPatientAvatar = document.getElementById('selectedPatientAvatar');
    const selectedPatientName = document.getElementById('selectedPatientName');
    const selectedPatientMeta = document.getElementById('selectedPatientMeta');

    const riskFactorsHint = document.getElementById('riskFactorsHint');
    const riskFactorsCta = document.getElementById('riskFactorsCta');
    const backToPatientBtn = document.getElementById('backToPatientBtn');

    const PATIENTS_STORAGE_KEY = 'vortexPatients';
    const SELECTED_PATIENT_KEY = 'vortexSelectedPatientId';
    const PATIENTS_UPDATED_KEY = 'bolPatientsUpdatedAt';
    const CONFIDENCE_CIRCUMFERENCE = 2 * Math.PI * 52;

    const stageLabels = {
        upload: 'Подготовка ЭКГ',
        analysis: 'Классификация ритма',
        summary: 'Формирование заключения'
    };

    const classColors = {
        'Признаки, ассоциированные с инфарктом миокарда': '#ef4444',
        'Изменения ST-T (STTC)': '#f59e0b',
        'Признаки нарушения ритма': '#fb7185',
        'Паттернов высокого риска не выявлено': '#10b981',
        'Результат неубедителен — нужен просмотр специалистом': '#94a3b8'
    };

    const riskBandColors = {
        low: '#10b981',
        medium: '#f59e0b',
        high: '#ef4444'
    };

    const riskBandLabels = {
        low: 'Низкий',
        medium: 'Средний',
        high: 'Высокий'
    };

    let selectedFile = null;
    // 'image' = legacy paper-photo flow → /predict
    // 'signal' = raw 12-lead .npy → /predict_signal (clean patient-disjoint ensemble, 69.0%)
    let currentMode = 'signal';  // unified analyser: everything routes through /predict_signal
    let lastResult = null;
    let patients = loadPatients();
    let selectedPatientId = localStorage.getItem(SELECTED_PATIENT_KEY) || patients[0]?.uid;
    let loadingTimers = [];

    initializePatients();
    initializeConfidenceMeter();
    updateRiskFactorsHint();
    initializeSampleLoader();

    function getDefaultPatients() {
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

    function loadPatients() {
        try {
            const stored = JSON.parse(localStorage.getItem(PATIENTS_STORAGE_KEY));
            if (Array.isArray(stored) && stored.length > 0) {
                const normalizedPatients = stored.map(normalizePatient);
                localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(normalizedPatients));
                return normalizedPatients;
            }
        } catch (error) {
            console.warn('Unable to load stored patients', error);
        }

        const defaults = getDefaultPatients().map(normalizePatient);
        localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(defaults));
        return defaults;
    }

    function normalizePatient(patient, index = 0) {
        const uid = String(patient.uid || patient.id || `patient-${index + 1}`);
        const id = String(patient.id || patient.uid || String(index + 1).padStart(3, '0'));
        const analyses = Array.isArray(patient.analyses) ? [...patient.analyses] : [];
        analyses.sort((a, b) => getAnalysisTime(b) - getAnalysisTime(a));

        const latestAnalysis = analyses[0];
        return {
            ...patient,
            uid,
            id,
            analyses,
            diagnosis: latestAnalysis?.diagnosis || patient.diagnosis || 'Нет заключения',
            lastAnalysisDate: latestAnalysis?.date || patient.lastAnalysisDate || 'Нет анализа',
            riskLevel: latestAnalysis?.riskLevel || patient.riskLevel || 'low',
            riskLabel: latestAnalysis?.riskLabel || patient.riskLabel || getRiskLabel(latestAnalysis?.riskLevel || patient.riskLevel || 'low'),
            riskPercentage: latestAnalysis?.riskPercentage || patient.riskPercentage || Math.round(Number(latestAnalysis?.confidence) || 0)
        };
    }

    function getRiskLabel(level) {
        return {
            high: 'Высокий',
            medium: 'Средний',
            low: 'Низкий'
        }[level] || 'Низкий';
    }

    function getAnalysisTime(analysis) {
        const dateValue = analysis?.timestamp || analysis?.date;
        const parsed = new Date(dateValue);
        return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
    }

    function savePatients() {
        localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(patients));
        localStorage.setItem(PATIENTS_UPDATED_KEY, new Date().toISOString());
    }

    function getSelectedPatient() {
        return patients.find((patient) => patient.uid === selectedPatientId || patient.id === selectedPatientId) || patients[0];
    }

    function initializePatients() {
        // Build options via the DOM so patient names (from localStorage) can't
        // inject markup — textContent escapes automatically.
        patientSelect.replaceChildren(...patients.map((patient) => {
            const opt = document.createElement('option');
            opt.value = patient.uid;
            opt.textContent = `${patient.name} · ID ${patient.id}`;
            return opt;
        }));

        if (selectedPatientId) {
            const selectedPatient = getSelectedPatient();
            selectedPatientId = selectedPatient?.uid || selectedPatientId;
            patientSelect.value = selectedPatientId;
            localStorage.setItem(SELECTED_PATIENT_KEY, selectedPatientId);
        }

        renderSelectedPatient();

        patientSelect.addEventListener('change', () => {
            selectedPatientId = patientSelect.value;
            localStorage.setItem(SELECTED_PATIENT_KEY, selectedPatientId);
            renderSelectedPatient();
            updateRiskFactorsHint();
            // Clear any pending upload so an analysis cannot be misattributed to
            // the newly-selected patient.
            selectedFile = null;
            if (analyzeBtn) analyzeBtn.disabled = true;
            if (fileInput) fileInput.value = '';
            if (signalFileInput) signalFileInput.value = '';
            if (fileName) fileName.textContent = 'Файл не выбран';
        });
    }

    // Risk factors are owned by the patients page now. We just read them off
    // the selected patient at analyze-time and surface a hint when they're
    // missing so the doctor knows to fill them in patient setup.
    function collectRiskFactors() {
        const rf = getSelectedPatient()?.riskFactors || {};
        return {
            age: rf.age ?? '',
            sex: rf.sex ?? '',
            chol: rf.chol ?? '',
            hdl: rf.hdl ?? '',
            sbp: rf.sbp ?? '',
            bpmeds: Boolean(rf.bpmeds),
            smoker: Boolean(rf.smoker),
            diabetic: Boolean(rf.diabetic),
        };
    }

    function hasUsableRiskFactors() {
        const rf = collectRiskFactors();
        return Boolean(rf.age) && Boolean(rf.sex);
    }

    function updateRiskFactorsHint() {
        const patient = getSelectedPatient();
        const patientLink = patient ? `patients.html?patient=${encodeURIComponent(patient.uid)}` : 'patients.html';
        if (riskFactorsCta) riskFactorsCta.setAttribute('href', patientLink);
        if (backToPatientBtn) backToPatientBtn.setAttribute('href', patientLink);
        if (!riskFactorsHint) return;
        riskFactorsHint.hidden = hasUsableRiskFactors();
    }

    function renderSelectedPatient() {
        const patient = getSelectedPatient();
        if (!patient) return;

        selectedPatientAvatar.textContent = patient.name.trim().charAt(0);
        selectedPatientName.textContent = patient.name;
        selectedPatientMeta.textContent = `ID ${patient.id} · ${patient.age} лет · ${patient.analyses?.length || 0} анализов`;
    }

    // === Sample loader ==========================================
    // Lets the user pick from a curated set of PTB-XL .npy records served
    // by the backend at GET /samples. Selecting one fetches the file blob
    // and pipes it into the existing signal-mode upload pipeline so the
    // analyze pathway stays identical to a real upload.
    function initializeSampleLoader() {
        const wrap = document.getElementById('sampleLoader');
        const select = document.getElementById('sampleSelect');
        const loadBtn = document.getElementById('sampleLoadBtn');
        if (!wrap || !select || !loadBtn) return;

        fetch('/samples').then(r => r.ok ? r.json() : null).then(data => {
            const samples = Array.isArray(data) ? data : (data?.samples || []);
            if (!Array.isArray(samples) || samples.length === 0) {
                wrap.hidden = true;
                return;
            }
            samples.forEach((s) => {
                if (!s || !s.id) return;
                const opt = document.createElement('option');
                opt.value = String(s.id);
                const label = s.label || s.id;
                const desc = s.description ? ` — ${s.description}` : '';
                opt.textContent = `${label}${desc}`;
                select.appendChild(opt);
            });
            wrap.dataset.populated = '1';
            // Only visible while we're already in signal mode.
            wrap.hidden = currentMode !== 'signal';
        }).catch(() => {
            wrap.hidden = true;
        });

        select.addEventListener('change', () => {
            loadBtn.disabled = !select.value;
        });

        loadBtn.addEventListener('click', async () => {
            const id = select.value;
            if (!id) return;
            loadBtn.disabled = true;
            const originalText = loadBtn.textContent;
            loadBtn.textContent = 'Загружаю…';
            const controller = new AbortController();
            const timeout = window.setTimeout(() => controller.abort(), 15000);
            try {
                const resp = await fetch('/samples/' + encodeURIComponent(id), {
                    signal: controller.signal,
                    cache: 'no-store'
                });
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                const blob = await resp.blob();
                const file = new File([blob], `${id}.npy`, { type: blob.type || 'application/octet-stream' });
                // Funnel through the existing signal-mode pipeline so all
                // downstream UI (preview card, analyze button, validation)
                // behaves exactly like a drag-and-dropped .npy.
                handleSignalFile(file);
                let resolveAnalysisWait = null;
                const done = new Promise((resolve) => {
                    resolveAnalysisWait = resolve;
                    window.addEventListener('synera:ecg-analysis-done', resolve, { once: true });
                });
                // Defer click so the preview card render finishes first.
                requestAnimationFrame(() => {
                    if (!analyzeBtn.disabled) analyzeBtn.click();
                    else if (resolveAnalysisWait) resolveAnalysisWait();
                });
                await Promise.race([
                    done,
                    new Promise((resolve) => window.setTimeout(resolve, 45000))
                ]);
            } catch (err) {
                const message = err && err.name === 'AbortError'
                    ? 'таймаут загрузки примера — обновите страницу и попробуйте ещё раз'
                    : (err.message || err);
                if (window.bolToast) {
                    window.bolToast.show('Не удалось загрузить пример: ' + message, { kind: 'error' });
                }
            } finally {
                window.clearTimeout(timeout);
                loadBtn.textContent = originalText;
                loadBtn.disabled = !select.value;
            }
        });
    }

    function initializeConfidenceMeter() {
        if (confidenceProgress) {
            confidenceProgress.style.strokeDasharray = CONFIDENCE_CIRCUMFERENCE;
            confidenceProgress.style.strokeDashoffset = CONFIDENCE_CIRCUMFERENCE;
        }
        if (riskProgress) {
            riskProgress.style.strokeDasharray = CONFIDENCE_CIRCUMFERENCE;
            riskProgress.style.strokeDashoffset = CONFIDENCE_CIRCUMFERENCE;
        }
    }

    function formatBytes(bytes) {
        if (!bytes) return '0 KB';
        const units = ['B', 'KB', 'MB'];
        const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
        const value = bytes / Math.pow(1024, exponent);
        return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
    }

    function setAnalysisStage(stage) {
        loadingTitle.textContent = stageLabels[stage];
        loadingSteps.forEach((step) => {
            step.classList.toggle('active', step.dataset.stage === stage);
            step.classList.toggle('complete', Object.keys(stageLabels).indexOf(step.dataset.stage) < Object.keys(stageLabels).indexOf(stage));
        });
    }

    function scheduleLoadingStages() {
        loadingTimers.forEach((timer) => clearTimeout(timer));
        loadingTimers = [
            setTimeout(() => setAnalysisStage('analysis'), 550),
            setTimeout(() => setAnalysisStage('summary'), 1500)
        ];
    }

    function resetResultState() {
        placeholder.style.display = 'none';
        resultCard.classList.remove('active', 'fade-in');
        downloadReportBtn.disabled = true;
        if (downloadFhirBtn) downloadFhirBtn.disabled = true;
        // Hide signal-only blocks between runs so a re-analyze on image
        // mode never shows stale conformal/σ from a previous signal run.
        if (conformalCard) {
            conformalCard.hidden = true;
            conformalCard.classList.remove('is-abstain');
        }
        if (conformalSingleton) conformalSingleton.hidden = true;
        if (intervalsPanel) intervalsPanel.hidden = true;
        if (ensemblePill) {
            ensemblePill.hidden = true;
            ensemblePill.classList.remove('is-low', 'is-medium', 'is-high');
        }
    }

    function formatAnalysisDate(date = new Date()) {
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    function getRiskFromResult(result) {
        const risk = result.risk;
        if (risk && Number.isFinite(Number(risk.ten_year_risk_pct))) {
            const pct = Math.round(Number(risk.ten_year_risk_pct));
            const level = risk.band === 'high'
                ? 'high'
                : (risk.band === 'medium' ? 'medium' : 'low');
            return {
                level,
                label: riskBandLabels[risk.band] || 'Низкий',
                percentage: pct
            };
        }

        // No risk factors provided — fall back to a confidence-driven heuristic
        // for the patient-list ribbon, but never escalate without evidence.
        const pattern = (result.display_name || '').toLowerCase();
        const confidence = Number(result.confidence) || 0;
        if (pattern.includes('не выявлено')) {
            return { level: 'low', label: 'Низкий', percentage: Math.max(8, Math.round(100 - confidence)) };
        }
        if (pattern.includes('инфаркт') && confidence >= 70) {
            return { level: 'high', label: 'Высокий', percentage: Math.round(confidence) };
        }
        if (confidence >= 60) {
            return { level: 'medium', label: 'Средний', percentage: Math.round(confidence) };
        }
        return { level: 'low', label: 'Низкий', percentage: Math.round(confidence) };
    }

    function saveAnalysisForSelectedPatient(result) {
        const patient = getSelectedPatient();
        if (!patient) return;

        const risk = getRiskFromResult(result);
        const analysis = {
            id: `analysis-${Date.now()}`,
            modality: 'heart',
            organ: 'heart',
            date: formatAnalysisDate(),
            timestamp: new Date().toISOString(),
            diagnosis: result.display_name,
            confidence: Number(result.confidence) || 0,
            description: result.description || '',
            recommendation: result.confidence_analysis?.recommendation || '',
            probabilities: result.all_probabilities || {},
            riskLevel: risk.level,
            riskLabel: risk.label,
            riskPercentage: risk.percentage,
            survivalPct: (result.survival && result.survival.risk_pct != null) ? Number(result.survival.risk_pct) : null,
            survivalBand: (result.survival && result.survival.band) || null,
            fileName: selectedFile?.name || 'ECG image',
            organ_report: {
                organ: 'heart',
                prediction: result.display_name || 'ECG result',
                risk: risk.percentage / 100,
                band: risk.level === 'high' ? 'high' : (risk.level === 'medium' ? 'elevated' : 'low'),
                findings: [
                    { name: 'ECG prediction', value: result.display_name || 'ECG result', flag: risk.level },
                    { name: 'ECG confidence', value: (Number(result.confidence) || 0) / 100, flag: 'info' }
                ],
                explanation: 'SYNERA ECG-анализ сохранён в карте пациента.',
                recommend_next: risk.level === 'high'
                    ? 'Кардиолог + повтор ЭКГ/тропонины по клиническому контексту'
                    : 'Контроль факторов риска и плановое наблюдение',
                confidence: Number(result.confidence) >= 70 ? 'high' : 'medium',
                source: 'SYNERA ECG'
            }
        };

        // Attach the most recent multi-label disease detections (if any).
        // disease-panel.js sets window.__lastDiseaseDetection on a successful
        // /predict_disease response. We only keep codes above threshold so the
        // patient profile widget can aggregate them cleanly.
        const dz = window.__lastDiseaseDetection;
        if (dz && Array.isArray(dz.detections)) {
            analysis.diseases = dz.detections
                .filter(d => d.above_threshold)
                .map(d => ({ code: d.code, name_ru: d.name_ru, probability: d.probability }));
        }

        patient.analyses = [analysis, ...(patient.analyses || [])].slice(0, 8);
        patient.organReports = {
            ...(patient.organReports || {}),
            heart: { ...analysis.organ_report, saved_at: analysis.timestamp }
        };
        patient.diagnosis = analysis.diagnosis;
        patient.lastAnalysisDate = analysis.date;
        patient.riskLevel = analysis.riskLevel;
        patient.riskLabel = analysis.riskLabel;
        patient.riskPercentage = analysis.riskPercentage;

        savePatients();
        renderSelectedPatient();
    }

    function showPreview(file) {
        selectedFile = file;
        lastResult = null;
        const reader = new FileReader();

        reader.onload = (event) => {
            previewImage.src = event.target.result;
            previewContainer.classList.add('active');
            uploadArea.classList.add('has-file');
            fileState.classList.add('active');
            fileName.textContent = file.name;
            fileSize.textContent = formatBytes(file.size);
            analyzeBtn.disabled = false;
            placeholder.style.display = 'block';
            resultCard.classList.remove('active');
            downloadReportBtn.disabled = true;
        };

        reader.readAsDataURL(file);
    }

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            if (window.bolToast) {
                window.bolToast.show('Файл должен быть изображением (PNG, JPG, JPEG, BMP, JFIF).', { kind: 'error' });
            }
            return;
        }

        showPreview(file);
    }

    // Tell the user, in image mode, why the result is lighter: the waveform,
    // 56-disease breakdown and conformal sets all need the raw 1000x12 signal.
    function ensureModeNote(mode) {
        let note = document.getElementById('modeNote');
        if (!note) {
            const host = uploadArea || signalUploadArea;
            if (!host || !host.parentNode) return;
            note = document.createElement('p');
            note.id = 'modeNote';
            note.className = 'mode-note';
            host.parentNode.insertBefore(note, host);
        }
        if (mode === 'image') {
            note.innerHTML = '<i class="fas fa-circle-info"></i> <span><strong>Режим фото — облегчённый.</strong> '
                + 'По снимку модель даёт класс риска, прогноз и Grad-CAM. Волновая форма, '
                + '56-классовый разбор и конформные множества доступны только для сырого '
                + 'сигнала (.npy или .csv), где работает основной 1D-ансамбль.</span>';
            note.hidden = false;
        } else {
            note.hidden = true;
        }
    }

    // === Mode toggle (image ↔ signal) ============================
    // Switching modes clears any pending file selection so we don't
    // accidentally POST a JPG to /predict_signal or vice versa.
    function setMode(mode) {
        if (mode !== 'image' && mode !== 'signal') return;
        currentMode = mode;

        if (modeBtnImage && modeBtnSignal) {
            modeBtnImage.classList.toggle('is-active', mode === 'image');
            modeBtnImage.setAttribute('aria-selected', mode === 'image' ? 'true' : 'false');
            modeBtnSignal.classList.toggle('is-active', mode === 'signal');
            modeBtnSignal.setAttribute('aria-selected', mode === 'signal' ? 'true' : 'false');
        }

        // Show/hide the right drop area
        if (uploadArea) uploadArea.hidden = mode !== 'image';
        if (signalUploadArea) signalUploadArea.hidden = mode !== 'signal';

        // Explain why image mode is lighter than signal mode.
        ensureModeNote(mode);

        // Sample loader is signal-only — image mode needs raw photos.
        const sampleLoaderEl = document.getElementById('sampleLoader');
        if (sampleLoaderEl && sampleLoaderEl.dataset.populated === '1') {
            sampleLoaderEl.hidden = mode !== 'signal';
        }

        // Clear any pending selection between modes
        selectedFile = null;
        analyzeBtn.disabled = true;
        if (fileInput) fileInput.value = '';
        if (signalFileInput) signalFileInput.value = '';
        if (previewContainer) previewContainer.classList.remove('active');
        if (uploadArea) uploadArea.classList.remove('has-file');
        if (fileState) fileState.classList.remove('active');
        if (fileName) fileName.textContent = 'Файл не выбран';
        if (signalPreviewCard) signalPreviewCard.hidden = true;
        if (signalUploadArea) signalUploadArea.classList.remove('has-file');
        if (signalFileState) signalFileState.classList.remove('active');
        if (signalFileName) signalFileName.textContent = 'Файл не выбран';
    }

    if (modeBtnImage) modeBtnImage.addEventListener('click', () => setMode('image'));
    if (modeBtnSignal) modeBtnSignal.addEventListener('click', () => setMode('signal'));
    ensureModeNote(currentMode);  // show the image-mode explainer on first load

    // === Signal (.npy) drag-and-drop ============================
    function handleSignalFile(file) {
        if (!file) return;
        const lower = (file.name || '').toLowerCase();
        const okExt = ['.npy', '.csv', '.txt', '.png', '.jpg', '.jpeg', '.bmp', '.jfif']
            .some((e) => lower.endsWith(e));
        if (!okExt) {
            if (window.bolToast) {
                window.bolToast.show('Поддерживаются: фото ЭКГ (.png/.jpg), .npy или .csv.', { kind: 'error' });
            }
            return;
        }

        selectedFile = file;
        lastResult = null;

        if (signalUploadArea) signalUploadArea.classList.add('has-file');
        if (signalFileState) signalFileState.classList.add('active');
        if (signalFileName) signalFileName.textContent = file.name;

        if (signalPreviewCard) signalPreviewCard.hidden = false;
        if (signalPreviewName) signalPreviewName.textContent = file.name;
        if (signalPreviewMeta) {
            signalPreviewMeta.textContent = `${formatBytes(file.size)} · 12 отведений · 1000 отсчётов · 10 с @ 100 Гц`;
        }

        analyzeBtn.disabled = false;
        placeholder.style.display = 'block';
        resultCard.classList.remove('active');
        downloadReportBtn.disabled = true;
    }

    if (signalUploadArea) {
        signalUploadArea.addEventListener('click', () => signalFileInput && signalFileInput.click());

        signalUploadArea.addEventListener('dragover', (event) => {
            event.preventDefault();
            signalUploadArea.classList.add('dragover');
        });

        signalUploadArea.addEventListener('dragleave', () => {
            signalUploadArea.classList.remove('dragover');
        });

        signalUploadArea.addEventListener('drop', (event) => {
            event.preventDefault();
            signalUploadArea.classList.remove('dragover');
            const files = event.dataTransfer.files;
            if (files && files.length > 0) {
                handleSignalFile(files[0]);
            }
        });
    }

    if (signalFileInput) {
        signalFileInput.addEventListener('change', (event) => {
            if (event.target.files.length > 0) {
                handleSignalFile(event.target.files[0]);
            }
        });
    }

    // (Legacy image-upload drag/drop removed — the unified analyser routes every
    // input through the signal pipeline via #signalUploadArea.)

    analyzeBtn.addEventListener('click', async () => {
        if (!selectedFile) return;

        setAnalysisStage('upload');
        scheduleLoadingStages();
        loading.classList.add('active');
        resetResultState();
        analyzeBtn.disabled = true;
        analyzeBtn.classList.add('is-running');

        try {
            const rf = collectRiskFactors();
            const formData = new FormData();
            formData.append('file', selectedFile);
            Object.entries(rf).forEach(([key, value]) => {
                if (value === '' || value === false || value === undefined || value === null) return;
                formData.append(key, value === true ? '1' : String(value));
            });

            const endpoint = currentMode === 'signal' ? '/predict_signal' : '/predict';
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });

            const result = await response.json().catch(() => ({}));

            if (response.status === 422 && result.ood) {
                throw new Error(result.error || 'Изображение не похоже на ЭКГ.');
            }

            if (!response.ok || result.error) {
                throw new Error(result.error || 'Ошибка анализа');
            }

            setAnalysisStage('summary');
            displayResults(result);
        } catch (error) {
            console.error('Error:', error);
            const fallback = currentMode === 'signal'
                ? 'Ошибка при анализе сигнала: убедитесь, что .npy имеет форму (1000, 12) и что сервер Python запущен.'
                : 'Ошибка при анализе изображения: убедитесь, что сервер Python запущен на порту 5001.';
            const msg = error.message || fallback;
            if (window.bolToast) {
                window.bolToast.show(msg, { kind: 'error', timeout: 6000 });
            } else {
                alert(msg);
            }
            loading.classList.remove('active');
            placeholder.style.display = 'block';
        } finally {
            loadingTimers.forEach((timer) => clearTimeout(timer));
            analyzeBtn.disabled = false;
            analyzeBtn.classList.remove('is-running');
            window.dispatchEvent(new CustomEvent('synera:ecg-analysis-done'));
        }
    });

    downloadReportBtn.addEventListener('click', async () => {
        if (!lastResult) return;
        await downloadPdfReport(lastResult);
    });

    if (downloadFhirBtn) {
        downloadFhirBtn.addEventListener('click', async () => {
            if (!lastResult) return;
            await downloadFhirReport(lastResult);
        });
    }

    function getProbabilityEntries(result) {
        return Object.entries(result.all_probabilities || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);
    }

    function displayResults(result) {
        lastResult = result;
        loading.classList.remove('active');
        placeholder.style.display = 'none';

        // Signal-quality gate: on a degraded recording the backend returns usable=false
        // and no real prediction — show a clear "re-record" warning instead of a number.
        renderQuality(result);
        if (result.usable === false) {
            resultClass.textContent = result.display_name || 'Низкое качество сигнала';
            resultClass.style.color = '#d4a04a';
            resultConfidence.textContent = '—';
            resultDescription.textContent = result.description || '';
            if (confidenceProgress) confidenceProgress.style.strokeDashoffset = CONFIDENCE_CIRCUMFERENCE;
            try { renderRiskGauge(null); } catch (_) {}
            try { renderConformal(null); } catch (_) {}
            try { renderSurvival(null); } catch (_) {}
            try { renderEnsembleStd(undefined); } catch (_) {}
            try { renderProbabilityBars([]); } catch (_) {}
            downloadReportBtn.disabled = true;
            resultCard.classList.add('active', 'fade-in');
            return;
        }

        const confidence = Math.max(0, Math.min(100, Number(result.confidence) || 0));
        const resultColor = result.color || classColors[result.display_name] || '#2dd4bf';
        const recommendation = result.confidence_analysis?.recommendation || 'Используйте оценку как ориентир, не как диагноз.';

        resultMain.style.setProperty('--result-color', resultColor);
        confidenceRing.style.setProperty('--confidence', `${confidence}%`);
        confidenceRing.style.setProperty('--result-color', resultColor);
        if (confidenceProgress) {
            confidenceProgress.style.stroke = resultColor;
            confidenceProgress.style.strokeDashoffset = CONFIDENCE_CIRCUMFERENCE - (confidence / 100) * CONFIDENCE_CIRCUMFERENCE;
        }
        if (confidenceRing) {
            confidenceRing.setAttribute('aria-label', `Pattern confidence ${confidence.toFixed(0)} percent for ${result.display_name}`);
        }
        resultClass.textContent = result.display_name;
        resultClass.style.color = resultColor;
        resultConfidence.textContent = `${confidence.toFixed(1)}%`;
        resultDescription.textContent = result.description || 'Описание результата недоступно.';
        doctorRecommendation.textContent = recommendation;

        renderRiskGauge(result.risk);
        renderGradcam(result.gradcam_overlay);
        renderUncertainty(result.mc_dropout);
        renderEnsembleStd(result.ensemble_std_top1);
        renderConformal(result.conformal);
        renderIntervals(result.intervals);
        renderSurvival(result.survival);
        renderProbabilityBars(getProbabilityEntries(result));
        renderDigitizationNote(result);
        saveAnalysisForSelectedPatient(result);

        // Notify the LLM panel + any other listeners that we have a fresh result.
        try {
            window.dispatchEvent(new CustomEvent('bol:result-ready', {
                detail: { result, patient: getSelectedPatient() }
            }));
            // When we ran the signal pipeline, the disease panel also needs
            // the raw file so it can call /predict_disease in parallel.
            if (currentMode === 'signal' && selectedFile) {
                window.dispatchEvent(new CustomEvent('bol:signal-ready', {
                    detail: { file: selectedFile, result, patient: getSelectedPatient() }
                }));
            }
        } catch (_) { /* CustomEvent may not exist in very old browsers */ }

        downloadReportBtn.disabled = false;
        if (downloadFhirBtn) downloadFhirBtn.disabled = false;
        resultCard.classList.add('active', 'fade-in');
    }

    // Signal-quality banner — built with textContent only (never innerHTML from data).
    function renderQuality(result) {
        const host = resultCard || document.body;
        let banner = document.getElementById('qualityBanner');
        const q = result && result.quality;
        const bad = result && result.usable === false;
        const warnings = (q && Array.isArray(q.issues)) ? q.issues.filter(i => i.severity === 'warning') : [];
        if (!q || (!bad && warnings.length === 0)) { if (banner) banner.remove(); return; }
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'qualityBanner';
            host.insertBefore(banner, host.firstChild);
        }
        banner.className = 'quality-banner ' + (bad ? 'is-bad' : 'is-warn');
        banner.replaceChildren();
        const icon = document.createElement('i');
        icon.className = bad ? 'fas fa-triangle-exclamation' : 'fas fa-circle-info';
        icon.setAttribute('aria-hidden', 'true');
        const body = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = bad ? (q.verdict_ru || 'Низкое качество сигнала')
                                 : ('Замечания к качеству сигнала · score ' + (q.score != null ? q.score : '—'));
        body.appendChild(title);
        const ul = document.createElement('ul');
        (bad ? (q.issues || []).filter(i => i.severity === 'critical') : warnings).forEach(it => {
            const li = document.createElement('li');
            li.textContent = it.message_ru;
            ul.appendChild(li);
        });
        if (ul.childNodes.length) body.appendChild(ul);
        banner.appendChild(icon);
        banner.appendChild(body);
    }

    // Plain-language model-confidence labels.
    // The backend returns *epistemic uncertainty* (low/medium/high).
    // Low uncertainty = high confidence, so we invert for the UI label.
    const epistemicToConfidence = {
        low: { label: 'высокая', icon: '✓', cls: 'is-low' },
        medium: { label: 'средняя', icon: '●', cls: 'is-medium' },
        high: { label: 'низкая', icon: '⚠', cls: 'is-high' }
    };

    function renderGradcam(uri) {
        if (!gradcamFigure || !gradcamImage) return;
        if (uri && typeof uri === 'string') {
            gradcamImage.src = uri;
            gradcamFigure.hidden = false;
        } else {
            gradcamImage.removeAttribute('src');
            gradcamFigure.hidden = true;
        }
    }

    function renderUncertainty(mc) {
        if (!uncertaintyPill || !uncertaintyText) return;
        if (!mc || !mc.available) {
            uncertaintyPill.hidden = true;
            uncertaintyPill.classList.remove('is-high', 'is-medium', 'is-low');
            uncertaintyPill.removeAttribute('aria-label');
            return;
        }
        const level = mc.epistemic_uncertainty || 'low';
        const conf = epistemicToConfidence[level] || epistemicToConfidence.low;
        const stdText = `std ${Number(mc.std_top1).toFixed(3)}, n=${mc.n_samples}`;
        uncertaintyText.textContent = `Уверенность модели: ${conf.label} (${stdText})`;
        if (uncertaintyIcon) uncertaintyIcon.textContent = conf.icon;
        uncertaintyPill.hidden = false;
        uncertaintyPill.classList.remove('is-high', 'is-medium', 'is-low');
        uncertaintyPill.classList.add(conf.cls);
        uncertaintyPill.setAttribute('title', 'Self-reported model confidence (MC-dropout). Higher = the model reproduces the same answer across repeated runs.');
        uncertaintyPill.setAttribute('aria-label', `Уверенность модели: ${conf.label}`);
    }

    // Epistemic uncertainty across the 3-seed signal ensemble.
    // Only attached on /predict_signal responses — hides gracefully otherwise.
    function renderEnsembleStd(stdRaw) {
        if (!ensemblePill || !ensembleText) return;

        const value = Number(stdRaw);
        if (!Number.isFinite(value)) {
            ensemblePill.hidden = true;
            ensemblePill.classList.remove('is-low', 'is-medium', 'is-high');
            return;
        }

        let label, cls;
        if (value < 0.05) {
            label = 'очень низкая';
            cls = 'is-low';
        } else if (value < 0.10) {
            label = 'низкая';
            cls = 'is-low';
        } else if (value < 0.20) {
            label = 'средняя';
            cls = 'is-medium';
        } else {
            label = 'высокая';
            cls = 'is-high';
        }

        if (ensembleIcon) ensembleIcon.textContent = 'σ';
        ensembleText.textContent = `σ_top1: ${value.toFixed(3)} (${label}) — 3-seed ensemble agreement`;
        ensemblePill.classList.remove('is-low', 'is-medium', 'is-high');
        ensemblePill.classList.add(cls);
        ensemblePill.setAttribute('title', 'Std of the top-class probability across the 3-seed ensemble. Lower = the seeds agree → more decisive.');
        ensemblePill.setAttribute('aria-label', `Ensemble σ top1 ${value.toFixed(3)}, ${label}`);
        ensemblePill.hidden = false;
    }

    // Split-conformal prediction set with provable 90% marginal coverage.
    // - set_size === 1 → slim singleton badge
    // - set_size === 2 → full card (legitimate ambiguity)
    // - abstain (3+ classes) → amber warning card
    function renderConformal(conformal) {
        if (!conformalCard || !conformalSingleton || !conformalList) return;

        if (!conformal || !Array.isArray(conformal.members)) {
            conformalCard.hidden = true;
            conformalCard.classList.remove('is-abstain');
            conformalSingleton.hidden = true;
            return;
        }

        const members = conformal.members.filter(Boolean);
        const setSize = Number(conformal.set_size) || members.length;
        const coveragePct = Number.isFinite(Number(conformal.coverage_target_pct))
            ? `${Number(conformal.coverage_target_pct).toFixed(0)}% покрытие`
            : '90% покрытие';

        if (setSize <= 1) {
            // Singleton: show the slim badge instead of the full card
            conformalCard.hidden = true;
            conformalCard.classList.remove('is-abstain');
            if (conformalSingletonText) {
                conformalSingletonText.textContent =
                    `Singleton conformal set — модель уверена в одном диагнозе (${coveragePct})`;
            }
            conformalSingleton.hidden = false;
            return;
        }

        conformalSingleton.hidden = true;

        const abstain = conformal.abstain === true || setSize >= 3;
        conformalCard.classList.toggle('is-abstain', abstain);

        if (conformalKicker) {
            conformalKicker.textContent = abstain
                ? 'Модель воздерживается от ответа'
                : `Возможные диагнозы (${coveragePct})`;
        }
        if (conformalCoverage) conformalCoverage.textContent = coveragePct;

        if (conformalLede) {
            conformalLede.textContent = abstain
                ? 'Сет покрытия слишком широкий — модель не различает между следующими классами:'
                : 'Модель не различает между следующими классами:';
        }

        conformalList.innerHTML = '';
        members.forEach((name) => {
            const li = document.createElement('li');
            li.textContent = name;
            conformalList.appendChild(li);
        });

        if (conformalFooter) {
            const qHat = Number(conformal.q_hat);
            const qText = Number.isFinite(qHat) ? ` (q̂ = ${qHat.toFixed(3)})` : '';
            conformalFooter.textContent = abstain
                ? `Сет «не знаю»: ${setSize} классов попали в ${coveragePct} конформальный интервал${qText}. Нужен просмотр специалистом.`
                : `Это «честный» предикативный сет с конформальной гарантией ${coveragePct} истинного класса${qText}.`;
        }

        conformalCard.hidden = false;
    }

    function renderIntervals(intervals) {
        if (!intervalsPanel) return;

        // The whole dict can be null if the backend guard caught an error,
        // or every measurable metric may be null — in either case hide the panel.
        const measurable = intervals && [
            'heart_rate_bpm', 'pr_ms', 'qrs_ms', 'qt_ms', 'qtc_ms', 'axis_deg'
        ].some((k) => intervals[k] != null);
        if (!measurable) {
            intervalsPanel.hidden = true;
            return;
        }

        // Numbers print as "—" when null; integers stay clean, others round to .1
        const num = (v, digits = 0) =>
            (v == null || !Number.isFinite(Number(v))) ? '—' : Number(v).toFixed(digits);
        // PR/QRS/QT/QTc are coarse @100 Hz → prefix "≈" when present
        const approx = (v, digits = 0) => {
            const s = num(v, digits);
            return s === '—' ? '—' : `≈ ${s}`;
        };

        if (intHeartRate) intHeartRate.textContent = num(intervals.heart_rate_bpm, 1);
        if (intPr) intPr.textContent = approx(intervals.pr_ms, 0);
        if (intQrs) intQrs.textContent = approx(intervals.qrs_ms, 0);
        if (intQt) intQt.textContent = approx(intervals.qt_ms, 0);
        if (intQtc) intQtc.textContent = approx(intervals.qtc_ms, 0);

        // Axis: signed degrees + RU label
        if (intAxis) {
            const deg = intervals.axis_deg;
            if (deg == null || !Number.isFinite(Number(deg))) {
                intAxis.textContent = '—';
            } else {
                const d = Number(deg);
                intAxis.textContent = `${d > 0 ? '+' : ''}${d.toFixed(1)}°`;
            }
        }
        if (intAxisLabel) intAxisLabel.textContent = intervals.axis_label || '—';
        if (intRhythm) intRhythm.textContent = intervals.rhythm || '—';

        // Flag a prolonged QTc (Bazett) > 460 ms — semantic amber, the only color.
        if (intQtcTile) {
            const qtc = Number(intervals.qtc_ms);
            const prolonged = Number.isFinite(qtc) && qtc > 460;
            intQtcTile.classList.toggle('is-flagged', prolonged);
        }

        if (intervalsNote) {
            intervalsNote.textContent = intervals.note || '';
        }

        intervalsPanel.hidden = false;
    }

    // 12-month survival forecast (P(all-cause death <=12mo)) from the CODE-15
    // full model. Calibrated probability + honest model-card stats + caveat.
    function renderSurvival(survival) {
        const card = document.getElementById('survivalCard');
        if (!card) return;

        if (!survival || !Number.isFinite(Number(survival.risk_pct))) {
            card.hidden = true;
            return;
        }

        const pctEl = document.getElementById('survivalPct');
        const bandEl = document.getElementById('survivalBand');
        const gaugeEl = document.getElementById('survivalGauge');
        const ledeEl = document.getElementById('survivalLede');
        const cidxEl = document.getElementById('survivalCidx');
        const aurocEl = document.getElementById('survivalAuroc');
        const eceEl = document.getElementById('survivalEce');
        const noteEl = document.getElementById('survivalNote');

        const pct = Number(survival.risk_pct);
        const color = survival.color || '#3fa45b';
        if (pctEl) {
            pctEl.textContent = `${pct.toFixed(1)}%`;
            pctEl.style.color = color;
        }
        if (bandEl) {
            bandEl.textContent = survival.band_ru || '—';
            bandEl.style.color = color;
            bandEl.style.borderColor = color;
        }
        if (gaugeEl) gaugeEl.style.setProperty('--survival-color', color);
        // Fixed, dictionary-translatable sentence (avoid composing with punctuation
        // tails that the i18n composite rules can't match).
        if (ledeEl) {
            ledeEl.textContent =
                'Вероятность события (общая смертность) в течение года по данным ЭКГ.';
        }

        const fmt = (v, d = 3) => (v == null || !Number.isFinite(Number(v))) ? '—' : Number(v).toFixed(d);
        if (cidxEl) cidxEl.textContent = fmt(survival.c_index);
        if (aurocEl) aurocEl.textContent = fmt(survival.auroc_1yr);
        if (eceEl) eceEl.textContent = fmt(survival.ece);

        // Interpretive context: ratio to cohort base rate, ECG-morphology percentile, CI.
        const ratioEl = document.getElementById('survivalRatio');
        const pctlEl = document.getElementById('survivalPctl');
        const ciEl = document.getElementById('survivalCi');
        if (ratioEl) ratioEl.textContent =
            (survival.ratio_vs_base != null) ? `×${Number(survival.ratio_vs_base).toFixed(1)}` : '—';
        if (pctlEl) pctlEl.textContent =
            (survival.percentile != null) ? `${Number(survival.percentile).toFixed(0)}-й` : '—';
        if (ciEl) {
            const ci = survival.ci95;
            if (ci && Number.isFinite(Number(ci.lo)) && (Number(ci.hi) - Number(ci.lo)) >= 0.005) {
                ciEl.textContent = `95% ДИ ${(Number(ci.lo) * 100).toFixed(1)}–${(Number(ci.hi) * 100).toFixed(1)}%`;
                ciEl.hidden = false;
            } else {
                ciEl.textContent = '';
                ciEl.hidden = true;
            }
        }

        // Cumulative-risk curve over horizons.
        const curveWrap = document.getElementById('survivalCurveWrap');
        const curveEl = document.getElementById('survivalCurve');
        if (curveWrap && curveEl) {
            const svg = buildSurvivalCurve(survival.risk_curve, color);
            if (svg) { curveEl.innerHTML = svg; curveWrap.hidden = false; }
            else { curveEl.innerHTML = ''; curveWrap.hidden = true; }
        }

        // Disclaimer (translatable) + assumptions as a SEPARATE node so each
        // translates independently. Assumption text matches fixed dict keys.
        if (noteEl) noteEl.textContent = survival.disclaimer || '';
        const assumeEl = document.getElementById('survivalAssume');
        if (assumeEl) {
            let assume = '';
            if (survival.age_defaulted && survival.sex_assumed_neutral) {
                assume = 'Допущения: возраст не указан (принят 50 лет), пол не указан.';
            } else if (survival.age_defaulted) {
                assume = 'Допущения: возраст не указан (принят 50 лет).';
            } else if (survival.sex_assumed_neutral) {
                assume = 'Допущения: пол не указан.';
            }
            assumeEl.textContent = assume;
            assumeEl.hidden = !assume;
        }

        card.hidden = false;
    }

    // Cumulative-risk curve over horizons (months) → small inline SVG line chart,
    // 12-month point highlighted. Themed via CSS vars; band colour for the line.
    function buildSurvivalCurve(curve, color) {
        if (!Array.isArray(curve) || curve.length < 2) return '';
        const pts = curve
            .map(p => ({ m: Number(p.months), y: Number(p.risk_pct) }))
            .filter(p => Number.isFinite(p.m) && Number.isFinite(p.y));
        if (pts.length < 2) return '';
        const W = 460, H = 124, padL = 36, padR = 46, padT = 14, padB = 26;
        const months = pts.map(p => p.m);
        const minM = Math.min(...months), maxM = Math.max(...months);
        const maxY = Math.max(2, Math.max(...pts.map(p => p.y)) * 1.18);
        const X = m => padL + (W - padL - padR) * (m - minM) / (maxM - minM || 1);
        const Y = v => padT + (H - padT - padB) * (1 - v / maxY);
        let grid = '';
        [0, maxY / 2, maxY].forEach(gv => {
            const yy = Y(gv);
            grid += `<line x1="${padL}" y1="${yy.toFixed(1)}" x2="${W - padR}" y2="${yy.toFixed(1)}" class="sc-grid"/>`;
            grid += `<text x="${(padL - 5)}" y="${(yy + 3).toFixed(1)}" class="sc-ylab" text-anchor="end">${gv.toFixed(gv < 10 ? 1 : 0)}%</text>`;
        });
        const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.m).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
        const area = `M${X(pts[0].m).toFixed(1)},${Y(0).toFixed(1)} ` +
            pts.map(p => `L${X(p.m).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ') +
            ` L${X(pts[pts.length - 1].m).toFixed(1)},${Y(0).toFixed(1)} Z`;
        const lbl = m => m < 12 ? `${m} мес` : (m % 12 === 0 ? `${m / 12} г` : `${m} мес`);
        let dots = '', xlabs = '';
        pts.forEach(p => {
            const is12 = p.m === 12;
            dots += `<circle cx="${X(p.m).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${is12 ? 3.6 : 2.4}" fill="${color}"${is12 ? ' stroke="#fff" stroke-width="1.4"' : ''}/>`;
            xlabs += `<text x="${X(p.m).toFixed(1)}" y="${H - 9}" class="sc-xlab" text-anchor="middle">${lbl(p.m)}</text>`;
            if (is12) xlabs += `<text x="${X(p.m).toFixed(1)}" y="${(Y(p.y) - 7).toFixed(1)}" class="sc-pt" text-anchor="middle" fill="${color}">${p.y.toFixed(1)}%</text>`;
        });
        return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" width="100%">` +
            '<style>.sc-grid{stroke:var(--border,#2a2d31);stroke-width:.6}.sc-ylab,.sc-xlab{fill:var(--text-3,#8a9099);font-size:9px}.sc-pt{font-size:10px;font-weight:600}</style>' +
            grid +
            `<path d="${area}" fill="${color}" opacity="0.10"/>` +
            `<path d="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>` +
            dots + xlabs + '</svg>';
    }

    function renderRiskGauge(risk) {
        if (!riskValueEl || !riskProgress || !riskRing) return;

        if (!risk) {
            riskValueEl.textContent = '—';
            riskBreakdown.textContent = 'Заполните факторы риска для прогноза.';
            riskProgress.style.strokeDashoffset = CONFIDENCE_CIRCUMFERENCE;
            riskProgress.style.stroke = '#cbd5e1';
            riskRing.style.setProperty('--result-color', '#cbd5e1');
            riskRing.setAttribute('aria-label', '10-year risk forecast unavailable, fill in patient risk factors');
            return;
        }

        const pct = Math.max(0, Math.min(40, Number(risk.ten_year_risk_pct) || 0));
        const gaugeFraction = pct / 40;
        const color = riskBandColors[risk.band] || '#0ea5e9';
        riskValueEl.textContent = `${pct.toFixed(1)}%`;
        riskProgress.style.stroke = color;
        riskProgress.style.strokeDashoffset = CONFIDENCE_CIRCUMFERENCE - gaugeFraction * CONFIDENCE_CIRCUMFERENCE;
        riskRing.style.setProperty('--result-color', color);

        const bandLabel = riskBandLabels[risk.band] || risk.band || '—';
        riskBreakdown.textContent =
            `${bandLabel} риск. Базовая оценка по факторам пациента: ${Number(risk.baseline_pct).toFixed(1)}%. ` +
            `Множитель по ЭКГ: ×${Number(risk.ecg_multiplier).toFixed(2)}.`;
        riskRing.setAttribute('aria-label', `10-year cardiac risk ${pct.toFixed(0)} percent, ${bandLabel.toLowerCase()} band`);
    }

    function renderDigitizationNote(result) {
        let note = document.getElementById('digitNote');
        if (result && result.digitized_from_image) {
            if (!note) {
                note = document.createElement('div');
                note.id = 'digitNote';
                note.className = 'mode-note';
                note.style.borderColor = 'var(--warning-color)';
                const host = resultCard || document.body;
                host.insertBefore(note, host.firstChild);
            }
            note.innerHTML = '<i class="fas fa-flask" style="color:var(--warning-color)"></i><span><strong>Экспериментально.</strong> '
                + (result.digitization_note || 'Сигнал восстановлен из изображения.') + '</span>';
            note.hidden = false;
        } else if (note) {
            note.hidden = true;
        }
    }

    function renderProbabilityBars(entries) {
        probabilityList.innerHTML = '';

        const esc = (s) => String(s).replace(/[&<>"]/g, (c) => (
            { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
        entries.forEach(([className, probability], index) => {
            const value = Math.max(0, Math.min(100, Number(probability) || 0));
            const color = classColors[className] || ['#4f8ff2', '#6db2f7', '#f59e0b', '#ef4444'][index];
            const item = document.createElement('div');
            const safe = esc(className);

            item.className = 'probability-item fade-in';
            item.style.animationDelay = `${index * 0.08}s`;
            item.style.setProperty('--bar-color', color);
            item.setAttribute('title', `${className} — ${value.toFixed(1)}%`);
            item.innerHTML = `
                <div class="probability-label">
                    <span>${safe}</span>
                    <strong>${value.toFixed(1)}%</strong>
                </div>
                <div class="probability-bar" role="progressbar"
                     aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value.toFixed(1)}"
                     aria-label="${safe}">
                    <div class="probability-fill" style="width: ${value}%"></div>
                </div>
            `;

            probabilityList.appendChild(item);
        });
    }

    // Top-finding saliency (N×12) for the PDF tracing overlay. Only present when the
    // disease model ran with saliency enabled (DISEASE_SALIENCY_ENABLED).
    function pickTopSaliency() {
        try {
            const d = window.__syneraDisease;
            if (!d || !d.saliency) return null;
            const top = (d.top_detected && d.top_detected[0]) ||
                (d.detections && d.detections.find(x => x.above_threshold)?.code);
            const entry = top ? d.saliency['code_' + top] : null;
            return (entry && entry.data) ? { code: top, data: entry.data } : null;
        } catch (_) { return null; }
    }

    // Shared report payload — consumed by both the PDF and the FHIR export.
    function buildReportPayload(result) {
        const patient = getSelectedPatient();
        const recommendation = result.confidence_analysis?.recommendation || doctorRecommendation.textContent;
        const generatedAt = new Date().toLocaleString('ru-RU', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        return {
            patient: {
                id: patient?.id || '-', name: patient?.name || '-',
                age: patient?.age || '-', sex: patient?.sex || ''
            },
            result: {
                display_name: result.display_name || '-', description: result.description || '-',
                confidence: Number(result.confidence) || 0, recommendation
            },
            probabilities: getProbabilityEntries(result).map(([name, value]) => ({ name, value })),
            risk: result.risk || null,
            gradcam_overlay: result.gradcam_overlay || null,
            mc_dropout: result.mc_dropout || null,
            signal_preview: result.signal_preview || null,
            intervals: result.intervals || null,
            conformal: result.conformal || null,
            survival: result.survival || null,
            ensemble_std_top1: (result.ensemble_std_top1 ?? null),
            superclasses: (window.__syneraDisease && window.__syneraDisease.superclasses) || null,
            detections: (window.__syneraDisease && window.__syneraDisease.detections) || null,
            disease_model_card: (window.__syneraDisease && window.__syneraDisease.model_card) || null,
            saliency: pickTopSaliency(),
            recommendation,
            generatedAt,
            doctor_name: JSON.parse(localStorage.getItem('appConfig') || '{}').doctorName || 'Dr. A. Sadykova'
        };
    }

    async function downloadPdfReport(result) {
        const patient = getSelectedPatient();
        const originalText = downloadReportBtn.querySelector('span')?.textContent || 'Скачать PDF';
        downloadReportBtn.disabled = true;
        downloadReportBtn.classList.add('is-running');
        downloadReportBtn.querySelector('span').textContent = 'Создание PDF...';

        try {
            const response = await fetch('/report/pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildReportPayload(result))
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || 'Не удалось создать PDF');
            }

            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            downloadLink.href = downloadUrl;
            downloadLink.download = getPdfFilename(response, patient);
            document.body.appendChild(downloadLink);
            downloadLink.click();
            downloadLink.remove();
            URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('PDF download error:', error);
            const msg = error.message || 'Не удалось скачать PDF-отчёт';
            if (window.bolToast) {
                window.bolToast.show(msg, { kind: 'error' });
            } else {
                alert(msg);
            }
        } finally {
            downloadReportBtn.disabled = false;
            downloadReportBtn.classList.remove('is-running');
            downloadReportBtn.querySelector('span').textContent = originalText;
        }
    }

    function getPdfFilename(response, patient) {
        const disposition = response.headers.get('Content-Disposition') || '';
        const match = disposition.match(/filename="?([^"]+)"?/i);
        if (match?.[1]) return match[1];

        const patientId = String(patient?.id || 'patient').replace(/[^\w-]+/g, '-');
        return `SYNERA-ECG-report-${patientId}.pdf`;
    }

    // Export the analysis as a FHIR R4 DiagnosticReport bundle (JSON) for the EHR.
    async function downloadFhirReport(result) {
        const patient = getSelectedPatient();
        const span = downloadFhirBtn.querySelector('span');
        const originalText = span?.textContent || 'Экспорт FHIR';
        downloadFhirBtn.disabled = true;
        downloadFhirBtn.classList.add('is-running');
        if (span) span.textContent = 'Экспорт...';
        try {
            const response = await fetch('/report/fhir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildReportPayload(result))
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || 'Не удалось создать FHIR-экспорт');
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = (getPdfFilename(response, patient) || 'SYNERA-ECG-fhir.json')
                .replace(/\.pdf$/i, '.json');
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            if (window.bolToast) window.bolToast.show('FHIR-отчёт выгружен', { kind: 'success' });
        } catch (error) {
            console.error('FHIR export error:', error);
            const msg = error.message || 'Не удалось скачать FHIR-отчёт';
            if (window.bolToast) window.bolToast.show(msg, { kind: 'error' });
            else alert(msg);
        } finally {
            downloadFhirBtn.disabled = false;
            downloadFhirBtn.classList.remove('is-running');
            if (span) span.textContent = originalText;
        }
    }

    // populatePrintReport was removed alongside #printReport — the PDF is
     // generated server-side now.
});

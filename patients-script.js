const PATIENTS_STORAGE_KEY = 'vortexPatients';
const SELECTED_PATIENT_KEY = 'vortexSelectedPatientId';
const PATIENTS_UPDATED_KEY = 'bolPatientsUpdatedAt';

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
    const riskLevel = latestAnalysis?.riskLevel || patient.riskLevel || 'low';
    const riskPercentage = latestAnalysis?.riskPercentage || patient.riskPercentage || Math.round(Number(latestAnalysis?.confidence) || 0);

    return {
        ...patient,
        uid,
        id,
        analyses,
        diagnosis: latestAnalysis?.diagnosis || patient.diagnosis || 'Нет заключения',
        lastAnalysisDate: latestAnalysis?.date || patient.lastAnalysisDate || 'Нет анализа',
        riskLevel,
        riskLabel: latestAnalysis?.riskLabel || patient.riskLabel || getRiskLabel(riskLevel),
        riskPercentage
    };
}

function getAnalysisTime(analysis) {
    const dateValue = analysis?.timestamp || analysis?.date;
    const parsed = new Date(dateValue);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function getRiskLabel(level) {
    return {
        high: 'Высокий',
        medium: 'Средний',
        low: 'Низкий'
    }[level] || 'Низкий';
}

function renderPatientsTable() {
    const tbody = document.querySelector('.patients-table tbody');
    if (!tbody) return;

    const patients = loadPatients();
    tbody.innerHTML = patients.map((patient) => {
        const analysisCount = patient.analyses?.length || 0;
        const riskLevel = patient.riskLevel || 'low';
        const riskLabel = patient.riskLabel || getRiskLabel(riskLevel);

        return `
            <tr class="patient-row" data-patient-id="${patient.uid}">
                <td>
                    <div class="patient-info">
                        <div class="patient-avatar">${patient.name.trim().charAt(0)}</div>
                        <div class="patient-details">
                            <span class="patient-name">${patient.name}</span>
                            <span class="patient-id">ID: ${patient.id} · ${analysisCount} анализов</span>
                        </div>
                    </div>
                </td>
                <td>${patient.age}</td>
                <td>${patient.lastAnalysisDate || 'Нет анализа'}</td>
                <td>
                    <div class="latest-diagnosis-cell">
                        <strong>${patient.diagnosis || 'Нет заключения'}</strong>
                        <span>${analysisCount ? 'Последний анализ ЭКГ' : 'Демо-данные'}</span>
                    </div>
                </td>
                <td>
                    <span class="risk-level ${riskLevel}">${riskLabel}</span>
                </td>
                <td>
                    <button class="action-btn view-btn" aria-label="Открыть пациента">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function refreshPatientsPage() {
    renderPatientsTable();
    initPatientSidebar();
    initSearchFunctionality();

    const searchInput = document.querySelector('.search-input');
    if (searchInput?.value) {
        searchInput.dispatchEvent(new Event('input'));
    }

    const openSidebar = document.getElementById('patientSidebar');
    const selectedPatientId = localStorage.getItem(SELECTED_PATIENT_KEY);
    if (openSidebar?.classList.contains('open') && selectedPatientId) {
        updatePatientData(selectedPatientId);
    }
}

// Инициализация страницы пациентов
document.addEventListener('DOMContentLoaded', function() {
    renderPatientsTable();
    initPatientsPage();
    initPatientSidebar();
    initSearchFunctionality();
    initCharts();
    initAnalysisFlow();

    // Deep link: /patients.html?patient=<uid> opens that patient's sidebar.
    try {
        const params = new URLSearchParams(window.location.search);
        const target = params.get('patient');
        if (target) {
            localStorage.setItem(SELECTED_PATIENT_KEY, target);
            // openPatientSidebar is defined later in this file; defer to next tick
            // so the sidebar DOM is ready.
            requestAnimationFrame(() => openPatientSidebar(target));
        }
    } catch (e) {
        // best-effort — bad URL shouldn't break the page
    }

    window.addEventListener('pageshow', refreshPatientsPage);
    window.addEventListener('focus', refreshPatientsPage);
    window.addEventListener('storage', (event) => {
        if (event.key === PATIENTS_STORAGE_KEY || event.key === PATIENTS_UPDATED_KEY) {
            refreshPatientsPage();
        }
    });
});

// Debounced "Saved" toast for the risk-factor editor — fires after ~900 ms
// of inactivity so rapid typing doesn't spam the user.
let __riskFactorsSaveTimer = null;
function notifyRiskFactorsSaved() {
    if (!window.bolToast) return;
    if (__riskFactorsSaveTimer) clearTimeout(__riskFactorsSaveTimer);
    __riskFactorsSaveTimer = setTimeout(() => {
        window.bolToast.show('Факторы риска сохранены', { kind: 'success', timeout: 1800 });
    }, 900);
}

// Основная инициализация страницы
function initPatientsPage() {
    // Анимация появления элементов
    const elements = document.querySelectorAll('.page-header, .patients-table-container, .add-patient-section');
    elements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            element.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, index * 200);
    });
    
    // Эффекты наведения для строк таблицы
    const patientRows = document.querySelectorAll('.patient-row');
    patientRows.forEach(row => {
        row.addEventListener('mouseenter', function() {
            this.style.background = 'rgba(0, 212, 255, 0.05)';
            this.style.boxShadow = '0 4px 20px rgba(0, 212, 255, 0.1)';
        });
        
        row.addEventListener('mouseleave', function() {
            this.style.background = '';
            this.style.boxShadow = '';
        });
    });
}

// Инициализация боковой панели пациента
function initPatientSidebar() {
    if (window.__bolPatientSidebarInitialized) return;
    window.__bolPatientSidebarInitialized = true;

    const sidebar = document.getElementById('patientSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const closeBtn = document.querySelector('.close-sidebar-btn');
    const tableBody = document.querySelector('.patients-table tbody');

    tableBody?.addEventListener('click', function(event) {
        const row = event.target.closest('.patient-row');
        if (!row) return;
        openPatientSidebar(row.dataset.patientId);
    });

    // Закрытие панели
    closeBtn?.addEventListener('click', closePatientSidebar);
    overlay?.addEventListener('click', closePatientSidebar);

    // Закрытие по Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closePatientSidebar();
        }
    });

    // Risk-factor editor: persist any change back to vortexPatients
    const riskForm = document.getElementById('riskFactorsForm');
    if (riskForm) {
        riskForm.addEventListener('change', handleRiskFactorsChange);
        riskForm.addEventListener('input', handleRiskFactorsChange);
        riskForm.addEventListener('submit', (event) => event.preventDefault());
    }
}

function populateRiskFactorsForm(patientData) {
    const form = document.getElementById('riskFactorsForm');
    if (!form) return;
    const factors = patientData?.riskFactors || {};
    form.dataset.patientId = patientData.uid;
    const setVal = (name, val) => {
        const input = form.elements[name];
        if (!input) return;
        if (input.type === 'checkbox') {
            input.checked = !!val;
        } else if (val == null) {
            input.value = '';
        } else {
            input.value = val;
        }
    };
    setVal('age', factors.age ?? patientData.age ?? '');
    setVal('sex', factors.sex || (patientData.sex === 'М' || patientData.sex === 'Мужской' ? 'male'
        : patientData.sex === 'Ж' || patientData.sex === 'Женский' ? 'female' : ''));
    setVal('chol', factors.chol ?? '');
    setVal('hdl', factors.hdl ?? '');
    setVal('sbp', factors.sbp ?? '');
    setVal('bpmeds', factors.bpmeds);
    setVal('smoker', factors.smoker);
    setVal('diabetic', factors.diabetic);
}

function readRiskFactorsForm() {
    const form = document.getElementById('riskFactorsForm');
    if (!form) return null;
    const num = (name) => {
        const raw = form.elements[name]?.value;
        if (raw === '' || raw == null) return null;
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : null;
    };
    return {
        age: num('age'),
        sex: form.elements.sex?.value || '',
        chol: num('chol'),
        hdl: num('hdl'),
        sbp: num('sbp'),
        bpmeds: !!form.elements.bpmeds?.checked,
        smoker: !!form.elements.smoker?.checked,
        diabetic: !!form.elements.diabetic?.checked
    };
}

function handleRiskFactorsChange() {
    const form = document.getElementById('riskFactorsForm');
    if (!form) return;
    const patientId = form.dataset.patientId;
    if (!patientId) return;
    const factors = readRiskFactorsForm();
    const patients = loadPatients();
    const idx = patients.findIndex(p => p.uid === patientId || p.id === patientId);
    if (idx === -1) return;
    patients[idx] = { ...patients[idx], riskFactors: factors };
    localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(patients));
    localStorage.setItem(PATIENTS_UPDATED_KEY, String(Date.now()));
    notifyRiskFactorsSaved();
}

// Открытие боковой панели пациента
function openPatientSidebar(patientId) {
    const sidebar = document.getElementById('patientSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    // Обновляем данные пациента
    updatePatientData(patientId);
    
    // Показываем панель
    sidebar.classList.add('open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Анимация появления
    sidebar.style.transform = 'translateX(0)';
}

// Закрытие боковой панели
function closePatientSidebar() {
    const sidebar = document.getElementById('patientSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Обновление данных пациента в панели
function updatePatientData(patientId) {
    const patientData = getPatientData(patientId);
    const latestAnalysis = patientData.analyses?.[0];
    
    // Обновляем основную информацию
    document.querySelector('.patient-name-card').textContent = patientData.name;
    document.querySelector('.patient-id-card').textContent = `ID: ${patientData.id}`;
    document.querySelector('.patient-age-card').textContent = `${patientData.age} года`;
    document.querySelector('.diagnosis-text').textContent = patientData.diagnosis || 'Нет заключения';
    document.querySelector('.analysis-date').textContent = `Анализ: ${patientData.lastAnalysisDate || 'нет данных'}`;

    const lastEcgVital = document.querySelector('.vital-item[data-vital="last-ecg"]');
    if (lastEcgVital) {
        lastEcgVital.querySelector('.vital-value').textContent = patientData.lastAnalysisDate || 'Нет данных';
    }
    
    // Обновляем резюме ИИ
    const riskPercentage = document.querySelector('.risk-percentage');
    const statusBadge = document.querySelector('.status-badge');
    
    if (riskPercentage) {
        riskPercentage.textContent = `${patientData.riskPercentage || 0}%`;
    }
    if (statusBadge) {
        statusBadge.textContent = patientData.riskStatus || patientData.riskLabel || getRiskLabel(patientData.riskLevel);
        statusBadge.className = `status-badge ${patientData.riskLevel || 'low'}`;
    }

    renderPatientTimeline(patientData);
    renderPatientDiseases(patientData);
    renderPatientOrgans(patientData);
    populateRiskFactorsForm(patientData);

    const analyzeBtn = document.querySelector('.analyze-btn');
    if (analyzeBtn) {
        analyzeBtn.dataset.patientId = patientData.uid;
    }
    localStorage.setItem(SELECTED_PATIENT_KEY, patientData.uid);

    if (latestAnalysis) {
        renderSidebarAnalysis(latestAnalysis);
    } else {
        hideAnalysisResults();
    }
    
    // Обновляем графики
    updateCharts(patientData);
}

function latestOrganReport(patientData, organ) {
    const direct = patientData.organReports && patientData.organReports[organ];
    if (direct) return direct;
    const analyses = Array.isArray(patientData.analyses) ? patientData.analyses : [];
    const hit = analyses.find(a => (a.organ === organ || a.modality === organ) && a.organ_report);
    return hit ? hit.organ_report : null;
}

function heartReportFromPatient(patientData) {
    const direct = latestOrganReport(patientData, 'heart');
    if (direct) return direct;
    const analyses = Array.isArray(patientData.analyses) ? patientData.analyses : [];
    const hit = analyses.find(a => a.modality === 'heart' || a.modality === 'ecg' || (!a.organ && !a.modality && a.diagnosis));
    if (!hit) return null;
    const risk = Math.max(0, Math.min(1, Number(hit.riskPercentage || hit.confidence || 0) / 100));
    const band = hit.riskLevel === 'high' ? 'high' : hit.riskLevel === 'medium' ? 'elevated' : 'low';
    return { organ: 'heart', prediction: hit.diagnosis, risk, band, source: 'SYNERA ECG' };
}

function renderPatientOrgans(patientData) {
    const grid = document.getElementById('patientOrgansGrid');
    const link = document.getElementById('patientConsiliumLink');
    if (!grid) return;
    if (link) link.href = `consilium.html?patient=${encodeURIComponent(patientData.uid)}`;
    const reports = {
        liver: latestOrganReport(patientData, 'liver'),
        eye: latestOrganReport(patientData, 'eye'),
        heart: heartReportFromPatient(patientData)
    };
    const labels = { liver: 'Печень', eye: 'Глаз', heart: 'Сердце' };
    const displayPrediction = (value) => {
        let text = String(value || '');
        const map = {
            diabetic_retinopathy: 'Диабетическая ретинопатия',
            glaucoma: 'Глаукома',
            cataract: 'Катаракта',
            normal: 'Норма',
            Cirrhosis: 'Цирроз',
            Fibrosis: 'Фиброз',
            Hepatitis: 'Гепатит',
            Blood_Donor: 'Без выраженного флага'
        };
        Object.keys(map).forEach((key) => { text = text.replace(new RegExp(key, 'g'), map[key]); });
        return text || 'Есть результат';
    };
    grid.replaceChildren(...Object.keys(labels).map((organ) => {
        const report = reports[organ];
        const card = document.createElement('article');
        card.className = 'patient-organ-card';
        if (report && report.band) card.dataset.band = report.band;
        const risk = report && Number.isFinite(Number(report.risk)) ? `${Math.round(Number(report.risk) * 100)}%` : '—';
        card.innerHTML = '<span></span><strong></strong><p></p>';
        card.querySelector('span').textContent = labels[organ];
        card.querySelector('strong').textContent = report ? displayPrediction(report.prediction || 'Есть результат') : 'Нет результата';
        card.querySelector('p').textContent = report ? `${report.band || 'low'} · ${risk}` : 'Нужно запустить модуль';
        return card;
    }));
}

// Данные пациентов
function getPatientData(patientId) {
    const storedPatient = loadPatients().find((patient) => patient.uid === patientId || patient.id === patientId);
    if (storedPatient) {
        return {
            ...storedPatient,
            riskStatus: storedPatient.riskLabel || getRiskLabel(storedPatient.riskLevel),
            ecgData: storedPatient.ecgData || [120, 125, 118, 130, 135, 128, 122],
            riskData: storedPatient.riskData || [65, 68, 70, 72, 75, 73, storedPatient.riskPercentage || 72]
        };
    }

    const patients = {
        '1': {
            name: 'Айжан К.',
            id: '001',
            age: 34,
            diagnosis: 'Ишемическая болезнь сердца',
            riskPercentage: 72,
            riskStatus: 'Повышенный',
            riskLevel: 'high',
            ecgData: [120, 125, 118, 130, 135, 128, 122],
            riskData: [65, 68, 70, 72, 75, 73, 72]
        },
        '2': {
            name: 'Марат С.',
            id: '002',
            age: 45,
            diagnosis: 'Артериальная гипертензия',
            riskPercentage: 45,
            riskStatus: 'Умеренный',
            riskLevel: 'medium',
            ecgData: [95, 98, 92, 100, 105, 102, 97],
            riskData: [40, 42, 45, 48, 50, 47, 45]
        },
        '3': {
            name: 'Жанар А.',
            id: '003',
            age: 28,
            diagnosis: 'Аритмия',
            riskPercentage: 25,
            riskStatus: 'Низкий',
            riskLevel: 'low',
            ecgData: [85, 88, 82, 90, 92, 87, 85],
            riskData: [20, 22, 25, 28, 30, 27, 25]
        },
        '4': {
            name: 'Данияр Б.',
            id: '004',
            age: 52,
            diagnosis: 'Клапанный порок',
            riskPercentage: 85,
            riskStatus: 'Критический',
            riskLevel: 'high',
            ecgData: [140, 145, 138, 150, 155, 148, 142],
            riskData: [80, 82, 85, 88, 90, 87, 85]
        },
        '5': {
            name: 'Салтанат Р.',
            id: '005',
            age: 38,
            diagnosis: 'Миокардит',
            riskPercentage: 55,
            riskStatus: 'Умеренный',
            riskLevel: 'medium',
            ecgData: [110, 115, 108, 120, 125, 118, 112],
            riskData: [50, 52, 55, 58, 60, 57, 55]
        },
        '6': {
            name: 'Асылбек Н.',
            id: '006',
            age: 41,
            diagnosis: 'Гипертрофия левого желудочка',
            riskPercentage: 78,
            riskStatus: 'Повышенный',
            riskLevel: 'high',
            ecgData: [130, 135, 128, 140, 145, 138, 132],
            riskData: [70, 72, 75, 78, 80, 77, 78]
        },
        '7': {
            name: 'Камила Т.',
            id: '007',
            age: 29,
            diagnosis: 'Сердечная недостаточность',
            riskPercentage: 90,
            riskStatus: 'Критический',
            riskLevel: 'high',
            ecgData: [150, 155, 148, 160, 165, 158, 152],
            riskData: [85, 87, 90, 93, 95, 92, 90]
        },
        '8': {
            name: 'Ерлан У.',
            id: '008',
            age: 35,
            diagnosis: 'Тахикардия',
            riskPercentage: 30,
            riskStatus: 'Низкий',
            riskLevel: 'low',
            ecgData: [90, 95, 88, 100, 105, 98, 92],
            riskData: [25, 27, 30, 33, 35, 32, 30]
        }
    };
    
    return patients[patientId] || patients['1'];
}

// Inline SVG risk-trend sparkline over a patient's analyses (oldest -> newest).
// Returns '' for fewer than 2 analyses. No chart library — same approach as the
// survival curve on the analysis page.
function buildPatientTrendSvg(analyses) {
    const seq = [...analyses].reverse();
    const pts = seq
        .map(a => ({ v: Math.round(Number(a.riskPercentage ?? a.confidence ?? 0)) }))
        .filter(p => Number.isFinite(p.v));
    if (pts.length < 2) return '';
    const W = 440, H = 94, padL = 10, padR = 30, padT = 14, padB = 14;
    const maxX = pts.length - 1;
    const maxY = Math.max(10, Math.max.apply(null, pts.map(p => p.v)) * 1.15);
    const X = i => padL + (W - padL - padR) * (i / (maxX || 1));
    const Y = v => padT + (H - padT - padB) * (1 - v / maxY);
    const accent = 'var(--accent, #5e6ad2)';
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
    const area = `M${X(0).toFixed(1)},${Y(0).toFixed(1)} ` +
        pts.map((p, i) => `L${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ') +
        ` L${X(maxX).toFixed(1)},${Y(0).toFixed(1)} Z`;
    let dots = '';
    pts.forEach((p, i) => { dots += `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="2.6" fill="${accent}"/>`; });
    const last = pts[pts.length - 1];
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" class="trend-svg" role="img" aria-label="Тренд риска">` +
        `<path d="${area}" fill="${accent}" opacity="0.10"/>` +
        `<path d="${line}" fill="none" stroke="${accent}" stroke-width="2" stroke-linejoin="round"/>` +
        dots +
        `<text x="${X(maxX).toFixed(1)}" y="${(Y(last.v) - 6).toFixed(1)}" text-anchor="end" font-size="10" font-weight="600" fill="${accent}">${last.v}%</text>` +
        `</svg>`;
}

function renderPatientTimeline(patientData) {
    const container = document.querySelector('.timeline-container');
    if (!container) return;

    const analyses = patientData.analyses?.length ? patientData.analyses : [
        {
            date: patientData.lastAnalysisDate || '15.12.2024',
            riskPercentage: patientData.riskPercentage || 0,
            diagnosis: patientData.diagnosis || 'Нет заключения'
        }
    ];

    const trend = buildPatientTrendSvg(analyses);
    const trendHtml = trend
        ? `<div class="timeline-trend"><div class="timeline-trend-title">Тренд риска <small>${analyses.length} анализов</small></div>${trend}</div>`
        : '';

    container.innerHTML = trendHtml + analyses.slice(0, 5).map((analysis) => `
        <div class="timeline-item">
            <div class="timeline-date">${analysis.date}</div>
            <div class="timeline-content">
                <div class="timeline-risk">${Math.round(analysis.riskPercentage || analysis.confidence || 0)}%</div>
                <div class="timeline-diagnosis">${analysis.diagnosis}</div>
            </div>
        </div>
    `).join('');
}

// Aggregates `analyses[].diseases` (written by ecg-script.js after each
// /predict_disease run) across all analyses for this patient and surfaces the
// top 5 unique codes by count. We also keep the most-recent occurrence so the
// widget can show "последнее: 95% в анализе от 12.03".
function renderPatientDiseases(patientData) {
    const section = document.getElementById('patientDiseases');
    const list = document.getElementById('patientDiseasesList');
    const countEl = document.getElementById('patientDiseasesCount');
    if (!section || !list || !countEl) return;

    const analyses = Array.isArray(patientData.analyses) ? patientData.analyses : [];
    const analysesWithDz = analyses.filter(a => Array.isArray(a?.diseases) && a.diseases.length);
    if (!analysesWithDz.length) {
        section.hidden = true;
        list.replaceChildren();
        return;
    }

    const agg = new Map();
    analysesWithDz.forEach((analysis) => {
        analysis.diseases.forEach((d) => {
            if (!d || !d.code) return;
            const code = String(d.code);
            const prev = agg.get(code) || {
                code,
                name_ru: d.name_ru || code,
                count: 0,
                lastProbability: null,
                lastDate: null,
                lastTime: -Infinity
            };
            prev.count += 1;
            const t = getAnalysisTime(analysis);
            if (t > prev.lastTime) {
                prev.lastTime = t;
                prev.lastProbability = Number(d.probability);
                prev.lastDate = analysis.date || '';
            }
            if (d.name_ru && !prev.name_ru) prev.name_ru = d.name_ru;
            agg.set(code, prev);
        });
    });

    const top = Array.from(agg.values())
        .sort((a, b) => b.count - a.count || b.lastTime - a.lastTime)
        .slice(0, 5);

    countEl.textContent = `по ${analysesWithDz.length} анализ${analysesWithDz.length === 1 ? 'у' : (analysesWithDz.length < 5 ? 'ам' : 'ам')}`;
    list.replaceChildren(...top.map((entry) => {
        const li = document.createElement('li');
        const word = entry.count === 1 ? 'раз' : (entry.count < 5 ? 'раза' : 'раз');
        const name = document.createElement('span');
        name.className = 'patient-diseases-name';
        name.textContent = `${entry.code} — ${entry.name_ru}`;
        const meta = document.createElement('span');
        meta.className = 'patient-diseases-meta';
        let metaText = `${entry.count} ${word}`;
        if (Number.isFinite(entry.lastProbability) && entry.lastDate) {
            metaText += ` (последнее: ${Math.round(entry.lastProbability)}% в анализе от ${entry.lastDate})`;
        }
        meta.textContent = metaText;
        li.appendChild(name);
        li.appendChild(meta);
        return li;
    }));

    section.hidden = false;
}

function renderSidebarAnalysis(analysis) {
    const analysisResults = document.getElementById('analysisResults');
    if (!analysisResults) return;

    analysisResults.querySelector('.results-header h3').textContent = 'Последний анализ ЭКГ';
    analysisResults.querySelector('.main-risk-result h4').textContent = analysis.diagnosis;
    analysisResults.querySelector('.risk-percentage-large').textContent = `${Number(analysis.confidence || 0).toFixed(1)}%`;
    analysisResults.querySelector('.risk-level-large').textContent = analysis.riskLabel || getRiskLabel(analysis.riskLevel);
    analysisResults.querySelector('.risk-level-large').className = `risk-level-large ${analysis.riskLevel || 'low'}`;
    analysisResults.querySelector('.scale-marker').style.left = `${Math.max(0, Math.min(100, analysis.confidence || 0))}%`;

    const pathologyGrid = analysisResults.querySelector('.pathologies-grid');
    if (pathologyGrid) {
        pathologyGrid.innerHTML = Object.entries(analysis.probabilities || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([name, probability]) => `
                <div class="pathology-card">
                    <div class="pathology-name">${name}</div>
                    <div class="pathology-probability">${Number(probability || 0).toFixed(1)}%</div>
                </div>
            `).join('');
    }

    const comparisonChange = analysisResults.querySelector('.comparison-change');
    const comparisonDate = analysisResults.querySelector('.comparison-date');
    if (comparisonChange) {
        comparisonChange.textContent = analysis.recommendation || 'Требуется клиническое подтверждение результата';
        comparisonChange.className = 'comparison-change neutral';
    }
    if (comparisonDate) {
        comparisonDate.textContent = `Файл: ${analysis.fileName || 'ECG image'}`;
    }

    analysisResults.style.display = 'block';
    analysisResults.style.opacity = '1';
    analysisResults.style.transform = 'translateY(0)';
}

// Инициализация графиков
function initCharts() {
    const ecgChart = document.getElementById('ecgChart');
    const riskChart = document.getElementById('riskChart');
    
    if (ecgChart) {
        drawECGChart(ecgChart);
    }
    
    if (riskChart) {
        drawRiskChart(riskChart);
    }
}

// График ЭКГ
function drawECGChart(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    
    // Устанавливаем высокое разрешение
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    
    // Данные ЭКГ (симуляция)
    const data = [120, 125, 118, 130, 135, 128, 122];
    const labels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // Очистка canvas
    ctx.clearRect(0, 0, width, height);
    
    // Градиент для линии
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#00d4ff');
    gradient.addColorStop(0.5, '#8b5cf6');
    gradient.addColorStop(1, '#ec4899');
    
    // Рисование линии ЭКГ
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 10;
    
    ctx.beginPath();
    data.forEach((value, index) => {
        const x = padding + (chartWidth / (data.length - 1)) * index;
        const y = height - padding - ((value - 80) / 80) * chartHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    
    // Сброс тени
    ctx.shadowBlur = 0;
    
    // Рисование точек
    data.forEach((value, index) => {
        const x = padding + (chartWidth / (data.length - 1)) * index;
        const y = height - padding - ((value - 80) / 80) * chartHeight;
        
        ctx.fillStyle = '#00d4ff';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Подписи
    ctx.fillStyle = '#b0b0b0';
    ctx.font = 'bold 10px Inter';
    ctx.textAlign = 'center';
    labels.forEach((label, index) => {
        const x = padding + (chartWidth / (labels.length - 1)) * index;
        ctx.fillText(label, x, height - 5);
    });
}

// График риска
function drawRiskChart(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    
    // Устанавливаем высокое разрешение
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    
    // Данные риска
    const data = [65, 68, 70, 72, 75, 73, 72];
    const labels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // Очистка canvas
    ctx.clearRect(0, 0, width, height);
    
    // Градиент для области
    const areaGradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    areaGradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
    areaGradient.addColorStop(1, 'rgba(239, 68, 68, 0.05)');
    
    // Рисование области под графиком
    ctx.fillStyle = areaGradient;
    ctx.beginPath();
    data.forEach((value, index) => {
        const x = padding + (chartWidth / (data.length - 1)) * index;
        const y = height - padding - (value / 100) * chartHeight;
        
        if (index === 0) {
            ctx.moveTo(x, height - padding);
            ctx.lineTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.lineTo(width - padding, height - padding);
    ctx.closePath();
    ctx.fill();
    
    // Рисование линии
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    data.forEach((value, index) => {
        const x = padding + (chartWidth / (data.length - 1)) * index;
        const y = height - padding - (value / 100) * chartHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    
    // Рисование точек
    data.forEach((value, index) => {
        const x = padding + (chartWidth / (data.length - 1)) * index;
        const y = height - padding - (value / 100) * chartHeight;
        
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Подписи
    ctx.fillStyle = '#b0b0b0';
    ctx.font = 'bold 10px Inter';
    ctx.textAlign = 'center';
    labels.forEach((label, index) => {
        const x = padding + (chartWidth / (labels.length - 1)) * index;
        ctx.fillText(label, x, height - 5);
    });
}

// Обновление графиков
function updateCharts(patientData) {
    const ecgChart = document.getElementById('ecgChart');
    const riskChart = document.getElementById('riskChart');
    
    if (ecgChart) {
        // Обновляем данные ЭКГ
        drawECGChart(ecgChart);
    }
    
    if (riskChart) {
        // Обновляем данные риска
        drawRiskChart(riskChart);
    }
}

// Функциональность поиска
function initSearchFunctionality() {
    if (window.__bolPatientSearchInitialized) return;
    window.__bolPatientSearchInitialized = true;

    const searchInput = document.querySelector('.search-input');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const patientRows = document.querySelectorAll('.patient-row');
        
        patientRows.forEach(row => {
            const patientName = row.querySelector('.patient-name').textContent.toLowerCase();
            const patientId = row.querySelector('.patient-id').textContent.toLowerCase();
            
            if (patientName.includes(searchTerm) || patientId.includes(searchTerm)) {
                row.style.display = '';
                row.style.animation = 'fadeIn 0.3s ease-in-out';
            } else {
                row.style.display = 'none';
            }
        });
    });
}

// Инициализация потока анализа
function initAnalysisFlow() {
    const analyzeBtn = document.querySelector('.analyze-btn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const analysisResults = document.getElementById('analysisResults');
    const closeResultsBtn = document.querySelector('.close-results-btn');
    
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', function() {
            const patientId = this.dataset.patientId || document.querySelector('.patient-row')?.dataset.patientId || '1';
            localStorage.setItem(SELECTED_PATIENT_KEY, patientId);
            window.location.href = 'ecg-analysis.html';
        });
    }
    
    // Закрытие результатов
    if (closeResultsBtn) {
        closeResultsBtn.addEventListener('click', hideAnalysisResults);
    }
}

// Показать оверлей загрузки
function showLoadingOverlay() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Скрыть оверлей загрузки
function hideLoadingOverlay() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
    }
}

// Показать экран результатов
function showResultsOverlay() {
    const resultsOverlay = document.getElementById('resultsOverlay');
    if (resultsOverlay) {
        resultsOverlay.classList.add('active');
        
        // Анимация появления результатов
        const resultsContent = resultsOverlay.querySelector('.results-content');
        resultsContent.style.transform = 'scale(0.8)';
        resultsContent.style.opacity = '0';
        
        setTimeout(() => {
            resultsContent.style.transition = 'all 0.3s ease';
            resultsContent.style.transform = 'scale(1)';
            resultsContent.style.opacity = '1';
        }, 100);
    }
}

// Показать результаты анализа в боковой панели
function showAnalysisResults() {
    const analysisResults = document.getElementById('analysisResults');
    if (analysisResults) {
        // Генерируем случайные результаты
        const newRisk = Math.floor(Math.random() * 30) + 60; // 60-90%
        const pathologies = [
            { name: 'Аритмия', probability: Math.floor(Math.random() * 20) + 70 },
            { name: 'Ишемия миокарда', probability: Math.floor(Math.random() * 20) + 60 },
            { name: 'Гипертрофия левого желудочка', probability: Math.floor(Math.random() * 20) + 50 }
        ];
        
        // Обновляем данные
        analysisResults.querySelector('.risk-percentage-large').textContent = `${newRisk}%`;
        analysisResults.querySelector('.scale-marker').style.left = `${newRisk}%`;
        
        // Обновляем патологии
        const pathologyCards = analysisResults.querySelectorAll('.pathology-card');
        pathologies.forEach((pathology, index) => {
            if (pathologyCards[index]) {
                pathologyCards[index].querySelector('.pathology-name').textContent = pathology.name;
                pathologyCards[index].querySelector('.pathology-probability').textContent = `${pathology.probability}%`;
            }
        });
        
        // Показываем результаты с анимацией
        analysisResults.style.display = 'block';
        analysisResults.style.opacity = '0';
        analysisResults.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            analysisResults.style.transition = 'all 0.5s ease';
            analysisResults.style.opacity = '1';
            analysisResults.style.transform = 'translateY(0)';
        }, 100);
        
        // Прокручиваем к результатам
        setTimeout(() => {
            analysisResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 600);
    }
}

// Скрыть результаты анализа
function hideAnalysisResults() {
    const analysisResults = document.getElementById('analysisResults');
    if (analysisResults) {
        analysisResults.style.transition = 'all 0.3s ease';
        analysisResults.style.opacity = '0';
        analysisResults.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            analysisResults.style.display = 'none';
        }, 300);
    }
}

// Анимация ЭКГ
function startECGAnimation() {
    const canvas = document.getElementById('ecgAnimation');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    
    // Устанавливаем высокое разрешение
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    
    let time = 0;
    const amplitude = 20;
    const frequency = 0.1;
    
    function animateECG() {
        ctx.clearRect(0, 0, width, height);
        
        // Рисуем ЭКГ линию
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00f5d4';
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        for (let x = 0; x < width; x += 2) {
            const y = height / 2 + Math.sin((x + time) * frequency) * amplitude;
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        
        // Добавляем пульсацию
        const pulseY = height / 2 + Math.sin(time * 0.5) * 15;
        ctx.fillStyle = '#8b5cf6';
        ctx.shadowColor = '#8b5cf6';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(width / 2, pulseY, 8, 0, Math.PI * 2);
        ctx.fill();
        
        time += 2;
        
        if (time < 1000) { // Анимация на 4 секунды
            requestAnimationFrame(animateECG);
        }
    }
    
    animateECG();
}

// Кнопки действий результатов
document.addEventListener('click', function(e) {
    if (e.target.closest('.pdf-btn')) {
        const pdfBtn = e.target.closest('.pdf-btn');
        
        // Анимация нажатия
        pdfBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            pdfBtn.style.transform = 'scale(1)';
        }, 150);
        
        // Симуляция создания PDF
        const originalContent = pdfBtn.innerHTML;
        pdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>PDF...</span>';
        pdfBtn.disabled = true;
        
        setTimeout(() => {
            pdfBtn.innerHTML = originalContent;
            pdfBtn.disabled = false;
            
            // Показываем уведомление
            showNotification('PDF отчёт успешно создан!', 'success');
        }, 2000);
    }
    
    if (e.target.closest('.send-btn')) {
        const sendBtn = e.target.closest('.send-btn');
        
        // Анимация нажатия
        sendBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            sendBtn.style.transform = 'scale(1)';
        }, 150);
        
        // Симуляция отправки
        const originalContent = sendBtn.innerHTML;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Отправка...</span>';
        sendBtn.disabled = true;
        
        setTimeout(() => {
            sendBtn.innerHTML = originalContent;
            sendBtn.disabled = false;
            
            // Показываем уведомление
            showNotification('Результаты отправлены пациенту!', 'success');
        }, 2000);
    }
});

// Показать уведомление
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--card-bg);
        backdrop-filter: blur(20px);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        padding: 1rem 1.5rem;
        color: var(--text-primary);
        z-index: 4000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        box-shadow: var(--shadow-lg);
    `;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Удаление через 3 секунды
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Кнопка "Добавить пациента" — реальное добавление в vortexPatients
(function initAddPatient() {
    const modal = document.getElementById('addPatientModal');
    const backdrop = document.getElementById('addPatientBackdrop');
    const form = document.getElementById('addPatientForm');
    if (!modal || !backdrop || !form) return;

    function openModal() {
        backdrop.classList.add('active');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        const nameInput = document.getElementById('apName');
        if (nameInput) setTimeout(() => nameInput.focus(), 60);
    }
    function closeModal() {
        backdrop.classList.remove('active');
        modal.classList.remove('active');
        document.body.style.overflow = '';
        form.reset();
    }

    function ageFromBirth(value) {
        if (!value) return '';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '';
        const now = new Date();
        let age = now.getFullYear() - d.getFullYear();
        const m = now.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
        return age >= 0 && age < 130 ? age : '';
    }

    // Open from any .add-patient-btn (header + bottom section)
    document.addEventListener('click', function (e) {
        if (e.target.closest('.add-patient-btn')) { e.preventDefault(); openModal(); }
    });
    backdrop.addEventListener('click', closeModal);
    document.querySelectorAll('[data-close-add-patient]').forEach(b => b.addEventListener('click', closeModal));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('active')) closeModal(); });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const name = (document.getElementById('apName').value || '').trim();
        if (!name) { document.getElementById('apName').focus(); return; }

        const patients = loadPatients();
        const enteredId = (document.getElementById('apId').value || '').trim();
        const id = enteredId || String(patients.length + 1).padStart(3, '0');
        const newPatient = normalizePatient({
            uid: 'p' + Date.now(),
            id,
            name,
            age: ageFromBirth(document.getElementById('apBirth').value) || '—',
            sex: document.getElementById('apSex').value || 'М',
            diagnosis: (document.getElementById('apComplaints').value || '').trim() || 'Нет заключения',
            lastAnalysisDate: 'Нет анализа',
            riskLevel: 'low',
            riskLabel: 'Низкий',
            riskPercentage: 0,
            analyses: []
        });

        patients.unshift(newPatient);
        localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(patients));
        localStorage.setItem(PATIENTS_UPDATED_KEY, String(Date.now()));

        closeModal();
        if (typeof refreshPatientsPage === 'function') refreshPatientsPage();
        else renderPatientsTable();
        showNotification('Пациент «' + name + '» добавлен', 'success');
    });
})();

// Адаптивность графиков
window.addEventListener('resize', function() {
    setTimeout(() => {
        const ecgChart = document.getElementById('ecgChart');
        const riskChart = document.getElementById('riskChart');
        
        if (ecgChart) {
            drawECGChart(ecgChart);
        }
        
        if (riskChart) {
            drawRiskChart(riskChart);
        }
    }, 100);
});

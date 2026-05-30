/* ============================================
   SHIREKA FAKTA — app.js
   Interactive Logic & API Handler
   ============================================ */

'use strict';

/* ── STATE ─────────────────────────────────── */
let currentTabId = 'text-tab';

/* ── DOM REFERENCES ─────────────────────────── */
const $ = id => document.getElementById(id);

const inputCard = $('inputCard');
const loadingArea = $('loadingArea');
const errorArea = $('errorArea');
const errorText = $('errorText');
const resultArea = $('resultArea');
const submitBtn = $('submitBtn');
const textInput = $('textInput');
const urlInput = $('urlInput');
const charBadge = $('charBadge');
const urlCheck = $('urlCheck');
const badgeStatus = $('badgeStatus');
const resultStatusCard = $('resultStatusCard');
const donutFill = $('donutFill');
const txtConfidence = $('txtConfidence');
const txtExplanation = $('txtExplanation');
const listClaims = $('listClaims');
const listMisleading = $('listMisleading');
const misleadingSection = $('misleadingSection');
const containerTags = $('containerTags');

/* ── LOADING STEPS ──────────────────────────── */
const STEPS = [$('step1'), $('step2'), $('step3')];
let stepInterval = null;
let currentStep = 0;

function startSteps() {
    currentStep = 0;
    STEPS.forEach((s, i) => {
        s.className = 'lstep';
        s.querySelector('i').className = 'fa-regular fa-circle';
    });
    STEPS[0].className = 'lstep active';
    STEPS[0].querySelector('i').className = 'fa-solid fa-circle-notch fa-spin';

    stepInterval = setInterval(() => {
        if (currentStep < STEPS.length - 1) {
            STEPS[currentStep].className = 'lstep done';
            currentStep++;
            STEPS[currentStep].className = 'lstep active';
            STEPS[currentStep].querySelector('i').className = 'fa-solid fa-circle-notch fa-spin';
        }
    }, 1400);
}

function stopSteps() {
    clearInterval(stepInterval);
    STEPS.forEach(s => {
        s.className = 'lstep done';
    });
}

/* ── TAB SWITCHING ──────────────────────────── */
function switchTab(tabId, btnEl) {
    currentTabId = tabId;

    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('show'));
    document.getElementById(tabId).classList.add('show');

    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    btnEl.classList.add('active');
}

/* ── IMAGE PREVIEW ──────────────────────────── */
function previewImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    $('uploadPlaceholder').classList.add('hidden');
    $('imagePreviewContainer').classList.remove('hidden');
    $('fileName').textContent = file.name;

    const reader = new FileReader();
    reader.onload = e => { $('imgPreview').src = e.target.result; };
    reader.readAsDataURL(file);
}

function removeImage() {
    $('imageInput').value = '';
    $('uploadPlaceholder').classList.remove('hidden');
    $('imagePreviewContainer').classList.add('hidden');
    $('imgPreview').src = '';
    $('fileName').textContent = '';
}

/* ── CHAR COUNTER ───────────────────────────── */
textInput.addEventListener('input', () => {
    const len = textInput.value.length;
    charBadge.textContent = `${len} karakter`;
    charBadge.classList.toggle('active', len > 0);
});

/* ── URL VALIDATION ─────────────────────────── */
urlInput.addEventListener('input', () => {
    const val = urlInput.value.trim();
    if (!val) {
        urlCheck.className = 'url-check';
        urlCheck.innerHTML = '';
        return;
    }
    try {
        new URL(val);
        urlCheck.className = 'url-check ok';
        urlCheck.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    } catch {
        urlCheck.className = 'url-check bad';
        urlCheck.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
    }
});

/* ── DRAG & DROP ────────────────────────────── */
(function setupDragDrop() {
    const zone = document.getElementById('dropZone');
    if (!zone) return;

    zone.addEventListener('dragover', e => {
        e.preventDefault();
        zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const input = $('imageInput');
            const dt = new DataTransfer();
            dt.items.add(file);
            input.files = dt.files;
            previewImage({ target: input });
        }
    });
})();

/* ── SHOW / HIDE STATE ──────────────────────── */
function showLoading() {
    inputCard.style.opacity = '0.6';
    inputCard.style.pointerEvents = 'none';
    loadingArea.classList.remove('hidden');
    errorArea.classList.add('hidden');
    resultArea.classList.add('hidden');
    submitBtn.disabled = true;
    startSteps();
}

function hideLoading() {
    inputCard.style.opacity = '1';
    inputCard.style.pointerEvents = '';
    loadingArea.classList.add('hidden');
    submitBtn.disabled = false;
    stopSteps();
}

function showError(msg) {
    errorText.textContent = msg;
    errorArea.classList.remove('hidden');
    errorArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ── SUBMIT HANDLER ─────────────────────────── */
async function handleSubmit(event) {
    event.preventDefault();

    let url = '/analyze';
    let options = { method: 'POST', headers: { 'Content-Type': 'application/json' } };

    if (currentTabId === 'text-tab') {
        const text = textInput.value.trim();
        if (!text) { alert('Silakan masukkan teks terlebih dahulu!'); return; }
        options.body = JSON.stringify({ text });

    } else if (currentTabId === 'url-tab') {
        const urlVal = urlInput.value.trim();
        if (!urlVal) { alert('Silakan masukkan tautan link berita!'); return; }
        url = '/analyze-url';
        options.body = JSON.stringify({ url: urlVal });

    } else if (currentTabId === 'image-tab') {
        const imageFile = $('imageInput').files[0];
        if (!imageFile) { alert('Silakan pilih berkas screenshot terlebih dahulu!'); return; }
        url = '/analyze-image';
        const formData = new FormData();
        formData.append('image', imageFile);
        options = { method: 'POST', body: formData };
    }

    showLoading();

    try {
        const response = await fetch(url, options);
        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data.error || 'Terjadi kesalahan sistem.');
        }

        renderResult(data);

    } catch (err) {
        showError(err.message);
    } finally {
        hideLoading();
    }
}

/* ── RENDER RESULT ──────────────────────────── */
function renderResult(data) {
    /* -- Status detection -- */
    const statusRaw = (data.status || 'Perlu Verifikasi');
    const statusLC = statusRaw.toLowerCase();

    let themeClass = 's-unverified';
    let displayText = 'BELUM TERVERIFIKASI';

    if (statusLC.includes('fakta') || statusLC.includes('fact')) {
        themeClass = 's-fakta';
        displayText = 'FAKTA';
    } else if (statusLC.includes('hoax') || statusLC.includes('bohong')) {
        themeClass = 's-hoax';
        displayText = 'HOAX';
    } else if (statusLC.includes('misleading') || statusLC.includes('sebagian') || statusLC.includes('satire')) {
        themeClass = 's-satire';
        displayText = statusRaw.toUpperCase();
    }

    /* -- Apply status card theme -- */
    resultStatusCard.className = `result-status-card ${themeClass}`;
    badgeStatus.textContent = displayText;

    /* -- Confidence -- */
    let confidence = 50;
    if (data.confidence) {
        const parsed = parseInt(data.confidence);
        if (!isNaN(parsed)) confidence = Math.min(100, Math.max(0, parsed));
    }

    txtConfidence.textContent = `${confidence}%`;

    // Animate donut after a frame
    const circumference = 226.2;
    donutFill.style.strokeDashoffset = circumference;
    requestAnimationFrame(() => {
        setTimeout(() => {
            const offset = circumference - (confidence / 100) * circumference;
            donutFill.style.strokeDashoffset = offset;
        }, 60);
    });

    /* -- Explanation -- */
    txtExplanation.textContent = data.explanation || data.conclusion || data.summary
        || 'Tidak ada penjelasan yang tersedia.';

    /* -- Claims list -- */
    listClaims.innerHTML = '';
    const claims = data.claims_found && data.claims_found.length
        ? data.claims_found
        : ['Tidak ada klaim spesifik yang terbaca.'];

    claims.forEach(c => {
        const li = document.createElement('li');
        li.textContent = c;
        listClaims.appendChild(li);
    });

    /* -- Misleading elements -- */
    const hasMislead = data.misleading_elements
        && data.misleading_elements.length > 0
        && data.misleading_elements[0] !== '';

    if (hasMislead) {
        listMisleading.innerHTML = '';
        data.misleading_elements.forEach(m => {
            const li = document.createElement('li');
            li.textContent = m;
            listMisleading.appendChild(li);
        });
        misleadingSection.classList.remove('hidden');
    } else {
        misleadingSection.classList.add('hidden');
    }

    /* -- Tags -- */
    containerTags.innerHTML = '';
    if (data.related_topics && data.related_topics.length > 0) {
        data.related_topics.forEach(t => {
            const span = document.createElement('span');
            span.textContent = `#${t}`;
            containerTags.appendChild(span);
        });
    }

    /* -- Show result area -- */
    resultArea.classList.remove('hidden');
    setTimeout(() => {
        resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

/* ── RESET FORM ─────────────────────────────── */
function resetForm() {
    resultArea.classList.add('hidden');
    errorArea.classList.add('hidden');

    // Clear inputs
    textInput.value = '';
    if (urlInput) urlInput.value = '';
    charBadge.textContent = '0 karakter';
    charBadge.classList.remove('active');
    if (urlCheck) { urlCheck.className = 'url-check'; urlCheck.innerHTML = ''; }
    removeImage();

    // Reset donut
    donutFill.style.strokeDashoffset = '226.2';

    // Switch back to text tab
    switchTab('text-tab', $('btn-text-tab'));

    // Scroll to top of form
    inputCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    inputCard.style.opacity = '1';
    inputCard.style.pointerEvents = '';
}

/* ── SHARE RESULT ───────────────────────────── */
function shareResult() {
    const status = badgeStatus.textContent;
    const explanation = txtExplanation.textContent.slice(0, 120);
    const text = `🔍 Shireka Fakta — Hasil Verifikasi: ${status}\n\n"${explanation}..."\n\nCek fakta di: ${window.location.href}`;

    if (navigator.share) {
        navigator.share({ title: 'Shireka Fakta', text }).catch(() => { });
    } else {
        navigator.clipboard.writeText(text).then(() => {
            alert('Hasil disalin ke clipboard!');
        }).catch(() => {
            alert('Tidak dapat berbagi saat ini.');
        });
    }
}

/* ── EXPOSE GLOBALS (called from HTML onclick) ── */
window.switchTab = switchTab;
window.previewImage = previewImage;
window.removeImage = removeImage;
window.handleSubmit = handleSubmit;
window.resetForm = resetForm;
window.shareResult = shareResult;
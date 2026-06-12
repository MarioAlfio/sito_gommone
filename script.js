/* ═══════════════════════════════════════════════════════════
   GOMMONE BOOKING — script.js
   Logica: calendario, Google Sheet, WhatsApp, modal
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────
   CONFIGURAZIONE — modifica questi valori
   ───────────────────────────────────────────── */
const CONFIG = {
  // URL del tuo Google Sheet pubblicato come CSV
  // Vai su File → Condividi → Pubblica sul web → CSV → copia il link
  SHEET_CSV_URL: 'https://docs.google.com/spreadsheets/d/INSERISCI_ID_FOGLIO/pub?output=csv',

  // Dati skipper
  SKIPPER_NAME:  'Marco Esposito',
  SKIPPER_ROLE:  'Skipper certificato · Ponza',
  SKIPPER_WA:    '393331234567',   // Numero WhatsApp: codice paese + numero, senza + o spazi

  // Dettagli noleggio
  PREZZO:    '350€ / giornata intera',
  CAPIENZA:  'Fino a 8 persone',
  ORARIO:    '09:00 – 18:00',

  // Date hardcoded per test (rimosse quando SHEET_CSV_URL è configurato)
  // Formato: 'YYYY-MM-DD'
  DEMO_BOOKED_DATES: [
    '2026-07-04',
    '2026-07-10',
    '2026-07-15',
    '2026-07-20',
    '2026-08-01',
    '2026-08-05',
    '2026-08-14',
    '2026-08-15',
    '2026-08-21',
  ],
};

/* ─────────────────────────────────────────────
   STATO GLOBALE
   ───────────────────────────────────────────── */
let currentYear  = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0-indexed (0 = gennaio)
let bookedDates  = [];   // date confermate (da Google Sheet)
let selectedDate = null; // data attualmente selezionata nel modal

// Pending dates: salvate in localStorage (locali al browser)
const pendingDates = new Set(
  JSON.parse(localStorage.getItem('gb_pendingDates') || '[]')
);

/* ─────────────────────────────────────────────
   FETCH GOOGLE SHEET
   ───────────────────────────────────────────── */

/**
 * Carica le date prenotate dal Google Sheet pubblicato come CSV.
 * Struttura attesa del foglio:
 *   Colonna A: data (YYYY-MM-DD)
 *   Colonna B: stato ('confermato')
 *
 * Fallback: se il fetch fallisce (CORS in locale, URL non configurato, ecc.)
 * usa le DEMO_BOOKED_DATES hardcoded.
 *
 * @returns {Promise<string[]>} array di date 'YYYY-MM-DD'
 */
async function loadBookedDates() {
  // Se l'URL non è stato configurato, usa le date demo
  if (CONFIG.SHEET_CSV_URL.includes('INSERISCI_ID_FOGLIO')) {
    console.info('ℹ️  Google Sheet non configurato — uso date di esempio.');
    return [...CONFIG.DEMO_BOOKED_DATES];
  }

  try {
    const res  = await fetch(CONFIG.SHEET_CSV_URL, { cache: 'no-cache' });
    const text = await res.text();
    const rows = text.trim().split('\n').slice(1); // salta riga header

    return rows
      .map(row => row.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')))
      .filter(cols => cols[1]?.toLowerCase() === 'confermato')
      .map(cols => cols[0])
      .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date));
  } catch (err) {
    console.warn('⚠️  Impossibile caricare il Google Sheet:', err.message);
    console.info('ℹ️  Uso date di esempio come fallback.');
    return [...CONFIG.DEMO_BOOKED_DATES];
  }
}

/* ─────────────────────────────────────────────
   LOGICA STATI GIORNI
   ───────────────────────────────────────────── */

/**
 * Restituisce lo stato di un giorno.
 * @param {string} dateStr  - formato 'YYYY-MM-DD'
 * @returns {'past'|'booked'|'pending'|'free'}
 */
function getDayStatus(dateStr) {
  const today = getTodayStr();
  if (dateStr < today)                    return 'past';
  if (bookedDates.includes(dateStr))      return 'booked';
  if (pendingDates.has(dateStr))          return 'pending';
  return 'free';
}

/**
 * Restituisce la data di oggi in formato 'YYYY-MM-DD'.
 */
function getTodayStr() {
  const d = new Date();
  return formatDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/**
 * Formatta anno/mese/giorno in 'YYYY-MM-DD'.
 */
function formatDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Formatta una data 'YYYY-MM-DD' in modo leggibile in italiano.
 * Es: '2026-07-04' → 'Venerdì 4 luglio 2026'
 */
function formatDateReadable(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('it-IT', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  });
}

/* ─────────────────────────────────────────────
   RENDERING CALENDARIO
   ───────────────────────────────────────────── */

const MONTHS_IT = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'
];

/**
 * Renderizza il calendario per currentYear/currentMonth.
 */
function renderCalendar() {
  const grid  = document.getElementById('cal-grid');
  const label = document.getElementById('cal-month-label');

  // Aggiorna etichetta mese
  label.textContent = `${MONTHS_IT[currentMonth]} ${currentYear}`;

  // Calcola primo giorno del mese (0=Dom → adatta a Lun=0)
  const firstDayRaw  = new Date(currentYear, currentMonth, 1).getDay();
  const firstDay     = (firstDayRaw === 0) ? 6 : firstDayRaw - 1; // Lun=0
  const daysInMonth  = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Svuota la griglia
  grid.innerHTML = '';

  // Celle vuote iniziali (padding)
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.classList.add('cal-day', 'empty');
    empty.setAttribute('aria-hidden', 'true');
    grid.appendChild(empty);
  }

  const today = getTodayStr();

  // Celle dei giorni
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(currentYear, currentMonth + 1, day);
    const status  = getDayStatus(dateStr);

    const cell = document.createElement('div');
    cell.classList.add('cal-day', status);
    cell.textContent = day;
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('data-date', dateStr);

    // Accessibilità
    const statusLabels = {
      free:    'disponibile',
      pending: 'prenotazione in corso',
      booked:  'occupato',
      past:    'data passata',
    };
    cell.setAttribute('aria-label', `${formatDateReadable(dateStr)} — ${statusLabels[status]}`);
    cell.setAttribute('aria-disabled', status === 'booked' || status === 'past' ? 'true' : 'false');

    // Evidenzia oggi
    if (dateStr === today) {
      cell.classList.add('today');
    }

    // Evidenzia data selezionata
    if (dateStr === selectedDate) {
      cell.classList.add('selected');
    }

    // Click handler (solo per free e pending)
    if (status === 'free' || status === 'pending') {
      cell.setAttribute('tabindex', '0');
      cell.style.cursor = 'pointer';

      const handleSelect = () => onDayClick(dateStr, status);
      cell.addEventListener('click', handleSelect);
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSelect();
        }
      });
    } else {
      cell.setAttribute('tabindex', '-1');
    }

    grid.appendChild(cell);
  }
}

/* ─────────────────────────────────────────────
   CLICK GIORNO
   ───────────────────────────────────────────── */

/**
 * Gestisce il click su un giorno disponibile o pending.
 * @param {string} dateStr  - 'YYYY-MM-DD'
 * @param {string} status   - 'free' | 'pending'
 */
function onDayClick(dateStr, status) {
  // Aggiunge alla lista pending locale (crea urgenza per questo utente)
  if (status === 'free') {
    pendingDates.add(dateStr);
    savePendingDates();
    // Aggiorna visuale cella
    renderCalendar();
  }

  selectedDate = dateStr;
  showSkipperModal(dateStr, status === 'pending');
}

/**
 * Salva i pending dates in localStorage.
 */
function savePendingDates() {
  localStorage.setItem('gb_pendingDates', JSON.stringify([...pendingDates]));
}

/* ─────────────────────────────────────────────
   MODAL SKIPPER
   ───────────────────────────────────────────── */

/**
 * Mostra il modal con i dettagli dello skipper per la data selezionata.
 * @param {string}  dateStr    - 'YYYY-MM-DD'
 * @param {boolean} isPending  - true se la data era già in stato pending
 */
function showSkipperModal(dateStr, isPending) {
  const modal         = document.getElementById('skipper-modal');
  const pendingBanner = document.getElementById('pending-banner');
  const waLink        = document.getElementById('modal-wa-link');

  // Popola i campi
  document.getElementById('modal-skipper-name').textContent = CONFIG.SKIPPER_NAME;
  document.getElementById('modal-skipper-role').textContent = CONFIG.SKIPPER_ROLE;
  document.getElementById('modal-capienza').textContent     = CONFIG.CAPIENZA;
  document.getElementById('modal-prezzo').textContent       = CONFIG.PREZZO;
  document.getElementById('modal-orario').textContent       = CONFIG.ORARIO;
  document.getElementById('modal-selected-date').textContent = formatDateReadable(dateStr);

  // Banner pending
  pendingBanner.style.display = isPending ? 'flex' : 'none';

  // Link WhatsApp
  waLink.href = buildWhatsAppLink(CONFIG.SKIPPER_WA, dateStr);

  // Mostra il modal
  modal.setAttribute('aria-hidden', 'false');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Focus sul bottone chiudi per accessibilità
  setTimeout(() => {
    document.getElementById('modal-close-btn').focus();
  }, 50);
}

/**
 * Chiude il modal skipper.
 */
function closeModal() {
  const modal = document.getElementById('skipper-modal');
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  selectedDate = null;
  // Rimuovi evidenziazione giorno selezionato
  renderCalendar();
}

/* ─────────────────────────────────────────────
   WHATSAPP
   ───────────────────────────────────────────── */

/**
 * Genera il link WhatsApp con messaggio precompilato.
 * @param {string} numero    - es: '393331234567'
 * @param {string} dateStr   - 'YYYY-MM-DD'
 * @returns {string}         - URL wa.me completo
 */
function buildWhatsAppLink(numero, dateStr) {
  const dataLeggibile = formatDateReadable(dateStr);
  const messaggio = encodeURIComponent(
    `Ciao Marco! Vorrei prenotare il gommone per il ${dataLeggibile}. È ancora disponibile?`
  );
  return `https://wa.me/${numero}?text=${messaggio}`;
}

/* ─────────────────────────────────────────────
   NAVIGAZIONE MESI
   ───────────────────────────────────────────── */

function prevMonth() {
  if (currentMonth === 0) {
    currentMonth = 11;
    currentYear -= 1;
  } else {
    currentMonth -= 1;
  }
  renderCalendar();
}

function nextMonth() {
  if (currentMonth === 11) {
    currentMonth = 0;
    currentYear += 1;
  } else {
    currentMonth += 1;
  }
  renderCalendar();
}

/* ─────────────────────────────────────────────
   SCROLL
   ───────────────────────────────────────────── */

function scrollToCalendar() {
  document.getElementById('calendar').scrollIntoView({ behavior: 'smooth' });
}

/* ─────────────────────────────────────────────
   CHIUSURA MODAL — CLICK BACKDROP & ESC
   ───────────────────────────────────────────── */

document.addEventListener('click', (e) => {
  const modal = document.getElementById('skipper-modal');
  if (e.target === modal) {
    closeModal();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('skipper-modal');
    if (modal.classList.contains('active')) {
      closeModal();
    }
  }
});

/* ─────────────────────────────────────────────
   BOOTSTRAP — INIT
   ───────────────────────────────────────────── */

async function init() {
  // Carica date prenotate (Google Sheet o demo)
  bookedDates = await loadBookedDates();

  // Renderizza il calendario
  renderCalendar();

  // Animazione di entrata per il contenitore calendario
  const container = document.querySelector('.calendar-container');
  if (container) {
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';
    // Piccolo delay per permettere la transizione CSS
    requestAnimationFrame(() => {
      container.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      container.style.opacity = '1';
      container.style.transform = 'translateY(0)';
    });
  }
}

// Avvia l'app quando il DOM è pronto
document.addEventListener('DOMContentLoaded', init);

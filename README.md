# 🚤 Noleggio Gommone Ponza

Sito web statico per il noleggio di un gommone con skipper certificato a Ponza.  
Nessun backend, nessun database: la disponibilità è gestita tramite **Google Sheets** (CSV pubblico).

🌐 **Live demo:** (https://marioalfio.github.io/sito_gommone/)

---

## ✨ Funzionalità

- 🎬 Hero con video di sfondo fullscreen
- 📅 Calendario interattivo con stati colore in tempo reale
- 🟢 Verde = disponibile · 🟡 Giallo = in corso · 🔴 Rosso = occupato
- 💬 Link WhatsApp con messaggio precompilato (data inclusa)
- 📊 Integrazione Google Sheets come "database" (solo lettura CSV)
- 📱 Responsive mobile-first

## 📁 Struttura

```
gommone-booking/
├── index.html      # struttura HTML
├── style.css       # design system
├── script.js       # logica calendario + WhatsApp
├── bg.mp4          # video sfondo hero
├── bg.jpg          # immagine sfondo calendario
└── skipper.jpg     # foto skipper
```

## ⚙️ Configurazione

Modifica il blocco `CONFIG` in cima a `script.js`:

```js
const CONFIG = {
  SHEET_CSV_URL: 'https://docs.google.com/spreadsheets/d/TUO_ID/pub?output=csv',
  SKIPPER_WA:    '39XXXXXXXXXX',   // numero WhatsApp senza + o spazi
  SKIPPER_NAME:  'Nome Cognome',
  PREZZO:        '350€ / giornata intera',
  CAPIENZA:      'Fino a 8 persone',
  ORARIO:        '09:00 – 18:00',
};
```

## 📋 Setup Google Sheet (5 min)

1. Crea un Google Sheet con 2 colonne: `data` (YYYY-MM-DD) e `stato`
2. Per ogni giorno prenotato inserisci `confermato` nella colonna B
3. **File → Condividi → Pubblica sul web → CSV**
4. Copia il link e incollalo in `SHEET_CSV_URL`

## 🚀 Deploy su GitHub Pages

```bash
git init
git add .
git commit -m "first commit"
git remote add origin https://github.com/TUO_USERNAME/gommone-booking.git
git push -u origin main
```

Poi su GitHub: **Settings → Pages → Source: Deploy from branch → main → / (root)**

## 🧪 Test in locale

```bash
npx serve .
# apri http://localhost:3000
```

## 🛠 Tecnologie

- HTML5 + CSS3 + JavaScript vanilla (zero dipendenze)
- Font: [Outfit](https://fonts.google.com/specimen/Outfit) (Google Fonts)
- Google Sheets come database read-only

'use strict';

(() => {
  const RECORD_KEY = 'cdb-studio-local-pin-v1';
  const SESSION_KEY = 'cdb-studio-session-unlocked';
  const gate = document.getElementById('authGate');
  const shell = document.getElementById('appShell');
  const form = document.getElementById('pinForm');
  const input = document.getElementById('pinInput');
  const confirmWrap = document.getElementById('pinConfirmWrap');
  const confirmInput = document.getElementById('pinConfirm');
  const submit = document.getElementById('pinSubmit');
  const copy = document.getElementById('authCopy');
  const label = document.getElementById('pinLabel');
  const message = document.getElementById('pinMessage');
  let failures = 0;
  let blockedUntil = 0;

  function readRecord() {
    try { return JSON.parse(localStorage.getItem(RECORD_KEY) || 'null'); }
    catch (_) { return null; }
  }

  function randomSalt() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return [...bytes].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  async function digest(value) {
    const data = new TextEncoder().encode(value);
    const result = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(result)].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  async function pinHash(pin, salt) {
    return digest(`${salt}:${pin}:criticidabar`);
  }

  function validPin(pin) {
    return /^\d{4,8}$/.test(pin);
  }

  function setMessage(text = '', kind = '') {
    message.textContent = text;
    message.className = `auth-message${kind ? ` ${kind}` : ''}`;
  }

  function setupMode() {
    const firstRun = !readRecord();
    confirmWrap.hidden = !firstRun;
    label.textContent = firstRun ? 'Nuovo PIN' : 'PIN';
    submit.textContent = firstRun ? 'Imposta PIN' : 'Apri CdB Studio';
    copy.textContent = firstRun
      ? 'Scegli un PIN locale per proteggere l’editor su questo dispositivo.'
      : 'Inserisci il PIN locale per aprire l’editor.';
    input.value = '';
    confirmInput.value = '';
    setMessage();
    setTimeout(() => input.focus({ preventScroll: true }), 80);
  }

  function unlock() {
    sessionStorage.setItem(SESSION_KEY, '1');
    gate.hidden = true;
    shell.hidden = false;
    document.body.classList.remove('locked');
    window.dispatchEvent(new CustomEvent('cdb:unlock'));
  }

  function lock() {
    sessionStorage.removeItem(SESSION_KEY);
    shell.hidden = true;
    gate.hidden = false;
    document.body.classList.add('locked');
    setupMode();
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const now = Date.now();
    if (now < blockedUntil) {
      const seconds = Math.ceil((blockedUntil - now) / 1000);
      setMessage(`Troppi tentativi. Riprova tra ${seconds} secondi.`, 'error');
      return;
    }

    const pin = input.value.trim();
    if (!validPin(pin)) {
      setMessage('Usa da 4 a 8 cifre.', 'error');
      input.focus();
      return;
    }

    submit.disabled = true;
    try {
      const record = readRecord();
      if (!record) {
        if (pin !== confirmInput.value.trim()) {
          setMessage('I due PIN non coincidono.', 'error');
          confirmInput.focus();
          return;
        }
        const salt = randomSalt();
        const hash = await pinHash(pin, salt);
        localStorage.setItem(RECORD_KEY, JSON.stringify({ version: 1, salt, hash }));
        setMessage('PIN impostato.', 'success');
        unlock();
        return;
      }

      const hash = await pinHash(pin, record.salt);
      if (hash !== record.hash) {
        failures += 1;
        if (failures >= 5) {
          blockedUntil = Date.now() + 30000;
          failures = 0;
          setMessage('Troppi tentativi. Blocco di 30 secondi.', 'error');
        } else {
          setMessage(`PIN errato. Tentativo ${failures} di 5.`, 'error');
        }
        input.select();
        return;
      }
      failures = 0;
      unlock();
    } catch (error) {
      console.error(error);
      setMessage('Non riesco a verificare il PIN in questo browser.', 'error');
    } finally {
      submit.disabled = false;
    }
  });

  document.getElementById('lockBtn')?.addEventListener('click', lock);

  const record = readRecord();
  if (record && sessionStorage.getItem(SESSION_KEY) === '1') unlock();
  else setupMode();
})();

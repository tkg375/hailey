(function () {
  'use strict';

  // Read business ID from the script tag
  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();
  var businessId = script.getAttribute('data-business-id');
  if (!businessId) return;

  // Theming: data-color sets primary accent; secondary defaults to a darker shade
  var primaryColor = script.getAttribute('data-color') || '#00d4ff';
  // Convert hex to RGB for rgba() use
  function hexToRgb(hex) {
    var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return r + ',' + g + ',' + b;
  }
  var primaryRgb = hexToRgb(primaryColor);
  // Secondary: darker/complementary shade for gradients
  var secondaryColor = primaryColor === '#00d4ff' ? '#7b2fff' : (function() {
    // Darken primary by ~30% for secondary
    var r = Math.max(0, parseInt(primaryColor.slice(1,3),16) - 60);
    var g = Math.max(0, parseInt(primaryColor.slice(3,5),16) - 60);
    var b = Math.max(0, parseInt(primaryColor.slice(5,7),16) - 60);
    return '#' + [r,g,b].map(function(v){ return v.toString(16).padStart(2,'0'); }).join('');
  })();
  var secondaryRgb = hexToRgb(secondaryColor);

  var API_BASE = 'https://hailey.tgordo03.workers.dev';
  var conversationId = null;
  var isOpen = false;
  var isTyping = false;

  // ── Inject styles ──────────────────────────────────────────────
  var css = `
    #hailey-widget * { box-sizing: border-box; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    #hailey-bubble-wrap {
      position: fixed; bottom: 24px; right: 24px; z-index: 2147483647;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
    }
    #hailey-rotating-label {
      background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
      color: white; font-size: 12px; font-weight: 700; letter-spacing: 0.03em;
      padding: 5px 12px; border-radius: 20px; white-space: nowrap;
      box-shadow: 0 2px 12px rgba(${primaryRgb},0.45);
      opacity: 1; transition: opacity 0.4s ease; pointer-events: none;
    }
    #hailey-rotating-label.fade { opacity: 0; }
    #hailey-bubble {
      width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer;
      background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
      box-shadow: 0 4px 24px rgba(${primaryRgb},0.4);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s; flex-shrink: 0;
    }
    #hailey-bubble:hover { transform: scale(1.08); box-shadow: 0 6px 32px rgba(${primaryRgb},0.6); }
    #hailey-bubble svg { width: 24px; height: 24px; fill: white; transition: opacity 0.2s; }
    #hailey-panel {
      position: fixed; bottom: 92px; right: 24px; z-index: 2147483646;
      width: 360px; height: 520px; border-radius: 20px; overflow: hidden;
      display: flex; flex-direction: column;
      background: #080e1a;
      border: 1px solid rgba(${primaryRgb},0.2);
      box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(${primaryRgb},0.08);
      transform: scale(0.9) translateY(16px); opacity: 0; pointer-events: none;
      transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s;
    }
    #hailey-panel.open { transform: scale(1) translateY(0); opacity: 1; pointer-events: all; }
    @media (max-width: 440px) {
      #hailey-panel { right: 12px; left: 12px; width: auto; bottom: 84px; }
      #hailey-bubble-wrap { bottom: 16px; right: 16px; }
    }
    #hailey-header {
      padding: 14px 16px; display: flex; align-items: center; gap: 10px;
      background: linear-gradient(135deg, rgba(${primaryRgb},0.12), rgba(${secondaryRgb},0.12));
      border-bottom: 1px solid rgba(${primaryRgb},0.12);
      flex-shrink: 0;
    }
    #hailey-avatar {
      width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
      display: flex; align-items: center; justify-content: center;
      font-weight: 900; font-size: 14px; color: white; letter-spacing: 0.05em;
    }
    #hailey-header-text { flex: 1; }
    #hailey-header-name { font-weight: 900; font-size: 13px; color: ${primaryColor}; letter-spacing: 0.05em; }
    #hailey-header-status { font-size: 11px; color: rgba(255,255,255,0.4); display: flex; align-items: center; gap: 4px; margin-top: 1px; }
    #hailey-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; flex-shrink: 0; }
    #hailey-close {
      background: none; border: none; cursor: pointer; padding: 4px;
      color: rgba(255,255,255,0.3); font-size: 18px; line-height: 1;
      transition: color 0.15s;
    }
    #hailey-close:hover { color: rgba(255,255,255,0.7); }
    #hailey-messages {
      flex: 1; overflow-y: auto; padding: 20px 16px; display: flex; flex-direction: column; gap: 12px;
      scrollbar-width: thin; scrollbar-color: rgba(${primaryRgb},0.2) transparent;
    }
    #hailey-messages::-webkit-scrollbar { width: 4px; }
    #hailey-messages::-webkit-scrollbar-thumb { background: rgba(${primaryRgb},0.2); border-radius: 2px; }
    .h-msg { display: flex; align-items: flex-end; gap: 8px; }
    .h-msg.user { justify-content: flex-end; }
    .h-msg-avatar {
      width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 900; color: white;
    }
    .h-bubble {
      max-width: 72%; padding: 12px 18px; border-radius: 16px;
      font-size: 13px; line-height: 1.6; word-break: break-word;
    }
    .h-msg.bot .h-bubble {
      background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.85);
      border: 1px solid rgba(255,255,255,0.08); border-bottom-left-radius: 4px;
    }
    .h-msg.user .h-bubble {
      background: linear-gradient(135deg, rgba(${primaryRgb},0.25), rgba(${secondaryRgb},0.25));
      color: #e2e8f0; border: 1px solid rgba(${primaryRgb},0.3); border-bottom-right-radius: 4px;
    }
    .h-typing { display: flex; align-items: center; gap: 4px; padding: 12px 14px; }
    .h-typing span {
      width: 6px; height: 6px; border-radius: 50%; background: rgba(${primaryRgb},0.5);
      animation: h-bounce 1.2s ease-in-out infinite;
    }
    .h-typing span:nth-child(2) { animation-delay: 0.2s; }
    .h-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes h-bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
    #hailey-input-row {
      padding: 12px; border-top: 1px solid rgba(${primaryRgb},0.1);
      display: flex; gap: 8px; flex-shrink: 0; background: rgba(4,8,15,0.6);
    }
    #hailey-input {
      flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(${primaryRgb},0.2);
      border-radius: 12px; padding: 10px 14px; font-size: 13px; color: white;
      outline: none; transition: border-color 0.2s;
    }
    #hailey-input::placeholder { color: rgba(255,255,255,0.25); }
    #hailey-input:focus { border-color: rgba(${primaryRgb},0.5); }
    #hailey-send {
      width: 38px; height: 38px; border-radius: 10px; border: none; cursor: pointer;
      background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      transition: opacity 0.2s;
    }
    #hailey-send:disabled { opacity: 0.4; cursor: not-allowed; }
    #hailey-send svg { width: 16px; height: 16px; fill: white; }
    #hailey-powered { text-align: center; font-size: 10px; color: rgba(255,255,255,0.18); padding: 6px; flex-shrink: 0; }
    #hailey-powered a { color: rgba(${primaryRgb},0.4); text-decoration: none; }
    #hailey-powered a:hover { color: rgba(${primaryRgb},0.7); }
    /* Agreement modal */
    #hailey-agreement-overlay {
      position: absolute; inset: 0; z-index: 10; display: flex; flex-direction: column;
      background: #080e1a; border-radius: 20px; overflow: hidden;
    }
    #hailey-agreement-header {
      padding: 14px 16px; flex-shrink: 0;
      background: linear-gradient(135deg, rgba(${primaryRgb},0.12), rgba(${secondaryRgb},0.12));
      border-bottom: 1px solid rgba(${primaryRgb},0.12);
    }
    #hailey-agreement-header h3 { margin: 0; font-size: 13px; font-weight: 900; color: ${primaryColor}; letter-spacing: 0.05em; }
    #hailey-agreement-header p { margin: 4px 0 0; font-size: 11px; color: rgba(255,255,255,0.4); }
    #hailey-agreement-list { flex: 1; min-height: 0; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 6px;
      scrollbar-width: thin; scrollbar-color: rgba(${primaryRgb},0.2) transparent; }
    .h-agr-item { border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.07); }
    .h-agr-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer;
      background: rgba(255,255,255,0.03); transition: background 0.15s; }
    .h-agr-row:hover { background: rgba(255,255,255,0.06); }
    .h-agr-row.checked { background: rgba(${primaryRgb},0.06); border-color: rgba(${primaryRgb},0.2); }
    .h-agr-check { width: 16px; height: 16px; border-radius: 4px; border: 2px solid rgba(255,255,255,0.2);
      flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
    .h-agr-check.on { background: ${primaryColor}; border-color: ${primaryColor}; }
    .h-agr-check.on::after { content: '✓'; font-size: 10px; color: #000; font-weight: 900; }
    .h-agr-title { flex: 1; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.8); }
    .h-agr-arrow { font-size: 10px; color: rgba(255,255,255,0.3); flex-shrink: 0; }
    .h-agr-body { padding: 8px 12px 12px 38px; font-size: 11px; color: rgba(255,255,255,0.5);
      line-height: 1.55; border-top: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2); display: none; }
    .h-agr-body.open { display: block; }
    #hailey-agreement-footer { padding: 12px; flex-shrink: 0; border-top: 1px solid rgba(${primaryRgb},0.1);
      background: rgba(4,8,15,0.6); }
    #hailey-agreement-confirm {
      width: 100%; padding: 12px; border: none; border-radius: 12px; cursor: pointer; font-size: 13px;
      font-weight: 900; color: white; background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
      transition: opacity 0.2s; letter-spacing: 0.03em;
    }
    #hailey-agreement-confirm:disabled { opacity: 0.35; cursor: not-allowed; }
    #hailey-agreement-note { font-size: 10px; color: rgba(255,255,255,0.25); text-align: center; margin-top: 6px; }
    /* Payment step */
    #hailey-payment-step { display: none; flex-direction: column; gap: 10px; }
    #hailey-payment-step.visible { display: flex; }
    #hailey-card-element {
      background: rgba(255,255,255,0.06); border: 1px solid rgba(${primaryRgb},0.3);
      border-radius: 10px; padding: 12px 14px;
    }
    #hailey-pay-btn {
      width: 100%; padding: 13px; border: none; border-radius: 12px; cursor: pointer; font-size: 14px;
      font-weight: 900; color: white; background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
      transition: opacity 0.2s; letter-spacing: 0.03em;
    }
    #hailey-pay-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    #hailey-pay-error { font-size: 11px; color: #ff6b6b; text-align: center; min-height: 14px; }
  `;
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── Build DOM ──────────────────────────────────────────────────
  var root = document.createElement('div');
  root.id = 'hailey-widget';

  // Bubble wrapper + rotating label
  var bubbleWrap = document.createElement('div');
  bubbleWrap.id = 'hailey-bubble-wrap';

  var rotatingLabel = document.createElement('div');
  rotatingLabel.id = 'hailey-rotating-label';
  var rotatingTexts = ['Ask Hailey anything!', 'Book Now!', 'Need some help?'];
  var rotatingIndex = 0;
  rotatingLabel.textContent = rotatingTexts[0];

  setInterval(function() {
    rotatingLabel.classList.add('fade');
    setTimeout(function() {
      rotatingIndex = (rotatingIndex + 1) % rotatingTexts.length;
      rotatingLabel.textContent = rotatingTexts[rotatingIndex];
      rotatingLabel.classList.remove('fade');
    }, 400);
  }, 3000);

  // Bubble button
  var bubble = document.createElement('button');
  bubble.id = 'hailey-bubble';
  bubble.setAttribute('aria-label', 'Chat with Hailey');
  bubble.innerHTML = `
    <svg id="hailey-icon-chat" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.02 2 11c0 2.55 1.1 4.84 2.87 6.49L4 22l4.51-1.51C9.61 20.83 10.79 21 12 21c5.52 0 10-4.02 10-9S17.52 2 12 2zm0 16c-1.01 0-1.99-.15-2.91-.44l-2.09.7.7-2.09A7.03 7.03 0 0 1 5 11c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7z"/>
    </svg>
    <svg id="hailey-icon-close" style="display:none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>`;

  // Panel
  var panel = document.createElement('div');
  panel.id = 'hailey-panel';
  panel.innerHTML = `
    <div id="hailey-header">
      <div id="hailey-avatar">H</div>
      <div id="hailey-header-text">
        <div id="hailey-header-name">HAILEY</div>
        <div id="hailey-header-status"><span id="hailey-dot"></span> Online now</div>
      </div>
      <button id="hailey-close" aria-label="Close chat">✕</button>
    </div>
    <div id="hailey-messages"></div>
    <div id="hailey-input-row">
      <input id="hailey-input" type="text" placeholder="Ask me anything..." autocomplete="off" maxlength="500" />
      <button id="hailey-send" aria-label="Send">
        <svg viewBox="0 0 24 24"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z"/></svg>
      </button>
    </div>
    <div id="hailey-powered">Powered by <a href="https://hailey.tgordo03.workers.dev" target="_blank">Hailey AI</a></div>`;

  bubbleWrap.appendChild(rotatingLabel);
  bubbleWrap.appendChild(bubble);
  root.appendChild(bubbleWrap);
  root.appendChild(panel);
  document.body.appendChild(root);

  // ── Refs ───────────────────────────────────────────────────────
  var messages = document.getElementById('hailey-messages');
  var input = document.getElementById('hailey-input');
  var sendBtn = document.getElementById('hailey-send');
  var iconChat = document.getElementById('hailey-icon-chat');
  var iconClose = document.getElementById('hailey-icon-close');

  // ── Helpers ────────────────────────────────────────────────────
  function addMessage(role, text) {
    var row = document.createElement('div');
    row.className = 'h-msg ' + role;
    if (role === 'bot') {
      row.innerHTML = '<div class="h-msg-avatar">H</div><div class="h-bubble"></div>';
      row.querySelector('.h-bubble').textContent = text;
    } else {
      row.innerHTML = '<div class="h-bubble"></div>';
      row.querySelector('.h-bubble').textContent = text;
    }
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
    return row;
  }

  function showTyping() {
    var row = document.createElement('div');
    row.className = 'h-msg bot';
    row.id = 'hailey-typing';
    row.innerHTML = '<div class="h-msg-avatar">H</div><div class="h-bubble h-typing"><span></span><span></span><span></span></div>';
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById('hailey-typing');
    if (el) el.remove();
  }

  function setLoading(val) {
    isTyping = val;
    sendBtn.disabled = val;
    input.disabled = val;
  }

  // ── Toggle open/close ──────────────────────────────────────────
  function openPanel() {
    isOpen = true;
    panel.classList.add('open');
    iconChat.style.display = 'none';
    iconClose.style.display = '';
    rotatingLabel.style.display = 'none';
    if (messages.children.length === 0) {
      setTimeout(function () {
        addMessage('bot', "Hey there! 👋 I'm Hailey. How can I help you today?");
      }, 300);
    }
    setTimeout(function () { input.focus(); }, 350);
  }

  function closePanel() {
    isOpen = false;
    panel.classList.remove('open');
    iconChat.style.display = '';
    iconClose.style.display = 'none';
    rotatingLabel.style.display = '';
  }

  bubble.addEventListener('click', function () { isOpen ? closePanel() : openPanel(); });
  document.getElementById('hailey-close').addEventListener('click', closePanel);

  // ── Send message ───────────────────────────────────────────────
  function addBookingConfirmedCard(b) {
    function fmt(t) {
      var p = t.split(':').map(Number);
      return (p[0] % 12 || 12) + ':' + String(p[1]).padStart(2,'0') + ' ' + (p[0] >= 12 ? 'PM' : 'AM');
    }
    function fmtDate(d) {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
    }
    var row = document.createElement('div');
    row.className = 'h-msg bot';
    var card = document.createElement('div');
    card.style.cssText = 'background:rgba(' + primaryRgb + ',0.06);border:1px solid rgba(' + primaryRgb + ',0.3);border-radius:14px;padding:14px 16px;font-size:13px;color:rgba(255,255,255,0.85);';
    card.innerHTML = '<div style="color:' + primaryColor + ';font-weight:900;font-size:11px;letter-spacing:.08em;margin-bottom:8px;">✓ APPOINTMENT CONFIRMED</div>'
      + '<div style="margin-bottom:3px;"><strong>' + fmtDate(b.date) + '</strong> at <strong>' + fmt(b.time) + '</strong></div>'
      + (b.petName ? '<div style="color:rgba(255,255,255,0.6);font-size:12px;margin-bottom:2px;">🐾 ' + b.petName + (b.petType ? ' (' + b.petType + ')' : '') + '</div>' : '')
      + (b.service ? '<div style="color:rgba(255,255,255,0.5);font-size:12px;margin-bottom:2px;">' + b.service + '</div>' : '')
      + (b.isGuest ? '<div style="color:#fbbf24;font-size:11px;margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.1);">📧 Check your email for your sign-in link to join the call.</div>' : '');
    row.appendChild(card);
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
  }

  function addBookingCard(booking) {
    var row = document.createElement('div');
    row.className = 'h-msg bot';

    function fmt(t) {
      var p = t.split(':').map(Number);
      return (p[0] % 12 || 12) + ':' + String(p[1]).padStart(2,'0') + ' ' + (p[0] >= 12 ? 'PM' : 'AM');
    }
    function fmtDate(d) {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
    }

    var card = document.createElement('div');
    card.style.cssText = 'background:rgba(' + primaryRgb + ',0.08);border:1px solid rgba(' + primaryRgb + ',0.25);border-radius:14px;padding:14px;font-size:13px;color:rgba(255,255,255,0.85);min-width:200px;';
    card.innerHTML = '<div style="font-weight:900;color:' + primaryColor + ';margin-bottom:8px;font-size:12px;letter-spacing:.05em;">BOOKING SUMMARY</div>'
      + '<div style="margin-bottom:4px;">📅 <strong>' + fmtDate(booking.date) + ' at ' + fmt(booking.time) + '</strong></div>'
      + '<div style="margin-bottom:4px;">👤 ' + (booking.name || '') + '</div>'
      + (booking.service ? '<div style="margin-bottom:10px;">✦ ' + booking.service + '</div>' : '<div style="margin-bottom:10px;"></div>')
      + '<button id="hailey-confirm-book" style="width:100%;padding:10px;background:linear-gradient(135deg,' + primaryColor + ',' + secondaryColor + ');color:white;font-weight:900;font-size:13px;border:none;border-radius:10px;cursor:pointer;">Confirm Booking →</button>'
      + '<div id="hailey-book-status" style="text-align:center;font-size:12px;margin-top:6px;color:rgba(255,255,255,0.4);"></div>';

    row.appendChild(card);
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;

    card.querySelector('#hailey-confirm-book').addEventListener('click', async function() {
      var btn = this;
      var status = card.querySelector('#hailey-book-status');
      btn.disabled = true;
      btn.textContent = 'Booking...';
      try {
        var res = await fetch(API_BASE + '/api/public/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: businessId, name: booking.name, email: booking.email, phone: booking.phone, service: booking.service, date: booking.date, time: booking.time }),
        });
        var data = await res.json();
        if (res.ok) {
          btn.textContent = '✓ Booked!';
          btn.style.background = '#22c55e';
          status.textContent = "You're all set! Check your email for confirmation.";
          addMessage('bot', "You're all set! 🎉 Your appointment is confirmed for " + fmtDate(booking.date) + " at " + fmt(booking.time) + ". See you then!");
        } else {
          btn.disabled = false;
          btn.textContent = 'Confirm Booking →';
          status.style.color = '#ff4d8d';
          status.textContent = data.error || 'Something went wrong. Please try again.';
        }
      } catch(e) {
        btn.disabled = false;
        btn.textContent = 'Confirm Booking →';
        status.style.color = '#ff4d8d';
        status.textContent = 'Connection error. Please try again.';
      }
    });
  }

  async function sendMessage() {
    var text = input.value.trim();
    if (!text || isTyping) return;
    input.value = '';
    addMessage('user', text);
    setLoading(true);
    showTyping();
    try {
      var res = await fetch(API_BASE + '/api/chat/' + businessId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId: conversationId }),
      });
      var data = await res.json();
      hideTyping();
      if (data.conversationId) conversationId = data.conversationId;
      addMessage('bot', data.reply || 'Sorry, I ran into an issue. Please try again.');
      if (data.pendingBooking && data.bookingAgreements && data.bookingAgreements.length > 0) {
        setTimeout(function() { showAgreementModal(data.pendingBooking, data.bookingAgreements); }, 400);
      } else if (data.bookingConfirmed) {
        addBookingConfirmedCard(data.bookingConfirmed);
      }
      if (data.resendSent) {
        var row = document.createElement('div');
        row.className = 'h-msg bot';
        var chip = document.createElement('div');
        chip.style.cssText = 'font-size:12px;color:#fbbf24;background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:10px;padding:8px 12px;';
        chip.textContent = '📧 Link resent! Check your email inbox (and spam folder).';
        row.appendChild(chip);
        messages.appendChild(row);
        messages.scrollTop = messages.scrollHeight;
      }
    } catch (e) {
      hideTyping();
      addMessage('bot', 'Connection error. Please check your internet and try again.');
    }
    setLoading(false);
    messages.scrollTop = messages.scrollHeight;
    input.focus();
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  // ── Agreement modal ────────────────────────────────────────────
  function showAgreementModal(pendingBooking, agreements) {
    var checked = {};
    agreements.forEach(function(a) { checked[a.key] = false; });

    // Expand panel for agreements
    panel.style.height = '640px';

    var overlay = document.createElement('div');
    overlay.id = 'hailey-agreement-overlay';

    overlay.innerHTML =
      '<div id="hailey-agreement-header">' +
        '<h3>REQUIRED AGREEMENTS</h3>' +
        '<p>Read and accept all, then pay to confirm your appointment</p>' +
      '</div>' +
      '<div id="hailey-agreement-list"></div>' +
      '<div id="hailey-agreement-footer">' +
        '<button id="hailey-agreement-confirm" disabled></button>' +
        '<div id="hailey-payment-step">' +
          '<div id="hailey-card-element"></div>' +
          '<button id="hailey-pay-btn">Pay $60 & Confirm Appointment →</button>' +
          '<div id="hailey-pay-error"></div>' +
        '</div>' +
        '<div id="hailey-agreement-note">Secured by Stripe · Agreements recorded with timestamp</div>' +
      '</div>';

    panel.appendChild(overlay);

    var list = overlay.querySelector('#hailey-agreement-list');
    var confirmBtn = overlay.querySelector('#hailey-agreement-confirm');
    var paymentStep = overlay.querySelector('#hailey-payment-step');
    var payBtn = overlay.querySelector('#hailey-pay-btn');
    var payError = overlay.querySelector('#hailey-pay-error');

    var stripeInstance = null;
    var cardElement = null;
    var clientSecret = null;
    var agreedKeys = [];
    var agreedAt = null;

    function updateConfirm() {
      var allChecked = agreements.every(function(a) { return checked[a.key]; });
      if (allChecked) {
        confirmBtn.style.display = 'none';
        paymentStep.classList.add('visible');
        if (!stripeInstance) initStripe();
      } else {
        confirmBtn.disabled = true;
        confirmBtn.style.display = '';
        paymentStep.classList.remove('visible');
        var remaining = agreements.filter(function(a) { return !checked[a.key]; }).length;
        confirmBtn.textContent = remaining + ' agreement' + (remaining > 1 ? 's' : '') + ' remaining';
      }
    }

    async function initStripe() {
      try {
        // Fetch payment intent from Hailey proxy
        var piRes = await fetch(API_BASE + '/api/public/payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: businessId, name: pendingBooking.name, email: pendingBooking.email }),
        });
        var piData = await piRes.json();
        if (!piRes.ok || !piData.clientSecret) {
          payError.textContent = piData.error || 'Could not load payment form. Please try again.';
          return;
        }
        clientSecret = piData.clientSecret;
        agreedKeys = Object.keys(checked).filter(function(k) { return checked[k]; });
        agreedAt = Math.floor(Date.now() / 1000);

        // Load Stripe.js
        if (!window.Stripe) {
          await new Promise(function(resolve, reject) {
            var s = document.createElement('script');
            s.src = 'https://js.stripe.com/v3/';
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
          });
        }

        stripeInstance = window.Stripe(piData.publishableKey);
        var elements = stripeInstance.elements();
        cardElement = elements.create('card', {
          style: {
            base: {
              color: '#e2e8f0', fontSize: '14px', fontFamily: '-apple-system, sans-serif',
              '::placeholder': { color: 'rgba(255,255,255,0.3)' },
            },
            invalid: { color: '#ff6b6b' },
          },
        });
        cardElement.mount('#hailey-card-element');
      } catch(e) {
        payError.textContent = 'Could not load payment form. Please refresh and try again.';
      }
    }

    agreements.forEach(function(a) {
      var item = document.createElement('div');
      item.className = 'h-agr-item';

      var row = document.createElement('div');
      row.className = 'h-agr-row';
      row.innerHTML =
        '<div class="h-agr-check" data-key="' + a.key + '"></div>' +
        '<span class="h-agr-title">' + a.title + '</span>' +
        '<span class="h-agr-arrow">▼</span>';

      var body = document.createElement('div');
      body.className = 'h-agr-body';
      body.textContent = a.body;

      row.addEventListener('click', function(e) {
        body.classList.toggle('open');
        row.querySelector('.h-agr-arrow').textContent = body.classList.contains('open') ? '▲' : '▼';
      });

      var checkEl = row.querySelector('.h-agr-check');
      checkEl.addEventListener('click', function(e) {
        e.stopPropagation();
        checked[a.key] = !checked[a.key];
        checkEl.classList.toggle('on', checked[a.key]);
        row.classList.toggle('checked', checked[a.key]);
        updateConfirm();
      });

      item.appendChild(row);
      item.appendChild(body);
      list.appendChild(item);
    });

    updateConfirm();

    payBtn.addEventListener('click', async function() {
      if (!stripeInstance || !cardElement || !clientSecret) return;
      payBtn.disabled = true;
      payBtn.textContent = 'Processing...';
      payError.textContent = '';

      try {
        var result = await stripeInstance.confirmCardPayment(clientSecret, {
          payment_method: { card: cardElement },
        });

        if (result.error) {
          payError.textContent = result.error.message;
          payBtn.disabled = false;
          payBtn.textContent = 'Pay $60 & Confirm Appointment →';
          return;
        }

        // Payment succeeded — confirm booking
        var bookRes = await fetch(API_BASE + '/api/public/confirm-booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: businessId,
            pendingBooking: pendingBooking,
            agreedKeys: agreedKeys,
            agreedAt: agreedAt,
            paymentIntentId: result.paymentIntent.id,
          }),
        });
        var bookData = await bookRes.json();
        overlay.remove();
        panel.style.height = '';

        if (bookRes.ok && bookData.bookingConfirmed) {
          addBookingConfirmedCard(bookData.bookingConfirmed);
        } else {
          addMessage('bot', bookData.error || 'Payment went through but booking failed. Please contact us.');
        }
      } catch(e) {
        payError.textContent = 'Connection error. Please try again.';
        payBtn.disabled = false;
        payBtn.textContent = 'Pay $60 & Confirm Appointment →';
      }
    });
  }
})();

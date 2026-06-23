(function () {
  'use strict';

  // Read business ID from the script tag
  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();
  var businessId = script.getAttribute('data-business-id');
  if (!businessId) return;

  var API_BASE = 'https://hailey.tgordo03.workers.dev';
  var conversationId = null;
  var isOpen = false;
  var isTyping = false;

  // ── Inject styles ──────────────────────────────────────────────
  var css = `
    #hailey-widget * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    #hailey-bubble {
      position: fixed; bottom: 24px; right: 24px; z-index: 2147483647;
      width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer;
      background: linear-gradient(135deg, #00d4ff, #7b2fff);
      box-shadow: 0 4px 24px rgba(0,212,255,0.4);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #hailey-bubble:hover { transform: scale(1.08); box-shadow: 0 6px 32px rgba(0,212,255,0.6); }
    #hailey-bubble svg { width: 24px; height: 24px; fill: white; transition: opacity 0.2s; }
    #hailey-panel {
      position: fixed; bottom: 92px; right: 24px; z-index: 2147483646;
      width: 360px; height: 520px; border-radius: 20px; overflow: hidden;
      display: flex; flex-direction: column;
      background: #080e1a;
      border: 1px solid rgba(0,212,255,0.2);
      box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(0,212,255,0.08);
      transform: scale(0.9) translateY(16px); opacity: 0; pointer-events: none;
      transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s;
    }
    #hailey-panel.open { transform: scale(1) translateY(0); opacity: 1; pointer-events: all; }
    @media (max-width: 440px) {
      #hailey-panel { right: 12px; left: 12px; width: auto; bottom: 84px; }
      #hailey-bubble { bottom: 16px; right: 16px; }
    }
    #hailey-header {
      padding: 14px 16px; display: flex; align-items: center; gap: 10px;
      background: linear-gradient(135deg, rgba(0,212,255,0.12), rgba(123,47,255,0.12));
      border-bottom: 1px solid rgba(0,212,255,0.12);
      flex-shrink: 0;
    }
    #hailey-avatar {
      width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #00d4ff, #7b2fff);
      display: flex; align-items: center; justify-content: center;
      font-weight: 900; font-size: 14px; color: white; letter-spacing: 0.05em;
    }
    #hailey-header-text { flex: 1; }
    #hailey-header-name { font-weight: 900; font-size: 13px; color: #00d4ff; letter-spacing: 0.05em; }
    #hailey-header-status { font-size: 11px; color: rgba(255,255,255,0.4); display: flex; align-items: center; gap: 4px; margin-top: 1px; }
    #hailey-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; flex-shrink: 0; }
    #hailey-close {
      background: none; border: none; cursor: pointer; padding: 4px;
      color: rgba(255,255,255,0.3); font-size: 18px; line-height: 1;
      transition: color 0.15s;
    }
    #hailey-close:hover { color: rgba(255,255,255,0.7); }
    #hailey-messages {
      flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px;
      scrollbar-width: thin; scrollbar-color: rgba(0,212,255,0.2) transparent;
    }
    #hailey-messages::-webkit-scrollbar { width: 4px; }
    #hailey-messages::-webkit-scrollbar-thumb { background: rgba(0,212,255,0.2); border-radius: 2px; }
    #hailey-widget .h-msg { display: flex; align-items: flex-end; gap: 8px; }
    #hailey-widget .h-msg.user { justify-content: flex-end; }
    #hailey-widget .h-msg.bot { padding-right: 36px; }
    #hailey-widget .h-msg.user { padding-left: 36px; }
    #hailey-widget .h-msg-avatar {
      width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #00d4ff, #7b2fff);
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 900; color: white;
    }
    #hailey-widget .h-bubble {
      max-width: 100%; padding: 10px 14px 10px 16px; border-radius: 16px;
      font-size: 13px; line-height: 1.55; word-break: break-word;
    }
    #hailey-widget .h-msg.bot .h-bubble {
      background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.85);
      border: 1px solid rgba(255,255,255,0.08); border-bottom-left-radius: 4px;
    }
    #hailey-widget .h-msg.user .h-bubble {
      background: linear-gradient(135deg, rgba(0,212,255,0.25), rgba(123,47,255,0.25));
      color: #e2e8f0; border: 1px solid rgba(0,212,255,0.3); border-bottom-right-radius: 4px;
    }
    .h-typing { display: flex; align-items: center; gap: 4px; padding: 12px 14px; }
    .h-typing span {
      width: 6px; height: 6px; border-radius: 50%; background: rgba(0,212,255,0.5);
      animation: h-bounce 1.2s ease-in-out infinite;
    }
    .h-typing span:nth-child(2) { animation-delay: 0.2s; }
    .h-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes h-bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
    #hailey-input-row {
      padding: 12px; border-top: 1px solid rgba(0,212,255,0.1);
      display: flex; gap: 8px; flex-shrink: 0; background: rgba(4,8,15,0.6);
    }
    #hailey-input {
      flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(0,212,255,0.2);
      border-radius: 12px; padding: 10px 14px; font-size: 13px; color: white;
      outline: none; transition: border-color 0.2s;
    }
    #hailey-input::placeholder { color: rgba(255,255,255,0.25); }
    #hailey-input:focus { border-color: rgba(0,212,255,0.5); }
    #hailey-send {
      width: 38px; height: 38px; border-radius: 10px; border: none; cursor: pointer;
      background: linear-gradient(135deg, #00d4ff, #7b2fff); flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      transition: opacity 0.2s;
    }
    #hailey-send:disabled { opacity: 0.4; cursor: not-allowed; }
    #hailey-send svg { width: 16px; height: 16px; fill: white; }
    #hailey-powered { text-align: center; font-size: 10px; color: rgba(255,255,255,0.18); padding: 6px; flex-shrink: 0; }
    #hailey-powered a { color: rgba(0,212,255,0.4); text-decoration: none; }
    #hailey-powered a:hover { color: rgba(0,212,255,0.7); }
  `;
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── Build DOM ──────────────────────────────────────────────────
  var root = document.createElement('div');
  root.id = 'hailey-widget';

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

  root.appendChild(bubble);
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
  }

  bubble.addEventListener('click', function () { isOpen ? closePanel() : openPanel(); });
  document.getElementById('hailey-close').addEventListener('click', closePanel);

  // ── Contextual triggers ────────────────────────────────────────
  var TRIGGERS = [
    { pattern: /\bbook(\s+now|\s+your|\s+an?\s+appoint|\s+a\s+consult|\s+online)?\b/i, message: "Need help booking? I can check availability and get you scheduled right now — what can I help with?" },
    { pattern: /\bschedule(\s+an?\s+appoint|\s+a\s+(visit|call|consult))?\b/i, message: "I can help you schedule! What type of appointment are you looking for?" },
    { pattern: /\bhow\s+it\s+works?\b/i, message: "Have questions about how it works? Ask me anything — I'm happy to walk you through it!" },
    { pattern: /\bget\s+start(ed)?\b/i, message: "Ready to get started? I'll guide you through everything. What would you like to do first?" },
    { pattern: /\bcontact(\s+us)?\b/i, message: "Hi! Looking to get in touch? I can answer questions or help you reach the team." },
  ];

  function triggerMessage(msg) {
    if (!isOpen) openPanel();
    setTimeout(function() {
      if (messages.children.length <= 1) messages.innerHTML = '';
      addMessage('bot', msg);
      setTimeout(function() { input.focus(); }, 80);
    }, isOpen ? 60 : 420);
  }

  // Single document-level capture listener — fires before React/Next.js router
  document.addEventListener('click', function(e) {
    // Walk up from the clicked element to find matching text
    var node = e.target;
    while (node && node.tagName !== 'BODY') {
      // Skip the widget itself
      if (node.id === 'hailey-widget') return;
      var text = (node.textContent || node.getAttribute('aria-label') || node.getAttribute('data-hailey-trigger') || '').replace(/\s+/g, ' ').trim();
      if (text && text.length < 80) { // ignore large containers
        for (var t = 0; t < TRIGGERS.length; t++) {
          if (TRIGGERS[t].pattern.test(text)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            triggerMessage(TRIGGERS[t].message);
            return;
          }
        }
      }
      node = node.parentElement;
    }
  }, true);

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
    card.style.cssText = 'background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.3);border-radius:14px;padding:14px 16px;font-size:13px;color:rgba(255,255,255,0.85);';
    card.innerHTML = '<div style="color:#00d4ff;font-weight:900;font-size:11px;letter-spacing:.08em;margin-bottom:8px;">✓ APPOINTMENT CONFIRMED</div>'
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
    card.style.cssText = 'background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.25);border-radius:14px;padding:14px;font-size:13px;color:rgba(255,255,255,0.85);min-width:200px;';
    card.innerHTML = '<div style="font-weight:900;color:#00d4ff;margin-bottom:8px;font-size:12px;letter-spacing:.05em;">BOOKING SUMMARY</div>'
      + '<div style="margin-bottom:4px;">📅 <strong>' + fmtDate(booking.date) + ' at ' + fmt(booking.time) + '</strong></div>'
      + '<div style="margin-bottom:4px;">👤 ' + (booking.name || '') + '</div>'
      + (booking.service ? '<div style="margin-bottom:10px;">✦ ' + booking.service + '</div>' : '<div style="margin-bottom:10px;"></div>')
      + '<button id="hailey-confirm-book" style="width:100%;padding:10px;background:linear-gradient(135deg,#00d4ff,#7b2fff);color:white;font-weight:900;font-size:13px;border:none;border-radius:10px;cursor:pointer;">Confirm Booking →</button>'
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
      if (data.bookingConfirmed) {
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
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
})();

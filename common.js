/*
 * common.js : ฟังก์ชันใช้ร่วมกันของหน้าเว็บ (ES5)
 * ต้องโหลดหลัง config.js และ SweetAlert2
 */
(function (w, d) {
  var C = w.PR_CONFIG || {};
  var PR = {};
  var TZ = 'Asia/Bangkok';

  PR.config = C;

  PR.esc = function (s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  PR.param = function (name) {
    var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(w.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
  };

  PR.configured = function () {
    return !!C.API_URL && C.API_URL.indexOf('/exec') > -1 && C.API_URL.indexOf('ใส่รหัส') === -1;
  };

  // เรียก GAS API (GET) หมดเวลา 20 วินาที
  PR.api = function (params) {
    var qs = Object.keys(params).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');
    var req = fetch(C.API_URL + '?' + qs).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
    var timeout = new Promise(function (resolve, reject) {
      setTimeout(function () { reject(new Error('timeout')); }, 20000);
    });
    return Promise.race([req, timeout]);
  };

  // เรียก Admin API (POST แบบ text/plain ไม่ต้องผ่าน preflight) หมดเวลา 60 วินาที
  PR.post = function (body) {
    var req = fetch(C.API_URL + '?api=admin', { method: 'POST', body: JSON.stringify(body) }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
    var timeout = new Promise(function (resolve, reject) {
      setTimeout(function () { reject(new Error('timeout')); }, 60000);
    });
    return Promise.race([req, timeout]);
  };

  // แคชในเครื่องผู้ชม ให้หน้าเปิดเร็ว (ใช้ไม่ได้ก็ข้ามไป)
  PR.store = {
    get: function (k) {
      try { var v = w.localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; }
    },
    set: function (k, v) {
      try { w.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ }
    }
  };

  PR.thumb = function (id, width) {
    return 'https://lh3.googleusercontent.com/d/' + encodeURIComponent(id) + '=w' + (width || 600);
  };

  PR.downloadUrl = function (id) {
    return 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(id);
  };

  PR.albumUrl = function (id) {
    var base = w.location.href.split('#')[0].split('?')[0].replace(/[^\/]*$/, '');
    return base + 'album.html?id=' + encodeURIComponent(id);
  };

  PR.thaiDate = function (iso, withYear) {
    if (!iso) return '';
    var opt = { timeZone: TZ, day: 'numeric', month: 'short' };
    if (withYear !== false) opt.year = 'numeric';
    try { return new Date(iso).toLocaleDateString('th-TH', opt); } catch (e) { return ''; }
  };

  PR.thaiTime = function (iso) {
    try { return new Date(iso).toLocaleTimeString('th-TH', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }) + ' น.'; } catch (e) { return ''; }
  };

  PR.dayKey = function (iso) {
    try { return new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ }); } catch (e) { return ''; }
  };

  PR.timeAgo = function (iso) {
    if (!iso) return '';
    var min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 1) return 'เมื่อสักครู่';
    if (min < 60) return min + ' นาทีที่แล้ว';
    if (min < 1440) return Math.floor(min / 60) + ' ชั่วโมงที่แล้ว';
    if (min < 10080) return Math.floor(min / 1440) + ' วันที่แล้ว';
    return PR.thaiDate(iso);
  };

  PR.isRecent = function (iso, hours) {
    return !!iso && (Date.now() - new Date(iso).getTime()) < hours * 3600000;
  };

  PR.num = function (n) {
    return Number(n || 0).toLocaleString('th-TH');
  };

  // สีพื้นหลังสำรองเมื่อยังไม่มีภาพปก (Tailwind 100 / 700)
  PR.tones = [['#D1FAE5', '#047857'], ['#FEF3C7', '#B45309'], ['#E0F2FE', '#0369A1'], ['#EDE9FE', '#6D28D9'], ['#ECFCCB', '#4D7C0F'], ['#FFE4E6', '#BE123C']];
  PR.tone = function (i) { return PR.tones[Math.abs(i) % PR.tones.length]; };

  PR.photoIcon = function (color, size) {
    return '<svg aria-hidden="true" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="9" cy="10" r="1.8"></circle><path d="M3 17l5-5 4 4 3-3 6 6"></path></svg>';
  };

  // ป้ายหมวด: พื้นอ่อนจากสีหมวด ตัวอักษรสีหมวด
  PR.catBadge = function (name, color) {
    if (!name) return '';
    var c = /^#[0-9a-fA-F]{6}$/.test(color || '') ? color : '#0F766E';
    return '<span class="inline-flex self-start rounded-lg px-2.5 py-0.5 text-xs font-semibold" style="background:' + c + '1A;color:' + c + '">' + PR.esc(name) + '</span>';
  };

  PR.initial = function (name) {
    var s = String(name || '').replace(/^ครู/, '').replace(/^[เ-ไ]/, '');
    return s.charAt(0) || '?';
  };

  /* ---------- ข้อมูลโรงเรียน (แก้ได้จากหน้าแอดมิน) ---------- */
  // ใส่ data-site="school" | "area" | "site_name" | "school_line" | "logo" | "hero1" | "hero2" | "hero_desc" | "footer" ที่ element
  PR.applySite = function (site) {
    if (!site) return;
    PR.store.set('pr_site', site);
    var nodes = d.querySelectorAll('[data-site]');
    for (var i = 0; i < nodes.length; i++) {
      var k = nodes[i].getAttribute('data-site');
      var v = k === 'school_line' ? [site.school, site.area].filter(String).join(' · ') : site[k];
      if (v === undefined || v === null || v === '') continue;
      if (k === 'logo') { if (nodes[i].getAttribute('src') !== v) nodes[i].setAttribute('src', v); }
      else if (nodes[i].textContent !== v) nodes[i].textContent = v; // ข้อความเดิมไม่เปลี่ยน → คงการตัดคำเดิมไว้
    }
    var icon = d.querySelector('link[rel="icon"]');
    if (icon && site.logo) icon.setAttribute('href', site.logo);
    var base = d.documentElement.getAttribute('data-title');
    if (base !== null) d.title = (base ? base + ' – ' : '') + site.site_name + ' ' + site.school;
  };

  /* ---------- นาฬิกาเวลาปัจจุบัน (เวลาประเทศไทย) ---------- */
  // <span data-clock></span> = วันเสาร์ที่ 7 พฤศจิกายน 2569 · 01:21:05 น.
  // <span data-clock="short"></span> = 7 พ.ย. 2569 · 01:21 น.
  PR.nowText = function (short) {
    var n = new Date();
    try {
      if (short) {
        return n.toLocaleDateString('th-TH', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' +
          n.toLocaleTimeString('th-TH', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }) + ' น.';
      }
      return n.toLocaleDateString('th-TH', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' · ' +
        n.toLocaleTimeString('th-TH', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' น.';
    } catch (e) { return n.toString(); }
  };
  function tickClock() {
    var nodes = d.querySelectorAll('[data-clock]');
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = PR.nowText(nodes[i].getAttribute('data-clock') === 'short');
  }
  d.addEventListener('DOMContentLoaded', function () {
    PR.applySite(PR.store.get('pr_site'));
    tickClock();
    setInterval(tickClock, 1000);
  });

  /* ---------- เตรียมรูปก่อนอัปโหลด: ย่อขนาดในเครื่อง แล้วแปลงเป็น base64 ---------- */
  // cb(err, { name, mime, data, size })
  PR.prepareImage = function (file, maxSide, keepPng, cb) {
    var url = (w.URL || w.webkitURL).createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      var cw = Math.round(img.naturalWidth * scale), ch = Math.round(img.naturalHeight * scale);
      var canvas = d.createElement('canvas');
      canvas.width = cw; canvas.height = ch;
      var ctx = canvas.getContext('2d');
      var png = keepPng && file.type === 'image/png';
      if (!png) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch); }
      ctx.drawImage(img, 0, 0, cw, ch);
      (w.URL || w.webkitURL).revokeObjectURL(url);
      var mime = png ? 'image/png' : 'image/jpeg';
      var dataUrl = canvas.toDataURL(mime, 0.88);
      var data = dataUrl.slice(dataUrl.indexOf(',') + 1);
      var name = String(file.name || 'photo').replace(/\.[^.]+$/, '') + (png ? '.png' : '.jpg');
      cb(null, { name: name, mime: mime, data: data, size: Math.round(data.length * 0.75) });
    };
    img.onerror = function () { (w.URL || w.webkitURL).revokeObjectURL(url); cb(new Error('เปิดไฟล์ภาพ ' + file.name + ' ไม่ได้')); };
    img.src = url;
  };

  /* ---------- เอฟเฟกต์ค่อยๆ ปรากฏเมื่อเลื่อนถึง ---------- */
  var io = null;
  if (w.IntersectionObserver) {
    io = new w.IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  }
  PR.reveal = function (root) {
    var list = (root || d).querySelectorAll('.reveal:not(.in)');
    for (var i = 0; i < list.length; i++) {
      if (io) io.observe(list[i]); else list[i].classList.add('in');
    }
  };
  d.addEventListener('DOMContentLoaded', function () { PR.reveal(d); });

  /* ---------- SweetAlert2 ธีมเดียวกับเว็บ ---------- */
  if (w.Swal) {
    PR.swal = w.Swal.mixin({
      buttonsStyling: false,
      showClass: { popup: 'pr-pop-in', backdrop: 'swal2-backdrop-show' },
      hideClass: { popup: 'pr-pop-out', backdrop: 'swal2-backdrop-hide' },
      customClass: {
        container: 'pr-backdrop',
        popup: 'pr-swal',
        title: 'pr-swal-title',
        htmlContainer: 'pr-swal-text',
        actions: 'pr-swal-actions',
        confirmButton: 'pr-btn pr-btn-primary',
        cancelButton: 'pr-btn pr-btn-ghost',
        denyButton: 'pr-btn pr-btn-danger'
      },
      cancelButtonText: 'ยกเลิก',
      confirmButtonText: 'ตกลง'
    });
    PR.toast = w.Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      showClass: { popup: 'pr-toast-in' },
      hideClass: { popup: 'pr-toast-out' },
      customClass: { popup: 'pr-toast' },
      didOpen: function (t) {
        t.addEventListener('mouseenter', w.Swal.stopTimer);
        t.addEventListener('mouseleave', w.Swal.resumeTimer);
      }
    });
  }

  PR.copy = function (text) {
    function fallback() {
      var ta = d.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      d.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = d.execCommand('copy'); } catch (e) { ok = false; }
      d.body.removeChild(ta);
      done(ok);
    }
    function done(ok) {
      if (PR.toast) PR.toast.fire({ icon: ok ? 'success' : 'error', title: ok ? 'คัดลอกลิงก์แล้ว' : 'คัดลอกไม่สำเร็จ' });
    }
    if (w.navigator.clipboard && w.isSecureContext) {
      w.navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
    } else {
      fallback();
    }
  };

  PR.share = function (title, url) {
    if (w.navigator.share) {
      w.navigator.share({ title: title, url: url }).catch(function () { /* ผู้ใช้ยกเลิก */ });
    } else {
      PR.copy(url);
    }
  };

  PR.qr = function (title, url) {
    var src = 'https://quickchart.io/qr?size=600&margin=2&format=png&text=' + encodeURIComponent(url);
    PR.swal.fire({
      title: 'สแกนเพื่อเปิดอัลบั้ม',
      html: '<div class="pr-qr-frame"><img src="' + src + '" alt="QR Code อัลบั้ม ' + PR.esc(title) + '" width="200" height="200"></div>' +
        '<div style="font-weight:600;color:#0F172A;line-height:1.6">' + PR.esc(title) + '</div>' +
        '<div style="font-size:12px;color:#64748B;word-break:break-all;margin-top:4px;line-height:1.6">' + PR.esc(url) + '</div>',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'เปิดภาพ QR',
      denyButtonText: 'คัดลอกลิงก์',
      cancelButtonText: 'ปิด',
      customClass: { container: 'pr-backdrop', popup: 'pr-swal', title: 'pr-swal-title', htmlContainer: 'pr-swal-text', actions: 'pr-swal-actions', confirmButton: 'pr-btn pr-btn-primary', denyButton: 'pr-btn pr-btn-soft', cancelButton: 'pr-btn pr-btn-ghost' }
    }).then(function (r) {
      if (r.isConfirmed) w.open(src, '_blank');
      else if (r.isDenied) PR.copy(url);
    });
  };

  /* ---------- ป๊อปอัปโหลดแบบตัวการ์ตูน "กล้องน้อย" วิ่งไปเส้นชัย ---------- */
  var MASCOT = '<svg class="pr-mascot" viewBox="0 0 64 64" width="52" height="52" aria-hidden="true">' +
    '<g class="pr-legs"><path class="pr-leg pr-leg-a" d="M24 46 L20 58" stroke="#0F172A" stroke-width="4" stroke-linecap="round"/>' +
    '<path class="pr-leg pr-leg-b" d="M40 46 L44 58" stroke="#0F172A" stroke-width="4" stroke-linecap="round"/></g>' +
    '<rect x="22" y="8" width="12" height="7" rx="2" fill="#115E59"/>' +
    '<rect x="8" y="13" width="48" height="34" rx="10" fill="#0F766E"/>' +
    '<rect x="44" y="17" width="7" height="4" rx="2" fill="#FDE68A"/>' +
    '<circle cx="32" cy="30" r="11" fill="#F0FDFA"/><circle cx="32" cy="30" r="7" fill="#134E4A"/><circle cx="29.5" cy="27.5" r="2.2" fill="#fff"/>' +
    '<circle cx="15" cy="22" r="2" fill="#fff"/><circle cx="15" cy="22" r="1" fill="#0F172A"/>' +
    '<path d="M12 38 q3 3 6 0" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<path class="pr-arm" d="M8 32 L2 28" stroke="#0F172A" stroke-width="3.5" stroke-linecap="round"/>' +
    '</svg>';

  // PR.runner.open({ title, text }) → { set(pct, text), done(text), close() }
  PR.runner = {
    open: function (opt) {
      opt = opt || {};
      PR.swal.fire({
        title: opt.title || 'กำลังเตรียมไฟล์',
        html: '<div class="pr-run" id="pr-run">' +
          '<div class="pr-run-pct"><span id="pr-run-pct">0</span>%</div>' +
          '<div class="pr-run-track">' +
            '<div class="pr-run-mascot" id="pr-run-mascot">' + MASCOT + '<span class="pr-dust"></span></div>' +
            '<div class="pr-run-flag" aria-hidden="true"><svg viewBox="0 0 24 32" width="22" height="30"><path d="M4 2v28" stroke="#64748B" stroke-width="2.5" stroke-linecap="round"/><path d="M5 3h14l-4 5 4 5H5z" fill="#F59E0B"/></svg></div>' +
            '<div class="pr-run-line"><div class="pr-run-fill" id="pr-run-fill"></div></div>' +
          '</div>' +
          '<div class="pr-run-text" id="pr-run-text" aria-live="polite">' + PR.esc(opt.text || 'กำลังเริ่ม…') + '</div>' +
          '</div>',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false
      });
      var api = {
        pct: 0,
        set: function (p, text) {
          p = Math.max(0, Math.min(100, p));
          api.pct = p;
          var f = el('pr-run-fill'), m = el('pr-run-mascot'), t = el('pr-run-pct');
          if (!f) return;
          f.style.width = p + '%';
          m.style.left = 'calc(26px + (100% - 64px) * ' + (p / 100) + ')';
          t.textContent = Math.round(p);
          if (text) el('pr-run-text').textContent = text;
        },
        done: function (text) {
          api.set(100, text || 'เสร็จแล้ว!');
          var box = el('pr-run');
          if (box) box.className += ' pr-run-done';
        },
        close: function () { if (w.Swal) w.Swal.close(); }
      };
      function el(id) { return d.getElementById(id); }
      setTimeout(function () { api.set(0); }, 0);
      return api;
    },

    // วิ่งไปเรื่อยๆ ตามเวลาที่คาดไว้ (หยุดรอที่ ~92%) จนกว่าจะเรียก finish()
    estimate: function (runner, seconds, stages) {
      var start = Date.now();
      var timer = setInterval(function () {
        var t = (Date.now() - start) / 1000;
        var p = 92 * (1 - Math.exp(-2.2 * t / Math.max(1, seconds)));
        var label = '';
        for (var i = 0; i < stages.length; i++) if (p >= stages[i][0]) label = stages[i][1];
        runner.set(p, label);
      }, 180);
      return function finish() { clearInterval(timer); };
    }
  };

  PR.notConfiguredHtml = function () {
    return '<div class="col-span-full rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">' +
      '<div class="font-display text-lg font-bold">ยังไม่ได้ตั้งค่า API_URL</div>' +
      '<p class="mt-1 text-sm">เปิดไฟล์ config.js แล้วใส่ URL ของ Web App (ลงท้าย /exec) จาก Apps Script</p></div>';
  };

  w.PR = PR;
})(window, document);

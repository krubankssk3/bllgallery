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

  // เรียก Admin API (POST แบบ text/plain ไม่ต้องผ่าน preflight) หมดเวลา ms (ปกติ 60 วินาที)
  PR.post = function (body, ms) {
    var req = fetch(C.API_URL + '?api=admin', { method: 'POST', body: JSON.stringify(body) }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
    var timeout = new Promise(function (resolve, reject) {
      setTimeout(function () { reject(new Error('timeout')); }, ms || 60000);
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

  // แถบวิ่ง (ใช้ร่วมกันทั้งป๊อปอัป, โหลดเต็มจอ, โหลดในหน้า)
  function trackHtml(text) {
    return '<div class="pr-run">' +
      '<div class="pr-run-pct"><span class="pr-run-n">0</span>%</div>' +
      '<div class="pr-run-track">' +
        '<div class="pr-run-mascot">' + MASCOT + '<span class="pr-dust"></span></div>' +
        '<div class="pr-run-flag" aria-hidden="true"><svg viewBox="0 0 24 32" width="22" height="30"><path d="M4 2v28" stroke="#64748B" stroke-width="2.5" stroke-linecap="round"/><path d="M5 3h14l-4 5 4 5H5z" fill="#F59E0B"/></svg></div>' +
        '<div class="pr-run-line"><div class="pr-run-fill"></div></div>' +
      '</div>' +
      '<div class="pr-run-text" aria-live="polite">' + PR.esc(text || 'กำลังเริ่ม…') + '</div>' +
      '</div>';
  }

  // ตัวควบคุมแถบวิ่ง getRoot() คืน .pr-run ปัจจุบัน (หาใหม่ทุกครั้ง เผื่อถูกแทนที่)
  function makeCtl(getRoot) {
    var api = {
      pct: 0,
      set: function (p, text) {
        p = Math.max(0, Math.min(100, p));
        api.pct = p;
        var r = getRoot();
        if (!r) return;
        var f = r.querySelector('.pr-run-fill'), m = r.querySelector('.pr-run-mascot'), n = r.querySelector('.pr-run-n');
        f.style.width = p + '%';
        m.style.left = 'calc(26px + (100% - 64px) * ' + (p / 100) + ')';
        n.textContent = Math.round(p);
        if (text) r.querySelector('.pr-run-text').textContent = text;
      },
      text: function (text) {
        var r = getRoot();
        if (r && text) r.querySelector('.pr-run-text').textContent = text;
      },
      done: function (text) {
        api.set(100, text || 'เสร็จแล้ว!');
        var r = getRoot();
        if (r && r.className.indexOf('pr-run-done') < 0) r.className += ' pr-run-done';
      }
    };
    return api;
  }

  // PR.runner.open({ title, text }) → { set(pct, text), done(text), close() }  (ป๊อปอัป SweetAlert)
  PR.runner = {
    open: function (opt) {
      opt = opt || {};
      PR.swal.fire({
        title: opt.title || 'กำลังเตรียมไฟล์',
        html: '<div class="pr-run-host">' + trackHtml(opt.text) + '</div>',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false
      });
      var api = makeCtl(function () { return d.querySelector('.swal2-container .pr-run'); });
      api.close = function () { if (w.Swal) w.Swal.close(); };
      api.alive = function () { return !!d.querySelector('.swal2-container .pr-run'); };
      setTimeout(function () { api.set(0); }, 0);
      return api;
    },

    // วิ่งไปเรื่อยๆ ตามเวลาที่คาดไว้ (หยุดรอที่ ~92%) จนกว่าจะเรียก finish()
    // stages = [[เปอร์เซ็นต์, 'ข้อความ'], ...] ไม่ใส่ก็ได้
    estimate: function (runner, seconds, stages) {
      stages = stages || [];
      var start = Date.now();
      var timer = setInterval(function () {
        var t = (Date.now() - start) / 1000;
        if (t > 1 && runner.alive && !runner.alive()) { clearInterval(timer); return; } // ป๊อปอัปถูกปิด/แทนที่แล้ว
        var p = 92 * (1 - Math.exp(-2.2 * t / Math.max(1, seconds)));
        var label = '';
        for (var i = 0; i < stages.length; i++) if (p >= stages[i][0]) label = stages[i][1];
        runner.set(Math.max(runner.pct, p), label);
      }, 180);
      return function finish() { clearInterval(timer); };
    }
  };

  /* ---------- โหลดเต็มจอ (เปิดหน้าครั้งแรก, ล็อกอิน, เตรียมข้อมูลก่อนเข้าแอดมิน) ---------- */
  // PR.loader.show('กำลังโหลด…', วินาทีที่คาด) · PR.loader.set('ข้อความใหม่') · PR.loader.hide(ทันที?)
  PR.loader = (function () {
    var box = null, ctl = null, finish = null, hideTimer = null, shown = false;
    function logo() {
      var site = PR.store.get('pr_site');
      return (site && site.logo) || C.LOGO || '';
    }
    function name() {
      var site = PR.store.get('pr_site');
      return site ? [site.site_name, site.school].filter(String).join(' ') : '';
    }
    function build() {
      box = d.createElement('div');
      box.className = 'pr-loader';
      box.setAttribute('role', 'status');
      d.body.appendChild(box);
      ctl = makeCtl(function () { return box && box.querySelector('.pr-run'); });
    }
    return {
      show: function (text, seconds) {
        if (!d.body) return;
        if (!box) build();
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
        if (finish) finish();
        var lg = logo(), nm = name();
        box.innerHTML = '<div class="pr-loader-card">' +
          (lg ? '<img class="pr-loader-logo" src="' + PR.esc(lg) + '" alt="">' : '') +
          (nm ? '<div class="pr-loader-name">' + PR.esc(nm) + '</div>' : '') +
          trackHtml(text || 'กำลังโหลด…') + '</div>';
        box.className = 'pr-loader';
        // บังคับให้เบราว์เซอร์วาดก่อน แล้วค่อยเฟดเข้า
        void box.offsetWidth;
        box.className = 'pr-loader pr-loader-in';
        shown = true;
        ctl.pct = 0;
        ctl.set(0);
        finish = PR.runner.estimate(ctl, seconds || 4);
      },
      set: function (text, pct) {
        if (!shown) return;
        if (typeof pct === 'number') ctl.set(Math.max(ctl.pct, pct), text);
        else ctl.text(text);
      },
      hide: function (instant) {
        if (!shown || !box) return;
        shown = false;
        if (finish) { finish(); finish = null; }
        var b = box;
        if (instant) { b.className = 'pr-loader'; return; }
        ctl.done('พร้อมแล้ว!');
        hideTimer = setTimeout(function () {
          b.className = 'pr-loader pr-loader-in pr-loader-out';
          hideTimer = setTimeout(function () { if (!shown) b.className = 'pr-loader'; hideTimer = null; }, 320);
        }, 420);
      },
      active: function () { return shown; }
    };
  })();

  /* ---------- โหลดในพื้นที่หน้า (เปลี่ยนเมนูแอดมิน ฯลฯ) ---------- */
  // ใส่กล้องน้อยวิ่งลงใน container แทนเนื้อหาเดิม ตัวจับเวลาหยุดเองเมื่อถูกแทนที่
  PR.inlineLoader = function (container, text, seconds) {
    if (!container) return;
    container.innerHTML = '<div class="pr-inline-load" data-loading="1">' + trackHtml(text || 'กำลังโหลดข้อมูล…') + '</div>';
    var holder = container.firstChild;
    var ctl = makeCtl(function () { return holder.parentNode ? holder.querySelector('.pr-run') : null; });
    var finish = PR.runner.estimate(ctl, seconds || 3);
    var watch = setInterval(function () {
      if (!holder.parentNode) { finish(); clearInterval(watch); }
    }, 400);
  };

  /* ---------- กราฟสถิติ (HTML/SVG ล้วน ไม่ใช้ไลบรารี) ---------- */
  // PR.chart.bars(el, { labels, series:[{name,color,values}], unit })  กราฟแท่ง (ซ้อนได้)
  // PR.chart.donut(el, { items:[{label,value,color}], center, unit })   กราฟวงกลม
  // PR.chart.hbars(el, { items:[{label,value,href}], color, unit })     แท่งแนวนอน (อันดับ)
  // PR.chart.observe(root)  เริ่มเอฟเฟคเมื่อเลื่อนมาเห็น และนับตัวเลข [data-count]
  PR.chart = (function () {
    var tip = null;
    function tipEl() {
      if (!tip) {
        tip = d.createElement('div');
        tip.className = 'pr-tip';
        tip.setAttribute('role', 'tooltip');
        d.body.appendChild(tip);
      }
      return tip;
    }
    function showTip(html, x, y) {
      var t = tipEl();
      t.innerHTML = html;
      t.className = 'pr-tip on';
      var r = t.getBoundingClientRect();
      var left = Math.max(8, Math.min(x - r.width / 2, w.innerWidth - r.width - 8));
      var top = y - r.height - 12;
      if (top < 8) top = y + 16;
      t.style.left = left + 'px';
      t.style.top = top + 'px';
    }
    function hideTip() { if (tip) tip.className = 'pr-tip'; }
    // แตะ/ชี้ที่ [data-tip] แสดงป้ายข้อมูล
    function bindTips(root) {
      var cur = null;
      function on(e) {
        var t = e.target.closest ? e.target.closest('[data-tip]') : null;
        if (!t || !root.contains(t)) { if (cur) { hideTip(); cur = null; } return; }
        cur = t;
        var r = t.getBoundingClientRect();
        showTip(t.getAttribute('data-tip'), r.left + r.width / 2, r.top);
        var hl = t.getAttribute('data-hl');
        if (hl !== null) highlight(root, hl);
      }
      root.addEventListener('mouseover', on);
      root.addEventListener('focusin', on);
      root.addEventListener('mouseleave', function () { hideTip(); cur = null; highlight(root, null); });
      root.addEventListener('focusout', function () { hideTip(); highlight(root, null); });
    }
    function highlight(root, key) {
      var els = root.querySelectorAll('[data-hl]');
      for (var i = 0; i < els.length; i++) {
        var on = key === null || els[i].getAttribute('data-hl') === key;
        els[i].classList.toggle('dim', !on);
      }
      var c = root.querySelector('.pr-donut-center');
      if (c) {
        var item = key === null ? null : root._items[Number(key)];
        c.innerHTML = item
          ? '<b>' + PR.num(item.value) + '</b><span>' + PR.esc(item.label) + ' · ' + pct(item.value, root._total) + '</span>'
          : '<b>' + PR.num(root._total) + '</b><span>' + PR.esc(root._center) + '</span>';
      }
    }
    function pct(v, total) {
      if (!total) return '0%';
      var p = v / total * 100;
      return (p >= 10 || p === 0 ? Math.round(p) : p.toFixed(1)) + '%';
    }
    // ค่าสูงสุดของแกนแบบตัวเลขกลมๆ
    function niceMax(v) {
      if (v <= 4) return 4;
      var mag = Math.pow(10, Math.floor(Math.log(v) / Math.LN10));
      var steps = [1, 2, 2.5, 5, 10];
      for (var i = 0; i < steps.length; i++) if (steps[i] * mag * 4 >= v) return steps[i] * mag * 4;
      return 40 * mag;
    }
    function empty(el, text) {
      el.innerHTML = '<div class="pr-chart-empty">' + PR.esc(text || 'ยังไม่มีข้อมูล') + '</div>';
    }

    function bars(el, opt) {
      if (!el) return;
      var labels = opt.labels || [], series = opt.series || [], unit = opt.unit || 'ภาพ';
      var totals = labels.map(function (_, i) {
        var n = 0;
        series.forEach(function (s) { n += Number(s.values[i] || 0); });
        return n;
      });
      var max = Math.max.apply(null, totals.concat([0]));
      if (!max) return empty(el, opt.empty);
      var top = niceMax(max);
      var peak = totals.indexOf(max);
      var grid = '';
      for (var g = 0; g <= 4; g++) {
        grid += '<div class="pr-bars-grid" style="bottom:' + (g * 25) + '%"><span>' + PR.num(Math.round(top * g / 4)) + '</span></div>';
      }
      var every = labels.length > 7 ? (labels.length > 18 ? 3 : 2) : 1; // จอเล็ก: ป้ายแกนล่างเว้นช่วงถ้าแน่นเกิน
      var cols = labels.map(function (lab, i) {
        var stack = '', tipRows = '';
        series.forEach(function (s) {
          var v = Number(s.values[i] || 0);
          if (series.length > 1) tipRows += '<div class="pr-tip-row"><i style="background:' + s.color + '"></i>' + PR.esc(s.name) + '<b>' + PR.num(v) + '</b></div>';
          if (v) stack += '<div class="pr-bar-seg" style="height:' + (v / totals[i] * 100) + '%;background:' + s.color + '"></div>';
        });
        var tipHtml = '<div class="pr-tip-head">' + PR.esc(lab) + '</div>' + (series.length > 1 ? tipRows : '') +
          '<div class="pr-tip-total">' + PR.num(totals[i]) + ' ' + unit + '</div>';
        return '<div class="pr-bar-col" tabindex="0" data-tip="' + PR.esc(tipHtml) + '" aria-label="' + PR.esc(lab + ' ' + totals[i] + ' ' + unit) + '">' +
          '<div class="pr-bar" style="height:' + (totals[i] / top * 100) + '%;--i:' + i + '">' +
            (i === peak ? '<span class="pr-bar-val">' + PR.num(totals[i]) + '</span>' : '') + stack + '</div>' +
          '<span class="pr-bar-lab' + ((labels.length - 1 - i) % every ? ' pr-hide-sm' : '') + '">' + PR.esc(lab) + '</span></div>';
      }).join('');
      var legend = series.length > 1 ? '<div class="pr-legend">' + series.map(function (s) {
        return '<span><i style="background:' + s.color + '"></i>' + PR.esc(s.name) + '</span>';
      }).join('') + '</div>' : '';
      el.innerHTML = '<div class="pr-chart pr-bars-wrap" role="img" aria-label="' + PR.esc(opt.title || 'กราฟแท่ง') + '">' + legend +
        '<div class="pr-bars" style="height:' + (opt.height || 220) + 'px">' + grid + '<div class="pr-bars-cols">' + cols + '</div></div></div>';
      bindTips(el.firstChild);
    }

    function donut(el, opt) {
      if (!el) return;
      var items = (opt.items || []).filter(function (x) { return Number(x.value) > 0; });
      var total = 0;
      items.forEach(function (x) { total += Number(x.value); });
      if (!total) return empty(el, opt.empty);
      var R = 70, C = 2 * Math.PI * R, gap = items.length > 1 ? 2.5 : 0, off = 0;
      var segs = items.map(function (x, i) {
        var len = Number(x.value) / total * C;
        var vis = Math.max(0.01, len - gap);
        var seg = '<circle class="pr-donut-seg" data-hl="' + i + '" data-tip="' + PR.esc('<div class="pr-tip-head">' + PR.esc(x.label) + '</div><div class="pr-tip-total">' + PR.num(x.value) + ' ' + (opt.unit || 'ภาพ') + ' · ' + pct(x.value, total) + '</div>') + '"' +
          ' cx="90" cy="90" r="' + R + '" fill="none" stroke="' + x.color + '" stroke-width="26"' +
          ' style="--len:' + vis.toFixed(2) + ';--c:' + C.toFixed(2) + ';--i:' + i + '" stroke-dasharray="' + vis.toFixed(2) + ' ' + C.toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '"></circle>';
        off += len;
        return seg;
      }).join('');
      var legend = items.map(function (x, i) {
        return '<li data-hl="' + i + '" tabindex="0" data-tip="' + PR.esc('<div class="pr-tip-head">' + PR.esc(x.label) + '</div><div class="pr-tip-total">' + PR.num(x.value) + ' ' + (opt.unit || 'ภาพ') + '</div>') + '">' +
          '<i style="background:' + x.color + '"></i><span class="pr-lg-name">' + PR.esc(x.label) + '</span>' +
          '<span class="pr-lg-val">' + PR.num(x.value) + '</span><span class="pr-lg-pct">' + pct(x.value, total) + '</span></li>';
      }).join('');
      el.innerHTML = '<div class="pr-chart pr-donut-wrap" role="img" aria-label="' + PR.esc((opt.title || 'สัดส่วน') + ': ' + items.map(function (x) { return x.label + ' ' + x.value; }).join(', ')) + '">' +
        '<div class="pr-donut"><svg viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="' + R + '" fill="none" stroke="#F1F5F9" stroke-width="26"></circle>' +
        '<g transform="rotate(-90 90 90)">' + segs + '</g></svg><div class="pr-donut-center"></div></div>' +
        '<ul class="pr-donut-legend">' + legend + '</ul></div>';
      var root = el.firstChild;
      root._items = items; root._total = total; root._center = opt.center || 'ทั้งหมด';
      highlight(root, null);
      bindTips(root);
    }

    function hbars(el, opt) {
      if (!el) return;
      var items = (opt.items || []).filter(function (x) { return Number(x.value) > 0; });
      if (!items.length) return empty(el, opt.empty);
      var max = items[0].value;
      items.forEach(function (x) { if (x.value > max) max = x.value; });
      el.innerHTML = '<ol class="pr-chart pr-hbars" aria-label="' + PR.esc(opt.title || 'อันดับ') + '">' + items.map(function (x, i) {
        var name = x.href ? '<a href="' + PR.esc(x.href) + '">' + PR.esc(x.label) + '</a>' : PR.esc(x.label);
        return '<li style="--i:' + i + '"><span class="pr-hb-rank">' + (i + 1) + '</span>' +
          '<div class="pr-hb-body"><div class="pr-hb-top"><span class="pr-hb-name">' + name + '</span><span class="pr-hb-val">' + PR.num(x.value) + ' ' + PR.esc(opt.unit || '') + '</span></div>' +
          '<div class="pr-hb-track"><div class="pr-hb-fill" style="width:' + Math.max(2, x.value / max * 100) + '%;background:' + (x.color || opt.color || '#0F766E') + '"></div></div></div></li>';
      }).join('') + '</ol>';
    }

    // นับตัวเลขขึ้นจาก 0 (ใช้กับ [data-count])
    function countUp(node) {
      var target = Number(node.getAttribute('data-count') || 0);
      if (!target || w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches) { node.textContent = PR.num(target); return; }
      var start = Date.now(), dur = 900;
      (function tick() {
        var t = Math.min(1, (Date.now() - start) / dur);
        node.textContent = PR.num(Math.round(target * (1 - Math.pow(1 - t, 3))));
        if (t < 1) { if (w.requestAnimationFrame) w.requestAnimationFrame(tick); else setTimeout(tick, 16); }
      })();
    }

    function observe(root) {
      var targets = (root || d).querySelectorAll('.pr-chart:not(.in), [data-count]:not(.counted)');
      var go = function (n) {
        if (n.hasAttribute('data-count')) { n.classList.add('counted'); countUp(n); }
        else n.classList.add('in');
      };
      if (!('IntersectionObserver' in w)) { for (var i = 0; i < targets.length; i++) go(targets[i]); return; }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { go(en.target); io.unobserve(en.target); } });
      }, { threshold: 0.2 });
      for (var j = 0; j < targets.length; j++) io.observe(targets[j]);
    }

    // ชุดสีกราฟ 8 ช่อง (ตรวจตาบอดสีแล้ว) ใช้ตามลำดับคงที่ ห้ามวนสี เกิน 8 รวมเป็น "อื่นๆ"
    var PALETTE = ['#2A78D6', '#EB6834', '#1BAF7A', '#EDA100', '#E87BA4', '#008300', '#6250D6', '#E34948'];
    function slot(i) { return i < PALETTE.length ? PALETTE[i] : '#CBD5E1'; }
    return { bars: bars, donut: donut, hbars: hbars, observe: observe, pct: pct, slot: slot };
  })();

  PR.notConfiguredHtml = function () {
    return '<div class="col-span-full rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">' +
      '<div class="font-display text-lg font-bold">ยังไม่ได้ตั้งค่า API_URL</div>' +
      '<p class="mt-1 text-sm">เปิดไฟล์ config.js แล้วใส่ URL ของ Web App (ลงท้าย /exec) จาก Apps Script</p></div>';
  };

  w.PR = PR;
})(window, document);

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

  /* ---------- SweetAlert2 ธีมเดียวกับเว็บ ---------- */
  if (w.Swal) {
    PR.swal = w.Swal.mixin({
      buttonsStyling: false,
      customClass: {
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
      customClass: { popup: 'pr-toast' }
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
      title: 'QR Code อัลบั้ม',
      html: '<img src="' + src + '" alt="QR Code" style="width:220px;height:220px;margin:4px auto 10px;border-radius:12px">' +
        '<div style="font-weight:600;color:#0F172A">' + PR.esc(title) + '</div>' +
        '<div style="font-size:12px;color:#64748B;word-break:break-all;margin-top:4px">' + PR.esc(url) + '</div>',
      showCancelButton: true,
      confirmButtonText: 'เปิดภาพ QR',
      cancelButtonText: 'ปิด'
    }).then(function (r) {
      if (r.isConfirmed) w.open(src, '_blank');
    });
  };

  PR.notConfiguredHtml = function () {
    return '<div class="col-span-full rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">' +
      '<div class="font-display text-lg font-bold">ยังไม่ได้ตั้งค่า API_URL</div>' +
      '<p class="mt-1 text-sm">เปิดไฟล์ config.js แล้วใส่ URL ของ Web App (ลงท้าย /exec) จาก Apps Script</p></div>';
  };

  w.PR = PR;
})(window, document);

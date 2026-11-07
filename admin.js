/*
 * admin.js : หน้าแอดมินคลังภาพประชาสัมพันธ์ (ES5)
 * ต้องโหลดหลัง SweetAlert2, config.js, common.js
 */
(function () {
  var S = { token: '', user: null, albums: [], categories: [], album: null, photos: [], sel: {}, filter: 'all', q: '' };
  var V = document.getElementById('view');
  var esc = PR.esc;
  var quiet = false; // true = อัปเดตหน้าเดิม ไม่ต้องเล่นเอฟเฟกต์เปิดหน้า

  // เล่นเอฟเฟกต์ค่อยๆ ปรากฏทุกครั้งที่เปลี่ยนหน้า
  if (window.MutationObserver) {
    new window.MutationObserver(function () {
      // เนื้อหาจริงมาแทนกล้องน้อยแล้ว → ปิดหน้าโหลดเต็มจอ (ตอนล็อกอิน/เตรียมข้อมูล)
      if (PR.loader.active() && !V.querySelector('[data-loading]')) PR.loader.hide();
      if (quiet) { quiet = false; return; }
      V.classList.remove('view-enter');
      void V.offsetWidth;
      V.classList.add('view-enter');
    }).observe(V, { childList: true });
  }

  function el(id) { return document.getElementById(id); }

  /* ---------- เก็บ token ในแท็บนี้ ---------- */
  function sget(k) { try { return window.sessionStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function sset(k, v) { try { if (v) window.sessionStorage.setItem(k, v); else window.sessionStorage.removeItem(k); } catch (e) { /* ignore */ } }

  /* ---------- เรียก API ---------- */
  function call(action, data, ms) {
    var body = data || {};
    body.action = action;
    body.token = S.token;
    return PR.post(body, ms).then(function (r) {
      if (r && r.error === 'auth') { showLogin('หมดเวลาการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่'); throw new Error('auth'); }
      if (!r || !r.ok) throw new Error((r && r.message) || 'ทำรายการไม่สำเร็จ');
      return r;
    });
  }

  // กล้องน้อยวิ่งระหว่างบันทึก: busy(หัวข้อ, ข้อความ, วินาทีที่คาด) → ok()/fail()
  var BUSY = null;
  function busy(title, text, seconds) {
    endBusy();
    var r = PR.runner.open({ title: title || 'กำลังบันทึก…', text: text || 'กล้องน้อยกำลังส่งข้อมูลไปที่ระบบ…' });
    BUSY = { r: r, finish: PR.runner.estimate(r, seconds || 3, [[60, 'อีกนิดเดียว…']]) };
  }
  function endBusy() {
    if (BUSY) { BUSY.finish(); BUSY = null; }
  }
  function ok(msg) {
    var b = BUSY;
    endBusy();
    if (b && b.r.alive()) {
      b.r.done(msg || 'เสร็จแล้ว!');
      setTimeout(function () { if (b.r.alive()) b.r.close(); PR.toast.fire({ icon: 'success', title: msg }); }, 520);
      return;
    }
    if (window.Swal.isVisible()) window.Swal.close();
    PR.toast.fire({ icon: 'success', title: msg });
  }
  function fail(err) {
    endBusy();
    if (err && err.message === 'auth') return;
    PR.swal.fire({ icon: 'error', title: 'ทำรายการไม่สำเร็จ', text: (err && err.message === 'timeout') ? 'เชื่อมต่อนานเกินไป ลองใหม่อีกครั้ง' : (err && err.message) || 'เกิดข้อผิดพลาด' });
  }
  function confirmBox(opt) {
    return PR.swal.fire({
      icon: opt.icon || 'warning',
      title: opt.title,
      html: opt.html || '',
      showCancelButton: true,
      confirmButtonText: opt.confirm || 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      customClass: { container: 'pr-backdrop', popup: 'pr-swal', title: 'pr-swal-title', htmlContainer: 'pr-swal-text', actions: 'pr-swal-actions', confirmButton: 'pr-btn ' + (opt.danger ? 'pr-btn-danger' : 'pr-btn-primary'), cancelButton: 'pr-btn pr-btn-ghost' }
    }).then(function (r) { return r.isConfirmed; });
  }

  /* ---------- ชิ้นส่วน UI ---------- */
  function card(inner, extra) {
    return '<div class="rounded-2xl border border-slate-200 bg-white shadow-sm ' + (extra || '') + '">' + inner + '</div>';
  }
  function heading(title, sub, right) {
    return '<div class="flex flex-wrap items-center justify-between gap-3">' +
      '<div class="flex flex-col gap-1"><h1 class="font-display text-[26px] font-bold">' + title + '</h1>' +
      (sub ? '<span class="text-sm text-slate-500">' + sub + '</span>' : '') + '</div>' + (right || '') + '</div>';
  }
  function btn(label, act, kind, attrs) {
    var cls = kind === 'primary' ? 'bg-teal-700 text-white shadow-md shadow-teal-700/25 hover:bg-teal-800'
      : kind === 'danger' ? 'bg-rose-600 text-white hover:bg-rose-700'
      : 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50';
    return '<button type="button" data-act="' + act + '" ' + (attrs || '') + ' class="h-11 rounded-xl px-4 text-sm font-semibold ' + cls + '">' + label + '</button>';
  }
  function statusPill(status) {
    return status === 'hidden'
      ? '<span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">ซ่อนอยู่</span>'
      : '<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">เผยแพร่</span>';
  }
  function thumb(fileId, size, extraCls) {
    var t = PR.tone(fileId ? fileId.length : 0);
    return '<div class="relative flex flex-none items-center justify-center overflow-hidden rounded-lg ' + (extraCls || '') + '" style="width:' + size + 'px;height:' + size + 'px;background:' + t[0] + '">' +
      PR.photoIcon(t[1], Math.round(size / 2.4)) +
      (fileId ? '<img src="' + PR.thumb(fileId, size * 2) + '" alt="" loading="lazy" referrerpolicy="no-referrer" class="absolute inset-0 h-full w-full object-cover" onerror="this.style.display=\'none\'">' : '') +
      '</div>';
  }
  function categoryOptions(selected, withEmpty) {
    return (withEmpty ? '<option value="">— ไม่ระบุหมวด —</option>' : '') + S.categories.map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (c.id === selected ? ' selected' : '') + '>' + esc(c.name) + '</option>';
    }).join('');
  }
  function loading(text) {
    PR.inlineLoader(V, text || 'กล้องน้อยกำลังไปหยิบข้อมูล…', 3);
  }
  function loadError(err) {
    PR.loader.hide(true);
    if (err && err.message === 'auth') return;
    V.innerHTML = card('<div class="p-8 text-center"><div class="font-display text-lg font-semibold">โหลดข้อมูลไม่สำเร็จ</div>' +
      '<p class="mt-1 text-sm text-slate-500">' + esc((err && err.message) || '') + '</p>' + '<div class="mt-4">' + btn('ลองใหม่', 'reload', 'primary') + '</div></div>');
  }

  /* ---------- ล็อกอิน ---------- */
  function showLogin(msg) {
    S.token = '';
    sset('pr_admin_token', '');
    el('app').classList.add('hidden'); el('app').classList.remove('flex');
    el('login').classList.remove('hidden'); el('login').classList.add('flex');
    el('login-form').classList.add('in');
    PR.loader.hide(true);
    endBusy();
    if (window.Swal && window.Swal.isVisible()) window.Swal.close();
    if (msg) PR.toast.fire({ icon: 'info', title: msg });
    el('lg-user').focus();
  }
  function showApp() {
    el('login').classList.add('hidden'); el('login').classList.remove('flex');
    el('app').classList.remove('hidden'); el('app').classList.add('flex');
    el('me-name').textContent = S.user ? S.user.name : '';
    route();
  }

  el('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var b = el('lg-btn');
    b.disabled = true; b.textContent = 'กำลังเข้าสู่ระบบ…';
    PR.loader.show('กำลังตรวจสอบบัญชีผู้ใช้…', 4);
    PR.post({ action: 'login', username: el('lg-user').value, password: el('lg-pass').value }).then(function (r) {
      if (!r.ok) throw new Error(r.message || 'เข้าสู่ระบบไม่สำเร็จ');
      S.token = r.token; S.user = r.user;
      PR.applySite(r.site);
      sset('pr_admin_token', r.token);
      el('lg-pass').value = '';
      PR.loader.set('เข้าสู่ระบบแล้ว กำลังเตรียมข้อมูลก่อนเข้าระบบ…', 45);
      showApp();
    }).catch(function (err) {
      PR.loader.hide(true);
      PR.swal.fire({ icon: 'error', title: 'เข้าสู่ระบบไม่สำเร็จ', text: err.message === 'timeout' ? 'เชื่อมต่อนานเกินไป ลองใหม่อีกครั้ง' : err.message });
    }).then(function () { b.disabled = false; b.textContent = 'เข้าสู่ระบบ'; });
  });

  el('btn-logout').addEventListener('click', function () {
    call('logout').catch(function () { /* ignore */ });
    showLogin('ออกจากระบบแล้ว');
  });

  el('btn-pass').addEventListener('click', function () {
    PR.swal.fire({
      title: 'เปลี่ยนรหัสผ่าน',
      html: '<div class="pr-form">' +
        '<div><label class="pr-label" for="cp-old">รหัสผ่านเดิม</label><input id="cp-old" type="password" class="pr-input" autocomplete="current-password"></div>' +
        '<div><label class="pr-label" for="cp-new">รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)</label><input id="cp-new" type="password" class="pr-input" autocomplete="new-password"></div>' +
        '<div><label class="pr-label" for="cp-new2">ยืนยันรหัสผ่านใหม่</label><input id="cp-new2" type="password" class="pr-input" autocomplete="new-password"></div></div>',
      showCancelButton: true, confirmButtonText: 'บันทึก',
      preConfirm: function () {
        var a = el('cp-new').value;
        if (a.length < 6) { window.Swal.showValidationMessage('รหัสผ่านใหม่ต้องยาวอย่างน้อย 6 ตัว'); return false; }
        if (a !== el('cp-new2').value) { window.Swal.showValidationMessage('ยืนยันรหัสผ่านไม่ตรงกัน'); return false; }
        return { old_password: el('cp-old').value, new_password: a };
      }
    }).then(function (r) {
      if (!r.isConfirmed) return;
      busy();
      call('changePassword', r.value).then(function () { ok('เปลี่ยนรหัสผ่านแล้ว'); }).catch(fail);
    });
  });

  /* ---------- เส้นทาง ---------- */
  function route() {
    var h = (window.location.hash || '#pending').slice(1);
    var parts = h.split('/');
    var view = parts[0];
    var items = document.querySelectorAll('#nav .nav-item');
    for (var i = 0; i < items.length; i++) {
      var v = items[i].getAttribute('data-view');
      items[i].classList.toggle('active', v === view || (view === 'album' && v === 'albums'));
    }
    if (view === 'albums') return viewAlbums();
    if (view === 'album') return viewAlbum(decodeURIComponent(parts[1] || ''));
    if (view === 'categories') return viewCategories();
    if (view === 'groups') return viewGroups();
    if (view === 'users') return viewUsers();
    if (view === 'settings') return viewSettings();
    if (view === 'site') return viewSite();
    return viewPending();
  }
  window.addEventListener('hashchange', function () { if (S.token) route(); });

  /* ================= ภาพรอจัดอัลบั้ม ================= */
  function viewPending() {
    loading();
    call('dashboard').then(function (r) {
      S.albums = r.albums; S.categories = r.categories;
      var badge = el('badge-pending');
      badge.textContent = r.stats.pending;
      badge.classList.toggle('hidden', !r.stats.pending);

      var tiles = [['อัลบั้มบนเว็บ', r.stats.albums, ''], ['ภาพบนเว็บ', r.stats.photos, ''], ['ภาพรอจัดอัลบั้ม', r.stats.pending, r.pending.length + ' ชุดภาพ' + (r.stats.awaiting ? ' · รอยืนยัน ' + r.stats.awaiting + ' ภาพ' : '')], ['ยอดเข้าชมทั้งหมด', r.views || 0, 'กลุ่ม LINE ที่เปิดรับ ' + r.stats.groups + ' กลุ่ม']];
      var stats = '<div class="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(170px,1fr))] sm:gap-4">' + tiles.map(function (t) {
        return card('<div class="flex flex-col gap-1 px-5 py-4"><span class="text-[13px] text-slate-500">' + t[0] + '</span>' +
          '<span class="font-display text-[28px] font-bold" data-count="' + Number(t[1] || 0) + '">' + PR.num(t[1]) + '</span>' + (t[2] ? '<span class="text-xs text-slate-500">' + t[2] + '</span>' : '') + '</div>');
      }).join('') + '</div>';

      var albumOpts = '<option value="">— เลือกอัลบั้ม —</option>' + S.albums.map(function (a) {
        return '<option value="' + esc(a.id) + '">' + esc(a.title) + '</option>';
      }).join('') + '<option value="__new">+ สร้างอัลบั้มใหม่…</option>';

      var list = r.pending.length ? r.pending.map(function (b) {
        var aw = Number(b.awaiting || 0);
        var thumbs = aw
          ? '<div class="flex h-[58px] w-[58px] flex-none flex-col items-center justify-center gap-0.5 rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-200">' +
            '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>' +
            '<span class="text-[10px] font-semibold leading-none">' + aw + ' ภาพ</span></div>'
          : b.files.slice(0, 3).map(function (f) { return thumb(f, 58); }).join('') +
            (b.count > 3 ? '<div class="flex h-[58px] w-[58px] flex-none items-center justify-center rounded-lg bg-slate-100 text-[13px] font-semibold text-slate-700">+' + (b.count - 3) + '</div>' : '');
        var old = aw && b.at && (Date.now() - new Date(b.at).getTime() > 20 * 3600000);
        var note = aw
          ? '<span class="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">ยังไม่บันทึกเข้าระบบ · รอยืนยัน' + (b.failed ? ' (ดึงไม่สำเร็จ ' + b.failed + ')' : '') + '</span>' +
            (old ? '<span class="text-xs text-rose-600">ส่งมานานแล้ว LINE อาจลบไฟล์ไปแล้ว ควรยืนยันโดยเร็ว</span>' : '')
          : '';
        return '<div data-batch="' + esc(b.batch_id) + '" data-awaiting="' + aw + '" class="flex flex-wrap items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-0">' +
          '<div class="flex gap-1.5">' + thumbs + '</div>' +
          '<div class="flex min-w-[180px] flex-1 flex-col gap-0.5"><span class="text-[15px] font-semibold">' + b.count + ' ภาพ · ' + esc(b.sender || 'ไม่ทราบชื่อ') + '</span>' +
          '<span class="text-[13px] text-slate-500">' + esc(b.group) + ' · ' + PR.timeAgo(b.at) + '</span>' + note + '</div>' +
          '<label class="sr-only" for="sel-' + esc(b.batch_id) + '">เลือกอัลบั้ม</label>' +
          '<select id="sel-' + esc(b.batch_id) + '" data-role="album" class="h-11 min-w-[200px] flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm sm:flex-none">' + albumOpts + '</select>' +
          '<div class="flex gap-2">' + btn(aw ? 'ยืนยันบันทึก' : 'ยืนยัน', 'assign', 'primary') +
          '<button type="button" data-act="hideBatch" aria-label="' + (aw ? 'ไม่บันทึกชุดภาพนี้' : 'ซ่อนชุดภาพนี้') + '" title="' + (aw ? 'ไม่บันทึก' : 'ซ่อน') + '" class="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50">' +
          '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg></button></div>' +
          '</div>';
      }).join('') : '<div class="px-5 py-12 text-center"><div class="font-display text-lg font-semibold">ไม่มีภาพรอจัดอัลบั้ม</div><p class="mt-1 text-sm text-slate-500">ภาพทุกชุดจากกลุ่ม LINE ถูกจัดเข้าอัลบั้มแล้ว</p></div>';

      V.innerHTML = '<div class="flex flex-col gap-6">' +
        heading('ภาพรอจัดอัลบั้ม', 'ภาพที่ส่งเข้ากลุ่ม LINE แต่ยังไม่ได้ยืนยันอัลบั้ม ตรวจแล้วกดยืนยันบันทึก หรือกด ✕ ถ้าไม่ใช่ภาพที่ต้องการ', btn('รีเฟรช', 'reload')) +
        stats +
        card('<div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4"><span class="font-display text-[17px] font-semibold">ชุดภาพจาก LINE</span>' +
          '<span class="text-[13px] text-slate-500">ภาพที่ส่งพร้อมกัน หรือส่งติดกันภายใน 5 นาที รวมเป็น 1 ชุด</span></div>' + list, 'overflow-hidden') +
        '<div id="dash-charts"></div></div>';
      PR.chart.observe(V);
      loadDashCharts();
    }).catch(loadError);
  }

  /* ---------- กราฟสถิติในหน้าภาพรอจัดอัลบั้ม ---------- */
  function chartCard(title, sub, id, extra) {
    return card('<div class="flex flex-col gap-4 p-5 sm:p-6"><div class="flex flex-wrap items-baseline justify-between gap-2">' +
      '<span class="font-display text-[17px] font-semibold">' + title + '</span>' + (sub ? '<span class="text-[13px] text-slate-500">' + sub + '</span>' : '') +
      '</div><div id="' + id + '"></div></div>', extra || '');
  }
  function loadDashCharts() {
    var box = el('dash-charts');
    if (!box) return;
    PR.inlineLoader(box, 'กล้องน้อยกำลังวาดกราฟสถิติ…', 3);
    if (box.firstChild) box.firstChild.removeAttribute('data-loading'); // ไม่ต้องรอกราฟก่อนปิดหน้าโหลดเต็มจอ
    call('stats').then(function (d) {
      box = el('dash-charts');
      if (!box) return; // เปลี่ยนเมนูไปแล้ว
      box.innerHTML = '<div class="flex flex-col gap-6">' +
        '<div class="flex items-center gap-3 pt-2"><span class="font-display text-xl font-bold">สถิติคลังภาพ</span><span class="h-px flex-1 bg-slate-200"></span>' +
        '<a href="stats.html" target="_blank" rel="noopener" class="text-sm font-semibold text-teal-700 hover:underline">หน้าสถิติสาธารณะ ↗</a></div>' +
        chartCard('ภาพที่ส่งเข้ามา 14 วันล่าสุด', 'ชี้ที่แท่งเพื่อดูตัวเลข', 'ch-daily') +
        '<div class="grid gap-6 lg:grid-cols-2">' + chartCard('สถานะภาพทั้งหมด', '', 'ch-status') + chartCard('ภาพบนเว็บตามหมวดหมู่', '', 'ch-cat') + '</div>' +
        '<div class="grid gap-6 lg:grid-cols-2">' + chartCard('ครูที่ส่งภาพมากที่สุด', 'นับภาพที่อยู่บนเว็บ', 'ch-senders') + chartCard('อัลบั้มที่มีคนดูมากที่สุด', '', 'ch-views') + '</div>' +
        chartCard('ภาพบนเว็บรายเดือน', '12 เดือนล่าสุด', 'ch-month') +
        '</div>';
      PR.chart.bars(el('ch-daily'), { title: 'ภาพที่ส่งเข้ามา 14 วันล่าสุด', labels: d.daily.labels, unit: 'ภาพ', height: 210, empty: 'ยังไม่มีภาพเข้ามาใน 14 วันนี้',
        series: [{ name: 'บันทึกแล้ว', color: '#2A78D6', values: d.daily.saved }, { name: 'รอยืนยัน/รอจัด', color: '#EDA100', values: d.daily.waiting }] });
      PR.chart.donut(el('ch-status'), { title: 'สถานะภาพทั้งหมด', items: d.status, center: 'ภาพทั้งหมด' });
      PR.chart.donut(el('ch-cat'), { title: 'ภาพบนเว็บตามหมวดหมู่', items: d.categories.map(function (c) { return { label: c.label, value: c.value, color: c.color || PR.chart.slot(c.slot) }; }), center: 'ภาพบนเว็บ' });
      PR.chart.hbars(el('ch-senders'), { title: 'ครูที่ส่งภาพมากที่สุด', items: d.senders, unit: 'ภาพ', color: '#0F766E' });
      PR.chart.hbars(el('ch-views'), { title: 'อัลบั้มที่มีคนดูมากที่สุด', items: d.topViews.map(function (a) { return { label: a.label, value: a.value, href: '#album/' + encodeURIComponent(a.id) }; }), unit: 'ครั้ง', color: '#6250D6', empty: 'ยังไม่มียอดเข้าชม' });
      PR.chart.bars(el('ch-month'), { title: 'ภาพบนเว็บรายเดือน', labels: d.monthly.labels, series: [{ name: 'ภาพ', color: '#0F766E', values: d.monthly.values }], unit: 'ภาพ', height: 200 });
      PR.chart.observe(box);
    }).catch(function (err) {
      var b = el('dash-charts');
      if (b && err.message !== 'auth') b.innerHTML = '<div class="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-center text-sm text-slate-500">โหลดกราฟสถิติไม่สำเร็จ กดรีเฟรชเพื่อลองใหม่</div>';
    });
  }

  function askNewAlbum() {
    return PR.swal.fire({
      title: 'สร้างอัลบั้มใหม่',
      html: '<div class="pr-form"><div><label class="pr-label" for="na-title">ชื่ออัลบั้ม</label><input id="na-title" class="pr-input" maxlength="100"></div>' +
        '<div><label class="pr-label" for="na-cat">หมวดหมู่</label><select id="na-cat" class="pr-input">' + categoryOptions('', true) + '</select></div></div>',
      showCancelButton: true, confirmButtonText: 'สร้างอัลบั้ม',
      didOpen: function () { el('na-title').focus(); },
      preConfirm: function () {
        var t = el('na-title').value.trim();
        if (!t) { window.Swal.showValidationMessage('กรอกชื่ออัลบั้ม'); return false; }
        return { title: t, category_id: el('na-cat').value };
      }
    }).then(function (r) { return r.isConfirmed ? r.value : null; });
  }

  function doAssign(row) {
    var batchId = row.getAttribute('data-batch');
    var sel = row.querySelector('select[data-role="album"]');
    var val = sel.value;
    if (!val) { PR.toast.fire({ icon: 'info', title: 'เลือกอัลบั้มก่อน' }); sel.focus(); return; }
    var waiting = Number(row.getAttribute('data-awaiting') || 0);
    var go = function (data) {
      data.batch_id = batchId;
      // ภาพที่ยังรอยืนยัน ต้องดึงไฟล์จาก LINE ตอนนี้ ใช้เวลาราว 1.5 วินาทีต่อภาพ
      if (waiting) busy('กำลังบันทึก ' + waiting + ' ภาพ', 'กล้องน้อยกำลังดึงภาพจาก LINE มาเก็บในอัลบั้ม…', Math.max(4, waiting * 1.5));
      else busy();
      call('assignBatch', data, waiting ? 330000 : 60000).then(function (r) {
        var msg = 'บันทึก ' + r.count + ' ภาพเข้า “' + r.album.title + '” แล้ว';
        if (r.failed) {
          endBusy();
          PR.swal.fire({ icon: 'warning', title: msg, text: 'ดึงไฟล์จาก LINE ไม่ได้ ' + r.failed + ' ภาพ (LINE อาจลบไฟล์ไปแล้ว) ภาพนั้นยังอยู่ในรายการ ลองยืนยันอีกครั้ง หรือกดไม่บันทึก', confirmButtonText: 'ตกลง' });
        } else {
          ok(msg);
        }
        viewPending();
      }).catch(fail);
    };
    if (val === '__new') {
      askNewAlbum().then(function (v) { if (v) go(v); else sel.value = ''; });
    } else {
      go({ album_id: val });
    }
  }

  function doHideBatch(row) {
    var waiting = Number(row.getAttribute('data-awaiting') || 0);
    if (waiting) {
      return confirmBox({ title: 'ไม่บันทึก ' + waiting + ' ภาพนี้?', html: 'ภาพที่ยังรอยืนยันจะถูกทิ้ง ไม่มีไฟล์ใดถูกเก็บลง Google Drive', confirm: 'ไม่บันทึก', danger: true }).then(function (yes) {
        if (!yes) return;
        busy('กำลังยกเลิกชุดภาพ…');
        call('discardBatch', { batch_id: row.getAttribute('data-batch') }).then(function (r) { ok('ไม่บันทึก ' + r.count + ' ภาพแล้ว'); viewPending(); }).catch(fail);
      });
    }
    confirmBox({ title: 'ซ่อนชุดภาพนี้?', html: 'ภาพจะไม่แสดงบนเว็บ และปิดการแชร์ไฟล์ใน Google Drive<br>กู้คืนได้ภายหลังจากหน้าอัลบั้ม', confirm: 'ซ่อนภาพ', danger: true }).then(function (yes) {
      if (!yes) return;
      busy('กำลังซ่อนภาพ…');
      call('hideBatch', { batch_id: row.getAttribute('data-batch') }).then(function (r) { ok('ซ่อนแล้ว ' + r.count + ' ภาพ'); viewPending(); }).catch(fail);
    });
  }

  /* ================= อัลบั้มทั้งหมด ================= */
  function viewAlbums() {
    loading();
    call('albums').then(function (r) {
      S.albums = r.albums; S.categories = r.categories;
      renderAlbums();
    }).catch(loadError);
  }

  function renderAlbums() {
    var q = S.q.toLowerCase();
    var list = S.albums.filter(function (a) { return !q || (a.title + ' ' + a.category).toLowerCase().indexOf(q) > -1; });
    var rows = list.length ? list.map(function (a) {
      var i = S.albums.indexOf(a);
      return '<div class="flex items-center gap-2 border-b border-slate-100 pr-3 last:border-0 hover:bg-slate-50">' +
        '<a href="#album/' + encodeURIComponent(a.id) + '" class="flex min-w-0 flex-1 flex-wrap items-center gap-4 px-5 py-3.5 text-slate-900">' +
        thumb(a.cover, 56) +
        '<div class="flex min-w-[180px] flex-1 flex-col gap-1"><span class="font-semibold">' + esc(a.title) + '</span>' +
        '<span class="flex flex-wrap items-center gap-2 text-[13px] text-slate-500">' + (a.category ? PR.catBadge(a.category, a.color) : '<span>ไม่ระบุหมวด</span>') + '<span>' + PR.num(a.count) + ' ภาพ</span><span>เข้าชม ' + PR.num(a.views) + ' ครั้ง</span><span>อัปเดต ' + PR.thaiDate(a.updated) + '</span></span></div>' +
        statusPill(a.status) +
        '<span class="text-sm font-semibold text-teal-700">แก้ไข →</span></a>' +
        '<button type="button" data-act="albumDelete" data-i="' + i + '" aria-label="ลบอัลบั้ม ' + esc(a.title) + '" title="ลบอัลบั้ม" class="flex h-10 w-10 flex-none items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600">' + TRASH + '</button></div>';
    }).join('') : '<div class="px-5 py-12 text-center text-slate-500">' + (S.albums.length ? 'ไม่พบอัลบั้มที่ตรงกับคำค้น' : 'ยังไม่มีอัลบั้ม') + '</div>';

    V.innerHTML = '<div class="flex flex-col gap-6">' +
      heading('อัลบั้มทั้งหมด', S.albums.length + ' อัลบั้ม', btn('+ สร้างอัลบั้ม', 'newAlbum', 'primary')) +
      '<div><label for="al-q" class="sr-only">ค้นหาอัลบั้ม</label><input id="al-q" type="search" value="' + esc(S.q) + '" placeholder="ค้นหาชื่ออัลบั้มหรือหมวด" class="h-12 w-full max-w-md rounded-xl border border-slate-300 bg-white px-4 text-[15px] outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15"></div>' +
      card(rows, 'overflow-hidden') + '</div>';
    var input = el('al-q');
    input.addEventListener('input', function () {
      S.q = input.value.trim();
      var pos = input.selectionStart;
      quiet = true;
      renderAlbums();
      var again = el('al-q'); again.focus(); try { again.setSelectionRange(pos, pos); } catch (e) { /* ignore */ }
    });
  }

  function doNewAlbum() {
    askNewAlbum().then(function (v) {
      if (!v) return;
      busy();
      call('saveAlbum', v).then(function (r) { ok('สร้างอัลบั้มแล้ว'); window.location.hash = '#album/' + encodeURIComponent(r.id); }).catch(fail);
    });
  }

  /* ================= แก้ไขอัลบั้ม ================= */
  function viewAlbum(id) {
    loading();
    S.sel = {}; S.filter = 'all';
    call('album', { id: id }).then(function (r) {
      S.album = r.album; S.photos = r.photos; S.categories = r.categories;
      renderAlbum();
    }).catch(loadError);
  }

  function renderAlbum() {
    var a = S.album;
    var webUrl = PR.albumUrl(a.id);
    var dateVal = a.date ? PR.dayKey(a.date) : '';
    var shown = S.photos.filter(function (p) { return S.filter === 'all' || (S.filter === 'hidden' ? p.status === 'hidden' : p.status !== 'hidden'); });
    var hiddenCount = S.photos.filter(function (p) { return p.status === 'hidden'; }).length;
    var selIds = Object.keys(S.sel);

    var actions = '<div class="flex flex-wrap gap-2">' +
      (a.status === 'published' ? '<a href="' + esc(webUrl) + '" target="_blank" rel="noopener" class="flex h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold hover:bg-slate-50">เปิดบนเว็บ ↗</a>' : '') +
      (a.folder ? '<a href="' + esc(a.folder) + '" target="_blank" rel="noopener" class="flex h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold hover:bg-slate-50">โฟลเดอร์ Drive ↗</a>' : '') +
      btn('+ อัปโหลดภาพ', 'uploadPhotos', 'primary') +
      '<input id="up-files" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple class="hidden" aria-label="เลือกภาพที่จะอัปโหลด">' +
      (a.status === 'published' ? btn('ซ่อนอัลบั้ม', 'albumHide', 'danger') : btn('เผยแพร่อีกครั้ง', 'albumShow')) +
      '<button type="button" data-act="albumDelete" class="flex h-11 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-600 hover:bg-rose-50">' + TRASH + 'ลบอัลบั้ม</button></div>';

    var form = card('<form id="al-form" class="grid gap-4 p-5 sm:grid-cols-2">' +
      '<div class="sm:col-span-2"><label class="pr-label" for="f-title">ชื่ออัลบั้ม</label><input id="f-title" class="pr-input" maxlength="100" value="' + esc(a.title) + '"></div>' +
      '<div><label class="pr-label" for="f-cat">หมวดหมู่</label><select id="f-cat" class="pr-input">' + categoryOptions(a.category_id, true) + '</select></div>' +
      '<div><label class="pr-label" for="f-date">วันที่จัดกิจกรรม</label><input id="f-date" type="date" class="pr-input" value="' + esc(dateVal) + '"></div>' +
      '<div class="sm:col-span-2"><label class="pr-label" for="f-desc">คำอธิบาย</label><textarea id="f-desc" class="pr-input" maxlength="1000">' + esc(a.description) + '</textarea></div>' +
      '<div class="flex justify-end sm:col-span-2"><button type="submit" class="h-11 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white shadow-md shadow-teal-700/25 hover:bg-teal-800">บันทึกข้อมูลอัลบั้ม</button></div>' +
      '</form>');

    var filters = [['all', 'ทั้งหมด ' + S.photos.length], ['shown', 'บนเว็บ ' + (S.photos.length - hiddenCount)], ['hidden', 'ซ่อนอยู่ ' + hiddenCount]].map(function (f) {
      var on = S.filter === f[0];
      return '<button type="button" data-act="filter" data-f="' + f[0] + '" aria-pressed="' + on + '" class="h-9 rounded-[10px] px-3 text-sm ' + (on ? 'bg-white font-semibold shadow' : 'text-slate-600') + '">' + f[1] + '</button>';
    }).join('');

    var bar = selIds.length
      ? '<div class="flex flex-wrap items-center gap-2 rounded-xl bg-teal-50 px-3 py-2 text-sm"><span class="font-semibold text-teal-900">เลือก ' + selIds.length + ' ภาพ</span>' +
        btn('ซ่อน', 'photosHide', 'danger') + btn('กู้คืน', 'photosShow') + (selIds.length === 1 ? btn('ตั้งเป็นภาพปก', 'setCover') : '') + btn('ล้างที่เลือก', 'clearSel') + '</div>'
      : '<span class="text-sm text-slate-500">แตะภาพเพื่อเลือก แล้วซ่อน กู้คืน หรือตั้งเป็นภาพปก</span>';

    var grid = shown.length ? '<div class="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">' + shown.map(function (p) {
      var isSel = !!S.sel[p.file_id];
      var off = p.status === 'hidden';
      var t = PR.tone(p.file_id.length);
      return '<button type="button" data-act="toggle" data-file="' + esc(p.file_id) + '" aria-pressed="' + isSel + '" aria-label="ภาพจาก ' + esc(p.sender) + (off ? ' (ซ่อนอยู่)' : '') + '" class="tile' + (isSel ? ' sel' : '') + (off ? ' off' : '') + '" style="background:' + t[0] + '">' +
        '<span class="absolute inset-0 flex items-center justify-center">' + PR.photoIcon(t[1], 34) + '</span>' +
        '<img src="' + PR.thumb(p.file_id, 320) + '" alt="" loading="lazy" referrerpolicy="no-referrer" class="absolute inset-0 h-full w-full object-cover" onerror="this.style.display=\'none\'">' +
        (p.file_id === a.cover ? '<span class="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-slate-900">ภาพปก</span>' : '') +
        (off ? '<span class="absolute bottom-2 left-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[11px] font-semibold text-white">ซ่อนอยู่</span>' : '') +
        (p.type === 'video' ? '<span class="absolute bottom-2 right-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[11px] font-semibold text-white">▶ คลิป</span>' : '') +
        (isSel ? '<span class="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-teal-700 text-white"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"></path></svg></span>' : '') +
        '</button>';
    }).join('') + '</div>' : '<div class="py-10 text-center text-sm text-slate-500">ไม่มีภาพในตัวกรองนี้</div>';

    V.innerHTML = '<div class="flex flex-col gap-6">' +
      '<a href="#albums" class="self-start text-sm font-medium text-teal-700 hover:text-teal-800">← อัลบั้มทั้งหมด</a>' +
      heading(esc(a.title) + ' ' + statusPill(a.status), PR.num(a.count) + ' ภาพบนเว็บ · เข้าชม ' + PR.num(a.views) + ' ครั้ง · สร้างโดย ' + esc(a.created_by || '-'), actions) +
      '<div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">' + form + coverCard(a) + '</div>' +
      card('<div class="flex flex-col gap-4 p-5"><div class="flex flex-wrap items-center justify-between gap-3"><span class="font-display text-[17px] font-semibold">ภาพในอัลบั้ม</span>' +
        '<div class="flex gap-1 rounded-xl bg-slate-100 p-1">' + filters + '</div></div>' + bar + grid + '</div>') +
      '</div>';

    el('cv-file').addEventListener('change', function () {
      var f = el('cv-file').files[0];
      el('cv-file').value = '';
      if (f) uploadCover(f);
    });

    el('up-files').addEventListener('change', function () {
      var files = [].slice.call(el('up-files').files || []);
      el('up-files').value = '';
      if (files.length) uploadPhotos(files);
    });

    el('al-form').addEventListener('submit', function (e) {
      e.preventDefault();
      busy();
      call('saveAlbum', { id: a.id, title: el('f-title').value, category_id: el('f-cat').value, event_date: el('f-date').value, description: el('f-desc').value })
        .then(function () { ok('บันทึกข้อมูลอัลบั้มแล้ว'); viewAlbum(a.id); }).catch(fail);
    });
  }

  /* ---------- ภาพปกอัลบั้ม (อัปโหลดเองได้ ไม่ต้องทำผ่าน LINE) ---------- */
  function coverCard(a) {
    var t = PR.tone(a.cover ? a.cover.length : 0);
    var img = a.cover ? '<img id="cv-img" src="' + PR.thumb(a.cover, 800) + '" alt="ภาพปกอัลบั้ม" referrerpolicy="no-referrer" class="absolute inset-0 h-full w-full object-cover" onerror="this.style.display=\'none\'">' : '';
    var tag = a.cover ? (a.customCover ? 'ปกที่อัปโหลดเอง' : 'ภาพจากในอัลบั้ม') : 'ยังไม่มีภาพปก';
    return card('<div class="flex flex-col gap-4 p-5">' +
      '<div class="flex items-center justify-between gap-2"><span class="font-display text-[17px] font-semibold">ภาพปกอัลบั้ม</span>' +
      '<span class="rounded-full ' + (a.customCover ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-600') + ' px-2.5 py-0.5 text-xs font-semibold">' + tag + '</span></div>' +
      // สัดส่วนเดียวกับการ์ดหน้าเว็บ
      '<div class="relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-2xl ring-1 ring-slate-200" style="background:' + t[0] + '">' + PR.photoIcon(t[1], 44) + img +
        '<span class="absolute bottom-2 left-2 rounded-full bg-slate-900/75 px-2.5 py-0.5 text-[11px] font-semibold text-white">' + PR.num(a.count) + ' ภาพ</span></div>' +
      '<div class="flex flex-wrap gap-2">' + btn('อัปโหลดภาพปกใหม่', 'coverUpload', 'primary') +
        (a.customCover ? btn('ใช้ภาพแรกในอัลบั้ม', 'coverReset') : '') + '</div>' +
      '<input id="cv-file" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" aria-label="เลือกภาพปก">' +
      '<p class="text-[13px] leading-[1.7] text-slate-500">แนะนำภาพแนวนอน (16:9) ภาพปกที่อัปโหลดจะไม่นับเป็นภาพในอัลบั้ม หรือจะเลือกภาพด้านล่างแล้วกด “ตั้งเป็นปก” ก็ได้</p>' +
      '</div>');
  }
  function uploadCover(f) {
    var albumId = S.album.id;
    var run = PR.runner.open({ title: 'กำลังเปลี่ยนภาพปก', text: 'กล้องน้อยกำลังย่อภาพให้พอดี…' });
    var finish = PR.runner.estimate(run, 5, [[40, 'กำลังส่งภาพปกขึ้นระบบ…'], [80, 'อีกนิดเดียว…']]);
    PR.prepareImage(f, 1920, false, function (err, img) {
      if (err) { finish(); fail(err); return; }
      call('uploadCover', { album_id: albumId, name: img.name, mime: img.mime, data: img.data }, 120000).then(function () {
        finish();
        run.done('ถึงเส้นชัยแล้ว! เปลี่ยนภาพปกเรียบร้อย');
        PR.store.set('pr_home', null);
        setTimeout(function () { run.close(); PR.toast.fire({ icon: 'success', title: 'เปลี่ยนภาพปกแล้ว' }); viewAlbum(albumId); }, 900);
      }).catch(function (e) { finish(); fail(e); });
    });
  }
  function resetCover() {
    confirmBox({ title: 'ใช้ภาพแรกในอัลบั้มเป็นปก?', html: 'ภาพปกที่อัปโหลดเองจะถูกย้ายไปถังขยะ Google Drive', confirm: 'เปลี่ยนเป็นภาพแรก' }).then(function (yes) {
      if (!yes) return;
      busy('กำลังเปลี่ยนภาพปก…');
      call('resetCover', { album_id: S.album.id }).then(function () { PR.store.set('pr_home', null); ok('ใช้ภาพแรกเป็นปกแล้ว'); viewAlbum(S.album.id); }).catch(fail);
    });
  }

  function setPhotos(status) {
    var ids = Object.keys(S.sel);
    var run = function () {
      busy(status === 'hidden' ? 'กำลังซ่อนภาพ…' : 'กำลังกู้คืนภาพ…');
      call('setPhotos', { file_ids: ids, status: status }).then(function (r) {
        ok((status === 'hidden' ? 'ซ่อน ' : 'กู้คืน ') + r.changed + ' ภาพแล้ว');
        viewAlbum(S.album.id);
      }).catch(fail);
    };
    if (status === 'hidden') {
      confirmBox({ title: 'ซ่อน ' + ids.length + ' ภาพ?', html: 'ภาพจะไม่แสดงบนเว็บ และปิดการแชร์ไฟล์ใน Google Drive<br>กู้คืนได้ภายหลัง', confirm: 'ซ่อนภาพ', danger: true })
        .then(function (yes) { if (yes) run(); });
    } else {
      run();
    }
  }

  var TRASH = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6M14 11v6"></path></svg>';

  // ลบอัลบั้มถาวร: พิมพ์ชื่ออัลบั้มยืนยัน + เลือกแจ้งเตือนกลุ่ม LINE
  function deleteAlbum(a) {
    PR.swal.fire({
      icon: 'warning',
      title: 'ลบอัลบั้มนี้ถาวร?',
      html: '<div style="text-align:left;line-height:1.75">' +
        '<b>“' + esc(a.title) + '”</b> · ' + PR.num(a.count) + ' ภาพ<br>' +
        '• อัลบั้มและภาพทั้งหมดจะหายจากเว็บ ลิงก์เดิมเปิดไม่ได้อีก<br>' +
        '• ไฟล์ย้ายไปถังขยะ Google Drive (กู้คืนได้ภายใน 30 วัน)<br>' +
        'พิมพ์ชื่ออัลบั้มให้ตรงเพื่อยืนยัน</div>' +
        '<label style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:14px;font-size:14px;cursor:pointer">' +
        '<input id="del-notify" type="checkbox" checked style="width:18px;height:18px;accent-color:#0F766E"> แจ้งเตือนไปที่กลุ่ม LINE ด้วย</label>',
      input: 'text',
      inputPlaceholder: a.title,
      inputAttributes: { 'aria-label': 'พิมพ์ชื่ออัลบั้มเพื่อยืนยัน', autocomplete: 'off' },
      showCancelButton: true,
      confirmButtonText: 'ลบอัลบั้ม',
      cancelButtonText: 'ยกเลิก',
      customClass: { container: 'pr-backdrop', popup: 'pr-swal', title: 'pr-swal-title', htmlContainer: 'pr-swal-text', input: 'pr-input', actions: 'pr-swal-actions', confirmButton: 'pr-btn pr-btn-danger', cancelButton: 'pr-btn pr-btn-ghost' },
      preConfirm: function (v) {
        var norm = function (x) { return String(x || '').replace(/\s+/g, ' ').trim(); };
        if (norm(v) !== norm(a.title)) { window.Swal.showValidationMessage('พิมพ์ชื่ออัลบั้มให้ตรง: ' + a.title); return false; }
        return { title: v, notify: el('del-notify').checked };
      }
    }).then(function (r) {
      if (!r.isConfirmed) return;
      busy('กำลังลบอัลบั้ม…', 'กล้องน้อยกำลังเก็บไฟล์ไปถังขยะ' + (r.value.notify ? ' แล้วแจ้งกลุ่ม LINE…' : '…'), 6);
      call('deleteAlbum', { id: a.id, confirm_title: r.value.title, notify: r.value.notify }, 180000).then(function (res) {
        PR.store.set('pr_home', null);
        ok('ลบ “' + res.title + '” แล้ว' + (res.notified ? ' · แจ้ง ' + res.notified + ' กลุ่ม' : ''));
        if (window.location.hash === '#albums') route(); else window.location.hash = '#albums';
      }).catch(fail);
    });
  }

  function setAlbumStatus(status) {
    var hide = status === 'hidden';
    confirmBox({
      title: hide ? 'ซ่อนอัลบั้มนี้?' : 'เผยแพร่อัลบั้มอีกครั้ง?',
      html: hide ? 'อัลบั้มจะไม่แสดงบนเว็บ และปิดการแชร์โฟลเดอร์ใน Drive' : 'อัลบั้มจะกลับมาแสดงบนเว็บ',
      icon: hide ? 'warning' : 'question', confirm: hide ? 'ซ่อนอัลบั้ม' : 'เผยแพร่', danger: hide
    }).then(function (yes) {
      if (!yes) return;
      busy();
      call('setAlbumStatus', { id: S.album.id, status: status }).then(function () { ok(hide ? 'ซ่อนอัลบั้มแล้ว' : 'เผยแพร่อัลบั้มแล้ว'); viewAlbum(S.album.id); }).catch(fail);
    });
  }

  // อัปโหลดทีละไฟล์ ย่อด้านยาวสุด 2560px ก่อนส่ง กล้องน้อยวิ่งตามจำนวนไฟล์ที่ส่งเสร็จจริง
  function uploadPhotos(files) {
    var albumId = S.album.id;
    var total = files.length, done = 0, failed = [];
    var run = PR.runner.open({ title: 'กำลังอัปโหลด ' + total + ' ภาพ', text: 'กล้องน้อยกำลังพาภาพขึ้นอัลบั้ม…' });
    function next(i) {
      if (i >= total) {
        var msg = 'อัปโหลดสำเร็จ ' + done + ' ภาพ' + (failed.length ? ' ไม่สำเร็จ ' + failed.length + ' ภาพ' : '');
        run.done(failed.length ? msg : 'ถึงเส้นชัยแล้ว! ' + msg);
        setTimeout(function () {
          if (failed.length) {
            PR.swal.fire({ icon: 'warning', title: msg, html: failed.map(function (f) { return esc(f); }).join('<br>'), confirmButtonText: 'ตกลง' });
          } else {
            run.close();
            PR.toast.fire({ icon: 'success', title: msg });
          }
          viewAlbum(albumId);
        }, 1100);
        return;
      }
      var f = files[i];
      run.set((i / total) * 100, 'ภาพที่ ' + (i + 1) + ' จาก ' + total + ' · ' + f.name);
      PR.prepareImage(f, 2560, false, function (err, img) {
        if (err) { failed.push(f.name + ': ' + err.message); return next(i + 1); }
        call('uploadPhoto', { album_id: albumId, name: img.name, mime: img.mime, data: img.data }).then(function () {
          done++;
          run.set(((i + 1) / total) * 100);
          next(i + 1);
        }).catch(function (e2) {
          if (e2.message === 'auth') return;
          failed.push(f.name + ': ' + e2.message);
          next(i + 1);
        });
      });
    }
    next(0);
  }

  /* ================= หมวดหมู่ ================= */
  function viewCategories() {
    loading();
    call('categories').then(function (r) {
      S.categories = r.categories;
      var rows = r.categories.length ? r.categories.map(function (c) {
        return '<div data-cat="' + esc(c.id) + '" class="flex flex-wrap items-center gap-4 border-b border-slate-100 px-5 py-3.5 last:border-0">' +
          '<span class="h-8 w-8 flex-none rounded-lg" style="background:' + esc(c.color) + '"></span>' +
          '<div class="flex min-w-[160px] flex-1 flex-col"><span class="font-semibold">' + esc(c.name) + '</span><span class="text-[13px] text-slate-500">' + c.albums + ' อัลบั้ม</span></div>' +
          btn('แก้ไข', 'catEdit') + btn('ลบ', 'catDelete') + '</div>';
      }).join('') : '<div class="px-5 py-12 text-center text-slate-500">ยังไม่มีหมวดหมู่</div>';
      V.innerHTML = '<div class="flex flex-col gap-6">' + heading('หมวดหมู่', 'ใช้จัดกลุ่มอัลบั้มบนหน้าเว็บ', btn('+ เพิ่มหมวด', 'catNew', 'primary')) + card(rows, 'overflow-hidden') + '</div>';
    }).catch(loadError);
  }

  function editCategory(c) {
    PR.swal.fire({
      title: c ? 'แก้ไขหมวด' : 'เพิ่มหมวด',
      html: '<div class="pr-form"><div><label class="pr-label" for="c-name">ชื่อหมวด</label><input id="c-name" class="pr-input" maxlength="40" value="' + esc(c ? c.name : '') + '"></div>' +
        '<div><label class="pr-label" for="c-color">สีป้ายหมวด</label><input id="c-color" type="color" class="pr-input" style="padding:4px" value="' + esc(c ? c.color : '#0F766E') + '"></div></div>',
      showCancelButton: true, confirmButtonText: 'บันทึก',
      preConfirm: function () {
        var n = el('c-name').value.trim();
        if (!n) { window.Swal.showValidationMessage('กรอกชื่อหมวด'); return false; }
        return { id: c ? c.id : '', name: n, color: el('c-color').value };
      }
    }).then(function (r) {
      if (!r.isConfirmed) return;
      busy();
      call('saveCategory', r.value).then(function () { ok('บันทึกหมวดแล้ว'); viewCategories(); }).catch(fail);
    });
  }

  /* ================= กลุ่ม LINE ================= */
  function viewGroups() {
    loading();
    call('groups').then(function (r) {
      var rows = r.groups.length ? r.groups.map(function (g) {
        return '<div class="flex flex-wrap items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-0">' +
          '<div class="flex min-w-[180px] flex-1 flex-col"><span class="font-semibold">' + esc(g.name) + '</span>' +
          '<span class="text-[13px] text-slate-500">บอทเข้ากลุ่ม ' + PR.thaiDate(g.joined) + ' · รับภาพแล้ว ' + PR.num(g.photos) + ' ภาพ</span></div>' +
          '<span class="text-sm ' + (g.enabled ? 'font-semibold text-green-700' : 'text-slate-500') + '">' + (g.enabled ? 'เปิดรับภาพ' : 'ปิดรับภาพ') + '</span>' +
          '<label class="switch" title="เปิด/ปิดรับภาพ"><input type="checkbox" data-act="groupToggle" data-group="' + esc(g.id) + '" aria-label="เปิดรับภาพจาก ' + esc(g.name) + '"' + (g.enabled ? ' checked' : '') + '><span></span></label></div>';
      }).join('') : '<div class="px-5 py-12 text-center text-slate-500">ยังไม่มีกลุ่ม เชิญบอทเข้ากลุ่ม LINE แล้วส่งรูป 1 รูป กลุ่มจะขึ้นที่นี่</div>';
      V.innerHTML = '<div class="flex flex-col gap-6">' + heading('กลุ่ม LINE', 'บอทรับภาพเฉพาะกลุ่มที่เปิดรับภาพไว้', btn('รีเฟรช', 'reload')) + card(rows, 'overflow-hidden') + '</div>';
    }).catch(loadError);
  }

  /* ================= ผู้ใช้และสิทธิ์ ================= */
  function viewUsers() {
    loading();
    call('users').then(function (r) {
      S.users = r.users;
      var rows = r.users.length ? r.users.map(function (u, i) {
        return '<div class="flex flex-wrap items-center gap-4 border-b border-slate-100 px-5 py-3.5 last:border-0">' +
          '<div class="flex min-w-[180px] flex-1 flex-col"><span class="font-semibold">' + esc(u.name) + (u.active ? '' : ' <span class="text-xs font-normal text-slate-400">(ปิดใช้งาน)</span>') + '</span>' +
          '<span class="text-[13px] text-slate-500">' + (u.line ? 'ผู้ส่งภาพจาก LINE' : 'บัญชีเว็บ') + (u.web_login ? ' · เข้าเว็บด้วย ' + esc(u.web_login) : '') + (u.last_login ? ' · เข้าล่าสุด ' + PR.timeAgo(u.last_login) : '') + '</span></div>' +
          (u.role === 'admin' ? '<span class="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">แอดมิน</span>' : '<span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">ครู</span>') +
          btn('แก้ไข', 'userEdit', '', 'data-i="' + i + '"') + '</div>';
      }).join('') : '<div class="px-5 py-12 text-center text-slate-500">ยังไม่มีผู้ใช้</div>';
      V.innerHTML = '<div class="flex flex-col gap-6">' +
        heading('ผู้ใช้และสิทธิ์', 'แอดมินกดปุ่มย้าย/ซ่อนภาพในไลน์ได้ และเข้าหน้านี้ได้เมื่อมีชื่อผู้ใช้กับรหัสผ่าน', btn('+ เพิ่มแอดมิน', 'userNew', 'primary')) +
        card(rows, 'overflow-hidden') + '</div>';
    }).catch(loadError);
  }

  function editUser(u) {
    PR.swal.fire({
      title: u ? 'แก้ไขผู้ใช้' : 'เพิ่มแอดมิน',
      html: '<div class="pr-form">' +
        '<div><label class="pr-label" for="u-name">ชื่อที่แสดง</label><input id="u-name" class="pr-input" maxlength="60" value="' + esc(u ? u.name : '') + '"' + (u && u.line ? ' disabled' : '') + '></div>' +
        '<div><label class="pr-label" for="u-role">สิทธิ์</label><select id="u-role" class="pr-input"><option value="teacher"' + (u && u.role !== 'admin' ? ' selected' : '') + '>ครู (ส่งภาพได้)</option><option value="admin"' + (!u || u.role === 'admin' ? ' selected' : '') + '>แอดมิน</option></select></div>' +
        '<div><label class="pr-label" for="u-login">ชื่อผู้ใช้สำหรับเข้าเว็บ (a-z, 0-9)</label><input id="u-login" class="pr-input" autocomplete="off" value="' + esc(u ? u.web_login : '') + '"></div>' +
        '<div><label class="pr-label" for="u-pass">' + (u && u.has_password ? 'ตั้งรหัสผ่านใหม่ (เว้นว่าง = ใช้รหัสเดิม)' : 'รหัสผ่าน (อย่างน้อย 6 ตัว)') + '</label><input id="u-pass" type="password" class="pr-input" autocomplete="new-password"></div>' +
        '<label class="pr-check"><input id="u-active" type="checkbox"' + (!u || u.active ? ' checked' : '') + '> เปิดใช้งาน</label></div>',
      showCancelButton: true, confirmButtonText: 'บันทึก',
      preConfirm: function () {
        var login = el('u-login').value.trim().toLowerCase();
        var pass = el('u-pass').value;
        if (login && !/^[a-z0-9._-]{3,30}$/.test(login)) { window.Swal.showValidationMessage('ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 . _ - ยาว 3–30 ตัว'); return false; }
        if (pass && pass.length < 6) { window.Swal.showValidationMessage('รหัสผ่านต้องยาวอย่างน้อย 6 ตัว'); return false; }
        if (!u && (!login || !pass)) { window.Swal.showValidationMessage('แอดมินใหม่ต้องมีชื่อผู้ใช้และรหัสผ่าน'); return false; }
        var data = { key: u ? u.key : '', role: el('u-role').value, web_login: login, new_password: pass, active: el('u-active').checked };
        if (!u || !u.line) data.display_name = el('u-name').value.trim() || login;
        return data;
      }
    }).then(function (r) {
      if (!r.isConfirmed) return;
      busy();
      call('saveUser', r.value).then(function () { ok('บันทึกผู้ใช้แล้ว'); viewUsers(); }).catch(fail);
    });
  }

  /* ================= ตั้งค่าบอท ================= */
  function viewSettings() {
    loading();
    call('settings').then(function (r) {
      var st = r.settings;
      var hours = '';
      for (var h = 6; h <= 21; h++) hours += '<option value="' + h + '"' + (h === st.hour ? ' selected' : '') + '>' + (h < 10 ? '0' : '') + h + ':00 น.</option>';
      var row = function (id, title, desc, on) {
        return '<div class="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-0">' +
          '<div class="flex flex-col gap-0.5"><label for="' + id + '" class="font-semibold">' + title + '</label><span class="text-[13px] leading-[1.6] text-slate-500">' + desc + '</span></div>' +
          '<label class="switch"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span></span></label></div>';
      };
      V.innerHTML = '<div class="flex flex-col gap-6">' +
        heading('ตั้งค่าบอท', 'การทำงานของ PR Bot ในกลุ่ม LINE') +
        card(row('s-confirm', 'ถามยืนยันก่อนบันทึกภาพเข้าระบบ', 'เปิดไว้ (แนะนำ) บอทจะยังไม่เก็บไฟล์ลง Drive จนกว่าครูจะกดเลือกอัลบั้ม มีปุ่ม “ไม่ต้องบันทึกชุดนี้” กันส่งรูปผิด ปิดแล้วบอทจะเก็บภาพทันทีแบบเดิม', st.confirm !== false) +
          row('s-reply', 'ตอบกลับในกลุ่มทุกครั้งที่ได้รับภาพ', 'ปิดแล้วบอทจะรับภาพเงียบๆ ภาพที่ยังไม่ระบุอัลบั้มจะรอแอดมินจัดในหน้านี้ ส่วนปุ่มและคำสั่งยังตอบตามปกติ', st.reply) +
          row('s-summary', 'ส่งสรุปภาพประจำวันเข้ากลุ่ม', 'ส่งเฉพาะวันที่มีภาพเข้ามา 1 ข้อความต่อกลุ่ม (นับโควตาข้อความของ LINE OA)', st.summary) +
          '<div class="flex flex-wrap items-center justify-between gap-4 px-5 py-4"><div class="flex flex-col gap-0.5"><label for="s-hour" class="font-semibold">เวลาส่งสรุป</label>' +
          '<span class="text-[13px] text-slate-500">ส่งในช่วงต้นชั่วโมงที่เลือก</span></div>' +
          '<select id="s-hour" class="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm">' + hours + '</select></div>', 'overflow-hidden') +
        (st.summary && !st.trigger ? '<div class="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-[1.7] text-amber-900"><b>ยังไม่ได้ติดตั้งตัวตั้งเวลา</b> — เปิด Apps Script แล้วรันฟังก์ชัน <code>installTriggers</code> 1 ครั้ง สรุปจึงจะส่งตามเวลา</div>' : '') +
        '<div class="flex flex-wrap justify-end gap-2">' + btn('ดูตัวอย่างสรุปวันนี้', 'previewSummary') + btn('บันทึกการตั้งค่า', 'saveSettings', 'primary') + '</div>' +
        card('<div class="flex flex-col gap-1 px-5 py-4 text-sm leading-[1.7] text-slate-600"><span class="font-semibold text-slate-900">ข้อมูลระบบ</span>' +
          '<span>ที่อยู่เว็บ (WEB_URL): ' + (st.web_url ? esc(st.web_url) : '<span class="text-rose-600">ยังไม่ได้ตั้ง</span>') + '</span>' +
          '<span>ตัวตั้งเวลาสรุปประจำวัน: ' + (st.trigger ? 'ติดตั้งแล้ว' : 'ยังไม่ติดตั้ง') + '</span>' +
          '<span>ส่งสรุปล่าสุด: ' + (st.last_summary ? esc(st.last_summary.replace(/(\d{4})(\d{2})(\d{2})/, '$3/$2/$1')) : '-') + '</span></div>') +
        '</div>';
    }).catch(loadError);
  }

  function saveSettings() {
    busy();
    call('saveSettings', { reply: el('s-reply').checked, confirm: el('s-confirm').checked, summary: el('s-summary').checked, hour: Number(el('s-hour').value) }).then(function (r) {
      if (r.warning) {
        endBusy();
        PR.swal.fire({ icon: 'warning', title: 'บันทึกแล้ว แต่ยังขาดอีก 1 ขั้น', text: r.warning, confirmButtonText: 'เข้าใจแล้ว' });
      } else {
        ok('บันทึกการตั้งค่าแล้ว');
      }
      viewSettings();
    }).catch(fail);
  }

  function previewSummary() {
    busy('กำลังสร้างตัวอย่าง…');
    call('previewSummary').then(function (r) {
      endBusy();
      PR.swal.fire({
        title: 'ตัวอย่างสรุปวันนี้',
        html: r.items.length ? r.items.map(function (it) {
          return '<div style="text-align:left;margin-top:10px"><div style="font-size:12px;font-weight:600;color:#0F766E">' + esc(it.group) + '</div>' +
            '<div style="white-space:pre-line;background:#F1F5F9;border-radius:12px;padding:12px 14px;margin-top:4px;font-size:13px;line-height:1.7;color:#0F172A">' + esc(it.text) + '</div></div>';
        }).join('') : 'วันนี้ยังไม่มีภาพเข้ากลุ่มที่เปิดรับ จึงไม่มีสรุปให้ส่ง',
        confirmButtonText: 'ปิด'
      });
    }).catch(fail);
  }

  /* ================= ข้อมูลโรงเรียน ================= */
  var SITE_FORM = [
    ['site_name', 'ชื่อระบบ / ชื่อเว็บ', 60],
    ['school', 'ชื่อโรงเรียน', 80],
    ['area', 'สังกัด / เขตพื้นที่', 80],
    ['hero1', 'หัวข้อหน้าแรก บรรทัดที่ 1', 60],
    ['hero2', 'หัวข้อหน้าแรก บรรทัดที่ 2 (สีเขียว)', 60],
    ['hero_desc', 'คำอธิบายใต้หัวข้อหน้าแรก', 300],
    ['footer', 'ข้อความท้ายเว็บ (ผู้พัฒนา)', 200]
  ];

  function viewSite() {
    loading();
    call('site').then(function (r) {
      var st = r.site;
      var fields = SITE_FORM.map(function (f) {
        var long = f[2] > 100;
        return '<div' + (long ? ' class="sm:col-span-2"' : '') + '><label class="pr-label" for="site-' + f[0] + '">' + f[1] + '</label>' +
          (long ? '<textarea id="site-' + f[0] + '" class="pr-input" maxlength="' + f[2] + '">' + esc(st[f[0]]) + '</textarea>'
                : '<input id="site-' + f[0] + '" class="pr-input" maxlength="' + f[2] + '" value="' + esc(st[f[0]]) + '">') + '</div>';
      }).join('');
      V.innerHTML = '<div class="flex flex-col gap-6">' +
        heading('ข้อมูลโรงเรียน', 'ชื่อ โลโก้ และข้อความที่แสดงบนเว็บทุกหน้า แก้ได้เมื่อย้ายโรงเรียนหรือเปลี่ยนรายละเอียด') +
        card('<div class="flex flex-wrap items-center gap-5 p-5">' +
          '<img id="site-logo-img" src="' + esc(st.logo) + '" alt="โลโก้ปัจจุบัน" class="h-24 w-24 rounded-2xl bg-white object-contain p-1 ring-1 ring-slate-200">' +
          '<div class="flex min-w-[220px] flex-1 flex-col gap-2"><span class="font-semibold">โลโก้โรงเรียน</span>' +
          '<span class="text-[13px] leading-[1.6] text-slate-500">ใช้ไฟล์ PNG พื้นหลังโปร่งใส หรือ JPG ภาพสี่เหลี่ยมจัตุรัสจะสวยที่สุด ระบบย่อให้อัตโนมัติ</span>' +
          '<div class="flex flex-wrap gap-2">' + btn('อัปโหลดโลโก้ใหม่', 'uploadLogo', 'primary') + '</div>' +
          '<input id="logo-file" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" aria-label="เลือกไฟล์โลโก้"></div></div>') +
        card('<form id="site-form" class="grid gap-4 p-5 sm:grid-cols-2">' + fields +
          '<div class="flex justify-end sm:col-span-2"><button type="submit" class="h-11 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white shadow-md shadow-teal-700/25 hover:bg-teal-800">บันทึกข้อมูลโรงเรียน</button></div></form>') +
        '<div class="rounded-2xl border border-rose-200 bg-rose-50/60 p-5"><div class="flex flex-wrap items-center justify-between gap-4">' +
          '<div class="flex max-w-xl flex-col gap-1"><span class="font-display text-[17px] font-semibold leading-[1.5] text-rose-900">ล้างข้อมูลเพื่อเริ่มใช้กับโรงเรียนใหม่</span>' +
          '<span class="text-[13px] leading-[1.7] text-rose-900/80">ลบอัลบั้ม ภาพ กลุ่ม LINE และ Logs ออกจากระบบ (เก็บผู้ใช้และหมวดหมู่ไว้) ระบบจะสำรอง Sheet ทั้งไฟล์ให้ก่อน และไม่ลบไฟล์ภาพใน Drive โฟลเดอร์ภาพเดิมจะถูกเปลี่ยนชื่อเป็น "(เก่า)"</span></div>' +
          btn('ล้างข้อมูลเริ่มใหม่', 'resetSystem', 'danger') + '</div></div>' +
        '</div>';

      el('site-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var data = {};
        SITE_FORM.forEach(function (f) { data[f[0]] = el('site-' + f[0]).value; });
        busy();
        call('saveSite', data).then(function (r2) { PR.applySite(r2.site); ok('บันทึกข้อมูลโรงเรียนแล้ว'); }).catch(fail);
      });
      el('logo-file').addEventListener('change', function () {
        var f = el('logo-file').files[0];
        el('logo-file').value = '';
        if (!f) return;
        var run = PR.runner.open({ title: 'กำลังอัปโหลดโลโก้', text: 'กล้องน้อยกำลังพาโลโก้ขึ้นเว็บ…' });
        run.set(25);
        PR.prepareImage(f, 512, true, function (err, img) {
          if (err) { fail(err); return; }
          run.set(55);
          call('uploadLogo', { name: img.name, mime: img.mime, data: img.data }).then(function (r3) {
            run.done('ถึงเส้นชัยแล้ว! เปลี่ยนโลโก้เรียบร้อย');
            PR.applySite(r3.site);
            el('site-logo-img').src = r3.logo;
            setTimeout(function () { run.close(); }, 1100);
          }).catch(fail);
        });
      });
    }).catch(loadError);
  }

  function resetSystem() {
    PR.swal.fire({
      icon: 'warning',
      title: 'ล้างข้อมูลเริ่มใหม่?',
      html: 'อัลบั้ม ภาพ และกลุ่ม LINE ทั้งหมดจะหายจากเว็บ (มีสำเนาสำรองให้)<br>พิมพ์คำว่า <b>เริ่มระบบใหม่</b> เพื่อยืนยัน',
      input: 'text',
      inputAttributes: { 'aria-label': 'พิมพ์คำยืนยัน', autocomplete: 'off' },
      showCancelButton: true,
      confirmButtonText: 'ล้างข้อมูล',
      cancelButtonText: 'ยกเลิก',
      customClass: { container: 'pr-backdrop', popup: 'pr-swal', title: 'pr-swal-title', htmlContainer: 'pr-swal-text', input: 'pr-input', actions: 'pr-swal-actions', confirmButton: 'pr-btn pr-btn-danger', cancelButton: 'pr-btn pr-btn-ghost' },
      preConfirm: function (v) {
        if (String(v || '').trim() !== 'เริ่มระบบใหม่') { window.Swal.showValidationMessage('พิมพ์ "เริ่มระบบใหม่" ให้ตรง'); return false; }
        return v;
      }
    }).then(function (r) {
      if (!r.isConfirmed) return;
      busy('กำลังสำรองและล้างข้อมูล…', 'กล้องน้อยกำลังทำสำเนาสำรอง แล้วเคลียร์ข้อมูลเดิม…', 25);
      call('resetSystem', { confirm_text: r.value }, 300000).then(function (res) {
        endBusy();
        PR.store.set('pr_home', null);
        PR.swal.fire({
          icon: 'success',
          title: 'เริ่มระบบใหม่แล้ว',
          html: '<div style="text-align:left;line-height:1.8">' +
            '<a href="' + esc(res.backup_url) + '" target="_blank" rel="noopener" style="color:#0F766E;font-weight:600">เปิดไฟล์สำรองข้อมูลเดิม ↗</a><br>' +
            (res.old_folder_url ? '<a href="' + esc(res.old_folder_url) + '" target="_blank" rel="noopener" style="color:#0F766E;font-weight:600">โฟลเดอร์ภาพเดิม ↗</a><br>' : '') +
            '<span style="font-size:13px">ขั้นต่อไป: เปลี่ยน LINE_TOKEN เป็นของโรงเรียนใหม่ใน Script properties แล้วรัน diagnose()</span></div>',
          confirmButtonText: 'ตกลง'
        });
        window.location.hash = '#pending';
      }).catch(fail);
    });
  }

  /* ---------- จับการคลิกทั้งหน้า ---------- */
  V.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (!t || t.tagName === 'INPUT') return;
    var act = t.getAttribute('data-act');
    if (act === 'reload') return route();
    if (act === 'assign') return doAssign(t.closest('[data-batch]'));
    if (act === 'hideBatch') return doHideBatch(t.closest('[data-batch]'));
    if (act === 'newAlbum') return doNewAlbum();
    if (act === 'albumHide') return setAlbumStatus('hidden');
    if (act === 'albumShow') return setAlbumStatus('published');
    if (act === 'albumDelete') {
      var da = t.hasAttribute('data-i') ? S.albums[Number(t.getAttribute('data-i'))] : S.album;
      return da && deleteAlbum(da);
    }
    if (act === 'filter') { S.filter = t.getAttribute('data-f'); S.sel = {}; quiet = true; return renderAlbum(); }
    if (act === 'toggle') {
      var f = t.getAttribute('data-file');
      if (S.sel[f]) delete S.sel[f]; else S.sel[f] = true;
      quiet = true;
      return renderAlbum();
    }
    if (act === 'clearSel') { S.sel = {}; quiet = true; return renderAlbum(); }
    if (act === 'photosHide') return setPhotos('hidden');
    if (act === 'photosShow') return setPhotos('published');
    if (act === 'coverUpload') return el('cv-file').click();
    if (act === 'coverReset') return resetCover();
    if (act === 'setCover') {
      busy();
      return call('setCover', { album_id: S.album.id, file_id: Object.keys(S.sel)[0] }).then(function () { ok('ตั้งภาพปกแล้ว'); viewAlbum(S.album.id); }).catch(fail);
    }
    if (act === 'catNew') return editCategory(null);
    if (act === 'catEdit' || act === 'catDelete') {
      var id = t.closest('[data-cat]').getAttribute('data-cat');
      var c = S.categories.filter(function (x) { return x.id === id; })[0];
      if (act === 'catEdit') return editCategory(c);
      return confirmBox({ title: 'ลบหมวด “' + esc(c.name) + '”?', html: c.albums ? 'หมวดนี้ยังมี ' + c.albums + ' อัลบั้ม ต้องย้ายอัลบั้มออกก่อนจึงจะลบได้' : 'ลบแล้วกู้คืนไม่ได้', confirm: 'ลบหมวด', danger: true })
        .then(function (yes) {
          if (!yes) return;
          busy();
          call('deleteCategory', { id: id }).then(function () { ok('ลบหมวดแล้ว'); viewCategories(); }).catch(fail);
        });
    }
    if (act === 'saveSettings') return saveSettings();
    if (act === 'uploadPhotos') return el('up-files').click();
    if (act === 'uploadLogo') return el('logo-file').click();
    if (act === 'resetSystem') return resetSystem();
    if (act === 'previewSummary') return previewSummary();
    if (act === 'userNew') return editUser(null);
    if (act === 'userEdit') return editUser(S.users[Number(t.getAttribute('data-i'))]);
  });

  V.addEventListener('change', function (e) {
    var t = e.target;
    if (t.getAttribute('data-act') !== 'groupToggle') return;
    var on = t.checked;
    busy();
    call('setGroup', { group_id: t.getAttribute('data-group'), enabled: on })
      .then(function () { ok(on ? 'เปิดรับภาพแล้ว' : 'ปิดรับภาพแล้ว'); viewGroups(); })
      .catch(function (err) { t.checked = !on; fail(err); });
  });

  /* ---------- เริ่มต้น ---------- */
  if (typeof PR.post !== 'function') {
    el('login').classList.remove('hidden'); el('login').classList.add('flex');
    el('login-form').innerHTML = '<div class="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">' +
      '<div class="font-display text-lg font-bold">ไฟล์ common.js บนเว็บเป็นรุ่นเก่า</div>' +
      '<p class="mt-1 text-sm">อัปโหลด common.js ตัวล่าสุดขึ้นเว็บ แล้วกด Ctrl+F5 เพื่อโหลดหน้าใหม่</p></div>';
    return;
  }
  if (!PR.configured()) {
    el('login').classList.remove('hidden'); el('login').classList.add('flex');
    el('login-form').innerHTML = PR.notConfiguredHtml();
    return;
  }
  S.token = sget('pr_admin_token');
  if (!S.token) return showLogin();
  PR.loader.show('กำลังเตรียมข้อมูลก่อนเข้าระบบ…', 6);
  call('me').then(function (r) {
    S.user = r.user; PR.applySite(r.site);
    PR.loader.set('ยืนยันตัวตนแล้ว กำลังโหลดหน้าแรก…', 40);
    showApp();
  }).catch(function (err) {
    if (err.message !== 'auth') showLogin('เชื่อมต่อไม่สำเร็จ ลองเข้าสู่ระบบใหม่');
  });
})();

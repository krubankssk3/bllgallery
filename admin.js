<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>แอดมิน – คลังภาพประชาสัมพันธ์ โรงเรียนบ้านละลม</title>
<link rel="icon" href="https://img2.pic.in.th/pic/Logo-7aecb8e321ff2955.png">
<script>document.documentElement.className += ' js';</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anuphan:wght@400;500;600;700&amp;family=Noto+Sans+Thai:wght@400;500;600&amp;display=swap">
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = { theme: { extend: { fontFamily: { sans: ['"Noto Sans Thai"', 'system-ui', 'sans-serif'], display: ['Anuphan', '"Noto Sans Thai"', 'sans-serif'] } } } };
</script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
<link rel="stylesheet" href="styles.css?v=7">
</head>
<body class="bg-slate-50 text-slate-900 antialiased">

<!-- ล็อกอิน -->
<div id="login" class="hidden min-h-screen items-center justify-center px-4 py-10">
  <form id="login-form" class="reveal w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
    <div class="mb-6 flex flex-col items-center gap-3 text-center">
      <img src="https://img2.pic.in.th/pic/Logo-7aecb8e321ff2955.png" alt="ตราโรงเรียนบ้านละลม" class="h-16 w-16 rounded-2xl bg-white object-contain p-1 ring-1 ring-slate-200">
      <div>
        <h1 class="font-display text-xl font-bold">เข้าสู่ระบบแอดมิน</h1>
        <p class="text-sm text-slate-500">คลังภาพประชาสัมพันธ์ โรงเรียนบ้านละลม</p>
      </div>
    </div>
    <label for="lg-user" class="mb-1.5 block text-[13px] font-semibold text-slate-700">ชื่อผู้ใช้</label>
    <input id="lg-user" autocomplete="username" required class="mb-4 h-12 w-full rounded-xl border border-slate-300 px-3.5 text-[15px] outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15">
    <label for="lg-pass" class="mb-1.5 block text-[13px] font-semibold text-slate-700">รหัสผ่าน</label>
    <input id="lg-pass" type="password" autocomplete="current-password" required class="mb-6 h-12 w-full rounded-xl border border-slate-300 px-3.5 text-[15px] outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15">
    <button id="lg-btn" type="submit" class="h-12 w-full rounded-xl bg-teal-700 text-[15px] font-semibold text-white shadow-md shadow-teal-700/30 hover:bg-teal-800 disabled:opacity-60">เข้าสู่ระบบ</button>
    <a href="index.html" class="mt-5 block text-center text-sm text-slate-500 hover:text-teal-700">← กลับหน้าคลังภาพ</a>
  </form>
</div>

<!-- แอป -->
<div id="app" class="hidden min-h-screen flex-wrap">
  <aside class="box-border flex min-w-[220px] max-w-full flex-[1_1_240px] flex-col gap-6 bg-slate-900 px-4 py-6 text-slate-200 lg:max-w-[260px]">
    <div class="flex items-center gap-2.5 px-2">
      <img src="https://img2.pic.in.th/pic/Logo-7aecb8e321ff2955.png" alt="" class="h-9 w-9 rounded-xl bg-white object-contain p-0.5">
      <span class="font-display text-base font-semibold text-white">คลังภาพ · แอดมิน</span>
    </div>
    <nav id="nav" aria-label="เมนูแอดมิน" class="flex flex-row flex-wrap gap-1 lg:flex-col">
      <a href="#pending" data-view="pending" class="nav-item flex items-center justify-between gap-3 rounded-[10px] px-3 py-3 text-[15px]">ภาพรอจัดอัลบั้ม <span id="badge-pending" class="hidden rounded-full bg-amber-400 px-2 text-[13px] font-semibold text-slate-900"></span></a>
      <a href="#albums" data-view="albums" class="nav-item rounded-[10px] px-3 py-3 text-[15px]">อัลบั้มทั้งหมด</a>
      <a href="#categories" data-view="categories" class="nav-item rounded-[10px] px-3 py-3 text-[15px]">หมวดหมู่</a>
      <a href="#groups" data-view="groups" class="nav-item rounded-[10px] px-3 py-3 text-[15px]">กลุ่ม LINE</a>
      <a href="#users" data-view="users" class="nav-item rounded-[10px] px-3 py-3 text-[15px]">ผู้ใช้และสิทธิ์</a>
      <a href="#settings" data-view="settings" class="nav-item rounded-[10px] px-3 py-3 text-[15px]">ตั้งค่าบอท</a>
    </nav>
    <div class="mt-auto flex flex-col gap-1 border-t border-slate-800 pt-4 text-sm">
      <span class="px-3 text-slate-400">เข้าสู่ระบบเป็น</span>
      <span id="me-name" class="px-3 font-semibold text-white"></span>
      <a href="index.html" target="_blank" class="rounded-[10px] px-3 py-2 text-slate-300 hover:bg-slate-800">เปิดหน้าเว็บสาธารณะ ↗</a>
      <button id="btn-pass" type="button" class="rounded-[10px] px-3 py-2 text-left text-slate-300 hover:bg-slate-800">เปลี่ยนรหัสผ่าน</button>
      <button id="btn-logout" type="button" class="rounded-[10px] px-3 py-2 text-left text-rose-300 hover:bg-slate-800">ออกจากระบบ</button>
    </div>
  </aside>
  <main id="view" class="box-border min-w-0 flex-[999_1_560px] p-5 sm:p-8"></main>
</div>

<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script src="config.js?v=7"></script>
<script src="common.js?v=7"></script>
<script src="admin.js?v=7"></script>
</body>
</html>

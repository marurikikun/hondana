// わが家の本棚：電波がなくても開けるようにするしくみ（Service Worker）
// - アプリ本体（画面・アイコン・本の一覧）は、開くたびに新しいものを取りにいき、届かないときは保存しておいた写しを使う
// - 本の中身は、「📥 この本をスマホに保存」で保存したものだけを、電波がないときに使う
const SHELL = "hondana-shell-v1";
const BOOKS = "hondana-books-v1";
const FILES = ["./", "index.html", "manifest.json", "icon-180.png", "icon-512.png", "catalog.json"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith("hondana-shell") && k !== SHELL).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;

  if (url.pathname.includes("/books/")) {
    // 本：まずネット、だめなら保存した本
    e.respondWith(
      fetch(req).catch(() =>
        caches.open(BOOKS).then(c => c.match(req, { ignoreSearch: true })).then(r => r || Response.error())
      )
    );
    return;
  }

  // アプリ本体：まずネット（届いたら写しを更新）、だめなら写し
  e.respondWith(
    fetch(req)
      .then(r => {
        if (r.ok) { const cp = r.clone(); caches.open(SHELL).then(c => c.put(req, cp)); }
        return r;
      })
      .catch(() =>
        caches.open(SHELL)
          .then(c => c.match(req, { ignoreSearch: true }).then(r => r || c.match("index.html")))
          .then(r => r || Response.error())
      )
  );
});

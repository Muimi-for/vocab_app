/**
 * 词汇随记 - Service Worker
 * 提供 PWA 离线缓存支持，优先保证更新及时性
 */

const CACHE_NAME = 'vocab-pwa-v3';
const ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/search.html',
    '/search.css',
    '/search.js',
    '/search-page.js',
    '/review.html',
    '/review.css',
    '/review.js',
    '/review-phrases.html',
    '/review-phrases.js',
    '/network.html',
    '/network.css',
    '/network.js',
    '/repair.html',
    '/import.html',
    '/import-tool.html',
    '/import-batch-08.html',
    '/import-batch-09.html',
    '/lib/d3.v7.min.js',
    '/manifest.json',
    '/data/words-batch-01.json',
    '/data/words-batch-02.json',
    '/data/words-batch-03.json',
    '/data/words-batch-04.json',
    '/data/words-batch-05.json',
    '/data/words-batch-06.json',
    '/data/words-batch-07.json',
    '/data/words-batch-08.json',
    '/data/words-batch-09.json',
    '/icon-192.png',
    '/icon-512.png'
];

// 安装时缓存核心资源
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
            .catch(err => console.error('Service Worker 缓存失败：', err))
    );
});

// 激活时清理旧版本缓存并接管所有页面
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// 判断请求是否为 HTML 页面
function isPage(request) {
    return request.destination === 'document' || request.mode === 'navigate';
}

// 监听页面发来的跳过等待消息
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// 拦截请求
self.addEventListener('fetch', event => {
    const { request } = event;

    // 跳过非 GET 请求和非 http/https 请求
    if (request.method !== 'GET' || !request.url.startsWith('http')) {
        return;
    }

    event.respondWith(
        caches.match(request).then(cached => {
            // HTML 页面：优先网络，失败回退缓存，确保更新及时
            if (isPage(request)) {
                return fetch(request)
                    .then(response => {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                        return response;
                    })
                    .catch(() => cached || caches.match('/index.html'));
            }

            // 其他资源：先返回缓存，同时后台更新（stale-while-revalidate）
            const fetchPromise = fetch(request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                    return response;
                })
                .catch(() => cached);

            return cached || fetchPromise;
        })
    );
});

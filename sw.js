/**
 * 词汇随记 - Service Worker
 * 提供 PWA 离线缓存支持
 */

const CACHE_NAME = 'vocab-pwa-v2-retry';
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

// 激活时清理旧版本缓存
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// 拦截请求：已缓存资源优先使用缓存，其他走网络
self.addEventListener('fetch', event => {
    const { request } = event;

    // 跳过非 GET 请求和 chrome-extension 等 scheme
    if (request.method !== 'GET' || !request.url.startsWith('http')) {
        return;
    }

    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) {
                return cached;
            }
            return fetch(request).then(response => {
                // 不缓存动态或敏感请求
                return response;
            }).catch(() => {
                // 离线且未缓存时，返回兜底响应
                if (request.destination === 'document') {
                    return caches.match('/index.html');
                }
                return new Response('离线状态，该资源尚未缓存', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                });
            });
        })
    );
});

/**
 * 注册 Service Worker
 */

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => {
                console.log('Service Worker 注册成功：', reg.scope);

                // 检测等待中的新版本，提示用户刷新
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showUpdateNotice(newWorker);
                        }
                    });
                });
            })
            .catch(err => {
                console.error('Service Worker 注册失败：', err);
            });
    });

    // 监听 controllerchange，表示新 SW 已接管页面
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
    });
}

function showUpdateNotice(worker) {
    // 如果页面上有统一的提示容器就复用，否则创建一个
    let notice = document.getElementById('sw-update-notice');
    if (!notice) {
        notice = document.createElement('div');
        notice.id = 'sw-update-notice';
        notice.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#4f46e5;color:#fff;padding:12px 16px;text-align:center;font-size:0.95rem;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
        document.body.appendChild(notice);
    }
    notice.innerHTML = '检测到新版本，<button id="sw-update-btn" style="margin-left:8px;padding:4px 12px;border:none;border-radius:4px;background:#fff;color:#4f46e5;cursor:pointer;font-weight:600;">点击刷新</button>';

    document.getElementById('sw-update-btn').addEventListener('click', () => {
        worker.postMessage({ type: 'SKIP_WAITING' });
    });
}

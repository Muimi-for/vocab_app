/**
 * 注册 Service Worker
 */

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => {
                console.log('Service Worker 注册成功：', reg.scope);
            })
            .catch(err => {
                console.error('Service Worker 注册失败：', err);
            });
    });
}

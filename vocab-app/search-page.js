/**
 * 词汇随记 - 高级检索页逻辑
 */

const searchQueryInput = document.getElementById('search-query');
const searchBtn = document.getElementById('search-btn');
const importantOnlyCheckbox = document.getElementById('search-important-only');
const resultCountEl = document.getElementById('result-count');
const resultsContainer = document.getElementById('search-results');

function performSearch() {
    const query = searchQueryInput.value.trim();
    const importantOnly = importantOnlyCheckbox.checked;

    if (!query) {
        resultsContainer.innerHTML = '<div class="empty-tip">输入关键词开始检索</div>';
        resultCountEl.textContent = '0';
        return;
    }

    const words = loadWordsForSearch();
    const results = searchWords(words, query, { importantOnly, limit: 100 });

    resultCountEl.textContent = results.length;

    if (results.length === 0) {
        resultsContainer.innerHTML = `<div class="empty-tip">未找到与 “${escapeHtml(query)}” 相关的单词</div>`;
        return;
    }

    resultsContainer.innerHTML = results.map(r => renderSearchResult(r, query)).join('');
}

// 输入时实时搜索
let searchTimeout = null;
searchQueryInput.addEventListener('input', function () {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(performSearch, 150);
});

// 点击搜索按钮
searchBtn.addEventListener('click', performSearch);

// 回车搜索
searchQueryInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') performSearch();
});

// 仅重点词筛选变化
importantOnlyCheckbox.addEventListener('change', performSearch);

// 结果卡片上的编辑 / 删除按钮
resultsContainer.addEventListener('click', function (event) {
    const target = event.target;
    const id = target.dataset.id;
    if (!id) return;

    if (target.classList.contains('edit-btn')) {
        window.location.href = 'index.html?edit=' + encodeURIComponent(id);
    } else if (target.classList.contains('delete-btn')) {
        if (!confirm('确定要删除这个单词吗？')) return;
        const words = loadWordsForSearch().filter(w => w.id !== id);
        localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(words));
        performSearch();
    }
});

// 页面加载时聚焦搜索框
searchQueryInput.focus();

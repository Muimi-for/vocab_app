/**
 * 词汇随记 - 高效检索系统
 * 支持对单词、释义、词组、例句、备注、关联词进行全文检索与相关性排序
 */

const SEARCH_STORAGE_KEY = 'vocab_words';

function loadWordsForSearch() {
    const data = localStorage.getItem(SEARCH_STORAGE_KEY);
    const words = data ? JSON.parse(data) : [];
    words.forEach(w => {
        if (typeof w.reviewLevel !== 'number') w.reviewLevel = 0;
        if (!w.lastReviewedAt) w.lastReviewedAt = null;
        if (!w.nextReviewDate) w.nextReviewDate = null;
        if (typeof w.interval !== 'number') w.interval = 0;
    });
    return words;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 将查询字符串拆分为搜索词（支持中英文空格、逗号、分号）
 */
function tokenize(query) {
    if (!query || typeof query !== 'string') return [];
    return query
        .toLowerCase()
        .split(/[\s,;，；]+/)
        .map(t => t.trim())
        .filter(t => t.length > 0);
}

/**
 * 构建一个单词的全文检索文本
 */
function buildSearchText(word) {
    const parts = [
        word.word || '',
        word.meaning || '',
        ...(word.phrases || []).map(p => p.text),
        ...(word.examples || []),
        word.notes || ''
    ];

    if (word.relations) {
        ['synonyms', 'antonyms', 'derivatives', 'confusable', 'roots'].forEach(key => {
            const arr = word.relations[key];
            if (Array.isArray(arr)) parts.push(...arr);
        });
    }

    return parts.join(' ').toLowerCase();
}

/**
 * 计算单词与搜索词的相关性得分
 * 得分规则（可叠加）：
 * - 单词完全匹配：+100
 * - 单词前缀匹配：+60
 * - 单词包含匹配：+40
 * - 释义包含匹配：+25
 * - 其他字段包含匹配：+10
 */
function scoreWord(word, terms) {
    if (terms.length === 0) return 0;

    const wordLower = (word.word || '').toLowerCase();
    const meaningLower = (word.meaning || '').toLowerCase();
    const allText = buildSearchText(word);

    let score = 0;
    let matchedTerms = 0;

    terms.forEach(term => {
        let termMatched = false;

        if (wordLower === term) {
            score += 100;
            termMatched = true;
        } else if (wordLower.startsWith(term)) {
            score += 60;
            termMatched = true;
        } else if (wordLower.includes(term)) {
            score += 40;
            termMatched = true;
        } else if (meaningLower.includes(term)) {
            score += 25;
            termMatched = true;
        } else if (allText.includes(term)) {
            score += 10;
            termMatched = true;
        }

        if (termMatched) matchedTerms++;
    });

    // 所有搜索词都匹配时额外加分，鼓励多关键词同时命中
    if (matchedTerms === terms.length) {
        score += matchedTerms * 5;
    }

    return score;
}

/**
 * 执行搜索
 * @param {Array} words 单词数组
 * @param {string} query 查询字符串
 * @param {Object} options 选项
 *   - importantOnly: 是否只搜重点词
 *   - limit: 返回结果数量上限（默认无限制）
 * @returns {Array} 按相关性排序的结果，每项包含 word 和 score
 */
function searchWords(words, query, options = {}) {
    const terms = tokenize(query);
    if (terms.length === 0) return [];

    let results = words
        .filter(w => !options.importantOnly || w.isImportant)
        .map(w => ({ word: w, score: scoreWord(w, terms) }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score);

    if (options.limit && options.limit > 0) {
        results = results.slice(0, options.limit);
    }

    return results;
}

/**
 * 高亮文本中的搜索词
 * @param {string} text 原文本
 * @param {string} query 查询字符串
 * @param {number} maxLen 最大返回长度（超出则截断并加省略号）
 */
function highlightText(text, query, maxLen = 200) {
    if (!text) return '';
    const terms = tokenize(query);
    if (terms.length === 0) return escapeHtml(truncateText(text, maxLen));

    // 按长度降序，优先匹配长词，避免短词先替换导致高亮嵌套
    const sortedTerms = [...terms].sort((a, b) => b.length - a.length);
    const pattern = new RegExp(
        '(' + sortedTerms.map(t => escapeRegex(t)).join('|') + ')',
        'gi'
    );

    let html = escapeHtml(text).replace(pattern, '<mark>$1</mark>');

    if (text.length > maxLen) {
        // 尝试保留第一个匹配位置附近的上下文
        const firstMatch = html.indexOf('<mark>');
        if (firstMatch > 30) {
            const start = Math.max(0, firstMatch - 30);
            const end = Math.min(html.length, start + maxLen);
            html = '…' + html.slice(start, end) + (end < html.length ? '…' : '');
        } else {
            html = html.slice(0, maxLen) + (html.length > maxLen ? '…' : '');
        }
    }

    return html;
}

function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function truncateText(text, maxLen) {
    if (!text || text.length <= maxLen) return text || '';
    return text.slice(0, maxLen - 1) + '…';
}

/**
 * 为搜索结果生成摘要（显示命中的字段片段）
 */
function buildResultSnippet(word, query) {
    const terms = tokenize(query);
    const snippets = [];

    // 优先展示词组命中
    if (word.phrases && word.phrases.length > 0) {
        const matched = word.phrases.find(p => terms.some(t => p.text.toLowerCase().includes(t)));
        if (matched) {
            snippets.push(`<span class="snippet-label">词组</span> ${highlightText(matched.text, query, 120)}`);
        }
    }

    // 其次展示例句命中
    if (word.examples && word.examples.length > 0) {
        const matched = word.examples.find(e => terms.some(t => e.toLowerCase().includes(t)));
        if (matched) {
            snippets.push(`<span class="snippet-label">例句</span> ${highlightText(matched, query, 160)}`);
        }
    }

    // 备注命中
    if (word.notes && terms.some(t => word.notes.toLowerCase().includes(t))) {
        snippets.push(`<span class="snippet-label">备注</span> ${highlightText(word.notes, query, 160)}`);
    }

    // 关联词命中
    if (word.relations) {
        const labels = {
            synonyms: '近义词',
            antonyms: '反义词',
            derivatives: '派生词',
            confusable: '易混词',
            roots: '同根词'
        };
        for (const key of Object.keys(labels)) {
            const arr = word.relations[key];
            if (!Array.isArray(arr)) continue;
            const matched = arr.find(s => terms.some(t => s.toLowerCase().includes(t)));
            if (matched) {
                snippets.push(`<span class="snippet-label">${labels[key]}</span> ${highlightText(matched, query, 120)}`);
            }
        }
    }

    return snippets.length > 0 ? snippets.join('<br>') : '';
}

/**
 * 渲染搜索结果卡片
 */
function renderSearchResult(result, query) {
    const word = result.word;
    const badgeClass = word.isImportant ? 'badge-important' : 'badge-normal';
    const badgeText = word.isImportant ? '重点' : '了解';
    const importanceClass = word.isImportant ? 'important' : 'normal';

    return `
        <div class="word-card search-result ${importanceClass}" data-id="${word.id}">
            <div class="word-header">
                <div>
                    <h3 class="word-title">${highlightText(word.word, query, 60)}</h3>
                    <p class="word-meaning">${highlightText(word.meaning, query, 120)}</p>
                </div>
                <span class="badge ${badgeClass}">${badgeText}</span>
            </div>
            ${buildResultSnippet(word, query) ? `<div class="search-snippets">${buildResultSnippet(word, query)}</div>` : ''}
            <div class="word-actions">
                <button class="edit-btn" data-id="${word.id}">编辑</button>
                <button class="delete-btn" data-id="${word.id}">删除</button>
            </div>
        </div>
    `;
}

/**
 * 词汇随记 - 核心逻辑
 * 功能：添加、编辑、删除、展示单词，数据保存在浏览器 localStorage
 */

// 从 localStorage 读取数据，如果没有则返回空数组
function loadWords() {
    const data = localStorage.getItem('vocab_words');
    const words = data ? JSON.parse(data) : [];
    // 确保每个单词都有 SRS 字段（兼容旧数据）
    words.forEach(w => {
        if (typeof w.reviewLevel !== 'number') w.reviewLevel = 0;
        if (!w.lastReviewedAt) w.lastReviewedAt = null;
        if (!w.nextReviewDate) w.nextReviewDate = null;
        if (typeof w.interval !== 'number') w.interval = 0;
    });
    return words;
}

// 保存数据到 localStorage
function saveWords(words) {
    localStorage.setItem('vocab_words', JSON.stringify(words));
}

// 获取今天的日期字符串（YYYY-MM-DD）
function getTodayStr() {
    return new Date().toISOString().slice(0, 10);
}

// 计算 N 天后的日期字符串
function addDaysStr(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

// 根据评级更新 SRS 参数
// rating: 'again' 忘记, 'hard' 模糊, 'good' 认识
function updateSRS(word, rating) {
    const today = getTodayStr();
    let level = word.reviewLevel || 0;
    let interval = word.interval || 0;

    if (rating === 'again') {
        level = 0;
        interval = 1;
    } else if (rating === 'hard') {
        // 保持等级，但略微增加间隔
        interval = Math.max(1, Math.ceil(interval * 1.3));
        if (interval < 1) interval = 1;
    } else if (rating === 'good') {
        level += 1;
        if (level === 1) interval = 1;
        else if (level === 2) interval = 3;
        else if (level === 3) interval = 6;
        else interval = Math.max(1, Math.ceil(interval * 2));
    }

    word.reviewLevel = level;
    word.interval = interval;
    word.lastReviewedAt = today;
    word.nextReviewDate = addDaysStr(interval);
}

// 获取今日需要复习的单词（已到期的 + 新词）
function getTodayReviewWords(newWordLimit = 10) {
    const today = getTodayStr();
    const words = loadWords();

    // 已到期（nextReviewDate <= 今天）
    const dueWords = words.filter(w => w.nextReviewDate && w.nextReviewDate <= today);

    // 新词（从未复习过，reviewLevel === 0 且没有 nextReviewDate）
    const newWords = words.filter(w => w.reviewLevel === 0 && !w.nextReviewDate);

    // 合并：先复习到期词，再补充新词（不超过每日新词上限）
    return [...dueWords, ...newWords.slice(0, Math.max(0, newWordLimit - dueWords.length))];
}

// 生成唯一 ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// 解析短语文本：以 * 开头的行标记为重点短语
function parsePhrases(text) {
    return text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => ({
            text: line.startsWith('*') ? line.slice(1).trim() : line,
            important: line.startsWith('*')
        }));
}

// 将短语数组还原为表单文本
function phrasesToText(phrases) {
    return phrases.map(p => (p.important ? '* ' : '') + p.text).join('\n');
}

// 解析关联词输入：用中文逗号/顿号/分号分隔，英文逗号保留在词项内
function parseRelations(text) {
    if (!text || !text.trim()) return [];
    return text
        .split(/[，;；、]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
}

// 读取五个关联词输入框，生成 relations 对象
function buildRelationsFromForm() {
    const rels = {
        synonyms: parseRelations(relSynonymsInput.value),
        antonyms: parseRelations(relAntonymsInput.value),
        derivatives: parseRelations(relDerivativesInput.value),
        confusable: parseRelations(relConfusableInput.value),
        roots: parseRelations(relRootsInput.value)
    };
    // 如果所有类别都为空，则返回 null，保持数据简洁
    const hasAny = Object.values(rels).some(arr => arr.length > 0);
    return hasAny ? rels : null;
}

// 将 relations 对象还原为五个输入框的值
function relationsToForm(relations) {
    relSynonymsInput.value = (relations && relations.synonyms || []).join('，');
    relAntonymsInput.value = (relations && relations.antonyms || []).join('，');
    relDerivativesInput.value = (relations && relations.derivatives || []).join('，');
    relConfusableInput.value = (relations && relations.confusable || []).join('，');
    relRootsInput.value = (relations && relations.roots || []).join('，');
}

// 当前筛选状态
let currentFilter = 'all';
let currentSearchQuery = '';

// 获取表单元素
const form = document.getElementById('word-form');
const editIdInput = document.getElementById('edit-id');
const wordInput = document.getElementById('word');
const meaningInput = document.getElementById('meaning');
const phrasesInput = document.getElementById('phrases');
const examplesInput = document.getElementById('examples');
const notesInput = document.getElementById('notes');
const relSynonymsInput = document.getElementById('rel-synonyms');
const relAntonymsInput = document.getElementById('rel-antonyms');
const relDerivativesInput = document.getElementById('rel-derivatives');
const relConfusableInput = document.getElementById('rel-confusable');
const relRootsInput = document.getElementById('rel-roots');
const importantInput = document.getElementById('is-important');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const formTitle = document.getElementById('form-title');
const wordListEl = document.getElementById('word-list');
const totalCountEl = document.getElementById('total-count');

// 提交表单：新增或更新
form.addEventListener('submit', function (event) {
    event.preventDefault();

    const word = wordInput.value.trim();
    const meaning = meaningInput.value.trim();
    if (!word || !meaning) {
        alert('单词和中文释义为必填项');
        return;
    }

    const words = loadWords();
    const existingWord = editIdInput.value ? words.find(w => w.id === editIdInput.value) : null;

    const newEntry = {
        id: editIdInput.value || generateId(),
        word: word,
        meaning: meaning,
        phrases: parsePhrases(phrasesInput.value),
        examples: examplesInput.value.split('\n').map(s => s.trim()).filter(s => s),
        notes: notesInput.value.trim(),
        relations: buildRelationsFromForm(),
        isImportant: importantInput.checked,
        createdAt: existingWord ? existingWord.createdAt : new Date().toISOString().slice(0, 10),
        lastReviewedAt: existingWord ? existingWord.lastReviewedAt : null,
        reviewLevel: existingWord ? existingWord.reviewLevel : 0,
        interval: existingWord ? existingWord.interval : 0,
        nextReviewDate: existingWord ? existingWord.nextReviewDate : null
    };

    if (editIdInput.value) {
        // 编辑模式：替换旧数据
        const index = words.findIndex(w => w.id === editIdInput.value);
        words[index] = newEntry;
    } else {
        // 新增模式
        words.push(newEntry);
    }

    saveWords(words);
    resetForm();
    render();
});

// 取消编辑
cancelBtn.addEventListener('click', resetForm);

// 重置表单
function resetForm() {
    form.reset();
    editIdInput.value = '';
    relSynonymsInput.value = '';
    relAntonymsInput.value = '';
    relDerivativesInput.value = '';
    relConfusableInput.value = '';
    relRootsInput.value = '';
    submitBtn.textContent = '保存';
    cancelBtn.hidden = true;
    formTitle.textContent = '添加新单词';
}

// 渲染单词列表
function render() {
    const words = loadWords();
    let filtered = words.filter(w => {
        if (currentFilter === 'important') return w.isImportant;
        if (currentFilter === 'normal') return !w.isImportant;
        return true;
    });

    // 如果有检索词，使用检索系统排序并高亮
    if (currentSearchQuery.trim()) {
        const searchResults = searchWords(filtered, currentSearchQuery, { limit: 200 });
        filtered = searchResults.map(r => r.word);
        totalCountEl.textContent = filtered.length;
        wordListEl.innerHTML = '';

        if (filtered.length === 0) {
            wordListEl.innerHTML = `<div class="empty-tip">未找到与 “${escapeHtml(currentSearchQuery)}” 相关的单词</div>`;
            return;
        }

        filtered.forEach(item => {
            const temp = document.createElement('div');
            temp.innerHTML = renderSearchResult({ word: item }, currentSearchQuery);
            wordListEl.appendChild(temp.firstElementChild);
        });
        return;
    }

    totalCountEl.textContent = filtered.length;
    wordListEl.innerHTML = '';

    if (filtered.length === 0) {
        wordListEl.innerHTML = '<div class="empty-tip">暂无单词，请在上方添加</div>';
        return;
    }

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = `word-card ${item.isImportant ? 'important' : 'normal'}`;

        const badgeClass = item.isImportant ? 'badge-important' : 'badge-normal';
        const badgeText = item.isImportant ? '重点' : '了解';

        card.innerHTML = `
            <div class="word-header">
                <div>
                    <h3 class="word-title">${escapeHtml(item.word)}</h3>
                    <p class="word-meaning">${escapeHtml(item.meaning)}</p>
                </div>
                <span class="badge ${badgeClass}">${badgeText}</span>
            </div>
            ${renderSection('词组 / 短语', renderPhrases(item.phrases))}
            ${renderSection('例句', renderList(item.examples))}
            ${renderSection('备注', renderText(item.notes))}
            ${renderSection('关联', renderRelations(item.relations))}
            <div class="word-actions">
                <button class="edit-btn" data-id="${item.id}">编辑</button>
                <button class="delete-btn" data-id="${item.id}">删除</button>
            </div>
        `;

        wordListEl.appendChild(card);
    });
}

// 渲染一个区块，如果内容为空则不显示
function renderSection(title, content) {
    if (!content) return '';
    return `
        <div class="word-section">
            <p class="word-section-title">${title}</p>
            ${content}
        </div>
    `;
}

// 渲染短语列表
function renderPhrases(phrases) {
    if (!phrases || phrases.length === 0) return '';
    const items = phrases.map(p => {
        const cls = p.important ? 'important-phrase' : '';
        const mark = p.important ? '★ ' : '';
        return `<li class="${cls}">${mark}${escapeHtml(p.text)}</li>`;
    }).join('');
    return `<ul>${items}</ul>`;
}

// 渲染普通列表
function renderList(arr) {
    if (!arr || arr.length === 0) return '';
    return `<ul>${arr.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`;
}

// 渲染普通文本
function renderText(text) {
    if (!text) return '';
    return `<p>${escapeHtml(text)}</p>`;
}

// 渲染关联字段（近义词、反义词、派生词、易混词、词根）
function renderRelations(relations) {
    if (!relations) return '';

    const labels = {
        synonyms: '近义词',
        antonyms: '反义词',
        derivatives: '派生词',
        confusable: '易混词',
        roots: '典型词根 / 同源'
    };

    const parts = [];
    for (const key of Object.keys(labels)) {
        const arr = relations[key];
        if (Array.isArray(arr) && arr.length > 0) {
            parts.push(`<p><strong>${labels[key]}：</strong>${arr.map(s => escapeHtml(s)).join('、')}</p>`);
        }
    }

    return parts.length > 0 ? parts.join('') : '';
}

// 防止 XSS 的简单转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 列表点击事件：编辑 / 删除
wordListEl.addEventListener('click', function (event) {
    const target = event.target;
    const id = target.dataset.id;
    if (!id) return;

    if (target.classList.contains('edit-btn')) {
        editWord(id);
    } else if (target.classList.contains('delete-btn')) {
        deleteWord(id);
    }
});

// 编辑单词：把数据回填到表单
function editWord(id) {
    const words = loadWords();
    const item = words.find(w => w.id === id);
    if (!item) return;

    editIdInput.value = item.id;
    wordInput.value = item.word;
    meaningInput.value = item.meaning;
    phrasesInput.value = phrasesToText(item.phrases);
    examplesInput.value = item.examples.join('\n');
    notesInput.value = item.notes;
    relationsToForm(item.relations);
    importantInput.checked = item.isImportant;

    submitBtn.textContent = '更新';
    cancelBtn.hidden = false;
    formTitle.textContent = '编辑单词';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 删除单词
function deleteWord(id) {
    if (!confirm('确定要删除这个单词吗？')) return;
    const words = loadWords().filter(w => w.id !== id);
    saveWords(words);
    render();
}

// 筛选按钮
const filterBtns = document.querySelectorAll('.filter-btn');
filterBtns.forEach(btn => {
    btn.addEventListener('click', function () {
        currentFilter = this.dataset.filter;
        filterBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        render();
    });
});

// 更新首页“今日复习”数量
function updateReviewCount() {
    const el = document.getElementById('review-count');
    if (!el) return;
    const count = getTodayReviewWords().length;
    el.textContent = count;
}

// 快速检索输入框（带防抖）
const quickSearchInput = document.getElementById('quick-search');
if (quickSearchInput) {
    let searchTimeout = null;
    quickSearchInput.addEventListener('input', function () {
        if (searchTimeout) clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearchQuery = this.value.trim();
            render();
        }, 150);
    });
}

// 处理从其他页面跳转过来的编辑请求（例如 search.html ?edit=xxx）
function handleEditQueryParam() {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (editId) {
        const words = loadWords();
        if (words.find(w => w.id === editId)) {
            editWord(editId);
            // 清理 URL，避免刷新重复进入编辑模式
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
}

// ---------- 数据备份 ----------

function updateBackupInfo() {
    const countEl = document.getElementById('backup-count');
    const sizeEl = document.getElementById('backup-size');
    if (!countEl || !sizeEl) return;

    const words = loadWords();
    const data = localStorage.getItem('vocab_words') || '[]';
    const sizeBytes = new Blob([data]).size;

    countEl.textContent = words.length;
    sizeEl.textContent = formatBytes(sizeBytes);
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function showBackupMessage(text, isError = false) {
    const el = document.getElementById('backup-message');
    if (!el) return;
    el.textContent = text;
    el.className = 'backup-message' + (isError ? ' error' : ' success');
    el.style.display = 'block';
    setTimeout(() => {
        el.style.display = 'none';
    }, 4000);
}

function exportBackup() {
    const data = localStorage.getItem('vocab_words') || '[]';
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const today = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocab-backup-${today}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showBackupMessage('备份已导出');
}

function validateWords(data) {
    if (!Array.isArray(data)) return { ok: false, error: '备份文件格式错误：根节点必须是数组' };
    for (let i = 0; i < data.length; i++) {
        const w = data[i];
        if (!w || typeof w !== 'object') return { ok: false, error: `第 ${i + 1} 项不是有效对象` };
        if (!w.id || !w.word || !w.meaning) return { ok: false, error: `第 ${i + 1} 项缺少 id/word/meaning 字段` };
    }
    return { ok: true };
}

function doImport(backupWords, mode) {
    const currentWords = loadWords();
    let result = [];
    let added = 0;
    let updated = 0;

    if (mode === 'overwrite') {
        result = backupWords.map(w => ({ ...w }));
        added = result.length;
    } else {
        const currentMap = new Map(currentWords.map(w => [w.id, w]));
        backupWords.forEach(w => {
            if (currentMap.has(w.id)) {
                currentMap.set(w.id, { ...w });
                updated++;
            } else {
                currentMap.set(w.id, { ...w });
                added++;
            }
        });
        result = Array.from(currentMap.values());
    }

    saveWords(result);
    render();
    updateReviewCount();
    updateBackupInfo();
    showBackupMessage(`恢复完成：新增 ${added} 个，更新 ${updated} 个`);
}

function importBackup(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        try {
            const backupWords = JSON.parse(event.target.result);
            const validation = validateWords(backupWords);
            if (!validation.ok) {
                showBackupMessage(validation.error, true);
                return;
            }

            const currentCount = loadWords().length;
            const backupCount = backupWords.length;

            if (currentCount === 0) {
                doImport(backupWords, 'overwrite');
                return;
            }

            const mode = confirm(
                `当前有 ${currentCount} 个单词，备份文件有 ${backupCount} 个单词。\n\n` +
                `点击“确定”：覆盖现有数据（用备份完全替换）\n` +
                `点击“取消”：合并数据（相同 id 的单词会被备份覆盖，其余保留）`
            ) ? 'overwrite' : 'merge';

            doImport(backupWords, mode);
        } catch (err) {
            showBackupMessage('解析备份文件失败：' + err.message, true);
        }
    };
    reader.onerror = function () {
        showBackupMessage('读取文件失败', true);
    };
    reader.readAsText(file);
}

// 备份按钮事件
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');

if (exportBtn) exportBtn.addEventListener('click', exportBackup);
if (importBtn) {
    importBtn.addEventListener('change', function () {
        importBackup(this.files[0]);
        this.value = ''; // 允许重复选择同一文件
    });
}

// 页面加载时渲染
render();
updateReviewCount();
updateBackupInfo();
handleEditQueryParam();

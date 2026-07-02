/**
 * 词汇随记 - 复习模块
 * 基于简化版 SM-2 间隔重复算法
 */

const STORAGE_KEY = 'vocab_words';
const NEW_WORDS_PER_DAY = 10;

function loadWords() {
    const data = localStorage.getItem(STORAGE_KEY);
    const words = data ? JSON.parse(data) : [];
    words.forEach(w => {
        if (typeof w.reviewLevel !== 'number') w.reviewLevel = 0;
        if (!w.lastReviewedAt) w.lastReviewedAt = null;
        if (!w.nextReviewDate) w.nextReviewDate = null;
        if (typeof w.interval !== 'number') w.interval = 0;
    });
    return words;
}

function saveWords(words) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

function getTodayStr() {
    return new Date().toISOString().slice(0, 10);
}

function addDaysStr(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

// 根据评级更新 SRS 参数
function updateSRS(word, rating) {
    let level = word.reviewLevel || 0;
    let interval = word.interval || 0;

    if (rating === 'again') {
        level = 0;
        interval = 1;
    } else if (rating === 'hard') {
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
    word.lastReviewedAt = getTodayStr();
    word.nextReviewDate = addDaysStr(interval);
}

// 获取今日需要复习的单词
function getTodayReviewWords() {
    const today = getTodayStr();
    const words = loadWords();
    const dueWords = words.filter(w => w.nextReviewDate && w.nextReviewDate <= today);
    const newWords = words.filter(w => w.reviewLevel === 0 && !w.nextReviewDate);
    return [...dueWords, ...newWords.slice(0, Math.max(0, NEW_WORDS_PER_DAY - dueWords.length))];
}

// 洗牌算法
function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 复习状态
let reviewWords = [];
let currentIndex = 0;
let isFlipped = false;

const reviewContainer = document.getElementById('review-container');
const completionMessage = document.getElementById('completion-message');
const progressText = document.getElementById('progress-text');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const reviewWord = document.getElementById('review-word');
const reviewMeaning = document.getElementById('review-meaning');
const reviewDetails = document.getElementById('review-details');
const flipBtn = document.getElementById('flip-btn');
const reviewActions = document.getElementById('review-actions');
const ratingActions = document.getElementById('rating-actions');
const completionText = document.getElementById('completion-text');

function initReview() {
    reviewWords = shuffle(getTodayReviewWords());
    currentIndex = 0;
    isFlipped = false;

    if (reviewWords.length === 0) {
        reviewContainer.style.display = 'none';
        completionMessage.style.display = 'block';
        completionText.textContent = '今天没有需要复习的单词，明天再来吧。';
        return;
    }

    showCard();
}

function showCard() {
    isFlipped = false;
    const word = reviewWords[currentIndex];

    progressText.textContent = `第 ${currentIndex + 1} / ${reviewWords.length} 个`;
    reviewWord.textContent = word.word;
    reviewMeaning.textContent = word.meaning;

    reviewDetails.innerHTML = renderDetails(word);

    cardFront.style.display = 'flex';
    cardBack.style.display = 'none';
    reviewActions.style.display = 'block';
    ratingActions.style.display = 'none';
}

function renderDetails(word) {
    const parts = [];

    if (word.phrases && word.phrases.length > 0) {
        const items = word.phrases.map(p => {
            const mark = p.important ? '★ ' : '';
            const cls = p.important ? 'style="color:#ef4444;font-weight:500;"' : '';
            return `<li ${cls}>${mark}${escapeHtml(p.text)}</li>`;
        }).join('');
        parts.push(makeSection('词组 / 短语', `<ul>${items}</ul>`));
    }

    if (word.examples && word.examples.length > 0) {
        parts.push(makeSection('例句', `<ul>${word.examples.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`));
    }

    if (word.notes) {
        parts.push(makeSection('备注', `<p>${escapeHtml(word.notes)}</p>`));
    }

    if (word.relations) {
        const labels = {
            synonyms: '近义词',
            antonyms: '反义词',
            derivatives: '派生词',
            confusable: '易混词',
            roots: '典型词根 / 同源'
        };
        for (const key of Object.keys(labels)) {
            const arr = word.relations[key];
            if (Array.isArray(arr) && arr.length > 0) {
                parts.push(makeSection(labels[key], `<p>${arr.map(s => escapeHtml(s)).join('、')}</p>`));
            }
        }
    }

    return parts.join('');
}

function makeSection(title, content) {
    return `
        <div class="review-detail-section">
            <h4>${title}</h4>
            ${content}
        </div>
    `;
}

function flipCard() {
    isFlipped = true;
    cardFront.style.display = 'none';
    cardBack.style.display = 'flex';
    cardBack.style.flexDirection = 'column';
    reviewActions.style.display = 'none';
    ratingActions.style.display = 'grid';
}

function handleRating(rating) {
    const word = reviewWords[currentIndex];
    const allWords = loadWords();
    const target = allWords.find(w => w.id === word.id);

    if (target) {
        updateSRS(target, rating);
        saveWords(allWords);
    }

    currentIndex++;
    if (currentIndex >= reviewWords.length) {
        showCompletion();
    } else {
        showCard();
    }
}

function showCompletion() {
    reviewContainer.style.display = 'none';
    completionMessage.style.display = 'block';
    completionText.textContent = `已完成 ${reviewWords.length} 个单词的复习，下次复习时间已自动安排。`;
}

// 事件绑定
document.getElementById('review-card').addEventListener('click', flipCard);
flipBtn.addEventListener('click', flipCard);

document.querySelectorAll('.rate-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        handleRating(this.dataset.rating);
    });
});

// 启动
initReview();

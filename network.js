/**
 * 词汇随记 - 词汇关系网可视化
 * 使用 D3.js 绘制力导向图
 */

const STORAGE_KEY = 'vocab_words';
const RELATION_LABELS = {
    synonyms: '近义',
    antonyms: '反义',
    derivatives: '派生',
    confusable: '易混',
    roots: '同根'
};
const RELATION_COLORS = {
    synonyms: '#059669',    // 更深、更鲜明的绿色
    antonyms: '#7c3aed',    // 鲜明的紫色
    derivatives: '#4338ca', // 更深、更鲜明的靛蓝
    confusable: '#dc2626',  // 更深、更鲜明的红色
    roots: '#d97706'        // 更深、更鲜明的琥珀色
};

const NODE_COLORS = {
    important: '#fecaca', // 浅红（重点词）
    normal: '#bfdbfe',    // 浅蓝（非重点词）
    root: '#fed7aa'       // 浅橙（词根节点）
};

function loadWords() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

let allWords = [];
let simulation = null;
let svg = null;
let graphGroup = null;
let zoomBehavior = null;
let width = 0;
let height = 0;
let currentNodes = [];

function init() {
    allWords = loadWords();
    if (allWords.length === 0) {
        document.getElementById('graph').innerHTML = '<p class="empty-tip">暂无词汇，请先导入或添加单词</p>';
        return;
    }

    const container = document.getElementById('graph');
    width = container.clientWidth;
    height = container.clientHeight;

    svg = d3.select('#graph')
        .append('svg')
        .attr('viewBox', [0, 0, width, height]);

    graphGroup = svg.append('g');

    // 缩放和平移
    zoomBehavior = d3.zoom()
        .extent([[0, 0], [width, height]])
        .scaleExtent([0.5, 4])
        .on('zoom', (event) => {
            graphGroup.attr('transform', event.transform);
        });
    svg.call(zoomBehavior);

    renderGraph();
    bindControls();
    bindSearchLocate();
}

function getActiveRelations() {
    const checked = [];
    document.querySelectorAll('.relation-filter:checked').forEach(cb => checked.push(cb.value));
    return checked;
}

function getScope() {
    return document.querySelector('input[name="scope"]:checked').value;
}

function buildGraphData() {
    const activeRelations = getActiveRelations();
    const scope = getScope();

    // 筛选单词
    let words = allWords;
    if (scope === 'important') {
        words = words.filter(w => w.isImportant);
    }

    const wordIds = new Set(words.map(w => w.id));
    const nodes = words.map(w => ({
        id: w.id,
        word: w.word,
        meaning: w.meaning,
        isImportant: w.isImportant,
        data: w,
        type: 'word'
    }));
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const links = [];
    const rootNodes = new Map();

    words.forEach(w => {
        if (!w.relations) return;

        activeRelations.forEach(relType => {
            const targets = w.relations[relType];
            if (!Array.isArray(targets)) return;

            targets.forEach(target => {
                if (relType === 'roots') {
                    // 词根作为独立节点
                    const rootId = 'root:' + target;
                    if (!rootNodes.has(rootId)) {
                        const rootNode = {
                            id: rootId,
                            word: target,
                            meaning: '',
                            isImportant: false,
                            type: 'root'
                        };
                        rootNodes.set(rootId, rootNode);
                        nodes.push(rootNode);
                    }
                    links.push({
                        source: w.id,
                        target: rootId,
                        type: relType,
                        label: RELATION_LABELS[relType]
                    });
                } else {
                    // 只关联到已存在的单词
                    const targetId = target.toLowerCase().replace(/\s+/g, '-');
                    const match = findWordByString(target);
                    if (match && wordIds.has(match.id)) {
                        links.push({
                            source: w.id,
                            target: match.id,
                            type: relType,
                            label: RELATION_LABELS[relType]
                        });
                    }
                }
            });
        });
    });

    return { nodes, links };
}

function findWordByString(str) {
    const lower = str.toLowerCase();
    // 优先完全匹配
    let match = allWords.find(w => w.word.toLowerCase() === lower);
    if (match) return match;
    // 其次包含匹配
    match = allWords.find(w => lower.includes(w.word.toLowerCase()) || w.word.toLowerCase().includes(lower));
    return match || null;
}

function renderGraph() {
    if (!svg) return;

    graphGroup.selectAll('*').remove();

    const { nodes, links } = buildGraphData();
    currentNodes = nodes;

    if (nodes.length === 0) {
        graphGroup.append('text')
            .attr('x', width / 2)
            .attr('y', height / 2)
            .attr('text-anchor', 'middle')
            .attr('fill', '#9ca3af')
            .text('没有符合条件的词汇关系');
        return;
    }

    // 识别同一对节点之间的多条连线，以便错开弧线，避免标签重叠
    const linkGroups = new Map();
    links.forEach((l, i) => {
        l.id = 'link-' + i;
        const key = [l.source, l.target].sort().join('|');
        if (!linkGroups.has(key)) linkGroups.set(key, []);
        linkGroups.get(key).push(l);
    });
    linkGroups.forEach(group => {
        const count = group.length;
        group.forEach((l, i) => {
            l.linkIndex = i;
            l.linkCount = count;
        });
    });

    simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(d => d.type === 'roots' ? 90 : 110))
        .force('charge', d3.forceManyBody().strength(d => d.type === 'root' ? -100 : -250))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide().radius(d => d.type === 'root' ? 28 : 34));

    // 连线（使用 path，支持弧线）
    const linkGroup = graphGroup.append('g').attr('class', 'links');
    const link = linkGroup.selectAll('path')
        .data(links)
        .join('path')
        .attr('class', 'link')
        .attr('id', d => d.id)
        .attr('stroke', d => RELATION_COLORS[d.type])
        .attr('stroke-width', 2)
        .attr('fill', 'none');

    // 连线标签（沿弧线分布，避免同一对节点间多条标签重叠）
    const linkLabel = linkGroup.selectAll('text')
        .data(links)
        .join('text')
        .attr('class', 'link-label')
        .attr('dy', -4);

    linkLabel.append('textPath')
        .attr('href', d => '#' + d.id)
        .attr('startOffset', '50%')
        .attr('text-anchor', 'middle')
        .text(d => d.label);

    // 节点
    const node = graphGroup.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(nodes)
        .join('g')
        .attr('class', 'node')
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    node.append('circle')
        .attr('r', d => d.type === 'root' ? 20 : 24)
        .attr('fill', d => {
            if (d.type === 'root') return NODE_COLORS.root;
            return d.isImportant ? NODE_COLORS.important : NODE_COLORS.normal;
        });

    node.append('text')
        .attr('dy', d => d.type === 'root' ? 3 : 4)
        .text(d => d.type === 'root' ? '根' : truncate(d.word, 8));

    node.on('click', (event, d) => showDetails(d));

    simulation.on('tick', () => {
        link.attr('d', d => {
            const dx = d.target.x - d.source.x;
            const dy = d.target.y - d.source.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) return `M${d.source.x},${d.source.y}`;

            // 多条连线时向垂直方向错开，形成不同弯曲度
            const step = 28;
            const offset = (d.linkIndex - (d.linkCount - 1) / 2) * step;
            const nx = -dy / dist * offset;
            const ny = dx / dist * offset;
            const cx = (d.source.x + d.target.x) / 2 + nx;
            const cy = (d.source.y + d.target.y) / 2 + ny;
            return `M${d.source.x},${d.source.y} Q${cx},${cy} ${d.target.x},${d.target.y}`;
        });

        node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
}

function truncate(text, maxLen) {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen - 1) + '…';
}

function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

function showDetails(d) {
    const panel = document.getElementById('node-details');

    if (d.type === 'root') {
        panel.innerHTML = `
            <h3>${escapeHtml(d.word)}</h3>
            <p class="meaning">词根 / 同源节点</p>
            <p>点击该节点可查看共享此词根的单词。</p>
        `;
        return;
    }

    const w = d.data;
    let html = `
        <h3>${escapeHtml(w.word)} ${w.isImportant ? '<span class="badge badge-important">重点</span>' : '<span class="badge badge-normal">了解</span>'}</h3>
        <p class="meaning">${escapeHtml(w.meaning)}</p>
    `;

    if (w.phrases && w.phrases.length > 0) {
        const items = w.phrases.map(p => {
            const mark = p.important ? '★ ' : '';
            return `<li>${mark}${escapeHtml(p.text)}</li>`;
        }).join('');
        html += `<div class="detail-block"><h4>词组 / 短语</h4><ul>${items}</ul></div>`;
    }

    if (w.examples && w.examples.length > 0) {
        html += `<div class="detail-block"><h4>例句</h4><p>${escapeHtml(w.examples[0])}</p></div>`;
    }

    if (w.notes) {
        html += `<div class="detail-block"><h4>备注</h4><p>${escapeHtml(w.notes)}</p></div>`;
    }

    if (w.relations) {
        const labels = {
            synonyms: '近义词',
            antonyms: '反义词',
            derivatives: '派生词',
            confusable: '易混词',
            roots: '典型词根 / 同源'
        };
        for (const key of Object.keys(labels)) {
            const arr = w.relations[key];
            if (Array.isArray(arr) && arr.length > 0) {
                html += `<div class="detail-block"><h4>${labels[key]}</h4><p>${arr.map(s => escapeHtml(s)).join('、')}</p></div>`;
            }
        }
    }

    panel.innerHTML = html;
}

function bindControls() {
    document.querySelectorAll('.relation-filter, input[name="scope"]').forEach(el => {
        el.addEventListener('change', () => {
            renderGraph();
        });
    });

    window.addEventListener('resize', () => {
        const container = document.getElementById('graph');
        width = container.clientWidth;
        height = container.clientHeight;
        svg.attr('viewBox', [0, 0, width, height]);
        if (simulation) {
            simulation.force('center', d3.forceCenter(width / 2, height / 2));
            simulation.alpha(0.3).restart();
        }
    });
}

// ---------- 星图检索定位 ----------

function bindSearchLocate() {
    const input = document.getElementById('node-search');
    const btn = document.getElementById('locate-btn');
    const suggestions = document.getElementById('search-suggestions');
    if (!input || !btn || !suggestions) return;

    let focusedIndex = -1;

    input.addEventListener('input', function () {
        const query = this.value.trim().toLowerCase();
        focusedIndex = -1;
        if (!query) {
            suggestions.innerHTML = '';
            suggestions.classList.remove('active');
            return;
        }

        const matches = currentNodes
            .filter(n => n.word.toLowerCase().includes(query))
            .slice(0, 10);

        if (matches.length === 0) {
            suggestions.innerHTML = '<li>无匹配单词</li>';
        } else {
            suggestions.innerHTML = matches.map(n =>
                `<li data-id="${n.id}">${escapeHtml(n.word)} <span class="suggestion-meaning">${escapeHtml(n.meaning.slice(0, 20))}</span></li>`
            ).join('');
        }
        suggestions.classList.add('active');
    });

    input.addEventListener('keydown', function (event) {
        const items = suggestions.querySelectorAll('li[data-id]');
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            focusedIndex = Math.min(focusedIndex + 1, items.length - 1);
            updateFocused(items);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            focusedIndex = Math.max(focusedIndex - 1, 0);
            updateFocused(items);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (focusedIndex >= 0 && items[focusedIndex]) {
                locateNodeById(items[focusedIndex].dataset.id);
            } else {
                locateFirstMatch(input.value.trim());
            }
            suggestions.classList.remove('active');
        } else if (event.key === 'Escape') {
            suggestions.classList.remove('active');
            focusedIndex = -1;
        }
    });

    suggestions.addEventListener('click', function (event) {
        const item = event.target.closest('li[data-id]');
        if (!item) return;
        locateNodeById(item.dataset.id);
        suggestions.classList.remove('active');
        input.value = '';
    });

    btn.addEventListener('click', function () {
        locateFirstMatch(input.value.trim());
        suggestions.classList.remove('active');
    });

    // 点击外部关闭建议列表
    document.addEventListener('click', function (event) {
        if (!event.target.closest('.search-locate')) {
            suggestions.classList.remove('active');
            focusedIndex = -1;
        }
    });
}

function updateFocused(items) {
    items.forEach((item, i) => {
        item.classList.toggle('focused', i === focusedIndex);
    });
}

function locateFirstMatch(query) {
    if (!query) return;
    const lower = query.toLowerCase();
    const match = currentNodes.find(n => n.word.toLowerCase().includes(lower));
    if (match) {
        locateNode(match);
    } else {
        alert('未找到匹配的单词');
    }
}

function locateNodeById(id) {
    const node = currentNodes.find(n => n.id === id);
    if (node) locateNode(node);
}

function locateNode(node) {
    if (!node || typeof node.x !== 'number' || typeof node.y !== 'number') return;

    // 取消之前的高亮
    d3.selectAll('.node.located').classed('located', false);
    d3.selectAll('.highlight-ring').remove();

    // 高亮当前节点
    const nodeSelection = d3.selectAll('.node').filter(d => d.id === node.id);
    nodeSelection.classed('located', true);

    // 添加脉冲高亮环
    const ring = graphGroup.append('circle')
        .attr('class', 'highlight-ring')
        .attr('cx', node.x)
        .attr('cy', node.y)
        .attr('r', 28)
        .attr('fill', 'none');

    ring.transition()
        .duration(1000)
        .attr('r', 40)
        .style('opacity', 0)
        .remove();

    // 计算居中变换
    const scale = 1.8;
    const tx = width / 2 - scale * node.x;
    const ty = height / 2 - scale * node.y;

    svg.transition()
        .duration(750)
        .call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));

    // 显示详情
    showDetails(node);
}

init();

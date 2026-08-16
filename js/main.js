/* =====================================================================
   TOMCAT — main.js
   Component loader  ·  sci-fi counters  ·  scroll reveal  ·  particles

   All interactive behaviour is initialised AFTER every component has
   been fetched and injected into the DOM.
   ===================================================================== */

// ─── COMPONENT LOADER ────────────────────────────────────────────────────────
async function loadComponents() {
    const slots = document.querySelectorAll('[data-component]');
    await Promise.all([...slots].map(async slot => {
        const src = slot.dataset.component;
        try {
            const html = await (await fetch(src)).text();
            const tmp  = document.createElement('div');
            tmp.innerHTML = html;
            // Convert to Array first — NodeList is live and shifts as nodes move
            slot.replaceWith(...Array.from(tmp.childNodes));
        } catch (err) {
            console.error('TOMCAT: failed to load component:', src, err);
        }
    }));
}

// ─── SCI-FI DIGIT-SCRAMBLE COUNTERS ──────────────────────────────────────────
function scifiCounter(el, target, duration) {
    const digits     = '0123456789';
    // data-display wins when present. The inherited rule rounds anything over
    // 1000 to "2k", which would collapse 1,920 and 1,800 to the same string --
    // and those two numbers are the whole point of the hero.
    const displayStr = el.dataset.display
        ? el.dataset.display
        : (target >= 1000 ? Math.round(target / 1000) + 'k' : String(target));
    const len        = displayStr.length;
    const startTime  = performance.now();
    let locked       = new Array(len).fill(false);

    function frame(now) {
        const elapsed     = now - startTime;
        const progress    = Math.min(elapsed / duration, 1);
        const revealCount = Math.floor(progress * (len + 1));
        for (let i = 0; i < revealCount && i < len; i++) locked[i] = true;

        let result = '';
        for (let i = 0; i < len; i++) {
            if (locked[i]) {
                result += displayStr[i];
            } else {
                const c = displayStr[i];
                result += isNaN(c) ? c : digits[Math.floor(Math.random() * 10)];
            }
        }
        el.textContent = result;

        if (progress < 1 || locked.some(v => !v)) {
            requestAnimationFrame(frame);
        } else {
            el.textContent = displayStr;
        }
    }
    requestAnimationFrame(frame);
}

function initCounters() {
    const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                const el = e.target;
                scifiCounter(el, parseInt(el.dataset.target), 1600);
                io.unobserve(el);
            }
        });
    }, { threshold: 0.4 });
    document.querySelectorAll('[data-target]').forEach(el => io.observe(el));

    // Hero stat auto-cycle every 10 s
    const heroStatEls = document.querySelectorAll('.hero .stat-n[data-target]');
    if (heroStatEls.length) {
        setInterval(() => {
            heroStatEls.forEach((el, i) => {
                setTimeout(() => scifiCounter(el, parseInt(el.dataset.target), 1400), i * 120);
            });
        }, 10000);
    }
}

// ─── SCROLL REVEAL ───────────────────────────────────────────────────────────
function initScrollReveal() {
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('in-view');
                revealObserver.unobserve(e.target);
            }
        });
    }, { threshold: 0.08 });

    document.querySelectorAll(
        '.sh, .stage, .gf-node, .dec-card, .scale-card, .gl-phase, .col-item, ' +
        '.stim, .cond, .met, .dom, .pr-card')
        .forEach(el => {
            el.classList.add('reveal');
            revealObserver.observe(el);
        });
}

// ─── FLOWING CONNECTOR PARTICLES ─────────────────────────────────────────────
function addParticles() {
    document.querySelectorAll('.conn').forEach(conn => {
        const line = conn.querySelector('.conn-line');
        if (!line) return;
        const isActive   = line.classList.contains('cl-active');
        const isComplete = line.classList.contains('cl-complete');
        if (!isActive && !isComplete) return;

        const color = isActive ? 'rgba(245,158,11,0.95)' : 'rgba(34,197,94,0.85)';
        const glow  = isActive ? '0 0 6px rgba(245,158,11,0.85)' : '0 0 6px rgba(34,197,94,0.75)';
        const speed = isActive ? 1.2 : 2.4;

        for (let i = 0; i < 2; i++) {
            const dot = document.createElement('div');
            dot.style.cssText = [
                'position:absolute',
                'top:50%',
                'transform:translateY(-50%)',
                'width:5px',
                'height:5px',
                'border-radius:50%',
                'pointer-events:none',
                'z-index:5',
                `background:${color}`,
                `box-shadow:${glow}`,
                `animation:moveDot ${speed + i * 0.6}s linear infinite`,
                `animation-delay:${i * (speed / 2)}s`,
            ].join(';');
            conn.appendChild(dot);
        }
    });
}

function initParticles() {
    // Inject the moveDot keyframe into <head> at runtime
    const s = document.createElement('style');
    s.textContent = '@keyframes moveDot{0%{left:-5px;opacity:0}8%{opacity:1}90%{opacity:1}100%{left:calc(100% + 5px);opacity:0}}';
    document.head.appendChild(s);
    addParticles();
}

// ─── SMOOTH NAV HIGHLIGHT ─────────────────────────────────────────────────────
function initNavHighlight() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks  = document.querySelectorAll('.nav-links a');
    const sio = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                navLinks.forEach(a => {
                    a.style.color = a.getAttribute('href') === '#' + e.target.id
                        ? 'var(--text)'
                        : '';
                });
            }
        });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(s => sio.observe(s));
}



// ─── STIMULI TABS (component 04) ─────────────────────────────────────────────
// Each .stim card holds three <img> frames (init / observed / completed) and a
// caption per frame. Tabs swap which frame is visible. The GIFs are restarted
// on every switch by re-assigning src, so the animation always plays from the
// first frame rather than resuming mid-loop.
function initStimTabs() {
    document.querySelectorAll('.stim').forEach(card => {
        const tabs  = card.querySelectorAll('.stim-tab');
        const imgs  = card.querySelectorAll('.stim-stage img');
        const cap   = card.querySelector('.stim-cap');
        const texts = JSON.parse(card.dataset.caps || '[]');

        tabs.forEach((tab, i) => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('on'));
                tab.classList.add('on');
                imgs.forEach((im, j) => {
                    im.hidden = j !== i;
                    if (j === i) { const src = im.src; im.src = ''; im.src = src; }
                });
                if (cap && texts[i]) cap.innerHTML = texts[i];
            });
        });
    });
}

// ─── PROMPT VARIANT SWITCH (component 05) ────────────────────────────────────
function initPromptSwitch() {
    document.querySelectorAll('.pr-switch').forEach(sw => {
        const btns  = sw.querySelectorAll('.pr-btn');
        const panes = document.querySelectorAll('.pr-pane');
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                btns.forEach(b => b.classList.remove('on'));
                btn.classList.add('on');
                panes.forEach(p => { p.hidden = p.dataset.pane !== btn.dataset.pane; });
            });
        });
    });
}

// ─── MATRIX PROGRESS RAIL (component 03) ─────────────────────────────────────
// Counts the cells actually present in the DOM rather than hard-coding a
// figure, so the rail stays correct when a cell's status is edited by hand.
function initMatrixRail() {
    const cells = document.querySelectorAll('.mx-cell');
    if (!cells.length) return;
    const per   = 20;
    const total = cells.length * per;
    const done  = document.querySelectorAll('.mx-cell.c-done, .mx-cell.c-pub').length * per;
    const pct   = Math.round((done / total) * 100);

    document.querySelectorAll('.mx-bar span').forEach(b => { b.style.width = pct + '%'; });
    const txt = document.querySelector('.mx-rail-txt');
    if (txt) txt.textContent = done + ' / ' + total + ' samples annotated  ·  ' + pct + '%';
}

// ─── THEME SWITCHER ──────────────────────────────────────────────────────────
// Swaps only the canvas variables (--bg, --nav-bg, --stage-bg, --glow-*).
// Component accents are untouched, so every card looks the same in all themes.
// The choice is applied by an inline script in <head> before first paint to
// avoid a flash of the default theme; this function only wires the buttons.
const THEMES = ['midnight', 'obsidian', 'abyss', 'plum'];

function applyTheme(name) {
    if (!THEMES.includes(name)) name = 'midnight';
    document.documentElement.dataset.theme = name;
    document.querySelectorAll('.tsw').forEach(b => {
        b.setAttribute('aria-pressed', String(b.dataset.theme === name));
    });
    try { localStorage.setItem('tomcat-theme', name); } catch (e) { /* private mode */ }
}

function initThemes() {
    let saved = 'midnight';
    try { saved = localStorage.getItem('tomcat-theme') || 'midnight'; } catch (e) { }
    applyTheme(saved);
    document.querySelectorAll('.tsw').forEach(btn => {
        btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
    });
}

// ─── MATRIX MARGINS (component 03) ───────────────────────────────────────────
// Row totals, column totals, and the grand total in the corner — all derived
// from the cells actually in the DOM. Edit a cell's status class and every
// margin follows; nothing here is hard-coded.
function initMatrixTotals() {
    const table = document.querySelector('.mx-table');
    if (!table) return;
    const PER  = 20;
    const rows = [...table.querySelectorAll('tbody tr')];
    const DONE = '.c-done, .c-pub';        // counted as annotated

    const fill = (td, total, done) => {
        if (!td) return;
        td.querySelector('.mx-tn').textContent  = total.toLocaleString();
        const sub = td.querySelector('.mx-tsub');
        sub.textContent = done.toLocaleString() + ' done';
        sub.classList.toggle('has-some', done > 0 && done < total);
        sub.classList.toggle('all-done', done > 0 && done === total);
    };

    // ---- row margins ----
    let grandTotal = 0, grandDone = 0;
    rows.forEach(tr => {
        const cells = [...tr.querySelectorAll('.mx-cell')];
        const total = cells.length * PER;
        const done  = cells.filter(c => c.matches(DONE)).length * PER;
        grandTotal += total; grandDone += done;
        fill(tr.querySelector('.mx-tot-row'), total, done);
    });

    // ---- column margins ----
    const footCells = table.querySelectorAll('tfoot .mx-tot-col');
    footCells.forEach((td, i) => {
        let total = 0, done = 0;
        rows.forEach(tr => {
            const cell = tr.querySelectorAll('.mx-cell')[i];
            if (!cell) return;
            total += PER;
            if (cell.matches(DONE)) done += PER;
        });
        fill(td, total, done);
    });

    // ---- grand total (corner) ----
    const corner = table.querySelector('.mx-tot-corner');
    if (corner) {
        corner.querySelector('.mx-tn').textContent = grandTotal.toLocaleString();
        corner.querySelector('.mx-tsub').textContent =
            grandDone.toLocaleString() + ' / ' + grandTotal.toLocaleString() +
            '  ·  ' + Math.round((grandDone / grandTotal) * 100) + '%';
    }
}

// ─── BOOT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    initThemes();
    await loadComponents();
    initCounters();
    initScrollReveal();
    initParticles();
    initNavHighlight();
    initStimTabs();
    initPromptSwitch();
    initMatrixRail();
    initMatrixTotals();
});

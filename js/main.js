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
            // Cache-bust and bypass the HTTP cache. A dev server that serves a
            // component while it is still being written, or revalidates to a
            // stale copy, yields HTML that is cut off partway through: the tail
            // of the section simply never renders and nothing reports an error.
            const res = await fetch(src + '?v=' + Date.now(), { cache: 'no-store' });
            if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
            const html = await res.text();

            // A component must end with its closing tag. If it does not, we were
            // handed a truncated file -- say so loudly instead of rendering half
            // a section and leaving the reader to guess.
            if (!/<\/(section|div|footer)>\s*$/.test(html.trim())) {
                console.error('TOMCAT: component looks truncated:', src,
                              '(' + html.length + ' chars, ends with',
                              JSON.stringify(html.trim().slice(-40)) + ')');
            }

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
        // Component 11 is deliberately NOT in this list. .reveal sets opacity:0
        // and relies on the observer to undo it; when that failed the whole
        // Overcooked section disappeared. It is now plain visible, and keeps
        // only the animations that cannot hide anything: the slider, the hover
        // lifts, the bar fills and the family connectors.
        '.stim, .cond, .met, .dom, .pr-card, .cb, .mu-row, .grc, .stage')
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
        // Scope to the panes that belong to THIS switch. Querying the whole
        // document worked while there was one switch; with the Overcooked
        // section there are two, and the second would hide the first's panes.
        const scope = sw.parentElement.querySelector('.pr-panes') || document;
        const panes = scope.querySelectorAll('.pr-pane');
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


// ─── SEQUENCED REVEALS ───────────────────────────────────────────────────────
// Rows and bars that should arrive in order rather than all at once. Each
// element carries its own --d delay, so the observer only has to flip a class.
function initSequenced() {
    const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            e.target.classList.add('seq-in');
            io.unobserve(e.target);
        });
    }, { threshold: 0.15 });

    document.querySelectorAll(
        '.tt-table tbody tr, .cb-split .cb-seg, .cbt-seg'
    ).forEach(el => { el.classList.add('seq'); io.observe(el); });
}

// ─── MOTIVATION MARK SEQUENCE (component 02) ─────────────────────────────────
// The six marks are one sequence spanning both rows, so both rows must start
// on the same clock. The generic reveal observer flips .in-view per row, and
// the two rows can cross the threshold a beat apart — enough to make the
// crosses and the ticks overlap. This starts the whole diagram once instead.
function initMotivationSequence() {
    const mu = document.getElementById('muDiagram');
    if (!mu) return;
    const io = new IntersectionObserver((entries, obs) => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            e.target.classList.add('mu-go');
            obs.unobserve(e.target);
        });
    }, { threshold: 0.25 });
    io.observe(mu);
}

// ─── EVIDENCE BASE REPLAY (component 03) ─────────────────────────────────────
// The section's entrance animation is its best feature, and a reader who
// scrolls to it slowly misses the whole thing. Every 10 seconds, and only
// while the section is actually on screen, the bars re-fill, the counters
// re-scramble, and a highlight sweeps across the coverage grid.
function initCorpusReplay() {
    const section = document.getElementById('corpus');
    if (!section) return;

    const bars     = section.querySelectorAll('.cb-seg, .cbt-seg');
    const counters = section.querySelectorAll('[data-target]');
    const wrap     = section.querySelector('.cv-wrap');

    // Stagger the grid sweep left to right, row by row.
    section.querySelectorAll('.cv-table tbody tr').forEach((tr, r) => {
        tr.querySelectorAll('.cv').forEach((td, c) => {
            td.style.setProperty('--cvd', r + c);
        });
    });

    let onScreen = false;
    new IntersectionObserver(entries => {
        entries.forEach(e => { onScreen = e.isIntersecting; });
    }, { threshold: 0.12 }).observe(section);

    setInterval(() => {
        if (!onScreen || document.hidden) return;

        // Bars: drop the width, force a reflow so the transition restarts from
        // zero, then put it back. Without the reflow the browser coalesces both
        // writes and nothing moves.
        bars.forEach(b => b.classList.remove('seq-in'));
        void section.offsetWidth;
        bars.forEach(b => b.classList.add('seq-in'));

        counters.forEach((el, i) => {
            setTimeout(() => scifiCounter(el, parseInt(el.dataset.target), 1400), i * 110);
        });

        if (wrap) {
            wrap.classList.remove('cv-pulse');
            void wrap.offsetWidth;
            wrap.classList.add('cv-pulse');
        }
    }, 10000);
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

// ─── MODEL x VARIANT PICKER (component 07) ───────────────────────────────────
// Each model-variant pair is a separate <tbody>; the select toggles which one
// is visible. Rendering all six and hiding five keeps the markup static, so
// there is no re-render cost and the table never reflows on switch.
function initResultPicker() {
    const sel = document.getElementById('mvsel');
    if (!sel) return;
    const bodies = document.querySelectorAll('.res-body');
    const show = key => bodies.forEach(b => { b.hidden = b.dataset.mv !== key; });
    show(sel.value);
    sel.addEventListener('change', () => show(sel.value));
}

// ─── OVERCOOKED PODIUM (component 11) ────────────────────────────────────────
// Staggered reveal on first scroll into view. The bar widths animate from the
// --w set inline, so a card that never scrolls into view never animates and
// never sits half-drawn.
function initOcRoster() {
    const cards = document.querySelectorAll('.oc-model');
    if (!cards.length) return;
    // The cards are visible from the start. This only staggers a small lift as
    // they scroll in, so nothing here can leave a card hidden.
    const io = new IntersectionObserver((entries, obs) => {
        entries.forEach((e, i) => {
            if (!e.isIntersecting) return;
            e.target.style.setProperty('--d', (i * 70) + 'ms');
            e.target.classList.add('oc-in');
            obs.unobserve(e.target);
        });
    }, { threshold: 0.15 });
    cards.forEach(c => io.observe(c));
}

// ─── OVERCOOKED LAYOUT SLIDER (component 11) ─────────────────────────────────
// Scroll-snap does the movement; this only wires the arrows and the dots and
// keeps them in step with a scroll the user drives themselves.
function initOcMaps() {
    const rail = document.querySelector('.oc-rail');
    const dots = document.querySelector('.oc-dots');
    if (!rail || !dots) return;

    const slides = [...rail.querySelectorAll('.oc-map')];
    const step = () => slides.length > 1
        ? slides[1].offsetLeft - slides[0].offsetLeft
        : rail.clientWidth;

    slides.forEach((s, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-label', 'Layout ' + (i + 1));
        b.addEventListener('click', () => rail.scrollTo({ left: i * step() }));
        dots.appendChild(b);
    });

    const arrows = document.querySelectorAll('.oc-arrow');
    arrows.forEach(a => a.addEventListener('click', () => {
        rail.scrollBy({ left: Number(a.dataset.dir) * step() });
    }));

    const sync = () => {
        const i = Math.round(rail.scrollLeft / step());
        [...dots.children].forEach((d, j) => d.classList.toggle('on', j === i));
        arrows.forEach(a => {
            const fwd = Number(a.dataset.dir) > 0;
            a.disabled = fwd
                ? rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2
                : rail.scrollLeft <= 2;
        });
    };
    rail.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
}

// ─── OVERCOOKED RESULT PICKER (component 11) ─────────────────────────────────
function initOcResults() {
    const sel = document.getElementById('ocsel');
    if (!sel) return;
    const bodies = document.querySelectorAll('.oc-body');
    const show = key => bodies.forEach(b => { b.hidden = b.dataset.oc !== key; });
    show(sel.value);
    sel.addEventListener('change', () => show(sel.value));
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
    initResultPicker();
    initOcRoster();
    initOcMaps();
    initOcResults();
    initSequenced();
    initCorpusReplay();
    initMotivationSequence();
});

(function() {
    const existing = document.getElementById('bkmk-tools-host');
    if (existing) { existing.remove(); return; }

    const host = document.createElement('div');
    host.id = 'bkmk-tools-host';
    host.style.all = 'initial';
    host.style.position = 'fixed';
    host.style.zIndex = '2147483647';
    document.documentElement.appendChild(host); 

    const shadow = host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
        .wrap {
            background: #1e1e1e;
            padding: 8px;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            display: flex;
            gap: 8px;
            cursor: grab;
            touch-action: none;
        }
        button {
            background: #3a3a3a;
            color: #fff;
            border: 1px solid #555;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            line-height: 1;
            transition: background 0.2s;
        }
        button:hover { background: #505050; }
        #btn-close { color: #ff6b6b; }
        #btn-close:hover { background: #5a2a2a; color: #fff; border-color: #ff6b6b; }
    `;

    const ui = document.createElement('div');
    ui.className = 'wrap';
    ui.innerHTML = `
        <button id="btn-fs" title="Toggle Fullscreen">⛶</button>
        <button id="btn-zm-out" title="Zoom Out">−</button>
        <button id="btn-zm-reset" title="Reset Zoom">↺</button>
        <button id="btn-zm-in" title="Zoom In">+</button>
        <button id="btn-kill" title="Kill Sticky, Overlays & Ads">🧹</button>
        <button id="btn-close" title="Close">✖</button>
    `;

    shadow.appendChild(ui);
    shadow.appendChild(style);

    const rect = host.getBoundingClientRect();
    host.style.left = (window.innerWidth - rect.width) / 2 + 'px';
    host.style.top = (window.innerHeight - rect.height) / 2 + 'px';

    let isDown = false, isMoving = false, startX = 0, startY = 0, initialLeft = 0, initialTop = 0;
    const wrap = shadow.querySelector('.wrap');

    const dragStart = (clientX, clientY) => {
        isDown = true;
        isMoving = false;
        startX = clientX;
        startY = clientY;
        initialLeft = host.offsetLeft;
        initialTop = host.offsetTop;
    };

    const dragMove = (clientX, clientY) => {
        if (!isDown) return;
        const dx = clientX - startX;
        const dy = clientY - startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            isMoving = true;
            wrap.style.cursor = 'grabbing';
        }
        if (isMoving) {
            host.style.left = (initialLeft + dx) + 'px';
            host.style.top = (initialTop + dy) + 'px';
        }
    };

    wrap.onmousedown = (e) => dragStart(e.clientX, e.clientY);
    wrap.ontouchstart = (e) => dragStart(e.touches[0].clientX, e.touches[0].clientY);

    window.addEventListener('mousemove', (e) => dragMove(e.clientX, e.clientY));
    window.addEventListener('touchmove', (e) => dragMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true });

    const dragEnd = () => {
        if (isDown) {
            isDown = false;
            wrap.style.cursor = 'grab';
        }
    };
    window.addEventListener('mouseup', dragEnd);
    window.addEventListener('touchend', dragEnd);

    wrap.onclick = (e) => {
        if (isMoving) {
            e.stopPropagation();
            e.preventDefault();
            isMoving = false;
        }
    };

    const closeMenu = () => host.remove();
    const action = (fn) => () => { fn(); closeMenu(); }; 

    shadow.querySelector('#btn-close').onclick = closeMenu;

    shadow.querySelector('#btn-fs').onclick = action(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(e => console.error(e));
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    });

    // Combined Unified Cleaner (Sticky + Overlays + Ads + Scroll Unlock)
    shadow.querySelector('#btn-kill').onclick = action(() => {
        // 1. Remove fixed/sticky banners and layout blockers
        document.querySelectorAll('body *').forEach(node => {
            const pos = window.getComputedStyle(node).position;
            if (pos === 'fixed' || pos === 'sticky') {
                if (!node.id || !node.id.includes('bkmk-tools')) {
                    node.remove();
                }
            }
        });

        // 2. Remove cosmetic ad elements and widgets
        const adSelectors = [
            '.ad', '.advertisement', '.ad-banner', '.ad-slot', '.adsbygoogle',
            '[id*="ad-"]', '[class*="ad-"]', '[id*="google_ads"]',
            'iframe[src*="doubleclick"]', 'iframe[src*="googlesyndication"]',
            '.OUTBRAIN', '.trc_rbox_outer', '#taboola-content'
        ];
        document.querySelectorAll(adSelectors.join(',')).forEach(el => {
            if (!el.id || !el.id.includes('bkmk-tools')) {
                el.remove();
            }
        });

        // 3. Force unlock page scrolling
        ['html', 'body'].forEach(selector => {
            const el = document.querySelector(selector);
            if (el) {
                el.style.setProperty('overflow', 'auto', 'important');
                el.style.setProperty('position', 'static', 'important');
            }
        });
    });

    const getZoom = () => parseFloat(document.body.style.zoom) || 1;
    const setZoom = (z) => { document.body.style.zoom = z; };

    shadow.querySelector('#btn-zm-in').onclick = () => setZoom(getZoom() + 0.25);
    shadow.querySelector('#btn-zm-out').onclick = () => setZoom(Math.max(0.25, getZoom() - 0.25));
    shadow.querySelector('#btn-zm-reset').onclick = () => setZoom(1);
})();
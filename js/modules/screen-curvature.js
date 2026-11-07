const TILE_HEIGHT = 512;
const MAX_TILES = 24;
const MAX_CACHE_PIXELS = 16 * 1024 * 1024;

// Shared inverse barrel transform for pixels and pointer coordinates.
export function screenToSource(x, y, width, height, strength) {
    const nx = (x / width) * 2 - 1,
        ny = (y / height) * 2 - 1;
    return [
        ((nx * (1 + strength * ny * ny) + 1) * width) / 2,
        ((ny * (1 + strength * nx * nx) + 1) * height) / 2
    ];
}
export function sourceToScreen(x, y, width, height, strength) {
    let px = x,
        py = y;
    for (let i = 0; i < 8; i++) {
        const p = screenToSource(px, py, width, height, strength);
        px += x - p[0];
        py += y - p[1];
    }
    return [px, py];
}

export function createCurvature(viewport, onFailure) {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('content', 'drawable');
    if (canvas.content !== 'drawable' || !canvas.requestPaint || !canvas.updateElementGeometry) return null;
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false });
    if (!gl || !gl.texElementSubImage2D) {
        gl?.getExtension('WEBGL_lose_context')?.loseContext();
        return null;
    }
    const glass = viewport.parentElement;
    const main = document.getElementById('terminal-content');
    const elements = [
        viewport,
        document.getElementById('starfield'),
        document.getElementById('terminal-header'),
        main.firstElementChild,
        document.getElementById('terminal-footer'),
        document.getElementById('terminal-panel'),
        document.getElementById('screen-notices')
    ];
    const layers = elements.map((element) => ({
        element,
        bitmap: element.id === 'starfield',
        tiles: new Map(),
        dirty: true
    }));
    const listeners = new AbortController();
    const stats = { uploads: 0, uploadedPixels: 0, contentUploads: 0, frames: 0, tiles: 0, resolution: 1 };
    let disposed = false,
        ready = false,
        pending = false;
    let width = 0,
        height = 0,
        resolution = 1,
        strength = 0.055,
        stamp = 0;
    let program, buffer, observer, mutationObserver, watchdog;
    function listen(target, type, handler, options = {}) {
        target.addEventListener(type, handler, { ...options, signal: listeners.signal });
    }
    function preserveDOM(move) {
        const focus = document.activeElement;
        const scroll = [...viewport.querySelectorAll('*')]
            .filter((e) => e.scrollTop || e.scrollLeft)
            .map((e) => [e, e.scrollTop, e.scrollLeft]);
        const selection = window.getSelection();
        const range = selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
        move();
        if (viewport.contains(focus)) focus.focus({ preventScroll: true });
        for (const [e, top, left] of scroll) {
            e.scrollTop = top;
            e.scrollLeft = left;
        }
        if (range) {
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
    function fail(reason) {
        if (!disposed) {
            destroy();
            onFailure(reason);
        }
    }
    function request() {
        if (disposed || pending || document.hidden) return;
        pending = true;
        canvas.requestPaint();
    }
    function clearTiles(layer) {
        for (const tile of layer.tiles.values()) gl.deleteTexture(tile.texture);
        layer.tiles.clear();
        layer.dirty = true;
    }
    function resize() {
        if (disposed) return;
        width = glass.clientWidth;
        height = glass.clientHeight;
        strength = width <= 768 ? 0.025 : 0.055;
        glass.style.setProperty('--screen-width', `${width}px`);
        glass.style.setProperty('--screen-height', `${height}px`);
        const ratio = Math.min(devicePixelRatio, 2) * resolution;
        canvas.width = Math.max(1, Math.round(width * ratio));
        canvas.height = Math.max(1, Math.round(height * ratio));
        layers.forEach(clearTiles);
        request();
    }
    function box(element) {
        let x = 0,
            y = 0;
        for (let node = element; node && node !== viewport && node !== canvas; node = node.offsetParent) {
            x += node.offsetLeft;
            y += node.offsetTop;
        }
        for (let node = element.parentElement; node && node !== viewport; node = node.parentElement) {
            x -= node.scrollLeft;
            y -= node.scrollTop;
        }
        return { x, y, w: element.offsetWidth, h: element.offsetHeight };
    }
    function clipFor(layer, r) {
        if (layer.element === main.firstElementChild) {
            const a = box(main);
            return { x: a.x, y: a.y, w: main.clientWidth, h: main.clientHeight };
        }
        return {
            x: Math.max(0, r.x),
            y: Math.max(0, r.y),
            w: Math.min(width, r.x + r.w) - Math.max(0, r.x),
            h: Math.min(height, r.y + r.h) - Math.max(0, r.y)
        };
    }
    function syncGeometry(pointer) {
        for (const layer of layers) {
            const r = box(layer.element);
            if (!r.w || !r.h) {
                canvas.clearElementGeometry(layer.element);
                continue;
            }
            const clip = clipFor(layer, r);
            let matrix;
            if (pointer) matrix = new DOMMatrix().translate(r.x + pointer.dx, r.y + pointer.dy);
            else {
                const anchorX = r.w / 2;
                const anchorY = Math.max(0, Math.min(r.h, height / 2 - r.y));
                const [cx, cy] = sourceToScreen(r.x + anchorX, r.y + anchorY, width, height, strength);
                const [lx, ly] = sourceToScreen(r.x + anchorX + 1, r.y + anchorY, width, height, strength);
                const [tx, ty] = sourceToScreen(r.x + anchorX, r.y + anchorY + 1, width, height, strength);
                matrix = new DOMMatrix([
                    lx - cx,
                    ly - cy,
                    tx - cx,
                    ty - cy,
                    cx - (lx - cx) * anchorX - (tx - cx) * anchorY,
                    cy - (ly - cy) * anchorX - (ty - cy) * anchorY
                ]);
            }
            canvas.updateElementGeometry(layer.element, {
                canvasTransform: matrix,
                canvasClip: {
                    x: clip.x - r.x,
                    y: clip.y - r.y,
                    width: Math.max(0, clip.w),
                    height: Math.max(0, clip.h)
                }
            });
        }
    }
    function shader(type, source) {
        const result = gl.createShader(type);
        gl.shaderSource(result, source);
        gl.compileShader(result);
        if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(result);
            gl.deleteShader(result);
            throw new Error(error);
        }
        return result;
    }
    function initializeGL() {
        const vertex = shader(
            gl.VERTEX_SHADER,
            `#version 300 es
            in vec2 position; out vec2 uv;
            void main() { uv = vec2((position.x + 1.0) / 2.0, (1.0 - position.y) / 2.0); gl_Position = vec4(position, 0, 1); }`
        );
        const fragment = shader(
            gl.FRAGMENT_SHADER,
            `#version 300 es
            precision highp float;
            in vec2 uv; out vec4 color;
            uniform sampler2D image; uniform vec2 screen; uniform float bend;
            uniform vec4 tile; uniform vec4 clip;
            void main() {
                vec2 p = uv * 2.0 - 1.0;
                vec2 source = (p * (1.0 + bend * p.yx * p.yx) + 1.0) * .5 * screen;
                if (any(lessThan(source, clip.xy)) || any(greaterThanEqual(source, clip.xy + clip.zw))) discard;
                vec2 t = (source - tile.xy) / tile.zw;
                if (any(lessThan(t, vec2(0))) || any(greaterThanEqual(t, vec2(1)))) discard;
                color = texture(image, t);
            }`
        );
        program = gl.createProgram();
        gl.attachShader(program, vertex);
        gl.attachShader(program, fragment);
        gl.linkProgram(program);
        gl.deleteShader(vertex);
        gl.deleteShader(fragment);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
        gl.useProgram(program);
        buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
            gl.STATIC_DRAW
        );
        const position = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.uniform1i(gl.getUniformLocation(program, 'image'), 0);
    }
    function tileFor(layer, index, r) {
        const ratio = canvas.width / width,
            tileHeight = layer.bitmap ? r.h : TILE_HEIGHT,
            sy = index * tileHeight;
        const sh = Math.min(tileHeight, r.h - sy);
        const tw = layer.bitmap ? layer.element.width : Math.max(1, Math.ceil(r.w * ratio)),
            th = layer.bitmap ? layer.element.height : Math.max(1, Math.ceil(sh * ratio));
        let tile = layer.tiles.get(index);
        if (tile && (tile.w !== tw || tile.h !== th)) {
            gl.deleteTexture(tile.texture);
            layer.tiles.delete(index);
            tile = null;
        }
        if (!tile) {
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, tw, th, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            tile = { texture, w: tw, h: th, dirty: true };
            layer.tiles.set(index, tile);
        }
        gl.bindTexture(gl.TEXTURE_2D, tile.texture);
        if (tile.dirty || tile.strip) {
            gl.disable(gl.BLEND);
            const stripWidth = Math.min(12, r.w);
            const offset = tile.dirty ? 0 : Math.floor((r.w - stripWidth) * ratio);
            const sx = offset / ratio;
            if (layer.bitmap) {
                // Reuse the animation's existing bitmap for its texture.
                gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, layer.element);
            } else {
                gl.texElementSubImage2D(gl.TEXTURE_2D, 0, offset, 0, layer.element, {
                    sx,
                    sy,
                    swidth: r.w - sx,
                    sheight: sh,
                    width: tw - offset,
                    height: th
                });
            }
            gl.enable(gl.BLEND);
            tile.dirty = false;
            tile.strip = false;
            stats.uploads++;
            stats.uploadedPixels += (tw - offset) * th;
            if (layer.element === main.firstElementChild) stats.contentUploads++;
        }
        tile.used = ++stamp;
        return { sy, sh };
    }
    function scissor(x, y, w, h) {
        const points = [];
        for (const px of [x, x + w, Math.max(x, Math.min(x + w, width / 2))]) {
            for (const py of [y, y + h, Math.max(y, Math.min(y + h, height / 2))]) {
                points.push(sourceToScreen(px, py, width, height, strength));
            }
        }
        const ratioX = canvas.width / width,
            ratioY = canvas.height / height;
        const left = Math.max(0, Math.floor(Math.min(...points.map((p) => p[0])) * ratioX) - 1);
        const right = Math.min(canvas.width, Math.ceil(Math.max(...points.map((p) => p[0])) * ratioX) + 1);
        const top = Math.max(0, Math.floor(Math.min(...points.map((p) => p[1])) * ratioY) - 1);
        const bottom = Math.min(canvas.height, Math.ceil(Math.max(...points.map((p) => p[1])) * ratioY) + 1);
        gl.scissor(left, canvas.height - bottom, Math.max(0, right - left), Math.max(0, bottom - top));
    }
    function paint(event) {
        pending = false;
        if (disposed || document.hidden || !width || !height) return;
        try {
            for (const element of event.changedElements || []) {
                const layer = layers.find((entry) => entry.element === element);
                if (layer && element !== viewport) layer.dirty = true;
            }
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.disable(gl.SCISSOR_TEST);
            gl.clearColor(0.025, 0.03, 0.025, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform2f(gl.getUniformLocation(program, 'screen'), width, height);
            gl.uniform1f(gl.getUniformLocation(program, 'bend'), strength);
            for (const layer of layers) {
                if (layer.dirty) for (const tile of layer.tiles.values()) tile.dirty = true;
                layer.dirty = false;
                const r = box(layer.element),
                    clip = clipFor(layer, r);
                if (!r.w || !r.h || clip.h <= 0 || clip.w <= 0) continue;
                const tileHeight = layer.bitmap ? r.h : TILE_HEIGHT;
                const first = Math.max(0, Math.floor((clip.y - r.y) / tileHeight));
                const last = Math.min(
                    Math.ceil(r.h / tileHeight) - 1,
                    Math.floor((clip.y + clip.h - r.y) / tileHeight)
                );
                gl.uniform4f(gl.getUniformLocation(program, 'clip'), clip.x, clip.y, clip.w, clip.h);
                for (let i = first; i <= last; i++) {
                    const { sy, sh } = tileFor(layer, i, r);
                    gl.uniform4f(gl.getUniformLocation(program, 'tile'), r.x, r.y + sy, r.w, sh);
                    const y = Math.max(clip.y, r.y + sy);
                    scissor(clip.x, y, clip.w, Math.min(clip.y + clip.h, r.y + sy + sh) - y);
                    gl.enable(gl.SCISSOR_TEST);
                    gl.drawArrays(gl.TRIANGLES, 0, 6);
                    gl.disable(gl.SCISSOR_TEST);
                }
            }
            const cached = layers.flatMap((layer) =>
                [...layer.tiles].map(([key, tile]) => ({ layer, key, tile }))
            );
            cached.sort((a, b) => b.tile.used - a.tile.used);
            let pixels = 0;
            let retained = 0;
            for (const entry of cached) {
                const size = entry.tile.w * entry.tile.h;
                if (retained < MAX_TILES && pixels + size <= MAX_CACHE_PIXELS) {
                    retained++;
                    pixels += size;
                } else {
                    gl.deleteTexture(entry.tile.texture);
                    entry.layer.tiles.delete(entry.key);
                }
            }
            stats.tiles = retained;
            stats.frames++;
            syncGeometry();
            if (gl.getError() !== gl.NO_ERROR) throw new Error('texture-upload');
            if (!ready) {
                ready = true;
                clearTimeout(watchdog);
                document.body.dataset.displayMode = 'curved';
            }
        } catch (error) {
            fail(`render: ${error.message}`);
        }
    }
    // Native Range selection preserves browser copy/find and a single text source.
    function atPointer(event, callback) {
        const rect = canvas.getBoundingClientRect(),
            x = event.clientX - rect.left,
            y = event.clientY - rect.top;
        const [sx, sy] = screenToSource(x, y, width, height, strength);
        syncGeometry({ dx: x - sx, dy: y - sy });
        try {
            return callback(document.elementFromPoint(event.clientX, event.clientY));
        } finally {
            syncGeometry();
        }
    }
    function caret(event) {
        if (document.caretPositionFromPoint) {
            const p = document.caretPositionFromPoint(event.clientX, event.clientY);
            return p && { node: p.offsetNode, offset: p.offset };
        }
        const r = document.caretRangeFromPoint?.(event.clientX, event.clientY);
        return r && { node: r.startContainer, offset: r.startOffset };
    }
    let gesture,
        dragged = false;
    function pointerDown(event) {
        if (!event.isTrusted || event.button !== 0) return;
        try {
            atPointer(event, (target) => {
                if (!target || !viewport.contains(target)) return;
                const control = target.closest('a, button, input, textarea, select, [contenteditable]');
                if (control) control.focus({ preventScroll: true });
                else if (main.contains(target)) main.focus({ preventScroll: true });
                const point = !control && event.pointerType !== 'touch' ? caret(event) : null;
                if (point && viewport.contains(point.node))
                    window
                        .getSelection()
                        .setBaseAndExtent(point.node, point.offset, point.node, point.offset);
                gesture = {
                    x: event.clientX,
                    y: event.clientY,
                    point,
                    touch: event.pointerType === 'touch'
                };
                dragged = false;
            });
            if (event.pointerType !== 'touch') event.preventDefault();
        } catch {
            fail('pointer-down');
        }
    }
    function pointerMove(event) {
        if (!gesture || !event.isTrusted) return;
        // Keep native touch scrolling, momentum, pinch zoom, and long-press selection.
        if (gesture.touch) return;
        try {
            if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 3) dragged = true;
            if (gesture.point)
                atPointer(event, () => {
                    const end = caret(event);
                    if (end && viewport.contains(end.node))
                        window
                            .getSelection()
                            .setBaseAndExtent(gesture.point.node, gesture.point.offset, end.node, end.offset);
                });
            event.preventDefault();
            request();
        } catch {
            fail('selection');
        }
    }
    function click(event) {
        if (!event.isTrusted || event.detail === 0) return;
        try {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (dragged) {
                dragged = false;
                return;
            }
            atPointer(event, (target) => {
                if (!target || !viewport.contains(target)) return;
                target.dispatchEvent(
                    new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        ctrlKey: event.ctrlKey,
                        metaKey: event.metaKey,
                        shiftKey: event.shiftKey,
                        altKey: event.altKey,
                        button: event.button,
                        detail: event.detail,
                        clientX: event.clientX,
                        clientY: event.clientY,
                        view: window
                    })
                );
            });
        } catch {
            fail('click');
        }
    }
    function destroy() {
        if (disposed) return;
        disposed = true;
        clearTimeout(watchdog);
        listeners.abort();
        observer?.disconnect();
        mutationObserver?.disconnect();
        preserveDOM(() => {
            if (canvas.parentNode) canvas.before(viewport);
            elements.forEach((element) => element.removeAttribute('drawable'));
            canvas.remove();
        });
        layers.forEach(clearTiles);
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        canvas.width = canvas.height = 1;
        stats.tiles = 0;
    }
    try {
        initializeGL();
        canvas.id = 'crt-canvas';
        viewport.before(canvas);
        elements.forEach((element) => element.setAttribute('drawable', ''));
        preserveDOM(() => canvas.appendChild(viewport));
        listen(canvas, 'paint', paint);
        listen(canvas, 'webglcontextlost', (event) => {
            event.preventDefault();
            fail('context-lost');
        });
        listen(
            viewport,
            'scroll',
            () => {
                for (const tile of layers[0].tiles.values()) tile.strip = true;
                request();
            },
            { capture: true, passive: true }
        );
        listen(window, 'theme-changed', () => {
            layers.forEach((layer) => {
                layer.dirty = true;
            });
            request();
        });
        mutationObserver = new MutationObserver((records) => {
            if (
                records.some(
                    (record) =>
                        (record.target.nodeType === 1 ? record.target : record.target.parentElement).closest(
                            '[drawable]'
                        ) === viewport
                )
            ) {
                layers[0].dirty = true;
                request();
            }
        });
        mutationObserver.observe(viewport, {
            subtree: true,
            childList: true,
            attributes: true,
            characterData: true
        });
        listen(document, 'visibilitychange', () => {
            pending = false;
            if (!document.hidden) request();
        });
        listen(canvas, 'pointerdown', pointerDown, { capture: true });
        listen(window, 'pointermove', pointerMove, { capture: true, passive: false });
        listen(window, 'pointerup', () => {
            gesture = null;
        });
        listen(window, 'pointercancel', () => {
            gesture = null;
            dragged = false;
        });
        listen(canvas, 'click', click, { capture: true });
        listen(
            canvas,
            'wheel',
            (event) => {
                try {
                    atPointer(event, (target) => {
                        const scroll = target?.closest('.terminal-output, #terminal-content') || main;
                        scroll.scrollTop +=
                            event.deltaY *
                            (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? scroll.clientHeight : 1);
                    });
                    event.preventDefault();
                } catch {
                    fail('wheel');
                }
            },
            { passive: false }
        );
        listen(document, 'selectionchange', request);
        listen(window, 'beforeprint', () => fail('print'));
        observer = new ResizeObserver(resize);
        observer.observe(glass);
        watchdog = setTimeout(() => fail('paint-timeout'), 1500);
        resize();
    } catch (error) {
        fail(`setup: ${error.message}`);
        return null;
    }
    return {
        destroy,
        stats,
        request,
        setResolution(value) {
            resolution = value;
            stats.resolution = value;
            resize();
        },
        toScreen(x, y) {
            return sourceToScreen(x, y, width, height, strength);
        },
        get ready() {
            return ready;
        }
    };
}

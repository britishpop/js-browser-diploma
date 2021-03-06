'use strict';

function initApp() {
    const app = document.querySelector('.app'),
        menu = app.querySelector('.menu'),
        burgerBtn = menu.querySelector('.burger'),
        newImgBtn = menu.querySelector('.new'),
        commentsBtn = menu.querySelector('.comments'),
        commentsTools = menu.querySelector('.comments-tools'),
        commentsOff = document.querySelector('#comments-off'),
        marker = app.querySelector('.comments__marker'),
        drawBtn = menu.querySelector('.draw'),
        drawTools = menu.querySelector('.draw-tools'),
        shareBtn = menu.querySelector('.share'),
        shareTools = menu.querySelector('.share-tools'),
        urlTextarea = shareTools.querySelector('.menu__url'),
        defaultCommentsForm = app.removeChild(app.querySelector('.comments__form')),
        picture = app.querySelector('#picture'),
        image = picture.querySelector('img.current-image'),
        preloader = app.querySelector('.image-loader'),
        errorMsg = app.querySelector('.error'),
        errorHeader = errorMsg.querySelector('.error__header'),
        errorText = errorMsg.querySelector('.error__message');

    const clickPointShifts = (() => {
        const pointShifts = {},
            markerBounds = marker.getBoundingClientRect(),
            formBounds = marker.parentElement.getBoundingClientRect();
        pointShifts.left = (markerBounds.left - formBounds.left) + markerBounds.width / 2;
        pointShifts.top = (markerBounds.top - formBounds.top) + markerBounds.height;
        return pointShifts;
    })();

    const apiURL = '//neto-api.herokuapp.com/pic';
    const penWidth = 4;
    let socket,
        canvas = picture.querySelector('canvas.current-image'),
        imageMask = picture.querySelector('div.current-image'),
        checkedColorBtn = menu.querySelector('.menu__color[checked=""]'),
        isLinkedFromShare = false;

    //<------------------------------>

    function throttle(cb, isAnimation, delay) {
        let isWaiting = false;
        return function(...args) {
            if (isWaiting) { return };
            cb.apply(this, args);
            isWaiting = true;
            if (isAnimation) {
                requestAnimationFrame(() => isWaiting = false);
            } else {
                setTimeout(() => isWaiting = false, delay);
            }
        }
    };

    function debounce(func, delay = 0) {
        let timeout;

        return () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                timeout = null;
                func();
            }, delay);
        };
    }

    function getSessionSettings(key) {
        try {
            if (sessionStorage[key]) {
                return JSON.parse(sessionStorage[key]);
            }
        } catch (err) {
            console.error(`${err}`);
        }
    };

    function checkResponseStatus(resp) {
        if (200 <= resp.status && resp.status < 300) {
            return resp.json();
        } else {
            errorHeader.textContent = 'Ошибка: ' + resp.status;
            throw new Error(`${resp.statusText}`);
        }
    };

    function saveImageSettings(imgData) {
        urlTextarea.value = imgData.path = window.location.href.replace(/\?id=.*$/, '') + '?id=' + imgData.id;
        sessionStorage.imageSettings = JSON.stringify(imgData);
    };

    function showElement(el) {
        el.style.display = '';
    };

    function hideElement(el) {
        el.style.display = 'none';
    };

    function hideComments(radioBtn) {
        app.querySelectorAll('.comments__form')
            .forEach(comments => {
                if (radioBtn.value === 'on') {
                    showElement(comments);
                } else {
                    hideElement(comments);
                }
            });
    };

    function getDate(timestamp) {
        const date = new Date(timestamp),
            options = {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            };
        return date.toLocaleString('ru-RU', options);
    };

    function el(name, attrs, childs) {
        const element = document.createElement(name || 'div');

        if (typeof attrs === 'object' && attrs) {
            Object.keys(attrs).forEach(key => element.setAttribute(key, attrs[key]));
        }
        if (Array.isArray(childs)) {
            element.appendChild(
                childs.reduce((f, child) => {
                    f.appendChild(child);
                    return f;
                }, document.createDocumentFragment())
            );
        } else if (typeof childs === 'string' || typeof childs === 'number') {
            element.appendChild(document.createTextNode(childs));
        }

        return element;
    };

    //<------------------------------>

    function postError(header, message) {
        errorHeader.textContent = header;
        errorText.textContent = message;
        showElement(errorMsg);
    };

    function showImage(imgData) {
        image.dataset.status = 'load';
        image.src = imgData.url;
        saveImageSettings(imgData);
        window.history.pushState({ path: urlTextarea.value }, '', urlTextarea.value);
        image.addEventListener('load', () => {
            hideElement(preloader);
            selectMenuModeTo('selected', isLinkedFromShare ? 'comments' : 'share');
            onScreenMenu();
            renderComments(imgData);
            initWSSConnection(imgData.id);
            isLinkedFromShare = false;
        });
    };

    function loadImage({ id }) {
        fetch('https:' + apiURL + '/' + id)
            .then(checkResponseStatus)
            .then(showImage)
            .catch(err => postError(errorHeader.textContent, err.message));
    };

    //<------------------------------>

    function selectMenuModeTo(mode, selectedItemType) {
        switch (mode) {
            case 'initial':
                menu.dataset.state = 'initial';
                hideElement(burgerBtn);
                hideElement(canvas);
                break;

            case 'default':
                menu.dataset.state = 'default';
                menu.querySelectorAll(`[data-state='selected']`).forEach(el => el.dataset.state = '');
                drawBtn.addEventListener('click', initDraw);
                hideElement(canvas);
                break;

            case 'selected':
                menu.dataset.state = 'selected';
                [commentsBtn, drawBtn, shareBtn].find(
                    btn => btn.classList.contains(selectedItemType)
                ).dataset.state = 'selected';
                [commentsTools, drawTools, shareTools].find(
                    tools => tools.classList.contains(selectedItemType + '-tools')
                ).dataset.state = 'selected';
                showElement(burgerBtn);
                break;
        }

        const menuSettings = getSessionSettings('menuSettings');
        if (menuSettings) {
            menuSettings.mode = mode;
            menuSettings.selectItemType = selectedItemType;
            sessionStorage.menuSettings = JSON.stringify(menuSettings);
        } else {
            sessionStorage.menuSettings = JSON.stringify({ mode: mode, selectItemType: selectedItemType });
        }
    };

    function selectMenuMode(event) {
        if (burgerBtn === event.target || burgerBtn === event.target.parentElement) {
            selectMenuModeTo('default');
        } else if (drawBtn === event.target || drawBtn === event.target.parentElement) {
            selectMenuModeTo('selected', 'draw');
        } else if (commentsBtn === event.target || commentsBtn === event.target.parentElement) {
            selectMenuModeTo('selected', 'comments');
        } else if (shareBtn === event.target || shareBtn === event.target.parentElement) {
            selectMenuModeTo('selected', 'share');
        }
        onScreenMenu();
    };

    function renderApp() {
        const imageSettings = getSessionSettings('imageSettings'),
            menuSettings = getSessionSettings('menuSettings');

        image.src = '';
        if (imageSettings) {
            image.dataset.status = 'load';
            image.src = imageSettings.url;
            urlTextarea.removeAttribute('value');
            urlTextarea.value = imageSettings.path;
            renderComments(imageSettings);
            initWSSConnection(imageSettings.id);
        } else {
            const urlParamID = new URL(`${window.location.href}`).searchParams.get('id');
            if (urlParamID) {
                isLinkedFromShare = true;
                loadImage({ id: urlParamID });
            }
        }

        if (menuSettings) {
            menu.style.left = menuSettings.left + 'px';
            menu.style.top = menuSettings.top + 'px';
            selectMenuModeTo(menuSettings.mode, menuSettings.selectItemType);
            hideElement(canvas);

            if (menuSettings.selectItemType === 'draw') {
                image.addEventListener('load', initDraw);
            }
            if (menuSettings.displayComments === 'hidden') {
                commentsOff.checked = true;
                hideComments(commentsOff);
            }
        } else {
            selectMenuModeTo('initial');
        }
    };

    renderApp();

    //<------------------------------>

    function postImage(path, file) {
        const formData = new FormData(),
            name = file.name.replace(/\.\w*$/, '');

        formData.append('title', name);
        formData.append('image', file);

        showElement(preloader);
        fetch(path, {
                body: formData,
                method: 'POST'
            })
            .then(checkResponseStatus)
            .then(loadImage)
            .catch(err => postError(errorHeader.textContent, err.message));
    };

    function uploadNewByInput(event) {
        if (errorMsg.style.display !== 'none') { hideElement(errorMsg); }

        if (!(newImgBtn === event.target || newImgBtn === event.target.parentElement)) { return }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg, image/png';

        input.addEventListener('change', event => postImage('https:' + apiURL, event.currentTarget.files[0]));
        input.dispatchEvent(new MouseEvent(event.type, event));
    };

    function uploadNewByDrop(event) {
        event.preventDefault();
        if (errorMsg.style.display !== 'none') { hideElement(errorMsg); }

        if (!(event.target === event.currentTarget || event.target === imageMask || event.target === errorMsg || event.target.parentElement === errorMsg)) { return }

        if (image.dataset.status !== 'load') {
            const file = event.dataTransfer.files[0];

            if (/^image\/[(jpeg) | (png)]/.test(file.type)) {
                postImage('https:' + apiURL, file);
            } else {
                postError('Ошибка', 'Неверный формат файла. Пожалуйста, выберите изображение в формате .jpg или .png.');
            }
        } else {
            postError('Ошибка', 'Чтобы загрузить новое изображение, пожалуйста, воспользуйтесь пунктом "Загрузить новое" в меню');
        }
    };

    //<------------------------------>

    let dragged = null,
        draggedSettings = null;

    function putMenu(event) {
        if (!event.target.classList.contains('drag')) { return };
        dragged = event.currentTarget;

        const draggedBounds = event.target.getBoundingClientRect(),
            draggedCSS = getComputedStyle(dragged);

        draggedSettings = {
            shiftX: draggedBounds.width / 2,
            shiftY: draggedBounds.height / 2,
            minX: app.offsetLeft,
            maxX: app.offsetWidth - Number(draggedCSS.width.replace('px', '')),
            minY: app.offsetTop,
            maxY: app.offsetHeight - Number(draggedCSS.height.replace('px', ''))
        }
    };

    function dragMenu(pageX, pageY) {
        if (!dragged) { return }
        event.preventDefault();
        let X = pageX - draggedSettings.shiftX,
            Y = pageY - draggedSettings.shiftY;

        X = Math.min(X, draggedSettings.maxX);
        Y = Math.min(Y, draggedSettings.maxY);
        X = Math.max(X, draggedSettings.minX);
        Y = Math.max(Y, draggedSettings.minY);

        dragged.style.left = X + 'px';
        dragged.style.top = Y + 'px';
        dragged.style.pointerEvents = 'none';
    };

    function dropMenu() {
        if (!dragged) { return }
        const menuSettings = getSessionSettings('menuSettings');

        dragged.style.pointerEvents = '';
        if (menuSettings) {
            menuSettings.left = dragged.offsetLeft;
            menuSettings.top = dragged.offsetTop;
            sessionStorage.menuSettings = JSON.stringify(menuSettings);
        } else {
            sessionStorage.menuSettings = JSON.stringify({ left: dragged.offsetLeft, top: dragged.offsetTop });
        }
        dragged = null;
    };

    function onScreenMenu() {
        const appWidth = app.offsetWidth;
        const appHeight = app.offsetHeight;

        if (menu.offsetLeft + menu.offsetWidth > appWidth) {
            menu.style.left = appWidth - menu.offsetWidth + 'px'
        };

        if (menu.offsetTop + menu.offsetHeight > appHeight) {
            menu.style.top = appHeight - menu.offsetHeight + 'px'
        };
    };

    //<------------------------------>

    function checkSelectionResult() {
        try {
            const done = document.execCommand('copy');
            console.log('Копирование ссылки: ' + urlTextarea.value + (done ? ' ' : ' не') + 'выполнено');
        } catch (err) {
            console.error('Не удалось скопировать ссылку. Ошибка: ' + err);
        }
    };

    function clearSelection() {
        try {
            window.getSelection().removeAllRanges();
        } catch (err) {
            document.selection.empty();
            console.error(err);
        }
    };

    function copyURL(event) {
        if (event.target.classList.contains('menu_copy')) {
            urlTextarea.select();
            urlTextarea.blur();
            checkSelectionResult();
            clearSelection();
        }
    };

    //<------------------------------>

    function parseNewCommentsForm(comment) {
        const newCommentsForm = crtNewCommentsForm(comment.left, comment.top),
            commentsBody = newCommentsForm.querySelector('.comments__body'),
            loader = newCommentsForm.querySelector('.loader'),
            commentDate = getDate(comment.timestamp).replace(',', ''),
            newComment = crtNewCommentNode(commentDate, comment.message);

        newComment.dataset.timestamp = comment.timestamp;
        picture.appendChild(newCommentsForm);
        commentsBody.insertBefore(newComment, loader.parentElement);
        return newCommentsForm;
    };

    function renderComments(imgData) {
        if (imgData.comments) {
            const Forms = Object.keys(imgData.comments).reduce((forms, id) => {
                const commentsMarker = forms.querySelector(`.comments__marker[data-left="${imgData.comments[id].left}"][data-top="${imgData.comments[id].top}"]`);

                if (forms && commentsMarker) {
                    appendNewComment(imgData.comments[id], commentsMarker.parentElement);
                    return forms;
                } else {
                    const newCommentsForm = parseNewCommentsForm(imgData.comments[id], id);
                    forms.appendChild(newCommentsForm);
                    return forms;
                }
            }, document.createDocumentFragment());

            picture.appendChild(Forms);
        } else {
            while (picture.hasChildNodes() && picture.lastElementChild.classList.contains('comments__form')) {
                picture.removeChild(picture.lastElementChild);
            }
        }
        return imgData;
    };

    //<------------------------------>

    function crtNewCommentNode(date, message) {
        return el('div', { class: 'comment' }, [
            el('p', { class: 'comment__time' }, date),
            el('p', { class: 'comment__message' }, message)
        ]);
    };

    function crtNewCommentsFormNode(left, top) {
        return el('form', { class: 'comments__form', style: `left: ${left}px; top: ${top}px;` }, [
            el('span', { class: 'comments__marker' }, null),
            el('input', { type: 'checkbox', class: 'comments__marker-checkbox' }, null),
            el('div', { class: 'comments__body' }, [
                el('div', { class: 'comment' }, [
                    el('div', { class: 'loader' }, [
                        el('span', null, null),
                        el('span', null, null),
                        el('span', null, null),
                        el('span', null, null),
                        el('span', null, null)
                    ])
                ]),
                el('textarea', { class: 'comments__input', type: 'text', placeholder: 'Напишите ответ...' }, null),
                el('input', { class: 'comments__close', type: 'button', value: 'Закрыть' }, null),
                el('input', { class: 'comments__submit', type: 'submit', value: 'Отправить' }, null)
            ])
        ]);
    };

    function crtNewCommentsForm(left, top) {
        const newCommentsForm = crtNewCommentsFormNode(left, top);

        newCommentsForm.firstElementChild.dataset.left = parseInt(newCommentsForm.style.left);
        newCommentsForm.firstElementChild.dataset.top = parseInt(newCommentsForm.style.top);
        hideElement(newCommentsForm.querySelector('.loader'));
        return newCommentsForm;
    };

    function appendNewComment(comment, commentsForm) {
        const commentsBody = commentsForm.querySelector('.comments__body'),
            comments = Array.from(commentsBody.querySelectorAll('.comment')),
            commentDate = getDate(comment.timestamp).replace(',', ''),
            newComment = crtNewCommentNode(commentDate, comment.message),
            nextComment = comments.find(curComment => Number(curComment.dataset.timestamp) > comment.timestamp);

        newComment.dataset.timestamp = comment.timestamp;
        commentsBody.insertBefore(newComment, (nextComment ? nextComment : comments[comments.length - 1]));
    };

    function loadComment(imgData, left, top) {
        const commentForm = app.querySelector(`.comments__marker[data-left="${left}"][data-top="${top}"]`).parentElement,
            loader = commentForm.querySelector('.loader');

        for (const id in imgData.comments) {
            const comment = imgData.comments[id],
                isPostedComment = app.querySelector(`.comment[data-timestamp="${comment.timestamp}"]`);

            if (comment.left === left && comment.top === top && !isPostedComment) {
                appendNewComment(comment, commentForm);
                hideElement(loader);
                break;
            }
        }

        const menuSettings = getSessionSettings('menuSettings');
        if (menuSettings.displayComments === 'hidden') { hideComments(commentsOff); }

        return imgData;
    };

    function postComment(message, left, top) {
        const id = getSessionSettings('imageSettings').id,
            body = 'message=' + encodeURIComponent(message) + '&left=' + encodeURIComponent(left) + '&top=' + encodeURIComponent(top);

        return fetch('https:' + apiURL + '/' + id + '/comments', {
                body: body,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
            .then(checkResponseStatus)
            .then(data => loadComment(data, left, top))
            .then(saveImageSettings)
            .catch(err => console.error(err));
    };

    function sendComment(event) {
        if (!event.target.classList.contains('comments__submit')) { return };

        event.preventDefault();
        const crntCommentsForm = event.target.parentElement.parentElement,
            loader = crntCommentsForm.querySelector('.loader'),
            input = crntCommentsForm.querySelector('.comments__input'),
            left = parseInt(crntCommentsForm.style.left),
            top = parseInt(crntCommentsForm.style.top);

        showElement(loader);
        postComment(input.value ? input.value : '\n', left, top);
        input.value = '';
    };

    //<------------------------------>

    function toggleCommentsShow(event) {
        if (!event.target.classList.contains('menu__toggle')) { return };

        hideComments(event.target);

        const menuSettings = getSessionSettings('menuSettings');
        menuSettings.displayComments = menuSettings.displayComments ? '' : 'hidden';
        sessionStorage.menuSettings = JSON.stringify(menuSettings);
    };

    function toggleDisplayCommentsForm(commentsFormCheckbox, isClosedByBtn) {
        if (!commentsFormCheckbox) { return };

        const [comment] = commentsFormCheckbox.parentElement.querySelectorAll('.comment');

        if (comment.firstElementChild.classList.contains('loader')) {
            picture.removeChild(commentsFormCheckbox.parentElement);
        }
        if (!isClosedByBtn || !comment.firstElementChild.classList.contains('loader')) {
            commentsFormCheckbox.parentElement.style.zIndex = '';
            commentsFormCheckbox.checked = commentsFormCheckbox.disabled = false;
        }
    };

    function addNewCommentsForm(event) {
        if (!(event.target.classList.contains('current-image') && commentsBtn.dataset.state === 'selected')) { return };

        const prevCommentsFormCheckbox = picture.querySelector('.comments__marker-checkbox[disabled=""]');
        toggleDisplayCommentsForm(prevCommentsFormCheckbox, false);

        const newCommentsForm = crtNewCommentsForm(event.offsetX - clickPointShifts.left, event.offsetY - clickPointShifts.top);
        picture.appendChild(newCommentsForm);
        newCommentsForm.querySelector('.comments__marker-checkbox').checked = true;
        newCommentsForm.querySelector('.comments__marker-checkbox').disabled = true;
        newCommentsForm.style.zIndex = '5';
    };

    function openCommentsForm(event) {
        if (!(event.target.classList.contains('comments__marker-checkbox') && event.target.checked)) { return };

        const prevCommentsFormCheckbox = picture.querySelector('.comments__marker-checkbox[disabled=""]');

        toggleDisplayCommentsForm(prevCommentsFormCheckbox, false);
        event.target.disabled = true;
        event.target.parentElement.style.zIndex = '5';
    };

    function typeComment(event) {
        if (!event.target.classList.contains('comments__input')) { return };

        event.target.focus();
    };

    function closeCommentsForm(event) {
        if (!event.target.classList.contains('comments__close')) { return };

        const [checkbox] = event.target.parentElement.parentElement.getElementsByClassName('comments__marker-checkbox');
        toggleDisplayCommentsForm(checkbox, true);
    };

    //<------------------------------>

    function initDraw(event) {
        drawBtn.removeEventListener('click', initDraw);

        const canvasCtx = canvas.getContext('2d');
        canvas.width = image.clientWidth;
        canvas.height = image.clientHeight;
        canvasCtx.strokeStyle = getComputedStyle(checkedColorBtn.nextElementSibling).backgroundColor;
        canvasCtx.lineWidth = penWidth;
        showElement(canvas);

        let penColor = getComputedStyle(checkedColorBtn.nextElementSibling).backgroundColor,
            strokes = [],
            isDrawing = false,
            needsRendering = false;

        function drawPoint(point) {
            canvasCtx.beginPath();
            canvasCtx.fillStyle = penColor;
            canvasCtx.arc(...point, penWidth / 2, 0, 2 * Math.PI);
            canvasCtx.fill();
        }

        function drawStroke(points) {
            canvasCtx.beginPath();
            canvasCtx.lineWidth = penWidth;
            canvasCtx.lineCap = canvasCtx.lineJoin = 'round';
            canvasCtx.strokeStyle = penColor;
            canvasCtx.moveTo(...points[0]);
            for (let i = 1; i < points.length - 1; i++) {
                canvasCtx.lineTo(...points[i], ...points[i + 1]);
            }
            canvasCtx.stroke();
        }

        function draw() {
            strokes.forEach(stroke => {
                drawPoint(stroke[0]);
                drawStroke(stroke);
            });
        }

        (function tick() {
            if (needsRendering) {
                draw();
                needsRendering = false;
            }
            window.requestAnimationFrame(tick);
        })();

        const throttleSendMask = throttle(sendMask, false, 1000);
        canvas.addEventListener('mousedown', (event) => {
            isDrawing = true;
            const stroke = [];
            stroke.push([event.offsetX, event.offsetY]);
            strokes.push(stroke);
            needsRendering = true;
        });

        const debounceSendMask = debounce(sendMask, 2000);

        canvas.addEventListener('mousemove', (event) => {
            if (!isDrawing) {
                return;
            }
            const stroke = strokes[0];
            stroke.push([event.offsetX, event.offsetY]);
            needsRendering = true;
            debounceSendMask();
        });

        canvas.addEventListener('mouseup', () => {
            isDrawing = false;
            strokes = [];
        });

        canvas.addEventListener('mouseleave', () => isDrawing = false);

        //<------------------------------>

        function sendMask() {
            canvas.toBlob(blob => {
                new Promise((done, fail) => {
                        socket.send(blob);
                        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
                    })
                    .then(() => strokes = []);
            });
        }

        function changeColor(event) {
            if (!event.target.checked) {
                return;
            }
            checkedColorBtn.removeAttribute('checked');
            checkedColorBtn = event.target;
            event.target.setAttribute('checked', '');

            canvasCtx.strokeStyle = canvasCtx.fillStyle = penColor = getComputedStyle(event.target.nextElementSibling).backgroundColor;
            canvasCtx.globalCompositeOperation = 'source-over';
        };

        drawTools.addEventListener('change', changeColor);
    };

    function maskSize(image, imageMask) {
        imageMask.style.width = image.clientWidth + 'px';
        imageMask.style.height = image.clientHeight + 'px';
        picture.style.width = image.clientWidth + 'px';
        picture.style.height = image.clientHeight + 'px';
    };

    //<------------------------------>

    //Загрузка файла на сервер:
    menu.addEventListener('click', uploadNewByInput);
    app.addEventListener('dragover', (event) => event.preventDefault());
    app.addEventListener('drop', uploadNewByDrop);

    //Перемещение меню:
    const moveMenu = throttle((...coords) => dragMenu(...coords), true);
    menu.addEventListener('mousedown', putMenu);
    app.addEventListener('mousemove', (event) => moveMenu(event.pageX, event.pageY));
    app.addEventListener('mouseup', dropMenu);
    window.addEventListener('resize', onScreenMenu);

    //Переключение пунктов меню:
    menu.addEventListener('click', selectMenuMode);

    //Копирование ссылки в режиме "Поделиться":
    shareTools.addEventListener('click', copyURL);
    app.addEventListener('click', (event) => {
        if (event.target !== urlTextarea) {
            urlTextarea.blur();
        }
    });

    //Переключатели отображаения комментариев на странице:
    commentsTools.addEventListener('change', toggleCommentsShow);

    //Работа с формой комментариев:
    picture.addEventListener('click', addNewCommentsForm);
    picture.addEventListener('change', openCommentsForm);
    picture.addEventListener('click', typeComment);
    picture.addEventListener('click', sendComment);
    picture.addEventListener('click', closeCommentsForm);

    //Инициализация режима рисования:
    drawBtn.addEventListener('click', initDraw);

    //Инициализация и логика работы вебсокет соединения:
    function initWSSConnection(id) {
        socket = new WebSocket('wss:' + apiURL + '/' + id);

        function addCommentInDirectory(comment, directory) {
            directory[comment.id] = {
                left: comment.left,
                top: comment.top,
                message: comment.message,
                timestamp: comment.timestamp
            };
        };

        function updateApp(event) {
            const wssResponse = JSON.parse(event.data);

            switch (wssResponse.event) {
                case 'pic':
                    maskSize(image, imageMask);
                    if (wssResponse.pic.mask) {
                        imageMask.style.background = `url(${wssResponse.pic.mask})`;
                    } else {
                        imageMask.style.background = '';
                    }
                    break;

                case 'comment':
                    const imageSettings = getSessionSettings('imageSettings'),
                        commentsMarker = app.querySelector(`.comments__marker[data-left="${wssResponse.comment.left}"][data-top="${wssResponse.comment.top}"]`);

                    if (imageSettings.comments) {
                        addCommentInDirectory(wssResponse.comment, imageSettings.comments);
                    } else {
                        imageSettings.comments = {};
                        addCommentInDirectory(wssResponse.comment, imageSettings.comments);
                    }

                    if (commentsMarker) {
                        loadComment(imageSettings, wssResponse.comment.left, wssResponse.comment.top);
                    } else {
                        picture.appendChild(crtNewCommentsForm(wssResponse.comment.left, wssResponse.comment.top));
                        loadComment(imageSettings, wssResponse.comment.left, wssResponse.comment.top);
                    }
                    break;

                case 'mask':
                    imageMask.style.background = `url(${wssResponse.url})`;
                    break;
            }
        };

        socket.addEventListener('message', updateApp);
        socket.addEventListener('open', (event) => console.log('Вебсокет соединение установлено'));
        socket.addEventListener('close', (event) => console.log(event.wasClean ? '"Чистое закрытие" соединения' : `Обрыв связи. Причина: ${event.reason}`));
        window.addEventListener('beforeunload', () => socket.close(1000, 'Сессия успешно завершена'));
        socket.addEventListener('error', (error) => console.error(`Ошибка: ${error.message}`));
    }
}

document.addEventListener('DOMContentLoaded', initApp);
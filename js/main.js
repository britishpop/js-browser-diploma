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
    image = app.querySelector('.current-image'),
    preloader = app.querySelector('.image-loader'),
    errorMsg = app.querySelector('.error'),
    errorHeader = errorMsg.querySelector('.error__header'),
  	errorText = errorMsg.querySelector('.error__message');

  const picture = (() => {
		const picture = document.createElement('div'),
    	canvas = document.createElement('canvas'),
			imageMask = document.createElement('div');

    picture.id = 'picture';
    picture.appendChild(image);

		imageMask.classList.add('background-placeholder');
		picture.appendChild(imageMask);

    canvas.classList.add('current-image');
    picture.insertBefore(canvas, image.nextElementSibling);

    app.insertBefore(picture, menu.nextElementSibling);
    return picture;
  })();

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
		imageMask = picture.querySelector('.background-placeholder'),
    checkedColorBtn = menu.querySelector('.menu__color[checked=""]'),
    isLinkedFromShare = false;

  //<------------------------------>

  function throttle( cb, isAnimation, delay ) {
    let isWaiting = false;
    return function (...args) {
      if (!isWaiting) {
        cb.apply(this, args);
        isWaiting = true;
        if (isAnimation) {
        	requestAnimationFrame(() => isWaiting = false);
        } else {
        	setTimeout(() => isWaiting = false, delay);
        }
      }
    }
  };

	function debounce( func, delay = 0 ) {
	    let timeout;

	    return () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          timeout = null;
          func();
        }, delay);
	    };
	}

  function getSessionSettings( key ) {
  	try {
			if (sessionStorage[key]) {
				return JSON.parse(sessionStorage[key]);
			}
		} catch (err) {
			console.error(`${err}`);
		}
	};

	function checkResponseStatus( resp ) {
  	if (200 <= resp.status && resp.status < 300) {
			return resp.json();
		} else {
			errorHeader.textContent = 'Ошибка: ' + resp.status;
			throw new Error(`${resp.statusText}`);
		}
  };

  function saveImageSettings( imgData ) {
		urlTextarea.value = imgData.path = window.location.href.replace(/\?id=.*$/, '') + '?id=' + imgData.id;
    sessionStorage.imageSettings = JSON.stringify(imgData);
  };

  function showElement( el ) {
    el.style.display = '';
  };

  function hideElement( el ) {
    el.style.display = 'none';
  };

  function hideComments( radioBtn ) {
  	Array.from(app.getElementsByClassName('comments__form'))
			.forEach(comments => {
		  	if (radioBtn.value === 'on') {
		  		showElement(comments);
		  	} else {
		  		hideElement(comments);
		  	}
			}
		);
  };

  function getDate( timestamp ) {
	  const date = new Date(timestamp),
 			options = { day: '2-digit', month: '2-digit', year: '2-digit',
			 						hour: '2-digit', minute: '2-digit', second: '2-digit' };
	  return date.toLocaleString('ru-RU', options);
	};

  function el( name, attrs, childs ) {
 	  const element = document.createElement(name || 'div');

    if (typeof attrs === 'object' && attrs) {
    	Object.keys(attrs).forEach(key => element.setAttribute(key, attrs[key]));
    }
    if (Array.isArray(childs)) {
    	element.appendChild(
        childs.reduce(( f, child ) => {
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

  function postError( header, message ) {
  	errorHeader.textContent = header;
	  errorText.textContent = message;
	  showElement(errorMsg);
  };

  function showImage( imgData ) {
		image.dataset.status = 'load';
    image.src = imgData.url;
		saveImageSettings(imgData);
    window.history.pushState({path: urlTextarea.value}, '', urlTextarea.value);
		image.addEventListener('load', () => {
      hideElement(preloader);
      selectMenuModeTo('selected', isLinkedFromShare ? 'comments' : 'share');
			renderComments(imgData);
      initWSSConnection(imgData.id);
      isLinkedFromShare = false;
		});
 	};

  function loadImage( { id } ) {
  	fetch('https:' + apiURL + '/' + id)
  	.then(checkResponseStatus)
		.then(showImage)
		.catch(err => postError(errorHeader.textContent, err.message));
  };

  //<------------------------------>

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

  //Загрузка файла на сервер:
	menu.addEventListener('click', uploadNewByInput);
  app.addEventListener('dragover', ( event ) => event.preventDefault());
  app.addEventListener('drop', uploadNewByDrop);

	//Перемещение меню:
	const moveMenu = throttle((...coords ) => dragMenu(...coords), true);
    menu.addEventListener('mousedown', putMenu);
	app.addEventListener('mousemove', ( event ) => moveMenu(event.pageX, event.pageY));
	app.addEventListener('mouseup', dropMenu);

	//Переключение пунктов меню:
	menu.addEventListener('click', selectMenuMode);

	//Копирование ссылки в режиме "Поделиться":
	shareTools.addEventListener('click', copyURL);
  app.addEventListener('click', ( event ) => {
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
}

document.addEventListener('DOMContentLoaded', initApp);

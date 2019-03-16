'use strict';

function selectMenuModeTo( mode, selectedItemType ) {
	switch(mode) {
	  case 'initial':
	    menu.dataset.state = 'initial';
	    hideElement(burgerBtn);
			hideElement(canvas);
	  break;

	  case 'default':
	    menu.dataset.state = 'default';
	    Array.from(menu.querySelectorAll(`[data-state='selected']`)).forEach(el => el.dataset.state = '');
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

function selectMenuMode( event ) {
	if (burgerBtn === event.target || burgerBtn === event.target.parentElement) {
		selectMenuModeTo('default');
	} else if (drawBtn === event.target || drawBtn === event.target.parentElement) {
		selectMenuModeTo('selected', 'draw');
	} else if (commentsBtn === event.target || commentsBtn === event.target.parentElement) {
		selectMenuModeTo('selected', 'comments');
	} else if (shareBtn === event.target || shareBtn === event.target.parentElement) {
		selectMenuModeTo('selected', 'share');
	}
};

let dragged = null,
    draggedSettings = null;

function putMenu( event ) {
  if (event.target.classList.contains('drag')) {
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
    };
  }
};

function dragMenu( pageX, pageY ) {
  if (dragged) {
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
  }
};

function dropMenu() {
  if (dragged) {
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
  }
};

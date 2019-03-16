'use strict';

function checkSelectionResult() {
  try {
    const done = document.execCommand('copy');
    console.log('Копирование ссылки: ' + urlTextarea.value + (done ? ' ' : ' не') + 'выполнено');
  } catch(err) {
    console.error('Не удалось скопировать ссылку. Ошибка: ' + err);
  }
};

function clearSelection() {
  try {
    window.getSelection().removeAllRanges();
  } catch(err) {
    document.selection.empty();
    console.error(err);
  }
};

function copyURL( event ) {
  if (event.target.classList.contains('menu_copy')) {
    urlTextarea.select();
    urlTextarea.blur();
    checkSelectionResult();
    clearSelection();
  }
};

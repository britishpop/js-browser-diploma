'use strict';

function initWSSConnection( id ) {
  debugger;

  socket = new WebSocket('wss:' + apiURL + '/' + id);

  function addCommentInDirectory(	comment, directory ) {
    directory[comment.id] = {
      left: comment.left,
      top: comment.top,
      message: comment.message,
      timestamp: comment.timestamp
    };
  };

  function updateApp( event ) {
    const wssResponse = JSON.parse(event.data);

    switch(wssResponse.event) {
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
  socket.addEventListener('open', ( event ) => console.log('Вебсокет соединение установлено'));
  socket.addEventListener('close', ( event ) => console.log(event.wasClean ? '"Чистое закрытие" соединения' : `Обрыв связи. Причина: ${event.reason}`));
  window.addEventListener('beforeunload', () => socket.close(1000, 'Сессия успешно завершена'));
  socket.addEventListener('error', ( error ) => console.error(`Ошибка: ${error.message}`));
}

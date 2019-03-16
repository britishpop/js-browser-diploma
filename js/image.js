'use strict';

function postImage( path, file ) {
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

function uploadNewByInput( event ) {
	if (errorMsg.style.display !== 'none') { hideElement(errorMsg); }

	if (newImgBtn === event.target || newImgBtn === event.target.parentElement) {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'image/jpeg, image/png';

		input.addEventListener('change', event => postImage('https:' + apiURL, event.currentTarget.files[0]));
		input.dispatchEvent(new MouseEvent(event.type, event));
	}
};

function uploadNewByDrop( event ) {
  event.preventDefault();
  if (errorMsg.style.display !== 'none') { hideElement(errorMsg); }

  if (event.target === event.currentTarget || event.target === image || event.target === errorMsg || event.target.parentElement === errorMsg) {
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
  }
};

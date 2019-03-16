'use strict';

function parseNewCommentsForm( comment ) {
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

function renderComments( imgData ) {
	if (imgData.comments) {
		const Forms = Object.keys(imgData.comments).reduce(( forms, id ) => {
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

 function crtNewCommentNode( date, message ) {
	 return el('div', { class: 'comment' }, [
		 el('p', { class: 'comment__time' }, date),
		 el('p', { class: 'comment__message' }, message)
	 ]);
 };

 function crtNewCommentsFormNode( left, top ) {
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

	function crtNewCommentsForm ( left, top ) {
	 const newCommentsForm = crtNewCommentsFormNode(left, top);

		newCommentsForm.firstElementChild.dataset.left = parseInt(newCommentsForm.style.left);
		newCommentsForm.firstElementChild.dataset.top = parseInt(newCommentsForm.style.top);
	 hideElement(newCommentsForm.querySelector('.loader'));
		return newCommentsForm;
	};

	function appendNewComment( comment, commentsForm ) {
		const commentsBody = commentsForm.querySelector('.comments__body'),
			comments = Array.from(commentsBody.getElementsByClassName('comment')),
			commentDate = getDate(comment.timestamp).replace(',', ''),
			newComment = crtNewCommentNode(commentDate, comment.message),
			nextComment = comments.find(curComment => Number(curComment.dataset.timestamp) > comment.timestamp);

		newComment.dataset.timestamp = comment.timestamp;
		commentsBody.insertBefore(newComment, ( nextComment ? nextComment : comments[comments.length - 1] ));
	};

	function loadComment( imgData, left, top ) {
	 const commentForm = app.querySelector(`.comments__marker[data-left="${left}"][data-top="${top}"]`).parentElement,
		 loader = commentForm.querySelector('.loader');

	 for (const id in imgData.comments) {
		 const comment = imgData.comments[id],
			 isPostedComment = app.querySelector(`.comment[data-timestamp="${comment.timestamp}"]`);

		 if (comment.left === left && comment.top === top && !isPostedComment) {
			 appendNewComment(comment, commentForm);
				hideElement(loader);
			 break ;
		 }
	 }

	 const menuSettings = getSessionSettings('menuSettings');
	 if (menuSettings.displayComments === 'hidden') { hideComments(commentsOff); }

	 return imgData;
	};

	function postComment( message, left, top ) {
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

	function sendComment( event ) {
		if (event.target.classList.contains('comments__submit')) {
			 event.preventDefault();
			const crntCommentsForm = event.target.parentElement.parentElement,
				loader = crntCommentsForm.querySelector('.loader'),
				input = crntCommentsForm.querySelector('.comments__input'),
				left = parseInt(crntCommentsForm.style.left),
				top = parseInt(crntCommentsForm.style.top);

			showElement(loader);
			postComment(input.value ? input.value : '\n', left, top);
		 input.value = '';
		}
	};

	//<------------------------------>

	function toggleCommentsShow( event ) {
	 if (event.target.classList.contains('menu__toggle')) {
		 hideComments(event.target);

		 const menuSettings = getSessionSettings('menuSettings');
		 menuSettings.displayComments = menuSettings.displayComments ? '' : 'hidden';
		 sessionStorage.menuSettings = JSON.stringify(menuSettings);
		}
 };

	function toggleDisplayCommentsForm( commentsFormCheckbox, isClosedByBtn ) {
	 if (commentsFormCheckbox) {
		 const [comment] = commentsFormCheckbox.parentElement.getElementsByClassName('comment');

		 if (comment.firstElementChild.classList.contains('loader')) {
			 picture.removeChild(commentsFormCheckbox.parentElement);
		 }
		 if (!isClosedByBtn || !comment.firstElementChild.classList.contains('loader')) {
			 commentsFormCheckbox.parentElement.style.zIndex = '';
			 commentsFormCheckbox.checked = commentsFormCheckbox.disabled = false;
		 }
	 }
	};

	function addNewCommentsForm( event ) {
	 if (event.target.classList.contains('current-image') && commentsBtn.dataset.state === 'selected') {
		 const prevCommentsFormCheckbox = picture.querySelector('.comments__marker-checkbox[disabled=""]');
		 toggleDisplayCommentsForm(prevCommentsFormCheckbox, false);

		 const newCommentsForm = crtNewCommentsForm(event.pageX - clickPointShifts.left, event.pageY - clickPointShifts.top);
		 picture.appendChild(newCommentsForm);
			newCommentsForm.querySelector('.comments__marker-checkbox').checked = true;
			newCommentsForm.querySelector('.comments__marker-checkbox').disabled = true;
			newCommentsForm.style.zIndex = '5';
		}
	};

	function openCommentsForm( event ) {
	 if (event.target.classList.contains('comments__marker-checkbox') && event.target.checked) {
		 const prevCommentsFormCheckbox = picture.querySelector('.comments__marker-checkbox[disabled=""]');

		 toggleDisplayCommentsForm(prevCommentsFormCheckbox, false);
		 event.target.disabled = true;
		 event.target.parentElement.style.zIndex = '5';
		}
	};

	function typeComment( event ) {
	 if (event.target.classList.contains('comments__input')) {
			event.target.focus();
		}
	};

	function closeCommentsForm( event ) {
		if (event.target.classList.contains('comments__close')) {
			const [checkbox] = event.target.parentElement.parentElement.getElementsByClassName('comments__marker-checkbox');
			toggleDisplayCommentsForm(checkbox, true);
		}
	};

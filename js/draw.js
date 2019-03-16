'use strict';

function initDraw( event ) {
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

	function drawPoint( point ) {
		canvasCtx.beginPath();
		canvasCtx.fillStyle = penColor;
		canvasCtx.arc(...point, penWidth / 2, 0, 2 * Math.PI);
		canvasCtx.fill();
	}

	function drawStroke( points ) {
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
	canvas.addEventListener('mousedown', ( event ) => {
		isDrawing = true;
		const stroke = [];
		stroke.push([event.offsetX, event.offsetY]);
		strokes.push(stroke);
		needsRendering = true;
	});

	const debounceSendMask = debounce(sendMask, 2000);

	canvas.addEventListener('mousemove', ( event ) => {
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

	function changeColor( event ) {
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
	imageMask.style.left = image.offsetLeft;
	imageMask.style.top = image.offsetTop;
	debugger;
};

// route console.log to parent
console.log = function (...args) {
	if (args.toString) {
		window.parent.postMessage(args.toString(), '*');
	} else {
		window.parent.postMessage(args.join(' '), '*');
	}
};

// route window errors to parent
window.onerror = function(message, source, lineno, colno, error) {
	const errorMsg = "خطئ: " + message + " في " + source;
	window.parent.postMessage(errorMsg, '*');
};

// notify swipes
let startX, startY, endX, endY, startTime, endTime;
document.addEventListener('touchstart', (event) => {
	startX = event.touches[0].clientX;
	startY = event.touches[0].clientY;
	startTime = new Date().getTime(); // Record start time
});
document.addEventListener('touchmove', (event) => {
	endX = event.touches[0].clientX;
	endY = event.touches[0].clientY;
});
document.addEventListener('touchend', () => {
	endTime = new Date().getTime(); // Record end time
	const swipeDuration = endTime - startTime;
	const swipeDistanceX = startX - endX;
	const swipeDistanceY = endY - startY;

	// Check for swipe left
	if (swipeDistanceX > 100 && swipeDuration < 500) {
		window.parent.postMessage('تمريريسار', '*');
	}
	// Check for swipe down
	else if (swipeDistanceY > 100 && swipeDuration < 500) {
		window.parent.postMessage('تمريرئسفل', '*');
	}
});
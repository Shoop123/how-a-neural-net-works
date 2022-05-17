let canvasList;
let canvas;

let inputValue = 0.5;

let weight1 = 0.1;
let weight2 = 0.9;
let weight3 = 0.2;
let weight4 = 0.8;

let hiddenNodeTopInput = 'Node Input';
let hiddenNodeTopOutput = 'Node Output (sigmoid)';

let hiddenNodeBottomInput = 'Node Input';
let hiddenNodeBottomOutput = 'Node Output (sigmoid)';

let outputNodeInputFromTopHiddenNode = 0;
let outputNodeInputFromBottomHiddenNode = 0;

let inputToOutputNode = 0;

let outputValue = '';

let targetOuput = 1;

let learning_rate = 0.05;

let error;

let mse;
let dMSEdO;

let dMSEdW3;
let dMSEdW4;

let dMSEdHNTO;
let dMSEdHNBO;

let dMSEdHNTI;
let dMSEdHNBI;

let dMSEdW1;
let dMSEdW2;

$(document).ready(function() {
	var elem = $('.collapsible.expandable');

	var instance = M.Collapsible.init(elem, {
		accordion: false
	});

	$('.tabs').tabs();

	canvasList = $('#neural-net-canvas');
	canvas = canvasList[0];

	updateTextFields();
	setHandlers();
 
	setSize();

	paint();

	$(window).resize(function() {
		setSize();

		paint();
	});
});

function updateTextFields() {
	$('#input-value').val(inputValue);

	$('#w1').val(weight1);
	$('#w2').val(weight2);
	$('#w3').val(weight3);
	$('#w4').val(weight4);

	$('#target-output').val(targetOuput);

	$('#learning-rate').val(learning_rate);

	M.updateTextFields();
}

function setHandlers() {
	$('#forward-pass-button').click(function() {
		forwardPass();

		let detailsSection = $('#forward-pass-details');

		if (detailsSection.hasClass('hide')) {
			detailsSection.removeClass('hide');

			M.Collapsible.getInstance($('.collapsible')).open(1);
		}

		paint();

		$(this).addClass('disabled');
		$('#backward-pass-button').removeClass('disabled');
	});

	$('#backward-pass-button').click(function() {
		backwardPass();

		let detailsSection = $('#backward-pass-details');

		if (detailsSection.hasClass('hide')) {
			detailsSection.removeClass('hide');

			M.Collapsible.getInstance($('.collapsible')).open(2);
		}

		paint();

		$(this).addClass('disabled');
		$('#update-weights-button').removeClass('disabled');
	});

	$('#update-weights-button').click(function() {
		updateWeights();

		let detailsSection = $('#weight-update-details');

		if (detailsSection.hasClass('hide')) {
			detailsSection.removeClass('hide');

			M.Collapsible.getInstance($('.collapsible')).open(3);
		}

		paint();

		$(this).addClass('disabled');
		$('#forward-pass-button').removeClass('disabled');
	});

	$('#update-parameters-button').click(function() {
		inputValue = round(parseFloat($('#input-value').val()), 4)

		weight1 = round(parseFloat($('#w1').val()), 4);
		weight2 = round(parseFloat($('#w2').val()), 4);
		weight3 = round(parseFloat($('#w3').val()), 4);
		weight4 = round(parseFloat($('#w4').val()), 4);

		targetOuput = round(parseFloat($('#target-output').val()), 4);

		learning_rate = round(parseFloat($('#learning-rate').val()), 4);

		updateTextFields();

		paint();
	});

	$('#randomize-weights-button').click(function() {
		weight1 = round(Math.random(), 4);
		weight2 = round(Math.random(), 4);
		weight3 = round(Math.random(), 4);
		weight4 = round(Math.random(), 4);

		updateTextFields();

		paint();
	});

	$('#hide-notes-tips-contents-row-button').click(function() {
		$('#notes-tips-contents-row').toggle();
	});

	$('#hide-forward-pass-details-contents-row-button').click(function() {
		$('#forward-pass-details-contents-row').toggle();
	});

	$('#hide-backward-pass-details-contents-row-button').click(function() {
		$('#backward-pass-details-contents-row').toggle();
	});

	$('#hide-weight-update-details-contents-row-button').click(function() {
		$('#weight-update-details-contents-row').toggle();
	});
}
	
function setSize() {
	canvas.width = canvasList.parent().width();
	canvas.height = Math.max(300, canvasList.parent().height());
}

function paint() {
	let context = canvas.getContext('2d');
	context.clearRect(0, 0, canvas.width, canvas.height);

	context.fillStyle = 'green';
	context.strokeStyle = 'green';

	let minDimension = Math.min(canvas.width, canvas.height);

	let nodeRadius = minDimension / 5 / 2;

	let inputNodeCenterX = nodeRadius;
	let inputNodeCenterY = canvas.height / 2;

	let hiddenNodeTopCenterX = canvas.width / 2;
	let hiddenNodeTopCenterY = canvas.height / 3;

	let hiddenNodeBottomCenterX = canvas.width / 2;;
	let hiddenNodeBottomCenterY = 2 * canvas.height / 3;

	let outputNodeCenterX = canvas.width - nodeRadius;
	let outputNodeCenterY = canvas.height / 2;

	context.beginPath();
	context.arc(inputNodeCenterX, inputNodeCenterY, nodeRadius, 0, 2 * Math.PI, false);
	context.fill();

	context.beginPath();
	context.moveTo(inputNodeCenterX, inputNodeCenterY);
	context.lineTo(hiddenNodeTopCenterX, hiddenNodeTopCenterY);
	context.stroke();

	let weight1TextPosition = getCenterLineTextCoordinates([inputNodeCenterX, inputNodeCenterY], [hiddenNodeTopCenterX, hiddenNodeTopCenterY])
	drawText(context, round(weight1, 3), 'center', weight1TextPosition[0], weight1TextPosition[1]);

	context.beginPath();
	context.moveTo(inputNodeCenterX, inputNodeCenterY);
	context.lineTo(hiddenNodeBottomCenterX, hiddenNodeBottomCenterY);
	context.stroke();

	let weight2TextPosition = getCenterLineTextCoordinates([inputNodeCenterX, inputNodeCenterY], [hiddenNodeBottomCenterX, hiddenNodeBottomCenterY])
	drawText(context, round(weight2, 3), 'center', weight2TextPosition[0], weight2TextPosition[1]);

	drawText(context, round(inputValue, 3), 'left', inputNodeCenterX, inputNodeCenterY);

	context.beginPath();
	context.arc(hiddenNodeTopCenterX, hiddenNodeTopCenterY, nodeRadius, 0, 2 * Math.PI, false);
	context.fill();

	drawText(context, round(hiddenNodeTopInput, 3), 'right', hiddenNodeTopCenterX - nodeRadius, hiddenNodeTopCenterY);
	drawText(context, round(hiddenNodeTopOutput, 3), 'left', hiddenNodeTopCenterX + nodeRadius, hiddenNodeTopCenterY);

	context.beginPath();
	context.moveTo(hiddenNodeTopCenterX, hiddenNodeTopCenterY);
	context.lineTo(outputNodeCenterX, outputNodeCenterY);
	context.stroke();

	let weight3TextPosition = getCenterLineTextCoordinates([hiddenNodeTopCenterX, hiddenNodeTopCenterY], [outputNodeCenterX, outputNodeCenterY])
	drawText(context, round(weight3, 3), 'center', weight3TextPosition[0], weight3TextPosition[1]);

	context.beginPath();
	context.arc(hiddenNodeBottomCenterX, hiddenNodeBottomCenterY, nodeRadius, 0, 2 * Math.PI, false);
	context.fill();

	drawText(context, round(hiddenNodeBottomInput, 3), 'right', hiddenNodeBottomCenterX - nodeRadius, hiddenNodeBottomCenterY);
	drawText(context, round(hiddenNodeBottomOutput, 3), 'left', hiddenNodeBottomCenterX + nodeRadius, hiddenNodeBottomCenterY);

	context.beginPath();
	context.moveTo(hiddenNodeBottomCenterX, hiddenNodeBottomCenterY);
	context.lineTo(outputNodeCenterX, outputNodeCenterY);
	context.stroke();

	let weight4TextPosition = getCenterLineTextCoordinates([hiddenNodeBottomCenterX, hiddenNodeBottomCenterY], [outputNodeCenterX, outputNodeCenterY])
	drawText(context, round(weight4, 3), 'center', weight4TextPosition[0], weight4TextPosition[1]);

	context.beginPath();
	context.arc(outputNodeCenterX, outputNodeCenterY, nodeRadius, 0, 2 * Math.PI, false);
	context.fill();

	drawText(context, round(outputValue, 3), 'right', outputNodeCenterX, outputNodeCenterY);
}

function drawText(context, text, align, x, y) {
	let fillStylePrevious = context.fillStyle;

	context.fillStyle = 'red';
	context.textAlign = align;

	if (window.innerWidth >= 1250)
		context.font = '20px red';
	else if (window.innerWidth >= 650 && window.innerWidth < 1250)
		context.font = '15px red';
	else
		context.font = '10px red';

	context.fillText(text, x, y);

	context.fillStyle = fillStylePrevious;
}

function getCenterLineTextCoordinates(start, end) {
	let xDiff = end[0] - start[0];
	let yDiff = end[1] - start[1];

	let xPosition = xDiff / 2;
	let yPosition = start[1] + yDiff / 2;

	return [start[0] + xPosition, yPosition];
}

function forwardPass() {
	function sigmoid(x) {
		return 1 / (1 + Math.exp(-x));
	}

	$('#input-value-details').text('Input Value: \\(' + round(inputValue, 4) + '\\)');

	hiddenNodeTopInput = round(inputValue * weight1, 4);
	hiddenNodeBottomInput = round(inputValue * weight2, 4);

	$('#input-to-top-hidden-node-details').text('\\(' + inputValue + ' \\times ' + weight1 + ' = ' + hiddenNodeTopInput + '\\)');
	$('#input-to-bottom-hidden-node-details').text('\\(' + inputValue + ' \\times ' + weight2 + ' = ' + hiddenNodeBottomInput + '\\)');

	hiddenNodeTopOutput = round(sigmoid(hiddenNodeTopInput), 4);
	hiddenNodeBottomOutput = round(sigmoid(hiddenNodeBottomInput), 4);

	$('#output-of-top-hidden-node-details').text('\\(\\frac{1}{1 + e^{- ' + hiddenNodeTopInput + '}} = ' + hiddenNodeTopOutput + '\\)');
	$('#output-of-bottom-hidden-node-details').text('\\(\\frac{1}{1 + e^{- ' + hiddenNodeBottomInput + '}} = ' + hiddenNodeBottomOutput + '\\)');

	outputNodeInputFromTopHiddenNode = round(hiddenNodeTopOutput * weight3, 4);
	outputNodeInputFromBottomHiddenNode = round(hiddenNodeBottomOutput * weight4, 4);

	$('#input-to-output-node-from-hidden-top-node-details').text('\\(' + hiddenNodeTopOutput + ' \\times ' + weight3  + ' = ' + outputNodeInputFromTopHiddenNode + '\\)');
	$('#input-to-output-node-from-hidden-bottom-node-details').text('\\(' + hiddenNodeBottomOutput + ' \\times ' + weight4  + ' = ' + outputNodeInputFromBottomHiddenNode + '\\)');

	inputToOutputNode = round(outputNodeInputFromTopHiddenNode + outputNodeInputFromBottomHiddenNode, 4);

	$('#final-input-to-output-node-details').text('\\(' + outputNodeInputFromTopHiddenNode + ' \\times ' + outputNodeInputFromBottomHiddenNode + ' = ' + inputToOutputNode + '\\)');

	outputValue = inputToOutputNode;

	$('#output-of-output-node-details').text('\\(' + outputValue + '\\)');

	MathJax.typeset();
}

function backwardPass() {
	error = round(targetOuput - outputValue, 4);

	$('#error').text('\\(' + targetOuput + '-' + outputValue + ' = ' + error + '\\)');

	mse = round(Math.pow(error, 2), 4);

	$('#mse').text('\\(0.5 \\times (' + error + ')^2 = ' + mse + '\\)');

	dMSEdO = -error;

	$('#dMSEdO').text('\\(2 \\times 0.5 \\times (' + targetOuput + '-' + outputValue + ')^1 \\times ' + -outputValue + ' = ' + dMSEdO + '\\)');

	dMSEdW3 = round(dMSEdO * hiddenNodeTopOutput, 4);
	dMSEdW4 = round(dMSEdO * hiddenNodeBottomOutput, 4);

	$('#dMSEdW3').text('\\(\\frac{\\partial MSE}{\\partial Out} \\times ' + hiddenNodeTopOutput + ' = ' + dMSEdW3 + '\\)');
	$('#dMSEdW4').text('\\(\\frac{\\partial MSE}{\\partial Out} \\times ' + hiddenNodeBottomOutput + ' = ' + dMSEdW4 + '\\)');

	dMSEdHNTO = round(dMSEdO * weight3, 4);
	dMSEdHNBO = round(dMSEdO * weight4, 4);

	$('#dMSEdHNTO').text('\\(\\frac{\\partial MSE}{\\partial Out} \\times ' + weight3 + ' = ' + dMSEdHNTO + '\\)');
	$('#dMSEdHNBO').text('\\(\\frac{\\partial MSE}{\\partial Out} \\times ' + weight4 + ' = ' + dMSEdHNBO + '\\)');

	dMSEdHNTI = round(dMSEdHNTO * (hiddenNodeTopOutput * (1 - hiddenNodeTopOutput)), 4);
	dMSEdHNBI = round(dMSEdHNBO * (hiddenNodeBottomOutput * (1 - hiddenNodeBottomOutput)), 4);

	$('#dMSEdHNTI').text('\\(\\frac{\\partial MSE}{\\partial HNTO} \\times (' + hiddenNodeTopOutput + ' \\times (1 - ' + hiddenNodeTopOutput + '))' + ' = ' + dMSEdHNTI + '\\)');
	$('#dMSEdHNBI').text('\\(\\frac{\\partial MSE}{\\partial HNBO} \\times ' + hiddenNodeBottomOutput + ' \\times (1 - ' + hiddenNodeBottomOutput + '))' + ' = ' + dMSEdHNBI + '\\)');

	dMSEdW1 = round(dMSEdHNTI * inputValue, 4);
	dMSEdW2 = round(dMSEdHNBI * inputValue, 4);

	$('#dMSEdW1').text('\\(\\frac{\\partial MSE}{\\partial HNTI} \\times ' + inputValue + ' = ' + dMSEdW1 + '\\)');
	$('#dMSEdW2').text('\\(\\frac{\\partial MSE}{\\partial HNBI} \\times ' + inputValue + ' = ' + dMSEdW2 + '\\)');

	MathJax.typeset();
}

function updateWeights() {
	let prevW1 = weight1;
	let prevW2 = weight2;
	let prevW3 = weight3;
	let prevW4 = weight4;

	weight1 = round(weight1 - learning_rate * dMSEdW1, 4);
	weight2 = round(weight2 - learning_rate * dMSEdW2, 4);
	weight3 = round(weight3 - learning_rate * dMSEdW3, 4);
	weight4 = round(weight4 - learning_rate * dMSEdW4, 4);

	$('#w1-update').text('\\(' + prevW1 + '-' + learning_rate + '\\times' + dMSEdW1 + ' = ' + weight1 + '\\)');
	$('#w2-update').text('\\(' + prevW2 + '-' + learning_rate + '\\times' + dMSEdW2 + ' = ' + weight2 + '\\)');
	$('#w3-update').text('\\(' + prevW3 + '-' + learning_rate + '\\times' + dMSEdW3 + ' = ' + weight3 + '\\)');
	$('#w4-update').text('\\(' + prevW4 + '-' + learning_rate + '\\times' + dMSEdW4 + ' = ' + weight4 + '\\)');

	MathJax.typeset();

	updateTextFields();
}

function round(number, decimals) {
	if (typeof number != 'number')
		return number;

	let multiplier = Math.pow(10, decimals);

	return Math.round((number + Number.EPSILON) * multiplier) / multiplier;
}
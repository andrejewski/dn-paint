(function() {

var sidebarEl = document.querySelector('.Content.OtherContent'),
	headerEl = document.getElementById('CoverPicture'),
	portraitEl = document.getElementById('ProfilePicture');

function toArray(list) {
	return Array.prototype.slice.call(list, 0);
}

function getCellImage(cell) {
	return cell.parentElement.parentElement;
}

function getCellImageCoords(cell) {
	var row = cell.parentElement,
		img = row.parentElement;
	return [
		toArray(img.children).indexOf(row),
		toArray(row.children).indexOf(cell)
	];
}

function getImageCell(image, rowIndex, colIndex) {
	var row = image.children[rowIndex];
	if(!row) return null; // throw new Error("Pixel Row #"+rowIndex+" not found, yet requested.");
	var col = row.children[colIndex];
	if(!col) return null; // throw new Error("Pixel Col #"+colIndex+" not found, yet requested.");
	return col;
}

function paintCellOfImage(context) {
	return function(cell, color) {
		if(!(value instanceof window.Element)) {
			var cell = getImageCell(context, cell[0], cell[1]);
		}
		if(cell) cell.style.backgroundColor = color;
	}
}

var paintHeaderCell = paintCellOfImage(headerEl),
	paintPortraitCell = paintCellOfImage(portraitEl);

function walkCellArea(cell, callback) {
	var image = getCellImage(cell),
		coords = getCellImageCoords(cell),
		row = coords[0],
		col = coords[1];

	walkNextArea = function() {
		var topCell = getImageCell(image, row + 1, col),
			leftCell = getImageCell(image, row, col - 1),
			bottomCell = getImageCell(image, row - 1, col),
			rightCell = getImageCell(image, row, col + 1);

		if(topCell) walkCellArea(topCell, callback);
		if(leftCell) walkCellArea(leftCell, callback);
		if(bottomCell) walkCellArea(bottomCell, callback);
		if(rightCell) walkCellArea(rightCell, callback);
	}

	callback(cell, walkNextArea);
}

function rgbTupleToString(tuple) {
	return 'rgb('+tuple.join(',')+')';
}

function rgbStringToTuple(string) {
	var values = string.split(',');
	values[0] = values[0].slice(4);
	values[2] = values[2].slice(0, values[2].indexOf(')'));
	return values.map(Number);
}

function getAllowedColors() {
	return JSON.parse(headerEl.dataset.acceptableColors);
}

function newElement(tag, classes) {
	var dom = document.createElement(tag);
	if(Array.isArray(classes)) classes = classes.join(' ');
	dom.className = classes;
	return dom;
}

function onLeftClick(target, callback) {
	target.onclick = callback;
}

function onRightClick(target, callback) {
	target.oncontextmenu = function(e) {
		e.preventDefault();
		callback(e);
	}
}

function PaintController() {
	this.palette = getAllowedColors();
	this.primaryColor = this.palette[0];
	this.secondaryColor = this.palette[1];

	this.primaryColorView = new ColorView(this.primaryColor);
	this.secondaryColorView = new ColorView(this.secondaryColor);

	this.paletteView = new PaletteView(this);
	this.toolsetView = new ToolsetView(this);

	this.observeCanvases();
}

PaintController.prototype.setPrimaryColor = function(color) {
	this.primaryColor = color;
	this.primaryColorView.setColor(color);
}

PaintController.prototype.setSecondaryColor = function(color) {
	this.secondaryColor = color;
	this.secondaryColorView.setColor(color);
}

PaintController.prototype.observeCanvases = function() {
	var _this = this;
	[headerEl, portraitEl].forEach(function(canvas) {
		var handleEvent = handleCellEvent.bind(null, _this, canvas);
		canvas.addEventListener('click', function(e) {
			canvas.dragging = true;
			handleEvent(e);
		});
		/* canvas.addEventListener('contextmenu', function(e) {
			canvas.dragging = true;
			e.preventDefault();
			handleEvent(e);
		});
		canvas.addEventListener('mouseup', function(e) {
			canvas.dragging = false;
			handleEvent(e);
		});
		canvas.addEventListener('mouseover', handleEvent); */
	});
}

function handleCellEvent(ctrl, canvas, event) {
	if(!(canvas.dragging && isCellEvent(event))) return;
	var cell = event.target;
	reverseDNColoring(cell);
	if(event.button === 0) { // left
		ctrl.toolsetView.delegate(cell, ctrl.primaryColor, true);
	} else if(event.button === 2) { // right
		ctrl.toolsetView.delegate(cell, ctrl.secondaryColor, false);
	}
}

function isCellEvent(event) {
	return event.target.classList.contains('Cell');
}

function reverseDNColoring(cell) {
	// reverse DN's own color change
	var oldColor = decrementColor(rgbStringToTuple(getCellColor(cell)));
	setCellColor(cell, oldColor);
}

PaintController.prototype.toElement = function() {
	var container = document.createElement('div'),
		region = function(nodes) {
			var region = document.createElement('div');
			region.classList.add('dn-paint-region');
			for(node in nodes) {
				if(nodes.hasOwnProperty(node)) {
					region.appendChild(nodes[node]);
				}
			}
			return region;
		}

	container.classList.add('dn-paint-pane');

	container.appendChild(region([
		this.primaryColorView.toElement(),
		this.secondaryColorView.toElement()
	]));

	container.appendChild(region([this.paletteView.toElement()]));
	container.appendChild(region([this.toolsetView.toElement()]));

	return container;
}

function ColorView(color, leftClickNext, rightClickNext) {
	this.el = document.createElement('div');
	this.el.classList.add('dn-paint-color-view');
	this.setColor(color);
	this.bindClick(leftClickNext, rightClickNext);
}

ColorView.prototype.setColor = function(color) {
	this.color = color;
	this.el.style.backgroundColor = rgbTupleToString(color);
}

ColorView.prototype.bindClick = function(leftNext, rightNext) {
	var _this = this;
	if(leftNext) onLeftClick(this.el, function(e) {
		leftNext(e, _this.color);
	});
	if(rightNext) onRightClick(this.el, function(e) {
		rightNext(e, _this.color);
	});
}

ColorView.prototype.toElement = function() {
	return this.el;
}

function PaletteView(ctrl) {
	this.ctrl = ctrl;
}

PaletteView.prototype.setPrimaryColor = function(e, color) {
	this.ctrl.setPrimaryColor(color);
}

PaletteView.prototype.setSecondaryColor = function(e, color) {
	this.ctrl.setSecondaryColor(color);
}

PaletteView.prototype.toElement = function() {
	var colors = this.ctrl.palette,
		palette = newElement('div', 'dn-paint-palette'),
		left = this.setPrimaryColor.bind(this),
		right = this.setSecondaryColor.bind(this);
	colors.forEach(function(color) {
		palette.appendChild(new ColorView(color, left, right).toElement());
	});
	return palette;
}

function ToolsetView(ctrl) {
	this.drawTool = new Tool('draw', function(cell, color) {
		setCellColor(cell, color);
	});

	this.fillTool = new Tool('fill', function(originCell, color) {
		var changingColor = getCellColor(originCell);
		walkCellArea(originCell, function(cell, next) {
			if(getCellColor(cell) === changingColor) {
				setCellColor(cell, color);
				next();
			}
		});
	});

	this.clearTool = new Tool('clear', function(originCell, color) {
		getAllCellsWithCell(originCell).forEach(function(cell) {
			setCellColor(cell, [255,255,255]);
		});
	});

	this.nyanTool = new Tool('nyan', function(originCell, color, isLeftClick) {
		if(isLeftClick) {
			color = incrementColor(color);
			ctrl.setPrimaryColor(color);
			setCellColor(originCell, color);
		} else {
			color = decrementColor(color);
			ctrl.setPrimaryColor(color);
			setCellColor(originCell, color);
		}
	});

	this.selectTool(this.drawTool);
}

ToolsetView.prototype.selectTool = function(tool) {
	var el;
	if(this.currentTool && this.currentTool != tool) {
		el = this.currentTool.toElement();
		el.classList.remove('dn-paint-tool-selected');
	}
	this.currentTool = tool;
	el = this.currentTool.toElement();
	el.classList.add('dn-paint-tool-selected');
}

ToolsetView.prototype.delegate = function(cell, color, isLeftClick) {
	this.currentTool.use(cell, color, isLeftClick);
}

ToolsetView.prototype.toElement = function() {
	var _this = this,
		toolset = newElement('div', 'dn-paint-toolset');

	[this.drawTool, this.fillTool, this.clearTool, this.nyanTool].forEach(function(tool) {
		var el = tool.toElement();
		onLeftClick(el, function(e) {
			_this.selectTool(tool);
		});
		toolset.appendChild(el);
	});

	return toolset;
}

function getAllCellsWithCell(cell) {
	var image = getCellImage(cell);
	return toArray(image.children).reduce(function(all, row) {
		return all.concat(toArray(row.children));
	}, []);
}

function setCellColor(cell, color) {
	cell.style.backgroundColor = rgbTupleToString(color);
}

function getCellColor(cell) {
	return cell.style.backgroundColor;
}

function incrementColor(color) {
	var colors = getAllowedColors(),
		index = colors.map(toString).indexOf(toString(color));
	if(index === colors.length - 1) index = -1;
	return colors[index + 1];
}

function toString(o) {
	return o.toString();
}

function decrementColor(color) {
	var colors = getAllowedColors(),
		index = colors.map(toString).indexOf(toString(color));
	if(index === 0) index = colors.length;
	return colors[index - 1];
}

function Tool(name, operation) {
	this.name = name;
	this.operation = operation;

	this.el = newElement('div', 'dn-paint-tool');
	this.el.innerText = this.name;
}

Tool.prototype.use = function() {
	this.operation.apply(null, arguments);
}

Tool.prototype.toElement = function() {
	return this.el;
}


// execute
var paintController = new PaintController();
sidebarEl.appendChild(paintController.toElement());

}).call(this);
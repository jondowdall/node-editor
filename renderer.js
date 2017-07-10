

var debug;

function initialise() {
    draw();

    var canvas = document.getElementById('canvas');
    canvas.style.border = '1px solid black';
    debug = document.getElementById('debug');
}

function canvasClick(event) {
    var canvas = document.getElementById('canvas');
    var rect = canvas.getBoundingClientRect();
    document.getElementById('x2').value = event.clientX - rect.left;
    document.getElementById('y2').value = event.clientY - rect.top;
    update();
}

function update() {
    if (!document.getElementById('animate').checked) {
        draw();
    }
}

function updateAnimation() {
    draw();
    if (document.getElementById('animate').checked) {
        window.requestAnimationFrame(updateAnimation);
    }
}

function draw() {
    var canvas = document.getElementById('canvas');

    nodeEditor.addCanvas(canvas);

    var button = document.getElementById('load');
    button.addEventListener('click', loadAll);
    button = document.getElementById('save');
    button.addEventListener('click', saveAll);
    button = document.getElementById('save-as');
    button = document.getElementById('clear');
    button.addEventListener('click', clear);
}

function clear() {
    var page = document.getElementById('page');
    nodeEditor.nodes = [];
    nodeEditor.edges = [];
    nodeEditor.currentMenu = null;
    nodeEditor.transform = [1, 0, 0, 1, 0, 0];
    page.innerHTML = '';
    nodeEditor.drawAll();
}

function getSerialiser() {3
    var serialised = {};

    return function(key, value) {
        if (value && value.id && serialised[value.id]) {
            return {reference: value.id};
        } else if (value && value.id) {
            serialised[value.id] = value;
            return value;
        } else {
            return value;
        }
    };
}

function saveAll() {
    save(JSON.stringify(nodeEditor, getSerialiser()), 'current.json');
    save(JSON.stringify(nodeEditor, getSerialiser(), 2), 'current_indented.json');
}

function getDeserialiser() {
    var referenced = {};
    var references = [];

    return {parser: function(key, value) {
        if (value) {
            if (value.reference) {
                references.push({object: this, key: key, value: value});
            }
           if (value.id) {
                referenced[value.id] = value;
            }
        }
        return value;
    },
    references: references,
    referenced: referenced};
}

function parse(definition) {
    var page = document.getElementById('page');
    var deserialiser = getDeserialiser();
    var detail = JSON.parse(definition);

    nodeEditor.transform = detail.transform;
    nodeEditor.currentMenu = detail.currentMenu;
    detail.nodes.forEach(function(node, index, all) {
        node.subject = actions[node.subject.type]();
        nodeEditor.addNode(node);
    });
    detail.edges.forEach(function(edge, index, all) {nodeEditor.addEdge(edge)});
    nodeEditor.drawAll();
}

/*****************************************************************************/

function Observed() {
    this.observers = [];
}

Observed.prototype.add = function(node) {
    this.observers.push(node);
}

Observed.prototype.remove = function(node) {
    var pos = this.observers.indexOf(node);
    while (pos !== -1) {
        this.observers.splice(pos, 1);
        pos = this.observers.indexOf(node);
    }
}

Observed.prototype.notify = function() {
    this.observers.forEach(function(node) {node.update();});
}

/*****************************************************************************/
function notify() {
    this.outputs.forEach(function(output) {
        output.observers.notify();
    });        
}

function Input(node, name, type) {
    this.node = node;
    this.name = name;
    this.type = type;
    this.observers = new Observed();
    this.value = undefined;
}

Input.prototype.setSource = function(source) {
    if (this.source && this.source !== source) {
        this.source.observers.remove(this.node);
    }
    this.source = source;
    source.observers.add(this.node);
    this.node.update();
}

Input.prototype.toJSON = function() {
    var result = clone(this);
    result.create = 'createInput';
    return result;
}

function createInput(spec) {
    return new Input(spec.node, spec.name, spec.type);
}

function Output(name, type) {
    this.name = name;
    this.type = type;
    this.observers = new Observed();
    this.value = undefined;
    this.id = guid();
}

Output.prototype.get = function() {
    return this.value;
}

function guid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function addTextBox() {
    var page = document.getElementById('page');
    var domNode = document.createElement('textarea');
    var node = {name: 'Text Box', type: 'Text Box'};
    node.inputs = [new Input(node, 'String')];
    node.outputs = [new Output('String')];
    node.id = guid();

    page.appendChild(domNode);
    domNode.id = 'widget-' + node.id;
    node.widgetId = domNode.id;
    node.update = function () {
        var value = node.inputs[0].default;
        if (node.inputs[0].source) {
            value = node.inputs[0].source.get();
        }
        domNode.value = value;
        this.outputs[0].value = value;
        node.notify();
    }
    node.set = function () {
        this.outputs[0].value = domNode.value;
        node.notify();
    }
    node.notify = notify;
    node.toJSON = toJSON;
    node.setInput = setInput;

    domNode.addEventListener('blur', function() {node.set()});
    return node;
}

function addTextEntry() {
    var page = document.getElementById('page');
    var domNode = document.createElement('input');
    var node = {name: 'Text Entry', type: 'Text Entry'};
    node.inputs = [new Input(node, 'String')];
    node.outputs = [new Output('String')];
    node.id = guid();

    domNode.type = 'text';
    page.appendChild(domNode);
    domNode.id = 'widget-' + node.id;
    node.widgetId = domNode.id;

    node.update = function () {
        var value = node.inputs[0].default;
        if (node.inputs[0].source) {
            value = node.inputs[0].source.get();
        }
        domNode.value = value;
        this.outputs[0].value = value;
        node.notify();
    }
    node.set = function () {
        this.outputs[0].value = domNode.value;
        node.notify();
    }
    node.notify = notify;
    node.toJSON = toJSON;
    node.setInput = setInput;

    domNode.addEventListener('blur', function() {node.set()});
    return node;
}

function addParagraph() {
    var page = document.getElementById('page');
    var domNode = document.createElement('p');
    var node = {name: 'Paragraph', type: 'Paragraph'};
    node.inputs = [new Input(node, 'HTML')];
    node.outputs = [new Output('HTML')];
    node.id = guid();

    page.appendChild(domNode);
    domNode.id = 'widget-' + node.id;
    node.widgetId = domNode.id;

    node.update = function () {
        var value = node.inputs[0].default;
        if (node.inputs[0].source) {
            value = node.inputs[0].source.get();
        }
        node.value = value;
        domNode.innerHTML = value;
        this.outputs[0].value = value;
        node.notify();
    }
    node.notify = notify;
    node.toJSON = toJSON;
    node.setInput = setInput;

    domNode.addEventListener('focus', function() {
        nodeEditor.activeNode = node;
    });

    return node;
}

function addPreformatted() {
    var page = document.getElementById('page');
    var domNode = document.createElement('pre');
    var node = {name: 'Preformatted', type: 'Preformatted'};
    node.inputs = [new Input(node, 'HTML')];
    node.outputs = [new Output('HTML')];
    node.id = guid();

    page.appendChild(domNode);
    domNode.id = 'widget-' + node.id;
    node.widgetId = domNode.id;

    node.update = function () {
        var value = node.inputs[0].default;
        if (node.inputs[0].source) {
            value = node.inputs[0].source.get();
        }
        node.value = value;
        domNode.innerHTML = value;
        this.outputs[0].value = value;
        node.notify();
    }
    node.notify = notify;
    node.toJSON = toJSON;
    node.setInput = setInput;

    domNode.addEventListener('focus', function() {
        nodeEditor.activeNode = node;
    });

    return node;
}


function clone(obj) {
    var copy = {};
    for(var a in obj) {
        if (obj.hasOwnProperty(a)) {
            copy[a] = obj[a];
        }
    }
    return copy;
}

function split(string, separator) {
    if (string && separator) {
        this.outputs[0].value = string.split(separator);
    }
}

function join(array, separator) {
    if (array && separator) {
        this.outputs[0].value = array.join(separator);
    }
}

function replace(string, pattern, replacement) {
    if (string && pattern && replacement) {
        this.outputs[0].value = string.replace(pattern, replacement);
    }
}

function regexp(string, ignoreCase, global) {
    var flags = '';
    string = string || '';
    flags += ignoreCase ? 'i' : '';
    flags += global ? 'g' : '';
    this.outputs[0].value = new RegExp(string, flags);
}

function makeSetSource(node) {
    return function setSource(source) {
        if (this.source && this.source !== source) {
            this.source.observers.remove(node);
        }
        this.source = source;
        source.observers.add(node);
        node.update();
    };
}

function updateNode() {
    var inputs = this.inputs.map(function (input, index, all) {
        if (input.source && input.source.get) {
            return input.source.get();
        }
        return input.default;
    });
    this.action.apply(this, inputs);
    this.notify();
}

function toJSON() {
    return {type: this.type};
}

function setInput(index, sourceObject, sourceIndex) {
    this.inputs[index].setSource(sourceObject.outputs[sourceIndex]);
}

function makeFunction(map, action, index, all) {
    map[action.name] = function() {
        var node = Object.create(action);
        node.inputs = node.inputs.map(function(input, index, all) {
            return new Input(node, input.name, input.type);
        });
        node.outputs = action.outputs.map(function(output, index, all) {
            return new Output(output.name, output.type);
        });
        node.update = updateNode;
        node.notify = notify;
        node.toJSON = toJSON;
        node.setInput = setInput;
        node.name = action.name;
        node.type = action.name;
        return node;
    };
    return map;
}


var methods = [
    {type: 'String',
     methods: [
        {name: 'Split', action: 'split', inputs: [{name: 'separator', title: 'Separator:', type: 'regexp'}], outputs: [{name: 'Array'}]},
        {name: 'Prefix', action: 'prefix', inputs: [{name: 'text', type: 'text'}], outputs: [{name: 'String'}], icon: 'stock_insert-header.png'},
        {name: 'Suffix', action: 'suffix', inputs: [{name: 'text', type: 'text'}], outputs: [{name: 'String'}], icon: 'stock_insert-footer.png'},
    ]},
    {type: 'Array',
     methods: [
        {name: 'Join', action: 'join', inputs: [{name: 'separator', title: 'Separator:', type: 'string'}], outputs: [{name: 'String'}]},
        {name: 'Grep', action: 'grep', inputs: [{name: 'pattern', title: 'Pattern:', type: 'regexp', initialisation: {expression: '.*'}}], outputs: [{name: 'Array'}], icon: 'edit-find.png'},
        {name: 'Map', action: 'map', inputs: [{name: 'process', title: 'Process:', type: 'function'}], outputs: [{name: 'Array'}]},
    ]},
    {type: 'Object',
     methods: []}
];

var actions = [
    {name: 'Load', action: 'load', inputs: [{name: 'location', title: 'Path:', type: 'string'},
                                          {name: 'process', title: 'Process:', type: 'function'}],
                                   outputs: [{name: 'String'}, {name: 'Status'}], icon: 'document-open.png'},
    {name: 'Save', action: 'save', inputs: [{name: 'String'}, {name: 'location', title: 'Path:', type: 'string'}], outputs: [{name: 'result'}], icon: 'document-save.png'},
    {name: 'Join', action: join, inputs: [{name: 'Array'}, {name: 'separator', title: 'Separator:', type: 'string'}], outputs: [{name: 'String'}]},
    {name: 'Map', action: 'map', inputs: [{name: 'Array'}, {name: 'process', title: 'Process:', type: 'function'}], outputs: [{name: 'Array'}]},
    {name: 'Split', action: split, inputs: [{name: 'string'}, {name: 'separator', title: 'Separator:', type: 'regexp'}], outputs: [{name: 'Array'}]},
    {name: 'Grep', action: 'grep', inputs: [{name: 'Array'}, {name: 'pattern', title: 'Pattern:', type: 'regexp', initialisation: {expression: '.*'}}], outputs: [{name: 'Array'}], icon: 'edit-find.png'},
    {name: 'Prefix', action: 'prefix', inputs: [{type: 'String'}, {name: 'text', type: 'text'}], outputs: [{name: 'String'}], icon: 'stock_insert-header.png'},
    {name: 'Suffix', action: 'suffix', inputs: [{type: 'String'}, {name: 'text', type: 'text'}], outputs: [{name: 'String'}], icon: 'stock_insert-footer.png'},
    {name: 'Javascript', action: 'jsFunction', inputs: [{name: 'text', type: 'text'}], outputs: [], icon: 'stock_insert-footer.png'},
    {name: 'Replace', action: replace, inputs: [{name: 'String'}, {name: 'pattern', title: 'Pattern:', type: 'regexp', initialisation: {expression: '.*'}},
                                                {name: 'replacement', title: 'Replacement:', type: 'string', initialisation: {value: '$&'}}],
                                      outputs: [{name: 'String'}], icon: 'edit-find-replace.png'},
    {name: 'Regular Expression', action: regexp,
     inputs: [{name: 'String'},
              {name: 'Ignore Case', type: 'boolean'},
              {name: 'Global', type: 'boolean'}],
               outputs: [{name: 'RegExp'}]},
    {name: 'If', action: 'conditional', inputs: [{name: 'test', type: 'boolean'},
                                               {name: 'onTrue', title: 'Then:', type: 'function'},
                                               {name: 'onFalse', title: 'Else:', type: 'function'}]}];

actions = actions.reduce(makeFunction, {});

actions['Text Entry'] = addTextEntry;
actions['Text Box'] = addTextBox;
actions['Paragraph'] = addParagraph;
actions['Preformatted'] = addPreformatted;


var widgetMenu = {
    items: [
        {text: 'Back'},
        {text: 'Text Entry', action: addTextEntry},
        {text: 'Text Box', action: addTextBox},
        {text: 'Paragraph', action: addParagraph},
        {text: 'Preformatted', action: addPreformatted}]
};

var menu = {
    items: [{text: 'Add Widget...', menu: widgetMenu},
            {text: 'Load', action: actions['Load']},
            {text: 'Save', action: actions['Save']},
            {text: 'Join', action: actions['Join']},
           // {text: 'Map', action: actions['Map']},
            {text: 'Split', action: actions['Split']},
           // {text: 'Grep', action: actions['Grep']},
           // {text: 'Prefix', action: actions['Prefix']},
           // {text: 'Suffix', action: actions['Suffix']},
           // {text: 'Javascript', action: actions['Javascript']},
            {text: 'Replace', action: actions['Replace']},
            {text: 'Regular Expression', action: actions['Regular Expression']},
            {text: 'If', action: actions['If']}]};

widgetMenu.items[0].menu = menu;

function makeMethod(method) {
    return function() {
        this[method]();
    };
}

methods.forEach(function(object, index, all) {
    var methodMenu = {
    items: object.methods.map(function(method, index, all) {
        return {text: method.name, action: makeMethod(method.action)};
    })};
    methodMenu.items.unshift({text: 'Back', menu: menu});
    menu.items.push({text: object.type + '...', menu: methodMenu});
});

function addNode(action) {
    if (action.action) {
        return action.action();
    }
    var page = document.getElementById('page');
    var domNode;
    var node = {name: action.name, widget: action.widget, ƒaction: action.action, inputs: action.inputs, outputs: action.outputs};
    if (action.widget && page) {
        domNode = document.createElement(action.widget);
        page.appendChild(domNode);
        node.id = guid();
        domNode.id = 'widget-' + node.id;
        node.widgetId = domNode.id;
    }
    return node;
}


function loadAll() {
    load('current.json');
}

function load(path) {
    var request = new XMLHttpRequest();
    request.open('GET', location.href + path);
    request.setRequestHeader('Content-type','application/json; charset=utf-8');
    request.send();
    request.onload = function() {
        if (request.readyState == 4 && request.status == '200') {
            parse(request.responseText);
        }
    };
}

function save(text, path) {
    var request = new XMLHttpRequest();
    request.open('PUT', location.href + path);
    request.setRequestHeader('Content-type','application/json; charset=utf-8');
    request.send(text);
    request.onload = function() {
        if (request.readyState == 4 && request.status == '201') {
            console.log('Sent data');
        }
    };
}


var nodeEditor = (function nodeEdit() {
    var my = {transform: [1, 0, 0, 1, 0, 0],
              nodes: [],
              edges: [],
              currentMenu: null};

    var canvases = [];
    var lineHeight = 25;
    var endPointSize = 5;
    var endPointSpace = 10;
    var radius = 10;
    var nodeIds = {};

    var lastTouch;

    my.addCanvas = function(canvas) {
        if (canvas) {
            canvas.width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
            canvas.height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) * 0.75;

            canvas.addEventListener('mousedown', startAction);
            canvas.addEventListener('touchstart', startTouch);
            canvases.push(canvas);
            this.drawAll();
        }
    }

    my.addNode = function(subject, x, y) {
        if (x === undefined && y === undefined) {
            if (subject.id) {
                nodeIds[subject.id] = subject;
            }
            my.nodes.push(subject);
            return subject;
        }
        var ctx = canvases[0].getContext('2d');
        var radius = 10;
        var count = Math.max(subject.inputs.length, subject.outputs.length);
        var height = lineHeight + endPointSpace + count * (endPointSize * 2 + endPointSpace) + radius;
        var width = 100;
        var inputWidth = subject.inputs.reduce(function(w, input, i, all) {
            var metrics = ctx.measureText(input.name);
            return w > metrics.width ? w : metrics.width;
        }, 0);
        var outputWidth = subject.inputs.reduce(function(w, input, i, all) {
            var metrics = ctx.measureText(input.name);
            return w > metrics.width ? w : metrics.width;
        }, 0);
        var newNode;
        if (subject.id === undefined) {
            subject.id = guid();
        }
        width = Math.max(width, inputWidth + outputWidth + endPointSize * 2);
        newNode = {x: x, y: y, width: width, height: height, transform: [1, 0, 0, 1, x, y], radius: radius, subject: subject};
        newNode.id = guid();
        my.nodes.push(newNode);
        return newNode;
    }

    my.addEdge = function(newEdge) {
        if (newEdge.node1.reference) {
            newEdge.node1 = nodeIds[newEdge.node1.reference];
        }
        if (newEdge.node2.reference) {
            newEdge.node2 = nodeIds[newEdge.node2.reference];
        }
        this.edges.push(newEdge);
        if (newEdge.node2.subject.setInput) {
            newEdge.node2.subject.setInput(newEdge.index2, newEdge.node1.subject, newEdge.index1);
        }   
    }

    function getInputPosition(node, index) {
        return {x: 0,
                y: lineHeight + endPointSpace + index * (endPointSize * 2 + endPointSpace)};
    }

    function getOutputPosition(node, index) {
        return {x: node.width,
                y: node.height - node.radius - endPointSpace - (node.subject.outputs.length - index - 1) * (endPointSize * 2 + endPointSpace)};
    }

    my.drawAll = function drawAll() {
        canvases.forEach(draw);
    }

    function getTransform(xs1, ys1, xs2, ys2, xe1, ye1, xe2, ye2) {
        var d = (xs1 - xs2) * (xs1 - xs2) + (ys2 - ys1) * (ys2 - ys1);
        var c = ((ye2 - ye1) * (ys2 - ys1) - (xe2 - xe1) * ( xs1 - xs2)) / d;
        var s = ((xe1 - xe2) * (ys1 - ys2) - (xs1 - xs2) * (ye1 - ye2)) / d;
        var tx = xe1 - c * xs1 - s * ys1;
        var ty = ye1 + s * xs1 - c * ys1;
        return [c, -s, s, c, tx, ty];
    }

    function getTransform2(start1, start2, end1, end2) {
        var d = (start1.x - start2.x) * (start1.x - start2.x) + (start2.y - start1.y) * (start2.y - start1.y);
        var c = ((end2.y - end1.y) * (start2.y - start1.y) - (end2.x - end1.x) * (start1.x - start2.x)) / d;
        var s = ((end1.x - end2.x) * (start1.y - start2.y) - (start1.x - start2.x) * (end1.y - end2.y)) / d;
        var tx = end1.x - c * start1.x - s * start1.y;
        var ty = end1.y + s * start1.x - c * start1.y;
        return [c, -s, s, c, tx, ty];
    }

    function mult(m1, m2) {
        return [m1[0] * m2[0] + m1[2] * m2[1],
                m1[1] * m2[0] + m1[3] * m2[1],
                m1[0] * m2[2] + m1[2] * m2[3],
                m1[1] * m2[2] + m1[3] * m2[3],
                m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
                m1[1] * m2[4] + m1[3] * m2[5] + m1[5]];
    }

    function applyTransform(matrix, x, y) {
        if (y === undefined) {
            y = x.y;
            x = x.x;
        }
        
        return {x: matrix[0] * x + matrix[2] * y + matrix[4],
                y: matrix[1] * x + matrix[3] * y + matrix[5]};
    }

    function inverseTransform(matrix, x, y) {
        var d = matrix[0] * matrix[0] + matrix[1] * matrix[1];
        if (y === undefined) {
            y = x.y;
            x = x.x;
        }
        
        return {x: (matrix[0] * x + matrix[1] * y - matrix[0] * matrix[4] - matrix[1] * matrix[5]) / d,
                y: (matrix[2] * x + matrix[0] * y + matrix[1] * matrix[4] - matrix[0] * matrix[5]) / d};
    }

    function canvasPosition(x, y) {
        return inverseTransform(my.transform, x, y);
    }
    
    function screenToLocal(frame, x, y) {
        var pos;
        if (y === undefined) {
            y = x.y;
            x = x.x;
        }

        if (frame.frame) {
            pos = screenToLocal(frame.frame, x, y);
        } else {
            pos = inverseTransform(my.transform, x, y);
        }
        return inverseTransform(frame.transform, pos);
    }

    function draw(canvas) {
        var ctx = canvas.getContext('2d');

        function drawNode(node, index, all) {
            var metrics;
            var y = 0;
            var height = node.height;

            ctx.save();
            if (node.transform) {
                ctx.transform.apply(ctx, node.transform);
            }

            function drawInput(input, inputIndex, allInputs) {
                var position = getInputPosition(node, inputIndex);
                ctx.beginPath();
                ctx.arc(position.x, position.y, endPointSize, 0, Math.PI * 2, true);
                ctx.fill();
                ctx.stroke();
            }

            function labelInput(input, inputIndex, allInputs) {
                var position = getInputPosition(node, inputIndex);
                ctx.fillText(input.name, position.x + endPointSize, position.y + 6);
            }

            function drawOutput(output, outputIndex, allOutputs) {
                var position = getOutputPosition(node, outputIndex);
                ctx.beginPath();
                ctx.arc(position.x, position.y, endPointSize, 0, Math.PI * 2, true);
                ctx.fill();
                ctx.stroke();
            }

            function labelOutput(output, outputIndex, allOutputs) {
                var position = getOutputPosition(node, outputIndex);
                metrics = ctx.measureText(output.name);
                ctx.fillText(output.name, position.x - metrics.width - endPointSize, position.y + 6);
            }

            if (node === currentNode) {
                ctx.save();
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 10;
                ctx.shadowOffsetY = 10;
            }

            if (node.subject.widgetId) {
                ctx.fillStyle = 'rgb(255, 200, 200)';
            } else {
                ctx.fillStyle = 'rgb(200, 200, 200)';
            }
            ctx.beginPath();
            ctx.moveTo(node.radius, y);
            ctx.arcTo(node.width, y, node.width, y + node.radius, node.radius);
            ctx.arcTo(node.width, y + height, 0, y + height, node.radius);
            ctx.arcTo(0, y + height, 0, y, node.radius);
            ctx.arcTo(0, y, node.width, y, node.radius);
            ctx.stroke();
            ctx.fill();

            if (node === currentNode) {
                ctx.restore();
            }

            ctx.beginPath();
            ctx.moveTo(node.radius, y);
            ctx.arcTo(node.width, y, node.width, y + node.radius, node.radius);
            ctx.lineTo(node.width, y + lineHeight);
            ctx.lineTo(0, y + lineHeight);
            ctx.arcTo(0, y, node.width, y, node.radius);

            ctx.stroke();
            if (node === currentNode) {
                ctx.fillStyle = 'rgb(200, 255, 200)';
            } else {
                ctx.fillStyle = 'rgb(200, 200, 255)';
            }
            ctx.fill();

            ctx.fillStyle = 'rgb(255, 255, 255)';
            node.subject.inputs.forEach(drawInput);
            node.subject.outputs.forEach(drawOutput);

            ctx.fillStyle = 'rgb(10, 10, 10)';
            ctx.font = '12pt sans';
            metrics = ctx.measureText(node.subject.name);
            ctx.fillText(node.subject.name, (node.width - metrics.width) / 2, 16);
            node.subject.inputs.forEach(labelInput);
            node.subject.outputs.forEach(labelOutput);
            ctx.restore();
        }

        function drawEdge(edge, index, all) {
            var p1;
            var p2 = getInputPosition(edge.node2, edge.index2);

            if (edge.index1 === -1) {
                p1 = {x: edge.node1.width / 2, y: edge.node1.height / 2};
                p1 = applyTransform(edge.node1.transform, p1.x, p1.y);
            } else {
                p1 = getOutputPosition(edge.node1, edge.index1);
                p1 = applyTransform(edge.node1.transform, p1.x, p1.y);
            }

            p2 = applyTransform(edge.node2.transform, p2.x, p2.y);

            var cx1  = (p1.x + p2.x) / 2;
            var cx2  = (p1.x + p2.x) / 2;
            if ((p1.x + 2 * endPointSize) > p2.x) {
                cx1 = p1.x + endPointSize * 10;
                cx2 = p2.x - endPointSize * 10;
                cx1 = 2 * p1.x - p2.x;
                cx2 = 2 * p2.x - p1.x;
            }

            if (edge.index1 !== -1 || edge.node1.subject.outputs[edge.index1].type === undefined ||
                edge.node1.subject.outputs[edge.index1].type === undefined) {
                    ctx.strokeStyle = 'rgb(100, 100, 100)';
            } else if (edge.node1.subject.outputs[edge.index1].type !== edge.node1.subject.outputs[edge.index1].type) {
                    ctx.strokeStyle = 'rgb(0, 0, 0)';

            } else {
                    ctx.strokeStyle = 'rgb(255, 100, 100)';
            }

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.bezierCurveTo(cx1, p1.y, cx2, p2.y, p2.x, p2.y);
            ctx.stroke();
            if (edge.index1 === -1) {
                ctx.beginPath();
                ctx.arc(p1.x, p1.y, Math.sqrt(edge.node1.width * edge.node1.width + edge.node1.height * edge.node1.height) / 2, 0, Math.PI * 2, true);
                ctx.fill();
                ctx.stroke();
            }
        }
           
        function drawMenu(menu) {
            var height = menu.items.length * lineHeight;
            var y = radius;
            var items = Math.ceil(height / lineHeight);
            var metrics;
            var width;
            
            ctx.font = '12pt sans';
            width = menu.items.reduce(function(width, item, index, all) {
                var metrics = ctx.measureText(item.text);
                return width > metrics.width ? width : metrics.width;
            }, 0);

            width += radius * 2;
            height += radius * 2;
            menu.width = width;

            ctx.save();
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 10;
            ctx.shadowOffsetY = 10;

            ctx.beginPath();
            ctx.moveTo(menu.x + radius, menu.y);
            ctx.arcTo(menu.x + width, menu.y, menu.x + width, menu.y + radius, radius);
            ctx.arcTo(menu.x + width, menu.y + height, menu.x, menu.y + height, radius);
            ctx.arcTo(menu.x, menu.y + height, menu.x, menu.y, radius);
            ctx.arcTo(menu.x, menu.y, menu.x + width, menu.y, radius);
            ctx.stroke();
            ctx.fillStyle = 'rgb(200, 200, 200)';
            ctx.fill();
            ctx.clip();
            ctx.restore();

            ctx.fillStyle = 'rgb(10, 10, 10)';

            for (var i = 0; i < items; ++i) {
                ctx.fillText(menu.items[i].text, menu.x + 10, menu.y + y + 14);
                y += lineHeight;
            }

            ctx.restore();
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform.apply(ctx, my.transform);

        my.edges.sort(function(a, b) {return a.index1 - b.index1;});
        my.edges.forEach(drawEdge);
        my.nodes.forEach(drawNode);

        if (my.currentMenu) {
            drawMenu(my.currentMenu);
        }
    }

    function findNodes(x, y) {
        function inNode(node, index, all) {
            var pos = screenToLocal(node, x, y);
            return (pos.x > 0) && (pos.x < node.width) && (pos.y > 0) && (pos.y < node.height);
        }
        return my.nodes.filter(inNode);
    }

    function findMenuItem(x, y) {
        var index;
        var pos = inverseTransform(my.transform, x, y);
        if (my.currentMenu && pos.x > menu.x && pos.x < menu.x + menu.width) {
           index = Math.floor((pos.y - my.currentMenu.y - 10) / lineHeight);
           if (index > -1 && index < my.currentMenu.items.length) {
               return my.currentMenu.items[index];
           }
        }
        return null;
    }

    function findEndPoint(x, y, direction) {
        var endpoint;
        var d;
        var pos;
        for(var n = 0; n < my.nodes.length; ++n) {
            pos = screenToLocal(my.nodes[n], x, y);
            if (direction != 'in') {
                for (var e = 0; e < my.nodes[n].subject.inputs.length; ++e) {
                    endpoint = getInputPosition(my.nodes[n], e);
                    d = (pos.x - endpoint.x) * (pos.x - endpoint.x) + (pos.y - endpoint.y) * (pos.y - endpoint.y);
                    if (d < 4 * endPointSize * endPointSize) {
                        return {node: my.nodes[n], index: e, direction:'in'};
                    }
                }
            }
            if (direction !== 'out') {
                for (var e = 0; e < my.nodes[n].subject.outputs.length; ++e) {
                    endpoint = getOutputPosition(my.nodes[n], e);
                    d = (pos.x - endpoint.x) * (pos.x - endpoint.x) + (pos.y - endpoint.y) * (pos.y - endpoint.y);
                    if (d < 4 * endPointSize * endPointSize) {
                        return {node: my.nodes[n], index: e, direction:'out'};
                    }
                }
            }
        }
        return null;
    }

    var touch1;
    var touch2 = null;
    var touch1end;
    var touchCount = 0;
    var endPoint;
    var otherEnd;
    var initial;
    var moved;
    var currentNode;

    function addEdge(canvas, x, y) {
        var ctx = canvas.getContext('2d');
        var p1 = canvasPosition(x, y);
        var p2;
        otherEnd = findEndPoint(x, y, endPoint.direction);

        if (endPoint.direction === 'in') {
            p2 = getInputPosition(endPoint.node, endPoint.index);
        } else {
            if (endPoint.index === -1) {
                p2 = {x: endPoint.node.width / 2, y: endPoint.node.height / 2};
            } else {
                p2 = getOutputPosition(endPoint.node, endPoint.index);
            }
        }
        p2 = applyTransform(endPoint.node.transform, p2.x, p2.y);

        var cx1 = (p1.x + p2.x) / 2;
        var cx2 = (p1.x + p2.x) / 2;
        
        draw(canvas);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.bezierCurveTo(cx1, p1.y, cx2, p2.y, p2.x, p2.y);
        ctx.stroke();

        ctx.fillStyle = 'rgb(200, 255, 150)';
        ctx.beginPath();
        ctx.arc(p2.x, p2.y, endPointSize, 0, Math.PI * 2, true);
        ctx.fill();

        if (otherEnd) {
            if (otherEnd.direction === 'in') {
                p2 = getInputPosition(otherEnd.node, otherEnd.index);
            } else {
                p2 = getOutputPosition(otherEnd.node, otherEnd.index);
            }
            p2 = applyTransform(otherEnd.node.transform, p2);
            ctx.fillStyle = 'rgb(200, 255, 150)';
            ctx.beginPath();
            ctx.arc(p2.x, p2.y, endPointSize, 0, Math.PI * 2, true);
            ctx.fill();
        }
        
        if (endPoint.direction === 'out' && endPoint.index === -1) {
            p2 = { x: endPoint.node.width / 2, y: endPoint.node.height / 2 };
            p2 = applyTransform(endPoint.node.transform, p2.x, p2.y);
            ctx.fillStyle = 'rgba(200, 255, 150, 0.2)';
            ctx.beginPath();
            ctx.arc(p2.x, p2.y, Math.sqrt(endPoint.node.width * endPoint.node.width + endPoint.node.height * endPoint.node.height) / 2, 0, Math.PI * 2, true);
            ctx.fill();
            ctx.stroke();
        }
    }

    function endAddEdge(canvas) {
        var newEdge;
        if (endPoint && otherEnd) {
            if (endPoint.direction === 'in') {
                newEdge = {node1: otherEnd.node, index1: otherEnd.index, node2: endPoint.node, index2: endPoint.index};
            } else {
                newEdge = {node1: endPoint.node, index1: endPoint.index, node2: otherEnd.node, index2: otherEnd.index};
            }

            my.edges = my.edges.filter(function(edge, index, all) {
                return edge.node2 !== newEdge.node2 || edge.index2 !== newEdge.index2;
            });
            my.addEdge(newEdge);
        }
        my.drawAll();
    }

    function transformCanvas(canvas, x1, y1, x2, y2) {
        touch1end = inverseTransform(initial, x1, y1);
        var touch2end;
        if (x2 !== undefined) {
            touch2end = inverseTransform(initial, x2, y2);
        } else {
            touch2 = {x: touch1.x + 10, y: touch1.y + 10};
            touch2end = {x: touch1end.x + 10, y: touch1end.y + 10};
        }
        my.transform = mult(initial, getTransform2(touch1, touch2, touch1end, touch2end));
        my.drawAll();
    }

    function endTransformCanvas(event) {
        var now = new Date();

        var p1 = applyTransform(initial, touch1.x, touch1.y);
        var p2 = applyTransform(initial, touch1end.x, touch1end.y);
        var d = (p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y);

        if (d < 5) {
            menu.x = touch1.x;
            menu.y = touch1.y;
            my.currentMenu = menu;
        }

        if (lastTouch && (now.getTime() - lastTouch.getTime()) < 500) {
           // my.nodes.push({name: 'node1', x: touch1.x, y: touch1.y, width: 100, height: 120, transform: [1, 0, 0, 1, touch1.x, touch1.y], radius: 10, inputs: ['1', '2'], outputs: ['1', '2', '3', '4']})
        }

        my.drawAll();
        lastTouch = now;
    }

    function transformNode(canvas, x1, y1, x2, y2) {
        touch1end = inverseTransform(initial, canvasPosition(x1, y1));
        var touch2end;
        if (x2 !== undefined) {
            touch2end = inverseTransform(initial, canvasPosition(x2, y2));
        } else {
            touch2 = {x: touch1.x + 10, y: touch1.y + 10};
            touch2end = {x: touch1end.x + 10, y: touch1end.y + 10};
        }
        currentNode.transform = mult(initial, getTransform2(touch1, touch2, touch1end, touch2end));
        my.drawAll();
    }

    function endTransformNode() {
        var now = new Date();
        var index;
        var domNode;
        if (lastTouch && (now.getTime() - lastTouch.getTime()) < 250) {
            index = my.nodes.indexOf(currentNode);
            if (index !== -1) {
                my.nodes.splice(index, 1);
                my.edges = my.edges.filter(function(edge, index, all) {
                    return edge.node1 !== currentNode && edge.node2 !== currentNode;
                });
                if (currentNode.subject.widgetId) {
                    domNode = document.getElementById(currentNode.subject.widgetId);
                    if (domNode && domNode.parentElement) {
                        domNode.parentElement.removeChild(domNode);
                    }
                }
            }
        } else if (lastTouch && (now.getTime() - lastTouch.getTime()) < 500) {
            currentNode.transform = [1, 0, 0, 1, currentNode.transform[4], currentNode.transform[5]];
        }

        var p1 = applyTransform(initial, touch1.x, touch1.y);
        var p2, d;
        if (touch1end) {
            p2 = applyTransform(initial, touch1end.x, touch1end.y);
            d = (p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y);
        } else {
            d = 0;
        }

        if (d < 5) {
            if (currentNode.subject.widgetId) {
                document.getElementById(currentNode.subject.widgetId).focus();
            }
        }

        lastTouch = now;
        //currentNode = null;
        my.drawAll();
    }

    function menuAction(item) {
        if (item.action) {
            node = my.addNode(item.action(), my.currentMenu.x, my.currentMenu.y);
            my.currentMenu = null;
        } else if (item.menu) {
            item.menu.x = my.currentMenu.x;
            item.menu.y = my.currentMenu.y;
            my.currentMenu = item.menu; 
        }
        my.drawAll();
    }

    function startTouch(event) {
        event.preventDefault();
        var touches = event.touches;

        var rect = this.getBoundingClientRect();
        var nodes = findNodes(touches[0].clientX - rect.left, touches[0].clientY - rect.top);
        var item = findMenuItem(touches[0].clientX - rect.left, touches[0].clientY - rect.top);
        endPoint = findEndPoint(touches[0].clientX - rect.left, touches[0].clientY - rect.top);
        moved = false;

        function addEdgeTouch(move) {
            move = move.touches[0];
            var rect = this.getBoundingClientRect();
            addEdge(this, move.clientX - rect.left, move.clientY - rect.top);
        }

        function endAddEdgeTouch() {
            endAddEdge(this);
            this.removeEventListener('touchmove', addEdgeTouch);
            this.removeEventListener('touchend', endAddEdgeTouch);
        }

        function transformCanvasTouch(event) {
            var rect = this.getBoundingClientRect();
            var x1 = event.touches[0].clientX - rect.left;
            var y1 = event.touches[0].clientY - rect.top;
            var x2, y2;
            moved = true;
            if (event.touches.length > 1) {
                x2 = event.touches[1].clientX - rect.left;
                y2 = event.touches[1].clientY - rect.top;
            }
            transformCanvas(this, x1, y1, x2, y2);
        }

        function endTransformCanvasTouch(event) {
            this.removeEventListener('touchmove', transformCanvasTouch);
            this.removeEventListener('touchend', endTransformCanvasTouch);
            endTransformCanvas();
        }

        function transformNodeTouch(event) {
            var rect = this.getBoundingClientRect();
            var x1 = event.touches[0].clientX - rect.left;
            var y1 = event.touches[0].clientY - rect.top;
            var x2, y2;
            moved = true;
            if (event.touches.length > 1) {
                x2 = event.touches[1].clientX - rect.left;
                y2 = event.touches[1].clientY - rect.top;
            }

            transformNode(this, x1, y1, x2, y2);
        }

        function endTransformNodeTouch() {
            this.removeEventListener('touchmove', transformNodeTouch);
            this.removeEventListener('touchend', endTransformNodeTouch);
            endTransformNode();
        }

        touchCount = touches.length;

        if (item) {
            menuAction(item);
        } else if (my.currentMenu) {
            my.currentMenu = null;
            my.drawAll();
        } else if (touches.length === 4) {
            if (this.height < Math.max(document.documentElement.clientHeight, window.innerHeight || 0)) {
                this.height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
            } else {
                this.height = 100;
            }
        } else if (touches.length === 3) {
            this.removeEventListener('touchmove', transformCanvasTouch);
            this.removeEventListener('touchend', endTransformCanvasTouch);
            my.transform = [1, 0, 0, 1, 0, 0];
            initial = [1, 0, 0, 1, 0, 0];
        } else if (touches.length === 2) {
            nodes = findNodes(touches[0].clientX - rect.left, touches[0].clientY - rect.top);
            if (nodes.length > 0) {
                initial = currentNode.transform.slice();
                touch1 = inverseTransform(initial, canvasPosition(touches[0].clientX - rect.left, touches[0].clientY - rect.top));
                touch2 = inverseTransform(initial, canvasPosition(touches[1].clientX - rect.left, touches[1].clientY - rect.top));
                this.addEventListener('touchmove', transformNodeTouch);
                this.addEventListener('touchend', endTransformNodeTouch);
            } else {
                initial = my.transform.slice();
                touch1 = inverseTransform(initial, touches[0].clientX - rect.left, touches[0].clientY - rect.top);
                touch2 = inverseTransform(initial, touches[1].clientX - rect.left, touches[1].clientY - rect.top);
                this.addEventListener('touchmove', transformCanvasTouch);
                this.addEventListener('touchend', endTransformCanvasTouch);
            }
        } else {
            if (endPoint) {
                this.addEventListener('touchmove', addEdgeTouch);
                this.addEventListener('touchend', endAddEdgeTouch);
            } else if (nodes.length > 0) {
                currentNode = nodes.pop();
                initial = currentNode.transform.slice();
                touch1 = inverseTransform(initial, canvasPosition(touches[0].clientX - rect.left, touches[0].clientY - rect.top));
                touch2 = null;
                if (touch1.y > 0 && touch1.y < lineHeight) {
                    endPoint =  {node: currentNode, index: -1, direction:'out'};
                    this.addEventListener('touchmove', addEdgeTouch);
                    this.addEventListener('touchend', endAddEdgeTouch);
                } else {
                    this.addEventListener('touchmove', transformNodeTouch);
                    this.addEventListener('touchend', endTransformNodeTouch);
                }
            } else {
                initial = my.transform.slice();
                touch1 = inverseTransform(initial, touches[0].clientX - rect.left, touches[0].clientY - rect.top);
                touch1end = touch1;
                touch2 = null;
                this.addEventListener('touchmove', transformCanvasTouch);
                this.addEventListener('touchend', endTransformCanvasTouch);
            }
        }
        my.drawAll();
    }

    function startAction(event) {
        var rect = this.getBoundingClientRect();
        var sx = event.clientX - rect.left;
        var sy = event.clientY - rect.top;
        var nodes = findNodes(sx, sy);
        var item = findMenuItem(sx, sy);
        endPoint = findEndPoint(sx, sy);
        moved = false;

        function addEdgeMouse(move) {
            var rect = this.getBoundingClientRect();
            addEdge(this, move.clientX - rect.left, move.clientY - rect.top);
        }

        function endAddEdgeMouse() {
            this.removeEventListener('mousemove', addEdgeMouse);
            this.removeEventListener('mouseup', endAddEdgeMouse);
            endAddEdge();
        }

        function moveCanvasMouse(move) {
            var rect = this.getBoundingClientRect();
            var x1 = move.clientX - rect.left;
            var y1 = move.clientY - rect.top;
            moved = true;
            transformCanvas(this, x1, y1);
        }

        function endMoveCanvasMouse(event) {
            this.removeEventListener('mousemove', moveCanvasMouse);
            this.removeEventListener('mouseup', endMoveCanvasMouse);
            endTransformCanvas(event);
        }

        function moveNodeMouse(move) {
            var rect = this.getBoundingClientRect();
            var x1 = move.clientX - rect.left;
            var y1 = move.clientY - rect.top;
            transformNode(this, x1, y1);
        }

        function endMoveNodeMouse() {
            this.removeEventListener('mousemove', moveNodeMouse);
            this.removeEventListener('mouseup', endMoveNodeMouse);
            endTransformNode();
        }

        if (item) {
            menuAction(item);
        } else if (my.currentMenu) {
            my.currentMenu = null;
            my.drawAll();
        } else if (endPoint) {
            this.addEventListener('mousemove', addEdgeMouse);
            this.addEventListener('mouseup', endAddEdgeMouse);
        } else if (nodes.length > 0) {
            currentNode = nodes.pop();
            initial = currentNode.transform.slice();
            touch1 = inverseTransform(initial, canvasPosition(event.clientX - rect.left, event.clientY - rect.top));
            if (touch1.y > 0 && touch1.y < lineHeight) {
                endPoint = { node: currentNode, index: -1, direction: 'out' };
                this.addEventListener('mousemove', addEdgeMouse);
                this.addEventListener('mouseup', endAddEdgeMouse);
            } else {
                this.addEventListener('mousemove', moveNodeMouse);
                this.addEventListener('mouseup', endMoveNodeMouse);
            }
        } else {
            initial = my.transform.slice();
            touch1 = inverseTransform(initial, event.clientX - rect.left, event.clientY - rect.top);
            touch1end = touch1;
            this.addEventListener('mousemove', moveCanvasMouse);
            this.addEventListener('mouseup', endMoveCanvasMouse);
        }
    }
    return my;
})();

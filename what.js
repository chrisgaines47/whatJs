const isInsert = child => ["string", "boolean", "number"].includes(typeof child);
const isObject = obj => typeof obj === 'object' && !Array.isArray(obj);
const isObj = obj => typeof obj === 'object';
const isFunc = obj => typeof obj === 'function';
const addChild = (el, child) => isInsert(child) ? el.appendChild(document.createTextNode(child)) : el.appendChild(child);
const replaceOrAppend = (parentEl, child) => parentEl?.firstChild?.replaceWith(child) || parentEl.appendChild(child);
const isInput = node => ["INPUT", "TEXTAREA", "SELECT"].includes(node.nodeName);
const checkInsertable = arg => (arg instanceof Array) || (arg instanceof Element) || isInsert(arg);
const id = (() => {
    let currentId = 0;
    return () => currentId++;
})();

let componentRegistry = new Map();
let components = new Map();
let contexts = new Map();

function getComponent(type, props={}) {
    let component = components.get(props?.id);
    if(!component) {
        component = new (componentRegistry.get(type))(props);
        component.state = createState(component.state || {}, () => component?.rerender?.());
        component.id = id();
        components.set(props?.id || component.id, component);
    }
    return component;
}

function registerComponent(component) {
    component.prototype.useContexts = function(ctxs) {
        let comp = this;
        return ctxs.map(ctx => {
            let _ctx = contexts.get(ctx.name) ?? new ctx();
            _ctx.components = (_ctx?.components || []).concat([comp]);
            _ctx.state = createState(_ctx.state || {}, () => _ctx.components.forEach(cmp => cmp?.rerender?.()))
            _ctx?.onJoin?.(comp);
            contexts.set(ctx.name, ctx);
            return _ctx;
        });
    }
    componentRegistry.set(component.name, component);
}

const dom = new Proxy({}, {
    get: (o, key) => (props={}, children={}, events={}) => {
        let el = document.createElement(key);
        if(checkInsertable(props)) events = children, children = props;
        else if(!componentRegistry.has(key)) Object.keys(props).filter(attr => typeof props[attr] !== 'object').forEach(
            attr => ['checked', 'disabled'].includes(attr) ? el[attr] = props[attr] : el.setAttribute(attr, props[attr])
        );
        for(let eventName in events) el.addEventListener(eventName, e => events[eventName](e, el));
        if(componentRegistry.has(key)) {
            let component = getComponent(key, props);
            component.rerender = () => replaceOrAppend(el, component?.render([].concat(children)));
            component.rerender();
        } else [].concat(children).forEach(child => addChild(el, child));
        return el;
    }
});

function createState(obj, setFn) {

    function prox(data) {
        return new Proxy(data, {
            get: (target, key) => isObj(target[key]) ? prox(target[key]) : isFunc(target[key]) ? target[key]() : target[key],
            set: (target, key, value) => {
                if(target[key] !== value) {
                    target?.rerenders?.includes(key) && setFn(key);
                    return target[key] = value;
                }
                return true;
            }
        });
    }
    return prox(obj);
}

function Counter() {
    let [ok] = this.useContexts([CounterContext]);
    
    this.state = {
        num: 0,
        rerenders: ['num']
    };

    this.render = function(eles) {
        return dom.div([
            dom.span(this.state.num),
            dom.button('increase', {
                click: () => {this.state.num++;}
            })
        ]);
    };
}

function CounterContext() {

    this.state = {
        allAreOne: () => this.components.every(cmpt => cmpt.num === 1)
    };
}

registerComponent(Counter);

document.body.appendChild(
    dom.Counter()
)
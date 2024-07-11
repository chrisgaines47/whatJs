const whatJs = {
    isInsert: child => ["string","boolean","number"].includes(typeof child),
    isObject: obj => typeof obj === 'object' && !Array.isArray(obj),
    addChild: (el, child) => whatJs.isInsert(child) ? el.insertAdjacentHTML("beforeend", child) : el.appendChild(child),
    isInput: node => ["INPUT", "TEXTAREA", "SELECT"].includes(node.nodeName),
    checkInsertable: arg => (arg instanceof Array) || (arg instanceof Element) || whatJs.isInsert(arg),
    dom: new Proxy({registry: new Map()}, { get: (o, key) => (props = {}, children = [], events = {}) => {
            if(key === 'query') return document.getElementById(props) ?? document.querySelectorAll(props).length === 1 ?
                document.querySelector(props) : Array.from(document.querySelectorAll(props));
            if(key === 'register') return o.registry.set(props.name, props);
            let el = document.createElement(key);
            if (whatJs.checkInsertable(props)) events = children, children = props;
            else Object.keys(props).filter(attr => !['disabled', 'checkbox', 'wait', 'dirty', 'rerender']
                .includes(attr) && typeof props[attr] !== 'object').forEach(attr => el.setAttribute(attr, props[attr]));
            if(props.modelkey && props.model && whatJs.isInput(el))
                el.addEventListener('input', evt => {
                    if(props?.dirty && !props.model._dirty) props.model.dirty(el);
                    let processedValue = el.getAttribute('type') === 'checkbox' ? evt.target.checked : evt.target.value;
                    try { props.model[props.modelkey] = processedValue; props?.updateSuccess?.(el, props.modelkey, props.model);
                        whatJs.dom.query(props?.form).forEach(formEl => formEl.classList.remove(`${props.model.name}-form-error`));
                    }
                    catch { props?.updateError?.(el, props.modelkey, props.model, processedValue);
                        whatJs.dom.query(props?.form).forEach(formEl => formEl.classList.add(`${props.model.name}-form-error`));
                    }
                });
            if(props.rerender && props.model) props.model.subscribe(props.id + '-rerender',
                updateData => el.parentNode && el.parentNode.replaceChildren(props.rerender(updateData)));
            props?.wait?.().then(props?.waitSuccess, props?.waitError).then(result => result && el.replaceChildren(result));
            for(let eventName in events) el.addEventListener(eventName, (e) => events[eventName](e, el));
            if(props?.render) whatJs.dom.query(props.render)[(props?.append ? 'appendChild' : 'replaceChildren')](el);
            if(o.registry.has(key)) return el.appendChild(o.registry.get(key)(children)).parentElement;
            Array.isArray(children) ? children.forEach(child => whatJs.addChild(el, child)) : whatJs.addChild(el, children);
            return el;
    }}),
    context: new Proxy({_contexts: {}}, { get: function(whatProxy, contextName) {
            whatProxy._contexts[contextName] ??= new Proxy({name: contextName, actions: new Map(), data: {},
                expose: (fnKey, fn, data={}) => context.actions.set(fnKey,{fn, data}) || (() => {context.actions.delete(fnKey)}),
                utilize: actionKey => context.actions.get(actionKey)
            },{
                get: (invokerContext, prop) => {
                    if(prop in invokerContext) return invokerContext[prop];
                    let {fn, data} = invokerContext.actions.get(prop);
                    return fn ? new Proxy(fn, { apply: (l, m, args) => (typeof args[0] === 'function') ? args[0].apply({},[fn, data]) : fn.apply({}, [...args, data])}) : Reflect.get(...arguments);
                }
            });
            let context = whatProxy._contexts[contextName];
            return context;
    }}),
    model: new Proxy({_models: {}, _makeModel: function(inputData, schema={}, _dirty=false) {
        let dirty = _dirty, dirtyNode = null, props = {}, subscribers = new Map();
        function validate(object, schema, path='') {
            let failedFields = [];
            if(Array.isArray(schema)) object.forEach((entry, index) => failedFields.push(...validate(entry, schema[0], path + `[${index}]`)));
            if(whatJs.isObject(object))
                for(let key in schema) { if(!key in object) continue;
                    if(typeof schema[key] === 'function') { if (!schema[key](object[key], object)) failedFields.push(`${path}.${key}`.substring(1)); }
                    else failedFields.push(...validate(object[key], schema[key], `${path}.${key}`));
                }
            return failedFields;
        }
        return new Proxy(inputData, { get: function(target, prop, receiver) {
                if(!!dirty && !dirtyNode?.parentNode) dirtyNode = null, dirty = false;
                if(prop === '_dirty') return dirty; if(prop === 'props') return props;
                if(prop === 'dirty') return (el=null) => dirty = structuredClone(target), dirtyNode = el;
                if(prop === 'clean') return () => dirty = false, dirtyNode = null;
                if(prop === 'subscribe') return (subscriber, fnArg) => fnArg ? subscribers.set(subscriber, fnArg) : subscribers.delete(subscriber);
                if(prop === 'validate') return (suppliedSchema=false, updateModel=true) => { if(!dirty) return true;
                    let failedFields = validate(dirty, suppliedSchema || schema);
                    if(!failedFields.length && updateModel) Object.assign(target, dirty), dirty = false, dirtyNode = null;
                    return !!failedFields.length ? failedFields : true;
                }
                let result = Reflect.get(target, prop, receiver);
                return (typeof result == 'object') ? whatModel._makeModel(result, schema?.[prop] || {}, dirty?.[prop]) : result;
            },
            set: function(model, key, value) {
                if(!!dirty) dirty[key] = value;  if(key === 'schema') schema = value; if(key === 'props') props = value;
                if(!!dirty || key === 'schema' || key === 'name') return true;
                if(typeof schema?.[key] === 'object') {
                    let failedFields = validate(value, schema[key]);
                    if(!!failedFields.length) throw new Error(JSON.stringify(failedFields))
                } else if(typeof schema?.[key] === 'function' && !schema[key](value, model)) throw new Error(key);
                let result = Reflect.set(model,key,value);
                for(let [subscriber, fn] of subscribers.entries()) fn({model, key, value});
                return (typeof result == 'object') ? whatModel._makeModel(result, schema?.[key] || {}) : result;
            }
        })
    }}, {
        get: function(whatProxy, modelName){
            if(modelName.startsWith('_')) return whatProxy[modelName];
            if(!(modelName in whatProxy._models)) return false; 
            return whatProxy._models[modelName];
        },
        set: function(whatProxy, modelName, modelData) { whatProxy._models[modelName] = whatProxy._makeModel(modelData); whatProxy._models[modelName].props.name = modelName; }
    })
};

let dom = whatJs.dom;
let model = whatJs.model;

model.menu = {'ok': 'go'};
function Menu() {
    dom.div({render: 'body', model: model.menu, rerender: Menu}, [
        model.menu.ok
    ])
}
dom.register(Menu);
dom.Menu();


let schema = {
    a: (obj, key) => obj[key] === 'a',
    b: (obj, key) => obj[key] === 'b',
    _isValid: (obj) => {
        let failed = [];
        for(let key in schema)
            if(!key.startsWith('_') && key in obj && !schema[key](obj, key))
                failed.push(key);
        return failed.length === 0 ? true : failed;
    }
}
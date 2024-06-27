const whatJs = {
    isInsert: child => ["string","boolean","number"].includes(typeof child), isObject: obj => typeof obj === 'object' && !Array.isArray(obj),
    addChild: (el, child) => whatJs.isInsert(child) ? el.insertAdjacentHTML("beforeend", child) : el.appendChild(child),
    isInput: node => ["INPUT", "TEXTAREA", "SELECT"].includes(node.nodeName), isTextInput: node => ["INPUT","TEXTAREA"].includes(node.nodeName),
    dom: new Proxy({registry: new Map()}, {
        get: (obj, key) => (props = {}, children = [], events = {}) => {
            if(key === 'register') return obj.registry.set(props.name, props); if(key in Object.getOwnPropertyDescriptors(obj)) return obj[key];
            var el = document.createElement(key);
            if ((props instanceof Array) || (props instanceof Element) || whatJs.isInsert(props)) events = children, children = props;
            else {
                Object.keys(props).filter(attr => !['disabled', 'checkbox', 'render', 'model', 'converter', 'wait'].includes(attr)).forEach(attr => el.setAttribute(attr, props[attr]));
                if(props.modelkey && props.model && whatJs.isInput(el)) {
                    el.value = props.model[props.modelkey];
                    el.addEventListener('change', (evt) => {if(!props.model._dirty) props.model.dirty(el);props.model[props.modelkey] = el.getAttribute('type') === 'checkbox' ? evt.target.checked : props.converter ? props.converter(evt.target.value) : evt.target.value; events?.update && events.update(evt, el);});
                    whatJs.isTextInput(el) && el.addEventListener('input', (evt) => {if(!props.model._dirty) props.model.dirty(el);props.model[props.modelkey] = props.converter ? props.converter(evt.target.value) : evt.target.value; events?.update && events.update(evt, el);})
                }
            }
            if(obj.registry.has(key)) return el.appendChild(obj.registry.get(key)(children, events)).parentElement;
            if(props?.wait) {
                el.appendChild(props?.wait[1]);
                props.wait[0].then(()=>{
                    props.wait[1].remove();
                    Array.isArray(children) ? children.forEach(child => whatJs.addChild(el, child)) : whatJs.addChild(el, children);
                }).catch(() => {
                    props.wait[1].remove();
                    props.wait?.[2] && el.appendChild(props.wait[2]);
                })
            } else {
                Array.isArray(children) ? children.forEach(child => whatJs.addChild(el, child)) : whatJs.addChild(el, children);
            }
            
            for(let eventName in events) el.addEventListener(eventName, (e) => events[eventName](e, el));
            if(props?.render) document.querySelector(props.render)[(props?.append ? 'appendChild' : 'replaceChildren')](el);
            return el;
        }
    }),
    context: new Proxy({_contexts: {}}, {
        get: function(whatProxy, contextName){
            whatProxy._contexts[contextName] ??= new Proxy({name: contextName, actions: new Map(), data: {},
                expose: (fnKey, fn, data={}) => context.actions.set(fnKey,{fn, data}) || (() => {context.actions.delete(fnKey)}),
                utilize: (fnKey, fnExclude) => context.actions.get(fnKey) ?? [...context.actions.keys()].filter(actionKey => actionKey.includes(fnKey) && !(actionKey.includes(fnExclude))).map(actionKey => context.actions.get(actionKey)),
            },{
                get: (invokerContext, prop) => {
                    if(prop in invokerContext) return invokerContext[prop];
                    let {fn, data} = invokerContext.actions.get(prop);
                    return fn ? new Proxy(fn, { apply: (l, m, args) => (typeof args[0] === 'function') ? args[0].apply({}, [fn, data]) : fn.apply({}, [...args, data])}) : Reflect.get(...arguments);
                }
            });
            let context = whatProxy._contexts[contextName];
            return context;
        }
    }),
    model: new Proxy({_models: {}, _makeModel: function(inputData, schema={}, _dirty=false){
        let dirty = _dirty;
        let subscribers = new Map();
        let dirtyNode = null;
        function validate(object, schema, path='') {
            let failedFields = [];
            if(Array.isArray(schema))
                object.forEach((entry, index) => failedFields.push(...validate(entry, schema[0], path + `[${index}]`)));
            if(whatJs.isObject(object))
                for(let key in schema) {
                    if(!key in object) continue;
                    let newPath = path + '.' + key;
                    if(typeof schema[key] === 'function') {
                        let result = schema[key](object[key], object);
                        if(!result) failedFields.push(newPath.substring(1));
                    } else failedFields.push(...validate(object[key], schema[key], newPath));
                }
            return failedFields;
        }
        return new Proxy(inputData, {
            get: function(target, prop, receiver) {
                if(!!dirty && !dirtyNode?.parentNode) {dirtyNode = null; dirty = false;}
                if(prop === 'dirty') return (el=null) => {dirty = structuredClone(target); dirtyNode = el;};
                if(prop === 'clean') return () => {dirty = false; dirtyNode = null;}
                if(prop === '_dirty') return dirty;
                if(prop === 'subscribe') return (subscriber, fnArg) => subscribers.set(subscriber, fnArg);
                if(prop === 'validate') {
                    return (updateModel=true, makePromise=false) => {
                        if(!dirty) return makePromise ? Promise.resolve(true) : true;
                        let failedFields = validate(dirty, schema);
                        if(!failedFields.length && updateModel) {
                            for(let key in dirty) target[key] = dirty[key];
                            dirty = false; dirtyNode = null;
                        }
                        return makePromise ? (!!failedFields.length ? Promise.reject(failedFields) : Promise.resolve(true)) : !!failedFields.length ? failedFields : true;
                    }
                }
                const result = Reflect.get(target, prop, receiver);
                return (typeof result == 'object') ? whatModel._makeModel(result, schema?.[prop] || {}, dirty?.[prop]) : result;
            },
            set: function(model, key, value) {
                if(!!dirty) dirty[key] = value;
                if(key === 'schema') schema = value;
                if(!!dirty || key === 'schema') return true;
    
                if(typeof schema?.[key] === 'object') {
                    let failedFields = validate(value, schema[key]);
                    if(!!failedFields.length) throw new Error(JSON.stringify(failedFields))
                } else if(typeof schema?.[key] === 'function') {
                    let result = schema[key](value, model);
                    if(!result) throw new Error(key);
                }
                const result = Reflect.set(model,key,value);
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
        set: function(whatProxy, modelName, modelData) {  whatProxy._models[modelName] = whatProxy._makeModel(modelData); }
    })
};

const dom = whatJs.dom;
const whatModel = whatJs.model;
const whatContext = whatJs.context;

whatModel.test = {some: 'data'};
dom.div({render:  'body'},[
    dom.input({model: whatModel.test, modelkey: 'some'})
])
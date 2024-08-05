const whatJs = {
    isInsert: child => ["string","boolean","number"].includes(typeof child),
    isObject: obj => typeof obj === 'object' && !Array.isArray(obj), isObj: obj => typeof obj === 'object',
    addChild: (el, child) => whatJs.isInsert(child) ? el.insertAdjacentHTML("beforeend", child) : el.appendChild(child),
    isInput: node => ["INPUT", "TEXTAREA", "SELECT"].includes(node.nodeName),
    checkInsertable: arg => (arg instanceof Array) || (arg instanceof Element) || whatJs.isInsert(arg),
    objProxy: (obj, _context) => new Proxy(obj, {
        get: (target, key) => whatJs.isObj(target[key]) ? objProxy(target[key]) : target[key],
        set: (target, key, value) => { target[key] = value; _context.subscribers.forEach(fn => fn(target, key)); return true;}
    }),

    dom: new Proxy({registry: new Map(), tags: new Map()}, {
        get: (o, key) => (props = {}, children = [], events = {}) => {
            if(key === 'query') return document.getElementById(props) ?? document.querySelectorAll(props).length === 1 ?
                document.querySelector(props) : Array.from(document.querySelectorAll(props));
            if(key === 'register') return o.registry.set(props.name, props);
            if(key === 'tag') return o.tags.set(props, [children, events]);
            let el = document.createElement(key);
            if(props?.tags) {let [attrs, evts] = o.tags.get(props.tags); Object.assign(props, attrs); Object.assign(events, evts); }
            if (whatJs.checkInsertable(props)) events = children, children = props;
            else Object.keys(props).filter(attr => !['disabled', 'checkbox', 'wait','rerender', 'tags']
                .includes(attr) && typeof props[attr] !== 'object').forEach(attr => el.setAttribute(attr, props[attr]));

            if(props.modelkey && props.model && whatJs.isInput(el))
                el.addEventListener('input', evt => {
                    let processedValue = el.getAttribute('type') === 'checkbox' ? evt.target.checked : evt.target.value;
                    props.model[props.modelkey] = processedValue;
                    if(model?.props?.failedFields.includes(props.modelkey)) {
                        props?.updateError?.(el, props.modelkey, props.model, processedValue);
                        props?.errorClass && el.classList.add(props.errorClass);
                    }
                    else props?.updateSuccess?.(el, props.modelkey, props.model);
                });

            if(props.rerender && props.model) props.model.subscribe(
                updateData => document.body.contains(el.parentNode) && el.parentNode.replaceChildren(props.rerender(updateData)));

            props?.wait?.().then(props?.waitSuccess, props?.waitError).then(result => result && el.replaceChildren(result));
            for(let eventName in events) el.addEventListener(eventName, (e) => events[eventName](e, el));
            if(props?.render) whatJs.dom.query(props.render)[(props?.append ? 'appendChild' : 'replaceChildren')](el);
            if(o.registry.has(key)) return el.appendChild(o.registry.get(key)(children)).parentElement;
            Array.isArray(children) ? children.forEach(child => whatJs.addChild(el, child)) : whatJs.addChild(el, children);
            return el;
        }
    }),
    context: new Proxy({_contexts: {}}, {
        get: function(whatProxy, contextName) {
            whatProxy._contexts[contextName] ??= new Proxy({name: contextName, actions: new Map(), subscribers: new Map(),
                data: whatJs.objProxy({}),
                expose: (fnKey, fn, data={}) => context.actions.set(fnKey,{fn, data}) || (() => {context.actions.delete(fnKey)}),
                utilize: actionKey => context.actions.get(actionKey),
                subscribe: (id, fn) => context.subscribers.set(id, fn)
            },{
                get: (invokerContext, prop) => {
                    if(prop in invokerContext) return invokerContext[prop];
                    let {fn, data} = invokerContext.actions.get(prop);
                    return fn ? new Proxy(fn, {
                        apply: (l, m, args) =>
                            (typeof args[0] === 'function') ? args[0].apply({},[fn, data]) : fn.apply({}, [...args, data])}) : Reflect.get(...arguments);
                },
                set: (target, key, value) => {
                    if(key === 'data') { let result = target[key] = whatJs.objProxy(value, context); return result; }
                    return target[key] = value;
                }
            });
            let context = whatProxy._contexts[contextName];
            return context;
        }
    }),
    model: new Proxy({_models: {},
        _makeModel: function(inputData, parent=false) {
            let schema = {}; let validation = {}; let subscribers = []; let data;
            if(!whatJs.isObj(inputData)) return inputData;
            else data = structuredClone(inputData);
        
            let proxyObj = new Proxy(data, {
                get: (target, key) => {
                    if(key === 'validation') return validation;
                    if(key === '_validate') return () => {
                        let modelValid = true;
                        function validateObj(obj, schema) {
                            let validationObj = {};
                            for(let [key, val] of Object.entries(schema)) {
                                let result = typeof val === 'function' ? val(obj?.[key] || target) : validateObj(obj[key], val);
                                if(result === false && !key.startsWith('_')) modelValid = false;
                                validationObj[key] = result;
                            }
                            return validationObj;
                        }
                        let result = validateObj(target, schema);
                        validation = {modelValid, ...result};
                        return result;
                    }
                    if(key === 'subscribe') return (updateFn) => typeof updateFn === 'function' ? subscribers.push(updateFn) : subscribers.push(...updateFn);
                    return target[key];
                },
                set: (target, key, value) => {
                    if(key === 'schema') return schema = value;
                    target[key] = whatJs.isObj(value) ? whatJs.model._makeModel(value, parent || proxyObj) : value;
                    if(whatJs.isObj(value)) target[key].subscribe(subscribers);
                    subscribers.forEach(subscriber => subscriber(target, key));
                    return (parent || proxyObj)._validate();
                }
            });
            
            Object.keys(data).forEach(key => proxyObj[key] = whatJs.model._makeModel(data[key], parent || proxyObj));
            return proxyObj;
        }
    }, {
        get: (whatProxy, modelName) => modelName.startsWith('_') ? whatProxy[modelName] : whatProxy._models?.[modelName] || false,
        set: (whatProxy, modelName, modelData) => whatProxy._models[modelName] = whatProxy._makeModel(modelData)
    })
};

let {model, context} = whatJs;
model.x = {ok: 'go'}
context.a.data = {ok: 'go'};
context.a.subscribe('ok', () => console.log(1))
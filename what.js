const whatJs = {
    isInsert: child => ["string","boolean","number"].includes(typeof child),
    isObject: obj => typeof obj === 'object' && !Array.isArray(obj),
    addChild: (el, child) => whatJs.isInsert(child) ? el.insertAdjacentHTML("beforeend", child) : el.appendChild(child),
    isInput: node => ["INPUT", "TEXTAREA", "SELECT"].includes(node.nodeName),
    checkInsertable: arg => (arg instanceof Array) || (arg instanceof Element) || whatJs.isInsert(arg),
    dom: new Proxy({}, {
        get: (o, key) => (props = {}, children = [], events = {}) => {
            if(key === 'query')
                return document.getElementById(props) ?? document.querySelectorAll(props).length === 1 ? document.querySelector(props) : document.querySelectorAll(props);

            let el = document.createElement(key);
            if (whatJs.checkInsertable(props)) events = children, children = props;
            else Object.keys(props).filter(attr => !['disabled', 'checkbox', 'converter', 'wait', 'dirty'].includes(attr) && typeof props[attr] !== 'object').forEach(attr =>
                el.setAttribute(attr, props[attr]));
                    
            if(props.modelkey && props.model && whatJs.isInput(el))
                el.addEventListener('input', evt => {
                    if(props?.dirty) props.model.dirty(el);
                    let processedValue = el.getAttribute('type') === 'checkbox' ? evt.target.checked : props.converter ? props.converter(evt.target.value) : evt.target.value;
                    try { props.model[props.modelkey] = processedValue; el.classList.remove('what-model-error'); events?.updateSuccess?.(evt, el);}
                    catch { el.classList.add('what-model-error'); events?.updateError?.(processedValue, props.modelkey, props.model);}
                });

            if(props.rerender && props.model)
                props.model.bind(el, updateData => (props.render ? document.querySelector(props.render) : el.parentNode).replaceChildren(props.rerender(updateData)));

            props?.wait?.().then(props?.waitSuccess).catch(props?.waitError).finally(result => result && el.replaceChildren(result));
            Array.isArray(children) ? children.forEach(child => whatJs.addChild(el, child)) : whatJs.addChild(el, children);
            for(let eventName in events) el.addEventListener(eventName, (e) => events[eventName](e, el));
            if(props?.render) document.querySelector(props.render)[(props?.append ? 'appendChild' : 'replaceChildren')](el);
            return el;
        }
    }),

    context: new Proxy({_contexts: {}}, {
        get: function(whatProxy, contextName){
            whatProxy._contexts[contextName] ??= new Proxy({name: contextName, actions: new Map(), data: {},
                expose: (fnKey, fn, data={}) => context.actions.set(fnKey,{fn, data}) || (() => {context.actions.delete(fnKey)}),
                utilize: function(fnKey, fnExclude) {
                    let filter = actionKey => actionKey.includes(fnKey) && !(actionKey.includes(fnExclude));
                    let map = actionKey => context.actions.get(actionKey);
                    context.actions.get(fnKey) ?? [...context.actions.keys()].filter(filter).map(map);
                }
            },{
                get: (invokerContext, prop) => {
                    if(prop in invokerContext)
                        return invokerContext[prop];

                    let {fn, data} = invokerContext.actions.get(prop);
                    return fn ? new Proxy(fn, {
                        apply: (l, m, args) =>
                            (typeof args[0] === 'function') ?
                                args[0].apply({},[fn, data]) :
                                fn.apply({}, [...args, data])
                            }) : Reflect.get(...arguments);
                }
            });
            let context = whatProxy._contexts[contextName];
            return context;
        }
    }),

    model: new Proxy({_models: {}, _makeModel: function(inputData, schema={}, _dirty=false){
        let dirty = _dirty;
        let subscribers = new Map();
        let binds = new Map();
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
                if(!!dirty && !dirtyNode?.parentNode) dirtyNode = null, dirty = false;
                if(prop === 'dirty') return (el=null) => dirty = structuredClone(target), dirtyNode = el;
                if(prop === '_dirty') return dirty;
                if(prop === 'clean') return () => dirty = false, dirtyNode = null;
                if(prop === 'bind') return (bindNode, fnArg) => binds.set(bindNode, fnArg);
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
                for(let [bindNode, fn] of binds.entries()) bindNode.parentNode ? fn({model, key, value}) : binds.delete(bindNode);
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
    }),
    css: new Proxy({_sheets: {}}, {
        get: function(whatSheet, sheetName) {
            return whatSheet._sheets[sheetName];
        },
        set: function(whatSheet, sheetName, cssRule) {
            if (!whatSheet._sheets?.[sheetName]) {
                whatSheet._sheets[sheetName] ??= new CSSStyleSheet();
                document.adoptedStyleSheets.push(whatSheet._sheets[sheetName]);
            }
            whatSheet._sheets[sheetName].replaceSync(cssRule);
        }
    })
};
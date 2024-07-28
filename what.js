const whatJs = {
    isInsert: child => ["string","boolean","number"].includes(typeof child),
    isObject: obj => typeof obj === 'object' && !Array.isArray(obj),
    addChild: (el, child) => whatJs.isInsert(child) ? el.insertAdjacentHTML("beforeend", child) : el.appendChild(child),
    isInput: node => ["INPUT", "TEXTAREA", "SELECT"].includes(node.nodeName),
    checkInsertable: arg => (arg instanceof Array) || (arg instanceof Element) || whatJs.isInsert(arg),

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

            if(props.rerender && props.model) props.model.subscribe(`${props.model.props.name}-${props?.id || 'noId'}-rerender`,
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
            whatProxy._contexts[contextName] ??= new Proxy({name: contextName, actions: new Map(), data: {},
                expose: (fnKey, fn, data={}) => context.actions.set(fnKey,{fn, data}) || (() => {context.actions.delete(fnKey)}),
                utilize: actionKey => context.actions.get(actionKey)
            },{
                get: (invokerContext, prop) => {
                    if(prop in invokerContext) return invokerContext[prop];
                    let {fn, data} = invokerContext.actions.get(prop);
                    return fn ? new Proxy(fn, {
                        apply: (l, m, args) =>
                            (typeof args[0] === 'function') ? args[0].apply({},[fn, data]) : fn.apply({}, [...args, data])}) : Reflect.get(...arguments);
                }
            });
            let context = whatProxy._contexts[contextName];
            return context;
        }
    }),
    model: new Proxy({
        _models: {},
        _getHandler: function(target, prop, receiver) {

        },
        _setHandler: function(model, key, value, receiver) {
        },
        _makeModel: (inputData, path='model', isProcessing=true) => {
            let isObject = typeof inputData === 'object';
            let schema = {};
            let proxifiedObj = isObject ? new Proxy(inputData, {
                get: () => schema,
                set: (model, prop, value, receiver) => {
                    if(prop === 'schema') {
                        schema = value;
                        for(let key in receiver) {
                            if(typeof receiver[key] === 'object' && schema?.[key])
                                receiver[key].schema = schema[key];
                        }
                    }
                    
                    
                }
            }) : inputData;
            isObject && Object.keys(inputData).forEach(key => proxifiedObj[key] = whatJs.model._makeModel(inputData[key], `${path}.${key}`));
            isProcessing = false;
            return proxifiedObj;

            return new Proxy(inputData, {
                get: function(target, prop, receiver) {
                    if(prop === 'props') return whatJs.props.get(schema);
                    if(prop === 'dirty') return function(isSet=false) {return (isSet && !dirty) ? dirty = structuredClone(target) : dirty;}
                    if(prop === 'clean') return () => dirty = false;
                    if(prop === 'subscribe') return (subscriber, fnArg) => fnArg ? subscribers.set(subscriber, fnArg) : subscribers.delete(subscriber);
                    if(prop === 'resetValidState') return () => {
                        whatJs.props.set(schema, {failedFields: []});
                        for(let key in receiver) if(typeof receiver[key] === 'object') receiver[key].resetValidState();
                    }
                    if(prop ===  'validate') return function() {
                        let props = whatJs.props.get(schema) || {failedFields: []};
                        receiver.dirty(true);
                        for(let key in schema) {
                            if(typeof schema[key] === 'function') {
                                if(!key.startsWith('_') && !schema[key](dirty[key])) props.failedFields.push(key);
                                if(key.startsWith('_')) props[key] = schema[key](dirty, key, dirty[key]);
                                whatJs.props.set(schema, props);
                            } else if(typeof receiver[key] === 'object') receiver[key].validate();
                        }
                        if(props.failedFields.length === 0) Object.assign(target, dirty) && receiver.clean();
                        return props.failedFields.length === 0;
                    }
                    let result = Reflect.get(target, prop, receiver);
                    return (typeof result == 'object') ? whatJs.model._makeModel(result, schema?.[prop] || {}, dirty?.[prop]) : result;
                },
                set: function(model, key, value, receiver) {
                    if(key === 'schema') { schema = value; receiver.resetValidState(); receiver.validate(); return true; }
                    if(schema?.[key] && !schema?.[key]?.(value) && !model.dirty) receiver.dirty();
                    (!!dirty ? dirty : model)[key] = value;
                    receiver.resetValidState(); receiver.validate();
                    for(let [subscriber, fn] of subscribers.entries()) fn({model, key, value});
                    return (typeof result == 'object') ? whatJs.model._makeModel(result, schema?.[key] || {}, dirty) : true;
                }
            })
    }}, {
        get: (whatProxy, modelName) => modelName.startsWith('_') ? whatProxy[modelName] : whatProxy._models?.[modelName] || false,
        set: (whatProxy, modelName, modelData) => whatProxy._models[modelName] = whatProxy._makeModel(modelData)
    })
};
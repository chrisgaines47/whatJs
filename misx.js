let schema = {
    a: (val) => typeof val === 'string',
    b: {
        c: (val) => typeof val === 'string',
        d: (val) => typeof val === 'number'
    },
    _isValid: (obj, key, val) => {
        return 'hello'
    }
}

let a = {
    a: 'a',
    b: {
        c: 'c',
        d: 'd'
    }
};

function model(inputData, parent=false, schema={}) {
    let isObject = (obj) => typeof obj === 'object';
    let proxifiedObj = isObject(inputData) ? new Proxy({data: inputData, schema: schema, isDirty: false, dirty: {}, isValid: true, validation: {}}, {
        get: (target, prop) => {
            if(['schema', 'isDirty', 'dirty', 'isValid', 'validation', 'parent'].includes(prop)) return target[prop];
            if(prop === '_data') return  target.data;
            let result = target.data[prop];
            return isObject(result) ? model(result, schema?.[prop] || {}) : result;
        },
        set: (target, prop, value, receiver) => {
            if(['schema', 'isDirty', 'dirty', 'isValid', 'validation', 'parent'].includes(prop)) return Reflect.set(target, prop, value);
            if(!receiver.isDirty) {
                target.dirty = structuredClone(target.data);
                target.isDirty = true;
            }
            target.dirty[prop] = value;

            // let modelValid = true;
            // function validateObj(obj, schema) {
            //     let validationObj = {};
            //     for(let [key, val] of Object.entries(schema)) {
            //         let result = typeof val === 'function' ? val(obj[key], target) : validateObj(obj[key], val);
            //         if(result === false) modelValid = false;
            //         validationObj[key] = result;
            //     }
            //     return validationObj;
            // }

            // let result = validateObj(target.parent.data, target.parent?.schema || {}); target.parent.validation = result;
            // target.parent.isValid = modelValid;
            // if((target.parent).isValid) {
            //     debugger;
            //     target.isDirty = false; Object.assign(target.data, target.dirty); target.dirty = {};
            // }
            // debugger;
            return true;
        }
    }) : inputData;
    return proxifiedObj;
}

let z = model(a);
z.schema = schema;

let x = {one: 1, two: {ok: 'go'}};
function makeModel(inputData, parent=false) {
    let isObject = typeof inputData === 'object';
    let dirty = {}; let isDirty = false; let schema = {};
    let proxifiedObj = isObject ? new Proxy(inputData, {
        get: (target, key) => {
            if(isDirty && key in dirty) return dirty[key];
            if(key === 'dirty') return () => {}
            return target[key];
        },
        set: (target, key, value) => {
            if(key === 'isDirty') return isDirty = value; if(key === 'schema') return schema = value;
            parent.dirty()
            let result = (isDirty ? dirty : target)[key] = isObject(value) ? makeModel(value, parent || proxifiedObj) : value;
        }
    }) : inputData;
    isObject && Object.keys(inputData).forEach(key => proxifiedObj[key] =  makeModel(inputData[key], parent || proxifiedObj));
    return proxifiedObj;
}
let m = makeModel(x);

let {dom, model} = whatJs;

let a = {
    a: 'a',
    b: {
        c: 'c',
        d: 'd'
    }
};

model.a = a;

let schema = {
    a: (val) => typeof val === 'string',
    b: {
        c: (val) => typeof val === 'string',
        d: (val) => typeof val === 'number'
    },
    _isValid: (obj, key, val) => {
        return 'hello'
    }
}

model.a.schema = schema;


let schema = {
    a: (val) => typeof val === 'string',
    b: {
        c: (val) => typeof val === 'string',
        d: (val) => typeof val === 'number'
    },
    _isValid: (obj, key, val) => {
        return 'hello'
    }
}

let a = {
    a: 'a',
    b: {
        c: 'c',
        d: 'd'
    }
};

function g(inputData) {
    let isObject = typeof inputData === 'object';
    let proxifiedObj = isObject ? new Proxy({data: inputData, schema: {}, isDirty: false, dirty: {}}, {
        get: (target, prop, receiver) => {
            if(prop === 'data') return target.isDirty ? target.dirty : target.data;
            let targetData = receiver.data;
            if(prop === 'validate') return () => {
                let validationObj = {};
                for(let [key, val] of Object.entries(target?.schema)) {
                    if(key in targetData && typeof val === 'function')
                        validationObj[key] = val(targetData[key], targetData);
                    else if(typeof val === 'function')
                        validationObj[key] = val(targetData, key, target);
                    else if(typeof val === 'object')
                        validationObj[key] = receiver[key].validate();
                }
                return validationObj;
            }
            return targetData[prop];
        },
        set: (target, prop, value, receiver) => {
            if(prop === 'schema') return target.schema = value;
            console.log('setting ', target, prop, value)
            return Reflect.set(target.isDirty ? target.dirty : target.data, prop, value, receiver);
        }
    }) : inputData;
    isObject && Object.keys(proxifiedObj.data).forEach(key => proxifiedObj[key] = g(inputData[key]));
    return proxifiedObj;
}

let z = g(a);
z.schema = schema;
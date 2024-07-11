const css =  new Proxy({_sheets: {}}, {
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
});
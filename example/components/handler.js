const {TychePage, TycheHTML} = require('../../tyche');

function isAllowed(req) {
    if(Math.random() > 0.5) return true
    else return false;
}

function getUsername() {
    return "xXTomXx";
}

function handle(defaultPage, req) {
    //add your own logic here
    if(isAllowed(req)) return defaultPage.setProps({"username": getUsername()});
    else return new TychePage(TycheHTML.of('<h2>Not allowed!</h2>'));
}

module.exports = handle;
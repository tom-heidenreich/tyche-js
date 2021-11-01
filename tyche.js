const fs = require('fs');

class TychePage {
    static of([page, pageName]) {
        return new TychePage(page, pageName);
    }

    constructor(page, pageName) {
        this.page = page;
        this.name = pageName ? pageName : '<tyche-page>';
        this.props = {};
    }

    convert() {
        return [this.page, this.name, this.props];
    }

    setProps(props) {
        this.props = props;
        return this;
    }
}

class TycheHTML {
    constructor(content) {
        this.content = content;
        this.props = {};
    }
    static of(content) {
        return new TycheHTML(content);
    }
    static file(file) {
        if(!fs.existsSync(file)) throw new Error(`no such file '${file}'`)
        return new TycheHTML(fs.readFileSync(file));
    }
    setProps(props) {
        this.props = props;
        return this;
    }
}

module.exports = {TychePage, TycheHTML};
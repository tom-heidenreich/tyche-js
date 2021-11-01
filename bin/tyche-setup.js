#!/usr/bin/env node
const {start, createProject} = require('./tyche-engine');
if(process.argv.length > 2) {
    switch(process.argv[2]) {
        case "create": {
            console.log("creating your project...");
            createProject();
            console.clear();
            console.log("Created a new project!")
            break;
        }
        case "start": {
            start();
            break;
        }
        default: {
            console.log(`Command '${process.argv[2]}' not found!`)
        }
    }
}else {
    const build = (async() => {
        Object.keys(cmds).forEach(key => {
            const element = cmds[key];
            element.internal();
        });
    });
    var cmds = {
        "create": {"cmd": "npx tyche create", "internal": createProject},
        "start": {"cmd": "npx tyche start", "internal": start}
    }
    build();
}
# IMPORTANT
## `tyche-js` is in an early alpha!
### `v1.013` is the first partly stable version.
<br/>

A basic HTML Framework.

## Setup

### Install
`npm i tyche-js`

### Create Project
`npx tyche create`

### Start DevServer
`npx tyche start`


## Create a page

### Create
`/components/app.html`

### Basic HTML
```html
<!app.html->
<h2>Hello world!</h2>
```

### Configure
Add page `app` in `tyche.json`.
```json
{
    "frontend": {
        "pages": {
            "app": {
                "index": "app.html"
            }
        }
    }
}
```

## Backend
### Configure
Set the backend port to `3000` and add a route to serve page `app`.
```json
{
    "frontend": {
        "pages": {
            "app": {
                "index": "app.html"
            }
        }
    },
    "backend": {
        "port": 3000,
        "routes": {
            "/": "app"
        }
    }
}
```
### Dynamic Page
Process the page before sending it to the user.
<br/>
`tyche.json`
```json
{
    "frontend": {...},
    "backend": {
        "routes": {
            "/": {
                "dynamic": true,
                "handler": "handler.js",
                "page": "app"   /*default page (optional)*/
            }
        }
    }
}
```
Create new file `handler.js`.
```js
const {TychePage, TycheHTML} = require('tyche-js');

function handle(defaultPage, req) {
    //add your own logic here
    if(isAllowed(req)) return defaultPage;
    else return new TychePage(TycheHTML.of('<h2>Not allowed!</h2>'));
}

module.exports = handle;
```

## Meta
### Add Title to page
```json
{
    "frontend": {
        "meta": {
            "title": "Tyche",  /*set default title*/
            "charset": "UTF-8"  /*set default charset*/
        }
        "pages": {
            "app": {
                "meta": {
                    "title": "App"  /*set title for this page.*/
                }
                "index": "app.html"
            }
        }
    },
    backend": {...}
}
```
## Link components
### Link `app.css` in `app.html`
```html
<!app.html->
<link location="app.css" type="style"/>
<h2>Hello world!</h2>
```
### Link `component.html` in `app.html`
```html
<!app.html->
<link location="app.css" type="style"/>
<h2>Hello world!</h2>
<div>
    <link location="component.html"/>
</div>
```
## States
Note: States work only in `dynamic` pages.
<br/>
### Define state `username` in `app.html`
```html
<define name="username"/>
<link location="app.css" type="style"/>
<h2>Hello <username/>!</h2>
<div>
    <link location="component.html"/>
</div>
```
### Set State
Set state `username` inside `handler.js`
```js
const {TychePage, TycheHTML} = require('tyche-js');

function handle(defaultPage, req) {
    //add your own logic here
    if(isAllowed(req)) return defaultPage.setProps({"username": getUsername()});
    else return new TychePage(TycheHTML.of('<h2>Not allowed!</h2>'));
}

module.exports = handle;
```
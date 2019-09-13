// import .env
require('dotenv').config()
var port = 80
if (process.env.PORT != undefined) {
    port = process.env.PORT
}

// import nhentai library
var nhentai = require('./nhentai.js')

// require express
var express = require('express')
var app = express()

// set the view engine to ejs
app.set('view engine', 'ejs');

// require moment
var moment = require('moment')

// require image size prober
var probe = require('probe-image-size');

// propercase lol
String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

// handle search page requests
const sorts = ['popular', 'date']

// converting languages to data-tags
const datatagLanguagePairs = {
    'japanese': '6346',
    'english': '12227',
    'chinese': '29963'
}


var searchHandler = function(req, res) {
    if(req.params.sort == undefined){
        var sort = "date";
    }else if(sorts.includes(req.params.sort)) {
        var sort = req.params.sort.toString().toLowerCase()
    }else{
        res.status(400)
            .send("400 bad request")
    }

    if(isNaN(req.params.page)){
        var page = "1";
    }else{
        var page = req.params.page.toString()
    }

    var query = decodeURI(req.params.query)

    nhentai.search(query, page, sort)
        .then((homeObj) => {
            var pageSelectArr = [{
                number: parseInt(page),
                class: "page current"
            }]
            for (var i = 0; i < 5; i++){
                var firstPage = pageSelectArr[0].number
                if(firstPage - 1 > 0){
                    pageSelectArr.unshift({
                        number: firstPage - 1,
                        class: "page"
                    })
                }else{
                    break
                }
            }
            for (var i = 0; i < 5; i++){
                var lastPage = pageSelectArr[pageSelectArr.length-1].number
                if(lastPage + 1 <= homeObj.lastPage){
                    pageSelectArr.push({
                        number: lastPage + 1,
                        class: "page"
                    })
                }else{
                    break
                }
            }
            homeObj.results.forEach((book, i) => {
                if(book.languages.length > 0){
                    var datatagArr = []
                    book.languages.forEach((language) => {
                        if(language in datatagLanguagePairs){
                            datatagArr.push(datatagLanguagePairs[language])
                        }
                    })
                    homeObj.results[i].datatag=datatagArr.join(" ")
                }else{
                    homeObj.results[i].datatag=""
                }
            });
            homeObj.nextPage = page - -1
            homeObj.currentPage = parseInt(page)
            homeObj.prevPage = page - 1
            homeObj.pageSelectArr = pageSelectArr
            homeObj.query = encodeURI(query)
            homeObj.queryRaw = query
            homeObj.sort = sort
            res.render('pages/search', homeObj)
        })
        .catch((err) => {
            console.log(err)
            res.status(404)
                .send("404 not found")
        })
}


// handle home page requests
var homeHandler = function(req, res) {
    if(isNaN(req.params.page)){
        var page = "1";
    }else{
        var page = req.params.page.toString()
    }
    nhentai.getHomepage(page)
        .then((homeObj) => {
            var pageSelectArr = [{
                number: parseInt(page),
                class: "page current"
            }]
            for (var i = 0; i < 5; i++){
                var firstPage = pageSelectArr[0].number
                if(firstPage - 1 > 0){
                    pageSelectArr.unshift({
                        number: firstPage - 1,
                        class: "page"
                    })
                }else{
                    break
                }
            }
            for (var i = 0; i < 5; i++){
                var lastPage = pageSelectArr[pageSelectArr.length-1].number
                if(lastPage + 1 <= homeObj.lastPage){
                    pageSelectArr.push({
                        number: lastPage + 1,
                        class: "page"
                    })
                }else{
                    break
                }
            }
            homeObj.results.forEach((book, i) => {
                if(book.languages.length > 0){
                    var datatagArr = []
                    book.languages.forEach((language) => {
                        if(language in datatagLanguagePairs){
                            datatagArr.push(datatagLanguagePairs[language])
                        }
                    })
                    homeObj.results[i].datatag=datatagArr.join(" ")
                }else{
                    homeObj.results[i].datatag=""
                }
            });
            homeObj.nextPage = page - -1
            homeObj.currentPage = parseInt(page)
            homeObj.prevPage = page - 1
            homeObj.pageSelectArr = pageSelectArr
            homeObj.queryRaw = ""
            res.render('pages/home', homeObj)
        })
        .catch((err) => {
            console.log(err)
            res.status(404)
                .send("404 not found")
        })
}

// handle home page requests
var infoHandler = function(req, res) {
    nhentai.getDoujin(req.params.bookId)
        .then((bookObj) => {
            for(var key in bookObj.details){
                bookObj.details[key].forEach((item, i) => {
                    var itemSplit = item.split(" ")
                    var number = itemSplit[itemSplit.length-1]
                    itemSplit.pop()
                    var tagName = itemSplit.join(" ")
                    bookObj.details[key][i] = {tagName, number}
                });
            }
            var detailkeys = []
            for (var key in bookObj.details) {
                detailkeys.push(key)
            }
            bookObj.suggestions.forEach((book, i) => {
                if(book.languages.length > 0){
                    var datatagArr = []
                    book.languages.forEach((language) => {
                        if(language in datatagLanguagePairs){
                            datatagArr.push(datatagLanguagePairs[language])
                        }
                    })
                    bookObj.suggestions[i].datatag=datatagArr.join(" ")
                }else{
                    bookObj.suggestions[i].datatag=""
                }
            });
            bookObj.moment = moment
            bookObj.detailkeys = detailkeys
            bookObj.queryRaw = ""
            bookObj.bookId = req.params.bookId
            bookObj.mainThumbnail = bookObj.thumbnails[0].replace().replace('1t.jpg', 'cover.jpg')
            res.render('pages/info', bookObj)
        })
        .catch((err) => {
            console.log(err)
            res.status(404)
                .send("404 not found")
        })
}

// handle viewer page requests
var viewerHandler = function(req, res) {
    var bookId = req.params.bookId
    if (!isNaN(bookId)) {
        nhentai.getDoujin(bookId)
            .then(async (nhObj) => {
                const probePromise = await Promise.all(
                    nhObj.pages.map(async page => {
                        var pageObj = {url: page}
                        const result = await probe(page);
                        pageObj.width = result.width
                        pageObj.height = result.height
                        return pageObj
                    })    
                );
                nhObj.pages = probePromise;
                nhObj.pageExists = req.params.page != undefined
                nhObj.page = req.params.page
                res.render('pages/nvssviewer', nhObj);
            })
            .catch((err) => {
                console.log(err)
                res.status(404)
                    .send("404 not found")
            })
    } else {
        res.status(400)
            .send("400 bad request")
    }
}

var handleFavicon = function(req, res) {
    res.download('./static/favicon.ico', 'favicon.ico');
}

// no favicon
app.get('/favicon.ico', handleFavicon)

// respond to home pages
app.get('/', homeHandler)
app.get('/:page', homeHandler)

// respond to search pages
app.get('/s/:query', searchHandler)
app.get('/s/:query/:page', searchHandler)
app.get('/s/:query/:page/:sort', searchHandler)

// respond to info pages
app.get('/i/:bookId', infoHandler)

// respond to info pages
app.get('/g/:bookId', viewerHandler)
app.get('/g/:bookId/:page', viewerHandler)

// start listening
app.listen(port, () => console.log(`nhMirror.js listening on port ${port}!`))
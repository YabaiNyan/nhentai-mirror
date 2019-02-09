// import .env
require('dotenv').config()
var port = 80
if (process.env.PORT != undefined) {
    port = process.env.PORT
}

// import nhentai library
var nhentai = require('nhentai-js')

// require express
var express = require('express')
var app = express()

// set the view engine to ejs
app.set('view engine', 'ejs');


// handle search page requests
const sorts = ['popular', 'date']

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
            console.log(bookObj)
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


// respond to home pages
app.get('/', homeHandler)
app.get('/:page', homeHandler)

// respond to search pages
app.get('/s/:query', searchHandler)
app.get('/s/:query/:page', searchHandler)
app.get('/s/:query/:page/:sort', searchHandler)

// respond to info pages
app.get('/i/:bookId', infoHandler)

// start listening
app.listen(port, () => console.log(`nhMirror.js listening on port ${port}!`))
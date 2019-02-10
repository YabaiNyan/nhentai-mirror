const request = require('superagent')
const cheerio = require('cheerio')
const tagSpacerPatternn = /(\([0-9,]+\))([a-zA-Z])/g
const tagSplitPattern = /(?<=\))\s(?=[a-zA-Z])/

const urlToId = /(https?:\/\/nhentai\.net\/g\/)(\d+)\/?/
const gToId = /\/g\/(\d+)\//
const hrefToPage = /(&||\?)page=(\d+)/
const doubleSlashToHttps = /(https:)?(\/\/)/
const styleToAspectRatio = /padding:0 0 (.*)% 0/
const resultsToInt = /(.*) Results/i
const tabTitleRegex = /(.*) » nhentai: hentai doujinshi and manga/

const sorts = ['popular', 'date']
const languagesDataTagPairs = {
    '6346': 'japanese',
    '12227': 'english',
    '29963': 'chinese'
}

class nHentai {
    static getDoujin(nhentai) {
        const id = nhentai.replace(urlToId, '$2')
        return new Promise((resolve, reject) => {
            request
                .get('https://nhentai.net/g/' + id + '/')
                .then(res => {
                    const $ = cheerio.load(res.text)
                    let details = {}
                    $('.tag-container.field-name').text().split('\n').map(string => string.trim()).filter(u => u).map((tag, i, tags) => {
                        if (tag.endsWith(':') && !tags[i + 1].endsWith(':')) { details[tag.substring(0, tag.length - 1).toLowerCase()] = tags[i + 1].replace(tagSpacerPatternn, '$1 $2').split(tagSplitPattern) }
                    })
                    const tabTitle = $('title').text().replace(tabTitleRegex, '$1')
                    const title = $('#info').find('h1').text()
                    const nativeTitle = $('#info').find('h2').text()
                    let uploadDate = null;
                    for(var key in $('#info').find('div')){
                        let children = $('#info').find('div')[key].children
                        if(children != undefined && typeof(children) == 'object'){
                            for(var child of children){
                                if(child.name != undefined){
                                    if(child.name == "time"){
                                        uploadDate = child.attribs.datetime
                                    }
                                }
                            }
                        }
                    }
                    let suggestions = []
                    let selector = $('.gallery').children('a')
                    Object.keys(selector).map((key) => {
                        if (!isNaN(key)) {
                            let bookdetails = {}
                            let datatagArr = selector[key].parent.attribs['data-tags'].split(" ");
                            let languages = [];
                            let book = selector[key]
                            let img = findObject(book.children, 'name', 'img')
                            bookdetails.bookId = book.attribs.href.replace(gToId, '$1')
                            bookdetails.thumbnailAspectRatio = book.attribs.style.replace(styleToAspectRatio, '$1')
                            if("is" in img.attribs){
                                bookdetails.thumbnail = img.attribs['data-src']
                            }else{
                                bookdetails.thumbnail = img.attribs['src'].replace(doubleSlashToHttps, 'https://')
                            }
                            datatagArr.forEach((datatag) => {
                                if(datatag in languagesDataTagPairs){
                                    languages.push(languagesDataTagPairs[datatag])
                                }
                            });
                            bookdetails.languages = languages;
                            bookdetails.title = findObject(book.children, 'name', 'div').children[0].data
                            suggestions.push(bookdetails)
                        }
                    })
                    const thumbnails = Object.entries($('.gallerythumb').find('img')).map(image => {
                        return image[1].attribs
                            ? image[1].attribs['data-src']
                            : null
                    }).filter(link => link)
                    const images = Object.entries($('.gallerythumb').find('img')).map(image => {
                        return image[1].attribs
                            ? image[1].attribs['data-src'].replace(/t(\.(jpg|png))/, '$1').replace('t.nhentai', 'i.nhentai')
                            : null
                    }).filter(link => link)
                    const link = `https://nhentai.net/g/${id}/`
                    resolve({ title, nativeTitle, tabTitle, details, pages: images, thumbnails, uploadDate, suggestions, link })
                })
                .catch(reject)
        })
    }

    static getHomepage(page = 1) {
        return new Promise((resolve, reject) => {
            if (page <= 0) {
                reject(new Error('Page must be greater than or equal to 1'))
                return
            }

            request
                .get('https://nhentai.net/?page=' + page)
                .then(res => {
                    const $ = cheerio.load(res.text)
                    let details = []
                    let selector = $('.gallery').children('a')
                    Object.keys(selector).map((key) => {
                        if (!isNaN(key)) {
                            let bookdetails = {}
                            let datatagArr = selector[key].parent.attribs['data-tags'].split(" ");
                            let languages = [];
                            let book = selector[key]
                            let img = findObject(book.children, 'name', 'img')
                            bookdetails.bookId = book.attribs.href.replace(gToId, '$1')
                            bookdetails.thumbnailAspectRatio = book.attribs.style.replace(styleToAspectRatio, '$1')
                            if("is" in img.attribs){
                                bookdetails.thumbnail = img.attribs['data-src']
                            }else{
                                bookdetails.thumbnail = img.attribs['src'].replace(doubleSlashToHttps, 'https://')
                            }
                            datatagArr.forEach((datatag) => {
                                if(datatag in languagesDataTagPairs){
                                    languages.push(languagesDataTagPairs[datatag])
                                }
                            });
                            bookdetails.languages = languages;
                            bookdetails.title = findObject(book.children, 'name', 'div').children[0].data
                            details.push(bookdetails)
                        }
                    })
                    resolve({
                        results: details,
                        lastPage: $('.last')[0] ? $('.last')[0].attribs.href.match(hrefToPage)[2] : page
                    })
                })
                .catch(reject)
        })
    }

    static search(query, page = 1, sort = 'date') {
        return new Promise((resolve, reject) => {

            if (!query) {
                reject(new Error('Query cannot be empty'))
                return
            }

            if (page <= 0) {
                reject(new Error('Page must be greater than or equal to 1'))
                return
            }

            const sortMethod = sort.toLowerCase()

            if (!sorts.includes(sortMethod)) {
                reject(new Error('Invalid sorting'))
            }

            request
                .get('https://nhentai.net/search/')
                .query({
                    q: query,
                    page,
                    sort: sort.toLowerCase()
                })
                .then(res => {
                    const $ = cheerio.load(res.text)
                    let details = []
                    let selector = $('.gallery').children('a')
                    Object.keys(selector).map((key) => {
                        if (!isNaN(key)) {
                            let bookdetails = {}
                            let datatagArr = selector[key].parent.attribs['data-tags'].split(" ");
                            let languages = [];
                            let book = selector[key]
                            let img = findObject(book.children, 'name', 'img')
                            bookdetails.bookId = book.attribs.href.replace(gToId, '$1')
                            bookdetails.thumbnailAspectRatio = book.attribs.style.replace(styleToAspectRatio, '$1')
                            if("is" in img.attribs){
                                bookdetails.thumbnail = img.attribs['data-src']
                            }else{
                                bookdetails.thumbnail = img.attribs['src'].replace(doubleSlashToHttps, 'https://')
                            }
                            datatagArr.forEach((datatag) => {
                                if(datatag in languagesDataTagPairs){
                                    languages.push(languagesDataTagPairs[datatag])
                                }
                            });
                            bookdetails.languages = languages;
                            bookdetails.title = findObject(book.children, 'name', 'div').children[0].data
                            details.push(bookdetails)
                        }
                    })
                    let numberOfResults = $('#content')[0].children ? findObject($('#content')[0].children, 'name', 'h2').children[0].data.match(resultsToInt)[1].split(',').join("") : null
                    if(!isNaN(numberOfResults)){
                        numberOfResults = parseInt(numberOfResults)
                    }else if(numberOfResults = "No"){
                        numberOfResults = 0
                    }else{
                        numberOfResults = null
                    }
                    resolve({
                        results: details,
                        lastPage: $('.last')[0] ? $('.last')[0].attribs.href.match(hrefToPage)[2] : page,
                        totalSearchResults: numberOfResults
                    })
                })
                .catch(reject)
        })
    }

    static exists(nhentai) {
        const id = nhentai.replace(urlToId, '$2')
        return new Promise((resolve, reject) => {
            request
                .head('https://nhentai.net/g/' + id + '/')
                .then(res => resolve(true))
                .catch(err => {
                    resolve(false)
                })
        })
    }
}

function findObject(obj, key, value) {
    return Object.entries(obj).filter(object => object[1][key] === value)[0][1]
}

module.exports = nHentai

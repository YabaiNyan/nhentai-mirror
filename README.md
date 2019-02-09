# nhentai-mirror
A nhentai mirror based on nhentai-js and express.js

## Note
THIS DOES NOT CACHE/SAVE ANY ACTUAL PAGES</br>
By mirror, it is meant that it proxys the requests to the server, which generates a new page that "mirrors" the real page.

Installation
=====
1) Clone this repository
2) Open a console in the downloaded folder and run ```npm install```
3) Create a ```.env``` file inside the folder with ```PORT=(port)``` inside, replacing (port) your desired port (default port is 80).
4) To start, run ```node nhMirror.js``` or ```npm test```

Usage
=====
Navigate to `(server):(port)` on a browser of your choice

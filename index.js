require('dotenv').config();
const express = require('express')
const app = express()
const port = process.env.PORT || 3000
var cookieParser = require('cookie-parser')
const multer = require('multer');
const AWS = require('aws-sdk')
const shortid = require('shortid');
const cors = require('cors')
const request = require('request');

var s3 = new AWS.S3();

app.use(cors())

app.use(cookieParser())

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

var storage = multer.memoryStorage()

const upload = multer({storage });

function getMediaPath(path) {
  return `https://uirecorder.s3.amazonaws.com/assets/${path}`
}

function getMediaProxyPathFromId(path) {
  return `uxshot.com/${path}`
}

app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    if (req.get('X-Forwarded-Proto') === 'http') {
      res.redirect(`https://${req.hostname}${req.url}`);
    } else {
      next();
    }
  } else {
    next();
  }
})

app.get('/', function (req, res) {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>uxshot - instantly screen capture in-browser</title>
        <script src="https://unpkg.com/uxshot@0.0.11/dist/uxshot.js"></script>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
        <meta name="description" content="Instantly screen capture and record in-browser">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
            font-size: 14px;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <h1>uxshot</h1>
        <p>Instantly screen capture and record in-browser.</p>
        <h2>Demo</h2>
        <p>Press <code>ctrl+s</code> to screenshot or <code>ctrl+r</code> to record your screen.</p>
        <p>Copy the link from the popup. It will look like this: <a href="https://uxshot.com/NGEZloy.png">https://uxshot.com/NGEZloy.png</a></p>
        <h2>Usage</h2>
        <p>Find <a href="https://www.npmjs.com/package/uxshot">installation and usage docs</a> on NPM.</p>
        <script>uxshot();</script>
      </body>
    </html>
  `);
});

app.get('/:mediaPath', function (req, res) {
  request(getMediaPath(req.params.mediaPath)).pipe(res);
});

app.post('/upload', upload.single('media'), (req, res) => {
  const {mediaType, media} = req.body;

  const filename = shortid.generate();

  const isVideo = mediaType === 'video';

  const extension = isVideo ? '.webm' : '.png'

   var params = {
    ACL: "public-read", 
    Body: req.file.buffer, 
    Bucket: "uirecorder", 
    Key: `assets/${filename}${extension}`,
    ContentType: isVideo ? 'video/webm' : 'image/png',
   };

   s3.putObject(params, function(err, data) {
    if (err) {
      res.sendStatus(500);
    }else{
      res.json({
        data: {
          url: getMediaProxyPathFromId(`${filename}${extension}`)
        }
      });
    }
   });

});

app.listen(port, () => console.log(`BrowserFilm listening on port ${port}!`))
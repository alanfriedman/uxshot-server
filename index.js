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
  res.send('hello world');
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
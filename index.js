require('dotenv').config();
const express = require('express')
const app = express()
const port = process.env.PORT || 3000
var cookieParser = require('cookie-parser')
const multer = require('multer');
const AWS = require('aws-sdk')
const shortid = require('shortid');
const cors = require('cors')

var s3 = new AWS.S3();

app.use(cors())

app.use(cookieParser())

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

var storage = multer.memoryStorage()

const upload = multer({storage });

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

app.post('/upload', upload.single('video'), (req, res) => {

  const filename = shortid.generate();

   var params = {
    ACL: "public-read", 
    Body: req.file.buffer, 
    Bucket: "uirecorder", 
    Key: "assets/" + filename + '.webm',
    ContentType: 'video/webm'
   };

   s3.putObject(params, function(err, data) {
    if (err) {
      console.log(err, err.stack);
      res.sendStatus(500);
    }else{
      console.log('https://uirecorder.s3.amazonaws.com/assets/' + filename + '.webm');
      res.json({
        data: {
          url: 'https://uirecorder.s3.amazonaws.com/assets/' + filename + '.webm'
        }
      });
    }
   });

});

app.listen(port, () => console.log(`BrowserFilm listening on port ${port}!`))
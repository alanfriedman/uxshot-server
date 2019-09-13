import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
const app = express()
const port = process.env.PORT || 3000
import cookieParser from 'cookie-parser'
import multer from 'multer';
import AWS from 'aws-sdk'
import shortid from 'shortid';
import cors from 'cors'
import {query} from './db/index.js';
import exphbs from 'express-handlebars';
import createDOMPurify from 'dompurify';
import jsdom from 'jsdom';
import pathLib from 'path';

const jsDomWindow = (new jsdom.JSDOM('')).window;
const DOMPurify = createDOMPurify(jsDomWindow);

const s3 = new AWS.S3();

app.use(cors())

app.use(cookieParser())

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

const {S3_BUCKET_NAME: s3BucketName = '', S3_FILE_PATH: s3FilePath = ''} = process.env;

app.engine(
  'hbs',
  exphbs.create({
    partialsDir: [
      'views/shared/',
      'views/pages/',
    ],
    layoutsDir: 'views/layouts/',
    defaultLayout: 'main',
    extname: '.hbs',
    compilerOptions: {
      preventIndent: true
    },
    helpers: {
      json: data => JSON.stringify(data)
    }
  }).engine
);
app.set('views', 'views/pages/');
app.set('view engine', 'hbs');

const storage = multer.memoryStorage()
const upload = multer({storage });

function getMediaPath(path, type) {
  const extension = type === 'video' ? '.webm' : '.png'
  return `https://${s3BucketName}.s3.amazonaws.com/${pathLib.join(s3FilePath, `${path}${extension}`)}`
}

function getShotDomain() {
  return process.env.NODE_ENV === 'production' ? 'uxshot.com' : `localhost:${port}`
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
  res.render('home');
});

app.get('/:slug', async function (req, res) {
  const [shot] = await query('select * from shots where slug = ?', req.params.slug)
  // request(getMediaPath(req.params.slug)).pipe(res);
  if (!shot) {
    res.sendStatus(404);
    return;
  }

  let errors = [];
  try {
    errors = JSON.parse(shot.errors);
  } catch(err) {

  }

  res.render('shot', {
    ...shot,
    isVideo: shot.type === 'video',
    src: getMediaPath(req.params.slug, shot.type),
    description: DOMPurify.sanitize(shot.description),
    errors
  })
});

app.post('/upload', upload.single('media'), (req, res) => {
  const {mediaType, media, description = null, errors = ''} = req.body;

  const type = mediaType === 'video' ? 'video' : 'image';

  const slug = shortid.generate();

  const isVideo = type === 'video';

  const extension = isVideo ? '.webm' : '.png'

  const params = {
    ACL: "public-read", 
    Body: req.file.buffer, 
    Bucket: s3BucketName, 
    Key: pathLib.join(s3FilePath, `${slug}${extension}`),
    ContentType: isVideo ? 'video/webm' : 'image/png',
  };

  s3.putObject(params, async function(err, data) {
    if (err) {
      res.sendStatus(500);
    }else{
      await query(`insert into shots (type, description, slug, errors) values(?,?,?,?)`, [type, description, slug, errors]);
      res.json({
        data: {
          url: `${getShotDomain()}/${slug}`
        }
      });
    }
  });

});

app.listen(port, () => console.log(`uxshot listening on port ${port}!`))

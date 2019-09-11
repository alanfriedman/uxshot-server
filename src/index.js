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

const jsDomWindow = (new jsdom.JSDOM('')).window;
const DOMPurify = createDOMPurify(jsDomWindow);

const s3 = new AWS.S3();

app.use(cors())

app.use(cookieParser())

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

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
  return `https://uirecorder.s3.amazonaws.com/assets/${path}${extension}`
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
  res.render('shot', {
    ...shot,
    isVideo: shot.type === 'video',
    src: getMediaPath(req.params.slug, shot.type),
    description: DOMPurify.sanitize(shot.description),
  })
});

app.post('/upload', upload.single('media'), (req, res) => {
  const {mediaType, media, description = null} = req.body;

  const type = mediaType === 'video' ? 'video' : 'image';

  const slug = shortid.generate();

  const isVideo = type === 'video';

  const extension = isVideo ? '.webm' : '.png'

   const params = {
    ACL: "public-read", 
    Body: req.file.buffer, 
    Bucket: "uirecorder", 
    Key: `assets/${slug}${extension}`,
    ContentType: isVideo ? 'video/webm' : 'image/png',
   };

   s3.putObject(params, async function(err, data) {
    if (err) {
      res.sendStatus(500);
    }else{
      await query(`insert into shots (type, description, slug) values(?,?,?)`, [type, description, slug]);
      res.json({
        data: {
          url: `uxshot.com/${slug}`
        }
      });
    }
   });

});

app.listen(port, () => console.log(`uxshot listening on port ${port}!`))

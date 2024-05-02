const express = require('express');
const puppeteer = require('puppeteer');
const GIFEncoder = require('gifencoder');
const { createCanvas, Image } = require('canvas');
const fs = require('fs');
const path = require('path');
const app = express();

app.use('/spots', express.static(path.join(__dirname, 'spots')));

// Route to render 'test.html'
app.get('/test', (req, res) => {
    const filePath = path.join(__dirname, 'spots', 'test.html');
    res.sendFile(filePath);
});

function delay(time) {
  return new Promise(function(resolve) {
    setTimeout(resolve, time);
  });
}

app.get('/dynamic-html', (req, res) => {
  const { color1, color2 } = req.query;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body, html {
              margin: 0;
              padding: 0;
              overflow: hidden;
              height: 1000px;
              width: 1000px;
            }
            #frames {
              width: 900px;
              height: 900px;
            }
            #back {
              width: 1000px;
              height: 1000px;
              display: flex;
              justify-content: center;
              align-items: center;
              box-sizing: border-box;
              transition: background-color 1s ease; /* Smooth transition for background color */
            }
            svg {
              max-width: 90vw;
              max-height: 90vh;
              height: auto;
              transition: transform 1s;
            }
            use {
              display: none;
            }
            .layer12 {
              display: block;
            }
        </style>
    </head>
    <body>
      <div id="back">
        <svg id="frames">
          <use class="layer1" xlink:href="http://localhost:3000/spots/layer1.svg#svg" />
          <use class="layer2" xlink:href="http://localhost:3000/spots/layer2.svg#svg" />
          <use class="layer3" xlink:href="http://localhost:3000/spots/layer3.svg#svg" />
          <use class="layer4" xlink:href="http://localhost:3000/spots/layer4.svg#svg" />
          <use class="layer5" xlink:href="http://localhost:3000/spots/layer5.svg#svg" />
          <use class="layer6" xlink:href="http://localhost:3000/spots/layer6.svg#svg" />
          <use class="layer7" xlink:href="http://localhost:3000/spots/layer7.svg#svg" />
          <use class="layer8" xlink:href="http://localhost:3000/spots/layer8.svg#svg" />
          <use class="layer9" xlink:href="http://localhost:3000/spots/layer9.svg#svg" />
          <use class="layer10" xlink:href="http://localhost:3000/spots/layer10.svg#svg" />
          <use class="layer11" xlink:href="http://localhost:3000/spots/layer11.svg#svg" />
          <use class="layer12" xlink:href="http://localhost:3000/spots/layer12.svg#svg" />
        </svg>
      </div>
      <script>
      document.addEventListener('DOMContentLoaded', function () {
        var curFrame = 1;
        var numberOfFrames = 12;
        var use = document.querySelectorAll('use');
        console.log('use', use);
        var body = document.querySelector('body');
        var randomColor1 = '#${color1}';
        var randomColor2 = '#${color2}';
        console.log('random colors', randomColor1, randomColor2)
        document.querySelector('#back').style.background = randomColor1;
        body.style.background = randomColor1;
        for(var i = 0; i < use.length; i++){
          use[i].style.fill = randomColor2;
        }
        console.log(document.querySelector('#back').style.background);
        console.log(use[0].style.fill);

        setInterval(
          function(){
            var lastFrame = curFrame === 1? numberOfFrames : curFrame-1;
            var lastLayer = document.querySelector('.layer' + lastFrame);
            lastLayer.style.display = 'none';
            var curLayer = document.querySelector('.layer'+curFrame);
            curLayer.style.display = 'block';
            if(curFrame === numberOfFrames) curFrame = 1;
            else curFrame++;
          },50
        );
      });
      </script>
    </body>
    </html>`;
  res.status(200).send(htmlContent);
});

app.get('/generate-gif', async (req, res) => {
    const { color1, color2 } = req.query; // Hex colors passed as query parameters
    console.log('making art with', color1, color2);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`http://localhost:3000/dynamic-html?color1=${color1}&color2=${color2}`);
    await page.setViewport({ width: 1000, height: 1000 });

    page.on('console', message => console.log(`From page: ${message.text()}`));
    page.on('error', err => console.log('Error in the page:', err));
    page.on('pageerror', pageErr => console.log('Page error:', pageErr));

    // Set up GIF encoder to stream directly to response
    const encoder = new GIFEncoder(1000, 1000);
    encoder.start();
    encoder.setRepeat(0); // Make the GIF loop
    //encoder.setDelay(50);
    encoder.setQuality(90);

    // Use the encoder's stream to pipe directly to the response
    encoder.createReadStream().pipe(res.type('gif'));

    for (let i = 0; i < 12; i++) {
      //await delay(100);
      const screenshotBuffer = await page.screenshot();
      const img = new Image();
      img.src = screenshotBuffer;
      const canvas = createCanvas(1000, 1000);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 1000, 1000);
      const imageData = ctx.getImageData(0, 0, 1000, 1000).data;
      encoder.addFrame(imageData);
    }

    encoder.finish();
    await browser.close();
    //res.send('GIF created successfully!');
});

const port = 3000;
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});


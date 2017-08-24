var _ = require('lodash');
var express = require('express');
var inlineCss = require('inline-css');
var Rsvg = require('librsvg').Rsvg;
var generateChart = require('./chart.js')
var generateHotnessChart = require('./hotnessChart.js')

var port = process.env.PORT || 2197;

var app = express();

app.get('/chart.svg', (request, response, callback) => {
  generateChart(request, (err, svg) => {
    if (err) return callback(err);

    response.send(svg.node().outerHTML);
  });
});

app.get('/chart.png', (request, response, callback) => {
  generateChart(request, (err, svg) => {
    if (err) return callback(err);

    inlineCss(svg.node().outerHTML, {
      url: 'filePath'
    }).then((svgCssed) => {
      var png = new Rsvg(new Buffer(svgCssed)).render({
        format: 'png',
        width: svg.attr('width'),
        height: svg.attr('height')
      });

      response.set({
        'Cache-Control': 'public, max-age=86400',
        'Content-Type': 'image/png'
      });
      response.send(png.data);
    });
  })
});

app.get('/hotness_chart.svg', (request, response, callback) => {
  generateHotnessChart(request, (err, svg) => {
    if (err) return callback(err);

    response.send(svg.node().outerHTML);
  });
});

app.get('/hotness_chart.png', (request, response, callback) => {
  generateHotnessChart(request, (err, svg) => {
    if (err) return callback(err);

    inlineCss(svg.node().outerHTML, {
      url: 'filePath'
    }).then((svgCssed) => {
      var png = new Rsvg(new Buffer(svgCssed)).render({
        format: 'png',
        width: svg.attr('width'),
        height: svg.attr('height')
      });

      response.set({
        'Cache-Control': 'public, max-age=86400',
        'Content-Type': 'image/png'
      });
      response.send(png.data);
    });
  })
});

app.listen(port, () => {
  console.log(`Listening on http://0.0.0.0:${port}`);
  if (process.env.NODE_ENV !== 'production') {
    console.info('Try it out: \x1b[33;1mhttp://0.0.0.0:2197/chart.png?width=750&height=600&columns=2015-05-09,2015-06-09,2015-07-09,2015-08-09,2015-09-09,2015-10-09,2015-11-09,2015-12-09,2016-01-09,2016-02-09,2016-03-09&data=208000,215000,218000,215000,212500,216958,215000,215000,215000,218000,216312|438500,522500,339250,289000,384750,289625,226250,475000,348500,279900,170000&line_colors=D0D3E0,1C85E8&legend_labels=Phoenix,Your+Home\x1b[0m');
  }
});

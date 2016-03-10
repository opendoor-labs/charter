var _ = require('lodash');
var bodyParser = require('body-parser');
var d3 = require('d3');
var express = require('express');
var inlineCss = require('inline-css');
var jsdom = require('jsdom');
var Rsvg = require('librsvg').Rsvg;

var html = `<svg id="svg">
  <style>
    * {
      font-weight: 300;
      font-size: 12px;
      font-family: 'Whitney';
    }

    .axis path,
    .axis line {
      fill: none;
      stroke: #bdbfc1;
      shape-rendering: crispEdges;
    }

    .grid line {
      fill: none;
      stroke: #dedede;
      shape-rendering: crispEdges;
    }

    .line, .legend line {
      fill: none;
    }
  </style>
</svg>`;

// URL for testing:
// http://localhost:2197/chart.png?width=600&height=400&columns=2006-03-02,2006-04-02,2006-05-02,2006-06-02,2006-07-02,2006-08-02&data=295000,335900,240500,421825,450000,472500|150000,230000,320000,270000,300000,350000&line_colors=2ba8de,9ba1a6&legend_labels=Your+home,Phoenix

var app = express();
app.use(bodyParser.json());
app.get('/chart.png', function(request, response) {
  var rawColumns = (request.query.columns || '').split(',');
  var rawData = _.map((request.query.data || '').split('|'), (s) => s.split(','));
  var columnFormat = d3.time.format(request.query.colum_format || '%Y-%m-%d');
  var outputFormat = d3.time.format(request.query.output_format || '%B %Y')
  var width = request.query.width || 800;
  var height = request.query.height || 600;
  var lineColors = (request.query.line_colors || '').split(',');
  var legendLabels = _.map(_.compact((request.query.legend_labels || '').split(',')), (label) => label.replace('/\+/g', ' '));

  var columns = _.map(rawColumns, (column) => columnFormat.parse(column));
  var data = _.map(rawData, (data) => _.map(data, (d) => +d));

  jsdom.env({
    features: { QuerySelector: true },
    html: html,
    done: function(errors, window) {
      var svg = d3.select(window.document.querySelector('#svg'));

      var margin = {top: 25, right: 50, bottom: 25, left: 10},
          innerWidth = width - margin.left - margin.right,
          innerHeight = height - margin.top - margin.bottom,
          legendWidth = 100;

      var x = d3.time.scale()
          .domain(d3.extent(columns))
          .range([0, innerWidth]);

      var y = d3.scale.linear()
          .domain([0, d3.max(_.flatten(data))])
          .range([innerHeight, 0])
          .nice();

      var line = d3.svg.line()
          .interpolate('linear')
          .defined(d => d[1])
          .interpolate('cardinal')
          .tension(0.8)
          .x(function(d) { return x(d[0]); })
          .y(function(d) { return y(d[1]); });

      svg.attr('width', width)
          .attr('height', height);

      var chart = svg.append('g')
          .attr('class', 'chart')
          .attr('transform', `translate(${margin.left}, ${margin.top})`);

      var yAxis = d3.svg.axis()
          .scale(y)
          .orient('right')
          .ticks(4)
          .tickFormat(value => `$${value && (value/1000 + 'K')}`);

      chart.append('g')
          .attr('class', 'y axis')
          .attr('transform', `translate(${innerWidth}, 0)`)
          .call(yAxis);

      var yGrid = yAxis
          .tickSize(innerWidth, 0, 0)
          .tickFormat('');

      chart.append('g')
          .attr('class', 'y grid')
          .call(yGrid);

      var xAxis = d3.svg.axis()
          .scale(x)
          .orient('bottom')
          .ticks(5)
          .tickFormat(outputFormat);

      chart.append('g')
          .attr('class', 'x axis')
          .attr('transform', `translate(0, ${innerHeight})`)
          .call(xAxis);

      chart.selectAll('path.line')
          .data(data)
          .enter()
            .append('path')
            .attr('class', 'line')
            .style('stroke', (d, i) => `#${lineColors[i] || '2ba8de'}`)
            .attr('d', (d) => line(_.zip(columns, d)));

      if (legendLabels.length) {
        var legend = svg.append('g')
          .attr('class', 'legend')
          .attr('transform', `translate(${margin.left + innerWidth - legendWidth * data.length}, 10)`);

        var legends = legend.selectAll('g')
          .data(data)
          .enter()
            .append('g')
              .attr('transform', (d, i) => `translate(${i * legendWidth}, 0)`);

        legends
          .append('line')
            .attr('x2', 20)
            .attr('y2', 0)
            .style('stroke', (d, i) => `#${lineColors[i] || '2ba8de'}`);

        legends
          .append('text')
          .attr('x', 23)
          .attr('dy', '.32em')
          .text((d, i) => legendLabels[i]);
      }

      var svgHtml = svg.node().outerHTML;
      inlineCss(svgHtml, {
        url: 'filePath'
      }).then(function(svgCssed) {
        var png = new Rsvg(new Buffer(svgCssed)).render({
          format: 'png',
          width: width,
          height: height
        });

        response.set('Content-Type', 'image/png');
        response.send(png.data);
      });
    }
  });
});
app.listen(process.env.PORT || 2197);

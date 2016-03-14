var _ = require('lodash');
var d3 = require('d3');
var express = require('express');
var inlineCss = require('inline-css');
var jsdom = require('jsdom');
var Rsvg = require('librsvg').Rsvg;

var html = `
<svg>
  <style>
    * {
      font-weight: 400;
      font-size: 13px;
      font-family: 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif;
    }

    .axis path,
    .axis line {
      fill: none;
      stroke: #dedede;
      shape-rendering: crispEdges;
    }

    .tick {
      fill: #dedede;
    }

    .tick text {
      fill: #9ba1a6;
    }

    .grid line {
      fill: none;
      stroke: #dedede;
      shape-rendering: crispEdges;
    }

    .line, .legend line {
      fill: none;
      stroke-width: 2px;
    }

    .legend text {
      font-weight: 600;
    }

    .chart-border {
      stroke: #dedede;
      fill: #ffffff;
      shape-rendering: crispEdges;
    }
  </style>
</svg>
`;

// URL for testing:
// http://localhost:2197/chart.png?width=600&height=400&columns=2015-03-09,2015-04-09,2015-05-09,2015-06-09,2015-07-09,2015-08-09,2015-09-09,2015-10-09,2015-11-09,2015-12-09,2016-01-09,2016-02-09,2016-03-09&data=385000,465000,438500,522500,339250,289000,384750,289625,226250,475000,348500,279900,170000|199000,207995,208000,215000,218000,215000,212500,216958,215000,215000,215000,218000,216312&line_colors=2ba8de,9ba1a6&legend_labels=Your+Home,Phoenix

var app = express();
app.get('/chart.svg', function(request, response, callback) {
  generateChart(request, (err, svg) => {
    if (err) return callback(err);

    response.send(svg.node().outerHTML);
  });
});
app.get('/chart.png', function(request, response, callback) {
  generateChart(request, (err, svg) => {
    if (err) return callback(err);

    inlineCss(svg.node().outerHTML, {
      url: 'filePath'
    }).then(function(svgCssed) {
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
app.listen(process.env.PORT || 2197);

function generateChart(request, callback) {
  var rawColumns = (request.query.columns || '').split(',');
  var rawData = _.map((request.query.data || '').split('|'), (s) => s.split(','));
  var columnFormat = d3.time.format(request.query.colum_format || '%Y-%m-%d');
  var outputFormat = d3.time.format(request.query.output_format || '%b %Y');
  var uppercaseFormat = (d) => _.upperCase(outputFormat(d));
  var width = request.query.width || 800;
  var height = request.query.height || 600;
  var lineColors = (request.query.line_colors || '').split(',');
  var legendLabels = (_.compact((request.query.legend_labels || '').split(',')));

  var columns = _.map(rawColumns, (column) => columnFormat.parse(column));
  var data = _.map(rawData, (data) => _.map(data, (d) => +d));

  jsdom.env({
    features: { QuerySelector: true },
    html: html,
    done: function(err, window) {
      if (err) return callback(err);

      var svg = d3.select(window.document.querySelector('svg'));

      var margin = {top: 50, right: 25, bottom: 25, left: 25},
          chartWidth = width - margin.left - margin.right,
          chartHeight = height - margin.top - margin.bottom,
          legendWidth = 120;

      var x = d3.time.scale()
          .domain(d3.extent(columns))
          .range([0, chartWidth]);

      var extent = d3.extent(_.flatten(data));
      var buffer = extent[0] * 0.25;

      var y = d3.scale.linear()
          .domain([extent[0] - buffer, extent[1] + buffer])
          .range([chartHeight, 0])
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

      chart.append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('height', chartHeight)
          .attr('width', chartWidth)
          .attr('class', 'chart-border');

      chart.append('g')
          .attr('class', 'y axis')
          .attr('transform', `translate(0, 0)`)
          .call(yAxis)
        .selectAll('text')
          .attr('y', -13)
          .attr('x', 5);

      var yGrid = yAxis
          .tickSize(chartWidth, 0, 0)
          .tickFormat('');

      chart.append('g')
          .attr('class', 'y grid')
          .call(yGrid);

      var xAxis = d3.svg.axis()
          .scale(x)
          .orient('bottom')
          .ticks(3)
          .tickFormat(uppercaseFormat)
          .outerTickSize(0);

      chart.append('g')
          .attr('class', 'x axis')
          .attr('transform', `translate(0, ${chartHeight})`)
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
          .attr('transform', `translate(${margin.left + chartWidth - legendWidth * data.length - 10}, 23)`);

        var legends = legend.selectAll('g')
          .data(data)
          .enter()
            .append('g')
              .attr('transform', (d, i) => `translate(${i * legendWidth + 50}, 0)`);

        legends.append('circle')
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('r', 5)
            .style('fill', (d, i) => `#${lineColors[i] || '2ba8de'}`);

        legends.append('text')
            .attr('x', 10)
            .attr('dy', '.32em')
            .attr('class', 'legend')
            .text((d, i) => legendLabels[i].toUpperCase())
            .style('fill', (d, i) => `#${lineColors[i] || '2ba8de'}`);
      }

      callback(null, svg);
    }
  });
}

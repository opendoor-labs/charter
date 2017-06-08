var _ = require('lodash');
var d3 = require('d3');
var express = require('express');
var inlineCss = require('inline-css');
var jsdom = require('jsdom');
var moment = require('moment');
var Rsvg = require('librsvg').Rsvg;

var port = process.env.PORT || 2197;
var html = `
<svg>
  <style>
    * {
      font-weight: 400;
      font-size: 26px;
      font-family: 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif;
    }

    .axis path,
    .axis line {
      fill: none;
      stroke: #f0f0f0;
      shape-rendering: crispEdges;
    }

    .axis text.dark {
      stroke: #0F1C47;
      fill: #0F1C47;
    }

    .tick {
      fill: #dedede;
    }

    .tick line {
      stroke-width: 2px;
    }

    .tick text {
      fill: #9ba1a6;
      font-size: 14px;
    }

    .grid line {
      fill: none;
      stroke: #f0f0f0;
      stroke-width: 1px;
      shape-rendering: crispEdges;
    }

    .line, .legend line {
      fill: none;
      stroke-width: 4px;
    }

    .legend text {
      font-weight: 600;
      font-size: 16px;
    }

    .chart-border, .outer-border {
      stroke-width: 0;
      stroke: #dedede;
      shape-rendering: crispEdges;
    }

    .circles {
      stroke-width: 3px;
    }

    .circles-0 circle {
      fill: #D0D3E0 !important;
      stroke: #ffffff !important;
    }

    .circles-1 circle {
      fill: #ffffff !important;
      stroke: #1C85E8 !important;
    }

    .chart-border {
      fill: #ffffff;
    }

    .outer-border {
      fill: none;
    }

    .stop-left {
    stop-color: #9ee1f7;
    }

    .stop-right {
        stop-color: #ea7c7c;
    }

    .filled {
        fill: url(#mainGradient);
    }

    .labels_1 {
      fill: #1A232E;
      font-weight: 600;
      font-size: 20px;
    }

    .labels_2 {
      fill: #208EEF;
      font-weight: 600;
      font-size: 20px;
    }

    .labels_3 {
      fill: #F3F8FC;
      font-weight: 600;
      font-size: 16px;
    }

     .labels_4 {
      fill: #989B9F;
      font-weight: 600;
      font-size: 16px;
    }

     .labels_5 {
      fill: #1A232E;
      font-weight: 800;
      font-size: 36px;
    }

    .ruler_ticks {
    fill: #F3F8FC;
    }

    .svg-triangle {
     fill: #F3F8FC;
    }

  </style>
</svg>
`;

var tickFormats = {
  number: value => value.toString(),
  currencyK: value => `$${value && (value/1000 + 'K')}`,
  blank: value => ''
};

var tickStrategies = {
  period: (columns) => (axis) => {
    var columnindicies = _.filter(_.range(columns.length), (i) => i % 2 === 0);
    axis.tickValues(_.map(columnindicies, (i) => columns[i]));
  },
  constant: () => (axis) => {
    axis.ticks(5);
  }
};

var app = express();

app.get('/chart.svg', (request, response, callback) => {
  generateChart(request, (err, svg) => {
    if (err) return callback(err);

    response.send(svg.node().outerHTML);
  });
});

app.get('/hotness_chart.svg', (request, response, callback) => {
  generateHotnessChart(request, (err, svg) => {
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

var generateChart = (request, callback) => {
  jsdom.env({
    features: { QuerySelector: true },
    html: html,
    done: (err, window) => {
      if (err) return callback(err);

      try {
        renderChart(request, window, callback);
      } catch(err) {
        callback(err);
      }
    }
  });
};

var generateHotnessChart = (request, callback) => {
  jsdom.env({
    features: { QuerySelector: true },
    html: html,
    done: (err, window) => {
      if (err) return callback(err);

      try {
        renderHotnessChart(request, window, callback);
      } catch(err) {
        callback(err);
      }
    }
  });
};

var renderChart = (request, window, callback) => {
  var rawColumns = (request.query.columns || '').split(',');
  var rawData = _.map((request.query.data || '').split('|'), (s) => s.split(','));
  var columnFormat = d3.time.format(request.query.column_format || '%Y-%m-%d');
  var outputFormat = d3.time.format(request.query.output_format || '%b');
  var width = request.query.width || 800;
  var height = request.query.height || 600;
  var lineColors = (request.query.line_colors || '').split(',');
  var legendLabels = (_.compact((request.query.legend_labels || '').split(',')));
  var yTickFormatter = tickFormats[request.query.format || 'currencyK'];
  var applyGrid = request.query.grid || true
  var bufferMethod = request.query.buffer || 'default'
  var applyCircles = request.query.circles || true

  var columns = _.map(rawColumns, (column) => columnFormat.parse(column));
  var applyXTickStrategy = tickStrategies[request.query.tick_strategy || 'period'](columns);
  var data = _.map(rawData, (data) => _.map(data, (d) => +d));

  var svg = d3.select(window.document.querySelector('svg'));

  var margin = {top: 20, right: 20, bottom: 50, left: 20},
  chartWidth = width - margin.left - margin.right,
  chartHeight = height - margin.top - margin.bottom,
  legendWidth = 200;

  var xExtent = d3.extent(columns);

  var x = d3.time.scale()
    .domain([moment(xExtent[0]).subtract(10, 'days').toDate(),
        moment(xExtent[1]).add(10, 'days').toDate()])
    .range([0, chartWidth]);

  var yExtent = d3.extent(_.flatten(data));

  if (bufferMethod=='default') {
      var buffer = yExtent[0] * 0.25;
  }

  if (bufferMethod=='none') {
      var buffer = 0;
  }


  var y = d3.scale.linear()
    .domain([yExtent[0] - buffer, yExtent[1] + buffer])
    .range([chartHeight, 60])
    .nice();

  var line = d3.svg.line()
    .interpolate('linear')
    .defined(d => d[1])
    .interpolate('cardinal')
    .tension(0.8)
    .x(d => x(d[0]))
    .y(d => y(d[1]));

  svg.attr('width', width)
    .attr('height', height);

  svg.append('rect')
    .attr('x', 1)
    .attr('y', 1)
    .attr('height', height - 2)
    .attr('width', width - 2)
    .attr('class', 'outer-border');

  var chart = svg.append('g')
    .attr('class', 'chart')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  var yAxis = d3.svg.axis()
    .scale(y)
    .orient('right')
    .ticks(6)
    .tickFormat(yTickFormatter);

  chart.append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('height', chartHeight)
    .attr('width', chartWidth)
    .attr('class', 'chart-border');

  chart.append('g')
    .attr('class', 'y axis')
    .call(yAxis)
    .selectAll('text')
    .attr('y', -20)
    .attr('x', 10);

  var yGrid = yAxis
    .tickSize(chartWidth, 0, 0)
    .tickFormat('');

  if (applyGrid==true) {
    chart.append('g')
      .attr('class', 'y grid')
      .call(yGrid);
  }


  var xAxis = d3.svg.axis()
      .scale(x)
      .orient('bottom')
      .tickFormat(d => outputFormat(d).toUpperCase())
      .innerTickSize(5)
      .outerTickSize(0);

  applyXTickStrategy(xAxis);

  var xTicks = chart.append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('y', 20);

  d3.select(xTicks[0][xTicks.size() - 1]).attr('class', 'dark');

  chart.selectAll('path.line')
    .data(data)
    .enter()
    .append('path')
      .attr('class', 'line')
      .style('stroke', (d, i) => `#${lineColors[i] || 'D0D3E0'}`)
      .attr('d', (d) => line(_.zip(columns, d)));

  if (applyCircles==true) {
    chart.selectAll('g.circles')
    .data(data)
    .enter().append('g')
      .attr('class', (d, i) => `circles circles-${i}`)
    .selectAll('circle')
    .data(d => d)
    .enter().append('circle')
      .attr('r', 5)
      .style('fill', (d, i, j) => `#${lineColors[j] || '2ba8de'}`)
      .attr('cx', (d, i) => x(columns[i]))
      .attr('cy', d => y(d))
  }


  if (legendLabels.length) {
    var legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${margin.left + chartWidth - legendWidth * data.length + 25}, 55)`);

    var legends = legend.selectAll('g')
      .data(data)
      .enter()
      .append('g')
        .attr('transform', (d, i) => `translate(${i * legendWidth + 50}, 0)`);

    legends.append('circle')
        .attr('cx', 5)
        .attr('cy', -1)
        .attr('r', 5)
        .style('fill', (d, i) => `#${lineColors[i] || '1C85E8'}`);

    legends.append('text')
        .attr('x', 20)
        .attr('dy', '.32em')
        .attr('class', 'legend')
        .text((d, i) => legendLabels[i].toUpperCase())
        .style('fill', (d, i) => `#${lineColors[i] || '1C85E8'}`);
  }

  callback(null, svg);
};


var renderHotnessChart = (request, window, callback) => {
  var rawColumns = (request.query.columns || '').split(',');
  var rawData = _.map((request.query.data || '').split('|'), (s) => s.split(','));
  var columnFormat = d3.time.format(request.query.column_format || '%Y-%m-%d');
  var outputFormat = d3.time.format(request.query.output_format || '%b');
  var width = request.query.width || 600;
  var height = request.query.height || 220;
  var hotness = request.query.hotness || 'Hot';
  var hotness_score = request.query.hotness_score;
  var score_change = request.query.score_change;
  var change_sign = request.query.change_sign || '+';

  var columns = _.map(rawColumns, (column) => columnFormat.parse(column));
  var applyXTickStrategy = tickStrategies[request.query.tick_strategy || 'period'](columns);
  var data = _.map(rawData, (data) => _.map(data, (d) => +d));

  var svg = d3.select(window.document.querySelector('svg'));

  var lineFunction = d3.svg.line()
    .x(function(d) { return d.x; })
    .y(function(d) { return d.y; })
    .interpolate('linear')

  svg.attr('width', width)
    .attr('height', height);

  svgDefs = svg.append('defs');
  mainGradient = svgDefs.append('linearGradient').attr('id', 'mainGradient');
  mainGradient.append('stop').attr('class','stop-left').attr('offset','0');
  mainGradient.append('stop').attr('class','stop-right').attr('offset','1');

  svg.append('rect')
    .classed('filled',true)
    .attr('x', 50)
    .attr('y', 50)
    .attr('height', 100)
    .attr('width', 500);

  for (var i = 0; i<11; i++) {
  var tick_mark = svg.append('rect')
    .attr('class','ruler_ticks')
    .attr('x', 60+48*i)
    .attr('y', 130)
    .attr('height', 20)
    .attr('width', 1);
  }

svg.append("text").text('Hotness Score').attr('class','labels_1').attr("x","50").attr("y","35");

svg.append("text").text('COLD').attr('class','labels_4').attr("x","60").attr("y","172");

svg.append("text").text('HOT').attr('class','labels_4').attr("x","510").attr("y","172");

lineData = [ {"x": (hotness_score*4.8)+30, "y":100}, {"x":(hotness_score*4.8)+60, "y": 147},
             {"x":(hotness_score*4.8)+90, "y":100}]
svg.append('path')
    .attr('class', 'svg-triangle')
    .attr('d', lineFunction(lineData))

svg.append('circle').attr('fill','white')
    .attr('cx', (hotness_score*4.8)+60)
    .attr('cy', 80)
    .attr('r', 55)

if (score_change>=10) {
    var delta = 15
    } else {
    var delta = 23
    }

svg.append("text").text(change_sign+score_change).attr('class','labels_5').attr("x",(hotness_score*4.8)+delta).attr("y",90);
svg.append("text").text('PTS').attr('class','labels_4').attr("x",(hotness_score*4.8)+45).attr("y",110);

  callback(null, svg);
};

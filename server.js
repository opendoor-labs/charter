var _ = require('lodash');
var d3 = require('d3');
var express = require('express');
var inlineCss = require('inline-css');
var jsdom = require('jsdom');
var moment = require('moment');
var Rsvg = require('librsvg').Rsvg;

var port = process.env.PORT || 2197;

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

var generateChart = (request, callback) => {
  jsdom.env({
    features: { QuerySelector: true },
    html: chartHtml,
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
    html: hotnessHtml,
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

var chartHtml = `
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
  </style>
</svg>
`;

var renderChart = (request, window, callback) => {
  var rawColumns = (request.query.columns || '').split(',');
  var rawData = _.map((request.query.data || '').split('|'), (s) => s.split(','));
  var columnFormat = d3.time.format(request.query.column_format || '%Y-%m-%d');
  var outputFormat = d3.time.format(request.query.output_format || '%b');
  var width = request.query.width || 800;
  var height = request.query.height || 600;
  var lineColors = (request.query.line_colors || '').split(',');
  var legendLabels = (_.compact((request.query.legend_labels || '').split(',')));
  var yLabelFormat = request.query.format || 'currencyK'
  var yTickFormatter = tickFormats[yLabelFormat];
  var applyGrid = request.query.grid || true
  var bufferMethod = request.query.buffer || 'default'
  var applyCircles = request.query.circles || true
  var yAxisOrient = request.query.y_axis_orient || 'right'

  // Choose which formating we want to use when printing our x axis labels
  var xAxisFormat;
  if (request.query.x_axis_format == 'year_first_last') {
    xAxisFormat = (d,i) => {
      // only print first and last x axis label
      // and print the year of the value
      // *NOTE: the 'period' tickStrategies option specifies that
      // only half of the values will be printed on the x axis
      return i == 0 || i == Math.floor(rawColumns.length / 2) ? moment(d).year() : '';
    }
  } else {
    xAxisFormat = d => outputFormat(d).toUpperCase();
  }
  // Adjust how far to the left we want to print our y axis labels
  var yAxisLabelOffsetX = yAxisOrient == 'left' ? (yLabelFormat ==  'currencyK' ? -50 : -30) : 10;
  // Adjust our vertical offset for where we print our y axis labels
  var yAxisLabelOffsetY = yAxisOrient == 'left' ? 0 : -20;
  // When printing currencyK values on the y axis we need more
  // margin to the left if we have left oriented the y axis labels
  var marginLeft = yAxisOrient == 'left' && yLabelFormat ==  'currencyK' ? 50 : 30

  var columns = _.map(rawColumns, (column) => columnFormat.parse(column));
  var applyXTickStrategy = tickStrategies[request.query.tick_strategy || 'period'](columns);
  var data = _.map(rawData, (data) => _.map(data, (d) => +d));

  var svg = d3.select(window.document.querySelector('svg'));

  var margin = {top: 20, right: 20, bottom: 50, left: marginLeft},
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
    .attr('y', yAxisLabelOffsetY)
    .attr('x', yAxisLabelOffsetX);

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
      .tickFormat(xAxisFormat)
      .innerTickSize(5)
      .outerTickSize(0);

  applyXTickStrategy(xAxis);

  var xTicks = chart.append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('y', 10);

  // We don't want to bolden the last x axis label when
  // we are only displaying the first and last year
  if(request.query.x_axis_format != 'year_first_last'){
    d3.select(xTicks[0][xTicks.size() - 1]).attr('class', 'dark');
  }

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

var hotnessHtml = `
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
    .axis path {
      stroke: none;
    }

    .header {
      fill: #1A232E;
      font-weight: 600;
      font-size: 20px;
    }

    .tick-labels {
      fill: #989B9F;
      font-weight: 600;
      font-size: 16px;
    }

    .delta {
      fill: #1A232E;
      font-weight: 800;
      font-size: 36px;
    }
  </style>
</svg>
`;

var renderHotnessChart = (request, window, callback) => {
  var score = +request.query.score;
  var delta = +request.query.delta;

  var margin = { top: 50, right: 50, bottom: 70, left: 50 };
  var width = 700 - margin.left - margin.right,
      height = 220 - margin.top - margin.bottom;
  var svg = d3.select(window.document.querySelector('svg'));

  svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

  svg.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('height', 110)
      .attr('width', 700)
      .attr('fill', '#e8f2fc')

  var chart = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`)

  var x = d3.scale.linear()
      .domain([0, 100])
      .range([0, width]);
  var colors = d3.scale.linear()
      .domain(x.domain())
      .range(['#80DDFD', '#FA7F83']);

  chart.selectAll('rect')
      .data(_.range(-2, colors.domain()[1]+2))
    .enter().append('rect')
      .attr('x', x)
      .attr('y', 0)
      .attr('height', height)
      .attr('width', width/colors.domain()[1])
      .attr('fill', colors);

  var xAxis = d3.svg.axis()
      .orient('top')
      .scale(x)
      .tickSize(20)
      .tickFormat('');
  chart.append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(0, ${height})`)
      .call(xAxis);

  chart.append('text')
      .text('Hotness Score')
      .attr('class', 'header')
      .attr('x', 0)
      .attr('y', -10);
  chart.append("text")
      .text('COLD')
      .attr('class', 'tick-labels')
      .attr('x', 0)
      .attr('y', height + 20);
  chart.append("text")
      .text('HOT')
      .attr('class', 'tick-labels')
      .attr('text-anchor', 'end')
      .attr('x', width)
      .attr('y', height + 20);

  chart.append('polygon')
      .attr('points', `${x(score - 5)},50 ${x(score)},100 ${x(score + 5)},50`)
      .attr('fill', 'white')
  chart.append('circle')
      .attr('fill', 'white')
      .attr('cx', x(score))
      .attr('cy', 30)
      .attr('r', 55)

  chart.append('text')
      .text(d3.format('+.1f')(delta))
      .attr('class', 'delta')
      .attr('text-anchor', 'middle')
      .attr('x', x(score))
      .attr('y', 40);
  chart.append('text')
      .text('PTS')
      .attr('class','tick-labels')
      .attr('text-anchor', 'middle')
      .attr('x', x(score))
      .attr('y', 60);

  callback(null, svg);
};

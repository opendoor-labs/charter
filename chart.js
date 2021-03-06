var jsdom = require('jsdom');
var d3 = require('d3');
var _ = require('lodash');
var moment = require('moment');

var tickFormats = {
  number: value => value.toString(),
  currencyK: value => `$${value && (value/1000 + 'K')}`,
  blank: value => '',
  percentage: value => `${Math.round(value * 1000)/10}%`
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

  // Position Y AXIS Labels
  // Adjust vertical & horizontal offset of where y axis labels are printed
  var yAxisLabelOffsetY = -20;
  var yAxisLabelOffsetX = 10;
  var marginLeft = 30;
  var textAnchor = 'start';
  // Override these defaults for the following cases
  if (yAxisOrient == 'left') {
    textAnchor = 'end';
    yAxisLabelOffsetX = -5;
    switch(yLabelFormat){
      case 'currencyK':
        yAxisLabelOffsetY = -10;
        marginLeft = 50;
        break;
      case 'percentage':
        yAxisLabelOffsetY = 0;
        marginLeft = 50;
        break;
    }
  }

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
    .attr('x', yAxisLabelOffsetX)
    .style('text-anchor', textAnchor);

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

module.exports = generateChart;

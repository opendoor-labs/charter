var jsdom = require('jsdom');
var d3 = require('d3');
var _ = require('lodash');

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

module.exports = generateHotnessChart;

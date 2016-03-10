var _ = require('lodash');
var bodyParser = require('body-parser');
var d3 = require('d3');
var express = require('express');
var jsdom = require('jsdom');

var content = `
<div id="container">
  <style>
    body {
      font: 10px sans-serif;
    }

    .axis path,
    .axis line {
      fill: none;
      stroke: #000;
      shape-rendering: crispEdges;
    }

    .x.axis path {
      display: none;
    }

    .line {
      fill: none;
      stroke: steelblue;
      stroke-width: 1.5px;
    }
  </style>
  <svg id="svg">
</container>
`;

// http://localhost:2197/chart?columns=2006-03-02,2006-04-02,2006-05-02,2006-06-02,2006-07-02,2006-08-02&data=295000,355900,340500,421825,450000,472500

var app = express();
app.use(bodyParser.json());
app.get('/chart', function(request, response) {
  var columns = (request.query.columns || '').split(',');
  var data = (request.query.data || '').split(',');

  jsdom.env({
    features: { QuerySelector: true },
    html: content,
    done: function(errors, window) {
      var container = window.document.querySelector('#container');
      var svg = d3.select(window.document.querySelector('#svg'));

      var margin = {top: 20, right: 20, bottom: 30, left: 50},
          width = 960 - margin.left - margin.right,
          height = 500 - margin.top - margin.bottom;

      var formatDate = d3.time.format("%Y-%m-%d");

      var x = d3.time.scale()
          .range([0, width]);

      var y = d3.scale.linear()
          .range([height, 0]);

      var xAxis = d3.svg.axis()
          .scale(x)
          .orient("bottom");

      var yAxis = d3.svg.axis()
          .scale(y)
          .orient("left");

      var line = d3.svg.line()
          .x(function(d) { return x(formatDate.parse(d[0])); })
          .y(function(d) { return y(d[1]); });

      var g = svg.attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
        .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      x.domain(d3.extent(columns, function(d) { return formatDate.parse(d); }));
      y.domain(d3.extent(data));

      g.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis);

      g.append("g")
          .attr("class", "y axis")
          .call(yAxis)
        .append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 6)
          .attr("dy", ".71em")
          .style("text-anchor", "end")
          .text("Price ($)");

      g.append("path")
          .datum(_.zip(columns, data))
          .attr("class", "line")
          .attr("d", line);

      response.send(container.outerHTML);
    }
  });
});
app.listen(process.env.PORT || 2197);

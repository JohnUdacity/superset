import d3 from 'd3';
import { formatDate } from '../javascripts/modules/dates';

require('./big_number.css');

function bigNumberVis(slice, payload) {
  const div = d3.select(slice.selector);
  // Define the percentage bounds that define color from red to green
  div.html(''); // reset
  const fd = slice.formData;
  const json = payload.data;

  const f = d3.format(fd.y_axis_format);
  const fp = d3.format('+.1%');
  const width = slice.width();
  const height = slice.height();
  const svg = div.append('svg');
  svg.attr('width', width);
  svg.attr('height', height);
  const data = json.data;
  let vCompare;
  let v;
  if (fd.viz_type === 'big_number') {
    v = data[data.length - 1][1];
  } else {
    v = data[0][0];
  }
  if (json.compare_lag > 0) {
    const pos = data.length - (json.compare_lag + 1);
    if (pos >= 0) {
      const vAnchor = data[pos][1];
      if (vAnchor !== 0) {
        vCompare = (v - vAnchor) / Math.abs(vAnchor);
      } else {
        vCompare = 0;
      }
    }
  }
  const dateExt = d3.extent(data, (d) => d[0]);
  const valueExt = d3.extent(data, (d) => d[1]);

  const margin = 20;
  const scaleX = d3.time.scale.utc().domain(dateExt).range([margin, width - margin]);
  const scaleY = d3.scale.linear().domain(valueExt).range([height - (margin), margin]);
  const colorRange = [d3.hsl(0, 1, 0.3), d3.hsl(120, 1, 0.3)];
  const scaleColor = d3.scale
  .linear().domain([-1, 1])
  .interpolate(d3.interpolateHsl)
  .range(colorRange)
  .clamp(true);
  const line = d3.svg.line()
  .x(function (d) {
    return scaleX(d[0]);
  })
  .y(function (d) {
    return scaleY(d[1]);
  })
  .interpolate('cardinal');

  let y = height / 2;
  let g = svg.append('g');
  // Printing big number
  g.append('g').attr('class', 'digits')
  .attr('opacity', 1)
  .append('text')
  .attr('x', width / 2)
  .attr('y', y)
  .attr('class', 'big')
  .attr('alignment-baseline', 'middle')
  .attr('id', 'bigNumber')
  .style('font-weight', 'bold')
  .style('cursor', 'pointer')
  .text(f(v))
  .style('font-size', d3.min([height, width]) / 3.5)
  .style('text-anchor', 'middle')
  .attr('fill', 'black');

  // Printing big number subheader text
  if (json.subheader !== null) {
    g.append('text')
    .attr('x', width / 2)
    .attr('y', (height / 16) * 12)
    .text(json.subheader)
    .attr('id', 'subheader_text')
    .style('font-size', d3.min([height, width]) / 8)
    .style('text-anchor', 'middle');
  }

  if (fd.viz_type === 'big_number') {
    // Drawing trend line

    g.append('path')
    .attr('d', function () {
      return line(data);
    })
    .attr('stroke-width', 5)
    .attr('opacity', 0.5)
    .attr('fill', 'none')
    .attr('stroke-linecap', 'round')
    .attr('stroke', 'grey');

    g = svg.append('g')
    .attr('class', 'digits')
    .attr('opacity', 1);

    if (vCompare !== null) {
      y = (height / 8) * 3;
    }

    const c = scaleColor(vCompare);

    // Printing compare %
    if (vCompare) {
      g.append('text')
      .attr('x', width / 2)
      .attr('y', (height / 16) * 12)
      .text(fp(vCompare) + json.compare_suffix)
      .style('font-size', d3.min([height, width]) / 8)
      .style('text-anchor', 'middle')
      .attr('fill', c)
      .attr('stroke', c);
    }

    const gAxis = svg.append('g').attr('class', 'axis').attr('opacity', 0);
    g = gAxis.append('g');
    const xAxis = d3.svg.axis()
    .scale(scaleX)
    .orient('bottom')
    .ticks(4)
    .tickFormat(formatDate);
    g.call(xAxis);
    g.attr('transform', 'translate(0,' + (height - margin) + ')');

    g = gAxis.append('g').attr('transform', 'translate(' + (width - margin) + ',0)');
    const yAxis = d3.svg.axis()
    .scale(scaleY)
    .orient('left')
    .tickFormat(d3.format(fd.y_axis_format))
    .tickValues(valueExt);
    g.call(yAxis);
    g.selectAll('text')
    .style('text-anchor', 'end')
    .attr('y', '-7')
    .attr('x', '-4');

    g.selectAll('text')
    .style('font-size', '10px');

    // Define the div for the tooltip
    const tooltipEl =
      d3.select('body')
        .append('div')
        .attr('class', 'line-tooltip')
        .attr('width', 200)
        .attr('height', 200)
        .style('opacity', 0);

    const renderTooltip = (d) => {
      const date = formatDate(d[0]);
      const value = f(d[1]);
      return `
        <div>
          <span style="float: left; margin-right: 20px;"><strong>${date}</strong></span>
          <span style="float: right">${value}</span>
        </div>
      `;
    };

    // Add the scatterplot and trigger the mouse events for the tooltips
    svg
      .selectAll('dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('r', 10)
      .attr('cx', d => scaleX(d[0]))
      .attr('cy', d => scaleY(d[1]))
      .attr('fill-opacity', '0')
      .on('mouseover', (d) => {
        tooltipEl.html(renderTooltip(d))
          .style('left', (d3.event.pageX) + 'px')
          .style('top', (d3.event.pageY) + 'px');
        tooltipEl.transition().duration(200).style('opacity', 0.9);
      })
      .on('mouseout', () => {
        tooltipEl.transition().duration(500).style('opacity', 0);
      });

    div.on('mouseover', function () {
      const el = d3.select(this);
      el.selectAll('path')
      .transition()
      .duration(500)
      .attr('opacity', 1)
      .style('stroke-width', '2px');
      el.selectAll('g.digits')
      .transition()
      .duration(500)
      .attr('opacity', 0.1);
      el.selectAll('g.axis')
      .transition()
      .duration(500)
      .attr('opacity', 1);
    })
    .on('mouseout', function () {
      const el = d3.select(this);
      el.select('path')
      .transition()
      .duration(500)
      .attr('opacity', 0.5)
      .style('stroke-width', '5px');
      el.selectAll('g.digits')
      .transition()
      .duration(500)
      .attr('opacity', 1);
      el.selectAll('g.axis')
      .transition()
      .duration(500)
      .attr('opacity', 0);
    });
  }
}

module.exports = bigNumberVis;

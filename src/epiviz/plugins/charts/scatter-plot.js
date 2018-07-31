/**
 * Created by Florin Chelaru ( florinc [at] umd [dot] edu )
 * Date: 11/14/13
 * Time: 11:55 PM
 */

goog.provide("epiviz.plugins.charts.ScatterPlot");

goog.require("epiviz.ui.charts.Plot");
goog.require("epiviz.ui.charts.Axis");
goog.require("epiviz.ui.charts.VisEventArgs");
goog.require("epiviz.utils");
goog.require("epiviz.ui.charts.CustomSetting");
goog.require("epiviz.ui.charts.ChartObject");
goog.require("epiviz.measurements.Measurement");

/**
 * @param {string} id
 * @param {jQuery} container
 * @param {epiviz.ui.charts.VisualizationProperties} properties
 * @extends {epiviz.ui.charts.Plot}
 * @constructor
 */
epiviz.plugins.charts.ScatterPlot = function(id, container, properties) {
  // Call superclass constructor
  epiviz.ui.charts.Plot.call(this, id, container, properties);

  /**
   * D3 chart container
   * @type {*}
   * @private
   */
  this._chartContent = null;

  /**
   * D3 legend container
   * @type {*}
   * @private
   */
  this._legend = null;

  /**
   * @type {Array.<epiviz.measurements.Measurement>}
   * @private
   */
  this._measurementsX = [];

  /**
   * @type {Array.<epiviz.measurements.Measurement>}
   * @private
   */
  this._measurementsY = [];

  var self = this;
  this.measurements().foreach(function(m, i) {
    if (i % 2 == 0) {
      self._measurementsX.push(m);
    } else {
      self._measurementsY.push(m);
    }
  });

  /**
   * @type {string}
   * @private
   */
  this._xLabel = "";

  /**
   * @type {string}
   * @private
   */
  this._yLabel = "";

  for (
    var i = 0;
    i < Math.min(this._measurementsX.length, this._measurementsY.length);
    ++i
  ) {
    if (i > 0) {
      this._xLabel += ", ";
      this._yLabel += ", ";
    }
    this._xLabel += this._measurementsX[i].name();
    this._yLabel += this._measurementsY[i].name();
  }

  /**
   * @type {Array.<string>}
   * @private
   */
  this._colorLabels = [];

  this._initialize();
};

/*
 * Copy methods from upper class
 */
epiviz.plugins.charts.ScatterPlot.prototype = epiviz.utils.mapCopy(
  epiviz.ui.charts.Plot.prototype
);
epiviz.plugins.charts.ScatterPlot.constructor =
  epiviz.plugins.charts.ScatterPlot;

/**
 * @protected
 */
epiviz.plugins.charts.ScatterPlot.prototype._initialize = function() {
  // Call super
  epiviz.ui.charts.Plot.prototype._initialize.call(this);

  this._svg.classed("scatter-plot", true);

  this._chartContent = this._svg.append("g").attr("class", "chart-content");
  this._legend = this._svg.append("g").attr("class", "chart-legend");
};

/**
 * @param {epiviz.datatypes.GenomicRange} [range]
 * @param {?epiviz.datatypes.GenomicData} [data]
 * @returns {Array.<epiviz.ui.charts.ChartObject>} The objects drawn
 */
epiviz.plugins.charts.ScatterPlot.prototype.draw = function(range, data) {
  epiviz.ui.charts.Plot.prototype.draw.call(this, range, data);

  // If data is defined, then the base class sets this._lastData to data.
  // If it isn't, then we'll use the data from the last draw call
  data = this._lastData;
  range = this._lastRange;

  // If data is not defined, there is nothing to draw
  if (!data || !range) {
    return [];
  }

  return this._drawCircles(range, data);
};

/**
 * @param {epiviz.datatypes.GenomicRange} [range]
 * @param {?epiviz.datatypes.GenomicData} [data]
 * @returns {Array.<epiviz.ui.charts.ChartObject>} The objects drawn
 */
epiviz.plugins.charts.ScatterPlot.prototype.drawCanvas = function(range, data) {
  epiviz.ui.charts.Plot.prototype.draw.call(this, range, data);

  // If data is defined, then the base class sets this._lastData to data.
  // If it isn't, then we'll use the data from the last draw call
  data = this._lastData;
  range = this._lastRange;

  // If data is not defined, there is nothing to draw
  if (!data || !range) {
    return [];
  }

  return this._drawCirclesCanvas(range, data);
};

/**
 * @param {epiviz.datatypes.GenomicRange} range
 * @param {epiviz.datatypes.GenomicData} data
 * @returns {Array.<epiviz.ui.charts.ChartObject>} The objects drawn
 * @private
 */
epiviz.plugins.charts.ScatterPlot.prototype._drawCirclesCanvas = function(
  range,
  data
) {
  var self = this;
  var Axis = epiviz.ui.charts.Axis;
  var circleRadius = Math.max(
    1,
    this.customSettingsValues()[
      epiviz.plugins.charts.ScatterPlotType.CustomSettings.CIRCLE_RADIUS_RATIO
    ] * Math.min(this.width(), this.height())
  );
  var gridSquareSize = Math.max(Math.floor(circleRadius), 1);
  var nSeries = Math.min(
    this._measurementsX.length,
    this._measurementsY.length
  );

  var absLine = this.customSettingsValues()[
    epiviz.plugins.charts.ScatterPlotType.CustomSettings.ABS_LINE_VAL
  ];

  var firstGlobalIndex = data.firstSeries().globalStartIndex();
  var lastGlobalIndex = data.firstSeries().globalEndIndex();
  data.foreach(function(measurement, series) {
    var firstIndex = series.globalStartIndex();
    var lastIndex = series.globalEndIndex();

    if (firstIndex > firstGlobalIndex) {
      firstGlobalIndex = firstIndex;
    }
    if (lastIndex < lastGlobalIndex) {
      lastGlobalIndex = lastIndex;
    }
  });

  var nItems = lastGlobalIndex - firstGlobalIndex;

  var margins = this.margins();
  var width = this.width();
  var height = this.height();

  var CustomSetting = epiviz.ui.charts.CustomSetting;
  var minY = this.customSettingsValues()[
    epiviz.ui.charts.Visualization.CustomSettings.Y_MIN
  ];
  var maxY = this.customSettingsValues()[
    epiviz.ui.charts.Visualization.CustomSettings.Y_MAX
  ];
  var minX = this.customSettingsValues()[
    epiviz.ui.charts.Visualization.CustomSettings.X_MIN
  ];
  var maxX = this.customSettingsValues()[
    epiviz.ui.charts.Visualization.CustomSettings.X_MAX
  ];

  if (minX == CustomSetting.DEFAULT) {
    minX = this._measurementsX[0].minValue();
  }
  if (minY == CustomSetting.DEFAULT) {
    minY = this._measurementsY[0].minValue();
  }
  if (maxX == CustomSetting.DEFAULT) {
    maxX = this._measurementsX[0].maxValue();
  }
  if (maxY == CustomSetting.DEFAULT) {
    maxY = this._measurementsY[0].maxValue();
  }

  var dataHasGenomicLocation = epiviz.measurements.Measurement.Type.isOrdered(
    this._measurementsX[0].type()
  );

  var xScale = d3.scale
    .linear()
    .domain([minX, maxX])
    .range([0, width - margins.sumAxis(Axis.X)]);
  var yScale = d3.scale
    .linear()
    .domain([minY, maxY])
    .range([height - margins.sumAxis(Axis.Y), 0]);

  this._container.find("svg").remove();
  this._container.find("#" + this.id() + "-canvas").remove();
  var canvas = document.createElement("canvas");
  this.chartDrawType = "canvas";
  this.canvas = canvas;
  canvas.id = this.id() + "-canvas";
  this._container.append(canvas);

  canvas.width = width;
  canvas.height = height;
  this._container.find("#" + this.id() + "-hoverCanvas").remove();
  var hoverCanvas = document.createElement("canvas");
  this.hoverCanvas = hoverCanvas;
  hoverCanvas.id = this.id() + "-hoverCanvas";
  this._container.append(hoverCanvas);
  hoverCanvas.width = this.width();
  hoverCanvas.height = this.height();
  hoverCanvas.style =
    "position:absolute;top:0;left:0;width:100%;height:100%;z-index:10";

  this._drawAxesCanvas(xScale, yScale, 15, 15, canvas);

  var i, index;
  var indices = []; //epiviz.utils.range(nSeries * nItems);
  for (i = 0; i < nItems; ++i) {
    index = i + firstGlobalIndex;
    var item = data
      .getSeries(this._measurementsX[0])
      .getRowByGlobalIndex(index);
    if (!item) {
      continue;
    }
    if (
      !dataHasGenomicLocation ||
      (range.start() == undefined || range.end() == undefined) ||
      (item.start() < range.end() && item.end() > range.start())
    ) {
      for (var j = 0; j < nSeries; ++j) {
        indices.push(j * nItems + i);
      }
    }
  }

  var grid = {};
  var items = [];
  var maxGroupItems = 1;
  for (i = 0; i < indices.length; ++i) {
    index = indices[i] % nItems;
    var globalIndex = index + firstGlobalIndex;
    var seriesIndex = Math.floor(indices[i] / nItems);
    var mX = self._measurementsX[seriesIndex];
    var mY = self._measurementsY[seriesIndex];
    var cellX = data.getSeries(mX).getByGlobalIndex(globalIndex);
    var cellY = data.getSeries(mY).getByGlobalIndex(globalIndex);

    if (!cellX || !cellY) {
      continue;
    }

    var classes = sprintf("item data-series-%s", seriesIndex);

    var x = xScale(cellX.value);
    var y = yScale(cellY.value);
    var gridX = Math.floor(x / gridSquareSize) * gridSquareSize;
    var gridY = Math.floor(y / gridSquareSize) * gridSquareSize;

    var uiObj = null;
    if (grid[gridY] && grid[gridY][gridX]) {
      uiObj = grid[gridY][gridX];
      uiObj.id += "_" + cellX.globalIndex;
      uiObj.start = Math.min(uiObj.start, cellX.rowItem.start());
      uiObj.end = Math.max(uiObj.end, cellX.rowItem.end());
      uiObj.values[0] =
        (uiObj.values[0] * uiObj.valueItems[0].length + cellX.value) /
        (uiObj.valueItems[0].length + 1);
      uiObj.values[1] =
        (uiObj.values[1] * uiObj.valueItems[1].length + cellY.value) /
        (uiObj.valueItems[1].length + 1);
      uiObj.valueItems[0].push(cellX);
      uiObj.valueItems[1].push(cellY);

      if (uiObj.valueItems[0].length > maxGroupItems) {
        maxGroupItems = uiObj.valueItems[0].length;
      }

      continue;
    }

    uiObj = new epiviz.ui.charts.ChartObject(
      sprintf("scatter_%s_%s", seriesIndex, cellX.globalIndex),
      cellX.rowItem.start(),
      cellX.rowItem.end(),
      [cellX.value, cellY.value],
      seriesIndex,
      [[cellX], [cellY]], // valueItems one for each measurement
      [mX, mY], // measurements
      classes,
      cellX.rowItem.seqName()
    );

    if (!grid[gridY]) {
      grid[gridY] = {};
    }
    grid[gridY][gridX] = uiObj;

    items.push(uiObj);
  }

  var itemsGroup = this._chartContent.select(".items");

  if (itemsGroup.empty()) {
    itemsGroup = this._chartContent.append("g").attr("class", "items");
    var selectedGroup = itemsGroup.append("g").attr("class", "selected");
    itemsGroup.append("g").attr("class", "hovered");
    selectedGroup.append("g").attr("class", "hovered");
  }

  var ctx = canvas.getContext("2d");
  ctx.globalAlpha = 0.7;
  // draw items on  canvas
  // TODO: use renderingQueues for optimizing large draws
  items.forEach(function(d) {
    ctx.beginPath();
    ctx.arc(
      margins.left() +
        ((d.values[0] - minX) * (width - margins.sumAxis(Axis.X))) /
          (maxX - minX),
      height -
        margins.bottom() -
        ((d.values[1] - minY) * (height - margins.sumAxis(Axis.Y))) /
          (maxY - minY),
      circleRadius,
      0,
      2 * Math.PI
    );
    var color = self.colors().get(d.seriesIndex);
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fill();
  });

  // Draw legend if necessary
  if (this._globalIndexColorLabels) {
    var colorLabelsMap = {};
    for (j = firstGlobalIndex; j < lastGlobalIndex; ++j) {
      colorLabelsMap[
        this._globalIndexColorLabels[j]
      ] = this._globalIndexColorLabels[j];
    }
    this._colorLabels = Object.keys(colorLabelsMap);
    var textIndent = 0;

    this._colorLabels.forEach(function(c, i) {
      var color = self.colors().getByKey(c);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.beginPath();

      ctx.arc(self.margins().left() + textIndent - 2, -9, 4, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fill();
      ctx.font = "9px";
      ctx.beginPath();

      var circleIndent = 8;
      ctx.textAlign = "start";

      ctx.fillText(
        c,
        self.margins().left() + textIndent + circleIndent,
        self.margins().top() - 5
      );

      var textWidth = ctx.measureText(c).width;

      textIndent = textIndent + circleIndent + textWidth + 10;
    });
  } else {
    var n = Math.min(this._measurementsX.length, this._measurementsY.length);
    var colors = new Array(n);

    for (j = 0; j < n; ++j) {
      colors[j] = sprintf(
        "%s vs %s",
        this._measurementsX[j].name(),
        this._measurementsY[j].name()
      );
    }

    this._colorLabels = colors;
  }

  if (absLine != epiviz.ui.charts.CustomSetting.DEFAULT) {
    ctx.beginPath();
    ctx.globalAlpha = 0.7;
    ctx.moveTo(margins.left(), yScale(absLine));
    ctx.lineTo(
      margins.left() +
        ((maxX - minX) * (width - margins.sumAxis(Axis.X))) / (maxX - minX),
      yScale(absLine)
    );
    ctx.strokeStyle = black;
    ctx.stroke();
  }

  this.addCanvasEvents(
    canvas,
    hoverCanvas,
    items,
    xScale,
    yScale,
    margins,
    minX,
    maxX,
    minY,
    maxY,
    circleRadius
  );

  return items;
};

/**
 * @param {epiviz.datatypes.GenomicRange} range
 * @param {epiviz.datatypes.GenomicData} data
 * @returns {Array.<epiviz.ui.charts.ChartObject>} The objects drawn
 * @private
 */
epiviz.plugins.charts.ScatterPlot.prototype._drawCircles = function(
  range,
  data
) {
  var self = this;
  var Axis = epiviz.ui.charts.Axis;
  var circleRadius = Math.max(
    1,
    this.customSettingsValues()[
      epiviz.plugins.charts.ScatterPlotType.CustomSettings.CIRCLE_RADIUS_RATIO
    ] * Math.min(this.width(), this.height())
  );
  var gridSquareSize = Math.max(Math.floor(circleRadius), 1);
  var nSeries = Math.min(
    this._measurementsX.length,
    this._measurementsY.length
  );

  var absLine = this.customSettingsValues()[
    epiviz.plugins.charts.ScatterPlotType.CustomSettings.ABS_LINE_VAL
  ];

  var firstGlobalIndex = data.firstSeries().globalStartIndex();
  var lastGlobalIndex = data.firstSeries().globalEndIndex();
  data.foreach(function(measurement, series) {
    var firstIndex = series.globalStartIndex();
    var lastIndex = series.globalEndIndex();

    if (firstIndex > firstGlobalIndex) {
      firstGlobalIndex = firstIndex;
    }
    if (lastIndex < lastGlobalIndex) {
      lastGlobalIndex = lastIndex;
    }
  });

  var nItems = lastGlobalIndex - firstGlobalIndex;

  var margins = this.margins();
  var width = this.width();
  var height = this.height();

  var CustomSetting = epiviz.ui.charts.CustomSetting;
  var minY = this.customSettingsValues()[
    epiviz.ui.charts.Visualization.CustomSettings.Y_MIN
  ];
  var maxY = this.customSettingsValues()[
    epiviz.ui.charts.Visualization.CustomSettings.Y_MAX
  ];
  var minX = this.customSettingsValues()[
    epiviz.ui.charts.Visualization.CustomSettings.X_MIN
  ];
  var maxX = this.customSettingsValues()[
    epiviz.ui.charts.Visualization.CustomSettings.X_MAX
  ];

  if (minX == CustomSetting.DEFAULT) {
    minX = this._measurementsX[0].minValue();
  }
  if (minY == CustomSetting.DEFAULT) {
    minY = this._measurementsY[0].minValue();
  }
  if (maxX == CustomSetting.DEFAULT) {
    maxX = this._measurementsX[0].maxValue();
  }
  if (maxY == CustomSetting.DEFAULT) {
    maxY = this._measurementsY[0].maxValue();
  }

  var dataHasGenomicLocation = epiviz.measurements.Measurement.Type.isOrdered(
    this._measurementsX[0].type()
  );

  var xScale = d3.scale
    .linear()
    .domain([minX, maxX])
    .range([0, width - margins.sumAxis(Axis.X)]);
  var yScale = d3.scale
    .linear()
    .domain([minY, maxY])
    .range([height - margins.sumAxis(Axis.Y), 0]);

  this._clearAxes(this._chartContent);
  this._drawAxes(xScale, yScale, 15, 15, this._chartContent);

  var i, index;
  var indices = []; //epiviz.utils.range(nSeries * nItems);
  for (i = 0; i < nItems; ++i) {
    index = i + firstGlobalIndex;
    var item = data
      .getSeries(this._measurementsX[0])
      .getRowByGlobalIndex(index);
    if (!item) {
      continue;
    }
    if (
      !dataHasGenomicLocation ||
      (range.start() == undefined || range.end() == undefined) ||
      (item.start() < range.end() && item.end() > range.start())
    ) {
      for (var j = 0; j < nSeries; ++j) {
        indices.push(j * nItems + i);
      }
    }
  }

  var grid = {};
  var items = [];
  var maxGroupItems = 1;
  for (i = 0; i < indices.length; ++i) {
    index = indices[i] % nItems;
    var globalIndex = index + firstGlobalIndex;
    var seriesIndex = Math.floor(indices[i] / nItems);
    var mX = self._measurementsX[seriesIndex];
    var mY = self._measurementsY[seriesIndex];
    var cellX = data.getSeries(mX).getByGlobalIndex(globalIndex);
    var cellY = data.getSeries(mY).getByGlobalIndex(globalIndex);

    if (!cellX || !cellY) {
      continue;
    }

    var classes = sprintf("item data-series-%s", seriesIndex);

    var x = xScale(cellX.value);
    var y = yScale(cellY.value);
    var gridX = Math.floor(x / gridSquareSize) * gridSquareSize;
    var gridY = Math.floor(y / gridSquareSize) * gridSquareSize;

    var uiObj = null;
    if (grid[gridY] && grid[gridY][gridX]) {
      uiObj = grid[gridY][gridX];
      uiObj.id += "_" + cellX.globalIndex;
      uiObj.start = Math.min(uiObj.start, cellX.rowItem.start());
      uiObj.end = Math.max(uiObj.end, cellX.rowItem.end());
      uiObj.values[0] =
        (uiObj.values[0] * uiObj.valueItems[0].length + cellX.value) /
        (uiObj.valueItems[0].length + 1);
      uiObj.values[1] =
        (uiObj.values[1] * uiObj.valueItems[1].length + cellY.value) /
        (uiObj.valueItems[1].length + 1);
      uiObj.valueItems[0].push(cellX);
      uiObj.valueItems[1].push(cellY);

      if (uiObj.valueItems[0].length > maxGroupItems) {
        maxGroupItems = uiObj.valueItems[0].length;
      }

      continue;
    }

    uiObj = new epiviz.ui.charts.ChartObject(
      sprintf("scatter_%s_%s", seriesIndex, cellX.globalIndex),
      cellX.rowItem.start(),
      cellX.rowItem.end(),
      [cellX.value, cellY.value],
      seriesIndex,
      [[cellX], [cellY]], // valueItems one for each measurement
      [mX, mY], // measurements
      classes,
      cellX.rowItem.seqName()
    );

    if (!grid[gridY]) {
      grid[gridY] = {};
    }
    grid[gridY][gridX] = uiObj;

    items.push(uiObj);
  }

  var itemsGroup = this._chartContent.select(".items");

  if (itemsGroup.empty()) {
    itemsGroup = this._chartContent.append("g").attr("class", "items");
    var selectedGroup = itemsGroup.append("g").attr("class", "selected");
    itemsGroup.append("g").attr("class", "hovered");
    selectedGroup.append("g").attr("class", "hovered");
  }

  var selection = itemsGroup.selectAll("circle").data(items, function(d) {
    return d.id;
  });

  selection
    .enter()
    .insert("circle", ":first-child")
    .attr("id", function(d) {
      return sprintf(
        "%s-item-%s-%s",
        self.id(),
        d.seriesIndex,
        d.valueItems[0][0].globalIndex
      );
    })
    .style("opacity", 0)
    .style("fill-opacity", 0)
    .attr("r", 0);
  selection.each(
    /**
     * @param {epiviz.ui.charts.ChartObject} d
     */
    function(d) {
      var circle = d3.select(this);

      var fill;
      if (!self._globalIndexColorLabels) {
        fill = self.colors().get(d.seriesIndex);
      } else {
        fill = self
          .colors()
          .getByKey(
            self._globalIndexColorLabels[d.valueItems[0][0].globalIndex]
          );
      }
      circle
        .attr(
          "cx",
          margins.left() +
            ((d.values[0] - minX) * (width - margins.sumAxis(Axis.X))) /
              (maxX - minX)
        )
        .attr(
          "cy",
          height -
            margins.bottom() -
            ((d.values[1] - minY) * (height - margins.sumAxis(Axis.Y))) /
              (maxY - minY)
        )
        .attr("class", d.cssClasses)
        .style("fill", fill);
    }
  );

  selection
    .transition()
    .duration(1000)
    .style("fill-opacity", function(d) {
      //return Math.max(0.3, d.valueItems[0].length / maxGroupItems);
      return Math.max(0.6, d.valueItems[0].length / maxGroupItems);
    })
    .style("opacity", null)
    .attr("r", circleRadius);

  selection
    .exit()
    .transition()
    .duration(1000)
    .style("opacity", 0)
    .attr("r", 0)
    .remove();

  selection
    .on("mouseover", function(d) {
      self._hover.notify(new epiviz.ui.charts.VisEventArgs(self.id(), d));
    })
    .on("mouseout", function() {
      self._unhover.notify(new epiviz.ui.charts.VisEventArgs(self.id()));
    })
    .on("click", function(d) {
      self._deselect.notify(new epiviz.ui.charts.VisEventArgs(self.id()));
      self._select.notify(new epiviz.ui.charts.VisEventArgs(self.id(), d));

      d3.event.stopPropagation();
    });

  // Draw legend if necessary
  if (this._globalIndexColorLabels) {
    var colorLabelsMap = {};
    for (j = firstGlobalIndex; j < lastGlobalIndex; ++j) {
      colorLabelsMap[
        this._globalIndexColorLabels[j]
      ] = this._globalIndexColorLabels[j];
    }
    this._colorLabels = Object.keys(colorLabelsMap);

    this._svg.selectAll(".chart-title").remove();
    this._svg.selectAll(".chart-title-color ").remove();
    var titleEntries = this._svg
      .selectAll(".chart-title")
      .data(this._colorLabels);
    titleEntries
      .enter()
      .append("text")
      .attr("class", "chart-title")
      .attr("font-weight", "bold")
      .attr("y", self.margins().top() - 5);
    titleEntries
      .attr("fill", function(label, i) {
        return self.colors().getByKey(label);
      })
      .text(function(label) {
        return label;
      });
    var textLength = 0;
    var titleEntriesStartPosition = [];

    this._container.find(" .chart-title").each(function(i) {
      titleEntriesStartPosition.push(textLength);
      textLength += this.getBBox().width + 15;
    });

    titleEntries.attr("x", function(column, i) {
      return self.margins().left() + 10 + titleEntriesStartPosition[i];
    });

    var colorEntries = this._svg
      .selectAll(".chart-title-color")
      .data(this._colorLabels)
      .enter()
      .append("circle")
      .attr("class", "chart-title-color")
      .attr("cx", function(column, i) {
        return self.margins().left() + 4 + titleEntriesStartPosition[i];
      })
      .attr("cy", self.margins().top() - 9)
      .attr("r", 4)
      .style("shape-rendering", "auto")
      .style("stroke-width", "0")
      .attr("fill", function(label, i) {
        return self.colors().getByKey(label);
      })
      .style("stroke-width", 0);
  } else {
    var n = Math.min(this._measurementsX.length, this._measurementsY.length);
    var colors = new Array(n);

    for (j = 0; j < n; ++j) {
      colors[j] = sprintf(
        "%s vs %s",
        this._measurementsX[j].name(),
        this._measurementsY[j].name()
      );
    }

    this._colorLabels = colors;
  }

  // Draw abline
  if (absLine != epiviz.ui.charts.CustomSetting.DEFAULT) {
    itemsGroup.selectAll(".abLine").remove();

    itemsGroup
      .append("svg:line")
      .attr("class", "abLine")
      .attr(
        "x1",
        margins.left() +
          ((minX - minX) * (width - margins.sumAxis(Axis.X))) / (maxX - minX)
      )
      .attr(
        "x2",
        margins.left() +
          ((maxX - minX) * (width - margins.sumAxis(Axis.X))) / (maxX - minX)
      )
      .attr(
        "y1",
        height -
          margins.bottom() -
          ((absLine - minY) * (height - margins.sumAxis(Axis.Y))) /
            (maxY - minY)
      )
      .attr(
        "y2",
        height -
          margins.bottom() -
          ((absLine - minY) * (height - margins.sumAxis(Axis.Y))) /
            (maxY - minY)
      )
      .style("stroke", "black")
      .style("stroke-dasharray", "5, 5");
  }

  return items;
};

/**
 * @returns {Array.<{name: string, color: string}>}
 */
epiviz.plugins.charts.ScatterPlot.prototype.colorLabels = function() {
  return this._colorLabels;
};

/**
 * @param xScale D3 linear scale for the x axis
 * @param yScale D3 linear scale for the y axis
 * @param {number} [xTicks]
 * @param {number} [yTicks]
 * @param [svg] D3 svg container for the axes
 * @param {number} [width]
 * @param {number} [height]
 * @param {epiviz.ui.charts.Margins} [margins]
 * @protected
 */
epiviz.plugins.charts.ScatterPlot.prototype._drawAxes = function(
  xScale,
  yScale,
  xTicks,
  yTicks,
  svg,
  width,
  height,
  margins
) {
  epiviz.ui.charts.Plot.prototype._drawAxes.call(
    this,
    xScale,
    yScale,
    xTicks,
    yTicks,
    svg,
    width,
    height,
    margins
  );

  this._legend.selectAll("text").remove();

  var xMeasurements = this._measurementsX;
  var self = this;
  this._legend.selectAll(".x-measurement").remove();
  this._legend.selectAll(".x-measurement-color").remove();

  var xEntries = this._legend
    .selectAll(".x-measurement")
    .data(xMeasurements)
    .enter()
    .append("text")
    .attr("class", "x-measurement")
    .attr("font-weight", "bold")
    .attr("fill", function(m, i) {
      return self._globalIndexColorLabels ? "#000000" : self.colors().get(i);
    })
    .attr("y", this.height() - this.margins().bottom() + 35)
    .text(function(m, i) {
      return m.name();
    });

  var xTextLength = 0;
  var xTitleEntriesStartPosition = [];

  this._container.find(" .x-measurement").each(function(i) {
    xTitleEntriesStartPosition.push(xTextLength);
    xTextLength += this.getBBox().width + 15;
  });

  xEntries.attr("x", function(column, i) {
    return (
      (self.width() - xTextLength) * 0.5 + 7 + xTitleEntriesStartPosition[i]
    );
  });

  var xColorEntries = this._legend
    .selectAll(".x-measurement-color")
    .data(xMeasurements)
    .enter()
    .append("circle")
    .attr("class", "x-measurement-color")
    .attr("cx", function(column, i) {
      return (
        (self.width() - xTextLength) * 0.5 + 1 + xTitleEntriesStartPosition[i]
      );
    })
    .attr("cy", this.height() - this.margins().bottom() + 31)
    .attr("r", 4)
    .style("shape-rendering", "auto")
    .style("stroke-width", "0")
    .style("fill", function(m, i) {
      return self._globalIndexColorLabels ? "#ffffff" : self.colors().get(i);
    });

  var yMeasurements = this._measurementsY;
  this._legend.selectAll(".y-measurement").remove();
  this._legend.selectAll(".y-measurement-color").remove();

  var yEntries = this._legend
    .selectAll(".y-measurement")
    .data(yMeasurements)
    .enter()
    .append("text")
    .attr("class", "y-measurement")
    .attr("font-weight", "bold")
    .attr("fill", function(m, i) {
      return self._globalIndexColorLabels ? "#000000" : self.colors().get(i);
    })
    .attr("y", this.margins().left() - 35)
    .attr("transform", "rotate(-90)")
    .text(function(m, i) {
      return m.name();
    });

  var yTextLength = 0;
  var yTitleEntriesStartPosition = [];

  this._container.find(" .y-measurement").each(function(i) {
    yTitleEntriesStartPosition.push(yTextLength);
    yTextLength += this.getBBox().width + 15;
  });

  yEntries.attr("x", function(column, i) {
    return (
      -self.height() +
      (self.height() - yTextLength) * 0.5 +
      12 +
      self.margins().top() +
      yTitleEntriesStartPosition[i]
    );
  });

  var yColorEntries = this._legend
    .selectAll(".y-measurement-color")
    .data(yMeasurements)
    .enter()
    .append("circle")
    .attr("class", "y-measurement-color")
    .attr("cx", function(column, i) {
      return (
        -self.height() +
        (self.height() - yTextLength) * 0.5 +
        6 +
        self.margins().top() +
        yTitleEntriesStartPosition[i]
      );
    })
    .attr("cy", this.margins().left() - 39)
    .attr("transform", "rotate(-90)")
    .attr("r", 4)
    .style("shape-rendering", "auto")
    .style("stroke-width", "0")
    .style("fill", function(m, i) {
      return self._globalIndexColorLabels ? "#ffffff" : self.colors().get(i);
    });
};

/**
 * @param xScale D3 linear scale for the x axis
 * @param yScale D3 linear scale for the y axis
 * @param {number} [xTicks]
 * @param {number} [yTicks]
 * @param [svg] D3 svg container for the axes
 * @param {number} [width]
 * @param {number} [height]
 * @param {epiviz.ui.charts.Margins} [margins]
 * @protected
 */
epiviz.plugins.charts.ScatterPlot.prototype._drawAxesCanvas = function(
  xScale,
  yScale,
  xTicks,
  yTicks,
  canvas,
  width,
  height,
  margins
) {
  epiviz.ui.charts.Plot.prototype._drawAxesCanvas.call(
    this,
    xScale,
    yScale,
    xTicks,
    yTicks,
    canvas,
    width,
    height,
    margins
  );

  var self = this;
  var xMeasurements = this._measurementsX;
  var ctx = canvas.getContext("2d");
  var textIndent = 0;

  xMeasurements.forEach(function(m, i) {
    var color = self._globalIndexColorLabels ? "#000000" : self.colors().get(i);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.beginPath();

    ctx.arc(
      self.margins().left() + textIndent - 2,
      self.height() - self.margins().bottom() + 35,
      4,
      0,
      2 * Math.PI
    );
    ctx.stroke();
    ctx.fill();
    ctx.font = "9px";
    ctx.beginPath();

    var circleIndent = 8;
    ctx.textAlign = "start";

    ctx.fillText(
      m.name(),
      self.margins().left() + textIndent + circleIndent,
      self.height() - self.margins().bottom() + 35
    );

    var textWidth = ctx.measureText(m.name()).width;

    textIndent = textIndent + circleIndent + textWidth + 10;
  });

  var yMeasurements = this._measurementsY;
  var textIndent = 0;

  yMeasurements.forEach(function(m, i) {
    ctx.save();
    ctx.translate(15, self.height() - self.margins().bottom() - textIndent);
    ctx.rotate(-Math.PI / 2);

    var color = self._globalIndexColorLabels ? "#000000" : self.colors().get(i);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.beginPath();

    ctx.arc(0, 0, 4, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.fill();
    ctx.font = "9px";
    ctx.beginPath();

    var circleIndent = 8;
    ctx.textAlign = "start";

    ctx.fillText(m.name(), 10, 0);

    ctx.restore();

    var textWidth = ctx.measureText(m.name()).width;

    textIndent = textIndent + circleIndent + textWidth + 10;
  });
};

epiviz.plugins.charts.ScatterPlot.prototype.addCanvasEvents = function(
  canvas,
  hoverCanvas,
  dataItems,
  xScale,
  yScale,
  margins,
  minX,
  maxX,
  minY,
  maxY,
  circleRadius
) {
  var self = this;
  var ctx = hoverCanvas.getContext("2d");

  self.hoverCanvasObjects = dataItems;
  // var margins = self.margins();
  var width = self.width();
  var height = self.height();
  var Axis = epiviz.ui.charts.Axis;

  hoverCanvas.addEventListener("click", function(event) {
    // var rect = hoverCanvas.getBoundingClientRect();
    // var x = event.clientX - rect.left;
    // var y = event.clientY - rect.top;
  });

  hoverCanvas.addEventListener("mousemove", function(event) {
    var rect = hoverCanvas.getBoundingClientRect();

    var x = event.offsetX;
    var y = event.offsetY;

    var xValMin =
      ((x - circleRadius - margins.left()) * (maxX - minX)) /
        (width - margins.sumAxis(Axis.X)) +
      minX;
    var yValMin =
      ((y - circleRadius - (height - margins.bottom())) * (maxY - minY)) /
        (height - margins.sumAxis(Axis.Y)) +
      minY;

    var xValMax =
      ((x + circleRadius - margins.left()) * (maxX - minX)) /
        (width - margins.sumAxis(Axis.X)) +
      minX;
    var yValMax =
      ((y + circleRadius - (height - margins.bottom())) * (maxY - minY)) /
        (height - margins.sumAxis(Axis.Y)) +
      minY;

    var elem = null;

    if (dataItems) {
      dataItems.forEach(function(r) {
        if (
          Math.floor(r.values[0]) <= Math.floor(xValMax) &&
          Math.floor(r.values[0]) >= Math.floor(xValMin) &&
          Math.floor(r.values[1]) <= Math.floor(yValMax) &&
          Math.floor(r.values[1]) >= Math.floor(yValMin)
        ) {
          elem = r;
        }
      });
    }

    if (elem) {
      self._hover.notify(new epiviz.ui.charts.VisEventArgs(self.id(), elem));
    }
  });

  hoverCanvas.addEventListener("mouseout", function(event) {
    //remove hover elements
    console.log("mouseout");
    self._canvasHoverObject = null;
    // self.draw();
    ctx.clearRect(0, 0, hoverCanvas.width, hoverCanvas.height);
    self._unhover.notify(new epiviz.ui.charts.VisEventArgs(self.id()));
  });
};

/**
 * @param {epiviz.ui.charts.VisObject} selectedObject
 */
epiviz.plugins.charts.ScatterPlot.prototype.doHover = function(selectedObject) {
  epiviz.ui.charts.Plot.prototype.doHover.call(this);

  var self = this;
  if (this.chartDrawType == "canvas") {
    var ctx = this.hoverCanvas.getContext("2d");
    ctx.clearRect(0, 0, this.hoverCanvas.width, this.hoverCanvas.height);

    var CustomSetting = epiviz.ui.charts.CustomSetting;
    var circleRadius = Math.max(
      1,
      this.customSettingsValues()[
        epiviz.plugins.charts.ScatterPlotType.CustomSettings.CIRCLE_RADIUS_RATIO
      ] * Math.min(this.width(), this.height())
    );

    var Axis = epiviz.ui.charts.Axis;

    var minY = this.customSettingsValues()[
      epiviz.ui.charts.Visualization.CustomSettings.Y_MIN
    ];
    var maxY = this.customSettingsValues()[
      epiviz.ui.charts.Visualization.CustomSettings.Y_MAX
    ];
    var minX = this.customSettingsValues()[
      epiviz.ui.charts.Visualization.CustomSettings.X_MIN
    ];
    var maxX = this.customSettingsValues()[
      epiviz.ui.charts.Visualization.CustomSettings.X_MAX
    ];

    if (minX == CustomSetting.DEFAULT) {
      minX = this._measurementsX[0].minValue();
    }
    if (minY == CustomSetting.DEFAULT) {
      minY = this._measurementsY[0].minValue();
    }
    if (maxX == CustomSetting.DEFAULT) {
      maxX = this._measurementsX[0].maxValue();
    }
    if (maxY == CustomSetting.DEFAULT) {
      maxY = this._measurementsY[0].maxValue();
    }

    this._canvasHoverObject = selectedObject;

    this.hoverCanvasObjects.forEach(function(r) {
      if (r.overlapsWith(selectedObject)) {
        ctx.beginPath();
        ctx.arc(
          self.margins().left() +
            ((r.values[0] - minX) *
              (self.width() - self.margins().sumAxis(Axis.X))) /
              (maxX - minX),
          self.height() -
            self.margins().bottom() -
            ((r.values[1] - minY) *
              (self.height() - self.margins().sumAxis(Axis.Y))) /
              (maxY - minY),
          circleRadius,
          0,
          2 * Math.PI
        );
        var color = self.colors().get(r.seriesIndex);
        ctx.strokeStyle = "yellow";
        ctx.stroke();
      }
    });
    return;
  }
  var itemsGroup = this._container.find(".items");
  var unselectedHoveredGroup = itemsGroup.find("> .hovered");
  var selectedGroup = itemsGroup.find("> .selected");
  var selectedHoveredGroup = selectedGroup.find("> .hovered");

  var filter = function() {
    if (Array.isArray(selectedObject)) {
      var match = false;

      for (var sIndex = 0; sIndex < selectedObject.length; sIndex++) {
        var sel = selectedObject[sIndex];
        if (sel.overlapsWith(d3.select(this).data()[0])) {
          match = true;
        }
      }

      return match;
    } else {
      return selectedObject.overlapsWith(d3.select(this).data()[0]);
    }
  };
  var selectItems = itemsGroup.find("> .item").filter(filter);
  unselectedHoveredGroup.append(selectItems);

  selectItems = selectedGroup.find("> .item").filter(filter);
  selectedHoveredGroup.append(selectItems);
};

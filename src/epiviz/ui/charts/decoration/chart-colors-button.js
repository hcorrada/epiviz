/**
 * Created by Florin Chelaru ( florinc [at] umd [dot] edu )
 * Date: 10/30/2014
 * Time: 12:24 PM
 */

goog.provide('epiviz.ui.charts.decoration.ChartColorsButton');

/**
 * @param {epiviz.ui.charts.Visualization} visualization
 * @param {epiviz.ui.charts.decoration.VisualizationDecoration} [otherDecoration]
 * @extends {epiviz.ui.charts.decoration.ChartOptionButton}
 * @constructor
 */
epiviz.ui.charts.decoration.ChartColorsButton = function(visualization, otherDecoration) {
  epiviz.ui.charts.decoration.ChartOptionButton.call(this, visualization, otherDecoration);
};

/*
 * Copy methods from upper class
 */
epiviz.ui.charts.decoration.ChartColorsButton.prototype = epiviz.utils.mapCopy(epiviz.ui.charts.decoration.ChartOptionButton.prototype);
epiviz.ui.charts.decoration.ChartColorsButton.constructor = epiviz.ui.charts.decoration.ChartColorsButton;

/**
 * @returns {Function}
 * @protected
 */
epiviz.ui.charts.decoration.ChartColorsButton.prototype._click = function() {
  var self = this;
  return function(){
    var colors = self.visualization().colorMap();
    var colorPickerDialog = new epiviz.ui.controls.ColorPickerDialog(
      {
        ok: function(colors) {
          self.visualization().setColorMap(colors);
        },
        cancel: function() {},
        reset: function() {}
      },
      colors);
    colorPickerDialog.show();
  };
};

/**
 * @returns {*} jQuery button render options
 * @protected
 */
epiviz.ui.charts.decoration.ChartColorsButton.prototype._renderOptions = function() {
  return {
    icons:{ primary:'ui-icon ui-icon-colorpicker' },
    text:false
  };
};

/**
 * @returns {string}
 * @protected
 */
epiviz.ui.charts.decoration.ChartColorsButton.prototype._text = function() { return 'Colors'; };

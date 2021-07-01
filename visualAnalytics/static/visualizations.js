// current sequence
var currentSequence = -1;

// scaling values
var minLineWidth = 1;
var scalableLineWidth = 10;
var hoverLineFactor = 1;
var minCircleWidth = 1;
var scalableCircleWidth = 1;
var hoverCircleWidthFactor = 4;
var highlightsCircleWidth = 4;

var lastScaleValue = 1;

// colors and scales
var highlightColor = "#696969";
var confusionScale = d3.scaleLinear()
  .domain([0, 1])
  .range(["#fff", "#000"]);
var blackLineScale = d3.scaleLinear()
  .domain([0, 1])
  .range(["#aaa", "#000"]);

var linearLineScale;
var linearSampleScale;
var sampleScale;
var lineScale;
var classScales;

// data
var projection;
var actualValues;
var predictions;
var hiddenStates;
var modelOutputs;
var texts;
var classes;
var distancesOrig;
var confusionMatrix;
var accuracy;

// visualization data
var circleValues;
var polylineValues;

function init() {
    currentSequence = -1;
    document.getElementsByName("datasets")[0].selectedIndex = "0";
}

function loadData() {
    currentSequence = -1;
    d3.select("#selectedRow").attr("class", "row");

    var parameters = {
        "dataset": document.getElementsByName("datasets")[0].value
    };

    var request = new XMLHttpRequest();
    request.open('POST', '/dimRed', false);
    request.setRequestHeader("Content-Type", "application/json");
    request.send(JSON.stringify(parameters));

    var content = JSON.parse(request.responseText);
    projection = content["projection"];
    actualValues = content["actualValues"];
    predictions = content["predictions"];
    hiddenStates = content["hiddenStates"];
    modelOutputs = content["modelOutputs"];
    texts = content["texts"];
    classes = content["classes"];
    distancesOrig = content["distances"];
    confusionMatrix = content["confusionMatrix"];
    accuracy = content["accuracy"];

    var colors = function(d) { return ["#FF1F5B", "#00CD6C", "#009ADE", "#AF58BA", "#FFC61E", "#F28522", "#A0B1BA",
                                       "#A6761D", "#E9002D", "#FFAA00", "#00B000"][d] };

    if (classes.length == 2) {
        colors = function(d) { return ["#0475b5", "#bd0061"][d] };
    }

    classScales = []
    for (var i = 0; i< classes.length; ++i) {
        var scale = d3.scaleLinear()
            .domain([0, 1])
            .range(["#fff", colors(i)]);
        classScales.push(scale);
    }

    if (classes.length == 2) {
        classScales = [classScales[1], classScales[0]];
        var customScale = d3.scaleLinear()
            .domain([0, 0.1, 0.5, 0.9, 1])
            .range(["#bd0061", "#ff47a6", "#c9c9c9", "#3194cc", "#0475b5"]);
    }
    else {
        var classIds = [];
        var colorValues = [];
        for (var i = 0; i < classes.length; ++i) {
            classIds.push(i);
            colorValues.push(colors(i));
        }
        var customScale = d3.scaleLinear()
                .domain(classIds)
                .range(colorValues);
    }

    linearLineScale = customScale;
    linearSampleScale = customScale;

    sampleScale = document.getElementById("sampleSlider").value / 10;
    lineScale = document.getElementById("lineSlider").value / 10;

    document.getElementById("handle3").checked = "checked";
    document.getElementsByName("blackTimelines")[0].checked = classes.length == 2 ? false : true;

    drawClassInfo(-1);
    drawConfusionMatrix(-1);
    showDataInfo(-1);

    var sentenceOverview = [];
    for (var i = 0; i < actualValues.length; ++i) {
        sentenceOverview.push({
            "Id":i,
            "Class":toClassString(actualValues[i]),
            "Classification":toClassString(predictions[i]),
            "Correctly Classified": correctlyPredicted(i),
            "Sequence": texts[i].join(" ").slice(0, 50) + "...",
        });
    }

    d3.select('#page-wrap').selectAll("*").remove();
    createTable(sentenceOverview);

    updateView();
    updateItems();
    updatePlots();

    if (classes.length === 2) {
        d3.select("#binaryLegend").style("display", null);
    }
    else {
        d3.select("#binaryLegend").style("display", "none");
    }
}

/** Update/draw visual elements **/

function updateView() {
    d3.select("#mainSvg").selectAll("polyline").remove();
    d3.select("#mainSvg").selectAll("line").remove();
    d3.select("#mainSvg").selectAll("rect").remove();
    d3.select("#mainSvg").selectAll("circle").remove();
    d3.select("#mainSvg").selectAll("text").remove();

    var svg = d3.select("#mainSvg");
    svg.selectAll("*").remove();

    var zoom = d3.zoom().wheelDelta(zoomDelta).on("zoom", function () {
        zoomBeahaviour();
    });

    var svg = svg.call(zoom)
        .append("g")
        .attr("id", "svgGroup");

    // scale
    var scales = getMainScales();
    var xScale = scales[0];
    var yScale = scales[1];

    // lines
    polylineValues = [];
    var c = 0;
    var mainElementsGroup = svg.append("g").attr("id", "mainElementsGroup");
    if (projection.length > 0) {
        for (var i = 0; i < projection.length; ++i) {
            for (var j = 0; j < projection[i].length - 1; ++j) {
                var v = {};
                v["connection"] = [xScale(projection[i][j][0]), yScale(projection[i][j][1]), xScale(projection[i][j + 1][0]),
                                   yScale(projection[i][j + 1][1])].join(",");
                v["metricColor"] = getLineColor(modelOutputs[i][j]);
                v["metricColorSample"] = getSampleColor(modelOutputs[i][j]);
                v["thicknessMetric"] = 0.5;
                v["startSample"] = texts[i][j];
                v["endSample"] = texts[i][j + 1];
                v["sequence"] = i;
                v["startSample_id"] = j;
                v["origDistance"] = distancesOrig[i][j];

                polylineValues.push(v);
                c++;
            }
        }
    }

    var polyline = mainElementsGroup.selectAll("polyline").data(polylineValues);
    var polylineEnter = polyline.enter().append("polyline");

    polylineEnter.attr("points", function(d, i) { return d["connection"]; });
    polylineEnter.style("stroke", function(d, i) { return fillCircles(d) });
    polylineEnter.style("fill", "none");
    polylineEnter.attr("class", function(d, i) { return "line " + "line" + d["sequence"] + " " + "line" +
                                                        d["sequence"] + "-" + d["startSample_id"]; });
    polylineEnter.style("opacity", 0);

    var mouseFunctions = tooltipFunctionsForLines();
    polylineEnter.on("mouseover", mouseFunctions[0]);
    polylineEnter.on("mousemove", mouseFunctions[1]);
    polylineEnter.on("mouseleave", mouseFunctions[2]);

    // circles
    circleValues = [];
    var count = 0;
    for (var i = 0; i < projection.length; i++) {
        for (var j = 0; j < projection[i].length; j++) {
            var v = {};
            v["x"] = xScale(projection[i][j][0]);
            v["y"] = yScale(projection[i][j][1]);
            v["label"] = texts[i][j];
            v["metricColor"] = getSampleColor(modelOutputs[i][j]);
            v["mo"] = modelOutputs[i][j];
            v["sequence"] = i;
            v["sample_id"] = j;
            v["predictionId"] = getPredictionForSample(i, j);
            v["confidence"] = getConfidenceForSample(i, j);

            circleValues.push(v);
        }
    }

    var circle = mainElementsGroup.selectAll("circle").data(circleValues);
    var circleEnter = circle.enter().append("circle");
    circleEnter.attr("cx", function(d, i) { return d["x"]; });
    circleEnter.attr("cy", function(d, i) { return d["y"]; });
    circleEnter.style("fill", function(d, i) { return document.getElementById("colorsClasses").checked ?
            getClassColor(actualValues[d["sequence"]]) : d["metricColor"]; });
    circleEnter.attr("class", function(d,i) { return "sample " + "sample" + d["sequence"] + " " + "sample" +
                                                     d["sequence"] + "-" + d["sample_id"]; });

    var mouseFunctions = tooltipFunctionsForSamples();
    circleEnter.on("mouseover", mouseFunctions[0]);
    circleEnter.on("mousemove", mouseFunctions[1]);
    circleEnter.on("mouseleave", mouseFunctions[2]);

    // highlight first/last sample
    var startAndEndCirclesGroup = svg.append("g").attr("id", "startAndEndCirclesGroup");

    var startEndValues = [];
    for (var i = 0; i < projection.length; i++) {
        var firstEl = Array.from(projection[i][0]);
        var colorStringFirst = "rgb(110,110,110)";
        var lastEl = Array.from(projection[i][projection[i].length - 1]);
        var colorStringLast = "rgb(0,0,0)";

        var v = {};
        v["x"] = xScale(firstEl[0]);
        v["y"] = yScale(firstEl[1]);
        v["label"] = firstEl[3];
        v["color"] = colorStringFirst;
        v["sequence"] = i;
        v["start"] = true;
        startEndValues.push(v);

        v = {};
        v["x"] = xScale(lastEl[0]);
        v["y"] = yScale(lastEl[1]);
        v["label"] = lastEl[3];
        v["color"] = colorStringLast;
        v["sequence"] = i;
        v["start"] = false;
        startEndValues.push(v);
    }

    var circle = startAndEndCirclesGroup.selectAll("circle").data(startEndValues);
    var circleEnter = circle.enter().append("circle");

    circleEnter.attr("class", function(d, i) { return "marker marker" + d["sequence"] + " " + (d["start"] ? "startmarker" : "endmarker"); })
               .attr("cx", function(d, i) { return d["x"]; })
               .attr("cy", function(d, i) { return d["y"]; })
               .style("stroke", function(d, i) { return d["color"]; })
               .style("fill", "none")
               .style("opacity", function(d, i) { return showStartEndMarker(d) });

    // labels
    var text = svg.selectAll("text").data(circleValues);
    var textEnter = text.enter().append("text");
    textEnter.text(function(d, i) { return d["label"]; })
              .style("text-anchor", "middle")
              .style("alignment-baseline", "central")
              .style("fill", function(d, i) { return labelsColor(d) })
              .style("pointer-events", "none")
              .attr("class", function(d, i) { return "labelText labelText" + d["sequence"] + " labelText" + d["sequence"] + "-" + d["sample_id"] })
              .style("opacity", function(d, i) { return showLabel(d); });

    // buttons
    d3.select("#resetButton").on('click', resetted);

    // legend
    d3.select("#legend").selectAll("rect").remove();

    // binary legend
    d3.select("#binaryLegend").selectAll("*").remove();
    var binaryLegend = d3.select("#binaryLegend");
    if (classes.length == 2) {
        var labelText = binaryLegend.append("span");
        labelText.node().innerHTML = classes[0];
        labelText.style("margin-right", "5px");

        var samplesColorMapSvg = binaryLegend.append("svg")
            .attr("height", function(d, i) { return 19 })
            .style("margin-right", "5px")
            .style("margin-left", "5px");
        var dataValues = [];
        for (var i = 0; i <= 200; i++) {
            dataValues.push(getSampleColor(i / 200));
        }
        samplesColorMapSvg.attr("width", 201);
        var legend = samplesColorMapSvg.selectAll("rect").data(dataValues);
        var rectEnter = legend.enter().append("rect");
        rectEnter.attr("y", function(d, i) { return 0; })
                 .attr("x", function(d, i) { return i; })
                 .attr("width", function(d, i) { return 1; })
                 .attr("height", function(d, i) { return 19 })
                 .style("fill", function(d, i) { return d; })
                 .style("shape-rendering", "crispEdges");

        labelText = binaryLegend.append("span");
        labelText.node().innerHTML = classes[1];
        labelText.style("margin-left", "5px");
        labelText.style("margin-right", "40px");
    }

    // class legend
    d3.select("#classLegend").selectAll("*").remove();
    var classLegend = d3.select("#classLegend");
    var classLegendElement = document.getElementById("classLegend");
    for (var j = 0; j < classes.length; ++j) {
        var labelText = classLegend.append("span");
        labelText.node().innerHTML = classes[j];
        labelText.style("margin-right", "5px");

        var newLegend = classLegend.append("svg")
            .attr("height", function(d, i) { return 19 })
            .style("margin-right", j < classes.length - 1 ? "20px" : "0");
        var dataValues = [];
        for (var i = 30; i >= 0; i--) {
            dataValues.push(getClassColor(j, i / 30));
        }
        newLegend.attr("width", 31);
        var legend = newLegend.selectAll("rect").data(dataValues);
        var rectEnter = legend.enter().append("rect");
        rectEnter.attr("y", function(d, i) { return 0; })
                 .attr("x", function(d, i) { return i; })
                 .attr("width", function(d, i) { return 1; })
                 .attr("height", function(d, i) { return 19 })
                 .style("fill", function(d, i) { return d; })
                 .style("shape-rendering", "crispEdges");
    }

    resetted(); // scale elements correctly
}

function updateItems() {
    d3.selectAll("circle.sample")
        .style("fill", function(d, i) { return document.getElementById("colorsClasses").checked ?
               getClassColor(actualValues[d["sequence"]]) : d["metricColor"]; });

    // show labels
    d3.selectAll(currentSequence >= 0 ? "text.labelText" + currentSequence : ".labelText")
      .style("opacity", function(d, i) { return showLabel(d); })
      .style("fill", function(d, i) { return labelsColor(d) });

    d3.select("#mainSvg").selectAll("polyline")
        .style("stroke", function(d, i) { return fillCircles(d) });

    d3.selectAll("circle.sample" + currentSequence)
        .style("fill", function(d, i) { return fillCircles(d); });

    // size of samples and lines
    sampleScale = document.getElementById("sampleSlider").value / 10;
    lineScale = document.getElementById("lineSlider").value / 10;
    scaleValues();

    // color samples
    d3.selectAll("circle.sample")
      .style("opacity", function(d) {return sampleOpacity(d)});

    // start/end markers
    d3.selectAll("circle.marker")
        .style("opacity", function(d, i) { return showStartEndMarker(d) });

    updateBarChart(currentSequence);
}

function showStartEndMarker(d) {
    if (currentSequence != -1 && d["sequence"] === currentSequence) {
        return 1;
    }
    if (d["start"] && document.getElementById("showFirstSamples").checked) {
        return 1;
    }
    if (!d["start"] && document.getElementById("showLastSamples").checked)  {
        return 1;
    }
    return 0;
}

function drawSequence(seqId) {
    var id = "sequence";

    var sequenceAreaSvg = d3.select("#" + id);
    var sequenceAreaElement = document.getElementById(id);
    sequenceAreaSvg.selectAll("*").remove();

    d3.select("#" + id).selectAll("*").remove();

    var sequenceContainer = d3.select("#" + id + "Container");

    if (seqId < 0) {
        sequenceContainer.style("display", "none");
        return;
    }
    sequenceContainer.style("display", "block");

    var margin = {top: 20, right: 10, bottom: 15, left: 40};

    var g = sequenceAreaSvg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var textElements = [];
    var index = circleValues.findIndex(y => y.sequence == seqId);
    var length = projection[seqId].length;

    for (var i = index; i < index + length; ++i) {
        textElements.push(JSON.parse(JSON.stringify(circleValues[i])));
        textElements.push({"label" : " ", "sample_id" : -1});
    }

    var textEnter = g.selectAll(".textElement")
      .data(textElements)
      .enter().append("text");

    textEnter.attr("class", function(d, i) { return (d["label"] == " " ? "spacer" : ("text text" + d["sequence"] + "-" + d["sample_id"])) })
      .text(function(d, i) { return d["label"]})
      .attr("y", 30)
      .attr("x", 70)
      .style("fill", "white")
      .style("stroke", "none")
      .style("background", function(d, i) { return d["label"] == " " ? "white" : getSampleColor(d["mo"]) });

    var mouseFunctions = tooltipFunctionsForSamples();

    textEnter.on("mouseover", mouseFunctions[0]);
    textEnter.on("mousemove", mouseFunctions[1]);
    textEnter.on("mouseleave", mouseFunctions[2]);
}

function drawClassInfo(seqId) {
    var id = "classInfo";

    d3.select("#" + id).selectAll("*").remove();

    var classInfoContainer = d3.select("#" + id + "Container");
    if (seqId >= 0) {
        classInfoContainer.style("display", "none");
        return;
    }
    classInfoContainer.style("display", "block")

    var values = [];
    for (var i = 0; i < classes.length; ++i) {
        var sum = 0;
        for (var j = 0;  j < classes.length; ++j) {
            sum += confusionMatrix[i][j];
        }
        var el = {};
        el["classId"] = i;
        el["class"] = classes[i];
        el["count"] = sum;
        el["correct"] = confusionMatrix[i][i];
        values.push(el);
    }

    var sequenceAreaElement = document.getElementById(id);
    var margin = {top: 5, right: 10, bottom: 30, left: 65};
    var areaSvgWidth = sequenceAreaElement.getBoundingClientRect().width;

    var width = areaSvgWidth - margin.left - margin.right;
    var height = 45 * classes.length;

    var svg = d3.select("#" + id)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
              "translate(" + margin.left + "," + margin.top + ")");

    var x = d3.scaleLinear()
        .domain([0, d3.max(values, function(d, i) { return d["count"] })])
        .range([ 0, width]);
    svg.append("g")
        .attr("transform", "translate(0," + (height - 8) + ")")
        .call(d3.axisBottom(x));

  svg.append("text")
      .attr("transform",
            "translate(" + 0 + " ," + (height + margin.top + 20) + ")")
      .style("text-anchor", "left")
      .text("#Sequences");

    var y = d3.scaleBand()
        .domain(classes)
        .range([0, height])
        .padding(0.3);
    svg.append("g")
        .call(d3.axisLeft(y));

    svg.selectAll(null)
        .data(values)
        .enter()
        .append("rect")
        .attr("x", x(0) )
        .attr("y", function(d) { return y(d["class"]); })
        .attr("width", function(d) { return x(d["count"]); })
        .attr("height", y.bandwidth() / 3 )
        .attr("fill", function(d) { return getClassColor(d["classId"]) })
        .style("shape-rendering", "crispEdges")
        .style("shape-rendering", "crispEdges");

    svg.selectAll(null)
        .data(values)
        .enter()
        .append("rect")
        .attr("x", x(0) )
        .attr("y", function(d) { return y(d["class"]) + y.bandwidth() / 3; })
        .attr("width", function(d) { return x(confusionMatrix[d["classId"]][d["classId"]]); })
        .attr("height", y.bandwidth() * 2 / 3)
        .attr("fill", function(d) { return getClassColor(d["classId"]) })
        .style("shape-rendering", "crispEdges");

    for (var i = 0; i < classes.length; ++i) {
        var d = values[i];
        var xVal = confusionMatrix[d["classId"]][d["classId"]];
        for (var j = 0; j < classes.length; ++j) {
            if (i === j) {
                continue;
            }
            svg.append("rect")
                .attr("x", x(xVal))
                .attr("y", y(d["class"]) + y.bandwidth() / 3)
                .attr("width", x(confusionMatrix[d["classId"]][j]))
                .attr("height", y.bandwidth() * 2 / 3)
                .attr("fill", getClassColor(j, 1))
                .style("shape-rendering", "crispEdges");
            xVal += confusionMatrix[d["classId"]][j];
        }
    }
}

function drawHeatmap(seqId) {
    var id = "heatmap";

    d3.select("#" + id).selectAll("*").remove();

    var heatmapContainer = d3.select("#" + id + "Container");
    if (seqId < 0) {
        heatmapContainer.style("display", "none");
        return;
    }
    heatmapContainer.style("display", "block");

    var x = 0;
    var values0 = [];
    var values1 = [];
    var indices = [];
    var values = [];

    var index = circleValues.findIndex(y => y.sequence == seqId);
    var length = projection[seqId].length;

    if (classes.length == 2) {
        for (var i = index; i < index + length; ++i) {
            var data0 = JSON.parse(JSON.stringify(circleValues[i]));
            data0["class"] = toClassString(0);
            data0["classId"] = 0;
            data0["v"] = 1 - data0["mo"];
            values0.push(data0);

            var data1 = JSON.parse(JSON.stringify(circleValues[i]));
            data1["class"] = toClassString(1);
            data1["classId"] = 1;
            data1["v"] = data1["mo"];
            values1.push(data1);

            indices.push(x);
            x++;
        }
        var values = values0.concat(values1);

        // sumary
        for (var i = index; i < index + length; ++i) {
            var data0 = JSON.parse(JSON.stringify(circleValues[i]));
            data0["class"] = "summary";
            data0["classId"] = 0;
            data0["v"] = data0["mo"];
            values.push(data0);
        }
    }
    else {
        for (var i = index; i < index + length; ++i) {
            for (var j = 0; j < classes.length; ++j) {
                var data0 = JSON.parse(JSON.stringify(circleValues[i]));
                data0["class"] = toClassString(j);
                data0["classId"] = j;
                data0["v"] = data0["mo"][j];
                values.push(data0);
            }
            indices.push(x);
            x++;
        }
        // sumary
        for (var i = index; i < index + length; ++i) {
            var data0 = JSON.parse(JSON.stringify(circleValues[i]));
            data0["class"] = "summary";
            j = data0["mo"].indexOf(Math.max(...data0["mo"]));
            data0["classId"] = j;
            data0["v"] = data0["mo"][j];
            values.push(data0);
        }
    }

    var sequenceAreaElement = document.getElementById(id);
    var margin = {top: 5, right: 10, bottom: 40, left: 65};
    var areaSvgWidth = sequenceAreaElement.getBoundingClientRect().width;

    // set the dimensions and margins of the graph
    var width = areaSvgWidth - margin.left - margin.right;
    var height = (classes.length + 1) * 20;

    // append the svg object to the body of the page
    var svg = d3.select("#" + id)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // Build X scales and axis:
    var ticks = [0];
    for (var i = 20; i < indices.length; i += 20) {
        ticks.push(i);
    }
    var x = d3.scaleBand()
      .range([0, width])
      .domain(indices)
      .padding(0);
    svg.append("g")
      .attr("transform", "translate(0," + (height - 2) + ")")
      .call(d3.axisBottom(x).tickValues(ticks));

    svg.append("text")
      .attr("transform",
            "translate(" + 0 + " ," + (height + margin.top + 25) + ")")
      .style("text-anchor", "left")
      .text("Word Id");

    var extendedClasses = classes.concat(["summary"]);

    var y = d3.scaleBand()
      .range([0, height])
      .domain(extendedClasses)
      .padding(0);
    var y_mod = d3.scaleBand()
        .domain(classes)
        .range([0, height - 20])
        .padding(0.3);
    svg.append("g")
        .call(d3.axisLeft(y_mod));

    var heatmapEnter = svg.selectAll()
      .data(values, function(d) {return d["class"] + ':' + d["v"];})
      .enter()
      .append("rect");
    heatmapEnter.attr("x", function(d) { return x(d["sample_id"]) })
      .attr("y", function(d) { return d["class"] == "summary" ? y(d["class"]) + y.bandwidth() / 2 : y(d["class"]) })
      .attr("width", x.bandwidth() )
      .attr("height", function(d) { return d["class"] == "summary" ? y.bandwidth() / 2: y.bandwidth() })
      .style("fill", function(d) { return (d["class"] == "summary" && classes.length == 2) ?
              getSampleColor(d["v"]) : getClassColor(d["classId"], d["v"])})
      .style("shape-rendering", "crispEdges")
      .attr("class", function(d) { return "heatmap heatmap" + d["sequence"] + "-" + d["sample_id"] });

    var mouseFunctions = tooltipFunctionsForSamples();
    heatmapEnter.on("mouseover", mouseFunctions[0]);
    heatmapEnter.on("mousemove", mouseFunctions[1]);
    heatmapEnter.on("mouseleave", mouseFunctions[2]);
}

// https://www.tutorialsteacher.com/d3js/create-bar-chart-using-d3js
function updateBarChart(seqId) {
    var id = "barChart1";

    d3.select("#" + id).selectAll("*").remove();

    var barChartTitle = d3.select("#" + id + "Title");
    var barChartContainer = d3.select("#" + id + "Container");
    if (seqId < 0) {
        barChartContainer.style("display", "none");
        return;
    }
    barChartContainer.style("display", "block");

    var values = [];
    var index = polylineValues.findIndex(y => y.sequence == seqId);
    var length = projection[seqId].length - 1;

    for (var i = index; i < index + length; ++i) {
        var el =  JSON.parse(JSON.stringify(polylineValues[i]));
        values.push(el);
    }

    var barChartElement = document.getElementById(id);
    var margin = {top: 5, right: 10, bottom: 40, left: 65};
    var barChartSvgWidth = barChartElement.getBoundingClientRect().width;
    var width = barChartSvgWidth - margin.left - margin.right;
    var height = 150;

    var barChartSvg = d3.select("#" + id)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    var yAxis = "Distance";
    var xAxis = "Sequence";

    var xScale = d3.scaleBand().range([0, width]),
        yScale = d3.scaleLinear().range([height, 0]);

    var g = barChartSvg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    xScale.domain(values.map(function(d, i) { return i; }));
    yScale.domain([0, d3.max(values, function(d, i) { return d["origDistance"] })]);

    var ticks = [0];
    for (var i = 20; i < values.length; i += 20) {
        ticks.push(i);
    }

    g.append("g")
     .call(d3.axisBottom(xScale).tickValues(ticks))
     .attr("transform", "translate(0," + (height - 2) + ")");

    g.append("text")
      .attr("transform",
            "translate(" + 0 + " ," + (height + margin.top + 25) + ")")
      .style("text-anchor", "left")
      .text("Word Id");

    g.append("g")
     .call(d3.axisLeft(yScale).ticks(5));

    var rectEnter = g.selectAll(".bar")
                 .data(values)
                 .enter()
                 .append("rect");
    rectEnter.style("fill", function(d, i) { return getLineColor(modelOutputs[seqId][i]) })
             .attr("x", function(d, i) { return xScale(i); })
             .attr("y", function(d, i) { return yScale(d["origDistance"]); })
             .attr("width", Math.max(1, xScale.bandwidth()))
             .attr("height", function(d, i) { return Math.abs(yScale(d["origDistance"]) - yScale(0)); })
             .attr("class", function(d,i) { return "bar bar" + d["sequence"] + "-" + d["startSample_id"]; })
             .style("shape-rendering", "crispEdges");

    // line
    var lineValues = []
    if (document.getElementsByName("showLabels")[0].checked) {
        var val = document.getElementById("labelsSlider").value / 100;
        lineValues.push([0, yScale(val), xScale(d3.max(xScale.domain())) + xScale(1), yScale(val)].join(","));
    }

    if (lineValues.length != 0) {
        var lineEnter = g.selectAll(null)
          .data(lineValues).enter()
          .append("polyline");
        lineEnter
          .style("stroke", highlightColor)
          .attr("stroke-width", 2)
          .attr("points", function(d) { return d })
          .attr("class", "markerLine");
    }

    var mouseFunctions = tooltipFunctionsForLines();

    rectEnter.on("mouseover", mouseFunctions[0]);
    rectEnter.on("mousemove", mouseFunctions[1]);
    rectEnter.on("mouseleave", mouseFunctions[2]);
}

function drawConfusionMatrix(seqId) {
    var id = "confusionMatrix";

    d3.select("#" + id).selectAll("*").remove();

    var confusionMatrixContainer = d3.select("#" + id + "Container");
    if (seqId >= 0) {
        confusionMatrixContainer.style("display", "none");
        return;
    }
    confusionMatrixContainer.style("display", "block");

    var values = [];
    for (var i = 0; i < confusionMatrix.length; ++i) {
        for (var j = 0; j < confusionMatrix.length; ++j) {
            var el = {};
            el["class0"] = toClassString(i);
            el["class1"] = toClassString(j);
            el["v"] = confusionMatrix[i][j];
            values.push(el);
        }
    }

    var confusionMatrixAreaElement = document.getElementById(id);
    var margin = {top: 10, right: 10, bottom: 60, left: 65};

    var width = classes.length * 40;
    var height = classes.length * 40;

    var svg = d3.select("#" + id)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    var myGroups = classes;
    var myVars = classes.slice().reverse();

    var x = d3.scaleBand()
      .range([ 0, width ])
      .domain(myGroups)
      .padding(0);
    var a = svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "translate(-10,0)rotate(-45)")
      .style("text-anchor", "end");

    var y = d3.scaleBand()
      .range([ height, 0 ])
      .domain(myVars)
      .padding(0);
    svg.append("g")
      .call(d3.axisLeft(y));

    var heatmapEnter = svg.selectAll()
      .data(values, function(d) {return d["class0"] + ':' + d["v"];})
      .enter();
    heatmapEnter
      .append("rect")
      .attr("x", function(d) { return x(d["class1"]) })
      .attr("y", function(d) { return y(d["class0"]) })
      .attr("width", x.bandwidth() )
      .attr("height", y.bandwidth() )
      .style("fill", function(d) { return confusionScale(d["v"] / projection.length) })
      .style("shape-rendering", "crispEdges")
      .attr("class", function(d) { return "confusion" + d["class0"] + "-" + d["class1"] });

    heatmapEnter.append("text")
      .attr("x", function(d) { return x(d["class1"]) })
      .attr("y", function(d) { return y(d["class0"]) })
      .style("text-anchor", "middle")
      .attr("dx", "20px")
      .attr("dy", "25px")
      .text(function(d) { return d["v"]; });
}

function updatePlots() {
    drawSequence(currentSequence);
    drawHeatmap(currentSequence);
    updateBarChart(currentSequence);
    drawClassInfo(currentSequence);
    drawConfusionMatrix(currentSequence);
    showDataInfo(currentSequence);
    showSequenceOverview(currentSequence);

    // redraw when window size changes
    window.addEventListener("resize", updatePlots);
}

function showSequenceOverview(seqId) {

    var id = "sequenceOverview";
    var idSeq = "sequenceOverviewSeq";
    var idClass = "sequenceOverviewClass";
    var idPred = "sequenceOverviewPred";
    var idCorr = "sequenceOverviewCorr";
    var idConf = "sequenceOverviewConfidence";

    var dataInfoContainer = d3.select("#" + id + "Container")
    if (seqId < 0) {
        dataInfoContainer.style("display", "none");
        return;
    }
    dataInfoContainer.style("display", "block");

    var dataInfoElement = document.getElementById(id);

    document.getElementById(idSeq).innerHTML = seqId;
    document.getElementById(idClass).innerHTML = toClassString(actualValues[seqId]);
    d3.select("#" + idClass).style("color", getClassColor(actualValues[seqId]));
    document.getElementById(idPred).innerHTML = toClassString(predictions[seqId]);
    d3.select("#" + idPred).style("color", getClassColor(predictions[seqId]));
    document.getElementById(idCorr).innerHTML = correctlyPredicted(seqId);
    document.getElementById(idConf).innerHTML = getConfidence(seqId);

    toTop(d3.selectAll("polyline.line" + seqId));
    toTop(d3.selectAll("circle.sample" + seqId));
}

function toTop(selection) {
    selection.each(function(d) {
        var parent = this.parentNode;
        parent.appendChild(this);
    });
}

function showDataInfo(seqId) {
    var id = "dataInfo";
    var idSeq = "dataInfoSeqs";
    var idClasses = "dataInfoClasses";
    var idCorr = "dataInfoCorr";
    var idAcc = "dataInfoAcc";

    d3.select("#" + id).selectAll("*").remove();

    var dataInfoContainer = d3.select("#" + id + "Container");
    if (seqId >= 0) {
        dataInfoContainer.style("display", "none");
        return;
    }
    dataInfoContainer.style("display", "block");

    var dataInfoElement = document.getElementById(id);

    document.getElementById(idSeq).innerHTML = texts.length;
    var classesTemp = [];
    var corrPred = 0;
    for (var i = 0; i < classes.length; ++i) {
        var sum = 0;
        for (var j = 0;  j < classes.length; ++j) {
            sum += confusionMatrix[i][j];
        }
        classesTemp.push(classes[i] + " (" + sum + " sequences)");
        corrPred += confusionMatrix[i][i];
    }
    document.getElementById(idClasses).innerHTML = classes.length + " Classes: " + classesTemp.join(", ");
    document.getElementById(idCorr).innerHTML = corrPred;
    document.getElementById(idAcc).innerHTML = accuracy;
}

function showSequence(seqId) {
    d3.selectAll("circle.sample")
        .style("fill", function(d, i) { return d["metricColor"]; });

    currentSequence = seqId;

    // make all lines/samples transparent
    d3.selectAll("circle.sample")
      .style("opacity", 0.15);

    d3.selectAll("polyline.line")
      .style("opacity", 0);

    d3.selectAll("circle.marker").
      style("opacity", 0);

    d3.selectAll("circle.sample" + seqId)
      .style("opacity", 1);

    d3.selectAll("polyline.line" + seqId)
      .style("opacity", 1);

    d3.selectAll("circle.marker").
      style("opacity", 0);

    d3.selectAll("circle.marker" + seqId).
      style("opacity", 1);

    updatePlots();
    updateItems();

    d3.selectAll("text.labelText").style("opacity", 0);
    d3.selectAll("text.labelText" + seqId)
      .style("opacity", function(d, i) { return showLabel(d) });
}

function hideSequences() {
    currentSequence = -1;

    d3.select("#selectedRow").attr("class", "row");

    // show samples, hide lines
    d3.selectAll("circle.sample")
      .style("opacity", function(d) {return sampleOpacity(d)});

    d3.selectAll("polyline.line")
      .style("opacity", 0);

    d3.selectAll("circle.marker")
       .style("opacity", function(d, i) { return showStartEndMarker(d) });

    d3.selectAll("text.labelText")
      .style("opacity", function(d, i) { return showLabel(d); });

    updateItems();
    updatePlots();
}

/** Tooltips **/

function tooltipFunctionsForSamples() {
    var Tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip");

    var mouseoverCircle = function(d, i) {
        if (d["sample_id"] === -1) {
            return;
        }

        Tooltip
            .style("opacity", 0.9);

        d3.selectAll("circle.sample" + d["sequence"] + "-" + d["sample_id"])
          .style("stroke", highlightColor)
          .style("stroke-width", 3 / lastScaleValue)
          .style("opacity", 1)
          .style("fill", function(d, i) { return d["metricColor"]; })
          .attr("r", (scalableCircleWidth * Math.abs(minCircleWidth) + hoverCircleWidthFactor) / lastScaleValue * sampleScale);

        d3.selectAll("text.text" + d["sequence"] + "-" + d["sample_id"])
          .style("background", highlightColor);

        d3.selectAll("rect.heatmap" + d["sequence"] + "-" + d["sample_id"])
          .style("stroke", highlightColor)
          .style("stroke-width", 0)
          .style("fill", highlightColor);

        d3.selectAll("rect.bar" + d["sequence"] + "-" + d["sample_id"])
          .style("stroke", highlightColor)
          .style("stroke-width", 0)
          .style("fill", highlightColor);

        d3.selectAll("rect.bar" + d["sequence"] + "-" + (d["sample_id"] - 1))
          .style("stroke", highlightColor)
          .style("stroke-width", 0)
          .style("fill", highlightColor);
    }
    var mousemoveCircle = function(d, i) {
        if (d["sample_id"] === -1) {
            return;
        }

        Tooltip
            .html("<u><b>" + d["label"] + "</b></u><br> Sequence: " + d["sequence"] + " - Word Id: " + d["sample_id"] + "<br>" +
                  "Classification: " + toClassString(d["predictionId"]) + "<br>Confidence: " + d["confidence"] + "<br>" +
                  "Class of Sequence: " + toClassString(predictions[d["sequence"]]))
            .style("left", (d3.event.pageX + 15) + "px")
            .style("top", (d3.event.pageY - 20) + "px")
            .style("opacity", 1);
    }

    var mouseleaveCircle = function(d, i) {
        if (d["sample_id"] === -1) {
            return;
        }

        Tooltip
            .style("opacity", 0);
        d3.selectAll("circle.sample" + d["sequence"] + "-" + d["sample_id"])
            .style("stroke", "none")
            .style("fill", function(d, i) { return fillCircles(d); })
            .style("opacity", function(d) { return sampleOpacity(d) });

        d3.selectAll("text.text" + d["sequence"] + "-" + d["sample_id"])
          .style("background", d["metricColor"]);

        d3.selectAll("rect.heatmap" + d["sequence"] + "-" + d["sample_id"])
          .style("stroke", "none")
          .style("fill", function(d) { return (d["class"] == "summary" && classes.length == 2) ?
                  getSampleColor(d["v"]) : getClassColor(d["classId"], d["v"])});

        d3.selectAll("rect.bar" + d["sequence"] + "-" + d["sample_id"])
          .style("stroke", "none")
          .style("fill", function(d) { return getLineColor(modelOutputs[d["sequence"]][d["startSample_id"]]) });
        d3.selectAll("rect.bar" + d["sequence"] + "-" + (d["sample_id"] - 1))
          .style("stroke", "none")
          .style("fill", function(d) { return getLineColor(modelOutputs[d["sequence"]][d["startSample_id"]]) });

        scaleValues();
    }

    return [mouseoverCircle, mousemoveCircle, mouseleaveCircle];
}

function tooltipFunctionsForLines() {
    var Tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip");

    var mouseoverLine = function(d, i) {
        if (d["sequence"] != currentSequence) {
            return;
        }

        Tooltip
            .style("opacity", 0.9);

        d3.selectAll("polyline.line" + d["sequence"] + "-" + d["startSample_id"])
          .style("stroke", highlightColor)
          .style("opacity", 1)
          .attr("stroke-width", function(d) { return lineThickness(d) + hoverLineFactor / lastScaleValue; });

        d3.selectAll("rect.bar" + d["sequence"] + "-" + d["startSample_id"])
          .style("fill", highlightColor)
          .style("stroke", highlightColor)
          .style("stroke-width", 0);

        // circles
        for (var x = 0; x < 2; x++) {
            d3.selectAll("circle.sample" + d["sequence"] + "-" + (d["startSample_id"] + x))
              .style("stroke", highlightColor)
              .style("stroke-width", 3 / lastScaleValue)
              .style("opacity", 1)
              .style("fill", function(d, i) { return d["metricColor"]; })
              .attr("r", (scalableCircleWidth * minCircleWidth + hoverCircleWidthFactor) / lastScaleValue * sampleScale);

            d3.selectAll("rect.heatmap" + d["sequence"] + "-" + (d["startSample_id"] + x))
              .style("stroke", highlightColor)
              .style("stroke-width", 0)
              .style("fill", highlightColor);

            d3.selectAll("text.text" + d["sequence"] + "-" + (d["startSample_id"] + x))
              .style("background", highlightColor);
        }
    }

    var mousemoveLine = function(d, i) {
        if (d["sequence"] != currentSequence) {
            return;
        }

        var startIndex = circleValues.findIndex(y => y.sequence == d["sequence"] && y.sample_id == d["startSample_id"]);
        console.log(d["sequence"] )
        console.log(d["startSample_id"] )
        console.log(startIndex)
        Tooltip
            .html(d["startSample"] + " &#8212; " + d["endSample"] + "<br>" +
            "Original distance: " + d["origDistance"].toFixed(2) + "<br>" +
            "Classification: " + toClassString(circleValues[startIndex]["predictionId"]) + " - " +
            toClassString(circleValues[startIndex + 1]["predictionId"]) +
            "<br>Confidence: " + circleValues[startIndex]["confidence"] + " - " +
            circleValues[startIndex + 1]["confidence"] + "<br>" +
            "Class of Sequence: " + toClassString(predictions[d["sequence"]]))
            .style("left", (d3.event.pageX + 15) + "px")
            .style("top", (d3.event.pageY - 20) + "px")
            .style("opacity", 1);
    }

    var mouseleaveLine = function(d, i) {
        if (d["sequence"] != currentSequence) {
            return;
        }

        Tooltip
            .style("opacity", 0);

        d3.selectAll("polyline.line" + d["sequence"] + "-" + d["startSample_id"])
          .style("stroke", function(d) { return fillCircles(d); })
          .attr("stroke-width", lineThickness(d))
          .style("opacity", 1);

        d3.selectAll("rect.bar" + d["sequence"] + "-" + d["startSample_id"])
          .style("stroke", "none")
          .style("fill", function(d) { return getLineColor(modelOutputs[d["sequence"]][d["startSample_id"]]) });

        // circles
        for (var x = 0; x < 2; x++) {
            d3.selectAll("circle.sample" + d["sequence"] + "-" + (d["startSample_id"] + x))
              .style("stroke", "none")
              .style("fill", function(d, i) { return fillCircles(d) })
              .style("opacity", function(d) {return sampleOpacity(d)})
              .attr("r", (scalableCircleWidth + minCircleWidth + hoverCircleWidthFactor) / lastScaleValue * sampleScale);

            d3.selectAll("rect.heatmap" + d["sequence"] + "-" + (d["startSample_id"] + x))
              .style("stroke", "none")
              .style("fill", function(d) { return (d["class"] == "summary" && classes.length == 2) ?
                      getSampleColor(d["v"]) : getClassColor(d["classId"], d["v"]) });

            d3.selectAll("text.text" + d["sequence"] + "-" + (d["startSample_id"] + x))
              .style("background", function(d) { return d["metricColor"] });
        }
        scaleValues();
    }

    return [mouseoverLine, mousemoveLine, mouseleaveLine];
}

/** Values needed for visualization**/

function correctlyPredicted(seqId) {
    return JSON.stringify(actualValues[seqId]) === JSON.stringify(predictions[seqId]);  // sometimes int, sometimes list
}

function getPredictionForSample(seqId, sampleId) {
    var value = modelOutputs[seqId][sampleId];
    if (classes.length == 2) {
        var i = value <= 0.5 ? 0 : 1;
    }
    else {
        var i = value.indexOf(Math.max(...value));
    }
    return i;
}

function getConfidence(seqId) {
    return getConfidenceForSample(seqId, modelOutputs[seqId].length - 1);
}

function getConfidenceForSample(seqId, sampleId) {
    var value = modelOutputs[seqId][sampleId];
    if (classes.length == 2) {
        value = Math.max(value, 1 - value);
    }
    else {
        var i = value.indexOf(Math.max(...value));
        value = value[i];
    }
    return (value * 100).toFixed(1) + "%";
}

function toClassString(classId) {
    return classes[classId];
}

/** Colors/Appearance **/

function rgba2rgb(color, alpha) {
  var background = [255, 255, 255]
  result = [Math.floor((1 - alpha) * background[0] + alpha * color[0] + 0.5),
            Math.floor((1 - alpha) * background[1] + alpha * color[1] + 0.5),
            Math.floor((1 - alpha) * background[2] + alpha * color[2] + 0.5)];
  return "rgb(" + result[0] + ", " + result[1] + ", " +  result[2] + ")"
}

function getLineColor(value) {
    if (Array.isArray(value) && value.length === 1) {
        var value = value[0];
        var colorString = linearLineScale(scaleValueForColorMap(value));
    }
    else if (Array.isArray(value)) {
        var i = value.indexOf(Math.max(...value));
        var colorString = getClassColor(i, scaleValueForColorMap(value[i]));
    }
    return colorString;
}

function getClassColor(c, val = 1) {
    return classScales[c](val);
}

function getTimeLineColor(id, seqId) {
    var value = id / (projection[seqId].length - 1);
    var colorString = blackLineScale(value);
    return colorString;
}

function getSampleColor(value) {
    if (Array.isArray(value) && value.length === 1) {
        var value = value[0];
    }
    else if (Array.isArray(value)) {
        var i = value.indexOf(Math.max(...value));
        var value = i;
    }
    var colorString = linearSampleScale(scaleValueForColorMap(value));
    return colorString;
}

function labelsColor(d) {
    if (labelsOpacityAfterJump(d)) {
        return "#431752";
    }
    if (labelsOpacityBeforeJump(d)) {
        return "#154d1a";
    }
    if (labelsOpacityAfterConfidence(d)) {
        return "#431752";
    }
    if (labelsOpacityBeforeConfidence(d)) {
        return "#154d1a";
    }
    if (labelsOpacityAfterClassChange(d)) {
        return "#431752";
    }
    if (labelsOpacityBeforeClassChange(d)) {
        return "#154d1a";
    }
    return "#fff"
}

function scaleValueForColorMap(value, leftOffset = 0, rightOffset = 0) {
    return (value) * (1 - leftOffset - rightOffset) + leftOffset;
}

function fillCircles(d) {
    var temp = "sample_id" in d ? "sample_id" : "startSample_id";
    if (currentSequence == -1) {
        return document.getElementById("colorsClasses").checked ? getClassColor(actualValues[d["sequence"]]) : d["metricColor"];
    }
    if (document.getElementsByName("blackTimelines")[0].checked) {
        return getTimeLineColor(d[temp], d["sequence"]);
    }
    return document.getElementById("colorsClasses").checked ? getClassColor(actualValues[d["sequence"]]) : d["metricColor"];
}

function lineThickness(d) {
    var value = d["thicknessMetric"];
    if (document.getElementById("thicknessTime").checked) {
        value = d["startSample_id"] / projection[d["sequence"]].length;
    }
    if (document.getElementById("thicknessDistance").checked) {
        value = distancesOrig[d["sequence"]][d["startSample_id"]];
    }
    return (Math.abs(value) * scalableLineWidth + minLineWidth) / lastScaleValue * lineScale;
}

function sampleOpacity(d) {
    if (d["sequence"] == currentSequence || currentSequence == -1) {
        if (document.getElementById("fadeCorrectPredicted").checked && correctlyPredicted(d["sequence"])) {
            return 0.15;
        }
        if (document.getElementById("fadeWrongPredicted").checked && !correctlyPredicted(d["sequence"])) {
            return 0.15;
        }
        return 1;
    }
    return 0.15;
}

function showLabel(d) {
    return Math.min(1, labelsOpacityAfterJump(d) + labelsOpacityBeforeJump(d) +
                       labelsOpacityAfterConfidence(d) + labelsOpacityBeforeConfidence(d) +
                       labelsOpacityAfterClassChange(d) + labelsOpacityBeforeClassChange(d));
}

function labelsOpacityAfterJump(d) {
    if (document.getElementsByName("showLabels")[0].checked) {
        if (d["sample_id"] > 0 && distancesOrig[d["sequence"]][d["sample_id"] - 1] >=
               (document.getElementById("labelsSlider").value / 100)) {
            return 1;
        }
    }
    return 0;
}

function labelsOpacityBeforeJump(d) {
    if (document.getElementsByName("showLabelsBefore")[0].checked) {
        if ((d["sample_id"] < projection[d["sequence"]].length - 1) &&
                distancesOrig[d["sequence"]][d["sample_id"]] >= (document.getElementById("labelsSlider").value / 100)) {
            return 1;
        }
    }
    return 0;
}

function labelsOpacityAfterClassChange(d) {
    if (document.getElementsByName("showLabelsAfterClassChange")[0].checked) {
        if (d["sample_id"] > 0 && getPredictionForSample(d["sequence"], d["sample_id"]) !=
                getPredictionForSample(d["sequence"], d["sample_id"] - 1)) {
            return 1;
        }
    }
    return 0;
}

function labelsOpacityBeforeClassChange(d) {
    if (document.getElementsByName("showLabelsBeforeClassChange")[0].checked) {
        if ((d["sample_id"] < projection[d["sequence"]].length - 1)  &&
                getPredictionForSample(d["sequence"], d["sample_id"]) != getPredictionForSample(d["sequence"], d["sample_id"] + 1)) {
            return 1;
        }
    }
    return 0;
}

function labelsOpacityAfterConfidence(d) {
    if (document.getElementsByName("showLabelsAfterConfidence")[0].checked) {
        if (d["sample_id"] > 0) {
            if (classes.length == 2) {
                if (Math.abs(modelOutputs[d["sequence"]][d["sample_id"]] - modelOutputs[d["sequence"]][d["sample_id"] - 1]) >=
                        (document.getElementById("labelsConfidenceSlider").value / 100)) {
                    return 1;
                }
            }
            else {
                var diff = []
                for (var i = 0; i < modelOutputs[d["sequence"]][d["sample_id"]].length; i++) {
                    const el = Math.abs((modelOutputs[d["sequence"]][d["sample_id"]][i] || 0) -
                               (modelOutputs[d["sequence"]][d["sample_id"] - 1][i] || 0));
                    diff[i] = el;
                };
                if (Math.max(...diff) >= (document.getElementById("labelsConfidenceSlider").value / 100)) {
                    return 1;
                }
            }
        }
    }
    return 0;
}

function labelsOpacityBeforeConfidence(d) {
    if (document.getElementsByName("showLabelsBeforeConfidence")[0].checked) {
        if (d["sample_id"] < projection[d["sequence"]].length - 1) {
            if (classes.length == 2) {
                if (Math.abs(modelOutputs[d["sequence"]][d["sample_id"]] - modelOutputs[d["sequence"]][d["sample_id"] + 1]) >=
                        (document.getElementById("labelsConfidenceSlider").value / 100)) {
                    return 1;
                }
            }
            else {
                var diff = []
                for (var i = 0; i < modelOutputs[d["sequence"]][d["sample_id"]].length - 1; i++) {
                    const el = Math.abs((modelOutputs[d["sequence"]][d["sample_id"]][i] || 0) -
                               (modelOutputs[d["sequence"]][d["sample_id"] + 1][i] || 0));
                    diff[i] = el;
                }
                if (Math.max(...diff) >= (document.getElementById("labelsConfidenceSlider").value / 100)) {
                    return 1;
                }
            }
        }
    }
    return 0;
}

/** Scaling **/

function updateAndResize() {
    resetted();
    updateItems();
}

function scaleValues() {
    // scale
    var scales = getMainScales();
    var xScale = scales[0];
    var yScale = scales[1];

    d3.select("#mainSvg").selectAll("polyline")
        .attr("stroke-width", function(d) { return lineThickness(d); });

    d3.select("#mainSvg").selectAll(".labelText")
        .attr("x", function(d, i) { return d["x"]; })
        .attr("y", function(d, i) { return d["y"] - 5 / lastScaleValue; })
        .attr("font-size", function(d, i) { return 18 / lastScaleValue + "px"; });

    d3.select("#mainSvg").select("#mainElementsGroup").selectAll("circle")
        .attr("r", function(d, i) { return (scalableCircleWidth + minCircleWidth) / lastScaleValue * sampleScale; })
        .attr("stroke-width", function(d, i) { return 1 / lastScaleValue });

    d3.select("#mainSvg").select("#startAndEndCirclesGroup").selectAll("circle")
        .attr("r", function(d, i) { return highlightsCircleWidth / lastScaleValue; })
        .attr("stroke-width", function(d, i) { return 3 / lastScaleValue; });
}

function getMainScales() {
    var margin = 30;

    var plotElement = document.getElementById("mainSvg");
    var svgWidth = plotElement.getBoundingClientRect().width - 2 * margin;
    var svgHeight = plotElement.getBoundingClientRect().height - 2 * margin;

    var valuesFlattened = [];
    for (var i = 0; i < projection.length; i++) {
        valuesFlattened = valuesFlattened.concat(projection[i]);
    }

    var minValx = d3.min(valuesFlattened, function (d) { return d[0]; });
    var minValy = d3.min(valuesFlattened, function (d) { return d[1]; });
    var maxValx = d3.max(valuesFlattened, function (d) { return d[0]; });
    var maxValy = d3.max(valuesFlattened, function (d) { return d[1]; });
    var differenceX = maxValx - minValx;
    var differenceY = maxValy - minValy;

    var ratioX = svgWidth / differenceX;
    var ratioY = svgHeight / differenceY;
    var ratioXLargerThanY = ratioX > ratioY;

    var scaleTemp = d3.scaleLinear().range([margin, ratioXLargerThanY ? (svgHeight + margin) : (svgWidth + margin)]);
    scaleTemp.domain([0, ratioXLargerThanY ? (maxValy - minValy) : (maxValx - minValx)]);

    var diffShiftX = (svgWidth - scaleTemp(maxValx - minValx) + margin) / 2;
    var diffShiftY = (svgHeight - scaleTemp(maxValy - minValy) + margin) / 2;

    // scale and center
    var scaleX = d3.scaleLinear().range([ratioXLargerThanY ? (margin + diffShiftX) : margin, ratioXLargerThanY ?
                 (svgHeight + margin + diffShiftX) : (svgWidth + margin)]);
    var scaleY = d3.scaleLinear().range([ratioXLargerThanY ? margin : (margin + diffShiftY), ratioXLargerThanY ?
                 (svgHeight + margin) : (svgWidth + margin + diffShiftY)]);
    scaleX.domain([minValx, ratioXLargerThanY ? (maxValy - minValy + minValx) : maxValx]);
    scaleY.domain([minValy, ratioXLargerThanY ? maxValy : (maxValx - minValx + minValy)]);

    function scaleY2(d) { return plotElement.getBoundingClientRect().height - scaleY(d) }

    return [scaleX, scaleY2];
}

function zoomBeahaviour() {
    var lastScaleValue = d3.event.transform.k;
    var zoom = d3.zoom().wheelDelta(zoomDelta).on("zoom", function () {
        zoomBeahaviour();
    });

    d3.select("#svgGroup").attr("transform", d3.event.transform);
    scaleValues();
}

function resetted() {
    var svg = d3.select("#mainSvg");
    var zoom = d3.zoom().wheelDelta(zoomDelta).on("zoom", function () {
        zoomBeahaviour();
    });
   svg.call(zoom.transform, d3.zoomIdentity);
}

// https://stackoverflow.com/questions/44960362/how-to-use-zoom-wheeldelta-in-d3-v4
function zoomDelta() {
    return -d3.event.deltaY * (d3.event.deltaMode ? 120 : 1) / 1500;
}

import { append_dots_errobars } from './chart_coordinates'
import { draw_legend } from "./legend";;
import { compute_classification } from "./classification";


export function createChart (data,divid, classification_type, metric_x, metric_y, metrics_names, better, axis_limits){

  let margin = {top: Math.round($(window).height()* 0.0318), right:  Math.round($(window).width()* 0.0261), bottom: compute_chart_height(data), left:  Math.round($(window).width()* 0.0373)},
    width = Math.round($(window).width()* 0.6818) - margin.left - margin.right,
    height = Math.round($(window).height()* 0.87) - margin.top - margin.bottom;

  let min_x = d3.min(data, function(d) { return d.valid ? d.x : NaN; });
  let max_x = d3.max(data, function(d) { return d.valid ? d.x : NaN; });
  let min_y = d3.min(data, function(d) { return d.valid ? d.y : NaN; });
  let max_y = d3.max(data, function(d) { return d.valid ? d.y : NaN; });

  //the x axis domain is calculated based in the difference between the max and min, and the average stderr (BETA)
  var proportion = get_avg_stderr(data, "x")/(max_x-min_x);

  // set the axis limits depending on zoom
  let auto_x_start = min_x - proportion*(max_x-min_x);
  let auto_y_start = min_y - proportion*(max_y-min_y);
  var x_limit = (axis_limits == "auto") ? auto_x_start : 0;
  var y_limit = (axis_limits  == "auto") ? auto_y_start : 0;

  let xScale = d3.scaleLinear()
    .range([0, width])
    .domain([x_limit, max_x + proportion*(max_x-min_x)]).nice();

  //the y axis domain is calculated based in the difference between the max and min, and the average stderr (BETA)
  proportion = get_avg_stderr(data, "y")/(max_y-min_y);

  let yScale = d3.scaleLinear()
    .range([height, 0])
    .domain([y_limit, max_y + proportion*(max_y-min_y)]).nice();

  let xAxis = d3.axisBottom(xScale).ticks(12),
      yAxis = d3.axisLeft(yScale).ticks(12 * height / width);

  let line = d3.line()
    .x(function(d) {
      return xScale(d.x);
    })
    .y(function(d) {
      return yScale(d.y);
    });

  // Define the div for the tooltip

  let div = d3.select('body').append("div").attr("class", "benchmark_tooltip").style("opacity", 0);

  // append the svg element
  // d3.select("svg").remove()
    // console.log(d3.select("svg").remove());
  let svg = d3.select('#'+divid + "flex-container").append("svg")
    .attr("class", "benchmarkingSVG")
    .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom))
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr('id','svg_'+divid)
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  
  svg.append("g").append("rect").attr("width", width).attr("height", height).attr("class", "plot-bg");

  // Add Axis numbers
  svg.append("g").attr("class", "axis axis--x")
    .attr("transform", "translate(" + 0 + "," + height + ")")
    .call(xAxis);

  svg.append("g").attr("class", "axis axis--y").call(yAxis);

  // add axis labels
  if (metric_x.startsWith("OEBM") == true){
    var txt_x = metrics_names[metric_x];
  } else {
    var txt_x = metric_x;
  };
  if (metric_y.startsWith("OEBM") == true){
    var txt_y = metrics_names[metric_y];
  } else {
    var txt_y = metric_y;
  };
  svg.append("text")             
  .attr("transform",
        "translate(" + (width/2) + " ," + 
                       (height + margin.top + (Math.round($(window).height()* 0.0347))) + ")")
  .style("text-anchor", "middle")
  .style("font-weight", "bold")
  .style("font-size", ".95vw")
  .text(txt_x);

  svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x",0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-weight", "bold")
      .style("font-size", ".95vw")
      .text(txt_y ); 
  
  // add pareto legend

  svg.append("line")
  .attr("x1", 0)
  .attr("y1", height + margin.top + (Math.round($(window).height()* 0.0347)) )
  .attr("x2", Math.round($(window).width()* 0.02083))
  .attr("y2", height + margin.top + (Math.round($(window).height()* 0.0347)) )

  .attr("stroke", "grey")
  .attr("stroke-width",2)
  .style("stroke-dasharray", ("15, 5"))
  .style("opacity", 0.7)  
  
  svg.append("text")             
  .attr("transform",
        "translate(" + (Math.round($(window).width()* 0.05208)) + " ," + 
                       (height + margin.top + (Math.round($(window).height()* 0.0347)) + 5) + ")")
  .style("text-anchor", "middle")
  // .style("font-weight", "bold")
  .style("font-size", ".75vw")
  .text("Pareto frontier");


  // add X and Y Gridlines
  var gridlines_x = d3.axisBottom()
                    .ticks(12)
                    .tickFormat("")
                    .tickSize(height)
                    .scale(xScale);

  var gridlines_y = d3.axisLeft()
                    .ticks(12 * height / width)
                    .tickFormat("")
                    .tickSize(-width)
                    .scale(yScale);

  svg.append("g")
     .attr("class", "bench_grid")
     .call(gridlines_x);
  
     svg.append("g")
     .attr("class", "bench_grid")
     .call(gridlines_y);
  
     
  // add OpenEBench Credits
  if (window.location.href.toLocaleLowerCase().includes("openebench") == false ){
    add_oeb_credits(svg, margin);
  }
  

  let removed_tools = []; // this array stores the tools when the user clicks on them

   // setup fill color
  let cValue_func = function(d) {
    return d.toolname;
  },
  color_func = d3.scaleOrdinal(d3.schemeSet1.concat(d3.schemeSet3).concat(d3.schemeSet2));

    // get object with tools and colors:
    var legend_color_palette = {};
    data.forEach(function(element) {
      legend_color_palette[element.toolname] = color_func(element.toolname);
    });


  append_dots_errobars (svg, data, xScale, yScale, div, cValue_func, color_func,divid, metric_x, metric_y, metrics_names);

  draw_legend (data, svg, xScale, yScale, div, width, height, removed_tools, color_func, color_func.domain(), divid,classification_type, legend_color_palette);

  compute_classification(data, svg, xScale, yScale, div, width, height, removed_tools,divid, classification_type, legend_color_palette, better[divid]);

  };

  function compute_chart_height(data){

    if (data.length%5 == 0){
      return (165 + (20 * (Math.trunc(data.length/5))));
    } else if (data.lenght%5 != 0) {
      return (165 + (20 * (Math.trunc(data.length/5)+1)));
    } 
    
  };

  function get_avg_stderr(data, axis){

    var sum = 0;

    data.forEach(function(element) {
      if (axis == "y"){
        sum = sum + element.e_y;
      } else if (axis == "x"){
        sum = sum + element.e_x;
      }
    });
  
    return sum/data.length
  
  }

  function add_oeb_credits(svg, margin){

    svg.append("a")
    .attr("xlink:href", "https://openebench.bsc.es")
    .attr("target", "_blank")
    .append("rect")  
    .attr("transform",
          "translate(" + (Math.round($(window).width()* 0.6)) + " ," + 
          ( margin.top - (Math.round($(window).height()* 0.057))) + ")")
    .attr("height", Math.round($(window).height()* 0.0235))
    .attr("width", Math.round($(window).width()* 0.03))
    .style("fill", "white")
    .attr("rx", 10)
    .attr("ry", 10);
  
  
    svg.append("svg:image")
    .attr("transform",
          "translate(" + (Math.round($(window).width()* 0.6)) + " ," + 
          ( margin.top - (Math.round($(window).height()* 0.063))) + ")")
  .attr('width', Math.round($(window).width()* 0.029))
  .attr('height', Math.round($(window).height()* 0.026))
  .attr("xlink:href", "images/logo.png")
  .style("pointer-events", "none");

      // svg.append("text") 
    // .attr("class", "OEB_text_link")   
    // .style("pointer-events", "none")         
    // // .attr("transform",
    // //       "translate(" + (Math.round($(window).width()* 0.55)) + " ," + 
    // //       (height + margin.top + (Math.round($(window).height()* 0.0347)) + 5) + ")")
    // .attr("transform",
    //       "translate(" + (Math.round($(window).width()* 0.55)) + " ," + 
    //       ( margin.top - (Math.round($(window).height()* 0.04))) + ")")
    // .style("text-anchor", "middle")
    // .style("font-style", "italic")
    // .style("font-size", ".75vw")
    // .text("Powered by OpenEBench");

  }
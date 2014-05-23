function drawMatrix(dataurl, outputurl){
    
    

	d3.json(dataurl,
	       function(error, alldata) {
		   var data = alldata.mtrx,
		   margin = { top: 200, right: 50, bottom: 100, left: 250 },
		   width  = 1010 - margin.left - margin.right,
		   height = 2048 - margin.top - margin.bottom,
		   colors = ["black", "white", "blue", "green", "yellow", "#CC0000","#FF0000"],
		   colors_s = ["white", "blue", "green", "yellow", "red"],
		   maxval = d3.max(data, function (d) { return d.value; }),
		   yaxis = alldata.yaxis,
		   xaxis = alldata.xaxis;

		   var maxp1 =  d3.max(data, function(d){return d.p1;}),
		   maxp2 = d3.max(data, function(d){return d.p2;});
		   var gridSize = Math.floor(width / maxp2);
		   var bottom = gridSize * maxp1;

		   var colorScale = d3.scale.linear()
		       .domain([0, 1, maxval / 4, maxval / 2, (maxval / 4)*3,  maxval -1, maxval])
		       .range(colors);
		   if(maxval == 1){
		       colorScale = d3.scale.linear()
			   .domain([0, maxval / 4, maxval / 2, (maxval / 4)*3,  maxval])
			   .range(colors_s);
		   }

		   var svg = d3.select("#chart").append("svg")
		       .attr("width", width + margin.left + margin.right)
		       .attr("height", height + margin.top + margin.bottom)
		       .append("g")
		       .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      
		   var yAxisLabels = svg.selectAll(".yAxisLabel")
		       .data(yaxis)
		       .enter().append("text")
		       .text(function (d) { return d[1]; })
		       .attr("x", 0)
		       .attr("y", function (d, i) { return (i-1) * gridSize; })
		       .style("text-anchor", "end")
		       .attr("transform", "translate(-30," + gridSize / 1.5 + ")")
		       .attr("class", function (d, i) { return "yAxisLabel mono axis axis-workweek"; });
		   
		   var x0 = d3.scale.ordinal().domain(d3.range(maxp2 + 1)).rangeBands([0, width], -.5);

		   var xAxisLabels = svg.selectAll(".xAxisabel")
		       .data(xaxis)
		       .enter().append("g")
		       .attr("x", function(d, i) { return (i-1) * gridSize; })
		       .attr("y", 0)
		       .attr("transform", function(d, i){return "translate(" + x0(i) + ", -30)"});
		   
		   xAxisLabels.append("text")
		       .text(function(d) { return d[1]; })
		       .style("text-anchor", "start")
		       .attr("transform", function(d) {return "rotate(-65,0,0)" })      
		       .attr("class", function(d, i) { return "timeLabel mono axis axis-worktime"; });

		   var heatMap = svg.selectAll(".hour")
		       .data(data)
		       .enter().append("rect")
		       .attr("x", function(d) { return (d.p2 - 1) * gridSize; })
		       .attr("y", function(d) { return (d.p1 - 1) * gridSize; })
		       .attr("rx", 4)
		       .attr("ry", 4)
		       .attr("class", "hour bordered")
		       .attr("width", gridSize)
		       .attr("height", gridSize)
		       .style("fill", colors[0]);
		   
		   heatMap.transition().duration(1000)
		       .style("fill", function(d) { return colorScale(d.value); });
		   
		   heatMap.append("title").text(function(d) { return d.value; });
		   heatMap.on("click", 
			      function(d){
				  if(yaxis[d.p1][1] != xaxis[d.p2][1]){
				      document.location = outputurl + "summary/" + yaxis[d.p1][1] + "/" + xaxis[d.p2][1] + "/";}
			      }
			     );
	       }); // end function
}



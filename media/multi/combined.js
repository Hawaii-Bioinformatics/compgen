// cluster_id: The ID of the groups.. the nodes/cicles
// member_id: The ID of the labels provide 

/**  Data Input:
3 Files are required:
members.json -- processed by onFetchMembers().  The format of this file should be a json list.  The index into this list should match what is provided for each member_id in the membertoCluster file.

clusters.json -- processed by onFetchClusters.  The format of this file should bea json list of lists.  Each inner list shall contain 3 integers: cluster_id, members_count, value. Cluster_id is a unique ID for a given cluster.  The members_count is the total number of unqie members take part in the cluster.  value typically will represent the non-unique member count that takes part in a given cluster. 

member_to_cluster.json -- processed by onFetchMemberToCluster. The format of this file should be a json list of lists.  Each inner list shall contain 3 integers: cluster_id, member_id, and value.  The value maybe the amount that this particular member contributes to the cluster (currently not used).  The member_id shall match the index into the members list (note this is a 0 based value).  The cluster_id shall match the cluster_id in the clusters.json file that this member_id is being associated with. 
**/


var visualize = ( function(){
    "use strict";

    var svg, linksSvg, nodesSvg, chordsSvg, linkRadius, nodesTranslate, chordsTranslate, timeoutId,
        sliderinit = false,
	members = [], 
	memberTocluster = [], 
	clusters = {}, 
	cluster_nodes = [], 
	processed = {},
	minS = 0, 
	maxS = 0,
	chordsById = {}, 
	nodesById = {}, 
	usr_chords = [], 
	numCalls = 0,
        datarange=[1,1],
        baseurl = "",
	toolTip = d3.select(document.getElementById("toolTip")),
	header = d3.select(document.getElementById("head")),
	header1 = d3.select(document.getElementById("header1")),
	header2 = d3.select(document.getElementById("header2")),
        cachedMembers = {},
	selectColor = "#447733", 
	nodeColor = "#F80018",
	lineColor = "#0543EE";


    function init(){
	d3.select("#svg").remove();
	svg = "", linksSvg = "", nodesSvg = "", chordsSvg = "", linkRadius = "", nodesTranslate = "", chordsTranslate = "", timeoutId = 0,
	members = [], 
	memberTocluster = [], 
	clusters = {}, 
	cluster_nodes = [], 
	processed = {},
	minS = 0, 
	maxS = 0,
	chordsById = {}, 
	nodesById = {}, 
	usr_chords = [], 
	numCalls = 0,
        cachedMembers = {},	
	toolTip = d3.select(document.getElementById("toolTip")),
	header = d3.select(document.getElementById("head")),
	header1 = d3.select(document.getElementById("header1")),
	header2 = d3.select(document.getElementById("header2"));

    };

    function log(message) {
	//console.log(message);
    };

    function minmax(){
	return [minS, maxS];
    }

    function initialize(bubbleRadius) {
	var bubble = d3.layout.pack()
	    .sort(null)
	    .size([bubbleRadius * 2, bubbleRadius * 2])
	    .padding(1.5),
	n_clusters = [];
	for( var index in clusters){
	    n_clusters.push(clusters[index]);
	}		

	var root = {children:n_clusters, PTY:'root'}, nodes = bubble.nodes(root);
	cluster_nodes = [];
	nodes.forEach (function (d) {
            if (d.depth == 1) {
		nodesById[d.cluster_id] = d;
		d.relatedLinks = [];
		cluster_nodes.push(d);
            }
	})
	
	buildChords();
	
	memberTocluster.forEach(function (d) {
	    if (d.cluster_id in nodesById){
		d.name = members[d.member_id].name;
		nodesById[d.cluster_id].relatedLinks.push(d);
		chordsById[d.name].relatedLinks.push(d);
	    }
	})
	log("initialize()");   
    };


    function buildChords() {
	var  matrix = [],
	indexByName = {},
	nameByIndex = [],
	n = 0,
	chord = d3.layout.chord()
	    .padding(.05)
	    .sortSubgroups(d3.descending)
	    .sortChords(d3.descending);
	
	// Compute a unique index for each package name
	members.forEach(function(d) {
            d = d.name;
            if (!(d in indexByName)) {
		nameByIndex[n] = d;
		indexByName[d] = n++;
            }
	});
	
	members.forEach(function(d) {
            var source = indexByName[d.name],
            row = matrix[source];
            if (!row) {
		//https://stackoverflow.com/questions/1295584/most-efficient-way-to-create-a-zero-filled-javascript-array
		matrix[source] = Array.apply(null, new Array(n)).map(Number.prototype.valueOf, 0);
		row = matrix[source];
            }
            row[indexByName[d.name]]= 1;
	});
	
	n = 0;
	chord.matrix(matrix);
	usr_chords=chord.chords();
	usr_chords.forEach(function (d) {
            d.label=nameByIndex[n];
            d.angle=(d.source.startAngle + d.source.endAngle) / 2
            chordsById[d.label] = {startAngle : d.source.startAngle,
				   endAngle : d.source.endAngle,
				   index : d.source.index,
				   value : d.source.value,
				   currentAngle : d.source.startAngle,
				   currentLinkAngle : d.source.startAngle,
				   source : d.source,
				   relatedLinks : []};
            n++;
	});
	
	log("buildChords()");
    };
    

    function setRange(mi, ma){
	minS = parseInt(mi);
	maxS = parseInt(ma);
    };
    

    function fetchData(url) {
	baseurl = url;
	document.getElementById("loader").style.display = "";
	document.getElementById("rangetext").style.display = "none";
	var dataCalls=[
	    addStream(url + "/members.json", onFetchMembers),
	    addStream(url + "/member_to_cluster.json", onFetchMemberToCluster),
	    addStream(url + "/clusters.json", onFetchClusters),

	];
	startFetch(dataCalls);
    };


    function addStream(file, func) {return {file:file, func:func};};


    function onFetchMembers(err,json){
	members = [];
	json.forEach(function(d){
	    var tmp={name:d};
	    members.push(tmp);
	});
	datarange = [1, members.length];
	log("onFetchmembers()");
	endFetch();
    };
    

    function onFetchMemberToCluster(err,json){
	var i = 0;
	json.forEach(function(d) {
	    memberTocluster.push({Key:i++, cluster_id:d[0], member_id:d[1], value:d[2]});
	});
	endFetch();
    };


    function onFetchClusters(err,json) {
	// range should be 1 to 32
	var grad={}, bins = maxS - minS  + 1;
	if(bins <= 0)
	    bins = 1;
	var step = 0.95 / bins, op=0;
	op = step;
	for(var i=minS; i <= maxS; ++i){
	    grad[i] = op;
	    op += step;
	}
	
	json.forEach(function(d){
	    
	    if(d[1] >= minS && d[1] <= maxS){
		var r = {value : d[2], opacity : grad[d[1]], cluster_id : d[0], member_count : d[1]};
		//total_members += r.value;
		clusters[r.cluster_id]=r;
		//n_clusters.push(r);
	    }
	}); 
	log("onFetchClusters()");
	endFetch();
    };


    function startFetch(dataCalls) {
	numCalls = dataCalls.length;
	dataCalls.forEach(function (d) { d3.json(d.file, d.func);});
    };


    function endFetch() { if (! (-- numCalls) ) {main();} };

    
    function node_onMouseOver(d,type) {
	if (type == "NODE") {
            if(d.depth < 1) return;
            toolTip.transition()
		.duration(200)
		.style("opacity", ".9");

            header1.text("Cluster: " + d.cluster_id);
            header.text("Members: " + d.member_count);
            header2.text("Non-Unique Members : " + d.value);//+ " debug(" + clusters[d.cluster_id].opacity + ")" );
            toolTip.style("left", (d3.event.pageX + 50) + "px")
		.style("top", (d3.event.pageY - 125) + "px")
		.style("height","80px")
		.style("background-color", "#FFFFFF")
		.style("border", " solid black 1px")
		.style("border-radius", "5px")
		.style("z-index", 999);
            highlightLinks(d,true, type, type + "_" + d.cluster_id);
	} else if (type == "MEMBER") {
            highlightLinks( chordsById[d], true, type, type + "_" + d);
	}
    };
    
    
    function node_onMouseOut(d,type) {
	if (type=="NODE") {
            highlightLinks(d, false, type, "");
	} else if (type=="MEMBER") {
            highlightLinks(chordsById[d], false, type, "");
	}
	toolTip.transition()// declare the transition properties to fade-out the div
            .duration(500)	// it shall take 500ms
            .style("opacity", "0")
	    .style("z-index", -999);
    };
    
    
    function highlightLink(g,on, type) {    
	var opacity_fill=((on == true) ?  ((type=='MEMBER')?0.2:0.8) : 0),
	opacity_stroke=((on == true) ? ((type=='MEMBER')?0.1:0.8) : 0),
	link = d3.select(document.getElementById("l_" + g.Key)),  // the lines from cluster to boxes
	spec = d3.select(document.getElementById("p_" + g.name)), // the outer gray boxes
	circc = d3.select(document.getElementById("c_" + g.cluster_id)), //
	transpeed = (on == true) ? 150:550;
	link.transition(transpeed)
            .style("fill-opacity", opacity_fill)
            .style("stroke-opacity", opacity_stroke);
	spec.transition(transpeed)
	    .style("fill", (on == true) ? selectColor : "#000");
	circc.transition(transpeed).
	    style("fill", (on == true)? selectColor:nodeColor)
    	    .style("fill-opacity", (on == true)?1: clusters[g.cluster_id].opacity);
    };
    
    
    function buildLinks(links){
	// Thhis builds out the lines between the nodes (circles) and teh species (arcs)
	var diagonal = d3.svg.diagonal.radial(),
	linkGroup=linksSvg.selectAll("g.links").data(links, function (d,i) {return d.Key;}),
	enter = linkGroup.enter();
	enter.append("path")
	    .attr("class","link links")
	    .attr("id",function (d) { return "l_" + d.Key;})
	    .attr("d", function (d,i) {
		var uid = 'diag_' + d.name +'_'+d.cluster_id;
		if(!(uid  in d)){
		    links = createLinks(d);
		    var diag = diagonal(links[0], i);
		    diag += "L" + String(diagonal(links[1], i)).substr(1);
		    diag += "A" + linkRadius + "," + linkRadius + " 0 0,0 " +  links[0].source.x + "," + links[0].source.y;
		    d[uid] = diag;
		}
		return d[uid];
	})
	    .style("stroke",function(d) { return  lineColor; })
	    .style("stroke-width",0.5)
	    .style("stroke-opacity",0)
	    .style("fill-opacity",0)
	    .style("fill",function(d) { return  lineColor; });
	
	function createLinks(d) {
            var target={},
            source={},
            link={},
            link2={},
            source2={},
            relatedChord=chordsById[d.name],
            relatedNode=nodesById[d.cluster_id],
            r=linkRadius,
            a=relatedChord.currentLinkAngle - 1.5;//1.57079633;
	    
            source.x=(r * Math.cos(a));
            source.y=(r * Math.sin(a));
            target.x=relatedNode.x-(chordsTranslate-nodesTranslate);
            target.y=relatedNode.y-(chordsTranslate-nodesTranslate);
            source2.x=(r * Math.cos(a));
            source2.y=(r * Math.sin(a));
	    
            link.source=source;
            link.target=target;
            link2.source=target;
            link2.target=source2;
            return [link,link2];
	}
	
	linkGroup.exit().remove();
    };
    
    
    function highlightLinks(d, on, type, uid) {
	if (!(uid in processed) && on == true){
	    processed[uid] = true;
	    buildLinks(d.relatedLinks);
	}
	d.relatedLinks.forEach(function (d) {
            highlightLink(d,on, type);
	});
    };
    
    
    function main() {
	var outerRadius = (Math.max(600,Math.min(screen.height,screen.width)-250)) / 2,
	innerRadius = outerRadius - 120,
	bubbleRadius = innerRadius-50;
	
	nodesTranslate = (outerRadius-innerRadius) + (innerRadius-bubbleRadius) + 100,
	chordsTranslate = (outerRadius + 100);
	linkRadius = innerRadius-20;
	
	svg = d3.select(document.getElementById("svgDiv"))
	    .style("width", (outerRadius*2 + 200) + "px")
	    .style("height", (outerRadius*2 + 200) + "px")
	    .append("svg")
	    .attr("id","svg")
	    .style("width", (outerRadius*2 + 200) + "px")
	    .style("height", (outerRadius*2 + 200) + "px"),
	
	linksSvg = svg.append("g")
	    .attr("class","links")
	    .attr("transform", "translate(" + chordsTranslate + "," + chordsTranslate + ")"),
	
	nodesSvg = svg.append("g")
	    .attr("class","nodes")
	    .attr("transform", "translate(" + nodesTranslate + "," + nodesTranslate + ")"),
	
	chordsSvg = svg.append("g")
	    .attr("class","chords")
	    .attr("transform", "translate(" + chordsTranslate + "," + chordsTranslate + ")"),
	
	d3.select(document.getElementById("mainDiv"))
	    .style("width",(outerRadius*2 + 400) + "px")
	    .style("height",(outerRadius*2 + 400) + "px");
	
	d3.select(document.getElementById("bpg"))
	    .style("width",(outerRadius*2 + 400) + "px");

	initialize(bubbleRadius);
	updateNodes();
	updateChords(innerRadius)
	
	initSlider();
	$("#minv").html(parseInt(minS));
	$("#maxv").html(parseInt(maxS));
	document.getElementById("rangetext").style.display = "";
	document.getElementById("loader").style.display = "none";
    };
    
    
    function updateNodes() {
	// This represents the nodes(circles) in the interior of the svg.
	var node = nodesSvg.selectAll("g.node")
            .data(cluster_nodes, function (d,i) {
		return d.cluster_id;
            }),
	enter = node.enter();
	enter.append("circle")
	    .attr("class", "node")
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
            .attr("r", function(d) { return d.r; })
	    .attr("id", function(d) { return "c_" + d.cluster_id; })
            .style("fill-opacity", function (d) { return (( d.depth < 1)?0:d.opacity);})
            .style("fill", function(d) {return nodeColor;})
            .style("stroke", "#000")
            .style("stroke-width", 1.5)
            .style("stroke-opacity", 1)
            .on("mouseover", function (d) { node_onMouseOver(d, "NODE"); })
            .on("mouseout", function (d) { node_onMouseOut(d, "NODE"); })
	    .on("click", function(d){
		if( !( d.cluster_id in cachedMembers)){
                    var memstr = "";
                    nodesById[d.cluster_id].relatedLinks.forEach(function(q){memstr += q.name + ": " + q.value + "\n";});
                    cachedMembers[d.cluster_id] = memstr;
		}
		alert(cachedMembers[d.cluster_id]);
	    });
	
	node.exit().remove().transition(500).style("opacity", 0);
	log("updateBubble()");
    };
    
    
    function updateChords(innerRadius) {
	// This represents the species on the edge of the outer circle.
	var arcGroup = chordsSvg.selectAll("g.arc")
            .data(usr_chords, function (d) {
		return d.label;
            }),
	
	enter = arcGroup.enter();
	enter.append("text")
            .attr("class","arc chord")
            .attr("dy", ".35em")
            .attr("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
            .attr("transform", function(d) {
		return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
                    + "translate(" + (innerRadius + 6) + ")"
                    + (d.angle > Math.PI ? "rotate(180)" : "");
            })
            .text(function(d) { return d.label.replace("_"," "); });
	
	enter.append("path")
	    .attr("id", function(d){return "p_" + d.label;})
            .style("fill-opacity", 0.8)
            .style("stroke", "#555")
            .style("stroke-opacity", 0.4)
            .attr("d", function (d, i) {return d3.svg.arc(d,i).innerRadius(innerRadius-20).outerRadius(innerRadius)(d.source,i);})
	    .on("mouseover", function (d) { 
		// timeout so that when a user mouses over the species, it doesnt trigger immediately
		timeoutId = setTimeout(function() {node_onMouseOver(d.label, "MEMBER");}, 200);})
	    .on("mouseout", function (d) {
		clearTimeout(timeoutId);
		node_onMouseOut(d.label,"MEMBER"); });
	arcGroup.exit().remove();
	
	log("updateChords()");
    };

    
    function initSlider(){
	if (sliderinit)
	    return;
	sliderinit = true;
	$("#ranged").noUiSlider({
	    start: [ minS, maxS ],
	    step: 1,
	    direction: 'ltr',
	    behaviour: 'tap-drag',
	    connect: true,
	    range: {
		'min': [ datarange[0] ],
		'max': [ datarange[1] ]
	    },
	    serialization: {
		lower: [ $.Link({target : $("#minv-span"), method: "html"})],
		upper: [ $.Link({target : $("#maxv-span"), method: "html"})],
		format: {mark: ".", decimals: 0}
	    }
	});

	$("#ranged").change(function(){
	    var rng=$(this).val(),
	    current = minmax();
	    if(current[0] == rng[0] && current[1] == rng[1])
		return;
	    
	    init();
	    setRange(rng[0], rng[1]);
	    fetchData(baseurl);
	});

    };
    

    //this allows us access to just 2 of the functions.  Add more as required
    return{
	init : init,
	minmax : minmax,
	setRange : setRange,
	fetchData : fetchData
    };

})();



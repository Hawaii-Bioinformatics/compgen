//var maxWidth=

var outerRadius = (Math.max(600,Math.min(screen.height,screen.width)-250)) / 2,
innerRadius = outerRadius - 120,
bubbleRadius=innerRadius-50,
linkRadius=innerRadius-20,
nodesTranslate=(outerRadius-innerRadius) + (innerRadius-bubbleRadius) + 100,
chordsTranslate=(outerRadius + 100),
svg = d3.select(document.getElementById("svgDiv"))
    .style("width", (outerRadius*2 + 200) + "px")
    .style("height", (outerRadius*2 + 200) + "px")
    .append("svg")
    .attr("id","svg")
    .style("width", (outerRadius*2 + 200) + "px")
    .style("height", (outerRadius*2 + 200) + "px"),
linksSvg=svg.append("g")
    .attr("class","links")
    .attr("transform", "translate(" + chordsTranslate + "," + chordsTranslate + ")"),
nodesSvg=svg.append("g")
    .attr("class","nodes")
    .attr("transform", "translate(" + nodesTranslate + "," + nodesTranslate + ")"),
chordsSvg=svg.append("g")
    .attr("class","chords")
    .attr("transform", "translate(" + chordsTranslate + "," + chordsTranslate + ")"),
species=[], 
speciesById={}, 
genecnt_cluster=[], 
clusters={}, 
n_clusters=[], 
cluster_nodes=[], 
max_members=0, 
processed = {},
minS=30, 
maxS=32,
selectColor="#447733", 
chordsById={}, 
nodesById={}, 
usr_chords = [], 
dataCalls=[], 
numCalls=0,
diagonal = d3.svg.diagonal.radial(),
toolTip = d3.select(document.getElementById("toolTip")),
header = d3.select(document.getElementById("head")),
header1 = d3.select(document.getElementById("header1")),
header2 = d3.select(document.getElementById("header2")),
total = d3.select(document.getElementById("totalDiv")),
repColor="#F80018",
demColor="#0543EE";//0543bc


function log(message) {
//   console.log(message);
}
//Events

function initialize() {
    var bubble = d3.layout.pack()
	.sort(null)
	.size([bubbleRadius * 2, bubbleRadius * 2])
	.padding(1.5);
    var root = {children:n_clusters, PTY:'root'}, nodes = bubble.nodes(root);
    cluster_nodes = [];
    nodes.forEach (function (d) {
        if (d.depth == 1) {
            nodesById[d.cluster_id] = d;
	    d.currentAmount = d.species_count;
            d.relatedLinks = [];
            cluster_nodes.push(d);
        }
    })

    buildChords();

    genecnt_cluster.forEach(function (d) {
	if (d.cluster_id in nodesById){
	    nodesById[d.cluster_id].relatedLinks.push(d);
	    chordsById[d.species].relatedLinks.push(d);
	}
    })
    log("initialize()");
    
}

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
    species.forEach(function(d) {
        d = d.species;
        if (!(d in indexByName)) {
              nameByIndex[n] = d;
              indexByName[d] = n++;
        }
    });

    species.forEach(function(d) {
        var source = indexByName[d.species],
        row = matrix[source];
        if (!row) {
	    //https://stackoverflow.com/questions/1295584/most-efficient-way-to-create-a-zero-filled-javascript-array
	    matrix[source] = Array.apply(null, new Array(n)).map(Number.prototype.valueOf, 0);
            row = matrix[source];
        }
        row[indexByName[d.species]]= 1;
    });

    n = 0;
    chord.matrix(matrix);
    usr_chords=chord.chords();
    usr_chords.forEach(function (d) {
        d.label=nameByIndex[n];
        d.angle=(d.source.startAngle + d.source.endAngle) / 2
        chordsById[d.label]= {startAngle:d.source.startAngle,
			      endAngle:d.source.endAngle,
			      index:d.source.index,
			      value:d.source.value,
			      currentAngle:d.source.startAngle,
			      currentLinkAngle:d.source.startAngle,
			      Amount:d.source.value,
			      source:d.source,
			      relatedLinks:[]};
        n++;
    });

    log("buildChords()");
}


function setRange(mi, ma){
    minS = mi;
    maxS = ma;
}

function fetchData(url) {
    dataCalls=[];
    addStream(url + "/species2.csv", onFetchSpecies);
    addStream(url + "/qp_detailed2.csv", onFetchClusters);
    addStream(url + "/gene_counts2.csv", onFetchGeneToCluster);
    startFetch();
}


function onFetchSpecies(err,json){
    species = [];
    json.forEach(function(d){
	var tmp={species:d};
        speciesById[d]=tmp;
	species.push(tmp);
    });
    log("onFetchSpecies()");
    endFetch();
}

function onFetchGeneToCluster(err,json){
    var i = 0;
    json.forEach(function(d) {
	genecnt_cluster.push({Key:i++, cluster_id:d[0], species_id:d[1], count:d[2]});
    });
    endFetch();
}


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
	    var r = {value:d[2], opacity:grad[d[1]], cluster_id:d[0], species_count:d[1], members:d[2]};
	    max_members += r.value;
	    clusters[r.cluster_id]=r;
	    n_clusters.push(r);
	}
    }); 
    log("onFetchClusters()");
    endFetch();
}


function addStream(file,func) {dataCalls.push({file:file, func:func});}

function startFetch() {
    numCalls = dataCalls.length;
    dataCalls.forEach(function (d) {
        d3.json(d.file, d.func);
    })
}

function endFetch() {
    numCalls--;
    if (! numCalls) {
	for(var i = 0; i <  genecnt_cluster.length; ++i){
	    genecnt_cluster[i].species = species[genecnt_cluster[i].species_id].species;
	}
        main();
    }
}    

function node_onMouseOver(d,type) {
     if (type=="CAND") {
         if(d.depth < 1) return;
         toolTip.transition()
             .duration(200)
             .style("opacity", ".9");

         header1.text("Cluster: " + d.cluster_id);
         header.text("Species Count: " + d.species_count);
         header2.text("Non-Unique Count : " + d.members);
         //header2.text("list : " + d.species_list);
         toolTip.style("left", (d3.event.pageX + 50) + "px")
             .style("top", (d3.event.pageY - 125) + "px")
             .style("height","75px")
	     .style("background-color", "#FFFFFF")
	     .style("border", " solid black 1px")
	     .style("border-radius", "5px")
	     .style("z-index", 999);
	 
	 
         highlightLinks(d,true, type, type + "_" + d.cluster_id);
     } else if (type=="PAC") {
         highlightLinks( chordsById[d], true, type, type + "_" + d);
     }
}

function node_onMouseOut(d,type) {
    if (type=="CAND") {
        highlightLinks(d, false, type, "");
     } else if (type=="PAC") {
         highlightLinks(chordsById[d], false, type, "");
     }
    toolTip.transition()// declare the transition properties to fade-out the div
        .duration(500)	// it shall take 500ms
        .style("opacity", "0")
	.style("z-index", -999);// and go all the way to an opacity of nil
    
}


function highlightLink(g,on, type) {
    
    var opacity_fill=((on==true) ?  ((type=='PAC')?0.2:0.8) : 0),
    opacity_stroke=((on==true) ? ((type=='PAC')?0.1:0.8) : 0),
    link = d3.select(document.getElementById("l_" + g.Key)),  // the lines from cluster to boxes
    spec = d3.select(document.getElementById("p_" + g.species)), // the outer gray boxes
    circc = d3.select(document.getElementById("c_" + g.cluster_id)), //
    transpeed = (on==true) ? 150:550;
    link.transition(transpeed)
        .style("fill-opacity", opacity_fill)
        .style("stroke-opacity", opacity_stroke);
    spec.transition(transpeed)
	.style("fill", (on == true) ? selectColor : "#000");
    circc.transition(transpeed).
	style("fill", (on == true)? selectColor:repColor)
    	.style("fill-opacity", (on == true)?1: clusters[g.cluster_id].opacity);
}



function buildLinks(links){
    var linkGroup=linksSvg.selectAll("g.links").data(links, function (d,i) {return d.Key;}),
    enter = linkGroup.enter();
    enter.append("path")
	.attr("class","link links")
	.attr("id",function (d) { return "l_" + d.Key;})
	.attr("d", function (d,i) {
	    var uid = 'diag_' + d.species +'_'+d.cluster_id;
	    if(!(uid  in d)){
		links = createLinks(d);
		var diag = diagonal(links[0], i);
		diag += "L" + String(diagonal(links[1], i)).substr(1);
		diag += "A" + linkRadius + "," + linkRadius + " 0 0,0 " +  links[0].source.x + "," + links[0].source.y;
		d[uid] = diag;
	    }
            return d[uid];
	})
	.style("stroke",function(d) { return  demColor; })
	.style("stroke-width",0.5)
	.style("stroke-opacity",0)
	.style("fill-opacity",0)
	.style("fill",function(d) { return  demColor; });

    
    function createLinks(d) {
        var target={},
        source={},
        link={},
        link2={},
        source2={},
        relatedChord=chordsById[d.species],
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
}


function highlightLinks(d, on, type, uid) {
    if (!(uid in processed) && on == true){
	processed[uid] = true;
	buildLinks(d.relatedLinks);
    }
    d.relatedLinks.forEach(function (d) {
        highlightLink(d,on, type);
    });
}



function main() {
    d3.select(document.getElementById("mainDiv"))
	.style("width",(outerRadius*2 + 400) + "px")
	.style("height",(outerRadius*2 + 400) + "px");
    
    d3.select(document.getElementById("bpg"))
	.style("width",(outerRadius*2 + 400) + "px");

    initialize();
    updateNodes();
    updateChords();
}


function updateNodes() {
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
        .style("fill", function(d) {return repColor;})
        .style("stroke", "#000")
        .style("stroke-width", 1.5)
        .style("stroke-opacity", 1)
        .on("mouseover", function (d) { node_onMouseOver(d, "CAND"); })
        .on("mouseout", function (d) { node_onMouseOut(d, "CAND"); })
	.on("click", function(d){log("I be clicked");});
    
    node.exit().remove().transition(500).style("opacity",0);
    log("updateBubble()");
}

var timeoutId= 0;
function updateChords() {
    var arcGroup = chordsSvg.selectAll("g.arc")
        .data(usr_chords, function (d) {
            return d.label;
        }),

    enter = arcGroup.enter();//.append("g").attr("class","arc");
    enter.append("text")
        .attr("class","arc chord")
        .attr("dy", ".35em")
        .attr("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
        .attr("transform", function(d) {
            return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
                + "translate(" + (innerRadius + 6) + ")"
                + (d.angle > Math.PI ? "rotate(180)" : "");
        })
        .text(function(d) { return d.label; });

     enter.append("path")
	.attr("id", function(d){return "p_" + d.label;})
        .style("fill-opacity", 0.8)
        .style("stroke", "#555")
        .style("stroke-opacity", 0.4)
        .attr("d", function (d, i) {return d3.svg.arc(d,i).innerRadius(innerRadius-20).outerRadius(innerRadius)(d.source,i);})
	.on("mouseover", function (d) { 
	    // timeout so that when a user mouses over the species, it doesnt trigger immediately
	    timeoutId = setTimeout(function() {node_onMouseOver(d.label, "PAC");}, 200);})
	.on("mouseout", function (d) {
	    clearTimeout(timeoutId);
	    node_onMouseOut(d.label,"PAC"); });
    arcGroup.exit().remove();

    log("updateChords()");
}
